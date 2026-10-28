# Phase 2.0 — shared admin foundation

Status (2026-10-24): **2.0 complete locally within this foundation scope.**
Gates 3–4 contracts/implementation and gates 5–6 local acceptance passed.
Phase 2 remains open; 2.1 is planned and not started.
The user explicitly authorized implementation and resumed it after interruption.
All commands/bindings/targets remain local. No Cloudflare login, account operation,
remote resource, publication, commit or push is involved. Phase 1.14 hardware
performance exceptions and all numerical/asset budgets remain unchanged.

[Contract](../api/platform-admin.md) · [Phase plan](../plans/PHASE_2_COMMUNITY_PLAN.md) ·
[Routing/storage spike](phase-2-foundation-spike.md)

## Owner design review after the functional gate

The owner found the initial panel too basic in both design and workflow depth and
requested a standalone HTML concept before production changes. The
[concept and verification scope](../design/platform-admin/README.md) record the
local preview, including membership plan creation/assignment and dedicated user
profiles alongside quick view. It uses fictional memory-only records, with no API,
database or Cloudflare connection. Focused prototype checks are separate from the
16-stage production foundation gate recorded below. The functional acceptance
manifest remains historical evidence for the baseline; the proposed presentation
and additional workflow projections awaited owner approval at that checkpoint.
The owner subsequently approved the panel and authorized integration; its
[current local acceptance](platform-admin-design-integration.md) and separate
[manifest](data/platform-admin-design-acceptance.json) cover the new implementation.
The original counts/fingerprints below remain historical.

## Implemented scope

- Shared `/admin/` overview and permission-filtered navigation; users, roles and
  system policy, restrictions/suspension, typed settings, scoped audit and read-only
  standards. Existing `/admin/pro/` retains its super-admin gate and links back.
- Separate code-owned permission/module registry; active custom-role assignments
  union with configured non-protected moderator/admin policy. Protected roles,
  membership and suspension powers cannot be delegated. Only registered modules
  have navigation; public subject controls arrive with their own milestones.
- Migration 0007 creates separate admin revision/role/policy/settings/control/
  restriction/audit storage, indexed identity search, immutable audit triggers and
  a session-insert suspension trigger. Existing membership/private/retired tables
  remain intact. SQL migrations remain authoritative for triggers and auth indexes;
  Drizzle mirrors the new tables/constraints without editing generated auth tables.
- Fresh primary guards, conditional global revision claims, atomic guarded writes
  and audit. Conservative revision conflicts include unrelated concurrent admin
  writes; the UI requires reload/review and never replays silently.
- Better Auth session-create suspension hook, a database insert-race guard, primary
  authenticated-request checks and atomic session deletion. Expiry/restore permits
  a fresh login and never recreates revoked sessions. Community restrictions keep
  private circuit work and paid grants available.
- New local Vite entries replace the old external-script CMS index, with strict
  same-origin admin CSP/noindex/private-no-store and explicit Worker-first `/api/*`.
  Missing assets now use the tested 404 policy. Discovery route ownership waits
  for actual community routes. No editor import belongs to an admin entry.
- Extension fixture exists only in an isolated localhost test entry. Real tests
  check its permission, settings and audit namespace boundary; the app does not
  import test entrypoints. The harness shares its serving Worker's D1 binding,
  avoiding a second process opening the same local SQLite database.

## Local acceptance

`bun run verify:phase-2.0` owns the reproducible complete local gate, with explicit
partial selectors and per-stage logs/results under ignored `.wrangler/phase20/`.
The [tracked acceptance manifest](data/phase20-acceptance.json) records exact final
stages/cases, source fingerprints and limits.
No unexecuted stage or matching graph fingerprint is a passing test result.

Early checks: 18 real local API/session/D1 groups passed in
`.wrangler/platform-admin-CbY6bm`; subsequent fixture-isolation and immutable-audit
checks will run in the gate. Eight focused registry/settings/migration tests pass.
The migration test upgrades a populated pre-0007 SQLite schema and verifies that
identity, private circuits, historical attempts, memberships and audit are intact.

Initial source-Chrome exploration passed 7/9 cases, then 9/10 after adding the
sign-in case: the failures were exact-label locators on populated textarea/select
controls and duplicate non-unique audit reasons in persistent local test data.
Selectors now use accessible roles and audit reasons are unique; the focused
settings recovery passed. Logs remain in `.wrangler/platform-admin-browser-source*`
and `.wrangler/platform-admin-settings-browser-recovery.log`. The final gate must
run the complete source and built desktop/phone/WebKit matrices without skipping
these assertions. Those headless projects do not certify physical target devices.

## Completed gate — 2026-10-24

`PHASE20_EVIDENCE_DIR=.wrangler/phase20/foundation-2026-10-24 bun run verify:phase-2.0`
exited **0**, with **all 16 stages** passing in the full default selection.
The evidence root contains each stage log plus machine-readable results/manifest.

| Check | Observed result |
| --- | --- |
| Full typecheck / repository lint | Passed |
| Full units | **2,232 tests / 147 files** passed, including eight new registry/settings/populated-upgrade assertions |
| Phase gate / graph-tool tests | **11 / 5** passed |
| Build, CSP, links and SEO | Passed; **199** HTML files / **191** SEO pages |
| Initial app assets | **266,494 B JS gzip / 29,450 B CSS gzip**, within unchanged 300,000 / 30,000 budgets |
| Local routing/storage spike | **6 groups** passed |
| New admin Worker/D1/cookie sessions | **20 groups** passed in `.wrangler/platform-admin-WpCGLU` |
| Existing membership/simulator APIs and paid browser flow | **34 groups** passed in `.wrangler/membership-tests-Tcl2by` |
| Bun/workerd domain parity | **897 cases** passed in `.wrangler/domain-tests-iCmZ7Y` |
| Source browser matrix | **66/66**, desktop Chrome, phone Chrome and tablet WebKit |
| Built browser matrix | **66/66**, desktop Chrome, phone Chrome and tablet WebKit, through actual Worker Assets/D1 |

The 132 browser cases comprise **60 new platform cases** and **72 existing
membership regressions**. No case was skipped or retried in the full gate.
Coverage includes real custom roles/matrix/assignment/archive/revocation, explicit
super-admin provisioning, restrictions, suspension/restore, version-conflict reload,
scoped audit, keyboard dialog behavior, private-data cleanup after role/session
loss and rejection of a delayed private response after revocation. The storage
failure case injects a 503 solely to verify UI recovery; API lifecycle cases use
real local Worker/D1 sessions. Headless projects are not physical-device approval.

The built run retained two workerd broken-pipe client-disconnect diagnostics in
`browser-2.log`; the server continued and all 66 cases passed. Historical solver/
dense-render failures remain recorded in Phase 1.14; this gate renews functional,
parity and asset evidence rather than certifying those hardware targets.

`bun scripts/check-platform-assets.mjs` also passed against the built test Worker
and the actual development Worker (use `PLATFORM_ASSET_TEST_ORIGIN=http://127.0.0.1:8791`
for the latter): **seven admin pages / four entry scripts**, strict self-only CSP,
private/no-store, noindex, separate editor entry and unknown-admin-route 404.
Actual development `/api/admin/access` denies guests and test fixture URLs return
404. Logs: `.wrangler/platform-admin-assets.log` and
`.wrangler/platform-admin-dev-assets.log`.

The development database had only 0007 pending. Applied it with
`bun x wrangler d1 migrations apply DB --local --persist-to .wrangler/state`:
**23 successful local statements**, no account/login/remote operation.
`.wrangler/platform-admin-dev-migration.log` records the local target and result.

## Local access

The actual development Worker is serving the built interface at
`http://127.0.0.1:8791/admin/`, using `bun run dev:worker` and `.wrangler/state`.
Sign in with a local staff account. The existing explicit first-super-admin
bootstrap remains `bun run bootstrap:super-admin --local --email YOUR_LOCAL_EMAIL`
after that account is registered locally; it refuses an unknown account or a
second bootstrap. Development identities/grants were preserved; test accounts
live only in isolated test persistence. Restart with `bun run dev:worker` if needed.

## Remaining milestone boundary

No profile/publication/comment/collection/report product is accepted by 2.0.
The contract defines subject adapters; their actual APIs, moderation screens,
visibility/search/cache/notification consistency and counts ship with later
milestones. Foundation community settings are typed defaults, not evidence that
future public workflows consume them. Hosted testing, deployment and the new
Cloudflare account remain separately authorized future work.
