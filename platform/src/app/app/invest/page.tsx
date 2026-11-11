import { ArrowRight, Info } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DomainIcon, RiskDots } from '@/components/invest/domain-icon';
import { Alert } from '@/components/ui/alert';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireAppContext } from '@/server/auth/current';
import { getHealthSnapshot } from '@/server/services/analytics';
import { listInvestmentDomains, listPublications } from '@/server/services/content';
import { hasHighInterestDebt } from '@/server/services/analytics';

export const metadata: Metadata = { title: 'Centre d’investissement' };

export default async function InvestPage() {
  const ctx = await requireAppContext();
  const [domains, publications, health, highDebt] = await Promise.all([
    listInvestmentDomains(),
    listPublications(5),
    getHealthSnapshot(ctx.user.id, ctx.profile, ctx.currentMonth),
    hasHighInterestDebt(ctx.user.id),
  ]);
  const months = health.health.metrics.emergencyMonths;
  const target = health.health.metrics.emergencyTargetMonths;
  const ready = months >= target && !highDebt;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Centre d’investissement"
        description="Comprendre avant d’investir : fonctionnement, capital, risques, horizon, liquidité, coûts et sources de chaque domaine."
        actions={<ButtonLink href="/app/simulator" variant="outline">Simuler un scénario</ButtonLink>}
      />
      <Alert tone={ready ? 'good' : 'warning'} title={ready ? 'Tes fondations sont posées' : 'Avant d’investir'}>
        {ready
          ? 'Ton fonds d’urgence est constitué et tu n’as pas de dette chère : tu peux étudier sereinement les options ci-dessous, à ton rythme.'
          : `Ton fonds d’urgence couvre ${months.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} mois sur ${target} recommandés${highDebt ? ' et tu as au moins une dette à taux élevé' : ''}. Commence par ces priorités : un imprévu pourrait t’obliger à revendre au mauvais moment.`}
      </Alert>
      <p className="flex items-start gap-2 text-sm text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Contenu pédagogique général. Aucun rendement n’est garanti ; NexaFi ne vend aucun placement et ne donne pas de conseil personnalisé. Pour investir sur les marchés financiers, passe par un intermédiaire agréé (AMF-UMOA, COSUMAF).
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {domains.map((d) => (
          <Link key={d.slug} href={`/app/invest/${d.slug}`} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-pop">
              <CardContent className="flex h-full flex-col gap-3 pt-5 sm:pt-6">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-ink"><DomainIcon icon={d.icon} className="size-5" /></div>
                <p className="font-semibold">{d.name}</p>
                <p className="flex-1 text-sm text-ink-2">{d.summary}</p>
                <div className="flex items-center justify-between">
                  <RiskDots level={d.riskLevel} />
                  <ArrowRight className="size-4 text-muted group-hover:text-ink" aria-hidden />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {publications.length ? (
        <Card>
          <CardHeader><CardTitle>Informations financières publiées</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {publications.map((p) => (
              <article key={p.id} className="space-y-1 py-3">
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-ink-2">{p.body}</p>
                <p className="text-xs text-muted">Source : <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{p.sourceName}</a> · consultée le {new Date(p.consultedAt).toLocaleDateString('fr-FR')}</p>
              </article>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
