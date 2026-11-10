import { Compass } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Compass className="size-10 text-primary-ink" aria-hidden />
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="max-w-sm text-ink-2">Cette page n’existe pas ou a été déplacée.</p>
      <ButtonLink href="/app">Retour au tableau de bord</ButtonLink>
    </div>
  );
}
