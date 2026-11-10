'use client';

import { Ellipsis, LayoutDashboard, Plus, Receipt, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ExpenseForm, type CategoryOption } from '@/components/expenses/expense-form';
import { Dialog } from '@/components/ui/dialog';
import type { CurrencyCode } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { createExpenseAction } from '@/server/actions/finance';
import { NAV_GROUPS, SETTINGS_ITEM, isActive } from './nav-items';

export function QuickAddExpense({
  categories,
  currency,
  today,
  variant,
}: {
  categories: CategoryOption[];
  currency: CurrencyCode;
  today: string;
  variant: 'fab' | 'button';
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === 'fab' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="-mt-7 flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-pop ring-4 ring-bg"
          aria-label="Ajouter une dépense"
        >
          <Plus className="size-6" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hidden h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-medium text-on-primary hover:bg-primary-hover lg:inline-flex"
        >
          <Plus className="size-4" aria-hidden /> Dépense
        </button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title="Nouvelle dépense" description="Enregistre-la tout de suite : 10 secondes suffisent.">
        <ExpenseForm action={createExpenseAction} categories={categories} currency={currency} today={today} onSuccess={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

export function MobileNav({ categories, currency, today }: { categories: CategoryOption[]; currency: CurrencyCode; today: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const tab = (href: string, label: string, Icon: typeof Receipt) => {
    const active = isActive(pathname, href);
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn('flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted', active && 'text-primary-ink')}
      >
        <Icon className="size-5" aria-hidden />
        {label}
      </Link>
    );
  };
  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Navigation mobile"
      >
        <div className="mx-auto flex max-w-lg items-end px-2">
          {tab('/app', 'Accueil', LayoutDashboard)}
          {tab('/app/expenses', 'Dépenses', Receipt)}
          <div className="flex flex-1 justify-center">
            <QuickAddExpense categories={categories} currency={currency} today={today} variant="fab" />
          </div>
          {tab('/app/assistant', 'Coach IA', Sparkles)}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted"
            aria-haspopup="dialog"
          >
            <Ellipsis className="size-5" aria-hidden />
            Plus
          </button>
        </div>
      </nav>
      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Toutes les rubriques">
        <div className="space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">{group.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium',
                        isActive(pathname, item.href) && 'border-primary bg-primary-soft text-primary-ink',
                      )}
                    >
                      <Icon className="size-[18px] shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <Link href={SETTINGS_ITEM.href} onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium">
            <SETTINGS_ITEM.icon className="size-[18px]" aria-hidden /> {SETTINGS_ITEM.label}
          </Link>
        </div>
      </Dialog>
    </>
  );
}
