import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/password-reset-forms';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = { title: 'Nouveau mot de passe', referrer: 'no-referrer' };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Choisis un nouveau mot de passe</h1>
        <p className="text-sm text-ink-2">Tes autres sessions seront déconnectées par sécurité.</p>
      </div>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Alert tone="critical" title="Lien incomplet">
          Ouvre le lien reçu par e-mail ou <Link href="/forgot-password">fais une nouvelle demande</Link>.
        </Alert>
      )}
    </div>
  );
}
