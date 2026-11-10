import 'server-only';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { nexafiPool?: Pool; nexafiDb?: Database };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL n’est pas définie. Copie .env.example vers .env.local.');
  }
  return new Pool({ connectionString, max: Number(process.env.DATABASE_POOL_MAX ?? 10) });
}

/** Connexion partagée (réutilisée entre rechargements à chaud en développement). */
export function getPool(): Pool {
  if (!globalForDb.nexafiPool) globalForDb.nexafiPool = createPool();
  return globalForDb.nexafiPool;
}

export const db: Database = globalForDb.nexafiDb ?? drizzle(getPool(), { schema });
globalForDb.nexafiDb = db;

export { schema };
