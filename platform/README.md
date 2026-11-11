# NexaFi — assistant financier personnel (SaaS)

Application web de gestion financière personnelle, d'éducation financière et d'accompagnement à
l'investissement pour l'Afrique francophone. **NexaFi ne détient, ne stocke et ne transfère aucun
fonds** : elle organise, planifie, alerte et enseigne.

Le dossier de conception complet (architecture, modèle de données, parcours, API, agent IA, coûts,
plan) est dans [`docs/CONCEPTION.md`](docs/CONCEPTION.md).

## Fonctionnalités livrées

| Module | Contenu |
|---|---|
| Compte | inscription, connexion, sessions révocables, mot de passe oublié, export JSON, suppression définitive |
| Diagnostic | profil financier en 5 étapes, score de santé /100, profil de risque, priorités, création du fonds d'urgence |
| Tableau de bord | 8 indicateurs, santé financière détaillée, revenus vs dépenses, répartition, épargne et patrimoine net, alertes |
| Revenus | sources récurrentes, « marquer comme reçu », revenus ponctuels |
| Dépenses | ajout en 10 s (bouton flottant mobile), 12 catégories, filtres, comparaison période à période |
| Budgets | plafonds par catégorie, jauges, alertes à 80 % et 100 %, copie du mois précédent |
| Planificateur de salaire | répartition adaptée (historique réel, dettes, fonds d'urgence, objectifs, profil de risque), ajustement manuel, conversion en budgets |
| Objectifs | contribution mensuelle nécessaire, date estimée, versements/retraits, limite freemium |
| Dettes | capital restant, remboursements, Avalanche vs Boule de neige, intérêts économisés, calendrier (Premium) |
| Coach IA | agent Claude avec 11 outils déterministes, streaming, consentement explicite, quotas, coûts suivis |
| Rapports | rapport mensuel automatique (tâche planifiée) + analyse rédigée par l'IA (Premium) |
| Investissement | 11 fiches sourcées et datées, simulateur 3 scénarios avec frais et inflation (Premium) |
| Éducation | 10 leçons, quiz corrigés côté serveur, exercices pratiques |
| Freemium | gratuit / Premium, essai 14 jours, activation manuelle par l'administration |
| Administration | statistiques agrégées, utilisateurs, abonnements, contenus, catégories, coûts IA, erreurs, audit |
| Démo | compte isolé avec données fictives, supprimé après 24 h |

## Démarrer en local

Prérequis : Node.js 22+, PostgreSQL 16+.

```bash
cd platform
npm install
cp .env.example .env.local          # puis renseigner DATABASE_URL, CRON_SECRET, ANTHROPIC_API_KEY…
createdb nexafi && createdb nexafi_test
npm run db:setup                    # migrations + catégories, leçons, fiches d'investissement
npm run admin:create -- admin@exemple.com "un mot de passe long" "Prénom"
npm run dev                         # http://localhost:3000
```

Sans `ANTHROPIC_API_KEY`, l'assistant affiche clairement qu'il n'est pas configuré et propose
l'analyse automatique (sans IA). Aucune fausse IA.

## Tests

```bash
npm run test:unit          # moteur de calcul (94 tests)
npm run test:integration   # PostgreSQL : isolation entre utilisateurs, auth, services, agent IA (base DATABASE_URL_TEST recréée)
npm run test:e2e           # Playwright : parcours complet mobile + ordinateur (build de production)
npm run lint && npm run typecheck
```

La CI GitHub (`.github/workflows/platform-ci.yml`) exécute l'ensemble à chaque modification.

## Variables d'environnement

Voir [`.env.example`](.env.example). Les plus importantes :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_TEST` | PostgreSQL de l'application / des tests d'intégration |
| `APP_URL` | URL publique (liens des e-mails) |
| `CRON_SECRET` | jeton Bearer des routes `/api/cron/*` |
| `ANTHROPIC_API_KEY`, `AI_MODEL`, `AI_EFFORT` | fournisseur d'IA ; `AI_PROVIDER=disabled` pour couper l'IA |
| `FREE_AI_MESSAGES_PER_MONTH`, `PREMIUM_AI_MESSAGES_PER_MONTH` | quotas |
| `RESEND_API_KEY`, `EMAIL_FROM` | e-mails (sinon journal serveur en développement) |
| `SIGNUP_RATE_LIMIT_PER_HOUR`, `DEMO_RATE_LIMIT_PER_HOUR` | anti-abus par adresse IP |

## Tâches planifiées

À appeler avec `Authorization: Bearer $CRON_SECRET` (Vercel Cron, cron système, GitHub Actions…) :

- `POST /api/cron/monthly-reports` — le 1er de chaque mois : rapports du mois écoulé + notifications.
- `POST /api/cron/cleanup` — quotidien : comptes démo expirés, sessions, compteurs, vieux journaux.

## Déploiement

- **Docker** : `docker build -t nexafi platform && docker run -p 3000:3000 --env-file .env nexafi`
  (les migrations se lancent avec `npm run db:migrate` depuis un poste ayant accès à la base).
- **Vercel + PostgreSQL managé** (Neon, Supabase…) : importer `platform/` comme racine, définir les
  variables d'environnement, ajouter les deux tâches planifiées.
- Sauvegardes : PITR du fournisseur managé, ou `scripts/backup.sh` (pg_dump chiffré AES-256).
- Supervision : `GET /api/health`, erreurs serveur visibles dans Administration → Erreurs & audit.

## Sécurité (résumé)

Argon2id, sessions hachées SHA-256 et révocables, CSP à nonce, en-têtes de sécurité, limitation de
débit en base, validation Zod de toutes les entrées, requêtes paramétrées, isolation par `user_id`
testée (IDOR), journal d'audit, export et suppression des données, administrateurs sans accès aux
transactions. Détails : `docs/CONCEPTION.md` §1.4 et §7.

## Avant la mise en production

1. Faire valider les pages Confidentialité et Conditions par un juriste (lois de protection des
   données de chaque pays ; régulateurs AMF-UMOA / COSUMAF).
2. Vérifier et dater les sources des fiches d'investissement (Administration → Contenus).
3. Intégrer un agrégateur de paiement Mobile Money (CinetPay, FedaPay…) : la table `subscriptions`
   et la logique d'abonnement sont prêtes.
4. Choisir le modèle d'IA selon le budget (`AI_MODEL`) : voir `docs/CONCEPTION.md` §8.
