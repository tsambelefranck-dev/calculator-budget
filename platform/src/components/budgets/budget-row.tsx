'use client';

import { Check, Copy, Pencil } from 'lucide-react';
import { useActionState, useState } from 'react';
import { CategoryIcon } from '@/components/category-icon';
import { Button } from '@/components/ui/button';
import { Meter } from '@/components/ui/meter';
import { MoneyInput } from '@/components/ui/money-input';
import { SubmitButton } from '@/components/ui/submit-button';
import { useActionFeedback } from '@/components/ui/use-action-feedback';
import { initialActionState } from '@/lib/action-state';
import type { CurrencyCode } from '@/lib/constants';
import { formatMoney } from '@/lib/finance/money';
import { copyBudgetsAction, upsertBudgetAction } from '@/server/actions/finance';

export function BudgetRow({
  categoryId,
  name,
  icon,
  color,
  month,
  budget,
  spent,
  average,
  currency,
}: {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  month: string;
  budget: number | null;
  spent: number;
  average: number | null;
  currency: CurrencyCode;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(upsertBudgetAction, initialActionState);
  useActionFeedback(state, { onSuccess: () => setEditing(false) });
  const money = (v: number) => formatMoney(v, currency);
  return (
    <li className="space-y-2 py-4">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={icon} color={color} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-muted tabular">
            {money(spent)} dépensés{budget !== null ? ` sur ${money(budget)}` : ''}
            {average ? ` · moyenne ${money(average)}/mois` : ''}
          </p>
        </div>
        {budget !== null && !editing ? (
          <p className={`text-sm font-semibold tabular ${spent > budget ? 'text-critical-ink' : 'text-ink'}`}>
            {spent > budget ? `−${money(spent - budget)}` : `${money(budget - spent)} restants`}
          </p>
        ) : null}
        {!editing ? (
          <Button variant={budget === null ? 'outline' : 'ghost'} size={budget === null ? 'sm' : 'icon'} onClick={() => setEditing(true)} aria-label={`Définir le budget ${name}`}>
            {budget === null ? 'Définir' : <Pencil className="size-4" aria-hidden />}
          </Button>
        ) : null}
      </div>
      {editing ? (
        <form action={action} className="flex items-start gap-2">
          <input type="hidden" name="categoryId" value={categoryId} />
          <input type="hidden" name="month" value={month} />
          <div className="flex-1">
            <MoneyInput name="amount" currency={currency} defaultMinor={budget ?? average ?? undefined} aria-label={`Budget ${name}`} autoFocus />
            {state.errors?.amount ? <p className="mt-1 text-xs text-critical-ink">{state.errors.amount[0]}</p> : null}
          </div>
          <SubmitButton size="md" aria-label="Enregistrer le budget"><Check className="size-4" aria-hidden /></SubmitButton>
          <Button variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
        </form>
      ) : budget !== null ? (
        <Meter value={spent} max={budget} label={`Budget ${name}`} />
      ) : null}
    </li>
  );
}

export function CopyBudgetsButton({ month }: { month: string }) {
  const [state, action] = useActionState(copyBudgetsAction, initialActionState);
  useActionFeedback(state);
  return (
    <form action={action}>
      <input type="hidden" name="month" value={month} />
      <SubmitButton variant="outline"><Copy className="size-4" aria-hidden /> Copier le mois précédent</SubmitButton>
      {state.ok === false && state.message ? <p className="mt-1 text-xs text-ink-2">{state.message}</p> : null}
    </form>
  );
}
