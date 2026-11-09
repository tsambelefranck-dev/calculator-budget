/**
 * Détection des dépenses excessives, inhabituelles ou non essentielles.
 * Utilisé par le tableau de bord, le rapport mensuel et l'agent IA (outil).
 */
import type { CurrencyCode } from '@/lib/constants';
import { CURRENCY_META, formatMoney, ratio, roundTo, sum } from './money';

export interface CategorySpend {
  categoryId: string;
  code: string;
  name: string;
  isEssential: boolean;
  /** Dépenses de la période analysée. */
  current: number;
  /** Dépenses de la période comparable du mois précédent (même nombre de jours si mois en cours). */
  previous: number;
  /** Moyenne mensuelle des 3 mois précédents (mois complets), `null` si pas d'historique. */
  average3: number | null;
  /** Budget du mois, `null` si aucun. */
  budget: number | null;
}

export type InsightKind = 'depassement' | 'proche_budget' | 'hausse' | 'non_essentiel' | 'baisse' | 'epargne_faible' | 'deficit';
export type InsightSeverity = 'alerte' | 'attention' | 'info' | 'positif';

export interface Insight {
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  categoryCode?: string;
  title: string;
  message: string;
  potentialSavings?: number;
}

export interface InsightInput {
  currency: CurrencyCode;
  income: number;
  expenses: number;
  debtPayments: number;
  categories: CategorySpend[];
  /** Vrai si la période est le mois en cours (comparaison au prorata). */
  partialMonth: boolean;
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = { alerte: 0, attention: 1, info: 2, positif: 3 };

export function detectInsights(input: InsightInput): Insight[] {
  const { currency } = input;
  const money = (v: number) => formatMoney(v, currency);
  const g = CURRENCY_META[currency].granularity;
  const minAbs = Math.max(input.income * 0.01, g * 10);
  const insights: Insight[] = [];
  const period = input.partialMonth ? 'depuis le début du mois' : 'ce mois-ci';
  const comparedTo = input.partialMonth ? 'qu’à la même période du mois précédent' : 'que le mois précédent';

  if (input.income > 0 && input.expenses + input.debtPayments > input.income) {
    const gap = input.expenses + input.debtPayments - input.income;
    insights.push({
      id: 'deficit',
      kind: 'deficit',
      severity: 'alerte',
      title: 'Dépenses supérieures aux revenus',
      message: `Tes dépenses et remboursements dépassent tes revenus de ${money(gap)} ${period}.`,
    });
  }

  for (const c of input.categories) {
    if (c.budget !== null && c.budget > 0) {
      if (c.current > c.budget) {
        insights.push({
          id: `depassement:${c.code}`,
          kind: 'depassement',
          severity: 'alerte',
          categoryCode: c.code,
          title: `Budget ${c.name} dépassé`,
          message: `Tu as dépensé ${money(c.current)} en ${c.name.toLowerCase()} pour un budget de ${money(c.budget)}, soit ${money(c.current - c.budget)} de dépassement.`,
          potentialSavings: c.current - c.budget,
        });
      } else if (c.current >= c.budget * 0.8) {
        insights.push({
          id: `proche:${c.code}`,
          kind: 'proche_budget',
          severity: 'attention',
          categoryCode: c.code,
          title: `Budget ${c.name} presque épuisé`,
          message: `${Math.round(ratio(c.current, c.budget) * 100)} % du budget ${c.name.toLowerCase()} est déjà utilisé (reste ${money(c.budget - c.current)}).`,
        });
      }
    }

    if (c.previous > 0 && c.current > c.previous * 1.25 && c.current - c.previous >= minAbs) {
      const increase = ratio(c.current - c.previous, c.previous);
      const savings = roundTo(c.current - c.previous, g);
      insights.push({
        id: `hausse:${c.code}`,
        kind: 'hausse',
        severity: c.isEssential ? 'info' : 'attention',
        categoryCode: c.code,
        title: `Hausse des dépenses : ${c.name}`,
        message: `Tu as dépensé ${money(c.current)} en ${c.name.toLowerCase()} ${period}, soit ${Math.round(increase * 100)} % de plus ${comparedTo}. Tu pourrais économiser environ ${money(savings)} en revenant à ton niveau habituel.`,
        potentialSavings: savings,
      });
    } else if (!input.partialMonth && c.previous > 0 && c.current < c.previous * 0.8 && c.previous - c.current >= minAbs) {
      insights.push({
        id: `baisse:${c.code}`,
        kind: 'baisse',
        severity: 'positif',
        categoryCode: c.code,
        title: `Bonne maîtrise : ${c.name}`,
        message: `Tes dépenses en ${c.name.toLowerCase()} ont baissé de ${Math.round(ratio(c.previous - c.current, c.previous) * 100)} % par rapport au mois précédent.`,
      });
    }
  }

  const nonEssential = sum(input.categories.filter((c) => !c.isEssential).map((c) => c.current));
  if (input.income > 0 && ratio(nonEssential, input.income) > 0.3) {
    const savings = roundTo(nonEssential * 0.2, g);
    insights.push({
      id: 'non_essentiel',
      kind: 'non_essentiel',
      severity: 'attention',
      title: 'Dépenses non essentielles élevées',
      message: `Tes dépenses non essentielles (loisirs, shopping, abonnements…) représentent ${Math.round(ratio(nonEssential, input.income) * 100)} % de tes revenus. En les réduisant de 20 %, tu économiserais environ ${money(savings)}.`,
      potentialSavings: savings,
    });
  }

  if (!input.partialMonth && input.income > 0) {
    const rate = ratio(input.income - input.expenses - input.debtPayments, input.income);
    if (rate >= 0 && rate < 0.1) {
      insights.push({
        id: 'epargne_faible',
        kind: 'epargne_faible',
        severity: 'attention',
        title: 'Épargne faible',
        message: `Seulement ${Math.round(rate * 100)} % de tes revenus n’ont pas été dépensés. Programme ton épargne dès la réception du revenu.`,
      });
    }
  }

  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
