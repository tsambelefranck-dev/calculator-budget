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
import { DEBT_TYPES, DEBT_TYPE_LABELS, type CurrencyCode } from '@/lib/constants';
import { recordPaymentAction, saveDebtAction } from '@/server/actions/debts';

export interface DebtDefaults {
  id: string;
  name: string;
  type: string;
  lender: string | null;
  principal: number;
  initialBalance: number;
  annualRateBp: number;
  minimumPayment: number;
  dueDay: number | null;
  startDate: string | null;
}

export function DebtButton({ currency, debt }: { currency: CurrencyCode; debt?: DebtDefaults }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveDebtAction.bind(null, debt?.id ?? null), initialActionState);
  useActionFeedback(state, { onSuccess: () => setOpen(false) });
  const v = state.ok === false ? state.values : undefined;
  return (
    <>
      {debt ? (
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label={`Modifier ${debt.name}`}><Pencil className="size-4" aria-hidden /></Button>
      ) : (
        <Button onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden /> Ajouter une dette</Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={debt ? 'Modifier la dette' : 'Nouvelle dette'} description="Crédit bancaire, microfinance, prêt familial, avance de tontine…">
        <form action={action} className="space-y-4" noValidate>
          {state.ok === false && state.message && !state.errors ? <Alert tone="critical">{state.message}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" htmlFor="debt-name" errors={state.errors?.name}>
              <Input id="debt-name" name="name" maxLength={80} placeholder="Ex. Crédit moto" defaultValue={v?.name ?? debt?.name} />
            </Field>
            <Field label="Type" htmlFor="debt-type">
              <Select id="debt-type" name="type" defaultValue={v?.type ?? debt?.type ?? 'credit_bancaire'}>
                {DEBT_TYPES.map((t) => <option key={t} value={t}>{DEBT_TYPE_LABELS[t]}</option>)}
              </Select>
            </Field>
            <Field label="Prêteur" htmlFor="debt-lender" optional>
              <Input id="debt-lender" name="lender" maxLength={80} defaultValue={v?.lender ?? debt?.lender ?? ''} />
            </Field>
            <Field label="Montant emprunté" htmlFor="debt-principal" errors={state.errors?.principal}>
              <MoneyInput id="debt-principal" name="principal" currency={currency} defaultMinor={debt?.principal} defaultText={v?.principal} />
            </Field>
            <Field label="Capital restant dû aujourd’hui" htmlFor="debt-balance" errors={state.errors?.initialBalance} hint="Tes remboursements futurs seront déduits de ce montant.">
              <MoneyInput id="debt-balance" name="initialBalance" currency={currency} defaultMinor={debt?.initialBalance} defaultText={v?.initialBalance} />
            </Field>
            <Field label="Taux d’intérêt annuel (%)" htmlFor="debt-rate" errors={state.errors?.annualRate} hint="0 pour un prêt sans intérêt.">
              <Input id="debt-rate" name="annualRate" inputMode="decimal" defaultValue={v?.annualRate ?? (debt ? String(debt.annualRateBp / 100).replace('.', ',') : '0')} />
            </Field>
            <Field label="Mensualité" htmlFor="debt-min" errors={state.errors?.minimumPayment}>
              <MoneyInput id="debt-min" name="minimumPayment" currency={currency} defaultMinor={debt?.minimumPayment} defaultText={v?.minimumPayment} />
            </Field>
            <Field label="Jour d’échéance" htmlFor="debt-day" optional errors={state.errors?.dueDay}>
              <Input id="debt-day" name="dueDay" type="number" min={1} max={31} defaultValue={v?.dueDay ?? debt?.dueDay ?? ''} />
            </Field>
          </div>
          <input type="hidden" name="startDate" value={debt?.startDate ?? ''} />
          <SubmitButton className="w-full" size="lg">{debt ? 'Enregistrer' : 'Ajouter la dette'}</SubmitButton>
        </form>
      </Dialog>
    </>
  );
}

export function PaymentButton({ debtId, name, suggested, currency, today }: { debtId: string; name: string; suggested: number; currency: CurrencyCode; today: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(recordPaymentAction, initialActionState);
  useActionFeedback(state, { onSuccess: () => setOpen(false) });
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}><HandCoins className="size-4" aria-hidden /> Remboursement</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Remboursement · ${name}`}>
        <form action={action} className="space-y-4" noValidate>
          <input type="hidden" name="debtId" value={debtId} />
          {state.ok === false && state.message && !state.errors ? <Alert tone="critical">{state.message}</Alert> : null}
          <Field label="Montant remboursé" htmlFor="pay-amount" errors={state.errors?.amount}>
            <MoneyInput id="pay-amount" name="amount" currency={currency} defaultMinor={suggested} className="h-12 text-xl" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="pay-date"><Input id="pay-date" name="paidOn" type="date" defaultValue={today} /></Field>
            <Field label="Note" htmlFor="pay-note" optional><Input id="pay-note" name="note" maxLength={200} /></Field>
          </div>
          <SubmitButton className="w-full" size="lg">Enregistrer</SubmitButton>
        </form>
      </Dialog>
    </>
  );
}
