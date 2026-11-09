/**
 * Dettes : simulation de remboursement mois par mois et comparaison des stratégies
 * Avalanche (taux le plus élevé d'abord) et Boule de neige (plus petit solde d'abord).
 *
 * Hypothèses (affichées dans l'interface) :
 * - intérêts mensuels = solde × taux annuel / 12, arrondis à l'unité mineure ;
 * - budget mensuel constant = somme des mensualités minimales + effort supplémentaire ;
 *   quand une dette est soldée, sa mensualité est reportée sur la suivante (effet « boule de neige ») ;
 * - aucun frais ni pénalité n'est simulé.
 */
import { sum } from './money';

export interface DebtInput {
  id: string;
  name: string;
  balance: number;
  /** Taux annuel en points de base (1 550 = 15,50 %). */
  annualRateBp: number;
  minimumPayment: number;
}

export type DebtStrategy = 'avalanche' | 'snowball' | 'minimum';

export interface ScheduleMonth {
  month: number; // 1 = premier mois
  interest: number;
  payments: Record<string, number>;
  balances: Record<string, number>;
}

export interface PayoffSimulation {
  strategy: DebtStrategy;
  feasible: boolean;
  months: number;
  totalInterest: number;
  totalPaid: number;
  payoffMonth: Record<string, number | null>;
  order: string[];
  schedule: ScheduleMonth[];
}

const MAX_MONTHS = 600;

export function monthlyInterest(balance: number, annualRateBp: number): number {
  if (balance <= 0 || annualRateBp <= 0) return 0;
  return Math.round((balance * annualRateBp) / 10_000 / 12);
}

/** Ordre de priorité des dettes selon la stratégie. */
export function strategyOrder(debts: DebtInput[], strategy: DebtStrategy): string[] {
  const list = [...debts];
  if (strategy === 'snowball') {
    list.sort((a, b) => a.balance - b.balance || b.annualRateBp - a.annualRateBp || a.id.localeCompare(b.id));
  } else {
    list.sort((a, b) => b.annualRateBp - a.annualRateBp || a.balance - b.balance || a.id.localeCompare(b.id));
  }
  return list.map((d) => d.id);
}

export function simulatePayoff(debts: DebtInput[], strategy: DebtStrategy, extraMonthly = 0): PayoffSimulation {
  const active = debts.filter((d) => d.balance > 0);
  const balances: Record<string, number> = Object.fromEntries(active.map((d) => [d.id, d.balance]));
  const payoffMonth: Record<string, number | null> = Object.fromEntries(active.map((d) => [d.id, null]));
  const order = strategyOrder(active, strategy);
  const budget = strategy === 'minimum' ? 0 : sum(active.map((d) => d.minimumPayment)) + Math.max(0, extraMonthly);
  const schedule: ScheduleMonth[] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;
  let rising = 0;
  let previousTotal = sum(Object.values(balances));

  while (month < MAX_MONTHS && Object.values(balances).some((b) => b > 0)) {
    month += 1;
    const payments: Record<string, number> = {};
    let interestThisMonth = 0;

    for (const d of active) {
      if ((balances[d.id] ?? 0) <= 0) continue;
      const interest = monthlyInterest(balances[d.id]!, d.annualRateBp);
      balances[d.id] = balances[d.id]! + interest;
      interestThisMonth += interest;
    }

    // Mensualités minimales.
    let available = budget;
    for (const d of active) {
      const balance = balances[d.id] ?? 0;
      if (balance <= 0) continue;
      const pay = Math.min(d.minimumPayment, balance);
      payments[d.id] = pay;
      balances[d.id] = balance - pay;
      if (strategy !== 'minimum') available -= pay;
    }

    // Effort supplémentaire + mensualités libérées, dans l'ordre de la stratégie.
    if (strategy !== 'minimum') {
      for (const id of order) {
        if (available <= 0) break;
        const balance = balances[id] ?? 0;
        if (balance <= 0) continue;
        const pay = Math.min(available, balance);
        payments[id] = (payments[id] ?? 0) + pay;
        balances[id] = balance - pay;
        available -= pay;
      }
    }

    for (const d of active) {
      if ((balances[d.id] ?? 0) <= 0 && payoffMonth[d.id] === null) payoffMonth[d.id] = month;
    }

    const paidThisMonth = sum(Object.values(payments));
    totalPaid += paidThisMonth;
    totalInterest += interestThisMonth;
    schedule.push({ month, interest: interestThisMonth, payments, balances: { ...balances } });

    const totalNow = sum(Object.values(balances));
    rising = totalNow >= previousTotal ? rising + 1 : 0;
    previousTotal = totalNow;
    if (rising >= 12) break; // les mensualités ne couvrent pas les intérêts : remboursement impossible
  }

  const feasible = Object.values(balances).every((b) => b <= 0);
  return { strategy, feasible, months: month, totalInterest, totalPaid, payoffMonth, order, schedule };
}

export interface StrategyComparison {
  minimum: PayoffSimulation;
  avalanche: PayoffSimulation;
  snowball: PayoffSimulation;
  recommended: 'avalanche' | 'snowball';
  interestSaved: { avalanche: number; snowball: number };
  monthsSaved: { avalanche: number; snowball: number };
  explanation: string;
}

export function compareStrategies(debts: DebtInput[], extraMonthly = 0): StrategyComparison {
  const minimum = simulatePayoff(debts, 'minimum');
  const avalanche = simulatePayoff(debts, 'avalanche', extraMonthly);
  const snowball = simulatePayoff(debts, 'snowball', extraMonthly);
  const interestSaved = {
    avalanche: Math.max(0, minimum.totalInterest - avalanche.totalInterest),
    snowball: Math.max(0, minimum.totalInterest - snowball.totalInterest),
  };
  const monthsSaved = {
    avalanche: Math.max(0, minimum.months - avalanche.months),
    snowball: Math.max(0, minimum.months - snowball.months),
  };
  const diff = snowball.totalInterest - avalanche.totalInterest;
  // Avalanche minimise toujours les intérêts ; la boule de neige est recommandée quand l'écart est faible
  // (< 2 % des intérêts) car elle procure des victoires rapides qui aident à tenir.
  const recommended: 'avalanche' | 'snowball' =
    avalanche.totalInterest === 0 || diff > Math.max(1, avalanche.totalInterest * 0.02) ? 'avalanche' : 'snowball';
  const explanation =
    recommended === 'avalanche'
      ? 'La méthode avalanche te fait payer le moins d’intérêts : rembourse d’abord la dette au taux le plus élevé.'
      : 'Les deux méthodes coûtent presque la même chose : la boule de neige te donne des victoires rapides en soldant d’abord les petites dettes.';
  return { minimum, avalanche, snowball, recommended, interestSaved, monthsSaved, explanation };
}
