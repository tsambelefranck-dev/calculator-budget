import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { rateLimit } from '@/server/auth/rate-limit';
import { createSession, hashToken, invalidateSession, invalidateUserSessions, validateSessionToken } from '@/server/auth/session';
import { db } from '@/server/db';
import { passwordResetTokens, sessions, users } from '@/server/db/schema';
import { EmailAlreadyUsedError, authenticate, registerUser, requestPasswordReset, resetPasswordWithToken } from '@/server/services/auth';
import { startPremiumTrial } from '@/server/services/account';
import { createGoal } from '@/server/services/goals';
import { PlanLimitError } from '@/server/services/errors';
import { createTestUser } from './helpers';

describe('authentification', () => {
  it('inscrit, refuse les doublons et ne stocke jamais le mot de passe en clair', async () => {
    const user = await registerUser({ name: 'Awa', email: 'Awa.Test@Example.com', password: 'une phrase solide 2026' });
    expect(user.email).toBe('awa.test@example.com');
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.passwordHash).not.toContain('une phrase');
    await expect(registerUser({ name: 'X', email: 'awa.test@example.com', password: 'une autre phrase 2026' })).rejects.toBeInstanceOf(EmailAlreadyUsedError);
  });

  it('authentifie avec le bon mot de passe uniquement', async () => {
    await registerUser({ name: 'Kofi', email: 'kofi@example.com', password: 'mot de passe correct' });
    expect((await authenticate('kofi@example.com', 'mauvais mot de passe')).ok).toBe(false);
    expect((await authenticate('inconnu@example.com', 'peu importe 123')).ok).toBe(false);
    expect((await authenticate('KOFI@example.com', 'mot de passe correct')).ok).toBe(true);
  });

  it('refuse un compte désactivé', async () => {
    const user = await registerUser({ name: 'Off', email: 'off@example.com', password: 'mot de passe correct' });
    await db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, user.id));
    expect(await authenticate('off@example.com', 'mot de passe correct')).toEqual({ ok: false, reason: 'disabled' });
  });

  it('gère des sessions hachées, expirables et révocables', async () => {
    const user = await registerUser({ name: 'Sess', email: 'sess@example.com', password: 'mot de passe correct' });
    const { token } = await createSession(user.id);
    const stored = await db.select().from(sessions).where(eq(sessions.userId, user.id));
    expect(stored[0]!.id).toBe(hashToken(token));
    expect(stored[0]!.id).not.toBe(token);
    const valid = await validateSessionToken(token);
    expect(valid?.user.id).toBe(user.id);
    expect(await validateSessionToken('jeton-invalide')).toBeNull();

    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.id, hashToken(token)));
    expect(await validateSessionToken(token)).toBeNull();

    const s1 = await createSession(user.id);
    const s2 = await createSession(user.id);
    await invalidateUserSessions(user.id, hashToken(s1.token));
    expect(await validateSessionToken(s1.token)).not.toBeNull();
    expect(await validateSessionToken(s2.token)).toBeNull();
    await invalidateSession(hashToken(s1.token));
    expect(await validateSessionToken(s1.token)).toBeNull();
  });

  it('réinitialise le mot de passe avec un jeton à usage unique', async () => {
    const user = await registerUser({ name: 'Reset', email: 'reset@example.com', password: 'ancien mot de passe' });
    const { userId } = await requestPasswordReset('reset@example.com');
    expect(userId).toBe(user.id);
    expect((await requestPasswordReset('absent@example.com')).userId).toBeNull();
    // Le jeton brut n'est jamais stocké : on en crée un connu pour le test.
    const token = 'jeton-de-test-suffisamment-long-0123456789';
    await db.insert(passwordResetTokens).values({ id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 60_000) });
    const s = await createSession(user.id);
    expect((await resetPasswordWithToken(token, 'nouveau mot de passe 2026')).ok).toBe(true);
    expect((await resetPasswordWithToken(token, 'encore un autre 2026')).ok).toBe(false);
    expect(await validateSessionToken(s.token)).toBeNull();
    expect((await authenticate('reset@example.com', 'nouveau mot de passe 2026')).ok).toBe(true);
  });

  it('limite le débit par clé', async () => {
    const key = `test:${Date.now()}`;
    const results = [];
    for (let i = 0; i < 4; i += 1) results.push(await rateLimit(key, 3, 60));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(results[3]!.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe('offres', () => {
  it('limite les objectifs actifs en offre gratuite et lève la limite en Premium', async () => {
    const { user } = await createTestUser(); // possède déjà le fonds d'urgence
    for (let i = 0; i < 2; i += 1) await createGoal(user.id, 'free', 'XAF', { name: `Objectif ${i}`, type: 'autre', targetAmount: 100000, targetDate: null, plannedMonthly: null });
    await expect(createGoal(user.id, 'free', 'XAF', { name: 'Trop', type: 'autre', targetAmount: 100000, targetDate: null, plannedMonthly: null })).rejects.toBeInstanceOf(PlanLimitError);
    await expect(createGoal(user.id, 'premium', 'XAF', { name: 'OK', type: 'autre', targetAmount: 100000, targetDate: null, plannedMonthly: null })).resolves.toBeTruthy();
  });

  it('n’accorde l’essai Premium qu’une seule fois', async () => {
    const { user } = await createTestUser();
    const until = await startPremiumTrial(user.id);
    expect(until.getTime()).toBeGreaterThan(Date.now() + 13 * 86_400_000);
    await expect(startPremiumTrial(user.id)).rejects.toThrow();
  });
});
