import { CircleCheck, Clock, Crown } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Meter } from '@/components/ui/meter';
import { PageHeader } from '@/components/ui/page-header';
import { requireAppContext } from '@/server/auth/current';
import { listLessonsWithProgress } from '@/server/services/content';
import { getPlanLimits } from '@/server/services/entitlements';

export const metadata: Metadata = { title: 'Éducation financière' };

export default async function LearnPage() {
  const ctx = await requireAppContext();
  const items = await listLessonsWithProgress(ctx.user.id);
  const premium = getPlanLimits(ctx.user.plan).premiumLessons;
  const done = items.filter((i) => i.progress).length;
  return (
    <div className="space-y-6">
      <PageHeader title="Éducation financière" description="Des leçons courtes, un quiz et un exercice pratique à faire dans NexaFi." />
      <Card>
        <CardContent className="space-y-2 pt-5 sm:pt-6">
          <p className="text-sm text-ink-2">Ta progression : <span className="font-semibold text-ink">{done} / {items.length} leçons</span></p>
          <Meter value={done} max={Math.max(items.length, 1)} label="Progression des leçons" tone="ok" showStatus={false} />
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ lesson, progress }) => {
          const locked = lesson.isPremium && !premium;
          return (
            <Link key={lesson.id} href={`/app/learn/${lesson.slug}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-pop">
                <CardContent className="flex h-full flex-col gap-2 pt-5 sm:pt-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={lesson.level === 'debutant' ? 'primary' : 'info'}>{lesson.level === 'debutant' ? 'Débutant' : 'Intermédiaire'}</Badge>
                    {locked ? <Badge tone="gold"><Crown className="size-3" aria-hidden /> Premium</Badge> : null}
                    {progress ? <Badge tone="good"><CircleCheck className="size-3" aria-hidden /> {progress.quizScore} %</Badge> : null}
                  </div>
                  <p className="font-semibold">{lesson.title}</p>
                  <p className="flex-1 text-sm text-ink-2">{lesson.summary}</p>
                  <p className="flex items-center gap-1 text-xs text-muted"><Clock className="size-3.5" aria-hidden /> {lesson.durationMin} min · {lesson.quiz.length} question(s)</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
