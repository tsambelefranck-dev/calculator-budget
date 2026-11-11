/**
 * Crée (ou promeut) un compte administrateur.
 * Usage : npm run admin:create -- admin@exemple.com "Mot de passe long" "Prénom"
 */
import nextEnv from '@next/env';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users } from '../src/server/db/schema';

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  const [email, password, name = 'Admin'] = process.argv.slice(2);
  if (!email || !password || password.length < 12) {
    console.error('Usage : npm run admin:create -- <email> <mot de passe (12+ caractères)> [prénom]');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const normalized = email.trim().toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (existing[0]) {
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, existing[0].id));
    console.log(`✔ ${normalized} est maintenant administrateur.`);
  } else {
    await db.insert(users).values({ email: normalized, name, passwordHash: await hash(password), role: 'admin' });
    console.log(`✔ Administrateur ${normalized} créé.`);
  }
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
