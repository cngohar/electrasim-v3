// @ts-check
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

const SITE = 'https://electrasim.com';

export default defineConfig({
  site: SITE,
  outDir: '../dist-astro',
  build: {
    // The production CSP blocks inline styles, including stylesheets Astro
    // would normally inline below its size threshold.
    inlineStylesheets: 'never',
  },
  // Shiki emits inline color styles that are intentionally blocked by the
  // site's strict CSP. Blog code blocks use the external `.art-inner pre`
  // styles instead, and the current corpus does not use language-tagged fences.
  markdown: { syntaxHighlight: false },
  devToolbar: { enabled: false },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  vite: {
    server: {
      // Allow sandboxed/remote dev previews (e.g. *.e2b.app) to reach the dev server.
      allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
    },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/admin'),
      customPages: [`${SITE}/app/`],
      serialize(item) {
        const url = item.url;
        if (url === `${SITE}/` || url === `${SITE}/app/`) {
          return { ...item, changefreq: ChangeFreqEnum.WEEKLY, priority: 1.0 };
        }
        if (url.includes('/blog/') && url !== `${SITE}/blog/`) {
          return { ...item, changefreq: ChangeFreqEnum.MONTHLY, priority: 0.7 };
        }
        if (url === `${SITE}/blog/`) {
          return { ...item, changefreq: ChangeFreqEnum.WEEKLY, priority: 0.8 };
        }
        if (url === `${SITE}/updates/`) {
          return { ...item, changefreq: ChangeFreqEnum.WEEKLY, priority: 0.6 };
        }
        if (url.includes('/updates/')) {
          // Release notes: crawlable but lower weight than the evergreen corpus
          return { ...item, changefreq: ChangeFreqEnum.MONTHLY, priority: 0.5 };
        }
        if (url === `${SITE}/tools/`) {
          return { ...item, changefreq: ChangeFreqEnum.WEEKLY, priority: 0.9 };
        }
        if (url.includes('/tools/')) {
          return { ...item, changefreq: ChangeFreqEnum.WEEKLY, priority: 0.9 };
        }
        if (url.includes('/compare/')) {
          return { ...item, changefreq: ChangeFreqEnum.MONTHLY, priority: 0.8 };
        }
        return { ...item, changefreq: ChangeFreqEnum.MONTHLY, priority: 0.6 };
      },
    }),
  ],
});
