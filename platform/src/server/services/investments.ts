import 'server-only';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { CurrencyCode } from '@/lib/constants';
import type { DateKey } from '@/lib/finance/dates';
import { db } from '@/server/db';
import { investmentMovements, investments } from '@/server/db/schema';
import { BusinessRuleError, NotFoundError } from './errors';

export type Investment = typeof investments.$inferSelect;

export interface InvestmentSummary {
  investment: Investment;
  invested: number;
  value: number;
  gain: number;
}

async function investedById(userId: string, ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: investmentMovements.investmentId, total: sql<number>`coalesce(sum(${investmentMovements.amount}), 0)`.mapWith(Number) })
    .from(investmentMovements)
    .where(and(eq(investmentMovements.userId, userId), inArray(investmentMovements.investmentId, ids)))
    .groupBy(investmentMovements.investmentId);
  return new Map(rows.map((r) => [r.id, r.total]));
}

export async function listInvestmentSummaries(userId: string): Promise<InvestmentSummary[]> {
  const rows = await db.select().from(investments).where(eq(investments.userId, userId)).orderBy(asc(investments.status), desc(investments.createdAt));
  const invested = await investedById(userId, rows.map((r) => r.id));
  return rows.map((investment) => {
    const cost = invested.get(investment.id) ?? 0;
    const value = investment.status === 'closed' ? 0 : (investment.currentValue ?? cost);
    return { investment, invested: cost, value, gain: investment.currentValue === null ? 0 : value - cost };
  });
}

async function getInvestment(userId: string, id: string): Promise<Investment> {
  const rows = await db.select().from(investments).where(and(eq(investments.id, id), eq(investments.userId, userId))).limit(1);
  if (!rows[0]) throw new NotFoundError('Investissement introuvable.');
  return rows[0];
}

export async function createInvestment(
  userId: string,
  currency: CurrencyCode,
  input: { name: string; domain: string; amount: number; movedOn: DateKey; currentValue: number | null; note: string | null },
): Promise<Investment> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(investments)
      .values({ userId, currency, name: input.name, domain: input.domain, currentValue: input.currentValue, valuedOn: input.currentValue !== null ? input.movedOn : null, note: input.note })
      .returning();
    await tx.insert(investmentMovements).values({ investmentId: row!.id, userId, amount: input.amount, movedOn: input.movedOn, note: 'Apport initial' });
    return row!;
  });
}

export async function addInvestmentMovement(
  userId: string,
  id: string,
  input: { amount: number; movedOn: DateKey; withdrawal: boolean; note: string | null },
): Promise<void> {
  const investment = await getInvestment(userId, id);
  if (investment.status === 'closed') throw new BusinessRuleError('Cet investissement est clôturé.');
  await db.insert(investmentMovements).values({
    investmentId: investment.id,
    userId,
    amount: input.withdrawal ? -Math.abs(input.amount) : Math.abs(input.amount),
    movedOn: input.movedOn,
    note: input.note,
  });
}

export async function updateInvestmentValue(userId: string, id: string, currentValue: number | null, valuedOn: DateKey): Promise<void> {
  const rows = await db
    .update(investments)
    .set({ currentValue, valuedOn: currentValue === null ? null : valuedOn, updatedAt: new Date() })
    .where(and(eq(investments.id, id), eq(investments.userId, userId)))
    .returning({ id: investments.id });
  if (rows.length === 0) throw new NotFoundError('Investissement introuvable.');
}

export async function setInvestmentClosed(userId: string, id: string, closed: boolean): Promise<void> {
  const rows = await db
    .update(investments)
    .set({ status: closed ? 'closed' : 'active', updatedAt: new Date() })
    .where(and(eq(investments.id, id), eq(investments.userId, userId)))
    .returning({ id: investments.id });
  if (rows.length === 0) throw new NotFoundError('Investissement introuvable.');
}

export async function deleteInvestment(userId: string, id: string): Promise<void> {
  const rows = await db.delete(investments).where(and(eq(investments.id, id), eq(investments.userId, userId))).returning({ id: investments.id });
  if (rows.length === 0) throw new NotFoundError('Investissement introuvable.');
}
