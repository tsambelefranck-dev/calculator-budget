import type { Metadata } from 'next';
import { PricingTable } from '@/components/pricing-table';
import { TrialButton } from '@/components/settings/trial-button';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { requireAppContext } from '@/server/auth/current';

export const metadata: Metadata = { title: 'Premium' };

export default async function UpgradePage() {
  const ctx = await requireAppContext();
  const premium = ctx.user.plan === 'premium';
  return (
    <div className="space-y-6">
      <PageHeader title="NexaFi Premium" description="Plus d’IA, plus d’analyses, plus d’outils pour construire ton patrimoine." />
      {premium ? (
        <Alert tone="good" title="Tu es Premium">{ctx.user.premiumUntil ? `Accès actif jusqu’au ${ctx.user.premiumUntil.toLocaleDateString('fr-FR')}.` : 'Accès actif.'}</Alert>
      ) : null}
      <PricingTable
        currency={ctx.currency}
        cta={
          premium ? null : ctx.user.trialUsedAt ? (
            <p className="text-sm text-ink-2">Ton essai est terminé. Le paiement en ligne (Mobile Money, carte) arrive bientôt : en attendant, contacte le support pour activer Premium par Mobile Money.</p>
          ) : ctx.user.isDemo ? (
            <p className="text-sm text-ink-2">Crée un vrai compte pour essayer Premium.</p>
          ) : (
            <TrialButton />
          )
        }
      />
      <p className="text-xs text-muted">Aucun moyen de paiement n’est demandé pour l’essai. Le paiement en ligne n’est pas encore intégré : NexaFi n’encaisse rien automatiquement.</p>
    </div>
  );
}
