import 'server-only';
import { headers } from 'next/headers';

/**
 * Adresse IP du client. En production derrière un proxy (Vercel, Nginx…), la première
 * valeur de `x-forwarded-for` est celle ajoutée par le proxy de confiance.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim().slice(0, 64);
  return (h.get('x-real-ip') ?? 'inconnue').slice(0, 64);
}

export async function getUserAgent(): Promise<string> {
  const h = await headers();
  return (h.get('user-agent') ?? '').slice(0, 300);
}

/** Vérifie qu'une requête mutante provient bien de notre propre origine (anti-CSRF pour les routes API). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** N'accepte que des chemins internes pour les redirections après connexion. */
export function safeRedirectPath(value: unknown, fallback = '/app'): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
