import { describe, expect, it } from 'vitest';
import { listCategories } from '@/server/services/categories';
import { NotFoundError } from '@/server/services/errors';
import { createExpense, deleteExpense, getExpense, listExpenses, updateExpense } from '@/server/services/expenses';
import { addContribution, createGoal, deleteGoal, listGoalSummaries } from '@/server/services/goals';
import { createDebt, deleteDebt, recordDebtPayment } from '@/server/services/debts';
import { createIncome, deleteIncome, getIncome } from '@/server/services/incomes';
import { deletePlan, getPlan, savePlan } from '@/server/services/planner';
import { deleteConversation, getConversationMessages, getOrCreateConversation } from '@/server/ai/agent';
import { exportUserData } from '@/server/services/account';
import { createTestUser } from './helpers';

/** Tests d'autorisation : un utilisateur ne peut ni lire ni modifier les données d'un autre (IDOR). */
describe('isolation des données entre utilisateurs', async () => {
  const a = await createTestUser();
  const b = await createTestUser();
  const category = (await listCategories()).find((c) => c.code === 'alimentation')!;
  const expense = await createExpense(a.user.id, 'XAF', { categoryId: category.id, amount: 15000, spentOn: '2026-11-05', label: 'Marché', paymentMethod: 'especes', note: null });

  it('refuse lecture, modification et suppression d’une dépense d’autrui', async () => {
    await expect(getExpense(b.user.id, expense.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(updateExpense(b.user.id, expense.id, { categoryId: category.id, amount: 1, spentOn: '2026-11-05', label: 'pirate', paymentMethod: 'especes', note: null })).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteExpense(b.user.id, expense.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await getExpense(a.user.id, expense.id)).amount).toBe(15000);
    expect(await listExpenses(b.user.id, '2026-11')).toHaveLength(0);
  });

  it('protège revenus, objectifs, dettes, plans et conversations', async () => {
    const income = await createIncome(a.user.id, 'XAF', { sourceId: null, type: 'salaire', amount: 300000, receivedOn: '2026-11-01', label: 'Salaire', note: null });
    await expect(getIncome(b.user.id, income.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteIncome(b.user.id, income.id)).rejects.toBeInstanceOf(NotFoundError);

    const goal = await createGoal(a.user.id, 'free', 'XAF', { name: 'Voiture', type: 'voiture', targetAmount: 1_000_000, targetDate: null, plannedMonthly: null });
    await expect(addContribution(b.user.id, goal.id, { amount: 1000, contributedOn: '2026-11-05', note: null, withdrawal: false })).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteGoal(b.user.id, goal.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await listGoalSummaries(b.user.id, '2026-11-10')).some((g) => g.goal.id === goal.id)).toBe(false);

    const debt = await createDebt(a.user.id, 'XAF', { name: 'Crédit', type: 'credit_bancaire', lender: null, principal: 100000, initialBalance: 100000, annualRateBp: 1200, minimumPayment: 10000, dueDay: null, startDate: null }, '2026-11-01');
    await expect(recordDebtPayment(b.user.id, debt.id, { amount: 1000, paidOn: '2026-11-05', note: null })).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteDebt(b.user.id, debt.id)).rejects.toBeInstanceOf(NotFoundError);

    const plan = await savePlan(a.user.id, 'XAF', { month: '2026-11', incomeId: income.id, total: 1000, status: 'validated', planStatus: 'ok', notes: [], inputs: {}, items: [{ bucket: 'marge', label: 'Marge', amount: 1000, recommendedAmount: 1000, rationale: '' }] });
    await expect(getPlan(b.user.id, plan.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(deletePlan(b.user.id, plan.id)).rejects.toBeInstanceOf(NotFoundError);
    // Un plan ne peut pas référencer le revenu d'un autre utilisateur.
    await expect(savePlan(b.user.id, 'XAF', { month: '2026-11', incomeId: income.id, total: 1000, status: 'validated', planStatus: 'ok', notes: [], inputs: {}, items: [{ bucket: 'marge', label: 'Marge', amount: 1000, recommendedAmount: 1000, rationale: '' }] })).rejects.toBeInstanceOf(NotFoundError);

    const conversation = await getOrCreateConversation(a.user.id, null, 'Bonjour');
    await expect(getConversationMessages(b.user.id, conversation)).rejects.toBeInstanceOf(NotFoundError);
    await expect(getOrCreateConversation(b.user.id, conversation, 'intrusion')).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteConversation(b.user.id, conversation)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('exporte uniquement les données de l’utilisateur', async () => {
    const exportA = await exportUserData(a.user.id);
    const exportB = await exportUserData(b.user.id);
    expect((exportA.expenses as unknown[]).length).toBeGreaterThan(0);
    expect((exportB.expenses as unknown[]).length).toBe(0);
    expect(JSON.stringify(exportB)).not.toContain(a.user.email);
    expect(JSON.stringify(exportA)).not.toContain('password');
  });
});
