import { defineConfig } from '@playwright/test';
import profiles from './playwright.profiles-built.config';
export default defineConfig(profiles, {
  testMatch: /(?:^|\/)preview\.spec\.ts$/,
  globalSetup: './scripts/check-preview-assets.mjs',
});
