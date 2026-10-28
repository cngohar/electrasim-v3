# Phase 2 — Community plan

**Status (2026-10-27): 2.0 is accepted locally within its historical foundation
scope; the approved admin integration/parity review keeps its separate acceptance.
2.0A component access Gates A-F are complete locally after the dedicated full
18-stage gate exited 0: 2305 units / 151 files, 8 storage / 14 component API groups,
existing infrastructure/admin/membership regressions, 897 unchanged parity and
105 source + 105 built browser cases without skips/retries. All 1318 selected
source/harness inputs matched. Profiles 2.1 Gates A–E are complete locally (2026-10-26): dedicated full 22-stage exit 0, 2339 units / 153 files, 270 source/built browser cases without skips/retries, 8 profile storage / 21 profile API groups and 1350 unchanged source/harness inputs. Overall Phase 2
and support 2.7A remain open/planned.**
See the [2.0A audit](../audits/phase-2-component-access.md) and
[dedicated acceptance manifest](../audits/data/phase20a-acceptance.json).
See the [admin contract](../api/platform-admin.md) and
[foundation evidence](../audits/phase-2-admin-foundation.md).
The [spike decision record](../audits/phase-2-foundation-spike.md) records scope and
checks. This local authorization does not authorize commit, publication or remote
operations.
Phase 1.14 is closed locally with an explicit hardware-dependent performance
exception. Phase 2 starts from the private simulator/document foundations already
on `main` (`1120abf`) and keeps every Cloudflare/Wrangler operation local.

**Owner design review:** the functional 2.0 baseline passed its recorded gate.
The owner requested a richer visual design/workflows and an HTML concept before
production adaptation. The [local admin concept](../design/platform-admin/README.md)
now includes membership plan creation/assignment and dedicated user pages with
a quick-view drawer. The owner approved the panel and authorized local integration on 2026-10-24;
the complete actual/demo follow-up passed its separate 16-check scope using the
retained non-browser prefix and explicit browser recovery (**2,235 units; 156
source/built browser cases**). See the [complete parity review](../audits/admin-prototype-parity-review.md)
for corrections, evidence and explicit remaining differences.
See the [integration plan](PLATFORM_ADMIN_DESIGN_INTEGRATION.md). 2.1 has owner-approved [design](../design/profiles/README.md) and complete local product acceptance; see the [profile audit](../audits/phase-2-profiles.md) and [dedicated manifest](../audits/data/phase21-acceptance.json).

**Owner-approved scheduling addition (2026-10-24):** deliver component access
management in **2.0A before 2.1**, and a private support desk MVP in **2.7A after
2.6/2.7 and before final 2.8 acceptance**. Both are required before Community
launch; neither is implemented or accepted by this planning update. Full blog and
static-page editing remains **Phase 5 Content Studio**. See the
[extension scope, dependencies and acceptance](PHASE_2_ADMIN_EXTENSIONS_PLAN.md)
and [active 2.0A execution plan](PHASE_2_0A_COMPONENT_ACCESS_PLAN.md).

[Phase map](../phases/phase-2-community.md) ·
[Roadmap](../REWRITE_PLAN_V3_FULL.md#28-phased-roadmap-bun--workers--original-22-week-estimate) ·
[Simulator phase map](../phases/phase-1-simulator-core.md) ·
[Current persistence contract](../audits/phase-1-persistence.md)

Phase 2.2 publications is complete locally (2026-10-27) with explicit recovery:
all 26 stage identities have passing evidence, including 2,342 units, 324 browser
cases, 8 publication storage / 22 API groups and 897 unchanged parity cases on
1,367 unchanged inputs. Coverage combines 18 initial stages and an eight-stage
recovery, not an uninterrupted full-default exit 0. The recovery manifest records
status 0; its enclosing execution session reported 143 after completion. See the
[execution plan](PHASE_2_2_PUBLICATIONS_PLAN.md), [publication audit](../audits/phase-2-publications.md)
and [dedicated manifest](../audits/data/phase22-acceptance.json). Next is **2.3
read-only preview and public detail**. Overall Phase 2 remains open.

## Outcome

Let an owner publish an immutable snapshot of a saved circuit, discover it through
an explore/feed surface, open and simulate it read-only, fork it with attribution,
and discuss or collect it. Published content must be reproducible, capability-gated,
searchable, server-rendered for SEO, and clearly distinguish a fresh assessment
from a stale or merely published snapshot.

The private working copy remains owner-only. Publishing creates a public snapshot;
later edits do not silently change what the community sees. Forks reference the
exact snapshot they came from. No electrical model, solver result contract,
membership rule or accessibility behavior is weakened for social features.

Phase 2 also delivers the shared platform admin foundation used by later phases:
navigation, user management, roles/permissions, validated settings and audit.
Community and the scheduled component/support modules extend the shared shell;
existing membership administration integrates without broadening its super-admin-only
access. Later modules extend
this foundation when their own phase implements and accepts the underlying feature.

## Scope

| In scope | Out of scope (later phases) |
| --- | --- |
| Public profiles, handles and privacy controls | LMS/organization publishing (`visibility=org`), institution roles and consent flows |
| Publish/unpublish, immutable versions, slugs and attribution | Gamification XP, badges, quests, streaks and leaderboards |
| Explore, following feed, filters, tags and FTS5 search | Content Studio / blog CMS |
| Read-only live preview and server-rendered circuit/profile pages | Payments, billing and seat management |
| Forks, fork lineage, reactions, threaded comments, accepted answers | Real-time presence, collaborative editing and chat |
| Collections and in-app social notifications | Email digests/providers and push notifications |
| Shared admin shell, user directory, system/custom roles, permission matrix, account/community restrictions, settings and audit | Later-phase gamification, LMS, Content Studio, billing and email business controls |
| Complete community admin UI: reports, publication/comment/profile/collection moderation and action history | AI moderation/scoring, account impersonation and hard account deletion |
| 2.0A: super-admin Free/Pro controls for existing Pro components, with protected Basic baseline | Full executable component catalogue editor, custom models/artwork and arbitrary per-plan component packs |
| 2.7A: private tickets, user/staff replies, assignment, internal notes, status and in-app updates | Email ingestion/delivery, support attachments, live chat, anonymous tickets, SLA automation and AI replies |

Challenge Mode remains retired and is not part of this phase. Diagnosis remains
retired. No remote deployment or live-site test is part of any milestone.

## Existing foundations and gaps

| Area | Already present | Missing for Phase 2 |
| --- | --- | --- |
| Circuits | Owner-scoped `circuits` CRUD with optimistic `version`, capability checks and private JSON content (`src/api/circuits.ts`, `packages/db/circuit-schema.ts`) | Visibility, publication snapshot, slug, tags, description, fork lineage, thumbnail and immutable version history |
| Identity | Better Auth `user` plus `global_role`; `moderator` role exists (`packages/access/src/index.ts`) | Public handle, profile fields, privacy controls, avatar upload and public-profile route |
| Access | `requireSession`, fresh primary reads, capability guards and same-origin JSON mutations (`src/api/context.ts`, `src/api/simulator-access.ts`) | Moderator middleware, publish permission checks and community rate limits |
| Administration | Accepted 2.0 shared shell, user directory, roles/policy, restrictions/suspension, typed settings/audit and protected membership integration | Owner-reviewed presentation adaptation, real community subject screens, 2.0A component access module and 2.7A support desk |
| Component access | Boolean `pro_components` plan benefit, code-defined component tiers, canonical requirement checks and fresh server membership enforcement (`packages/access/src/index.ts`, `src/api/simulator-access.ts`) | Editable policy for existing Pro IDs, immutable Basic baseline, policy-revision race handling, consistent simulator/publication/fork integration and admin UI |
| Support | 2.0 user identity, module permissions, navigation and audit; 2.6 notifications are planned | Ticket/message/event schema, owner/staff APIs, private queue/conversation UI, internal-note isolation and in-app notification integration |
| Editorial content | Basic `content_pages`/localization table (`packages/db/schema.ts`) | Phase 5 blog/static-page editor, publishing/approval, revisions, media and SEO workflow; not moved into Phase 2 |
| Serving | Astro static marketing plus API-only Hono Worker; `/app/` SPA (`src/worker.ts`, `scripts/postbuild.mjs`, `wrangler.jsonc`) | Worker-rendered HTML for community routes, explicit asset-routing rules, CSP/cache headers and dynamic metadata |
| Rendering | Interactive `CircuitCanvas`, SVG/PNG export and static guide cards | Store-independent read-only renderer/preview and deterministic thumbnail path |
| Search | Static marketing `search.json` | D1 FTS5 index and `/api/search` for publications, users and tags |
| SEO/OG | Static Astro metadata, JSON-LD helpers and committed OG cards | Per-publication/profile SSR metadata, canonical URLs, `Person`/`Circuit` structured data and OG fallback/dynamic path |
| Social | Local transient UI notifications only | Profiles, follows, reactions, comments, collections, persistent notifications and reports |
| Infrastructure | D1, R2, KV, Queue and `PresenceRoom` bindings are declared but mostly unused | R2 upload/read, Queue producer/consumer, moderation/admin paths and local integration tests |

## Architecture decisions

These are the plan's defaults. Milestone 2.0 first validates the risky ones with a
local-only spike, then implements and accepts the shared admin foundation before
community feature work depends on it.

1. **Route ownership.** Keep Astro as the static marketing surface. Serve
   `/explore`, `/feed`, `/c/:slug`, `/u/:handle`, `/collections/:slug` and their
   metadata from the Hono Worker. Add explicit asset-routing rules so a community
   URL cannot fall through to the marketing SPA shell. Do not add a client router
   to the editor or move existing `/app/` routes.
2. **No editor bundle on discovery pages.** Server-render the feed/explore cards
   with a small HTML/CSS payload. Load a separate, read-only preview island only
   on a public circuit detail page. Existing app entry budgets stay unchanged
   unless the owner explicitly approves a measured exception.
3. **Publication is a snapshot, not a flag.** Keep `circuits` as the private
   working copy. Add `publications` and immutable `publication_versions`; publishing
   copies the validated circuit JSON, capability requirements and model/engine
   fingerprints. Republishing creates a new version. Public routes never read the
   mutable private row.
4. **Profiles are separate from Better Auth.** Add a `profiles` table keyed by
   user ID so Better Auth's generated schema stays stable. A handle is required
   before publishing and can be claimed once for existing accounts; public profile
   reads only expose fields allowed by privacy settings.
5. **Read-only preview is shared code.** Extract a pure renderer from the existing
   SVG/export path, then use it for server-rendered thumbnails and the detail-page
   preview island. The editor's store-coupled canvas is not loaded into public
   pages; preview mode must not write, autosave, or expose premium simulation
   without a capability check.
6. **Verification is provenance, not a pass badge.** Store the snapshot
   fingerprint, `ELECTRICAL_MODEL_VERSION`, `MNA_ENGINE_VERSION`, relevant control
   engine version and verification timestamp. If current constants differ, show
   "verified against an earlier model" and never present the stored result as a
   fresh safety or assessment pass. No publication is described as certified.
7. **Search is D1 FTS5.** Add a publication search table with explicit write-time
   synchronization (publish, update, hide, delete) and test the query plan locally.
   Do not scrape the editor bundle or reuse the static marketing index.
8. **Moderation is post-publication by default.** Reports, banned-word checks,
   auto-hide threshold, moderator review and audit are required. A configurable
   pre-moderation mode may hold first publications, but it is off by default so
   local development and ordinary publishing are not blocked.
9. **Notifications are in-app first.** Persist notifications in D1 and fan out
   through the existing Queue binding. Email delivery is deferred because the
   provider abstraction is not implemented; notification payloads must not contain
   private circuit content.
10. **SEO is server-first.** Every public community URL must return meaningful
    HTML without JavaScript: title, description, canonical, Open Graph/Twitter
    metadata and structured data. Dynamic OG images are an enhancement after the
    routing spike; a deterministic static fallback is acceptable for 2.0.
11. **Administration is a shared platform foundation.** Build a common admin
    shell with independently authorized modules, namespaced permissions, validated
    settings and reusable audit contracts. Preserve `/admin/pro/` and its exact
    super-admin guard. Community administrators use their own access endpoint;
    they do not pass through or weaken the membership-only ping. Unimplemented
    future modules have no working links, writable settings or grantable actions.

## Platform admin and community controls

The admin UI is a required product deliverable, including keyboard/phone behavior,
loading/empty/error states, expired access and concurrent-change recovery. An API
or a static navigation mockup alone does not satisfy this scope. Reuse the existing
admin visual components and request conventions where suitable, while giving each
module a separate authorization boundary.

### Screens and workflows

| Screen / proposed route | Required behavior |
| --- | --- |
| Overview — `/admin/` | Permission-filtered navigation, local D1 counts for users/publications/open reports/restrictions, links to actionable queues; no simulator loading or third-party analytics dependency |
| Users — `/admin/users/` | Indexed, paginated search by ID/handle/name and, for authorized user managers, email; account detail shows minimal identity, role assignments, restriction status, public contributions and authorized action history |
| Roles and permissions — `/admin/permissions/` | Super admin assigns/revokes staff roles, creates/archives custom roles and edits a validated permission matrix over registered actions; show effective access and change impact before saving |
| Reports — `/admin/community/reports/` | Filter by subject/status/reason, inspect public subject context, claim/reassign review, dismiss or resolve with a reason; link the outcome and audit entry |
| Content — `/admin/community/content/` | Search/filter publications, comments, profiles and public collections; inspect reported or hidden public content; hide, restore hidden content, or remove with a tombstone and a required reason |
| Settings — `/admin/settings/` | Namespaced, typed settings forms; community banned words, report auto-hide threshold, rate limits and optional pre-moderation; defaults, validation, version conflict handling and audited changes |
| Audit — `/admin/audit/` | Paginated actor/target/action/date filters and change details; restrict records and sensitive fields to the viewer's permissions; community staff cannot read membership or platform security history |
| Memberships — `/admin/pro/` | Existing plans, benefits, grants and audit remain available to super admins, with existing contracts preserved |
| Standards — `/admin/standards/` | Read-only view of existing code-owned standards for authorized operators; no electrical-rule editing |
| Components — `/admin/components/` (2.0A, proposed) | Super-admin catalogue search/detail and reviewed Free/Pro access edits for existing Pro IDs; protected Basic controls, policy revision, impact and scoped audit |
| Support — `/admin/support/` (2.7A, proposed) | Authorized ticket queue/detail, user-visible replies, staff-only notes, assignment/status/priority and safe history; user-owned support inbox is separate |

### Roles and permission boundaries

Use existing `individual`, `moderator`, `admin` and `super_admin` global roles as
the initial system roles. Add separate custom-role/assignment tables instead of
accepting arbitrary role names in Better Auth's generated user schema. The super
admin can configure non-protected grants; the table describes the default policy.
Each API action enforces a registered permission independently of navigation.

| Operation | Moderator | Admin | Super admin |
| --- | --- | --- | --- |
| Review reports, moderate public content and read community audit | Yes | Yes | Yes |
| Search full user directory, view necessary account contact details | No; public subject context only | Yes | Yes |
| Apply/revoke timed or indefinite community restrictions on ordinary users | No by default | Yes | Yes |
| Configure community moderation settings | Read-only | Yes | Yes |
| Assign system/custom staff roles, change permission matrix | No | No | Yes; protected |
| Restrict staff accounts or suspend/restore platform account access | No | No | Yes; protected |
| Manage paid plans, benefits, memberships and membership audit | No | No | Yes; existing protected contract |
| Manage component Free/Pro policy and protected catalogue audit (2.0A) | No | No | Yes; protected |
| Read/reply/assign support tickets, manage status, internal notes and support audit (2.7A) | No by default | Yes through registered support permissions | Yes |

Protected actions cannot be delegated through a custom role or matrix override.
Unknown actions deny access. Organization roles and paid memberships never grant
platform administration. User-management permissions do not grant access to private
circuit JSON, credentials, tokens or session secrets. No automatic paid capability
comes from becoming staff.

Require fresh primary role/assignment/policy reads at each protected action. Role,
policy, suspension and settings writes need an explicit reason, expected version,
same-origin validation and an atomic audit record. Reject self-promotion and
self-demotion/suspension that could bypass staff controls; preserve at least one
active super admin under concurrent requests. Only a super admin can provision
another super admin through an explicit protected workflow; the existing first-user
local bootstrap remains separate and unchanged. Revoked roles/assignments take
effect on the next protected request and the UI clears inaccessible details.

### Restrictions and moderation lifecycle

- **Community restriction:** timed or indefinite; blocks community writes including
  publishing, commenting, reactions, follows, collecting and forking. Public reads,
  private circuit work and existing membership grants remain available. Allow
  bounded reporting and reading the caller's restriction/outcome notice. Admins
  cannot target staff; staff restrictions require super-admin authority.
- **Platform suspension:** a separate, explicit super-admin action. Deny new sign-in
  and authenticated protected operations, revoke active sessions, and enforce status
  in shared server guards so an old cookie cannot bypass it. Restore access through
  an audited action or recorded expiry; restoration never revives revoked sessions.
  Preserve private documents and membership records. Public anonymous pages remain
  available. This is distinct from suspending a paid grant.
- **Public subjects:** publications, comments, profiles (including bio/avatar) and
  public collection titles/descriptions support reports and moderation. Owner edits
  cannot clear a moderator's hidden/removed state. Restoring hidden content requires
  review; removed content remains unavailable with attribution tombstones retained.
  Hidden profiles use neutral attribution on otherwise visible publications; hiding
  a profile alone does not silently hide all of its owner's publications.
- **Cross-surface consistency:** hidden/removed subjects disappear from public APIs,
  SSR, search/feed, collections, OG and asset delivery as applicable. Comment threads
  retain neutral placeholders; accepted answers cannot expose hidden text. Cached
  content and queued notifications recheck visibility before delivery. Avatar and
  thumbnail routes cannot bypass subject visibility through a raw storage key.
- **Accountability:** deduplicate reports, count distinct eligible reporters for
  auto-hide, rate-limit submissions and record automated actions with a system actor.
  Report resolution and subject changes are separate explicit transitions committed
  with audit in the same batch. Authors receive a private in-app outcome notice with
  a public-safe reason; reporter identity and internal notes stay staff-only.

### Scheduled admin extensions before Community acceptance

[2.0A and 2.7A](PHASE_2_ADMIN_EXTENSIONS_PLAN.md) reuse the accepted foundation but
require their own implementations and audits. Component access settings cannot
change electrical definitions or the confirmed free baseline. Ticket permissions
are separate from user lookup, public reports and protected membership/security
powers; internal notes never appear in owner APIs, HTML or notifications.

### Extension contract for later phases

Each admin module registers its route/navigation entry, implemented permission
keys, validated settings namespace, audit action names and verification checks.
The shell filters navigation using server-resolved permissions; APIs remain the
authority. No generic database editor or configuration value implements business
logic. Authorization, electrical models and standards stay code-owned.

| Later feature | Reuses Phase 2 foundation | Delivered and accepted in its own phase |
| --- | --- | --- |
| Phase 3 gamification | Staff access, shell, settings validation, audit | XP/levels/badges/quests/leaderboard administration and server-validated awards |
| Phase 4 procedural engine | Module registration, permissions, settings/audit | Supported template/difficulty controls and versioned generator acceptance |
| LMS / institutions | Permission vocabulary, user lookup, audit conventions | Organization-scoped roles, courses, enrollment, assessment and tenant isolation; global staff roles do not imply organization membership |
| Phase 5 Content Studio / localization | Admin modules, review patterns, settings/audit | Blog/static-page editing, preview, editorial approval/publishing, revisions, media, SEO, scheduling and translation workflows |
| Billing / email | Protected module boundaries and action history | Payments, seats, provider integration, email templates and delivery controls |

Phase 2 acceptance includes one test-only module fixture to prove registration,
permission denial and audit isolation without shipping a future business module.
Later phase plans must map their administration to this contract and supply their
own UI/API acceptance before enabling a module.

The local 2.1 design review and subsequent implementation gates are tracked in
[the profiles execution plan](PHASE_2_1_PROFILES_PLAN.md).

## Proposed data model

Names are provisional until the 2.0 schema review. All timestamps are integer
milliseconds; IDs are UUIDs unless a table needs a natural key.

| Table | Key fields | Purpose |
| --- | --- | --- |
| `profiles` | `user_id` PK/FK, `handle` unique nullable, `display_name`, `bio`, `avatar_key`, `profile_visibility`, `show_institution`, `show_level`, `allow_forks`, timestamps | Public identity and privacy |
| `publications` | `id`, `owner_id`, `source_circuit_id`, `slug` unique, `title`, `description`, `status` (`published`/`hidden`/`removed`), `current_version_id`, `forked_from_publication_id`, `forked_from_version_id`, `tags_json`, `thumbnail_key`, counters, `published_at`, `deleted_at`, timestamps | Public listing and lifecycle |
| `publication_versions` | `id`, `publication_id`, `version_number`, `circuit_json`, `circuit_schema_version`, `requirements_json`, `model_version`, `engine_version`, `fingerprint`, `verified_at`, `created_by`, `created_at`; unique `(publication_id, version_number)` | Immutable published snapshots |
| `publication_tags` | `publication_id`, `tag`; unique pair | Filtering and search |
| `follows` | `follower_id`, `followed_id`, `created_at`; unique pair, no self-follow | Following feed |
| `reactions` | `publication_id`, `user_id`, `kind` (`zap`/`idea`/`clap`), `created_at`; unique triple | Lightweight appreciation |
| `comments` | `id`, `publication_id`, `author_id`, `parent_id`, `body`, `status`, `created_at`, `updated_at` | Threaded discussion |
| `collections` | `id`, `owner_id`, `slug`, `title`, `description`, `visibility`, timestamps | Curated public sets |
| `collection_items` | `collection_id`, `publication_id`, `position`, `added_at`; unique pair | Collection contents |
| `notifications` | `id`, `user_id`, `type`, `actor_id`, `publication_id`, `comment_id`, `payload_json`, `read_at`, `dedupe_key`, `created_at` | In-app inbox and queue fan-out |
| `reports` | `id`, `reporter_id`, `subject_type`, `subject_id`, `reason`, `details`, `status`, `reviewer_id`, `resolution`, timestamps | Moderation queue |
| `admin_roles`, `admin_role_permissions`, `admin_user_roles` | role IDs/keys, registered permission keys, user/role assignments, versions and timestamps | Custom roles and assignments alongside fixed system roles |
| `admin_settings` | namespace/key, validated JSON, version, updated actor/time | Permission matrix and typed module settings; no credentials |
| `account_controls`, `community_restrictions` | user ID, status/scope, starts/ends, actor, reason, version | Separate platform suspension and community write restrictions |
| `admin_audit` | actor/system actor, action, subject type/ID, safe before/after, reason, request ID, timestamp | Append-only platform/community administrative history; existing membership audit remains intact |
| `publication_fts` | FTS5: `publication_id` unindexed, `title`, `description`, `tags`, `author_handle` | Discovery search |
| `component_access_overrides` (2.0A, proposed) | Canonical component ID, Free/Pro access, revision/version, actor and timestamps | Product access only; confirmed Basic IDs and electrical definitions stay code-owned |
| `support_tickets`, `support_messages`, `support_ticket_events` (2.7A, proposed) | Owner, subject/category, assignment/status/priority/version; paginated messages with explicit visibility; safe events/dedupe | Private support workflow; distinct from reports, comments and generic audit bodies |

An accepted answer is a nullable `accepted_comment_id` on `publications`, set by
the publication owner or a moderator. Counters live on `publications`/`profiles`
and are updated in the same `batch()` as the social mutation; a local reconciliation
query checks for drift. Fork lineage always references a version, never a mutable
circuit. Owner deletion tombstones the publication so forks and comments retain
attribution.

Add orthogonal moderation state and optimistic versions to public subject tables;
owner privacy/unpublish choices and moderation decisions must not overwrite one
another. Report subjects use an explicit publication/comment/profile/collection
allowlist, a reporter/subject dedupe constraint, and indexed status/reviewer queues.
Role/assignment, restriction and settings indexes support primary authorization
reads. Audit payloads omit private documents and authentication secrets.

Migration sequence (remaining filenames/numbers are allocated at implementation;
0007 is already implemented and must not be rewritten):

1. `0007_admin_foundation.sql` — accepted roles/settings, account/community controls
   and administrative audit; preserve existing membership data/audit.
2. 2.0A component access policy/revision migration, before profiles.
3. 2.1 profiles/handles/privacy/moderation; 2.2 publications/versions/tags/reports.
4. 2.4 FTS5 synchronization; 2.6 social/notifications and relevant subject moderation.
5. 2.7A support tickets/messages/events and notification outbox integration.

Do not reserve the old provisional 0008–0011 names: the newly scheduled policy
migration precedes profiles. Review indexes, populated-data preservation and
subject/report ownership in each milestone's schema contract.

`circuits` and `diagnosis_attempts` remain unchanged. No destructive migration
touches existing rows.
0007 is now implemented locally and uses separate administrative audit, preserving
existing membership audit. Remaining names/order are provisional; subject and report
schemas are accepted in their milestones. See the 2.0 contract and foundation record.

## API and route contract

All mutation routes use `freshContext`, `requireSession`, same-origin JSON checks,
capability checks where premium circuit content is involved, and explicit
request-size limits. Public reads use indexed queries and keyset pagination.

| Surface | Routes |
| --- | --- |
| Profiles | `GET /api/community/users/:handle`, `GET /api/community/users/:handle/publications`, `PATCH /api/me/profile`, `POST /api/me/avatar` |
| Publishing | `POST /api/community/publications`, `PATCH /api/community/publications/:id`, `POST /api/community/publications/:id/unpublish`, `DELETE /api/community/publications/:id` |
| Public detail | `GET /api/community/publications/:slug`, `GET /api/community/publications/:slug/versions`, `GET /c/:slug` (SSR) |
| Discovery | `GET /api/community/explore`, `GET /api/community/feed`, `GET /api/community/search`, `GET /explore` and `GET /feed` (SSR) |
| Forks | `POST /api/community/publications/:id/fork` |
| Social | `POST/DELETE /api/community/users/:handle/follow`, `POST/DELETE /api/community/publications/:id/reactions`, comment and accepted-answer routes, collection CRUD |
| Notifications | `GET /api/community/notifications`, `POST /api/community/notifications/read` |
| Admin shell / users | `GET /api/admin/access`, `GET /api/admin/overview`, `GET /api/admin/users`, `GET /api/admin/users/:id` |
| Roles / permissions | `/api/admin/roles`, `/api/admin/roles/:id/permissions`, `/api/admin/users/:id/roles`, `/api/admin/permissions` — super-admin-only writes with explicit assignment/revocation and version checks |
| Account controls | `POST /api/admin/users/:id/community-restrictions`, `POST /api/admin/users/:id/community-restrictions/:restrictionId/revoke`, `POST /api/admin/users/:id/suspend`, `POST /api/admin/users/:id/restore` |
| Moderation | `POST /api/community/reports`, `GET /api/admin/community/reports`, `PATCH /api/admin/community/reports/:id`, `GET /api/admin/community/content`, `GET /api/admin/community/:subjectType/:id`, `POST /api/admin/community/:subjectType/:id/action` (allowlisted public subject types) |
| Admin settings / audit | `GET/PATCH /api/admin/settings/:namespace`, `GET /api/admin/audit` — permission-scoped reads, protected namespace checks and versioned writes |
| Component access (2.0A, proposed) | Effective public access projection and protected `/api/admin/components` reads/versioned mutations; exact schemas in the extension design gate |
| Support (2.7A, proposed) | Owner-scoped `/api/support/tickets` and messages; authorized `/api/admin/support/tickets` with separate public-reply/internal-note operations; exact schemas in the extension design gate |

Community route names are deliberately under `/api/community` except the SSR pages.
The proposed component/support namespaces are separate modules with their own
contracts in the [extension plan](PHASE_2_ADMIN_EXTENSIONS_PLAN.md). The
existing `/circuits` API remains owner-private and unchanged. `GET /c/:slug` and
profile/feed HTML routes must be added to the Worker's asset-routing configuration
and CSP/cache policy before implementation.

The current membership router applies a broad `/admin/*` super-admin middleware.
2.0 must prove mount/dispatch isolation for new admin routes without weakening
`/api/admin/ping` or `/api/admin/pro/*`. Use a dedicated access endpoint for the
shared shell and test both directions: moderator community access works, while
membership and platform-security actions still deny unauthorized staff. Admin
HTML is noindex; private responses use `private, no-store` and clear stale data
after role/session changes. Final methods and payload schemas belong in the 2.0
contract record before implementation.

## Milestones

| Milestone | Scope | Exit evidence |
| --- | --- | --- |
| **2.0 — Routing/schema spike, then shared admin foundation** | Prove SSR/Assets/CSP and local D1 FTS5/R2/KV/Queue; record schema/auth/routing decisions; implement shared shell, user directory, roles/custom permissions, restrictions/suspension, typed settings, audit and membership integration. | Spike decision record precedes dependent work; real local role/access/concurrency/session-revocation checks; source/built admin browser cases; unchanged super-admin membership boundary; module-extension fixture; no community product route accepted by spike alone. |
| **2.0A — Component access management** | Super-admin Free/Pro policy for existing Pro IDs; protected Basic baseline, reviewed admin UI, revisioned access policy and consistent simulator/server checks. | Dedicated local policy/migration/auth/audit/race/recovery evidence; actual admin and simulator UI/API workflows; existing membership regressions and unchanged electrical results. Required before 2.1. |
| **2.1 — Profiles and privacy** | `profiles`, handle claim/backfill, reserved names, avatar upload to local R2, privacy settings and `/u/:handle` SSR profile with metadata; profile reporting and staff review/hide/restore/remove controls. | Claim/reject/collision/rename behavior; private and moderated profiles/avatars hidden from anonymous reads; JSON-LD/no-JS profile page; profile API and staff UI tests; edits cannot bypass moderation. |
| **2.2 — Publications and immutable versions** | Publish from a saved circuit; snapshot validation and capability capture; versions, slug allocation, republish, unpublish, tombstone; owner-only mutation and optimistic checks; report and staff publication controls. | Private edits never leak; every publish creates an immutable version; capability and restriction checks survive publishing; version history/tombstone tests; report-to-review UI works and hidden snapshots cannot leak through alternate reads. |
| **2.3 — Read-only preview and public detail** | Extract the pure renderer; server-rendered SVG fallback/thumbnail; lazy read-only preview island; `/c/:slug` metadata/structured data; Pro simulation gate. | Visual and interaction parity checks; preview cannot write or autosave; anonymous detail page works without JS; premium simulation denied without entitlement; mobile/reduced-motion checks. |
| **2.4 — Explore, feed and search** | `/explore` and `/feed` SSR lists, filters/sorts, keyset pagination, tags, following/own feed and D1 FTS5 search. | Seeded discovery fixtures; FTS query/case/tag tests; empty/error/private behavior; pagination and query-plan evidence; no editor bundle on discovery pages. |
| **2.5 — Forks and lineage** | Fork a published version into a private working copy; optional publish as a fork; attribution chain, fork counters and deletion behavior. | A→B→C lineage; source snapshot immutability; self/duplicate/forbidden fork handling; capabilities rechecked on fork; counters remain consistent. |
| **2.6 — Social and notifications** | Follows, reactions, threaded comments, accepted answers, collections, notification inbox/unread and Queue fan-out; comment/collection reports and admin controls. | Full local social lifecycle; unique constraints/counts; comment sanitization/pagination; restriction checks; no self-notification; dedupe/read tests; hidden answers/thread placeholders/collections and queued notice visibility covered through API and UI. |
| **2.7 — Complete community administration** | Complete report assignment/resolution, cross-subject content review, banned words/auto-hide/rate-limit settings, user restrictions, outcome notices, overview counts and scoped action history using the shared admin foundation. | Staff complete report→review→hide→restore/remove through real screens for publications/comments/profiles/collections; settings and user restrictions work; concurrent/stale actions fail safely; audit atomicity, cache/asset visibility and all role boundaries pass; no backend-only acceptance. |
| **2.7A — Support desk MVP** | Private user tickets and staff queue/detail, public replies, staff-only notes, assignment/status/priority and 2.6 in-app updates; separate from public reports. | Local owner/staff workflows, strict internal-note/ownership isolation, custom-role revocation, concurrency/audit rollback and notification retry checks; source/built user/admin browser evidence. Required before final 2.8. |
| **2.8 — SSR/OG and integrated acceptance** | Dynamic or cached OG strategy, sitemap/canonical coverage, accessibility/performance pass, full local verification including accepted 2.0A and 2.7A, and closure evidence. | Types/lint, full units, 897 parity unaffected, local Worker/D1/R2/KV/Queue groups, source/built browser cases, SSR/OG snapshots, asset budgets, and a `verify:phase-2` manifest. No remote operation. |

### 2.0 execution gates

1. **Review and isolate:** record current admin/auth/membership behavior, existing
   local migration sequence and test harnesses. Decide module ownership and prove
   the membership router's broad admin middleware cannot block community staff or
   expose membership APIs. Record baseline evidence without renewing old tests.
2. **Run bounded local spikes:** serve fixture SSR community pages through built
   Assets, check unknown routes/CSP/cache headers, exercise D1 FTS5/query plans and
   local R2/KV/Queue delivery. Decide templating, entries and upload/asset visibility.
   Spike pages are fixtures, not accepted community features.
3. **Record implementation contracts:** finalize decisions, migration drafts,
   permission registry/protected actions, account/session suspension behavior,
   settings schemas, audit payloads
   and route methods. An unresolved routing or security decision blocks dependent
   implementation; it is not waived by a mockup.
4. **Build the shared admin foundation:** common navigation/access endpoint,
   overview, user search/detail, role/matrix/custom-role management, separate
   community/platform restrictions, settings/audit screens and read-only standards.
   Integrate existing memberships through its protected module boundary. Define
   community subject adapters now; add working content screens as subjects arrive.
5. **Verify the foundation locally:** real sessions across individual, moderator,
   admin, super admin and custom-role accounts; direct endpoint denials, role
   revocation, concurrent last-super-admin protection, suspension/expiry/session
   revocation, settings conflict/audit rollback, module fixture and membership
   regressions. Run relevant source/built desktop/phone/Safari admin browser cases,
   types/lint/affected units and build/asset checks. Shared auth changes require
   existing local membership and simulator API groups, not just new admin tests.
6. **Record the exit:** tracked decision record and exact check/case outcomes,
   retained failures/limitations and graph mappings. Then complete the separately
   scoped 2.0A before advancing to 2.1; planned checks and matching fingerprints
   are not execution evidence.

## Acceptance gates

- **Scheduled extensions:** 2.0A and 2.7A require their own completed local audits
  and full workflow evidence from the [extension matrix](PHASE_2_ADMIN_EXTENSIONS_PLAN.md).
  2.8 cannot close Community without both; a roadmap edit or HTML demo is not
  feature acceptance. Future remote launch remains separately authorized.
- **Component access:** protected Basic baseline, super-admin-only policy edits,
  authoritative client/server classification, policy races and read-only recovery;
  publish/preview/fork must recheck current policy without changing electrical truth.
- **Support:** complete owner/staff ticket lifecycle, independent support permissions,
  internal-note isolation, atomic transitions/audit, in-app notification dedupe and
  all applicable restricted/suspended-account cases; no private data in public reads.

- **Functional:** publish, discover, open, simulate read-only, fork, follow,
  react, comment, accept, collect, notify, report and moderate through real local
  Worker/D1 routes. Private circuits remain private.
- **Administration:** working overview/users/roles/settings/audit and complete
  community review screens; staff can finish actions without manual SQL. Verify
  permission-filtered navigation, direct URL/API access, desktop/phone keyboard
  flows, empty/error/loading states, confirmations and stale-version recovery.
- **Platform access:** system/custom permission matrix, protected-action exclusions,
  assignment/revocation, last-super-admin concurrency, separate community/platform
  suspension, session revocation and expiry behavior. No role change grants paid
  capabilities or organization authority; existing membership endpoints remain
  super-admin-only. Registration/profile APIs cannot assign staff roles.
- **Moderation consistency:** cover publications, comments, profiles/avatars and
  public collections; required reasons, report dedupe/assignment/outcomes, automated
  audit, atomic rollback and no edit-to-restore bypass. Verify SSR/API/search/feed,
  accepted answers, asset/OG caches and queued notices after hide/remove/restore.
- **Extensibility:** test-only module registration proves permission and audit
  isolation; later modules remain unavailable until implemented in their own phase.
- **Integrity:** public pages read immutable versions only; source edits do not
  alter published content; fork lineage is explicit; a stale model/version is
  visibly marked and never presented as a fresh verification.
- **Access:** owner-only writes, moderator/admin-only moderation, same-origin JSON
  mutations, capability guards for premium content and no premium bypass through
  public pages, forks or cached payloads.
- **Security/abuse:** output encoding for comments/profiles, upload type/size
  limits, rate limits, report dedupe, moderation audit and no secrets or private
  fields in public responses.
- **Search:** FTS5 is populated and updated on every publication state change;
  filters compose correctly; queries are parameterized; keyset pagination is
  stable under inserts.
- **Performance:** discovery pages do not load the editor bundle; the existing
  300,000 B app-entry gzip limit is unchanged; community chunks are lazy and
  measured; local TTFB/query plans are recorded. No server-side simulation on
  feed reads.
- **Accessibility/SEO:** no-JS HTML, meaningful headings/landmarks, keyboard and
  focus behavior, reduced motion, mobile layouts, canonical URLs, structured data
  and OG metadata. Headless evidence is not target-device owner acceptance.
- **Local-only:** every Wrangler/Worker/D1/R2/KV/Queue/DO operation uses local
  persistence. Passing tests never authorize deployment or remote migration.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Community URLs fall through to the marketing SPA or bypass CSP | Resolve routing and header behavior in 2.0 before UI work; add explicit tests for every public URL and unknown paths. |
| SSR pages accidentally ship the editor bundle | Separate preview entry; server-render cards; enforce bundle/asset checks and review build output. |
| Mutable private edits leak or change public content | Snapshot-only public reads, immutable version rows and tests that edit the source after publishing. |
| Pro content leaks through previews/forks | Reapply `circuitRequirements` and `capabilityGuard` at publish, fork and simulate; public schematic display is separate from premium simulation. |
| FTS5 unavailable or desynchronized in D1 | Validate in 2.0; explicit write-time sync in the same batch; reconciliation test and rebuild command. |
| Counter drift or duplicate social writes | Unique constraints, conditional `batch()` updates and a local reconciliation query/test. |
| Spam, harassment or unsafe content | Rate limits, report queue, banned words, auto-hide, moderator actions and audit; email/legal escalation remains out of scope. |
| Shared admin accidentally opens memberships or staff powers | Isolate current broad membership middleware; server-enforce registered permissions and protected actions; verify role revocation and concurrent last-super-admin guards. |
| Hiding content leaves cached copies public | Gate asset reads, filter all read surfaces, invalidate/version caches and recheck queued notification visibility; verify each subject adapter. |
| Later features repeatedly rebuild administration | Accept shell/permission/settings/audit extension contracts in 2.0; each later phase supplies its own module and acceptance rather than speculative CRUD. |
| OG generation bloats or slows pages | Static deterministic fallback first; cache generated assets in R2 keyed by version; no blocking generation on SSR. |
| Scope creep into LMS/gamification | Enforce the in-scope/out-of-scope table; `org` visibility and XP hooks remain reserved for later phases. |

## Implementation order and dependencies

2.0's spike is a hard gate for routing/schema/security decisions; the shared
admin foundation and its acceptance then complete 2.0 before 2.1. Implement 2.1
before 2.2 so publishing has a real profile/handle and staff review surface.
2.3 depends on 2.2's snapshots and 2.1's author identity. 2.4
depends on 2.2/2.3 for publishable fixtures and preview cards. 2.5 depends on 2.2.
The 2.4 following-feed query uses seeded follow fixtures; real follow actions and
the end-to-end following-feed journey are accepted with 2.6, not claimed in 2.4.
2.6 depends on 2.1/2.2 and can begin after the social schema is stable. Reporting,
permissions and staff controls arrive alongside subjects in 2.1/2.2/2.6. 2.7
completes the integrated administration; it is not the first moderation delivery. 2.8 is
the only closure gate and cannot substitute for missing milestone evidence.

Phase 3 (Gamification) remains planned and is not started by this phase plan.
Phase 3's community badges/quests will consume Phase 2 events only after Phase 2
has accepted event names and counters.
Later phases also depend on the accepted admin extension contract; their plans
must name permissions, settings, audit actions, UI and module acceptance checks.

## Source map and first reads

- `packages/db/schema.ts`, `packages/db/circuit-schema.ts`,
  `packages/db/auth-schema.ts`, `packages/db/membership-schema.ts` — existing
  tables and migration conventions.
- `src/admin/Admin.tsx`, `src/admin/client.ts`, `src/admin/main.tsx`,
  `admin/pro/index.html`, `e2e/admin-membership.spec.ts` — current super-admin
  membership entry, request/access handling and browser regression boundary.
- `packages/access/src/index.ts`, `packages/db/auth.ts`, `src/api/membership.ts`,
  `docs/api/membership.md` — fixed roles, server-owned auth fields, broad admin
  middleware and protected membership/bootstrap behavior.
- `src/api/circuits.ts`, `src/api/context.ts`, `src/api/simulator-access.ts` —
  owner scoping, capability guards, same-origin mutations and validation style.
- `src/worker.ts`, `wrangler.jsonc`, `scripts/postbuild.mjs`, `public/_headers` —
  Worker/Assets routing, bindings and CSP/cache behavior.
- `src/ui/CircuitCanvas.tsx`, `src/lib/export/imageExport.ts`,
  `src/ui/components/CircuitLibrary.tsx` — renderer/export and private-library
  reuse candidates.
- `astro-site/src/lib/seo.ts`, `astro-site/src/lib/structured-data.ts`,
  `astro-site/src/og-manifest.ts`, `astro-site/scripts/generate-og-images.mjs` —
  metadata/OG reuse and the current static-only boundary.
- `docs/audits/phase-1-persistence.md`, `docs/api/simulator.md`,
  `docs/audits/phase-1-full-verification.md` — current ownership, API and gate
  boundaries.
- `scripts/test-membership.ts`, `scripts/test-simulator.ts`,
  `scripts/browser-test-worker.ts` — real local Worker/D1/browser harnesses to
  extend for publish/fork/feed/moderation.
- `docs/PERFORMANCE.md` — unchanged asset and interaction budgets.

All graph/impact results are navigation aids. Runtime evidence and local tests
remain the authority for implementation acceptance.
