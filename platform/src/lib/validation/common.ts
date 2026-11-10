import { z } from 'zod';
import type { CurrencyCode } from '@/lib/constants';
import { isValidDateKey, isValidMonthKey } from '@/lib/finance/dates';
import { parseAmount } from '@/lib/finance/money';

export const dateKeySchema = z.string().trim().refine(isValidDateKey, 'Date invalide');
export const monthKeySchema = z.string().trim().refine(isValidMonthKey, 'Mois invalide');
export const uuidSchema = z.uuid('Identifiant invalide');

/** Montant saisi (texte ou nombre) converti en unités mineures de la devise de l'utilisateur. */
export function amountSchema(currency: CurrencyCode, options: { allowZero?: boolean; label?: string } = {}) {
  const label = options.label ?? 'Le montant';
  return z.union([z.string(), z.number()]).transform((value, ctx) => {
    const parsed = parseAmount(value, currency);
    if (parsed === null) {
      ctx.addIssue({ code: 'custom', message: `${label} est invalide` });
      return z.NEVER;
    }
    if (!options.allowZero && parsed <= 0) {
      ctx.addIssue({ code: 'custom', message: `${label} doit être supérieur à zéro` });
      return z.NEVER;
    }
    return parsed;
  });
}

/** Montant optionnel : chaîne vide → null. */
export function optionalAmountSchema(currency: CurrencyCode) {
  return z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
      const parsed = parseAmount(value, currency);
      if (parsed === null) {
        ctx.addIssue({ code: 'custom', message: 'Montant invalide' });
        return z.NEVER;
      }
      return parsed;
    });
}

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .optional()
    .transform((v) => (v ? v : null));

export const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} est obligatoire`).max(max, `${max} caractères maximum`);

/** Case à cocher HTML (« on ») → booléen. */
export const checkboxSchema = z
  .union([z.literal('on'), z.literal('true'), z.literal('1'), z.literal(''), z.undefined(), z.null(), z.boolean()])
  .transform((v) => v === 'on' || v === 'true' || v === '1' || v === true);

/** Taux en pourcentage saisi (« 15,5 ») → points de base (1550). */
export const ratePercentToBpSchema = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const raw = typeof value === 'number' ? value : Number(value.replace(',', '.').replace('%', '').trim() || '0');
  if (!Number.isFinite(raw) || raw < 0 || raw > 500) {
    ctx.addIssue({ code: 'custom', message: 'Taux invalide (entre 0 et 500 %)' });
    return z.NEVER;
  }
  return Math.round(raw * 100);
});
