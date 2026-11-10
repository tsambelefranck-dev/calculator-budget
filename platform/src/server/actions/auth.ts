'use server';

import { redirect } from 'next/navigation';
import { formDataToObject, validationError, type ActionState } from '@/lib/action-state';
import { changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from '@/lib/validation/auth';
import { getCurrentSession } from '@/server/auth/current';
import { getClientIp, getUserAgent, safeRedirectPath } from '@/server/auth/request';
import { formatRetryAfter, rateLimit } from '@/server/auth/rate-limit';
import { createSession, deleteSessionCookie, invalidateSession, invalidateUserSessions, setSessionCookie } from '@/server/auth/session';
import { audit } from '@/server/services/audit';
import {
  EmailAlreadyUsedError,
  authenticate,
  changePassword,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken,
} from '@/server/services/auth';

async function openSession(userId: string, ip: string) {
  const { token, expiresAt } = await createSession(userId, { ip, userAgent: await getUserAgent() });
  await setSessionCookie(token, expiresAt);
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToObject(formData);
  const ip = await getClientIp();
  const limit = await rateLimit(`signup:${ip}`, 5, 3600);
  if (!limit.ok) return { ok: false, message: `Trop de tentatives. Réessaie dans ${formatRetryAfter(limit.retryAfterSeconds)}.` };

  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  try {
    const user = await registerUser(parsed.data);
    await audit('auth.signup', { userId: user.id, ip });
    await openSession(user.id, ip);
  } catch (error) {
    if (error instanceof EmailAlreadyUsedError) {
      return {
        ok: false,
        message: 'Impossible de créer un compte avec cet e-mail.',
        errors: { email: ['Un compte existe peut-être déjà : essaie de te connecter ou de réinitialiser ton mot de passe.'] },
        values: { name: values.name ?? '', email: values.email ?? '' },
      };
    }
    throw error;
  }
  redirect('/onboarding');
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  const ip = await getClientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login-ip:${ip}`, 30, 900),
    rateLimit(`login-email:${parsed.data.email}`, 8, 900),
  ]);
  if (!byIp.ok || !byEmail.ok) {
    const wait = Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds);
    return { ok: false, message: `Trop de tentatives de connexion. Réessaie dans ${formatRetryAfter(wait)}.`, values: { email: parsed.data.email } };
  }

  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    await audit('auth.login_failed', { ip, metadata: { reason: result.reason } });
    return {
      ok: false,
      message: result.reason === 'disabled' ? 'Ce compte est désactivé. Contacte le support.' : 'E-mail ou mot de passe incorrect.',
      values: { email: parsed.data.email },
    };
  }
  await audit('auth.login', { userId: result.user.id, ip });
  await openSession(result.user.id, ip);
  redirect(safeRedirectPath(parsed.data.next, '/app'));
}

export async function signOutAction(): Promise<void> {
  const current = await getCurrentSession();
  if (current) {
    await invalidateSession(current.session.id);
    await audit('auth.logout', { userId: current.user.id, ip: await getClientIp() });
  }
  await deleteSessionCookie();
  redirect('/');
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  const ip = await getClientIp();
  const limit = await rateLimit(`reset:${ip}`, 5, 3600);
  if (!limit.ok) return { ok: false, message: `Trop de demandes. Réessaie dans ${formatRetryAfter(limit.retryAfterSeconds)}.` };

  const { userId } = await requestPasswordReset(parsed.data.email);
  if (userId) await audit('auth.password_reset_requested', { userId, ip });
  // Réponse identique que le compte existe ou non (pas d'énumération des comptes).
  return {
    ok: true,
    message: 'Si un compte existe avec cette adresse, un lien de réinitialisation vient d’être envoyé. Il est valable 1 heure.',
  };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error);
  const ip = await getClientIp();
  const limit = await rateLimit(`reset-confirm:${ip}`, 10, 3600);
  if (!limit.ok) return { ok: false, message: 'Trop de tentatives. Réessaie plus tard.' };

  const result = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  if (!result.ok) return { ok: false, message: 'Ce lien est invalide ou a expiré. Fais une nouvelle demande.' };
  await audit('auth.password_reset', { userId: result.userId, ip });
  await openSession(result.userId, ip);
  redirect('/app');
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await getCurrentSession();
  if (!current) redirect('/login');
  if (current.user.isDemo) return { ok: false, message: 'Le mot de passe d’un compte de démonstration ne peut pas être modifié.' };
  const parsed = changePasswordSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const ip = await getClientIp();
  const limit = await rateLimit(`change-password:${current.user.id}`, 5, 900);
  if (!limit.ok) return { ok: false, message: 'Trop de tentatives. Réessaie dans quelques minutes.' };

  const result = await changePassword(current.user.id, parsed.data.current, parsed.data.password, current.session.id);
  if (!result.ok) return { ok: false, errors: { current: ['Mot de passe actuel incorrect.'] }, message: 'Mot de passe actuel incorrect.' };
  await audit('auth.password_changed', { userId: current.user.id, ip });
  return { ok: true, message: 'Mot de passe modifié. Tes autres sessions ont été déconnectées.' };
}

export async function revokeOtherSessionsAction(): Promise<ActionState> {
  const current = await getCurrentSession();
  if (!current) redirect('/login');
  await invalidateUserSessions(current.user.id, current.session.id);
  await audit('auth.sessions_revoked', { userId: current.user.id, ip: await getClientIp() });
  return { ok: true, message: 'Toutes tes autres sessions ont été déconnectées.' };
}
