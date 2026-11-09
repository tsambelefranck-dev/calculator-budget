import { describe, expect, it } from 'vitest';
import {
  addMonths,
  daysInMonth,
  isValidDateKey,
  isValidMonthKey,
  lastMonths,
  listMonths,
  monthRange,
  monthsUntil,
  sameDayInMonth,
  todayInTimezone,
} from '@/lib/finance/dates';
import { computeHealthScore, levelForScore } from '@/lib/finance/health';
import { computeRiskProfile, diagnose, type DiagnosticInput } from '@/lib/finance/profile';

describe('dates', () => {
  it('ajoute des mois en franchissant les années', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-11', -23)).toBe('2024-12');
  });

  it('calcule les bornes et les listes de mois', () => {
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
    expect(listMonths('2026-10', '2027-01')).toEqual(['2026-10', '2026-11', '2026-12', '2027-01']);
    expect(lastMonths('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-02')).toBe(28);
    expect(sameDayInMonth(31, '2026-02')).toBe('2026-02-28');
  });

  it('valide les clés de date', () => {
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('2026-02-28')).toBe(true);
    expect(isValidMonthKey('2026-13')).toBe(false);
    expect(isValidMonthKey('2026-12')).toBe(true);
  });

  it('compte les mois restants (mois entamé = mois entier)', () => {
    expect(monthsUntil('2026-11-09', '2027-02-09')).toBe(3);
    expect(monthsUntil('2026-11-09', '2027-02-10')).toBe(4);
    expect(monthsUntil('2026-11-09', '2026-11-20')).toBe(1);
    expect(monthsUntil('2026-11-09', '2026-11-09')).toBe(0);
    expect(monthsUntil('2026-11-09', '2025-01-01')).toBe(0);
  });

  it('calcule la date du jour dans le fuseau de l’utilisateur', () => {
    const lateEvening = new Date('2026-11-09T23:30:00Z');
    expect(todayInTimezone('Africa/Douala', lateEvening)).toBe('2026-11-10');
    expect(todayInTimezone('Africa/Abidjan', lateEvening)).toBe('2026-11-09');
    expect(todayInTimezone('Fuseau/Inexistant', lateEvening)).toBe('2026-11-09');
  });
});

describe('santé financière', () => {
  it('donne 100 à une situation exemplaire', () => {
    const result = computeHealthScore({
      income: 500000,
      expenses: 250000,
      debtPayments: 0,
      emergencyFund: 900000,
      essentialMonthly: 250000,
      irregularIncome: false,
      budgetAdherence: 1,
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe('excellente');
    expect(result.tips).toHaveLength(0);
  });

  it('signale les données insuffisantes sans revenu', () => {
    const result = computeHealthScore({
      income: 0,
      expenses: 10000,
      debtPayments: 0,
      emergencyFund: 0,
      essentialMonthly: 0,
      irregularIncome: false,
      budgetAdherence: null,
    });
    expect(result.score).toBeNull();
    expect(result.level).toBe('inconnu');
  });

  it('pénalise le déficit, l’absence d’épargne et les dettes lourdes', () => {
    const result = computeHealthScore({
      income: 300000,
      expenses: 300000,
      debtPayments: 120000,
      emergencyFund: 0,
      essentialMonthly: 250000,
      irregularIncome: true,
      budgetAdherence: null,
    });
    expect(result.score).toBe(0);
    expect(result.level).toBe('fragile');
    expect(result.tips.length).toBeGreaterThan(0);
  });

  it('normalise sur les composantes disponibles', () => {
    const withoutBudgets = computeHealthScore({
      income: 400000,
      expenses: 280000,
      debtPayments: 0,
      emergencyFund: 840000,
      essentialMonthly: 280000,
      irregularIncome: false,
      budgetAdherence: null,
    });
    // épargne 30 % (25/25), urgence 3 mois (25/25), dettes (20/20), dépenses 70 % (15/15) → 100
    expect(withoutBudgets.score).toBe(100);
    expect(withoutBudgets.components).toHaveLength(4);
  });

  it('associe un niveau à chaque score', () => {
    expect(levelForScore(39)).toBe('fragile');
    expect(levelForScore(40)).toBe('a_consolider');
    expect(levelForScore(60)).toBe('bonne');
    expect(levelForScore(80)).toBe('excellente');
  });
});

const baseProfile: DiagnosticInput = {
  employmentStatus: 'salarie',
  incomeType: 'fixe',
  monthlyIncome: 300000,
  fixedCharges: 120000,
  variableExpenses: 100000,
  debtTotal: 0,
  debtMonthlyPayment: 0,
  currentSavings: 100000,
  dependents: 1,
  goals: ['fonds_urgence'],
  investmentHorizon: 'moyen',
  riskAnswers: { lossReaction: 1, experience: 1, riskShare: 1 },
};

describe('profil de risque', () => {
  it('classe prudent / équilibré / dynamique', () => {
    expect(computeRiskProfile({ lossReaction: 0, experience: 0, riskShare: 0 }, 'court', 'fixe').tolerance).toBe('prudent');
    expect(computeRiskProfile({ lossReaction: 1, experience: 1, riskShare: 1 }, 'moyen', 'fixe').tolerance).toBe('equilibre');
    expect(computeRiskProfile({ lossReaction: 2, experience: 2, riskShare: 2 }, 'long', 'fixe')).toEqual({ score: 8, tolerance: 'dynamique' });
  });

  it('réduit le score pour des revenus variables', () => {
    expect(computeRiskProfile({ lossReaction: 2, experience: 2, riskShare: 2 }, 'court', 'variable').score).toBe(5);
  });
});

describe('diagnostic', () => {
  it('identifie un débutant financier', () => {
    const result = diagnose(baseProfile);
    expect(result.profileType).toBe('debutant_financier');
    expect(result.metrics.monthlyMargin).toBe(80000);
    expect(result.suggestedEmergencyTarget).toBe(660000);
    expect(result.priorities.length).toBeGreaterThan(0);
    expect(result.health.score).not.toBeNull();
  });

  it('identifie un dépensier à accompagner', () => {
    expect(diagnose({ ...baseProfile, variableExpenses: 170000 }).profileType).toBe('depensier_a_accompagner');
  });

  it('identifie une situation de désendettement', () => {
    expect(diagnose({ ...baseProfile, debtTotal: 2_500_000, debtMonthlyPayment: 60000, variableExpenses: 60000 }).profileType).toBe(
      'en_desendettement',
    );
  });

  it('identifie un entrepreneur à revenus irréguliers', () => {
    const result = diagnose({ ...baseProfile, employmentStatus: 'commercant', incomeType: 'variable' });
    expect(result.profileType).toBe('entrepreneur_revenus_irreguliers');
    expect(result.suggestedEmergencyTarget).toBe(1_320_000); // 6 mois
  });

  it('identifie un investisseur débutant', () => {
    const result = diagnose({
      ...baseProfile,
      currentSavings: 900000,
      investmentHorizon: 'long',
      riskAnswers: { lossReaction: 1, experience: 2, riskShare: 1 },
    });
    expect(result.profileType).toBe('investisseur_debutant');
  });

  it('identifie un épargnant prudent', () => {
    const result = diagnose({
      ...baseProfile,
      investmentHorizon: 'court',
      riskAnswers: { lossReaction: 0, experience: 1, riskShare: 0 },
    });
    expect(result.profileType).toBe('epargnant_prudent');
  });

  it('identifie un étudiant', () => {
    expect(diagnose({ ...baseProfile, employmentStatus: 'etudiant', monthlyIncome: 60000, fixedCharges: 20000, variableExpenses: 25000 }).profileType).toBe(
      'etudiant_batisseur',
    );
  });
});
