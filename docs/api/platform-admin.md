# Phase 2.0 platform administration contract

Gate 3 decision, 2026-10-23; locally accepted with the 2.0 foundation on 2026-10-24. Local implementation is authorized by the user's
instruction to proceed. No Cloudflare account, remote resource, publication or
cutover is authorized. This contract precedes dependent implementation; execution
and acceptance evidence belongs in `docs/audits/phase-2-admin-foundation.md`.

## Authorization and extension

Each module registers an ID, navigation entries, implemented permission keys,
default system-role grants, setting validator and audit action names. Registration
rejects duplicate IDs/keys, cross-namespace audit actions, unknown defaults and
protected grants on custom/system overrides. Unknown actions deny. APIs authorize
independently of navigation. The fixture extension exists only in a test entry.
No future business module is enabled merely by registering a database setting.

System roles remain individual/moderator/admin/super_admin. Custom assignments
live separately from Better Auth's server-owned `global_role`. Effective access
is the union of non-protected system-policy and active custom-role grants. Super
admins receive all registered actions. Only a super admin may manage roles,
permissions, staff assignments, platform suspension/restore and memberships.
Those protected powers are not matrix/custom-role options. Staff status grants
neither paid capabilities nor organization membership.

Core modules: platform overview, users, role/permission management, platform audit,
read-only standards, existing protected memberships, community restrictions and
community settings/audit. Reports/content navigation waits for real subjects.
Only user managers see the full directory/contact fields. Moderators initially
see community settings (read-only), community audit and standards. Custom roles
may grant implemented non-protected actions; zero effective actions deny shell
access. No endpoint returns private circuit JSON, password/token/session data.

## Methods and payloads

All paths below use `/api/admin`. Authenticated reads use fresh primary D1 state,
`private, no-store`, request IDs, indexed bounded pagination and allowlisted
filters. All writes require same-origin JSON, at most 32 KiB, explicit reason
(1–1,000 characters), and `version` from the last response. Reject unknown fields,
invalid enums, unknown permissions, duplicate assignments and invalid dates.

| Route | Method | Contract |
| --- | --- | --- |
| `/access` | GET | actor ID/role, effective permissions, filtered modules, global revision `version` |
| `/overview` | GET | permission-scoped real counts; unavailable community subjects explicitly absent |
| `/users?q=&limit=&offset=` | GET | exact indexed ID or indexed normalized name/email prefix; no profile handle until profiles exist |
| `/users/:id` | GET | minimal identity, roles, suspension/restrictions, scoped action history; no private documents |
| `/users/:id/roles` | POST | `{globalRole, roleIds, version, reason}` replaces assignments; no self-change; super-admin role provision explicit in review |
| `/roles` | GET/POST | list effective policy/role assignments and create `{name, permissions, version, reason}` |
| `/roles/:id` | PATCH | `{name, permissions, archived, version, reason}`; archive immediately revokes effective custom grants |
| `/permissions` | GET/PATCH | registered keys and full non-protected grants by system role; PATCH `{policy, version, reason}` |
| `/users/:id/community-restrictions` | POST | `{endsAt: future-ms-or-null, version, reason}`; audited immediately active write restriction |
| `/users/:id/community-restrictions/:restrictionId/revoke` | POST | `{version, reason}`; explicit audited revocation |
| `/users/:id/suspend` | POST | `{endsAt: future-ms-or-null, version, reason}`; platform suspension and session deletion atomically |
| `/users/:id/restore` | POST | `{version, reason}`; restore status, never recreate sessions |
| `/settings/:namespace` | GET/PATCH | typed complete settings object; PATCH `{values, version, reason}` |
| `/audit?namespace=&actorId=&targetId=&action=&from=&to=&limit=&offset=` | GET | allowlisted scope/date filters and safe before/after payloads; no membership audit access |
| `/standards` | GET | code-owned standards only; no write method |

`/api/me/community-status` lets a session read its own active restriction and
user-safe reason. The reusable community-write guard blocks restricted writes,
while private circuit work, grants and public reads stay available. Public subject
workflows integrate this guard when implemented; no community endpoint is accepted
by 2.0. Existing `/api/admin/ping` and `/api/admin/pro/*` keep their exact separate
super-admin authorization and membership audit contracts.

Responses use 400 invalid input, 401 missing/expired session, 403 denied/suspended,
404 unknown resources/namespaces, 409 stale revision/invalid transition and 503
storage failure. Never return SQL, credentials or raw exception messages. 409
requires reload/review, never automatic replay. UI clears private content on
401/403 and revalidates access on focus, visibility return and periodically.

## Concurrency, audit and suspension

A singleton `admin_revision` supplies a conservative optimistic revision for all
platform writes. Read data and revision in one D1 batch. Mutations conditionally
claim that revision, recheck actor identity/role/active-account state and execute
all changes plus audit in the same D1 batch. Every statement is tied to the unique
mutation ID; a lost claim cannot write data/audit/session deletion. Revision is
incremented only by a committed mutation; audit failure rolls everything back.
Mutable role/settings/control rows also record their last modifying revision. Requests based on any older
platform write must reload, even if the resource differs; correctness takes
precedence over simultaneous independent admin edits in this phase.

No self role-change, community restriction or suspension. Staff targets (system
role or active custom assignment) require super-admin authority. A super admin
cannot demote/suspend the last active super admin. Concurrent A→B and B→A
requests serialize through the revision claim; after a winning demotion or
suspension the other actor fails revision/authority checks. Existing local
first-super-admin bootstrap stays separate, unchanged and explicit.

Suspension has separate `account_controls` storage. It deletes all target sessions
in the same transaction as its audit. A Better Auth session-create hook rejects
active suspension with 403; a SQLite session-insert trigger closes the concurrent
session-creation race. Shared `requireSession` primary reads also check suspension
so old cookies never bypass it. Auth cookie caches remain disabled. A failed
storage read fails closed. Timed suspension expiry is recorded in the original
audit; expiry/restore allows a new sign-in and never resurrects deleted sessions.
The trigger uses database UTC milliseconds; guards use request UTC milliseconds.
Private documents, organization membership and paid grants are preserved.

## Typed settings and schema

`community`: `bannedWords` (≤100 distinct strings, 1–80 chars),
`autoHideThreshold` (2–100 distinct eligible reporters), `writesPerMinute` (1–120),
`reportsPerDay` (1–50), `preModeration` (boolean, default false). Defaults are code
owned, complete replacement validation rejects unknown fields. These values are
community defaults; public subjects consume them in their milestones. There is no
electrical-standard, credential, arbitrary SQL, feature unlock or billing setting.

Migration `0007_admin_foundation.sql` adds revision, roles/permissions/assignments,
system policy, settings, separate account controls/community restrictions and
append-only admin audit, plus indexed identity search and suspension race guards.
Membership tables, private circuits and historical diagnosis attempts are retained.
Reports are deferred to subject adapter migrations so polymorphic content and
visibility decisions arrive with actual public subjects rather than empty CRUD.
Schema mirrors are exported from the existing Drizzle schema entrypoint.

## UI and acceptance

Real routes: `/admin/`, `/admin/users/`, `/admin/permissions/`, `/admin/settings/`,
`/admin/audit/`, `/admin/standards/`; existing `/admin/pro/` integrates via navigation.
The old external-script CMS index is replaced by the local Vite entry and strict
same-origin CSP/noindex/no-store; no future module links. Forms provide typed
controls, effective grants, explicit change review/reason, pending/error/empty
states, 409 reload recovery and keyboard/phone layouts. API-only evidence cannot
close 2.0.

Required local checks: sessions for all system/custom-role cases, policy/assignment
revocation, staff restrictions versus suspension, concurrent role/suspension and
session creation, expiry/restore, atomic audit rollback, setting conflicts, safe
user/audit payloads, extension namespace isolation and old membership/simulator
regressions. Source and built browser cases cover desktop/phone/Safari. Types,
lint/units/build/assets and a tracked foundation acceptance manifest complete the
gate. Passing them authorizes neither remote operations nor starting 2.1 without
recorded 2.0 exit evidence.

## Community subject adapter contract

2.0 defines the adapter boundary; 2.1/2.2/2.6 implement and accept actual adapters.
Only `publication`, `comment`, `profile` and `collection` may register. Each adapter
supplies a bounded staff-context read (subject ID/type, author ID, safe public
summary, owner visibility, orthogonal moderation status and optimistic version),
a public-visibility predicate shared by API/SSR/search/asset reads, and an action
planner for hide/restore/remove. The planner supplies its subject-version/transition
guard and mutation statements tied to the foundation mutation ID; the foundation
commits the reason, actor/request IDs and audit in the same batch. Module extension
cannot write another namespace's action history.

Owner edits/unpublish cannot clear moderation status. Restore applies to hidden
subjects only; removed subjects retain tombstones and neutral attribution. Hidden
profiles neutralize attribution without implicitly hiding their visible circuits.
Subject milestones must verify cache/asset/queued-notice visibility and working
staff review screens before registering their live routes/permissions/navigation.
There are no subject adapters, reports/content links or writable public-subject
endpoints enabled in the 2.0 product.

## Approved presentation integration — 2026-10-24

The owner explicitly approved the HTML administration panel and authorized local
integration. The shared dark navigation/light working surface now proceeds through
real Phase 2 foundation APIs. The follow-up instruction allows features outside the
current milestone to remain in their own later phases, with progress recorded.

This integration includes the existing six platform modules, protected manual
memberships, dedicated admin account routes at `/admin/users/#:id`, quick-view
drawers, permission-aware command search, real scoped counts/history and indexed
directory role/status filters. No persona switch, sample data or artificial trends
enter the application. Public profile pages remain 2.1. Components belong to the
separate 2.0A policy/enforcement gate; support stays 2.7A, Content Studio Phase 5.

Directory GET adds `role=all|individual|moderator|admin|super_admin` and
`status=all|active|restricted|suspended`. Suspended takes precedence in the display;
restriction remains independently stored. Filter expiry uses request UTC ms.
Directory rows add `emailVerified`, `restricted`, `suspended`; they contain no
membership history. Account detail adds verification and registration time only;
last sign-in is unavailable rather than inferred from a session. Actor display
adds the safe current name to `/access` and safe actor names to scoped audit rows.
Existing identifiers and guards are retained. No new privileged write operation.

Membership creation/assignment and per-account membership history reuse only
`/api/admin/pro/*` and remain super-admin-only. Existing plan feature links are
live: editing them affects existing grants on the next fresh action, as the
membership contract states. The fictional prototype's snapshot-benefit behavior
does not change the accepted storage semantics. Assignment supports UTC dates,
active-plan selection and explicit reasoned review, including a preselected user.

Overview adds bounded recent registrations (five; user-read permission only) and
recent scoped history (eight; authorized namespaces only). No private JSON or
membership audit enters generic overview. Registration growth charts, bulk staff
assignment and all-record CSV exports are deferred admin enhancements, requiring
separate indexed queries, review/partial-failure and export acceptance; do not
render inactive controls. The existing per-user staff/restriction/suspension
workflows remain complete. This visual integration does not accept 2.0A or 2.1.

## Complete prototype comparison — 2026-10-24

The [parity review](../audits/admin-prototype-parity-review.md) records the final
screen/workflow mapping and explicit remaining proposals. Full user routes and
quick-view drawers share actual staff, independent account/community controls,
membership summaries and authorized activity. Activity detail uses the existing
target-filtered `/audit` route for safe actor/reason/before/after display; no new
audit namespace or generic access to membership audit is granted. Membership
summaries are super-admin-only and describe latest/recorded grants without
claiming a complete effective capability result from a paginated page.
