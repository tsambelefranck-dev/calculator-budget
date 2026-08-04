import { resolveDiagnosticKey, THRESHOLDS } from './rules.js';
import { DIAGNOSTIC_LABELS } from './content.js';

const CHARGES_FIXES_KEYS = ['loyer', 'transport', 'factures', 'autresFixes'];
const DEPENSES_VARIABLES_KEYS = ['alimentation', 'famille', 'loisirs', 'imprevus'];

function sumKeys(data, keys) {
  return keys.reduce((total, key) => total + (Number(data[key]) || 0), 0);
}

export function calculateBudget(data) {
  const revenu = Number(data.revenu) || 0;
  const chargesFixes = sumKeys(data, CHARGES_FIXES_KEYS);
  const depensesVariables = sumKeys(data, DEPENSES_VARIABLES_KEYS);
  const epargneActuelle = Math.max(0, Number(data.epargneActuelle) || 0);

  const totalDepenses = chargesFixes + depensesVariables;
  const resteAVivre = revenu - totalDepenses;
  const tauxEpargne = revenu > 0 ? epargneActuelle / revenu : 0;
  const nonAffecte = Math.max(0, resteAVivre - epargneActuelle);

  return {
    revenu,
    chargesFixes,
    depensesVariables,
    epargneActuelle,
    totalDepenses,
    resteAVivre,
    tauxEpargne,
    nonAffecte,
  };
}

export function getRepartition(totals) {
  const { revenu, chargesFixes, depensesVariables, epargneActuelle, nonAffecte } = totals;
  // En cas de déficit (dépenses + épargne > revenu), on élargit la base pour que
  // les segments du donut ne dépassent jamais un tour complet du cercle.
  const base = Math.max(revenu, chargesFixes + depensesVariables + epargneActuelle, 1);

  return [
    { key: 'chargesFixes', value: chargesFixes, pct: chargesFixes / base, color: 'var(--color-danger)' },
    { key: 'depensesVariables', value: depensesVariables, pct: depensesVariables / base, color: 'var(--color-warning)' },
    { key: 'epargne', value: epargneActuelle, pct: epargneActuelle / base, color: 'var(--color-primary)' },
    { key: 'nonAffecte', value: nonAffecte, pct: nonAffecte / base, color: 'var(--color-border)' },
  ].filter((segment) => segment.value > 0);
}

export function getDiagnostic(totals) {
  const key = resolveDiagnosticKey(totals);
  return { key, ...DIAGNOSTIC_LABELS[key] };
}

export function getConseils(totals, diagnosticKey) {
  const { revenu, chargesFixes, depensesVariables, tauxEpargne } = totals;
  if (revenu <= 0) return [];

  const conseils = [];

  if (diagnosticKey === 'deficit') {
    conseils.push({
      icon: '⚠️',
      titre: 'Rééquilibrez en priorité',
      texte: "Vos dépenses dépassent votre revenu. Identifiez une charge fixe à réduire ce mois-ci avant toute chose.",
    });
  }

  if (chargesFixes / revenu > THRESHOLDS.chargesFixesElevees) {
    conseils.push({
      icon: '🏠',
      titre: 'Charges fixes trop lourdes',
      texte: 'Elles dépassent la moitié de votre revenu. Renégocier un abonnement ou revoir le poste transport peut vite libérer de la marge.',
    });
  }

  if (depensesVariables / revenu > THRESHOLDS.depensesVariablesElevees) {
    conseils.push({
      icon: '🧾',
      titre: 'Dépenses variables à surveiller',
      texte: 'Elles pèsent lourd ce mois-ci. Fixez-vous une enveloppe fixe pour les loisirs et les imprévus.',
    });
  }

  if (tauxEpargne < THRESHOLDS.tauxEpargneFragile && diagnosticKey !== 'deficit') {
    conseils.push({
      icon: '💡',
      titre: 'Commencez petit',
      texte: 'Même 5% de votre revenu mis de côté automatiquement dès réception du salaire change la donne sur un an.',
    });
  }

  if (diagnosticKey === 'optimise') {
    conseils.push({
      icon: '📈',
      titre: 'Passez à l\'étape suivante',
      texte: 'Votre épargne est régulière : c\'est le moment d\'apprendre à la faire fructifier plutôt que de la laisser dormir.',
    });
  }

  return conseils.slice(0, 3);
}
