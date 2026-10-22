import { defineConfig, devices } from '@playwright/test';
import { localTestUrl } from './scripts/local-test-url';

const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = localTestUrl(
  configuredBaseURL,
  'http://127.0.0.1:8788/app/',
  'PLAYWRIGHT_BASE_URL',
);

export default defineConfig({
  testDir: 'e2e',
  testMatch: /performance\.spec\.ts/,
  metadata: { delivery: 'built' },
  workers: 1,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: { baseURL, screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: configuredBaseURL
    ? undefined
    : {
        command: 'node scripts/preview-server.mjs',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
