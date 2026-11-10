import { Bell, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/logo';
import { MobileNav, QuickAddExpense } from '@/components/layout/mobile-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { UserMenu } from '@/components/layout/user-menu';
import { requireAppContext } from '@/server/auth/current';
import { listActiveCategories } from '@/server/services/categories';
import { unreadNotificationCount } from '@/server/services/notifications';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireAppContext();
  const [categories, unread] = await Promise.all([listActiveCategories(), unreadNotificationCount(ctx.user.id)]);
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.nameFr, icon: c.icon, color: c.color }));
  const isPremium = ctx.user.plan === 'premium';
  const isAdmin = ctx.user.role === 'admin';

  return (
    <div className="min-h-dvh">
      <Sidebar isPremium={isPremium} isAdmin={isAdmin} />
      <div className="lg:pl-64">
        {ctx.user.isDemo ? (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-accent px-4 py-2 text-center text-sm font-medium text-[#1d1608]">
            <FlaskConical className="size-4" aria-hidden />
            Mode démo : données fictives, compte supprimé automatiquement sous 24 h.
            <Link href="/signup" className="underline underline-offset-2">
              Créer mon vrai compte
            </Link>
          </div>
        ) : null}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-bg/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Link href="/app" className="lg:hidden" aria-label="Tableau de bord">
            <Logo />
          </Link>
          <div className="flex-1" />
          <QuickAddExpense categories={categoryOptions} currency={ctx.currency} today={ctx.today} variant="button" />
          <Link
            href="/app/notifications"
            className="relative flex size-9 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 hover:text-ink"
            aria-label={unread > 0 ? `Notifications (${unread} non lues)` : 'Notifications'}
          >
            <Bell className="size-5" aria-hidden />
            {unread > 0 ? (
              <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] leading-4 font-semibold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </Link>
          <UserMenu name={ctx.user.name} email={ctx.user.email} isPremium={isPremium} isAdmin={isAdmin} />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <MobileNav categories={categoryOptions} currency={ctx.currency} today={ctx.today} />
    </div>
  );
}
