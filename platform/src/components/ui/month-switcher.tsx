import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { addMonths, formatMonthLabel, type MonthKey } from '@/lib/finance/dates';
import { cn } from '@/lib/utils';

/** Navigation entre les mois via le paramètre ?month=YYYY-MM. */
export function MonthSwitcher({ month, currentMonth, basePath, minMonth }: { month: MonthKey; currentMonth: MonthKey; basePath: string; minMonth?: MonthKey }) {
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const canPrev = !minMonth || prev >= minMonth;
  const canNext = next <= currentMonth;
  const link = (m: MonthKey) => `${basePath}?month=${m}`;
  const btn = 'flex size-9 items-center justify-center rounded-xl border bg-surface text-ink-2 hover:bg-surface-2';
  return (
    <div className="inline-flex items-center gap-2" aria-label="Choisir le mois">
      {canPrev ? (
        <Link href={link(prev)} className={btn} aria-label={`Mois précédent : ${formatMonthLabel(prev)}`}>
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(btn, 'opacity-40')} aria-hidden><ChevronLeft className="size-4" /></span>
      )}
      <span className="min-w-36 text-center text-sm font-semibold">{formatMonthLabel(month)}{month === currentMonth ? ' · en cours' : ''}</span>
      {canNext ? (
        <Link href={link(next)} className={btn} aria-label={`Mois suivant : ${formatMonthLabel(next)}`}>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(btn, 'opacity-40')} aria-hidden><ChevronRight className="size-4" /></span>
      )}
    </div>
  );
}

export function resolveMonth(value: string | string[] | undefined, currentMonth: MonthKey, minMonth?: MonthKey): MonthKey {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !/^\d{4}-(0[1-9]|1[0-2])$/.test(v) || v > currentMonth) return currentMonth;
  if (minMonth && v < minMonth) return minMonth;
  return v;
}
