import 'server-only';
import { and, desc, eq, gte, ilike, lt, sql } from 'drizzle-orm';
import type { CurrencyCode, PaymentMethod } from '@/lib/constants';
import { monthRange, type DateKey, type MonthKey } from '@/lib/finance/dates';
import { db } from '@/server/db';
import { budgets, categories, expenses } from '@/server/db/schema';
import { getActiveCategory } from './categories';
import { BusinessRuleError, NotFoundError } from './errors';
import { notifyBudgetThresholds } from './notifications';

export type Expense = typeof expenses.$inferSelect;

export interface ExpenseInput {
  categoryId: string;
  amount: number;
  spentOn: DateKey;
  label: string;
  paymentMethod: PaymentMethod;
  note: string | null;
}

export interface ExpenseFilters {
  categoryId?: string;
  search?: string;
}

export async function listExpenses(userId: string, month: MonthKey, filters: ExpenseFilters = {}): Promise<Expense[]> {
  const { start, end } = monthRange(month);
  const conditions = [eq(expenses.userId, userId), gte(expenses.spentOn, start), lt(expenses.spentOn, end)];
  if (filters.categoryId) conditions.push(eq(expenses.categoryId, filters.categoryId));
  if (filters.search) conditions.push(ilike(expenses.label, `%${filters.search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`));
  return db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.spentOn), desc(expenses.createdAt))
    .limit(500);
}

export async function getExpense(userId: string, id: string): Promise<Expense> {
  const rows = await db.select().from(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId))).limit(1);
  if (!rows[0]) throw new NotFoundError('Dépense introuvable.');
  return rows[0];
}

async function assertCategory(categoryId: string) {
  const category = await getActiveCategory(categoryId);
  if (!category) throw new BusinessRuleError('Catégorie inconnue ou désactivée.');
  return category;
}

export async function createExpense(userId: string, currency: CurrencyCode, input: ExpenseInput): Promise<Expense> {
  await assertCategory(input.categoryId);
  const [row] = await db.insert(expenses).values({ userId, currency, ...input }).returning();
  await notifyBudgetThresholds(userId, input.categoryId, input.spentOn.slice(0, 7));
  return row!;
}

export async function updateExpense(userId: string, id: string, input: ExpenseInput): Promise<Expense> {
  await assertCategory(input.categoryId);
  const [row] = await db
    .update(expenses)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
    .returning();
  if (!row) throw new NotFoundError('Dépense introuvable.');
  await notifyBudgetThresholds(userId, input.categoryId, input.spentOn.slice(0, 7));
  return row;
}

export async function deleteExpense(userId: string, id: string): Promise<void> {
  const rows = await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId))).returning({ id: expenses.id });
  if (rows.length === 0) throw new NotFoundError('Dépense introuvable.');
}

/** Dépenses par catégorie entre deux dates (fin exclue). */
export async function spendByCategory(userId: string, start: DateKey, end: DateKey): Promise<Map<string, number>> {
  const rows = await db
    .select({ categoryId: expenses.categoryId, total: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number) })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), gte(expenses.spentOn, start), lt(expenses.spentOn, end)))
    .groupBy(expenses.categoryId);
  return new Map(rows.map((r) => [r.categoryId, r.total]));
}

/** Dépenses d'une catégorie sur un mois. */
export async function categorySpendForMonth(userId: string, categoryId: string, month: MonthKey): Promise<number> {
  const { start, end } = monthRange(month);
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number) })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), eq(expenses.categoryId, categoryId), gte(expenses.spentOn, start), lt(expenses.spentOn, end)));
  return rows[0]?.total ?? 0;
}

/** Les plus grosses dépenses d'un mois (pour l'agent IA et le rapport). */
export async function topExpenses(userId: string, month: MonthKey, limit = 8) {
  const { start, end } = monthRange(month);
  return db
    .select({ label: expenses.label, amount: expenses.amount, spentOn: expenses.spentOn, category: categories.nameFr })
    .from(expenses)
    .innerJoin(categories, eq(categories.id, expenses.categoryId))
    .where(and(eq(expenses.userId, userId), gte(expenses.spentOn, start), lt(expenses.spentOn, end)))
    .orderBy(desc(expenses.amount))
    .limit(limit);
}

export async function hasBudgetsForMonth(userId: string, month: MonthKey): Promise<boolean> {
  const rows = await db.select({ id: budgets.id }).from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, month))).limit(1);
  return rows.length > 0;
}
