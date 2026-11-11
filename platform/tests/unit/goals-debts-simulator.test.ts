import { describe, expect, it } from 'vitest';
import { compareStrategies, monthlyInterest, simulatePayoff, strategyOrder, type DebtInput } from '@/lib/finance/debts';
import { goalMetrics, monthsToReach, requiredMonthlyContribution } from '@/lib/finance/goals';
import { compareScenarios, simulateInvestment } from '@/lib/finance/simulator';

describe('objectifs d’épargne', () => {
  it('calcule contribution nécessaire et temps restant', () => {
    expect(requiredMonthlyContribution(1_000_000, 12)).toBe(83334);
    expect(monthsToReach(1_000_000, 100_000)).toBe(10);
    expect(monthsToReach(1_000_000, 0)).toBeNull();
    expect(monthsToReach(0, 0)).toBe(0);
  });

  it('suit la progression d’un objectif daté', () => {
    const m = goalMetrics({ target: 1_000_000, saved: 250_000, targetDate: '2027-11-09', today: '2026-11-09', monthlyContribution: 62_500 });
    expect(m.remaining).toBe(750_000);
    expect(m.progress).toBe(0.25);
    expect(m.monthsLeft).toBe(12);
    expect(m.requiredMonthly).toBe(62_500);
    expect(m.projectedMonths).toBe(12);
    expect(m.projectedMonth).toBe('2027-11');
    expect(m.status).toBe('dans_les_temps');
  });

  it('détecte retard, avance, absence de date et échéance dépassée', () => {
    const common = { target: 1_000_000, saved: 0, today: '2026-11-09' };
    expect(goalMetrics({ ...common, targetDate: '2027-11-09', monthlyContribution: 50_000 }).status).toBe('en_retard');
    expect(goalMetrics({ ...common, targetDate: '2027-11-09', monthlyContribution: 200_000 }).status).toBe('en_avance');
    expect(goalMetrics({ ...common, targetDate: '2027-11-09', monthlyContribution: null }).status).toBe('en_retard');
    expect(goalMetrics({ ...common, targetDate: null, monthlyContribution: 100_000 })).toMatchObject({ status: 'sans_date', projectedMonths: 10 });
    expect(goalMetrics({ ...common, targetDate: '2026-01-01', monthlyContribution: null })).toMatchObject({ status: 'echeance_depassee', requiredMonthly: 1_000_000 });
  });

  it('marque un objectif atteint', () => {
    const m = goalMetrics({ target: 500_000, saved: 600_000, targetDate: null, today: '2026-11-09', monthlyContribution: null });
    expect(m).toMatchObject({ status: 'atteint', remaining: 0, progress: 1 });
  });
});

describe('dettes', () => {
  it('calcule les intérêts mensuels', () => {
    expect(monthlyInterest(1_000_000, 2400)).toBe(20_000);
    expect(monthlyInterest(1_000_000, 0)).toBe(0);
  });

  it('rembourse une dette sans intérêt en ligne droite', () => {
    const sim = simulatePayoff([{ id: 'a', name: 'Famille', balance: 100_000, annualRateBp: 0, minimumPayment: 10_000 }], 'avalanche');
    expect(sim).toMatchObject({ feasible: true, months: 10, totalInterest: 0, totalPaid: 100_000 });
    expect(sim.payoffMonth.a).toBe(10);
  });

  const debts: DebtInput[] = [
    { id: 'chere', name: 'Microcrédit', balance: 200_000, annualRateBp: 3000, minimumPayment: 20_000 },
    { id: 'petite', name: 'Ami', balance: 50_000, annualRateBp: 1000, minimumPayment: 10_000 },
  ];

  it('ordonne selon la stratégie', () => {
    expect(strategyOrder(debts, 'avalanche')).toEqual(['chere', 'petite']);
    expect(strategyOrder(debts, 'snowball')).toEqual(['petite', 'chere']);
  });

  it('avalanche coûte moins d’intérêts que la boule de neige et que le minimum', () => {
    const cmp = compareStrategies(debts, 20_000);
    expect(cmp.avalanche.feasible).toBe(true);
    expect(cmp.snowball.feasible).toBe(true);
    expect(cmp.avalanche.totalInterest).toBeLessThanOrEqual(cmp.snowball.totalInterest);
    expect(cmp.avalanche.totalInterest).toBeLessThan(cmp.minimum.totalInterest);
    expect(cmp.avalanche.months).toBeLessThan(cmp.minimum.months);
    expect(cmp.interestSaved.avalanche).toBe(cmp.minimum.totalInterest - cmp.avalanche.totalInterest);
    // Boule de neige : la petite dette est soldée en premier.
    expect(cmp.snowball.payoffMonth.petite!).toBeLessThan(cmp.snowball.payoffMonth.chere!);
    // Le total payé = capital + intérêts.
    expect(cmp.avalanche.totalPaid).toBe(250_000 + cmp.avalanche.totalInterest);
  });

  it('détecte un remboursement impossible (mensualité < intérêts)', () => {
    const sim = simulatePayoff([{ id: 'x', name: 'Usure', balance: 1_000_000, annualRateBp: 3600, minimumPayment: 20_000 }], 'minimum');
    expect(sim.feasible).toBe(false);
  });

  it('reporte les mensualités libérées sur la dette suivante', () => {
    const withRollover = simulatePayoff(debts, 'snowball', 0);
    const minimumOnly = simulatePayoff(debts, 'minimum');
    expect(withRollover.months).toBeLessThan(minimumOnly.months);
  });
});

describe('simulateur d’investissement', () => {
  it('conserve le capital à 0 % et calcule la valeur réelle avec l’inflation', () => {
    const r = simulateInvestment({ initial: 500_000, monthly: 0, months: 36, annualRatePct: 0, annualFeePct: 0, inflationPct: 3 });
    expect(r.finalValue).toBe(500_000);
    expect(r.totalGains).toBe(0);
    expect(r.finalRealValue).toBe(Math.round(500_000 / 1.03 ** 3));
    expect(r.yearly).toHaveLength(3);
  });

  it('applique un taux annuel effectif', () => {
    const r = simulateInvestment({ initial: 500_000, monthly: 0, months: 12, annualRatePct: 12, annualFeePct: 0, inflationPct: 0 });
    expect(r.finalValue).toBe(560_000);
  });

  it('additionne les versements mensuels', () => {
    const r = simulateInvestment({ initial: 100_000, monthly: 10_000, months: 12, annualRatePct: 0, annualFeePct: 0, inflationPct: 0 });
    expect(r.totalContributed).toBe(220_000);
    expect(r.finalValue).toBe(220_000);
  });

  it('déduit les frais', () => {
    const r = simulateInvestment({ initial: 1_000_000, monthly: 0, months: 12, annualRatePct: 0, annualFeePct: 2, inflationPct: 0 });
    expect(r.finalValue).toBeLessThan(1_000_000);
    expect(r.totalFees).toBe(1_000_000 - r.finalValue);
  });

  it('modélise une perte (scénario pessimiste)', () => {
    const r = simulateInvestment({ initial: 500_000, monthly: 0, months: 12, annualRatePct: -30, annualFeePct: 0, inflationPct: 0 });
    expect(r.finalValue).toBe(350_000);
    expect(r.totalGains).toBe(-150_000);
  });

  it('compare des scénarios à une épargne sans rendement', () => {
    const cmp = compareScenarios(
      { initial: 500_000, monthly: 20_000, months: 36, annualFeePct: 0, inflationPct: 3 },
      [
        { key: 'pessimiste', label: 'Pessimiste', annualRatePct: -5 },
        { key: 'intermediaire', label: 'Intermédiaire', annualRatePct: 4 },
        { key: 'optimiste', label: 'Optimiste', annualRatePct: 9 },
      ],
    );
    expect(cmp.baseline.finalValue).toBe(500_000 + 20_000 * 36);
    const [pess, mid, opt] = cmp.scenarios;
    expect(pess!.result.finalValue).toBeLessThan(cmp.baseline.finalValue);
    expect(mid!.result.finalValue).toBeGreaterThan(cmp.baseline.finalValue);
    expect(opt!.result.finalValue).toBeGreaterThan(mid!.result.finalValue);
  });
});
