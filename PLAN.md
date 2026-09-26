# ElectraSim — Master Plan (Pointer)

> **V3 is the real V3.** The paper plan shipped as `2.0.x` was archived; the active plan is below.
> Do not use this file for stack/roadmap detail — it lives in the full rewrite doc.

| What | Where |
|------|-------|
| **Active plan (locked)** | [`docs/REWRITE_PLAN_V3_FULL.md`](./docs/REWRITE_PLAN_V3_FULL.md) — Bun + 100% Workers (D1/R2/KV/DO/Queues), Better Auth, electrical-native UI |
| **Phase 1 — current detailed sequence** | [`docs/phases/phase-1-simulator-core.md`](./docs/phases/phase-1-simulator-core.md) — standards corrections, simulator and manual memberships |
| **Paid membership specification** | [`docs/plans/PAID_MEMBERSHIP_PLAN.md`](./docs/plans/PAID_MEMBERSHIP_PLAN.md) — free/paid boundary, super-admin management, lifecycle and gates |
| **Standards research** | [`docs/audits/electrical-standards-gap.md`](./docs/audits/electrical-standards-gap.md) — IET/NFPA/IEC sources checked 2026-09-26 |
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
1 **Simulator core + manual paid memberships (Lab Circuit — heart, NOT deferred)** →
2 Community (Published Circuit sharing — **deferred until simulator**) →
3 Gamification → 4 Procedural engine → 5 Wiring Games + Content Studio →
6 LMS → 7 Online checkout + Pro polish → 8 Hardening & live cutover

**Membership decisions (2026-09-26):** basic faults/diagnosis remain free to guests; existing Pro components, advanced faults/multi-fault exercises and advanced diagnosis/Ohmageddon require membership. Super admins manage plans, benefits and assignments in Phase 1; checkout remains Phase 7. Additional benefits remain configurable but uncommitted. The revised Phase 1 sequence is 1.0–1.9, with local gates throughout.

**Deferral clarified 2026-09-25:** **Lab Circuit** (simulator `domain/simulation` + canvas + Matter.js visual) is **NOT deferred** — it is Phase 1.
Deferred is **Published Circuit** (sharing to feed `/feed` `/explore` `/c/[id]` + fork chain), which naturally comes with Community (Phase 2+).

**Local-only contract (2026-09-26):** the live site’s Cloudflare credentials have been removed locally. All development and tests stay local; no old-account login or remote operations. A new account will be configured after development, with explicit user authorization before remote work. See `AGENTS.md` and `TRACKING.md`.
