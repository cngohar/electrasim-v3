import { defineConfig } from '@playwright/test';
import profiles from './playwright.profiles-built.config';
export default defineConfig(profiles, {
  testMatch: /(?:^|\/)discovery\.spec\.ts$/,
  globalSetup: './scripts/check-discovery-assets.mjs',
});
