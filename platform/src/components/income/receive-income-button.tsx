'use client';

import { CircleCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { SubmitButton } from '@/components/ui/submit-button';
import { useActionFeedback } from '@/components/ui/use-action-feedback';
import { initialActionState } from '@/lib/action-state';
import { receiveExpectedIncomeAction } from '@/server/actions/finance';

/** « Marquer comme reçu » puis ouvre le planificateur avec ce revenu. */
export function ReceiveIncomeButton({ sourceId, label = 'Marquer comme reçu' }: { sourceId: string; label?: string }) {
  const router = useRouter();
  const [state, action] = useActionState(receiveExpectedIncomeAction, initialActionState);
  useActionFeedback(state, { onSuccess: (s) => s.id && router.push(`/app/planner?income=${s.id}`) });
  return (
    <form action={action}>
      <input type="hidden" name="sourceId" value={sourceId} />
      <SubmitButton size="md" pendingLabel="Enregistrement…">
        <CircleCheck className="size-4" aria-hidden /> {label}
      </SubmitButton>
    </form>
  );
}
