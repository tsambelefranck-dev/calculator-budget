import 'server-only';
import { formatMoney } from '@/lib/finance/money';
import type { MonthlyReportData } from '@/lib/finance/report';
import { REPORT_SYSTEM_PROMPT } from './prompts';
import type { LlmProvider } from './provider';
import { recordUsage } from './usage';

/** Analyse rédigée par l'IA à partir des seules données déterministes du rapport. */
export async function generateReportSummary(userId: string, data: MonthlyReportData, provider: LlmProvider): Promise<{ text: string; model: string }> {
  const m = (v: number) => formatMoney(v, data.currency);
  const facts = {
    mois: data.monthLabel,
    revenus: m(data.totals.income),
    depenses: m(data.totals.expenses),
    epargne_versee: m(data.totals.savings),
    investi: m(data.totals.investments),
    dettes_remboursees: m(data.totals.debtPayments),
    taux_epargne: `${Math.round(data.savingsRate * 100)} %`,
    taux_epargne_mois_precedent: data.previousSavingsRate === null ? null : `${Math.round(data.previousSavingsRate * 100)} %`,
    sante_financiere: data.healthScore,
    principaux_postes: data.topCategories.map((c) => `${c.name} : ${m(c.amount)}${c.budget ? ` (budget ${m(c.budget)})` : ''}`),
    points_positifs: data.positives,
    erreurs: data.mistakes,
    recommandations_calculees: data.recommendations,
    objectifs: data.goals.map((g) => `${g.name} : ${m(g.saved)} / ${m(g.target)}`),
  };
  const turn = await provider.runTurn({
    system: REPORT_SYSTEM_PROMPT,
    tools: [],
    maxTokens: 4000,
    messages: [{ role: 'user', content: [{ type: 'text', text: `Données du rapport (JSON) :\n${JSON.stringify(facts, null, 2)}` }] }],
  });
  await recordUsage(userId, 'report', turn.model, turn.usage);
  if (turn.stopReason === 'refusal') throw new Error('refusal');
  const text = turn.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('').trim();
  if (!text) throw new Error('empty');
  return { text, model: turn.model };
}
