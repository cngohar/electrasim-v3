# [SUPERSEDED] ElectraSim V4 — Full Rewrite Plan (From Line 1)

> **SUPERSEDED 2026-09-25** by [`REWRITE_PLAN_V3_FULL.md`](./REWRITE_PLAN_V3_FULL.md) (Bun + 100% Workers: D1/R2/KV/DO). Kept for diff only.

**Version:** 4.0.0-DRAFT — 2026-09-25  
**Status:** `SUPERSEDED`  
**Authors:** Engineering + Product  
**Previous Stack:** React 19 + Vite 6 + Zustand + IndexedDB + SVG + Cloudflare Pages (v2.0.4 / v3)  
**Target Stack:** TypeScript strict + Next.js 15 + Better-Auth + Postgres 17 + Drizzle + Hono/Workers + Matter.js + Tailwind v4

> **Prime directive:** `NO THING IS HARD CODED — EVERYTHING CAN BE CHANGED FROM ADMIN PANEL EXCEPT MANDATORY THINGS` (physics constants, BS 7671 / IEC regulation tables are versioned but overridable; only code contracts & DB migrations are mandatory).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Current State & Why Full Rewrite](#3-current-state--why-full-rewrite)
4. [Target Architecture Overview](#4-target-architecture-overview)
5. [Tech Stack Decisions](#5-tech-stack-decisions)
6. [Monorepo & Folder Structure](#6-monorepo--folder-structure)
7. [Auth System (Better Auth + Postgres)](#7-auth-system)
8. [RBAC Design](#8-rbac-design)
9. [Database Schema (Postgres 17)](#9-database-schema)
10. [Gamification & Level System](#10-gamification--level-system)
11. [LMS System (RBAC-Powered)](#11-lms-system)
12. [Dashboards: Personal vs LMS-Bound](#12-dashboards)
13. [Community / Social Network](#13-community--social-network)
14. [Public Profiles](#14-public-profiles)
15. [Payments (Crypto: NOWPayments + Binance Pay)](#15-payments)
16. [Simulator V4 Redesign](#16-simulator-v4-redesign)
17. [Wiring Games (Separate from Simulator)](#17-wiring-games)
18. [Procedural Engine (Homepage / Games / Exams)](#18-procedural-engine)
19. [Admin Panel — No Hardcoding Principle](#19-admin-panel)
20. [UI/UX & Theming](#20-uiux--theming)
21. [API & Realtime Layer](#21-api--realtime-layer)
22. [Migration from V3 (IndexedDB → Cloud)](#22-migration)
23. [Testing, Observability, Security, Performance](#23-testing-observability-sec-perf)
24. [Phased Roadmap (8 Phases, 22 Weeks)](#24-phased-roadmap)
25. [Open Questions For You](#25-open-questions)

---

## 1. Executive Summary

V4 is a **platform rewrite** — not a simulator upgrade. V3 proved the electrical engine (`domain/simulation/simulate.ts` 884 lines, 90 components, BS7671 tables) can be pure, worker-safe and heavily tested. V4 keeps that **mathematical core** as a portable `@electrasim/domain` package and rewrites **everything around it**: auth, cloud persistence, RBAC, LMS tenancy, gamification, community, payments, procedural generation, admin configurability, and a new physics-enhanced simulator renderer.

Two product lines emerge, sharing one domain engine + one procedural engine:

| Line | Audience | Monetization |
|------|----------|--------------|
| **Simulator Lab** | hobbyists, pros, students | Free basic (all 90 comps wiring + basic sim). Pro gates: advanced sim stress, industrial components, 3-phase, export, cloud sync |
| **Games** | learners, casual, students | Free + XP. Procedural wiring puzzles. Optional pro cosmetics/hints |

Both lines feed the same **XP / Level / Profile / Community** loop.

---

## 2. Goals & Non-Goals

### Goals

- Multi-tenant LMS: institution signup → roster → class → assignments → grading → analytics
- Proper RBAC across every route/API/realtime event
- Better Auth + OAuth + Postgres as source of truth (IndexedDB becomes offline cache only)
- Gamification that drives retention without pay-to-win
- Social community where circuits are forkable content (like GitHub + Instagram)
- Pro gating that is server-enforced, not client `appMode` flag
- Matter.js-enhanced canvas with enhanced graphics
- Single procedural engine (seeded PRNG) powering homepage, games, exam variants
- Admin panel that can change **any content/config** without deploy

### Non-Goals (V4)

- Native mobile apps (PWA only; Capacitor revisit in V4.1)
- SCORM/xAPI export in V4.0 (LMS supports CSV + API; SCORM in V4.1 if demanded)
- Card payments in V4.0 — explicitly deferred (stub `provider='card'` + feature flag)
- AI tutor proxy (keep V3 decision: Hono placeholder `/api/ai/*` but ship after LMS stable)

---

## 3. Current State & Why Full Rewrite

**What V3 does well (keep):** pure `domain/` (simulation, electrical math, challenge generator), Zustand+Immer pattern, Astro content discipline, strict TS.

**Why rewrite:** 

1. **No identity layer** — `appMode: 'basic'|'pro'` is localStorage, no user table, no session, no sync, no entitlement check.
2. **Monolithic stores** — `uiStore.ts` 1180 lines, cyclic deps, hand-rolled persistence per slice (6 touch points per new setting).
3. **No router** — `Editor.tsx` is single page, `?template=` imperative, Astro and Vite built separately then merged by `postbuild.mjs`.
4. **SVG-only renderer** with orthogonal routing but no physics; Pixi prototype hidden; no rbush/culling actually wired.
5. **No tenancy** — LMS is 20 static templates + local `guideProgress` in IndexedDB — no classroom, no gradebook.
6. **No social, no XP, no economy** — scoring is local, no leaderboard, no inventory.
7. **Payment/Compliance math duplicated** in 4 files — BS7671 tables hard-coded.

Full rewrite lets us install **tenancy, identity, entitlements, and physics** at the foundation rather than bolting them onto a client-only SPA.

---

## 4. Target Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│  Next.js 15 App Router (React 19, Tailwind v4, shadcn/Radix)   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Marketing│ │   App    │ │  Admin   │ │  PWA     │            │
│  │  (rsc)   │ │(sim+game)│ │  Panel   │ │  Shell   │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│  Zustand (client state) + TanStack Query (server state)        │
│  CircuitCanvas (SVG + Matter.js physics layer)                  │
│  Better Auth client + offline IndexedDB cache (idb-keyval)     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / WSS
┌──────────────────────────────▼──────────────────────────────────┐
│                     Edge / API Layer                            │
│  Next.js Route Handlers + Hono on Cloudflare Workers            │
│  Better Auth (session) • RBAC middleware • Rate limit           │
│  REST + tRPC/Realtime (WebSocket via Workers Durable Objects)  │
│  Webhooks: NOWPayments, Binance Pay                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                     Postgres 17 (Neon/Supabase)                 │
│  Drizzle ORM + Row Level Security (RLS) + pg_cron + pgvector*  │
│  Entities: users, sessions, orgs, enrollments, circuits,       │
│  gamification, community, payments, procedural seeds             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                     Object Storage + CDN                        │
│  R2 / S3: circuit thumbnails, OG cards, exports, avatars       │
│  Cloudflare CDN + Image Resizing                                │
└─────────────────────────────────────────────────────────────────┘

* pgvector optional for community search / recommendations in V4.1
```

**Key principle:** **Server is source of truth.** IndexedDB is L2 cache + offline queue (CRDT-lite: last-write-wins with vector clock per circuit). Share links remain `https://electrasim.com/c/<id>` (DB-backed) plus legacy `#c=<gzip>` import path.

---

## 5. Tech Stack Decisions

| Layer | Choice | Reason | Version |
|-------|--------|--------|---------|
| **Framework** | **Next.js 15 App Router** | Unifies marketing + app + admin, RSC, route groups, middleware RBAC, Better Auth first-class | 15.x |
| **Language** | TypeScript 5.8 strict | Keep V3 discipline | 5.8 |
| **Auth** | **Better Auth** + Drizzle adapter | Modern, Postgres-native, OAuth + magic-link + email/pass, org plugin for LMS tenancy, no Supabase lock-in | latest |
| **DB** | **Postgres 17** (Neon or Supabase Postgres) | Latest stable, RLS, JSONB for flexible config, Hyperdrive on Cloudflare | 17.x |
| **ORM** | **Drizzle ORM** | Type-safe, Better Auth compatible, migrations, RLS-aware | latest |
| **API** | Next Route Handlers + **Hono** on Workers for webhooks/realtime | Hono is V3 plan's choice; keeps edge latency low | 4.x |
| **Client State** | Zustand 5 + Immer + zundo (keep) | Proven; scope to canvas/viewport only | 5.x |
| **Server State** | TanStack Query 5 | Cache, invalidation, optimistic updates | 5.x |
| **Styling** | Tailwind v4 + **shadcn/ui** + Radix | V3 PLAN.md promised but never installed; now mandatory | 4.x |
| **Canvas** | SVG (retain) + **Matter.js** physics layer + optional Pixi for dense wires | Matter for cable sag/collision/drag; SVG stays accessible | 0.20.x |
| **Realtime** | Cloudflare Workers Durable Objects + WebSocket (or PartyKit) | Presence, live dashboards, community feed | — |
| **Payments** | **NOWPayments** + **Binance Pay** (Binance Pay API) | Crypto per spec; card stubbed `stripe` flag OFF | — |
| **Storage** | Cloudflare R2 (or S3) | Circuit images, avatars, exports | — |
| **Email** | Resend or Postmark | Better Auth transactional | — |
| **Jobs** | pg_cron + Cloudflare Queues | Grade recalc, XP decay, webhook retries | — |
| **Search** | Postgres FTS + pg_trgm (V4.0), Meilisearch later | Community + circuit search | — |
| **Analytics** | PostHog self-host (privacy) or Plausible | Funnels, LMS analytics (no GA) | — |
| **Monorepo** | Turborepo + pnpm workspaces | Shared `domain`, `ui`, `procedural-engine` packages | 2.x |
| **Deploy** | Cloudflare Pages + Workers (keep) via Hyperdrive to Postgres | Minimal migration from V3 | — |

**Why not Supabase Auth / Firebase / Auth.js:** Better Auth gives org/team plugin (institution tenancy), Drizzle-native, session + JWT, and lets us stay on Postgres without vendor auth lock-in. OAuth providers: Google, GitHub, Discord (and add Microsoft for .edu).

---

## 6. Monorepo & Folder Structure

```
electrasim-v4/
├── apps/
│   ├── web/                      # Next.js 15 — marketing + app + admin (route groups)
│   │   ├── app/
│   │   │   ├── (marketing)/      # /, /guide, /blog, /glossary, /compare, /toolbox
│   │   │   ├── (app)/            # /app, /app/c/[id], /dashboard, /profile/[handle]
│   │   │   ├── (lms)/            # /lms, /lms/institution/[slug], /lms/class/[id]
│   │   │   ├── (community)/      # /feed, /c/[circuitId], /u/[handle]
│   │   │   ├── (admin)/          # /admin/* (RBAC: super_admin only)
│   │   │   └── api/              # route handlers (auth, circuits, payments webhooks)
│   │   ├── components/           # app-specific composites
│   │   ├── lib/                  # auth client, query client
│   │   └── middleware.ts         # Better Auth + RBAC gate
│   └── workers/                  # Hono on Cloudflare Workers (webhooks, realtime)
├── packages/
│   ├── domain/                   # ← V3 domain/ extracted verbatim, worker-safe
│   │   ├── simulation/           # simulate.ts, traversal, tripCurves, faultPropagation
│   │   ├── electrical/           # calculations, BS7671 tables (now DB-overridable)
│   │   ├── components/           # 90 defs (now also seeded from DB, fallback to code)
│   │   └── challenges/generator  # procedural seeds
│   ├── procedural-engine/        # NEW — seeded PRNG + generators (see §18)
│   ├── ui/                       # shadcn primitives + canvas components + theme
│   ├── config/                   # zod schemas for all admin-editable config
│   ├── db/                       # Drizzle schema + migrations + seeds
│   └── tsconfig/                 # shared tsconfig
├── scripts/                      # migrations, seeds, benchmarks
├── e2e/                          # Playwright (expanded for RBAC/LMS/payments)
└── turbo.json
```

**Import rule:** `apps/web` may import `packages/*`; `packages/domain` imports nothing from `apps/*` (pure). `procedural-engine` is dependency of `domain` + `apps/web`.

---

## 7. Auth System

### Better Auth Configuration

```ts
// packages/db/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins/organization";
import { db } from "./drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  emailVerification: { sendOnSignUp: true },
  socialProviders: {
    google: { clientId: process.env.GOOGLE_ID!, clientSecret: process.env.GOOGLE_SECRET! },
    github: { clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! },
    discord: { clientId: process.env.DISCORD_ID!, clientSecret: process.env.DISCORD_SECRET! },
  },
  plugins: [
    organization({
      // Maps to institutions + classes
      allowUserToCreateOrganization: true, // institution signup
      organizationLimit: 3,
    }),
  ],
  session: { expiresIn: 60*60*24*7, updateAge: 60*60*24 },
  advanced: { generateId: () => crypto.randomUUID() },
});
```

**Flows:** email+password, magic-link, OAuth, email verification, password reset, 2FA TOTP (optional for institution_admin). Sessions stored in `session` table, JWT for Workers verification via `better-auth` `getSession()` in `middleware.ts`.

**Middleware:** `apps/web/middleware.ts` checks `session` + `RBAC` per route group:

```
/admin/*            → role = super_admin | admin
/lms/institution/*  → membership exists (instructor | institution_admin)
/app                → authenticated OR guest (guest = local-only, banner to signup)
/api/circuits/*     → authenticated, entitlement check for pro components
```

**Guest mode:** Unauthenticated users get full basic simulator with IndexedDB only. On signup, `POST /api/migrate/guest` bulk-imports local circuits (user confirms). No data loss.

---

## 8. RBAC Design

### Roles (hierarchical + scoped)

| Role | Scope | Description |
|------|-------|-------------|
| `super_admin` | global | Platform owner. Full admin panel, billing, moderation, impersonation |
| `admin` | global | Moderation, content, support. No billing/impersonation |
| `institution_admin` | organization | Owns institution, manages instructors, students, billing, settings |
| `instructor` | organization → course/class | Creates courses, assignments, exams, grades, views analytics |
| `student` | organization → class | Enrolled via institution; sees LMS dashboard, submits work |
| `individual` | global (no org) | Solo learner — personal dashboard, community, optional pro |
| `moderator` | global | Community moderation queue |
| `guest` | none | Unauthenticated — local only |

Roles stored in two places:

1. **Global role** `user.role` enum (`super_admin|admin|moderator|individual`) — for platform RBAC.
2. **Org membership** `member.role` enum (`owner|admin|instructor|student`) per `organizationId` — for LMS tenancy.

Effective permission = `globalRole ∪ orgMembershipRoles`. Middleware checks both.

### Permission Matrix (excerpt)

| Action | guest | individual | student | instructor | institution_admin | admin | super_admin |
|--------|:-----:|:----------:|:-------:|:----------:|:-----------------:|:-----:|:-----------:|
| Use basic simulator | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Use pro components/sim | ❌ | ✅* | ✅* | ✅* | ✅* | ✅ | ✅ |
| Save circuit to cloud | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Publish circuit to community | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create institution | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Invite students/instructors | — | — | — | ✅ (own class) | ✅ | — | ✅ |
| Create course/assignment | — | — | — | ✅ | ✅ | — | ✅ |
| Grade / gradebook | — | — | — | ✅ | ✅ | — | ✅ |
| View institution analytics | — | — | — | ✅ (own) | ✅ | ✅ | ✅ |
| Manage payments/entitlements | — | ✅ (own) | — | — | ✅ (org) | — | ✅ |
| Access admin panel | — | — | — | — | — | ✅ | ✅ |
| Moderate community | — | — | — | — | — | ✅ | ✅ |

`*` Pro entitlement checked via `entitlements` table (per user or per org seat).

### Enforcement

- **Middleware** (route gate) + **Drizzle RLS** (row gate) + **tRPC/route handler** (action gate). Triple layer.
- Permissions defined as code in `packages/config/permissions.ts` (zod) and editable copy in `admin_permissions` DB table (admin can add custom permissions without deploy, but code is fallback).
- Every API handler calls `requirePermission(session, 'circuit:publish')` helper.

---

## 9. Database Schema

**Postgres 17, Drizzle ORM, UUIDv7 PKs, `updated_at` triggers, soft-delete where needed.**

```sql
-- Better Auth tables (generated): user, session, account, verification
-- + organization, member, invitation (via better-auth org plugin)

-- Core
users                -- extends better-auth user: handle, displayName, avatarUrl, bio, level, xp, role global
profiles             -- public profile denormalized: handle unique, seo, socialLinks jsonb
entitlements         -- userId/orgId, plan free|pro|institution, provider nowpayments|binance|card, status, period
circuits             -- id, ownerId, orgId nullable, title, description, visibility private|org|public, circuitJson jsonb, thumbnailUrl, forkedFromId, tags
circuit_versions     -- circuitId, version, circuitJson, createdBy, diff
components_catalog   -- id, slug, name, zone, isPro boolean, defJson jsonb, graphicsUrl, matterBodyJson jsonb -- ADMIN EDITABLE
electrical_standards -- id, code uk|us|eu|int, cableAmpacityTable jsonb, voltageDropTable jsonb -- versioned

-- LMS
institutions         -- id, slug, name, logoUrl, settings jsonb (gradingScale, term)
courses              -- id, institutionId, title, description, coverUrl
classes              -- id, courseId, name, term, inviteCode
enrollments          -- id, classId, userId, role student|instructor, status pending|active|suspended, enrolledAt
assignments          -- id, courseId/classId, title, type practice|homework|exam, circuitTemplateId nullable, proceduralSeed nullable, dueAt, maxAttempts, rubricJson jsonb
submissions          -- id, assignmentId, userId, circuitId, status draft|submitted|graded, score, feedback, submittedAt
grades               -- id, enrollmentId, assignmentId, points, letterGrade, gradedBy, gradedAt
attendance           -- id, classId, userId, date, status present|absent|late
certificates         -- id, userId, courseId, issuedAt, pdfUrl, verifyToken

-- Gamification
levels               -- id, level int unique, title, xpRequired, rewardsJson jsonb -- ADMIN EDITABLE
xp_events            -- id, userId, source challenge|circuit|streak|community|assignment, amount, meta jsonb, createdAt
badges               -- id, slug, name, iconUrl, criteriaJson jsonb -- ADMIN EDITABLE
user_badges          -- userId, badgeId, earnedAt
streaks              -- userId, currentStreak, longestStreak, lastActiveDate
leaderboards         -- materialized view: userId, xp, level, rank (refresh via pg_cron)
quests               -- id, title, description, criteriaJson, xpReward, activeFrom/To -- ADMIN EDITABLE
user_quests          -- userId, questId, progressJson, status

-- Community
posts                -- id, authorId, circuitId nullable, body, visibility, createdAt
comments             -- id, postId/circuitId, authorId, body, parentId nullable
reactions            -- id, targetType post|comment|circuit, targetId, userId, emoji
follows              -- followerId, followingId
notifications        -- id, userId, type, payloadJson, readAt
reports              -- id, reporterId, targetType, targetId, reason, status

-- Procedural
procedural_templates -- id, slug, type homepage|game|exam, generatorConfig jsonb, version -- ADMIN EDITABLE
procedural_seeds     -- id, templateId, seed, paramsJson, generatedCircuitJson -- for exam audit

-- Payments
payments             -- id, userId/orgId, provider nowpayments|binance|card, providerPaymentId, amount, currency, status pending|confirmed|failed, plan, period
webhook_events       -- id, provider, payloadJson, processedAt

-- Config (No Hardcoding)
app_config           -- key unique, value jsonb, description, updatedBy -- e.g. pricing, featureFlags, homepageLayout, matterDefaults
feature_flags        -- key, enabled boolean, rolloutPercent, allowlistJson

-- Ops
audit_logs           -- id, actorId, action, targetType, targetId, diffJson, createdAt
```

**Indexes:** GIN on `circuitJson`, `trgm` on `handle/title`, B-tree on `(institutionId, status)` for enrollments.

**RLS examples:**

```sql
-- circuits: owner can read/write own; org members can read org-visible; public readable
CREATE POLICY circuits_select ON circuits FOR SELECT USING (
  visibility = 'public' OR ownerId = auth.uid() OR (visibility='org' AND orgId IN (SELECT organizationId FROM member WHERE userId=auth.uid()))
);
```

---

## 10. Gamification & Level System

### Philosophy

No pay-to-win. Pro unlocks **tools**, not XP. All level progression is earnable free.

### Levels (1–100, admin-editable via `levels` table)

| Bands | Levels | Title Example | XP to Next | Unlock Examples |
|-------|--------|---------------|------------|-----------------|
| Novice | 1–10 | Apprentice → Tinkerer | 100 → 1k (linear) | Basic badges, 2 community posts/day |
| Journeyman | 11–30 | Wireman → Sparks | 1.5k → 5k (exp curve `xp = 100 * L^1.6`) | Game hard mode, circuit forking |
| Artisan | 31–60 | Charge Master → Grid Keeper | 6k → 15k | Pro trial 7 days at Lv30, custom avatar frame |
| Master | 61–90 | Volt Architect → Luminary | 18k → 40k | Mentor role, community moderation nominate |
| Legend | 91–100 | Electra Prime | 50k+ | Hall of Fame, certificate NFT (optional) |

XP curve stored in `app_config.levelCurve` (zod validated), editable without deploy.

### XP Sources

| Source | XP | Cooldown / Cap |
|--------|----|----------------|
| Complete basic circuit | 25 | — |
| Complete pro/industrial circuit | 50 | — |
| Diagnosis Lab solve (no hints) | 100 | — |
| Diagnosis with hints | 40 | — |
| Daily wiring game win | 30 + streak bonus | 1/day |
| Streak (3/7/30 days) | 50 / 150 / 600 | — |
| Circuit published + 5 likes | 40 | max 3/day |
| Assignment A grade (LMS) | 80 | — |
| Helpful comment (5 upvotes) | 20 | — |
| First circuit fork | 15 | — |

**Anti-farm:** Diminishing returns per circuit hash, IP rate limit, server validates `simulate()` result before awarding.

### Badges (examples, admin-creatable)

`first-spark`, `short-circuit-survivor`, `rcd-saviour`, `30-day-streak`, `helpful-sparky`, `topology-ninja`, `exam-ace`. Criteria as JSON: `{"type":"streak","days":30}` etc., evaluated by worker cron.

### Leaderboards

- Global (all-time, weekly, monthly)
- Institution-scoped (for LMS)
- Friends/following
- Materialized view refreshed every 5 min via `pg_cron`.

### UI

Level ring around avatar (SVG), XP bar, quest cards, badge cabinet on profile, level-up modal with confetti (Matter.js particles reuse).

---

## 11. LMS System

### Tenancy Model

```
Institution (organization)
 └── Courses (e.g., "Electrical Installation Level 2")
      └── Classes/Cohorts (e.g., "2026 Autumn — Group A", inviteCode: XK9-Q2)
           └── Enrollments (user ↔ class, role student|instructor)
                └── Assignments (linked to course or class)
                     └── Submissions (circuit + auto-check + manual grade)
```

**Signup flow:**

1. Visitor clicks `For Institutions` → `Create Institution` (Better Auth `organization.create`).
2. Creator becomes `institution_admin` (owner). Fills institution profile (name, slug, logo, domain allowlist).
3. Admin invites instructors via email (Better Auth `invitation` table) → instructor accepts → role `instructor`.
4. Instructor creates Course → Class → inviteCode or email bulk invite (CSV) → student joins via code/link → `enrollment` pending → auto-active or admin approve (configurable `app_config.lms.autoApproveStudents`).
5. Simulators are linked: every circuit created within LMS context carries `circuit.orgId` + `circuit.courseId` for filtering.

### LMS Features (All Included — V4.0)

| Category | Feature | Notes |
|----------|---------|-------|
| **Roster** | Bulk CSV import, invite codes, domain-restricted signup, suspend/transfer |  |
| **Courses** | Create/edit/archive, cover image, description, tags, visibility, prerequisites |  |
| **Lessons** | Markdown + embedded circuit (read-only or forkable), video embed, files | Reuse Astro guide content as lessons |
| **Assignments** | Title, instructions, due date, max attempts, rubric, attach starter circuit, attach procedural template (exam variant per student) |  |
| **Exams** | Timed, procedural variant per student (see §18), auto-submit on timeout, lockdown option (no palette hints) |  |
| **Submission** | Student forks starter circuit → edits → submit. Server runs `simulate()` + declarative validator (from `domain/challenges/declarative`) → auto-score |  |
| **Grading** | Auto-score + instructor manual override, rubric points, letter grade, feedback thread, grade history |  |
| **Gradebook** | Spreadsheet view per class: rows students, cols assignments, avg, weighted categories, export CSV, letter curve config | Admin-editable grading scale |
| **Analytics** | Per student: progress, time-on-task, attempts, hint usage. Per class: completion funnel, avg score, struggling students flag (score < threshold) | PostHog + DB views |
| **Attendance** | Instructor marks present/absent/late per session |  |
| **Certificates** | Auto-issue on course completion (configurable threshold), PDF with verify token, public verify page |  |
| **Announcements** | Institution/course/class announcements → notifications + email |  |
| **Discussions** | Per-course forum (reuses community `posts` scoped to `courseId`) |  |
| **Calendar** | Due dates, exam windows, institution events |  |
| **Files** | Course file storage (R2) |  |

All above are **admin-configurable**: grading scales, rubric templates, certificate designs are rows in `app_config` / `certificates_templates`, not code.

---

## 12. Dashboards

### A) Personal Dashboard (`/dashboard`) — for `individual` / unauthenticated-then-signed-up

- XP/Level ring + streak + quests
- Recent circuits (own + forked), continue editing
- Recommended: next challenge, daily game, community highlights
- Achievements / badge shelf
- Pro upsell card (if `free`) — shows locked pro features with preview, not paywall spam
- Community feed snippet (following)

### B) LMS Dashboard (`/lms` + `/lms/institution/[slug]`)

**Student view:**

- My classes, upcoming assignments (due countdown), overdue banner
- Grades sparkline, attendance
- Class announcements, instructor feedback inbox
- Quick `Open Lab` button that opens simulator **scoped to assignment** (starter circuit preloaded, submit CTA)

**Instructor view:**

- Classes overview, at-risk students (auto-flagged)
- Assignments needing grading (queue count)
- Gradebook button, analytics charts (completion, avg score, time-on-task)
- Create assignment / invite students CTAs
- Procedural exam monitor (see which variant each student got, audit seed)

**Institution Admin view:**

- All courses/classes, member management, billing/seats, institution settings, analytics rollup

**Routing logic:** `middleware` checks `member` rows. If user has any active `enrollment` → show LMS entry in nav + default dashboard is LMS. If none → personal dashboard. Toggle available if both exist (e.g., pro individual who also is student somewhere).

---

## 13. Community / Social Network

Like **GitHub × Instagram for circuits**.

### Entities (see schema §9)

- **Post** — optional `circuitId` embed (live interactive preview, not screenshot). Body supports markdown + @mentions.
- **Circuit publication** — `circuits.visibility = 'public'` → appears in `/feed` and `/explore`.
- **Fork** — `circuits.forkedFromId` chain, like GitHub fork. Fork preserves attribution.
- **Follow** — `follows` table, feed ranked by `following` + recency + engagement.
- **Reactions** — emoji (👏 ⚡ ❤️ 💡), counts.
- **Comments** — threaded (`parentId`), on posts and circuits.
- **Collections** — user-curated circuit sets (e.g., "My Solar Builds") — `collections` + `collection_circuits`.
- **Notifications** — likes, forks, comments, follows, assignment feedback → bell + email digest.
- **Moderation** — `reports` → admin queue, auto-hide threshold, `moderator` role triage.

### Feed & Discovery

- `/feed` — following + recommended (trending, new, top of week)
- `/explore` — search (FTS on title/description/tags), filters (zone, difficulty, pro), sort (recent, likes, forks)
- Hashtags derived from `tags` + auto-tag from components used.

### Integration with Simulator & LMS

- Any circuit can be `Publish to Community` (one click, modal for title/tags/visibility).
- LMS circuits default `visibility='org'` — instructor can feature best student work to public (with consent toggle).
- XP awarded for community engagement (capped, see §10) to encourage quality.

---

## 14. Public Profiles

**Route:** `/u/[handle]` — SSR, SEO, OG cards.

**Content:**

- Avatar, displayName, handle, bio, location, social links, level badge, institution affiliation (if student → shows institution name, not grades)
- Stats: circuits published, followers/following, total XP, badges, streak
- Tabs: Circuits (public), Collections, Liked, Activity timeline
- LMS users: optional `Show my institution` toggle (privacy). Grades never public.
- SEO: `Person` JSON-LD, `og:image` generated via Satori (avatar + level ring + stats).

**Privacy controls** (in `/settings/privacy`): `profileVisibility public|followers|private`, `showInstitution`, `showLevel`, `allowFork`.

---

## 15. Payments

### Providers

| Provider | Status V4.0 | Flow |
|----------|-------------|------|
| **NOWPayments** | ✅ Live | Hosted invoice / IPN webhook → `payments` + `entitlements` |
| **Binance Pay** | ✅ Live | Binance Pay API v3 → create order → webhook → entitlements |
| **Card (Stripe)** | 🚧 Stubbed, flag OFF | Code present (`provider='card'`) + UI shows "Coming soon" — flip `feature_flags.cardPayments` |

### Plans (admin-editable in `app_config.pricing`)

```json
{
  "plans": [
    { "id": "free", "name": "Free", "price": 0, "features": ["basic_sim","community","games"] },
    { "id": "pro_monthly", "name": "Pro Monthly", "price": 9, "currency": "USD", "interval": "month", "features": ["pro_sim","industrial_comps","cloud_sync","private_circuits"] },
    { "id": "pro_yearly", "name": "Pro Yearly", "price": 79, "currency": "USD", "interval": "year", "savings": "27%" },
    { "id": "institution", "name": "Institution", "price": 199, "currency": "USD", "interval": "year", "seats": 50, "features": ["lms","analytics","gradebook"] }
  ]
}
```

**Entitlements table** is source of truth for `isPro`. Middleware + API check it, never client `appMode`.

**Webhooks:** `/api/webhooks/nowpayments` and `/api/webhooks/binance` verify signatures, upsert `payments`, then `upsert entitlements`, then emit `audit_logs`.

**Upgrade UX:** Paywall is soft — pro components show lock icon + tooltip + `Upgrade to use` CTA; simulator runs but blocks simulate/export for pro-only circuits unless entitled (server validates on save/simulation for pro circuits).

---

## 16. Simulator V4 Redesign

### Goals

- Enhanced UI (shadcn, command palette, dock, inspector v2)
- Matter.js for **physical realism** where it aids learning, not gimmick
- New simulator mechanics beyond V3
- Enhanced graphics for all 90 + new components
- Pro gating server-enforced

### UI Enhancements

- **Layout:** Resizable panels (palette left, canvas center, inspector right, log bottom) — state persisted per user in `app_config` or `user_settings`.
- **Component palette:** Search, favorites, recent, zone tabs, drag preview with Matter ghost.
- **Inspector v2:** Tabs (Properties | Wiring | Simulation | Analytics) + live telemetry (voltage/current/thermal) from `simulate()` + quick-fix chips.
- **Command palette** (`⌘K`): component search, actions, recent circuits.
- **Theme:** Light/Dark/System + high-contrast + deuteranopia (keep V3) + admin-addable themes (CSS variables in `app_config.themes`).
- **Mobile:** Bottom dock + gesture support (pinch, long-press context menu) — keep V3 `PhoneDock` but rebuilt with Radix.

### Matter.js Integration

Matter.js runs **alongside**, not inside, the electrical solver. Electrical simulation remains pure `simulate()`; Matter handles **presentation physics**:

| Use | How |
|-----|-----|
| **Cable sag & tension** | Wires are Matter constraints with `stiffness` + `damping`; orthogonal routing still computes path, Matter renders sag for bezier mode. Toggle `Physics: on/off` in settings. |
| **Component collision & snap** | Components are Matter bodies (rectangles `COMP_W×COMP_H`) with collision; drag uses `MouseConstraint`, snap uses Matter `query` for overlap detection. Prevents overlap spam. |
| **Drag inertia** | Subtle inertia on throw (frictionAir 0.08) — feels tactile, not floaty. |
| **Level-up confetti** | Reuse Matter particles for gamification. |
| **Performance** | Matter runs in `requestAnimationFrame`, decoupled from `simulate()` Worker. For >150 components, physics auto-throttles (sleep bodies offscreen via viewport culling). |

**No physics affects electrical result** — `simulate()` still uses graph traversal only. Matter is purely visual/tactile.

### New Simulator Mechanics (beyond V3)

1. **AC Phasor view** — toggle to see live/neutral phasors for AC circuits (teaches phase).
2. **Thermal overlay** — heat map on wires/components (from `thermalData`), animated.
3. **Fault injection lab** — instructor can inject faults (from V3 `faults.ts` 15 types) into student submission for diagnosis tasks — server-validated.
4. **Multi-meter probe** — draggable probe that shows live voltage/current at any port (reads `wireCalculations`).
5. **Time-domain simulation** — for timers/contactors: step-through 0–60s with playhead (new `simulateAtTime(circuit, t)`).
6. **Export bundle** — PDF report with schematic + BoM + compliance checklist (BS7671 citations from `compliance.ts`).

### Enhanced Graphics

- All 90 components re-rendered as **SVG 2.0** with layers: base, terminals, state (on/off/tripped/blown), thermal tint.
- Isometric option for distribution boards (toggle).
- Dark/light variants per component (no more CSS filter hacks).
- Admin can upload replacement SVGs via `components_catalog.graphicsUrl` without code.

### Pro Gating

- `components_catalog.isPro` boolean — server filters palette for free users; API rejects save/simulate with pro components if not entitled.
- Pro sim features: industrial contactors, 3-phase, `appMode==='pro'` stress checks (overvoltage/overload/busted wires) — now server-flagged via entitlements, not localStorage.

---

## 17. Wiring Games

**Simulator = free-form lab. Games = guided puzzles.** Shared domain + procedural engine, separate UX.

### Game Types (procedurally generated)

1. **Wire-Up** — given components + target (e.g., "light the hallway with two-way switching"), player wires it. Auto-validated via declarative rules.
2. **Fault Hunt** — pre-wired circuit with hidden fault, diagnose with limited meter probes.
3. **Speed Wire** — timed, streak multiplier, Matter physics on.
4. **Load Balancer** — distribute loads across phases without overload.
5. **Compliance Check** — spot BS7671 violations.

### Mechanics

- Each game is a `procedural_templates` row with `generatorConfig` (difficulty, zones, constraints).
- Daily challenge + infinite practice.
- XP + streak + leaderboard per game.
- LMS can assign game as homework: `assignments.proceduralSeed` ensures variant but same difficulty.

### UI

Full-screen game canvas (reuses `CircuitCanvas` but with game HUD: timer, moves, hints, objective checklist). Separate route `/games/[slug]`.

---

## 18. Procedural Engine

**Single engine, three consumers: homepage, games, LMS exams.**

### Design

```ts
// packages/procedural-engine/index.ts
export interface ProceduralTemplate {
  id: string;
  type: 'homepage' | 'game' | 'exam';
  generator: (seed: string, params: Params) => Circuit;
  validator: (circuit: Circuit) => ValidationReport;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

// Deterministic PRNG (mulberry32 or xoshiro128**)
export function createRng(seed: string): () => number;
export function generateCircuit(template: ProceduralTemplate, seed: string): Circuit;
export function generateExamVariants(templateId: string, studentIds: string[]): Map<userId, Circuit>;
```

**Seed sources:**

- Homepage: `seed = date + sessionId` — different hero circuit per visit, SSR with `seed` in URL for share.
- Games: `seed = dailySeed` (server cron rotates at UTC midnight) + `userId` salt for practice.
- Exams: `seed = HMAC(courseId + assignmentId + userId + secret)` — deterministic, auditable, different per student, same difficulty. Stored in `procedural_seeds` for grade audit.

**Homepage use:** Hero section renders a live mini-simulator with procedurally generated circuit (e.g., "Circuit of the Day") — auto-simulates, shows energized animation. Refresh = new seed.

**Admin control:** `procedural_templates.generatorConfig` is JSON edited in admin panel (no code). Example: `{ "zones": ["lighting","sockets"], "maxComponents": 8, "mustInclude": ["mcb"], "faultInjection": false }`. Engine validates config with zod before saving.

**Audit:** For exams, `procedural_seeds.generatedCircuitJson` + `seed` stored; instructor can replay any student's variant. Plagiarism check compares circuit graph edit distance.

---

## 19. Admin Panel

**Route:** `/admin` — `super_admin` + `admin` only (middleware + RLS).

### No Hardcoding — Everything Configurable

| Domain | Admin Edits | Storage |
|--------|-------------|---------|
| **Components** | Add/edit/disable, set `isPro`, upload SVG, edit Matter body | `components_catalog` |
| **Electrical standards** | Cable tables, derating, BS7671 prose, compliance rules | `electrical_standards` |
| **Pricing & plans** | Prices, intervals, features, seat counts | `app_config.pricing` |
| **Levels & XP** | Curve, thresholds, rewards, badge criteria | `levels`, `badges`, `app_config.levelCurve` |
| **Quests & challenges** | Create quests, set criteria, schedule | `quests` |
| **Procedural templates** | Create/edit generator configs, difficulty, zones | `procedural_templates` |
| **Feature flags** | Toggle any feature, rollout %, allowlist | `feature_flags` |
| **Themes** | Add theme (CSS vars), set default | `app_config.themes` |
| **Homepage** | Hero layout, featured circuits, marketing copy | `app_config.homepage` |
| **LMS** | Grading scales, certificate templates, attendance rules | `app_config.lms` |
| **Community** | Moderation thresholds, banned words, rate limits | `app_config.community` |
| **Payments** | Provider keys (via env + UI display), webhook status | `app_config.payments` (keys in env, not DB) |
| **Content** | Guide, glossary, blog (MDX editor) | `app_config.content` or separate `content` table |

**What is mandatory (not editable):** DB migrations, Better Auth schema, RLS policies, API contracts, crypto signature verification, simulation traversal algorithm (though tables it reads are editable).

**UI:** Table + JSON editor + preview. All changes write `audit_logs` and are hot-reloaded via `GET /api/config` (cached 60s, invalidated on write).

---

## 20. UI/UX & Theming

- **Design system:** shadcn/ui + Radix + Tailwind v4 tokens (keep `theme.ts` labGlass tokens, add CSS variables for admin themes).
- **Typography:** Keep current, add display font for marketing hero.
- **Icons:** lucide-react (keep) + custom circuit icons (SVG sprite).
- **A11y:** Keyboard shortcuts, ARIA for canvas (SVG titles), high-contrast preserved.
- **PWA:** Keep `vite-plugin-pwa` equivalent for Next (`next-pwa`), offline queue for circuits.

---

## 21. API & Realtime Layer

### REST (Next Route Handlers)

```
POST   /api/auth/*                 # Better Auth
GET    /api/circuits               # list (filters, pagination)
POST   /api/circuits               # create
GET    /api/circuits/:id
PATCH  /api/circuits/:id
POST   /api/circuits/:id/fork
POST   /api/circuits/:id/publish
POST   /api/simulate               # runs simulate() on server (validates pro)
GET    /api/profile/:handle
POST   /api/community/posts
POST   /api/lms/institutions
POST   /api/lms/courses
POST   /api/lms/classes/:id/invite
POST   /api/lms/assignments
POST   /api/lms/submissions
GET    /api/lms/gradebook/:classId
POST   /api/payments/create        # returns NOWPayments/Binance invoice URL
POST   /api/webhooks/nowpayments
POST   /api/webhooks/binance
GET    /api/config                 # public app_config (filtered)
GET    /api/procedural/generate
```

### Realtime (Workers Durable Objects)

- Presence (who's online in class)
- Live gradebook updates
- Community feed live insert
- Circuit collaborative cursor (V4.1)

---

## 22. Migration from V3

1. **Domain package extraction** — copy `src/domain` → `packages/domain` verbatim, add tests, publish internal.
2. **Guest import** — on first login, `POST /api/migrate/guest` sends IndexedDB circuits (JSON) → server validates → creates `circuits` rows. User picks which to import.
3. **Share URL compat** — legacy `#c=<gzip>` still decodes client-side → prompts `Save to cloud?`. New share is `/c/<id>`.
4. **Settings** — `UserSettings` → `users.settings` JSONB + `app_config` defaults.
5. **No data loss** — IndexedDB remains as offline cache; sync via `lastModified` vector.

---

## 23. Testing, Observability, Security, Performance

**Testing:** Vitest (domain), Testing Library (UI), Playwright (E2E including RBAC/LMS/payment webhook mocks), `check:perf` budget 250kB, `benchmark:simulation` CI-gated.

**Observability:** Sentry (client+server), PostHog (product), Cloudflare Analytics, Postgres `pg_stat_statements`.

**Security:** Better Auth sessions (httpOnly, SameSite Lax), CSRF, RLS, rate limit (Upstash Redis or Workers KV), CSP strict (keep V3 `_headers`), webhook signature verify, no secrets in client.

**Performance budgets:** First paint <1.5s, simulate <5ms median (keep V3 2.2ms), Matter throttled >150 bodies, image CDN.

---

## 24. Phased Roadmap (22 Weeks)

| Phase | Weeks | Scope | Exit Criteria |
|-------|-------|-------|---------------|
| **0 — Foundation** | 1–2 | Turborepo + Next.js scaffold, Drizzle + Postgres (Neon), Better Auth + OAuth, middleware RBAC, `packages/domain` extraction, `app_config` + `feature_flags` tables, admin shell | Auth works (signup/login/OAuth), RBAC middleware gates `/admin`, domain tests green |
| **1 — Simulator V4 Core** | 3–5 | Canvas SVG + Matter.js layer, Zustand slice trim, TanStack Query for circuits, cloud persistence (CRUD), pro gating via entitlements, enhanced SVGs (first 30 comps), telemetry inspector | Basic + pro sim parity with V3, cloud save, Matter sag toggle |
| **2 — Profiles + Community MVP** | 6–8 | `profiles`, `posts`, `circuits` public, `follows`, `reactions`, `comments`, `/feed`, `/explore`, `/u/[handle]`, notifications, moderation queue | Publish/fork/comment/flow works, public profile SEO |
| **3 — Gamification** | 9–10 | `levels`, `xp_events`, `badges`, `streaks`, `quests`, leaderboards, XP on sim/publish/game, level-up UI, badge cabinet | XP awarded server-side, level curve admin-editable, leaderboards |
| **4 — Procedural Engine** | 11–12 | `procedural-engine` package, `procedural_templates/seeds`, homepage variant, game generator (Wire-Up + Fault Hunt), exam variant HMAC | Homepage different per visit, daily game, exam variants auditable |
| **5 — Games** | 13–14 | `/games/*` routes, game HUD, daily challenge, XP integration, game analytics | 5 game types playable, procedural daily |
| **6 — LMS** | 15–18 | Institutions (org plugin), courses/classes/enrollments, assignments/submissions (with procedural exam), gradebook, analytics, attendance, certificates, roster CSV, scoped simulator | End-to-end: institution signup → invite → assignment → submit → grade → gradebook |
| **7 — Payments + Pro Polish** | 19–20 | NOWPayments + Binance Pay invoices + webhooks, `entitlements`, paywall UX, card stub, institution seat billing, remaining 60 component SVGs, thermal/phasor overlays, export PDF | Crypto checkout → pro unlock, institution billing, all pro features gated |
| **8 — Hardening & Launch** | 21–22 | Guest migration, share URL compat, PWA offline queue, perf budgets, E2E (RBAC/LMS/payments), SEO, CSP, Sentry, docs, marketing site cutover | `npm run verify` + `e2e:production` green, V3 → V4 migration tested |

**Post-V4.1 backlog:** SCORM, collaborative cursors, pgvector recommendations, Capacitor mobile, AI tutor proxy.

---

## 25. Open Questions For You

Please confirm so the plan can be locked to implementation:

1. **Institution pricing:** Is `institution` plan per-seat or flat with seat cap? Should students pay or institution pays for seats?
2. **OAuth providers:** Google + GitHub + Discord — add Microsoft (for .edu) or keep 3?
3. **Card payments:** Confirm deferring Stripe to V4.1 is okay, or should stub be hidden entirely in V4.0 UI?
4. **Matter.js scope:** Sag + collision + drag inertia — any physics you *don't* want? Should physics ever affect simulation result? (Proposed: never.)
5. **Exam strictness:** Timed + lockdown (no hints) or allow hints with penalty? How long is exam window?
6. **Community moderation:** Pre-moderation for circuits or post-moderation with reports? Who can moderate besides admins?
7. **Certificates:** PDF design — use institution logo + signature? Blockchain verify or simple token URL?
8. **Data residency:** Postgres region preference (EU/US) for institutions?
9. **Legacy URL:** Keep `#c=<gzip>` forever or sunset after migration banner (e.g., 6 months)?
10. **Admin granularity:** Should instructors be able to edit `components_catalog` or only super_admin?

---

### Next Step

Reply with answers to §25 (or “approve as proposed”) and I’ll convert this plan into `TRACKING.md` tasks + scaffold the monorepo (Phase 0). If you want a different framework (e.g., keep Vite SPA instead of Next.js), say now — it changes Phase 0.

*File saved at `docs/REWRITE_PLAN_V4_FULL.md` — also ready to be split into GitHub issues per phase.*
