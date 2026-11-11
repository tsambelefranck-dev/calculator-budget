import 'server-only';
import { addMonths, lastMonths, monthRange, type MonthKey } from '@/lib/finance/dates';
import { detectInsights, type Insight } from '@/lib/finance/insights';
import { savingsRateOf } from '@/lib/finance/report';
import type { AppContext } from '@/server/auth/current';
import { getCategorySpends, getHealthSnapshot, getMonthlySeries, getNetWorthSeries, getTotals, type HealthSnapshot, type MonthSeriesPoint, type NetWorthPoint } from './analytics';
import { getPlanLimits } from './entitlements';
import { listGoalSummaries, type GoalSummary } from './goals';
import { listExpectedIncomes, type ExpectedIncome } from './incomes';
import type { MonthTotals } from '@/lib/finance/report';

export interface DashboardData {
  month: MonthKey;
  isCurrentMonth: boolean;
  totals: MonthTotals;
  comparison: { expenses: number | null; income: number | null; label: string };
  balance: number;
  savingsRate: number;
  series: MonthSeriesPoint[];
  netWorth: NetWorthPoint[];
  categories: { label: string; value: number }[];
  insights: Insight[];
  health: HealthSnapshot;
  goals: GoalSummary[];
  expected: ExpectedIncome[];
  historyMonths: number;
}

export async function getDashboardData(ctx: AppContext, month: MonthKey): Promise<DashboardData> {
  const userId = ctx.user.id;
  const isCurrentMonth = month === ctx.currentMonth;
  const { start, end } = monthRange(month);
  const historyMonths = Math.min(6, getPlanLimits(ctx.user.plan).historyMonths);
  const months = lastMonths(month, historyMonths);

  const [totals, categoryData, series, netWorth, health, goals, expected] = await Promise.all([
    getTotals(userId, start, end),
    getCategorySpends(userId, month, ctx.today),
    getMonthlySeries(userId, months),
    getNetWorthSeries(userId, months),
    getHealthSnapshot(userId, ctx.profile, ctx.currentMonth),
    listGoalSummaries(userId, ctx.today),
    isCurrentMonth ? listExpectedIncomes(userId, month) : Promise.resolve([]),
  ]);

  // Comparaison : même période du mois précédent si le mois est en cours, sinon mois complet.
  const prevMonth = addMonths(month, -1);
  const previousExpenses = categoryData.spends.reduce((s, c) => s + c.previous, 0);
  const previousIncome = series.find((p) => p.month === prevMonth)?.income ?? null;
  const change = (current: number, previous: number | null) => (previous && previous > 0 ? (current - previous) / previous : null);

  const insights = detectInsights({
    currency: ctx.currency,
    income: totals.income,
    expenses: totals.expenses,
    debtPayments: totals.debtPayments,
    categories: categoryData.spends,
    partialMonth: categoryData.partial,
  });

  return {
    month,
    isCurrentMonth,
    totals,
    comparison: {
      expenses: change(totals.expenses, previousExpenses),
      income: isCurrentMonth ? null : change(totals.income, previousIncome),
      label: isCurrentMonth ? 'vs même période du mois dernier' : 'vs mois précédent',
    },
    balance: totals.income - totals.expenses - totals.savings - totals.investments - totals.debtPayments,
    savingsRate: savingsRateOf(totals),
    series,
    netWorth,
    categories: categoryData.spends.filter((c) => c.current > 0).map((c) => ({ label: c.name, value: c.current })),
    insights: insights.slice(0, 4),
    health,
    goals: goals.filter((g) => g.goal.status === 'active').slice(0, 3),
    expected,
    historyMonths,
  };
}
