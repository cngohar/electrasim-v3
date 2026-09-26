# Progress Log — ElectraSim V3

> **Master plan:** [`docs/REWRITE_PLAN_V3_FULL.md`](./docs/REWRITE_PLAN_V3_FULL.md) — locked stack (Bun + Workers), architecture, roadmap.
> **Changelog:** [`CHANGELOG.md`](./CHANGELOG.md) — shipped changes (Keep-a-Changelog).
> **Archive:** V2 log through 2026-09-21 is at [`docs/archive/v2/progress-v2.md`](./docs/archive/v2/progress-v2.md).

Append-only. Every coding session adds an entry. Every entry names files + measured results.

---

## Session 2026-09-25 — V3 reset: archive V2, fresh tracking, circuit deferred, local-first contract

**Request:** leave the circuit (simulator) for later phases; continue working; create a new changelog + progress + tracking for V3; archive V2 for reference; everything tested locally before uploading to Cloudflare.

**Done:**

1. Archived V2 to `docs/archive/v2/`:
   - `CHANGELOG.md` → `CHANGELOG-v2.md`, `progress.md` → `progress-v2.md`, `TRACKING.md` → `TRACKING-v2.md`, `PLAN.md` → `PLAN-v2.md`, plus `docs/decisions/` → `decisions/`, `docs/plans/` → `plans/`, `docs/audits/` → `audits/` + `docs/archive/v2/README.md`.
   - Originals preserved in place until overwritten below (so working set stays intact).
2. Fresh V3 heads:
   - `CHANGELOG.md` — new Keep-a-Changelog from `Unreleased` (V2 archived note + `3.0.0` template).
   - `progress.md` — this file (pointer to `REWRITE_PLAN_V3_FULL.md`, archive pointer, session discipline).
   - `TRACKING.md` — privacy/SEO/delivery tied to Workers artifact + local verification commands.
   - `PLAN.md` — slim pointer file (V2 archived, V3 is `REWRITE_PLAN_V3_FULL.md`; circuit section marked Deferred).
3. `docs/REWRITE_PLAN_V3_FULL.md` patched:
   - Circuit ambiguity clarified: **Lab Circuit (heart) NOT deferred**; **Published Circuit (social sharing) deferred** to Community Phase 2+. `PLAN.md` pointer and `REWRITE_PLAN_V4_FULL.md` superseded banner aligned.
   - Local-first contract added: `wrangler dev --local` / `--local --persist-to` + `d1 migrations apply --local` etc. before any `--remote` deploy.
   - New sections §30–§33 added: **Astro redesign two-stage (SSG on Worker Assets → hybrid/D1 SSR + dynamic behaviours)**, **i18n (locale-prefixed routes, `hreflang`, RTL, `content_pages(locale)`, `i18n_strings`)**, **Electrical Standards IMMUTABLE (code-owned, super_admin read-only)**, **D1 at scale (replicas + `D1.batch()` + KV shield + Queues + budgets)**.
   - §34–§35 added as checklist for the exhaustive `src/` + `astro-site/src/` coupling audit (next action).
4. `wrangler.jsonc` updated to `compatibility_date 2024-09-23` + `nodejs_compat` + local-first comments (bindings placeholder for Phase 0). `TRACKING.md` surfaces updated for locale routing, immutable standards, and parallel-burst verification.

---

## Session 2026-09-25 (cont.) — Circuit clarification + Astro / i18n / electrical-standards / D1 performance

**Request:** clarify "circuit" deferral; how Astro site fits and where dynamics live; exhaustive codebase scan concern (Astro + simulator couplings); **localization (multi-language, international site)**; **electrical standards must follow global standards and be NOT overridable (super admin read-only)**; **D1 performance under parallel reads/writes — no failures, blazing fast**.

**Done:**

1. Clarified deferral in `docs/REWRITE_PLAN_V3_FULL.md` header + §28 + `PLAN.md`: **Lab Circuit heart → Phase 1 (not deferred)**, **Published Circuit → Phase 2+ (Community)**. Earlier misread corrected.
2. Added §30 **Astro Site in V3**: two stages — (A) `bun x astro build` → Worker Assets redesign in place; (B) files → D1 `content_pages/posts` then hybrid/SSR. Table of dynamic behaviours (procedural hero, auth-aware header, LMS-scoped guide, `FTS5` search) that live in Worker, not static Astro; coupling seams to `templates.ts` / `theme.ts` listed.
3. Added §31 **Localization (i18n)**: locale-prefixed routes with `Accept-Language` + `CF-IPCountry` fallback, `hreflang` + `og:locale` + `dir="rtl"` for RTL, `content_pages(locale)` / `i18n_strings` / `glossary_terms(locale)` model, `astro-i18n` (marketing) + `i18next` (app) + email locale, `/admin/i18n` coverage view. All hot-reloadable.
4. Added §32 **Electrical Standards — Global Immutable**: code-owned (`standards.ts`, `electricalCalculations.ts`, `tripCurves.ts`, `compliance.ts`), D1 projection seeded at build (`bun run seed:standards`), **super_admin viewer-only** (no `POST/PATCH /api/standards`), changes only via PR + migration + release + `CHANGELOG.md` citation.
5. Added §33 **D1 Performance at Scale**: replicas `withSession(bookmark)`, short batched writes, 70% KV shield, Queues for slow work, idempotency + `409` OCC, DO for hot aggregates, `EXPLAIN QUERY PLAN` per query, p95 budgets, local parallel-burst verification command.
6. Added §34 **Exhaust Inventory** checklist (every `src/` + `astro-site/src/` file to read) and §35 open questions. `PLAN.md` / `TRACKING.md` aligned to all four.
7. Added edge-case answers inline: RTL scope, standards version pin, card/quiz localization vs electrical number immutability.

**Still pending for next session:** run the exhaustive `glob` + line-by-line reads listed in §34 and produce the **coupling table** appendix in `docs/REWRITE_PLAN_V3_FULL.md` so §30–§33 move from "designed" to "proven against the real files". Then scaffold Phase 0.

---

<!-- Next session appends below. Keep append-only. -->
