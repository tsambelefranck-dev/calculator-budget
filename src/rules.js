// Seuils du diagnostic budgétaire, calibrés pour un salarié africain francophone
// (charges de solidarité familiale/tontine intégrées aux dépenses variables).

export const THRESHOLDS = {
  tauxEpargneFragile: 0.05, // < 5% du revenu épargné
  tauxEpargneEquilibre: 0.15, // 5% à 15% -> équilibré, >= 15% -> optimisé
  chargesFixesElevees: 0.5, // charges fixes > 50% du revenu
  depensesVariablesElevees: 0.35, // dépenses variables > 35% du revenu
};

export function resolveDiagnosticKey({ resteAVivre, tauxEpargne }) {
  if (resteAVivre < 0) return 'deficit';
  if (tauxEpargne < THRESHOLDS.tauxEpargneFragile) return 'fragile';
  if (tauxEpargne < THRESHOLDS.tauxEpargneEquilibre) return 'equilibre';
  return 'optimise';
}
