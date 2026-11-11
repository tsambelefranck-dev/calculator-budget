import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { financialProfiles } from '@/server/db/schema';
import { registerUser } from '@/server/services/auth';
import { saveOnboarding, type OnboardingInput } from '@/server/services/profile';

export const baseOnboarding: OnboardingInput = {
  ageRange: '25-34',
  country: 'CM',
  currency: 'XAF',
  employmentStatus: 'salarie',
  incomeType: 'fixe',
  monthlyIncome: 300000,
  fixedCharges: 120000,
  variableExpenses: 100000,
  debtTotal: 0,
  debtMonthlyPayment: 0,
  currentSavings: 60000,
  dependents: 1,
  goals: ['fonds_urgence'],
  investmentHorizon: 'moyen',
  riskAnswers: { lossReaction: 1, experience: 1, riskShare: 1 },
  createEmergencyGoal: true,
};

export async function createTestUser(overrides: Partial<OnboardingInput> = {}) {
  const user = await registerUser({ name: 'Test', email: `u-${randomUUID()}@example.com`, password: 'une phrase solide 2026' });
  await saveOnboarding(user.id, 'free', { ...baseOnboarding, ...overrides });
  const [profile] = await db.select().from(financialProfiles).where(eq(financialProfiles.userId, user.id));
  return { user, profile: profile! };
}
