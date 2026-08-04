const THOUSANDS_RE = /\B(?=(\d{3})+(?!\d))/g;

export function formatNumber(value) {
  const n = Math.max(0, Math.round(Number(value) || 0));
  return String(n).replace(THOUSANDS_RE, ' ');
}

export function formatFCFA(value) {
  return `${formatNumber(value)} FCFA`;
}

export function formatPercent(ratio) {
  return `${Math.round((Number(ratio) || 0) * 100)}%`;
}

// Nettoie une saisie utilisateur ("150 000", "150000f", "150.000") en nombre exploitable.
export function parseAmountInput(raw) {
  if (raw == null) return 0;
  const digitsOnly = String(raw).replace(/[^\d]/g, '');
  if (!digitsOnly) return 0;
  return Number(digitsOnly);
}
