'use client';

import { Pencil, Plus } from 'lucide-react';
import { useActionState, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { MoneyInput } from '@/components/ui/money-input';
import { SubmitButton } from '@/components/ui/submit-button';
import { useActionFeedback } from '@/components/ui/use-action-feedback';
import { initialActionState, type ActionState } from '@/lib/action-state';
import { INCOME_SOURCE_LABELS, INCOME_SOURCE_TYPES, type CurrencyCode } from '@/lib/constants';
import { createIncomeAction, saveIncomeSourceAction, updateIncomeAction } from '@/server/actions/finance';

export interface SourceOption {
  id: string;
  name: string;
  type: string;
  expectedAmount: number | null;
}

export interface IncomeDefaults {
  id: string;
  sourceId: string | null;
  type: string;
  amount: number;
  receivedOn: string;
  label: string;
  note: string | null;
}

function IncomeFormBody({
  action,
  sources,
  currency,
  today,
  defaults,
  onDone,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  sources: SourceOption[];
  currency: CurrencyCode;
  today: string;
  defaults?: IncomeDefaults;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  const [sourceId, setSourceId] = useState(defaults?.sourceId ?? '');
  const selected = sources.find((s) => s.id === sourceId);
  useActionFeedback(state, { onSuccess: onDone });
  const v = state.ok === false ? state.values : undefined;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.ok === false && state.message && !state.errors ? <Alert tone="critical">{state.message}</Alert> : null}
      <Field label="Source" htmlFor="income-source" hint="Associer le revenu à une source permet de suivre les revenus récurrents.">
        <Select id="income-source" name="sourceId" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          <option value="">Revenu ponctuel (sans source)</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </Field>
      {!sourceId ? (
        <Field label="Type de revenu" htmlFor="income-type">
          <Select id="income-type" name="type" defaultValue={v?.type ?? defaults?.type ?? 'salaire'}>
            {INCOME_SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>{INCOME_SOURCE_LABELS[t]}</option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="type" value={selected?.type ?? 'autre'} />
      )}
      <Field label="Montant reçu" htmlFor="income-amount" errors={state.errors?.amount}>
        <MoneyInput
          key={sourceId}
          id="income-amount"
          name="amount"
          currency={currency}
          defaultMinor={defaults?.amount ?? selected?.expectedAmount ?? undefined}
          defaultText={v?.amount}
          className="h-12 text-xl"
          aria-invalid={Boolean(state.errors?.amount)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date de réception" htmlFor="income-date" errors={state.errors?.receivedOn}>
          <Input id="income-date" name="receivedOn" type="date" defaultValue={v?.receivedOn ?? defaults?.receivedOn ?? today} />
        </Field>
        <Field label="Libellé" htmlFor="income-label" optional>
          <Input id="income-label" name="label" maxLength={120} placeholder="Ex. salaire novembre" defaultValue={v?.label ?? defaults?.label} />
        </Field>
      </div>
      <Field label="Note" htmlFor="income-note" optional>
        <Textarea id="income-note" name="note" maxLength={500} defaultValue={v?.note ?? defaults?.note ?? ''} className="min-h-16" />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel="Enregistrement…">
        {defaults ? 'Enregistrer les modifications' : 'Enregistrer le revenu'}
      </SubmitButton>
    </form>
  );
}

export function AddIncomeButton(props: { sources: SourceOption[]; currency: CurrencyCode; today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> Ajouter un revenu
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nouveau revenu">
        <IncomeFormBody action={createIncomeAction} {...props} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

export function EditIncomeButton(props: { sources: SourceOption[]; currency: CurrencyCode; today: string; income: IncomeDefaults }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Modifier le revenu">
        <Pencil className="size-4" aria-hidden />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Modifier le revenu">
        <IncomeFormBody action={updateIncomeAction.bind(null, props.income.id)} defaults={props.income} {...props} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

export interface SourceDefaults {
  id: string;
  name: string;
  type: string;
  isFixed: boolean;
  expectedAmount: number | null;
  recurrence: 'none' | 'monthly';
  payDay: number | null;
  isActive: boolean;
}

export function SourceButton({ currency, source }: { currency: CurrencyCode; source?: SourceDefaults }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(saveIncomeSourceAction.bind(null, source?.id ?? null), initialActionState);
  const [recurrence, setRecurrence] = useState(source?.recurrence ?? 'monthly');
  useActionFeedback(state, { onSuccess: () => setOpen(false) });
  const v = state.ok === false ? state.values : undefined;
  return (
    <>
      {source ? (
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label={`Modifier ${source.name}`}>
          <Pencil className="size-4" aria-hidden />
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden /> Source de revenu
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={source ? 'Modifier la source' : 'Nouvelle source de revenu'} description="Salaire, activité, loyers… Une source mensuelle apparaîtra chaque mois comme « revenu attendu ».">
        <form action={formAction} className="space-y-4" noValidate>
          {state.ok === false && state.message && !state.errors ? <Alert tone="critical">{state.message}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" htmlFor="source-name" errors={state.errors?.name}>
              <Input id="source-name" name="name" maxLength={80} placeholder="Ex. Salaire Orange" defaultValue={v?.name ?? source?.name} />
            </Field>
            <Field label="Type" htmlFor="source-type">
              <Select id="source-type" name="type" defaultValue={v?.type ?? source?.type ?? 'salaire'}>
                {INCOME_SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>{INCOME_SOURCE_LABELS[t]}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Récurrence" htmlFor="source-recurrence">
            <Select id="source-recurrence" name="recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value as 'none' | 'monthly')}>
              <option value="monthly">Chaque mois</option>
              <option value="none">Ponctuelle / irrégulière</option>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Montant attendu" htmlFor="source-amount" errors={state.errors?.expectedAmount} optional={recurrence !== 'monthly'}>
              <MoneyInput id="source-amount" name="expectedAmount" currency={currency} defaultMinor={source?.expectedAmount} defaultText={v?.expectedAmount} />
            </Field>
            {recurrence === 'monthly' ? (
              <Field label="Jour de réception" htmlFor="source-day" errors={state.errors?.payDay} hint="Entre 1 et 31">
                <Input id="source-day" name="payDay" type="number" min={1} max={31} inputMode="numeric" defaultValue={v?.payDay ?? source?.payDay ?? 28} />
              </Field>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFixed" defaultChecked={source?.isFixed ?? true} className="size-4 accent-[var(--primary)]" />
            Montant fixe (identique chaque mois)
          </label>
          {source ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={source.isActive} className="size-4 accent-[var(--primary)]" />
              Source active
            </label>
          ) : null}
          <SubmitButton className="w-full" size="lg">{source ? 'Enregistrer' : 'Ajouter la source'}</SubmitButton>
        </form>
      </Dialog>
    </>
  );
}
