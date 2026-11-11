'use client';

import { Crown, LogOut, Settings, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { signOutAction } from '@/server/actions/auth';

export function UserMenu({ name, email, isPremium, isAdmin }: { name: string; email: string; isPremium: boolean; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu du compte"
        className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary"
      >
        {initials || '?'}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-72 animate-fade-in rounded-2xl border bg-surface p-2 shadow-pop">
          <div className="space-y-1 px-3 py-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted">{email}</p>
            <Badge tone={isPremium ? 'gold' : 'neutral'} className="mt-1">
              {isPremium ? 'Premium' : 'Offre gratuite'}
            </Badge>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link role="menuitem" href="/app/settings" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface-2" onClick={() => setOpen(false)}>
            <Settings className="size-4 text-muted" aria-hidden /> Paramètres
          </Link>
          {!isPremium ? (
            <Link role="menuitem" href="/app/upgrade" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface-2" onClick={() => setOpen(false)}>
              <Crown className="size-4 text-accent-ink" aria-hidden /> Passer à Premium
            </Link>
          ) : null}
          {isAdmin ? (
            <Link role="menuitem" href="/admin" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface-2" onClick={() => setOpen(false)}>
              <ShieldCheck className="size-4 text-muted" aria-hidden /> Administration
            </Link>
          ) : null}
          <div className="px-3 py-2">
            <ThemeToggle />
          </div>
          <div className="my-1 h-px bg-border" />
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-critical-ink hover:bg-critical-soft">
              <LogOut className="size-4" aria-hidden /> Se déconnecter
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
