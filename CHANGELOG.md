# Changelog — ElectraSim V3

All notable changes to the V3 rewrite (Bun + 100% Cloudflare Workers) are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/).

> **Archive:** V2 history through `2.0.4` is at `docs/archive/v2/CHANGELOG-v2.md`.

## [Unreleased]

### Added

- Phase 1.4 canvas foundation: cached physical-device vector artwork for all 115 component types, live instance markings and actuator states, terminal labels and reduced-motion support.
- Desktop/phone browser coverage for keyboard wiring, rotated drag cancellation, panel-aware fitting and SVG/PNG exports; opt-in 200-component/400-wire pan/drag/zoom measurement and test-only Canvas 2D paint comparison.

- Phase 1.3: trusted global roles, explicit audited local super-admin bootstrap, and canonical plans/features/manual entitlements/audit tables (migration 0004).
- Super-admin membership APIs with same-origin protection, primary D1 authorization, version conflicts and atomic audit; public plan and private own-membership reads preserve expiry/revocation and archive semantics.
- Pure `@electrasim/access` capability resolver and canonical content policy; 19 real local D1/cookie acceptance groups, added to `bun run verify`. Simulator gates and membership screens follow in 1.5/1.7/1.8; checkout remains Phase 7.


### Changed

- Shared fit-to-view now uses SVG units, rotated footprints and measured floating panels across keyboard, desktop, phone and command-palette controls.
- Dense wire rendering retains diagnostic, trace, severed, short and melted-wire indicators. Canvas theme variables survive standalone exports.
- Memoized scene layers and gesture-aware panel blur substantially reduce dense pan work; the 60 fps dense-interaction target remains open, especially during zoom. SVG remains the production renderer; no dependency changes.

- Phase 1.2: extracted `@electrasim/domain` for the simulator, Comlink Worker and Astro consumers; added an ES2022-only compile/import boundary and real local Hono Worker parity checks. Existing circuit format is unchanged.
- Legacy fault normalization now preserves deterministic identity instead of generating fresh fault IDs/timestamps on each solver call.

- Phase 1.1: corrected standards references/adoption claims, scoped UK loop estimates with explicit unsupported results, removed universal EVSE/125% sizing policies and blanket compliance passes, and propagated supply/model context to the inspector and EIC export. Local D1 standards projection is version 2.
- Simulator trip reports retain actual device residual ratings across profiles and omit unmodelled US clearing times; switched-neutral hazards use actual supply voltage.
- Fixed intermediate-size cable resistance lookup and Bun Astro script invocation; retained documented limits of the numerical teaching models.

- Phase 1.0: confirmed manual-membership scope, inventoried 115 components (41 Pro) and accepted SVG/visual-only Matter ADR 0007.
- Development is local-only pending a new Cloudflare account. Removed the old shared local Wrangler login; disabled deployment and remote seeding, pinned bindings/test targets to local use and preserved the live account unchanged.

### Planning

- **V3 full rewrite plan locked.** See `docs/REWRITE_PLAN_V3_FULL.md` — the real V3 (paper v3 never shipped).
  - Stack: **Bun** everywhere (`bun install/run/test/build`), **Hono on Workers**, **Better Auth + D1 (SQLite)**, **R2 + KV + Durable Objects (SQLite) + Queues**.
  - No external DB/compute. Previous `REWRITE_PLAN_V4_FULL.md` (Node/Postgres) superseded.
  - Brand kept, rebuilt from line 1: `labGlassLight/Dark` + `editorBackground` evolved, electrical-native whitespace, not generic SaaS.
  - Pro benefits, institution pricing (`flat` vs `perSeat`), achievements/levels/XP, permissions — **all admin-editable**, data not code.
  - Content Studio mini-CMS (blog + static pages, approval-gated).
  - Matter.js **visual-only** (overload tear, sag) — never touches `simulate()`.
  - Procedural engine for homepage / games / exam variants (`HMAC` per student).
  - Moderation ON by default + `moderator` role; exam strictness per-exam by instructor; certificates procedurally generated → R2.
  - **Localization (i18n):** locale-prefixed routes, `hreflang`, RTL, admin adds locales as data (§31).
  - **Electrical Standards IMMUTABLE:** code-owned (`standards.ts`, `electricalCalculations.ts`), super_admin read-only, D1 projection seeded at build (§32).
  - **D1 at scale:** replicas `withSession(bookmark)`, batched writes, KV shield, Queues, budgets — parallel-burst verified (§33).
  - **Astro two-stage:** SSG on Worker Assets → hybrid/D1 SSR (§30); dynamics (procedural hero, auth header, LMS-scoped guide) live in Worker.
  - Local-first: everything verified via `wrangler dev --local` before any Cloudflare deploy.
- **V2 archived.** `CHANGELOG.md` / `progress.md` / `TRACKING.md` / `PLAN.md` + `docs/decisions/` + `docs/plans/` + `docs/audits/` copied to `docs/archive/v2/`.

---

## [3.0.0] — Unreleased (V3.0 development)

_Template for first V3 release — remove this block when 3.0.0 ships._

### Added
- (Phase 0) Bun workspaces + Hono Worker + D1 via `wrangler d1` + Better Auth (`provider:"sqlite"`).

### Changed
- Runtime: Node/npm → Bun. DB: Postgres/Neon → D1. Auth: none → Better Auth (Google/GitHub/Microsoft).

### Fixed
- —

### Removed
- —

---

## Pre-V3

For `2.0.4` and earlier see `docs/archive/v2/CHANGELOG-v2.md`.
