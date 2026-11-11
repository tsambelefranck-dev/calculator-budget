'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Boîte de dialogue modale basée sur <dialog> (focus piégé, Échap et clic extérieur ferment).
 * S'affiche en feuille basse sur mobile, centrée sur ordinateur.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'm-0 mt-auto w-full max-w-none rounded-t-3xl border bg-surface p-0 text-ink shadow-pop backdrop:animate-fade-in open:animate-slide-up',
        'sm:m-auto sm:rounded-3xl',
        size === 'sm' && 'sm:max-w-md',
        size === 'md' && 'sm:max-w-lg',
        size === 'lg' && 'sm:max-w-2xl',
        className,
      )}
    >
      {open ? (
        <div className="flex max-h-[88dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
            <div className="space-y-1">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="text-sm text-ink-2">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Fermer"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
