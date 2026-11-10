import type { Metadata } from 'next';
import { PublicShell } from '@/components/layout/public-shell';
import { Markdown } from '@/components/markdown';

export const metadata: Metadata = { title: 'Confidentialité' };

const TEXT = `## Politique de confidentialité (version de travail)
> Document à faire valider par un conseil juridique avant la mise en production, notamment au regard des lois nationales de protection des données (Côte d'Ivoire, Sénégal, Bénin, Togo, Burkina Faso, Cameroun, RDC).

### Données collectées
- **Compte** : prénom, e-mail, mot de passe (stocké uniquement sous forme d'empreinte Argon2id).
- **Diagnostic** : tranche d'âge, pays, situation professionnelle, montants déclarés.
- **Données financières saisies** : revenus, dépenses, budgets, objectifs, dettes, investissements déclarés.
- **Assistant IA** : messages échangés et indicateurs d'utilisation.

### Ce que NexaFi ne fait jamais
- Détenir, stocker ou transférer ton argent.
- Te demander un code PIN, un mot de passe Mobile Money ou des identifiants bancaires.
- Vendre tes données.

### Assistant IA
L'assistant n'accède à tes données financières qu'avec ton **autorisation explicite**, révocable à tout moment. Seuls des agrégats et les libellés nécessaires sont transmis au fournisseur d'IA ; ni ton nom ni ton e-mail.

### Tes droits
- **Accès et portabilité** : export JSON complet depuis Paramètres.
- **Effacement** : suppression définitive du compte et de toutes les données depuis Paramètres.
- **Rectification** : toutes les données sont modifiables dans l'application.

### Sécurité
Connexions chiffrées (HTTPS), sessions révocables, limitation des tentatives, journal des événements sensibles, isolation stricte des données de chaque utilisateur, sauvegardes de la base de données.

### Administrateurs
L'équipe d'administration voit des statistiques agrégées et les informations de compte nécessaires au support, mais aucun écran ne lui donne accès à tes transactions.`;

export default function PrivacyPage() {
  return <PublicShell><Markdown text={TEXT} /></PublicShell>;
}
