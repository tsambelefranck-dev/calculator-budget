import { Crown, HandCoins } from 'lucide-react';
import type { Metadata } from 'next';
import { MultiLineChart } from '@/components/charts/charts';
import { ChartDataTable } from '@/components/charts/data-table';
import { DebtButton, PaymentButton } from '@/components/debts/debt-forms';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Meter } from '@/components/ui/meter';
import { MoneyInput } from '@/components/ui/money-input';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { DEBT_TYPE_LABELS } from '@/lib/constants';
import { addMonths, formatMonthLabel } from '@/lib/finance/dates';
import type { PayoffSimulation } from '@/lib/finance/debts';
import { formatMoney, parseAmount } from '@/lib/finance/money';
import { requireAppContext } from '@/server/auth/current';
import { deleteDebtAction } from '@/server/actions/debts';
import { compareDebtStrategies } from '@/server/services/debts';
import { getPlanLimits } from '@/server/services/entitlements';

export const metadata: Metadata = { title: 'Dettes' };

function totalBalance(sim: PayoffSimulation, month: number): number {
  const point = sim.schedule[month - 1];
  return point ? Object.values(point.balances).reduce((s, v) => s + v, 0) : 0;
}

export default async function DebtsPage({ searchParams }: { searchParams: Promise<{ extra?: string }> }) {
  const ctx = await requireAppContext();
  const extraParam = (await searchParams).extra;
  const extra = extraParam ? (parseAmount(extraParam, ctx.currency) ?? 0) : 0;
  const { summaries, comparison } = await compareDebtStrategies(ctx.user.id, extra);
  const limits = getPlanLimits(ctx.user.plan);
  const money = (v: number) => formatMoney(v, ctx.currency);
  const active = summaries.filter((s) => s.remaining > 0);
  const totalRemaining = active.reduce((s, d) => s + d.remaining, 0);
  const totalMinimum = active.reduce((s, d) => s + d.debt.minimumPayment, 0);
  const names = new Map(summaries.map((s) => [s.debt.id, s.debt.name]));

  const horizon = comparison ? Math.min(Math.max(comparison.avalanche.months, comparison.snowball.months, Math.min(comparison.minimum.months, 120)), 120) : 0;
  const step = Math.max(1, Math.ceil(horizon / 24));
  const chartData = comparison
    ? Array.from({ length: Math.ceil(horizon / step) + 1 }, (_, i) => {
        const m = i * step;
        return {
          label: m === 0 ? 'Auj.' : `M${m}`,
          minimum: m === 0 ? totalRemaining : totalBalance(comparison.minimum, Math.min(m, comparison.minimum.schedule.length)),
          avalanche: m === 0 ? totalRemaining : m > comparison.avalanche.months ? 0 : totalBalance(comparison.avalanche, m),
          snowball: m === 0 ? totalRemaining : m > comparison.snowball.months ? 0 : totalBalance(comparison.snowball, m),
        };
      })
    : [];
  const recommended = comparison ? comparison[comparison.recommended] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dettes"
        description="Enregistre tes dettes et tes remboursements, puis choisis la stratégie la plus efficace pour t’en libérer."
        actions={<DebtButton currency={ctx.currency} />}
      />
      {summaries.length === 0 ? (
        <EmptyState icon={HandCoins} title="Aucune dette enregistrée" description="Crédits, microfinance, prêts familiaux, avances de tontine : centralise-les pour suivre ce qu’il reste à payer." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Capital restant dû" value={money(totalRemaining)} />
            <StatTile label="Mensualités minimales" value={money(totalMinimum)} />
            <StatTile label="Dettes actives" value={String(active.length)} hint={`${summaries.length - active.length} soldée(s)`} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {summaries.map(({ debt, remaining, paid, progress }) => (
              <Card key={debt.id}>
                <CardContent className="space-y-3 pt-5 sm:pt-6">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted">{DEBT_TYPE_LABELS[debt.type]}{debt.lender ? ` · ${debt.lender}` : ''}</p>
                      <p className="truncate font-semibold">{debt.name}</p>
                    </div>
                    {remaining === 0 ? <Badge tone="good">Soldée</Badge> : debt.annualRateBp >= 1000 ? <Badge tone="warning">Taux élevé</Badge> : null}
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xl font-semibold tabular">{money(remaining)}</p>
                    <p className="text-sm text-ink-2">{(debt.annualRateBp / 100).toLocaleString('fr-FR')} % / an · {money(debt.minimumPayment)}/mois</p>
                  </div>
                  <Meter value={paid} max={debt.initialBalance} label={`Remboursement de ${debt.name}`} tone="ok" showStatus={false} />
                  <p className="text-xs text-muted">{Math.round(progress * 100)} % remboursé ({money(paid)} depuis l’enregistrement){debt.dueDay ? ` · échéance le ${debt.dueDay}` : ''}</p>
                  <div className="flex items-center gap-1 border-t pt-3">
                    {remaining > 0 ? <PaymentButton debtId={debt.id} name={debt.name} suggested={Math.min(debt.minimumPayment || remaining, remaining)} currency={ctx.currency} today={ctx.today} /> : null}
                    <div className="flex-1" />
                    <DebtButton
                      currency={ctx.currency}
                      debt={{ id: debt.id, name: debt.name, type: debt.type, lender: debt.lender, principal: debt.principal, initialBalance: debt.initialBalance, annualRateBp: debt.annualRateBp, minimumPayment: debt.minimumPayment, dueDay: debt.dueDay, startDate: debt.startDate }}
                    />
                    <ConfirmButton action={deleteDebtAction} hiddenFields={{ id: debt.id }} label="Supprimer la dette" description="La dette et ses remboursements seront supprimés." />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {comparison ? (
            limits.debtStrategies ? (
              <Card>
                <CardHeader>
                  <CardTitle>Stratégie de remboursement</CardTitle>
                  <CardDescription>Simulation : intérêts mensuels sur le capital restant, mensualités constantes, mensualités libérées reportées sur la dette suivante. Les conditions réelles de ton prêteur peuvent différer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Field label="Effort supplémentaire par mois" htmlFor="extra" className="flex-1" hint="En plus des mensualités minimales.">
                      <MoneyInput id="extra" name="extra" currency={ctx.currency} defaultMinor={extra || undefined} />
                    </Field>
                    <Button type="submit" variant="outline">Simuler</Button>
                  </form>
                  <Alert tone="gold" title={`Recommandé : ${comparison.recommended === 'avalanche' ? 'méthode Avalanche' : 'méthode Boule de neige'}`}>{comparison.explanation}</Alert>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs text-muted"><th className="py-2 pr-3 font-medium">Stratégie</th><th className="py-2 pr-3 font-medium">Durée</th><th className="py-2 pr-3 font-medium">Intérêts payés</th><th className="py-2 font-medium">Économie vs minimum</th></tr></thead>
                      <tbody className="tabular">
                        {(['minimum', 'avalanche', 'snowball'] as const).map((key) => {
                          const sim = comparison[key];
                          return (
                            <tr key={key} className="border-b last:border-0">
                              <td className="py-2 pr-3 font-medium">{key === 'minimum' ? 'Minimum seulement' : key === 'avalanche' ? 'Avalanche (taux le plus élevé)' : 'Boule de neige (plus petit solde)'}</td>
                              <td className="py-2 pr-3">{sim.feasible ? `${sim.months} mois` : 'Jamais remboursée'}</td>
                              <td className="py-2 pr-3">{money(sim.totalInterest)}</td>
                              <td className="py-2">{key === 'minimum' ? '—' : `${money(comparison.interestSaved[key])} · ${comparison.monthsSaved[key]} mois gagnés`}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {!comparison.minimum.feasible ? <Alert tone="critical" title="Attention">Avec les seules mensualités minimales, au moins une dette ne diminue pas : les intérêts dépassent la mensualité. Contacte ton prêteur ou augmente tes remboursements.</Alert> : null}
                  <MultiLineChart
                    currency={ctx.currency}
                    xLabel="Mois"
                    data={chartData}
                    lines={[
                      { key: 'minimum', name: 'Minimum', color: 'var(--chart-3)' },
                      { key: 'avalanche', name: 'Avalanche', color: 'var(--chart-1)' },
                      { key: 'snowball', name: 'Boule de neige', color: 'var(--chart-2)' },
                    ]}
                  />
                  {recommended ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Ordre de remboursement et calendrier ({comparison.recommended === 'avalanche' ? 'Avalanche' : 'Boule de neige'})</p>
                      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-2">
                        {recommended.order.map((id) => (
                          <li key={id}>{names.get(id)} — soldée {recommended.payoffMonth[id] ? `en ${formatMonthLabel(addMonths(ctx.currentMonth, recommended.payoffMonth[id]!)).toLowerCase()}` : 'au-delà de 50 ans'}</li>
                        ))}
                      </ol>
                      <ChartDataTable
                        caption="Calendrier des 12 prochains mois"
                        headers={['Mois', ...recommended.order.map((id) => names.get(id) ?? ''), 'Intérêts']}
                        rows={recommended.schedule.slice(0, 12).map((m) => [
                          formatMonthLabel(addMonths(ctx.currentMonth, m.month)),
                          ...recommended.order.map((id) => money(m.payments[id] ?? 0)),
                          money(m.interest),
                        ])}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-accent/40 bg-accent-soft/40">
                <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:pt-6">
                  <Crown className="size-6 text-accent-ink" aria-hidden />
                  <div className="flex-1">
                    <p className="font-semibold">Comparer Avalanche et Boule de neige</p>
                    <p className="text-sm text-ink-2">Durée, intérêts économisés et calendrier de remboursement : disponible avec Premium (essai gratuit de 14 jours).</p>
                  </div>
                  <ButtonLink href="/app/upgrade" variant="gold">Essayer Premium</ButtonLink>
                </CardContent>
              </Card>
            )
          ) : null}
        </>
      )}
    </div>
  );
}
