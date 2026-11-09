# NexaFi — Dossier de conception

> Assistant financier personnel intelligent pour l'Afrique francophone.
> « Ton argent doit avoir une destination avant même d'arriver dans tes mains. »

Ce document répond à la « première tâche » du cahier des charges : architecture, arborescence,
modèle de données, parcours, périmètre MVP, API, agent IA, coûts et plan de développement.
Il est versionné avec le code : toute évolution d'architecture doit le mettre à jour.

---

## 0. Hypothèses et décisions prises (informations manquantes)

| Sujet | Décision | Raison |
|---|---|---|
| Nom du produit | **NexaFi**, dans la charte NexaFi Academy (vert forêt `#0b4d33`, or `#c99a2e`) | Le dépôt héberge déjà le lead magnet « Budget Express » de NexaFi Academy : continuité de marque. |
| Emplacement | Nouvelle application dans `platform/`, le lead magnet reste intact à la racine | Le lead magnet est en production (GitHub Pages) ; on ne casse rien. |
| Ton | Tutoiement, pédagogique | Conforme aux exemples du cahier des charges (« Tu as dépensé… »). |
| Argent | L'application **ne détient, ne stocke ni ne transfère aucun fonds**. Elle n'enregistre que des déclarations. | Exigence produit et réglementaire. |
| Montants | Entiers en **unités mineures** (`bigint`) : 1 FCFA pour XAF/XOF, 1 centime pour USD/EUR | Zéro erreur d'arrondi flottant. |
| Multidevise | Devise principale par utilisateur ; chaque ligne porte sa devise. Conversion **exacte** uniquement entre EUR, XAF et XOF (parité fixe officielle 1 EUR = 655,957 FCFA). Aucune conversion USD sans source de taux vérifiable. | Ne jamais inventer un taux de change. |
| Fuseau horaire | Déduit du pays (Africa/Douala, Africa/Abidjan…) | « Ce mois-ci » doit correspondre au calendrier local. |
| Calculs | 100 % déterministes, en TypeScript pur, testés (`src/lib/finance`). Le LLM **appelle** ces fonctions, il ne calcule jamais lui-même. | Exigence du cahier des charges. |
| IA | Fournisseur configurable derrière une interface `LlmProvider` ; implémentation livrée : **Anthropic (Claude)**, modèle par défaut `claude-opus-5-5` (modifiable par `AI_MODEL`). Sans clé API, l'assistant l'indique clairement et propose l'analyse déterministe — aucune fausse IA. | Pas de fausse intégration. |
| Paiements | Pas d'intégration de paiement au MVP. Premium activable par **essai gratuit de 14 jours** (réel) ou **par un administrateur** (après paiement Mobile Money hors ligne). Architecture `subscriptions` prête pour CinetPay / FedaPay / Flutterwave… | « Ne pas développer immédiatement des intégrations de paiement complexes. » |
| E-mails | Abstraction `Mailer` : Resend si `RESEND_API_KEY`, sinon journal serveur en développement. | Réinitialisation de mot de passe fonctionnelle sans dépendance imposée. |
| Limitation de débit | Compteurs en PostgreSQL (fenêtre fixe, `INSERT … ON CONFLICT`) | Fonctionne sur plusieurs instances sans Redis. |
| Isolation des données | Contrôlée dans la couche service (chaque requête filtrée par `user_id`) + tests d'autorisation. Row-Level Security PostgreSQL prévue en phase 5. | Simplicité et robustesse du MVP. |
| i18n | Français complet. Dictionnaires typés `fr`/`en` : l'anglais couvre la navigation, l'authentification et les libellés communs, avec repli automatique sur le français. | « Prévoir une internationalisation en anglais. » |
| Prix Premium | Hypothèse : 3 000 FCFA/mois ou 30 000 FCFA/an (4,99 €/4,99 $). | À valider avec le marché (voir skill *founder-panel*). |

---

## 1. Architecture technique

### 1.1 Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js 16** (App Router, React 19, Server Components, Server Actions) + **TypeScript strict** | Un seul déploiement front + back, rendu serveur rapide sur réseaux mobiles lents. |
| UI | **Tailwind CSS 4**, composants maison (design system dans `src/components/ui`), icônes Lucide | Contrôle total du rendu, pas de dépendance lourde. |
| Graphiques | **Recharts 3** | Demandé ; composants React, responsive. |
| Base de données | **PostgreSQL 16** | Transactions ACID, `bigint`, JSONB, index. |
| ORM | **Drizzle ORM** + drizzle-kit (migrations SQL versionnées) | Typé, proche du SQL, aucun binaire à télécharger (déploiement simple). |
| Authentification | Sessions en base (jeton aléatoire 256 bits, seul son **SHA-256** est stocké), cookie `HttpOnly` + `Secure` + `SameSite=Lax`, mots de passe **Argon2id** | Révocables, sans dépendance externe, conformes OWASP. |
| Validation | **Zod 4** sur chaque entrée (actions serveur, API, outils IA) | Une seule source de vérité des contraintes. |
| IA | SDK officiel `@anthropic-ai/sdk`, boucle d'outils manuelle en streaming (SSE) | Contrôle des outils, des quotas et des coûts. |
| Tests | **Vitest** (unitaires + intégration PostgreSQL), **Playwright** (E2E) | Calculs, autorisations, parcours. |
| Déploiement | Image Docker (`output: standalone`) ou Vercel + PostgreSQL managé (Neon/Supabase) | Portable. |

### 1.2 Vue d'ensemble

```
Navigateur (mobile-first, PWA-ready)
   │  HTML streamé (RSC) + Server Actions (POST, protection d'origine intégrée)
   ▼
Next.js 16 ─ proxy.ts : en-têtes de sécurité (CSP à nonce), redirection des routes privées
   ├── app/ (pages)           ── lecture via services (Server Components)
   ├── server/actions/*       ── mutations : auth → validation Zod → service → audit
   ├── app/api/ai/chat        ── SSE : agent IA (boucle d'outils)
   ├── app/api/account/export ── export RGPD-like (JSON)
   ├── app/api/cron/*         ── rapports mensuels, nettoyage (protégé par CRON_SECRET)
   ▼
server/services/* (règles métier, isolation par user_id)
   ├── lib/finance/*  ── moteur de calcul pur et testé (aucun accès BD)
   ├── server/ai/*    ── fournisseur LLM, outils, quotas, coûts
   ▼
PostgreSQL (Drizzle)
```

### 1.3 Séparation des domaines (exigence « architecture modulaire »)

| Domaine | Code |
|---|---|
| Utilisateurs & sessions | `server/auth/*`, `server/services/account.ts` |
| Données financières | `server/services/{incomes,expenses,budgets,goals,debts,investments}.ts` |
| Calculs budgétaires | `lib/finance/{money,planner,health,insights,report}.ts` |
| Objectifs | `lib/finance/goals.ts`, `server/services/goals.ts` |
| Simulations | `lib/finance/{simulator,debts}.ts` |
| Intelligence artificielle | `server/ai/*` |
| Abonnements | `server/services/entitlements.ts`, table `subscriptions` |
| Administration | `app/admin/*`, `server/services/admin.ts` |

### 1.4 Sécurité (synthèse)

- Mots de passe Argon2id (paramètres OWASP), jamais en clair ; politique de longueur et liste de mots de passe courants refusés.
- Sessions révocables (déconnexion, changement de mot de passe = révocation des autres sessions), expiration glissante 30 jours.
- Routes privées protégées deux fois : redirection dans `proxy.ts` (confort) **et** contrôle `requireUser()` / `requireAdmin()` dans chaque page, action et route API (sécurité).
- Isolation : toute requête de données est filtrée par `user_id` ; un identifiant d'un autre utilisateur renvoie « introuvable » (pas de fuite d'existence). Tests IDOR dédiés.
- Validation Zod de toutes les entrées ; requêtes paramétrées (Drizzle) → pas d'injection SQL.
- CSP à nonce, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS en production.
- Limitation de débit : connexion, inscription, réinitialisation, IA, export, démo.
- Journal d'audit : connexions (réussies/échouées), changements de mot de passe, export, suppression de compte, actions administrateur, changements d'abonnement.
- Données personnelles : export JSON complet, suppression définitive du compte (cascade).
- L'application ne demande **jamais** de code PIN Mobile Money ni d'identifiants bancaires (règle également imposée à l'agent IA).
- Administrateurs : statistiques **agrégées** et gestion des comptes, mais **aucun écran ne montre les transactions d'un utilisateur**.
- Secrets uniquement en variables d'environnement (`.env.example` documenté), jamais dans le dépôt.
- Sauvegardes : PITR du PostgreSQL managé, ou `scripts/backup.sh` (pg_dump chiffré) en auto-hébergé.

---

## 2. Arborescence du projet

```
platform/
├── docs/CONCEPTION.md            ← ce document
├── drizzle/                      ← migrations SQL générées (versionnées)
├── scripts/                      ← migrate.ts, seed.ts, create-admin.ts, backup.sh
├── src/
│   ├── proxy.ts                  ← en-têtes de sécurité + redirections (Next 16)
│   ├── instrumentation.ts        ← capture des erreurs serveur → table error_logs
│   ├── app/
│   │   ├── layout.tsx, globals.css, not-found.tsx, error.tsx
│   │   ├── page.tsx              ← page d'accueil marketing
│   │   ├── pricing/ privacy/ terms/
│   │   ├── login/ signup/ forgot-password/ reset-password/ demo/
│   │   ├── onboarding/           ← diagnostic financier (profil)
│   │   ├── app/                  ← espace connecté (barre latérale / navigation mobile)
│   │   │   ├── page.tsx          ← tableau de bord
│   │   │   ├── income/ expenses/ budgets/ planner/ goals/ debts/
│   │   │   ├── invest/ simulator/ assistant/ reports/ learn/
│   │   │   ├── notifications/ settings/ upgrade/
│   │   ├── admin/                ← back-office (rôle admin)
│   │   └── api/ (ai/chat, account/export, cron/*, health)
│   ├── components/
│   │   ├── ui/                   ← design system (Button, Card, Field, MoneyInput, Dialog…)
│   │   ├── charts/               ← graphiques Recharts
│   │   ├── layout/               ← Sidebar, MobileNav, Topbar, ThemeToggle
│   │   └── <module>/             ← composants clients par module
│   ├── lib/
│   │   ├── finance/              ← moteur de calcul déterministe (pur, testé)
│   │   ├── i18n/                 ← dictionnaires fr/en + formatage
│   │   ├── validation/           ← schémas Zod partagés
│   │   └── constants.ts          ← pays, devises, catégories, enums
│   ├── server/
│   │   ├── db/                   ← client + schéma Drizzle
│   │   ├── auth/                 ← mots de passe, sessions, gardes, rate limit
│   │   ├── services/             ← logique métier par domaine
│   │   ├── actions/              ← Server Actions (mutations)
│   │   └── ai/                   ← fournisseur LLM, agent, outils, prompts, quotas
│   └── content/                  ← contenus initiaux (leçons, domaines d'investissement)
└── tests/ (unit/, integration/, e2e/)
```

---

## 3. Modèle de base de données

Conventions : identifiants UUID, montants `bigint` en unités mineures + `currency char(3)`,
dates comptables en `date` (sans fuseau), horodatages `timestamptz`, mois au format `YYYY-MM`.
Toutes les tables de données personnelles ont `user_id … ON DELETE CASCADE`.

```
users ─┬─ sessions
       ├─ financial_profiles (1-1)
       ├─ income_sources ─── incomes
       ├─ expenses ──────── categories (référentiel admin)
       ├─ budgets ───────── categories
       ├─ salary_plans ──── salary_plan_items
       ├─ savings_goals ─── goal_contributions
       ├─ debts ─────────── debt_payments
       ├─ investments ───── investment_movements
       ├─ monthly_reports
       ├─ notifications
       ├─ ai_conversations ─ ai_messages
       ├─ ai_usage
       ├─ lesson_progress ── lessons
       └─ subscriptions
investment_domains, publications, audit_logs, error_logs, rate_limits, password_reset_tokens
```

| Table | Colonnes clés |
|---|---|
| `users` | id, email (unique, normalisé), password_hash, name, role (`user`/`admin`), plan (`free`/`premium`), premium_until, trial_used, locale, is_demo, demo_expires_at, ai_data_consent, created_at, last_login_at, disabled_at |
| `sessions` | id = SHA-256(jeton), user_id, expires_at, ip, user_agent, created_at |
| `financial_profiles` | user_id (PK), age_range, country, currency, timezone, employment_status, income_type, monthly_income, fixed_charges, variable_expenses, debt_total, debt_monthly_payment, current_savings, dependents, goals[], investment_horizon, risk_answers (jsonb), risk_score, risk_tolerance, profile_type, completed_at |
| `income_sources` | id, user_id, name, type (salaire, commerce, freelance, business, loyers, commissions, autre), is_fixed, expected_amount, currency, recurrence (`none`/`monthly`), pay_day, is_active |
| `incomes` | id, user_id, source_id?, type, amount, currency, received_on, label, note |
| `categories` | id, code (unique), name_fr, name_en, icon, color, is_essential, planner_bucket, sort_order, is_active |
| `expenses` | id, user_id, category_id, amount, currency, spent_on, label, payment_method (espèces, mobile money, carte, virement, autre), note |
| `budgets` | id, user_id, category_id, month, amount, currency — unique (user, catégorie, mois) |
| `salary_plans` | id, user_id, income_id?, month, total_amount, currency, status (`draft`/`validated`), inputs (jsonb : instantané des hypothèses), created_at, validated_at |
| `salary_plan_items` | id, plan_id, bucket, label, amount, recommended_amount, rationale, sort_order |
| `savings_goals` | id, user_id, name, type, target_amount, currency, target_date?, priority, status (`active`/`achieved`/`archived`) |
| `goal_contributions` | id, goal_id, user_id, amount (négatif = retrait), contributed_on, note |
| `debts` | id, user_id, name, type, lender, principal, initial_balance, currency, annual_rate (‰ en points de base), minimum_payment, due_day, start_date, status |
| `debt_payments` | id, debt_id, user_id, amount, paid_on, note |
| `investments` / `investment_movements` | ligne d'investissement déclarée (domaine, valeur actuelle déclarée) + apports/retraits datés |
| `monthly_reports` | id, user_id, month, data (jsonb, métriques déterministes), ai_summary?, ai_model?, generated_at — unique (user, mois) |
| `notifications` | id, user_id, type, title, body, link, dedupe_key (unique par utilisateur), read_at |
| `ai_conversations` / `ai_messages` | conversation ; messages (rôle, texte affiché, contenu rejoué, outils utilisés, tokens, modèle) |
| `ai_usage` | id, user_id, kind (`chat`/`report`), model, input/output/cache tokens, cost_micro_usd, created_at |
| `lessons` / `lesson_progress` | cours (markdown, quiz jsonb, exercice, niveau, durée, premium) ; progression + score |
| `investment_domains` | slug, nom, description, fonctionnement, capital indicatif, compétences, risque (1-5), horizon, liquidité, coûts, potentiel, risques de perte, exemple, sources (jsonb : libellé, URL, date de consultation), nature de l'information (`documente`/`hypothese`), updated_at |
| `publications` | informations financières publiées par l'admin (source, date de consultation) |
| `subscriptions` | id, user_id, plan, interval, status, provider (`trial`/`manual`/…), provider_ref, period_start, period_end |
| `audit_logs` | id, user_id?, actor_id?, action, metadata (jsonb), ip, created_at |
| `error_logs` | id, digest, message, stack (tronquée), path, created_at |
| `rate_limits` | key, window_start, count |
| `password_reset_tokens` | id = SHA-256(jeton), user_id, expires_at, used_at |

Définitions financières (affichées dans l'interface via « Comment c'est calculé ? ») :

- **Solde théorique disponible** = revenus du mois − dépenses − épargne versée − investissements − remboursements de dettes.
- **Taux d'épargne** = (épargne versée + investissements) / revenus du mois.
- **Patrimoine net** = soldes des objectifs d'épargne + valeur déclarée des investissements − capital restant dû.
- **Capital restant dû** = solde déclaré à l'enregistrement − remboursements saisis (les intérêts réels sont ceux du prêteur : l'utilisateur peut corriger le solde).

---

## 4. Parcours utilisateurs

1. **Découverte → inscription** : page d'accueil → « Créer mon compte » (nom, e-mail, mot de passe) ou « Essayer la démo » (compte isolé, données fictives, bandeau « Mode démo », supprimé après 24 h).
2. **Diagnostic (onboarding, ~3 min, 5 étapes)** : situation (âge, pays, devise, statut, type de revenus) → revenus & charges → dettes & épargne → objectifs & horizon → tolérance au risque (3 questions). Résultat : profil (ex. « Entrepreneur à revenus irréguliers »), score de santé financière, forces, 3 priorités, et proposition de créer le fonds d'urgence.
3. **Rituel du salaire** : « Mon salaire est arrivé » → enregistrement du revenu → **planificateur** propose une répartition adaptée (charges, besoins, famille, dettes, fonds d'urgence, objectifs, investissement, plaisir, marge) → l'utilisateur ajuste → valide → option « appliquer comme budgets du mois ».
4. **Quotidien** : ajout rapide d'une dépense (bouton « + » mobile, 3 champs) → alerte à 80 % et 100 % du budget → tableau de bord compris en 10 secondes.
5. **Projets** : objectifs (montant, date → contribution mensuelle nécessaire, date estimée) ; dettes (avalanche vs boule de neige, calendrier, intérêts économisés).
6. **Coach IA** : questions libres ; l'agent consulte les données (avec consentement explicite) via des outils déterministes et répond avec des chiffres vérifiables.
7. **Fin de mois** : rapport mensuel (automatique le 1er, ou à la demande) → points positifs, erreurs, recommandations ; analyse rédigée par l'IA en Premium.
8. **Apprendre & investir** : leçons courtes + quiz ; centre d'investissement (fiches sourcées et datées) ; simulateur (3 scénarios, inflation, frais).
9. **Compte** : préférences (langue, thème, devise), sécurité (mot de passe, sessions), export des données, suppression du compte, abonnement.
10. **Administrateur** : statistiques agrégées, utilisateurs (sans données financières), abonnements, contenus, catégories, coûts IA, erreurs, journal d'audit.

---

## 5. Fonctionnalités du MVP (phase 2) et au-delà

| # | Fonctionnalité | Phase | Gratuit | Premium |
|---|---|---|---|---|
| 1 | Inscription, connexion, sessions, mot de passe oublié | MVP | ✔ | ✔ |
| 2 | Diagnostic & profil financier | MVP | ✔ | ✔ |
| 3 | Tableau de bord + santé financière | MVP | ✔ (3 mois d'historique) | ✔ (12 mois) |
| 4 | Revenus (sources, récurrence, « marquer comme reçu ») | MVP | ✔ | ✔ |
| 5 | Dépenses (CRUD, catégories, filtres, comparaison) | MVP | ✔ | ✔ |
| 6 | Budgets par catégorie + alertes | MVP | ✔ | ✔ |
| 7 | Planificateur de salaire | MVP | ✔ | ✔ |
| 8 | Objectifs d'épargne | MVP | 3 actifs | illimités |
| 9 | Agent IA | MVP | 10 messages/mois | 100 messages/mois |
| 10 | Rapport mensuel | MVP | métriques + recommandations | + analyse IA |
| 11 | Dettes (saisie, remboursements) | MVP | ✔ | + stratégies & calendrier |
| 12 | Centre d'investissement (fiches sourcées) | 3 | ✔ | ✔ |
| 13 | Simulateur d'investissement | 3 | — | ✔ |
| 14 | Éducation (leçons + quiz) | 3 | leçons de base | toutes |
| 15 | Freemium, essai 14 jours, activation manuelle | 4 | | |
| 16 | Administration | 4 | | |

Les quotas sont configurables (`FREE_AI_MESSAGES_PER_MONTH`, `PREMIUM_AI_MESSAGES_PER_MONTH`).

---

## 6. API nécessaires

Les mutations de l'interface web passent par des **Server Actions** (POST chiffré, contrôle
d'origine intégré à Next.js) ; chaque action : `requireUser()` → validation Zod → service
(filtré par `user_id`) → audit éventuel → revalidation. Les services étant indépendants de
Next.js, une API REST `/api/v1` pour une future application mobile sera une fine couche
au-dessus (phase 5).

| Module | Opérations |
|---|---|
| Auth | `signUp`, `signIn`, `signOut`, `requestPasswordReset`, `resetPassword`, `startDemo` |
| Profil | `saveOnboarding`, `updateProfile`, `setAiConsent`, `updatePreferences` (langue, devise) |
| Revenus | `createIncomeSource`, `updateIncomeSource`, `deleteIncomeSource`, `recordIncome`, `markExpectedIncomeReceived`, `updateIncome`, `deleteIncome` |
| Dépenses | `createExpense`, `updateExpense`, `deleteExpense` |
| Budgets | `upsertBudget`, `deleteBudget`, `copyBudgetsFromPreviousMonth` |
| Planificateur | `generatePlan` (lecture), `savePlan` (brouillon/validé), `applyPlanAsBudgets` |
| Objectifs | `createGoal`, `updateGoal`, `deleteGoal`, `addContribution`, `deleteContribution` |
| Dettes | `createDebt`, `updateDebt`, `deleteDebt`, `recordDebtPayment`, `deletePayment` ; simulation côté serveur |
| Investissements | `createInvestment`, `updateInvestment`, `addMovement`, `deleteInvestment` |
| Rapports | `generateMonthlyReport`, `generateReportAiSummary` (Premium) |
| Éducation | `completeLesson` (score du quiz) |
| Abonnement | `startTrial` ; admin : `setUserPlan` |
| Compte | `changePassword`, `revokeOtherSessions`, `deleteAccount` |
| Admin | `setUserRole`, `disableUser`, `setUserPlan`, CRUD leçons / domaines / publications / catégories |

Routes HTTP :

| Méthode & route | Rôle | Protection |
|---|---|---|
| `POST /api/ai/chat` | Agent IA, réponse en flux SSE | session, contrôle d'origine, quota, rate limit |
| `GET /api/account/export` | Export complet des données (JSON) | session, rate limit, audit |
| `POST /api/cron/monthly-reports` | Génère les rapports du mois écoulé | `Authorization: Bearer CRON_SECRET` |
| `POST /api/cron/cleanup` | Purge démos expirées, sessions, compteurs | `CRON_SECRET` |
| `GET /api/health` | Sonde de disponibilité (BD) | publique, sans donnée |

---

## 7. Fonctionnement technique de l'agent IA

```
Utilisateur ──► POST /api/ai/chat {conversationId?, message}
   1. requireUser, origine, rate limit (10 req/min), quota mensuel du plan
   2. Contexte du tour : date locale, devise, pays, plan, consentement (bloc texte en tête du message)
   3. Historique : derniers tours en texte (sans les blocs de raisonnement des tours passés)
   4. Boucle (≤ 6 itérations) :
        Claude (stream) ──tool_use──► exécution de l'outil déterministe (Zod, user_id imposé)
                         ◄─tool_result── JSON chiffré, formaté
   5. Texte final streamé au navigateur (SSE), outils utilisés affichés (« Données consultées »)
   6. Persistance : messages, outils, tokens → ai_usage (coût estimé)
```

**Outils (tous en lecture ou calcul, aucun ne modifie les données) :**

| Outil | Source |
|---|---|
| `get_financial_overview(month?)` | KPI du tableau de bord, santé financière |
| `get_spending_breakdown(month?)` | dépenses par catégorie, budgets, comparaison au mois précédent |
| `detect_spending_anomalies(month?)` | moteur `insights` (hausses anormales, dépassements, non-essentiel) |
| `get_goals()` | objectifs, progression, contribution nécessaire, date estimée |
| `get_debts()` / `compare_debt_strategies(extra_monthly)` | dettes, avalanche vs boule de neige |
| `propose_salary_allocation(amount)` | algorithme du planificateur |
| `simulate_savings_goal(target, months? \| monthly?)` | calcul d'épargne |
| `simulate_investment(initial, monthly, years, rates…)` | simulateur (scénarios) |
| `list_investment_domains()` | fiches sourcées et datées de la base |
| `get_monthly_report(month)` / `recommend_lessons(topic)` | rapport, bibliothèque |

**Garde-fous :**
- Le prompt système (figé, mis en cache) impose : utiliser les outils pour tout chiffre ; ne jamais inventer de données de marché, de rendement ou d'opportunité ; présenter les simulations comme des simulations ; aucune garantie de gain ; pas de recommandation d'investissement personnalisée (éducation + options à étudier + orientation vers un professionnel agréé AMF-UMOA / COSUMAF) ; ne jamais demander de PIN ou d'identifiants ; alerter sur les arnaques ; tutoiement, français par défaut.
- Sans consentement (`ai_data_consent = false`), les outils de données renvoient une erreur explicite : l'agent répond de façon générale et propose d'activer l'accès.
- Minimisation des données : ni nom, ni e-mail, ni notes libres envoyés au modèle ; uniquement agrégats et libellés de dépenses nécessaires.
- Réglages Claude : `claude-opus-5-5`, effort `medium` (modifiable), réflexion adaptative, `fallbacks: "default"` (reprise serveur en cas de refus d'un classifieur), gestion explicite des arrêts `refusal` et `max_tokens`, prompt système + outils mis en cache.
- Sans clé API : page Assistant en mode « analyse automatique » (moteur déterministe), clairement étiquetée comme sans IA.

---

## 8. Coûts estimatifs d'exploitation (ordres de grandeur à vérifier)

### Infrastructure (lancement, < 5 000 utilisateurs)

| Poste | Option managée | Option VPS |
|---|---|---|
| Hébergement Next.js | Vercel Pro ≈ 20 $/mois | VPS 4 vCPU / 8 Go ≈ 10-20 €/mois (Hetzner, OVH…) |
| PostgreSQL | Neon / Supabase ≈ 19-25 $/mois (sauvegardes incluses) | sur le VPS + sauvegardes chiffrées vers stockage objet ≈ 2-5 €/mois |
| E-mails | Resend : gratuit jusqu'à 3 000/mois, puis ≈ 20 $/mois | idem |
| Domaine, supervision | ≈ 15 $/an ; Sentry / Uptime : offres gratuites | idem |
| **Total hors IA** | **≈ 45-70 $/mois** | **≈ 20-30 $/mois** |

### IA (tarifs Anthropic publics, par million de tokens)

| Modèle | Entrée | Sortie | Lecture cache |
|---|---|---|---|
| Claude Opus 5.5 (défaut) | 4 $ | 20 $ | 0,20 $ |
| Claude Sonnet 5.5 | 2 $ | 10 $ | 0,20 $ |
| Claude Haiku 5.5 | 0,10 $ | 0,50 $ | 0,01 $ |

Hypothèse par message utilisateur : 2,5 appels (boucle d'outils), ~3 500 tokens mis en cache
(prompt + outils), ~2 500 tokens non cachés et ~600 tokens de sortie par appel.

| Modèle | Coût / message | 1 000 utilisateurs × 30 messages / mois |
|---|---|---|
| Opus 5.5 | ≈ 0,065 $ (≈ 40 FCFA) | ≈ 1 950 $ |
| Sonnet 5.5 | ≈ 0,034 $ | ≈ 1 000 $ |
| Haiku 5.5 | ≈ 0,002 $ | ≈ 50 $ |

Rapport mensuel IA : ~1 appel/utilisateur/mois ≈ 0,03 $ avec Opus 5.5.

**Arbitrage à décider (décision business, pas technique)** : avec Opus 5.5 et 100 messages/mois,
un utilisateur Premium très actif coûte jusqu'à ≈ 6,5 $/mois, soit plus qu'un abonnement à
3 000 FCFA. Leviers : quota Premium plus bas, prix plus élevé, ou `AI_MODEL=claude-sonnet-5-5`
/ `claude-haiku-5-5` (une variable d'environnement). Le tableau de bord admin affiche le coût
réel par jour et par modèle pour piloter cette décision.

### Paiements (phase 4)

Agrégateurs Mobile Money / cartes actifs dans la zone : CinetPay, FedaPay, Kkiapay, PayDunya,
Notch Pay, Flutterwave… Commission typique de quelques pourcents par transaction (à négocier).

---

## 9. Plan de développement

| Phase | Contenu | Statut |
|---|---|---|
| 1. Conception | Ce document, design system, modèle de données | ✅ |
| 2. MVP | Auth, profil, tableau de bord, revenus, dépenses, budgets + alertes, planificateur, objectifs, dettes, agent IA, rapport mensuel | ✅ livré dans cette itération |
| 3. Investissement | Centre d'investissement sourcé, simulateur 3 scénarios, profil de risque, éducation + quiz | ✅ livré (contenu initial à enrichir) |
| 4. Monétisation | Freemium, essai 14 j, activation manuelle, quotas IA, back-office | ✅ partiel — intégration d'un agrégateur de paiement à faire |
| 5. Optimisation | Tests E2E, CI, Docker, sécurité (RLS PostgreSQL, 2FA), PWA hors-ligne, API mobile `/api/v1`, notifications e-mail/WhatsApp, traduction anglaise complète | 🔜 |

Étapes d'implémentation suivies :
1. Socle (Next.js, Tailwind, Drizzle, tests) → 2. moteur de calcul + tests → 3. schéma, migrations,
graines → 4. authentification → 5. modules MVP → 6. agent IA → 7. phases 3-4 → 8. tests
d'intégration/E2E, CI, documentation.

### Cadre réglementaire (à valider avec un juriste)

- L'application est un **outil d'organisation et d'éducation financière**, pas un conseiller en
  investissement ni un établissement de paiement : elle ne collecte aucun fonds.
- Conseil en investissement réglementé : AMF-UMOA (zone UEMOA), COSUMAF (zone CEMAC).
- Protection des données : lois nationales (Côte d'Ivoire loi 2013-450, Sénégal loi 2008-12,
  Bénin Code du numérique, Togo loi 2019-014, Burkina Faso loi 001-2021/AN, Cameroun loi de 2024,
  RDC Code du numérique) — déclarations auprès des autorités (ARTCI, CDP, APDP, IPDCP…) à prévoir
  avant la mise en production.
