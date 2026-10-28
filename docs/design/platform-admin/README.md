# Platform administration — concept 01

**Status: owner APPROVED this admin panel and authorized local integration
(2026-10-24). Current-scope integration is complete locally, with the accepted
non-browser checks and full browser recovery recorded separately. Prototype checks
remain separate.**
The owner found the Phase 2.0 panel too basic in both appearance and workflow depth,
and explicitly requested an HTML demo before production changes. The owner subsequently approved this review deliverable and explicitly authorized
local production-code integration. The prototype itself remains isolated.
The previous 2.0 gate records the functional baseline. The owner separately
approved this replacement presentation and its local integration.

Open `http://127.0.0.1:8794/`. Restart with:

```bash
node scripts/preview-platform-admin.mjs
```

The server binds only to 127.0.0.1. It serves this folder, two existing local font
files and the favicon. It accepts GET/HEAD only and uses `connect-src 'none'` and
`form-action 'none'`. The demo has **no API, Worker, database, authentication,
Cloudflare account or remote-service connection**. All identities, metrics, trends,
plans and events are fictional. Changes live only in page memory; reload or Reset
sample data restores the sample. CSV exports contain fictional sample records.

## Design direction

A dark navigation rail anchors a light working surface. Self-hosted Jakarta and
Space Grotesk match existing ElectraSim assets. Compact tables, readable labels,
quiet borders, status badges and consistent blue actions replace the previous
stack of oversized forms/cards. The overview brings together people, access,
actionable review items and a readable recent-history feed.

The primary review screen is Overview. Supporting screens and drawers make the
workflow concrete rather than leaving navigation as non-functional decoration:

- **Overview:** sample figures/trend, attention links, recent users and activity.
- **People & access:** live-in-preview search, status/staff filters, checkboxes,
  pagination, account drawer and a reviewed sample bulk role action.
- **Dedicated user pages:** select a user name or Open full profile in the drawer.
  Each `#users/:id` route contains identity/verification/sign-in details, editable
  staff access, membership history, independent restriction/suspension controls,
  and scoped before/after activity. Routes can be bookmarked and reopened.
- **Account drawer:** quick account summary, membership, separate community restrictions
  and platform suspension, staff access and per-account activity. Actions require
  a reason and explicit review. Restoring platform access preserves a community
  restriction in this preview.
- **Access & roles:** system cards, custom-role archive/review, non-protected
  permission matrix and locked protected rows.
- **Memberships:** explicit Create membership plan and Assign membership actions.
  The plan editor includes unique code, description, capability selection, duration,
  draft/active/archive status, live preview and reviewed save with a reason. Manage
  plan reopens the editor. Only active plans can be assigned; the assignment
  dialog previews access/dates and records a reason. Member grants and each user’s
  dedicated Memberships section show current, ended and scheduled access. Grants
  snapshot plan names/capabilities/dates; editing a plan affects future assignments.
  The profile assignment action preselects that user. Basic access is the default,
  rather than a manually assigned plan. No billing or checkout is included.
- **Components (2.0A):** all 116 canonical names/IDs/categories, search/category/
  access filters and pagination, dedicated detail routes, code tier and effective
  access, locked 75-component Basic baseline, Pro→Free→Pro reasoned review and
  per-component/scoped history. The review can simulate a concurrent policy change;
  a failed change requires explicit reload and a new review. Impact counts are
  unavailable, and the proposed read-only/raw-backup/Basic-copy recovery is explained.
  This is a fictional memory-only policy; the simulator and server are unchanged.
- **Community settings:** readable limits, defaults and before/after review.
- **Audit:** human-readable actors/actions, scope/search and change detail.
- **Standards:** reference cards with no electrical-rule editing.
- **Preview as:** super admin/admin/moderator personas demonstrate navigation,
  directory/contact and write-control differences using the sample policy.
- **Search:** Ctrl/⌘ K finds permitted pages and sample accounts.

## Review focus

Review the overview hierarchy, navigation density, light/dark contrast, user-table
readability, dedicated user pages, quick-view drawer, membership plan creation and
assignment, component list/detail/access reviews and conflict recovery, separate
restriction/suspension decisions and change
review. Phone navigation and dialogs are included. Feedback and approval apply to
this concept; no live account action is available here.

## Approved production mapping

The tested guards/session/audit contracts remain authoritative. The prototype does
not replace server authorization with its persona switch. Existing per-account
role/restriction/suspension/settings operations can be retained under a new shell.

The richer directory filters/projections, registration analytics, safe actor-name
projection, bulk role review, exports, richer user projections and plan/grant
management screens are **proposals**. They need explicit
local API/UI acceptance when implemented: indexed bounded queries, scoped reads,
concurrency/conflict recovery, protected staff/last-super-admin checks, per-target
atomic audit and safe export behavior. A visual approval is not evidence that those
backends already exist. Membership administration stays super-admin-only. Public
subject/report moderation arrives with its Phase 2 milestones; the preview adds
no report/content module, billing, impersonation, hard deletion or standards edits.

## Verification

While the design server is running:

```bash
node scripts/check-platform-design.mjs
```

**Latest focused run (2026-10-24): passed, exit 0, on desktop Chrome, phone
Chrome and tablet WebKit.** Lint and formatting checks for the prototype scripts
also passed. Canonical inventory check:
`bun scripts/check-component-access-design.ts` verifies all 116 entries and the
75/41 baseline. Design-only results are recorded in the
[2.0A audit](../../audits/phase-2-component-access.md). Before integration began, all 50 production source fingerprints matched the
historical foundation manifest. Integration changes those sources and requires
its own acceptance; the earlier comparison is not a current production test run.

The focused check covers desktop Chrome, phone Chrome and tablet WebKit: viewport
containment, overview, directory search, quick-view/full-profile navigation and
deep-link reload, plan creation/assignment, per-user membership history, reviewed access changes,
independent restrictions/suspension/restore, permission preview, read-only settings,
component filters/pagination, locked Basic, reason/cancel, Free↔Pro changes,
concurrent review/reload, direct-route persona denial, keyboard search, runtime/CSP
errors and same-origin GET-only traffic. Screenshots
and checks stay ignored under `.wrangler/platform-admin-design/`. Passing prototype
checks does not renew production/API acceptance or grant owner design approval.

## Owner feedback incorporated (2026-10-24)

The owner requested both plan creation and dedicated pages for detailed user
review while retaining the existing quick-view drawer. Those workflows are now
part of this HTML concept. The owner approved the panel and authorized integration; see the
[integration plan](../../plans/PLATFORM_ADMIN_DESIGN_INTEGRATION.md).
The next plan, 2.0A, has started with a [schema/API contract](../../api/component-access.md),
[execution gates](../../plans/PHASE_2_0A_COMPONENT_ACCESS_PLAN.md) and the Components
workflow at `http://127.0.0.1:8794/#components`. Names and descriptions are a local
snapshot of canonical code; people, history and access changes remain fictional.
No production sources or Cloudflare configuration were changed for this concept.

## Integration scope confirmed by the owner

The owner explicitly allows features outside the current phase/milestone to wait
for their scheduled phase, with notes in `progress.md`. Actual integration uses
real permission-scoped counts/accounts/history. Prototype personas, fictional
trends and sample records stay here. Current membership APIs keep live plan-benefit
semantics rather than the sample's grant snapshots. Analytics, bulk staff actions
and full-directory exports need a separately accepted admin extension. Component
policy is 2.0A, profiles 2.1, support 2.7A, Content Studio Phase 5, billing Phase 7.


The approved current-scope production integration is now complete locally:
[audit](../../audits/platform-admin-design-integration.md),
[complete parity review](../../audits/admin-prototype-parity-review.md),
[latest manifest](../../audits/data/admin-parity-review-acceptance.json)
(2,235 units; 156 source/built browser cases), actual panel
`http://127.0.0.1:8791/admin/`. The demo remains separate. Components runtime and
later milestones retain their own acceptance; no fictional prototype record was
promoted to application data.


Phase 2.0A Gate E now implements the approved Components presentation at the actual
local `/admin/components/` route: canonical catalogue filters/detail, protected Basic,
reasoned Free/Pro review, scoped real audit and conflict/session recovery. Its
15 source + 15 built dedicated browser cases and full existing 16-stage regression
passed. See the [component audit](../../audits/phase-2-component-access.md) and
[scoped Gate E manifest](../../audits/data/component-access-gate-e-acceptance.json).
The fictional preview remains isolated. Dedicated full 2.0A acceptance F is still
required before profiles 2.1; this does not advance later milestones or permit remote work.

## Current phase integration — 2026-10-26

The earlier Gate E paragraph above is historical. Dedicated 2.0A Gate F completed
locally on 2026-10-25; its full [acceptance](../../audits/data/phase20a-acceptance.json)
remains separately scoped. The owner then approved the [profiles concept](../profiles/README.md)
and authorized 2.1 local integration. Real profile moderation is implemented in
`/admin/community/`, owner settings in `/settings/profile/`, and public SSR in
`/u/:handle`. The [2.1 audit](../../audits/phase-2-profiles.md) records its dedicated
acceptance progress; the old admin HTML concept still uses only fictional data.
