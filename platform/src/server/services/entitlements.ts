import type { Plan } from '@/lib/constants';

export interface PlanLimits {
  maxActiveGoals: number | null;
  aiMessagesPerMonth: number;
  historyMonths: number;
  simulator: boolean;
  debtStrategies: boolean;
  aiReportSummary: boolean;
  premiumLessons: boolean;
}

function envInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Droits par offre (source unique de vérité du modèle freemium). */
export function getPlanLimits(plan: Plan): PlanLimits {
  if (plan === 'premium') {
    return {
      maxActiveGoals: null,
      aiMessagesPerMonth: envInt('PREMIUM_AI_MESSAGES_PER_MONTH', 100),
      historyMonths: 12,
      simulator: true,
      debtStrategies: true,
      aiReportSummary: true,
      premiumLessons: true,
    };
  }
  return {
    maxActiveGoals: 3,
    aiMessagesPerMonth: envInt('FREE_AI_MESSAGES_PER_MONTH', 10),
    historyMonths: 3,
    simulator: false,
    debtStrategies: false,
    aiReportSummary: false,
    premiumLessons: false,
  };
}

export const PREMIUM_PRICING = {
  XAF: { monthly: 3000, yearly: 30000 },
  XOF: { monthly: 3000, yearly: 30000 },
  EUR: { monthly: 499, yearly: 4990 },
  USD: { monthly: 499, yearly: 4990 },
} as const;

export const TRIAL_DAYS = 14;
