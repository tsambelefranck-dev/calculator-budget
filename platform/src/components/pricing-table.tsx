import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CurrencyCode } from '@/lib/constants';
import { formatMoney } from '@/lib/finance/money';
import { PREMIUM_PRICING } from '@/server/services/entitlements';

const FREE = ['Tableau de bord et santé financière', 'Revenus, dépenses, budgets et alertes', 'Planificateur de salaire', '3 objectifs d’épargne actifs', 'Suivi des dettes', 'Rapport mensuel chiffré', '10 messages / mois avec le coach IA', 'Leçons de base et centre d’investissement'];
const PREMIUM = ['Tout ce qui est gratuit', '100 messages / mois avec le coach IA', 'Analyse IA du rapport mensuel', 'Simulateur d’investissement', 'Stratégies Avalanche / Boule de neige + calendrier', 'Objectifs illimités', 'Historique et graphiques sur 12 mois', 'Toutes les leçons'];

export function PricingTable({ currency, cta }: { currency: CurrencyCode; cta?: ReactNode }) {
  const price = PREMIUM_PRICING[currency];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-3xl border bg-surface p-6 shadow-card">
        <p className="text-lg font-semibold">Gratuit</p>
        <p className="mt-1 text-3xl font-semibold">0</p>
        <ul className="mt-5 space-y-2 text-sm">{FREE.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-good-ink" aria-hidden /> {f}</li>)}</ul>
      </div>
      <div className="rounded-3xl border-2 border-accent bg-surface p-6 shadow-pop">
        <p className="text-lg font-semibold">Premium</p>
        <p className="mt-1 text-3xl font-semibold">{formatMoney(price.monthly, currency)}<span className="text-base font-normal text-muted"> / mois</span></p>
        <p className="text-sm text-ink-2">ou {formatMoney(price.yearly, currency)} / an (2 mois offerts)</p>
        <ul className="mt-5 space-y-2 text-sm">{PREMIUM.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden /> {f}</li>)}</ul>
        {cta ? <div className="mt-6">{cta}</div> : null}
      </div>
    </div>
  );
}
