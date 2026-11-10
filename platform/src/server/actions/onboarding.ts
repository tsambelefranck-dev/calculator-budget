'use server';

import { formDataToObject, validationError, type ActionState } from '@/lib/action-state';
import type { DiagnosticResult } from '@/lib/finance/profile';
import { goalTypesSchema, onboardingAmountsSchema, onboardingBaseSchema } from '@/lib/validation/finance';
import { requireUser } from '@/server/auth/current';
import { saveOnboarding } from '@/server/services/profile';
import { getAll, refreshApp, toActionError } from './helpers';

export interface OnboardingState extends ActionState {
  result?: DiagnosticResult;
}

export async function saveOnboardingAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await requireUser();
  const values = formDataToObject(formData);
  const base = onboardingBaseSchema.safeParse(values);
  if (!base.success) return validationError(base.error, values);
  const amounts = onboardingAmountsSchema(base.data.currency).safeParse(values);
  if (!amounts.success) return validationError(amounts.error, values);
  const goals = goalTypesSchema.safeParse(getAll(formData, 'goals'));
  if (!goals.success) return { ok: false, message: 'Objectifs invalides.' };
  try {
    const result = await saveOnboarding(user.id, user.plan, {
      ...base.data,
      ...amounts.data,
      goals: goals.data,
      riskAnswers: { lossReaction: base.data.lossReaction, experience: base.data.experience, riskShare: base.data.riskShare },
    });
    refreshApp();
    return { ok: true, result };
  } catch (error) {
    return toActionError(error);
  }
}
