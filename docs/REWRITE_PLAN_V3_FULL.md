# ElectraSim V3 — Full Rewrite Plan (From Line 1) — The Real V3

**Version:** 3.0.0-DRAFT — revised 2026-09-26 (supersedes `REWRITE_PLAN_V4_FULL.md`)

**Status:** `PLANNING` — membership scope confirmed; implementation pending
**Runtime:** **Bun** everywhere · **Platform:** **100% Cloudflare Workers** (no external DB/compute)  
**Previous state:** Paper plan only — no v3 code shipped. This *is* v3, built live on `electrasim.com`.  
**Target:** React 19 + Hono on Workers + Better Auth + **D1 (SQLite)** + R2 + KV + Durable Objects + Matter.js + Tailwind v4

> **Prime directive:** `NO THING IS HARD CODED — EVERYTHING CAN BE CHANGED FROM ADMIN PANEL EXCEPT MANDATORY THINGS.`
> Mandatory = migrations, app-level authorization guards, API contracts, crypto webhook signature verification, electrical physics and code-owned standards (§32). Pricing, supported benefit configuration, XP, themes, templates and copy are data. Membership administration is super-admin-only; basic fault/diagnosis access is a protected public baseline (§9).

> **Clarification — "Circuit" (2026-09-25):** there are two circuits. **Lab Circuit** = the live electrical graph in the simulator (components + wires + `simulate()`) — the heart; **NOT deferred**. **Published Circuit** = a saved lab circuit shared to the social feed (`circuits.visibility='public'`, `/feed`, `/explore`, `/c/<id>`, fork chain) — **deferred** (ships with Community, Phase 2+, which naturally comes after the simulator can create it). Earlier misread is corrected here.

> **Local-only contract (2026-09-26):** the existing Cloudflare account serves the live website and must not be used by this rewrite. Its credentials were deleted locally. All development, databases and tests remain local; a new account will be configured after development. Remote operations then need explicit user authorization. This overrides older remote-cutover wording below; passing local gates is not deployment permission. See root `AGENTS.md` and `TRACKING.md`.

---

## Table of Contents

1. [What Changed Since Last Draft](#1-what-changed)
2. [Goals & Non-Goals](#2-goals)
3. [Architecture — 100% Cloudflare](#3-arch)
4. [Stack — Bun + Cloudflare-Native](#4-stack)
5. [Monorepo (Bun Workspaces)](#5-mono)
6. [D1 Data Model (SQLite) & Performance](#6-d1)
7. [Auth — Better Auth on D1 (Bun + Workers)](#7-auth)
8. [RBAC & Admin-Configurable Permissions](#8-rbac)
9. [Paid Membership — Super-Admin Managed](#9-paid-membership--super-admin-managed)
10. [Gamification — Demo + Fully Editable](#10-gami)
11. [LMS (Tenancy, Exams, Gradebook)](#11-lms)
12. [Dashboards — Personal vs LMS](#12-dash)
13. [Community — Why Not GitHub×Instagram, What Instead](#13-comm)
14. [Public Profiles](#14-profiles)
15. [Payments — NOWPayments + Binance Pay, Card Stub](#15-pay)
16. [Email — Provider-Agnostic (SMTP/Resend/SES)](#16-email)
17. [Content Studio — Mini CMS (Blog + Static Pages)](#17-cms)
18. [Simulator V3 — Enhanced UI, New Mechanics, Matter.js (Visual Only)](#18-sim)
19. [Wiring Games (≠ Simulator)](#19-games)
20. [Procedural Engine — Homepage / Games / Exams](#20-proc)
21. [Admin Panel — No Hardcoding](#21-admin)
22. [Design System — Electrical, Not Generic SaaS](#22-design)
23. [How We Actually Do UI/UX (Process, Not Slogans)](#23-uxprocess)
24. [Live-Site URL & SEO Preservation](#24-urls)
25. [Realtime, Jobs, Storage](#25-realtime)
26. [Certificates — Procedurally Generated](#26-certs)
27. [Moderation — On By Default](#27-mod)
28. [Phased Roadmap (Bun + Workers)](#28-roadmap)
29. [Resolved Decisions (Your Answers Applied)](#29-resolved)
30. [Astro Site in V3 — Redesign & Dynamic Behaviour](#30-astro)
31. [Localization (i18n) — International Site](#31-i18n)
32. [Electrical Standards — Global Immutable](#32-standards)
33. [D1 Performance — Parallel Reads/Writes, No Failures](#33-perf)
34. [Exhaust Inventory — Coupling Seams](#34-exhaust)
35. [Open Questions — Remaining](#35-open)

---

## 1. What Changed

| Before | Now |
|--------|-----|
| Node + npm + Postgres 17 (Neon) | **Bun** + **D1 SQLite** + R2/KV/DO/Queues — zero non-Cloudflare infra |
| Version label V4 | **V3** (paper plan never shipped — this is the real v3) |
| Redesign from existing UI | **Rebuild from line 1** — reference current `labGlassLight/Dark` + `editorBackground` tokens, but every screen redesigned with ample whitespace & electrical identity |
| Hard-coded pricing/levels | **Super-admin-managed paid plans and supported benefits in Phase 1**; achievements/XP remain admin-editable, online checkout and institution pricing in Phase 7 |
| Single pricing model | Institution pricing **configurable per plan**: `flat` (cap) or `perSeat` — switch without code |
| Card payments deferred | **Card = stub only** (Stripe not available) — hidden behind `feature_flags.cardPayments=OFF` |
| OAuth Google/GitHub/Discord | **Google + GitHub + Microsoft** (Microsoft for .edu) |
| Matter sag/collision as physics | **Matter.js = pure visual** — e.g. overloaded wire/component tears/shatters, cable sag — **never touches `simulate()`** |
| Exam strictness fixed | **Configurable per exam by instructor + institution defaults** |
| Moderation unspecified | **Moderation ON by default + `moderator` role** |
| Certificates PDF | **Procedurally generated** (Satori/Canvas → R2, verify token) |
| URL migration vague | **Live-site contract** — every existing `/`, `/app`, `/guide`, `/glossary`, `/toolbox`, `/compare`, `/blog/*` preserved with redirects + SEO parity |
| Admin granularity fixed | **Super admin configures who can do what** (permission matrix + custom roles) |

---

## 2. Goals

**Build:** identity, tenancy, entitlements, gamification, social, payments, procedural, admin, Matter visual, content studio — on **D1+R2+KV+DO** via **Bun**.

**Keep:** `domain/` electrical engine (pure, worker-safe) — extract to `packages/domain`. Brand tokens (`labGlassLight/Dark`, `editorBackground`, wire colors per `regulationStandard`, `high-contrast`/`deuteranopia`) — evolve, don't discard.

**Non-goals V3.0:** native apps (PWA only), SCORM export (CSV+API in V3.0, SCORM in V3.1), AI tutor proxy (Hono placeholder only).

---

## 3. Architecture — 100% Cloudflare

```
Browser (PWA, offline IndexedDB cache)
   │  HTTPS / WSS
   ▼
Cloudflare Workers (Hono)  ─── Serves everything: SSR/CSR via R2 static assets,
   │                          API (Hono), Better Auth handler, webhooks,
   │                          SSR for marketing/CMS/community/profile
   ├─ D1 (primary + read replicas via Sessions API) — source of truth
   ├─ R2 — circuits thumbnails, OG cards, exports, avatars, CMS images, cert PDFs
   ├─ KV — feature_flags, app_config cache (60s), rate-limit counters, sessions bookmark
   ├─ Durable Objects (SQLite storage) — presence, live feed, gradebook pushes, exam timer
   ├─ Queues — email, webhook retries, XP/leaderboard rollups, cert rendering
   └─ Workers Assets / CDN + Image Resizing

No external DB, no Hyperdrive, no Neon/Supabase, no Vercel. One `wrangler.jsonc` + `bun`.
```

**Source-of-truth rule:** D1. IndexedDB = L2 offline cache + offline queue (last-write-wins per `circuitId` with `updatedAt` vector). Share: new `https://electrasim.com/c/<id>` (DB-backed); legacy `#c=<gzip>` fragment still decodes client-side and offers "Save to cloud".

---

## 4. Stack — Bun + Cloudflare-Native

| Layer | Choice | Notes |
|-------|--------|-------|
| Runtime / PM / Test / Bundler | **Bun 1.2.x** | `bun install` (30× npm), `bun run`, `bun test` (Jest-compat), `bun build` (native bundler). No `npm`/`pnpm`. |
| Framework | **Hono 4.x on Workers** + **React 19** (Vite 6 or Workers Assets — no Next.js) | Next.js assumes Node; Hono+Workers is the Cloudflare-native path. React still for app/marketing/admin (Vite build → Worker Assets). Keeps migration from V3's Vite simple. |
| Language | TS 5.8 strict | `exactOptionalPropertyTypes:false`, `noUnusedLocals/Params` |
| Auth | **Better Auth** + `@better-auth/drizzle-adapter` | `provider:"sqlite"` for D1, `crossSubDomainCookies`, `organization` plugin for institutions |
| ORM | **Drizzle ORM (D1/SQLite)** | `drizzle-orm/d1`, `drizzle-kit` via `bun x drizzle-kit` |
| DB | **D1 (SQLite)** | Primary + auto read replicas, Sessions API, Time Travel (30 days), `FTS5` for search, `JSON1` for `jsonb`-like columns |
| Storage | **R2** (zero egress) + **KV** + **Durable Objects** | See §25 |
| Client state | Zustand 5 + Immer + zundo (scope: canvas/viewport only) | Keep proven pattern |
| Server state | TanStack Query 5 | Cache/invalidation/optimistic |
| Styling | **Tailwind v4** + **shadcn/ui + Radix** | Brand theme rebuilt with electrical identity (§22) |
| Canvas | SVG (retain, a11y) + **Matter.js 0.20.x** visual layer | Never influences `simulate()` |
| Email | **Provider-agnostic interface** → Resend / SES (SMTP) / generic SMTP | Admin picks provider per environment |
| Payments | **NOWPayments + Binance Pay** | Card stub |
| Tooling | **Biome 1.9.4**, `lefthook`, Playwright, Vitest via `bun test` | All via `bun` |
| Deploy | `wrangler` 4.x | `bun x wrangler d1 create/migrate/deploy` |

**Better Auth on Workers requires:**

```toml
# wrangler.toml / wrangler.jsonc
compatibility_flags = ["nodejs_compat"] # for AsyncLocalStorage
compatibility_date = "2024-09-23"
```

**All scripts use Bun:**

```json
{
  "scripts": {
    "dev": "bun x wrangler dev",
    "build": "bun x vite build && bun x wrangler deploy",
    "test": "bun test",
    "lint": "bun x biome lint .",
    "db:generate": "bun x drizzle-kit generate",
    "db:migrate": "bun x wrangler d1 migrations apply electrasim --remote"
  },
  "packageManager": "bun"
}
```

---

## 5. Monorepo (Bun Workspaces)

```
electrasim-v3/                    # this repo becomes real v3 (no new repo needed)
├── apps/
│   └── web/                      # Hono Worker + React SPA + marketing/admin
│       ├── src/
│       │   ├── worker.ts         # Hono app — auth handler, API, SSR, assets
│       │   ├── app/              # React routes: (marketing)/(app)/(lms)/(community)/(admin)
│       │   ├── components/       # shadcn + canvas
│       │   └── lib/              # auth-client (better-auth/react), query client
│       ├── wrangler.jsonc
│       └── vite.config.ts        # base:/app/, PWA, stats
├── packages/
│   ├── domain/                   # extracted src/domain — pure, no React/DOM, worker-safe
│   ├── procedural-engine/        # seeded PRNG + generators
│   ├── ui/                       # shadcn primitives + theme tokens
│   ├── db/                       # Drizzle D1 schema + migrations + seeds
│   ├── config/                   # zod schemas for all admin-editable config
│   └── email/                    # provider-agnostic email abstraction
├── migrations/                   # D1 migrations (wrangler d1 migrations)
├── scripts/                      # probes, postbuild, benchmarks
├── e2e/                          # Playwright
└── package.json                  # bun workspaces
```

Import rule: `apps/web` may import `packages/*`; `packages/domain` imports nothing from `apps/*`.

---

## 6. D1 Data Model (SQLite) & Performance

D1 = SQLite semantics (`TEXT` PKs, `INTEGER` timestamps, `JSON` via `JSON1`, `FTS5` for search). `provider:"sqlite"` in Drizzle. Time Travel = point-in-time restore (30 days) via `wrangler d1 time-travel`.

### Performance posture (no glitches)

- **Read replication (Sessions API)** — enabled in dashboard (`read_replication.mode=auto`). All read-heavy routes use `env.DB.withSession(bookmark)`; write routes (`first-primary`) for mutations; bookmark returned in `x-d1-bookmark` header for sequential consistency (monotonic reads, read-your-writes). Free — replicas in ENAM/WNAM/WEUR/EEUR/APAC/OC.
- **Indexes:** `CREATE INDEX ON circuits(ownerId, updatedAt)`, `FTS5` virtual table `circuits_fts(title, description, tags)`, `KV` cache for `app_config`/`feature_flags` (read-heavy config).
- **Batch:** Use `D1.batch()` for multi-statement transactions (e.g., create circuit + xp_event + notification = one round trip).
- **Limits:** 10 GB per DB, 100k row-read per query soft limit — paginate gradebook/feed, avoid `SELECT *` on `circuits_fts`.
- **Migrations:** `bun x wrangler d1 migrations create electrasim <msg>` + `apply --local/--remote`. `d1 info/insights` for size/slow-query.

### Schema (SQLite/Drizzle)

```ts
// packages/db/schema.ts — Drizzle SQLite tables (excerpt)
// Better Auth tables: user, session, account, verification, organization, member, invitation
// generated via: bun x auth@latest generate  →  drizzle schema

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUIDv7
  handle: text("handle").notNull().unique(),
  displayName: text("displayName"),
  avatarUrl: text("avatarUrl"),
  bio: text("bio"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  globalRole: text("globalRole", { enum: ["super_admin","admin","moderator","individual"] }).notNull().default("individual"),
  settingsJson: text("settingsJson", { mode: "json" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const circuits = sqliteTable("circuits", {
  id: text("id").primaryKey(),
  ownerId: text("ownerId").notNull().references(() => users.id),
  orgId: text("orgId"), // nullable — LMS-linked
  title: text("title").notNull(),
  description: text("description"),
  visibility: text("visibility", { enum: ["private","org","public"] }).notNull().default("private"),
  circuitJson: text("circuitJson", { mode: "json" }).notNull(), // JSON1
  thumbnailUrl: text("thumbnailUrl"), // R2
  forkedFromId: text("forkedFromId"),
  tags: text("tags", { mode: "json" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});
// + circuit_versions, components_catalog (isPro, defJson, graphicsUrl R2, matterBodyJson),
//   electrical_standards (cableAmpacityTable JSON, versioned),
//   institutions/courses/classes/enrollments/assignments/submissions/grades/attendance/certificates,
//   levels/badges/user_badges/xp_events/streaks/quests/user_quests,
//   posts/comments/reactions/follows/collections/notifications/reports,
//   procedural_templates/procedural_seeds,
//   payments/webhook_events,
//   content_pages/content_posts (CMS),
//   app_config/feature_flags/audit_logs

export const circuitsFts = sqliteTable("circuits_fts", { /* FTS5 virtual */ });

// RLS has no native D1 equivalent — enforce app-level via Hono middleware `requirePermission()`
// + per-query WHERE clauses (ownerId/orgId checks) + DO for sensitive realtime.
```

Full schema lives in `packages/db/schema.ts` + `migrations/0000_*.sql` — all generated via Drizzle + Better Auth CLI.

---

## 7. Auth — Better Auth on D1 (Bun + Workers)

```ts
// packages/db/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { organization } from "better-auth/plugins/organization";
import { db } from "./drizzle"; // drizzle(env.DB)

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", usePlural: true }),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  emailVerification: { sendOnSignUp: true },
  socialProviders: {
    google:   { clientId: process.env.GOOGLE_ID!, clientSecret: process.env.GOOGLE_SECRET! },
    github:   { clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! },
    microsoft:{ clientId: process.env.MICROSOFT_ID!, clientSecret: process.env.MICROSOFT_SECRET! },
  },
  plugins: [organization({ allowUserToCreateOrganization: true, organizationLimit: 3 })],
  session: { expiresIn: 60*60*24*7, updateAge: 60*60*24 },
  advanced: { database: { joins: true }, generateId: () => crypto.randomUUID() },
});
```

```ts
// apps/web/src/worker.ts — Hono mount
import { Hono } from "hono";
import { auth } from "@electrasim/db/auth";
const app = new Hono<{ Bindings: Env }>();
app.on(["POST","GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
```

Client: `createAuthClient` from `better-auth/react` (`apps/web/src/lib/auth-client.ts`). Middleware: Hono `auth.middleware` + custom RBAC guard per route group. Sessions = `session` table (httpOnly, SameSite Lax) + bookmark header for D1 Sessions API.

**Guest mode:** Unauthenticated = full basic sim via IndexedDB. On signup `POST /api/migrate/guest` validates & bulk-inserts via `D1.batch()`.

---

## 8. RBAC & Admin-Configurable Permissions

### Roles

| Role | Scope |
|------|-------|
| `super_admin` | global — owns permission matrix, can create custom roles, impersonate, billing |
| `admin` | global — moderation, content studio, support |
| `moderator` | global — community queue (enabled by default) |
| `institution_admin` | organization (owner) |
| `instructor` | org → course/class |
| `student` | org → class |
| `individual` | global (no org) |
| `guest` | none |

Two stores: `user.globalRole` (platform) + `member.role` per `organizationId` (`owner|admin|instructor|student`). Effective = union; Hono middleware checks both + `app_config.permissions` matrix.

### Super-admin configures granularity

In `/admin/permissions` the super admin edits a live permission matrix (zod in `packages/config/permissions.ts` as fallback, DB `app_config.permissions` as override):

```json
{
  "roles": [
    { "id": "lab_assistant", "inherits": "student", "grants": ["circuit:fork","post:create"] }
  ],
  "permissions": {
    "components_catalog:write": ["super_admin"],
    "lms:grade": ["instructor","institution_admin"],
    "community:moderate": ["moderator","admin","super_admin"]
  }
}
```

Custom roles are allowed — new LMS role or community role without deploy. All changes write `audit_logs` + invalidate KV cache.

### Enforcement (no native RLS on D1)

Triple gate: **Hono middleware** (route) + **query WHERE** (row) + **handler `requirePermission(session, 'circuit:publish')`** (action). Every API handler uses it; Durable Object rooms re-check on WebSocket upgrade.

---

## 9. Paid Membership — Super-Admin Managed

**Confirmed 2026-09-26:** manual paid memberships in Phase 1; online checkout in Phase 7. Implementation detail and acceptance gates: [Paid Membership Plan](./plans/PAID_MEMBERSHIP_PLAN.md), sequenced in [Phase 1](./phases/phase-1-simulator-core.md).

| Capability | Guest / free account | Active paid member |
|------------|----------------------|--------------------|
| Basic simulator/components, single basic fault exercise, basic diagnosis | Available, including guests | Available |
| Basic safety findings, including multiple naturally occurring wiring mistakes | Available | Available |
| Existing Pro components | Preview only | Available |
| Advanced fault mode / multiple deliberate injected faults | Preview only | Available |
| Advanced diagnostic mode / Ohmageddon | Preview only | Available |
| Additional benefits | Existing free access preserved | Configurable framework only; no additional benefit enabled yet |

`pro_components`, `advanced_faults` and `advanced_diagnostics` are the initial paid capabilities. Membership is independent of global/organization roles. Basic capabilities cannot be removed through paid-plan configuration; billing does not change electrical truth.

**Data:** `plans`, `pro_features`, normalized `plan_features`, `entitlements`, `audit_logs`. This replaces the earlier draft `plans.featuresJson` mapping. A manual entitlement records user, plan, source, status, validity dates, actor, reason and version. Resolve access from active grants whose validity includes the current time, not from client `appMode`. Multiple valid grants contribute their capability union.

**Super admin only:** `/admin/pro` and its membership management APIs create/edit/delete plans, configure supported benefits and grant/edit/extend/suspend/revoke memberships for any individual account. Normal admins, instructors and organization owners cannot perform these operations. Add a trusted global role and controlled first-super-admin bootstrap; signup/profile input cannot grant that role. These guards cannot be broadened by the generic permission matrix.

Deletion of an assignment revokes access and preserves audit history. Archive referenced plans/benefits; hard-delete only unused drafts. Archive stops new assignments without deleting valid grants. Plan capability edits affect existing grants on their next check, with affected-member counts shown; price/default-duration edits affect future grants. Dates on existing grants change only through explicit membership edits.

**Enforcement:** one policy for palette/actions, imports/templates/paste, fault injection, diagnosis start/resume/shared seeds and server save/simulation/submission. Recompute requirements from canonical content; reject forged client capabilities. Fresh primary D1 authorization observes revocation on the next protected request. Preserve existing premium circuits/scenarios read-only on downgrade, with raw backup and an explicit basic-copy path. Basic offline use continues; Phase 1 premium operations require online validation. Downloaded browser code is not tamper-proof licensing.

Benefits must map to implemented, validated handler keys. Super admin can add/configure supported benefits and marketing text, but a DB row cannot implement a new simulator feature. No new quota/export restriction, trial or commercial price is assumed. Electrical rules and the free basic-diagnostic baseline stay code-owned.

Phase 7 adds NOWPayments/Binance Pay events and provider-origin grants, retaining manual membership support and keeping manual grants independent of refunds/provider reconciliation. Institution seats/pricing are handled there; organization membership alone does not grant paid access. Card remains a disabled stub.

---

## 10. Gamification — Demo + Fully Editable

### Demo seeded set (admin can delete/edit/add)

Levels 1–100 curve `xp = 100 * L^1.6` (stored in `app_config.levelCurve`, zod validated). Demo badges/quests:

| Badges (demo) | Quests (demo) |
|---------------|---------------|
| `first-spark` (first circuit), `short-circuit-survivor`, `rcd-saviour`, `30-day-streak`, `helpful-sparky`, `topology-ninja`, `exam-ace`, `fork-master` | `wire-up-3` (wire 3 circuits), `help-5` (5 upvoted comments), `streak-7` |

### Tables (all admin-editable via `/admin/gamification`)

- `levels { level PK, title, xpRequired, rewardsJson }` — reorder/curve editable
- `badges { slug PK, name, iconUrl R2, criteriaJson }` — criteria e.g. `{"type":"streak","days":30}`
- `quests { id PK, title, criteriaJson, xpReward, activeFrom/To }`
- `xp_events`, `user_badges`, `streaks`, `user_quests`, leaderboards (materialized via Queue cron every 5m → KV cache)

**Anti-farm:** server validates `simulate()` before awarding; per-circuit hash dedup; KV rate-limit; capped community XP (3/day).

UI: level ring, XP bar, quest cards, badge cabinet, level-up modal (Matter confetti re-used).

---

## 11. LMS (Tenancy, Exams, Gradebook)

```
Institution (Better Auth organization)
 └── Courses
      └── Classes (inviteCode, term)
           └── Enrollments (student|instructor, pending|active|suspended)
                └── Assignments (practice|homework|exam, proceduralSeed, rubricJson)
                     └── Submissions (circuitId, auto-score + manual grade)
```

**Flow:** `Create Institution` → `institution_admin` → invite instructors (Better Auth `invitation`) → instructor creates Course/Class → invite students via code/CSV/bulk email → `enrollments` (auto-active or approval via `app_config.lms.autoApproveStudents`) → every LMS circuit carries `orgId/courseId`.

**Features V3.0 (all):** Roster (CSV+codes+domain allowlist+suspend/transfer), Courses, Lessons (MDX + embedded read-only/forkable circuit — reuses guide content), Assignments (starter circuit + procedural template per §20), **Exams** (timed, **strictness configurable per exam by instructor + institution defaults**: timer, lockdown/hints policy, attempts, window), Submission (fork → edit → submit → server `simulate()` + declarative validator auto-score), Grading (rubric/letter/manual override/history), **Gradebook** (spreadsheet view, weighted categories, CSV export, curve — scale in `app_config.lms`), Analytics (per-student progress/time/hints, per-class funnel, at-risk flag), Attendance, Certificates (see §26), Announcements, Discussions (scoped `posts`), Calendar, Files (R2).

---

## 12. Dashboards

**Personal (`/dashboard`)** — `individual` or post-signup: level ring, streak, quests, recent/forked circuits, recommended, badge shelf, soft pro upsell (locked features with preview), feed snippet.

**LMS**
- Student: classes, due countdown, overdue banner, grades sparkline, attendance, feedback inbox, `Open Lab` scoped to assignment.
- Instructor: at-risk, grading queue, gradebook, analytics charts, exam variant audit (which seed per student).
- Institution admin: members, billing/seats, settings, rollup.

Router checks `member` rows; if any active `enrollment` → LMS nav default, else personal. Toggle if both (e.g., pro who is also student).

---

## 13. Community — Why Not GitHub×Instagram, What Instead

**Why the old metaphor was half-right, half-wrong:** GitHub's *fork/attribution/version graph* is perfect for circuits (circuit lineage matters). Instagram's *image-feed/likes* is wrong — circuits are **interactive schematics**, not photos; optimizing for likes drives pretty over correct. Electrical learners need **correctness + remixing**, not vanity metrics.

**V3 metaphor: "Circuit Library + Workshop" (GitHub × Behance × Stack Exchange)**

- **Library (Behance/ArtStation side):** `/explore` gallery of **live interactive previews** (not screenshots) with filters (zone, difficulty, components, standard UK/US/EU), FTS5 search, sort (recent, most-forked, top-rated). Hashtags from `tags` + auto-tag from components used. Collections (user-curated sets).
- **Workshop (GitHub + Stack Exchange side):** every public circuit (`visibility=public`) is **forkable** with attribution chain (`forkedFromId`), diff-friendly `circuitJson` versioning (`circuit_versions`), threaded comments with **accept-answer** for help threads, reactions (⚡ 💡 👏), follows, notifications. `visibility=org` for LMS (instructor can feature to public with consent). XP for quality contributions (capped).

This keeps GitHub's valuable part (fork graph) and replaces Instagram with a domain-appropriate gallery + Q&A — feels electrical, not generic social.

---

## 14. Public Profiles

`/u/[handle]` SSR + SEO (`Person` JSON-LD, `og:image` via Satori → R2). Avatar, level badge, stats (published, followers, XP, streak), tabs (Circuits/Collections/Liked/Activity), institution affiliation (name only — grades never public). Privacy controls: `profileVisibility`, `showInstitution`, `showLevel`, `allowFork`.

---

## 15. Payments

| Provider | V3.0 |
|----------|------|
| **NOWPayments** | Phase 7 — hosted invoice + IPN webhook |
| **Binance Pay** | Phase 7 — provider API + webhook |
| **Card** | 🚧 **Stub only** — hidden (`feature_flags.cardPayments=OFF`), shows "Card payments coming soon" if ever enabled |

Phase 7 webhooks `POST /api/webhooks/nowpayments|binance` verify signatures → `D1.batch()` upsert `payments` → `entitlements` → `audit_logs` → Queue retries. Institution billing supports **both models** per plan: `flat` (cap) or `perSeat` (admin flips without code; checkout math respects `pricingModel`).

---

## 16. Email — Provider-Agnostic

```ts
// packages/email/index.ts
export interface EmailProvider { send(opts: SendOpts): Promise<{ id: string }>; }
export class ResendProvider implements EmailProvider { /* ... */ }
export class SesSmtpProvider implements EmailProvider { /* nodemailer via SMTP to SES */ }
export class GenericSmtpProvider implements EmailProvider { /* any SMTP */ }

export function getEmailProvider(env: Env): EmailProvider {
  switch (env.EMAIL_PROVIDER) { // set in wrangler.jsonc / admin app_config.email
    case "resend": return new ResendProvider(env.RESEND_KEY);
    case "ses":    return new SesSmtpProvider(env.SES_SMTP_URL);
    default:       return new GenericSmtpProvider(env.SMTP_URL);
  }
}
```

Admin (`/admin/email`) picks provider and edits templates (verify, invite, announcement digest) — provider keys stay in `env`/`wrangler secrets`, not D1. Queue handles sends + retries. Better Auth `sendVerificationEmail`/`sendInvitationEmail` delegate to this interface.

---

## 17. Content Studio — Mini CMS

Anyone authenticated can **write**; publishing requires **approval**.

- **Tables:** `content_pages { slug PK, title, body MDX, status draft|pending|approved|rejected, authorId, reviewerId, coverUrl R2, seoJson, publishedAt }`, `content_posts` (blog), `content_revisions`.
- **Roles:** `writer` (any authed user) → submits → `editor|admin|super_admin` approves → publishes. RLS-equivalent checks per `requirePermission('content:approve')`.
- **Editor:** MDX with live preview, embedded circuit (`<CircuitEmbed id="...">`), image upload → R2, SEO fields (title/description/OG, `Article`/`BreadcrumbList` JSON-LD).
- **Public routes:** `/blog`, `/blog/[slug]`, `/[slug]` for static pages — SSR via Worker, same SEO pipeline as legacy Astro site (keep OG PNG-8 generation via Satori → R2).
- **Moderation:** auto queue, `reports` for published content, revision history, scheduled publish (`Queue` alarm).

---

## 18. Simulator V3 — Enhanced UI, New Mechanics, Matter.js (Visual Only)

### Enhanced UI (same brand theme, not generic SaaS)

- **Theme evolution:** keep `labGlassLight/Dark`, `editorBackground`/`editorBackgroundDark`, regional `wireColors` per `regulationStandard`, `high-contrast`/`deuteranopia` presets. Add CSS variables so admin-addable themes (e.g., `blueprint`, `din-rail`) can ship without deploy. All via `app_config.themes`.
- **Layout:** resizable panels (palette left, canvas center, inspector right, log bottom) — per-user in `users.settingsJson`.
- **Palette:** search, favorites, recent 6, zone tabs, drag preview with Matter ghost.
- **Inspector v2:** tabs (Properties | Wiring | Simulation | Analytics) + live `wireCalculations`/`componentCalculations` telemetry + quick-fix chips.
- **Command palette** `⌘K`, minimap, alignment bar — kept.

### Electrical identity (not AI slop)

See §22.

### Matter.js — visual only, never electrical

`simulate()` stays pure graph traversal (BFS per rail) in `packages/domain` — Matter never touches it. Matter runs in `rAF`, throttled >150 bodies (sleep offscreen):

| Visual | How |
|--------|-----|
| **Overload tear** | When `simulate()` reports `bustedWires`/`isBlown`/`overloadedWires`, Matter fractures the SVG group into shards (bodies) with impulse — wire "tears", component "pops" |
| Cable sag | Bezier wires as `Constraint` with `stiffness/damping` — toggle `Physics: on/off` |
| Collision/snap | Components as `100×70` bodies; `MouseConstraint` drag; `Query` for overlap |
| Confetti | Level-up reuse |

### New Mechanics

1. AC phasor view, 2. Thermal heat-map overlay, 3. Fault injection/diagnosis lab (basic for everyone; advanced for paid members per §9; currently 14 `FaultType`s), 4. Draggable multi-meter probe, 5. Time-domain `simulateAtTime(t)` for timers/contactors, 6. Export bundle (PDF schematic + BoM + modeled-check report). Additional mechanics are not automatically promised membership benefits; each needs implementation and an explicit benefit decision.

### Pro gating

Seed `components_catalog.isPro` from existing component tiers. Show premium previews/locks; authorize actual component use, advanced faults and advanced diagnosis through §9 capabilities. The API independently validates save/simulation/submission requests. Basic fault detection/diagnosis remains free, and downgrade preserves original premium documents read-only.

---

## 19. Wiring Games

Simulator = free-form lab. Games = guided puzzles (same `domain` + `procedural-engine`).

Types: Wire-Up, Fault Hunt, Speed Wire, Load Balancer, Compliance Check — each a `procedural_templates` row. Daily + infinite practice, XP, leaderboard. LMS can assign as homework (`assignments.proceduralSeed`). UI: `/games/[slug]` full-screen HUD (timer/moves/hints/objectives) reusing `CircuitCanvas`.

---

## 20. Procedural Engine

```ts
// packages/procedural-engine/index.ts — deterministic PRNG (mulberry32)
export function createRng(seed: string): () => number;
export function generateCircuit(t: ProceduralTemplate, seed: string): Circuit;
export function generateExamVariants(tid: string, studentIds: string[]): Map<userId, Circuit>;
```

- Homepage: `seed = date + session` — different hero circuit per visit (SSR, seed in URL for share).
- Games: `seed = dailySeed` (Queue cron at UTC midnight) + `userId` salt for practice.
- Exams: `seed = HMAC(courseId+assignmentId+userId+secret)` — same difficulty, different circuit per student. Stored in `procedural_seeds` for audit/replay. Plagiarism via graph edit distance.
- Admin: `procedural_templates.generatorConfig` JSON (zod) — e.g. `{ zones:["lighting"], maxComponents:8, mustInclude:["mcb"] }` — no deploy.

---

## 21. Admin Panel

`/admin/*` — `super_admin`/`admin` where authorized; `/admin/pro` and all membership mutation APIs are **super-admin-only**. Public display config may use KV caching; authorization must use fresh primary D1 data (§9). Electrical standards remain read-only (§32).

| Domain | Admin Action | Stored |
|--------|-------------|--------|
| Components | add/edit/disable, set `isPro`, upload SVG → R2, Matter body | `components_catalog` |
| Electrical standards | Read-only viewer; changes through code review + migration + release | `electrical_standards` projection |
| Paid memberships | Super admin: plan/benefit CRUD, assign/edit/extend/suspend/revoke members and view audit (Phase 1); checkout/seat billing in Phase 7 | `plans`, `pro_features`, `plan_features`, `entitlements`, `audit_logs` |
| Gamification | add/edit/delete levels/badges/quests, curve, criteria | `levels`, `badges`, `quests`, `app_config.levelCurve` |
| Procedural | templates, difficulty, zones | `procedural_templates` |
| Content studio | approve/reject pages/posts, SEO | `content_pages/posts` |
| Permissions | create custom roles, edit matrix | `app_config.permissions` |
| Feature flags | toggle, rollout %, allowlist | `feature_flags` (KV) |
| Themes/homepage/LMS/community | CSS vars, layout, scales, thresholds | `app_config.*` |
| Payments/email | provider pick, webhook status (keys in `env`) | `app_config.*` + `env` |

Mandatory only: migrations, app-level guards, contracts, webhook sig, traversal.

---

## 22. Design System — Electrical, Not Generic SaaS

**Keep brand tokens, amplify electrical character.**

### What we keep (enhanced)

- `labGlassLight/Dark` (frosted `rgba(255,255,255,0.92)` / `rgba(30,41,59,0.92)`, `rounded:10`, `wire` live `#ef4444`/neutral `#3b82f6`/earth `#10b981`, `wireWidth:2.25`) + `editorBackground` radial gradients + `Inter` + `JetBrains Mono`. These become **CSS variables** so admin themes can extend without code.
- Regional wire colors via `regulationStandard`, `high-contrast`/`deuteranopia` — add admin-addable presets (`blueprint`, `din-rail-warm`).

### What changes — electrical-native, whitespace-first

- **Blueprint lineage:** page grids echo DIN rail / schematic sheet: faint grid (`gridDot` `#e2e8f0/#334155`, `gridSize 24`), hairline rules, terminal ticks, not SaaS card soup. Marketing hero = isometric distribution board line art (like `CableSizeScene`) over `editorBackground`.
- **Ample whitespace:** generous gutters (32–48px section padding), single primary action per view, secondary in `…`. Palette/inspector use **glass + border**, not solid cards.
- **Hardware palette, not AI gradient:** base is cool neutrals (`#fafbfc → #f1f5f9` light, `#0f172a → #1e293b` dark) + **live red / neutral blue / earth green** as *functional* accents (status only). No purple-pink SaaS gradient. Pro badge = brass/amber, not neon.
- **Typography hierarchy:** display for hero (numbers like `230V`, `30A`), `Inter` for UI, `JetBrains Mono` for telemetry (`wireCalculations`). Large line-height (1.6) for readability.
- **Tactile cues:** terminal dots, wire joint caps, screw heads on components (SVG detail), Matter tear on overload — feels like lab bench, not dashboard.

### Token sketch (admin-editable)

```css
:root {
  --lab-bg: radial-gradient(...), linear-gradient(180deg,#fafbfc 0%,#f1f5f9 100%);
  --lab-grid: #e2e8f0; --lab-surface: rgba(255,255,255,0.92);
  --wire-live:#ef4444; --wire-neutral:#3b82f6; --wire-earth:#10b981;
  --text:#0f172a; --subtext:#94a3b8; --accent:#2563eb;
  --radius:10px; --wire-width:2.25px;
}
```

---

## 23. How We Actually Do UI/UX (Process, Not Slogans)

**We don't "redesign screens" — we run a lab, measure, then build.**

1. **Audit (Week 0).** Inventory every V3 screen + token (`theme.ts`, `CircuitCanvas`, `Inspector`, `Palette`, `Tour`) — screenshot + prop-table. Log whitespace, tap-target, contrast, and "SaaS tells" (generic cards, AI gradients) vs "electrical tells" (terminals, rails, schematics).

2. **Field research (Week 0–1).** 5 user interviews (student, instructor, hobbyist, pro sparky) + 3 competitive teardowns (electrical trainers, not SaaS). Deliverable: job map (wire → simulate → diagnose → submit → get feedback).

3. **Brand stretch (Week 1).** Moodboard constrained to **electrical world**: blueprint paper, DIN rail, multimeter LCD, warning amber, workshop bench. No Dribbble SaaS. Define 2 theme directions (e.g., `labGlass` evolution + `blueprint` alt), pick one with you.

4. **Tokens → primitives (Week 1–2).** Build `packages/ui` primitives (Button, Card(glass), Tabs, Dialog, Command) with the CSS variables above. Storybook-ish preview inside Worker (`/ui-preview`) — verify light/dark/high-contrast/deuteranopia in one sweep.

5. **Lo-fi flows (Week 2).** Figma wireframes at **actual breakpoints** (360, 768, 1280) for: marketing → `Open Lab` (guest) → save → community publish → LMS assignment submit → gradebook. No hi-fi until flows pass "can a new student finish an exam without help?".

6. **Hi-fi + prototype (Week 3).** One vertical slice (canvas + palette + inspector + Matter tear) built in code, not Figma prototype. Measure: time-to-first-wire (<5s), palette search (<2 keystrokes), inspector tab switch (<100ms).

7. **Usability lab (Week 3–4, repeat).** 5× moderated tests per milestone, same tasks, SUS + task-time. Fix or cut — no polishing a failing flow.

8. **Systemize.** Every new screen must use tokens/primitives; custom CSS is a PR flag. Admin theme editor previews live (no deploy).

This is how we avoid generic SaaS / AI slop: constrain the palette to the bench, measure whitespace with a ruler, and test with sparkys, not designers.

---

## 24. Live-Site URL & SEO Preservation

`electrasim.com` is live — **no URL breaks.**

| Existing | V3 |
|----------|----|
| `/` | kept, SSR via Worker, same OG/JSON-LD (`SoftwareApplication`), procedural hero variant |
| `/app` (V3 SPA at `base:/app/`) | kept → same path, now authed (guest still works). `?template=` handled via Hono route, `history.replaceState` preserved |
| `/guide`, `/glossary`, `/toolbox`, `/compare` | kept — content migrated into Content Studio (`content_pages`) with same slugs, 1:1 hotspot `data-point-p{x,y}` preserved |
| `/blog`, `/blog/[slug]` | kept — migrated to `content_posts`, `Article` + `BreadcrumbList` JSON-LD, OG PNG-8 via R2 |
| `/#c=<gzip>` share fragment | kept forever (decode client-side → "Save to cloud?") + new canonical `/c/<id>` |
| `/_headers` (CSP `payment=()`, `Cache-Control no-transform`, `?v=` hash) | kept + extended for Worker assets, `Permissions-Policy` still strict |
| Sitemap/robots/canonical | `GET /sitemap.xml`, `robots.txt` via Worker, 301 map for any retired marketing query params |

Build: `bun run build` → Vite emits to `dist/` → Worker serves as static assets (no separate Astro merge + `postbuild.mjs`).

---

## 25. Realtime, Jobs, Storage (All Cloudflare)

- **Realtime:** **Durable Objects (SQLite storage)** + WebSocket Hibernation. Rooms: `presence:classId`, `feed:global`, `circuit:<id>` (future cursor). Alarms for exam countdown auto-submit.
- **Jobs:** **Queues** (email, `webhook_events` retry, XP rollup, leaderboard mat-view → KV, cert render, procedural daily seed rotation). `pg_cron` equivalent = Queue consumer + DO Alarms + Workers Cron Triggers.
- **Storage:** **R2** (circuits, avatars, CMS images, cert PDFs, OG cards), **KV** (config/feature flags/bookmarks/rate-limit), **D1** (truth), **DO SQLite** (ephemeral room state).

---

## 26. Certificates — Procedurally Generated

On course completion (threshold in `app_config.lms.certificateThreshold`), Worker renders PDF via **Satori + resvg/pdf-lib** (pure Workers, no external service) using template in `app_config.lms.certificateTemplate` (institution logo, signatures, layout). Stored to **R2**, row in `certificates { verifyToken }`, public verify at `/verify/[token]`. Regeneration is idempotent.

---

## 27. Moderation — On By Default

- `moderator` role (global) + `admin`/`super_admin` triage. Reports → `reports { reason, status }` → queue. Auto-hide at configurable threshold (`app_config.community.autoHideReports`), banned-words list admin-editable.
- Content Studio posts pending until approved; community posts/circuits can be **pre- or post-moderated per institution** (toggle in `app_config.community.moderationMode`).
- All actions audited.

---

## 28. Phased Roadmap (Bun + Workers) — Original 22-Week Estimate

The added Phase 1 membership/admin scope requires re-estimation after inventory. The detailed [Phase 1 sequence](./phases/phase-1-simulator-core.md) overrides the earlier 1.0–1.7 breakdown; all Phase 1 gates remain local.

| Phase | Weeks | Scope | Exit |
|-------|-------|-------|------|
| **0 — Foundation** | 1–2 | Bun workspaces + Hono Worker + Vite+Assets, D1 + Drizzle + Better Auth (sqlite) + Google/GitHub/Microsoft OAuth, KV+DO+Queues+R2 bindings, `packages/domain` extraction, `app_config`/`feature_flags` + admin shell, `nodejs_compat` | `bun run dev` serves营销+app, auth works, RBAC gates `/admin`, domain tests via `bun test` |
| **1 — Simulator Core + Manual Memberships** | Re-estimate after inventory | Standards corrections, domain extraction, SVG + visual-only Matter, state/persistence, trusted roles, super-admin plan/benefit/member CRUD, server-checked Pro components and advanced faults/diagnosis; basic modes free | Local simulator/performance gates plus real Wrangler/D1 grant → unlock → edit/revoke flow, free guest diagnosis, expiry/import/restore coverage |
| **2 — Community (Published Circuit deferred until here)** | 6–8 | **Published Circuit** sharing deferred until simulator can create it — `circuits.visibility='public'`, `/feed` `/explore` `/c/[circuitId]`, `follows`/`reactions`/`comments`/`collections`, FTS5, `/u/[handle]` SSR+OG, DO live feed, notifications (Queue+email) | Publish/fork/comment/follow live |
| **3 — Gamification** | 9–10 | `levels`/`badges`/`quests`/`xp_events`/`streaks`, demo seeds, leaderboards (Queue→KV), level-up UI, admin CRUD for all | XP server-validated, curve editable live |
| **4 — Procedural Engine** | 11–12 | `packages/procedural-engine` (mulberry32), `procedural_templates/seeds`, homepage variant (live mini-sim circuit per visit), game generators, exam `HMAC` variants — now has real lab circuits to generate | Homepage differs per visit, variant audit works |
| **5 — Wiring Games + Content Studio** | 13–15 | `/games/*` (Wire-Up, Fault Hunt, Speed Wire, etc. — all need circuit) + Content Studio mini-CMS (blog+static, approval), both depend on simulator | Games playable, CMS publish flow live |
| **6 — LMS** | 16–18 | Better Auth org → institutions, courses/classes/enrollments, assignments/submissions (starter circuit + procedural exam), gradebook, analytics, attendance, certs, provider-agnostic email invites, **scoped lab** (assignment-preloaded simulator) | Institution signup → gradebook end-to-end |
| **7 — Payments + Pro Polish** | Original 19–20; re-estimate | NOWPayments+Binance Pay checkout/webhooks and card stub (`OFF`), provider grants using Phase 1 memberships, institution pricing/seats, later artwork/overlays/export work | Verified payment → entitlement; idempotent refund/reconciliation preserves manual grants; benefit claims match implemented features |
| **8 — Hardening & Live Cutover** | 21–22 | Guest migration `POST /api/migrate/guest`, URL compat (legacy fragment + `/c/<id>` + marketing slugs), PWA offline queue, perf budgets (150kB gzip, simulate <5ms, Matter throttle), Playwright RBAC/LMS/payments (all vs `wrangler dev --local`), CSP, SEO parity, Time Travel backup drill → **only then** `--remote` deploy | `bun run verify` + `e2e:production` (via `wrangler dev --local`) green, then remote cutover with 301s |

Post-V3.1: SCORM/xAPI, collaborative cursors, vector search (Vectorize), Workers AI tutor proxy.

> **Local-first rule (all phases):** nothing is marked done until it passes `bun x wrangler dev --local --persist-to .wrangler/state` + `d1 migrations apply --local` + Playwright vs local preview. Remote (`--remote` / `wrangler deploy`) only after local gates.

---

## 29. Resolved Decisions (Your Answers Applied)

1. **Bun** — everywhere (`bun install/run/test/build/x`). Workspaces + Turborepo optional, no npm.
2. **DB = D1 (SQLite) 100% Cloudflare** — Postgres dropped; Drizzle `sqlite` + Sessions API + FTS5 + JSON1. No Hyperdrive.
3. **v3 is real v3** — paper plan discarded; live URLs preserved (§24).
4. **Redesign from scratch, same brand** — tokens kept and deepened (§22), not generic SaaS. Ample whitespace via 32–48px gutters + blueprint grid.
5. **Email provider-agnostic** — Resend/SES/SMTP switchable via `EMAIL_PROVIDER` + admin templates (§16).
6. **Pro benefits admin-editable** — `pro_features` + `plans` CRUD; institution `flat` vs `perSeat` configurable (§9).
7. **Achievements/gamification admin CRUD** — demo seeded, all editable (§10).
8. **Content Studio** — anyone can write, approval-gated mini CMS for blog + static pages (§17).
9. **Card stub only** — Stripe out; `cardPayments=OFF`.
10. **OAuth = Google + GitHub + Microsoft.**
11. **Matter = visual only** — overload tear etc., never electrical (§18).
12. **Exam strictness = instructor + institution defaults** (§11).
13. **Moderation ON + moderator role** (§27).
14. **Certificates procedurally generated** → R2 (§26).
15. **Admin granularity = super_admin configures matrix + custom roles** (§8).
16. **Circuits metaphor → Library + Workshop** (not GitHub×Instagram) — fork graph kept, Instagram replaced with electrical-native gallery + Q&A (§13).
17. **Design process = audit → research → tokens → flows → hi-fi slice → usability lab → systemize** (§23).

---

### Next Step

Say **“lock V3 and scaffold Phase 0”** and I’ll:
1. Convert this into `TRACKING.md` tasks + close `REWRITE_PLAN_V4_FULL.md` as superseded.
2. Scaffold `bun` workspaces + Hono Worker + D1 (`wrangler d1 create electrasim`) + Drizzle + Better Auth (`bun x auth@latest generate`) in one pass.

If you want **Vite+Workers Assets** vs **OpenNext/Cloudflare** for React SSR, call it now — it changes `apps/web` in Phase 0.

---

## 30. Astro Site in V3 — Redesign & Dynamic Behaviour

### TL;DR

Astro **is redesigned** (brand tokens + layout rebuilt from line 1, ample whitespace, blueprint grid) but **not deleted**. It evolves in **two stages**: SSG on Workers Assets → hybrid/D1-backed SSR.

### Stage A — Phase 0–1: Redesign in place, still SSG

- Keep `astro-site/` as-is structurally, but **rebuild** `Base.astro`, `guide.css`, `landing.css`, `ToolLayout.astro`, `Header`/`Footer`, hero, toolbox, blog, glossary, compare — using the new design tokens (§22) and i18n plumbing (§31).
- Build: `bun x astro build` → `dist-astro/` served as **Worker Assets**. Remove `scripts/postbuild.mjs` merge hack — Vite's `/app` and Astro's marketing are both just assets under the same Worker (`assets.directory = ./dist`, `assets.binding = ASSETS`).
- All live URLs preserved (`/`, `/guide/*`, `/glossary`, `/toolbox`, `/compare`, `/blog/*`, `/legal/*`) — verified by `check:links`/`check:seo` still.
- Why keep Astro here: fastest path to a redesigned marketing surface that doesn't block simulator work (Phase 1). No D1 dependency yet.

### Stage B — Phase 5: Data source swaps to D1, dynamics move to Worker

- **Files → D1:** `src/content/pages/*.json` and `src/content/blog/*.md` become `content_pages` / `content_posts` rows (Content Studio §17). Astro can go `output: 'hybrid'` (prerender evergreen, SSR dynamic) or be retired for **Hono Worker SSR** reading D1 directly — decision at Phase 5 gate.
- **Dynamic behaviours (impossible in pure SSG — handled by Worker/Hono, not static Astro):**

| Behaviour | How |
|-----------|-----|
| **Homepage different per visit** (procedural hero circuit) | Worker SSR injects a live mini-sim via `GET /api/procedural/generate?template=homepage` (seed `date+session`), client hydrates |
| **Auth-aware header/CTA** | Hono `auth.middleware` reads Better Auth session → header toggles `Dashboard` vs `Login`, CTA `Open in Lab` |
| **LMS-scoped guide** | If `member` exists, walkthrough CTA becomes `Open in Lab (assignment XYZ)` with preloaded `assignments.starterCircuitJson` |
| **Search** | `search.json` → `GET /api/search?q=` backed by D1 `FTS5` (`circuits_fts`, `content_fts`) |
| **Content updates** | Writer edits in Content Studio → `content_pages` row → instant SSR, no rebuild |
| **Locale** | `GET /:locale?` routing + `Accept-Language` + `content_pages.locale` (see §31) |

### Coupling to Simulator (anchored to real files — to verify in exhaustive audit)

- `src/domain/templates.ts` 20 starter circuits → `assignments.starterCircuitJson` / `procedural_templates` share the **same `Circuit` JSON shape** (`components`, `wires`, `globalVoltage`, `faults`) — no second model.
- `src/ui/theme.ts` (`labGlassLight/Dark`, `wireColors` per `regulationStandard`) → marketing tokens in `Base.astro` must stay in sync — single token source `packages/ui/theme.ts`.
- Guide wiring path / safety band copy → reused as Lessons in LMS (`lessons` table reuses `guide.json` blocks).

**Guarantee:** every Astro route in V3 is either still SSG (Stage A) or SSR-from-D1 (Stage B) — no runtime needs an external origin. `bun run check` covers both.

---

## 31. Localization (i18n) — International Site

### Principles

- **Every user-facing string is localizable** — marketing, simulator, LMS, community, emails. No hard-coded copy except code identifiers.
- **Electrical correctness over literal translation** — glossaries (`glossary.json`) and BS 7671 / IEC citations stay authoritative; translators work from a shared terminology sheet.
- **URL owns locale, with auto-detect fallback** — clean, crawlable, sharable. No cookie-only locale.

### URL & Detection

```
/               → redirect to /<locale>/ based on Accept-Language + geo (CF-IPCountry) unless user has explicit choice
/en/            /en/guide  /en/blog/*   — English (default, also accessible at bare / via canonical)
/fr/            /fr/guide  /fr/outils/* — Français
/de/            /de/anleitung …         — Deutsch
/ar/  /es/ …                           — as needed (Arabic = RTL)
/app            — locale-agnostic shell that reads `users.locale` / Accept-Language on load; deep link /<locale>/app also works
```

- `hreflang` alternates on every page (including `x-default` → `/en/`).
- `og:locale` + `og:locale:alternate`, `html lang` + `dir="rtl"` for RTL.
- Sitemap emits one `<url>` per locale variant.

### Content Model

```
content_pages { slug, locale, title, body MDX, seoJson, status … }  — composite PK (slug, locale); missing locale falls back to en
content_posts { slug, locale, title, body … }
i18n_strings  { key, locale, value, namespace } — UI strings (simulator palette, LMS, community, emails)
glossary_terms { slug, locale, term, definition … }
```

- Admin sets **supported locales** in `app_config.i18n.locales = ["en","fr","de",…]` — adding a locale is data, not code.
- Translation workflow: Content Studio shows per-locale tabs (✓/missing), missing strings surfaced in `/admin/i18n`.

### Simulator + Electrical Labels

- Simulator chrome (menus, palette zone names, inspector tabs, toasts, validation messages) via `i18n_strings` (`namespace: simulator`). The domain engine stays English in `types.ts` — presentation maps it: `t('fault.short-circuit')`, `t('wireColors.live')`.
- **Electrical standards never translate numerically** — `230 V`, `3%`, `30 mA`, `B-curve`, colour codes stay per-standard; legends in `STANDARDS[].conductorLegend` get a `conductorLegend_i18n` key.

### Framework

- Marketing (Astro/Worker) — `astro-i18n` (or lightweight Workers-friendly solution) + message catalogs; Astro routes become `/[locale]/…`.
- App (React) — `i18next` + `react-i18next` with `drizzle` loader from `i18n_strings`.
- Emails — `t()` with `locale = user.locale ?? institutions.defaultLocale`.

### Admin

`/admin/i18n` — add/remove locales, edit catalogs, import/export JSON, see coverage per locale. All hot-reloaded via `GET /api/config` (KV-cached).

---

## 32. Electrical Standards — Global Immutable

### Rule (new — non-negotiable)

**All supported electrical rule definitions are shared and immutable at runtime.** “Global” means consistent definitions across users, not one universal national standard. Membership cannot alter rule values or suppress basic safety findings.

The [2026-09-26 source audit](./audits/electrical-standards-gap.md) pins BS 7671 A4:2026 with the 15 October transition, NEC 2026 with jurisdiction-specific adoption, IEC 60364-1:2025, 8-81:2026 and 8-82:2022+AMD1:2026. Reference edition, implemented coverage and legal adoption are separate. `int` is a generic IEC teaching profile; unsupported national/device/earthing cases must not return a compliance pass.

| Concern | Policy |
|---------|--------|
| **Definition** | `src/domain/standards.ts` (`STANDARDS`, `PLUG_SYSTEMS`, `conductorLegend`, `voltageDrop`, `rcdThresholdMa`, …) + `src/domain/electricalCalculations.ts` (mV/A/m, `TEMP_FACTOR_70C`, Al factor `0.78`, ampacity) + `src/domain/compliance.ts` / `zsCheck.ts` / `tripCurves.ts` — **is source of truth, in code, versioned in git**. |
| **Storage in D1** | `electrical_standards` table exists for **read-only projection** only — seeded from code at build (`bun run seed:standards`). Workers load it for fast reads/KV cache but **never accept writes from Admin**. |
| **Admin capability** | **Super admin can READ only** (`/admin/standards` is a viewer: tables, regulation text, resolution precedence). No edit/delete/create endpoints exist; the Hono handler has no `POST/PATCH /api/standards`. |
| **Override** | Impossible via Admin. The only path to change a value is a **code change + reviewed merge + migration + tagged release** (and `CHANGELOG.md` cites the regulation clause). |
| **Why** | Electrical standards are **safety-critical regulation** (BS 7671, NFPA 70/NEC, IEC 60364). Letting an admin flip `6 mm²` to `10 mm²` or `30 mA` to `300 mA` for aesthetics would be a safety failure and a liability. The earlier "everything admin-editable" rule **explicitly excludes** this domain. |
| **What *is* admin-editable around it** | LMS grading scales, rubric templates, certificate templates, Dassigned **standard selection** per institution/course (`regulationStandard: 'uk'|'us'|'eu'|'int'`) — but never the table values behind that selection. |

### Data contract

```
D1 electrical_standards { id, code, tablesJson, version, seededAt }
D1 electrical_standards_history { id, version, tablesJson, diffJson, migration, releasedAt }
```

`GET /api/standards` is public-read (cached, KV 300s). Super admin sees the same data with a `History` tab (diffs).

---

## 33. D1 Performance — Parallel Reads/Writes, No Failures at Scale

### Design goal

**Blazing fast under parallel load, no failures on traffic spikes** — despite D1 being SQLite (single-writer, snapshot-isolated). The architecture must behave like a real production DB under concurrent reads/writes.

### How we achieve it

1. **Read Replicas are non-negotiable**
   - Enable `read_replication.mode = "auto"` (dashboard) from Phase 0. Replicas in ENAM/WNAM/WEUR/EEUR/APAC/OC.
   - Every **read-heavy** route uses `env.DB.withSession(bookmark)` — replica-served, `x-d1-bookmark` header carries sequential consistency (monotonic reads, read-your-writes). Verified with `meta.served_by_region`/`served_by_primary`.

2. **Single-writer discipline — short, batched, non-blocking writes**
   - D1 is **one primary writer** — long HOLD locks block others. Pattern: **collect → `D1.batch()` → release**.
   - Keep every write transaction **< 5ms** (single `batch` with inserts/updates, no read-then-write loops, no N+1).
   - Example: `POST /api/circuits` = one `batch` (insert `circuits` + `circuit_versions` + `xp_events` + `notifications`) → one round-trip, one lock hold.
   - Never `await` external I/O (R2, email) **inside** the lock — queue it: `ctx.waitUntil(queue.send(...))` after commit.

3. **KV as the read shield**
   - Hot paths never hit D1 on every request:
     - `GET /api/config`, `GET /api/standards`, `GET /api/search/suggest` → **KV (60–300s TTL)** + `ETag`.
     - Leaderboards, homepage procedural seed, pricing plans → **KV + CRON refresh** (Queue consumer repopulates).
   - Result: ~70% of requests served from KV/R2, D1 sees only misses + writes.

4. **Idempotent, retry-safe writes + Queues for slow work**
   - Every write endpoint is **idempotent** (`Idempotency-Key` header → KV dedupe + DB unique constraint).
   - Webhooks, emails, leaderboard rollups, cert rendering, XP evaluation → **Cloudflare Queues** (at-least-once, retried) — never in the request path.
   - Circuit save collisions: `optimistic concurrency` (`If-Match: <updatedAt>`) → `409` + merge prompt instead of blind overwrite.

5. **Connection & statement hygiene**
   - **Prepared statements** bound securely (no string-concatenated SQL).
   - `PRAGMA journal_mode = WAL` behavior is inherent to D1 (snapshot isolation) — no manual tuning.
   - Batch size capped (~25 statements per `batch`) — split large gradebook writes.
   - Drain large reads via **cursor pagination** (`?cursor=<updatedAt>:<id>`), never `SELECT *` without `LIMIT`.

6. **Durable Objects for serialize-when-needed**
   - Hot-contended aggregates (realtime presence, exam countdown, live gradebook counters) live in **DO (SQLite storage)** — which serializes per-key. D1 stays out of the hot loop.

7. **Observability + budgets**
   - `bun x wrangler d1 insights electrasim --time-period 1h --sort-by time --limit 10` in CI.
   - Budgets (enforce in `check:perf`): **p95 write < 50ms**, **p95 cached read < 20ms** (Worker→D1), **replica-served read p95 < 40ms**. `check:csp`/`check:seo` still green, no payload over 250 kB gzip.

8. **Indexes reviewed before any query ships**
   - Every new query must answer: *which index does it use?* `EXPLAIN QUERY PLAN` in PR review for `circuits`, `enrollments`, `submissions`, `xp_events`, `posts` hot paths. Missing index = blocked PR.

### What we never do

- Never run a long sequential write loop (import, CSV bulk enroll) as N× `execute()` — always `batch()` or stream via Queue consumer.
- Never serve a feed or gradebook without `LIMIT` + `ORDER BY` on an indexed column.
- Never treat D1 like Postgres (no `FOR UPDATE`, no advisory locks) — use DO where serialization is required.

### Local verification (before any scaling claim)

```
bun x wrangler dev --local --persist-to .wrangler/state &
# Parallel read burst
for i in {1..200}; do curl -s http://127.0.0.1:8787/api/circuits?limit=20 & done | tail
# Parallel write burst (idempotent keys)
for i in {1..50}; do curl -s -X POST http://127.0.0.1:8787/api/circuits -H "Idempotency-Key: test-$i" -d '{}' & done
bun x wrangler d1 insights electrasim --local
```

Remote only after local parallel bursts pass without `SQLITE_BUSY` / 5xx and p95 within budget.

---

## 34. Exhaust Inventory — Astro + Simulator Coupling Seams (Verified)

> **Status:** **VERIFIED 2026-09-25** — explore agent ran `glob **/*` + `find -type f | wc -l` across the full repo and deep-read the seams below. This is not sampling — it is census.

### Census

| Scope | Files | How |
|-------|------:|-----|
| `src/` | **371** | `find` (glob truncates at 100) |
| `astro-site/src/` | **250** | `find` |
| `src/domain/` | 112 | `types.ts` 508L, `components/*.ts` 10 shards, `simulation/{simulate,traversal,faultPropagation,tripCurves}.ts`, `electrical/*`, `circuitValidation.ts`, `compliance.ts`, `templates.ts` 20 guided, `challenges/**` |
| `src/store/` | 31 | `circuitStore.ts` 840L, `uiStore.ts` 1180L, `settingsStore.ts` 508L, `viewportStore`, `persistence.ts`, `seed.ts` |
| `src/ui/` | 133 | `Editor.tsx` 464L composition root, `CircuitCanvas.tsx`, `canvas/{ComponentLayer,WireLayer,DenseWireLayer,geometry,fitRegion}.tsx`, `components/{Palette,Inspector,LogPanel,Toolbar,ChallengeModeRuntime,DiagnosisPanel}.tsx`, `theme.ts` |
| `src/lib/` | 30 | `site.ts`, `site-links.test.ts` 236L, `export/{circuitFormat,shareUrl,imageExport,eicReport}.ts`, `backup/backupFormat.ts` |
| `astro-site/src/pages/` | 30 | `index.astro`, `guide.astro`, `guide/circuits/[slug].astro`, `guide/components/[slug].astro`, `guide/tools/[slug].astro`, `tools/{cable-size,voltage-drop}-calculator.astro`, `blog/[...slug].astro`, `search.json.ts`, `glossary/index.astro`, `compare.astro` |
| `astro-site/src/lib/` | 47 | `guide.ts` 824L, `blog.ts` 167L, `search.ts` 316L, `seo.ts`, `anatomy.ts`, `glossary.ts`, `competitor-bench.ts`, `tools/cable-size/*` 8 files, `tools/voltage-drop/*` 4 files |
| `astro-site/src/components/` | 38 | `layout/{SiteHeader,SiteFooter,SiteSearchModal}.astro`, `landing/{LandingHero,BlogHighlights,CoreSections}.astro`, `guide/{GuideHero,CircuitCard,Breadcrumbs}.astro`, `tools/{CableSizePanels,ToolWorkspace,StandardSelector}.astro` |
| `scripts/` | 27 | `postbuild.mjs`, `check-{internal-links,seo,csp,performance}.mjs`, `benchmark-simulation.ts`, `probes/` 12 probes |

Deep reads (lines + exports) confirmed on: `src/domain/{types,standards,electricalCalculations,simulation/simulate,components}`, `src/store/{circuitStore,settingsStore}`, `src/ui/{Editor,theme}`, `astro-site/src/lib/{guide,blog,search}`, `astro-site/src/layouts/Base.astro` (159L), `src/lib/site-links.test.ts`.

### Coupling Table — Simulator Token → Marketing / LMS Surface

| Simulator token (source) | Detail | Marketing consumes it | LMS / Progress consumes it | Community / SEO |
|---|---|---|---|---|
| `GUIDED_CIRCUIT_TEMPLATES` (`domain/templates.ts`, `guidedCircuitIds.ts`) 20 ids | `circuit-1..20` titles + wiring | `guide.json` 20 circuits → `/guide/circuits/[slug].astro` via `guide.ts:circuitSlug`; `guide.ts:CIRCUIT_SCHEMATICS` 20 SVGs + `CIRCUIT_SAFETY`; `LandingCoreSections` count | `Editor.tsx?template=` → `loadGuidedCircuitIntoEditor`; `guideProgress.ts` + `guideProgressPersistence.ts`; `guide-lab.test.ts` | `site-links.test.ts` count guard (`ready-made circuits` must == templates.length) |
| `COMPONENT_DEFS` 9 zones (`domain/components/*`) 90 defs | `is*` flags + `powerWatts/maxAmps/cableMm2` + `ports[]` | `guide/components/[slug].astro` + `guide/tools/[slug].astro` via `COMPONENT_ANATOMY_RULES` → `anatomiesForCircuit`/`circuitsUsingAnatomy` mesh | `Palette` tier filter, `Inspector` live `wireCalculations`, `challenge/generator` picks from registry | `search.ts` `guideComponents`/`guideTools` hub; glossary cross-links |
| `Circuit` / `ComponentInstance` / `WireInstance` (`domain/types.ts` 508L) | `x,y,rotation, state{on,speed,fault,isBlown/tripped,rcdType}`, `controlPoints,pathKind,fault,lengthMeters` | `guide.ts` schematics visualise `PortType live/neutral/earth` | `circuitStore.ts` 840L (add/move/toggle/wire + `zundo` 100, `partialize`), `persistence.ts` IndexedDB, `export/circuitFormat.ts` + `shareUrl.ts` `?c=` gzip, `imageExport.ts` | `challenges/share.ts` base64 share-code |
| `SimulationResult` + `FaultType` 14 + `RCDType` (`types.ts` + `simulation/*`) | `energizedComponents/Wires`, `tripped{cause,mechanism,clearingTime}`, `wireHeatRatios`, `bustedWires` | Blog (`wiring mistakes`, `flicker`) explains energized/tripped | `useSimulation → uiStore.simResult → FaultAlert/Diagnosis/WhatHappened/EventHistory`; `diagnosisStore` + `challenges/diagnosis/{evaluator,scoring}`; `faults/injection` | `challenges/rage/*` Ohmageddon |
| `settingsStore.ts` 27 fields (`appMode`, `regulationStandard uk/us/eu/int`, `wireColorStandard`, `plugSystem bs1363…all`, `diagnosticOverlayMode`, `routingStyle`) | Persists `electrasim:settings:v2`, defaults in `__SETTINGS_DEFAULTS` | `tools/cable-size-calculator.astro` + `voltage-drop-calculator.astro` reuse `regulationStandard`/`wireColorStandard`; `StandardSelector.astro` | `Editor.tsx:applyCanvasPreset` → `labGlass` + `wireColorStandard`; `Canvas` colours; `Inspector` `zsCheck/compliance` | `asset-version.ts` shared vocab |
| `WirePathKind` `bezier|orthogonal` + `Wire.pathKind` per-wire | Additive coexistence; hand-edit pins `controlPointsLockedByUser` | — | `CircuitCanvas` + `domain/geometry.ts` orthogonal router + A* ; `Store.updateWireProperties` | `FpsOverlay`, `PERFORMANCE.md` |
| `guide.ts: circuitSlug / CIRCUIT_SLUGS / COMPONENT_ANATOMY_RULES` 20-rule map | Stable slugs ≠ titles; regex order matters | `/guide/circuits/[slug]`, `/guide/components/[slug]`, Breadcrumbs, `CatalogCard` | `ui/components/docs/data.ts:GUIDE_WALKTHROUGH_ANCHORS` must match (guarded) | `search.ts:buildSearchIndex` → `/guide/circuits/slug/`; `js/guide-legacy-redirects.js.ts` `#circuit-N` |
| `blog.ts: HOMEPAGE_ARTICLE_IDS` 12 + `BLOG_PAGE_SIZE 9` + `paginatePosts` | Curated IDs, tag threshold `3` | `index.astro → LandingBlogHighlights (selectPostsById)`; `blog/[page].astro`, `tags/[tag].astro` | `componentHelp/*` links articles to sim help | `search.ts article-*`, `rss.xml.ts`, `og-cards.ts` |
| `search.ts: buildSearchIndex / CORE_PAGES 8 / SearchItem` | Normalized 6 corpora | `search.json.ts` (build-time) → `public/js/site-search.js` → `SiteSearchModal.astro` | Could power LMS `CommandPalette` | Community discoverability; `search.test.ts` |
| `Base.astro` head 159L `metaTitle/metaDescription` clamp | OG/Twitter, `WebSite` JSON-LD + searchbox, canonical, CSP meta, font preloads | Every marketing page | LMS inherits same head; `articleMeta` for learning content | `structured-data.test.ts`; `check-seo.mjs` |
| `circuitFormat.ts / shareUrl.ts / imageExport.ts / backupFormat.ts` | JSON v1 + compressed `?circuit=` + PNG + `.electrasim` backup | `guide/circuits/[slug].astro?template=` deep links | `ImportExportModal`, `persistence.ts`; `challenge/share.ts` declarative challenge + circuit | `eicReport.ts` professional export |
| `standards.ts 375L` + `electricalCalculations.ts` 195L + `zsCheck.ts` + `compliance.ts` | **IMMUTABLE** — BS 7671 / NEC (mV/A/m `TEMP_FACTOR_70C 1.2`, Al `0.78`) | `lib/tools/cable-size/*` + `voltage-drop/*` — simulator-faithful replicas | `Inspector` live `wireCalculations`/`thermalData`; `domain/electrical/*` validation | Blog `electrical-cable-sizes-explained` |
| `site-links.test.ts` 236L `APP_COPY_SOURCES 5` | Guards `https://electrasim.com/*` never 404 | Enforces Astro route rename safety | `tour/steps.ts` + `AboutTab` onboarding quotes accurate | Prevents silent link rot |

**Implication for V3:** the LMS ↔ Simulator contract is **already exact** — `Circuit` JSON is the single wire format for starter circuits, procedural exam variants (`HMAC` seed → `generatedCircuitJson`), submissions (`circuits.orgId`), and server `simulate()` auto-grade. No drift between `domain/types.ts` and Astro's `guide.json` — the count guard forces them to stay in sync. This table is the gate for §30–§33: new locales, immutable standards reads, and FTS5 indexes must not break any row.

---

## 35. Open Questions — Remaining

Let me know if you need additional detail on:
- Locale list & priority (which languages first — `en` is default; `fr`/`de`/`es`/`ar` next? RTL scope?)
- Standards update cadence and future national profiles; publication references and current scope corrections are recorded in the [source audit](./audits/electrical-standards-gap.md).
- Whether Arabic (RTL) is in V3.0 or V3.1 (it doubles the layout work)
