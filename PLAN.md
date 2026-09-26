# ElectraSim — Master Plan (Pointer)

> **V3 is the real V3.** The paper plan shipped as `2.0.x` was archived; the active plan is below.
> Do not use this file for stack/roadmap detail — it lives in the full rewrite doc.

| What | Where |
|------|-------|
| **Active plan (locked)** | [`docs/REWRITE_PLAN_V3_FULL.md`](./docs/REWRITE_PLAN_V3_FULL.md) — Bun + 100% Workers (D1/R2/KV/DO/Queues), Better Auth, electrical-native UI |
| **Previous full draft (superseded)** | `docs/REWRITE_PLAN_V4_FULL.md` (Node/Postgres) — kept for diff only |
| **V2 archive** | [`docs/archive/v2/PLAN-v2.md`](./docs/archive/v2/PLAN-v2.md) + decisions/plans/audits |
| **Changelog** | [`CHANGELOG.md`](./CHANGELOG.md) |
| **Progress log** | [`progress.md`](./progress.md) |
| **Privacy/SEO/delivery** | [`TRACKING.md`](./TRACKING.md) |

## V3 Cross-Cutting (added 2026-09-25)

- **i18n (§31):** locale-prefixed routes (`/en/` `/fr/` `/de/`…), `hreflang`, RTL, `content_pages(locale)`, `i18n_strings` — admin adds locales as data. Simulator chrome + LMS + emails all localized; electrical numbers never translate.
- **Electrical Standards (§32 — IMMUTABLE):** `domain/standards.ts` + `electricalCalculations.ts` + `tripCurves.ts` + `compliance.ts` are **code-owned, versioned in git**. D1 `electrical_standards` is read-only projection. **Super admin = read-only viewer**; no `POST/PATCH /api/standards` exists. Changes only via reviewed PR + migration + release. This is a safety/regulatory boundary and overrides "everything admin-editable".
- **D1 at Scale (§33):** read replicas (`withSession(bookmark)`), short `D1.batch()` writes, KV read shield (70% off D1), Queues for slow work, idempotency, `409` on stale `updatedAt`, DO for hot aggregates, budgets (p95 write <50ms), `EXPLAIN QUERY PLAN` per new query. Parallel-burst local verification before any remote deploy.
- **Astro in V3 (§30):** redesigned in place (Stage A: `bun x astro build` → Worker Assets), then data source swaps to D1 Content Studio (Stage B: hybrid/SSR). Dynamics (procedural hero, auth-aware header, LMS-scoped guide, `FTS5` search) live in Worker, not static Astro.

## V3 Phases (summary — detail in REWRITE_PLAN_V3_FULL §28)

0 Foundation (Bun + Hono Worker + D1/R2/KV/DO + Better Auth) →
1 **Simulator core (Lab Circuit — heart, NOT deferred)** →
2 Community (Published Circuit sharing — **deferred until simulator**) →
3 Gamification → 4 Procedural engine → 5 Wiring Games + Content Studio →
6 LMS → 7 Payments + Pro polish → 8 Hardening & live cutover

**Deferral clarified 2026-09-25:** **Lab Circuit** (simulator `domain/simulation` + canvas + Matter.js visual) is **NOT deferred** — it is Phase 1.
Deferred is **Published Circuit** (sharing to feed `/feed` `/explore` `/c/[id]` + fork chain), which naturally comes with Community (Phase 2+).

**Local-first contract:** every change verified via `bun x wrangler dev --local` (with `--persist-to`) before any `--remote` deploy — see `TRACKING.md` for commands.
