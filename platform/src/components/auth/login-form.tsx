'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Field, Input } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { initialActionState } from '@/lib/action-state';
import { signInAction } from '@/server/actions/auth';

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, initialActionState);
  return (
    <form action={action} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.ok === false && state.message && !state.errors ? <Alert tone="critical">{state.message}</Alert> : null}
      <Field label="Adresse e-mail" htmlFor="email" errors={state.errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          aria-invalid={Boolean(state.errors?.email)}
          aria-describedby={state.errors?.email ? 'email-error' : undefined}
        />
      </Field>
      <Field
        label={
          <span className="flex w-full items-center justify-between">
            Mot de passe
            <Link href="/forgot-password" className="text-sm font-normal text-primary-ink hover:underline">
              Mot de passe oublié ?
            </Link>
          </span>
        }
        htmlFor="password"
        errors={state.errors?.password}
      >
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={Boolean(state.errors?.password)} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
    </form>
  );
}
