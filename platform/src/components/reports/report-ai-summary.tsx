'use client';

import { Crown, Sparkles } from 'lucide-react';
import { useActionState } from 'react';
import { Markdown } from '@/components/markdown';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SubmitButton } from '@/components/ui/submit-button';
import { useActionFeedback } from '@/components/ui/use-action-feedback';
import { initialActionState } from '@/lib/action-state';
import { generateReportSummaryAction } from '@/server/actions/assistant';

export function ReportAiSummary({ month, summary, allowed, configured }: { month: string; summary: string | null; allowed: boolean; configured: boolean }) {
  const [state, action] = useActionState(generateReportSummaryAction, initialActionState);
  useActionFeedback(state);
  return (
    <Card className="border-accent/40">
      <CardContent className="space-y-3 pt-5 sm:pt-6">
        <p className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-accent-ink" aria-hidden /> Analyse personnalisée du coach IA</p>
        {summary ? (
          <>
            <Markdown text={summary} />
            <p className="text-xs text-muted">Rédigée par l’IA à partir des chiffres calculés ci-dessous. Information éducative, pas un conseil financier personnalisé.</p>
          </>
        ) : !allowed ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-ink-2">L’analyse rédigée du rapport est une fonctionnalité Premium. Le rapport chiffré ci-dessous reste gratuit.</p>
            <ButtonLink href="/app/upgrade" variant="gold" size="sm"><Crown className="size-4" aria-hidden /> Essayer Premium</ButtonLink>
          </div>
        ) : !configured ? (
          <p className="text-sm text-ink-2">L’IA n’est pas configurée sur ce serveur : seul le rapport chiffré est disponible.</p>
        ) : (
          <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input type="hidden" name="month" value={month} />
            <p className="flex-1 text-sm text-ink-2">Obtiens une lecture commentée de ton mois et 3 actions concrètes.</p>
            <SubmitButton variant="gold" size="sm" pendingLabel="Rédaction…">Générer l’analyse</SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
