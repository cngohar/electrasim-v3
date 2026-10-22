import { defineConfig } from '@playwright/test';
import catalogueBuilt from './playwright.catalogue-built.config';

/** Current SVG interactions and actual app/Comlink parity on built localhost assets. */
export default defineConfig({
  ...catalogueBuilt,
  testMatch: /(canvas-base|catalogue-profiles|fault-marker-movement|fault-lifecycle)\.spec\.ts/,
});
