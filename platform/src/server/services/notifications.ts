import 'server-only';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { formatMonthLabel, monthRange, type MonthKey } from '@/lib/finance/dates';
import { formatMoney } from '@/lib/finance/money';
import { db } from '@/server/db';
import { budgets, categories, expenses, notifications } from '@/server/db/schema';

export type Notification = typeof notifications.$inferSelect;

/** Crée une notification ; ignorée si une notification de même clé existe déjà (pas de doublon). */
export async function notify(
  userId: string,
  data: { type: string; title: string; body: string; link?: string | null; dedupeKey: string },
): Promise<boolean> {
  const rows = await db
    .insert(notifications)
    .values({ userId, type: data.type, title: data.title, body: data.body, link: data.link ?? null, dedupeKey: data.dedupeKey })
    .onConflictDoNothing()
    .returning({ id: notifications.id });
  return rows.length > 0;
}

export async function listNotifications(userId: string, limit = 50): Promise<Notification[]> {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows[0]?.value ?? 0;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/**
 * Alerte budgétaire : à 80 % puis à 100 % du budget d'une catégorie (une seule fois par seuil et par mois).
 */
export async function notifyBudgetThresholds(userId: string, categoryId: string, month: MonthKey): Promise<void> {
  const budgetRows = await db
    .select({ amount: budgets.amount, currency: budgets.currency, name: categories.nameFr })
    .from(budgets)
    .innerJoin(categories, eq(categories.id, budgets.categoryId))
    .where(and(eq(budgets.userId, userId), eq(budgets.categoryId, categoryId), eq(budgets.month, month)))
    .limit(1);
  const budget = budgetRows[0];
  if (!budget || budget.amount <= 0) return;
  const { start, end } = monthRange(month);
  const spentRows = await db
    .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number) })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.categoryId, categoryId),
        sql`${expenses.spentOn} >= ${start}`,
        sql`${expenses.spentOn} < ${end}`,
      ),
    );
  const spent = spentRows[0]?.total ?? 0;
  const money = (v: number) => formatMoney(v, budget.currency);
  const monthLabel = formatMonthLabel(month).toLowerCase();
  if (spent > budget.amount) {
    await notify(userId, {
      type: 'budget_exceeded',
      title: `Budget ${budget.name} dépassé`,
      body: `Tu as dépensé ${money(spent)} pour un budget de ${money(budget.amount)} en ${monthLabel} (${money(spent - budget.amount)} de dépassement).`,
      link: `/app/budgets?month=${month}`,
      dedupeKey: `budget:${categoryId}:${month}:100`,
    });
  } else if (spent >= budget.amount * 0.8) {
    await notify(userId, {
      type: 'budget_warning',
      title: `Budget ${budget.name} presque atteint`,
      body: `${Math.round((spent / budget.amount) * 100)} % de ton budget ${budget.name.toLowerCase()} est utilisé (reste ${money(budget.amount - spent)}).`,
      link: `/app/budgets?month=${month}`,
      dedupeKey: `budget:${categoryId}:${month}:80`,
    });
  }
}
