# ElectraSim SEO, Privacy & Delivery Reference

This file describes the current tracking policy, SEO ownership, content structure, and
production build for both ElectraSim surfaces.

> **Production release reference:** v1.6.1, 2026-07-21, verified at
> `https://63e4c5d6.electrasim.pages.dev` and `https://electrasim.com/`. Keep this document
> aligned with the app, marketing site, privacy page, CSP, and Wrangler deployment artifact.
>
> **Pending branch (2026-08-23):** `arena/01a0287b-electrasim-ai3` — onboarding tours,
> dual demo benches, validation check 10, International default standard, marketing↔app
> content sync, and site search/nav/hero upgrades. Before merging/deploying: bump the
> release version (marketing `?v=` cache keys must change), run the full Playwright suite
> locally (see CHANGELOG "Architecture Regression Analysis" notes), and resolve the
> pre-existing `check:perf` bundle-budget failure.

## Repository Ownership

- **Active private backup:** `https://github.com/cngohar/electrasimw` (`origin`). It is intentionally not connected to Cloudflare and must remain deployment-neutral until a later migration is approved.
- **Legacy Cloudflare-connected repository:** `https://github.com/cngohar/electrasim` (`legacy-electrasim`). Keep this remote only as migration history; do not use it for current pushes or pull requests.
- The Sveltia CMS repository setting targets the active backup so a future hosting migration will not write content into the legacy repository. This source change was not redeployed to the current Cloudflare site.

## Surfaces

| Surface | Production path | Technology | Source |
|---|---|---|---|
| Simulator | `/app/*` | React 19 + Vite | `index.html`, `src/` |
| Marketing and blog | `/`, `/guide/`, `/compare/`, `/blog/*`, legal pages | Astro static site | `astro-site/` |

The surfaces are built together and published as one Cloudflare Pages artifact. They are
not deployed independently.

## Tracking Policy

ElectraSim currently runs **no analytics or advertising scripts** on either surface:

- No Plausible, Google Analytics, Google Tag Manager, or tracking pixels.
- No tracking or advertising cookies.
- Simulator circuits and settings remain in browser storage.
- User-created share links carry compressed circuit data in the URL fragment, which browsers do
  not send to Cloudflare or the origin. Decoding is capped at 1 MiB before text materialization.
  Legacy `?c=` links remain readable, but the payload moves into the fragment immediately after
  decode and stays there only until local persistence succeeds.
- Cloudflare may retain infrastructure access logs under its own policies.
- Google Forms and Facebook are only reached after a user follows an explicit external link.

The public policy is maintained in
[`astro-site/src/content/pages/privacy.json`](./astro-site/src/content/pages/privacy.json).
Do not add a tracking provider without updating that policy, reviewing the Content Security
Policy in [`public/_headers`](./public/_headers), and documenting the data flow here.

The marketing site uses the local system font stack from
[`astro-site/src/styles/global.css`](./astro-site/src/styles/global.css); it makes no Google
Fonts request.

## SEO Ownership

### Simulator

The app shell metadata lives in [`index.html`](./index.html):

- Canonical URL: `https://electrasim.com/app/`
- Open Graph and Twitter metadata
- `SoftwareApplication` JSON-LD
- PWA links and app icons

### Marketing Site

[`astro-site/src/layouts/Base.astro`](./astro-site/src/layouts/Base.astro) owns shared
canonical, robots, Open Graph, Twitter, and `WebSite` JSON-LD metadata. Route-specific
content comes from:

| Route | Content source |
|---|---|
| Homepage | `astro-site/src/content/pages/landing.json` |
| Guide | `astro-site/src/content/pages/guide.json` |
| Simulator comparison bench | `astro-site/src/pages/compare.astro`, `astro-site/src/lib/competitor-bench.ts`, and `astro-site/src/styles/compare-bench.css` |
| Blog index | `astro-site/src/content/pages/blog-index.json` |
| About, contact, privacy, terms | matching JSON file under `astro-site/src/content/pages/` |
| Blog article | frontmatter and Markdown under `astro-site/src/content/blog/` |

Astro generates `sitemap-index.xml`. The sitemap integration excludes admin and 404
routes and adds `/app/` explicitly.

## Marketing Structure

```text
astro-site/src/
├── components/
│   ├── layout/       Header, footer, background, contact, scroll-to-top
│   ├── landing/      Homepage sections and responsive hero
│   ├── guide/        Guide overview, circuit cards, CTA
│   └── blog/         Post cards, grids, topic navigation, pagination
├── content/
│   ├── blog/         Markdown articles
│   └── pages/        CMS-editable page JSON
├── layouts/
│   └── Base.astro    Document shell and shared metadata
├── lib/
│   └── blog.ts       Blog ordering, pagination, tag slugs, reading time
├── pages/            Astro routes
└── styles/
    ├── global.css
    ├── compare-bench.css
    ├── landing.css
    ├── guide.css
    └── blog/         Index, article, and tag styles
```

The homepage hero uses responsive 480, 800, and 1200 pixel AVIF/WebP files in
`astro-site/public/images/`. The root `public/og-image.png` remains the social-sharing
image.

## Appearance

The simulator stores its Light, Dark, or System preference with the rest of the app settings.
The marketing site uses the small same-origin `astro-site/public/js/theme.js` bootstrap and the
`electrasim:color-scheme` local-storage key. The script runs in the document head so the correct
theme is applied before the page is painted, updates the browser theme colour, and remains valid
under the strict self-only script policy. Marketing colours are defined through shared variables
in `astro-site/src/styles/global.css`; page styles should consume those variables rather than add
light-only surfaces.

## Blog Generation

Blog behavior is centralized in
[`astro-site/src/lib/blog.ts`](./astro-site/src/lib/blog.ts):

- `BLOG_PAGE_SIZE = 9`: `/blog/` and `/blog/2/` onward are statically paginated.
- `MIN_TAG_POSTS = 3`: a tag archive is generated only after at least three published
  articles use that normalized tag.
- Article tag links are emitted only for generated archives, so they cannot point to
  nonexistent tag pages.
- Topic navigation is derived from the full corpus rather than filtering only the current
  page in JavaScript.
- Each existing nine-post page slice is presented in separate App Update and learning-article
  sections. Classification happens after pagination, so existing page counts, routes, canonical
  URLs, and previous/next relationships do not move.
- Homepage article metadata comes from the blog collection; only the curated article ID
  list is maintained in code.

There is no client-side blog filter or pagination script.

### Adding a Blog Article

1. Add `astro-site/src/content/blog/<slug>.md` with valid frontmatter.
2. Run `npm run build`.
3. Check the article, blog pagination, and any qualifying tag archive.
4. To feature it on the homepage, update `HOMEPAGE_ARTICLE_IDS` in
   `astro-site/src/lib/blog.ts`.
5. Deploy with `npm run deploy`.

A new tag does not get an archive until it reaches the three-article threshold.

### Current Editorial Status

The regular article **“How Does a Push Button Switch Work? Momentary Contacts”** was published on
2026-07-20. It covers momentary and maintained actions, NO and NC contacts, doorbells, real-world
contactor holding logic, emergency-stop boundaries, and an exercise that matches ElectraSim's
current two-terminal Push Button. The non-featured post includes a responsive 1200 x 630 original
illustration and is live at `/blog/how-does-a-push-button-switch-work/`.

## Combined Build and Deploy

From the repository root:

```bash
npm run build
npm run preview
npm run deploy
```

`npm run build` performs the complete production pipeline:

1. Vite builds the simulator.
2. Astro builds the marketing site and blog into `dist-astro/`.
3. `scripts/postbuild.mjs` moves the SPA under `dist/app/`, overlays the Astro output at
   the site root, and removes `dist-astro/`.

`npm run deploy` runs that build and publishes the resulting `dist/` directory to the
`electrasim` Cloudflare Pages project through Wrangler.

Each Pages deployment is a complete immutable snapshot of `dist/`. Wrangler hashes files
and reuses identical uploads, but the new deployment does not merge an old page tree into
the current one. Only files referenced by the newly published snapshot remain reachable
through the active production deployment.

The active v1.6.1 production snapshot is `https://63e4c5d6.electrasim.pages.dev` and is
served through `https://electrasim.com/`. The root `/sw.js` is a no-cache retirement worker
for the obsolete site-wide registration; the simulator's active PWA worker is `/app/sw.js`
and remains scoped to `/app/`.

Astro, the sitemap integration, and the Markdown renderer are static build tools and live in
the marketing workspace's `devDependencies`. After upgrading Astro to `6.4.8`,
`npm audit --omit=dev` reports zero production vulnerabilities. The full development audit
retains two linked low-severity entries for esbuild's Windows-only development-server issue;
the offered remediation is an Astro 7 major upgrade and is intentionally deferred for a
separate compatibility pass.

HTML routes in [`public/_headers`](./public/_headers) use `Cache-Control: no-transform`.
Keep that directive in place while the site advertises a strict CSP and no browser analytics:
it prevents delivery-layer HTML rewriting from injecting scripts that are absent from the
reviewed build.

The three versionless marketing scripts are requested with the root release version
(`theme.js?v=<version>`, `site-nav.js?v=<version>`, and `scroll-top.js?v=<version>`). This keeps them correct when a
Cloudflare custom-domain cache policy raises their browser TTL above the one-hour value in
`_headers`; a release bump changes the cache key without duplicating version strings in Astro.

## Performance Gates

```bash
npm run build:stats          # full build plus app bundle treemap
npm run benchmark:simulation # dense solver benchmark; p95 budget is 8 ms
npm run benchmark:browser    # opt-in dense-editor Playwright frame benchmark
npm run check:perf           # enforce built bundle, HTML, tag-page, and hero budgets
```

Run `npm run build` before `npm run check:perf`. Current enforced limits live in
[`scripts/check-performance.mjs`](./scripts/check-performance.mjs), not in this document,
so changing a budget requires a reviewed code change.

The full release gate is `npm run verify`. It adds typechecking, linting, unit/integration
tests, internal-link validation, dense solver and browser benchmarks, responsive E2E flows,
and a separate Wrangler-preview production suite. After deployment, verify both `/` and
`/app/` against the public domain, including canonical metadata, console errors, canvas
rendering, and the Run-to-Live workflow.

Set `PLAYWRIGHT_BASE_URL=https://electrasim.com` when running `npm run e2e:production` to
exercise the same production suite against the live domain instead of starting a local
Wrangler preview.

## Release Record

| Version | Date | Summary |
|---|---|---|
| v2.0.4 | 2026-09-17 | The correctness release: the guided-circuit validator stops reporting an over-rated breaker on circuits whose cable was never undersized, eight templates declare the conductor and device rating they wire, device names use the instance rating everywhere, the homepage snippet fits its budget, and the app's guide links point at routes that exist. |
| v2.0.3 | 2026-09-09 | The guide release: 20 circuit walkthroughs, 22 component anatomy pages (16 with interactive cutaways), 8 tool pages, a 37-term glossary, and a start-here post routing readers through all of it. Every guide page gained a snippet that fits, its own social card and marked-up breadcrumbs. |
| v2.0.2 | 2026-09-04 | `/compare/` rebuilt as a research bench: SVG research map, task-fit plots, filterable matrix and a dated first-party evidence ledger. |

A release bump is not cosmetic on this site. Three things key off the version in the root
`package.json`:

- **The landing release popup** (`astro-site/src/components/landing/LandingReleasePopup.astro`)
  stores dismissal under `electrasim:release-popup:<version>`, so a bump is what re-arms the
  announcement for returning visitors. The copy in that component is about 2.0 and is not rewritten
  for a patch — check it before a minor or major.
- **The three versionless marketing scripts** (`theme.js`, `site-nav.js`, `scroll-top.js`) request
  `?v=<version>`, so a bump is also their cache invalidation.
- **The app's own version** (`src/version.ts`) reads the same manifest.

The marketing `?v=` keys and the OG card hashes are separate mechanisms and do not need to move
together: card hashes are content digests written by `scripts/generate-og-images.mjs`, and they
change only when the artwork changes.

### Content and SEO state

- 192 HTML routes build from `dist/`, of which 190 are checked by `npm run check:seo` (`/app/` and
  `/admin/` are noindex shells and are skipped).
- The pre-release gate is `npm run verify`, which now includes `check:seo` between `check:links`
  and `benchmark:simulation`.
- Guide pages are checked for a per-page social card, a `BreadcrumbList` that matches the trail
  rendered on the page, and (on circuit walkthroughs) a `HowTo` whose step anchors resolve.
