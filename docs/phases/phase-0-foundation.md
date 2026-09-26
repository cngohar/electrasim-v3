# Phase 0 — Foundation (Bun + 100% Workers)

> **Goal:** Bun everywhere, Worker serves everything, D1/R2/KV/DO/Queues exist locally, Auth proves login, Standards are immutable, everything verified via `wrangler dev --local` before any `--remote`.
> **Method:** Sub-phase → Steps → Gate. Each sub-phase ships as its own commit(s). No `--remote` until 0.5 passes.

## Sub-phase map

| Sub-phase | Title | Scope | Key files | Exit gate (`--local` only) |
|-----------|-------|-------|-----------|----------------------------|
| **0.0** | **Tooling** | npm→Bun, workspaces, scripts, lefthook, lockfile | `package.json`, `astro-site/package.json`, `lefthook.yml`, `tsconfig.json`, `bun.lockb` | `bun install` clean · `bun run typecheck` · `bun run lint` · `bun test` all via Bun, no `npm` |
| **0.1** | **Worker + Assets** | Hono Worker entry, Wrangler bindings (D1/R2/KV/DO/Queues/Assets), Vite→Worker Assets, no `postbuild.mjs` merge | `src/worker.ts`, `wrangler.jsonc`, `vite.config.ts`, `astro-site/astro.config.mjs` | `bun x wrangler dev --local --persist-to .wrangler/state` serves `/` + `/app` (200), assets 304-safe |
| **0.2** | **DB + Immutable Standards** | D1 `electrasim` + Drizzle schema + `electrical_standards` read-only projection seeded from `domain/standards.ts` | `packages/db/schema.ts`, `migrations/`, `scripts/seed-standards.ts` | `d1 migrations apply --local` · `d1 execute --local "SELECT * FROM electrical_standards"` returns 4 rows (uk/us/eu/int) · no `POST /api/standards` route exists |
| **0.3** | **Auth** | Better Auth `drizzleAdapter(provider:"sqlite")` + `organization` plugin + Google/GitHub/Microsoft stubs + session → RBAC guard | `packages/db/auth.ts`, `packages/db/drizzle.ts`, `src/worker.ts` (auth mount) | `POST /api/auth/sign-up` → 200 (local) · session cookie set · `GET /admin` without auth → 401/302 · with auth+role → 200 |
| **0.4** | **i18n Foundation** | `i18n_strings` + `content_pages(locale)` tables, `/:locale/` routing, `hreflang` + `x-default`, `Accept-Language` middleware | `packages/db/schema.ts` (i18n), `src/worker.ts` (locale middleware), `astro-site/src/layouts/Base.astro` | `/en/` + `/fr/` both SSR (200) · bare `/` redirects via `Accept-Language` · every page carries `hreflang` alternates · `check:seo` hreflang pass |
| **0.5** | **Verify** | Typecheck/lint/test + D1 insight + parallel burst | — | `bun run verify` (local) = `typecheck && lint && test && build && check:perf && check:links && check:seo && check:csp && e2e (vs local)` — no `SQLITE_BUSY` on `200 reads + 50 writes` burst · `d1 insights --local` p95 within budget |

## Step breakdown for 0.0 Tooling

| Step | Action | Files to touch | Verify |
|------|--------|----------------|--------|
| 0.0.1 | Root `package.json`: `engines.bun`, `packageManager`, `workspaces`, all `npm run` → `bun run`, `npx`/`npx` via `bun x` in scripts (`typecheck`, `lint`, `test`, `wrangler`) | `package.json` | `bun install --dry-run` parses |
| 0.0.2 | `astro-site/package.json`: align scripts to Bun (`prebuild`/`gen:og` use `bun x`) | `astro-site/package.json` | `bun run --cwd astro-site typecheck` works |
| 0.0.3 | `lefthook.yml`: `npx biome` → `bun x biome`, `npm run typecheck` → `bun run typecheck` | `lefthook.yml` | `bun x lefthook install` |
| 0.0.4 | `tsconfig.json` + `vite.config.ts`: ensure `moduleResolution: bundler` still valid under Bun, no Node-only imports in Vite config | `tsconfig.json`, `vite.config.ts` | `bun run typecheck` |
| 0.0.5 | Install & lock: `bun install` → `bun.lockb`, then `bun run check` (typecheck+lint+test) fully via Bun | `bun.lockb`, `node_modules` | `bun test` 1464 tests via Bun, zero via npm |

## Rules

- Every sub-phase commit touches `CHANGELOG.md` + `progress.md` (§9 discipline) — now via `bun x`, not `npx`.
- No new runtime deps in 0.0 — only tooling rewiring.
- Next sub-phase does not start until the previous gate is green on `--local`.
