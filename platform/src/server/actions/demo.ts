'use server';

import { redirect } from 'next/navigation';
import type { ActionState } from '@/lib/action-state';
import { getClientIp, getUserAgent } from '@/server/auth/request';
import { formatRetryAfter, rateLimit } from '@/server/auth/rate-limit';
import { createSession, setSessionCookie } from '@/server/auth/session';
import { audit } from '@/server/services/audit';
import { createDemoAccount, DEMO_DURATION_MS } from '@/server/services/demo';

export async function startDemoAction(_prev: ActionState): Promise<ActionState> {
  const ip = await getClientIp();
  const limit = await rateLimit(`demo:${ip}`, Number(process.env.DEMO_RATE_LIMIT_PER_HOUR ?? 5), 3600);
  if (!limit.ok) return { ok: false, message: `Trop de démos lancées. Réessaie dans ${formatRetryAfter(limit.retryAfterSeconds)}.` };
  const { userId } = await createDemoAccount();
  const { token, expiresAt } = await createSession(userId, { ip, userAgent: await getUserAgent(), durationMs: DEMO_DURATION_MS });
  await setSessionCookie(token, expiresAt);
  await audit('auth.demo_started', { userId, ip });
  redirect('/app');
}
