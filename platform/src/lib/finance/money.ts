/**
 * Monnaie : tous les montants sont des entiers en unités mineures.
 * - XAF / XOF : 1 unité = 1 FCFA (pas de subdivision)
 * - USD / EUR : 1 unité = 1 centime
 *
 * Aucun calcul monétaire ne doit utiliser de flottants sans arrondi explicite.
 */
import type { CurrencyCode } from '@/lib/constants';

export interface CurrencyMeta {
  code: CurrencyCode;
  decimals: number;
  symbol: string;
  label: string;
  /** Pas d'arrondi « lisible » utilisé par le planificateur (en unités mineures). */
  granularity: number;
}

export const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  XAF: { code: 'XAF', decimals: 0, symbol: 'FCFA', label: 'Franc CFA BEAC (XAF)', granularity: 500 },
  XOF: { code: 'XOF', decimals: 0, symbol: 'FCFA', label: 'Franc CFA BCEAO (XOF)', granularity: 500 },
  USD: { code: 'USD', decimals: 2, symbol: '$', label: 'Dollar américain (USD)', granularity: 100 },
  EUR: { code: 'EUR', decimals: 2, symbol: '€', label: 'Euro (EUR)', granularity: 100 },
};

/** Parité fixe officielle : 1 EUR = 655,957 XAF = 655,957 XOF. */
export const EUR_CFA_PARITY = 655.957;

/** Montant maximal accepté (en unités mineures) : protège contre les saisies absurdes. */
export const MAX_AMOUNT_MINOR = 1_000_000_000_000_000; // 1e15

export function minorFactor(currency: CurrencyCode): number {
  return 10 ** CURRENCY_META[currency].decimals;
}

export function toMinor(major: number, currency: CurrencyCode): number {
  return Math.round(major * minorFactor(currency));
}

export function toMajor(minor: number, currency: CurrencyCode): number {
  return minor / minorFactor(currency);
}

/** Arrondi au multiple supérieur (montants positifs). */
export function roundUpTo(value: number, step: number): number {
  if (step <= 1) return Math.ceil(value);
  return Math.ceil(value / step) * step;
}

/** Arrondi au multiple inférieur (montants positifs). */
export function roundDownTo(value: number, step: number): number {
  if (step <= 1) return Math.floor(value);
  return Math.floor(value / step) * step;
}

/** Arrondi au multiple le plus proche. */
export function roundTo(value: number, step: number): number {
  if (step <= 1) return Math.round(value);
  return Math.round(value / step) * step;
}

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Ratio sécurisé (0 si dénominateur nul). */
export function ratio(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
}

const PEGGED: ReadonlySet<CurrencyCode> = new Set(['EUR', 'XAF', 'XOF']);

/**
 * Conversion exacte entre devises à parité fixe (EUR, XAF, XOF).
 * Retourne `null` pour toute paire impliquant une devise flottante (USD) :
 * aucun taux n'est inventé.
 */
export function convertMinor(amount: number, from: CurrencyCode, to: CurrencyCode): number | null {
  if (from === to) return amount;
  if (!PEGGED.has(from) || !PEGGED.has(to)) return null;
  if ((from === 'XAF' && to === 'XOF') || (from === 'XOF' && to === 'XAF')) return amount;
  const fromMajor = toMajor(amount, from);
  const eur = from === 'EUR' ? fromMajor : fromMajor / EUR_CFA_PARITY;
  const toMajorValue = to === 'EUR' ? eur : eur * EUR_CFA_PARITY;
  return toMinor(toMajorValue, to);
}

export function canConvert(from: CurrencyCode, to: CurrencyCode): boolean {
  return from === to || (PEGGED.has(from) && PEGGED.has(to));
}

const SPACES = /[\s\u00a0\u202f]/g;
/** Groupes de milliers avec un séparateur cohérent : « 300.000 », « 1,234,567 ». */
const THOUSANDS_PATTERN = /^\d{1,3}(?:([.,])\d{3})(?:\1\d{3})*$/;
/** Nombre décimal, éventuellement avec groupes de milliers : « 12,5 », « 1.234,56 », « 1,234.56 ». */
const DECIMAL_PATTERN = /^(\d{1,3}(?:([.,])\d{3})(?:\2\d{3})*|\d+)([.,])(\d+)$/;

/**
 * Analyse une saisie utilisateur (« 300 000 », « 300.000 », « 1 234,56 », « 12.5 »)
 * et retourne le montant en unités mineures, ou `null` si la saisie est invalide.
 * Les montants négatifs sont refusés.
 */
export function parseAmount(input: string | number | null | undefined, currency: CurrencyCode): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input < 0) return null;
    const minor = toMinor(input, currency);
    return minor <= MAX_AMOUNT_MINOR ? minor : null;
  }
  const raw = input.replace(SPACES, '').replace(/fcfa|cfa|f|€|\$|eur|usd|xaf|xof/gi, '');
  if (raw === '') return null;

  let major: number;
  if (/^\d+$/.test(raw)) {
    major = Number(raw);
  } else if (THOUSANDS_PATTERN.test(raw)) {
    major = Number(raw.replace(/[.,]/g, ''));
  } else {
    const match = DECIMAL_PATTERN.exec(raw);
    if (!match) return null;
    const [, intPart = '0', groupSep, decimalSep, decimals = '0'] = match;
    if (groupSep && groupSep === decimalSep) return null;
    major = Number(`${intPart.replace(/[.,]/g, '')}.${decimals}`);
  }
  if (!Number.isFinite(major) || major < 0) return null;
  const minor = toMinor(major, currency);
  return minor <= MAX_AMOUNT_MINOR ? minor : null;
}

export interface FormatOptions {
  locale?: string;
  /** Affiche le signe + pour les montants positifs. */
  signed?: boolean;
  /** Format compact (« 1,2 M FCFA »). */
  compact?: boolean;
  /** Masque la devise. */
  hideCurrency?: boolean;
}

/** Formate un montant en unités mineures pour l'affichage. */
export function formatMoney(minor: number, currency: CurrencyCode, options: FormatOptions = {}): string {
  const { locale = 'fr-FR', signed = false, compact = false, hideCurrency = false } = options;
  const meta = CURRENCY_META[currency];
  const major = toMajor(minor, currency);
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: compact ? 0 : meta.decimals,
    maximumFractionDigits: compact ? 1 : meta.decimals,
    notation: compact ? 'compact' : 'standard',
    signDisplay: signed ? 'exceptZero' : 'auto',
  });
  const number = formatter.format(major);
  if (hideCurrency) return number;
  if (meta.decimals === 0 || locale.startsWith('fr')) return `${number} ${meta.symbol}`;
  return `${meta.symbol}${number}`;
}

/** Formate un pourcentage à partir d'un ratio (0.153 → « 15,3 % »). */
export function formatPercent(value: number, locale = 'fr-FR', fractionDigits = 0, signed = false): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value);
}

/** Valeur numérique « brute » d'un montant pour pré-remplir un champ de saisie. */
export function minorToInputValue(minor: number | null | undefined, currency: CurrencyCode): string {
  if (minor === null || minor === undefined) return '';
  const meta = CURRENCY_META[currency];
  const major = toMajor(minor, currency);
  return meta.decimals === 0 ? String(major) : major.toFixed(meta.decimals);
}
