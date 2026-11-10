import 'server-only';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { addMonths, monthOf, todayInTimezone, type MonthKey } from '@/lib/finance/dates';
import { computeHealthScore } from '@/lib/finance/health';
import { buildMonthlyReport, type MonthlyReportData } from '@/lib/finance/report';
import type { FinancialProfile } from '@/server/auth/current';
import { db } from '@/server/db';
import { financialProfiles, monthlyReports, users } from '@/server/db/schema';
import { budgetAdherence, getBucketNeeds, getCategorySpends, getMonthTotals, goalsSnapshotForMonth, hasHighInterestDebt } from './analytics';
import { emergencyFundBalance } from './goals';
import { notify } from './notifications';

export type MonthlyReportRow = typeof monthlyReports.$inferSelect;

/** Calcule les données (déterministes) du rapport d'un mois. */
export async function buildReportData(userId: string, profile: FinancialProfile, month: MonthKey): Promise<MonthlyReportData> {
  const today = todayInTimezone(profile.timezone);
  const [totals, previousTotals, categoryData, goals, emergencyFund, needs, adherence, highInterest] = await Promise.all([
    getMonthTotals(userId, month),
    getMonthTotals(userId, addMonths(month, -1)),
    getCategorySpends(userId, month, today),
    goalsSnapshotForMonth(userId, month),
    emergencyFundBalance(userId),
    getBucketNeeds(userId, profile, monthOf(today)),
    budgetAdherence(userId, month),
    hasHighInterestDebt(userId),
  ]);
  const essentialMonthly = needs.essentialMonthly > 0 ? needs.essentialMonthly : profile.fixedCharges + profile.variableExpenses;
  const health = computeHealthScore({
    income: totals.income,
    expenses: totals.expenses,
    debtPayments: totals.debtPayments,
    emergencyFund,
    essentialMonthly,
    irregularIncome: profile.incomeType !== 'fixe',
    budgetAdherence: adherence,
  });
  const hasPrevious = Object.values(previousTotals).some((v) => v !== 0);
  return buildMonthlyReport({
    month,
    currency: profile.currency,
    totals,
    previousTotals: hasPrevious ? previousTotals : null,
    categories: categoryData.spends,
    goals,
    health,
    emergencyMonths: essentialMonthly > 0 ? emergencyFund / essentialMonthly : 0,
    hasHighInterestDebt: highInterest,
  });
}

export async function getStoredReport(userId: string, month: MonthKey): Promise<MonthlyReportRow | null> {
  const rows = await db.select().from(monthlyReports).where(and(eq(monthlyReports.userId, userId), eq(monthlyReports.month, month))).limit(1);
  return rows[0] ?? null;
}

/** Génère et enregistre le rapport d'un mois terminé (l'analyse IA existante est conservée sauf régénération). */
export async function generateAndStoreReport(
  userId: string,
  profile: FinancialProfile,
  month: MonthKey,
  generatedBy: 'auto' | 'manual' = 'manual',
): Promise<MonthlyReportRow> {
  const data = await buildReportData(userId, profile, month);
  const [row] = await db
    .insert(monthlyReports)
    .values({ userId, month, data: data as unknown as Record<string, unknown>, generatedBy })
    .onConflictDoUpdate({
      target: [monthlyReports.userId, monthlyReports.month],
      set: { data: data as unknown as Record<string, unknown>, generatedAt: new Date(), generatedBy, aiSummary: null, aiModel: null, aiGeneratedAt: null },
    })
    .returning();
  return row!;
}

export async function listStoredReports(userId: string): Promise<Pick<MonthlyReportRow, 'month' | 'generatedAt' | 'aiSummary'>[]> {
  return db
    .select({ month: monthlyReports.month, generatedAt: monthlyReports.generatedAt, aiSummary: monthlyReports.aiSummary })
    .from(monthlyReports)
    .where(eq(monthlyReports.userId, userId))
    .orderBy(desc(monthlyReports.month))
    .limit(36);
}

export async function saveReportAiSummary(userId: string, month: MonthKey, summary: string, model: string): Promise<void> {
  await db
    .update(monthlyReports)
    .set({ aiSummary: summary, aiModel: model, aiGeneratedAt: new Date() })
    .where(and(eq(monthlyReports.userId, userId), eq(monthlyReports.month, month)));
}

/**
 * Tâche planifiée (1er du mois) : génère le rapport du mois écoulé pour chaque utilisateur actif
 * qui n'en a pas encore, et le notifie.
 */
export async function generateMonthlyReportsForAllUsers(now = new Date()): Promise<{ generated: number; skipped: number }> {
  const profiles = await db
    .select({ profile: financialProfiles })
    .from(financialProfiles)
    .innerJoin(users, eq(users.id, financialProfiles.userId))
    .where(and(isNull(users.disabledAt), eq(users.isDemo, false)));
  let generated = 0;
  let skipped = 0;
  for (const { profile } of profiles) {
    const month = addMonths(monthOf(todayInTimezone(profile.timezone, now)), -1);
    if (await getStoredReport(profile.userId, month)) {
      skipped += 1;
      continue;
    }
    const activity = await db.execute<{ n: string }>(
      sql`select (select count(*) from incomes where user_id = ${profile.userId} and to_char(received_on, 'YYYY-MM') = ${month})
           + (select count(*) from expenses where user_id = ${profile.userId} and to_char(spent_on, 'YYYY-MM') = ${month}) as n`,
    );
    if (Number(activity.rows[0]?.n ?? 0) === 0) {
      skipped += 1;
      continue;
    }
    const report = await generateAndStoreReport(profile.userId, profile, month, 'auto');
    const data = report.data as unknown as MonthlyReportData;
    await notify(profile.userId, {
      type: 'monthly_report',
      title: `Ton rapport de ${data.monthLabel.toLowerCase()} est prêt`,
      body: data.headline,
      link: `/app/reports?month=${month}`,
      dedupeKey: `report:${month}`,
    });
    generated += 1;
  }
  return { generated, skipped };
}
