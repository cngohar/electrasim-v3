/// <reference types="vitest/config" />
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// React's production build drops `React.act`, which @testing-library needs.
// Force the environment before Vite starts resolving modules so an ambient
// `NODE_ENV=production` shell cannot silently break every component test.
process.env.NODE_ENV = 'test';

/**
 * Vitest config (separate from vite.config.ts to keep dev/build lean).
 *
 * - Node domain tests plus jsdom app tests for React components.
 * - Globals enabled so tests can use `describe/it/expect` without imports.
 * - Coverage via v8 (Node-native, fast). Results land in /coverage.
 * - App and Astro helper tests run under one root quality gate.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    css: true,
    /*
     * The default 5 s is not enough headroom for the heaviest render tests when
     * the whole suite runs in parallel. `DocsContent` alone mounts all 20 guided
     * circuits plus the generated component reference — ~2.1 s on an idle
     * machine, which tips over 5 s once every worker is competing for CPU. That
     * produced an intermittent failure in `npm run check` that had nothing to do
     * with the code under test.
     */
    testTimeout: 20_000,
    projects: [
      {
        extends: true,
        test: {
          name: 'app',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.{test,spec}.{ts,tsx}', 'astro-site/src/**/*.{test,spec}.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'domain',
          environment: 'node',
          include: ['packages/domain/src/**/*.{test,spec}.{ts,tsx}'],
        },
      },
    ],
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      exclude: ['node_modules/', 'dist/', 'e2e/', '**/*.config.*', 'src/main.tsx', 'src/test/**'],
    },
  },
});
