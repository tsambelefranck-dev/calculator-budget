import { sql } from 'drizzle-orm';
import { isAuthorizedCron } from '@/server/auth/cron';
import { deleteExpiredSessions } from '@/server/auth/session';
import { db } from '@/server/db';
import { purgeExpiredDemoAccounts } from '@/server/services/demo';

export const dynamic = 'force-dynamic';

/** Purge quotidienne : comptes démo expirés, sessions expirées, compteurs de limitation, vieux journaux d'erreurs. */
export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) return Response.json({ error: 'Non autorisé' }, { status: 401 });
  const demos = await purgeExpiredDemoAccounts();
  const sessionsDeleted = await deleteExpiredSessions();
  await db.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
  await db.execute(sql`delete from password_reset_tokens where expires_at < now() - interval '1 day'`);
  await db.execute(sql`delete from error_logs where created_at < now() - interval '90 days'`);
  return Response.json({ ok: true, demos, sessions: sessionsDeleted });
}
