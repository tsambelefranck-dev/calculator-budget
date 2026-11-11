import { Bell } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MarkReadButton } from '@/components/settings/mark-read-button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { requireAppContext } from '@/server/auth/current';
import { listNotifications } from '@/server/services/notifications';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const ctx = await requireAppContext();
  const items = await listNotifications(ctx.user.id);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Alertes de budget, rapports mensuels et rappels." actions={unread ? <MarkReadButton /> : null} />
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification" description="Tu seras alerté ici quand un budget approche de sa limite ou quand ton rapport mensuel est prêt." />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {items.map((n) => (
              <div key={n.id} className={cn('flex gap-3 px-5 py-4', !n.readAt && 'bg-primary-soft/40')}>
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-primary')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-sm text-ink-2">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{n.createdAt.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}{!n.readAt ? ' · non lue' : ''}</p>
                </div>
                {n.link ? <Link href={n.link} className="self-center text-sm font-medium text-primary-ink hover:underline">Voir</Link> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
