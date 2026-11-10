import { FlaskConical } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DemoButton } from '@/components/demo-button';
import { Logo } from '@/components/layout/logo';

export const metadata: Metadata = { title: 'Démo' };

export default function DemoPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-3xl border bg-surface p-6 shadow-pop sm:p-8">
        <Link href="/"><Logo /></Link>
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><FlaskConical className="size-6 text-accent-ink" aria-hidden /> Essayer NexaFi</h1>
          <p className="text-sm text-ink-2">Un compte de démonstration est créé pour toi avec des <strong>données fictives</strong> (salaire, dépenses, objectifs, dettes) et toutes les fonctionnalités Premium. Il est isolé des comptes réels et supprimé automatiquement après 24 heures.</p>
        </div>
        <DemoButton />
        <p className="text-center text-sm text-ink-2">Tu préfères tes vrais chiffres ? <Link href="/signup" className="font-medium text-primary-ink underline">Crée ton compte</Link></p>
      </div>
    </div>
  );
}
