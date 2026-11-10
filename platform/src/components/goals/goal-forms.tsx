'use client';

import { HandCoins, Pencil, Plus } from 'lucide-react';
import { useActionState, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { MoneyInput } from '@/components/ui/money-input';
import { SubmitButton } from '@/components/ui/submit-button';
import { useActionFeedback } from '@/components/ui/use-action-feedback';
import { initialActionState } from '@/lib/action-state';
import { GOAL_TYPES, GOAL_TYPE_LABELS, type CurrencyCode } from '@/lib/constants';
import { addContributionAction, saveGoalAction } from '@/server/actions/goals';

export interface GoalDefaults {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  targetDate: string | null;
  plannedMonthly: number | null;
}

export function GoalButton({ currency, goal, disabledReason }: { currency: CurrencyCode; goal?: GoalDefaults; disabledReason?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveGoalAction.bind(null, goal?.id ?? null), initialActionState);
  useActionFeedback(state, { onSuccess: () => setOpen(false) });
  const v = state.ok === false ? state.values : undefined;
  return (
    <>
      {goal ? (
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label={`Modifier ${goal.name}`}><Pencil className="size-4" aria-hidden /></Button>
      ) : (
        <Button onClick={() => setOpen(true)} title={disabledReason}><Plus className="size-4" aria-hidden /> Nouvel objectif</Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={goal ? 'Modifier l’objectif' : 'Nouvel objectif d’épargne'}>
        <form action={action} className="space-y-4" noValidate>
          {state.ok === false && state.message && !state.errors ? <Alert tone="critical">{state.message}</Alert> : null}
          {!goal && disabledReason ? <Alert tone="gold">{disabledReason}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="goal-type">
              <Select id="goal-type" name="type" defaultValue={v?.type ?? goal?.type ?? 'projet_perso'}>
                {GOAL_TYPES.map((t) => <option key={t} value={t}>{GOAL_TYPE_LABELS[t]}</option>)}
              </Select>
            </Field>
            <Field label="Nom" htmlFor="goal-name" errors={state.errors?.name}>
              <Input id="goal-name" name="name" maxLength={80} placeholder="Ex. Terrain à Yaoundé" defaultValue={v?.name ?? goal?.name} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Montant cible" htmlFor="goal-target" errors={state.errors?.targetAmount}>
              <MoneyInput id="goal-target" name="targetAmount" currency={currency} defaultMinor={goal?.targetAmount} defaultText={v?.targetAmount} />
            </Field>
            <Field label="Date souhaitée" htmlFor="goal-date" errors={state.errors?.targetDate} optional>
              <Input id="goal-date" name="targetDate" type="date" defaultValue={v?.targetDate ?? goal?.targetDate ?? ''} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Versement mensuel prévu" htmlFor="goal-monthly" optional hint="Sert à estimer la date d’arrivée.">
              <MoneyInput id="goal-monthly" name="plannedMonthly" currency={currency} defaultMinor={goal?.plannedMonthly} defaultText={v?.plannedMonthly} />
            </Field>
            {!goal ? (
              <Field label="Déjà épargné" htmlFor="goal-initial" optional>
                <MoneyInput id="goal-initial" name="initialAmount" currency={currency} defaultText={v?.initialAmount} />
              </Field>
            ) : null}
          </div>
          <SubmitButton className="w-full" size="lg">{goal ? 'Enregistrer' : 'Créer l’objectif'}</SubmitButton>
        </form>
      </Dialog>
    </>
  );
}

export function ContributionButton({ goalId, goalName, currency, today }: { goalId: string; goalName: string; currency: CurrencyCode; today: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(addContributionAction, initialActionState);
  useActionFeedback(state, { onSuccess: () => setOpen(false) });
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}><HandCoins className="size-4" aria-hidden /> Verser</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Versement · ${goalName}`} description="Enregistre l’argent que tu as réellement mis de côté (NexaFi ne déplace pas ton argent).">
        <form action={action} className="space-y-4" noValidate>
          <input type="hidden" name="goalId" value={goalId} />
          {state.ok === false && state.message && !state.errors ? <Alert tone="critical">{state.message}</Alert> : null}
          <Field label="Montant" htmlFor="contrib-amount" errors={state.errors?.amount}>
            <MoneyInput id="contrib-amount" name="amount" currency={currency} className="h-12 text-xl" autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="contrib-date" errors={state.errors?.contributedOn}>
              <Input id="contrib-date" name="contributedOn" type="date" defaultValue={today} />
            </Field>
            <Field label="Note" htmlFor="contrib-note" optional>
              <Input id="contrib-note" name="note" maxLength={200} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" name="withdrawal" className="size-4 accent-[var(--primary)]" /> C’est un retrait (argent utilisé)
          </label>
          <SubmitButton className="w-full" size="lg">Enregistrer</SubmitButton>
        </form>
      </Dialog>
    </>
  );
}
