import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { OnboardingWizard, type OnboardingDefaults } from '@/components/onboarding/onboarding-wizard';
import { getProfile, requireUser } from '@/server/auth/current';

export const metadata: Metadata = { title: 'Diagnostic financier' };

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const defaults: OnboardingDefaults = profile
    ? {
        ageRange: profile.ageRange,
        country: profile.country,
        currency: profile.currency,
        employmentStatus: profile.employmentStatus,
        incomeType: profile.incomeType,
        dependents: profile.dependents,
        monthlyIncome: profile.monthlyIncome,
        fixedCharges: profile.fixedCharges,
        variableExpenses: profile.variableExpenses,
        debtTotal: profile.debtTotal,
        debtMonthlyPayment: profile.debtMonthlyPayment,
        currentSavings: profile.currentSavings,
        goals: profile.goals,
        investmentHorizon: profile.investmentHorizon,
        lossReaction: profile.riskAnswers.lossReaction,
        experience: profile.riskAnswers.experience,
        riskShare: profile.riskAnswers.riskShare,
      }
    : {};
  return (
    <div className="min-h-dvh px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center justify-between">
          <Logo />
          {profile ? (
            <Link href="/app" className="text-sm font-medium text-primary-ink hover:underline">
              Retour au tableau de bord
            </Link>
          ) : null}
        </div>
        <OnboardingWizard defaults={defaults} userName={user.name.split(' ')[0] ?? user.name} />
      </div>
    </div>
  );
}
