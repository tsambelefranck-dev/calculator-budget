import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'primary' | 'gold' | 'good' | 'warning' | 'critical' | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-ink-2 border-border',
  primary: 'bg-primary-soft text-primary-ink border-transparent',
  gold: 'bg-accent-soft text-accent-ink border-transparent',
  good: 'bg-good-soft text-good-ink border-transparent',
  warning: 'bg-warning-soft text-warning-ink border-transparent',
  critical: 'bg-critical-soft text-critical-ink border-transparent',
  info: 'bg-info-soft text-info-ink border-transparent',
};

export function Badge({ tone = 'neutral', className, ...props }: ComponentProps<'span'> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap', tones[tone], className)}
      {...props}
    />
  );
}
