import { defineConfig } from 'drizzle-kit';

for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* fichier absent */
  }
}

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://nexafi:nexafi@localhost:5432/nexafi',
  },
  strict: true,
  verbose: false,
});
