'use server';

import { redirect } from 'next/navigation';
import type { ActionState } from '@/lib/action-state';
import { monthKeySchema, uuidSchema } from '@/lib/validation/common';
import type { MonthlyReportData } from '@/lib/finance/report';
import { requireAppContext } from '@/server/auth/current';
import { getClientIp } from '@/server/auth/request';
import { rateLimit } from '@/server/auth/rate-limit';
import { deleteConversation } from '@/server/ai/agent';
import { isAiConfigured } from '@/server/ai/config';
import { createProvider } from '@/server/ai/provider';
import { generateReportSummary } from '@/server/ai/report-summary';
import { setAiConsent } from '@/server/services/account';
import { audit } from '@/server/services/audit';
import { getPlanLimits } from '@/server/services/entitlements';
import { getStoredReport, saveReportAiSummary } from '@/server/services/reports';
import { refreshApp, toActionError } from './helpers';

export async function setAiConsentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const consent = formData.get('consent') === 'true';
  await setAiConsent(ctx.user.id, consent);
  await audit('account.ai_consent', { userId: ctx.user.id, metadata: { consent }, ip: await getClientIp() });
  refreshApp();
  return { ok: true, message: consent ? 'Accès autorisé : l’assistant peut analyser tes données.' : 'Accès retiré : l’assistant ne lira plus tes données.' };
}

export async function deleteConversationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Conversation introuvable.' };
  try {
    await deleteConversation(ctx.user.id, id.data);
  } catch (error) {
    return toActionError(error);
  }
  redirect('/app/assistant');
}

export async function generateReportSummaryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  if (!getPlanLimits(ctx.user.plan).aiReportSummary) return { ok: false, message: 'L’analyse IA du rapport est réservée à Premium.' };
  if (!isAiConfigured()) return { ok: false, message: 'L’IA n’est pas configurée sur ce serveur.' };
  const month = monthKeySchema.safeParse(formData.get('month'));
  if (!month.success) return { ok: false, message: 'Mois invalide.' };
  const limit = await rateLimit(`ai-report:${ctx.user.id}`, 5, 3600);
  if (!limit.ok) return { ok: false, message: 'Trop de demandes. Réessaie plus tard.' };
  const report = await getStoredReport(ctx.user.id, month.data);
  if (!report) return { ok: false, message: 'Rapport introuvable.' };
  try {
    const { text, model } = await generateReportSummary(ctx.user.id, report.data as unknown as MonthlyReportData, createProvider());
    await saveReportAiSummary(ctx.user.id, month.data, text, model);
    refreshApp();
    return { ok: true, message: 'Analyse générée.' };
  } catch (error) {
    console.error('[ai] rapport', error);
    return { ok: false, message: 'L’analyse n’a pas pu être générée. Réessaie plus tard.' };
  }
}
