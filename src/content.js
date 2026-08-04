// Tous les textes de l'application, centralisés pour faciliter les retouches de copy.

export const BRAND = {
  name: 'Budget Express',
  publisher: 'NexaFi Academy',
  currencySuffix: 'FCFA',
};

export const LANDING = {
  eyebrow: '100% gratuit · résultat instantané',
  title: 'Découvrez combien vous pourriez épargner chaque mois',
  subtitle:
    "Répondez à 4 questions simples sur votre salaire et vos dépenses. En 2 minutes, obtenez un diagnostic clair de votre budget.",
  illustration: '💰',
  trustChips: ['⏱ 2 minutes', '🔒 Aucune donnée partagée', '🇨🇲 Adapté au contexte local'],
  ctaLabel: 'Découvrir mon budget',
};

// Un écran de question par entrée. Chaque champ est rendu par le composant CurrencyInput.
export const STEPS = [
  {
    id: 'q1',
    eyebrow: 'Étape 1 sur 4',
    title: 'Votre revenu mensuel',
    subtitle: "Quel est votre revenu net total chaque mois ?",
    fields: [
      {
        key: 'revenu',
        label: 'Revenu mensuel net',
        hint: 'Salaire + revenus complémentaires réguliers',
        placeholder: '150 000',
      },
    ],
  },
  {
    id: 'q2',
    eyebrow: 'Étape 2 sur 4',
    title: 'Vos charges fixes',
    subtitle: 'Les dépenses qui reviennent chaque mois, montant identique.',
    fields: [
      { key: 'loyer', label: 'Loyer / logement', placeholder: '40 000' },
      { key: 'transport', label: 'Transport', placeholder: '15 000' },
      { key: 'factures', label: 'Factures (eau, électricité, internet, forfait)', placeholder: '20 000' },
      { key: 'autresFixes', label: 'Autres charges fixes (scolarité, assurances…)', placeholder: '10 000' },
    ],
  },
  {
    id: 'q3',
    eyebrow: 'Étape 3 sur 4',
    title: 'Vos dépenses variables',
    subtitle: 'Ce qui change un peu chaque mois.',
    fields: [
      { key: 'alimentation', label: 'Alimentation', placeholder: '35 000' },
      { key: 'famille', label: 'Solidarité familiale / tontine', placeholder: '20 000' },
      { key: 'loisirs', label: 'Loisirs & sorties', placeholder: '10 000' },
      { key: 'imprevus', label: 'Imprévus', placeholder: '10 000' },
    ],
  },
  {
    id: 'q4',
    eyebrow: 'Étape 4 sur 4',
    title: 'Votre épargne actuelle',
    subtitle: 'Ce que vous arrivez à mettre de côté aujourd\'hui.',
    fields: [
      {
        key: 'epargneActuelle',
        label: 'Épargne mensuelle actuelle',
        hint: "Indiquez 0 si vous n'épargnez pas encore",
        placeholder: '0',
      },
    ],
  },
];

export const LOADING = {
  messages: [
    'Analyse de vos revenus…',
    'Calcul de vos charges fixes…',
    'Évaluation de votre capacité d\'épargne…',
    'Préparation de votre diagnostic…',
  ],
  minDurationMs: 1600,
};

export const DIAGNOSTIC_LABELS = {
  deficit: {
    level: 'fragile',
    title: 'Budget en tension',
    message: "Vos dépenses dépassent votre revenu ce mois-ci. Pas de panique : de petits ajustements peuvent rapidement rééquilibrer la situation.",
  },
  fragile: {
    level: 'fragile',
    title: 'Budget fragile',
    message: 'Votre capacité d\'épargne est encore faible. Quelques ajustements ciblés peuvent nettement l\'améliorer.',
  },
  equilibre: {
    level: 'equilibre',
    title: 'Budget équilibré',
    message: 'Vous êtes sur la bonne voie. Avec un peu plus de structure, votre épargne peut encore progresser.',
  },
  optimise: {
    level: 'optimise',
    title: 'Budget optimisé',
    message: 'Bravo, votre gestion est déjà solide. Le bon réflexe maintenant : faire fructifier cette épargne.',
  },
};

export const RESULT = {
  title: 'Votre diagnostic budgétaire',
  chartCenterLabel: 'du revenu épargné',
  legend: {
    chargesFixes: 'Charges fixes',
    depensesVariables: 'Dépenses variables',
    epargne: 'Épargne',
    nonAffecte: 'Non affecté',
  },
  shareCta: 'Partager mon résultat',
  continueCta: 'Voir comment épargner plus',
};

export const LEAD = {
  title: 'Recevez votre bilan détaillé',
  subtitle: 'Nous vous envoyons le récapitulatif complet de votre diagnostic, gratuitement.',
  emailLabel: 'Adresse email',
  emailPlaceholder: 'vous@exemple.com',
  phoneLabel: 'Numéro WhatsApp (optionnel)',
  phonePlaceholder: '6XX XX XX XX',
  submitLabel: 'Recevoir mon bilan',
  skipLabel: 'Non merci, continuer',
  successTitle: 'C\'est envoyé !',
  successText: 'Vérifiez votre boîte mail dans quelques instants.',
  // TODO: URL du déploiement Google Apps Script (Web App) qui écrit dans le Google Sheet.
  // Voir README.md > "Brancher la capture de leads sur Google Sheet".
  endpointUrl: '#TODO_GOOGLE_SHEET_WEBAPP_URL',
};

export const OFFER = {
  badge: 'Recommandé pour vous',
  title: 'Comment Économiser Facilement Juste avec son Salaire',
  subtitle: 'Le guide pas-à-pas pour transformer votre diagnostic en épargne réelle, mois après mois — même avec un salaire modeste.',
  benefits: [
    'Une méthode simple pour épargner sans changer radicalement votre mode de vie',
    'Des astuces concrètes adaptées à la réalité africaine (Mobile Money, tontine, famille)',
    'Un plan d\'action sur 30 jours, étape par étape',
    'Comment gérer les imprévus sans sabrer votre épargne',
  ],
  priceOld: '9 900 FCFA',
  priceNew: '5 000 FCFA',
  guarantee: '🛡 Garantie satisfait ou remboursé',
  socialProof: '⭐ Déjà utilisé par des dizaines de salariés en Afrique francophone',
  ctaLabel: 'Je veux le guide maintenant',
  // TODO: remplacer par l'URL du produit Chariow une fois la page créée sur NexaFi Academy.
  ctaUrl: '#TODO_LIEN_CHARIOW_GUIDE',
  restartLabel: 'Revenir à l\'accueil',
};

export const NAV = {
  back: 'Retour',
  next: 'Continuer',
};
