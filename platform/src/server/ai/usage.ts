import 'server-only';
import { and, count, eq, gte, sql } from 'drizzle-orm';
import type { Plan } from '@/lib/constants';
import { db } from '@/server/db';
import { aiMessages, aiUsage } from '@/server/db/schema';
import { getPlanLimits } from '@/server/services/entitlements';
import { estimateCostMicroUsd } from './config';
import type { TurnUsage } from './provider';

function startOfMonthUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function messagesUsedThisMonth(userId: string): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(aiMessages)
    .where(and(eq(aiMessages.userId, userId), eq(aiMessages.role, 'user'), gte(aiMessages.createdAt, startOfMonthUtc())));
  return rows[0]?.value ?? 0;
}

export async function getQuota(userId: string, plan: Plan): Promise<{ used: number; limit: number; remaining: number }> {
  const limit = getPlanLimits(plan).aiMessagesPerMonth;
  const used = await messagesUsedThisMonth(userId);
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export async function recordUsage(userId: string | null, kind: 'chat' | 'report', model: string, usage: TurnUsage): Promise<void> {
  await db.insert(aiUsage).values({
    userId,
    kind,
    model,
    inputTokens: usage.input,
    outputTokens: usage.output,
    cacheReadTokens: usage.cacheRead,
    cacheWriteTokens: usage.cacheWrite,
    costMicroUsd: estimateCostMicroUsd(model, usage),
  });
}

export async function usageSummarySince(since: Date) {
  return db
    .select({
      model: aiUsage.model,
      kind: aiUsage.kind,
      calls: count(),
      input: sql<number>`coalesce(sum(${aiUsage.inputTokens}),0)`.mapWith(Number),
      output: sql<number>`coalesce(sum(${aiUsage.outputTokens}),0)`.mapWith(Number),
      cacheRead: sql<number>`coalesce(sum(${aiUsage.cacheReadTokens}),0)`.mapWith(Number),
      cost: sql<number>`coalesce(sum(${aiUsage.costMicroUsd}),0)`.mapWith(Number),
    })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, since))
    .groupBy(aiUsage.model, aiUsage.kind);
}
