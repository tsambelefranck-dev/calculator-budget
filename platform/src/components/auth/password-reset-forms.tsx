'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Field, Input } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { initialActionState } from '@/lib/action-state';
import { forgotPasswordAction, resetPasswordAction } from '@/server/actions/auth';

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initialActionState);
  if (state.ok) return <Alert tone="good" title="Demande envoyée">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.ok === false && state.message && !state.errors ? <Alert tone="critical">{state.message}</Alert> : null}
      <Field label="Adresse e-mail du compte" htmlFor="email" errors={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Envoi…">
        Recevoir un lien de réinitialisation
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialActionState);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      {state.ok === false && state.message ? <Alert tone="critical">{state.message}</Alert> : null}
      <Field label="Nouveau mot de passe" htmlFor="password" errors={state.errors?.password} hint="10 caractères minimum.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirme le mot de passe" htmlFor="confirm" errors={state.errors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Enregistrement…">
        Enregistrer et me connecter
      </SubmitButton>
    </form>
  );
}
