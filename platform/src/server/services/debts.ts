import 'server-only';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { CurrencyCode, DebtType } from '@/lib/constants';
import type { DateKey } from '@/lib/finance/dates';
import { compareStrategies, type DebtInput, type StrategyComparison } from '@/lib/finance/debts';
import { db } from '@/server/db';
import { debtPayments, debts } from '@/server/db/schema';
import { BusinessRuleError, NotFoundError } from './errors';

export type Debt = typeof debts.$inferSelect;
export type DebtPayment = typeof debtPayments.$inferSelect;

export interface DebtFormInput {
  name: string;
  type: DebtType;
  lender: string | null;
  principal: number;
  initialBalance: number;
  annualRateBp: number;
  minimumPayment: number;
  dueDay: number | null;
  startDate: DateKey | null;
}

export interface DebtSummary {
  debt: Debt;
  paid: number;
  remaining: number;
  progress: number;
}

async function paidByDebt(userId: string, debtIds: string[]): Promise<Map<string, number>> {
  if (debtIds.length === 0) return new Map();
  const rows = await db
    .select({ debtId: debtPayments.debtId, total: sql<number>`coalesce(sum(${debtPayments.amount}), 0)`.mapWith(Number) })
    .from(debtPayments)
    .where(and(eq(debtPayments.userId, userId), inArray(debtPayments.debtId, debtIds)))
    .groupBy(debtPayments.debtId);
  return new Map(rows.map((r) => [r.debtId, r.total]));
}

export async function listDebtSummaries(userId: string): Promise<DebtSummary[]> {
  const rows = await db.select().from(debts).where(eq(debts.userId, userId)).orderBy(asc(debts.status), desc(debts.annualRateBp), asc(debts.createdAt));
  const paid = await paidByDebt(userId, rows.map((d) => d.id));
  return rows.map((debt) => {
    const paidAmount = paid.get(debt.id) ?? 0;
    const remaining = Math.max(0, debt.initialBalance - paidAmount);
    return { debt, paid: paidAmount, remaining, progress: debt.initialBalance > 0 ? Math.min(1, paidAmount / debt.initialBalance) : 1 };
  });
}

export async function getDebt(userId: string, id: string): Promise<Debt> {
  const rows = await db.select().from(debts).where(and(eq(debts.id, id), eq(debts.userId, userId))).limit(1);
  if (!rows[0]) throw new NotFoundError('Dette introuvable.');
  return rows[0];
}

export async function createDebt(userId: string, currency: CurrencyCode, input: DebtFormInput, today: DateKey): Promise<Debt> {
  const [row] = await db
    .insert(debts)
    .values({ userId, currency, ...input, recordedOn: today, status: input.initialBalance > 0 ? 'active' : 'paid' })
    .returning();
  return row!;
}

export async function updateDebt(userId: string, id: string, input: DebtFormInput): Promise<Debt> {
  const [row] = await db
    .update(debts)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(debts.id, id), eq(debts.userId, userId)))
    .returning();
  if (!row) throw new NotFoundError('Dette introuvable.');
  await refreshDebtStatus(userId, id);
  return row;
}

export async function deleteDebt(userId: string, id: string): Promise<void> {
  const rows = await db.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, userId))).returning({ id: debts.id });
  if (rows.length === 0) throw new NotFoundError('Dette introuvable.');
}

async function refreshDebtStatus(userId: string, debtId: string): Promise<void> {
  const debt = await getDebt(userId, debtId);
  const paid = (await paidByDebt(userId, [debtId])).get(debtId) ?? 0;
  const status = debt.initialBalance - paid <= 0 ? 'paid' : 'active';
  if (status !== debt.status) await db.update(debts).set({ status, updatedAt: new Date() }).where(eq(debts.id, debtId));
}

export async function recordDebtPayment(userId: string, debtId: string, input: { amount: number; paidOn: DateKey; note: string | null }): Promise<DebtPayment> {
  const debt = await getDebt(userId, debtId);
  const paid = (await paidByDebt(userId, [debt.id])).get(debt.id) ?? 0;
  const remaining = Math.max(0, debt.initialBalance - paid);
  if (remaining <= 0) throw new BusinessRuleError('Cette dette est déjà soldée.');
  if (input.amount > remaining) {
    throw new BusinessRuleError('Le remboursement dépasse le capital restant dû. Si le prêteur applique des intérêts, mets d’abord à jour le solde de la dette.');
  }
  const [row] = await db.insert(debtPayments).values({ debtId: debt.id, userId, ...input }).returning();
  await refreshDebtStatus(userId, debt.id);
  return row!;
}

export async function deleteDebtPayment(userId: string, paymentId: string): Promise<void> {
  const rows = await db
    .delete(debtPayments)
    .where(and(eq(debtPayments.id, paymentId), eq(debtPayments.userId, userId)))
    .returning({ debtId: debtPayments.debtId });
  if (rows.length === 0) throw new NotFoundError('Remboursement introuvable.');
  await refreshDebtStatus(userId, rows[0]!.debtId);
}

export async function listDebtPayments(userId: string, debtId: string): Promise<DebtPayment[]> {
  return db
    .select()
    .from(debtPayments)
    .where(and(eq(debtPayments.userId, userId), eq(debtPayments.debtId, debtId)))
    .orderBy(desc(debtPayments.paidOn))
    .limit(200);
}

export function toDebtInputs(summaries: DebtSummary[]): DebtInput[] {
  return summaries
    .filter((s) => s.remaining > 0)
    .map((s) => ({ id: s.debt.id, name: s.debt.name, balance: s.remaining, annualRateBp: s.debt.annualRateBp, minimumPayment: s.debt.minimumPayment }));
}

export async function compareDebtStrategies(userId: string, extraMonthly: number): Promise<{ summaries: DebtSummary[]; comparison: StrategyComparison | null }> {
  const summaries = await listDebtSummaries(userId);
  const inputs = toDebtInputs(summaries);
  return { summaries, comparison: inputs.length ? compareStrategies(inputs, extraMonthly) : null };
}
