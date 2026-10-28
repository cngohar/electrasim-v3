import { defineConfig } from '@playwright/test';
import profiles from './playwright.profiles.config';
export default defineConfig(profiles, { testMatch: /(?:^|\/)preview\.spec\.ts$/ });
