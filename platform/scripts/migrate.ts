/**
 * Applique les migrations SQL versionnées (dossier drizzle/).
 * Usage : npm run db:migrate   (ou DATABASE_URL=... tsx scripts/migrate.ts)
 */
import nextEnv from '@next/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

nextEnv.loadEnvConfig(process.cwd());

export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
  } finally {
    await pool.end();
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '');
if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL manquante');
    process.exit(1);
  }
  runMigrations(url)
    .then(() => console.log('✔ Migrations appliquées'))
    .catch((error) => {
      console.error('✖ Échec des migrations', error);
      process.exit(1);
    });
}
