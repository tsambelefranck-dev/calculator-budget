'use client';

import { useActionState, type ReactNode } from 'react';
import { useActionFeedback } from '@/components/ui/use-action-feedback';
import { initialActionState, type ActionState } from '@/lib/action-state';

/** Formulaire d'administration générique (toast de confirmation). */
export function AdminForm({ action, children, className }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; children: ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, initialActionState);
  useActionFeedback(state);
  return (
    <form action={formAction} className={className}>
      {children}
      {state.ok === false && state.message ? <p className="mt-1 text-xs text-critical-ink">{state.message}</p> : null}
    </form>
  );
}
