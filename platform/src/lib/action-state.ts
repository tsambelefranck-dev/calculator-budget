import type { z } from 'zod';

/** État renvoyé par les Server Actions aux formulaires (`useActionState`). */
export interface ActionState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /** Valeurs saisies, renvoyées pour pré-remplir le formulaire après une erreur. */
  values?: Record<string, string>;
  /** Identifiant éventuel de la ressource créée. */
  id?: string;
}

export const initialActionState: ActionState = {};

export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string' && !key.startsWith('$ACTION')) result[key] = value;
  }
  return result;
}

export function validationError(error: z.ZodError, values?: Record<string, string>, message = 'Vérifie les champs en rouge.'): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  const safeValues = values ? Object.fromEntries(Object.entries(values).filter(([k]) => !/password|confirm|current/i.test(k))) : undefined;
  return { ok: false, message, errors: fieldErrors, values: safeValues };
}
