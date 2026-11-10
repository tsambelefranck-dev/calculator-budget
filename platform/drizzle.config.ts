import nextEnv from '@next/env';
import { defineConfig } from 'drizzle-kit';

nextEnv.loadEnvConfig(process.cwd());

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
