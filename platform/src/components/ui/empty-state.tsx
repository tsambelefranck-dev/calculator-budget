import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-ink">
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-ink">{title}</p>
        {description ? <p className="mx-auto max-w-sm text-sm text-ink-2">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
