'use server';

import { formDataToObject, validationError, type ActionState } from '@/lib/action-state';
import { uuidSchema } from '@/lib/validation/common';
import { contributionSchema, goalSchema } from '@/lib/validation/finance';
import { requireAppContext } from '@/server/auth/current';
import { addContribution, createGoal, deleteContribution, deleteGoal, setGoalArchived, updateGoal } from '@/server/services/goals';
import { refreshApp, toActionError } from './helpers';

export async function saveGoalAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const values = formDataToObject(formData);
  const parsed = goalSchema(ctx.currency).safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  const { initialAmount, ...goal } = parsed.data;
  try {
    if (id) {
      if (!uuidSchema.safeParse(id).success) return { ok: false, message: 'Objectif introuvable.' };
      await updateGoal(ctx.user.id, id, goal);
    } else {
      await createGoal(ctx.user.id, ctx.user.plan, ctx.currency, goal, initialAmount ? { amount: initialAmount, on: ctx.today } : null);
    }
    refreshApp();
    return { ok: true, message: id ? 'Objectif modifié.' : 'Objectif créé. Chaque versement te rapproche du but !' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addContributionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const values = formDataToObject(formData);
  const parsed = contributionSchema(ctx.currency).safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  try {
    await addContribution(ctx.user.id, parsed.data.goalId, parsed.data);
    refreshApp();
    return { ok: true, message: parsed.data.withdrawal ? 'Retrait enregistré.' : 'Versement enregistré. Bravo !' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteContributionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Versement introuvable.' };
  try {
    await deleteContribution(ctx.user.id, id.data);
    refreshApp();
    return { ok: true, message: 'Versement supprimé.' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveGoalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Objectif introuvable.' };
  const archived = formData.get('archived') === 'true';
  try {
    await setGoalArchived(ctx.user.id, ctx.user.plan, id.data, archived);
    refreshApp();
    return { ok: true, message: archived ? 'Objectif archivé.' : 'Objectif réactivé.' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteGoalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Objectif introuvable.' };
  try {
    await deleteGoal(ctx.user.id, id.data);
    refreshApp();
    return { ok: true, message: 'Objectif supprimé.' };
  } catch (error) {
    return toActionError(error);
  }
}
