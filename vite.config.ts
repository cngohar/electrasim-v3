import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import packageMetadata from './package.json';

const APP_VERSION_TOKEN = '__ELECTRASIM_APP_VERSION__';

/**
 * Vite config.
 *
 * SECURITY NOTE — GEMINI_API_KEY:
 *   The previous config inlined `GEMINI_API_KEY` into the client bundle via
 *   Vite's `define`. That ships the key to every browser that downloads the
 *   JS (a serious leak). It has been removed.
 *
 *   Going forward (Phase 9 / Phase 10 — AI features), all Gemini calls go
 *   through a small backend proxy (Hono on Bun, same VPS) that holds the
 *   key server-side. The client only ever sees a same-origin `/api/ai/*`
 *   endpoint. See PLAN.md §3 (Backend) and §7 (Future Features).
 *
 *   For local development, the AI features can be temporarily re-enabled
 *   client-side by setting `VITE_GEMINI_API_KEY` in `.env.local` — Vite only
 *   exposes vars prefixed with `VITE_` to the client by design, and we will
 *   gate any such usage behind `import.meta.env.DEV` so it cannot ship.
 */
export default defineConfig(({ command }) => {
  const isProd = command === 'build';
  // BUILD_STATS=1 npm run build → emits dist/stats.html (treemap + sunburst).
  const withStats = process.env.BUILD_STATS === '1';
  return {
    base: isProd ? '/app/' : '/',
    optimizeDeps: { include: ['immer'] },
    build: {
      outDir: 'dist',
    },
    plugins: [
      {
        name: 'electrasim-app-version',
        transformIndexHtml: (html: string) =>
          html.replaceAll(APP_VERSION_TOKEN, packageMetadata.version),
      },
      react(),
      tailwindcss(),
      // Precache the default SVG editor. Optional renderer chunks are cached
      // after first use so installation does not download WebGL/WebGPU code.
      VitePWA({
        // Let updates activate after open tabs close so a background refresh
        // cannot race the circuit autosave debounce.
        registerType: 'prompt',
        includeManifestIcons: false,
        // Don't enable in dev — the SW would intercept HMR requests and
        // break the inner-loop. Production builds get the full PWA.
        devOptions: { enabled: false },
        manifest: {
          name: 'ElectraSim — Interactive Wiring Lab',
          short_name: 'ElectraSim',
          description: 'Build, simulate, and reason about electrical circuits in the browser.',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/app/',
          scope: '/app/',
          icons: [
            { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            {
              src: 'pwa-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
            {
              src: 'pwa-512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          globIgnores: [
            'stats.html',
            '**/stats.html',
            'admin/**',
            '**/admin/**',
            'og-image.*',
            'legacy-root-sw.js',
            '**/PixiCanvas-*.js',
            '**/WebGLRenderer-*.js',
            '**/WebGPURenderer-*.js',
            '**/CanvasRenderer-*.js',
            '**/RenderTargetSystem-*.js',
            '**/BufferResource-*.js',
            '**/Filter-*.js',
            '**/canvasUtils-*.js',
            '**/browserAll-*.js',
            '**/webworkerAll-*.js',
          ],
          navigateFallbackDenylist: [/^\/admin/],
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.origin === self.location.origin &&
                url.pathname.startsWith('/app/assets/') &&
                url.pathname.endsWith('.js'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'electrasim-optional-code-v1',
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
      withStats &&
        visualizer({
          filename: 'dist/stats.html',
          template: 'treemap',
          gzipSize: true,
          brotliSize: true,
          open: false,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${Number(process.env.LOCAL_WORKER_PORT) || 8791}`,
          changeOrigin: false,
        },
      },
      // HMR can be disabled in constrained development environments.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Sandboxed/cloud preview proxies (e2b, gitpod-style) forward under a
      // generated per-port hostname; ".e2b.app" keeps the strict default for
      // everything else while letting those previews load.
      allowedHosts: ['.e2b.app'],
      watch: {
        // Builds and test reports are generated inside the repo and must not
        // trigger full-page reload storms while the dev server is running.
        ignored: [
          '**/dist/**',
          '**/dist-astro/**',
          '**/coverage/**',
          '**/playwright-report/**',
          '**/test-results/**',
          // Vite's own dep-optimizer cache and the opt-in bundle report.
          // A write in either used to reach the watcher and trigger a
          // full-page reload, which surfaced as a random mid-test navigation
          // during Playwright runs.
          '**/.vite/**',
          '**/node_modules/.vite/**',
          '**/stats.html',
        ],
      },
    },
  };
});
