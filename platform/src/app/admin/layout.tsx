import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/logo';
import { requireAdmin } from '@/server/auth/current';

export const metadata = { title: 'Administration', robots: { index: false } };

const TABS = [
  { href: '/admin', label: 'Vue d’ensemble' },
  { href: '/admin/users', label: 'Utilisateurs' },
  { href: '/admin/content', label: 'Contenus' },
  { href: '/admin/logs', label: 'Erreurs & audit' },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-ink"><ShieldCheck className="size-3.5" aria-hidden /> Administration</span>
          <nav className="flex flex-1 flex-wrap gap-1" aria-label="Administration">
            {TABS.map((t) => <Link key={t.href} href={t.href} className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">{t.label}</Link>)}
          </nav>
          <Link href="/app" className="flex items-center gap-1 text-sm text-primary-ink hover:underline"><ArrowLeft className="size-4" aria-hidden /> Application</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
