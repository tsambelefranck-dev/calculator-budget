import { ArrowLeft, Crown, PencilLine } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Quiz } from '@/components/learn/quiz';
import { Markdown } from '@/components/markdown';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { requireAppContext } from '@/server/auth/current';
import { getLesson } from '@/server/services/content';
import { getPlanLimits } from '@/server/services/entitlements';

export const metadata: Metadata = { title: 'Leçon' };

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await requireAppContext();
  const { slug } = await params;
  const lesson = await getLesson(slug).catch(() => null);
  if (!lesson) notFound();
  const locked = lesson.isPremium && !getPlanLimits(ctx.user.plan).premiumLessons;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/app/learn" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-ink hover:underline"><ArrowLeft className="size-4" aria-hidden /> Toutes les leçons</Link>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{lesson.title}</h1>
        <p className="text-ink-2">{lesson.summary}</p>
      </div>
      {locked ? (
        <EmptyState icon={Crown} title="Leçon Premium" description="Cette leçon fait partie de l’offre Premium." action={<ButtonLink href="/app/upgrade" variant="gold">Essayer Premium</ButtonLink>} />
      ) : (
        <>
          <Card><CardContent className="pt-5 sm:pt-6"><Markdown text={lesson.body} /></CardContent></Card>
          {lesson.exercise ? (
            <div className="flex gap-3 rounded-2xl bg-accent-soft p-4 text-sm">
              <PencilLine className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
              <p><span className="font-semibold">Exercice pratique : </span>{lesson.exercise}</p>
            </div>
          ) : null}
          {lesson.quiz.length ? (
            <Card>
              <CardHeader><CardTitle>Quiz</CardTitle></CardHeader>
              <CardContent><Quiz slug={lesson.slug} questions={lesson.quiz.map((q) => ({ question: q.question, options: q.options }))} /></CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
