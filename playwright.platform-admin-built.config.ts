import { defineConfig, devices } from '@playwright/test';

/** Actual local Worker + built Assets + D1. Every target and binding is local. */
export default defineConfig({
  testDir: 'e2e',
  testMatch: /(platform-admin|admin-membership)\.spec\.ts/,
  metadata: { delivery: 'built' },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: { baseURL: 'http://127.0.0.1:8793', screenshot: 'only-on-failure' },
  projects: [
    { name: 'built-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'built-phone', use: { ...devices['Pixel 7'] } },
    { name: 'built-safari', use: { ...devices['iPad Pro 11'] } },
  ],
  webServer: {
    command: 'bun scripts/start-platform-browser-worker.ts',
    url: 'http://127.0.0.1:8793/api/health',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
