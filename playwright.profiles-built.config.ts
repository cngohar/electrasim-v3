import { defineConfig } from '@playwright/test';
import source from './playwright.profiles.config';
const { webServer: _sourceServer, ...shared } = source;
export default defineConfig(shared, {
  metadata: { delivery: 'built' },
  use: { baseURL: 'http://127.0.0.1:8797' },
  webServer: {
    command: 'bun scripts/start-profiles-browser-worker.ts --built',
    url: 'http://127.0.0.1:8797/api/health',
    reuseExistingServer: false,
    timeout: 60000,
  },
  globalSetup: './scripts/check-profile-assets.mjs',
});
