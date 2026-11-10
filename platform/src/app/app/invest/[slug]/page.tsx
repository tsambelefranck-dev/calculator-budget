import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DomainIcon, RiskDots } from '@/components/invest/domain-icon';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAppContext } from '@/server/auth/current';
import { getInvestmentDomain } from '@/server/services/content';

export const metadata: Metadata = { title: 'Domaine d’investissement' };

const NATURE: Record<string, { label: string; tone: 'good' | 'gold' | 'neutral' }> = {
  documente: { label: 'Information documentée (sources institutionnelles)', tone: 'good' },
  mixte: { label: 'Information pédagogique générale', tone: 'neutral' },
  hypothese: { label: 'Hypothèses à vérifier', tone: 'gold' },
};

export default async function DomainPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAppContext();
  const { slug } = await params;
  const d = await getInvestmentDomain(slug).catch(() => null);
  if (!d) notFound();
  const nature = NATURE[d.infoNature] ?? NATURE.mixte!;
  const rows: [string, string][] = [
    ['Fonctionnement', d.howItWorks],
    ['Capital de départ indicatif', d.startingCapital],
    ['Horizon d’investissement', d.horizon],
    ['Liquidité', d.liquidity],
    ['Coûts et frais éventuels', d.costs],
    ['Potentiel de rentabilité', d.returnPotential],
    ['Risques de perte', d.lossRisks],
    ['Exemple concret', d.example],
  ];
  return (
    <div className="space-y-6">
      <Link href="/app/invest" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-ink hover:underline"><ArrowLeft className="size-4" aria-hidden /> Centre d’investissement</Link>
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-ink"><DomainIcon icon={d.icon} className="size-6" /></div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{d.name}</h1>
          <p className="max-w-3xl text-ink-2">{d.description}</p>
          <div className="flex flex-wrap items-center gap-3"><RiskDots level={d.riskLevel} /><Badge tone={nature.tone}>{nature.label}</Badge></div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="divide-y pt-2">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 py-4 sm:grid-cols-[200px_1fr] sm:gap-4">
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-sm text-ink-2">{value}</p>
              </div>
            ))}
            <div className="grid gap-1 py-4 sm:grid-cols-[200px_1fr] sm:gap-4">
              <p className="text-sm font-semibold">Compétences nécessaires</p>
              <div className="flex flex-wrap gap-1.5">{d.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Sources et mise à jour</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {d.sources.length ? (
                <ul className="space-y-2">
                  {d.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 font-medium text-primary-ink hover:underline">{s.label} <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden /></a>
                      <p className="text-xs text-muted">{s.consultedAt ? `Consultée le ${new Date(s.consultedAt).toLocaleDateString('fr-FR')}` : 'Référence officielle à consulter — non vérifiée automatiquement'}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-2">Pas de source institutionnelle : informations générales à vérifier auprès de professionnels du secteur.</p>
              )}
              <p className="text-xs text-muted">Fiche mise à jour le {d.updatedAt.toLocaleDateString('fr-FR')}.</p>
            </CardContent>
          </Card>
          <ButtonLink href="/app/simulator" className="w-full">Simuler un scénario</ButtonLink>
          <ButtonLink href="/app/assistant" variant="outline" className="w-full">Poser une question au coach</ButtonLink>
        </div>
      </div>
    </div>
  );
}
