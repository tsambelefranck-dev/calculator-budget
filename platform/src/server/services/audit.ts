import 'server-only';
import { db } from '@/server/db';
import { auditLogs, errorLogs } from '@/server/db/schema';

export type AuditAction =
  | 'auth.signup'
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.password_reset_requested'
  | 'auth.password_reset'
  | 'auth.password_changed'
  | 'auth.sessions_revoked'
  | 'auth.demo_started'
  | 'account.export'
  | 'account.deleted'
  | 'account.ai_consent'
  | 'account.currency_changed'
  | 'subscription.trial_started'
  | 'admin.plan_changed'
  | 'admin.role_changed'
  | 'admin.user_disabled'
  | 'admin.user_enabled'
  | 'admin.content_changed';

/** Journalise un événement sensible. Ne lève jamais d'exception (l'audit ne doit pas casser le parcours). */
export async function audit(
  action: AuditAction,
  data: { userId?: string | null; actorId?: string | null; metadata?: Record<string, unknown>; ip?: string | null } = {},
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      action,
      userId: data.userId ?? null,
      actorId: data.actorId ?? data.userId ?? null,
      metadata: data.metadata ?? {},
      ip: data.ip ?? null,
    });
  } catch (error) {
    console.error('[audit] échec de journalisation', action, error);
  }
}

export async function logError(entry: {
  message: string;
  stack?: string | null;
  digest?: string | null;
  path?: string | null;
  method?: string | null;
  routeType?: string | null;
}): Promise<void> {
  try {
    await db.insert(errorLogs).values({
      message: entry.message.slice(0, 2000),
      stack: entry.stack?.slice(0, 8000) ?? null,
      digest: entry.digest ?? null,
      path: entry.path?.slice(0, 500) ?? null,
      method: entry.method ?? null,
      routeType: entry.routeType ?? null,
    });
  } catch (error) {
    console.error('[errors] échec de journalisation', error);
  }
}
