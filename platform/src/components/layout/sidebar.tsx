'use client';

import { Crown, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { NAV_GROUPS, SETTINGS_ITEM, isActive, type NavItem } from './nav-items';

function NavLink({ item, pathname, isPremium }: { item: NavItem; pathname: string; isPremium: boolean }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink',
        active && 'bg-primary-soft text-primary-ink hover:bg-primary-soft hover:text-primary-ink',
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>
      {item.premium && !isPremium ? <Crown className="size-3.5 text-accent-ink" aria-label="Premium" /> : null}
    </Link>
  );
}

export function Sidebar({ isPremium, isAdmin }: { isPremium: boolean; isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-surface lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/app" aria-label="NexaFi, tableau de bord">
          <Logo withTagline />
        </Link>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3" aria-label="Navigation principale">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{group.label}</p>
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} isPremium={isPremium} />
            ))}
          </div>
        ))}
      </nav>
      <div className="space-y-2 border-t p-3">
        {!isPremium ? (
          <Link href="/app/upgrade" className="flex items-center gap-3 rounded-xl bg-accent-soft px-3 py-2.5 text-sm font-medium text-accent-ink hover:bg-accent-soft/80">
            <Crown className="size-[18px]" aria-hidden />
            Passer à Premium
          </Link>
        ) : null}
        {isAdmin ? <NavLink item={{ href: '/admin', label: 'Administration', icon: ShieldCheck }} pathname={pathname} isPremium /> : null}
        <NavLink item={SETTINGS_ITEM} pathname={pathname} isPremium={isPremium} />
      </div>
    </aside>
  );
}
