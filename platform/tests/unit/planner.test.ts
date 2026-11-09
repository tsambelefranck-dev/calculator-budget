import { describe, expect, it } from 'vitest';
import type { PlannerBucket } from '@/lib/constants';
import {
  distributeWithCaps,
  generateSalaryPlan,
  splitBucketAcrossCategories,
  validateCustomAllocation,
  type PlannerInput,
} from '@/lib/finance/planner';

const base: PlannerInput = {
  amount: 300000,
  currency: 'XAF',
  needs: { logement: 90000, essentiels: 65000, famille: 35000, plaisir: 20000 },
  needsSource: 'historique',
  debts: [],
  emergency: { balance: 0, target: 570000 },
  essentialMonthly: 190000,
  goals: [],
  riskTolerance: 'equilibre',
  incomeType: 'fixe',
};

const amountOf = (plan: ReturnType<typeof generateSalaryPlan>, bucket: PlannerBucket) =>
  plan.items.find((i) => i.bucket === bucket)?.amount ?? 0;
const total = (plan: ReturnType<typeof generateSalaryPlan>) => plan.items.reduce((s, i) => s + i.amount, 0);

/** Générateur pseudo-aléatoire déterministe (tests reproductibles). */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('planificateur de salaire', () => {
  it('répartit exactement le salaire de l’exemple (300 000 FCFA)', () => {
    const plan = generateSalaryPlan(base);
    expect(total(plan)).toBe(300000);
    expect(plan.status).toBe('ok');
    expect(amountOf(plan, 'logement')).toBe(90000);
    expect(amountOf(plan, 'essentiels')).toBe(65000);
    expect(amountOf(plan, 'famille')).toBe(35000);
    // Pas de fonds d'urgence : il devient la priorité, pas d'investissement.
    expect(amountOf(plan, 'urgence')).toBeGreaterThan(amountOf(plan, 'plaisir'));
    expect(amountOf(plan, 'investissement')).toBe(0);
    expect(plan.emergency.targetMonths).toBe(3);
    expect(plan.emergency.monthsToTarget).toBeGreaterThan(0);
    // Montants lisibles (multiples de 500 FCFA), la marge absorbe les arrondis.
    for (const item of plan.items.filter((i) => i.bucket !== 'marge')) expect(item.amount % 500).toBe(0);
    for (const item of plan.items) expect(item.rationale.length).toBeGreaterThan(10);
  });

  it('arrondit les besoins au pas supérieur', () => {
    const plan = generateSalaryPlan({ ...base, needs: { ...base.needs, logement: 87300 } });
    expect(amountOf(plan, 'logement')).toBe(87500);
    expect(total(plan)).toBe(300000);
  });

  it('investit selon le profil une fois les fondations posées', () => {
    const solid = { ...base, emergency: { balance: 600000, target: 570000 } };
    const prudent = generateSalaryPlan({ ...solid, riskTolerance: 'prudent' });
    const dynamic = generateSalaryPlan({ ...solid, riskTolerance: 'dynamique' });
    expect(amountOf(prudent, 'urgence')).toBe(0);
    expect(amountOf(prudent, 'investissement')).toBeGreaterThan(0);
    expect(amountOf(dynamic, 'investissement')).toBeGreaterThan(amountOf(prudent, 'investissement'));
    expect(total(prudent)).toBe(300000);
    expect(total(dynamic)).toBe(300000);
  });

  it('accélère le remboursement des dettes chères et n’investit pas', () => {
    const plan = generateSalaryPlan({
      ...base,
      emergency: { balance: 600000, target: 570000 },
      debts: [{ id: 'd1', name: 'Microcrédit', balance: 400000, annualRateBp: 2400, minimumPayment: 25000 }],
    });
    expect(amountOf(plan, 'dettes')).toBeGreaterThan(25000);
    expect(amountOf(plan, 'investissement')).toBe(0);
    expect(plan.items.find((i) => i.bucket === 'dettes')?.rationale).toContain('avalanche');
    expect(total(plan)).toBe(300000);
  });

  it('ne verse que la mensualité minimale pour une dette sans intérêt', () => {
    const plan = generateSalaryPlan({
      ...base,
      debts: [{ id: 'd1', name: 'Prêt familial', balance: 200000, annualRateBp: 0, minimumPayment: 20000 }],
    });
    expect(amountOf(plan, 'dettes')).toBe(20000);
  });

  it('élargit la marge et le fonds d’urgence pour des revenus irréguliers', () => {
    const fixed = generateSalaryPlan(base);
    const irregular = generateSalaryPlan({ ...base, incomeType: 'variable' });
    expect(irregular.emergency.targetMonths).toBe(6);
    expect(amountOf(irregular, 'marge')).toBeGreaterThanOrEqual(amountOf(fixed, 'marge'));
  });

  it('finance les objectifs à hauteur des contributions nécessaires', () => {
    const plan = generateSalaryPlan({
      ...base,
      emergency: { balance: 600000, target: 570000 },
      goals: [{ id: 'g1', name: 'Voiture', remaining: 2_000_000, requiredMonthly: 30000 }],
    });
    expect(amountOf(plan, 'objectifs')).toBeGreaterThanOrEqual(29500);
    expect(amountOf(plan, 'objectifs')).toBeLessThanOrEqual(30000);
  });

  it('bascule en plan de crise quand les besoins dépassent le revenu', () => {
    const plan = generateSalaryPlan({
      ...base,
      amount: 150000,
      debts: [{ id: 'd1', name: 'Crédit', balance: 500000, annualRateBp: 1800, minimumPayment: 30000 }],
    });
    expect(plan.status).toBe('deficit');
    expect(plan.shortfall).toBe(90000 + 65000 + 35000 + 30000 - 150000);
    expect(total(plan)).toBe(150000);
    expect(amountOf(plan, 'logement')).toBe(90000);
    expect(amountOf(plan, 'dettes')).toBe(30000);
    expect(amountOf(plan, 'urgence')).toBe(0);
    expect(amountOf(plan, 'investissement')).toBe(0);
    expect(plan.notes.length).toBeGreaterThan(0);
  });

  it('signale un budget serré', () => {
    const plan = generateSalaryPlan({ ...base, amount: 200000 });
    expect(plan.status).toBe('serre');
    expect(total(plan)).toBe(200000);
  });

  it('gère l’euro (centimes)', () => {
    const plan = generateSalaryPlan({
      ...base,
      currency: 'EUR',
      amount: 215050,
      needs: { logement: 80000, essentiels: 50025, famille: 10000, plaisir: 10000 },
      emergency: { balance: 0, target: 420000 },
      essentialMonthly: 140025,
    });
    expect(total(plan)).toBe(215050);
    expect(amountOf(plan, 'essentiels')).toBe(50100);
  });

  it('refuse un montant nul', () => {
    expect(() => generateSalaryPlan({ ...base, amount: 0 })).toThrow();
  });

  it('respecte les invariants sur 500 situations aléatoires', () => {
    const random = rng(42);
    const risks = ['prudent', 'equilibre', 'dynamique'] as const;
    const incomes = ['fixe', 'variable', 'mixte'] as const;
    for (let i = 0; i < 500; i += 1) {
      const amount = Math.round(20000 + random() * 2_000_000);
      const input: PlannerInput = {
        amount,
        currency: random() > 0.8 ? 'EUR' : 'XOF',
        needs: {
          logement: Math.round(random() * amount * 0.5),
          essentiels: Math.round(random() * amount * 0.5),
          famille: Math.round(random() * amount * 0.3),
          plaisir: Math.round(random() * amount * 0.2),
        },
        needsSource: random() > 0.5 ? 'historique' : 'declaratif',
        debts:
          random() > 0.5
            ? [{ id: 'a', name: 'Dette', balance: Math.round(random() * amount * 3), annualRateBp: Math.round(random() * 3600), minimumPayment: Math.round(random() * amount * 0.3) }]
            : [],
        emergency: { balance: Math.round(random() * amount * 4), target: Math.round(amount * 2) },
        essentialMonthly: Math.max(1, Math.round(random() * amount)),
        goals:
          random() > 0.5 ? [{ id: 'g', name: 'Projet', remaining: Math.round(random() * amount * 10), requiredMonthly: Math.round(random() * amount * 0.4) }] : [],
        riskTolerance: risks[Math.floor(random() * 3)]!,
        incomeType: incomes[Math.floor(random() * 3)]!,
      };
      const plan = generateSalaryPlan(input);
      expect(total(plan)).toBe(amount);
      for (const item of plan.items) {
        expect(item.amount).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(item.amount)).toBe(true);
      }
      if (plan.status === 'deficit') {
        expect(amountOf(plan, 'urgence') + amountOf(plan, 'investissement') + amountOf(plan, 'plaisir')).toBe(0);
      }
    }
  });
});

describe('outils du planificateur', () => {
  it('répartit avec plafonds et redistribue l’excédent', () => {
    const result = distributeWithCaps(1000, { urgence: 50, plaisir: 50 }, { urgence: 100 });
    expect(result.urgence).toBeCloseTo(100);
    expect(result.plaisir).toBeCloseTo(900);
  });

  it('envoie le reste à la marge quand tout est plafonné', () => {
    const result = distributeWithCaps(1000, { urgence: 1, plaisir: 1 }, { urgence: 100, plaisir: 100 });
    expect(result.marge).toBeCloseTo(800);
  });

  it('valide une répartition personnalisée', () => {
    expect(validateCustomAllocation(1000, { a: 600, b: 400 })).toEqual({ ok: true, difference: 0 });
    expect(validateCustomAllocation(1000, { a: 600, b: 300 })).toEqual({ ok: false, difference: 100 });
  });

  it('répartit une enveloppe entre catégories au prorata de l’historique', () => {
    const split = splitBucketAcrossCategories(
      65000,
      [
        { categoryId: 'alim', historical: 40000 },
        { categoryId: 'transport', historical: 15000 },
        { categoryId: 'tel', historical: 5000 },
      ],
      500,
    );
    expect(Object.values(split).reduce((a, b) => a + b, 0)).toBe(65000);
    expect(split.alim).toBe(43000);
    expect(split.transport).toBe(16000);
  });

  it('répartit équitablement sans historique', () => {
    const split = splitBucketAcrossCategories(10000, [{ categoryId: 'a', historical: 0 }, { categoryId: 'b', historical: 0 }], 500);
    expect(split).toEqual({ a: 5000, b: 5000 });
  });
});
