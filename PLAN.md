# ElectraSim v3 — Full Platform Rewrite Plan

> **Status:** Audit-backed architecture and active greenfield implementation; the schema-v2 kernel now powers a free-form topology-aware SVG editor with validated authoring commands, regional protection/fault evidence, persistent layouts, and deterministic animation.
> **Date:** 2026-09-24
> **Meaning of “full rewrite”:** v3 is a greenfield implementation from line 1. The v2 repository is a behavioral reference and migration source, not the foundation of the new runtime. Reusable electrical rules, content, and assets may be ported only through reviewed contracts and parity tests.
> **Evidence:** The source architecture, domain, tests, content, and rendered desktop/tablet/phone UI were reviewed in [`docs/audits/V3_CODEBASE_UX_AUDIT.md`](./docs/audits/V3_CODEBASE_UX_AUDIT.md). Typecheck and lint passed; 1,464 tests across 97 files passed. Chromium captures are stored with the audit.
> **Previous plan:** Archived at [`docs/archive/PLAN-v2-legacy-2026-09-24.md`](./docs/archive/PLAN-v2-legacy-2026-09-24.md).

---

## 1. Product vision

ElectraSim v3 will be one coherent electrical-learning platform with six connected products:

1. **Electrical simulator** — a precise, interactive circuit-authoring and fault-simulation workspace.
2. **Wiring games** — goal-driven games that teach practical wiring; separate from the free-form simulator.
3. **Individual learning product** — self-directed courses, progression, achievements, and a calm personal home.
4. **Multi-tenant LMS** — institutions, classes, curriculum, assignments, exams, gradebook, analytics, and standards-based integrations.
5. **Community** — public profiles, publishing, circuit sharing, one-way follows, a news feed, public/private groups, and moderation; no direct messaging or chat.
6. **Commercial platform** — free and Pro individual plans plus institution plans, initially paid through supported crypto processors. Card payments remain explicitly deferred.

The platform must be safe, accessible, auditable, tenant-isolated, and useful on desktop and tablet. It is an educational aid, not a substitute for local electrical regulations, supervised practical training, or a qualified electrician.

---

## 2. Product rules and scope boundaries

### 2.1 Locked principles

- **Greenfield v3:** do not gradually turn the current SPA into the new platform.
- **Modular monolith first:** one deployable backend with strict module boundaries; split services only when measured scale or isolation requires it.
- **PostgreSQL is the source of truth:** browser storage is a cache/offline workspace, never the authority for identity, grades, payments, or entitlements.
- **Tenant-aware authorization on every request:** authentication is not authorization.
- **Server-authoritative outcomes:** grades, exam state, XP, achievements, entitlements, and payment fulfillment are calculated or verified by trusted server code.
- **Simulator and games are different products:** they may share circuit schemas, electrical rules, rendering primitives, and procedural generation.
- **Matter.js is not the electrical solver:** it supplies 2D rigid-body mechanics for game interactions and selected physical demonstrations. Electrical behavior remains a deterministic domain engine.
- **Simulation animation is mandatory:** v3 must visibly animate electrical state, protection operation, thermal stress, faults, and physical outcomes. Animation is a launch requirement—not optional polish and not a scope-cut candidate. The implementation may combine SVG, Canvas/WebGL, Web Animations, and Matter.js according to the behavior being represented.
- **Free basics stay genuinely useful:** core circuit building, essential components, basic lessons, basic games, local saves, and public learning content are free.
- **Pro unlocks depth, not safety:** advanced components, advanced analysis, larger workspaces, premium scenarios, cloud history, and premium exports can be gated. Safety messages, accessibility, and required course access cannot be paywalled.
- **Institution assignment overrides plan gating:** a learner must be able to open content their institution licensed and assigned, regardless of their personal plan.
- **Privacy over engagement:** no dark patterns, sale of student data, or public student activity by default.
- **Version everything reproducible:** simulator schemas, content, grading rubrics, generators, seeds, and entitlement rules.
- **Adults only at launch:** onboarding, content, privacy, community, and analytics target users aged 18+; no child/minor account or guardian-consent flows.
- **Multi-standard from day one:** US 110–120 V and international 230–240 V supply families are first-release requirements, with jurisdiction/standard explicitly attached to every circuit and assessed activity.
- **Hosting-independent by contract:** run the primary Bun application as a portable OCI container on a managed PaaS; use Cloudflare only for free DNS/CDN/TLS edge services, never as a product-domain dependency.
- **Mandatory onboarding:** every new account completes role, region/voltage, experience, safety, and accessibility setup before entering the application; contextual guidance continues afterward.

### 2.2 Out of scope for the first production release

- Native iOS/Android apps; ship an installable responsive web app first.
- Real-time Figma-style co-editing.
- Card payments; retain a provider interface and mark Stripe/Adyen as future adapters.
- Cryptocurrency custody, exchange, or wallets. The platform only consumes hosted merchant payment APIs.
- AI-generated assessed circuits without deterministic validation and human-approved templates.
- Assessments for unaffiliated self-directed accounts. Quizzes, assignments, exams, gradebooks, and formal attempts exist only inside an independent-instructor or institution teaching workspace.
- Replacing a school’s existing SIS. Integrate through standards rather than becoming a full student-information system.
- Photorealistic 3D or VR.

### 2.3 “All LMS features” definition for this plan

For planning purposes, “full LMS” means: institutional tenancy and branding; users and cohorts; courses and reusable course templates; modules and prerequisites; pages/files/video/interactive simulator activities; assignment and exam workflows; question banks; rubrics; submissions; attempts; accommodations; gradebook; weighted categories; feedback; announcements; calendar and due dates; discussions; completion tracking; certificates; instructor and administrator analytics; notifications; bulk import/export; audit logs; and standards integrations.

SIS finance, HR, payroll, room scheduling, and admissions are not LMS scope.

---

## 3. User types, workspaces, and application shell

A person has one global account and can belong to zero or more institutions. They do not receive duplicate identities for each school.

### 3.1 Workspace routing (not dashboard grids)

| Context | Default home | Core content |
|---|---|---|
| Visitor | Public home | Product discovery, public circuits, courses, community highlights |
| Independent free user | Personal learner | Continue learning, XP/level, free simulator projects, basic games, community |
| Independent Pro user | Personal Pro | Pro tools, advanced simulator projects, premium games/content, billing |
| Institutional learner | LMS learner | Institution switcher, enrolled courses, assignments, due dates, grades, teacher feedback |
| Instructor/TA | Instructor | Classes, authoring, assignment review, gradebook, learner analytics, interventions |
| Institution admin | Institution admin | Members, roles, cohorts, catalog, licenses, integrations, audit and institution analytics |
| Community moderator | Moderation | Reports, queues, sanctions, appeals, content audit |
| Platform staff | Platform admin | Tenant support, plans, feature flags, system health, compliance operations |

If a user has both personal and institution contexts, the UI exposes an explicit workspace switcher. It must never silently blend institutional grade data into public or personal activity.

### 3.2 Public profiles

Registered users may have a public profile with:

- unique handle, display name, avatar, bio, locale, skills/interests;
- optional verified institution affiliation, controlled by the institution;
- level, selected achievements, published circuits, posts, and follower/following counts;
- privacy controls for each profile section;
- block, mute, report, and profile export/delete controls.

Institutional learners default to a restricted profile. No profile may expose grades, course membership, email, attendance, or private submissions. Launch accounts are adults only.

### 3.3 UX direction derived from the v2 visual audit

The v2 editor is polished but visually dense: two top bars, a left palette, a right icon rail, a minimap, floating canvas tools, console, status bar, and onboarding chip can appear together. v3 must preserve capability while reducing simultaneous choices.

The UI follows these rules:

1. **One platform shell:** the user can always identify the active workspace, location, and account.
2. **One primary action per screen region:** competing blue/green/amber actions are avoided.
3. **Role-aware, not role-fragmented:** the navigation changes by permission, but common concepts keep the same location and labels.
4. **Progressive disclosure:** beginner/default views show core actions; advanced controls are one explicit level deeper and remember user preference.
5. **Task modes instead of plan modes:** Build, Test, Diagnose, and Review affect tools. Free/Pro affects entitlements. Learner/Instructor affects permission. These concepts are never combined into a “Student/Pro” toggle.
6. **No classic dashboard grids:** home screens use an editorial runway, clear next action, and spacious task-focused sections—not walls of KPI cards. Every warning or chart answers “what happened?” and “what can I do next?”
7. **No modal catalog as navigation:** top-level product areas are routes in the shell. The command palette remains an expert accelerator.
8. **Responsive by task:** phone is first-class for learning, dashboards, community, grades, and compact games. Complex circuit authoring is optimized for tablet/desktop with honest guidance rather than pretending all layouts are identical.
9. **Calm electrical language:** blue is the brand/primary-action color; conductor colors are reserved for the circuit; amber means caution; red means danger/error; green means confirmed success. Color is never the only signal.
10. **Mandatory then contextual onboarding:** require initial role, region/voltage, experience, safety, and accessibility setup; afterward teach controls when first needed through short in-context hints.

### 3.4 Global information architecture

```text
Public
├── /                         Home
├── /learn                    Course and learning-path catalog
├── /simulator                Simulator overview and public examples
├── /games                    Wiring game catalog
├── /community                Public discovery feed
├── /circuits/:slug           Published circuit viewer
├── /profiles/:handle         Public profile
├── /institutions             Institution product page
├── /pricing                  Free, Pro, and institution plans
├── /guides /tools /blog      Existing educational content, redesigned in same shell
└── /auth/*                   Sign in, sign up, recovery, SSO

Authenticated platform
├── /app                      Role/context-aware home
├── /app/learn                Personal learning
├── /app/projects             Simulator project library
├── /app/projects/:id         Simulator workspace
├── /app/games                Games, quests, history
├── /app/community            Following/discovery activity
├── /app/notifications        Notification center
├── /app/profile              Private profile/settings
├── /app/billing              Plan, entitlement, orders
└── /app/i/:institutionSlug   Institution workspace
    ├── home
    ├── courses
    ├── courses/:courseId
    ├── calendar
    ├── gradebook             permission-gated
    ├── analytics             permission-gated
    ├── people                permission-gated
    ├── content               permission-gated
    ├── integrations          admin only
    └── settings              admin only
```

Routes have stable breadcrumbs and may be deep-linked. Workspace context is encoded in the route and repeated in the workspace switcher, preventing accidental work in the wrong institution.

### 3.5 Global application shell users will see

#### Desktop (≥1280 px)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ElectraSim  [Personal ▾]   Search / Command…        ?  🔔  [avatar ▾]      │
├───────────────┬────────────────────────────────────────────────────────────┤
│ Home          │ breadcrumb / page title                     page actions   │
│ Learn         │                                                            │
│ Simulator     │ page content                                               │
│ Games         │                                                            │
│ Community     │                                                            │
│────────────── │                                                            │
│ Institution   │                                                            │
│  Courses      │                                                            │
│  Calendar     │                                                            │
│  Gradebook*   │                                                            │
│  Analytics*   │                                                            │
│────────────── │                                                            │
│ Pro / plan    │                                                            │
│ Settings      │                                                            │
└───────────────┴────────────────────────────────────────────────────────────┘
```

- Left navigation is 240 px expanded and 72 px collapsed.
- Learners never see empty administrator sections.
- Institution links appear only while an institution workspace is active.
- Search opens a command/search surface for courses, projects, people (within permission), circuits, help, and actions.
- Notifications are grouped as Learning, Institution, Community, and System with per-group preferences.
- Plan state is a small account item, not a permanent upsell banner.

#### Tablet (768–1279 px)

- Navigation collapses to an icon rail or temporary drawer.
- Page actions remain in a sticky title row.
- Tables become card/table hybrids with essential columns pinned.
- The simulator uses collapsible library and inspector drawers, never both fixed open below 1100 px.

#### Phone (<768 px)

- Top bar: workspace switcher, title, notifications/avatar.
- Bottom navigation: Home, Learn, Create, Community, More.
- “Create” opens Simulator Project or Wiring Game depending on entitlement/device capability.
- Institution course context replaces bottom navigation during a lesson/exam to reduce distraction.
- Gradebook, analytics, and rosters use summaries and drill-down cards rather than compressed desktop tables.

### 3.6 Public homepage and procedural composition

The stable homepage skeleton is:

1. Header: Product, Learn, Community, Institutions, Pricing, Search, Sign in, Start free.
2. Hero: one outcome-focused statement, “Start learning free” primary CTA, “See institution demo” secondary CTA, live circuit visual.
3. Role paths: “I’m learning”, “I teach”, “I manage training”.
4. Interactive proof: small playable circuit or generated challenge preview.
5. Product pillars: Simulator, Wiring Games, LMS, Community.
6. Learning-path recommendations.
7. Public circuits/community highlights.
8. Institution evidence and standards/integration section.
9. Free vs Pro comparison with plain limits.
10. Safety statement, educational content, footer.

The procedural engine may vary approved hero artwork, demonstration circuit, featured learning path, public circuits, and section ordering inside bounded slots. It must not vary navigation, pricing facts, legal/safety content, heading hierarchy, or core CTA labels. Server rendering uses a session/day seed so content does not jump after hydration.

The v2 blocking “development paused” announcement is removed. Future announcements use a dismissible, non-blocking banner unless service/safety requires interruption.

### 3.7 Authentication and onboarding screens

#### Sign up

One centered card, no marketing carousel:

- Continue with Google
- Continue with Microsoft
- Continue with email
- Sign in link
- Terms/privacy acknowledgement
- institution invitation context when applicable

Email signup asks for email first, then verification, then display name/handle. Password or passkey setup is offered without forcing both. CAPTCHA must not require cognitive puzzles.

#### First successful login

Onboarding is mandatory and uses a short, resumable five-step flow:

1. “What brings you here?” — Learn on my own / Teach independently / Join or manage an institution.
2. Confirm adult eligibility and accept safety/terms notices.
3. Electrical experience — New / Student or apprentice / Working professional.
4. Region and supply family — US 110–120 V or international 230–240 V, suggested from locale but explicitly confirmed.
5. Accessibility/display preferences, with safe defaults and a skip-for-now choice for optional settings only.

The user cannot bypass required identity, adult, safety, and region fields. Completion lands on a useful home with one recommended next action. Profile biography and optional interests happen later. The HTML prototype demonstrates this gate.

#### Institution signup

A staged flow:

1. Organization identity and verified work email.
2. Institution type, country/timezone, approximate learners.
3. Create workspace and choose trial/request-demo path.
4. Invite colleagues or skip.
5. Create first course from template or blank.

Progress is saved. Legal/billing setup is separated from curriculum setup.

### 3.8 Independent learner home

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Good evening, Ayesha                         Level 7  ▰▰▰▰▱  1,840 XP │
│ [Continue: Domestic Wiring Basics · Lesson 4]              68%       │
├──────────────────────────────────────┬───────────────────────────────┤
│ Your week                            │ Next up                       │
│ 3 learning days · 2 skills improved │ • Finish ring/radial lesson   │
│ simple weekly progress chart        │ • Daily fault challenge       │
├──────────────────────────────────────┴───────────────────────────────┤
│ Recent projects: project cards with thumbnail, sync state, modified │
├──────────────────────────────────────┬───────────────────────────────┤
│ Active learning paths                │ Quests & achievements         │
├──────────────────────────────────────┴───────────────────────────────┤
│ From people you follow / recommended public circuits                │
└──────────────────────────────────────────────────────────────────────┘
```

Priorities: continue learning, next concrete task, recent projects. XP is visible but does not dominate. New users see a “Build your first protected lamp” starter card instead of empty charts. Free limits appear only near the relevant action, with a comparison that explains the value of upgrading.

### 3.9 LMS learner home

The active institution name and course identity are explicit.

Top section:

- “Continue” for the most relevant lesson/attempt;
- due soon list grouped by Today, This week, Later;
- announcements requiring acknowledgement;
- current courses with progress and instructor.

Secondary section:

- recently returned feedback;
- grades summary if the course permits it;
- calendar;
- institution-specific achievements/skill mastery;
- personal workspace switch link.

There is no public community feed inside the course workspace. Institution discussion and public community remain visually and permission-wise separate.

### 3.10 Instructor workspace home

The instructor landing screen answers four questions:

1. What needs attention now?
2. Which learners need help?
3. What must I grade?
4. What is happening in my courses?

Layout:

- queue cards: ungraded submissions, accommodation requests, flagged generation failures, learner questions;
- course/section picker and period filter;
- “Needs attention” list with reason and suggested action, never only a risk score;
- recent assignment performance with score distribution and common electrical misconceptions;
- quick actions: Create assignment, Open gradebook, Publish class announcement, Preview as learner;
- integration/sync warnings shown only when actionable.

Charts use plain bars/lines, explanatory labels, and a textual takeaway. No decorative gauges.

### 3.11 Institution administrator home

- tenant health: active learners/seats, active courses, instructor adoption;
- onboarding checklist until setup is complete;
- roster/import/SSO/integration status;
- license and payment state;
- aggregate completion and mastery trends with privacy suppression;
- audit/security alerts;
- quick actions: Add people, Create term, Configure SSO, Export data.

Administration uses a dedicated Settings area with tabs for General, Branding, Academic structure, Roles, Authentication, Integrations, Data & privacy, Billing, and Audit log. Dangerous controls are not mixed with ordinary branding settings.

### 3.11a Platform administration and Content Studio

The platform-operations surface is separate from institution administration and is capability-filtered rather than a single unrestricted super-admin dashboard. It deliberately avoids the generic persistent left sidebar. A horizontal electrical **switchboard bus** exposes only authorized stations—Operations, People, Institutions, Content, Trust, Billing, and Audit—while the main surface is a chronological decision ledger and contextual workplane. Healthy systems stay quiet; exceptions explain impact, evidence, and the safest next action. Keyboard command search provides direct expert navigation without making discoverability depend on memorized shortcuts. High-risk actions require MFA, fresh step-up, confirmation, a reason, and immutable audit/outbox records.

Content uses the focused first-party studio specified by ADR 0013. Existing owner-authored Markdown posts are imported with unchanged author/byline, original dates, slugs, metadata, and canonical history. Editors create immutable revisions and preview them; only `platform.content.publish` can change the public revision. Draft, review, scheduled/published, archived, redirect, localization, media, and revision-restore workflows are supported. The Content Studio is deliberately not a generic page builder and does not edit LMS courses, community posts, assessment evidence, or simulator definitions.

Super administrator is a bounded break-glass/owner role, not database root in a browser. It cannot reveal credentials or secrets, execute arbitrary SQL, silently impersonate users, erase immutable audit/financial/assessment history, rewrite credited authorship without an audited revision, or bypass safety review. Routine content, support, billing, moderation, and audit work uses their narrower platform roles.

### 3.12 Course and lesson experience

#### Course home

- course title, instructor, progress, and next item;
- module outline with prerequisites, due states, and completion;
- tabs: Overview, Modules, Assignments, Grades, Discussions, People (permission-based);
- instructor-only Edit course action clearly separates authoring from learner preview.

#### Focused lesson player

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Course > Module 2 > Protective devices             Save / Exit      │
├──────────────────┬──────────────────────────────────────────────────┤
│ lesson outline   │ lesson content                                   │
│ ✓ prior item     │ heading, short content, diagram/video            │
│ ● current item   │ embedded interaction or simulator                │
│ ○ next item      │ notes/transcript/help                            │
├──────────────────┴──────────────────────────────────────────────────┤
│ Previous                               Mark complete / Continue      │
└─────────────────────────────────────────────────────────────────────┘
```

Distraction is minimized: no public feed, global quest popups, or promotional upsell during required coursework.

### 3.13 Course authoring UI

Desktop uses a three-column authoring workspace:

- left: module/item outline with keyboard reorder alternatives;
- center: selected content editor and preview;
- right: settings for availability, prerequisite, completion, outcomes, and grading.

Top actions: Save draft, Preview as learner, Publish. Publish opens a concise impact summary: changed items, affected learners, due-date changes, and accessibility blockers.

Simulator assignment authoring is a guided builder:

1. learning outcome and instructions;
2. starting circuit/template;
3. allowed/required components and actions;
4. success criteria/rubric;
5. attempts, hints, timing, accommodations;
6. generate and inspect sample variants;
7. learner preview;
8. publish.

### 3.14 Gradebook UI

Desktop gradebook is a virtualized grid with:

- sticky learner names and assignment headers;
- status icon + text for missing, late, exempt, submitted, graded;
- keyboard navigation and screen-reader table semantics;
- filters for section, assignment group, status, and learner;
- a right detail drawer for submission evidence, circuit revision, rubric, feedback, and grade history;
- Draft/Posted state always visible;
- “Explain total” opens the exact weighted calculation.

Phone does not shrink the grid. It shows assignment summary cards, then learner/submission detail.

### 3.15 Simulator project library

Before entering the editor, users see Projects:

- New project button;
- search and filters: Mine, Shared, Institution, Published, Archived;
- grid/list cards with circuit thumbnail, title, standard, owner, modified time, sync/share status;
- starter templates and recent projects;
- storage quota shown quietly near usage, not as a constant alert.

Opening an assignment always creates or resumes the assignment-bound attempt rather than silently editing the learner’s personal project.

### 3.16 Simulator workspace UI

#### Desktop

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Projects / Kitchen sockets     Saved ✓    Share   Validate   [Run ▶]     │
│ Assignment: Unit 3 practical · Attempt 1 of 2 · Due Fri  (when applicable) │
├───────────────┬───────────────────────────────────────────┬─────────────────┤
│ COMPONENTS    │                                           │ INSPECTOR       │
│ Search…       │              CIRCUIT CANVAS               │ Selection       │
│ Essentials    │                                           │ Properties      │
│ Protection    │  contextual floating tool strip only      │ Connections     │
│ Switches      │  when an object/port is selected          │ Measurements    │
│ Loads         │                                           │                 │
│ [Advanced ▸]  │                                           │ [Advanced ▸]    │
├───────────────┴───────────────────────────────────────────┴─────────────────┤
│ Mode: Build | Test | Diagnose     Issues 2   Zoom 100%   Sync: Saved        │
└─────────────────────────────────────────────────────────────────────────────┘
```

Changes from v2:

- one editor header instead of a global top command row plus context row;
- project breadcrumb and saved/sync state are always visible;
- standard/supply settings move to Project settings, not the main command row;
- Free/Pro is removed as an editor mode;
- Validate is secondary; Run is the single primary action;
- right rail icons become labeled tabs in the open inspector and tooltips/accessible names when collapsed;
- console becomes an Issues/Events drawer opened on demand;
- minimap appears only for circuits exceeding the viewport threshold;
- tour invitation does not float persistently over the canvas;
- component cards use readable names, consistent vector thumbnails, favorites/recent items, and locked-feature explanation;
- selected-object actions are contextual instead of permanently occupying canvas space.

#### Task modes

- **Build:** place, wire, arrange, label, configure.
- **Test:** connect instruments, run/pause/step, inspect current/voltage/power.
- **Diagnose:** symptom, evidence notebook, permitted tests, fault reporting and repair.
- **Review:** read-only annotations, rubric evidence, revision comparison.

Mode changes preserve the circuit and alter only available tools/panels. Assignment policy can lock the mode sequence.

#### Beginner layer

- Essentials component group only by default;
- click-source/click-destination wiring with valid targets highlighted;
- plain-language inspector;
- one issue at a time with “Show me where”;
- instrument presets;
- optional guided checklist.

#### Advanced layer

- full catalog, cable properties, installation method, curves, standards references;
- diagnostics overlays, fault injection, scope/history, batch selection, alignment, reports;
- persistent advanced panel preference per user, not per plan.

Entitlement locks specific capabilities inside the advanced layer and explains why; it does not turn the whole UI into a different product.

#### Tablet

- canvas fills the screen;
- component library is a left drawer, inspector a right drawer;
- only one drawer open at a time;
- bottom mode/status strip;
- 44 px preferred touch targets and pen-friendly ports.

#### Phone

- default route is a circuit viewer with fit-to-circuit, pan/zoom, run/pause, switch operation, issue summary, and comments/review evidence;
- simple lesson circuits and selected wiring games may enable editing;
- full editor opens only after an honest “Best on tablet or desktop” message with Continue and Send/open elsewhere options;
- component placement uses a full-height bottom sheet and tap-to-place flow;
- inspector uses a bottom sheet;
- the initial camera fits the active circuit legibly rather than displaying tiny components in a large empty canvas.

### 3.17 Wiring game UI

Games do not open the general editor chrome.

```text
┌────────────────────────────────────────────────────────────────────┐
│ Exit   Mission: Restore the hallway light       Safety ×1  02:14  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                         GAME STAGE                                 │
│             board, tools, Matter.js interactions                  │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ Objective: Isolate → test → repair        Notebook   Hint (2)      │
└────────────────────────────────────────────────────────────────────┘
```

- pre-game screen: objective, learning outcome, controls, accessibility options;
- in-game: one compact status header, stage, and objective/tool tray;
- pause: resume, restart, controls, exit;
- result: correctness and safety first, then efficiency/time, XP, mistakes, and recommended lesson;
- exam game: no XP animation, community links, or unrelated notifications.

### 3.18 Community UI

#### Discovery

- tabs: Following, Discover, Circuits, Groups;
- feed cards show author, context, text, safe media/circuit preview, reaction/comment/save controls;
- filters are explicit and resettable;
- public circuit preview runs read-only and opens details without loading the full editor.

#### Composer

A simple text composer with Add circuit, Add image, Audience, and Publish. Institution/course audiences are clearly labeled and cannot accidentally become public.

#### Public profile

- header: avatar, display name/handle, bio, skill tags, follow/block/report;
- selected achievements and level;
- tabs: Circuits, Posts, Collections, About;
- institution affiliation appears only when verified and permitted;
- empty/private states explain what is visible.

#### Moderation

Report flow asks category, optional detail, block/mute choice, and confirmation. Moderator UI shows queue, evidence snapshot, policy, action history, and appeal state. It never exposes unrelated private LMS data.

### 3.19 Billing and upgrade UI

Pricing presents Free, Pro, and Institution using task-based differences rather than a long feature wall. Inside the app:

- locked action opens a side sheet explaining the capability, plan, institution-license possibility, and upgrade path;
- checkout shows product, duration, fiat reference price, selected crypto asset/network, exact amount, expiry, and confirmation status;
- user is sent to hosted provider checkout or QR/deep link;
- returning from provider shows Pending until a verified webhook confirms payment;
- order history exposes transaction/provider IDs, state timeline, receipt, support, and refund state;
- card payment is visibly “Not available yet”, not a disabled form collecting details.

### 3.20 Design system

Visual direction: evolve the current clean blue “electrical lab” identity rather than replacing it with a generic LMS.

- **Typography:** highly legible sans-serif for UI; monospace only for electrical values, IDs, and measured data.
- **Surfaces:** neutral white/slate with restrained elevation; dark mode uses layered slate, not pure black everywhere.
- **Brand:** electric blue primary; cyan accent sparingly.
- **Semantics:** success green, caution amber, destructive/error red, information blue.
- **Circuit conductors:** jurisdiction-specific and isolated from general UI semantic color tokens.
- **Spacing:** 4 px base; dashboard cards 16–24 px padding; touch controls target 44 px where practical and never below WCAG minimum/spacing rules.
- **Radius:** 8 px controls, 12 px cards, 16 px dialogs/sheets. Avoid making every container a pill.
- **Motion:** 120–200 ms for UI state; circuit/game motion can be richer but honors reduced motion.
- **Icons:** one consistent SVG family; every icon-only action has tooltip and accessible name.
- **Charts:** bars/lines first; no 3D charts, ornamental gauges, or color-only legends.
- **Empty states:** explain why empty, provide one primary next action, and show an example only when useful.
- **Loading:** preserve layout with skeletons for lists/cards; use determinate progress for imports/generation when known.

### 3.21 Accessibility acceptance criteria

- WCAG 2.2 AA for all launch routes.
- Complete keyboard workflows for dashboards, course authoring, gradebook, and simulator fundamentals.
- Every drag operation has click/tap/keyboard alternative: move, connect, reorder, resize where applicable.
- Visible focus is never obscured by sticky headers, drawers, or bottom bars.
- Screen-reader circuit outline exposes components, ports, connections, state, issues, and actions.
- Status never relies on conductor/semantic color alone.
- Captions/transcripts and alt text are enforced in LMS publishing workflow.
- Authentication supports paste/password managers/passkeys and avoids cognitive puzzles.
- Reduced motion, 200% zoom, 400% reflow where applicable, high contrast, and color-vision-safe circuit presets are tested.

### 3.22 UX validation before implementation lock

Build interactive prototypes and test these tasks with at least five participants per primary role where feasible:

- independent beginner starts and completes first protected-lamp activity;
- returning learner finds due work and instructor feedback;
- instructor creates a simulator assignment and understands generated variants;
- instructor grades a circuit and explains the calculated total;
- institution admin imports users and diagnoses one failed row;
- user creates, saves, shares, and reopens a simulator project;
- phone user views/runs a circuit and finds an issue without attempting tiny-port editing;
- moderator handles a circuit report without seeing LMS-private data.

Track completion, time, errors, assistance, and confidence. Do not approve UI solely from screenshots.

---

## 4. Roles, permissions, and tenancy

### 4.1 Authorization model

Use **RBAC plus scoped attributes**:

- RBAC answers what a role may do.
- Scope answers where it may do it: platform, institution, campus, department, course, section, group, or own resource.
- Attributes handle ownership, enrollment state, assignment dates, age/privacy flags, subscription entitlements, and accommodations.

Do not scatter string role checks such as `role === "teacher"` through handlers. Every protected operation calls a central policy API such as:

```ts
can(actor, "gradebook.entry.update", {
  tenantId,
  courseId,
  sectionId,
  learnerId,
  resourceOwnerId,
})
```

Default deny. All mutation decisions produce structured audit context. PostgreSQL row-level security should provide defense in depth for high-risk tenant tables, but application policy remains the primary authorization layer.

### 4.2 Initial role catalog

| Scope | Roles |
|---|---|
| Global account | `user` (baseline account; capabilities come from ownership, membership, and entitlements) |
| Platform staff | `super_admin`, `platform_moderator`, `support_agent`, `billing_operator`, `content_manager`, `auditor` |
| Independent instructor workspace | `owner_instructor`, `co_instructor`, `grader`, `learner` |
| Institution | `owner`, `institution_admin`, `academic_admin`, `billing_admin`, `data_officer`, `instructor`, `teaching_assistant`, `learner`, `observer` |
| Course | `course_owner`, `instructor`, `grader`, `teaching_assistant`, `learner`, `observer` |
| Community | `member`, `trusted_member`, `moderator`, `community_admin` |

Roles are bundles of versioned permissions. Institutions may create custom roles from an allowed permission set but may not grant platform permissions or bypass plan limits.

### 4.3 High-risk controls

- Step-up authentication for role grants, billing changes, exports, impersonation, and grade overrides.
- Two-person approval for destructive tenant deletion and large institutional exports.
- Support impersonation is time-limited, reason-required, visible to the tenant, and fully audited.
- Grade changes preserve old value, new value, reason, actor, and timestamp.
- Membership and course-role changes invalidate permission caches immediately.
- Automated tests attempt cross-tenant IDOR access for every tenant-bound API family.

---

## 5. Authentication and account lifecycle

### 5.1 Proposed authentication stack

Use **Better Auth 1.7.5**, pinned exactly under accepted ADR 0011, for credential, verification, passkey/MFA, account-linking, and session plumbing. ElectraSim's own identity and authorization packages remain authoritative for mandatory onboarding, workspaces, invitations, tenant/course permissions, platform administration, audit, and support sessions; Better Auth organization-role shortcuts are not the authorization model. Better Auth uses a dedicated least-privilege PostgreSQL role for global auth records because signup occurs before tenant context exists; tenant-owned rows remain protected by forced RLS and the normal application role.

Supported launch methods:

- email and password with verified email;
- Google and Microsoft OAuth when production credentials are configured;
- passkeys/WebAuthn;
- TOTP two-factor plus one-time recovery codes;
- magic link/email OTP only after abuse, enumeration, and delivery-rate gates pass;
- institution OIDC after the core identity slice; SAML 2.0 in the enterprise integration phase.

Session model:

- secure, HTTP-only, SameSite cookies for browser sessions;
- rotating session identifiers and revocation by device;
- CSRF protection on state-changing browser requests;
- short-lived signed tokens only where required for integrations;
- no auth or payment secrets in browser bundles;
- rate limits and risk checks for signup, login, recovery, invitations, and OAuth linking.

### 5.2 Lifecycle requirements

- Signup, email verification, profile setup, consent capture, and optional institution join.
- Invitation links bind to an email or institution policy and expire.
- Account linking requires fresh proof from both identities; prevent OAuth account takeover.
- User can inspect/revoke sessions, export personal data, deactivate, and request deletion.
- Institution offboarding removes tenant access without deleting the global account.
- Data retention distinguishes grades/legal records from deletable public/community content.
- Launch is adults-only (18+); reject under-age signup and do not implement guardian-dependent account flows.

---

## 6. Data platform and proposed technology

### 6.1 Recommended stack

| Layer | Proposal | Notes |
|---|---|---|
| Development toolchain | **Bun** workspaces, package manager, scripts, bundler where suitable, and test runner | Pin Bun; validate compatibility before replacing a specialized tool |
| Type safety | TypeScript strict + `tsc --noEmit` | Bun transpiles TypeScript but does not typecheck it |
| Web application | React + a spike-selected SSR/router framework | Public SEO plus client-heavy simulator/LMS surfaces; framework must expose Web `Request`/`Response` boundaries |
| UI system | Tailwind CSS + accessible owned components + design tokens | WCAG 2.2 AA; electrical-blue tokens retained |
| API/runtime | TypeScript modular monolith served by **Bun** | Web Standards `Request`/`Response` application boundary inside a portable OCI container |
| Primary application hosting | **Managed PaaS**, with Railway/Render selected by a spike | Application host remains replaceable; no PaaS SDK in domain/application packages |
| Edge/CDN | **Cloudflare free DNS/CDN/TLS only** | Cache eligible static/public content; authenticated and sensitive responses are `private, no-store` |
| Database | Portable managed **PostgreSQL** outside Cloudflare | Direct/pool connection; provider selected independently where practical |
| SQL/data access | Drizzle ORM plus reviewed SQL migrations | No hosting-provider assumptions in domain/application code |
| Cache/jobs | Explicit provider-neutral ports | Durable correctness remains in PostgreSQL/outbox state |
| Object storage | S3-compatible storage outside Cloudflare | Assets, course packages, exports, attachments; provider can be replaced |
| Browser/E2E tests | Playwright | Bun test does not replace real-browser testing |
| Search | PostgreSQL full-text first | Dedicated service only after measured need |
| Local editor state | IndexedDB + explicit synchronization protocol | Offline drafts and resumable project sync |
| Email | Provider-neutral transactional email service | Resend preferred at launch; Amazon SES scale/cost alternative; no bespoke mail server |
| Observability | OpenTelemetry, structured logs, traces, metrics, error reporting | Adapter-based and PII-redacted |

**What Bun replaces:** Node/npm/pnpm for most local scripts and package management, Jest/Vitest-style unit tests after parity validation, Vite/esbuild only for bundles Bun can correctly produce, and the primary server runtime. **What it does not replace:** TypeScript typechecking, Playwright/browser engines, PostgreSQL, object storage, durable jobs, or specialized framework compilation. Ship the Bun server in one non-root OCI image and test that image outside the chosen PaaS. Cloudflare does not execute application code in the baseline architecture; it proxies DNS/TLS/CDN traffic to the PaaS origin.

**Email recommendation:** expose one application service (`sendTransactional(template, recipient, data, idempotencyKey)`) with provider adapters. Prefer **Resend** for launch because domain verification, SMTP/API use, and developer operations are simpler; keep **Amazon SES** as the cost/scale alternative once volume and deliverability operations justify its account/quota management. Provider choice is configuration. Do not run a bespoke SMTP server; maintain suppression, bounce/complaint, retry, audit, and template-preview behavior in provider-neutral application contracts.

Before framework lock, run a short spike comparing candidate React SSR/router options in the Bun container and behind the Cloudflare proxy. Select by accessibility, streaming/SEO, bundle budgets, PaaS behavior, testability, and portability—not fashion.

### 6.2 Target repository shape

```text
apps/
  web/                    # public site, role-aware homes, LMS, community
  jobs/                   # durable jobs, imports, notifications, rollups
  realtime/               # optional gateway when needed
packages/
  auth/                   # Better Auth configuration and account lifecycle
  authorization/          # permissions, scopes, policy evaluation
  db/                     # schema, migrations, RLS, fixtures
  contracts/              # API/event schemas and generated clients
  simulator-core/         # deterministic electrical model; no React/DOM
  simulator-runtime/      # worker protocol, persistence, collaboration hooks
  simulator-ui/           # editor and accessible rendering
  physics/                # Matter.js adapter used only for physical mechanics
  procedural/             # seeded generation, constraints, validation
  games-core/             # game rules and scoring
  lms/                    # courses, assignments, exams, grades
  gamification/           # XP ledger, levels, achievements, streaks
  community/              # graph, posts, moderation
  billing/                # plans, entitlements, provider adapters
  analytics/              # event contracts and aggregate queries
  notifications/          # templates, preferences, delivery adapters
  ui/                     # shared design system
  config/                 # lint, TypeScript, test, feature flags
```

No package may import another package’s database internals. Cross-module work uses public service interfaces and transactional domain events.

### 6.3 Core data domains

- **Identity:** user, account, session, credential, passkey, MFA method, consent, device.
- **Tenancy:** workspace, independent-instructor workspace, institution, optional campus/site, department/program, academic term, cohort/group, membership, role, permission, invitation.
- **Learning:** course template, course offering, module, lesson, enrollment, prerequisite, progress.
- **Assessment:** assignment, exam, question bank, item version, attempt, submission, rubric, grade, accommodation.
- **Simulator:** project, circuit revision, component catalog version, simulation run, share/publish state.
- **Games:** game definition version, generated instance, attempt, event stream, score.
- **Gamification:** immutable XP ledger, level policy, achievement grant, streak, season, leaderboard entry.
- **Community:** profile, follow request/relationship, post/publication, attachment, feed item, public/private group and membership, report, block, sanction.
- **Commerce:** product, price, subscription, entitlement, order, payment attempt, provider event, refund.
- **Platform:** notification, audit event, feature flag, integration credential, outbox event.

Use UUIDv7 or equivalent sortable opaque identifiers, UTC timestamps, append-only ledgers for financial/XP records, soft deletion only where recovery or legal policy requires it, and explicit schema/data retention policies.

---

## 7. LMS specification

### 7.1 Teaching workspaces and institution structure

Anyone with a verified adult account may self-register and create an **independent instructor workspace** without pretending to be an institution. It supports courses, invited/enrolled learners, teaching-context assessments, gradebook, and instructor analytics for a single owner or small teaching team. It does not receive institution branding, domain claims, campuses, departmental administration, enterprise SSO, or institution-wide analytics unless upgraded/converted through a reviewed flow.

An **institution** is a tenant and administrative boundary, not merely an instructor profile. Its hierarchy is:

```text
Institution tenant
├── optional campuses/sites
├── optional departments/programs
├── academic terms
├── reusable course definitions
│   └── course offerings/sections (term + instructor + schedule)
│       ├── cohorts/groups
│       ├── enrollments
│       └── assignments/assessments/gradebook
└── institution members and tenant-scoped roles
```

Campuses and departments are optional so a small organization can remain flat. Course definitions hold reusable curriculum; offerings/sections are teachable runs with their own roster, dates, evidence, and grades. A person may hold different roles in different tenants and sections.

- Self-service independent-instructor creation follows verified email and anti-abuse checks. Institution creation is a separate request with organization/domain verification and ownership review.
- Institution profile, logo, colors, locale, timezone, academic calendar, grading schemes, and policies.
- Seat/license management, subscription state, invoice/payment history, and usage limits.
- Add users individually, bulk CSV import, invitation links, verified-domain enrollment, or standards sync.
- Cohorts, departments, campuses, classes/sections, terms, archive/restore, and membership history.
- Custom institution roles with safe permission ceilings.
- Data export, retention settings, audit explorer, integration credentials, and webhook configuration.

### 7.2 Course and content authoring

- Reusable course templates and term-specific course offerings.
- Modules, lessons, outcomes, prerequisites, release rules, due dates, and completion conditions.
- Rich pages, files, images, video embeds, links, simulator templates, wiring games, discussions, assignments, and exams.
- Draft/review/publish workflow with immutable published versions for assessed content.
- Course copy/import/export and a version-aware content library.
- Accessibility checker, alt text, captions/transcripts, keyboard validation, and preview-as-learner.
- Content localization and per-institution overrides without forking the source silently.

### 7.3 Assignments and assessment

Assessments exist **only inside an independent-instructor or institution teaching workspace**. Personal learning may use ungraded practice challenges, but it has no exams, gradebook, formal attempt record, or instructor credential implication.

- Individual and group assignments; simulator build/diagnosis tasks; wiring-game tasks; file/text submissions.
- Question banks with tags, outcomes, difficulty, exposure limits, and version history.
- Item types: multiple choice, multi-select, numeric/tolerance, matching, ordering, short answer, hotspot/schematic, simulator state, fault diagnosis, and practical wiring game.
- Timed and untimed exams, availability windows, attempt limits, access codes, accommodations, pause policy, autosave, resume, and late rules.
- Randomized item selection and procedural circuit generation with equivalent-difficulty constraints.
- Rubrics, anonymous grading option, moderation/second marking, feedback, regrade, and appeal workflow.
- Academic integrity signals without invasive surveillance: focus changes and unusual attempt events may be logged transparently, but no webcam proctoring in the initial scope.

### 7.4 Gradebook

- Points, percentage, pass/fail, letter, standards/outcome, complete/incomplete, and custom schemes.
- Weighted categories, drop-lowest rules, extra credit, missing/exempt/late statuses, and manual columns.
- Draft vs posted grades, scheduled release, per-student override, comments, rubric breakdown, and change history.
- CSV import/export with preview and validation.
- Grade calculations are deterministic, versioned, explainable, and recomputable.
- Instructor sees section and learner detail; learner sees only permitted personal grades; administrators receive aggregate views according to policy.
- Gamification XP is separate from academic grades. Instructors may award course XP, but XP must never silently change the grade.

### 7.5 Communication and engagement

- Announcements, course discussions, direct instructor feedback, calendar, reminders, and digest preferences.
- In-app and email notifications at launch; push notifications later.
- Course groups and office-hour links.
- Moderation controls and retention rules for institution-owned discussion spaces.

### 7.6 Analytics

Instructor dashboard:

- enrollment, active/at-risk learners, completion, time-on-task indicators, attempts, misconception/fault trends, item analysis, score distribution, and standards mastery;
- drill-down from aggregate to permitted learner evidence;
- intervention notes and export with reason/audit trail.

Institution dashboard:

- adoption by course/department, completion, performance trends, seat utilization, content effectiveness, license usage, integration health, and data-quality warnings.

Analytics rules:

- event definitions are versioned;
- raw events are append-only and pseudonymized where possible;
- dashboards identify freshness and sample size;
- no high-stakes automated decision from a single engagement metric;
- users with insufficient sample permission receive suppressed/aggregated results.

### 7.7 LMS interoperability

Deliver in layers:

1. CSV imports/exports and signed platform webhooks.
2. **LTI 1.3 Advantage** as a Tool: Core launch, Deep Linking 2.0, Assignment and Grade Services 2.0, and Names and Role Provisioning Services 2.0.
3. OneRoster 1.2 for roster/course/grade exchange where partner demand justifies certification.
4. QTI import/export for question banks and assessments.
5. SCORM 1.2/2004 package playback and tracking in a sandbox; xAPI/cmi5 ingestion/export where required.
6. SAML/SCIM enterprise provisioning and Caliper Analytics export.

Each integration needs conformance tests, key rotation, replay protection, tenant-scoped credentials, retry/dead-letter behavior, and an administrator health screen.

---

## 8. Gamification and level progression

### 8.1 Systems

- **XP:** awarded from an immutable server ledger for validated learning actions.
- **Levels:** configurable level curve; level is derived from eligible lifetime XP, never stored as an untraceable counter.
- **Achievements:** versioned criteria, rarity, progress, revocation reason, and selected public display.
- **Streaks:** timezone-aware, grace rules, explicit reset behavior, and no punitive loss of earned content.
- **Quests:** daily/weekly/personal/course quests from approved templates.
- **Skill mastery:** separate domain-specific progression for safety, domestic wiring, controls, diagnostics, calculations, etc.
- **Leaderboards:** opt-in global/community boards; institution/course boards controlled by administrators; seasons and privacy-safe display aliases.
- **Rewards:** cosmetics, profile frames, non-safety simulator themes, and content milestones. Do not make learning accuracy pay-to-win.

### 8.2 Anti-abuse and fairness

- Idempotency key for every awardable action.
- Daily caps and diminishing returns for repeatable low-value actions.
- Server verifies simulator/game completion from signed result evidence and challenge version.
- Suspicious award queue, reversal entries rather than destructive edits, and appeal path.
- Accessibility accommodations do not reduce XP or public achievement eligibility.
- Free sandbox exploration awards only capped, one-time discovery milestones (for example first valid powered circuit or first diagnosed fault). Repeating, reopening, or trivially modifying the same circuit yields no additional XP.
- Graded/mastery XP requires a validated guided challenge or a teaching-context activity; ordinary sandbox time and repeated component placement never become an XP farm.
- Instructor/manual XP grants require permission, reason, caps, and audit.

---

## 9. Simulator rewrite

### 9.1 Architecture

The simulator is split into four layers:

1. **Circuit model:** versioned components, terminals, conductors, spatial layout, parameters, annotations, and metadata.
2. **Electrical engine:** graph construction, topology, state propagation, load/voltage/current calculations, protective-device behavior, faults, standards checks, and structured explanations.
3. **Interaction/runtime:** commands, selection, wiring, undo/redo, autosave, worker protocol, import/export, and collaboration-ready operation log.
4. **Renderer/UI:** accessible editor shell, scene renderer, overlays, inspector, instruments, animation, and responsive controls.

The domain and procedural packages must not import React, browser APIs, or Matter.js. Every simulation result includes engine version and input hash.

### 9.2 Electrical mechanics

The rewrite should support progressively:

- DC and single-phase AC fundamentals;
- series/parallel networks and nonlinear/controlled loads where modeled;
- live/neutral/earth continuity and polarity;
- protective conductors, bonding, leakage, and RCD/RCBO behavior;
- overload/short-circuit behavior with time-current curves;
- contactors, relays, timers, sensors, and motor-control logic;
- test instruments with realistic connection and range behavior;
- explicit fault injection: open, short, high resistance, leakage, swapped conductor, stuck contact, nuisance trip;
- three-phase systems only after a reviewed mathematical and safety specification.

Electrical fidelity levels must be explicit: educational approximation, standards-aware calculation, or unsupported. Never imply certification-grade results without validation.

### 9.3 Matter.js integration

Use Matter.js 0.20.x initially behind `packages/physics`; pin the exact patch. Appropriate uses include:

- game-piece movement, snapping, collision, cable/lead feel, tool manipulation, and physical hazards;
- training interactions such as positioning a probe, routing a cable around obstacles, or assembling a board;
- optional visual demonstrations where rigid-body physics improves understanding.

Do not use it to compute current, voltage, resistance, power, breaker trips, or grade correctness. Run physics at a fixed timestep, seed any randomized impulses, serialize only domain-relevant state, and keep it off the React render loop.

### 9.4 Enhanced UI and graphics

- Workbench layout with searchable component library, central canvas, contextual inspector, status/instrument rail, and mode-specific guidance. Component and inspector panels are independently collapsible on desktop and become accessible drawers on constrained screens; collapse state is remembered per user/device.
- Crisp vector component art with state layers; use raster/WebGL effects only where they add value.
- Orthogonal and manual wiring, cable bundles, junctions, labels, layers, snapping, alignment, mini-map, overview, and command palette.
- Multimeter/tester tools, timeline/event log, current/voltage overlays, fault visualization, and explanation panel.
- Mandatory animated state vocabulary: current flow; voltage/energization; heat accumulation and cooling; breaker/fuse/contact movement; lamp/motor/load behavior; intermittent faults; insulation stress; conductor/component damage; de-energization; and repair/replacement. Each animation consumes deterministic domain events and must never invent simulation outcomes.
- Use SVG/Web Animations for ordinary component and conductor state, Canvas/WebGL where particle/scale performance warrants it, and Matter.js only for physical movement such as handles, contacts, loose conductors, tool manipulation, or staged mechanical damage. Matter.js never decides electrical or thermal results.
- Provide real-time, accelerated-time, pause, step, and replay controls where the scenario permits. A long overload must follow protection curves and thermal limits: correct protection normally trips before permanent damage; failed/oversized protection may produce persistent conductor insulation damage, an open conductor, leakage, a configured short, welded contacts, or failed components.
- Reduced-motion mode substitutes clear state transitions and an event timeline; it may reduce nonessential motion but must preserve all fault, safety, and outcome information.
- Keyboard-complete operation, screen-reader circuit outline/tree, high-contrast and color-vision-safe palettes, readable supporting text at normal viewing distance, large touch targets, and RTL readiness.
- Renderer performance target: smooth interaction with at least 500 components/1,000 conductors on reference desktop and a documented tablet budget.
- Never encode conductor state by color alone.

Localization follows ADR 0012: canonical BCP 47 locale resolution uses user, workspace, browser, then English fallback; language remains independent of supply family and standards selection. New UI copy moves into stable catalogs during redesign. RTL affects layout and reading order but never blindly mirrors electrical symbols, terminals, or current direction. Translated safety and assessed content requires bilingual human plus electrical-SME review before publication.

### 9.5 Save, version, and sharing

- Local-first draft with conflict-aware cloud sync for registered users.
- Immutable revisions for submitted/graded work.
- JSON import/export with schema migrations and strict size/content validation.
- SVG/PNG/PDF report export according to entitlement.
- Share links may be private, unlisted, institution-only, or public; revocable and abuse-reportable.
- Forking preserves attribution and source revision.

### 9.6 Free and Pro entitlements

| Capability | Free | Pro / licensed institution |
|---|---:|---:|
| Current-style free sandbox, basic editor, and essential components | Yes, for every registered user | Yes |
| Core electrical simulation and safety feedback | Yes | Yes |
| Local projects | Limited but useful | Expanded |
| Cloud sync/history | Small quota | Expanded history/quota |
| Basic guided lessons and games | Yes | Yes |
| Advanced industrial/three-phase components | No | Yes |
| Advanced diagnostics and instruments | Limited | Full |
| Procedural premium challenge packs | Limited | Full |
| Advanced calculations/standards packs | No | Yes |
| High-resolution/professional exports | Watermarked/basic | Full |
| Institution assignments and required tools | When assigned/licensed | Yes |

All checks use a central entitlement service on both server and client. The client may hide controls for usability but cannot be the enforcement boundary.

---

## 10. Wiring games

Games use simulator concepts but have their own loop, rules, scoring, and content lifecycle.

Initial game families:

- **Connect It:** wire a target circuit correctly with progressively reduced guidance.
- **Fault Hunter:** diagnose one or more injected faults using instruments and evidence.
- **Panel Builder:** place, route, label, and protect circuits under constraints.
- **Sequence Control:** build relay/contactor logic to satisfy an operating sequence.
- **Safety Inspector:** identify hazards and compliance issues in a generated scene.
- **Rapid Restore:** timed troubleshooting with scoring that prioritizes safe isolation over speed.

Every game definition includes learning outcomes, prerequisite skills, generation policy, scoring rubric, hint penalties, accessibility mode, solution verifier, and telemetry contract. Exam mode removes social hints, freezes a content/generator version, and writes an audit trail.

---

## 11. Procedural engine

### 11.1 One engine, separate policy profiles

Build a deterministic generation platform with adapters for:

- homepage composition;
- practice challenges and games;
- quizzes and exams;
- diagnosis/fault scenarios.

Shared mechanics do not mean shared rules. Homepage generation optimizes variety and relevance; assessed generation optimizes validity, equivalence, auditability, and controlled exposure.

### 11.2 Pipeline

```text
request + policy + catalog version
  -> cryptographic/explicit seed
  -> grammar/template selection
  -> constraint solving
  -> candidate circuit/content
  -> electrical simulation
  -> safety and solvability checks
  -> difficulty/features calculation
  -> duplicate/exposure check
  -> signed manifest + explanation/solution
```

The manifest records seed, generator version, catalogs, template, difficulty vector, expected outcomes, answer/rubric, and hashes. A generated item is not served if it fails validation or exceeds generation time; use a prevalidated reserve pool as fallback.

### 11.3 Procedural homepage

“Different on every visit” should mean controlled variation, not random structure:

- Keep navigation, headings, legal links, accessibility landmarks, and core value proposition stable.
- Vary approved hero art, featured circuits, testimonials, learning paths, and community modules.
- Use a session/day seed to avoid content jumping during hydration.
- Render indexable canonical content on the server; do not harm SEO or cumulative layout shift.
- Filter by locale, device capability, plan, age/privacy status, and dismissed content.
- Track variant performance without creating individualized sensitive-data profiles.
- Provide deterministic fallback when the engine is unavailable.

### 11.4 Procedural exams

- Derive a per-attempt seed from a server secret and opaque attempt ID; never expose the secret.
- Blueprint fixes outcomes, component families, fault count, complexity range, marks, and time expectation.
- Equivalence tests compare topology metrics, required reasoning steps, simulator operations, and pilot performance.
- Instructor can preview representative variants and regenerate before publishing, not after a learner starts.
- Freeze generator/catalog/rubric versions for the assessment window.
- Store the exact generated instance for review, appeal, and regrade.
- Do not claim perfect fairness merely because circuits differ; pilot and statistically review item variants.

---

## 12. Community system

### 12.1 Features and follower behavior

Launch scope is intentionally limited to:

- publish text/image posts and safe embedded ElectraSim circuit revisions;
- a news feed populated by followed people and joined groups, with a chronological following view and a separately labeled discovery view;
- public profiles with publishing history and privacy controls;
- public and private groups with owner/moderator/member roles; private-group content never leaks into public search/feed;
- one-way follow relationships: following does not grant friendship, messaging, tenant access, or access to private LMS data;
- public profiles accept a follow immediately; private profiles create a pending request the profile owner may approve or decline;
- follower/following lists obey profile privacy, blocks, suspensions, and account deletion; blocks remove follow relationships in both directions;
- followed people/groups contribute eligible publications to the feed; users can unfollow or leave without notifying a broader audience.

No direct messages, chat, comments, reactions, or social inbox ship in the initial community scope. Course feedback/announcements remain structured LMS features, not community chat.

### 12.2 Trust and safety

- Community guidelines and adult-account privacy defaults before launch.
- Report content/user, block, mute, keyword controls, rate limits, spam detection, and link/file scanning.
- Moderation queues, reason codes, evidence snapshots, sanctions, appeal, and immutable moderator audit.
- Institution moderators only control institution spaces; platform trust-and-safety handles public space.
- Public upload processing strips metadata, validates MIME by content, scans files, and generates safe derivatives.
- No public display of LMS grades, submissions, class roster, attendance, or private instructor feedback.

---

## 13. Plans, billing, and crypto payments

### 13.1 Commercial model

Initial products:

- Free individual.
- Pro individual, monthly or fixed-duration pass depending on provider capabilities.
- Institution plan priced by active seats or contracted band.
- Optional premium content packs only if they do not fragment required learning.

Because crypto recurring billing is not universally reliable, launch with **time-bounded entitlements** and explicit renewal. Do not represent them as automatic subscriptions unless a provider supports approved recurring authorization in the buyer’s region.

### 13.2 Provider architecture

Create a payment-provider interface:

```ts
interface PaymentProvider {
  createCheckout(order: Order): Promise<Checkout>;
  parseAndVerifyWebhook(raw: Uint8Array, headers: Headers): ProviderEvent;
  queryPayment(providerPaymentId: string): Promise<PaymentState>;
  refund?(payment: SettledPayment, amount?: Money): Promise<RefundState>;
}
```

Implement adapters in this order:

1. **NOWPayments** — hosted invoice/payment flow and HMAC-SHA512-verified IPN callbacks.
2. **Binance Pay** — only after merchant eligibility, supported regions/currencies, current v3 API, webhook verification, and refund operations are validated.
3. **CardProviderPlaceholder** — contract and UI marker only; no card collection.

### 13.3 Payment correctness

- Create internal order before provider checkout; money uses decimal/minor-unit types, never floating point.
- Provider events are stored raw, signature-verified, deduplicated, and processed asynchronously.
- State machine handles created, pending, confirming, partially paid, paid, overpaid, expired, failed, refunded, and disputed/held where supported.
- Entitlement activates only from an accepted terminal state, never from browser redirect.
- Reconcile provider state on a schedule; webhook handler is idempotent.
- Underpayment/overpayment and late blockchain deposits go to an operations queue.
- Secrets are encrypted and tenant/platform scoped; rotate without downtime.
- Checkout clearly shows asset, network, amount, expiry, confirmation state, refund limitations, tax treatment, and regional availability.
- Complete legal, sanctions, AML/KYC, consumer-rights, tax/VAT, and accounting review before launch. Geofence providers/products where required.

---

## 14. Security, privacy, safety, and compliance

### 14.1 Security baseline

- Threat model before coding and before each public beta.
- OWASP ASVS Level 2 baseline and API Security Top 10 checks.
- CSP with nonces/hashes, HSTS, secure cookies, origin checks, output encoding, dependency and secret scanning.
- Parameterized SQL, migration review, least-privilege database users, tenant isolation tests, and encrypted backups.
- Signed URLs and malware scanning for uploads; sandbox untrusted SCORM/content.
- Rate limits by actor, tenant, endpoint risk, and network signals.
- Idempotency for grades, awards, enrollment, imports, and payments.
- Audit logs are append-only, queryable, retained by policy, and exclude secrets.
- Documented incident response, vulnerability disclosure, key rotation, recovery drills, and dependency patch SLOs.

### 14.2 Privacy and education data

- Data inventory, purpose, lawful basis, retention, processor/subprocessor list, and deletion behavior for every domain.
- GDPR/UK GDPR readiness and FERPA-aligned institution controls; age gate and policy enforcement keep the launch adult-only.
- Data-processing agreement and institution-configurable retention/export.
- Separate operational telemetry from educational records and community profiling.
- Consent is versioned and withdrawable where consent is the basis.
- Analytics exports use least privilege and suppression for small groups.

### 14.3 Electrical safety

- Reviewed safety messaging and emergency guidance.
- Clear distinction between simulated behavior and field measurement.
- Standards packs name jurisdiction and edition.
- Safety-critical lessons/content require qualified subject-matter review and approval history.
- Never reward unsafe speed, energized work, bypassing protection, or guessed diagnosis.

---

## 15. API, events, and synchronization

- OpenAPI contract for external/admin APIs; generated typed client for first-party web.
- Runtime schema validation at every trust boundary.
- Transactional outbox publishes domain events after database commit.
- Event envelope: event ID, type/version, occurred time, actor, tenant, correlation/causation IDs, payload.
- Consumers are idempotent; failed messages use bounded retry then dead-letter review.
- Long-running imports, exports, generation, analytics, and notification work runs in jobs, never request threads.
- Simulator sync uses operation/revision IDs, optimistic concurrency, conflict UI, and immutable submitted snapshots.
- Public API and institution webhooks arrive after internal contracts stabilize; API keys are hashed, scoped, expiring, and auditable.

---

## 16. Testing and quality gates

### 16.1 Test layers

- Pure domain unit/property tests for electrical rules, grade calculations, policies, entitlements, XP, and generators.
- Golden circuit fixtures ported from v2 plus independently reviewed expected results.
- Generator invariant, determinism, solvability, equivalence, and fuzz tests over millions of seeds in CI/nightly jobs.
- Authorization matrix tests and automated cross-tenant access attacks.
- Contract tests for Better Auth, LTI, payment adapters, email, storage, and webhooks.
- Integration tests against real PostgreSQL/Redis-compatible services.
- Component/accessibility tests and visual regression for key themes/states.
- Playwright journeys for every role-aware home and role.
- Load tests for exam start/submit spikes, gradebook, feeds, simulation sync, and webhook bursts.
- Backup restoration, queue replay, payment reconciliation, and disaster-recovery exercises.

### 16.2 Release gates

- Typecheck, lint, unit/integration/E2E tests, migrations, API compatibility, license check, SAST, dependency scan, secret scan.
- WCAG 2.2 AA automated checks plus manual keyboard/screen-reader review.
- No known critical/high security issue without signed exception and expiry.
- No cross-tenant leakage in the release suite.
- Performance budgets met on reference devices.
- Domain experts sign off safety-critical engine/content changes.
- Payment and grade mutations pass idempotency/replay tests.

### 16.3 Initial SLO targets

- Public/API availability: 99.9% monthly, excluding published maintenance.
- Authenticated API p95: under 300 ms for ordinary reads/writes.
- Grade/exam submission durability: acknowledged only after durable commit.
- RPO: 15 minutes; RTO: 4 hours initially, tightened for institution contracts.
- Editor interaction: 60 fps target desktop; no long task over 50 ms during normal editing.
- Generator: under 2 seconds online or serve prevalidated reserve item.

---

## 17. v2 knowledge transfer (no user migration)

There are currently no registered users or production account, grade, payment, or institution records to migrate. v3 therefore needs **no user/data migration program, dual-write period, or account cutover**.

The useful transfer is product knowledge only:

1. Keep v2 read-only as an audited behavioral reference during rewrite.
2. Turn proven circuit behavior, standards logic, examples, and regressions into reviewed golden fixtures and parity tests.
3. Define a versioned neutral circuit interchange format; optionally support v2 project-file import as a convenience, not a data-migration dependency.
4. Curate and re-license assets/content rather than copying dead or generated material blindly.
5. Launch v3 as a clean product after electrical correctness, accessibility, security, load, export, and rollback gates pass.

## 18. Delivery roadmap

Estimates assume a cross-functional team of roughly 8–12 people: product, design, 4–6 engineers, QA/automation, electrical-learning SME, and part-time security/DevOps/legal. A solo implementation of the complete scope is not a credible fixed-date project.

### Phase 0 — Discovery and decisions (3–5 weeks)

- Resolve open questions in §21.
- User research with independent learners, instructors, and institution admins.
- Regulatory, adult-community, payment-provider, and US/international standards review.
- Architecture spikes: web framework/runtime, Better Auth, PostgreSQL/RLS, Matter.js isolation, generator prototype.
- Product taxonomy, free/Pro matrix, success metrics, and v3 design direction.

**Exit:** approved PRD, threat model, data map, architecture ADRs, staffing/budget, and launch slices.

### Phase 1 — Platform foundation (5–7 weeks)

- Bun-workspace monorepo, CI/CD, portable non-root OCI image, managed-PaaS deployment, Cloudflare DNS/CDN configuration, and observability.
- PostgreSQL schema/migrations, object storage, queue, secrets.
- Better Auth, account lifecycle, MFA/passkeys, base tenant model.
- Policy engine, audit log, design system, feature flags, contract tooling.

**Exit:** users can authenticate, create/join a test institution, switch workspaces, and pass tenant-isolation tests.

### Phase 2 — Simulator vertical slice (8–12 weeks)

- New circuit schema, command system, renderer/editor, worker electrical engine.
- Essential components, wiring, undo/redo, save/version/import/export.
- Accessibility tree and baseline responsive experience.
- v2 golden fixtures and import proof of concept.

**Exit:** independent learner can build, simulate, save, reopen, and share a basic circuit with reviewed parity.

### Phase 3 — LMS core (10–14 weeks)

- Institution onboarding, roster, cohorts, courses/modules/content.
- Enrollment, assignment with simulator submission, gradebook, feedback.
- Learner/instructor/admin workspace homes, notifications, basic analytics.
- CSV import/export and audit controls.

**Exit:** one pilot institution can run a complete course and grade simulator work.

### Phase 4 — Games, procedural engine, gamification (8–12 weeks)

- Seeded generation framework and validation service.
- Two game families using Matter.js where appropriate.
- XP ledger, levels, achievements, quests, personal progression home.
- Procedural homepage modules and practice content.

**Exit:** deterministic replay, anti-abuse checks, and accessibility review pass.

### Phase 5 — Assessment and LMS completeness (10–14 weeks)

- Exams, question banks, rubrics, accommodations, weighted gradebook, certificates.
- Procedural exam blueprints, reserve pool, equivalent-difficulty reporting.
- Discussions, calendar, course copy, advanced analytics.
- LTI 1.3 Advantage first integration.

**Exit:** audited exam lifecycle from authoring to appeal/regrade; LTI conformance test target met.

### Phase 6 — Community and profiles (7–10 weeks)

- Public profiles, one-way follows/requests, publishing, circuit posts, news feed, public/private groups, and privacy-aware search.
- Reporting, blocking, moderation, sanctions/appeals, privacy defaults.
- Creator attribution and remix lineage.

**Exit:** trust-and-safety runbook, moderator staffing, abuse/load testing, adult-only age-gate and privacy controls.

### Phase 7 — Entitlements and crypto commerce (5–8 weeks)

- Plan catalog, quotas, entitlement service, checkout/order ledger.
- NOWPayments adapter, signed webhooks, reconciliation, refunds/manual operations.
- Binance Pay only if legal and merchant readiness gates pass.
- Institution license/seat controls and billing workspace.

**Exit:** sandbox and low-value production transaction reconciliation; legal/tax/security sign-off.

### Phase 8 — Hardening, pilots, and cutover (8–12 weeks)

- Security review/penetration test, performance and disaster-recovery testing.
- Accessibility audit, content/safety review, privacy documentation.
- Pilot cohorts, v2 fixture parity, support operations, status page, rollback drills.
- Progressive release: staff -> invited users -> pilot institutions -> public.

**Exit:** all launch gates met and rollback is proven.

### Later phases

- SAML/SCIM, OneRoster, QTI, SCORM/xAPI/cmi5, Caliper certification/export.
- More jurisdictions/standards packs, three-phase fidelity, more games.
- Card payment adapter.
- Native app evaluation only after web usage data supports it.

---

## 19. Parallel workstreams and ownership

| Workstream | Primary responsibility |
|---|---|
| Platform | identity, tenancy, RBAC, data, API, jobs, observability |
| Simulation | electrical domain, editor runtime, renderer, instruments, imports |
| Learning | courses, assessment, gradebook, content, LMS integrations |
| Engagement | procedural engine, games, gamification, homepage |
| Community | profiles, social graph, feeds, moderation, search |
| Commerce | plans, entitlements, crypto providers, reconciliation |
| Quality/safety | automation, accessibility, security, privacy, electrical review |

Each domain has an owner, ADRs, public contracts, SLOs, and a test strategy. Cross-domain architecture review is required for identity, grades, money, entitlements, or student data.

---

## 20. Success metrics

Use metrics as diagnostics, not as incentives to manipulate learners.

- Learner activation: completes first valid circuit or lesson.
- Learning: pre/post improvement and misconception resolution, not only time spent.
- Simulator: successful saves, crash-free sessions, engine latency, project return rate.
- LMS: course setup time, assignment completion, grading turnaround, instructor weekly use.
- Generator: validation pass rate, duplicate rate, difficulty variance, appeal rate.
- Gamification: opt-in rate, healthy return rate, abuse reversals, no degradation in correctness.
- Community: meaningful circuit shares, report rate, moderator response, block/mute effectiveness.
- Commerce: checkout completion, payment reconciliation exceptions, renewal, refund time.
- Platform: availability, p95 latency, tenant-isolation incidents, restore-test success.

Set numerical targets after baseline research and pilot data; do not invent targets before measurement.

---

## 21. Confirmed decisions and remaining product inputs

### 21.1 Confirmed on 2026-09-24

- Adults only; no minor learner market at launch.
- Regional supply profiles from day one: US / North America at 110–120 V, 60 Hz; IEC / international at 220–240 V, 50/60 Hz, including Pakistan's nominal 230 V / 50 Hz context.
- Build a complete first-party LMS; assessments only in instructor/institution teaching contexts.
- Anyone may self-register as an independent instructor after verification.
- Free simulator sandbox for every registered user; Pro gates advanced components/features.
- Bun-first development and production runtime in a portable managed-PaaS container; Cloudflare limited to free DNS/CDN/TLS edge services.
- Binance Pay and NOWPayments; card payments deferred.
- Community limited to follows, publishing, news feed, public/private groups, and public profiles; no DMs/chat.
- No existing users/data require migration.
- Preserve electrical blue while redesigning the rest of the experience; no classic dashboard grid; mandatory onboarding.

### 21.2 Still needed before commercial implementation

1. Exact Free/Pro/institution quotas, prices, seat rules, and premium component catalog.
2. Crypto launch countries, settlement currency, accepted assets/networks, refunds, and merchant approval status.
3. Institution launch depth: enterprise SSO/imports and multi-campus administration in first release or staged after core LMS.
4. Assessment stakes: ordinary course grading only at launch, or formal/certification exams with additional governance.
5. Data residency, cloud budget, recovery objectives, and any contractual self-hosting requirement.
6. Available team/headcount and target pilot date, so the full scope can be sliced credibly.

## 22. Immediate next actions

1. Continue the integrated learner and teaching redesign: `/app` includes the account project library, `/workspaces` provides exact-tenant switching, campus/department administration, roster status controls, and invitations, and `/simulator` now provides blank-circuit creation, validated free-form equipment/wiring/layout edits, deterministic animation, account-backed revisions/sharing, and database-resolved Pro entitlement. Next add bounded role-assignment mutation, pending-invitation review, hierarchy archival/editing, and course-scoped rosters; simulator authoring now includes persisted pan/zoom, wire deletion/routing, multi-select/group alignment, ideal junctions/bars, visual enclosures, and loading-aware volt/amp/clamp instruments. Safe diagnostics, enclosure/DIN authoring, direct probes, copy/paste/rotation, reactive/motor/control components, three-phase sources, bounded simulation workers, scale trials, guided lessons, and learner-owned LMS evidence are implemented through v0.10. Remaining internal work should not invent unsafe approximations: transformer coupling, instructor assignment/review workflows, and reviewed model-specific component packs require dedicated design checkpoints. Hosting remains blocked on the external licensing, SME/legal review, production credentials, hardware validation, and pilot gates below.
2. Continue the implemented ADR 0009 foundation at [`v3/`](./v3/): build its non-root OCI image in a container-enabled environment, run the same image on Railway and Render trials, test both behind a Cloudflare-proxied staging domain, and record the provider selection. The local Bun, strict-TypeScript, Request/Response, cache-policy, port-contract, bundle, and graceful-shutdown gates already pass.
3. Execute accepted ADRs 0010 and 0011 against real PostgreSQL: apply the implemented auth/application/worker role script and prove cross-tenant RLS, pooled-context isolation, direct-ID denial, role ceilings, idempotent lifecycle/invitation/institution operations, job leasing, password/passkey session-bound step-up, and audit/outbox rollback. Local email/jobs, Resend, onboarding, invitation management, TOTP/passkey/session UI, teaching-workspace roots, and protected gates are implemented. Campus/department administration and secure-origin WebAuthn ceremony validation remain next.
4. Resolve the remaining commercial inputs in §21.2 and produce user-flow prototypes for instructor/institution homes while retaining the approved shell composition.
5. Expand the implemented kernel/editor contract: it now has complex source/conductor/fault impedance; distinct TN-S, TN-C-S, TT, IT, and North-American grounded fixtures; open PE/PEN/EGC hazards; IEC 60898 B/C/D, IEC residual, UL manufacturer-curve, and Class A GFCI separation; insulation monitoring; local-reference touch potential; I²t/adiabatic/interruption evidence; optional fail-closed manufacturer let-through data; bounded rule evidence; 50 deterministic golden fixtures; renderer-neutral fault animation; schema-v1-to-v2 migration; and a topology-aware free-form SVG authoring projection with persistent positions. Remaining gates are exact licensed/reviewed manufacturer drawings and datasets, adopted-jurisdiction rule packs, independent electrical-SME review, advanced canvas/wire tooling, and hardware renderer trials.
6. Continue the remaining disposable spikes: add worker throughput/cancellation around the pure TypeScript kernel, repeat the completed SVG/PixiJS accessibility matrix on hardware-accelerated target devices, and test selective Matter.js physical interaction plus deterministic circuit generation. The Arena SwiftShader run keeps SVG as the initial renderer/fallback; PixiJS reduced DOM density but did not win software-rendered frame performance.
7. Threat-model identity, institution invitations, exams, community uploads, and payment webhooks; convert the roadmap into epics only after spike results.

---

## 23. Reference baselines checked for this plan

- Better Auth 1.7 release and documentation: <https://better-auth.com/blog/1-7>
- Better Auth passkeys: <https://better-auth.com/docs/plugins/passkey>
- PostgreSQL versioning policy and current releases: <https://www.postgresql.org/support/versioning/> and <https://www.postgresql.org/>
- Matter.js 2D physics engine 0.20.0: <https://brm.io/matter-js/docs/>
- LTI 1.3 Advantage: <https://www.imsglobal.org/spec/lti/v1p3/impl/>
- NOWPayments API/IPN: <https://documenter.getpostman.com/view/7907941/2s93JusNJt>
- Binance Pay API: <https://developers.binance.com/docs/binance-pay>
- Nielsen Norman Group progressive disclosure: <https://www.nngroup.com/videos/progressive-disclosure/>
- W3C WCAG 2.2: <https://www.w3.org/TR/WCAG22/>
- Caliper Analytics 1.2: <https://www.imsglobal.org/spec/caliper/v1p2>
- Bun runtime/toolchain and bundler/typechecking boundaries: <https://bun.com/docs> and <https://bun.com/docs/bundler>
- Cloudflare CDN default cache behavior and origin cache-control semantics: <https://developers.cloudflare.com/cache/concepts/default-cache-behavior/> and <https://developers.cloudflare.com/cache/concepts/cache-control/>
- Cloudflare Workers/Hyperdrive/R2 documentation was evaluated before ADR 0009 removed those services from the baseline application architecture.
- Resend SMTP and Amazon SES quotas: <https://resend.com/docs/send-with-phpmailer-smtp> and <https://docs.aws.amazon.com/ses/latest/dg/quotas.html>

Versions are planning baselines, not evergreen ranges. At implementation, pin exact versions, review release/security notes, test compatibility, and upgrade through automated dependency PRs.
