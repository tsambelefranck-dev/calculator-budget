import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'off', locale: 'fr-FR', timezoneId: 'Africa/Douala' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `npx next start -p ${port}`, env: { SIGNUP_RATE_LIMIT_PER_HOUR: '1000', DEMO_RATE_LIMIT_PER_HOUR: '1000' }, url: `${baseURL}/api/health`, reuseExistingServer: true, timeout: 120_000 },
});
