'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { initialActionState } from '@/lib/action-state';
import { startDemoAction } from '@/server/actions/demo';

export function DemoButton() {
  const [state, action] = useActionState(startDemoAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      {state.ok === false && state.message ? <Alert tone="critical">{state.message}</Alert> : null}
      <SubmitButton size="lg" className="w-full" pendingLabel="Préparation de la démo…">Lancer la démo</SubmitButton>
    </form>
  );
}
