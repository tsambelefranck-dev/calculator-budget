import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, lt } from 'drizzle-orm';
import { addMonths, dayOf, monthOf, sameDayInMonth, todayInTimezone } from '@/lib/finance/dates';
import { hashPassword } from '@/server/auth/password';
import { generateToken } from '@/server/auth/session';
import { db } from '@/server/db';
import {
  budgets,
  debtPayments,
  debts,
  expenses,
  financialProfiles,
  goalContributions,
  incomeSources,
  incomes,
  investmentMovements,
  investments,
  savingsGoals,
  users,
} from '@/server/db/schema';
import { listCategories } from './categories';

export const DEMO_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Crée un compte de démonstration isolé (`is_demo = true`) avec des données FICTIVES,
 * supprimé automatiquement après 24 h. Jamais mélangé aux comptes réels.
 */
export async function createDemoAccount(): Promise<{ userId: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + DEMO_DURATION_MS);
  const timezone = 'Africa/Douala';
  const today = todayInTimezone(timezone);
  const month = monthOf(today);
  const categories = new Map((await listCategories()).map((c) => [c.code, c.id]));
  const cat = (code: string) => categories.get(code)!;

  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: `demo-${randomUUID()}@demo.nexafi.invalid`,
        passwordHash: await hashPassword(generateToken()),
        name: 'Invité Démo',
        isDemo: true,
        demoExpiresAt: expiresAt,
        plan: 'premium',
        premiumUntil: expiresAt,
        aiDataConsent: true,
        aiConsentAt: new Date(),
      })
      .returning({ id: users.id });
    const userId = user!.id;
    const currency = 'XAF' as const;

    await tx.insert(financialProfiles).values({
      userId,
      ageRange: '25-34',
      country: 'CM',
      currency,
      timezone,
      employmentStatus: 'salarie',
      incomeType: 'mixte',
      monthlyIncome: 350000,
      fixedCharges: 135000,
      variableExpenses: 120000,
      debtTotal: 450000,
      debtMonthlyPayment: 30000,
      currentSavings: 180000,
      dependents: 2,
      goals: ['fonds_urgence', 'maison', 'entreprise'],
      investmentHorizon: 'moyen',
      riskAnswers: { lossReaction: 1, experience: 1, riskShare: 1 },
      riskScore: 4,
      riskTolerance: 'equilibre',
      profileType: 'debutant_financier',
      initialHealthScore: 58,
    });

    const [salary] = await tx
      .insert(incomeSources)
      .values({ userId, name: 'Salaire (démo)', type: 'salaire', isFixed: true, expectedAmount: 320000, currency, recurrence: 'monthly', payDay: 27 })
      .returning({ id: incomeSources.id });

    const expenseRows: (typeof expenses.$inferInsert)[] = [];
    const incomeRows: (typeof incomes.$inferInsert)[] = [];
    const pattern: [string, string, number, number][] = [
      ['logement', 'Loyer', 2, 90000],
      ['logement', 'Électricité et eau', 8, 18000],
      ['alimentation', 'Marché', 3, 28000],
      ['alimentation', 'Marché', 12, 25000],
      ['alimentation', 'Restaurant', 18, 15000],
      ['alimentation', 'Marché', 23, 24000],
      ['transport', 'Taxi et moto', 5, 12000],
      ['transport', 'Carburant', 15, 15000],
      ['communication', 'Forfait internet', 1, 10000],
      ['famille', 'Soutien parents', 6, 30000],
      ['education', 'Scolarité neveu', 9, 15000],
      ['loisirs', 'Sortie entre amis', 20, 12000],
      ['abonnements', 'Abonnement TV', 4, 6000],
      ['shopping', 'Vêtements', 14, 20000],
      ['sante', 'Pharmacie', 11, 8000],
    ];
    for (let back = 3; back >= 0; back -= 1) {
      const m = addMonths(month, -back);
      const isCurrent = back === 0;
      const lastDay = isCurrent ? dayOf(today) : 31;
      const factor = [1, 1.08, 0.95, 1.12][back] ?? 1;
      for (const [code, label, day, amount] of pattern) {
        if (day > lastDay) continue;
        const scaled = code === 'logement' || code === 'communication' || code === 'abonnements' ? amount : Math.round((amount * factor) / 500) * 500;
        expenseRows.push({ userId, categoryId: cat(code), amount: scaled, currency, spentOn: sameDayInMonth(day, m), label, paymentMethod: code === 'logement' ? 'virement' : 'mobile_money' });
      }
      if (!isCurrent) {
        incomeRows.push({ userId, sourceId: salary!.id, type: 'salaire', amount: 320000, currency, receivedOn: sameDayInMonth(27, m), label: 'Salaire (démo)' });
        incomeRows.push({ userId, sourceId: null, type: 'freelance', amount: back === 1 ? 45000 : 30000, currency, receivedOn: sameDayInMonth(15, m), label: 'Mission graphisme' });
      }
    }
    // Une dépense de loisirs en forte hausse ce mois-ci, pour illustrer les alertes.
    if (dayOf(today) >= 2) expenseRows.push({ userId, categoryId: cat('loisirs'), amount: 35000, currency, spentOn: sameDayInMonth(Math.min(2, dayOf(today)), month), label: 'Anniversaire', paymentMethod: 'especes' });
    await tx.insert(expenses).values(expenseRows);
    await tx.insert(incomes).values(incomeRows);

    for (const [code, amount] of [['logement', 110000], ['alimentation', 85000], ['transport', 30000], ['loisirs', 20000], ['shopping', 20000], ['famille', 35000]] as const) {
      await tx.insert(budgets).values({ userId, categoryId: cat(code), month, amount, currency });
    }

    const [emergency] = await tx
      .insert(savingsGoals)
      .values({ userId, name: "Fonds d'urgence", type: 'fonds_urgence', targetAmount: 750000, currency, targetDate: `${addMonths(month, 10)}-01` })
      .returning({ id: savingsGoals.id });
    const [land] = await tx
      .insert(savingsGoals)
      .values({ userId, name: 'Terrain à Yaoundé', type: 'maison', targetAmount: 3000000, currency, targetDate: `${addMonths(month, 30)}-01`, plannedMonthly: 40000 })
      .returning({ id: savingsGoals.id });
    const contributions: (typeof goalContributions.$inferInsert)[] = [
      { goalId: emergency!.id, userId, amount: 180000, contributedOn: sameDayInMonth(1, addMonths(month, -3)), note: 'Montant déjà épargné', isOpeningBalance: true },
      { goalId: land!.id, userId, amount: 250000, contributedOn: sameDayInMonth(1, addMonths(month, -3)), note: 'Montant déjà épargné', isOpeningBalance: true },
    ];
    for (let back = 3; back >= 1; back -= 1) {
      const m = addMonths(month, -back);
      contributions.push({ goalId: emergency!.id, userId, amount: 40000, contributedOn: sameDayInMonth(28, m) });
      contributions.push({ goalId: land!.id, userId, amount: 25000, contributedOn: sameDayInMonth(28, m) });
    }
    await tx.insert(goalContributions).values(contributions);

    const [microcredit] = await tx
      .insert(debts)
      .values({ userId, name: 'Microcrédit équipement', type: 'microfinance', lender: 'Institution de microfinance (fictive)', principal: 500000, initialBalance: 420000, currency, annualRateBp: 2400, minimumPayment: 25000, dueDay: 5, recordedOn: sameDayInMonth(1, addMonths(month, -3)) })
      .returning({ id: debts.id });
    const [family] = await tx
      .insert(debts)
      .values({ userId, name: 'Prêt de ma sœur', type: 'pret_familial', principal: 100000, initialBalance: 100000, currency, annualRateBp: 0, minimumPayment: 10000, dueDay: 30, recordedOn: sameDayInMonth(1, addMonths(month, -3)) })
      .returning({ id: debts.id });
    const payments: (typeof debtPayments.$inferInsert)[] = [];
    for (let back = 3; back >= 1; back -= 1) {
      const m = addMonths(month, -back);
      payments.push({ debtId: microcredit!.id, userId, amount: 25000, paidOn: sameDayInMonth(5, m) });
      payments.push({ debtId: family!.id, userId, amount: 10000, paidOn: sameDayInMonth(30, m) });
    }
    await tx.insert(debtPayments).values(payments);

    const [inv] = await tx
      .insert(investments)
      .values({ userId, name: 'Petit élevage de poulets (démo)', domain: 'agriculture', currentValue: 160000, valuedOn: today, currency })
      .returning({ id: investments.id });
    await tx.insert(investmentMovements).values({ investmentId: inv!.id, userId, amount: 150000, movedOn: sameDayInMonth(10, addMonths(month, -2)), note: 'Apport initial' });

    return { userId, expiresAt };
  });
}

/** Supprime les comptes de démonstration expirés (tâche planifiée). */
export async function purgeExpiredDemoAccounts(now = new Date()): Promise<number> {
  const rows = await db.delete(users).where(and(eq(users.isDemo, true), lt(users.demoExpiresAt, now))).returning({ id: users.id });
  return rows.length;
}

