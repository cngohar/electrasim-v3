# ElectraSim V3 — Privacy, SEO & Delivery Reference

> **Release reference:** V3.0 in development (Bun + 100% Cloudflare Workers). V2 record through `2.0.4` is at
> [`docs/archive/v2/TRACKING-v2.md`](./docs/archive/v2/TRACKING-v2.md).
> **Master plan:** [`docs/REWRITE_PLAN_V3_FULL.md`](./docs/REWRITE_PLAN_V3_FULL.md).

## Surfaces (V3)

| Surface | Path | Stack |
|---------|------|-------|
| Marketing + blog + guide + glossary + compare + toolbox | `/`, `/guide/*`, `/glossary`, `/compare`, `/toolbox`, `/blog/*`, `/legal/*` | Hono on Workers + Content Studio (D1 + R2), SSR via Worker |
| Simulator lab (Lab Circuit — heart) | `/app`, `/app/c/[id]` | React 19 + Hono Worker Assets, Phase 1 (**not deferred**) |
| Published circuits (social) | `/feed`, `/explore`, `/c/[circuitId]` | **Deferred — Phase 2+** (needs lab to have created circuits) |
| LMS | `/lms`, `/lms/institution/[slug]`, `/lms/class/[id]` | Workers + D1 |
| Community + profiles | `/feed`, `/explore`, `/c/[circuitId]`, `/u/[handle]` | Workers + D1 + R2 + Durable Objects |
| Admin | `/admin/*` | Workers, `super_admin`/`admin` only |
| Platform | `/api/*`, `/api/auth/*`, webhooks | Hono on Workers |

All routes served by **one Worker** (`wrangler.jsonc` → `dist` assets + `src/worker.ts`). No separate Pages/Workers split.
Locale-prefixed marketing routes become `/:locale/...` (e.g. `/en/guide`, `/fr/guide`) with bare `/` redirecting via `Accept-Language` + `hreflang`; `/app` stays locale-agnostic but reads `users.locale`.

## Tracking & Privacy

- **No analytics or advertising scripts by default** (same posture as V2).
- No tracking/advertising cookies.
- Simulator circuits/settings: **D1 as source of truth**; IndexedDB is L2 offline cache + offline queue (last-write-wins per `circuitId`). Share links: canonical `https://electrasim.com/c/<id>` (DB-backed) + legacy `#c=<gzip>` fragment (client-decoded) kept.
- Cloudflare may retain infrastructure logs per its policies.
- Google Forms / Facebook only after explicit external link follow.
- Privacy copy: `content_pages` entry `privacy` (Content Studio), reviewed before any tracker is added — must also update `public/_headers` CSP and this file.

## SEO Ownership

- **App shell:** `index.html` — canonical `https://electrasim.com/app/`, OG, `SoftwareApplication` JSON-LD, PWA icons.
- **Marketing + CMS:** Worker SSR owns canonical/robots/OG/Twitter/`WebSite` JSON-LD. Per-route content from Content Studio (`content_pages`/`content_posts`) + sitemap at `/sitemap.xml` (or `sitemap-index.xml` if we split). **i18n (§31):** sitemap emits one `<url>` per locale, every page carries `hreflang` alternates + `x-default` → `/en/`.
- **Guide/circuit/blog cards:** per-page OG `1200×630` PNG-8 generated via Satori → **R2** (not `public/`).
- **Live URLs preserved:** every V2 marketing URL (`/`, `/guide`, `/glossary`, `/toolbox`, `/compare`, `/blog/*`, `/#c=`) keeps its path or gets a `301` (see `docs/REWRITE_PLAN_V3_FULL.md` §24).
- **Electrical standards (§32):** **immutable** — `domain/standards.ts` + `electricalCalculations.ts` + `tripCurves.ts` + `compliance.ts` are code-owned (git). D1 `electrical_standards` is read-only projection; super admin viewer only, no write endpoints. Changes only via reviewed PR + migration + release. SEO never claims a standard changed via Admin.
- **D1 at scale (§33):** every new query ships with `EXPLAIN QUERY PLAN` on hot tables; reads prefer `withSession(bookmark)` replicas, writes are short `D1.batch()`, hot reads sit behind KV (60–300s), no feed/gradebook without `LIMIT` on an indexed `ORDER BY`.

## Local development only

The current Cloudflare account serves the live `electrasim.com` website. Its local Wrangler login was removed at the user's request on 2026-09-26; the live account/resources were not changed. A **new account will be configured after development**. Passing tests does not authorize remote operations. See [AGENTS.md](./AGENTS.md).

`wrangler.jsonc` uses local resource placeholders and local bindings. No Cloudflare login or remote resource creation is required. `bun run deploy` deliberately exits with an error, and the standards seed accepts only `--local`.

```bash
bun install
bun run dev
bun run typecheck
bun run lint
bun run test

# The local emulator creates its database when migrations are applied.
bun x wrangler d1 migrations apply electrasim --local --persist-to .wrangler/state
bun x wrangler d1 execute electrasim --local --persist-to .wrangler/state --command "SELECT 1"
bun run seed:standards --local

bun run build
bun run dev:worker
# Or the built Worker and assets on localhost:8788:
bun run preview

bun run check:perf
bun run check:links
bun run check:seo
bun run check:csp
bun run e2e
bun run e2e:production
```

Both browser configurations reject non-local test targets. Website URLs in SEO content remain publication metadata, not test/deployment targets. Do not run remote account, resource, migration or deployment commands against the existing account.

## Versioning & Cache

- **Release version:** `package.json` `version` → `3.0.0` line. Bumps invalidate:
  - Landing release popup key `electrasim:release-popup:<version>`.
  - Marketing scripts `?v=<version>` (`theme.js`, `site-nav.js`, `scroll-top.js`).
- **OG cards:** content-hashed via `scripts/generate-og-images.mjs` → R2, independent of `?v=`.
- **Headers:** `public/_headers` — `Cache-Control: no-transform` on HTML + strict CSP (`payment=()` etc.) — keep for Workers Assets.

## Release Record

| Version | Date | Summary |
|---------|------|---------|
| 3.0.0 | — | V3.0 in development (Bun + Workers + D1). V2 `2.0.4` (2026-09-17) remains live. |

A bump is not cosmetic: popup dismissal + `?v=` keys both move with the version.
