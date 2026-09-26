# Changelog — ElectraSim V3

All notable changes to the V3 rewrite (Bun + 100% Cloudflare Workers) are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/).

> **Archive:** V2 history through `2.0.4` is at `docs/archive/v2/CHANGELOG-v2.md`.

## [Unreleased]

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
