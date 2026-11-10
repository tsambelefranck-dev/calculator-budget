import type { Metadata } from 'next';
import { PublicShell } from '@/components/layout/public-shell';
import { PricingTable } from '@/components/pricing-table';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Tarifs' };

export default function PricingPage() {
  return (
    <PublicShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Tarifs</h1>
          <p className="text-ink-2">Commence gratuitement. Passe à Premium quand tu veux aller plus loin — essai de 14 jours sans moyen de paiement.</p>
        </div>
        <PricingTable currency="XAF" cta={<ButtonLink href="/signup" variant="gold" className="w-full">Commencer</ButtonLink>} />
        <p className="text-sm text-muted">Prix indiqués en FCFA (XAF/XOF) ; 4,99 € ou 4,99 $ par mois dans les autres devises.</p>
      </div>
    </PublicShell>
  );
}
