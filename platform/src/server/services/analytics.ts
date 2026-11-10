import 'server-only';
import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { PlannerBucket } from '@/lib/constants';
import { addMonths, dayOf, daysInMonth, lastMonths, monthRange, type DateKey, type MonthKey } from '@/lib/finance/dates';
import { computeHealthScore, type HealthResult } from '@/lib/finance/health';
import type { CategorySpend } from '@/lib/finance/insights';
import type { MonthTotals } from '@/lib/finance/report';
import type { FinancialProfile } from '@/server/auth/current';
import { db } from '@/server/db';
import { budgets, debtPayments, debts, expenses, goalContributions, incomes, investmentMovements, investments, savingsGoals } from '@/server/db/schema';
import { listCategories } from './categories';
import { emergencyFundBalance } from './goals';

export type { MonthTotals };

const FLOW_TABLES = {
  incomes: { table: incomes, amount: incomes.amount, date: incomes.receivedOn, user: incomes.userId },
  expenses: { table: expenses, amount: expenses.amount, date: expenses.spentOn, user: expenses.userId },
  contributions: { table: goalContributions, amount: goalContributions.amount, date: goalContributions.contributedOn, user: goalContributions.userId },
  movements: { table: investmentMovements, amount: investmentMovements.amount, date: investmentMovements.movedOn, user: investmentMovements.userId },
  payments: { table: debtPayments, amount: debtPayments.amount, date: debtPayments.paidOn, user: debtPayments.userId },
} satisfies Record<string, { table: PgTable; amount: AnyPgColumn; date: AnyPgColumn; user: AnyPgColumn }>;

type FlowTable = keyof typeof FLOW_TABLES;

async function sumBetween(name: FlowTable, userId: string, start: DateKey, end: DateKey): Promise<number> {
  const c = FLOW_TABLES[name];
  const result = await db.execute<{ total: string | number }>(
    sql`select coalesce(sum(${c.amount}), 0) as total from ${c.table} where ${c.user} = ${userId} and ${c.date} >= ${start} and ${c.date} < ${end}`,
  );
  return Number(result.rows[0]?.total ?? 0);
}

/** Totaux d'une période (fin exclue). */
export async function getTotals(userId: string, start: DateKey, end: DateKey): Promise<MonthTotals> {
  const [income, expensesTotal, savings, investmentsTotal, debtPaymentsTotal] = await Promise.all([
    sumBetween('incomes', userId, start, end),
    sumBetween('expenses', userId, start, end),
    sumBetween('contributions', userId, start, end),
    sumBetween('movements', userId, start, end),
    sumBetween('payments', userId, start, end),
  ]);
  return { income, expenses: expensesTotal, savings, investments: investmentsTotal, debtPayments: debtPaymentsTotal };
}

export async function getMonthTotals(userId: string, month: MonthKey): Promise<MonthTotals> {
  const { start, end } = monthRange(month);
  return getTotals(userId, start, end);
}

async function monthlySums(name: FlowTable, userId: string, start: DateKey, end: DateKey): Promise<Map<MonthKey, number>> {
  const c = FLOW_TABLES[name];
  const result = await db.execute<{ month: string; total: string | number }>(
    sql`select to_char(${c.date}, 'YYYY-MM') as month, coalesce(sum(${c.amount}), 0) as total
        from ${c.table} where ${c.user} = ${userId} and ${c.date} >= ${start} and ${c.date} < ${end}
        group by 1`,
  );
  return new Map(result.rows.map((r) => [r.month, Number(r.total)]));
}

export interface MonthSeriesPoint extends MonthTotals {
  month: MonthKey;
}

/** Totaux mensuels sur une liste de mois consécutifs. */
export async function getMonthlySeries(userId: string, months: MonthKey[]): Promise<MonthSeriesPoint[]> {
  if (months.length === 0) return [];
  const start = monthRange(months[0]!).start;
  const end = monthRange(months[months.length - 1]!).end;
  const [inc, exp, sav, inv, pay] = await Promise.all([
    monthlySums('incomes', userId, start, end),
    monthlySums('expenses', userId, start, end),
    monthlySums('contributions', userId, start, end),
    monthlySums('movements', userId, start, end),
    monthlySums('payments', userId, start, end),
  ]);
  return months.map((month) => ({
    month,
    income: inc.get(month) ?? 0,
    expenses: exp.get(month) ?? 0,
    savings: sav.get(month) ?? 0,
    investments: inv.get(month) ?? 0,
    debtPayments: pay.get(month) ?? 0,
  }));
}

async function spendByCategoryBetween(userId: string, start: DateKey, end: DateKey): Promise<Map<string, number>> {
  const rows = await db
    .select({ categoryId: expenses.categoryId, total: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number) })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), gte(expenses.spentOn, start), lt(expenses.spentOn, end)))
    .groupBy(expenses.categoryId);
  return new Map(rows.map((r) => [r.categoryId, r.total]));
}

/**
 * Dépenses par catégorie d'un mois, avec la période comparable du mois précédent
 * (au prorata du jour si le mois est en cours), la moyenne des 3 mois précédents et le budget.
 */
export async function getCategorySpends(userId: string, month: MonthKey, today: DateKey): Promise<{ spends: CategorySpend[]; partial: boolean; periodEnd: DateKey }> {
  const { start, end } = monthRange(month);
  const partial = today >= start && today < end;
  const previousMonth = addMonths(month, -1);
  const previousStart = monthRange(previousMonth).start;
  let currentEnd = end;
  let previousEnd = monthRange(previousMonth).end;
  if (partial) {
    const day = dayOf(today);
    currentEnd = today < end ? addDaysKey(today, 1) : end;
    const comparableDay = Math.min(day, daysInMonth(previousMonth));
    previousEnd = addDaysKey(`${previousMonth}-${String(comparableDay).padStart(2, '0')}`, 1);
  }
  const avgStart = monthRange(addMonths(month, -3)).start;
  const [allCategories, current, previous, avgRaw, monthBudgets] = await Promise.all([
    listCategories(),
    spendByCategoryBetween(userId, start, currentEnd),
    spendByCategoryBetween(userId, previousStart, previousEnd),
    spendByCategoryBetween(userId, avgStart, start),
    db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, month))),
  ]);
  const historyMonths = await monthsWithExpenses(userId, avgStart, start);
  const budgetMap = new Map(monthBudgets.map((b) => [b.categoryId, b.amount]));
  const spends: CategorySpend[] = allCategories
    .filter((c) => (current.get(c.id) ?? 0) > 0 || (previous.get(c.id) ?? 0) > 0 || budgetMap.has(c.id))
    .map((c) => ({
      categoryId: c.id,
      code: c.code,
      name: c.nameFr,
      isEssential: c.isEssential,
      current: current.get(c.id) ?? 0,
      previous: previous.get(c.id) ?? 0,
      average3: historyMonths > 0 ? Math.round((avgRaw.get(c.id) ?? 0) / historyMonths) : null,
      budget: budgetMap.get(c.id) ?? null,
    }));
  return { spends, partial, periodEnd: currentEnd };
}

function addDaysKey(date: DateKey, days: number): DateKey {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

async function monthsWithExpenses(userId: string, start: DateKey, end: DateKey): Promise<number> {
  const result = await db.execute<{ n: string | number }>(
    sql`select count(distinct to_char(${expenses.spentOn}, 'YYYY-MM')) as n from ${expenses} where ${expenses.userId} = ${userId} and ${expenses.spentOn} >= ${start} and ${expenses.spentOn} < ${end}`,
  );
  return Number(result.rows[0]?.n ?? 0);
}

export interface BucketNeeds {
  logement: number;
  essentiels: number;
  famille: number;
  plaisir: number;
  essentialMonthly: number;
  source: 'historique' | 'declaratif';
  monthsOfHistory: number;
}

/** Besoins mensuels par enveloppe : moyenne des mois complets récents, sinon montants déclarés. */
export async function getBucketNeeds(userId: string, profile: FinancialProfile, currentMonth: MonthKey): Promise<BucketNeeds> {
  const start = monthRange(addMonths(currentMonth, -3)).start;
  const end = monthRange(currentMonth).start;
  const [allCategories, spend, monthsCount] = await Promise.all([listCategories(), spendByCategoryBetween(userId, start, end), monthsWithExpenses(userId, start, end)]);
  if (monthsCount === 0) {
    return {
      logement: profile.fixedCharges,
      essentiels: profile.variableExpenses,
      famille: 0,
      plaisir: 0,
      essentialMonthly: profile.fixedCharges + profile.variableExpenses,
      source: 'declaratif',
      monthsOfHistory: 0,
    };
  }
  const totals: Record<PlannerBucket, number> = { logement: 0, essentiels: 0, famille: 0, dettes: 0, urgence: 0, objectifs: 0, investissement: 0, plaisir: 0, marge: 0 };
  let essential = 0;
  for (const category of allCategories) {
    const amount = spend.get(category.id) ?? 0;
    totals[category.plannerBucket] += amount;
    if (category.isEssential) essential += amount;
  }
  const avg = (v: number) => Math.round(v / monthsCount);
  return {
    logement: avg(totals.logement),
    essentiels: avg(totals.essentiels),
    famille: avg(totals.famille),
    plaisir: avg(totals.plaisir + totals.marge),
    essentialMonthly: avg(essential),
    source: 'historique',
    monthsOfHistory: monthsCount,
  };
}

export interface NetWorth {
  savings: number;
  investments: number;
  debts: number;
  netWorth: number;
}

export interface NetWorthPoint extends NetWorth {
  month: MonthKey;
}

/** Patrimoine net mois par mois : épargne cumulée + investissements − capital restant dû. */
export async function getNetWorthSeries(userId: string, months: MonthKey[]): Promise<NetWorthPoint[]> {
  if (months.length === 0) return [];
  const lastEnd = monthRange(months[months.length - 1]!).end;
  const firstStart = monthRange(months[0]!).start;
  const [contribBefore, contribByMonth, movBefore, movByMonth, payBefore, payByMonth, debtRows, investmentRows] = await Promise.all([
    sumBetween('contributions', userId, '0001-01-01', firstStart),
    monthlySums('contributions', userId, firstStart, lastEnd),
    sumBetween('movements', userId, '0001-01-01', firstStart),
    monthlySums('movements', userId, firstStart, lastEnd),
    db.execute<{ debt_id: string; total: string }>(
      sql`select ${debtPayments.debtId} as debt_id, coalesce(sum(${debtPayments.amount}),0) as total from ${debtPayments} where ${debtPayments.userId} = ${userId} and ${debtPayments.paidOn} < ${firstStart} group by 1`,
    ),
    db.execute<{ debt_id: string; month: string; total: string }>(
      sql`select ${debtPayments.debtId} as debt_id, to_char(${debtPayments.paidOn}, 'YYYY-MM') as month, coalesce(sum(${debtPayments.amount}),0) as total
          from ${debtPayments} where ${debtPayments.userId} = ${userId} and ${debtPayments.paidOn} >= ${firstStart} and ${debtPayments.paidOn} < ${lastEnd} group by 1, 2`,
    ),
    db.select({ id: debts.id, initialBalance: debts.initialBalance, recordedOn: debts.recordedOn }).from(debts).where(eq(debts.userId, userId)),
    db
      .select({ id: investments.id, currentValue: investments.currentValue, status: investments.status })
      .from(investments)
      .where(eq(investments.userId, userId)),
  ]);

  const paidBefore = new Map(payBefore.rows.map((r) => [r.debt_id, Number(r.total)]));
  const paidMonthly = new Map<string, Map<MonthKey, number>>();
  for (const r of payByMonth.rows) {
    const inner = paidMonthly.get(r.debt_id) ?? new Map<MonthKey, number>();
    inner.set(r.month, Number(r.total));
    paidMonthly.set(r.debt_id, inner);
  }

  // Valeur déclarée actuelle des investissements (utilisée pour le dernier mois uniquement).
  const investedNowRows = investmentRows.length
    ? await db
        .select({ id: investmentMovements.investmentId, total: sql<number>`coalesce(sum(${investmentMovements.amount}), 0)`.mapWith(Number) })
        .from(investmentMovements)
        .where(and(eq(investmentMovements.userId, userId), inArray(investmentMovements.investmentId, investmentRows.map((i) => i.id))))
        .groupBy(investmentMovements.investmentId)
    : [];
  const investedNow = new Map(investedNowRows.map((r) => [r.id, r.total]));
  const declaredAdjustment = investmentRows.reduce((sum, inv) => {
    const cost = investedNow.get(inv.id) ?? 0;
    if (inv.status === 'closed') return sum - cost;
    return inv.currentValue === null ? sum : sum + (inv.currentValue - cost);
  }, 0);

  let savings = contribBefore;
  let invested = movBefore;
  const paidSoFar = new Map(paidBefore);
  return months.map((month, index) => {
    savings += contribByMonth.get(month) ?? 0;
    invested += movByMonth.get(month) ?? 0;
    const end = monthRange(month).end;
    let debtTotal = 0;
    for (const d of debtRows) {
      const paidThisMonth = paidMonthly.get(d.id)?.get(month) ?? 0;
      paidSoFar.set(d.id, (paidSoFar.get(d.id) ?? 0) + paidThisMonth);
      if (d.recordedOn < end) debtTotal += Math.max(0, d.initialBalance - (paidSoFar.get(d.id) ?? 0));
    }
    const investmentsValue = Math.max(0, index === months.length - 1 ? invested + declaredAdjustment : invested);
    return { month, savings, investments: investmentsValue, debts: debtTotal, netWorth: savings + investmentsValue - debtTotal };
  });
}

export async function getNetWorth(userId: string, month: MonthKey): Promise<NetWorth> {
  const [point] = (await getNetWorthSeries(userId, [month])).slice(-1);
  return point ?? { savings: 0, investments: 0, debts: 0, netWorth: 0 };
}

export async function getActiveDebtMonthlyMinimum(userId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${debts.minimumPayment}), 0)`.mapWith(Number) })
    .from(debts)
    .where(and(eq(debts.userId, userId), eq(debts.status, 'active')));
  return rows[0]?.total ?? 0;
}

export interface HealthSnapshot {
  health: HealthResult;
  basis: 'mois_precedent' | 'mois_en_cours' | 'diagnostic';
  basisMonth: MonthKey | null;
  emergencyFund: number;
  essentialMonthly: number;
}

/**
 * Santé financière : calculée sur le dernier mois complet s'il contient des revenus,
 * sinon sur le mois en cours, sinon sur les montants déclarés au diagnostic.
 */
export async function getHealthSnapshot(userId: string, profile: FinancialProfile, currentMonth: MonthKey): Promise<HealthSnapshot> {
  const previousMonth = addMonths(currentMonth, -1);
  const [previousTotals, currentTotals, emergencyFund, needs, budgetsPrev] = await Promise.all([
    getMonthTotals(userId, previousMonth),
    getMonthTotals(userId, currentMonth),
    emergencyFundBalance(userId),
    getBucketNeeds(userId, profile, currentMonth),
    budgetAdherence(userId, previousMonth),
  ]);
  const irregularIncome = profile.incomeType !== 'fixe';
  const essentialMonthly = needs.essentialMonthly > 0 ? needs.essentialMonthly : profile.fixedCharges + profile.variableExpenses;
  const emergency = emergencyFund > 0 ? emergencyFund : 0;

  if (previousTotals.income > 0) {
    return {
      health: computeHealthScore({
        income: previousTotals.income,
        expenses: previousTotals.expenses,
        debtPayments: previousTotals.debtPayments,
        emergencyFund: emergency,
        essentialMonthly,
        irregularIncome,
        budgetAdherence: budgetsPrev,
      }),
      basis: 'mois_precedent',
      basisMonth: previousMonth,
      emergencyFund: emergency,
      essentialMonthly,
    };
  }
  if (currentTotals.income > 0) {
    return {
      health: computeHealthScore({
        income: currentTotals.income,
        expenses: currentTotals.expenses,
        debtPayments: currentTotals.debtPayments,
        emergencyFund: emergency,
        essentialMonthly,
        irregularIncome,
        budgetAdherence: await budgetAdherence(userId, currentMonth),
      }),
      basis: 'mois_en_cours',
      basisMonth: currentMonth,
      emergencyFund: emergency,
      essentialMonthly,
    };
  }
  return {
    health: computeHealthScore({
      income: profile.monthlyIncome,
      expenses: profile.fixedCharges + profile.variableExpenses,
      debtPayments: profile.debtMonthlyPayment,
      emergencyFund: emergency > 0 ? emergency : profile.currentSavings,
      essentialMonthly,
      irregularIncome,
      budgetAdherence: null,
    }),
    basis: 'diagnostic',
    basisMonth: null,
    emergencyFund: emergency,
    essentialMonthly,
  };
}

/** Part des budgets respectés sur un mois (null si aucun budget). */
export async function budgetAdherence(userId: string, month: MonthKey): Promise<number | null> {
  const monthBudgets = await db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, month)));
  const active = monthBudgets.filter((b) => b.amount > 0);
  if (active.length === 0) return null;
  const { start, end } = monthRange(month);
  const spend = await spendByCategoryBetween(userId, start, end);
  return active.filter((b) => (spend.get(b.categoryId) ?? 0) <= b.amount).length / active.length;
}

export async function hasHighInterestDebt(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: debts.id })
    .from(debts)
    .where(and(eq(debts.userId, userId), eq(debts.status, 'active'), gte(debts.annualRateBp, 1000)))
    .limit(1);
  return rows.length > 0;
}

export async function goalsSnapshotForMonth(userId: string, month: MonthKey) {
  const { start, end } = monthRange(month);
  const result = await db.execute<{ name: string; target: string; saved: string; month_total: string }>(
    sql`select g.name as name, g.target_amount as target,
          coalesce((select sum(c.amount) from ${goalContributions} c where c.goal_id = g.id and c.contributed_on < ${end}), 0) as saved,
          coalesce((select sum(c.amount) from ${goalContributions} c where c.goal_id = g.id and c.contributed_on >= ${start} and c.contributed_on < ${end}), 0) as month_total
        from ${savingsGoals} g where g.user_id = ${userId} and g.status <> 'archived' order by g.created_at`,
  );
  return result.rows.map((r) => ({ name: r.name, target: Number(r.target), saved: Number(r.saved), contributedThisMonth: Number(r.month_total) }));
}

export function monthsForHistory(currentMonth: MonthKey, count: number): MonthKey[] {
  return lastMonths(currentMonth, count);
}
