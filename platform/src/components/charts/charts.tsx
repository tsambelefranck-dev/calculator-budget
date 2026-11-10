'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import type { CurrencyCode } from '@/lib/constants';
import { formatMoney } from '@/lib/finance/money';

const AXIS = { fontSize: 12, fill: 'var(--chart-axis)' };

function compact(value: number, currency: CurrencyCode) {
  return formatMoney(value, currency, { compact: true, hideCurrency: true });
}

function MoneyTooltip({ active, payload, label, currency }: TooltipContentProps<number, string> & { currency: CurrencyCode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="flex items-center gap-2 text-ink-2">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: entry.color }} aria-hidden />
          {entry.name} : <span className="font-medium text-ink tabular">{formatMoney(Number(entry.value ?? 0), currency)}</span>
        </p>
      ))}
    </div>
  );
}

export interface IncomeExpensePoint {
  label: string;
  income: number;
  expenses: number;
}

/** Revenus vs dépenses par mois (barres groupées, 2 séries catégorielles). */
export function IncomeExpenseChart({ data, currency }: { data: IncomeExpensePoint[]; currency: CurrencyCode }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} tick={AXIS} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={52} tickFormatter={(v: number) => compact(v, currency)} />
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={(props) => <MoneyTooltip {...(props as TooltipContentProps<number, string>)} currency={currency} />} />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: 'var(--text-2)' }} />
          <Bar dataKey="income" name="Revenus" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expenses" name="Dépenses" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Évolution d'une seule série (épargne, patrimoine net). */
export function TrendChart({
  data,
  currency,
  name,
  color = 'var(--chart-1)',
}: {
  data: { label: string; value: number }[];
  currency: CurrencyCode;
  name: string;
  color?: string;
}) {
  const id = `grad-${name.replace(/\W/g, '')}`;
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} tick={AXIS} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={52} tickFormatter={(v: number) => compact(v, currency)} />
          <Tooltip
            cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
            content={(props) => <MoneyTooltip {...(props as TooltipContentProps<number, string>)} currency={currency} />}
          />
          <Area type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={{ r: 3, strokeWidth: 0, fill: color }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface SeriesLine {
  key: string;
  name: string;
  color: string;
}

/** Plusieurs scénarios sur un même axe (simulateur, dettes) — aires sans remplissage. */
export function MultiLineChart({
  data,
  lines,
  currency,
  xLabel,
}: {
  data: Record<string, number | string>[];
  lines: SeriesLine[];
  currency: CurrencyCode;
  xLabel: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} tick={AXIS} aria-label={xLabel} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={56} tickFormatter={(v: number) => compact(v, currency)} />
          <Tooltip content={(props) => <MoneyTooltip {...(props as TooltipContentProps<number, string>)} currency={currency} />} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: 'var(--text-2)' }} />
          {lines.map((l) => (
            <Area key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} fill="none" dot={false} activeDot={{ r: 4 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
