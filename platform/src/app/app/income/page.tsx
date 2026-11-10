import { CalendarClock, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import { AddIncomeButton, EditIncomeButton, SourceButton } from '@/components/income/income-forms';
import { ReceiveIncomeButton } from '@/components/income/receive-income-button';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { MonthSwitcher, resolveMonth } from '@/components/ui/month-switcher';
import { PageHeader } from '@/components/ui/page-header';
import { INCOME_SOURCE_LABELS } from '@/lib/constants';
import { formatDateLabel, formatMonthLabel } from '@/lib/finance/dates';
import { formatMoney } from '@/lib/finance/money';
import { requireAppContext } from '@/server/auth/current';
import { deleteIncomeAction, deleteIncomeSourceAction } from '@/server/actions/finance';
import { listExpectedIncomes, listIncomeSources, listIncomes } from '@/server/services/incomes';

export const metadata: Metadata = { title: 'Revenus' };

export default async function IncomePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const ctx = await requireAppContext();
  const month = resolveMonth((await searchParams).month, ctx.currentMonth);
  const [sources, incomes, expected] = await Promise.all([
    listIncomeSources(ctx.user.id),
    listIncomes(ctx.user.id, month),
    month === ctx.currentMonth ? listExpectedIncomes(ctx.user.id, month) : Promise.resolve([]),
  ]);
  const money = (v: number) => formatMoney(v, ctx.currency);
  const total = incomes.reduce((s, i) => s + i.amount, 0);
  const sourceOptions = sources.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name, type: s.type, expectedAmount: s.expectedAmount }));
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenus"
        description="Salaire, activité, freelance, loyers… Enregistre chaque revenu reçu, puis planifie-le."
        actions={
          <>
            <SourceButton currency={ctx.currency} />
            <AddIncomeButton sources={sourceOptions} currency={ctx.currency} today={ctx.today} />
          </>
        }
      />

      {expected.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-accent-ink" aria-hidden /> Revenus attendus ce mois-ci</CardTitle>
            <CardDescription>Clique sur « Marquer comme reçu » dès que l’argent arrive : tu pourras le répartir immédiatement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {expected.map((e) => (
              <div key={e.source.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-medium">{e.source.name}</p>
                  <p className="text-sm text-ink-2">{money(e.amount)} · prévu le {formatDateLabel(e.expectedOn, 'fr-FR', false)}</p>
                </div>
                <ReceiveIncomeButton sourceId={e.source.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Revenus reçus</CardTitle>
              <CardDescription>Total de {formatMonthLabel(month).toLowerCase()} : <span className="font-semibold text-ink">{money(total)}</span></CardDescription>
            </div>
            <MonthSwitcher month={month} currentMonth={ctx.currentMonth} basePath="/app/income" />
          </CardHeader>
          <CardContent>
            {incomes.length === 0 ? (
              <EmptyState icon={Wallet} title="Aucun revenu ce mois-ci" description="Ajoute ton salaire ou tes recettes pour alimenter ton tableau de bord et le planificateur." />
            ) : (
              <ul className="divide-y">
                {incomes.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{i.label}</p>
                      <p className="text-xs text-muted">
                        {formatDateLabel(i.receivedOn)} · {INCOME_SOURCE_LABELS[i.type]}
                        {i.sourceId ? ` · ${sourceName.get(i.sourceId) ?? ''}` : ''}
                      </p>
                    </div>
                    <p className="font-semibold text-good-ink tabular">+{money(i.amount)}</p>
                    <ButtonLink href={`/app/planner?income=${i.id}`} variant="ghost" size="sm" className="hidden sm:inline-flex">Planifier</ButtonLink>
                    <EditIncomeButton
                      sources={sourceOptions}
                      currency={ctx.currency}
                      today={ctx.today}
                      income={{ id: i.id, sourceId: i.sourceId, type: i.type, amount: i.amount, receivedOn: i.receivedOn, label: i.label, note: i.note }}
                    />
                    <ConfirmButton action={deleteIncomeAction} hiddenFields={{ id: i.id }} label="Supprimer le revenu" description={`Supprimer « ${i.label} » (${money(i.amount)}) ?`} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sources de revenus</CardTitle>
            <CardDescription>Tes revenus réguliers et ponctuels.</CardDescription>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-sm text-ink-2">Ajoute ton salaire comme source mensuelle : NexaFi te rappellera de le planifier à chaque réception.</p>
            ) : (
              <ul className="divide-y">
                {sources.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted">
                        {INCOME_SOURCE_LABELS[s.type]} · {s.recurrence === 'monthly' ? `mensuel, le ${s.payDay ?? 1}` : 'ponctuel'}
                        {s.expectedAmount ? ` · ${money(s.expectedAmount)}` : ''}
                      </p>
                    </div>
                    {!s.isActive ? <Badge>Inactive</Badge> : s.isFixed ? <Badge tone="primary">Fixe</Badge> : <Badge tone="gold">Variable</Badge>}
                    <SourceButton
                      currency={ctx.currency}
                      source={{ id: s.id, name: s.name, type: s.type, isFixed: s.isFixed, expectedAmount: s.expectedAmount, recurrence: s.recurrence, payDay: s.payDay, isActive: s.isActive }}
                    />
                    <ConfirmButton action={deleteIncomeSourceAction} hiddenFields={{ id: s.id }} label="Supprimer la source" description="Les revenus déjà enregistrés sont conservés." />
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
