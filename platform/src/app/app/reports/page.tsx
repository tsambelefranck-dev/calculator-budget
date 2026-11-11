import type { Metadata } from 'next';
import { ReportAiSummary } from '@/components/reports/report-ai-summary';
import { ReportView } from '@/components/reports/report-view';
import { Alert } from '@/components/ui/alert';
import { MonthSwitcher, resolveMonth } from '@/components/ui/month-switcher';
import { PageHeader } from '@/components/ui/page-header';
import { addMonths, formatMonthLabel } from '@/lib/finance/dates';
import type { MonthlyReportData } from '@/lib/finance/report';
import { requireAppContext } from '@/server/auth/current';
import { isAiConfigured } from '@/server/ai/config';
import { getPlanLimits } from '@/server/services/entitlements';
import { buildReportData, generateAndStoreReport, getStoredReport } from '@/server/services/reports';

export const metadata: Metadata = { title: 'Rapport mensuel' };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const ctx = await requireAppContext();
  const lastComplete = addMonths(ctx.currentMonth, -1);
  const raw = (await searchParams).month;
  const month = raw ? resolveMonth(raw, ctx.currentMonth) : lastComplete;
  const isCurrent = month === ctx.currentMonth;
  let data: MonthlyReportData;
  let aiSummary: string | null = null;
  if (isCurrent) {
    data = await buildReportData(ctx.user.id, ctx.profile, month);
  } else {
    const stored = (await getStoredReport(ctx.user.id, month)) ?? (await generateAndStoreReport(ctx.user.id, ctx.profile, month, 'manual'));
    data = stored.data as unknown as MonthlyReportData;
    aiSummary = stored.aiSummary;
  }
  const limits = getPlanLimits(ctx.user.plan);
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Rapport de ${formatMonthLabel(month).toLowerCase()}`}
        description="Revenus, dépenses, épargne, dettes, objectifs, erreurs et recommandations. Généré automatiquement chaque début de mois."
        actions={
<MonthSwitcher month={month} currentMonth={ctx.currentMonth} basePath="/app/reports" />
        }
      />
      {isCurrent ? <Alert tone="info" title="Rapport provisoire">Le mois n’est pas terminé : ces chiffres évoluent jusqu’à la fin du mois.</Alert> : null}
      {!isCurrent ? (
        <ReportAiSummary month={month} summary={aiSummary} allowed={limits.aiReportSummary} configured={isAiConfigured()} />
      ) : null}
      <ReportView data={data} />
    </div>
  );
}
