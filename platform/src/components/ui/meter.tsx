import { CircleAlert, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MeterState = 'ok' | 'warning' | 'over';

export function meterState(ratio: number): MeterState {
  if (ratio > 1) return 'over';
  if (ratio >= 0.8) return 'warning';
  return 'ok';
}

const fill: Record<MeterState, string> = { ok: 'bg-chart-1', warning: 'bg-warning', over: 'bg-critical' };
const track: Record<MeterState, string> = { ok: 'bg-chart-1-track', warning: 'bg-warning-soft', over: 'bg-critical-soft' };

/**
 * Jauge d'un ratio par rapport à une limite (budget, objectif).
 * La couleur porte l'état ; un pictogramme + un libellé l'accompagnent toujours (jamais la couleur seule).
 */
export function Meter({
  value,
  max,
  label,
  showStatus = true,
  className,
  tone,
}: {
  value: number;
  max: number;
  label: string;
  showStatus?: boolean;
  className?: string;
  /** Force un état (ex. objectif : toujours « ok »). */
  tone?: MeterState;
}) {
  const ratio = max > 0 ? value / max : 0;
  const state = tone ?? meterState(ratio);
  const width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div
        className={cn('h-2 w-full overflow-hidden rounded-full', track[state])}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(max, 1)}
        aria-valuenow={Math.max(0, Math.round(value))}
        aria-valuetext={`${Math.round(ratio * 100)} %`}
      >
        <div className={cn('h-full rounded-full transition-[width] duration-500', fill[state])} style={{ width }} />
      </div>
      {showStatus && state !== 'ok' ? (
        <p className={cn('flex items-center gap-1 text-xs font-medium', state === 'over' ? 'text-critical-ink' : 'text-warning-ink')}>
          {state === 'over' ? <CircleAlert className="size-3.5" aria-hidden /> : <TriangleAlert className="size-3.5" aria-hidden />}
          {state === 'over' ? 'Dépassé' : 'Bientôt atteint'}
        </p>
      ) : null}
    </div>
  );
}
