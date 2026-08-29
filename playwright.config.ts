import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — end-to-end browser tests.
 *
 * Run locally:
 *   npx playwright install   # one-time, downloads browser binaries
 *   npm run e2e
 *
 * The browser binaries are NOT installed automatically by `npm install` to
 * keep onboarding lean and CI cheap. CI / dev only pulls them when needed.
 *
 * Set PLAYWRIGHT_BASE_URL to test an already-running production preview.
 */
const localBaseURL = 'http://127.0.0.1:3000';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? localBaseURL;

export default defineConfig({
  testDir: 'e2e',
  testIgnore: /(production|toolbox|scroll-lock)\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'tablet-safari', use: { ...devices['iPad Pro 11'] } },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // HMR off: a dev-server full-reload landing mid-test surfaced as a
        // random "unexpected navigation" failure (seen in ohmageddon and
        // challenge-mode specs under load). Nothing edits source during a
        // run, so hot reload has no value here and only adds a race.
        command: 'vite --port=3000 --strictPort --host=127.0.0.1',
        env: { ...process.env, DISABLE_HMR: 'true' },
        url: localBaseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
