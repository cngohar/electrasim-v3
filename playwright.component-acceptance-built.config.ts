import { defineConfig } from '@playwright/test';
import foundation from './playwright.platform-admin-built.config';

/** Full 2.0A: existing admin plus Components and editor recovery, all locally built. */
export default defineConfig(foundation, {
  testMatch: /(platform-admin|admin-membership|component-admin|component-access)\.spec\.ts/,
  globalSetup: './scripts/check-platform-assets.mjs',
  forbidOnly: true,
  retries: 0,
});
