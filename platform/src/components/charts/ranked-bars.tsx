import type { CurrencyCode } from '@/lib/constants';
import { formatMoney } from '@/lib/finance/money';

export interface RankedItem {
  label: string;
  value: number;
  hint?: string;
}

/**
 * Barres horizontales classées, une seule teinte (comparaison des parts d'un tout).
 * Préférées au donut : les longueurs sur une même ligne de base se comparent mieux.
 */
export function RankedBars({ items, currency, total, max = 6 }: { items: RankedItem[]; currency: CurrencyCode; total: number; max?: number }) {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, max);
  const tail = sorted.slice(max);
  if (tail.length) head.push({ label: `Autres (${tail.length})`, value: tail.reduce((s, i) => s + i.value, 0) });
  const top = head[0]?.value ?? 1;
  return (
    <ul className="space-y-3">
      {head.map((item) => {
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <li key={item.label} className="space-y-1" title={`${item.label} : ${formatMoney(item.value, currency)} (${share} %)`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ink">{item.label}</span>
              <span className="shrink-0 text-ink-2 tabular">
                {formatMoney(item.value, currency)} <span className="text-muted">· {share} %</span>
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-chart-1-track">
              <div className="h-full rounded-full bg-chart-1" style={{ width: `${Math.max(2, (item.value / top) * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
