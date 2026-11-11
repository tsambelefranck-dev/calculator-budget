/**
 * Diagnostic financier initial : profil de risque + type de profil + priorités.
 * Règles explicites et testées — aucun « score magique ».
 */
import type {
  EmploymentStatus,
  GoalType,
  IncomeType,
  InvestmentHorizon,
  ProfileType,
  RiskTolerance,
} from '@/lib/constants';
import { computeHealthScore, type HealthResult } from './health';
import { ratio } from './money';

export interface RiskAnswers {
  /** Réaction à une baisse de 20 % : 0 = je vends tout, 1 = j'attends, 2 = je renforce. */
  lossReaction: 0 | 1 | 2;
  /** Expérience : 0 = aucune, 1 = épargne/tontine, 2 = placements, actions, immobilier, business. */
  experience: 0 | 1 | 2;
  /** Part de l'épargne prête à être risquée : 0 = aucune, 1 = moins d'un quart, 2 = plus d'un quart. */
  riskShare: 0 | 1 | 2;
}

export interface RiskProfile {
  score: number; // 0..8
  tolerance: RiskTolerance;
}

const HORIZON_POINTS: Record<InvestmentHorizon, number> = { court: 0, moyen: 1, long: 2 };

export function computeRiskProfile(answers: RiskAnswers, horizon: InvestmentHorizon, incomeType: IncomeType): RiskProfile {
  let score = answers.lossReaction + answers.experience + answers.riskShare + HORIZON_POINTS[horizon];
  // Des revenus irréguliers réduisent la capacité à encaisser des pertes.
  if (incomeType === 'variable') score -= 1;
  score = Math.max(0, Math.min(8, score));
  const tolerance: RiskTolerance = score <= 2 ? 'prudent' : score <= 5 ? 'equilibre' : 'dynamique';
  return { score, tolerance };
}

export interface DiagnosticInput {
  employmentStatus: EmploymentStatus;
  incomeType: IncomeType;
  monthlyIncome: number;
  fixedCharges: number;
  variableExpenses: number;
  debtTotal: number;
  debtMonthlyPayment: number;
  currentSavings: number;
  dependents: number;
  goals: GoalType[];
  investmentHorizon: InvestmentHorizon;
  riskAnswers: RiskAnswers;
}

export interface Priority {
  title: string;
  description: string;
  href: string;
}

export interface DiagnosticResult {
  profileType: ProfileType;
  profileLabel: string;
  profileDescription: string;
  risk: RiskProfile;
  metrics: {
    totalExpenses: number;
    monthlyMargin: number;
    expenseRatio: number;
    savingsCapacityRate: number;
    emergencyMonths: number;
    debtPaymentRatio: number;
    debtToAnnualIncome: number;
  };
  strengths: string[];
  watchPoints: string[];
  priorities: Priority[];
  health: HealthResult;
  /** Montant cible suggéré pour le fonds d'urgence (unités mineures). */
  suggestedEmergencyTarget: number;
}

export const PROFILE_LABELS: Record<ProfileType, { label: string; description: string }> = {
  depensier_a_accompagner: {
    label: 'Dépensier à accompagner',
    description:
      "Tes dépenses absorbent presque tout ton revenu. L'enjeu n'est pas de te priver de tout, mais de reprendre le contrôle poste par poste pour dégager une marge.",
  },
  en_desendettement: {
    label: 'En phase de désendettement',
    description:
      'Tes dettes pèsent lourd sur ton budget. Un plan de remboursement structuré libérera rapidement de la capacité d’épargne.',
  },
  entrepreneur_revenus_irreguliers: {
    label: 'Entrepreneur à revenus irréguliers',
    description:
      'Tes revenus varient d’un mois à l’autre. Ta priorité : lisser tes revenus avec un fonds d’urgence plus large (6 mois) et te verser un « salaire » régulier.',
  },
  investisseur_debutant: {
    label: 'Investisseur débutant',
    description:
      'Tes bases sont solides (épargne de précaution, dépenses maîtrisées). Tu peux commencer à apprendre à faire fructifier ton épargne, progressivement.',
  },
  epargnant_prudent: {
    label: 'Épargnant prudent',
    description:
      'Tu épargnes régulièrement et tu privilégies la sécurité. Ton épargne pourrait travailler davantage, à ton rythme et sans prendre de risques inconsidérés.',
  },
  etudiant_batisseur: {
    label: 'Étudiant bâtisseur',
    description:
      'Tes moyens sont limités, mais c’est le meilleur moment pour prendre de bonnes habitudes : suivre ses dépenses et épargner même de petites sommes.',
  },
  debutant_financier: {
    label: 'Débutant financier',
    description:
      'Tu poses les fondations : suivre ses revenus et dépenses, constituer une première épargne de précaution, puis planifier chaque revenu.',
  },
};

export function diagnose(input: DiagnosticInput): DiagnosticResult {
  const risk = computeRiskProfile(input.riskAnswers, input.investmentHorizon, input.incomeType);
  const income = input.monthlyIncome;
  const totalExpenses = input.fixedCharges + input.variableExpenses;
  const monthlyMargin = income - totalExpenses - input.debtMonthlyPayment;
  const expenseRatio = ratio(totalExpenses + input.debtMonthlyPayment, income);
  const savingsCapacityRate = ratio(monthlyMargin, income);
  const essentialMonthly = totalExpenses > 0 ? totalExpenses : income * 0.7;
  const emergencyMonths = essentialMonthly > 0 ? input.currentSavings / essentialMonthly : 0;
  const debtPaymentRatio = ratio(input.debtMonthlyPayment, income);
  const debtToAnnualIncome = ratio(input.debtTotal, income * 12);
  const irregular = input.incomeType !== 'fixe';
  const independent = ['entrepreneur', 'commercant', 'freelance'].includes(input.employmentStatus);

  let profileType: ProfileType;
  if (income <= 0 || expenseRatio >= 0.9) {
    profileType = 'depensier_a_accompagner';
  } else if (debtPaymentRatio > 0.33 || debtToAnnualIncome > 0.5) {
    profileType = 'en_desendettement';
  } else if (independent && irregular) {
    profileType = 'entrepreneur_revenus_irreguliers';
  } else if (input.employmentStatus === 'etudiant') {
    profileType = 'etudiant_batisseur';
  } else if (emergencyMonths >= 3 && risk.tolerance !== 'prudent' && input.investmentHorizon !== 'court' && savingsCapacityRate >= 0.1) {
    profileType = 'investisseur_debutant';
  } else if (savingsCapacityRate >= 0.1 && risk.tolerance === 'prudent') {
    profileType = 'epargnant_prudent';
  } else {
    profileType = 'debutant_financier';
  }

  const strengths: string[] = [];
  const watchPoints: string[] = [];
  const pct = (v: number) => `${Math.round(v * 100)} %`;

  if (savingsCapacityRate >= 0.15) strengths.push(`Tu peux mettre de côté environ ${pct(savingsCapacityRate)} de tes revenus.`);
  if (emergencyMonths >= 3) strengths.push(`Ton épargne couvre ${Math.floor(emergencyMonths)} mois de dépenses : un vrai matelas de sécurité.`);
  if (input.debtTotal === 0) strengths.push('Tu n’as aucune dette.');
  if (input.goals.length > 0) strengths.push('Tu as des objectifs clairs : c’est le moteur de l’épargne.');
  if (risk.tolerance === 'prudent') strengths.push('Tu es prudent face au risque : un atout contre les arnaques.');

  if (monthlyMargin < 0) watchPoints.push('Tes dépenses et remboursements dépassent tes revenus.');
  else if (savingsCapacityRate < 0.05) watchPoints.push('Ta capacité d’épargne est inférieure à 5 % de tes revenus.');
  if (emergencyMonths < 1) watchPoints.push('Tu n’as pas encore d’épargne de précaution couvrant un mois de dépenses.');
  if (debtPaymentRatio > 0.33) watchPoints.push(`Tes remboursements représentent ${pct(debtPaymentRatio)} de tes revenus (seuil d’alerte : 33 %).`);
  if (irregular) watchPoints.push('Tes revenus irréguliers demandent un fonds d’urgence de 6 mois.');
  if (input.dependents >= 3) watchPoints.push(`${input.dependents} personnes dépendent de toi : prévois une enveloppe « famille » réaliste.`);

  const targetMonths = irregular ? 6 : 3;
  const suggestedEmergencyTarget = Math.round(essentialMonthly * targetMonths);

  const priorities: Priority[] = [];
  if (monthlyMargin < 0 || expenseRatio >= 0.9) {
    priorities.push({
      title: 'Reprendre le contrôle des dépenses',
      description: 'Enregistre tes dépenses pendant 30 jours et fixe un budget par catégorie.',
      href: '/app/expenses',
    });
  }
  if (debtPaymentRatio > 0.2 || input.debtTotal > 0) {
    priorities.push({
      title: 'Organiser le remboursement des dettes',
      description: 'Enregistre tes dettes et compare les méthodes avalanche et boule de neige.',
      href: '/app/debts',
    });
  }
  if (emergencyMonths < targetMonths) {
    priorities.push({
      title: 'Constituer ton fonds d’urgence',
      description: `Objectif : ${targetMonths} mois de dépenses essentielles, avant tout investissement.`,
      href: '/app/goals',
    });
  }
  priorities.push({
    title: 'Planifier ton prochain revenu',
    description: 'Le planificateur répartit ton revenu dès sa réception : charges, épargne, plaisir.',
    href: '/app/planner',
  });
  if (profileType === 'investisseur_debutant' || profileType === 'epargnant_prudent') {
    priorities.push({
      title: 'Apprendre à investir',
      description: 'Découvre les domaines d’investissement et teste des scénarios dans le simulateur.',
      href: '/app/invest',
    });
  }

  const health = computeHealthScore({
    income,
    expenses: totalExpenses,
    debtPayments: input.debtMonthlyPayment,
    emergencyFund: input.currentSavings,
    essentialMonthly,
    irregularIncome: irregular,
    budgetAdherence: null,
  });

  return {
    profileType,
    profileLabel: PROFILE_LABELS[profileType].label,
    profileDescription: PROFILE_LABELS[profileType].description,
    risk,
    metrics: {
      totalExpenses,
      monthlyMargin,
      expenseRatio,
      savingsCapacityRate,
      emergencyMonths,
      debtPaymentRatio,
      debtToAnnualIncome,
    },
    strengths: strengths.slice(0, 4),
    watchPoints: watchPoints.slice(0, 4),
    priorities: priorities.slice(0, 3),
    health,
    suggestedEmergencyTarget,
  };
}
