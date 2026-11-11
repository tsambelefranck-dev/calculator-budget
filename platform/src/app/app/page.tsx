import { CircleAlert, CircleCheck, Info, Lightbulb, SlidersHorizontal, Target, TriangleAlert, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChartDataTable } from '@/components/charts/data-table';
import { IncomeExpenseChart, TrendChart } from '@/components/charts/charts';
import { RankedBars } from '@/components/charts/ranked-bars';
import { ReceiveIncomeButton } from '@/components/income/receive-income-button';
import { Alert } from '@/components/ui/alert';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Meter } from '@/components/ui/meter';
import { MonthSwitcher, resolveMonth } from '@/components/ui/month-switcher';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile, type StatDelta } from '@/components/ui/stat-tile';
import { addMonths, formatDateLabel, formatMonthLabel } from '@/lib/finance/dates';
import { GOAL_STATUS_LABELS } from '@/lib/finance/goals';
import type { InsightSeverity } from '@/lib/finance/insights';
import { formatMoney, formatPercent } from '@/lib/finance/money';
import { cn } from '@/lib/utils';
import { requireAppContext } from '@/server/auth/current';
import { getDashboardData } from '@/server/services/dashboard';

export const metadata: Metadata = { title: 'Tableau de bord' };

function delta(change: number | null, label: string, upIsGood: boolean): StatDelta | null {
  if (change === null || !Number.isFinite(change)) return null;
  const direction = Math.abs(change) < 0.005 ? 'flat' : change > 0 ? 'up' : 'down';
  const good = direction === 'flat' ? 'neutral' : (direction === 'up') === upIsGood ? 'good' : 'bad';
  return { label: `${formatPercent(change, 'fr-FR', 0, true)} ${label}`, direction, tone: good };
}

const SEVERITY_ICON: Record<InsightSeverity, typeof Info> = { alerte: CircleAlert, attention: TriangleAlert, info: Info, positif: CircleCheck };
const SEVERITY_TONE: Record<InsightSeverity, string> = {
  alerte: 'text-critical-ink',
  attention: 'text-warning-ink',
  info: 'text-info-ink',
  positif: 'text-good-ink',
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const ctx = await requireAppContext();
  const params = await searchParams;
  const month = resolveMonth(params.month, ctx.currentMonth);
  const d = await getDashboardData(ctx, month);
  const money = (v: number) => formatMoney(v, ctx.currency);
  const label = (m: string) => formatMonthLabel(m, 'fr-FR', 'short');
  const lastNetWorth = d.netWorth[d.netWorth.length - 1];
  const debtsRemaining = lastNetWorth?.debts ?? 0;
  const empty = d.totals.income === 0 && d.totals.expenses === 0;
  const healthScore = d.health.health.score;
  const firstName = ctx.user.name.split(' ')[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Bonjour ${firstName}`}
        title="Ton tableau de bord"
        description={d.isCurrentMonth ? `Situation au ${formatDateLabel(ctx.today)}.` : `Bilan de ${formatMonthLabel(month).toLowerCase()}.`}
        actions={<MonthSwitcher month={month} currentMonth={ctx.currentMonth} basePath="/app" minMonth={addMonths(ctx.currentMonth, -(d.historyMonths + 6))} />}
      />

      {d.expected.length > 0 ? (
        <Card className="border-primary/30 bg-primary-soft/50">
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:pt-6">
            <Wallet className="hidden size-8 text-primary-ink sm:block" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold">Revenu attendu : {d.expected[0]!.source.name} — {money(d.expected[0]!.amount)}</p>
              <p className="text-sm text-ink-2">Prévu le {formatDateLabel(d.expected[0]!.expectedOn, 'fr-FR', false)}. Dès qu’il arrive, donne une destination à chaque franc.</p>
            </div>
            <ReceiveIncomeButton sourceId={d.expected[0]!.source.id} />
          </CardContent>
        </Card>
      ) : null}

      {empty ? (
        <EmptyState
          icon={Wallet}
          title="Commence par enregistrer ton revenu du mois"
          description="Ton tableau de bord se remplit dès que tu enregistres tes revenus et tes dépenses. Les graphiques utilisent uniquement tes vraies données."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/app/income">Ajouter un revenu</ButtonLink>
              <ButtonLink href="/app/expenses" variant="outline">Ajouter une dépense</ButtonLink>
            </div>
          }
        />
      ) : null}

      <section aria-label="Indicateurs du mois" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Solde théorique disponible" value={money(d.balance)} emphasis hint="Revenus − dépenses − épargne − investissements − remboursements" />
        <StatTile label="Revenus du mois" value={money(d.totals.income)} delta={delta(d.comparison.income, d.comparison.label, true)} />
        <StatTile label="Dépenses du mois" value={money(d.totals.expenses)} delta={delta(d.comparison.expenses, d.comparison.label, false)} />
        <StatTile
          label="Taux d’épargne"
          value={d.totals.income > 0 ? formatPercent(d.savingsRate) : '—'}
          hint="Part des revenus non dépensée ni remboursée"
        />
        <StatTile label="Épargné ce mois" value={money(d.totals.savings)} hint="Versements sur tes objectifs" />
        <StatTile label="Investi ce mois" value={money(d.totals.investments)} />
        <StatTile label="Dettes restantes" value={money(debtsRemaining)} hint={d.totals.debtPayments > 0 ? `${money(d.totals.debtPayments)} remboursés ce mois` : undefined} />
        <StatTile label="Patrimoine net" value={money(lastNetWorth?.netWorth ?? 0)} hint="Épargne + investissements − dettes" />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Santé financière</CardTitle>
            <CardDescription>
              {d.health.basis === 'mois_precedent' && d.health.basisMonth
                ? `Calculée sur ${formatMonthLabel(d.health.basisMonth).toLowerCase()} (dernier mois complet).`
                : d.health.basis === 'mois_en_cours'
                  ? 'Calculée sur le mois en cours.'
                  : 'Calculée à partir de ton diagnostic.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <p className="text-5xl font-semibold tracking-tight">{healthScore ?? '—'}</p>
              <p className="pb-1.5 text-sm text-muted">/ 100 · <span className="font-medium text-ink">{d.health.health.label}</span></p>
            </div>
            <Meter value={healthScore ?? 0} max={100} label="Score de santé financière" tone="ok" showStatus={false} />
            <ul className="space-y-2">
              {d.health.health.components.map((c) => (
                <li key={c.key} className="space-y-0.5 text-sm">
                  <div className="flex justify-between">
                    <span>{c.label}</span>
                    <span className="text-ink-2 tabular">{Math.round(c.points)}/{c.max}</span>
                  </div>
                  <p className="text-xs text-muted">{c.detail}</p>
                </li>
              ))}
            </ul>
            {d.health.health.tips[0] ? <Alert tone="gold" title="Levier prioritaire">{d.health.health.tips[0]}</Alert> : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenus et dépenses</CardTitle>
            <CardDescription>{d.historyMonths} derniers mois{ctx.user.plan === 'free' ? ' (12 mois avec Premium)' : ''}</CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeExpenseChart currency={ctx.currency} data={d.series.map((p) => ({ label: label(p.month), income: p.income, expenses: p.expenses }))} />
            <ChartDataTable
              caption="Revenus et dépenses par mois"
              headers={['Mois', 'Revenus', 'Dépenses', 'Écart']}
              rows={d.series.map((p) => [formatMonthLabel(p.month), money(p.income), money(p.expenses), money(p.income - p.expenses)])}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Où va ton argent</CardTitle>
            <CardDescription>Dépenses de {formatMonthLabel(month).toLowerCase()} par catégorie</CardDescription>
          </CardHeader>
          <CardContent>
            {d.categories.length ? (
              <RankedBars items={d.categories} currency={ctx.currency} total={d.totals.expenses} />
            ) : (
              <p className="text-sm text-ink-2">Aucune dépense enregistrée ce mois-ci.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alertes et conseils</CardTitle>
            <CardDescription>Analyse automatique de tes dépenses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.insights.length ? (
              d.insights.map((i) => {
                const Icon = SEVERITY_ICON[i.severity];
                return (
                  <div key={i.id} className="flex gap-3 rounded-xl border p-3">
                    <Icon className={cn('mt-0.5 size-4 shrink-0', SEVERITY_TONE[i.severity])} aria-hidden />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{i.title}</p>
                      <p className="text-sm text-ink-2">{i.message}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="flex gap-2 text-sm text-ink-2">
                <Lightbulb className="size-4 shrink-0 text-accent-ink" aria-hidden /> Rien d’anormal détecté. Continue à enregistrer tes dépenses pour des analyses plus fines.
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <ButtonLink href="/app/planner" variant="secondary" size="sm">
                <SlidersHorizontal className="size-4" aria-hidden /> Planifier mon revenu
              </ButtonLink>
              <ButtonLink href="/app/assistant" variant="outline" size="sm">Demander au coach IA</ButtonLink>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Évolution de l’épargne</CardTitle>
            <CardDescription>Total épargné sur tes objectifs, fin de mois</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart currency={ctx.currency} name="Épargne" data={d.netWorth.map((p) => ({ label: label(p.month), value: p.savings }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Évolution du patrimoine net</CardTitle>
            <CardDescription>Épargne + investissements − dettes</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart currency={ctx.currency} name="Patrimoine net" color="var(--chart-2)" data={d.netWorth.map((p) => ({ label: label(p.month), value: p.netWorth }))} />
            <ChartDataTable
              caption="Patrimoine net par mois"
              headers={['Mois', 'Épargne', 'Investissements', 'Dettes', 'Patrimoine net']}
              rows={d.netWorth.map((p) => [formatMonthLabel(p.month), money(p.savings), money(p.investments), money(p.debts), money(p.netWorth)])}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Mes objectifs</CardTitle>
            <CardDescription>Progression de tes projets d’épargne</CardDescription>
          </div>
          <Link href="/app/goals" className="text-sm font-medium text-primary-ink hover:underline">Tout voir</Link>
        </CardHeader>
        <CardContent>
          {d.goals.length ? (
            <ul className="grid gap-4 sm:grid-cols-3">
              {d.goals.map((g) => (
                <li key={g.goal.id} className="space-y-2 rounded-xl border p-4">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-primary-ink" aria-hidden />
                    <p className="truncate text-sm font-semibold">{g.goal.name}</p>
                  </div>
                  <p className="text-sm text-ink-2 tabular">{money(g.saved)} / {money(g.goal.targetAmount)}</p>
                  <Meter value={g.saved} max={g.goal.targetAmount} label={`Progression de ${g.goal.name}`} tone="ok" showStatus={false} />
                  <p className="text-xs text-muted">
                    {GOAL_STATUS_LABELS[g.metrics.status]}
                    {g.metrics.requiredMonthly ? ` · ${money(g.metrics.requiredMonthly)}/mois nécessaires` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">
              Aucun objectif actif. <Link href="/app/goals" className="font-medium text-primary-ink underline">Crée ton premier objectif</Link>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
