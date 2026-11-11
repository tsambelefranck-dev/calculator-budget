/**
 * Bibliothèque pédagogique initiale (éditable ensuite par l'administration).
 * Contenus généraux, sans chiffres de marché : les exemples sont des illustrations.
 */
import type { QuizQuestion } from '../server/db/schema';

export interface LessonSeed {
  slug: string;
  title: string;
  summary: string;
  topic: string;
  level: 'debutant' | 'intermediaire';
  durationMin: number;
  isPremium: boolean;
  body: string;
  quiz: QuizQuestion[];
  exercise: string;
}

export const LESSONS: LessonSeed[] = [
  {
    slug: 'gerer-son-salaire',
    title: 'Apprendre à gérer son salaire',
    summary: 'Donner une destination à chaque franc dès la réception du salaire.',
    topic: 'budget',
    level: 'debutant',
    durationMin: 6,
    isPremium: false,
    body: `## Le principe : décider avant de dépenser
Quand le salaire arrive sans plan, il « fond » : les petites dépenses du quotidien absorbent tout, et l'épargne devient ce qui reste… c'est-à-dire souvent rien.

La méthode consiste à **répartir le salaire le jour où il arrive**, en enveloppes :

1. **Les obligations** : loyer, factures, transport, mensualités de dettes.
2. **Les besoins** : alimentation, santé, communication.
3. **La famille** : solidarité familiale, scolarité.
4. **L'épargne** : d'abord le fonds d'urgence, puis tes projets.
5. **Le plaisir** : un montant raisonnable, assumé, sans culpabilité.
6. **Une marge** pour les imprévus.

> Règle d'or : on épargne **au début** du mois, pas à la fin.

## Pourquoi pas une règle universelle ?
Les règles toutes faites (50/30/20…) sont des repères, pas des lois. Avec un loyer élevé à Douala ou Abidjan, ou plusieurs personnes à charge, les proportions changent. Le planificateur NexaFi part de **tes vraies dépenses**.

## Les erreurs fréquentes
- Ne pas noter les petites dépenses (taxi, crédit téléphonique, boissons) : elles pèsent lourd à la fin du mois.
- Prêter de l'argent prévu pour une autre enveloppe.
- Considérer l'épargne comme « ce qui reste ».`,
    quiz: [
      { question: 'Quand faut-il mettre de côté son épargne ?', options: ['À la fin du mois, avec ce qui reste', 'Dès la réception du salaire', 'Seulement les bons mois'], answer: 1, explanation: 'Épargner en premier évite que l’argent soit absorbé par les dépenses courantes.' },
      { question: 'La règle 50/30/20 est…', options: ['Obligatoire pour tout le monde', 'Un repère à adapter à sa situation', 'Interdite dans la zone CFA'], answer: 1, explanation: 'Chaque situation est différente : loyer, famille, dettes…' },
    ],
    exercise: 'Utilise le planificateur avec ton dernier salaire et compare la proposition à ce que tu as réellement fait le mois dernier.',
  },
  {
    slug: 'comprendre-epargne',
    title: 'Comprendre l’épargne',
    summary: 'Épargne de précaution, épargne projet, épargne long terme : à quoi sert chacune.',
    topic: 'epargne',
    level: 'debutant',
    durationMin: 5,
    isPremium: false,
    body: `## Trois épargnes, trois rôles
- **L'épargne de précaution** (fonds d'urgence) : disponible immédiatement, pour faire face à une maladie, une perte de revenu, une réparation.
- **L'épargne projet** : pour un objectif daté (voiture, mariage, terrain, formation).
- **L'épargne long terme** : pour faire grandir son patrimoine (investissements).

## Où garder son épargne ?
La règle : **plus l'argent doit être disponible vite, moins il doit être risqué**. Le fonds d'urgence se garde sur un support sûr et accessible ; l'investissement vient après.

## La tontine
La tontine est une forme d'épargne collective très répandue. Elle crée de la discipline, mais comporte un risque : celui qu'un membre ne paie pas. Choisis des groupes de confiance, avec des règles écrites.

> Épargner, ce n'est pas se priver : c'est payer son « moi » futur.`,
    quiz: [
      { question: 'Le fonds d’urgence doit être…', options: ['Investi en bourse', 'Disponible rapidement et peu risqué', 'Prêté à un ami'], answer: 1, explanation: 'Il doit être accessible le jour où l’imprévu arrive.' },
      { question: 'Quel est le principal risque d’une tontine ?', options: ['Les impôts', 'Le défaut de paiement d’un membre', 'L’inflation uniquement'], answer: 1, explanation: 'La confiance et des règles claires réduisent ce risque.' },
    ],
    exercise: 'Liste tes 3 objectifs d’épargne et classe-les : précaution, projet ou long terme. Crée le premier dans « Objectifs ».',
  },
  {
    slug: 'comprendre-investissement',
    title: 'Comprendre l’investissement',
    summary: 'Rendement, risque, horizon, liquidité : les quatre notions clés.',
    topic: 'investissement',
    level: 'debutant',
    durationMin: 7,
    isPremium: false,
    body: `## Investir, c'est accepter une incertitude
Investir, c'est engager de l'argent aujourd'hui en espérant en récupérer davantage demain. **Rien n'est garanti** : un investissement peut perdre de la valeur.

## Les quatre notions clés
| Notion | Question à se poser |
|---|---|
| Rendement | Combien puis-je espérer gagner (et sur quelle base) ? |
| Risque | Combien puis-je perdre, et quelle est la probabilité ? |
| Horizon | Dans combien de temps aurai-je besoin de cet argent ? |
| Liquidité | Puis-je récupérer mon argent rapidement si besoin ? |

> Un rendement élevé s'accompagne presque toujours d'un risque élevé. Méfie-toi de toute promesse de gain élevé et garanti.

## Avant d'investir
1. Avoir un fonds d'urgence constitué.
2. Ne pas avoir de dettes chères.
3. N'investir que de l'argent dont tu n'as pas besoin à court terme.
4. Diversifier : ne pas tout mettre au même endroit.
5. Passer par des intermédiaires agréés (SGI agréées par l'AMF-UMOA ou la COSUMAF pour les marchés financiers).`,
    quiz: [
      { question: 'Un placement promet 20 % par mois « garanti ». C’est…', options: ['Une bonne affaire', 'Un signal d’alerte', 'Normal en Afrique'], answer: 1, explanation: 'Aucun investissement légitime ne garantit un rendement aussi élevé.' },
      { question: 'Que faut-il avant d’investir ?', options: ['Un fonds d’urgence', 'Un crédit', 'Un téléphone récent'], answer: 0, explanation: 'Sans épargne de précaution, un imprévu oblige à vendre au mauvais moment.' },
    ],
    exercise: 'Ouvre le centre d’investissement et compare deux domaines selon les quatre notions clés.',
  },
  {
    slug: 'interets-composes',
    title: 'Comprendre les intérêts composés',
    summary: 'Pourquoi le temps est ton meilleur allié… ou ton pire ennemi avec les dettes.',
    topic: 'investissement',
    level: 'debutant',
    durationMin: 5,
    isPremium: false,
    body: `## Les intérêts qui produisent des intérêts
Avec les intérêts composés, les gains d'une période s'ajoutent au capital et produisent à leur tour des gains.

**Exemple illustratif** (taux hypothétique de 5 % par an, sans frais) : 100 000 FCFA deviennent environ 105 000 après 1 an, 110 250 après 2 ans, 162 900 après 10 ans. Le gain de la 10e année est plus élevé que celui de la 1re, sans effort supplémentaire.

## Le même mécanisme joue contre toi avec les dettes
Une dette chère non remboursée grossit de la même manière. C'est pourquoi rembourser une dette à 24 % par an « rapporte » 24 % de façon certaine.

## Ce qu'il faut retenir
- Commencer tôt compte plus que commencer gros.
- Les frais réduisent aussi l'effet composé : compare-les toujours.
- Teste différents scénarios dans le **simulateur**.`,
    quiz: [
      { question: 'L’effet des intérêts composés augmente surtout avec…', options: ['Le temps', 'La couleur du billet', 'Le nombre de comptes'], answer: 0, explanation: 'Plus la durée est longue, plus l’effet est fort.' },
    ],
    exercise: 'Dans le simulateur, compare 10 ans et 20 ans avec le même versement mensuel.',
  },
  {
    slug: 'eviter-surendettement',
    title: 'Éviter le surendettement',
    summary: 'Repérer les signaux d’alerte et organiser le remboursement.',
    topic: 'dettes',
    level: 'debutant',
    durationMin: 6,
    isPremium: false,
    body: `## Les signaux d'alerte
- Tes remboursements dépassent **un tiers** de tes revenus.
- Tu empruntes pour rembourser une autre dette.
- Tu ne sais plus exactement combien tu dois, ni à qui.

## Deux méthodes de remboursement
- **Avalanche** : rembourser en priorité la dette au taux le plus élevé. C'est la méthode qui coûte le moins d'intérêts.
- **Boule de neige** : rembourser d'abord la plus petite dette. Les victoires rapides motivent.

Dans les deux cas, on paie le minimum sur toutes les dettes, et tout effort supplémentaire va à la dette prioritaire. Quand une dette est soldée, sa mensualité s'ajoute à la suivante.

## Parler à ses créanciers
Un créancier préfère souvent un échéancier réaliste à un impayé. N'attends pas d'être en retard pour négocier.`,
    quiz: [
      { question: 'Quelle méthode minimise les intérêts payés ?', options: ['Boule de neige', 'Avalanche', 'Aucune différence'], answer: 1, explanation: 'L’avalanche cible d’abord le taux le plus élevé.' },
      { question: 'Seuil d’alerte courant pour les remboursements ?', options: ['10 % des revenus', 'Un tiers des revenus', '90 % des revenus'], answer: 1, explanation: 'Au-delà d’un tiers, le budget devient très fragile.' },
    ],
    exercise: 'Enregistre tes dettes dans NexaFi et compare les deux stratégies.',
  },
  {
    slug: 'fonds-urgence',
    title: 'Construire un fonds d’urgence',
    summary: 'Combien, où, et comment le constituer pas à pas.',
    topic: 'epargne',
    level: 'debutant',
    durationMin: 5,
    isPremium: false,
    body: `## Combien ?
- **3 mois** de dépenses essentielles avec un salaire stable.
- **6 mois** avec des revenus irréguliers (commerce, freelance, business).

## Comment y arriver ?
1. Commence petit : un premier palier d'un mois de dépenses.
2. Programme un montant fixe dès la réception du revenu.
3. Ajoute les rentrées exceptionnelles (prime, 13e mois).

## Quand l'utiliser ?
Uniquement pour un **vrai imprévu** : santé, perte de revenu, réparation indispensable. Une promotion sur un téléphone n'est pas une urgence. Après usage, on le reconstitue en priorité.`,
    quiz: [
      { question: 'Avec des revenus irréguliers, le fonds d’urgence vise…', options: ['1 mois', '3 mois', '6 mois'], answer: 2, explanation: 'L’irrégularité des revenus justifie un matelas plus épais.' },
    ],
    exercise: 'Crée ton objectif « Fonds d’urgence » avec le montant cible proposé par NexaFi.',
  },
  {
    slug: 'comprendre-inflation',
    title: 'Comprendre l’inflation',
    summary: 'Pourquoi l’argent qui dort perd de la valeur.',
    topic: 'economie',
    level: 'debutant',
    durationMin: 4,
    isPremium: false,
    body: `## Définition
L'inflation est la hausse générale des prix. Avec la même somme, on achète un peu moins chaque année.

## Conséquence pour ton épargne
Si ton épargne ne rapporte rien, sa valeur **réelle** baisse avec l'inflation. Les banques centrales de la zone franc (BCEAO, BEAC) ont pour mission de maintenir la stabilité des prix ; les pays de l'UEMOA et de la CEMAC se sont fixé un critère de convergence d'inflation de 3 % maximum par an. Ce critère est un plafond de référence, pas une mesure de l'inflation réelle d'une année donnée : consulte les publications officielles pour les chiffres récents.

## Que faire ?
- Garder en liquide uniquement ce dont tu as besoin (dont le fonds d'urgence).
- Pour le long terme, étudier des placements dont le rendement espéré dépasse l'inflation, en acceptant leurs risques.`,
    quiz: [
      { question: 'Avec 3 % d’inflation, 100 000 FCFA non placés…', options: ['Gardent leur pouvoir d’achat', 'Perdent du pouvoir d’achat', 'Doublent'], answer: 1, explanation: 'Les prix montent, la somme reste la même.' },
    ],
    exercise: 'Dans le simulateur, regarde la différence entre valeur nominale et valeur réelle.',
  },
  {
    slug: 'plusieurs-sources-revenus',
    title: 'Créer plusieurs sources de revenus',
    summary: 'Réduire sa dépendance à un seul revenu, sans s’éparpiller.',
    topic: 'revenus',
    level: 'intermediaire',
    durationMin: 6,
    isPremium: true,
    body: `## Pourquoi diversifier ses revenus ?
Un seul revenu, c'est un seul point de rupture. Une activité complémentaire peut sécuriser le budget et accélérer les projets.

## Pistes courantes
- **Valoriser une compétence** : cours particuliers, graphisme, réparation, couture, conseil.
- **Petit commerce** à partir d'un besoin local observé.
- **Revenus du patrimoine** : loyers, à long terme.

## Les règles pour ne pas perdre d'argent
1. Tester petit avant d'investir gros.
2. Séparer l'argent de l'activité de l'argent personnel.
3. Noter toutes les recettes et dépenses de l'activité.
4. Ne pas sacrifier son emploi principal ni sa santé.`,
    quiz: [
      { question: 'Avant de lancer une activité, il vaut mieux…', options: ['Tout investir d’un coup', 'Tester à petite échelle', 'Emprunter au maximum'], answer: 1, explanation: 'Un test limite les pertes et valide la demande.' },
    ],
    exercise: 'Liste 3 compétences que des personnes autour de toi seraient prêtes à payer.',
  },
  {
    slug: 'construire-patrimoine',
    title: 'Construire un patrimoine',
    summary: 'Du premier franc épargné au patrimoine net qui grandit.',
    topic: 'patrimoine',
    level: 'intermediaire',
    durationMin: 6,
    isPremium: true,
    body: `## Le patrimoine net
**Patrimoine net = ce que tu possèdes − ce que tu dois.** C'est l'indicateur à suivre dans la durée, plus que le salaire.

## Les étapes
1. Maîtriser son budget et supprimer les dettes chères.
2. Constituer son fonds d'urgence.
3. Épargner pour ses projets.
4. Investir régulièrement, en diversifiant.
5. Protéger : assurances adaptées, documents de propriété en règle (titre foncier pour l'immobilier).

## Le piège du « paraître »
Une voiture achetée à crédit pour impressionner diminue le patrimoine net. Un terrain titré, une formation qui augmente les revenus, une épargne régulière l'augmentent.`,
    quiz: [
      { question: 'Le patrimoine net se calcule…', options: ['Salaire × 12', 'Actifs − dettes', 'Épargne + dettes'], answer: 1, explanation: 'Ce que l’on possède moins ce que l’on doit.' },
    ],
    exercise: 'Regarde l’évolution de ton patrimoine net sur le tableau de bord.',
  },
  {
    slug: 'eviter-arnaques',
    title: 'Éviter les arnaques financières',
    summary: 'Reconnaître les pièges : faux placements, pyramides, faux agents Mobile Money.',
    topic: 'securite',
    level: 'debutant',
    durationMin: 5,
    isPremium: false,
    body: `## Les signaux qui doivent t'alerter
- **Rendement élevé garanti**, « sans risque ».
- **Pression** pour décider vite (« offre valable aujourd'hui »).
- Rémunération liée au **recrutement** d'autres personnes (système pyramidal / de Ponzi).
- Demande de **code PIN**, de mot de passe ou de code de validation.
- Société introuvable sur la liste des acteurs agréés par le régulateur.

## Les règles de base
1. **Ne communique jamais ton code PIN Mobile Money** : aucun agent, aucune banque, aucune application sérieuse ne le demande. NexaFi ne te le demandera jamais.
2. Vérifie l'agrément auprès du régulateur (AMF-UMOA, COSUMAF, banque centrale).
3. Méfie-toi des « opportunités » partagées dans les groupes WhatsApp.
4. En cas de doute, ne paie pas : prends le temps de vérifier.`,
    quiz: [
      { question: 'Un « agent » te demande ton code PIN pour débloquer un transfert. Tu…', options: ['Le donnes', 'Refuses et contactes ton opérateur', 'Donnes la moitié du code'], answer: 1, explanation: 'Aucun service légitime ne demande ton code PIN.' },
      { question: 'Être payé pour recruter d’autres investisseurs est typique…', options: ['D’une banque', 'D’un système pyramidal', 'D’une tontine classique'], answer: 1, explanation: 'Les systèmes pyramidaux s’effondrent quand les recrutements ralentissent.' },
    ],
    exercise: 'Partage les 5 signaux d’alerte avec un proche.',
  },
];
