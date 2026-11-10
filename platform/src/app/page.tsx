import { ArrowRight, Bot, CircleCheck, Gauge, GraduationCap, HandCoins, Lock, ShieldCheck, SlidersHorizontal, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { ButtonLink } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getCurrentUser } from '@/server/auth/current';

const FEATURES = [
  { icon: SlidersHorizontal, title: 'Planificateur de salaire', text: 'À chaque revenu, une répartition adaptée à TA situation : charges, famille, dettes, épargne, plaisir.' },
  { icon: Gauge, title: 'Dépenses et budgets', text: 'Ajoute une dépense en 10 secondes. Une alerte t’avertit avant de dépasser ton budget.' },
  { icon: Target, title: 'Objectifs d’épargne', text: 'Fonds d’urgence, terrain, mariage, voiture : la contribution mensuelle nécessaire, calculée pour toi.' },
  { icon: HandCoins, title: 'Sortir des dettes', text: 'Compare les méthodes avalanche et boule de neige, et vois les intérêts économisés.' },
  { icon: Bot, title: 'Coach financier IA', text: 'Pose tes questions. Il s’appuie sur tes chiffres et des calculs vérifiés, jamais sur des promesses.' },
  { icon: TrendingUp, title: 'Apprendre à investir', text: 'Fiches sourcées par domaine, simulateur de scénarios, leçons courtes avec quiz.' },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo withTagline />
        <nav className="flex items-center gap-2">
          <Link href="/pricing" className="hidden px-3 text-sm font-medium text-ink-2 hover:text-ink sm:block">Tarifs</Link>
          <ThemeToggle className="hidden sm:inline-flex" />
          {user ? (
            <ButtonLink href="/app" size="sm">Mon espace</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">Connexion</ButtonLink>
              <ButtonLink href="/signup" size="sm">Créer un compte</ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-ink">
              Conçu pour l’Afrique francophone · FCFA, euro, dollar
            </p>
            <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
              Ton argent doit avoir une destination <span className="text-primary-ink">avant même d’arriver</span> dans tes mains.
            </h1>
            <p className="max-w-xl text-lg text-ink-2">
              NexaFi t’aide à organiser ton salaire, maîtriser tes dépenses, épargner pour tes projets, rembourser tes dettes et apprendre à investir — avec un coach IA qui connaît tes chiffres.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={user ? '/app' : '/signup'} size="lg">
                {user ? 'Ouvrir mon tableau de bord' : 'Commencer gratuitement'} <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              {!user ? <ButtonLink href="/demo" size="lg" variant="outline">Voir la démo</ButtonLink> : null}
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
              <li className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-primary-ink" aria-hidden /> Nous ne détenons jamais ton argent</li>
              <li className="flex items-center gap-1.5"><Lock className="size-4 text-primary-ink" aria-hidden /> Aucun code PIN ni identifiant bancaire demandé</li>
            </ul>
          </div>
          <div className="rounded-3xl border bg-surface p-5 shadow-pop sm:p-6" aria-label="Exemple de répartition d’un salaire">
            <p className="text-sm text-ink-2">Exemple · salaire de 300 000 FCFA</p>
            <p className="mt-1 text-lg font-semibold">Ta répartition proposée</p>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                ['Logement & charges', 90000],
                ['Besoins essentiels', 65000],
                ['Famille & obligations', 35000],
                ['Épargne de précaution', 66500],
                ['Loisirs & dépenses personnelles', 30000],
                ['Marge de sécurité', 13500],
              ].map(([label, amount]) => (
                <li key={label as string} className="space-y-1">
                  <div className="flex justify-between"><span>{label}</span><span className="font-medium tabular">{(amount as number).toLocaleString('fr-FR')} FCFA</span></div>
                  <div className="h-2 rounded-full bg-chart-1-track"><div className="h-full rounded-full bg-chart-1" style={{ width: `${((amount as number) / 90000) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">Illustration : l’algorithme part de tes vraies dépenses, de tes dettes et de tes objectifs. Aucune règle universelle imposée.</p>
          </div>
        </section>

        <section className="border-y bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">Tout ce qu’il faut pour reprendre le contrôle</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border bg-bg p-5">
                  <Icon className="size-6 text-primary-ink" aria-hidden />
                  <p className="mt-3 font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-ink-2">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid gap-6 rounded-3xl bg-primary p-8 text-white sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">Ton diagnostic financier en 3 minutes</h2>
              <p className="text-white/80">Profil, santé financière sur 100, points forts, vigilances et trois priorités concrètes.</p>
              <ul className="space-y-1.5 text-sm text-white/85">
                {['Gratuit, sans carte bancaire', 'Tes données restent les tiennes : export et suppression à tout moment', 'Éducation financière, pas de promesse de gain'].map((t) => (
                  <li key={t} className="flex items-center gap-2"><CircleCheck className="size-4 text-accent" aria-hidden /> {t}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <ButtonLink href="/signup" variant="gold" size="lg">Faire mon diagnostic</ButtonLink>
              <ButtonLink href="/learn" variant="outline" size="lg" className="border-white/40 bg-transparent text-white hover:bg-white/10">
                <GraduationCap className="size-4" aria-hidden /> Leçons gratuites
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} NexaFi · NexaFi Academy. Outil d’organisation et d’éducation financière — pas un conseil en investissement personnalisé.</p>
          <nav className="flex gap-4">
            <Link href="/pricing" className="hover:text-ink">Tarifs</Link>
            <Link href="/privacy" className="hover:text-ink">Confidentialité</Link>
            <Link href="/terms" className="hover:text-ink">Conditions</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
