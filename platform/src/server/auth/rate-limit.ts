import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/server/db';

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Limitation de débit à fenêtre fixe, stockée en PostgreSQL (atomique via ON CONFLICT),
 * donc valable même avec plusieurs instances de l'application.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const result = await db.execute<{ count: number; window_start: Date }>(sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start <= now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start <= now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE rate_limits.window_start END
    RETURNING count, window_start
  `);
  const row = result.rows[0];
  const count = Number(row?.count ?? 1);
  const windowStart = row?.window_start ? new Date(row.window_start) : new Date();
  const retryAfterSeconds = Math.max(0, Math.ceil((windowStart.getTime() + windowSeconds * 1000 - Date.now()) / 1000));
  return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfterSeconds };
}

export async function resetRateLimit(key: string): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE key = ${key}`);
}

export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}
