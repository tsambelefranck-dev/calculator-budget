/**
 * Simulateur d'investissement. Les résultats sont des SIMULATIONS fondées sur des
 * hypothèses choisies par l'utilisateur — jamais des promesses de gains.
 *
 * Modèle mensuel :
 *   valeur ← valeur × (1 + r)   avec r = (1 + taux annuel)^(1/12) − 1 (taux effectif)
 *   frais  ← valeur × frais annuels / 12, déduits chaque mois
 *   valeur ← valeur + versement mensuel (fin de mois)
 * Valeur réelle = valeur nominale / (1 + inflation)^(années).
 */

export interface SimulationInput {
  initial: number;
  monthly: number;
  months: number;
  annualRatePct: number;
  annualFeePct: number;
  inflationPct: number;
}

export interface SimulationYear {
  year: number;
  contributed: number;
  value: number;
  realValue: number;
  fees: number;
}

export interface SimulationResult {
  finalValue: number;
  finalRealValue: number;
  totalContributed: number;
  totalGains: number;
  totalFees: number;
  yearly: SimulationYear[];
}

export const SIMULATION_LIMITS = {
  maxMonths: 600,
  minRatePct: -90,
  maxRatePct: 100,
  maxFeePct: 20,
  maxInflationPct: 50,
};

export function simulateInvestment(input: SimulationInput): SimulationResult {
  const months = Math.min(Math.max(1, Math.round(input.months)), SIMULATION_LIMITS.maxMonths);
  const rate = Math.min(Math.max(input.annualRatePct, SIMULATION_LIMITS.minRatePct), SIMULATION_LIMITS.maxRatePct) / 100;
  const fee = Math.min(Math.max(input.annualFeePct, 0), SIMULATION_LIMITS.maxFeePct) / 100;
  const inflation = Math.min(Math.max(input.inflationPct, 0), SIMULATION_LIMITS.maxInflationPct) / 100;
  const monthlyRate = Math.pow(1 + rate, 1 / 12) - 1;
  const monthlyFee = fee / 12;

  let value = Math.max(0, input.initial);
  let contributed = Math.max(0, input.initial);
  let fees = 0;
  const yearly: SimulationYear[] = [];

  for (let m = 1; m <= months; m += 1) {
    value *= 1 + monthlyRate;
    const feeThisMonth = value * monthlyFee;
    value -= feeThisMonth;
    fees += feeThisMonth;
    value += Math.max(0, input.monthly);
    contributed += Math.max(0, input.monthly);
    if (m % 12 === 0 || m === months) {
      const years = m / 12;
      yearly.push({
        year: Math.ceil(years),
        contributed: Math.round(contributed),
        value: Math.round(value),
        realValue: Math.round(value / Math.pow(1 + inflation, years)),
        fees: Math.round(fees),
      });
    }
  }

  const finalValue = Math.round(value);
  const finalRealValue = Math.round(value / Math.pow(1 + inflation, months / 12));
  const totalContributed = Math.round(contributed);
  return {
    finalValue,
    finalRealValue,
    totalContributed,
    totalGains: finalValue - totalContributed,
    totalFees: Math.round(fees),
    yearly,
  };
}

export interface ScenarioHypothesis {
  key: 'pessimiste' | 'intermediaire' | 'optimiste';
  label: string;
  annualRatePct: number;
}

export interface ScenarioPreset {
  key: string;
  label: string;
  description: string;
  feePct: number;
  scenarios: [number, number, number];
}

/**
 * Valeurs ILLUSTRATIVES par défaut : elles servent à montrer l'écart entre scénarios
 * selon la nature du placement. Ce ne sont pas des données de marché : l'utilisateur
 * doit les remplacer par ses propres hypothèses ou par des données sourcées.
 */
export const SCENARIO_PRESETS: readonly ScenarioPreset[] = [
  { key: 'epargne', label: 'Épargne sans rendement', description: 'Argent mis de côté sans rémunération (cash, compte courant, tontine).', feePct: 0, scenarios: [0, 0, 0] },
  { key: 'placement', label: 'Placement à rendement hypothétique', description: 'Placement peu risqué (ex. compte ou dépôt rémunéré) : écart faible entre scénarios.', feePct: 0, scenarios: [1, 3, 5] },
  { key: 'commerce', label: 'Activité commerciale', description: 'Petit commerce : résultats très dispersés, perte possible du capital.', feePct: 0, scenarios: [-30, 5, 25] },
  { key: 'immobilier', label: 'Investissement immobilier', description: 'Loyers + valorisation, peu liquide, coûts d’entretien et risques fonciers.', feePct: 1, scenarios: [-5, 4, 9] },
  { key: 'financier', label: 'Investissement financier', description: 'Actions, obligations ou fonds via un intermédiaire agréé : volatilité possible.', feePct: 1.5, scenarios: [-15, 5, 12] },
];

/** Inflation par défaut : plafond du critère de convergence UEMOA/CEMAC (hypothèse, pas une mesure). */
export const DEFAULT_INFLATION_PCT = 3;

export interface ScenarioComparison {
  baseline: SimulationResult;
  scenarios: (ScenarioHypothesis & { result: SimulationResult })[];
}

export function compareScenarios(
  base: Omit<SimulationInput, 'annualRatePct'>,
  hypotheses: ScenarioHypothesis[],
): ScenarioComparison {
  const baseline = simulateInvestment({ ...base, annualRatePct: 0, annualFeePct: 0 });
  return {
    baseline,
    scenarios: hypotheses.map((h) => ({ ...h, result: simulateInvestment({ ...base, annualRatePct: h.annualRatePct }) })),
  };
}
