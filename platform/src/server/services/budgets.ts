import 'server-only';
import { and, eq } from 'drizzle-orm';
import type { CurrencyCode } from '@/lib/constants';
import { addMonths, monthRange, type MonthKey } from '@/lib/finance/dates';
import { db } from '@/server/db';
import { budgets } from '@/server/db/schema';
import { getActiveCategory, listCategories, type Category } from './categories';
import { BusinessRuleError, NotFoundError } from './errors';
import { spendByCategory } from './expenses';
import { notifyBudgetThresholds } from './notifications';

export type Budget = typeof budgets.$inferSelect;

export interface BudgetLine {
  category: Category;
  budget: Budget | null;
  spent: number;
  remaining: number | null;
  ratio: number | null;
}

export async function listBudgets(userId: string, month: MonthKey): Promise<Budget[]> {
  return db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, month)));
}

/** Budgets du mois + dépenses réelles par catégorie (catégories budgétées ou avec dépenses). */
export async function getBudgetOverview(userId: string, month: MonthKey): Promise<{ lines: BudgetLine[]; totalBudget: number; totalSpentBudgeted: number; adherence: number | null }> {
  const { start, end } = monthRange(month);
  const [allCategories, monthBudgets, spending] = await Promise.all([listCategories(), listBudgets(userId, month), spendByCategory(userId, start, end)]);
  const byCategory = new Map(monthBudgets.map((b) => [b.categoryId, b]));
  const lines: BudgetLine[] = allCategories
    .filter((c) => c.isActive || byCategory.has(c.id) || spending.has(c.id))
    .map((category) => {
      const budget = byCategory.get(category.id) ?? null;
      const spent = spending.get(category.id) ?? 0;
      return {
        category,
        budget,
        spent,
        remaining: budget ? budget.amount - spent : null,
        ratio: budget && budget.amount > 0 ? spent / budget.amount : null,
      };
    });
  const budgeted = lines.filter((l) => l.budget && l.budget.amount > 0);
  const totalBudget = budgeted.reduce((s, l) => s + (l.budget?.amount ?? 0), 0);
  const totalSpentBudgeted = budgeted.reduce((s, l) => s + l.spent, 0);
  const adherence = budgeted.length ? budgeted.filter((l) => l.spent <= (l.budget?.amount ?? 0)).length / budgeted.length : null;
  return { lines, totalBudget, totalSpentBudgeted, adherence };
}

export async function upsertBudget(userId: string, currency: CurrencyCode, input: { categoryId: string; month: MonthKey; amount: number }): Promise<Budget> {
  const category = await getActiveCategory(input.categoryId);
  if (!category) throw new BusinessRuleError('Catégorie inconnue ou désactivée.');
  const [row] = await db
    .insert(budgets)
    .values({ userId, currency, categoryId: input.categoryId, month: input.month, amount: input.amount })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.month],
      set: { amount: input.amount, currency, updatedAt: new Date() },
    })
    .returning();
  await notifyBudgetThresholds(userId, input.categoryId, input.month);
  return row!;
}

export async function deleteBudget(userId: string, id: string): Promise<void> {
  const rows = await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId))).returning({ id: budgets.id });
  if (rows.length === 0) throw new NotFoundError('Budget introuvable.');
}

/** Copie les budgets du mois précédent vers `month` (sans écraser les budgets existants). */
export async function copyBudgetsFromPreviousMonth(userId: string, currency: CurrencyCode, month: MonthKey): Promise<number> {
  const previous = await listBudgets(userId, addMonths(month, -1));
  if (previous.length === 0) return 0;
  const rows = await db
    .insert(budgets)
    .values(previous.map((b) => ({ userId, currency, categoryId: b.categoryId, month, amount: b.amount })))
    .onConflictDoNothing()
    .returning({ id: budgets.id });
  return rows.length;
}

/** Remplace en bloc les budgets d'un mois (utilisé par le planificateur). */
export async function setBudgetsForMonth(userId: string, currency: CurrencyCode, month: MonthKey, amounts: Record<string, number>): Promise<number> {
  const entries = Object.entries(amounts).filter(([, amount]) => amount >= 0);
  if (entries.length === 0) return 0;
  await db.transaction(async (tx) => {
    for (const [categoryId, amount] of entries) {
      await tx
        .insert(budgets)
        .values({ userId, currency, categoryId, month, amount })
        .onConflictDoUpdate({ target: [budgets.userId, budgets.categoryId, budgets.month], set: { amount, currency, updatedAt: new Date() } });
    }
  });
  return entries.length;
}
