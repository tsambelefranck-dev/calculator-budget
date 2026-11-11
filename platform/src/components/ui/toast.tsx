'use client';

import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = Date.now() + Math.random();
      setItems((list) => [...list.slice(-2), { id, tone, message }]);
      window.setTimeout(() => remove(id), tone === 'error' ? 6000 : 3500);
    },
    [remove],
  );
  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-2xl border bg-surface px-4 py-3 text-sm shadow-pop',
            )}
          >
            {t.tone === 'success' ? (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-good-ink" aria-hidden />
            ) : (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-critical-ink" aria-hidden />
            )}
            <p className="flex-1 text-ink">{t.message}</p>
            <button type="button" onClick={() => remove(t.id)} className="text-muted hover:text-ink" aria-label="Fermer la notification">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) return { success: () => undefined, error: () => undefined };
  return ctx;
}
