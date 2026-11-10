import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StatDelta {
  /** Texte affiché (ex. « +12 % vs octobre »). */
  label: string;
  direction: 'up' | 'down' | 'flat';
  /** Une hausse est-elle une bonne nouvelle pour cet indicateur ? */
  tone: 'good' | 'bad' | 'neutral';
}

export function StatTile({
  label,
  value,
  delta,
  hint,
  icon,
  className,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  delta?: StatDelta | null;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
  emphasis?: boolean;
}) {
  const DeltaIcon = delta?.direction === 'up' ? ArrowUpRight : delta?.direction === 'down' ? ArrowDownRight : Minus;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5 rounded-2xl border bg-surface p-4 shadow-card sm:p-5', emphasis && 'border-primary/30 bg-primary-soft/40', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm text-ink-2">{label}</p>
        {icon ? <span className="text-muted">{icon}</span> : null}
      </div>
      <p className="truncate text-xl font-semibold tracking-tight text-ink sm:text-2xl">{value}</p>
      {delta ? (
        <p
          className={cn(
            'flex items-center gap-1 text-xs font-medium',
            delta.tone === 'good' && 'text-good-ink',
            delta.tone === 'bad' && 'text-critical-ink',
            delta.tone === 'neutral' && 'text-ink-2',
          )}
        >
          <DeltaIcon className="size-3.5" aria-hidden />
          <span>{delta.label}</span>
        </p>
      ) : null}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
