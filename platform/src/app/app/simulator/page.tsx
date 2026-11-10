import { Crown } from 'lucide-react';
import type { Metadata } from 'next';
import { Simulator } from '@/components/invest/simulator';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { requireAppContext } from '@/server/auth/current';
import { getPlanLimits } from '@/server/services/entitlements';

export const metadata: Metadata = { title: 'Simulateur d’investissement' };

export default async function SimulatorPage() {
  const ctx = await requireAppContext();
  const allowed = getPlanLimits(ctx.user.plan).simulator;
  const defaultInitial = ctx.currency === 'XAF' || ctx.currency === 'XOF' ? 500000 : 1000;
  return (
    <div className="space-y-6">
      <PageHeader title="Simulateur d’investissement" description="Compare une épargne sans rendement à trois scénarios (pessimiste, intermédiaire, optimiste), avec frais et inflation." />
      {allowed ? (
        <Simulator currency={ctx.currency} defaultInitial={defaultInitial} />
      ) : (
        <EmptyState
          icon={Crown}
          title="Le simulateur est inclus dans Premium"
          description="Teste tes scénarios d’investissement avec frais et inflation. Essai gratuit de 14 jours, sans moyen de paiement."
          action={<ButtonLink href="/app/upgrade" variant="gold">Essayer Premium gratuitement</ButtonLink>}
        />
      )}
    </div>
  );
}
