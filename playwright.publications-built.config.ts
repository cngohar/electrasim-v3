import { defineConfig } from '@playwright/test';
import profiles from './playwright.profiles-built.config';
export default defineConfig(profiles, {
  testMatch: /(?:^|\/)publications\.spec\.ts$/,
});
