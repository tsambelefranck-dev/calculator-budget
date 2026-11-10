import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/password-reset-forms';

export const metadata: Metadata = { title: 'Mot de passe oublié' };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Mot de passe oublié</h1>
        <p className="text-sm text-ink-2">Indique ton e-mail : nous t’envoyons un lien pour choisir un nouveau mot de passe.</p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-primary-ink hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
