# Phase 2.0A — component access

**2026-10-25: Phase 2.0A Gates A-F are complete locally. The owner authorized
implementation after accepting the admin review; dedicated full Gate F exited 0
with all 18 stages, 2305 units, 8 storage / 14 component API groups, 897 unchanged
parity and 105 source + 105 built browser cases without skips/retries.**
The [dedicated manifest](data/phase20a-acceptance.json) records the complete scope,
commands, counts, logs and source fingerprints. Historical 2.0, admin presentation
integration/parity and Gates B-E keep their original acceptance scopes and recovery
distinctions. Profiles 2.1 is next, not started; overall Phase 2 and prior performance
exceptions remain open. No deployment/account/remote operation is authorized.

## Reviewed foundations and design work

Read the extension plan, accepted platform/membership contracts, current registry,
atomic mutation helper, canonical catalogue, shared access/circuit resolvers,
server authorization/save predicates and client access lifecycle. Recorded all
116 IDs as 75 protected Basic / 41 originally Pro. The draft contract specifies
immutable baseline storage, a policy revision separate from the global admin
revision, protected mutation/audit actions and exact metadata-only projections.

Found two integration hazards: the server capability predicate is empty when no
benefit is required, and the client authorization returns early in that case.
Previously-Free originally-Pro actions must still recheck fresh policy; all save
INSERT/PATCH predicates must include the policy revision. Neither hazard is fixed
by a display-only catalogue override. The solver stays pure.

## Executed design checks — 2026-10-24

- `bun scripts/check-component-access-design.ts`: exit 0; all 116 canonical IDs,
  labels/categories/descriptions/tiers match the local display snapshot; 75 Basic
  and 41 Pro baseline IDs are distinct and complete. Inventory check only.
- `node scripts/check-platform-design.mjs`: exit 0 across desktop Chromium,
  Pixel 7 Chromium and tablet WebKit. Existing overview/users/membership workflows
  plus catalogue search/category/access filters, pagination, empty/unknown states,
  protected Basic, empty reason/cancel, Pro→Free→Pro history, stale review rejection,
  explicit reload/new reason, persona/direct-route denial and GET-only/no-API/CSP
  assertions passed. Screenshots and result JSON remain ignored under
  `.wrangler/platform-admin-design/`. Desktop and phone component screenshots were
  visually inspected. These are prototype checks, not source/built product cases.
- Focused Biome checks for prototype scripts and inventory checker, plus CSS/JSON
  formatting: exit 0. Historical 2.0 manifest's 50 production source hashes matched
  before production integration began; this comparison is not a new passing gate.

Initial inventory-check attempt used JSON parsing after Biome had formatted the
classic-script catalogue as JavaScript; it failed before checking data. The checker
now evaluates the trusted local static snapshot in a bounded VM and compares its
JSON value with canonical definitions. The first browser attempt failed because an
exact text locator excluded the surrounding history paragraph; the reason locator
and placement of the independent component scenario were corrected. Both failures
precede the successful full three-browser run above; no assertion was skipped.

## Gate B — shared policy/storage, 2026-10-25

- Added code-owned `component-baseline.ts`, pinned to all 75 protected Basic and
  41 originally Pro canonical IDs. Future canonical additions/classification edits
  require explicit inventory/migration review; mutable policy cannot alter this list.
- Added `component-policy.ts`: exact complete snapshot validation, safe revision,
  unknown/duplicate/missing IDs and Basic paywall rejection, defensive copy/sort/freeze
  and private runtime branding. Validation conveys no server authority or freshness.
- Pure content/circuit resolvers accept an optional validated policy. The no-policy
  path preserves the original tier and faults/membership stay independent. All current
  application callers retain this path; action authorization is not enabled here.
  `hasOriginallyProComponents` supports the later fresh-authorization gate, including
  originally Pro content displayed Free, and validates every supplied ID.
- Allocated `0009_component_access.sql` after actual migration 0008, with baseline,
  separate revision and overrides plus Drizzle mirror/schema export. Update/delete
  and replacement of existing baseline IDs are blocked; overrides reject Basic and
  unknown targets on insert/update. Safe integers, timestamps and actor references
  are checked. No existing table/content is rewritten.

Focused executed checks:

- `bun x vitest run packages/access/src`: **59/59** tests in three files. Includes
  34 new policy cases, canonical/inventory agreement, malformed/forged policy denial,
  original-tier fallback, all 41 Pro toggles and independent fault/document semantics.
- `bun run test:component-access-storage`: **8/8** real local D1 groups. Migrates
  through 0008, inserts local owner/private-circuit/historical-attempt/plan/grant/
  role/audit fixtures, then applies 0009 and compares every prior application table.
  Checks exact primary baseline/revision/empty overrides; all 116 baseline IDs reject
  UPDATE/DELETE/REPLACE; all 75 Basic IDs reject Free/Pro overrides; target updates,
  enum/integer/timestamp/foreign-key constraints and D1 batch rollback pass.
  Evidence: `.wrangler/component-storage-YcExh0/{before.log,upgrade.log,result.json}`.
- `bun run typecheck`: exit 0 across the full repository and test configurations.
- `bun scripts/check-component-access-design.ts`: exit 0, 116 IDs and 75/41 inventory.

Two initial storage-harness failures remain under
`.wrangler/component-storage-s6H5dt/` (proxy path omitted the CLI's `v3` suffix,
opening an empty test database) and `.wrangler/component-storage-b9cW7o/` (identifier
allowlist incorrectly excluded digits in `i18n_strings`). Both occurred before the
0009 upgrade. Corrected only test setup; no constraint assertion was skipped.
The successful run uses CLI `--local --persist-to`, a generated local-only binding,
proxy `remoteBindings: false`, and disposes each proxy before CLI access.
Normal development persistence was not opened, seeded or migrated.

The full existing admin regression command
`PHASE20_EVIDENCE_DIR=.wrangler/component-access-gate-b-2026-10-25 bun run verify:phase-2.0`
exited **0 with full selection and all 16 stages passing**. Manifest/results and
individual logs remain in that ignored evidence directory. Results:

- **2,269 units / 148 files**, including the 59 focused access tests above.
- **6** infrastructure spike groups, **20** admin groups and **34** existing
  membership/simulator groups; unchanged **897** Bun/workerd parity cases.
- **78/78 source + 78/78 built** browser cases across desktop/phone Chromium and
  tablet WebKit, without skips or retries (8.6 / 8.3 minutes respectively).
- Full types/lint/build/static/tooling checks and existing asset budgets passed:
  **267,361 B entry JS gzip / 29,462 B CSS gzip**. These are bundle budgets, not
  new hardware performance certification.

The separate eight-group storage command also passed, as recorded above. The
full command is an existing-foundation regression check, not dedicated 2.0A C–F
acceptance. Earlier 2.0/parity manifests retain their historical scope and recovery
provenance. Gate B source fingerprints remain in `gate-b-source-hashes.txt` and
matched after completion; comparison itself is not a passing-test claim.

Built logs retain workerd broken-pipe stderr also present in the previously accepted
`.wrangler/admin-parity-browser-recovery-2026-10-24/browser-2.log`. All browser
assertions passed; no logs or tests were suppressed. Global `graph:check` remains
nonzero for historical unreviewed/changed evidence; scoped graph review records
navigation/evidence freshness independently of these executed checks.

## Gate C — server boundary, 2026-10-25

Implemented the authoritative HTTP boundary. All **14 dedicated local HTTP/race
groups passed** (`bun run test:component-access-api`, exit 0), with results and Worker
log retained at `.wrangler/component-api-i5y0FZ/`. The separate full existing 16-stage regression also passed, as recorded below:

- Public `/api/catalog/component-access` reads a new primary session, validates
  persisted inventory/revision/overrides against code, and returns only the complete
  sorted policy. Missing storage fails 503; no fabricated Free policy or staff data.
- Registered protected `catalog.components.manage` / `catalog.audit.read` and the
  real bounded list/detail/reasoned PATCH handlers. Basic is locked even for a Free
  no-op; unknown/malformed/no-op/stale reviews are rejected. Usage remains explicitly
  unavailable (`null`), with no private circuit scans. Components navigation remains
  with the actual reviewed production screen in Gate E.
- Existing `commitAdminChange` claims the admin revision under current role/account,
  policy revision and previous effective access predicates. The override, separate
  policy increment and append-only scoped audit share its mutation ID and D1 batch.
  Ordinary/custom/system/staff grants cannot delegate protected catalogue powers.
  Existing audit projections filter this namespace independently.
- Server circuit classification uses only primary policy. Revisions bracket primary
  membership reads; final authorize/simulate checks repeat authority after computation.
  Every content-saving INSERT/PATCH includes both policy and existing capability
  predicates, even Basic/previously-Free saves. PATCH checks its read version and
  computes the union of old/replacement requirements under the same policy. Original
  owner documents and deliberate deletion remain available after a downgrade.
- Simulation retains every result field and adds separate `access` metadata. Existing
  simulator regression helpers verify this metadata before performing their unchanged
  exact domain-result comparisons. No solver/physics code changed. Editor display and
  action lifecycle still use original classification until Gate D.
- Added `test:component-access-api` with an isolated local D1 and real cookie sessions.
  Its test-only entry intercepts serving D1 execution to inject competing changes
  immediately before actual application statements; it does not replace handlers or
  add production hooks. Test routes require the local environment/loopback and are
  absent from the application Worker. It uses the existing compatibility target.

Already executed during implementation: **120 selected access/server/registry units**,
full typecheck, **20 existing platform-admin groups** (`.wrangler/platform-admin-hTplwA/`),
and **34 existing membership/simulator groups** (`.wrangler/membership-tests-1wBSS1/`) passed. The full gate records its own results separately below.
D1 HTTP burst timings in the standalone membership log include concurrent local
work, authentication/queue/network and repeated policy reads; they are not
Worker-to-D1 latency or hardware performance certification.

Read the installed D1 types and verified transactional batch rollback and Sessions
primary constraints against [D1 Database](https://developers.cloudflare.com/d1/worker-api/d1-database/)
and [read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/).
All tests use `--local` and isolated persistence, with Cloudflare credential variables
removed from the new harness. No normal development database was migrated.

Initial harness failures remain recorded by each isolated result/Worker log:

- `.wrangler/component-api-eFavd9`: test used a nonexistent system-permission route;
  corrected to the actual `/permissions` body contract and protected delegation check.
- `.wrangler/component-api-ML8i70`: custom user had user-read permission but no audit
  scope; the test now explicitly expects 403, while permitted staff history excludes catalog.
- `.wrangler/component-api-ebU2KC`: direct suspension fixture preserves sessions,
  so the next guard correctly returns 403; corrected the fixture's 401 assumption.
- `.wrangler/component-api-Ph7SR7`: the reference “Basic” series fixture contains
  Pro devices; replaced it with an explicitly protected Basic bulb circuit and a
  separate originally-Pro addition. Unrelated cookies do not deny guest Basic access.
- `.wrangler/component-api-OpVp9M`: all 13 functional/race/recovery groups passed;
  the final isolation request lacked Origin/JSON headers and correctly stopped at
  403 before route lookup. Corrected only test headers so production 404 is exercised.

No assertion was removed or skipped. Early typechecking also caught the inferred
literal-key Map and malformed fault fixture; fixed explicit string-key typing and
used the domain fault constructor. Focused formatting findings were corrected.
Production source and harness fingerprints are retained as
`.wrangler/component-access-gate-c-2026-10-25/gate-c-source-hashes.txt`.

## Gate C — completed existing-foundation regression

`PHASE20_EVIDENCE_DIR=.wrangler/component-access-gate-c-2026-10-25 bun run verify:phase-2.0`
exited **0 with full selection and all 16 stages passing**. Inspected its manifest,
results and stage logs. This is a new run; earlier foundation/parity/Gate B manifests
retain their historical scopes and recovery provenance. Results:

- **2,269 units / 148 files**, full types/lint and gate/graph tooling checks.
- **6 infrastructure spike, 20 admin and 34 existing membership/simulator groups**.
- Unchanged **897 domain parity cases**, including exact electrical results.
- **78/78 source + 78/78 built browser cases**, desktop/phone Chromium and tablet
  WebKit, without skips or retries (8.1 / 7.4 minutes).
- Build, links, CSP, SEO and existing asset budgets passed: **267,361 B entry JS
  gzip / 29,462 B CSS gzip**. No new hardware performance certification.

The dedicated 14-group Gate C command remains separate from that existing gate.
Its results are `.wrangler/component-api-i5y0FZ/results.json`; full regression
manifest/results/logs are `.wrangler/component-access-gate-c-2026-10-25/`.
The 17 recorded source/harness fingerprints matched after both runs; comparison
itself is not a passing-test claim. Built logs retain workerd broken-pipe stderr
also present in the accepted prior runs; no logs or assertions were suppressed.
Normal development persistence and Cloudflare remote resources were not opened.

Gate C is complete locally. This accepts the server boundary, not client lifecycle,
actual Components UI or full 2.0A. Scoped graph reviews record this evidence;
global historical/unrelated unreviewed or changed records remain separate.

## Gate D — client policy/recovery, complete locally, 2026-10-25

Implemented the client boundary and dedicated checks. **12/12 source policy browser
cases** passed across desktop/phone Chromium and tablet WebKit (4.1 minutes), followed
by **12/12 built policy cases** (2.3 minutes), without skips/retries. The full existing
16-stage regression completed with **full selection and exit 0**, including **2305
units / 151 files**, 6 spike / 20 admin / 34 membership-simulator groups, unchanged
897 parity, build/static/tooling checks and **78 source + 78 built admin browser cases**
without skips/retries. Gate D is complete locally; this does not accept full 2.0A.

- `simulatorAccess.ts` holds independent membership fields and an opaque display
  policy with local receipt time. It expires after 30 seconds, falls back to the
  code-owned original tier on failures/offline, and revalidates while visible.
  Focus, visibility return, offline, sign-out and account generation changes
  invalidate prior authority. Revision/content high-water and request/session
  generations prevent older responses from restoring stale overrides or another
  account. Membership alone cannot restore a policy override.
- Placement/paste, undo/redo, momentary presses, configuration/fault edits and
  restoration editing decide whether to authorize from **original classification**,
  independently of displayed requirements. Old and replacement content both cross
  fresh checks, share a policy revision, and retain current membership/receipt and
  document checks before committing. Obsolete drawings stop before a second request.
  Basic-only edits and one Basic fault retain their synchronous offline path.
- Palette, command search and variant membership labels use effective display policy.
  Guided/template loading, imports, originals and account loads remain view operations:
  denied authorization leaves the complete drawing available read-only. Each originally
  Pro opening still requests fresh authorization; edits/runs repeat it independently.
  Guide tiers retain their existing curriculum/interface meaning, not membership grants.
- File imports preserve exact raw text in the existing local recovery namespace before
  replacement, with access/session/full-document checks after asynchronous storage.
  Backup failure aborts replacement. Paste import retains its existing outer-whitespace
  trimming; its JSON payload is backed up before replacement. Explicit Basic copies use the immutable original
  baseline, retain the original first, and remain usable if a temporary Free override
  later expires. Saved circuits can download or deliberately reopen preserved originals.
- Account list/load/save responses check captured account/access/document state. Save
  performs a fresh originally-Pro check before the authoritative conditional API write.
  Late private loads cannot replace a new session's drawing. Sign-out invalidates local
  authority immediately. No policy is persisted into a circuit or used by the solver.
- Local simulation checks fresh authority again before publishing originally-Pro results
  or derived trip/damage state, including clock continuations. A changed authority stops
  that run and clears its pending result without rewriting its drawing; a policy cycle
  cannot publish a stale result even when its final access value matches. Basic clock
  continuations remain local. This is functional evidence, not hardware recertification.

Executed focused validation: 26 policy lifecycle/action cases, 7 raw/opening/recovery
cases and 3 simulation publication races, plus existing editor/simulation/configuration
regressions. The final selected run passed **53 units / 5 files**. Earlier whole-unit
run passed 2301 tests before the four additional identity/simulation cases; the full
existing regression completed at 2305 tests / 151 files. Repeated the unchanged
Gate C server harness: **14/14 local groups** passed at `.wrangler/component-api-ixwGcz/`.
Dedicated browser logs are `.wrangler/component-gate-d-browser-source-full.log` and
`.wrangler/component-gate-d-browser-built-full.log`. All 27 source/harness fingerprints
are retained at `.wrangler/component-access-gate-d-2026-10-25/gate-d-source-hashes.txt`.
The whole-unit/build/static run passed at 268,946 B JS gzip / 29,462 B CSS gzip;
these are asset budgets, not hardware performance certification.

The first focused attempt exposed an unnecessary asynchronous gap before the first
Pro check and a second request after an already-obsolete document. Fixed the actual
mutation boundary and retained the cancel/start/revise/supply/session assertions.
The first simulation-race check found a denied Run could be rescheduled by authority
invalidation; changed the hook to stop the affected run, then all three publication
races passed. Existing positive-response mocks now supply the real complete policy,
computed requirements and timestamp rather than an obsolete membership-only shape.

The first new opening fixtures incorrectly labeled schema-3 profiles as schema 2 and
compared them to pre-normalized objects. Corrected test setup using the existing
normalizer and schema 3; exact raw text still matches byte-for-byte. Initial test
format/type findings remain in ignored `.wrangler/component-gate-d-*` logs.
The first desktop browser run failed because model fixtures overlapped at the origin,
backup-count inspection raced IndexedDB, and expected drawings omitted established
empty-fault/voltage defaults. Corrected only fixture layout, awaited the backup list
and included those defaults. Preserved failure screenshots/contexts at
`.wrangler/component-gate-d-browser-first-results/`; the second complete desktop run
passed 4/4, then the full 12-case source matrix passed. No assertion was skipped.

## Gate D — completed existing-foundation regression

Executed `PHASE20_EVIDENCE_DIR=.wrangler/component-access-gate-d-2026-10-25 bun run verify:phase-2.0`.
The retained `manifest.json` records `selection: full`, `status: 0` and all 16 stages
with status 0. Full units passed 2305/151 files; local integration passed 6 spike,
20 platform-admin and 34 membership/simulator groups, plus 897 unchanged domain
parity cases. Existing admin browser suites passed 78 source (9.6 minutes) and
78 built (8.0 minutes), without skips/retries. The separate policy browser matrix
passed 12 source and 12 built cases; the existing gate does not subsume those cases.

All 27 source/harness hashes in `gate-d-source-hashes.txt` matched after the run.
Full typecheck, lint, graph/gate tooling, build, CSP, links, SEO and asset budgets
passed (268,946 B JavaScript gzip / 29,462 B CSS gzip). The existing workerd
`Broken pipe (os error 32)` stderr remains in built logs, as in prior accepted runs;
no assertions or diagnostics were suppressed. Local HTTP timings include auth,
queueing and concurrent load and do not recertify hardware performance. All stores,
cookies and browser targets were local; no deployment/account operation occurred.

Scoped graph reviews cover the reviewed implementation and evidence. Global
historical/unrelated unreviewed or changed records remain separate; matching review
fingerprints are not test results. Historical Gate B/C and admin parity acceptance
records retain their original scope and explicit recovery distinctions.

## Gates E–F — sequence at the end of Gate D (historical scope)

See the [execution plan](../plans/PHASE_2_0A_COMPONENT_ACCESS_PLAN.md),
[contract](../api/component-access.md) and authoritative
[exit matrix](../plans/PHASE_2_ADMIN_EXTENSIONS_PLAN.md). Gates B–D have scoped local storage/server/client evidence above. Production Components
UI E is complete within the scoped evidence below. Dedicated full 2.0A Worker/D1/source+built
acceptance F remains open. 2.1 cannot start until 2.0A closes; scoped A–E checks and
existing-foundation regressions do not accept full 2.0A.


## Gate E — production Components administration, complete locally, 2026-10-25

Implemented `/admin/components/` in the existing shared shell and build. Navigation
uses the protected catalogue permission; ordinary staff cannot enter via a direct
URL or API. The server supplies canonical descriptions, sorted category metadata
and unfiltered inventory totals. Filters use the bounded list endpoint; component
detail shows original tier, effective access, current revision, locked Basic,
explicitly unavailable usage counts, recovery impact and the latest 20 scoped
access/audit events. No private circuits are scanned.

Native modal reviews show before/after access, recovery consequences, current
policy revision and a required trimmed reason. Pending submission cannot repeat;
closing/cancelling returns keyboard focus. A real 409 blocks both the open review
and another review from stale detail until an explicit reload; no reason or mutation
is replayed. Save reloads the selected canonical detail and its actual audited history.
401/403 and service failures remove protected details through the shared shell;
obsolete list/detail responses cannot replace the current selection.

Executed focused evidence:

- Final source UI matrix: **15/15** across desktop/phone Chromium and tablet WebKit,
  no skips/retries, exit 0 in **2.1 minutes**. Command:
  `PLAYWRIGHT_DEV_PORT=3028 bun x playwright test e2e/component-admin.spec.ts --workers=1`.
  Log `.wrangler/component-gate-e-source-final.log`, screenshots/results under
  `.wrangler/component-gate-e-source-final-results/`.
- Repeated actual local Worker/D1/cookie policy API/race suite: **14/14 groups**, exit 0.
  Command `bun run test:component-access-api`; log
  `.wrangler/component-gate-e-api-final.log`, isolated results
  `.wrangler/component-api-w545XO/`. Added canonical description/category/inventory
  assertions without changing the existing permission, mutation or race semantics.
- Dedicated built Components UI: **15/15**, all three browser projects, no
  skips/retries, exit 0 in **2.0 minutes**. Command:
  `bun x playwright test --config=playwright.component-admin-built.config.ts --workers=1`.
  Log `.wrangler/component-gate-e-built.log`; screenshots/results under
  `.wrangler/component-gate-e-built-results/`.
- Actual built asset/header check passed **8 admin pages and 9 scripts**, plus
  unknown-route 404. `bun scripts/check-platform-assets.mjs` ran while the dedicated
  built Worker was listening; log `.wrangler/component-gate-e-assets.log`.
  Components serves private/no-store HTML, noindex/nofollow and strict same-origin
  CSP, with the admin script entry separate from the editor and admin HTML
  excluded from precaching.
- Final lint passed **918 files** after the graph root-file allowlist extension:
  `.wrangler/component-gate-e-lint-final.log`.
- The complete existing regression command exited **0 with full selection and all
  16 stages passing** under `.wrangler/component-access-gate-e-2026-10-25/`.
  Its 78 source + 78 built browser cases passed without skips/retries; details follow.

The source cases exercise list paging/category/access/search/empty results, selected
detail and Basic locks; actual reasoned Pro→Free→Pro changes and retained audit;
held-response duplicate submission; Escape/return focus and post-save heading focus;
a second administrator's competing policy write with reload/new-reason recovery;
ordinary/revoked/expired authority and protected-data clearing; slow/error/unknown
resources and delayed obsolete detail. Successful payloads come from real handlers;
transport controls delay responses and inject the explicit service-failure case.
Reviewed desktop/phone screenshots show the approved panel presentation and no
horizontal document overflow.

Initial failures/corrections are retained: the first desktop attempt used exact
wrapped-select label queries and incorrect lowercase canonical labels. It retained
four failures and one interruption (`.wrangler/component-gate-e-first-browser.log`
and `component-gate-e-first-results/`, exit 130 after stopping the obsolete run).
Corrected accessible combobox locators and canonical names. The second attempt
passed 4/5; its role-promotion fixture used hash-only navigation, which retained
the previous shell access snapshot. Added a real reload before re-entering after
promotion. The subsequent complete source run passed 15/15. Final refinement added
canonical descriptions, explicit modal closure, post-save focus assertions and
scroll-to-top before full-page screenshots; the final 15/15 run above passed.
No assertions were removed or skipped. The graph inventory now includes the dedicated
built configuration; graph:check continues to report historical/unrelated stale or
unreviewed records, independently of test results.

The dedicated [Gate E manifest](data/component-access-gate-e-acceptance.json)
tracks scoped commands/results and 31 source/harness fingerprints, which all matched
after completion. Gate E is complete locally; this does not close full 2.0A or
advance profiles 2.1. Next is dedicated full acceptance F.


## Gate E — completed existing-foundation regression

Executed `PHASE20_EVIDENCE_DIR=.wrangler/component-access-gate-e-2026-10-25 bun run verify:phase-2.0`.
Inspected `manifest.json`, `results.json` and all stage logs: full selection,
status 0, all **16 stages** passed. This is a new scoped regression run; historical
2.0/admin-parity/B–D manifests and their recovery distinctions remain unchanged.

- **2,305 units / 151 files**, full types/lint and graph/gate tooling.
- **6 infrastructure spike / 20 admin / 34 membership-simulator groups**.
- Unchanged **897 exact domain parity cases**.
- **78 source** (8.1m) + **78 built** (8.1m) admin browser cases across
  desktop/phone Chromium and tablet WebKit, without skips/retries.
- Build/CSP/links/SEO and asset budgets passed: **268,979 B JS gzip / 29,462 B CSS gzip**.

The dedicated 15 source + 15 built Components cases, repeated 14 API groups and
8-page/9-script actual asset/header check passed separately; the existing regression
does not subsume those checks. Final lint passed after the graph-root allowlist
addition. All **31 source/harness hashes** matched after all executed checks.
The built regression retains existing workerd broken-pipe stderr, as in earlier
accepted gates; no logs or assertions were suppressed.
HTTP burst timings include auth/queue/network and do not recertify hardware.
All stores, cookies and browser targets were local; normal development persistence
was not migrated and no account, remote resource or publication was used.

Scoped graph reviews record inspected source/evidence and current fingerprints;
global historical/unrelated changed or unreviewed records remain separate. Gate E
is complete locally. **Dedicated full 2.0A acceptance F is next, before profiles 2.1**;
overall Phase 2, support 2.7A and existing hardware exceptions remain open.


## Gate F — dedicated full local acceptance, complete 2026-10-25

The owner requested the next step after E. Added `verify:phase-2.0a`, a dedicated
18-stage gate using the shared explicit full/partial selection rules. It includes
the 16 existing foundation check groups plus dedicated component storage/API checks;
source and built browsers each include the existing admin/membership suites and the
Components/editor policy suites. The combined built configuration retains actual
local Assets/Worker/D1 and runs the existing eight-page asset/header checker in
global setup. No production authorization or solver behavior changed for this gate.

The command preserves a new evidence directory, stage logs, browser artifacts and
source/harness fingerprints; drift fails acceptance. Gate tooling now checks that
the full command cannot omit either dedicated storage/API checks or any of the four
browser suites. The existing 2.0 command and historical manifests are unchanged.

Started full execution with
`PHASE20A_EVIDENCE_DIR=.wrangler/component-access-gate-f-2026-10-25 bun run verify:phase-2.0a`.
The command exited **0 with full selection and all 18 stages passing**. Inspected
`manifest.json`, `results.json`, every stage log and all browser pass/project counts:

- **2305 units / 151 files**, full typecheck, lint (920 files), 12 gate-tooling and
  5 graph-tooling tests.
- **6 infrastructure / 8 populated-upgrade storage / 14 component API/race /
  20 existing admin / 34 membership-simulator groups** on local bindings.
- **897 unchanged exact domain parity cases**.
- **105 source browser cases** (12.0m) and **105 built cases** (10.5m): 35 per
  desktop/phone Chromium and tablet WebKit project, without skips/retries.
  Each matrix retains 78 existing admin cases and adds 15 Components + 12 editor
  policy/recovery cases. Successful API payloads use actual local handlers.
- Built global setup passed **8 admin pages / 9 entry scripts**, private/no-store,
  noindex, same-origin CSP and unknown-route 404. Build, links, CSP, SEO and budgets
  passed: **268979 B entry JS gzip / 29462 B CSS gzip**.
- All **1318 selected implementation/harness fingerprints** matched after execution;
  the gate records zero changed sources. Fingerprint matching is source stability,
  separately from the passing tests. The tracked manifest includes reviewed input
  hashes and log hashes; the complete snapshot and artifacts remain local/ignored.

Reviewed fresh desktop/phone Components screenshots and the six project counts.
No Gate F assertion or stage failed. Existing workerd `Broken pipe (os error 32)`
stderr remains in built logs, alongside existing Vite/color warnings; nothing was
suppressed. D1 burst HTTP timings include auth/queue/network and do not recertify
hardware. Normal development persistence, Cloudflare accounts and remote resources
were not used.

The [dedicated 2.0A manifest](data/phase20a-acceptance.json) maps every required exit
group to actual checks. Guided/template and applicable fault-lab paths combine
reviewed shared opening/mutation boundaries with their existing unit regressions;
this does not claim a separate browser policy test for every guide/lab. Later
publish/preview/fork policy integration remains required in 2.2/2.3/2.5 and 2.8.

**Gate F and Phase 2.0A are complete locally. Next is profiles 2.1, not started.**
Overall Community, support 2.7A and prior Phase 1 hardware/performance exceptions
remain open. Historical B-E/2.0/admin-parity manifests remain unchanged. Scoped graph
reviews record this acceptance review; unrelated changed/unreviewed records remain
separate and no matching graph fingerprint is presented as a passing test.

Final documentation lint passed **921 files** and reviewed relative file links
resolved. Scoped graph reviews cover the 2.0A acceptance and Community next-step
update. Global historical/unrelated changed or unreviewed records remain explicit;
no unrelated review baselines were renewed.
