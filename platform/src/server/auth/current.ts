import 'server-only';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import type { CurrencyCode } from '@/lib/constants';
import { monthOf, todayInTimezone, type DateKey, type MonthKey } from '@/lib/finance/dates';
import { db } from '@/server/db';
import { financialProfiles } from '@/server/db/schema';
import { SESSION_COOKIE, validateSessionToken, type AuthSession, type AuthUser } from './session';

/** Session courante, mémorisée pour la durée de la requête. */
export const getCurrentSession = cache(async (): Promise<{ session: AuthSession; user: AuthUser } | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

export async function getCurrentUser(): Promise<AuthUser | null> {
  return (await getCurrentSession())?.user ?? null;
}

/** Exige un utilisateur connecté (sinon redirection vers la connexion). */
export async function requireUser(): Promise<AuthUser> {
  const current = await getCurrentSession();
  if (!current) redirect('/login');
  return current.user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();
  // 404 plutôt que 403 : ne révèle pas l'existence de l'espace d'administration.
  if (user.role !== 'admin') notFound();
  return user;
}

export type FinancialProfile = typeof financialProfiles.$inferSelect;

export const getProfile = cache(async (userId: string): Promise<FinancialProfile | null> => {
  const rows = await db.select().from(financialProfiles).where(eq(financialProfiles.userId, userId)).limit(1);
  return rows[0] ?? null;
});

export interface AppContext {
  user: AuthUser;
  profile: FinancialProfile;
  currency: CurrencyCode;
  timezone: string;
  today: DateKey;
  currentMonth: MonthKey;
}

/** Contexte complet d'une page de l'espace connecté (profil financier obligatoire). */
export const requireAppContext = cache(async (): Promise<AppContext> => {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile) redirect('/onboarding');
  const today = todayInTimezone(profile.timezone);
  return { user, profile, currency: profile.currency, timezone: profile.timezone, today, currentMonth: monthOf(today) };
});
