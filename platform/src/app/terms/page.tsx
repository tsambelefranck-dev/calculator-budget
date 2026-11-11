import type { Metadata } from 'next';
import { PublicShell } from '@/components/layout/public-shell';
import { Markdown } from '@/components/markdown';

export const metadata: Metadata = { title: 'Conditions d’utilisation' };

const TEXT = `## Conditions d'utilisation (version de travail)
> Document à faire valider par un conseil juridique avant la mise en production.

### Nature du service
NexaFi est un **outil d'organisation et d'éducation financière**. Il n'est ni une banque, ni un établissement de paiement, ni un conseiller en investissement agréé. NexaFi ne collecte, ne détient et ne transfère aucun fonds.

### Informations et simulations
- Les analyses, plans et recommandations sont fondés sur les données que tu saisis et sur des calculs automatiques.
- Les **simulations** reposent sur des hypothèses : elles ne constituent ni une prévision ni une promesse de gain.
- Les contenus du centre d'investissement sont pédagogiques et généraux. Avant tout investissement, informe-toi auprès d'intermédiaires agréés par le régulateur compétent (AMF-UMOA, COSUMAF).

### Assistant IA
L'assistant peut se tromper. Ses réponses ne remplacent pas l'avis d'un professionnel. Il ne doit jamais te demander de codes ou mots de passe : signale-nous tout comportement anormal.

### Offres
L'offre gratuite est sans engagement. L'essai Premium dure 14 jours et ne nécessite aucun moyen de paiement ; à son terme, le compte repasse automatiquement en offre gratuite, sans perte de données.

### Responsabilité
Tu restes seul responsable de tes décisions financières.`;

export default function TermsPage() {
  return <PublicShell><Markdown text={TEXT} /></PublicShell>;
}
