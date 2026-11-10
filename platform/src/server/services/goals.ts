import 'server-only';
import { and, asc, count, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import type { CurrencyCode, GoalType, Plan } from '@/lib/constants';
import { addMonths, monthRange, type DateKey, type MonthKey } from '@/lib/finance/dates';
import { goalMetrics, type GoalMetrics } from '@/lib/finance/goals';
import { db } from '@/server/db';
import { goalContributions, savingsGoals } from '@/server/db/schema';
import { getPlanLimits } from './entitlements';
import { BusinessRuleError, NotFoundError, PlanLimitError } from './errors';

export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type GoalContribution = typeof goalContributions.$inferSelect;

export interface GoalInput {
  name: string;
  type: GoalType;
  targetAmount: number;
  targetDate: DateKey | null;
  plannedMonthly: number | null;
}

export interface GoalSummary {
  goal: SavingsGoal;
  saved: number;
  recentMonthlyAverage: number;
  metrics: GoalMetrics;
}

async function savedByGoal(userId: string, goalIds: string[]): Promise<Map<string, number>> {
  if (goalIds.length === 0) return new Map();
  const rows = await db
    .select({ goalId: goalContributions.goalId, total: sql<number>`coalesce(sum(${goalContributions.amount}), 0)`.mapWith(Number) })
    .from(goalContributions)
    .where(and(eq(goalContributions.userId, userId), inArray(goalContributions.goalId, goalIds)))
    .groupBy(goalContributions.goalId);
  return new Map(rows.map((r) => [r.goalId, r.total]));
}

/** Moyenne mensuelle des versements nets sur les 3 derniers mois complets. */
async function recentAverageByGoal(userId: string, goalIds: string[], currentMonth: MonthKey): Promise<Map<string, number>> {
  if (goalIds.length === 0) return new Map();
  const start = monthRange(addMonths(currentMonth, -3)).start;
  const end = monthRange(currentMonth).start;
  const rows = await db
    .select({ goalId: goalContributions.goalId, total: sql<number>`coalesce(sum(${goalContributions.amount}), 0)`.mapWith(Number) })
    .from(goalContributions)
    .where(
      and(
        eq(goalContributions.userId, userId),
        inArray(goalContributions.goalId, goalIds),
        gte(goalContributions.contributedOn, start),
        lt(goalContributions.contributedOn, end),
      ),
    )
    .groupBy(goalContributions.goalId);
  return new Map(rows.map((r) => [r.goalId, Math.round(r.total / 3)]));
}

export async function listGoalSummaries(userId: string, today: DateKey, options: { includeArchived?: boolean } = {}): Promise<GoalSummary[]> {
  const goals = await db
    .select()
    .from(savingsGoals)
    .where(options.includeArchived ? eq(savingsGoals.userId, userId) : and(eq(savingsGoals.userId, userId), inArray(savingsGoals.status, ['active', 'achieved'])))
    .orderBy(asc(savingsGoals.status), asc(savingsGoals.targetDate), desc(savingsGoals.createdAt));
  const ids = goals.map((g) => g.id);
  const [saved, averages] = await Promise.all([savedByGoal(userId, ids), recentAverageByGoal(userId, ids, today.slice(0, 7))]);
  return goals.map((goal) => {
    const savedAmount = saved.get(goal.id) ?? 0;
    const recentMonthlyAverage = averages.get(goal.id) ?? 0;
    return {
      goal,
      saved: savedAmount,
      recentMonthlyAverage,
      metrics: goalMetrics({
        target: goal.targetAmount,
        saved: savedAmount,
        targetDate: goal.targetDate,
        today,
        monthlyContribution: goal.plannedMonthly ?? (recentMonthlyAverage > 0 ? recentMonthlyAverage : null),
      }),
    };
  });
}

export async function getGoal(userId: string, id: string): Promise<SavingsGoal> {
  const rows = await db.select().from(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId))).limit(1);
  if (!rows[0]) throw new NotFoundError('Objectif introuvable.');
  return rows[0];
}

export async function countActiveGoals(userId: string): Promise<number> {
  const rows = await db.select({ value: count() }).from(savingsGoals).where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.status, 'active')));
  return rows[0]?.value ?? 0;
}

export async function createGoal(
  userId: string,
  plan: Plan,
  currency: CurrencyCode,
  input: GoalInput,
  initialContribution?: { amount: number; on: DateKey } | null,
): Promise<SavingsGoal> {
  const { maxActiveGoals } = getPlanLimits(plan);
  if (maxActiveGoals !== null && (await countActiveGoals(userId)) >= maxActiveGoals) {
    throw new PlanLimitError(`L’offre gratuite permet ${maxActiveGoals} objectifs actifs. Passe à Premium pour des objectifs illimités, ou archive un objectif.`);
  }
  return db.transaction(async (tx) => {
    const [goal] = await tx.insert(savingsGoals).values({ userId, currency, ...input }).returning();
    if (initialContribution && initialContribution.amount > 0) {
      await tx.insert(goalContributions).values({
        goalId: goal!.id,
        userId,
        amount: initialContribution.amount,
        contributedOn: initialContribution.on,
        note: 'Montant déjà épargné',
        isOpeningBalance: true,
      });
      if (initialContribution.amount >= input.targetAmount) {
        await tx.update(savingsGoals).set({ status: 'achieved', achievedAt: new Date() }).where(eq(savingsGoals.id, goal!.id));
      }
    }
    return goal!;
  });
}

export async function updateGoal(userId: string, id: string, input: GoalInput): Promise<SavingsGoal> {
  const [row] = await db
    .update(savingsGoals)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)))
    .returning();
  if (!row) throw new NotFoundError('Objectif introuvable.');
  await refreshGoalStatus(userId, id);
  return row;
}

export async function setGoalArchived(userId: string, plan: Plan, id: string, archived: boolean): Promise<void> {
  const goal = await getGoal(userId, id);
  if (!archived) {
    const { maxActiveGoals } = getPlanLimits(plan);
    if (maxActiveGoals !== null && (await countActiveGoals(userId)) >= maxActiveGoals) {
      throw new PlanLimitError(`L’offre gratuite permet ${maxActiveGoals} objectifs actifs.`);
    }
  }
  await db
    .update(savingsGoals)
    .set({ status: archived ? 'archived' : 'active', updatedAt: new Date() })
    .where(and(eq(savingsGoals.id, goal.id), eq(savingsGoals.userId, userId)));
  if (!archived) await refreshGoalStatus(userId, id);
}

export async function deleteGoal(userId: string, id: string): Promise<void> {
  const rows = await db.delete(savingsGoals).where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId))).returning({ id: savingsGoals.id });
  if (rows.length === 0) throw new NotFoundError('Objectif introuvable.');
}

/** Passe un objectif en « atteint » (ou le réactive) selon le montant épargné. */
async function refreshGoalStatus(userId: string, goalId: string): Promise<void> {
  const goal = await getGoal(userId, goalId);
  if (goal.status === 'archived') return;
  const saved = (await savedByGoal(userId, [goalId])).get(goalId) ?? 0;
  const achieved = saved >= goal.targetAmount;
  if (achieved && goal.status !== 'achieved') {
    await db.update(savingsGoals).set({ status: 'achieved', achievedAt: new Date() }).where(eq(savingsGoals.id, goalId));
  } else if (!achieved && goal.status === 'achieved') {
    await db.update(savingsGoals).set({ status: 'active', achievedAt: null }).where(eq(savingsGoals.id, goalId));
  }
}

export async function addContribution(
  userId: string,
  goalId: string,
  input: { amount: number; contributedOn: DateKey; note: string | null; withdrawal: boolean },
): Promise<GoalContribution> {
  const goal = await getGoal(userId, goalId);
  const signed = input.withdrawal ? -Math.abs(input.amount) : Math.abs(input.amount);
  if (input.withdrawal) {
    const saved = (await savedByGoal(userId, [goal.id])).get(goal.id) ?? 0;
    if (Math.abs(input.amount) > saved) throw new BusinessRuleError('Le retrait dépasse le montant épargné sur cet objectif.');
  }
  const [row] = await db
    .insert(goalContributions)
    .values({ goalId: goal.id, userId, amount: signed, contributedOn: input.contributedOn, note: input.note })
    .returning();
  await refreshGoalStatus(userId, goal.id);
  return row!;
}

export async function deleteContribution(userId: string, contributionId: string): Promise<void> {
  const rows = await db
    .delete(goalContributions)
    .where(and(eq(goalContributions.id, contributionId), eq(goalContributions.userId, userId)))
    .returning({ goalId: goalContributions.goalId });
  if (rows.length === 0) throw new NotFoundError('Versement introuvable.');
  await refreshGoalStatus(userId, rows[0]!.goalId);
}

export async function listContributions(userId: string, goalId: string): Promise<GoalContribution[]> {
  return db
    .select()
    .from(goalContributions)
    .where(and(eq(goalContributions.userId, userId), eq(goalContributions.goalId, goalId)))
    .orderBy(desc(goalContributions.contributedOn), desc(goalContributions.createdAt))
    .limit(200);
}

/** Solde du fonds d'urgence (objectifs de type « fonds_urgence », hors archives). */
export async function emergencyFundBalance(userId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${goalContributions.amount}), 0)`.mapWith(Number) })
    .from(goalContributions)
    .innerJoin(savingsGoals, eq(savingsGoals.id, goalContributions.goalId))
    .where(and(eq(goalContributions.userId, userId), eq(savingsGoals.type, 'fonds_urgence'), inArray(savingsGoals.status, ['active', 'achieved'])));
  return rows[0]?.total ?? 0;
}
