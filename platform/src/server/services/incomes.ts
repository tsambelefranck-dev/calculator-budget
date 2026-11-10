import 'server-only';
import { and, asc, desc, eq, gte, lt, sql } from 'drizzle-orm';
import type { CurrencyCode, IncomeSourceType } from '@/lib/constants';
import { monthRange, sameDayInMonth, type DateKey, type MonthKey } from '@/lib/finance/dates';
import { db } from '@/server/db';
import { incomeSources, incomes } from '@/server/db/schema';
import { NotFoundError } from './errors';

export type IncomeSource = typeof incomeSources.$inferSelect;
export type Income = typeof incomes.$inferSelect;

export interface IncomeSourceInput {
  name: string;
  type: IncomeSourceType;
  isFixed: boolean;
  expectedAmount: number | null;
  recurrence: 'none' | 'monthly';
  payDay: number | null;
}

export interface IncomeInput {
  sourceId: string | null;
  type: IncomeSourceType;
  amount: number;
  receivedOn: DateKey;
  label: string;
  note: string | null;
}

export async function listIncomeSources(userId: string): Promise<IncomeSource[]> {
  return db.select().from(incomeSources).where(eq(incomeSources.userId, userId)).orderBy(desc(incomeSources.isActive), asc(incomeSources.name));
}

export async function getIncomeSource(userId: string, id: string): Promise<IncomeSource> {
  const rows = await db.select().from(incomeSources).where(and(eq(incomeSources.id, id), eq(incomeSources.userId, userId))).limit(1);
  if (!rows[0]) throw new NotFoundError('Source de revenu introuvable.');
  return rows[0];
}

export async function createIncomeSource(userId: string, currency: CurrencyCode, input: IncomeSourceInput): Promise<IncomeSource> {
  const [row] = await db
    .insert(incomeSources)
    .values({ userId, currency, ...input, payDay: input.recurrence === 'monthly' ? input.payDay : null })
    .returning();
  return row!;
}

export async function updateIncomeSource(userId: string, id: string, input: IncomeSourceInput & { isActive: boolean }): Promise<IncomeSource> {
  const [row] = await db
    .update(incomeSources)
    .set({ ...input, payDay: input.recurrence === 'monthly' ? input.payDay : null, updatedAt: new Date() })
    .where(and(eq(incomeSources.id, id), eq(incomeSources.userId, userId)))
    .returning();
  if (!row) throw new NotFoundError('Source de revenu introuvable.');
  return row;
}

export async function deleteIncomeSource(userId: string, id: string): Promise<void> {
  const rows = await db.delete(incomeSources).where(and(eq(incomeSources.id, id), eq(incomeSources.userId, userId))).returning({ id: incomeSources.id });
  if (rows.length === 0) throw new NotFoundError('Source de revenu introuvable.');
}

export async function listIncomes(userId: string, month: MonthKey): Promise<Income[]> {
  const { start, end } = monthRange(month);
  return db
    .select()
    .from(incomes)
    .where(and(eq(incomes.userId, userId), gte(incomes.receivedOn, start), lt(incomes.receivedOn, end)))
    .orderBy(desc(incomes.receivedOn), desc(incomes.createdAt));
}

export async function getIncome(userId: string, id: string): Promise<Income> {
  const rows = await db.select().from(incomes).where(and(eq(incomes.id, id), eq(incomes.userId, userId))).limit(1);
  if (!rows[0]) throw new NotFoundError('Revenu introuvable.');
  return rows[0];
}

async function assertSourceOwnership(userId: string, sourceId: string | null): Promise<void> {
  if (sourceId) await getIncomeSource(userId, sourceId);
}

export async function createIncome(userId: string, currency: CurrencyCode, input: IncomeInput): Promise<Income> {
  await assertSourceOwnership(userId, input.sourceId);
  const [row] = await db.insert(incomes).values({ userId, currency, ...input }).returning();
  return row!;
}

export async function updateIncome(userId: string, id: string, input: IncomeInput): Promise<Income> {
  await assertSourceOwnership(userId, input.sourceId);
  const [row] = await db
    .update(incomes)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
    .returning();
  if (!row) throw new NotFoundError('Revenu introuvable.');
  return row;
}

export async function deleteIncome(userId: string, id: string): Promise<void> {
  const rows = await db.delete(incomes).where(and(eq(incomes.id, id), eq(incomes.userId, userId))).returning({ id: incomes.id });
  if (rows.length === 0) throw new NotFoundError('Revenu introuvable.');
}

export interface ExpectedIncome {
  source: IncomeSource;
  expectedOn: DateKey;
  amount: number;
}

/**
 * Revenus récurrents attendus ce mois-ci et pas encore enregistrés
 * (aucune entrée liée à la source dans le mois).
 */
export async function listExpectedIncomes(userId: string, month: MonthKey): Promise<ExpectedIncome[]> {
  const { start, end } = monthRange(month);
  const sources = await db
    .select()
    .from(incomeSources)
    .where(and(eq(incomeSources.userId, userId), eq(incomeSources.isActive, true), eq(incomeSources.recurrence, 'monthly')));
  if (sources.length === 0) return [];
  const received = await db
    .select({ sourceId: incomes.sourceId })
    .from(incomes)
    .where(and(eq(incomes.userId, userId), gte(incomes.receivedOn, start), lt(incomes.receivedOn, end)));
  const receivedIds = new Set(received.map((r) => r.sourceId).filter(Boolean));
  return sources
    .filter((s) => !receivedIds.has(s.id) && (s.expectedAmount ?? 0) > 0)
    .map((s) => ({ source: s, expectedOn: sameDayInMonth(s.payDay ?? 1, month), amount: s.expectedAmount ?? 0 }))
    .sort((a, b) => a.expectedOn.localeCompare(b.expectedOn));
}

/** Somme des revenus récurrents fixes attendus chaque mois (utile pour les prévisions). */
export async function expectedMonthlyIncome(userId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${incomeSources.expectedAmount}), 0)`.mapWith(Number) })
    .from(incomeSources)
    .where(and(eq(incomeSources.userId, userId), eq(incomeSources.isActive, true), eq(incomeSources.recurrence, 'monthly')));
  return rows[0]?.total ?? 0;
}
