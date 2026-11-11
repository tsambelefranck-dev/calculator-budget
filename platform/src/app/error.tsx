'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Une erreur est survenue</h1>
      <p className="max-w-md text-ink-2">L’incident a été enregistré. Réessaie ; si le problème persiste, contacte le support{error.digest ? ` (référence ${error.digest})` : ''}.</p>
      <Button onClick={reset}><RotateCcw className="size-4" aria-hidden /> Réessayer</Button>
    </div>
  );
}
