import { defineConfig, devices } from '@playwright/test';
import { localTestUrl } from './scripts/local-test-url';

const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = localTestUrl(configuredBaseURL, 'http://127.0.0.1:8788', 'PLAYWRIGHT_BASE_URL');

export default defineConfig({
  testDir: 'e2e',
  // `cable-size` is part of the default suite (playwright.config.ts starts the
  // built-site preview server next to the dev server), so it is not matched here.
  testMatch: /(production|toolbox|scroll-lock)\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
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
