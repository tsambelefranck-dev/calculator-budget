/**
 * Référentiels partagés (client + serveur). Aucune dépendance serveur ici.
 */

export const CURRENCIES = ['XAF', 'XOF', 'USD', 'EUR'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const COUNTRY_CODES = ['CM', 'CI', 'BJ', 'SN', 'TG', 'BF', 'CD', 'OTHER'] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export interface CountryInfo {
  code: CountryCode;
  name: string;
  nameEn: string;
  currency: CurrencyCode;
  timezone: string;
}

export const COUNTRIES: readonly CountryInfo[] = [
  { code: 'CM', name: 'Cameroun', nameEn: 'Cameroon', currency: 'XAF', timezone: 'Africa/Douala' },
  { code: 'CI', name: "Côte d'Ivoire", nameEn: "Côte d'Ivoire", currency: 'XOF', timezone: 'Africa/Abidjan' },
  { code: 'BJ', name: 'Bénin', nameEn: 'Benin', currency: 'XOF', timezone: 'Africa/Porto-Novo' },
  { code: 'SN', name: 'Sénégal', nameEn: 'Senegal', currency: 'XOF', timezone: 'Africa/Dakar' },
  { code: 'TG', name: 'Togo', nameEn: 'Togo', currency: 'XOF', timezone: 'Africa/Lome' },
  { code: 'BF', name: 'Burkina Faso', nameEn: 'Burkina Faso', currency: 'XOF', timezone: 'Africa/Ouagadougou' },
  { code: 'CD', name: 'République démocratique du Congo', nameEn: 'DR Congo', currency: 'USD', timezone: 'Africa/Kinshasa' },
  { code: 'OTHER', name: 'Autre pays', nameEn: 'Other country', currency: 'EUR', timezone: 'UTC' },
];

export function getCountry(code: string | null | undefined): CountryInfo {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[COUNTRIES.length - 1]!;
}

export const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export const EMPLOYMENT_STATUSES = [
  'salarie',
  'fonctionnaire',
  'entrepreneur',
  'commercant',
  'freelance',
  'etudiant',
  'sans_emploi',
  'retraite',
] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const EMPLOYMENT_LABELS: Record<EmploymentStatus, string> = {
  salarie: 'Salarié(e) du privé',
  fonctionnaire: 'Fonctionnaire / agent public',
  entrepreneur: 'Entrepreneur(e)',
  commercant: 'Commerçant(e)',
  freelance: 'Freelance / indépendant(e)',
  etudiant: 'Étudiant(e)',
  sans_emploi: 'Sans emploi',
  retraite: 'Retraité(e)',
};

export const INCOME_TYPES = ['fixe', 'variable', 'mixte'] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  fixe: 'Fixes (même montant chaque mois)',
  variable: 'Variables (montant qui change)',
  mixte: 'Mixtes (une part fixe + une part variable)',
};

export const INCOME_SOURCE_TYPES = [
  'salaire',
  'commerce',
  'freelance',
  'business',
  'loyers',
  'commissions',
  'autre',
] as const;
export type IncomeSourceType = (typeof INCOME_SOURCE_TYPES)[number];

export const INCOME_SOURCE_LABELS: Record<IncomeSourceType, string> = {
  salaire: 'Salaire',
  commerce: 'Activité commerciale',
  freelance: 'Freelance',
  business: 'Business',
  loyers: 'Loyers',
  commissions: 'Commissions',
  autre: 'Autre revenu',
};

export const PAYMENT_METHODS = ['especes', 'mobile_money', 'carte', 'virement', 'autre'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  especes: 'Espèces',
  mobile_money: 'Mobile Money',
  carte: 'Carte bancaire',
  virement: 'Virement',
  autre: 'Autre',
};

/** Enveloppes du planificateur de salaire. */
export const PLANNER_BUCKETS = [
  'logement',
  'essentiels',
  'famille',
  'dettes',
  'urgence',
  'objectifs',
  'investissement',
  'plaisir',
  'marge',
] as const;
export type PlannerBucket = (typeof PLANNER_BUCKETS)[number];

export const PLANNER_BUCKET_LABELS: Record<PlannerBucket, string> = {
  logement: 'Logement & charges',
  essentiels: 'Besoins essentiels',
  famille: 'Famille & obligations',
  dettes: 'Remboursement des dettes',
  urgence: 'Épargne de précaution',
  objectifs: 'Objectifs d’épargne',
  investissement: 'Investissement',
  plaisir: 'Loisirs & dépenses personnelles',
  marge: 'Marge de sécurité',
};

/** Catégories de dépenses par défaut (référentiel modifiable par l'admin). */
export interface CategorySeed {
  code: string;
  nameFr: string;
  nameEn: string;
  icon: string;
  color: string;
  isEssential: boolean;
  plannerBucket: PlannerBucket;
}

export const DEFAULT_CATEGORIES: readonly CategorySeed[] = [
  { code: 'logement', nameFr: 'Logement', nameEn: 'Housing', icon: 'home', color: '#0b4d33', isEssential: true, plannerBucket: 'logement' },
  { code: 'alimentation', nameFr: 'Alimentation', nameEn: 'Food', icon: 'utensils', color: '#2a7d5f', isEssential: true, plannerBucket: 'essentiels' },
  { code: 'transport', nameFr: 'Transport', nameEn: 'Transport', icon: 'bus', color: '#3b82a0', isEssential: true, plannerBucket: 'essentiels' },
  { code: 'sante', nameFr: 'Santé', nameEn: 'Health', icon: 'heart-pulse', color: '#c2410c', isEssential: true, plannerBucket: 'essentiels' },
  { code: 'education', nameFr: 'Éducation', nameEn: 'Education', icon: 'graduation-cap', color: '#6d5bd0', isEssential: true, plannerBucket: 'famille' },
  { code: 'famille', nameFr: 'Famille', nameEn: 'Family', icon: 'users', color: '#b45309', isEssential: true, plannerBucket: 'famille' },
  { code: 'communication', nameFr: 'Communication', nameEn: 'Phone & internet', icon: 'smartphone', color: '#0e7490', isEssential: true, plannerBucket: 'essentiels' },
  { code: 'loisirs', nameFr: 'Loisirs', nameEn: 'Leisure', icon: 'party-popper', color: '#c99a2e', isEssential: false, plannerBucket: 'plaisir' },
  { code: 'abonnements', nameFr: 'Abonnements', nameEn: 'Subscriptions', icon: 'repeat', color: '#9d4edd', isEssential: false, plannerBucket: 'plaisir' },
  { code: 'shopping', nameFr: 'Shopping', nameEn: 'Shopping', icon: 'shopping-bag', color: '#db2777', isEssential: false, plannerBucket: 'plaisir' },
  { code: 'business', nameFr: 'Business', nameEn: 'Business', icon: 'briefcase', color: '#475569', isEssential: true, plannerBucket: 'essentiels' },
  { code: 'autres', nameFr: 'Autres', nameEn: 'Other', icon: 'more-horizontal', color: '#78716c', isEssential: false, plannerBucket: 'marge' },
];

export const GOAL_TYPES = [
  'fonds_urgence',
  'voiture',
  'maison',
  'mariage',
  'voyage',
  'entreprise',
  'formation',
  'projet_perso',
  'autre',
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  fonds_urgence: "Fonds d'urgence",
  voiture: "Achat d'une voiture",
  maison: "Construction d'une maison",
  mariage: 'Mariage',
  voyage: 'Voyage',
  entreprise: "Création d'une entreprise",
  formation: 'Formation',
  projet_perso: 'Projet personnel',
  autre: 'Autre objectif',
};

export const DEBT_TYPES = ['personnel', 'credit_bancaire', 'microfinance', 'pret_familial', 'tontine', 'autre'] as const;
export type DebtType = (typeof DEBT_TYPES)[number];

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  personnel: 'Dette personnelle',
  credit_bancaire: 'Crédit bancaire',
  microfinance: 'Prêt de microfinance',
  pret_familial: 'Prêt familial / amical',
  tontine: 'Avance de tontine',
  autre: 'Autre dette',
};

export const INVESTMENT_HORIZONS = ['court', 'moyen', 'long'] as const;
export type InvestmentHorizon = (typeof INVESTMENT_HORIZONS)[number];

export const HORIZON_LABELS: Record<InvestmentHorizon, string> = {
  court: 'Court terme (moins de 2 ans)',
  moyen: 'Moyen terme (2 à 5 ans)',
  long: 'Long terme (plus de 5 ans)',
};

export const RISK_TOLERANCES = ['prudent', 'equilibre', 'dynamique'] as const;
export type RiskTolerance = (typeof RISK_TOLERANCES)[number];

export const RISK_LABELS: Record<RiskTolerance, string> = {
  prudent: 'Prudent',
  equilibre: 'Équilibré',
  dynamique: 'Dynamique',
};

export const PROFILE_TYPES = [
  'depensier_a_accompagner',
  'en_desendettement',
  'entrepreneur_revenus_irreguliers',
  'investisseur_debutant',
  'epargnant_prudent',
  'etudiant_batisseur',
  'debutant_financier',
] as const;
export type ProfileType = (typeof PROFILE_TYPES)[number];

/** Domaines d'investissement du centre pédagogique. */
export const INVESTMENT_DOMAIN_SLUGS = [
  'agriculture',
  'immobilier',
  'commerce',
  'transport-logistique',
  'energies-renouvelables',
  'technologie-numerique',
  'marches-financiers',
  'obligations',
  'fonds-investissement',
  'entrepreneuriat',
  'formation-competences',
] as const;
export type InvestmentDomainSlug = (typeof INVESTMENT_DOMAIN_SLUGS)[number];

export const PLANS = ['free', 'premium'] as const;
export type Plan = (typeof PLANS)[number];
