'use client';

import { TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MultiLineChart } from '@/components/charts/charts';
import { ChartDataTable } from '@/components/charts/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { MoneyInput } from '@/components/ui/money-input';
import type { CurrencyCode } from '@/lib/constants';
import { formatMoney, parseAmount } from '@/lib/finance/money';
import { compareScenarios, DEFAULT_INFLATION_PCT, SCENARIO_PRESETS } from '@/lib/finance/simulator';
import { cn } from '@/lib/utils';

const num = (v: string, fallback: number) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};

export function Simulator({ currency, defaultInitial }: { currency: CurrencyCode; defaultInitial: number }) {
  const [presetKey, setPresetKey] = useState('placement');
  const preset = SCENARIO_PRESETS.find((p) => p.key === presetKey)!;
  const [initial, setInitial] = useState(String(defaultInitial));
  const [monthly, setMonthly] = useState('0');
  const [years, setYears] = useState('3');
  const [rates, setRates] = useState<[string, string, string]>(preset.scenarios.map(String) as [string, string, string]);
  const [fee, setFee] = useState(String(preset.feePct));
  const [inflation, setInflation] = useState(String(DEFAULT_INFLATION_PCT));

  const choosePreset = (key: string) => {
    const p = SCENARIO_PRESETS.find((x) => x.key === key)!;
    setPresetKey(key);
    setRates(p.scenarios.map(String) as [string, string, string]);
    setFee(String(p.feePct));
  };

  const result = useMemo(() => {
    const months = Math.round(Math.min(50, Math.max(0.1, num(years, 3))) * 12);
    return compareScenarios(
      {
        initial: parseAmount(initial, currency) ?? 0,
        monthly: parseAmount(monthly, currency) ?? 0,
        months,
        annualFeePct: num(fee, 0),
        inflationPct: num(inflation, DEFAULT_INFLATION_PCT),
      },
      [
        { key: 'pessimiste', label: 'Pessimiste', annualRatePct: num(rates[0], 0) },
        { key: 'intermediaire', label: 'Intermédiaire', annualRatePct: num(rates[1], 0) },
        { key: 'optimiste', label: 'Optimiste', annualRatePct: num(rates[2], 0) },
      ],
    );
  }, [initial, monthly, years, rates, fee, inflation, currency]);

  const money = (v: number) => formatMoney(v, currency);
  const start = parseAmount(initial, currency) ?? 0;
  const chartData = [{ label: 'Départ', sans_rendement: start, pessimiste: start, intermediaire: start, optimiste: start }, ...result.baseline.yearly.map((y, i) => ({
    label: `An ${y.year}`,
    sans_rendement: y.value,
    pessimiste: result.scenarios[0]!.result.yearly[i]!.value,
    intermediaire: result.scenarios[1]!.result.yearly[i]!.value,
    optimiste: result.scenarios[2]!.result.yearly[i]!.value,
  }))];

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit">
        <CardHeader><CardTitle>Tes hypothèses</CardTitle><CardDescription>Modifie chaque valeur : rien n’est figé.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Type de placement" htmlFor="sim-preset" hint={preset.description}>
            <Select id="sim-preset" value={presetKey} onChange={(e) => choosePreset(e.target.value)}>
              {SCENARIO_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label="Capital initial" htmlFor="sim-initial"><MoneyInput id="sim-initial" currency={currency} defaultText={initial} onValueChange={setInitial} /></Field>
          <Field label="Versement mensuel" htmlFor="sim-monthly"><MoneyInput id="sim-monthly" currency={currency} defaultText={monthly} onValueChange={setMonthly} /></Field>
          <Field label="Durée (années)" htmlFor="sim-years"><Input id="sim-years" inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} /></Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Taux annuels hypothétiques (%)</legend>
            <div className="grid grid-cols-3 gap-2">
              {(['Pessimiste', 'Intermédiaire', 'Optimiste'] as const).map((label, i) => (
                <label key={label} className="space-y-1 text-xs text-ink-2">
                  {label}
                  <Input inputMode="decimal" value={rates[i]} onChange={(e) => setRates((r) => r.map((v, j) => (j === i ? e.target.value : v)) as [string, string, string])} aria-label={`Taux ${label}`} />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frais annuels (%)" htmlFor="sim-fee"><Input id="sim-fee" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
            <Field label="Inflation (%)" htmlFor="sim-infl"><Input id="sim-infl" inputMode="decimal" value={inflation} onChange={(e) => setInflation(e.target.value)} /></Field>
          </div>
          <p className="text-xs text-muted">Valeurs par défaut illustratives : ce ne sont pas des données de marché. Inflation par défaut : 3 %, plafond du critère de convergence UEMOA/CEMAC (hypothèse, pas une mesure).</p>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-ink" role="note">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p><strong>Simulation, pas une promesse de gain.</strong> Les résultats dépendent entièrement des hypothèses saisies ; un placement réel peut faire moins bien, voire perdre du capital.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[{ label: 'Sans rendement', value: result.baseline.finalValue, gains: result.baseline.totalGains, real: result.baseline.finalRealValue }, ...result.scenarios.map((s) => ({ label: `${s.label} (${s.annualRatePct} %)`, value: s.result.finalValue, gains: s.result.totalGains, real: s.result.finalRealValue }))].map((s) => (
            <div key={s.label} className="rounded-2xl border bg-surface p-4 shadow-card">
              <p className="text-xs text-ink-2">{s.label}</p>
              <p className="mt-1 text-lg font-semibold tabular">{money(s.value)}</p>
              <p className={cn('text-xs font-medium', s.gains < 0 ? 'text-critical-ink' : s.gains > 0 ? 'text-good-ink' : 'text-muted')}>{s.gains >= 0 ? '+' : ''}{money(s.gains)} vs versé</p>
              <p className="text-xs text-muted">{money(s.real)} en pouvoir d’achat actuel</p>
            </div>
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>Évolution estimée</CardTitle><CardDescription>Total versé : {money(result.baseline.totalContributed)}</CardDescription></CardHeader>
          <CardContent>
            <MultiLineChart
              currency={currency}
              xLabel="Années"
              data={chartData}
              lines={[
                { key: 'pessimiste', name: 'Pessimiste', color: 'var(--chart-3)' },
                { key: 'intermediaire', name: 'Intermédiaire', color: 'var(--chart-1)' },
                { key: 'optimiste', name: 'Optimiste', color: 'var(--chart-2)' },
                { key: 'sans_rendement', name: 'Sans rendement', color: 'var(--chart-axis)' },
              ]}
            />
            <ChartDataTable
              caption="Valeurs par année"
              headers={['Année', 'Versé', 'Pessimiste', 'Intermédiaire', 'Optimiste', 'Frais (intermédiaire)']}
              rows={result.baseline.yearly.map((y, i) => [
                y.year,
                money(y.contributed),
                money(result.scenarios[0]!.result.yearly[i]!.value),
                money(result.scenarios[1]!.result.yearly[i]!.value),
                money(result.scenarios[2]!.result.yearly[i]!.value),
                money(result.scenarios[1]!.result.yearly[i]!.fees),
              ])}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
