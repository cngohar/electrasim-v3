// @ts-check
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { benchReviewedIso } from './src/lib/competitor-bench';

const SITE = 'https://electrasim.com';
const guideData = JSON.parse(
  readFileSync(new URL('./src/content/pages/guide.json', import.meta.url), 'utf8'),
);
const guideLastmod = new Date(`${guideData.reviewed_at}T00:00:00Z`).toISOString();

/**
 * Content freshness map for <lastmod>.
 *
 * The sitemap had no <lastmod> on any of its 132 URLs, even though every blog
 * post and release note carries `pubDate` (and often `updatedDate`) in
 * frontmatter — so crawlers had no signal about which of 67 articles changed.
 *
 * `getCollection()` is not available inside astro.config, and pulling in
 * gray-matter for four lines of date parsing is not worth it, so the two date
 * fields are read straight out of the frontmatter block. Anything unparseable is
 * skipped, which just means that URL keeps its previous no-lastmod behaviour.
 *
 * @param {string} collectionDir Directory name under `src/content/`.
 * @param {string} urlPrefix Site-relative route prefix, e.g. `/blog/`.
 * @returns {Record<string, string>} Absolute URL → ISO timestamp.
 */
function readContentDates(collectionDir, urlPrefix) {
  const dir = new URL(`./src/content/${collectionDir}/`, import.meta.url);
  /** @type {Record<string, string>} */
  const dates = {};

  /** @type {string[]} */
  let files;
  try {
    files = readdirSync(dir).filter((name) => name.endsWith('.md'));
  } catch {
    return dates;
  }

  for (const file of files) {
    const raw = readFileSync(join(dir.pathname, file), 'utf8');
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) continue;
    const block = frontmatter[1] ?? '';

    /** @param {string} key @returns {Date | null} */
    const pick = (key) => {
      const match = block.match(new RegExp(`^${key}:\\s*["']?([0-9T:\\-.Z]+)`, 'm'));
      if (!match?.[1]) return null;
      const date = new Date(match[1]);
      return Number.isNaN(date.valueOf()) ? null : date;
    };

    // updatedDate wins when present: that is the point of the field.
    const stamp = pick('updatedDate') ?? pick('pubDate');
    if (!stamp) continue;

    dates[`${SITE}${urlPrefix}${file.replace(/\.md$/, '')}/`] = stamp.toISOString();
  }

  return dates;
}

const ENTRY_LASTMOD = {
  ...readContentDates('blog', '/blog/'),
  ...readContentDates('updates', '/updates/'),
};

/** Newest entry across both collections — the freshness of every index page. */
const NEWEST_ENTRY = Object.values(ENTRY_LASTMOD).sort().at(-1);

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
      // /rss.xml is a feed, not a page — it belongs in <link rel="alternate">
      // and robots.txt, not in the URL set crawlers index.
      filter: (page) =>
        !page.includes('/404') && !page.includes('/admin') && !page.endsWith('/rss.xml'),
      customPages: [`${SITE}/app/`],
      serialize(item) {
        const url = item.url;
        /* <lastmod>: an exact date for articles and release notes, and the
           newest entry's date for the indexes that list them. Pages with no
           meaningful change signal (legal, contact, tools) are left without one
           rather than being stamped with the build time, which would tell
           crawlers every page changed on every deploy. */
        const lastmod = ENTRY_LASTMOD[url];
        /** @param {Record<string, unknown>} fields */
        const withLastmod = (fields) =>
          lastmod ? { ...item, ...fields, lastmod } : { ...item, ...fields };
        /** @param {Record<string, unknown>} fields */
        const withNewest = (fields) =>
          NEWEST_ENTRY ? { ...item, ...fields, lastmod: NEWEST_ENTRY } : { ...item, ...fields };

        if (url === `${SITE}/` || url === `${SITE}/app/`) {
          return { ...item, changefreq: ChangeFreqEnum.WEEKLY, priority: 1.0 };
        }
        if (url.includes('/blog/') && url !== `${SITE}/blog/`) {
          return withLastmod({ changefreq: ChangeFreqEnum.MONTHLY, priority: 0.7 });
        }
        if (url === `${SITE}/guide/` || url.startsWith(`${SITE}/guide/`) || url === `${SITE}/glossary/`) {
          return {
            ...item,
            changefreq: ChangeFreqEnum.MONTHLY,
            priority: 0.7,
            lastmod: guideLastmod,
          };
        }
        if (url === `${SITE}/blog/`) {
          return withNewest({ changefreq: ChangeFreqEnum.WEEKLY, priority: 0.8 });
        }
        if (url === `${SITE}/updates/`) {
          return withNewest({ changefreq: ChangeFreqEnum.WEEKLY, priority: 0.6 });
        }
        if (url.includes('/updates/')) {
          // Release notes: crawlable but lower weight than the evergreen corpus
          return withLastmod({ changefreq: ChangeFreqEnum.MONTHLY, priority: 0.5 });
        }
        if (url === `${SITE}/tools/`) {
          return { ...item, changefreq: ChangeFreqEnum.WEEKLY, priority: 0.9 };
        }
        if (url.includes('/tools/')) {
          return { ...item, changefreq: ChangeFreqEnum.WEEKLY, priority: 0.9 };
        }
        if (url === `${SITE}/compare/`) {
          // The bench is a dated research artefact — the review date belongs in
          // the sitemap too (imported from the data module, so it can't drift).
          return {
            ...item,
            changefreq: ChangeFreqEnum.MONTHLY,
            priority: 0.8,
            lastmod: new Date(`${benchReviewedIso}T00:00:00Z`).toISOString(),
          };
        }
        return { ...item, changefreq: ChangeFreqEnum.MONTHLY, priority: 0.6 };
      },
    }),
  ],
});
