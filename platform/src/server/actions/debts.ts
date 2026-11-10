'use server';

import { formDataToObject, validationError, type ActionState } from '@/lib/action-state';
import { uuidSchema } from '@/lib/validation/common';
import { debtPaymentSchema, debtSchema } from '@/lib/validation/finance';
import { requireAppContext } from '@/server/auth/current';
import { createDebt, deleteDebt, deleteDebtPayment, recordDebtPayment, updateDebt } from '@/server/services/debts';
import { refreshApp, toActionError } from './helpers';

export async function saveDebtAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const values = formDataToObject(formData);
  const parsed = debtSchema(ctx.currency).safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  const { annualRate, ...rest } = parsed.data;
  const input = { ...rest, annualRateBp: annualRate };
  try {
    if (id) {
      if (!uuidSchema.safeParse(id).success) return { ok: false, message: 'Dette introuvable.' };
      await updateDebt(ctx.user.id, id, input);
    } else {
      await createDebt(ctx.user.id, ctx.currency, input, ctx.today);
    }
    refreshApp();
    return { ok: true, message: id ? 'Dette modifiée.' : 'Dette enregistrée.' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordPaymentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const values = formDataToObject(formData);
  const parsed = debtPaymentSchema(ctx.currency).safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  try {
    await recordDebtPayment(ctx.user.id, parsed.data.debtId, parsed.data);
    refreshApp();
    return { ok: true, message: 'Remboursement enregistré.' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteDebtAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Dette introuvable.' };
  try {
    await deleteDebt(ctx.user.id, id.data);
    refreshApp();
    return { ok: true, message: 'Dette supprimée.' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteDebtPaymentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Remboursement introuvable.' };
  try {
    await deleteDebtPayment(ctx.user.id, id.data);
    refreshApp();
    return { ok: true, message: 'Remboursement supprimé.' };
  } catch (error) {
    return toActionError(error);
  }
}
