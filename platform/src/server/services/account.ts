import 'server-only';
import { eq, sql } from 'drizzle-orm';
import type { CurrencyCode } from '@/lib/constants';
import { CURRENCY_META, canConvert, EUR_CFA_PARITY } from '@/lib/finance/money';
import { verifyPassword } from '@/server/auth/password';
import { db } from '@/server/db';
import {
  aiConversations,
  aiMessages,
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
  lessonProgress,
  monthlyReports,
  notifications,
  salaryPlanItems,
  salaryPlans,
  savingsGoals,
  subscriptions,
  users,
} from '@/server/db/schema';
import { BusinessRuleError } from './errors';
import { TRIAL_DAYS } from './entitlements';

async function userHasMoneyData(userId: string): Promise<boolean> {
  const result = await db.execute<{ has: boolean }>(sql`
    select exists(select 1 from ${incomes} where ${incomes.userId} = ${userId})
        or exists(select 1 from ${expenses} where ${expenses.userId} = ${userId})
        or exists(select 1 from ${savingsGoals} where ${savingsGoals.userId} = ${userId})
        or exists(select 1 from ${debts} where ${debts.userId} = ${userId})
        or exists(select 1 from ${investments} where ${investments.userId} = ${userId})
        or exists(select 1 from ${budgets} where ${budgets.userId} = ${userId})
        or exists(select 1 from ${incomeSources} where ${incomeSources.userId} = ${userId}) as has`);
  return Boolean(result.rows[0]?.has);
}

/**
 * Change la devise principale. Les montants existants sont convertis exactement entre EUR, XAF et XOF
 * (parité fixe). Avec le dollar, aucun taux n'est inventé : le changement n'est possible que sans données.
 */
export async function changeCurrency(userId: string, from: CurrencyCode, to: CurrencyCode): Promise<void> {
  if (from === to) return;
  const hasData = await userHasMoneyData(userId);
  if (hasData && !canConvert(from, to)) {
    throw new BusinessRuleError(
      'Impossible de convertir tes montants vers ou depuis le dollar sans taux de change vérifiable. Change de devise avant d’enregistrer des données, ou conserve ta devise actuelle.',
    );
  }
  const convertible = canConvert(from, to);
  // Facteur d'unités mineures `from` → `to`, calculé en numeric PostgreSQL (pas d'arrondi flottant).
  const factor = sql.raw(
    !convertible || ((from === 'XAF' || from === 'XOF') && (to === 'XAF' || to === 'XOF'))
      ? '1'
      : to === 'EUR'
        ? `(${10 ** CURRENCY_META.EUR.decimals}::numeric / ${EUR_CFA_PARITY})`
        : `(${EUR_CFA_PARITY}::numeric / ${10 ** CURRENCY_META.EUR.decimals})`,
  );
  const conv = (column: string) => sql.raw(`round(${column} * `).append(factor).append(sql.raw(')'));

  await db.transaction(async (tx) => {
    const target = sql`${to}`;
    if (!convertible) {
      // Aucune donnée à convertir : seule la devise du profil change (les montants déclarés seront ressaisis au diagnostic).
      await tx.update(financialProfiles).set({ currency: to, updatedAt: new Date() }).where(eq(financialProfiles.userId, userId));
      return;
    }
    await tx.execute(sql`update ${financialProfiles} set currency = ${target},
      monthly_income = ${conv('monthly_income')}, fixed_charges = ${conv('fixed_charges')}, variable_expenses = ${conv('variable_expenses')},
      debt_total = ${conv('debt_total')}, debt_monthly_payment = ${conv('debt_monthly_payment')}, current_savings = ${conv('current_savings')}
      where user_id = ${userId}`);
    if (!hasData) return;
    await tx.execute(sql`update ${incomeSources} set currency = ${target}, expected_amount = ${conv('expected_amount')} where user_id = ${userId}`);
    await tx.execute(sql`update ${incomes} set currency = ${target}, amount = greatest(1, ${conv('amount')}) where user_id = ${userId}`);
    await tx.execute(sql`update ${expenses} set currency = ${target}, amount = greatest(1, ${conv('amount')}) where user_id = ${userId}`);
    await tx.execute(sql`update ${budgets} set currency = ${target}, amount = ${conv('amount')} where user_id = ${userId}`);
    await tx.execute(sql`update ${savingsGoals} set currency = ${target}, target_amount = greatest(1, ${conv('target_amount')}), planned_monthly = ${conv('planned_monthly')} where user_id = ${userId}`);
    await tx.execute(sql`update ${goalContributions} set amount = ${conv('amount')} where user_id = ${userId}`);
    await tx.execute(sql`update ${debts} set currency = ${target}, principal = ${conv('principal')}, initial_balance = ${conv('initial_balance')}, minimum_payment = ${conv('minimum_payment')} where user_id = ${userId}`);
    await tx.execute(sql`update ${debtPayments} set amount = greatest(1, ${conv('amount')}) where user_id = ${userId}`);
    await tx.execute(sql`update ${investments} set currency = ${target}, current_value = ${conv('current_value')} where user_id = ${userId}`);
    await tx.execute(sql`update ${investmentMovements} set amount = ${conv('amount')} where user_id = ${userId}`);
    await tx.execute(sql`update ${salaryPlanItems} set amount = ${conv('amount')}, recommended_amount = ${conv('recommended_amount')}
      where plan_id in (select id from ${salaryPlans} where user_id = ${userId})`);
    await tx.execute(sql`update ${salaryPlans} set currency = ${target}, total_amount = ${conv('total_amount')} where user_id = ${userId}`);
    // Les rapports contiennent des montants figés : ils seront régénérés dans la nouvelle devise.
    await tx.delete(monthlyReports).where(eq(monthlyReports.userId, userId));
  });
}

export async function setAiConsent(userId: string, consent: boolean): Promise<void> {
  await db.update(users).set({ aiDataConsent: consent, aiConsentAt: consent ? new Date() : null, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateAccountName(userId: string, name: string): Promise<void> {
  await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateLocale(userId: string, locale: 'fr' | 'en'): Promise<void> {
  await db.update(users).set({ locale, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Démarre l'essai Premium (une seule fois par compte). */
export async function startPremiumTrial(userId: string): Promise<Date> {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) throw new BusinessRuleError('Compte introuvable.');
  if (user.trialUsedAt) throw new BusinessRuleError('Tu as déjà profité de l’essai gratuit.');
  if (user.plan === 'premium' && (!user.premiumUntil || user.premiumUntil > new Date())) throw new BusinessRuleError('Tu es déjà Premium.');
  const now = new Date();
  const until = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ plan: 'premium', premiumUntil: until, trialUsedAt: now, updatedAt: now }).where(eq(users.id, userId));
    await tx.insert(subscriptions).values({ userId, plan: 'premium', interval: 'trial', status: 'active', provider: 'trial', periodStart: now, periodEnd: until });
  });
  return until;
}

/** Export complet des données personnelles (format JSON lisible). */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      plan: users.plan,
      premiumUntil: users.premiumUntil,
      locale: users.locale,
      aiDataConsent: users.aiDataConsent,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  const [
    profile,
    sources,
    incomeRows,
    expenseRows,
    budgetRows,
    planRows,
    goalRows,
    contributionRows,
    debtRows,
    paymentRows,
    investmentRows,
    movementRows,
    reportRows,
    notificationRows,
    conversationRows,
    messageRows,
    progressRows,
    subscriptionRows,
  ] = await Promise.all([
    db.select().from(financialProfiles).where(eq(financialProfiles.userId, userId)),
    db.select().from(incomeSources).where(eq(incomeSources.userId, userId)),
    db.select().from(incomes).where(eq(incomes.userId, userId)),
    db.select().from(expenses).where(eq(expenses.userId, userId)),
    db.select().from(budgets).where(eq(budgets.userId, userId)),
    db.select().from(salaryPlans).where(eq(salaryPlans.userId, userId)),
    db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId)),
    db.select().from(goalContributions).where(eq(goalContributions.userId, userId)),
    db.select().from(debts).where(eq(debts.userId, userId)),
    db.select().from(debtPayments).where(eq(debtPayments.userId, userId)),
    db.select().from(investments).where(eq(investments.userId, userId)),
    db.select().from(investmentMovements).where(eq(investmentMovements.userId, userId)),
    db.select().from(monthlyReports).where(eq(monthlyReports.userId, userId)),
    db.select().from(notifications).where(eq(notifications.userId, userId)),
    db.select().from(aiConversations).where(eq(aiConversations.userId, userId)),
    db.select({ conversationId: aiMessages.conversationId, role: aiMessages.role, content: aiMessages.content, createdAt: aiMessages.createdAt }).from(aiMessages).where(eq(aiMessages.userId, userId)),
    db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
  ]);
  const planItems = planRows.length
    ? await db.execute(sql`select * from ${salaryPlanItems} where plan_id in (select id from ${salaryPlans} where user_id = ${userId})`)
    : { rows: [] };
  return {
    format: 'nexafi-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    note: 'Montants en unités mineures (1 = 1 FCFA pour XAF/XOF, 1 = 1 centime pour EUR/USD).',
    user,
    financialProfile: profile[0] ?? null,
    incomeSources: sources,
    incomes: incomeRows,
    expenses: expenseRows,
    budgets: budgetRows,
    salaryPlans: planRows,
    salaryPlanItems: planItems.rows,
    savingsGoals: goalRows,
    goalContributions: contributionRows,
    debts: debtRows,
    debtPayments: paymentRows,
    investments: investmentRows,
    investmentMovements: movementRows,
    monthlyReports: reportRows,
    notifications: notificationRows,
    aiConversations: conversationRows,
    aiMessages: messageRows,
    lessonProgress: progressRows,
    subscriptions: subscriptionRows,
  };
}

/** Suppression définitive du compte et de toutes les données (cascade). */
export async function deleteAccount(userId: string, password: string | null): Promise<{ ok: boolean }> {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) return { ok: false };
  if (!user.isDemo) {
    if (!password || !(await verifyPassword(user.passwordHash, password))) return { ok: false };
  }
  await db.delete(users).where(eq(users.id, userId));
  return { ok: true };
}
