/**
 * Objectifs d'épargne : progression, contribution nécessaire, projection.
 */
import { addMonths, monthOf, monthsUntil, type DateKey, type MonthKey } from './dates';
import { ratio } from './money';

export type GoalStatus = 'atteint' | 'en_avance' | 'dans_les_temps' | 'en_retard' | 'sans_date' | 'echeance_depassee';

export interface GoalMetricsInput {
  target: number;
  saved: number;
  targetDate: DateKey | null;
  today: DateKey;
  /** Contribution mensuelle prévue ou moyenne récente (unités mineures). */
  monthlyContribution: number | null;
}

export interface GoalMetrics {
  remaining: number;
  progress: number;
  monthsLeft: number | null;
  requiredMonthly: number | null;
  projectedMonths: number | null;
  projectedMonth: MonthKey | null;
  status: GoalStatus;
}

/** Nombre de mois nécessaires pour épargner `remaining` à raison de `monthly` par mois. */
export function monthsToReach(remaining: number, monthly: number): number | null {
  if (remaining <= 0) return 0;
  if (monthly <= 0) return null;
  return Math.ceil(remaining / monthly);
}

/** Contribution mensuelle nécessaire pour épargner `remaining` en `months` mois. */
export function requiredMonthlyContribution(remaining: number, months: number): number {
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / Math.max(1, months));
}

export function goalMetrics(input: GoalMetricsInput): GoalMetrics {
  const remaining = Math.max(0, input.target - input.saved);
  const progress = Math.min(1, Math.max(0, ratio(input.saved, input.target)));
  const monthly = input.monthlyContribution && input.monthlyContribution > 0 ? input.monthlyContribution : null;
  const projectedMonths = remaining === 0 ? 0 : monthly ? monthsToReach(remaining, monthly) : null;
  const projectedMonth = projectedMonths === null ? null : addMonths(monthOf(input.today), projectedMonths);

  if (remaining === 0) {
    return { remaining, progress: 1, monthsLeft: null, requiredMonthly: 0, projectedMonths: 0, projectedMonth: monthOf(input.today), status: 'atteint' };
  }

  if (!input.targetDate) {
    return { remaining, progress, monthsLeft: null, requiredMonthly: null, projectedMonths, projectedMonth, status: 'sans_date' };
  }

  const monthsLeft = monthsUntil(input.today, input.targetDate);
  if (monthsLeft === 0) {
    return { remaining, progress, monthsLeft: 0, requiredMonthly: remaining, projectedMonths, projectedMonth, status: 'echeance_depassee' };
  }

  const requiredMonthly = requiredMonthlyContribution(remaining, monthsLeft);
  let status: GoalStatus = 'en_retard';
  if (projectedMonths !== null) {
    if (projectedMonths < monthsLeft) status = 'en_avance';
    else if (projectedMonths === monthsLeft) status = 'dans_les_temps';
  }
  return { remaining, progress, monthsLeft, requiredMonthly, projectedMonths, projectedMonth, status };
}

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  atteint: 'Objectif atteint',
  en_avance: 'En avance',
  dans_les_temps: 'Dans les temps',
  en_retard: 'En retard',
  sans_date: 'Sans date cible',
  echeance_depassee: 'Échéance dépassée',
};
