/**
 * Cross-surface guard: app copy → marketing site.
 *
 * The app and the site are two separate builds shipped as one artefact, and
 * nothing used to connect them. When the guide hub became a route table in
 * v2.0.3 the walkthroughs, the template list and the feature tour all moved to
 * new URLs — and the in-app docs kept pointing at the old fragments. Every one
 * of those links still "worked" (the page loaded, at the top) which is exactly
 * why no gate noticed: `check:internal-links` crawls `<a href>` in the built
 * HTML, and these are absolute URLs inside a JS chunk.
 *
 * This test reads the app's own copy and checks it against the Astro sources,
 * so a moved section or a renamed template fails here instead of quietly
 * shipping a dead anchor.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { GUIDED_CIRCUIT_TEMPLATES } from '@electrasim/domain/templates';
import { describe, expect, it } from 'vitest';
import { GUIDE_WALKTHROUGH_ANCHORS } from '../ui/components/docs/data';

const root = process.cwd();
const astroSrc = join(root, 'astro-site/src');
const pagesDir = join(astroSrc, 'pages');

/** App-side files that embed links or counts pointing at the marketing site. */
const APP_COPY_SOURCES = [
  'src/ui/components/docs/DocsContent.tsx',
  'src/ui/components/docs/data.ts',
  'src/ui/components/docs/DocsPrimitives.tsx',
  'src/ui/components/settings/AboutTab.tsx',
  'src/ui/tour/steps.ts',
].map((file) => join(root, file));

function walkFiles(dir: string, predicate: (path: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(path, predicate);
    return statSync(path).isFile() && predicate(path) ? [path] : [];
  });
}

const read = (path: string) => readFileSync(path, 'utf8');

const astroSources = walkFiles(astroSrc, (path) => path.endsWith('.astro')).map(read);
const astroCorpus = astroSources.join('\n');

/**
 * Every URL a static `.astro` page serves. Dynamic routes (`[slug].astro`) and
 * API routes are recorded as prefixes / skipped: a link into one of those is
 * valid as long as its parent route exists.
 */
function siteRoutes(): { exact: Set<string>; dynamic: string[] } {
  const exact = new Set<string>();
  const dynamic: string[] = [];

  for (const file of walkFiles(pagesDir, (path) => path.endsWith('.astro'))) {
    const relativePath = relative(pagesDir, file).split(sep).join('/');
    if (relativePath.startsWith('404')) continue;
    if (relativePath.includes('[')) {
      dynamic.push(`/${relativePath.slice(0, relativePath.lastIndexOf('/') + 1)}`);
      continue;
    }
    const withoutExtension = relativePath.replace(/\.astro$/, '');
    exact.add(
      withoutExtension.endsWith('index')
        ? `/${withoutExtension.replace(/index$/, '')}`
        : `/${withoutExtension}/`,
    );
  }

  return { exact, dynamic };
}

const routes = siteRoutes();

/** Section ids the Astro corpus renders, e.g. `id="templates-h"`. */
const siteAnchorIds = new Set(
  [...astroCorpus.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1] ?? ''),
);

const guideData = JSON.parse(read(join(astroSrc, 'content/pages/guide.json'))) as {
  circuits?: unknown[];
};
const walkthroughCount = guideData.circuits?.length ?? 0;

/** Site URLs referenced from app copy, with `${…}` template holes marked. */
function appSiteUrls(): { source: string; url: string }[] {
  const found: { source: string; url: string }[] = [];
  for (const file of APP_COPY_SOURCES) {
    const source = read(file);
    for (const match of source.matchAll(/https:\/\/electrasim\.com(\/[^\s"'`)]*)?/g)) {
      found.push({
        source: relative(root, file),
        url: (match[1] ?? '/').replace(/\$\{[^}]*\}/g, '*'),
      });
    }
  }
  return found;
}

const SITE_URLS = appSiteUrls();

describe('app copy → marketing site links', () => {
  it('finds the app links it is supposed to guard', () => {
    // Guards the guard: a refactor that moves the copy must not make this test
    // pass by scanning nothing.
    expect(SITE_URLS.length).toBeGreaterThan(4);
    expect(siteAnchorIds.size).toBeGreaterThan(20);
    expect(routes.exact.size).toBeGreaterThan(10);
    expect(walkthroughCount).toBeGreaterThan(0);
  });

  it('points every site URL at a route the Astro build actually serves', () => {
    const unresolved = SITE_URLS.filter(({ url }) => {
      const pathname = url.split('#')[0] ?? '/';
      if (pathname === '/app/' || pathname === '/' || pathname === '') return false;
      if (routes.exact.has(pathname)) return false;
      // A `${…}` hole in the path (e.g. the walkthrough anchor is appended to
      // `/guide/`) is a dynamic prefix: the parent route has to exist.
      if (pathname.endsWith('/*')) {
        const prefix = pathname.slice(0, -1);
        return ![...routes.exact].some((route) => route.startsWith(prefix));
      }
      return !routes.dynamic.some((prefix) => pathname.startsWith(prefix));
    });

    expect(
      unresolved.map(({ source, url }) => `${source} → ${url}`),
      'these app links point at routes the site does not serve',
    ).toEqual([]);
  });

  it('keeps every site fragment resolvable on the built page', () => {
    const broken = SITE_URLS.filter(({ url }) => {
      const [pathname = '/', fragment = ''] = url.split('#');
      if (!fragment) return false;
      // Fragment assembled at runtime (`/guide/${anchor}`): the anchors in play
      // are covered by the walkthrough-anchor test below.
      if (fragment.includes('*')) return false;

      // The guide hub redirects the legacy `#circuit-N` hashes to the
      // per-walkthrough pages (astro-site/src/pages/js/guide-legacy-redirects.js.ts),
      // so those stay valid as long as the walkthrough they name exists.
      const legacy = /^circuit-(\d+)$/.exec(fragment);
      if (legacy) {
        const index = Number(legacy[1]);
        return !pathname.startsWith('/guide') || index < 1 || index > walkthroughCount;
      }

      return !siteAnchorIds.has(fragment);
    });

    expect(
      broken.map(({ source, url }) => `${source} → ${url}`),
      'these fragments no longer exist anywhere on the site',
    ).toEqual([]);
  });

  it('maps every walkthrough anchor to a template the app ships', () => {
    const templateIds = new Set(GUIDED_CIRCUIT_TEMPLATES.map((template) => template.id));
    const unknown = Object.keys(GUIDE_WALKTHROUGH_ANCHORS).filter((id) => !templateIds.has(id));

    expect(unknown, 'walkthrough anchors keyed by a template id the app no longer ships').toEqual(
      [],
    );
  });
});

/**
 * Count guard, app side.
 *
 * `astro-site/src/lib/guide-counts.test.ts` ties the marketing copy to the
 * corpus. The app quotes the same numbers in its docs and onboarding tour, and
 * nothing checked those: the tour spent three months telling every new user
 * there were eighteen guided circuits when there were twenty.
 */
const NUMBER_WORDS: Record<string, number> = {
  ten: 10,
  twelve: 12,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  twentyone: 21,
};

const toNumber = (token: string) =>
  /^\d+$/.test(token) ? Number(token) : (NUMBER_WORDS[token.toLowerCase()] ?? Number.NaN);

const COPY_PATTERNS = [
  {
    label: 'ready-made circuits',
    pattern: /(\d+|[A-Za-z]+)\s+ready-made circuits/gi,
    expected: GUIDED_CIRCUIT_TEMPLATES.length,
  },
  {
    label: 'built-in guided circuits',
    pattern: /(\d+|[A-Za-z]+)\s+built-in guided circuits/gi,
    expected: GUIDED_CIRCUIT_TEMPLATES.length,
  },
  {
    label: 'step-by-step circuit walkthroughs',
    pattern: /(\d+|[A-Za-z]+)\s+step-by-step circuit walkthroughs/gi,
    expected: walkthroughCount,
  },
];

describe('app copy → corpus counts', () => {
  const corpus = APP_COPY_SOURCES.map(read).join('\n---\n');

  it('quotes at least one count, so the patterns cannot pass vacuously', () => {
    const total = COPY_PATTERNS.reduce(
      (count, check) => count + [...corpus.matchAll(check.pattern)].length,
      0,
    );
    expect(total).toBeGreaterThan(0);
  });

  for (const check of COPY_PATTERNS) {
    it(`quotes ${check.expected} for "${check.label}"`, () => {
      for (const match of corpus.matchAll(check.pattern)) {
        const quoted = toNumber(match[1] ?? '');
        expect(
          Number.isNaN(quoted) ? `unparseable count "${match[1]}"` : quoted,
          `"${match[0].trim()}" disagrees with the ${check.expected} the app ships`,
        ).toBe(check.expected);
      }
    });
  }
});
