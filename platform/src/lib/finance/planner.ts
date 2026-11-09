/**
 * Planificateur de salaire : propose une répartition personnalisée d'un revenu.
 *
 * Principe (cascade de priorités, pas de règle universelle « 50/30/20 ») :
 * 1. Besoins incompressibles estimés (historique réel ou déclaratif) + mensualités minimales des dettes.
 * 2. Si ces obligations dépassent le revenu → plan de crise (priorité logement, dettes, essentiels, famille).
 * 3. Sinon, le reste est réparti par pondérations qui dépendent de la situation :
 *    fonds d'urgence (tant qu'il n'est pas constitué), dettes chères, objectifs, investissement
 *    (seulement quand les fondations sont posées, selon la tolérance au risque), plaisir, marge.
 *    Chaque enveloppe a un plafond (ex. on n'épargne pas plus que l'écart restant du fonds
 *    d'urgence) ; l'excédent est redistribué.
 * 4. Arrondis lisibles (500 FCFA, 1 €/$) ; la marge absorbe l'écart : le total est exact.
 */
import type { CurrencyCode, IncomeType, PlannerBucket, RiskTolerance } from '@/lib/constants';
import { PLANNER_BUCKET_LABELS } from '@/lib/constants';
import { CURRENCY_META, formatMoney, ratio, roundDownTo, roundUpTo, sum } from './money';

export interface PlannerDebt {
  id: string;
  name: string;
  balance: number;
  /** Taux annuel en points de base (1 550 = 15,50 %). */
  annualRateBp: number;
  minimumPayment: number;
}

export interface PlannerGoal {
  id: string;
  name: string;
  remaining: number;
  /** Contribution mensuelle nécessaire pour tenir la date (0 si pas de date). */
  requiredMonthly: number;
}

export interface PlannerInput {
  amount: number;
  currency: CurrencyCode;
  /** Besoins mensuels estimés par enveloppe (unités mineures). */
  needs: { logement: number; essentiels: number; famille: number; plaisir: number };
  needsSource: 'historique' | 'declaratif';
  debts: PlannerDebt[];
  emergency: { balance: number; target: number };
  essentialMonthly: number;
  goals: PlannerGoal[];
  riskTolerance: RiskTolerance;
  incomeType: IncomeType;
}

export interface PlannerItem {
  bucket: PlannerBucket;
  label: string;
  amount: number;
  percent: number;
  rationale: string;
}

export type PlannerStatus = 'ok' | 'serre' | 'deficit';

export interface PlannerResult {
  total: number;
  currency: CurrencyCode;
  status: PlannerStatus;
  shortfall: number;
  items: PlannerItem[];
  notes: string[];
  emergency: {
    monthsCovered: number;
    targetMonths: number;
    monthsToTarget: number | null;
  };
}

/** Seuil à partir duquel une dette est considérée « chère » : 10 % par an. */
export const HIGH_INTEREST_BP = 1000;

const INVEST_WEIGHT: Record<RiskTolerance, number> = { prudent: 15, equilibre: 25, dynamique: 35 };

type FlexBucket = 'urgence' | 'dettes_extra' | 'objectifs' | 'investissement' | 'plaisir' | 'marge';

/** Répartition proportionnelle avec plafonds (« water-filling »). Retourne les allocations exactes (non arrondies). */
export function distributeWithCaps(
  amount: number,
  weights: Partial<Record<FlexBucket, number>>,
  caps: Partial<Record<FlexBucket, number>>,
): Record<FlexBucket, number> {
  const alloc: Record<FlexBucket, number> = { urgence: 0, dettes_extra: 0, objectifs: 0, investissement: 0, plaisir: 0, marge: 0 };
  let remaining = amount;
  let active = (Object.keys(weights) as FlexBucket[]).filter((k) => (weights[k] ?? 0) > 0 && (caps[k] ?? Infinity) > 0);
  let guard = 0;
  while (remaining > 0.5 && active.length > 0 && guard < 20) {
    guard += 1;
    const totalWeight = sum(active.map((k) => weights[k] ?? 0));
    let distributed = 0;
    const stillActive: FlexBucket[] = [];
    for (const key of active) {
      const share = (remaining * (weights[key] ?? 0)) / totalWeight;
      const room = (caps[key] ?? Infinity) - alloc[key];
      const given = Math.min(share, room);
      alloc[key] += given;
      distributed += given;
      if (given < share - 1e-9) continue; // plafond atteint
      stillActive.push(key);
    }
    remaining -= distributed;
    if (stillActive.length === active.length) break; // aucun plafond atteint : tout est distribué
    active = stillActive;
  }
  if (remaining > 0.5) alloc.marge += remaining;
  return alloc;
}

export function generateSalaryPlan(input: PlannerInput): PlannerResult {
  const { amount, currency } = input;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Le montant à répartir doit être positif.');
  const g = CURRENCY_META[currency].granularity;
  const money = (v: number) => formatMoney(v, currency);
  const irregular = input.incomeType !== 'fixe';
  const targetMonths = irregular ? 6 : 3;
  const notes: string[] = [];

  const activeDebts = input.debts.filter((d) => d.balance > 0);
  const debtMinimum = sum(activeDebts.map((d) => Math.min(d.minimumPayment, d.balance)));

  // 1. Besoins arrondis au pas supérieur (repli sur les montants exacts si l'arrondi crée un déficit artificiel).
  let needs = {
    logement: roundUpTo(input.needs.logement, g),
    essentiels: roundUpTo(input.needs.essentiels, g),
    famille: roundUpTo(input.needs.famille, g),
    dettes: roundUpTo(debtMinimum, g),
  };
  if (needs.logement + needs.essentiels + needs.famille + needs.dettes > amount) {
    needs = {
      logement: input.needs.logement,
      essentiels: input.needs.essentiels,
      famille: input.needs.famille,
      dettes: debtMinimum,
    };
  }
  const obligations = needs.logement + needs.essentiels + needs.famille + needs.dettes;

  const emergencyGap = Math.max(0, input.emergency.target - input.emergency.balance);
  const monthsCovered = input.essentialMonthly > 0 ? input.emergency.balance / input.essentialMonthly : 0;

  const allocations: Record<PlannerBucket, number> = {
    logement: 0,
    essentiels: 0,
    famille: 0,
    dettes: 0,
    urgence: 0,
    objectifs: 0,
    investissement: 0,
    plaisir: 0,
    marge: 0,
  };
  const rationales: Partial<Record<PlannerBucket, string>> = {};
  const sourceText =
    input.needsSource === 'historique' ? 'd’après la moyenne de tes 3 derniers mois' : 'd’après les montants déclarés dans ton profil';

  let status: PlannerStatus = 'ok';
  let shortfall = 0;

  if (obligations > amount) {
    // 2. Plan de crise : on couvre d'abord le toit, les engagements contractuels, puis l'essentiel.
    status = 'deficit';
    shortfall = obligations - amount;
    let remaining = amount;
    for (const key of ['logement', 'dettes', 'essentiels', 'famille'] as const) {
      const given = Math.min(needs[key], remaining);
      allocations[key] = given;
      remaining -= given;
    }
    allocations.marge = remaining;
    notes.push(
      `Tes besoins estimés (${money(obligations)}) dépassent ce revenu de ${money(shortfall)}. Ce plan couvre en priorité le logement, les mensualités de dettes et les besoins essentiels.`,
      'Pistes : réduire un poste de dépense fixe, négocier un échéancier avec un créancier, ou générer un revenu complémentaire.',
    );
    rationales.logement = `Priorité absolue, ${sourceText}.`;
    rationales.dettes = activeDebts.length
      ? `Mensualités minimales de tes ${activeDebts.length} dette(s) : un retard coûte cher.`
      : 'Aucune dette en cours.';
    rationales.essentiels = `Alimentation, transport, santé, communication, ${sourceText}.`;
    rationales.famille = `Solidarité familiale et éducation, ${sourceText}.`;
    rationales.urgence = 'Pas d’épargne possible ce mois-ci : la priorité est de rééquilibrer le budget.';
    rationales.marge = remaining > 0 ? 'Reste disponible après les priorités.' : 'Aucune marge disponible ce mois-ci.';
  } else {
    allocations.logement = needs.logement;
    allocations.essentiels = needs.essentiels;
    allocations.famille = needs.famille;
    allocations.dettes = needs.dettes;
    const free = amount - obligations;

    const highInterest = activeDebts.filter((d) => d.annualRateBp >= HIGH_INTEREST_BP).sort((a, b) => b.annualRateBp - a.annualRateBp);
    const highInterestRoom = sum(highInterest.map((d) => Math.max(0, d.balance - Math.min(d.minimumPayment, d.balance))));
    const goalsNeed = sum(input.goals.map((goal) => Math.min(goal.requiredMonthly, goal.remaining)));
    const goalsRemaining = sum(input.goals.map((goal) => goal.remaining));

    const weights: Partial<Record<FlexBucket, number>> = {
      marge: irregular ? 12 : 8,
      plaisir: 20,
      urgence: emergencyGap > 0 ? (monthsCovered < 1 ? 40 : 28) : 0,
      dettes_extra: highInterest.length > 0 ? (monthsCovered < 1 ? 15 : 25) : 0,
      objectifs: goalsNeed > 0 ? 22 : goalsRemaining > 0 ? 10 : 0,
      investissement:
        highInterest.length === 0 && emergencyGap === 0
          ? INVEST_WEIGHT[input.riskTolerance]
          : highInterest.length === 0 && monthsCovered >= 1 && input.riskTolerance !== 'prudent'
            ? 5
            : 0,
    };
    const plaisirFloor = Math.min(free, amount * 0.05);
    const plaisirCap = Math.max(plaisirFloor, Math.min(amount * 0.15, Math.max(input.needs.plaisir, amount * 0.1)));
    const caps: Partial<Record<FlexBucket, number>> = {
      urgence: emergencyGap,
      dettes_extra: highInterestRoom,
      objectifs: goalsNeed > 0 ? goalsNeed : goalsRemaining,
      plaisir: plaisirCap,
      marge: Math.max(amount * 0.1, g),
    };
    const flex = distributeWithCaps(free, weights, caps);
    // Si tout est plafonné, le surplus va à l'investissement quand c'est pertinent, sinon à l'épargne de précaution… sinon la marge.
    const overflow = flex.marge - Math.min(flex.marge, caps.marge ?? Infinity);
    if (overflow > 0) {
      flex.marge -= overflow;
      if ((weights.investissement ?? 0) > 0 || (highInterest.length === 0 && emergencyGap === 0)) flex.investissement += overflow;
      else if (goalsRemaining > flex.objectifs) flex.objectifs += overflow;
      else flex.marge += overflow;
    }

    allocations.urgence = roundDownTo(flex.urgence, g);
    allocations.dettes += roundDownTo(flex.dettes_extra, g);
    allocations.objectifs = roundDownTo(flex.objectifs, g);
    allocations.investissement = roundDownTo(flex.investissement, g);
    allocations.plaisir = roundDownTo(flex.plaisir, g);
    const allocatedWithoutMargin = sum(
      (Object.keys(allocations) as PlannerBucket[]).filter((k) => k !== 'marge').map((k) => allocations[k]),
    );
    allocations.marge = amount - allocatedWithoutMargin;

    if (ratio(free, amount) < 0.1) {
      status = 'serre';
      notes.push('Ton budget est serré : moins de 10 % du revenu reste après les besoins essentiels et les dettes.');
    }

    rationales.logement = `Loyer et charges du logement, ${sourceText}.`;
    rationales.essentiels = `Alimentation, transport, santé, communication et charges d’activité, ${sourceText}.`;
    rationales.famille = `Solidarité familiale et éducation, ${sourceText}.`;
    const extra = allocations.dettes - needs.dettes;
    if (activeDebts.length === 0) rationales.dettes = 'Aucune dette en cours : bravo.';
    else if (extra > 0 && highInterest[0]) {
      rationales.dettes = `Mensualités minimales (${money(needs.dettes)}) + ${money(extra)} pour solder plus vite « ${highInterest[0].name} » (${(highInterest[0].annualRateBp / 100).toLocaleString('fr-FR')} % par an) — méthode avalanche.`;
    } else {
      rationales.dettes = `Mensualités minimales de tes ${activeDebts.length} dette(s).`;
    }

    if (emergencyGap === 0) {
      rationales.urgence = `Ton fonds d’urgence est constitué (${targetMonths} mois de dépenses essentielles) : rien à ajouter ce mois-ci.`;
    } else {
      const monthsToTarget = allocations.urgence > 0 ? Math.ceil(emergencyGap / allocations.urgence) : null;
      rationales.urgence = `Ton fonds d’urgence couvre ${monthsCovered.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} mois de dépenses essentielles ; objectif : ${targetMonths} mois (${money(input.emergency.target)}).${monthsToTarget ? ` À ce rythme, objectif atteint dans ${monthsToTarget} mois.` : ''}`;
    }

    if (input.goals.length === 0) rationales.objectifs = 'Aucun objectif actif : crée un objectif pour donner une destination à ton épargne.';
    else if (goalsNeed > 0 && allocations.objectifs >= goalsNeed) rationales.objectifs = `Couvre les contributions nécessaires pour tenir les dates de tes ${input.goals.length} objectif(s).`;
    else if (goalsNeed > 0) rationales.objectifs = `Les contributions nécessaires (${money(goalsNeed)}) ne sont couvertes qu’en partie : envisage de repousser une date cible.`;
    else rationales.objectifs = 'Fait avancer tes objectifs sans date cible.';

    if (allocations.investissement === 0) {
      rationales.investissement =
        highInterest.length > 0
          ? 'Pas d’investissement tant que des dettes chères sont en cours : les rembourser est un « placement » garanti.'
          : 'Pas d’investissement avant d’avoir constitué ton épargne de précaution.';
    } else if (emergencyGap > 0) {
      rationales.investissement = 'Une petite part pour apprendre à investir, sans négliger ton épargne de précaution.';
    } else {
      rationales.investissement = `Tes fondations sont posées : part adaptée à ton profil de risque. Rien n’est garanti — informe-toi dans le centre d’investissement.`;
    }
    rationales.plaisir = 'Un budget plaisir réaliste rend le plan tenable dans la durée.';
    rationales.marge = irregular
      ? 'Marge pour les imprévus, plus large car tes revenus sont irréguliers (inclut les arrondis).'
      : 'Marge de sécurité pour les imprévus (inclut les arrondis).';
  }

  const order: PlannerBucket[] = ['logement', 'essentiels', 'famille', 'dettes', 'urgence', 'objectifs', 'investissement', 'plaisir', 'marge'];
  const items: PlannerItem[] = order
    .filter((bucket) => allocations[bucket] > 0 || ['logement', 'essentiels', 'urgence', 'marge'].includes(bucket))
    .map((bucket) => ({
      bucket,
      label: PLANNER_BUCKET_LABELS[bucket],
      amount: allocations[bucket],
      percent: ratio(allocations[bucket], amount),
      rationale: rationales[bucket] ?? '',
    }));

  const urgenceAmount = allocations.urgence;
  return {
    total: amount,
    currency,
    status,
    shortfall,
    items,
    notes,
    emergency: {
      monthsCovered,
      targetMonths,
      monthsToTarget: emergencyGap === 0 ? 0 : urgenceAmount > 0 ? Math.ceil(emergencyGap / urgenceAmount) : null,
    },
  };
}

/** Vérifie qu'une répartition modifiée par l'utilisateur est cohérente. */
export function validateCustomAllocation(total: number, amounts: Record<string, number>): { ok: boolean; difference: number } {
  const allocated = sum(Object.values(amounts));
  return { ok: allocated === total, difference: total - allocated };
}

/**
 * Répartit le montant d'une enveloppe entre ses catégories, au prorata de l'historique
 * (ou équitablement à défaut). Le total est conservé exactement.
 */
export function splitBucketAcrossCategories(
  amount: number,
  categories: { categoryId: string; historical: number }[],
  granularity: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  if (categories.length === 0) return result;
  const totalHist = sum(categories.map((c) => c.historical));
  let allocated = 0;
  categories.forEach((c, index) => {
    const isLast = index === categories.length - 1;
    const share = totalHist > 0 ? (amount * c.historical) / totalHist : amount / categories.length;
    const value = isLast ? amount - allocated : roundDownTo(share, granularity);
    result[c.categoryId] = value;
    allocated += value;
  });
  return result;
}
