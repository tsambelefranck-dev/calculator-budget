import 'server-only';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { investmentDomains, lessonProgress, lessons, publications } from '@/server/db/schema';
import { NotFoundError } from './errors';

export type InvestmentDomain = typeof investmentDomains.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;

export async function listInvestmentDomains(includeUnpublished = false): Promise<InvestmentDomain[]> {
  return db
    .select()
    .from(investmentDomains)
    .where(includeUnpublished ? undefined : eq(investmentDomains.isPublished, true))
    .orderBy(asc(investmentDomains.sortOrder));
}

export async function getInvestmentDomain(slug: string): Promise<InvestmentDomain> {
  const rows = await db.select().from(investmentDomains).where(and(eq(investmentDomains.slug, slug), eq(investmentDomains.isPublished, true))).limit(1);
  if (!rows[0]) throw new NotFoundError('Domaine introuvable.');
  return rows[0];
}

export async function listPublications(limit = 10) {
  return db.select().from(publications).where(eq(publications.isPublished, true)).orderBy(desc(publications.createdAt)).limit(limit);
}

export async function listLessonsWithProgress(userId: string) {
  const [rows, progress] = await Promise.all([
    db.select().from(lessons).where(eq(lessons.isPublished, true)).orderBy(asc(lessons.sortOrder)),
    db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)),
  ]);
  const done = new Map(progress.map((p) => [p.lessonId, p]));
  return rows.map((lesson) => ({ lesson, progress: done.get(lesson.id) ?? null }));
}

export async function getLesson(slug: string): Promise<Lesson> {
  const rows = await db.select().from(lessons).where(and(eq(lessons.slug, slug), eq(lessons.isPublished, true))).limit(1);
  if (!rows[0]) throw new NotFoundError('Leçon introuvable.');
  return rows[0];
}

export async function recordLessonCompletion(userId: string, lessonId: string, score: number): Promise<void> {
  await db
    .insert(lessonProgress)
    .values({ userId, lessonId, quizScore: score })
    .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.lessonId], set: { quizScore: score, completedAt: new Date() } });
}
