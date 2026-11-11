'use client';

import { Crown } from 'lucide-react';
import { useActionState } from 'react';
import { SubmitButton } from '@/components/ui/submit-button';
import { useActionFeedback } from '@/components/ui/use-action-feedback';
import { initialActionState } from '@/lib/action-state';
import { startTrialAction } from '@/server/actions/account';

export function TrialButton() {
  const [state, action] = useActionState(startTrialAction, initialActionState);
  useActionFeedback(state);
  return (
    <form action={action}>
      <SubmitButton variant="gold" size="lg" className="w-full"><Crown className="size-4" aria-hidden /> Démarrer l’essai gratuit de 14 jours</SubmitButton>
    </form>
  );
}
