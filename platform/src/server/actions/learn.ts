'use server';

import type { ActionState } from '@/lib/action-state';
import { requireAppContext } from '@/server/auth/current';
import { getLesson, recordLessonCompletion } from '@/server/services/content';
import { getPlanLimits } from '@/server/services/entitlements';
import { refreshApp } from './helpers';

/** Corrige le quiz côté serveur (les bonnes réponses ne sont jamais envoyées avant la correction). */
export async function submitQuizAction(slug: string, _prev: ActionState, formData: FormData): Promise<ActionState & { results?: { correct: boolean; explanation: string; answer: number }[]; score?: number }> {
  const ctx = await requireAppContext();
  const lesson = await getLesson(slug).catch(() => null);
  if (!lesson) return { ok: false, message: 'Leçon introuvable.' };
  if (lesson.isPremium && !getPlanLimits(ctx.user.plan).premiumLessons) return { ok: false, message: 'Leçon réservée à Premium.' };
  const results = lesson.quiz.map((q, index) => {
    const given = Number(formData.get(`q${index}`));
    return { correct: given === q.answer, explanation: q.explanation, answer: q.answer };
  });
  const score = lesson.quiz.length ? Math.round((results.filter((r) => r.correct).length / lesson.quiz.length) * 100) : 100;
  await recordLessonCompletion(ctx.user.id, lesson.id, score);
  refreshApp();
  return { ok: true, message: `Score : ${score} %. Leçon terminée !`, results, score };
}
