import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { formatPercent } from '@/lib/finance/money';
import { getAiConfig } from '@/server/ai/config';
import { aiDailyCosts, getAdminStats } from '@/server/services/admin';

const usd = (v: number) => `${v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;

export default async function AdminOverview() {
  const [stats, daily] = await Promise.all([getAdminStats(), aiDailyCosts(30)]);
  const config = getAiConfig();
  return (
    <>
      <PageHeader title="Vue d’ensemble" description="Statistiques agrégées. Aucune donnée financière individuelle n’est accessible depuis l’administration." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Utilisateurs (hors démo)" value={String(stats.users)} hint={`${stats.new30} nouveaux sur 30 jours`} />
        <StatTile label="Actifs 7 / 30 jours" value={`${stats.active7} / ${stats.active30}`} />
        <StatTile label="Premium actifs" value={String(stats.premium)} hint={stats.users ? formatPercent(stats.premium / stats.users) + ' des utilisateurs' : undefined} />
        <StatTile label="Diagnostic complété" value={formatPercent(stats.onboardingRate)} />
        <StatTile label="Dépenses saisies (30 j)" value={String(stats.expenses30)} />
        <StatTile label="Messages IA (30 j)" value={String(stats.aiMessages30)} />
        <StatTile label="Coût IA estimé (30 j)" value={usd(stats.aiCostUsd30)} hint={`Modèle : ${config.model} · effort ${config.effort}`} />
        <StatTile label="Comptes démo actifs" value={String(stats.demoAccounts)} />
      </div>
      <Card>
        <CardHeader><CardTitle>Coûts IA par modèle (30 jours)</CardTitle><CardDescription>Estimation à partir des tokens facturés et des tarifs publics. Pilotage : variables AI_MODEL, AI_EFFORT et quotas.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-muted"><th className="py-2 pr-3">Modèle</th><th className="pr-3">Usage</th><th className="pr-3">Appels</th><th className="pr-3">Tokens entrée</th><th className="pr-3">Cache lu</th><th className="pr-3">Tokens sortie</th><th>Coût</th></tr></thead>
            <tbody className="tabular">
              {stats.usage.length ? stats.usage.map((u) => (
                <tr key={`${u.model}-${u.kind}`} className="border-b last:border-0"><td className="py-2 pr-3">{u.model}</td><td className="pr-3">{u.kind === 'chat' ? 'Assistant' : 'Rapports'}</td><td className="pr-3">{u.calls}</td><td className="pr-3">{u.input.toLocaleString('fr-FR')}</td><td className="pr-3">{u.cacheRead.toLocaleString('fr-FR')}</td><td className="pr-3">{u.output.toLocaleString('fr-FR')}</td><td>{usd(u.cost / 1_000_000)}</td></tr>
              )) : <tr><td colSpan={7} className="py-3 text-ink-2">Aucun appel IA sur la période.</td></tr>}
            </tbody>
          </table>
          {daily.length ? (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-medium text-muted">Coût par jour</p>
              {daily.map((d) => (
                <div key={d.day} className="flex items-center gap-3 text-xs">
                  <span className="w-24 text-ink-2 tabular">{d.day}</span>
                  <div className="h-2 flex-1 rounded-full bg-chart-1-track"><div className="h-full rounded-full bg-chart-1" style={{ width: `${Math.max(2, (d.costUsd / Math.max(...daily.map((x) => x.costUsd), 0.000001)) * 100)}%` }} /></div>
                  <span className="w-20 text-right tabular">{usd(d.costUsd)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
