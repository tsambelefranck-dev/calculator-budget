'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PLANNER_BUCKETS } from '@/lib/constants';
import type { ActionState } from '@/lib/action-state';
import { dateKeySchema, uuidSchema } from '@/lib/validation/common';
import { requireAdmin } from '@/server/auth/current';
import { getClientIp } from '@/server/auth/request';
import {
  adminSetDisabled,
  adminSetPlan,
  adminSetRole,
  createPublication,
  deletePublication,
  updateDomainMeta,
  updateLesson,
  upsertCategory,
} from '@/server/services/admin';
import { audit } from '@/server/services/audit';
import { toActionError } from './helpers';

async function done(actorId: string, action: Parameters<typeof audit>[0], metadata: Record<string, unknown>, message: string): Promise<ActionState> {
  await audit(action, { actorId, userId: typeof metadata.userId === 'string' ? metadata.userId : null, metadata, ip: await getClientIp() });
  revalidatePath('/admin', 'layout');
  return { ok: true, message };
}

export async function adminUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const userId = uuidSchema.safeParse(formData.get('userId'));
  const op = z.enum(['premium30', 'premium365', 'free', 'admin', 'user', 'disable', 'enable']).safeParse(formData.get('op'));
  if (!userId.success || !op.success) return { ok: false, message: 'Requête invalide.' };
  try {
    switch (op.data) {
      case 'premium30':
      case 'premium365': {
        const until = new Date(Date.now() + (op.data === 'premium30' ? 30 : 365) * 86_400_000);
        await adminSetPlan(admin.id, userId.data, 'premium', until);
        return done(admin.id, 'admin.plan_changed', { userId: userId.data, plan: 'premium', until: until.toISOString() }, 'Premium activé.');
      }
      case 'free':
        await adminSetPlan(admin.id, userId.data, 'free', null);
        return done(admin.id, 'admin.plan_changed', { userId: userId.data, plan: 'free' }, 'Passé en offre gratuite.');
      case 'admin':
      case 'user':
        await adminSetRole(admin.id, userId.data, op.data);
        return done(admin.id, 'admin.role_changed', { userId: userId.data, role: op.data }, 'Rôle mis à jour.');
      case 'disable':
      case 'enable':
        await adminSetDisabled(admin.id, userId.data, op.data === 'disable');
        return done(admin.id, op.data === 'disable' ? 'admin.user_disabled' : 'admin.user_enabled', { userId: userId.data }, op.data === 'disable' ? 'Compte désactivé.' : 'Compte réactivé.');
    }
  } catch (error) {
    return toActionError(error);
  }
}

export async function adminLessonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ id: uuidSchema, title: z.string().trim().min(3).max(150), summary: z.string().trim().min(3).max(400), body: z.string().min(10).max(50_000) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: 'Champs invalides.' };
  try {
    await updateLesson(parsed.data.id, { ...parsed.data, isPublished: formData.get('isPublished') === 'on', isPremium: formData.get('isPremium') === 'on' });
    return done(admin.id, 'admin.content_changed', { type: 'lesson', id: parsed.data.id }, 'Leçon enregistrée.');
  } catch (error) {
    return toActionError(error);
  }
}

export async function adminDomainAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = uuidSchema.safeParse(formData.get('id'));
  const consulted = formData.get('consultedAt') ? dateKeySchema.safeParse(formData.get('consultedAt')) : null;
  if (!id.success || (consulted && !consulted.success)) return { ok: false, message: 'Champs invalides.' };
  try {
    await updateDomainMeta(id.data, { isPublished: formData.get('isPublished') === 'on', sourcesConsultedAt: consulted?.success ? consulted.data : null });
    return done(admin.id, 'admin.content_changed', { type: 'domain', id: id.data }, 'Fiche mise à jour.');
  } catch (error) {
    return toActionError(error);
  }
}

export async function adminPublicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (formData.get('deleteId')) {
    const id = uuidSchema.safeParse(formData.get('deleteId'));
    if (!id.success) return { ok: false, message: 'Requête invalide.' };
    await deletePublication(id.data);
    return done(admin.id, 'admin.content_changed', { type: 'publication', deleted: id.data }, 'Publication supprimée.');
  }
  const parsed = z
    .object({
      title: z.string().trim().min(3).max(200),
      body: z.string().trim().min(10).max(5000),
      sourceName: z.string().trim().min(2).max(120),
      sourceUrl: z.url().refine((u) => u.startsWith('https://'), 'URL https requise'),
      consultedAt: dateKeySchema,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: 'Champs invalides : titre, texte, source (URL https) et date de consultation sont obligatoires.' };
  await createPublication(admin.id, { ...parsed.data, country: null });
  return done(admin.id, 'admin.content_changed', { type: 'publication' }, 'Information publiée.');
}

export async function adminCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      id: z.union([uuidSchema, z.literal('')]).transform((v) => v || null),
      code: z.string().trim().regex(/^[a-z_]{2,30}$/, 'Code : lettres minuscules et _'),
      nameFr: z.string().trim().min(2).max(40),
      nameEn: z.string().trim().min(2).max(40),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      plannerBucket: z.enum(PLANNER_BUCKETS),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Champs invalides.' };
  try {
    await upsertCategory({ ...parsed.data, isEssential: formData.get('isEssential') === 'on', isActive: formData.get('isActive') === 'on' });
    return done(admin.id, 'admin.content_changed', { type: 'category', code: parsed.data.code }, 'Catégorie enregistrée.');
  } catch (error) {
    return toActionError(error);
  }
}
