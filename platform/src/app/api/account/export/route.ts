import { getCurrentSession } from '@/server/auth/current';
import { rateLimit } from '@/server/auth/rate-limit';
import { exportUserData } from '@/server/services/account';
import { audit } from '@/server/services/audit';

export const dynamic = 'force-dynamic';

/** Export de toutes les données personnelles (droit d'accès et de portabilité). */
export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: 'Non authentifié.' }, { status: 401 });
  const limit = await rateLimit(`export:${session.user.id}`, 5, 3600);
  if (!limit.ok) return Response.json({ error: 'Trop d’exports. Réessaie plus tard.' }, { status: 429 });
  const data = await exportUserData(session.user.id);
  await audit('account.export', { userId: session.user.id, ip: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="nexafi-export-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
