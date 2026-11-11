'use client';

import { ShieldCheck } from 'lucide-react';
import { useActionState } from 'react';
import { SubmitButton } from '@/components/ui/submit-button';
import { useActionFeedback } from '@/components/ui/use-action-feedback';
import { initialActionState } from '@/lib/action-state';
import { setAiConsentAction } from '@/server/actions/assistant';

export function ConsentToggle({ consent }: { consent: boolean }) {
  const [state, action] = useActionState(setAiConsentAction, initialActionState);
  useActionFeedback(state);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border bg-surface p-4 sm:flex-row sm:items-center">
      <input type="hidden" name="consent" value={consent ? 'false' : 'true'} />
      <ShieldCheck className={consent ? 'size-6 text-good-ink' : 'size-6 text-warning-ink'} aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-medium">{consent ? 'L’assistant peut lire tes données financières' : 'L’assistant n’a pas accès à tes données'}</p>
        <p className="text-ink-2">
          {consent
            ? 'Il consulte uniquement des agrégats (totaux, catégories, objectifs, dettes) pour te répondre. Ni ton nom, ni ton e-mail ne sont transmis.'
            : 'Autorise l’accès pour des réponses basées sur tes vrais chiffres. Tu peux le retirer à tout moment.'}
        </p>
      </div>
      <SubmitButton variant={consent ? 'outline' : 'primary'} size="sm">{consent ? 'Retirer l’accès' : 'Autoriser l’accès à mes données'}</SubmitButton>
    </form>
  );
}
