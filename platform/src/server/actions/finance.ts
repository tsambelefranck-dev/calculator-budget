'use server';

import { formDataToObject, validationError, type ActionState } from '@/lib/action-state';
import { budgetSchema, expenseSchema, incomeSchema, incomeSourceSchema } from '@/lib/validation/finance';
import { monthKeySchema, uuidSchema } from '@/lib/validation/common';
import { requireAppContext } from '@/server/auth/current';
import { copyBudgetsFromPreviousMonth, deleteBudget, upsertBudget } from '@/server/services/budgets';
import { getCategoryMap } from '@/server/services/categories';
import { createExpense, deleteExpense, updateExpense } from '@/server/services/expenses';
import {
  createIncome,
  createIncomeSource,
  deleteIncome,
  deleteIncomeSource,
  getIncomeSource,
  updateIncome,
  updateIncomeSource,
} from '@/server/services/incomes';
import { markAllNotificationsRead } from '@/server/services/notifications';
import { INCOME_SOURCE_LABELS } from '@/lib/constants';
import { refreshApp, toActionError } from './helpers';

// ─── Dépenses ──────────────────────────────────────────────────────────────

async function parseExpense(formData: FormData) {
  const ctx = await requireAppContext();
  const values = formDataToObject(formData);
  const parsed = expenseSchema(ctx.currency).safeParse(values);
  return { ctx, values, parsed };
}

async function withDefaultExpenseLabel<T extends { label: string; categoryId: string }>(data: T): Promise<T> {
  if (data.label) return data;
  const category = (await getCategoryMap()).get(data.categoryId);
  return { ...data, label: category?.nameFr ?? 'Dépense' };
}

export async function createExpenseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ctx, values, parsed } = await parseExpense(formData);
  if (!parsed.success) return validationError(parsed.error, values);
  try {
    const expense = await createExpense(ctx.user.id, ctx.currency, await withDefaultExpenseLabel(parsed.data));
    refreshApp();
    return { ok: true, message: 'Dépense enregistrée.', id: expense.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateExpenseAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!uuidSchema.safeParse(id).success) return { ok: false, message: 'Dépense introuvable.' };
  const { ctx, values, parsed } = await parseExpense(formData);
  if (!parsed.success) return validationError(parsed.error, values);
  try {
    await updateExpense(ctx.user.id, id, await withDefaultExpenseLabel(parsed.data));
    refreshApp();
    return { ok: true, message: 'Dépense modifiée.' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteExpenseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Dépense introuvable.' };
  try {
    await deleteExpense(ctx.user.id, id.data);
    refreshApp();
    return { ok: true, message: 'Dépense supprimée.' };
  } catch (error) {
    return toActionError(error);
  }
}

// ─── Revenus ───────────────────────────────────────────────────────────────

async function normalizeIncome(userId: string, data: { sourceId: string | null; type: keyof typeof INCOME_SOURCE_LABELS; label: string }) {
  let label = data.label;
  let type = data.type;
  if (data.sourceId) {
    const source = await getIncomeSource(userId, data.sourceId);
    type = source.type;
    if (!label) label = source.name;
  }
  return { label: label || INCOME_SOURCE_LABELS[type], type };
}

export async function createIncomeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const values = formDataToObject(formData);
  const parsed = incomeSchema(ctx.currency).safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  try {
    const normalized = await normalizeIncome(ctx.user.id, parsed.data);
    const income = await createIncome(ctx.user.id, ctx.currency, { ...parsed.data, ...normalized });
    refreshApp();
    return { ok: true, message: 'Revenu enregistré.', id: income.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateIncomeAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!uuidSchema.safeParse(id).success) return { ok: false, message: 'Revenu introuvable.' };
  const ctx = await requireAppContext();
  const values = formDataToObject(formData);
  const parsed = incomeSchema(ctx.currency).safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  try {
    const normalized = await normalizeIncome(ctx.user.id, parsed.data);
    await updateIncome(ctx.user.id, id, { ...parsed.data, ...normalized });
    refreshApp();
    return { ok: true, message: 'Revenu modifié.' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteIncomeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Revenu introuvable.' };
  try {
    await deleteIncome(ctx.user.id, id.data);
    refreshApp();
    return { ok: true, message: 'Revenu supprimé.' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveIncomeSourceAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const values = formDataToObject(formData);
  const parsed = incomeSourceSchema(ctx.currency).safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  const { isActive, ...data } = parsed.data;
  if (data.recurrence === 'monthly' && !data.expectedAmount) {
    return { ok: false, message: 'Indique le montant attendu chaque mois.', errors: { expectedAmount: ['Montant attendu requis pour un revenu mensuel'] }, values };
  }
  try {
    if (id) {
      if (!uuidSchema.safeParse(id).success) return { ok: false, message: 'Source introuvable.' };
      await updateIncomeSource(ctx.user.id, id, { ...data, isActive: isActive ?? true });
    } else {
      await createIncomeSource(ctx.user.id, ctx.currency, data);
    }
    refreshApp();
    return { ok: true, message: id ? 'Source de revenu modifiée.' : 'Source de revenu ajoutée.' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteIncomeSourceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Source introuvable.' };
  try {
    await deleteIncomeSource(ctx.user.id, id.data);
    refreshApp();
    return { ok: true, message: 'Source supprimée. Les revenus déjà enregistrés sont conservés.' };
  } catch (error) {
    return toActionError(error);
  }
}

/** « Marquer comme reçu » : enregistre le revenu attendu d'une source récurrente. */
export async function receiveExpectedIncomeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const sourceId = uuidSchema.safeParse(formData.get('sourceId'));
  if (!sourceId.success) return { ok: false, message: 'Source introuvable.' };
  try {
    const source = await getIncomeSource(ctx.user.id, sourceId.data);
    if (!source.expectedAmount) return { ok: false, message: 'Aucun montant attendu pour cette source.' };
    const income = await createIncome(ctx.user.id, ctx.currency, {
      sourceId: source.id,
      type: source.type,
      amount: source.expectedAmount,
      receivedOn: ctx.today,
      label: source.name,
      note: null,
    });
    refreshApp();
    return { ok: true, message: `${source.name} enregistré. Planifie-le maintenant !`, id: income.id };
  } catch (error) {
    return toActionError(error);
  }
}

// ─── Budgets ───────────────────────────────────────────────────────────────

export async function upsertBudgetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const values = formDataToObject(formData);
  const parsed = budgetSchema(ctx.currency).safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);
  try {
    await upsertBudget(ctx.user.id, ctx.currency, parsed.data);
    refreshApp();
    return { ok: true, message: 'Budget enregistré.' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteBudgetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const id = uuidSchema.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Budget introuvable.' };
  try {
    await deleteBudget(ctx.user.id, id.data);
    refreshApp();
    return { ok: true, message: 'Budget supprimé.' };
  } catch (error) {
    return toActionError(error);
  }
}

export async function copyBudgetsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAppContext();
  const month = monthKeySchema.safeParse(formData.get('month'));
  if (!month.success) return { ok: false, message: 'Mois invalide.' };
  const count = await copyBudgetsFromPreviousMonth(ctx.user.id, ctx.currency, month.data);
  refreshApp();
  return count > 0
    ? { ok: true, message: `${count} budget(s) copié(s) depuis le mois précédent.` }
    : { ok: false, message: 'Aucun nouveau budget à copier (mois précédent vide ou budgets déjà définis).' };
}

export async function markNotificationsReadAction(): Promise<ActionState> {
  const ctx = await requireAppContext();
  await markAllNotificationsRead(ctx.user.id);
  refreshApp();
  return { ok: true };
}
