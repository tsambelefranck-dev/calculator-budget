import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { CurrencyCode } from '@/lib/constants';
import { addMonths, formatMonthLabel, isValidMonthKey, type DateKey, type MonthKey } from '@/lib/finance/dates';
import { monthsToReach, requiredMonthlyContribution } from '@/lib/finance/goals';
import { detectInsights } from '@/lib/finance/insights';
import { formatMoney, toMinor } from '@/lib/finance/money';
import { savingsRateOf } from '@/lib/finance/report';
import { DEFAULT_INFLATION_PCT, simulateInvestment } from '@/lib/finance/simulator';
import type { FinancialProfile } from '@/server/auth/current';
import { db } from '@/server/db';
import { investmentDomains, lessons } from '@/server/db/schema';
import { getCategorySpends, getHealthSnapshot, getMonthTotals, getNetWorth } from '@/server/services/analytics';
import { getBudgetOverview } from '@/server/services/budgets';
import { compareDebtStrategies } from '@/server/services/debts';
import { topExpenses } from '@/server/services/expenses';
import { listGoalSummaries } from '@/server/services/goals';
import { proposePlan } from '@/server/services/planner';
import { buildReportData } from '@/server/services/reports';

export interface ToolContext {
  userId: string;
  profile: FinancialProfile;
  currency: CurrencyCode;
  today: DateKey;
  currentMonth: MonthKey;
  consent: boolean;
}

interface ToolDef<S extends z.ZodType> {
  name: string;
  label: string;
  description: string;
  schema: S;
  needsData: boolean;
  run: (input: z.infer<S>, ctx: ToolContext) => Promise<unknown>;
}

const monthInput = z.object({
  month: z.string().optional().describe('Mois au format YYYY-MM. Par défaut : le mois en cours.'),
});

function resolveMonth(month: string | undefined, ctx: ToolContext): MonthKey {
  return month && isValidMonthKey(month) && month <= ctx.currentMonth ? month : ctx.currentMonth;
}

const fmt = (minor: number, ctx: ToolContext) => formatMoney(minor, ctx.currency);
const pct = (r: number) => `${Math.round(r * 1000) / 10} %`;

function def<S extends z.ZodType>(d: ToolDef<S>): ToolDef<S> {
  return d;
}

export const TOOL_DEFS = [
  def({
    name: 'get_financial_overview',
    label: 'Vue d’ensemble du mois',
    description:
      "Indicateurs clés d'un mois : revenus, dépenses, épargne versée, investissements, remboursements, solde disponible, taux d'épargne, patrimoine net, dettes restantes et score de santé financière.",
    schema: monthInput,
    needsData: true,
    run: async ({ month }, ctx) => {
      const m = resolveMonth(month, ctx);
      const [t, netWorth, health] = await Promise.all([
        getMonthTotals(ctx.userId, m),
        getNetWorth(ctx.userId, m),
        getHealthSnapshot(ctx.userId, ctx.profile, ctx.currentMonth),
      ]);
      return {
        mois: formatMonthLabel(m),
        mois_en_cours: m === ctx.currentMonth,
        revenus: fmt(t.income, ctx),
        depenses: fmt(t.expenses, ctx),
        epargne_versee: fmt(t.savings, ctx),
        investi: fmt(t.investments, ctx),
        remboursements_dettes: fmt(t.debtPayments, ctx),
        solde_theorique_disponible: fmt(t.income - t.expenses - t.savings - t.investments - t.debtPayments, ctx),
        taux_epargne: t.income > 0 ? pct(savingsRateOf(t)) : 'non calculable (aucun revenu enregistré)',
        patrimoine_net: fmt(netWorth.netWorth, ctx),
        dettes_restantes: fmt(netWorth.debts, ctx),
        sante_financiere: {
          score: health.health.score,
          niveau: health.health.label,
          base_de_calcul: health.basis,
          composantes: health.health.components.map((c) => ({ nom: c.label, points: `${Math.round(c.points)}/${c.max}`, detail: c.detail })),
          pistes: health.health.tips,
        },
      };
    },
  }),
  def({
    name: 'get_spending_breakdown',
    label: 'Dépenses par catégorie',
    description:
      "Dépenses d'un mois par catégorie avec le budget, la période comparable du mois précédent, la moyenne des 3 mois précédents, et les plus grosses dépenses (libellés saisis par l'utilisateur).",
    schema: monthInput,
    needsData: true,
    run: async ({ month }, ctx) => {
      const m = resolveMonth(month, ctx);
      const [spends, top, budgets] = await Promise.all([getCategorySpends(ctx.userId, m, ctx.today), topExpenses(ctx.userId, m, 8), getBudgetOverview(ctx.userId, m)]);
      return {
        mois: formatMonthLabel(m),
        periode_partielle: spends.partial,
        total: fmt(spends.spends.reduce((s, c) => s + c.current, 0), ctx),
        categories: spends.spends
          .sort((a, b) => b.current - a.current)
          .map((c) => ({
            categorie: c.name,
            essentielle: c.isEssential,
            depense: fmt(c.current, ctx),
            periode_comparable_mois_precedent: fmt(c.previous, ctx),
            moyenne_3_mois: c.average3 !== null ? fmt(c.average3, ctx) : null,
            budget: c.budget !== null ? fmt(c.budget, ctx) : null,
          })),
        budgets_respectes: budgets.adherence === null ? 'aucun budget défini' : pct(budgets.adherence),
        plus_grosses_depenses: top.map((e) => ({ libelle: e.label.slice(0, 80), categorie: e.category, montant: fmt(e.amount, ctx), date: e.spentOn })),
      };
    },
  }),
  def({
    name: 'detect_spending_anomalies',
    label: 'Détection des dépenses excessives',
    description: "Analyse automatique d'un mois : budgets dépassés, hausses inhabituelles par catégorie, dépenses non essentielles élevées, déficit, épargne faible, avec économies potentielles.",
    schema: monthInput,
    needsData: true,
    run: async ({ month }, ctx) => {
      const m = resolveMonth(month, ctx);
      const [t, spends] = await Promise.all([getMonthTotals(ctx.userId, m), getCategorySpends(ctx.userId, m, ctx.today)]);
      const insights = detectInsights({ currency: ctx.currency, income: t.income, expenses: t.expenses, debtPayments: t.debtPayments, categories: spends.spends, partialMonth: spends.partial });
      return {
        mois: formatMonthLabel(m),
        constats: insights.map((i) => ({ gravite: i.severity, titre: i.title, detail: i.message, economie_potentielle: i.potentialSavings ? fmt(i.potentialSavings, ctx) : null })),
      };
    },
  }),
  def({
    name: 'get_goals',
    label: 'Objectifs d’épargne',
    description: "Objectifs d'épargne : montant cible, épargné, restant, date souhaitée, contribution mensuelle nécessaire, date d'arrivée estimée et statut.",
    schema: z.object({}),
    needsData: true,
    run: async (_input, ctx) => {
      const goals = await listGoalSummaries(ctx.userId, ctx.today);
      return {
        objectifs: goals.map((g) => ({
          nom: g.goal.name,
          type: g.goal.type,
          statut: g.metrics.status,
          cible: fmt(g.goal.targetAmount, ctx),
          epargne: fmt(g.saved, ctx),
          restant: fmt(g.metrics.remaining, ctx),
          date_souhaitee: g.goal.targetDate,
          contribution_mensuelle_necessaire: g.metrics.requiredMonthly !== null ? fmt(g.metrics.requiredMonthly, ctx) : null,
          arrivee_estimee: g.metrics.projectedMonth ? formatMonthLabel(g.metrics.projectedMonth) : null,
        })),
      };
    },
  }),
  def({
    name: 'get_debts',
    label: 'Dettes et stratégies',
    description: 'Dettes en cours (capital restant, taux, mensualité) et comparaison des stratégies Avalanche et Boule de neige avec un effort mensuel supplémentaire optionnel.',
    schema: z.object({ extra_monthly: z.number().min(0).max(1e12).optional().describe("Effort supplémentaire mensuel, en unités de la devise de l'utilisateur.") }),
    needsData: true,
    run: async ({ extra_monthly }, ctx) => {
      const { summaries, comparison } = await compareDebtStrategies(ctx.userId, toMinor(extra_monthly ?? 0, ctx.currency));
      const strat = (k: 'minimum' | 'avalanche' | 'snowball') =>
        comparison ? { duree_mois: comparison[k].feasible ? comparison[k].months : 'jamais remboursée', interets_totaux: fmt(comparison[k].totalInterest, ctx) } : null;
      return {
        dettes: summaries.map((s) => ({ nom: s.debt.name, type: s.debt.type, restant: fmt(s.remaining, ctx), taux_annuel: `${s.debt.annualRateBp / 100} %`, mensualite: fmt(s.debt.minimumPayment, ctx), soldee: s.remaining === 0 })),
        strategies: comparison
          ? {
              minimum_seulement: strat('minimum'),
              avalanche: strat('avalanche'),
              boule_de_neige: strat('snowball'),
              recommandation: comparison.recommended,
              explication: comparison.explanation,
              hypotheses: 'Simulation : intérêts mensuels sur le capital restant, mensualités constantes, sans frais ni pénalités.',
            }
          : 'aucune dette active',
      };
    },
  }),
  def({
    name: 'propose_salary_allocation',
    label: 'Répartition d’un revenu',
    description:
      "Calcule la répartition personnalisée d'un revenu (algorithme du planificateur NexaFi) à partir des dépenses réelles, des dettes, du fonds d'urgence, des objectifs et du profil de risque de l'utilisateur.",
    schema: z.object({ amount: z.number().positive().max(1e12).describe("Montant du revenu à répartir, en unités de la devise de l'utilisateur.") }),
    needsData: true,
    run: async ({ amount }, ctx) => {
      const { plan, context } = await proposePlan(ctx.userId, ctx.profile, ctx.today, toMinor(amount, ctx.currency));
      return {
        total: fmt(plan.total, ctx),
        statut: plan.status,
        source_des_besoins: context.needs.source,
        repartition: plan.items.map((i) => ({ enveloppe: i.label, montant: fmt(i.amount, ctx), part: pct(i.percent), justification: i.rationale })),
        remarques: plan.notes,
        lien: 'L’utilisateur peut ajuster et valider ce plan dans « Planificateur ».',
      };
    },
  }),
  def({
    name: 'simulate_savings_goal',
    label: 'Calcul d’épargne',
    description: "Calcule soit la contribution mensuelle nécessaire pour atteindre un montant en un nombre de mois, soit le nombre de mois nécessaires avec un versement mensuel donné. Sans rendement.",
    schema: z.object({
      target_amount: z.number().positive().max(1e12).describe('Montant à atteindre (unités de la devise).'),
      already_saved: z.number().min(0).max(1e12).optional(),
      months: z.number().int().min(1).max(600).optional().describe('Délai souhaité en mois.'),
      monthly_amount: z.number().positive().max(1e12).optional().describe('Versement mensuel envisagé.'),
    }),
    needsData: false,
    run: async ({ target_amount, already_saved, months, monthly_amount }, ctx) => {
      const remaining = Math.max(0, toMinor(target_amount, ctx.currency) - toMinor(already_saved ?? 0, ctx.currency));
      const result: Record<string, unknown> = { restant_a_epargner: fmt(remaining, ctx) };
      if (months) result.versement_mensuel_necessaire = fmt(requiredMonthlyContribution(remaining, months), ctx);
      if (monthly_amount) {
        const n = monthsToReach(remaining, toMinor(monthly_amount, ctx.currency));
        result.mois_necessaires = n;
        result.arrivee_estimee = n !== null ? formatMonthLabel(addMonths(ctx.currentMonth, n)) : null;
      }
      return result;
    },
  }),
  def({
    name: 'simulate_investment',
    label: 'Simulation d’investissement',
    description:
      "SIMULATION de la valeur future d'un placement avec capital initial, versements mensuels, taux annuel HYPOTHÉTIQUE choisi, frais et inflation. Utilise plusieurs taux (pessimiste, intermédiaire, optimiste) pour montrer l'incertitude. Ce n'est jamais une prévision.",
    schema: z.object({
      initial: z.number().min(0).max(1e12),
      monthly: z.number().min(0).max(1e12),
      years: z.number().min(0.1).max(50),
      annual_rates_pct: z.array(z.number().min(-90).max(100)).min(1).max(4).describe('Taux annuels hypothétiques à comparer, ex. [-5, 4, 9].'),
      annual_fee_pct: z.number().min(0).max(20).optional(),
      inflation_pct: z.number().min(0).max(50).optional(),
    }),
    needsData: false,
    run: async (input, ctx) => {
      const inflation = input.inflation_pct ?? DEFAULT_INFLATION_PCT;
      const scenarios = input.annual_rates_pct.map((rate) => {
        const r = simulateInvestment({
          initial: toMinor(input.initial, ctx.currency),
          monthly: toMinor(input.monthly, ctx.currency),
          months: Math.round(input.years * 12),
          annualRatePct: rate,
          annualFeePct: input.annual_fee_pct ?? 0,
          inflationPct: inflation,
        });
        return {
          taux_hypothetique: `${rate} %`,
          total_verse: fmt(r.totalContributed, ctx),
          valeur_finale_estimee: fmt(r.finalValue, ctx),
          gain_ou_perte: fmt(r.totalGains, ctx),
          valeur_en_pouvoir_d_achat_actuel: fmt(r.finalRealValue, ctx),
          frais: fmt(r.totalFees, ctx),
        };
      });
      return {
        avertissement: 'Simulation fondée sur des hypothèses : aucun rendement n’est garanti.',
        inflation_hypothese: `${inflation} %${input.inflation_pct === undefined ? ' (plafond du critère de convergence UEMOA/CEMAC, pas une mesure)' : ''}`,
        scenarios,
      };
    },
  }),
  def({
    name: 'list_investment_domains',
    label: 'Centre d’investissement',
    description: "Fiches pédagogiques des domaines d'investissement (agriculture, immobilier, commerce, marchés financiers…) : risque, horizon, liquidité, capital indicatif, risques de perte, sources officielles à consulter.",
    schema: z.object({ slug: z.string().optional().describe('Identifiant d’un domaine pour avoir la fiche complète.') }),
    needsData: false,
    run: async ({ slug }) => {
      const rows = await db.select().from(investmentDomains).where(eq(investmentDomains.isPublished, true)).orderBy(asc(investmentDomains.sortOrder));
      const list = slug ? rows.filter((r) => r.slug === slug) : rows;
      return list.map((d) => ({
        slug: d.slug,
        nom: d.name,
        resume: d.summary,
        risque_sur_5: d.riskLevel,
        horizon: d.horizon,
        liquidite: d.liquidity,
        ...(slug ? { fonctionnement: d.howItWorks, capital_indicatif: d.startingCapital, couts: d.costs, potentiel: d.returnPotential, risques: d.lossRisks, exemple: d.example } : {}),
        nature_information: d.infoNature,
        sources: d.sources.map((s) => `${s.label} (${s.url})${s.consultedAt ? `, consulté le ${s.consultedAt}` : ', à vérifier'}`),
        mise_a_jour: d.updatedAt.toISOString().slice(0, 10),
      }));
    },
  }),
  def({
    name: 'get_monthly_report',
    label: 'Rapport mensuel',
    description: "Rapport financier d'un mois : totaux, comparaison avec le mois précédent, points positifs, erreurs, recommandations.",
    schema: monthInput,
    needsData: true,
    run: async ({ month }, ctx) => {
      const m = resolveMonth(month, ctx);
      const r = await buildReportData(ctx.userId, ctx.profile, m);
      return { mois: r.monthLabel, resume: r.headline, points_positifs: r.positives, erreurs: r.mistakes, recommandations: r.recommendations, sante: r.healthScore };
    },
  }),
  def({
    name: 'recommend_lessons',
    label: 'Bibliothèque pédagogique',
    description: 'Liste les leçons de la bibliothèque NexaFi (budget, épargne, investissement, dettes, inflation, arnaques…) pour recommander une lecture.',
    schema: z.object({ topic: z.string().optional() }),
    needsData: false,
    run: async ({ topic }) => {
      const rows = await db.select({ slug: lessons.slug, title: lessons.title, summary: lessons.summary, topic: lessons.topic }).from(lessons).where(eq(lessons.isPublished, true)).orderBy(asc(lessons.sortOrder));
      const filtered = topic ? rows.filter((l) => l.topic.includes(topic) || l.title.toLowerCase().includes(topic.toLowerCase())) : rows;
      return (filtered.length ? filtered : rows).map((l) => ({ titre: l.title, resume: l.summary, lien: `/app/learn/${l.slug}` }));
    },
  }),
];

const BY_NAME = new Map(TOOL_DEFS.map((t) => [t.name, t]));

export function toolLabel(name: string): string {
  return BY_NAME.get(name)?.label ?? name;
}

/** Définitions envoyées au modèle (ordre et contenu stables → préfixe cachable). */
export function getToolSchemas(): Anthropic.Beta.BetaTool[] {
  return TOOL_DEFS.map((t) => {
    const { $schema: _ignored, ...schema } = z.toJSONSchema(t.schema) as Record<string, unknown>;
    return {
      name: t.name,
      description: t.description,
      input_schema: { type: 'object', ...schema } as Anthropic.Beta.BetaTool.InputSchema,
      eager_input_streaming: true,
    };
  });
}

export interface ToolOutcome {
  ok: boolean;
  content: string;
}

/** Exécute un outil : validation Zod de l'entrée, contrôle du consentement, utilisateur imposé par le contexte. */
export async function executeTool(name: string, rawInput: unknown, ctx: ToolContext): Promise<ToolOutcome> {
  const tool = BY_NAME.get(name);
  if (!tool) return { ok: false, content: JSON.stringify({ erreur: `Outil inconnu : ${name}` }) };
  if (tool.needsData && !ctx.consent) {
    return {
      ok: false,
      content: JSON.stringify({
        erreur: "ACCES_NON_AUTORISE : l'utilisateur n'a pas autorisé l'assistant à lire ses données financières. Réponds de façon générale et propose d'activer l'accès (bouton « Autoriser l'accès à mes données »).",
      }),
    };
  }
  const parsed = tool.schema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return { ok: false, content: JSON.stringify({ INVALID_JSON: JSON.stringify(rawInput), details: parsed.error.issues.map((i) => i.message) }) };
  }
  try {
    const result = await tool.run(parsed.data as never, ctx);
    return { ok: true, content: JSON.stringify(result) };
  } catch (error) {
    console.error('[ai] erreur outil', name, error);
    return { ok: false, content: JSON.stringify({ erreur: "L'outil a rencontré une erreur interne. Indique-le à l'utilisateur sans inventer de chiffres." }) };
  }
}

