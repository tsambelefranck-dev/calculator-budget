import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SignupForm } from '@/components/auth/signup-form';
import { getCurrentUser } from '@/server/auth/current';

export const metadata: Metadata = { title: 'Créer un compte' };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/app');
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Crée ton compte NexaFi</h1>
        <p className="text-sm text-ink-2">Gratuit, sans carte bancaire. 3 minutes pour ton diagnostic financier.</p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-ink-2">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-primary-ink hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
