import { isAuthorizedCron } from '@/server/auth/cron';
import { generateMonthlyReportsForAllUsers } from '@/server/services/reports';

export const dynamic = 'force-dynamic';

/** À appeler le 1er de chaque mois (Vercel Cron, cron système, GitHub Actions…). */
export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) return Response.json({ error: 'Non autorisé' }, { status: 401 });
  const result = await generateMonthlyReportsForAllUsers();
  return Response.json({ ok: true, ...result });
}
