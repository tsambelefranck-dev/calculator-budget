import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#0b4d33" />
      <circle cx="16" cy="16.6" r="9.6" fill="none" stroke="#ffffff" strokeWidth="1.9" />
      <path d="M10.6 19.2 14.2 15l2.5 2 4.9-6.7" fill="none" stroke="#c99a2e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.7 10.3h3.9v3.9" fill="none" stroke="#c99a2e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, withTagline = false }: { className?: string; withTagline?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-semibold tracking-tight text-ink">
          Nexa<span className="text-accent-ink">Fi</span>
        </span>
        {withTagline ? <span className="mt-1 text-[11px] text-muted">Intelligence financière</span> : null}
      </span>
    </span>
  );
}
