import { describe, expect, it } from 'vitest';
import { getCategorySpends, getMonthTotals, getNetWorthSeries } from '@/server/services/analytics';
import { changeCurrency } from '@/server/services/account';
import { getBudgetOverview } from '@/server/services/budgets';
import { listCategories } from '@/server/services/categories';
import { createDebt, listDebtSummaries, recordDebtPayment } from '@/server/services/debts';
import { BusinessRuleError } from '@/server/services/errors';
import { createExpense, listExpenses } from '@/server/services/expenses';
import { addContribution, listGoalSummaries } from '@/server/services/goals';
import { createIncome } from '@/server/services/incomes';
import { listNotifications } from '@/server/services/notifications';
import { applyPlanAsBudgets, proposePlan, savePlan } from '@/server/services/planner';
import { buildReportData } from '@/server/services/reports';
import { upsertBudget } from '@/server/services/budgets';
import { createTestUser } from './helpers';

describe('services financiers', async () => {
  const cats = new Map((await listCategories()).map((c) => [c.code, c]));
  const cat = (code: string) => cats.get(code)!.id;

  it('crée le fonds d’urgence au diagnostic sans compter l’épargne existante comme un flux du mois', async () => {
    const { user } = await createTestUser();
    const goals = await listGoalSummaries(user.id, '2026-11-10');
    expect(goals[0]!.goal.type).toBe('fonds_urgence');
    expect(goals[0]!.saved).toBe(60000);
    expect(goals[0]!.goal.targetAmount).toBe(660000);
    const totals = await getMonthTotals(user.id, goals[0]!.goal.createdAt.toISOString().slice(0, 7));
    expect(totals.savings).toBe(0);
  });

  it('calcule totaux, alertes de budget et patrimoine', async () => {
    const { user } = await createTestUser();
    await createIncome(user.id, 'XAF', { sourceId: null, type: 'salaire', amount: 300000, receivedOn: '2026-10-28', label: 'Salaire', note: null });
    await upsertBudget(user.id, 'XAF', { categoryId: cat('loisirs'), month: '2026-10', amount: 20000 });
    await createExpense(user.id, 'XAF', { categoryId: cat('loisirs'), amount: 17000, spentOn: '2026-10-10', label: 'Sortie', paymentMethod: 'especes', note: null });
    expect((await listNotifications(user.id)).map((n) => n.type)).toEqual(['budget_warning']);
    await createExpense(user.id, 'XAF', { categoryId: cat('loisirs'), amount: 8000, spentOn: '2026-10-12', label: 'Cinéma', paymentMethod: 'especes', note: null });
    expect((await listNotifications(user.id)).map((n) => n.type).sort()).toEqual(['budget_exceeded', 'budget_warning']);
    await createExpense(user.id, 'XAF', { categoryId: cat('loisirs'), amount: 1000, spentOn: '2026-10-13', label: 'Snack', paymentMethod: 'especes', note: null });
    expect(await listNotifications(user.id)).toHaveLength(2); // pas de doublon

    const totals = await getMonthTotals(user.id, '2026-10');
    expect(totals).toMatchObject({ income: 300000, expenses: 26000 });
    const overview = await getBudgetOverview(user.id, '2026-10');
    expect(overview.adherence).toBe(0);

    const debt = await createDebt(user.id, 'XAF', { name: 'Prêt', type: 'pret_familial', lender: null, principal: 100000, initialBalance: 100000, annualRateBp: 0, minimumPayment: 10000, dueDay: null, startDate: null }, '2026-09-01');
    await recordDebtPayment(user.id, debt.id, { amount: 30000, paidOn: '2026-10-05', note: null });
    await expect(recordDebtPayment(user.id, debt.id, { amount: 80000, paidOn: '2026-10-06', note: null })).rejects.toBeInstanceOf(BusinessRuleError);
    expect((await listDebtSummaries(user.id))[0]!.remaining).toBe(70000);
    const series = await getNetWorthSeries(user.id, ['2026-09', '2026-10']);
    expect(series[1]!.debts).toBe(70000);
    expect(series[0]!.debts).toBe(100000);
  });

  it('compare la période comparable du mois précédent pour le mois en cours', async () => {
    const { user } = await createTestUser();
    await createExpense(user.id, 'XAF', { categoryId: cat('alimentation'), amount: 10000, spentOn: '2026-10-05', label: 'a', paymentMethod: 'especes', note: null });
    await createExpense(user.id, 'XAF', { categoryId: cat('alimentation'), amount: 50000, spentOn: '2026-10-25', label: 'b', paymentMethod: 'especes', note: null });
    await createExpense(user.id, 'XAF', { categoryId: cat('alimentation'), amount: 20000, spentOn: '2026-11-04', label: 'c', paymentMethod: 'especes', note: null });
    const { spends, partial } = await getCategorySpends(user.id, '2026-11', '2026-11-10');
    expect(partial).toBe(true);
    const food = spends.find((s) => s.code === 'alimentation')!;
    expect(food.current).toBe(20000);
    expect(food.previous).toBe(10000); // du 1er au 10 octobre seulement
  });

  it('planifie à partir de l’historique, valide et crée les budgets', async () => {
    const { user, profile } = await createTestUser();
    for (const [code, amount] of [['logement', 90000], ['alimentation', 40000], ['transport', 20000], ['famille', 30000], ['loisirs', 15000]] as const) {
      await createExpense(user.id, 'XAF', { categoryId: cat(code), amount, spentOn: '2026-10-15', label: code, paymentMethod: 'especes', note: null });
    }
    const { plan, context } = await proposePlan(user.id, profile, '2026-11-10', 300000);
    expect(context.needs.source).toBe('historique');
    expect(plan.items.find((i) => i.bucket === 'logement')!.amount).toBe(90000);
    expect(plan.items.reduce((s, i) => s + i.amount, 0)).toBe(300000);
    await expect(savePlan(user.id, 'XAF', { month: '2026-11', incomeId: null, total: 300000, status: 'validated', planStatus: 'ok', notes: [], inputs: {}, items: [{ bucket: 'marge', label: 'm', amount: 1, recommendedAmount: 1, rationale: '' }] })).rejects.toBeInstanceOf(BusinessRuleError);
    const saved = await savePlan(user.id, 'XAF', { month: '2026-11', incomeId: null, total: 300000, status: 'validated', planStatus: plan.status, notes: plan.notes, inputs: {}, items: plan.items.map((i) => ({ ...i, recommendedAmount: i.amount })) });
    const count = await applyPlanAsBudgets(user.id, saved.id);
    expect(count).toBeGreaterThan(3);
    const overview = await getBudgetOverview(user.id, '2026-11');
    const expected = plan.items.filter((i) => ['logement', 'essentiels', 'famille', 'plaisir'].includes(i.bucket)).reduce((s, i) => s + i.amount, 0);
    expect(overview.totalBudget).toBe(expected);
  });

  it('construit le rapport mensuel', async () => {
    const { user, profile } = await createTestUser();
    await createIncome(user.id, 'XAF', { sourceId: null, type: 'salaire', amount: 300000, receivedOn: '2026-10-28', label: 'Salaire', note: null });
    await createExpense(user.id, 'XAF', { categoryId: cat('alimentation'), amount: 270000, spentOn: '2026-10-15', label: 'Tout', paymentMethod: 'especes', note: null });
    const report = await buildReportData(user.id, profile, '2026-10');
    expect(report.savingsRate).toBeCloseTo(0.1);
    expect(report.headline).toContain('15 %');
  });

  it('convertit exactement EUR → XAF et refuse le dollar avec des données', async () => {
    const { user } = await createTestUser({ currency: 'EUR', country: 'OTHER', monthlyIncome: 200000, fixedCharges: 80000, variableExpenses: 50000, currentSavings: 0 });
    await createExpense(user.id, 'EUR', { categoryId: cat('alimentation'), amount: 1000, spentOn: '2026-11-02', label: 'Courses', paymentMethod: 'carte', note: null });
    await expect(changeCurrency(user.id, 'EUR', 'USD')).rejects.toBeInstanceOf(BusinessRuleError);
    await changeCurrency(user.id, 'EUR', 'XAF');
    const [expense] = await listExpenses(user.id, '2026-11');
    expect(expense!.currency).toBe('XAF');
    expect(expense!.amount).toBe(6560); // 10,00 € × 655,957 = 6 559,57 → 6 560 FCFA
    const goals = await listGoalSummaries(user.id, '2026-11-10');
    expect(goals[0]!.goal.currency).toBe('XAF');
    await addContribution(user.id, goals[0]!.goal.id, { amount: 1000, contributedOn: '2026-11-03', note: null, withdrawal: false });
  });
});
