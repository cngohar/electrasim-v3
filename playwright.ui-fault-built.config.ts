import { defineConfig } from '@playwright/test';
import catalogueBuilt from './playwright.catalogue-built.config';
import { localTestUrl } from './scripts/local-test-url';

const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = localTestUrl(configuredBaseURL, 'http://127.0.0.1:3004', 'PLAYWRIGHT_BASE_URL');

// Reuse the isolated local Worker and real-cookie fixture for the same native
// workflows on dist assets. No source-module imports are used by this spec.
export default defineConfig({
  ...catalogueBuilt,
  testMatch: /(ui-fault-lab|fault-marker-movement|fault-lifecycle|inspector-reference)\.spec\.ts/,
  use: { ...catalogueBuilt.use, baseURL },
  webServer: configuredBaseURL ? undefined : catalogueBuilt.webServer,
});
