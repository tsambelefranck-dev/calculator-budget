import { CircleCheck, Lightbulb, TriangleAlert } from 'lucide-react';
import { RankedBars } from '@/components/charts/ranked-bars';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Meter } from '@/components/ui/meter';
import { StatTile } from '@/components/ui/stat-tile';
import { formatMoney, formatPercent } from '@/lib/finance/money';
import type { MonthlyReportData } from '@/lib/finance/report';

export function ReportView({ data }: { data: MonthlyReportData }) {
  const money = (v: number) => formatMoney(v, data.currency);
  const pct = (v: number | null) => (v === null ? null : formatPercent(v, 'fr-FR', 0, true));
  const t = data.totals;
  return (
    <div className="space-y-4">
      <Card className="border-primary/25 bg-primary-soft/40">
        <CardContent className="pt-5 sm:pt-6">
          <p className="text-lg font-medium leading-relaxed">{data.headline}</p>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Revenus totaux" value={money(t.income)} hint={pct(data.comparison.incomeChange) ? `${pct(data.comparison.incomeChange)} vs mois précédent` : undefined} />
        <StatTile label="Dépenses totales" value={money(t.expenses)} hint={pct(data.comparison.expensesChange) ? `${pct(data.comparison.expensesChange)} vs mois précédent` : undefined} />
        <StatTile label="Taux d’épargne" value={t.income > 0 ? formatPercent(data.savingsRate) : '—'} hint={data.comparison.savingsRateChange !== null ? `${data.comparison.savingsRateChange >= 0 ? '+' : ''}${Math.round(data.comparison.savingsRateChange * 100)} points` : undefined} />
        <StatTile label="Santé financière" value={data.healthScore !== null ? `${data.healthScore}/100` : '—'} hint={data.healthLabel} />
        <StatTile label="Épargne réalisée" value={money(t.savings)} />
        <StatTile label="Investissements" value={money(t.investments)} />
        <StatTile label="Dettes remboursées" value={money(t.debtPayments)} />
        <StatTile label="Solde non affecté" value={money(data.balance)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CircleCheck className="size-4 text-good-ink" aria-hidden /> Points positifs</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-ink-2">{data.positives.length ? data.positives.map((p) => <li key={p}>• {p}</li>) : <li>Pas encore de point marquant ce mois-ci.</li>}</ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TriangleAlert className="size-4 text-warning-ink" aria-hidden /> Erreurs identifiées</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-ink-2">{data.mistakes.length ? data.mistakes.map((p) => <li key={p}>• {p}</li>) : <li>Aucune erreur notable.</li>}</ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="size-4 text-accent-ink" aria-hidden /> Pour le mois prochain</CardTitle></CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-4 text-sm text-ink-2">{data.recommendations.map((p) => <li key={p}>{p}</li>)}</ol>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Principaux postes de dépenses</CardTitle><CardDescription>Dépenses excessives : {data.excessive.length}</CardDescription></CardHeader>
          <CardContent>
            {data.topCategories.length ? <RankedBars items={data.topCategories.map((c) => ({ label: c.name, value: c.amount }))} currency={data.currency} total={t.expenses} /> : <p className="text-sm text-ink-2">Aucune dépense.</p>}
            {data.excessive.length ? (
              <ul className="mt-4 space-y-2 border-t pt-3 text-sm text-ink-2">{data.excessive.map((e) => <li key={e.id}>• {e.message}</li>)}</ul>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Progression des objectifs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {data.goals.length ? (
              data.goals.map((g) => (
                <div key={g.name} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="font-medium">{g.name}</span><span className="text-ink-2 tabular">{money(g.saved)} / {money(g.target)}</span></div>
                  <Meter value={g.saved} max={g.target} label={g.name} tone="ok" showStatus={false} />
                  <p className="text-xs text-muted">{g.contributedThisMonth !== 0 ? `${money(g.contributedThisMonth)} versés ce mois` : 'Aucun versement ce mois'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-2">Aucun objectif.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
