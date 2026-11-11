'use client';

import { useEffect, useRef } from 'react';
import type { ActionState } from '@/lib/action-state';
import { useToast } from './toast';

/** Affiche un toast et déclenche `onSuccess` à chaque nouveau résultat d'action. */
export function useActionFeedback(state: ActionState, options: { onSuccess?: (state: ActionState) => void; silentErrors?: boolean } = {}) {
  const toast = useToast();
  const last = useRef<ActionState | null>(null);
  const { onSuccess, silentErrors } = options;
  useEffect(() => {
    if (state === last.current || (state.ok === undefined && !state.message)) return;
    last.current = state;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      onSuccess?.(state);
    } else if (state.message && !silentErrors && !state.errors) {
      toast.error(state.message);
    }
  }, [state, toast, onSuccess, silentErrors]);
}
