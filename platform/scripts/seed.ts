/**
 * Données de référence : catégories, leçons, domaines d'investissement.
 * Idempotent : n'écrase pas les contenus modifiés par l'administration
 * (sauf avec --refresh-content).
 *
 * Usage : npm run db:seed [-- --refresh-content]
 */
import nextEnv from '@next/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DEFAULT_CATEGORIES } from '../src/lib/constants';
import { categories, investmentDomains, lessons } from '../src/server/db/schema';

nextEnv.loadEnvConfig(process.cwd());

export async function seedReferenceData(connectionString: string, options: { refreshContent?: boolean } = {}): Promise<void> {
  const pool = new Pool({ connectionString, max: 2 });
  const db = drizzle(pool);
  try {
    for (const [index, c] of DEFAULT_CATEGORIES.entries()) {
      await db
        .insert(categories)
        .values({ ...c, sortOrder: index })
        .onConflictDoNothing({ target: categories.code });
    }

    const { LESSONS } = await import('../src/content/lessons');
    for (const [index, lesson] of LESSONS.entries()) {
      const values = { ...lesson, sortOrder: index, updatedAt: new Date() };
      if (options.refreshContent) {
        await db.insert(lessons).values(values).onConflictDoUpdate({ target: lessons.slug, set: values });
      } else {
        await db.insert(lessons).values(values).onConflictDoNothing({ target: lessons.slug });
      }
    }

    const { INVESTMENT_DOMAINS } = await import('../src/content/investment-domains');
    for (const [index, domain] of INVESTMENT_DOMAINS.entries()) {
      const values = { ...domain, sortOrder: index, updatedAt: new Date() };
      if (options.refreshContent) {
        await db.insert(investmentDomains).values(values).onConflictDoUpdate({ target: investmentDomains.slug, set: values });
      } else {
        await db.insert(investmentDomains).values(values).onConflictDoNothing({ target: investmentDomains.slug });
      }
    }
  } finally {
    await pool.end();
  }
}

const isMain = process.argv[1]?.endsWith('seed.ts');
if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL manquante');
    process.exit(1);
  }
  seedReferenceData(url, { refreshContent: process.argv.includes('--refresh-content') })
    .then(() => console.log('✔ Données de référence chargées'))
    .catch((error) => {
      console.error('✖ Échec du chargement', error);
      process.exit(1);
    });
}
