/**
 * Indicateur de santé financière (0-100), entièrement déterministe et explicable.
 *
 * Composantes (pondérations) :
 * - Taux d'épargne ................. 25 pts (plein à 20 % des revenus)
 * - Fonds d'urgence ................ 25 pts (plein à 3 mois, 6 mois si revenus irréguliers)
 * - Poids des dettes ............... 20 pts (plein ≤ 10 % des revenus, nul ≥ 40 %)
 * - Maîtrise des dépenses .......... 15 pts (plein ≤ 70 % des revenus, nul ≥ 100 %)
 * - Respect des budgets ............ 15 pts (si au moins un budget existe)
 * Le score est normalisé sur les composantes disponibles.
 */
import { ratio } from './money';

export interface HealthInput {
  /** Revenus du mois (ou revenu mensuel déclaré). */
  income: number;
  /** Dépenses de consommation du mois. */
  expenses: number;
  /** Remboursements de dettes du mois (ou mensualités déclarées). */
  debtPayments: number;
  /** Épargne disponible pour les urgences (solde du fonds d'urgence). */
  emergencyFund: number;
  /** Dépenses essentielles mensuelles moyennes. */
  essentialMonthly: number;
  irregularIncome: boolean;
  /** Part des budgets respectés (0..1), `null` si aucun budget. */
  budgetAdherence: number | null;
}

export type HealthLevel = 'fragile' | 'a_consolider' | 'bonne' | 'excellente' | 'inconnu';

export interface HealthComponent {
  key: 'epargne' | 'urgence' | 'dettes' | 'depenses' | 'budgets';
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface HealthResult {
  score: number | null;
  level: HealthLevel;
  label: string;
  components: HealthComponent[];
  /** Pistes d'amélioration, de la plus impactante à la moins impactante. */
  tips: string[];
  metrics: {
    savingsRate: number;
    emergencyMonths: number;
    emergencyTargetMonths: number;
    debtRatio: number;
    expenseRatio: number;
  };
}

export const HEALTH_LEVEL_LABELS: Record<HealthLevel, string> = {
  fragile: 'Fragile',
  a_consolider: 'À consolider',
  bonne: 'Bonne',
  excellente: 'Excellente',
  inconnu: 'Données insuffisantes',
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export function levelForScore(score: number | null): HealthLevel {
  if (score === null) return 'inconnu';
  if (score >= 80) return 'excellente';
  if (score >= 60) return 'bonne';
  if (score >= 40) return 'a_consolider';
  return 'fragile';
}

export function computeHealthScore(input: HealthInput): HealthResult {
  const emergencyTargetMonths = input.irregularIncome ? 6 : 3;
  const savingsRate = ratio(input.income - input.expenses - input.debtPayments, input.income);
  const emergencyMonths = input.essentialMonthly > 0 ? input.emergencyFund / input.essentialMonthly : 0;
  const debtRatio = ratio(input.debtPayments, input.income);
  const expenseRatio = ratio(input.expenses, input.income);

  const metrics = { savingsRate, emergencyMonths, emergencyTargetMonths, debtRatio, expenseRatio };

  if (input.income <= 0) {
    return {
      score: null,
      level: 'inconnu',
      label: HEALTH_LEVEL_LABELS.inconnu,
      components: [],
      tips: ['Enregistre tes revenus du mois pour calculer ta santé financière.'],
      metrics,
    };
  }

  const components: HealthComponent[] = [];
  const pct = (v: number) => `${Math.round(v * 100)} %`;

  components.push({
    key: 'epargne',
    label: "Taux d'épargne",
    max: 25,
    points: 25 * clamp01(savingsRate / 0.2),
    detail: `${pct(Math.max(savingsRate, -9.99))} des revenus non dépensés (objectif : 20 %)`,
  });

  components.push({
    key: 'urgence',
    label: "Fonds d'urgence",
    max: 25,
    points: 25 * clamp01(emergencyMonths / emergencyTargetMonths),
    detail: `${round1(emergencyMonths).toLocaleString('fr-FR')} mois de dépenses essentielles couverts (objectif : ${emergencyTargetMonths} mois)`,
  });

  const debtPoints = debtRatio <= 0.1 ? 20 : debtRatio >= 0.4 ? 0 : (20 * (0.4 - debtRatio)) / 0.3;
  components.push({
    key: 'dettes',
    label: 'Poids des dettes',
    max: 20,
    points: debtPoints,
    detail:
      input.debtPayments > 0
        ? `${pct(debtRatio)} des revenus consacrés aux remboursements (seuil d'alerte : 33 %)`
        : 'Aucun remboursement de dette',
  });

  const spendingPoints = expenseRatio <= 0.7 ? 15 : expenseRatio >= 1 ? 0 : (15 * (1 - expenseRatio)) / 0.3;
  components.push({
    key: 'depenses',
    label: 'Maîtrise des dépenses',
    max: 15,
    points: spendingPoints,
    detail: `${pct(expenseRatio)} des revenus dépensés (repère : 70 % maximum)`,
  });

  if (input.budgetAdherence !== null) {
    components.push({
      key: 'budgets',
      label: 'Respect des budgets',
      max: 15,
      points: 15 * clamp01(input.budgetAdherence),
      detail: `${pct(input.budgetAdherence)} des budgets respectés`,
    });
  }

  const totalMax = components.reduce((s, c) => s + c.max, 0);
  const totalPoints = components.reduce((s, c) => s + c.points, 0);
  const score = Math.round((totalPoints / totalMax) * 100);

  const tipsByComponent: Record<HealthComponent['key'], string> = {
    epargne: 'Mets de côté un montant fixe dès la réception de ton revenu, avant de dépenser.',
    urgence: `Construis ton fonds d'urgence jusqu'à ${emergencyTargetMonths} mois de dépenses essentielles.`,
    dettes: 'Rembourse en priorité les dettes aux taux les plus élevés (méthode avalanche).',
    depenses: 'Identifie 1 ou 2 postes non essentiels à réduire ce mois-ci.',
    budgets: 'Ajuste les budgets dépassés ou réduis les dépenses de ces catégories.',
  };
  if (input.budgetAdherence === null) {
    tipsByComponent.budgets = '';
  }

  const tips = [...components]
    .map((c) => ({ c, gap: c.max - c.points }))
    .filter(({ gap }) => gap > 0.5)
    .sort((a, b) => b.gap - a.gap)
    .map(({ c }) => tipsByComponent[c.key])
    .filter(Boolean)
    .slice(0, 3);
  if (input.budgetAdherence === null) {
    tips.push('Définis des budgets par catégorie pour suivre tes dépenses (le planificateur peut le faire pour toi).');
  }

  const level = levelForScore(score);
  return {
    score,
    level,
    label: HEALTH_LEVEL_LABELS[level],
    components: components.map((c) => ({ ...c, points: round1(c.points) })),
    tips: tips.slice(0, 3),
    metrics,
  };
}
