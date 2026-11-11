import 'server-only';
import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id avec les paramètres minimaux recommandés par l'OWASP
 * (19 MiB de mémoire, 2 itérations, parallélisme 1) — valeurs par défaut de @node-rs/argon2.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Empreinte factice : vérifier un mot de passe même si l'e-mail est inconnu
// évite de révéler l'existence d'un compte par le temps de réponse.
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$XNBI/COM/8/4/nZgkK0uZg$6LgEXROAj0vMxUyG4qAfZrM5S2VAe46DgnhWxNEInmE';

export async function verifyAgainstDummy(password: string): Promise<void> {
  await verifyPassword(DUMMY_HASH, password);
}
