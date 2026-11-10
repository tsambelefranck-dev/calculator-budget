import type { Instrumentation } from 'next';

/** Capture des erreurs serveur → table error_logs (consultable par l'administration). */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { logError } = await import('@/server/services/audit');
  const error = err instanceof Error ? err : new Error(String(err));
  await logError({
    message: error.message,
    stack: error.stack ?? null,
    digest: typeof err === 'object' && err && 'digest' in err ? String((err as { digest: unknown }).digest) : null,
    path: request.path.split('?')[0] ?? null,
    method: request.method,
    routeType: context.routeType,
  });
};
