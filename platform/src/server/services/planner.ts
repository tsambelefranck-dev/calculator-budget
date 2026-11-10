import 'server-only';
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import type { CurrencyCode, PlannerBucket } from '@/lib/constants';
import { addMonths, monthRange, type DateKey, type MonthKey } from '@/lib/finance/dates';
import { CURRENCY_META } from '@/lib/finance/money';
import { generateSalaryPlan, splitBucketAcrossCategories, type PlannerInput, type PlannerResult } from '@/lib/finance/planner';
import type { FinancialProfile } from '@/server/auth/current';
import { db } from '@/server/db';
import { expenses, salaryPlanItems, salaryPlans, savingsGoals } from '@/server/db/schema';
import { getBucketNeeds, type BucketNeeds } from './analytics';
import { setBudgetsForMonth } from './budgets';
import { listCategories } from './categories';
import { listDebtSummaries, toDebtInputs } from './debts';
import { BusinessRuleError, NotFoundError } from './errors';
import { emergencyFundBalance, listGoalSummaries } from './goals';
import { getIncome } from './incomes';

export type SalaryPlan = typeof salaryPlans.$inferSelect;
export type SalaryPlanItem = typeof salaryPlanItems.$inferSelect;

export interface PlannerContext {
  input: Omit<PlannerInput, 'amount'>;
  needs: BucketNeeds;
}

/** Rassemble la situation réelle de l'utilisateur pour alimenter l'algorithme. */
export async function buildPlannerContext(userId: string, profile: FinancialProfile, today: DateKey): Promise<PlannerContext> {
  const currentMonth = today.slice(0, 7);
  const [needs, debtSummaries, emergencyBalance, goals, emergencyGoal] = await Promise.all([
    getBucketNeeds(userId, profile, currentMonth),
    listDebtSummaries(userId),
    emergencyFundBalance(userId),
    listGoalSummaries(userId, today),
    db
      .select({ target: savingsGoals.targetAmount })
      .from(savingsGoals)
      .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.type, 'fonds_urgence'), inArray(savingsGoals.status, ['active', 'achieved'])))
      .limit(1),
  ]);
  const irregular = profile.incomeType !== 'fixe';
  const essentialMonthly = needs.essentialMonthly > 0 ? needs.essentialMonthly : profile.fixedCharges + profile.variableExpenses;
  const emergencyTarget = emergencyGoal[0]?.target ?? essentialMonthly * (irregular ? 6 : 3);
  return {
    needs,
    input: {
      currency: profile.currency,
      needs: { logement: needs.logement, essentiels: needs.essentiels, famille: needs.famille, plaisir: needs.plaisir },
      needsSource: needs.source,
      debts: toDebtInputs(debtSummaries),
      emergency: { balance: emergencyBalance, target: emergencyTarget },
      essentialMonthly,
      goals: goals
        .filter((g) => g.goal.status === 'active' && g.goal.type !== 'fonds_urgence')
        .map((g) => ({ id: g.goal.id, name: g.goal.name, remaining: g.metrics.remaining, requiredMonthly: g.metrics.requiredMonthly ?? 0 })),
      riskTolerance: profile.riskTolerance,
      incomeType: profile.incomeType,
    },
  };
}

export async function proposePlan(userId: string, profile: FinancialProfile, today: DateKey, amount: number): Promise<{ plan: PlannerResult; context: PlannerContext }> {
  const context = await buildPlannerContext(userId, profile, today);
  return { plan: generateSalaryPlan({ ...context.input, amount }), context };
}

export interface SavePlanInput {
  month: MonthKey;
  incomeId: string | null;
  total: number;
  status: 'draft' | 'validated';
  planStatus: 'ok' | 'serre' | 'deficit';
  notes: string[];
  inputs: Record<string, unknown>;
  items: { bucket: PlannerBucket; label: string; amount: number; recommendedAmount: number; rationale: string }[];
}

export async function savePlan(userId: string, currency: CurrencyCode, input: SavePlanInput): Promise<SalaryPlan> {
  const allocated = input.items.reduce((s, i) => s + i.amount, 0);
  if (allocated !== input.total) {
    throw new BusinessRuleError(`La répartition doit totaliser exactement le montant du revenu (écart : ${input.total - allocated}).`);
  }
  if (input.items.some((i) => i.amount < 0)) throw new BusinessRuleError('Un montant ne peut pas être négatif.');
  if (input.incomeId) await getIncome(userId, input.incomeId);
  return db.transaction(async (tx) => {
    const [plan] = await tx
      .insert(salaryPlans)
      .values({
        userId,
        currency,
        incomeId: input.incomeId,
        month: input.month,
        totalAmount: input.total,
        status: input.status,
        planStatus: input.planStatus,
        notes: input.notes,
        inputs: input.inputs,
        validatedAt: input.status === 'validated' ? new Date() : null,
      })
      .returning();
    await tx.insert(salaryPlanItems).values(
      input.items.map((item, index) => ({
        planId: plan!.id,
        bucket: item.bucket,
        label: item.label,
        amount: item.amount,
        recommendedAmount: item.recommendedAmount,
        rationale: item.rationale,
        sortOrder: index,
      })),
    );
    return plan!;
  });
}

export async function listPlans(userId: string, limit = 12): Promise<(SalaryPlan & { items: SalaryPlanItem[] })[]> {
  const plans = await db.select().from(salaryPlans).where(eq(salaryPlans.userId, userId)).orderBy(desc(salaryPlans.createdAt)).limit(limit);
  if (plans.length === 0) return [];
  const items = await db
    .select()
    .from(salaryPlanItems)
    .where(inArray(salaryPlanItems.planId, plans.map((p) => p.id)))
    .orderBy(salaryPlanItems.sortOrder);
  return plans.map((p) => ({ ...p, items: items.filter((i) => i.planId === p.id) }));
}

export async function getPlan(userId: string, planId: string): Promise<SalaryPlan & { items: SalaryPlanItem[] }> {
  const rows = await db.select().from(salaryPlans).where(and(eq(salaryPlans.id, planId), eq(salaryPlans.userId, userId))).limit(1);
  if (!rows[0]) throw new NotFoundError('Plan introuvable.');
  const items = await db.select().from(salaryPlanItems).where(eq(salaryPlanItems.planId, planId)).orderBy(salaryPlanItems.sortOrder);
  return { ...rows[0], items };
}

export async function deletePlan(userId: string, planId: string): Promise<void> {
  const rows = await db.delete(salaryPlans).where(and(eq(salaryPlans.id, planId), eq(salaryPlans.userId, userId))).returning({ id: salaryPlans.id });
  if (rows.length === 0) throw new NotFoundError('Plan introuvable.');
}

/**
 * Transforme les enveloppes « dépenses » d'un plan en budgets par catégorie pour le mois du plan,
 * au prorata des dépenses des 3 derniers mois de chaque catégorie de l'enveloppe.
 */
export async function applyPlanAsBudgets(userId: string, planId: string): Promise<number> {
  const plan = await getPlan(userId, planId);
  const categories = (await listCategories()).filter((c) => c.isActive);
  const start = monthRange(addMonths(plan.month, -3)).start;
  const end = monthRange(plan.month).start;
  const history = await db
    .select({ categoryId: expenses.categoryId, total: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number) })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), gte(expenses.spentOn, start), lt(expenses.spentOn, end)))
    .groupBy(expenses.categoryId);
  const historyMap = new Map(history.map((h) => [h.categoryId, h.total]));
  const granularity = CURRENCY_META[plan.currency].granularity;
  const amounts: Record<string, number> = {};
  for (const item of plan.items) {
    if (!['logement', 'essentiels', 'famille', 'plaisir'].includes(item.bucket) || item.amount <= 0) continue;
    const bucketCategories = categories.filter((c) => c.plannerBucket === item.bucket);
    const withHistory = bucketCategories.filter((c) => (historyMap.get(c.id) ?? 0) > 0);
    const targets = (withHistory.length ? withHistory : bucketCategories).map((c) => ({ categoryId: c.id, historical: historyMap.get(c.id) ?? 0 }));
    Object.assign(amounts, splitBucketAcrossCategories(item.amount, targets, granularity));
  }
  return setBudgetsForMonth(userId, plan.currency, plan.month, amounts);
}
