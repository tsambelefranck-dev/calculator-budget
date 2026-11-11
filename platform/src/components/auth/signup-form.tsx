'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Field, FieldError, Input } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { initialActionState } from '@/lib/action-state';
import { signUpAction } from '@/server/actions/auth';

export function SignupForm() {
  const [state, action] = useActionState(signUpAction, initialActionState);
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.ok === false && state.message && !state.errors ? <Alert tone="critical">{state.message}</Alert> : null}
      <Field label="Prénom" htmlFor="name" errors={state.errors?.name}>
        <Input id="name" name="name" autoComplete="given-name" required defaultValue={state.values?.name} aria-invalid={Boolean(state.errors?.name)} />
      </Field>
      <Field label="Adresse e-mail" htmlFor="email" errors={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} aria-invalid={Boolean(state.errors?.email)} />
      </Field>
      <Field label="Mot de passe" htmlFor="password" errors={state.errors?.password} hint="10 caractères minimum. Une phrase facile à retenir fonctionne très bien.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={Boolean(state.errors?.password)} />
      </Field>
      <div className="space-y-1">
        <label className="flex items-start gap-3 text-sm text-ink-2">
          <input type="checkbox" name="acceptTerms" className="mt-0.5 size-4 rounded accent-[var(--primary)]" />
          <span>
            J’accepte les{' '}
            <Link href="/terms" className="font-medium text-primary-ink underline" target="_blank">
              conditions d’utilisation
            </Link>{' '}
            et la{' '}
            <Link href="/privacy" className="font-medium text-primary-ink underline" target="_blank">
              politique de confidentialité
            </Link>
            . NexaFi est un outil d’organisation et d’éducation financière : il ne détient pas ton argent.
          </span>
        </label>
        <FieldError errors={state.errors?.acceptTerms} />
      </div>
      <SubmitButton size="lg" className="w-full" pendingLabel="Création du compte…">
        Créer mon compte gratuitement
      </SubmitButton>
    </form>
  );
}
