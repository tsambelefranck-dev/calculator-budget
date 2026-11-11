'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Field, Input, Select } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { useActionFeedback } from '@/components/ui/use-action-feedback';
import { initialActionState } from '@/lib/action-state';
import { CURRENCIES, type CurrencyCode } from '@/lib/constants';
import { CURRENCY_META } from '@/lib/finance/money';
import { deleteAccountAction, changeCurrencyAction, updateNameAction } from '@/server/actions/account';
import { changePasswordAction, revokeOtherSessionsAction } from '@/server/actions/auth';

export function NameForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateNameAction, initialActionState);
  useActionFeedback(state);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field label="Prénom" htmlFor="settings-name" errors={state.errors?.name} className="flex-1">
        <Input id="settings-name" name="name" defaultValue={name} maxLength={80} />
      </Field>
      <SubmitButton variant="outline">Enregistrer</SubmitButton>
    </form>
  );
}

export function CurrencyForm({ currency }: { currency: CurrencyCode }) {
  const [state, action] = useActionState(changeCurrencyAction, initialActionState);
  useActionFeedback(state);
  return (
    <form action={action} className="space-y-3">
      {state.ok === false && state.message ? <Alert tone="critical">{state.message}</Alert> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Devise principale" htmlFor="settings-currency" className="flex-1" hint="EUR, XAF et XOF sont convertis exactement (parité fixe 1 € = 655,957 FCFA). Le dollar n’est pas converti sans taux vérifiable.">
          <Select id="settings-currency" name="currency" defaultValue={currency}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_META[c].label}</option>)}
          </Select>
        </Field>
        <SubmitButton variant="outline">Changer</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialActionState);
  useActionFeedback(state);
  return (
    <form action={action} className="space-y-3" noValidate>
      {state.ok === false && state.message && !state.errors ? <Alert tone="critical">{state.message}</Alert> : null}
      <Field label="Mot de passe actuel" htmlFor="pw-current" errors={state.errors?.current}><Input id="pw-current" name="current" type="password" autoComplete="current-password" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nouveau mot de passe" htmlFor="pw-new" errors={state.errors?.password}><Input id="pw-new" name="password" type="password" autoComplete="new-password" /></Field>
        <Field label="Confirmation" htmlFor="pw-confirm" errors={state.errors?.confirm}><Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" /></Field>
      </div>
      <SubmitButton variant="outline">Changer le mot de passe</SubmitButton>
    </form>
  );
}

export function RevokeSessionsForm() {
  const [state, action] = useActionState(revokeOtherSessionsAction, initialActionState);
  useActionFeedback(state);
  return (
    <form action={action}>
      <SubmitButton variant="outline">Déconnecter mes autres appareils</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm({ isDemo }: { isDemo: boolean }) {
  const [state, action] = useActionState(deleteAccountAction, initialActionState);
  return (
    <form action={action} className="space-y-3" noValidate>
      <Alert tone="critical" title="Action définitive">Toutes tes données (revenus, dépenses, objectifs, dettes, conversations…) seront supprimées immédiatement et ne pourront pas être récupérées. Pense à exporter tes données avant.</Alert>
      <div className="grid gap-3 sm:grid-cols-2">
        {!isDemo ? <Field label="Mot de passe" htmlFor="del-password" errors={state.errors?.password}><Input id="del-password" name="password" type="password" autoComplete="current-password" /></Field> : null}
        <Field label="Écris SUPPRIMER pour confirmer" htmlFor="del-confirm" errors={state.errors?.confirmation}><Input id="del-confirm" name="confirmation" autoComplete="off" /></Field>
      </div>
      <SubmitButton variant="danger">Supprimer définitivement mon compte</SubmitButton>
    </form>
  );
}
