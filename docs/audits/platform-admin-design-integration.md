# Approved platform administration integration

**2026-10-24: owner approved the panel and authorized local integration. Current
status: complete locally within the documented scope. Acceptance combines the
successful non-browser checks and explicit full browser recovery below.** The later owner
instruction allows features outside this milestone to stay in their later phase,
with explicit progress notes. Local tests do not authorize publication/deployment.

[Scope](../plans/PLATFORM_ADMIN_DESIGN_INTEGRATION.md) ·
[API addendum](../api/platform-admin.md#approved-presentation-integration--2026-10-24) ·
[Original foundation](phase-2-admin-foundation.md) ·
[2.0A runtime work](phase-2-component-access.md)

## Implemented scope

Shared responsive dark rail/light working surface, self-hosted fonts, real identity,
permission-filtered navigation, mobile navigation/keyboard handling, command search
and protected sign-in/sign-out are connected to actual local APIs. The simulator
entry remains separate. No personas, fictional metrics or demo mutations ship.

Overview shows real scoped counts, five recent registrations only for user readers,
and eight permitted audit events. Directory has a responsive table with real
role/status filters and expiry-aware independent restriction/suspension flags.
Account names open bookmarkable `/admin/users/#:id` routes; a native quick-view
modal links to the full page. Details show verification/registration, roles and
effective grants, independent community/platform controls and scoped history.
Last sign-in is explicitly unavailable; no session metadata is exposed.

Memberships share the shell but keep the original super-admin guard and atomic
membership API. Plan cards, benefit/duration/status editors and live name/duration
preview, reviewed assignments and lifecycle operations remain real. User pages
include paginated membership history and preselected assignment/manage-grant links
only for super admins. List projection supplies safe plan/member names. The
accepted live plan-feature semantics remain authoritative; no snapshot-benefit
store was introduced. Restrictions and platform suspension remain independent.

### Owner-reported design parity follow-up — 2026-10-24

After the original acceptance, the owner identified four current-scope UI gaps by
comparing production routes with the approved prototype: the user detail route did
not expose its Overview/Access/Memberships/Activity tabs; Standards cards, Community
settings and Membership layouts were not using the approved presentation. These
items were not listed as later-phase deferrals and are treated as current-scope
bugs. The real routes now provide the four user tabs (including arrow-key
navigation), read-only standards reference cards, the settings layout, and
membership plan/benefit cards plus a member-grant table. The owner then identified
two residual differences: membership actions were below the tabs, and tabs could
retain rounded-button styling. Actions now appear in the upper-right page heading,
above the tabs; profile and membership tabs have square corners and the prototype's
underline-active style. Existing APIs, permission boundaries, reviews and audit
semantics remain in place. No demo data was added to production.

Validation of this follow-up: repository typecheck and changed-file lint passed; the
updated user-profile/layout browser flows passed across desktop Chromium, phone
Chromium and tablet Safari in two focused runs (six project cases total). Captured
local screenshots are ignored under `.wrangler/`. The latest source-browser profile/
membership layout flow additionally asserts that both actions are in the page heading
and profile tab corners are square; it passed all three projects. The isolated browser D1 is not
seeded with standards, so its screenshot shows the designed empty state; the actual
development D1 in `.wrangler/state` contains four code-owned standards records, as
confirmed by a local-only read. No seed was run. The original 16-check acceptance
is retained as evidence for its recorded source state; the complete 16-stage gate
was not rerun after this visual follow-up.

Roles use system cards, active/custom role editing, comparative role grants and
locked protected actions. Settings retain typed complete replacement, explicit
review and 409 reload. Audit uses safe actor names, real namespaced actions,
reason-visible rows and before/after detail. Standards remain read-only.

Migration `0008_admin_directory_indexes.sql` only adds role/name and registration
indexes; the Drizzle schema mirrors them. The populated upgrade test verifies
legacy identities/private documents/grants/audit preservation and indexed plans.
Actual runtime/API tests use their own isolated local stores.

## Validation ledger

- Focused unit/migration/client checks: 11 passed across three files.
- Initial full typecheck, repository lint and production build: exited 0.
- Actual local platform Worker/D1 API gate: 20 groups passed. Added safe verification/
  status projection, role filter/invalid-filter, current actor-name and moderator
  overview isolation assertions; existing revocation/concurrency/audit groups remain.
- First source Chromium run: 11 passed / 2 failed. Audit reason had moved behind
  closed detail and its test still used a list-row locator; reason is now visible
  and the check targets the actual table row. Command-search account locator was
  corrected to its real nested accessible label. Focused recovery: audit passed;
  search then exposed an actual focus-return issue after modal unmount. The modal
  now closes natively before focus restoration and focuses search input on open.
- Earlier full local attempts: superseded by the closure run below. Logs and stage manifest remain under
  `.wrangler/platform-admin-integration-2026-10-24/`; overall runner log is
  `.wrangler/admin-design-full-gate.log`. The completed acceptance is recorded below. Earlier failures remain recorded above; no waived assertion.

## Explicit deferrals

- 2.0A component controls require the separate real policy/storage/enforcement,
  transaction race and read-only recovery gate. The Components demo/contract alone
  is not a product module or acceptance. No placeholder production navigation.
- Public profiles/privacy: 2.1. Public subject moderation ships with those subjects
  and integrates in 2.7. Support tickets: 2.7A. Content Studio: Phase 5. Billing:
  Phase 7. No preview-only future feature is claimed implemented here.
- Registration-growth analytics, reviewed bulk staff operations and all-record CSV
  exports were prototype proposals beyond the accepted foundation scope. They need
  a separately scoped admin enhancement, indexed/authorized query design and
  concurrency/partial-failure/export checks. No inactive controls ship.

Historical Phase 2.0 acceptance remains intact and separate. Source changes make
its recorded hashes historical; the new integration needs its own evidence.
Phase 2 and 2.0A remain open; 2.1 has not started. Phase 1 exceptions are unchanged.

### Phone layout finding and consolidated rerun

The first full gate reached source browsers with all static/unit/API/parity stages
passing, then found the phone membership lifecycle could not click Review change.
A local isolated reproduction measured an intrinsic-width select expanding the
layout to **719 px** on a **412 px** device. The prior assertion compared against
`innerWidth`, which expanded too and concealed the overflow. Controls now have
explicit bounded width and labels use a `minmax(0, 1fr)` grid column; both browser
suites compare against `documentElement.clientWidth`. The reproduction now reports
412/412 px and the actual review click passes. This is a product layout fix, not a
forced click or timeout increase. Closed phone navigation also uses inert/hidden
semantics; the keyboard flow remains covered by the real browser suite.

The earlier full attempt remains under `.wrangler/platform-admin-integration-2026-10-24/`.
A new consolidated full run, including the final layout/accessibility source and
strengthened checks, is under `.wrangler/platform-admin-integration-final-2026-10-24/`
with runner log `.wrangler/admin-design-final-gate.log`. Do not treat the earlier
mixed/failed browser attempt or the targeted reproduction as full acceptance.

The first full source attempt finished **71 passed / 4 failed** (phone membership
lifecycle, benefit confirmation and user assignment; WebKit membership overflow).
The next source attempt reached **74 passed / 1 failed**: long benefit IDs and
translation JSON in the reasoned review still widened the phone document. Added
wrapping for content/definition values, plus a viewport-width assertion immediately
before membership confirmation. WebKit's remaining native-select paint overflow
was independently measured and bounded inside the padded record-editor fieldset;
the document itself is not cropped. Earlier successful static/API/unit results
remain historical to their attempt until the final consolidated gate completes.

The closure full-default attempt passed every non-browser stage and all actual
layout workflows, but finished source browsers **74 passed / 1 failed**. The sole
failure was a test readiness race: it demoted its actor while the initial plan list
was still loading, so that correctly denied read had already unmounted Refresh.
Waiting for initial Refresh enablement before demotion makes the manual-refresh
check deterministic without weakening the denial/private-cleanup assertions.
Production code is unchanged. Final e2e typecheck/lint passed, and both entire
browser matrices are being recovered explicitly with `--from browser` under
`.wrangler/platform-admin-integration-browser-closure-2026-10-24/`. This is a partial
runner selection; final full-scope acceptance must cite the successful non-browser
prefix and this recovery separately, not claim a single full-default exit 0.


## Complete local acceptance — 2026-10-24

The full-default attempt at
`PHASE20_EVIDENCE_DIR=.wrangler/platform-admin-integration-closure-2026-10-24 bun run verify:phase-2.0`
passed all **14 non-browser stages**, then its source matrix passed 74/75. WebKit's
role-removal test changed the role before the initial list finished; the list's
correct 403 unmounted Refresh while the test was trying to click it. The app had
already cleared private access. The test now waits for initial loading to finish
before demotion, preserving the subsequent manual-refresh and denial assertions.

With production code unchanged, the explicit recovery command
`PHASE20_EVIDENCE_DIR=.wrangler/platform-admin-integration-browser-closure-2026-10-24 bun run verify:phase-2.0 --from browser`
exited **0** for the complete source **75/75** and built **75/75** matrices. Final
e2e typecheck and repository lint also passed. **The complete 16-stage check scope
is accepted by combining those recorded runs; no single final full-default runner
exit 0 is claimed.** The browser recovery is a partial selector and does not stand
alone as full acceptance. The
[tracked integration manifest](data/platform-admin-design-acceptance.json) records
commands, counts, scoped source fingerprints, failures/recoveries and deferrals.
No case was skipped or retried in the accepted browser recovery. No production
code changed after the retained full attempt began; the only recovery edit was
the test readiness barrier. Earlier failures remain recorded, not waived.

| Check | Result |
| --- | --- |
| Types, repository lint and full units | Passed; **2,232 units / 147 files** |
| Gate and graph-tool tests | Passed |
| Build, asset budgets, CSP, links and SEO | Passed |
| Real local routing/storage spike | **6 groups** passed |
| Admin Worker/D1/cookie sessions | **20 groups** passed |
| Existing membership/simulator regressions | **34 groups** passed |
| Bun/workerd domain parity | **897 cases** passed |
| Source desktop/phone/WebKit | **75/75** passed |
| Built desktop/phone/WebKit through Worker Assets/D1 | **75/75** passed |

The **150 delivery-specific browser cases** cover 25 workflows across three source
and three built projects. Added workflows exercise actual quick view/full route
reload/command search, per-user assignment/history/manage-grant links, and ordinary
staff privacy. Existing role/session revocation, stale conflict/reload, restriction/
suspension and membership lifecycle checks remain. Headless browsers do not certify
physical target devices. Desktop and phone screenshots of the integrated account
page were visually inspected; source artifacts remain ignored under `.wrangler/`.

Initial app assets are **266,556 B JS gzip / 29,462 B CSS gzip**, within the unchanged
300,000 / 30,000 budgets. Phase 1 solver/dense-render hardware exceptions remain.
The original foundation manifest is historical and unchanged; matching fingerprints
are never a substitute for running checks.

Actual development Worker asset/privacy checks passed for **seven routes** using
the final build, including strict same-origin CSP, private/no-store/noindex,
separate entrypoints and unknown-admin-route 404. Only pending **0008** was applied
locally to `.wrangler/state` (three successful local commands). The development
panel is served at `http://127.0.0.1:8791/admin/`; existing local identities and
membership data are retained. No live website or Cloudflare account was used.

All requested current-scope administration integration is complete. **2.0A runtime
component policy, 2.1 and overall Phase 2 remain open.** The explicit later-phase
and additional-admin deferrals above still apply. No deployment, publication,
commit or push occurred.

The built recovery log retains seven workerd `disconnected` / `Broken pipe`
diagnostics. The server continued and all 75 built cases passed with exit 0; no
assertion was skipped. These diagnostics remain in the original log.


## Complete actual/demo parity closure — 2026-10-24

The owner's subsequent request to compare every current admin page identified
additional drawer/profile/role/editor/assignment/audit/settings gaps. The
[complete parity review](admin-prototype-parity-review.md) records the corrections,
16 actual/demo capture pairs and explicit remaining differences. This closure
supersedes the earlier focused-only follow-up status for the current source.

Current local acceptance covers all **16 checks** from the retained 14-stage
non-browser prefix plus explicit complete browser recovery: **2,235 units / 147
files, 20 admin and 34 existing API groups, 897 parity cases, 78/78 source and
78/78 built browser cases**. The source run's initial guest-session readiness race
and test-only recovery are retained; no single full-default exit 0 is claimed.
No accepted case was skipped or retried. All product source fingerprints remained
unchanged through recovery. See the [new manifest](data/admin-parity-review-acceptance.json);
the original foundation and earlier integration manifests remain historical.

The final comparison has 32 images with no desktop horizontal overflow; source/
built phone and WebKit workflows passed. Additional built asset checks passed for
seven routes/scripts. App budgets remain 266,556 B JS gzip / 29,462 B CSS gzip.
Phase 1 hardware exceptions remain unchanged. No remote operation, deployment,
commit or push occurred. Components 2.0A runtime gates B–F remain next; later
features and separate admin proposals stay explicitly deferred in the review.
