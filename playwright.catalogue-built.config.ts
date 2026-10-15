import { defineConfig, devices } from '@playwright/test';

/** Built assets plus the isolated local test Worker; no production account. */
export default defineConfig({
  testDir: 'e2e',
  testMatch: /catalogue-profiles\.spec\.ts/,
  metadata: { delivery: 'built' },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: { baseURL: 'http://127.0.0.1:3004', screenshot: 'only-on-failure' },
  projects: [
    { name: 'built-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'built-phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'bun scripts/start-browser-worker.ts',
      url: 'http://127.0.0.1:8792/api/health',
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'vite preview --port=3004 --strictPort --host=127.0.0.1',
      env: { ...process.env, LOCAL_WORKER_PORT: '8792' },
      url: 'http://127.0.0.1:3004/app/',
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
