import { describe, expect, it } from 'vitest';
import { computeHealthScore } from '@/lib/finance/health';
import { detectInsights, type CategorySpend } from '@/lib/finance/insights';
import { buildMonthlyReport, nextSavingsTarget } from '@/lib/finance/report';

const plain = (s: string) => s.replace(/[  ]/g, ' ');

function cat(partial: Partial<CategorySpend> & Pick<CategorySpend, 'code' | 'name'>): CategorySpend {
  return { categoryId: partial.code, isEssential: true, current: 0, previous: 0, average3: null, budget: null, ...partial };
}

describe('détection des dépenses excessives', () => {
  it('reproduit l’exemple du cahier des charges (hausse de 35 %)', () => {
    const insights = detectInsights({
      currency: 'XAF',
      income: 400000,
      expenses: 250000,
      debtPayments: 0,
      partialMonth: false,
      categories: [cat({ code: 'alimentation', name: 'Alimentation', current: 85000, previous: 63000 })],
    });
    const hausse = insights.find((i) => i.kind === 'hausse');
    expect(hausse).toBeDefined();
    expect(plain(hausse!.message)).toBe(
      'Tu as dépensé 85 000 FCFA en alimentation ce mois-ci, soit 35 % de plus que le mois précédent. Tu pourrais économiser environ 22 000 FCFA en revenant à ton niveau habituel.',
    );
    expect(hausse!.potentialSavings).toBe(22000);
  });

  it('ignore les petites variations', () => {
    const insights = detectInsights({
      currency: 'XAF',
      income: 400000,
      expenses: 10000,
      debtPayments: 0,
      partialMonth: false,
      categories: [cat({ code: 'loisirs', name: 'Loisirs', isEssential: false, current: 3000, previous: 1000 })],
    });
    expect(insights.find((i) => i.kind === 'hausse')).toBeUndefined();
  });

  it('signale dépassement et budget presque épuisé, alertes d’abord', () => {
    const insights = detectInsights({
      currency: 'XOF',
      income: 300000,
      expenses: 150000,
      debtPayments: 0,
      partialMonth: true,
      categories: [
        cat({ code: 'transport', name: 'Transport', current: 28000, budget: 30000 }),
        cat({ code: 'shopping', name: 'Shopping', isEssential: false, current: 45000, budget: 30000 }),
      ],
    });
    expect(insights[0]!.kind).toBe('depassement');
    expect(insights[0]!.potentialSavings).toBe(15000);
    expect(insights.some((i) => i.kind === 'proche_budget' && i.categoryCode === 'transport')).toBe(true);
  });

  it('signale les dépenses non essentielles élevées et le déficit', () => {
    const insights = detectInsights({
      currency: 'XAF',
      income: 200000,
      expenses: 230000,
      debtPayments: 0,
      partialMonth: false,
      categories: [cat({ code: 'loisirs', name: 'Loisirs', isEssential: false, current: 80000 })],
    });
    expect(insights.map((i) => i.kind)).toEqual(expect.arrayContaining(['deficit', 'non_essentiel']));
    expect(insights.find((i) => i.kind === 'non_essentiel')!.potentialSavings).toBe(16000);
  });

  it('félicite une baisse significative', () => {
    const insights = detectInsights({
      currency: 'XAF',
      income: 300000,
      expenses: 100000,
      debtPayments: 0,
      partialMonth: false,
      categories: [cat({ code: 'loisirs', name: 'Loisirs', isEssential: false, current: 10000, previous: 40000 })],
    });
    expect(insights.find((i) => i.kind === 'baisse')?.severity).toBe('positif');
  });
});

describe('rapport mensuel', () => {
  const health = computeHealthScore({
    income: 300000,
    expenses: 270000,
    debtPayments: 0,
    emergencyFund: 50000,
    essentialMonthly: 200000,
    irregularIncome: false,
    budgetAdherence: 0.5,
  });

  it('produit le résumé de l’exemple (10 % → viser 15 %)', () => {
    const report = buildMonthlyReport({
      month: '2026-10',
      currency: 'XAF',
      totals: { income: 300000, expenses: 270000, savings: 20000, investments: 0, debtPayments: 0 },
      previousTotals: { income: 300000, expenses: 285000, savings: 0, investments: 0, debtPayments: 0 },
      categories: [
        cat({ code: 'alimentation', name: 'Alimentation', current: 120000, previous: 100000, budget: 100000, average3: 98000 }),
        cat({ code: 'logement', name: 'Logement', current: 90000, previous: 90000, budget: 90000 }),
        cat({ code: 'loisirs', name: 'Loisirs', isEssential: false, current: 60000, previous: 95000, budget: 70000 }),
      ],
      goals: [{ name: "Fonds d'urgence", target: 600000, saved: 50000, contributedThisMonth: 20000 }],
      health,
      emergencyMonths: 0.25,
      hasHighInterestDebt: false,
    });
    expect(plain(report.headline)).toBe(
      'En octobre 2026, tu as reçu 300 000 FCFA et dépensé 270 000 FCFA. Ton taux d’épargne est de 10 %. Tu pourrais viser 15 % le mois prochain en réduisant certaines dépenses non essentielles.',
    );
    expect(report.savingsRate).toBeCloseTo(0.1);
    expect(report.previousSavingsRate).toBeCloseTo(0.05);
    expect(report.comparison.savingsRateChange).toBeCloseTo(0.05);
    expect(report.balance).toBe(10000);
    expect(report.positives.some((p) => p.includes('progresse'))).toBe(true);
    expect(report.mistakes.some((m) => m.includes('Budget Alimentation dépassé'))).toBe(true);
    expect(report.recommendations[0]).toContain('15 %');
    expect(report.recommendations.some((r) => r.includes('fonds d’urgence'))).toBe(true);
    expect(report.topCategories[0]!.name).toBe('Alimentation');
    expect(report.goals[0]!.progress).toBeCloseTo(50000 / 600000);
  });

  it('gère un mois vide', () => {
    const report = buildMonthlyReport({
      month: '2026-09',
      currency: 'XAF',
      totals: { income: 0, expenses: 0, savings: 0, investments: 0, debtPayments: 0 },
      previousTotals: null,
      categories: [],
      goals: [],
      health,
      emergencyMonths: 0,
      hasHighInterestDebt: false,
    });
    expect(report.headline).toBe('Aucune opération enregistrée en septembre 2026.');
    expect(report.comparison.incomeChange).toBeNull();
  });

  it('calcule l’objectif d’épargne suivant', () => {
    expect(nextSavingsTarget(0)).toBe(0.05);
    expect(nextSavingsTarget(0.05)).toBe(0.1);
    expect(nextSavingsTarget(0.1)).toBe(0.15);
    expect(nextSavingsTarget(0.12)).toBe(0.15);
    expect(nextSavingsTarget(-0.2)).toBe(0.05);
  });
});
