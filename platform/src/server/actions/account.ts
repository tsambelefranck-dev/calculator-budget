'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { CURRENCIES } from '@/lib/constants';
import type { ActionState } from '@/lib/action-state';
import { getCurrentSession, requireAppContext } from '@/server/auth/current';
import { getClientIp } from '@/server/auth/request';
import { deleteSessionCookie } from '@/server/auth/session';
import { changeCurrency, deleteAccount, startPremiumTrial, updateAccountName } from '@/server/services/account';
import { audit } from '@/server/services/audit';
import { refreshApp, toActionError } from './helpers';

export async function updateNameAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const name = z.string().trim().min(2, 'Deux caractères minimum').max(80).safeParse(formData.get('name'));
  if (!name.success) return { ok: false, errors: { name: [name.error.issues[0]!.message] } };
  await updateAccountName(ctx.user.id, name.data);
  refreshApp();
  return { ok: true, message: 'Nom mis à jour.' };
}

export async function changeCurrencyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const to = z.enum(CURRENCIES).safeParse(formData.get('currency'));
  if (!to.success) return { ok: false, message: 'Devise invalide.' };
  if (to.data === ctx.currency) return { ok: true, message: 'Devise inchangée.' };
  try {
    await changeCurrency(ctx.user.id, ctx.currency, to.data);
    await audit('account.currency_changed', { userId: ctx.user.id, metadata: { from: ctx.currency, to: to.data }, ip: await getClientIp() });
    refreshApp();
    return { ok: true, message: `Devise changée en ${to.data}. Tes montants ont été convertis à la parité fixe.` };
  } catch (error) {
    return toActionError(error);
  }
}

export async function startTrialAction(): Promise<ActionState> {
  const ctx = await requireAppContext();
  if (ctx.user.isDemo) return { ok: false, message: 'Indisponible en mode démo.' };
  try {
    const until = await startPremiumTrial(ctx.user.id);
    await audit('subscription.trial_started', { userId: ctx.user.id, metadata: { until: until.toISOString() } });
    refreshApp();
    return { ok: true, message: 'Essai Premium activé pour 14 jours. Profite !' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await getCurrentSession();
  if (!current) redirect('/login');
  if (formData.get('confirmation') !== 'SUPPRIMER') return { ok: false, errors: { confirmation: ['Écris SUPPRIMER en majuscules pour confirmer.'] } };
  const password = typeof formData.get('password') === 'string' ? String(formData.get('password')) : null;
  const ip = await getClientIp();
  const result = await deleteAccount(current.user.id, password);
  if (!result.ok) return { ok: false, errors: { password: ['Mot de passe incorrect.'] } };
  await audit('account.deleted', { userId: null, metadata: { demo: current.user.isDemo }, ip });
  await deleteSessionCookie();
  redirect('/?compte=supprime');
}
