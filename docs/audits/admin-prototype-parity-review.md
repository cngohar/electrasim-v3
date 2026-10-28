# Admin prototype parity review — 2026-10-24

Status: current-scope corrections accepted locally across the complete 16-check scope.
Phase 2.0A runtime and overall Phase 2 remain open.

**Owner acceptance — 2026-10-25:** the owner explicitly confirmed this review is
completed and accepted, and authorized starting Phase 2.0A. The recorded current-scope
acceptance and explicit deferrals below remain authoritative; no new test run or
remote authorization is implied by that decision.

The owner requested another comparison of the actual application against the
[approved demo](../design/platform-admin/README.md) before starting the next
milestone. This review covers the actual source and built application, not only
the HTML prototype. The [approved integration scope](../plans/PLATFORM_ADMIN_DESIGN_INTEGRATION.md)
and [membership contract](../api/membership.md) remain authoritative.

## Screens and interactions reviewed

Local comparison captures use isolated test identities, real cookie sessions,
real Worker/D1 APIs and canonical code-owned standards. The capture states include
Overview, Users, Access & roles, Memberships, Community settings, Audit, Standards,
all four user-profile sections, all three account-drawer sections, the plan editor
and membership assignment. Images stay ignored under
`.wrangler/admin-comparison/`; no real user/circuit content is included.

| Screen | Finding and correction |
| --- | --- |
| Shared shell | Reordered permitted navigation to the approved layout; retained actual actor identity, search, session recovery and sign-out. Generic legacy button/card rules no longer override flat tabs, back links or flush table cards. |
| Overview | Kept real scoped counts, bounded recent registrations and permitted activity; restored colored metric icons and the approved card order. Demo analytics/attention/export proposals remain deferred below. |
| Directory | Restored the page heading and Find an account action, compact accessible search/filter controls and arrow actions. The real role/status filters remain more precise than the sample segmented filters. Names open the full account route; quick view remains separately available. |
| User profile | Removed the duplicate directory heading above a dedicated account; restored large identity treatment, the four flat tabs, facts, membership overview, latest activity and independent controls. Staff access is in Access & roles; scoped Activity shows actual reasons and before/after values. |
| Account drawer | Replaced the minimal summary with the approved identity/header, full-profile link and Account overview / Access & roles / Activity tabs. Reused actual protected role/restriction/suspension workflows and permission-scoped membership/history reads. |
| Access & roles | Moved role creation to the page heading and a native dialog; restored the custom-role table and the side-by-side permission matrix with protected locked rows. Counts describe actual system permissions rather than fictional staff totals. |
| Memberships | Retained upper-right Assign membership / Create membership plan actions and flat tabs; restored real benefit lists, active-member counts and plan codes on cards. Grants show safe member/plan/assigning-actor names and lifecycle state. Benefits and membership audit remain additional real sections. |
| Plan editor | Restored the dedicated heading/back link, identity and access sections, description textarea, duration/status layout and live side preview. Pricing metadata is secondary; capability names reflect actual implemented handlers. New plans default to 30 days. Existing plans preserve their recorded values. |
| Assignment and review | Assignment uses a native dialog, real paginated member/active-plan pickers, capability preview and explicit UTC dates. Review is a native dialog with a reason and stale-record reload inside the modal. No forced click is used to reach recovery actions. |
| Community settings | Restored row ordering, full-width banned words at the bottom, clear policy fields and the editable/read-only indication. Accessible control names remain explicit with descriptive help text. |
| Audit | Restored a compact scope/action toolbar; actor, target and date filters are available under More filters. Actual reason-visible entries retain scoped before/after detail. |
| Standards | Removed the duplicate heading; all four canonical records render as read-only reference cards with voltage/frequency units and actual citations/model version. Canonical EU/International teaching-profile labels are retained. |
| Service failure | Empty or malformed API responses produce a useful service error; denial status is retained so private data is still cleared. This covers the earlier empty Vite proxy response symptom. |

## Explicit remaining differences and phase placement

| Demo item | Production status / later work |
| --- | --- |
| Fictional people, figures, events, role personas and Reset sample data | Demo harness only. Production uses actual authorized records and never ships the persona switch or sample reset. |
| Registration trend chart, comparison periods, summary exports and Needs attention analytics | Separate admin enhancement proposal; needs bounded indexed queries, scope and export acceptance. Not a Phase 2.0 foundation requirement. |
| Directory bulk selection/actions and all-record CSV export | Separate admin enhancement with protected review, per-target concurrency/partial-failure and export acceptance. |
| Membership badges across the directory / inferred Pro status | Additional protected directory projection; not exposed to ordinary staff by the accepted directory API. Super admins can inspect actual per-account grants. A latest-grant summary never claims complete effective capability coverage. |
| Last sign-in / sign-in-method sample metadata | Unavailable in the accepted account projection; displayed as unavailable rather than inferred from private sessions. |
| Demo grant benefit snapshots | The accepted membership contract uses live plan-feature links. Existing grant dates are retained. The prototype's snapshot semantics do not redefine storage behavior. |
| Preset-only plan duration choices | Production supports the accepted 1–36500-day contract and no-expiry mode; the same duration is shown in the live preview. |
| Components | At this review, Phase 2.0A runtime gates B–F were pending after design gate A. Later implementation progress is tracked in the separate [component audit](phase-2-component-access.md); this review does not accept that module. |
| Public profiles, public-subject moderation, Support, Content Studio and Billing | Profiles 2.1; subject controls with 2.2/2.6 and integrated 2.7; support 2.7A; Content Studio Phase 5; billing Phase 7. |

## Read projections and test setup

Protected plan lists add actual benefit labels/enablement and a distinct count of
currently active members. Per-page feature reads and counts share the existing D1
batch. Feature reads use the existing plan-feature primary key; active-member
counts use the existing entitlement plan index. Grant lists add the safe assigning
actor name. No new permissions, write operations or migrations are introduced.

Browser startup now seeds the canonical standards projection into each isolated
local test database through an explicitly local command. The existing supported
`seed:standards --local` guard remains unchanged; test seeding never targets the
normal development database. This replaces the previous standards empty-state-only
browser coverage.

## Acceptance

The retained full attempt at
`PHASE20_EVIDENCE_DIR=.wrangler/admin-parity-closure-2026-10-24 bun run verify:phase-2.0`
passed all 14 non-browser stages: **2,235 units / 147 files**, types, lint, gate and
graph tooling, build/assets/CSP/links/SEO, six local spike groups, 20 admin API
groups, 34 membership/simulator groups and 897 Bun/workerd parity cases.

Its source-browser matrix passed **77/78**. The guest-session test cleared cookies
while the initial plan list was still loading. The correctly denied list removed
Refresh while the test was attempting its manual refresh. The test now waits for
initial Refresh readiness before expiring the session. This preserves the private
cleanup/denial assertions and changes no product code. E2E types and changed-test
lint passed afterward. The explicit `--from browser` recovery under
`.wrangler/admin-parity-browser-recovery-2026-10-24/` exited **0**: source **78/78**
and built **78/78**, covering 26 workflows across desktop Chromium, phone Chromium
and tablet WebKit on both deliveries. No cases were skipped or retried.

The complete **16-check scope is accepted by combining the 14-stage non-browser
prefix with this browser recovery**. No single full-default runner exit 0 is
claimed, and the partial browser selector does not establish full acceptance alone.
The [tracked manifest](data/admin-parity-review-acceptance.json) records both runs,
all 16 stage results and 48 scoped source fingerprints. The source guard matched
through recovery and final comparison; no product source changed.

A final capture pass reproduced all **16 actual/demo pairs (32 images)** against
the current source with no horizontal overflow at 1440 × 1000. Existing source/built
phone and WebKit workflows also passed. An additional built Worker Assets check
passed **seven routes / seven scripts**, including private/no-store/noindex, strict
CSP, separate entrypoints and unknown-route 404. Initial app assets remain
**266,556 B JS gzip / 29,462 B CSS gzip**, within 300,000 / 30,000 budgets.
Headless checks do not certify physical hardware or close Phase 1 performance exceptions.

The earlier `.wrangler/admin-parity-full-2026-10-24/` attempt stopped at typecheck
for a nullable access reference and unused icon import; both were fixed before the
retained full attempt. Exploratory browser logs also retain the modal-conflict
recovery finding and the settings/description-label and test-projection fixes.
Earlier failed runs remain retained. Original foundation and earlier integration
manifests remain historical and unchanged.
No remote account, live website, deployment, commit or push is authorized by this
review. Overall Phase 2 remains open.
