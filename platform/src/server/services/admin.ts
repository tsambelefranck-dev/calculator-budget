import 'server-only';
import { and, count, desc, eq, gte, ilike, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { Plan } from '@/lib/constants';
import { db } from '@/server/db';
import {
  aiMessages,
  auditLogs,
  categories,
  errorLogs,
  expenses,
  financialProfiles,
  investmentDomains,
  lessons,
  publications,
  sessions,
  subscriptions,
  users,
} from '@/server/db/schema';
import { usageSummarySince } from '@/server/ai/usage';
import { BusinessRuleError, NotFoundError } from './errors';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Statistiques AGRÉGÉES uniquement : aucun montant ni opération d'un utilisateur n'est exposé
 * à l'administration.
 */
export async function getAdminStats() {
  const now = Date.now();
  const since7 = new Date(now - 7 * DAY);
  const since30 = new Date(now - 30 * DAY);
  const real = and(eq(users.isDemo, false));
  const [[total], [active7], [active30], [premium], [onboarded], [new30], [demo], [expenseCount], [aiMessages30]] = await Promise.all([
    db.select({ v: count() }).from(users).where(real),
    db.select({ v: count() }).from(users).where(and(real, gte(users.lastLoginAt, since7))),
    db.select({ v: count() }).from(users).where(and(real, gte(users.lastLoginAt, since30))),
    db.select({ v: count() }).from(users).where(and(real, eq(users.plan, 'premium'), or(isNull(users.premiumUntil), gte(users.premiumUntil, new Date())))),
    db.select({ v: count() }).from(financialProfiles).innerJoin(users, eq(users.id, financialProfiles.userId)).where(real),
    db.select({ v: count() }).from(users).where(and(real, gte(users.createdAt, since30))),
    db.select({ v: count() }).from(users).where(eq(users.isDemo, true)),
    db.select({ v: count() }).from(expenses).where(gte(expenses.createdAt, since30)),
    db.select({ v: count() }).from(aiMessages).where(and(eq(aiMessages.role, 'user'), gte(aiMessages.createdAt, since30))),
  ]);
  const usage = await usageSummarySince(since30);
  const aiCost30 = usage.reduce((s, u) => s + u.cost, 0);
  return {
    users: total!.v,
    active7: active7!.v,
    active30: active30!.v,
    premium: premium!.v,
    onboardingRate: total!.v ? onboarded!.v / total!.v : 0,
    new30: new30!.v,
    demoAccounts: demo!.v,
    expenses30: expenseCount!.v,
    aiMessages30: aiMessages30!.v,
    aiCostUsd30: aiCost30 / 1_000_000,
    usage,
  };
}

export async function aiDailyCosts(days = 30) {
  const result = await db.execute<{ day: string; cost: string; calls: string }>(
    sql`select to_char(created_at, 'YYYY-MM-DD') as day, sum(cost_micro_usd) as cost, count(*) as calls from ai_usage where created_at >= now() - make_interval(days => ${days}) group by 1 order by 1`,
  );
  return result.rows.map((r) => ({ day: r.day, costUsd: Number(r.cost) / 1_000_000, calls: Number(r.calls) }));
}

export async function listUsersForAdmin(search: string | undefined, page: number) {
  const where = search ? or(ilike(users.email, `%${search.replace(/[%_\\]/g, '')}%`), ilike(users.name, `%${search.replace(/[%_\\]/g, '')}%`)) : undefined;
  const pageSize = 25;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      plan: users.plan,
      premiumUntil: users.premiumUntil,
      isDemo: users.isDemo,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      onboarded: sql<boolean>`exists(select 1 from ${financialProfiles} fp where fp.user_id = ${users.id})`,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(pageSize + 1)
    .offset(page * pageSize);
  return { rows: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export async function adminSetPlan(actorId: string, userId: string, plan: Plan, until: Date | null): Promise<void> {
  const rows = await db.update(users).set({ plan, premiumUntil: plan === 'premium' ? until : null, updatedAt: new Date() }).where(eq(users.id, userId)).returning({ id: users.id });
  if (!rows.length) throw new NotFoundError('Utilisateur introuvable.');
  if (plan === 'premium') {
    await db.insert(subscriptions).values({ userId, plan, interval: 'custom', status: 'active', provider: 'manual', periodStart: new Date(), periodEnd: until, createdBy: actorId });
  } else {
    await db.update(subscriptions).set({ status: 'canceled' }).where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')));
  }
}

export async function adminSetRole(actorId: string, userId: string, role: 'user' | 'admin'): Promise<void> {
  if (actorId === userId && role !== 'admin') throw new BusinessRuleError('Tu ne peux pas retirer ton propre rôle administrateur.');
  const rows = await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId)).returning({ id: users.id });
  if (!rows.length) throw new NotFoundError('Utilisateur introuvable.');
}

export async function adminSetDisabled(actorId: string, userId: string, disabled: boolean): Promise<void> {
  if (actorId === userId) throw new BusinessRuleError('Tu ne peux pas désactiver ton propre compte.');
  const rows = await db.update(users).set({ disabledAt: disabled ? new Date() : null, updatedAt: new Date() }).where(eq(users.id, userId)).returning({ id: users.id });
  if (!rows.length) throw new NotFoundError('Utilisateur introuvable.');
  if (disabled) await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function listErrorLogs(limit = 50) {
  return db.select().from(errorLogs).orderBy(desc(errorLogs.createdAt)).limit(limit);
}

export async function listAuditLogs(limit = 100) {
  return db
    .select({ id: auditLogs.id, action: auditLogs.action, createdAt: auditLogs.createdAt, ip: auditLogs.ip, metadata: auditLogs.metadata, email: users.email })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function listAllLessons() {
  return db.select().from(lessons).orderBy(lessons.sortOrder);
}

export async function updateLesson(id: string, data: { title: string; summary: string; body: string; isPublished: boolean; isPremium: boolean }) {
  const rows = await db.update(lessons).set({ ...data, updatedAt: new Date() }).where(eq(lessons.id, id)).returning({ id: lessons.id });
  if (!rows.length) throw new NotFoundError('Leçon introuvable.');
}

export async function listAllDomains() {
  return db.select().from(investmentDomains).orderBy(investmentDomains.sortOrder);
}

export async function updateDomainMeta(id: string, data: { isPublished: boolean; sourcesConsultedAt: string | null }) {
  const rows = await db.select().from(investmentDomains).where(eq(investmentDomains.id, id)).limit(1);
  if (!rows[0]) throw new NotFoundError('Domaine introuvable.');
  const sources = data.sourcesConsultedAt ? rows[0].sources.map((s) => ({ ...s, consultedAt: data.sourcesConsultedAt })) : rows[0].sources;
  await db.update(investmentDomains).set({ isPublished: data.isPublished, sources, updatedAt: new Date() }).where(eq(investmentDomains.id, id));
}

export async function createPublication(authorId: string, data: { title: string; body: string; sourceName: string; sourceUrl: string; consultedAt: string; country: string | null }) {
  await db.insert(publications).values({ ...data, authorId });
}

export async function deletePublication(id: string) {
  await db.delete(publications).where(eq(publications.id, id));
}

export async function listAllPublications() {
  return db.select().from(publications).orderBy(desc(publications.createdAt)).limit(50);
}

export async function listAllCategories() {
  return db.select().from(categories).orderBy(categories.sortOrder);
}

export async function upsertCategory(data: { id: string | null; code: string; nameFr: string; nameEn: string; color: string; isEssential: boolean; isActive: boolean; plannerBucket: (typeof categories.$inferInsert)['plannerBucket'] }) {
  if (data.id) {
    const { id, code: _code, ...rest } = data;
    const rows = await db.update(categories).set(rest).where(eq(categories.id, id)).returning({ id: categories.id });
    if (!rows.length) throw new NotFoundError('Catégorie introuvable.');
  } else {
    const { id: _id, ...rest } = data;
    await db.insert(categories).values({ ...rest, icon: 'more-horizontal', sortOrder: 100 }).onConflictDoNothing();
  }
}

export async function countDisabledUsers() {
  const [r] = await db.select({ v: count() }).from(users).where(isNotNull(users.disabledAt));
  return r!.v;
}
