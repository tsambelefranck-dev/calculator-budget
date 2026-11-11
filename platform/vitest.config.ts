import path from 'node:path';
import { defineConfig } from 'vitest/config';

const alias = {
  '@': path.resolve(import.meta.dirname, 'src'),
  // `server-only` lève une erreur hors du runtime React Server : neutralisé en test.
  'server-only': path.resolve(import.meta.dirname, 'tests/stubs/empty.ts'),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/integration/global-setup.ts'],
          setupFiles: ['tests/integration/setup-env.ts'],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
