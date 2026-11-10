import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { ButtonLink } from '@/components/ui/button';
import { getCurrentUser } from '@/server/auth/current';
import { safeRedirectPath } from '@/server/auth/request';

export const metadata: Metadata = { title: 'Connexion' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeRedirectPath(next, '/app'));
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Bon retour 👋</h1>
        <p className="text-sm text-ink-2">Connecte-toi pour retrouver ton tableau de bord.</p>
      </div>
      <LoginForm next={next ? safeRedirectPath(next) : undefined} />
      <div className="space-y-3 text-center text-sm text-ink-2">
        <p>
          Pas encore de compte ?{' '}
          <Link href="/signup" className="font-medium text-primary-ink hover:underline">
            Créer un compte gratuit
          </Link>
        </p>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>
        <ButtonLink href="/demo" variant="outline" className="w-full">
          Essayer avec un compte de démonstration
        </ButtonLink>
      </div>
    </div>
  );
}
