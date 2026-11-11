'use client';

import { useActionState } from 'react';
import { SubmitButton } from '@/components/ui/submit-button';
import { initialActionState } from '@/lib/action-state';
import { markNotificationsReadAction } from '@/server/actions/finance';

export function MarkReadButton() {
  const [, action] = useActionState(markNotificationsReadAction, initialActionState);
  return (
    <form action={action}>
      <SubmitButton variant="outline">Tout marquer comme lu</SubmitButton>
    </form>
  );
}
