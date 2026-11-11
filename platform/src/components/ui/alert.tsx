import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AlertTone = 'info' | 'good' | 'warning' | 'critical' | 'gold';

const tones: Record<AlertTone, { box: string; icon: typeof Info }> = {
  info: { box: 'bg-info-soft text-info-ink', icon: Info },
  good: { box: 'bg-good-soft text-good-ink', icon: CircleCheck },
  warning: { box: 'bg-warning-soft text-warning-ink', icon: TriangleAlert },
  critical: { box: 'bg-critical-soft text-critical-ink', icon: CircleAlert },
  gold: { box: 'bg-accent-soft text-accent-ink', icon: Info },
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  action,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div className={cn('flex gap-3 rounded-xl px-4 py-3 text-sm', box, className)} role={tone === 'critical' ? 'alert' : 'status'}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-ink-2 [&_a]:font-medium [&_a]:underline">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}
