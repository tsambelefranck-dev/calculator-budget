'use client';

import { Trash2 } from 'lucide-react';
import { useActionState, useState, type ReactNode } from 'react';
import { initialActionState, type ActionState } from '@/lib/action-state';
import { Button, type ButtonProps } from './button';
import { Dialog } from './dialog';
import { SubmitButton } from './submit-button';
import { useActionFeedback } from './use-action-feedback';

/** Bouton qui demande confirmation avant d'exécuter une action serveur (suppression…). */
export function ConfirmButton({
  action,
  title = 'Confirmer la suppression',
  description = 'Cette action est définitive.',
  confirmLabel = 'Supprimer',
  children,
  variant = 'ghost',
  size = 'icon',
  label = 'Supprimer',
  hiddenFields,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  children?: ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  label?: string;
  hiddenFields?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, initialActionState);
  useActionFeedback(state, { onSuccess: () => setOpen(false) });

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} aria-label={label} title={label}>
        {children ?? <Trash2 className="size-4" aria-hidden />}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} size="sm">
        <form action={formAction} className="space-y-5">
          {hiddenFields
            ? Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)
            : null}
          <div className="text-sm text-ink-2">{description}</div>
          {state.ok === false && state.message ? <p className="text-sm text-critical-ink">{state.message}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <SubmitButton variant="danger">{confirmLabel}</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
