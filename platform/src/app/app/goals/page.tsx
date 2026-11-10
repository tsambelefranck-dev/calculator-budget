import { Archive, ArchiveRestore, Target } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ContributionButton, GoalButton } from '@/components/goals/goal-forms';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Meter } from '@/components/ui/meter';
import { PageHeader } from '@/components/ui/page-header';
import { GOAL_TYPE_LABELS } from '@/lib/constants';
import { formatDateLabel, formatMonthLabel } from '@/lib/finance/dates';
import { GOAL_STATUS_LABELS, type GoalStatus } from '@/lib/finance/goals';
import { formatMoney, formatPercent } from '@/lib/finance/money';
import { requireAppContext } from '@/server/auth/current';
import { archiveGoalAction, deleteGoalAction } from '@/server/actions/goals';
import { getPlanLimits } from '@/server/services/entitlements';
import { listGoalSummaries } from '@/server/services/goals';

export const metadata: Metadata = { title: 'Objectifs d’épargne' };

const STATUS_TONE: Record<GoalStatus, BadgeTone> = {
  atteint: 'good',
  en_avance: 'good',
  dans_les_temps: 'primary',
  en_retard: 'warning',
  sans_date: 'neutral',
  echeance_depassee: 'critical',
};

export default async function GoalsPage() {
  const ctx = await requireAppContext();
  const goals = await listGoalSummaries(ctx.user.id, ctx.today, { includeArchived: true });
  const money = (v: number) => formatMoney(v, ctx.currency);
  const limits = getPlanLimits(ctx.user.plan);
  const activeCount = goals.filter((g) => g.goal.status === 'active').length;
  const limitReached = limits.maxActiveGoals !== null && activeCount >= limits.maxActiveGoals;
  const totalSaved = goals.filter((g) => g.goal.status !== 'archived').reduce((s, g) => s + g.saved, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Objectifs d’épargne"
        description={`Total épargné : ${money(totalSaved)}. Chaque objectif calcule la contribution mensuelle nécessaire et la date d’arrivée estimée.`}
        actions={<GoalButton currency={ctx.currency} disabledReason={limitReached ? `L’offre gratuite permet ${limits.maxActiveGoals} objectifs actifs. Archive un objectif ou passe à Premium.` : undefined} />}
      />
      {limitReached ? (
        <p className="text-sm text-ink-2">Limite de l’offre gratuite atteinte ({limits.maxActiveGoals} objectifs actifs). <Link href="/app/upgrade" className="font-medium text-accent-ink underline">Passer à Premium</Link></p>
      ) : null}
      {goals.length === 0 ? (
        <EmptyState icon={Target} title="Aucun objectif" description="Fonds d’urgence, terrain, mariage, voiture, formation… Donne une destination à ton épargne." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map(({ goal, saved, metrics, recentMonthlyAverage }) => (
            <Card key={goal.id} className={goal.status === 'archived' ? 'opacity-70' : undefined}>
              <CardContent className="space-y-4 pt-5 sm:pt-6">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">{GOAL_TYPE_LABELS[goal.type]}</p>
                    <p className="truncate text-lg font-semibold">{goal.name}</p>
                  </div>
                  {goal.status === 'archived' ? <Badge>Archivé</Badge> : <Badge tone={STATUS_TONE[metrics.status]}>{GOAL_STATUS_LABELS[metrics.status]}</Badge>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-semibold tabular">{money(saved)}</p>
                    <p className="text-sm text-ink-2 tabular">sur {money(goal.targetAmount)} · {formatPercent(metrics.progress)}</p>
                  </div>
                  <Meter value={saved} max={goal.targetAmount} label={`Progression de ${goal.name}`} tone="ok" showStatus={false} />
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-muted">Reste à épargner</dt><dd className="font-medium tabular">{money(metrics.remaining)}</dd></div>
                  <div><dt className="text-xs text-muted">Date souhaitée</dt><dd className="font-medium">{goal.targetDate ? formatDateLabel(goal.targetDate) : '—'}</dd></div>
                  <div><dt className="text-xs text-muted">Nécessaire par mois</dt><dd className="font-medium tabular">{metrics.requiredMonthly !== null ? money(metrics.requiredMonthly) : '—'}</dd></div>
                  <div>
                    <dt className="text-xs text-muted">Arrivée estimée</dt>
                    <dd className="font-medium">{metrics.projectedMonth ? formatMonthLabel(metrics.projectedMonth) : 'Ajoute un versement prévu'}</dd>
                  </div>
                </dl>
                <p className="text-xs text-muted">
                  {goal.plannedMonthly ? `Versement prévu : ${money(goal.plannedMonthly)}/mois.` : recentMonthlyAverage > 0 ? `Moyenne récente : ${money(recentMonthlyAverage)}/mois.` : 'Aucun versement récent.'}
                  {metrics.projectedMonths ? ` Objectif atteint dans ${metrics.projectedMonths} mois à ce rythme.` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-1 border-t pt-3">
                  {goal.status !== 'archived' ? <ContributionButton goalId={goal.id} goalName={goal.name} currency={ctx.currency} today={ctx.today} /> : null}
                  <div className="flex-1" />
                  <GoalButton currency={ctx.currency} goal={{ id: goal.id, name: goal.name, type: goal.type, targetAmount: goal.targetAmount, targetDate: goal.targetDate, plannedMonthly: goal.plannedMonthly }} />
                  <ConfirmButton
                    action={archiveGoalAction}
                    hiddenFields={{ id: goal.id, archived: String(goal.status !== 'archived') }}
                    label={goal.status === 'archived' ? 'Réactiver' : 'Archiver'}
                    title={goal.status === 'archived' ? 'Réactiver l’objectif ?' : 'Archiver l’objectif ?'}
                    description="Les versements sont conservés."
                    confirmLabel={goal.status === 'archived' ? 'Réactiver' : 'Archiver'}
                  >
                    {goal.status === 'archived' ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
                  </ConfirmButton>
                  <ConfirmButton action={deleteGoalAction} hiddenFields={{ id: goal.id }} label="Supprimer l’objectif" description="L’objectif et tous ses versements seront supprimés." />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
