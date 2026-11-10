import 'server-only';
import { and, eq } from 'drizzle-orm';
import type {
  AgeRange,
  CountryCode,
  CurrencyCode,
  EmploymentStatus,
  GoalType,
  IncomeType,
  InvestmentHorizon,
  Plan,
} from '@/lib/constants';
import { getCountry } from '@/lib/constants';
import { addMonths, monthOf, todayInTimezone } from '@/lib/finance/dates';
import { CURRENCY_META, roundUpTo } from '@/lib/finance/money';
import { diagnose, type DiagnosticResult, type RiskAnswers } from '@/lib/finance/profile';
import { db } from '@/server/db';
import { financialProfiles, savingsGoals } from '@/server/db/schema';
import { changeCurrency } from './account';
import { createGoal } from './goals';

export interface OnboardingInput {
  ageRange: AgeRange;
  country: CountryCode;
  currency: CurrencyCode;
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
  createEmergencyGoal: boolean;
}

/**
 * Enregistre (ou met à jour) le diagnostic financier et retourne le profil calculé.
 * Option : crée le fonds d'urgence avec l'épargne déjà constituée comme premier versement.
 */
export async function saveOnboarding(userId: string, plan: Plan, input: OnboardingInput): Promise<DiagnosticResult> {
  const result = diagnose(input);
  const country = getCountry(input.country);
  const timezone = country.timezone;

  const existing = await db.select().from(financialProfiles).where(eq(financialProfiles.userId, userId)).limit(1);
  if (existing[0] && existing[0].currency !== input.currency) {
    // Les données existantes sont converties à parité fixe, ou le changement est refusé (aucun taux inventé).
    await changeCurrency(userId, existing[0].currency, input.currency);
  }

  const values = {
    ageRange: input.ageRange,
    country: input.country,
    currency: input.currency,
    timezone,
    employmentStatus: input.employmentStatus,
    incomeType: input.incomeType,
    monthlyIncome: input.monthlyIncome,
    fixedCharges: input.fixedCharges,
    variableExpenses: input.variableExpenses,
    debtTotal: input.debtTotal,
    debtMonthlyPayment: input.debtMonthlyPayment,
    currentSavings: input.currentSavings,
    dependents: input.dependents,
    goals: input.goals,
    investmentHorizon: input.investmentHorizon,
    riskAnswers: input.riskAnswers,
    riskScore: result.risk.score,
    riskTolerance: result.risk.tolerance,
    profileType: result.profileType,
    initialHealthScore: result.health.score,
    updatedAt: new Date(),
  };
  await db
    .insert(financialProfiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: financialProfiles.userId, set: values });

  if (input.createEmergencyGoal) {
    const already = await db
      .select({ id: savingsGoals.id })
      .from(savingsGoals)
      .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.type, 'fonds_urgence')))
      .limit(1);
    if (already.length === 0 && result.suggestedEmergencyTarget > 0) {
      const today = todayInTimezone(timezone);
      const target = roundUpTo(result.suggestedEmergencyTarget, CURRENCY_META[input.currency].granularity);
      await createGoal(
        userId,
        plan,
        input.currency,
        {
          name: "Fonds d'urgence",
          type: 'fonds_urgence',
          targetAmount: target,
          targetDate: `${addMonths(monthOf(today), 12)}-01`,
          plannedMonthly: null,
        },
        input.currentSavings > 0 ? { amount: Math.min(input.currentSavings, target), on: today } : null,
      );
    }
  }
  return result;
}

export async function updateTimezoneFromCountry(userId: string, country: CountryCode): Promise<void> {
  await db
    .update(financialProfiles)
    .set({ country, timezone: getCountry(country).timezone, updatedAt: new Date() })
    .where(eq(financialProfiles.userId, userId));
}
