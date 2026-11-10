'use server';

import { z } from 'zod';
import type { ActionState } from '@/lib/action-state';
import { PLANNER_BUCKETS, PLANNER_BUCKET_LABELS } from '@/lib/constants';
import { parseAmount } from '@/lib/finance/money';
import { monthKeySchema, uuidSchema } from '@/lib/validation/common';
import { requireAppContext } from '@/server/auth/current';
import { applyPlanAsBudgets, deletePlan, savePlan } from '@/server/services/planner';
import { refreshApp, toActionError } from './helpers';

const itemsSchema = z
  .array(z.object({ bucket: z.enum(PLANNER_BUCKETS), recommendedAmount: z.number().int().min(0), rationale: z.string().max(600) }))
  .min(1)
  .max(PLANNER_BUCKETS.length);

export async function savePlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const month = monthKeySchema.safeParse(formData.get('month'));
  const total = parseAmount(String(formData.get('total') ?? ''), ctx.currency);
  const incomeIdRaw = formData.get('incomeId');
  const incomeId = incomeIdRaw ? uuidSchema.safeParse(incomeIdRaw) : null;
  let items: z.infer<typeof itemsSchema>;
  try {
    items = itemsSchema.parse(JSON.parse(String(formData.get('items') ?? '[]')));
  } catch {
    return { ok: false, message: 'Plan invalide. Recharge la page.' };
  }
  if (!month.success || total === null || total <= 0 || (incomeId && !incomeId.success)) return { ok: false, message: 'Plan invalide. Recharge la page.' };
  const amounts = items.map((i) => parseAmount(String(formData.get(`amount_${i.bucket}`) ?? '0') || '0', ctx.currency));
  if (amounts.some((a) => a === null)) return { ok: false, message: 'Un des montants est invalide.' };
  const notes = z.array(z.string().max(600)).max(10).catch([]).parse(JSON.parse(String(formData.get('notes') ?? '[]')));
  const planStatus = z.enum(['ok', 'serre', 'deficit']).catch('ok').parse(formData.get('planStatus'));
  try {
    const plan = await savePlan(ctx.user.id, ctx.currency, {
      month: month.data,
      incomeId: incomeId?.success ? incomeId.data : null,
      total,
      status: 'validated',
      planStatus,
      notes,
      inputs: { riskTolerance: ctx.profile.riskTolerance, incomeType: ctx.profile.incomeType },
      items: items.map((item, index) => ({
        bucket: item.bucket,
        label: PLANNER_BUCKET_LABELS[item.bucket],
        amount: amounts[index]!,
        recommendedAmount: item.recommendedAmount,
        rationale: item.rationale,
      })),
    });
    let message = 'Plan validé. Ton argent a maintenant une destination !';
    if (formData.get('applyBudgets') === 'on') {
      const count = await applyPlanAsBudgets(ctx.user.id, plan.id);
      message += ` ${count} budget(s) créé(s) ou mis à jour pour le mois.`;
    }
    refreshApp();
    return { ok: true, message, id: plan.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function applyPlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Plan introuvable.' };
  try {
    const count = await applyPlanAsBudgets(ctx.user.id, id.data);
    refreshApp();
    return { ok: true, message: `${count} budget(s) créé(s) ou mis à jour.` };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deletePlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Plan introuvable.' };
  try {
    await deletePlan(ctx.user.id, id.data);
    refreshApp();
    return { ok: true, message: 'Plan supprimé.' };
  } catch (error) {
    return toActionError(error);
  }
}
