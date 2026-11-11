/**
 * Rapport financier mensuel : métriques, comparaison, points positifs, erreurs, recommandations.
 * 100 % déterministe ; l'analyse rédigée par l'IA (Premium) s'appuie sur ces données.
 */
import type { CurrencyCode } from '@/lib/constants';
import { formatMonthLabel, type MonthKey } from './dates';
import type { HealthResult } from './health';
import { detectInsights, type CategorySpend, type Insight } from './insights';
import { CURRENCY_META, formatMoney, ratio, roundUpTo } from './money';

export interface MonthTotals {
  income: number;
  expenses: number;
  savings: number;
  investments: number;
  debtPayments: number;
}

export interface ReportGoal {
  name: string;
  target: number;
  saved: number;
  contributedThisMonth: number;
}

export interface ReportInput {
  month: MonthKey;
  currency: CurrencyCode;
  totals: MonthTotals;
  previousTotals: MonthTotals | null;
  categories: CategorySpend[];
  goals: ReportGoal[];
  health: HealthResult;
  emergencyMonths: number;
  hasHighInterestDebt: boolean;
}

export interface MonthlyReportData {
  version: 1;
  month: MonthKey;
  monthLabel: string;
  currency: CurrencyCode;
  totals: MonthTotals;
  previousTotals: MonthTotals | null;
  savingsRate: number;
  previousSavingsRate: number | null;
  balance: number;
  comparison: { incomeChange: number | null; expensesChange: number | null; savingsRateChange: number | null };
  topCategories: { name: string; amount: number; share: number; budget: number | null }[];
  excessive: Insight[];
  goals: (ReportGoal & { progress: number })[];
  healthScore: number | null;
  healthLabel: string;
  positives: string[];
  mistakes: string[];
  recommendations: string[];
  headline: string;
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

export function savingsRateOf(t: MonthTotals): number {
  return ratio(t.income - t.expenses - t.debtPayments, t.income);
}

/** Objectif d'épargne du mois suivant : +5 points, arrondi au multiple de 5 %, entre 5 % et 15 %. */
export function nextSavingsTarget(rate: number): number {
  return Math.min(0.15, Math.max(0.05, Math.ceil((Math.max(rate, 0) + 0.05) * 20 - 1e-9) / 20));
}

function change(current: number, previous: number | undefined | null): number | null {
  if (previous === undefined || previous === null || previous === 0) return null;
  return (current - previous) / previous;
}

export function buildMonthlyReport(input: ReportInput): MonthlyReportData {
  const { totals, previousTotals, currency } = input;
  const money = (v: number) => formatMoney(v, currency);
  const g = CURRENCY_META[currency].granularity;
  const savingsRate = savingsRateOf(totals);
  const previousSavingsRate = previousTotals && previousTotals.income > 0 ? savingsRateOf(previousTotals) : null;
  const balance = totals.income - totals.expenses - totals.debtPayments - totals.savings - totals.investments;

  const insights = detectInsights({
    currency,
    income: totals.income,
    expenses: totals.expenses,
    debtPayments: totals.debtPayments,
    categories: input.categories,
    partialMonth: false,
  });
  const excessive = insights.filter((i) => i.severity === 'alerte' || i.severity === 'attention');

  const topCategories = [...input.categories]
    .filter((c) => c.current > 0)
    .sort((a, b) => b.current - a.current)
    .slice(0, 6)
    .map((c) => ({ name: c.name, amount: c.current, share: ratio(c.current, totals.expenses), budget: c.budget }));

  const positives: string[] = [];
  const mistakes: string[] = [];
  const recommendations: string[] = [];

  if (totals.income > 0 && savingsRate >= 0.15) positives.push(`Excellent taux d’épargne : ${pct(savingsRate)} de tes revenus non dépensés.`);
  if (previousSavingsRate !== null && savingsRate - previousSavingsRate >= 0.02) {
    positives.push(`Ton taux d’épargne progresse de ${Math.round((savingsRate - previousSavingsRate) * 100)} points par rapport au mois précédent.`);
  }
  const expensesChange = change(totals.expenses, previousTotals?.expenses);
  if (expensesChange !== null && expensesChange <= -0.05) positives.push(`Tes dépenses baissent de ${pct(-expensesChange)} par rapport au mois précédent.`);
  const budgeted = input.categories.filter((c) => c.budget !== null && c.budget > 0);
  const overBudget = budgeted.filter((c) => c.current > (c.budget ?? 0));
  if (budgeted.length > 0 && overBudget.length === 0) positives.push('Tous tes budgets ont été respectés.');
  if (totals.savings > 0) positives.push(`Tu as alimenté tes objectifs d’épargne à hauteur de ${money(totals.savings)}.`);
  if (totals.investments > 0) positives.push(`Tu as investi ${money(totals.investments)}.`);
  if (totals.debtPayments > 0) positives.push(`Tu as remboursé ${money(totals.debtPayments)} de dettes.`);

  if (totals.income > 0 && totals.expenses + totals.debtPayments > totals.income) {
    mistakes.push(`Tes dépenses et remboursements ont dépassé tes revenus de ${money(totals.expenses + totals.debtPayments - totals.income)}.`);
  }
  for (const c of overBudget) mistakes.push(`Budget ${c.name} dépassé de ${money(c.current - (c.budget ?? 0))}.`);
  for (const i of insights.filter((x) => x.kind === 'hausse' && x.severity === 'attention')) mistakes.push(i.message);
  const nonEssential = insights.find((i) => i.kind === 'non_essentiel');
  if (nonEssential) mistakes.push(nonEssential.message);
  if (totals.income > 0 && savingsRate >= 0 && savingsRate < 0.05) mistakes.push('Moins de 5 % de tes revenus ont été mis de côté.');
  if (budgeted.length === 0 && totals.expenses > 0) mistakes.push('Aucun budget défini : difficile de piloter tes dépenses.');
  if (totals.income === 0) mistakes.push('Aucun revenu enregistré ce mois-ci : le rapport est incomplet.');

  if (totals.income > 0 && savingsRate < 0.15) {
    const target = nextSavingsTarget(savingsRate);
    const amount = roundUpTo(totals.income * target, g);
    recommendations.push(
      `Vise ${pct(target)} d’épargne le mois prochain, soit ${money(amount)} à mettre de côté dès la réception de ton revenu, en réduisant certaines dépenses non essentielles.`,
    );
  }
  for (const c of overBudget.slice(0, 2)) {
    const suggested = c.average3 ? roundUpTo(c.average3, g) : roundUpTo(c.current, g);
    recommendations.push(`Réajuste le budget ${c.name} (${money(suggested)} correspond à ta moyenne récente) ou fixe-toi un plafond hebdomadaire.`);
  }
  if (input.emergencyMonths < 3) recommendations.push('Priorité au fonds d’urgence : vise au moins 3 mois de dépenses essentielles.');
  if (input.hasHighInterestDebt) recommendations.push('Rembourse en priorité ta dette au taux le plus élevé (méthode avalanche).');
  if (budgeted.length === 0) recommendations.push('Utilise le planificateur de salaire : il crée tes budgets du mois en un clic.');
  if (recommendations.length === 0) recommendations.push('Continue sur cette lancée et explore le centre d’investissement pour faire travailler ton épargne.');

  const monthLabel = formatMonthLabel(input.month);
  let headline: string;
  if (totals.income === 0 && totals.expenses === 0) {
    headline = `Aucune opération enregistrée en ${monthLabel.toLowerCase()}.`;
  } else {
    headline = `En ${monthLabel.toLowerCase()}, tu as reçu ${money(totals.income)} et dépensé ${money(totals.expenses)}.`;
    if (totals.income > 0) headline += ` Ton taux d’épargne est de ${pct(savingsRate)}.`;
    if (totals.income > 0 && savingsRate < 0.15) {
      const target = nextSavingsTarget(savingsRate);
      headline += ` Tu pourrais viser ${pct(target)} le mois prochain en réduisant certaines dépenses non essentielles.`;
    }
  }

  return {
    version: 1,
    month: input.month,
    monthLabel,
    currency,
    totals,
    previousTotals,
    savingsRate,
    previousSavingsRate,
    balance,
    comparison: {
      incomeChange: change(totals.income, previousTotals?.income),
      expensesChange,
      savingsRateChange: previousSavingsRate === null ? null : savingsRate - previousSavingsRate,
    },
    topCategories,
    excessive,
    goals: input.goals.map((goal) => ({ ...goal, progress: Math.min(1, ratio(goal.saved, goal.target)) })),
    healthScore: input.health.score,
    healthLabel: input.health.label,
    positives: positives.slice(0, 5),
    mistakes: mistakes.slice(0, 5),
    recommendations: recommendations.slice(0, 4),
    headline,
  };
}
