'use client';

import { CircleCheck, RotateCcw, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatAmountInput, MoneyInput } from '@/components/ui/money-input';
import { SubmitButton } from '@/components/ui/submit-button';
import { useActionFeedback } from '@/components/ui/use-action-feedback';
import { initialActionState } from '@/lib/action-state';
import type { CurrencyCode, PlannerBucket } from '@/lib/constants';
import { CURRENCY_META, formatMoney, parseAmount } from '@/lib/finance/money';
import { cn } from '@/lib/utils';
import { savePlanAction } from '@/server/actions/planner';

export interface PlannerItemView {
  bucket: PlannerBucket;
  label: string;
  amount: number;
  percent: number;
  rationale: string;
}

const BAR: Partial<Record<PlannerBucket, string>> = {
  urgence: 'bg-chart-1',
  objectifs: 'bg-chart-1',
  investissement: 'bg-chart-1',
};

export function PlannerEditor({
  items,
  total,
  currency,
  month,
  incomeId,
  status,
  notes,
}: {
  items: PlannerItemView[];
  total: number;
  currency: CurrencyCode;
  month: string;
  incomeId: string | null;
  status: 'ok' | 'serre' | 'deficit';
  notes: string[];
}) {
  const router = useRouter();
  const decimals = CURRENCY_META[currency].decimals;
  const toText = (minor: number) => formatAmountInput(decimals ? (minor / 100).toFixed(2).replace('.', ',') : String(minor), decimals);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(items.map((i) => [i.bucket, toText(i.amount)])));
  const [version, setVersion] = useState(0);
  const [state, action] = useActionState(savePlanAction, initialActionState);
  useActionFeedback(state, { onSuccess: () => router.push('/app/planner?saved=1') });

  const allocated = useMemo(() => items.reduce((s, i) => s + (parseAmount(values[i.bucket] ?? '0', currency) ?? 0), 0), [items, values, currency]);
  const difference = total - allocated;
  const money = (v: number) => formatMoney(v, currency);
  const modified = items.some((i) => (parseAmount(values[i.bucket] ?? '0', currency) ?? 0) !== i.amount);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="total" value={String(decimals ? (total / 100).toFixed(2) : total)} />
      {incomeId ? <input type="hidden" name="incomeId" value={incomeId} /> : null}
      <input type="hidden" name="planStatus" value={status} />
      <input type="hidden" name="notes" value={JSON.stringify(notes)} />
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ bucket: i.bucket, recommendedAmount: i.amount, rationale: i.rationale })))} />

      {status === 'deficit' ? <Alert tone="critical" title="Budget en déficit">{notes.join(' ')}</Alert> : null}
      {status === 'serre' ? <Alert tone="warning" title="Budget serré">{notes.join(' ')}</Alert> : null}

      <Card>
        <CardContent className="space-y-1 pt-5 sm:pt-6">
          <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {items.map((i) => {
              const v = parseAmount(values[i.bucket] ?? '0', currency) ?? 0;
              return v > 0 ? <div key={i.bucket} className={cn('h-full', BAR[i.bucket] ?? 'bg-chart-2')} style={{ width: `${(v / Math.max(total, allocated)) * 100}%` }} title={`${i.label} : ${money(v)}`} /> : null;
            })}
          </div>
          <p className="pt-1 text-xs text-muted">Vert : épargne et investissement · Bleu : dépenses et obligations</p>
        </CardContent>
      </Card>

      <ul className="space-y-3" key={version}>
        {items.map((i) => {
          const current = parseAmount(values[i.bucket] ?? '0', currency) ?? 0;
          return (
            <li key={i.bucket} className="rounded-2xl border bg-surface p-4 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{i.label}</p>
                    <Badge tone={['urgence', 'objectifs', 'investissement'].includes(i.bucket) ? 'good' : 'neutral'}>
                      {total > 0 ? Math.round((current / total) * 100) : 0} %
                    </Badge>
                    {current !== i.amount ? <Badge tone="gold">Proposé : {money(i.amount)}</Badge> : null}
                  </div>
                  <p className="text-sm text-ink-2">{i.rationale}</p>
                </div>
                <div className="w-full sm:w-48">
                  <MoneyInput
                    name={`amount_${i.bucket}`}
                    currency={currency}
                    defaultText={values[i.bucket]}
                    onValueChange={(text) => setValues((v) => ({ ...v, [i.bucket]: text }))}
                    aria-label={`Montant pour ${i.label}`}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-20 z-10 rounded-2xl border bg-surface/95 p-4 shadow-pop backdrop-blur lg:bottom-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 text-sm">
            {difference === 0 ? (
              <p className="flex items-center gap-2 font-medium text-good-ink"><CircleCheck className="size-4" aria-hidden /> Chaque franc a une destination ({money(total)}).</p>
            ) : (
              <p className="flex items-center gap-2 font-medium text-warning-ink">
                <TriangleAlert className="size-4" aria-hidden />
                {difference > 0 ? `Reste ${money(difference)} à répartir` : `Dépassement de ${money(-difference)}`}
              </p>
            )}
            <label className="mt-2 flex items-center gap-2 text-ink-2">
              <input type="checkbox" name="applyBudgets" defaultChecked className="size-4 accent-[var(--primary)]" />
              Créer les budgets du mois à partir de ce plan
            </label>
          </div>
          {modified ? (
            <Button variant="ghost" onClick={() => { setValues(Object.fromEntries(items.map((i) => [i.bucket, toText(i.amount)]))); setVersion((x) => x + 1); }}>
              <RotateCcw className="size-4" aria-hidden /> Proposition initiale
            </Button>
          ) : null}
          <SubmitButton size="lg" disabled={difference !== 0} pendingLabel="Validation…">Valider mon plan</SubmitButton>
        </div>
        {state.ok === false && state.message ? <p className="mt-2 text-sm text-critical-ink">{state.message}</p> : null}
      </div>
    </form>
  );
}
