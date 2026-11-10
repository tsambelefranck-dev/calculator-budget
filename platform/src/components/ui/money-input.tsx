'use client';

import { useState, type ComponentProps } from 'react';
import type { CurrencyCode } from '@/lib/constants';
import { CURRENCY_META, minorToInputValue } from '@/lib/finance/money';
import { cn } from '@/lib/utils';
import { inputClasses } from './field';

/** Met en forme la saisie : groupes de milliers séparés par des espaces, un seul séparateur décimal. */
export function formatAmountInput(raw: string, decimals: number): string {
  let cleaned = raw.replace(/[^\d.,]/g, '');
  if (decimals === 0) cleaned = cleaned.replace(/[.,]/g, '');
  const sepIndex = cleaned.search(/[.,]/);
  let intPart = sepIndex >= 0 ? cleaned.slice(0, sepIndex) : cleaned;
  let decPart = sepIndex >= 0 ? cleaned.slice(sepIndex + 1).replace(/[.,]/g, '').slice(0, decimals) : '';
  intPart = intPart.replace(/^0+(?=\d)/, '');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (sepIndex >= 0 && decimals > 0) return `${grouped || '0'},${decPart}`;
  decPart = '';
  return grouped;
}

export interface MoneyInputProps extends Omit<ComponentProps<'input'>, 'defaultValue' | 'value' | 'onChange' | 'type'> {
  currency: CurrencyCode;
  /** Valeur initiale en unités mineures. */
  defaultMinor?: number | null;
  /** Valeur initiale saisie (prioritaire, ex. après une erreur de validation). */
  defaultText?: string;
  onValueChange?: (text: string) => void;
}

export function MoneyInput({ currency, defaultMinor, defaultText, className, onValueChange, ...props }: MoneyInputProps) {
  const meta = CURRENCY_META[currency];
  const [value, setValue] = useState(() =>
    formatAmountInput(defaultText ?? minorToInputValue(defaultMinor, currency).replace('.', ','), meta.decimals),
  );
  return (
    <div className="relative">
      <input
        type="text"
        inputMode={meta.decimals > 0 ? 'decimal' : 'numeric'}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          const next = formatAmountInput(event.target.value, meta.decimals);
          setValue(next);
          onValueChange?.(next);
        }}
        className={cn(inputClasses, 'pr-16 text-right tabular font-medium', className)}
        {...props}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-muted">{meta.symbol}</span>
    </div>
  );
}
