import { Download } from 'lucide-react';
import type { Metadata } from 'next';
import { ConsentToggle } from '@/components/assistant/consent-toggle';
import { CurrencyForm, DeleteAccountForm, NameForm, PasswordForm, RevokeSessionsForm } from '@/components/settings/settings-forms';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { EMPLOYMENT_LABELS, RISK_LABELS, getCountry } from '@/lib/constants';
import { PROFILE_LABELS } from '@/lib/finance/profile';
import { requireAppContext } from '@/server/auth/current';

export const metadata: Metadata = { title: 'Paramètres' };

export default async function SettingsPage() {
  const ctx = await requireAppContext();
  const p = ctx.profile;
  const premium = ctx.user.plan === 'premium';
  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" description="Profil, préférences, sécurité et données personnelles." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Compte</CardTitle><CardDescription>{ctx.user.email}</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <NameForm name={ctx.user.name} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Abonnement</p>
                <p className="text-sm text-ink-2">{premium ? `Premium${ctx.user.premiumUntil ? ` jusqu’au ${ctx.user.premiumUntil.toLocaleDateString('fr-FR')}` : ''}` : 'Offre gratuite'}</p>
              </div>
              {premium ? <Badge tone="gold">Premium</Badge> : <ButtonLink href="/app/upgrade" variant="gold" size="sm">Passer à Premium</ButtonLink>}
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Thème</p>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profil financier</CardTitle>
            <CardDescription>{PROFILE_LABELS[p.profileType].label} · risque {RISK_LABELS[p.riskTolerance].toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted">Pays</dt><dd>{getCountry(p.country).name}</dd></div>
              <div><dt className="text-xs text-muted">Situation</dt><dd>{EMPLOYMENT_LABELS[p.employmentStatus]}</dd></div>
              <div><dt className="text-xs text-muted">Revenus</dt><dd>{p.incomeType}</dd></div>
              <div><dt className="text-xs text-muted">Fuseau horaire</dt><dd>{p.timezone}</dd></div>
            </dl>
            <CurrencyForm currency={ctx.currency} />
            <ButtonLink href="/onboarding" variant="outline" size="sm">Refaire mon diagnostic</ButtonLink>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sécurité</CardTitle><CardDescription>NexaFi ne te demandera jamais de code PIN Mobile Money ni d’identifiants bancaires.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            {ctx.user.isDemo ? <p className="text-sm text-ink-2">Compte de démonstration : mot de passe non modifiable.</p> : <PasswordForm />}
            <RevokeSessionsForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Assistant IA et confidentialité</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ConsentToggle consent={ctx.user.aiDataConsent} />
            <div className="space-y-2">
              <p className="text-sm font-medium">Exporter mes données</p>
              <p className="text-sm text-ink-2">Fichier JSON contenant toutes tes données personnelles et financières.</p>
              <a href="/api/account/export" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-strong px-4 text-sm font-medium hover:bg-surface-2" download>
                <Download className="size-4" aria-hidden /> Télécharger mes données
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="border-critical/30">
        <CardHeader><CardTitle>Supprimer mon compte</CardTitle></CardHeader>
        <CardContent><DeleteAccountForm isDemo={ctx.user.isDemo} /></CardContent>
      </Card>
    </div>
  );
}
