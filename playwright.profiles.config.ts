import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  testMatch: /(?:^|\/)profiles\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [['html', { open: 'never' }], ['list']],
  metadata: { delivery: 'source' },
  use: { baseURL: 'http://127.0.0.1:3031', screenshot: 'only-on-failure' },
  projects: [
    { name: 'profile-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'profile-phone', use: { ...devices['Pixel 7'] } },
    { name: 'profile-safari', use: { ...devices['iPad Pro 11'] } },
  ],
  webServer: [
    {
      command: 'bun scripts/start-profiles-browser-worker.ts',
      url: 'http://127.0.0.1:8798/api/health',
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'bun x vite --host=127.0.0.1 --port=3031 --strictPort',
      env: { ...process.env, DISABLE_HMR: 'true', LOCAL_WORKER_PORT: '8798' },
      url: 'http://127.0.0.1:3031',
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
