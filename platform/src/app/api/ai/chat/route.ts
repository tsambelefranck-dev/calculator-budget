import { z } from 'zod';
import { isSameOrigin } from '@/server/auth/request';
import { getCurrentSession, getProfile } from '@/server/auth/current';
import { rateLimit } from '@/server/auth/rate-limit';
import { runAgentTurn, type AgentEvent } from '@/server/ai/agent';
import { isAiConfigured } from '@/server/ai/config';
import { createProvider } from '@/server/ai/provider';
import { getQuota } from '@/server/ai/usage';
import { monthOf, todayInTimezone } from '@/lib/finance/dates';
import { NotFoundError } from '@/server/services/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  conversationId: z.uuid().nullable().optional(),
  message: z.string().trim().min(1, 'Message vide').max(2000, 'Message trop long (2000 caractères maximum)'),
});

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json(403, { error: 'Origine non autorisée.' });
  const session = await getCurrentSession();
  if (!session) return json(401, { error: 'Connecte-toi pour utiliser l’assistant.' });
  const profile = await getProfile(session.user.id);
  if (!profile) return json(409, { error: 'Termine d’abord ton diagnostic financier.' });
  if (!isAiConfigured()) return json(503, { error: 'L’assistant IA n’est pas configuré sur ce serveur.' });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { error: parsed.error.issues[0]?.message ?? 'Requête invalide.' });

  const limit = await rateLimit(`ai:${session.user.id}`, 10, 60);
  if (!limit.ok) return json(429, { error: 'Trop de messages d’affilée. Patiente une minute.' });
  const quota = await getQuota(session.user.id, session.user.plan);
  if (quota.remaining <= 0) {
    return json(402, {
      error: session.user.plan === 'premium'
        ? `Tu as utilisé tes ${quota.limit} messages du mois. Le quota se renouvelle le 1er du mois.`
        : `Tu as utilisé tes ${quota.limit} messages gratuits du mois. Passe à Premium pour continuer.`,
      quota,
    });
  }

  const today = todayInTimezone(profile.timezone);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AgentEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        await runAgentTurn({
          ctx: { userId: session.user.id, profile, currency: profile.currency, today, currentMonth: monthOf(today), consent: session.user.aiDataConsent },
          provider: createProvider(),
          conversationId: parsed.data.conversationId ?? null,
          message: parsed.data.message,
          emit,
          signal: request.signal,
        });
      } catch (error) {
        emit({ type: 'error', message: error instanceof NotFoundError ? error.message : 'Erreur inattendue.' });
        if (!(error instanceof NotFoundError)) console.error('[ai] route', error);
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
  });
}
