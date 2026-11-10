import { History, SlidersHorizontal } from 'lucide-react';
import type { Metadata } from 'next';
import { PlannerEditor } from '@/components/planner/planner-editor';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Field } from '@/components/ui/field';
import { MoneyInput } from '@/components/ui/money-input';
import { PageHeader } from '@/components/ui/page-header';
import { formatDateLabel, formatMonthLabel } from '@/lib/finance/dates';
import { formatMoney, parseAmount } from '@/lib/finance/money';
import { requireAppContext } from '@/server/auth/current';
import { deletePlanAction } from '@/server/actions/planner';
import { getIncome, listIncomes } from '@/server/services/incomes';
import { listPlans, proposePlan } from '@/server/services/planner';

export const metadata: Metadata = { title: 'Planificateur de salaire' };

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ income?: string; amount?: string; saved?: string }> }) {
  const ctx = await requireAppContext();
  const params = await searchParams;
  const money = (v: number) => formatMoney(v, ctx.currency);

  let amount: number | null = null;
  let incomeId: string | null = null;
  let incomeLabel: string | null = null;
  let month = ctx.currentMonth;
  if (params.income && /^[0-9a-f-]{36}$/.test(params.income)) {
    try {
      const income = await getIncome(ctx.user.id, params.income);
      amount = income.amount;
      incomeId = income.id;
      incomeLabel = income.label;
      month = income.receivedOn.slice(0, 7);
    } catch {
      amount = null;
    }
  } else if (params.amount) {
    amount = parseAmount(params.amount, ctx.currency);
  }

  const [plans, recentIncomes] = await Promise.all([listPlans(ctx.user.id, 6), listIncomes(ctx.user.id, ctx.currentMonth)]);
  const proposal = amount && amount > 0 ? await proposePlan(ctx.user.id, ctx.profile, ctx.today, amount) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fonctionnalité centrale"
        title="Planificateur de salaire"
        description="À chaque revenu, NexaFi propose une répartition adaptée à ta situation réelle : charges, besoins, famille, dettes, épargne, investissement, plaisir. Tu ajustes, tu valides."
      />
      {params.saved ? <Alert tone="good" title="Plan validé">Ton revenu a une destination. Suis le respect de ton plan dans les budgets et le tableau de bord.</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="size-4" aria-hidden /> Montant à répartir</CardTitle>
              <CardDescription>
                {incomeLabel ? `Revenu : ${incomeLabel} (${formatMonthLabel(month).toLowerCase()}).` : 'Choisis un revenu reçu ou saisis un montant.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentIncomes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {recentIncomes.slice(0, 4).map((i) => (
                    <a key={i.id} href={`/app/planner?income=${i.id}`} className={`rounded-xl border px-3 py-2 text-sm hover:bg-surface-2 ${incomeId === i.id ? 'border-primary bg-primary-soft text-primary-ink' : ''}`}>
                      {i.label} · {money(i.amount)}
                    </a>
                  ))}
                </div>
              ) : null}
              <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field label="Ou un montant libre" htmlFor="plan-amount" className="flex-1">
                  <MoneyInput id="plan-amount" name="amount" currency={ctx.currency} defaultMinor={!incomeId ? amount : undefined} />
                </Field>
                <Button type="submit" variant="outline">Calculer</Button>
              </form>
            </CardContent>
          </Card>

          {proposal ? (
            <>
              <p className="text-sm text-ink-2">
                Proposition basée sur {proposal.context.needs.source === 'historique' ? `tes dépenses réelles des ${proposal.context.needs.monthsOfHistory} dernier(s) mois` : 'les montants de ton diagnostic (enregistre tes dépenses pour plus de précision)'}, tes dettes, ton fonds d’urgence et ton profil {ctx.profile.riskTolerance === 'prudent' ? 'prudent' : ctx.profile.riskTolerance === 'equilibre' ? 'équilibré' : 'dynamique'}.
              </p>
              <PlannerEditor
                key={`${incomeId}-${amount}`}
                items={proposal.plan.items}
                total={proposal.plan.total}
                currency={ctx.currency}
                month={month}
                incomeId={incomeId}
                status={proposal.plan.status}
                notes={proposal.plan.notes}
              />
            </>
          ) : null}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="size-4" aria-hidden /> Plans validés</CardTitle>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <p className="text-sm text-ink-2">Aucun plan pour l’instant.</p>
            ) : (
              <ul className="space-y-4">
                {plans.map((p) => (
                  <li key={p.id} className="space-y-2 rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{money(p.totalAmount)}</p>
                        <p className="text-xs text-muted">{formatMonthLabel(p.month)} · validé le {formatDateLabel(p.createdAt.toISOString().slice(0, 10))}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {p.planStatus === 'deficit' ? <Badge tone="critical">Déficit</Badge> : p.planStatus === 'serre' ? <Badge tone="warning">Serré</Badge> : null}
                        <ConfirmButton action={deletePlanAction} hiddenFields={{ id: p.id }} label="Supprimer le plan" />
                      </div>
                    </div>
                    <ul className="space-y-1 text-xs text-ink-2">
                      {p.items.filter((i) => i.amount > 0).map((i) => (
                        <li key={i.id} className="flex justify-between gap-2"><span className="truncate">{i.label}</span><span className="tabular">{money(i.amount)}</span></li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
