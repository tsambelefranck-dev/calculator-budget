import { Client } from 'pg';
import { runMigrations } from '../../scripts/migrate';
import { seedReferenceData } from '../../scripts/seed';

function testUrl(): string {
  for (const file of ['.env.local', '.env']) {
    try {
      process.loadEnvFile(file);
    } catch {
      /* absent */
    }
  }
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('DATABASE_URL_TEST est requise pour les tests d’intégration');
  if (url === process.env.DATABASE_URL) throw new Error('DATABASE_URL_TEST doit pointer vers une base dédiée');
  return url;
}

/** Base de test recréée à chaque exécution : schéma vierge + migrations + référentiels. */
export default async function setup() {
  const url = testUrl();
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query('drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;');
  await client.end();
  await runMigrations(url);
  await seedReferenceData(url);
}
