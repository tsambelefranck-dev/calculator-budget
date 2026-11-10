import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, ne, lt, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import type { Plan } from '@/lib/constants';
import { db } from '@/server/db';
import { sessions, users } from '@/server/db/schema';

export const SESSION_COOKIE = 'nexafi_session';
const DAY_MS = 24 * 60 * 60 * 1000;
export const SESSION_DURATION_MS = 30 * DAY_MS;
const RENEW_THRESHOLD_MS = 15 * DAY_MS;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  /** Plan effectif (tient compte de l'expiration du Premium). */
  plan: Plan;
  premiumUntil: Date | null;
  trialUsedAt: Date | null;
  locale: 'fr' | 'en';
  isDemo: boolean;
  aiDataConsent: boolean;
  createdAt: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function effectivePlan(plan: Plan, premiumUntil: Date | null, now = new Date()): Plan {
  if (plan !== 'premium') return 'free';
  if (premiumUntil && premiumUntil.getTime() <= now.getTime()) return 'free';
  return 'premium';
}

export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string; durationMs?: number } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + (meta.durationMs ?? SESSION_DURATION_MS));
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
  });
  return { token, expiresAt };
}

/**
 * Valide un jeton de session : renvoie l'utilisateur ou `null`.
 * Prolonge la session (expiration glissante) quand elle approche de son terme.
 */
export async function validateSessionToken(token: string): Promise<{ session: AuthSession; user: AuthUser } | null> {
  if (!token || token.length > 100) return null;
  const sessionId = hashToken(token);
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sessionId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const now = Date.now();
  if (row.session.expiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }
  if (row.user.disabledAt) return null;
  if (row.user.isDemo && row.user.demoExpiresAt && row.user.demoExpiresAt.getTime() <= now) return null;

  let expiresAt = row.session.expiresAt;
  if (!row.user.isDemo && expiresAt.getTime() - now < RENEW_THRESHOLD_MS) {
    expiresAt = new Date(now + SESSION_DURATION_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, sessionId));
  }

  const u = row.user;
  return {
    session: { id: sessionId, userId: u.id, expiresAt },
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      plan: effectivePlan(u.plan, u.premiumUntil),
      premiumUntil: u.premiumUntil,
      trialUsedAt: u.trialUsedAt,
      locale: u.locale,
      isDemo: u.isDemo,
      aiDataConsent: u.aiDataConsent,
      createdAt: u.createdAt,
    },
  };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/** Révoque toutes les sessions d'un utilisateur (sauf éventuellement la session courante). */
export async function invalidateUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await db
    .delete(sessions)
    .where(exceptSessionId ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId)) : eq(sessions.userId, userId));
}

export async function deleteExpiredSessions(): Promise<number> {
  const result = await db.delete(sessions).where(lt(sessions.expiresAt, sql`now()`)).returning({ id: sessions.id });
  return result.length;
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
