# Phase 2 admin extensions — component access and support desk

**Status (2026-10-25): owner-approved 2.0A component access Gates A-F are complete
locally. Dedicated full acceptance passed all 18 stages with exit 0: 2305 units,
8 storage / 14 component API groups, existing infrastructure/admin/membership
regressions, 897 unchanged parity and 105 source + 105 built browser cases without
skips/retries. All 1318 selected source/harness inputs matched. Profiles 2.1 is next,
not started. 2.7A remains planned and overall Phase 2 stays open.**
See the [dedicated acceptance manifest](../audits/data/phase20a-acceptance.json).
This records the accepted recommendation to deliver component access management
and a small support desk before Community launch. It adds **2.0A** and **2.7A**
without renumbering 2.1–2.8. The historical 2.0 functional acceptance is unchanged;
its HTML redesign remains a separate review deliverable. The Components HTML workflow exists as a fictional design preview; the approved
shared admin presentation is integrated and separately accepted locally. Gate B
adds migration 0009 and pure policy inputs, verified on isolated local stores.
Gate C now registers real protected catalogue permissions/handlers and primary
server policy enforcement. Gate E now delivers the actual protected Components screen and navigation with
source/built UI and existing-foundation regression evidence. Full 2.0A acceptance
is recorded separately at Gate F; historical 2.0 evidence keeps its original scope.

[Phase map](../phases/phase-2-community.md) ·
[Community plan](PHASE_2_COMMUNITY_PLAN.md) ·
[Existing admin contract](../api/platform-admin.md) ·
[Membership contract](../api/membership.md)

## Sequence and dependencies

| Milestone | Depends on | Required before | Deliverable |
| --- | --- | --- | --- |
| **2.0A — Component access management** | Accepted 2.0 authorization/audit foundation and existing Phase 1 membership enforcement; review the proposed admin presentation before adapting it | 2.1; rechecked in 2.2/2.3/2.5 and final 2.8 | Super-admin component Free/Pro controls and consistent client/server access policy |
| **2.7A — Support desk MVP** | 2.0 shell/user/permission/audit foundation, 2.6 in-app notifications, and 2.7 community access/moderation integration | Final 2.8 Community acceptance and any later separately authorized launch | Private user tickets and complete authorized staff workflow |
| **Phase 5 — Content Studio** | Shared admin extension contract and dedicated editorial acceptance | Its own Phase 5 exit | Blog/static-page editor, media, preview, approval, revisions, SEO and scheduling |

2.0A is complete locally; profiles 2.1 is the next planned milestone and has
not started. 2.7A must not depend on Phase 5 CMS or email delivery. The final
Community gate cannot pass while either new milestone is incomplete. Local
acceptance never authorizes deployment, remote testing or account operations.

## 2.0A — Component access management

### Design gate started — 2026-10-24

The [execution plan](PHASE_2_0A_COMPONENT_ACCESS_PLAN.md) now separates gates A–F.
The [typed API/schema contract](../api/component-access.md) records 116 canonical
IDs (75 protected Basic / 41 Pro), proposed primary policy storage, protected
module/actions, exact HTTP projections and revision/membership race predicates.
The [HTML demo](../design/platform-admin/README.md) includes catalogue filters,
detail, reasoned Free↔Pro review, locked Basic and concurrent-change recovery.
See the [dedicated audit](../audits/phase-2-component-access.md) for executed design
checks and subsequent Gate B results. Owner presentation approval and explicit
implementation authorization are recorded; A–F are locally complete, including dedicated full 2.0A acceptance. Historical
scoped A–E evidence remains separate from the full Gate F run.

### Existing foundation and remaining work

`packages/access/src/index.ts` resolves the boolean `pro_components` benefit;
the pinned `component-baseline.ts` preserves the original canonical tiers, and
`component-policy.ts` validates complete immutable policy inputs. The pure content
and circuit resolvers now accept an optional validated policy. Server actions now use primary policy in Gate C; Gate D editor display uses expiring validated snapshots, while every originally-Pro
action requests fresh authorization independently of its displayed access.
`src/api/simulator-access.ts` and
`src/api/circuits.ts` enforce fresh membership checks. These paths now use authoritative primary policy snapshots, compare revisions
around membership reads, guard every save and recheck before returning results. The shared admin registry,
protected actions and atomic audit are implemented in 2.0. The current HTML demo
only selects the overall Pro component benefit for a plan.

Add a Components module at proposed `/admin/components/`, with bounded catalogue
search/category/access filters, component detail, code-defined tier, effective
Free/Pro access, affected saved/public content counts where available, and a
before/after review with reason and conflict recovery. Membership plan editing
continues to select the `pro_components` capability as a whole. Arbitrary component
subsets per plan are outside this milestone.

### Product and permission boundaries

- Seed a code-owned list of the confirmed existing Basic component IDs. They
  remain free and cannot be moved behind a membership by an admin setting.
- For existing Pro component IDs, super admins can make a component Free or
  restore its Pro requirement. Show a locked explanation for protected Basic IDs.
  New components require an implemented, reviewed canonical definition first.
- Register proposed protected `catalog.components.manage` and `catalog.audit.read`
  actions only when implemented. Ordinary admins, moderators, custom roles,
  organization roles and paid membership cannot receive these protected powers.
- Changes affect product access only. Electrical behavior, ratings, solver models,
  standards and automatic safety findings stay code-owned and unchanged.
- Full component creation/deletion, arbitrary definition JSON, SVG uploads, Matter
  bodies, component packs and new premium capabilities are deferred. The broader
  `components_catalog` roadmap does not authorize an executable definition editor.

### Policy, data and API design gate

Before implementation, finalize a typed policy snapshot with a revision and a
proposed `component_access_overrides` table keyed by canonical component ID,
containing access, version, actor and timestamps. Store the explicit reason in
scoped append-only audit. Migration IDs are allocated against the actual local
sequence; do not create a second membership store or mutate saved circuit JSON.

Proposed surfaces are a public effective-access projection with no staff metadata,
protected catalogue reads, and a versioned component-access mutation under
`/api/admin/components`. Final request/response schemas and protected module
registration require a linked contract before code changes. Implemented server endpoints and focused Gate C evidence are recorded in the
[component audit](../audits/phase-2-component-access.md); full acceptance remains separate.

The shared access resolver must accept a validated policy as input; the electrical
solver remains pure and performs no database/network lookup. Apply the same
classification in palette/placement, paste/import/templates, saved restoration,
fault/diagnostic entry points where components occur, save/simulation APIs and
later publish/fork/public-preview operations. Ignore client-supplied tiers or
capability claims. Historical public snapshots record policy provenance, but
current authorization is rechecked rather than frozen to an old free classification.

Fresh primary server reads are authoritative. A policy change racing an action
must cause a recheck or conflict, including a write that appeared free before the
change; existing membership-only predicates are insufficient for that race.
Commit access changes and audit atomically with actor/revision rechecks. Cached
catalogue display never grants access. An originally-Pro component requires a
fresh validated policy to be treated as free; stale/offline policy falls back to
its original Pro requirement. The confirmed Basic offline baseline stays usable.

If access becomes Pro and a user lacks the benefit, preserve the original document
read-only, raw backup and explicit Basic-copy recovery. Never erase components,
change electrical results or silently invalidate stored learner work. Restore
normal access after a fresh authorized check when the policy or membership allows it.

### Required local exit evidence

| Check group | Required cases |
| --- | --- |
| Policy and migration | Every canonical ID seeded/classified; unknown IDs and malformed values rejected; protected Basic baseline immutable; populated pre-change memberships/circuits preserved |
| Authorization and audit | Super admin only, direct URL/API denial, custom-role nondelegation, stale/revoked staff denial, reason/version validation, concurrent edits, audit rollback and no secret fields |
| Simulator consistency | Pro→Free→Pro through UI and actual Worker/D1; free/paid/guest behavior; imports/templates/paste, save/simulation, restoration and applicable lab entry points; forged/stale policy and policy-change races, including previously free writes |
| Recovery | Downgrade/logout/offline cases retain original documents and recovery; confirmed Basic operation remains available; same authorized circuits produce identical electrical results |
| Admin workflow | Source and built desktop/phone/WebKit list→detail→review→change; locked Basic controls, loading/empty/error/access expiry, keyboard/focus and concurrent-change recovery |
| Regression and later integration | Existing membership/simulator API groups, access units, types/lint/build/assets and unchanged domain parity; 2.2/2.3/2.5 add publish/preview/fork cases using this policy; 2.8 repeats integrated coverage |

Record actual commands, counts, failures and source fingerprints in a dedicated
2.0A audit. Planned checks above are not passing evidence. Keep 2.0's historical
manifest intact; no automatic acceptance extension from its older gate.

## 2.7A — Support desk MVP

### Existing foundation and remaining work

Reuse 2.0 user identity, permission-filtered admin navigation, server guards,
validated settings and scoped atomic audit. Reuse 2.6 in-app notification delivery
when that milestone exists. There are currently no ticket tables, ticket APIs or
support screens. Community reports address public-subject moderation; support
tickets are private conversations with separate storage, permissions and outcomes.
The basic content-page table is not a ticket store or a CMS dependency.

### User and staff workflows

- Authenticated users create a ticket with category (account, membership, simulator,
  community or other), subject and bounded plain-text/escaped body. They can list,
  read and reply to their own tickets, mark an issue resolved and reopen it.
- Staff use proposed `/admin/support/` for a paginated queue with status, category,
  priority, assignee and requester filters. Detail shows the conversation, user
  identity needed for support, assignment, internal notes and permitted history.
- Staff can claim/reassign, set normal/high/low priority, send a user-visible reply,
  record a clearly distinguished internal note, resolve with an outcome, close and
  reopen. Separate these actions from membership and account-security controls;
  a ticket never grants staff authority to change plans or suspend users.
- Proposed statuses are `open`, `waiting_on_staff`, `waiting_on_user`, `resolved`
  and `closed`. Record and validate a transition matrix before implementation.
  An owner reply to a waiting/resolved ticket reopens staff work; double submits,
  stale status changes and simultaneous assignments must not silently overwrite.
- User-visible updates appear in the existing in-app inbox, with a link back to
  the ticket. Internal notes never create user notifications. Staff history and
  customer-visible status history have distinct projections.

The MVP excludes email ingestion/delivery, attachments, live chat, anonymous
submissions, SLA automation, canned-response tooling, AI replies and organization
shared inboxes. These can extend the module later. Full blog/static-page editing
remains Phase 5 Content Studio, not an added support-desk dependency.

### Privacy, permissions and concurrency

Register implemented namespaced ticket read/reply/assignment/status, internal-note
read/write, support-settings and support-audit permissions. Admins and super admins
receive the intended staff defaults; moderators receive none by default. Custom
support roles may receive only these implemented non-protected actions. User
management permission alone never grants private ticket access. Assignee selection
accepts only active staff with the required support access; assignment is not a
permission grant. No paid plan is required to request support.

Every user read/write includes ticket ownership in the database predicate. Staff
endpoints independently recheck current support permissions and active account
state. Strip internal notes and staff-only metadata from owner APIs, HTML, search,
exports, counts and notification payloads; hiding a control is insufficient.
Notification delivery rechecks recipient access. Ticket access never exposes
private circuit JSON, passwords, credentials, raw sessions or membership audit.
Users may describe an issue, but the service does not automatically attach circuits.

Community write restrictions still allow bounded support requests/replies so a
restricted user can ask for help. Platform suspension retains existing sign-in and
session denial; this MVP does not create an anonymous suspension-appeal bypass.
Apply separate ticket creation/reply limits and bounded inputs; make settings typed,
permission-guarded and audited, without enabling speculative configuration keys.

Proposed tables are `support_tickets` (owner, subject/category, status/priority,
assignee, optimistic version and timestamps), `support_messages` (ticket, actor,
body, visibility and timestamps), and safe `support_ticket_events`. Use indexed
owner/time and staff status/assignee/time queues, message pagination and mutation
deduplication. User-visible replies and internal notes must be separate validated
operations. Audit staff mutations as metadata with safe before/after and reasons;
do not copy conversation bodies or private notes into generic administrative audit.
Commit message/status/assignment changes and their required events/audit atomically.

Owner activity uses ticket versions rather than forcing every customer reply
through the global admin revision. Staff actions must retain the foundation's
fresh permission/revocation and atomic-audit guarantees. Decide the exact ticket
version/actor predicates, append-only message rules and notification outbox/dedupe
contract in the milestone's schema/API review before implementation. Failed
mutations must not leave orphan notifications, messages or partial assignments.

### Required local exit evidence

| Check group | Required cases |
| --- | --- |
| Ownership/privacy | Two users plus support staff, admin, moderator and revoked custom role; guessed ticket/message IDs denied; internal notes absent from all owner projections, notifications and counts; user-manager-only role denied |
| Complete workflows | User create→reply→staff claim→public reply→waiting→resolve→reopen→close using real user and admin screens; separate internal notes; filters, pagination, empty/error states and required outcomes |
| Boundaries/abuse | Free and paid accounts can request support; community-restricted user can request help within limits; platform-suspended/expired sessions denied; support powers cannot grant memberships/staff powers; escaped output and size/rate limits |
| Concurrency/integrity | Optimistic conflicts, assignment races, stale/revoked actor checks, duplicate submit/retry and audit rollback; no partial message/status writes; notification outbox retries deduplicate and recheck recipient visibility |
| UI/integration | Source and built desktop/phone/WebKit, keyboard/focus and noindex/private-no-store/CSP; one scoped module in the shared shell; user detail links to support history only with support permission; 2.6 inbox integration |
| Regression/closure | Local Worker/D1/Queue, migration preservation and indexed query plans; required auth/membership regressions, types/lint/units/build/assets; 2.8 includes the full help-desk lifecycle and a dedicated support acceptance record |

## Implementation and acceptance rules

Finalize each milestone's schema/API and UI proposal, implement the complete local
workflow, then run the mapped checks and record evidence before marking it complete.
Do not add placeholder production navigation or grantable permissions now. Graph
records must distinguish planned test relationships from executed evidence; no
unwritten test command is presented as runnable. No new Cloudflare account or
remote operation is needed for any development step.
