import 'server-only';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/action-state';
import { isUserFacingError } from '@/server/services/errors';

/** Convertit une erreur métier en état de formulaire ; relance les erreurs inattendues (journalisées). */
export function toActionError(error: unknown): ActionState {
  if (isUserFacingError(error)) return { ok: false, message: error.message };
  throw error;
}

/** Rafraîchit toutes les pages de l'espace connecté (données dynamiques). */
export function refreshApp(): void {
  revalidatePath('/app', 'layout');
}

export function getAll(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((v): v is string => typeof v === 'string' && v !== '');
}
