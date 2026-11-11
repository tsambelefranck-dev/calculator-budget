import 'server-only';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '@/server/auth/password';
import { generateToken, hashToken, invalidateUserSessions } from '@/server/auth/session';
import { db } from '@/server/db';
import { passwordResetTokens, users } from '@/server/db/schema';
import { appUrl, sendMail } from './mailer';

export type UserRow = typeof users.$inferSelect;

export class EmailAlreadyUsedError extends Error {
  constructor() {
    super('EMAIL_ALREADY_USED');
  }
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  return rows[0] ?? null;
}

export async function registerUser(input: { name: string; email: string; password: string }): Promise<UserRow> {
  const email = input.email.trim().toLowerCase();
  if (await findUserByEmail(email)) throw new EmailAlreadyUsedError();
  const passwordHash = await hashPassword(input.password);
  try {
    const [user] = await db.insert(users).values({ name: input.name.trim(), email, passwordHash }).returning();
    return user!;
  } catch (error) {
    // Course entre deux inscriptions simultanées : la contrainte d'unicité tranche.
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === '23505') throw new EmailAlreadyUsedError();
    throw error;
  }
}

export type AuthenticationResult = { ok: true; user: UserRow } | { ok: false; reason: 'invalid' | 'disabled' };

export async function authenticate(email: string, password: string): Promise<AuthenticationResult> {
  const user = await findUserByEmail(email);
  if (!user || user.isDemo) {
    await verifyAgainstDummy(password);
    return { ok: false, reason: 'invalid' };
  }
  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) return { ok: false, reason: 'invalid' };
  if (user.disabledAt) return { ok: false, reason: 'disabled' };
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  return { ok: true, user };
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Crée un lien de réinitialisation et l'envoie par e-mail. Ne révèle jamais si le compte existe. */
export async function requestPasswordReset(email: string): Promise<{ userId: string | null }> {
  const user = await findUserByEmail(email);
  if (!user || user.isDemo || user.disabledAt) return { userId: null };
  const token = generateToken();
  await db.insert(passwordResetTokens).values({
    id: hashToken(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  const link = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  await sendMail({
    to: user.email,
    subject: 'Réinitialise ton mot de passe NexaFi',
    text: `Bonjour ${user.name},\n\nPour choisir un nouveau mot de passe, ouvre ce lien (valable 1 heure) :\n${link}\n\nSi tu n'es pas à l'origine de cette demande, ignore ce message : ton mot de passe reste inchangé.\n\nL'équipe NexaFi`,
  });
  return { userId: user.id };
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ ok: true; userId: string } | { ok: false }> {
  const tokenId = hashToken(token);
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.id, tokenId), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false };
  const passwordHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenId));
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId));
  });
  await invalidateUserSessions(row.userId);
  return { ok: true, userId: row.userId };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  keepSessionId: string,
): Promise<{ ok: boolean }> {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) return { ok: false };
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
  await invalidateUserSessions(userId, keepSessionId);
  return { ok: true };
}
