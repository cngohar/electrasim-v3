# Phase 1.9 — Full local verification

Status: **complete locally with user-accepted performance exceptions (2026-10-12)**. All required functional checks passed across the recorded runs. Application and generator timing limits failed, and dense 60 fps remains unmet; the strict full gate is not green. Earlier attempts retain their failed/partial boundaries. No deployment or remote test authorization.

## Required matrix

| Requirement | Executable evidence |
| --- | --- |
| Types, boundaries, lint, independent electrical fixtures, access/store/legacy migration units | `bun run check` (included in verify) |
| Build, asset budgets, links, SEO, CSP | `bun run verify` |
| Application simulation and dense browser interaction | `benchmark:simulation`, `benchmark:browser` (included in verify) |
| Desktop, phone, tablet simulator and admin flows | `bun run e2e` (included in verify; real isolated browser-test Worker) |
| Built-site routing, assets, PWA and tools | `bun run e2e:production` (included in verify; static preview is not authorization evidence) |
| Trusted roles, expiry, revocation, plan edits, primary reads, audit transactions, concurrent D1 writes | `bun run test:membership` (included in verify) |
| Circuit ownership, stale versions, paid action denial, truthful results and repair | `bun run test:simulator` |
| Bun/workerd deterministic electrical parity | `bun run test:domain-local` |
| Independent MNA conservation and numerical workloads | `bun run benchmark:mna` |
| Graph navigation/evidence and gate selection correctness | `test:graph`, `test:gates` |

The entry point is `bun run verify:phase-1.9`; `--list`, `--only`, and
`--from` retain the existing explicit partial-run semantics. It derives the commands and order from the unchanged `bun run verify` script,
exposing each command as a recovery stage (and splitting check into types/lint/units). A failed performance stage does not become a pass;
run the unexecuted checks separately and record their exact boundaries.

## Coverage reviewed before execution

- Membership tests include eight concurrent stale plan edits with exactly one
  successful mutation and matching audit, concurrent grants/edits, transaction
  rollback, and unavailable D1 reads. Simulator tests cover conflicting circuit
  writes and ownership.
- Legacy normalization is covered in circuit-format, faults and persistence unit
  fixtures; supply-profile browser tests cover import/export and real IndexedDB
  reload. Premium downgrade/restore coverage must be checked against actual runs.
- The admin clipboard/focus repair has its own preceding focused evidence in
  `phase-1-membership-ui.md`; this phase runs the broader suite.
- Existing F.3 solver/generator timing and dense-rendering exceptions remain
  unchanged. These do not certify a green Phase 1.9 performance gate.

## Execution evidence

Initial development check passed 143 unit files / 2,223 tests plus types/lint.
Gate-runner tests passed 9/9 and graph tests passed 5/5. These preceded
final coverage additions and are not the consolidated acceptance run.

The gate uses `PLAYWRIGHT_DEV_PORT=3002` to start a frontend proxying only
the dedicated browser-test Worker on 8792. Normal 3000/8791 services and the
demo database remain independent. Built-site tests retain their own preview.

Added explicit 50-write/200-read authenticated D1 burst coverage and a real
schema-1 IndexedDB reload/export migration browser case. HTTP burst timings
include authentication/queue/network and cannot certify Worker-to-D1-only or
remote replica/cache budgets.

Logs use ignored `.wrangler/phase19-*` paths. No old test counts or
matching knowledge fingerprints are used as fresh passing evidence.

### Consolidated gate attempt

`PLAYWRIGHT_DEV_PORT=3002 bun run verify:phase-1.9` stopped at the unchanged
application simulation timing assertion. The preceding stages passed: all
project typechecks, lint, 143 unit files / 2,223 tests, build, asset budgets,
194 HTML link checks, 191 SEO pages and CSP. The log is
`.wrangler/phase19-full-gate.log`.

The 200-component/396-wire application workload measured **22.08 ms median /
40.91 ms p95**, failing the **8 ms** budget. Result serialization measured
**27.94 / 35.31 ms**, with **2,741,551 B**. This is fresh failed timing evidence;
it does not erase F.3's previously accepted exception or certify a full green
gate. Remaining commands are being executed separately with explicit boundaries.

### Built-browser performance

`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8788/app/ bun run benchmark:browser`
passed the single required Chromium case against built assets. Pan/drag handler
p95 was 0.20/0.10 ms and release commits were 0.50/2.90 ms. Idle frame p95 was
16.80 ms. Pan/drag/zoom frame p95 was 33.40/50.00/150.10 ms; zoom still misses
the dense 60 fps goal. Log: `.wrangler/phase19-browser-performance.log`.

### Browser discovery attempt and repairs

The first `PLAYWRIGHT_DEV_PORT=3002 bun run e2e` discovered 555 cases.
It was interrupted after 62 passes and four failures; two running cases were
interrupted and 487 did not run. This is partial evidence only. Log:
`.wrangler/phase19-e2e.log`.

The challenge pause failure showed the workspace tour offer intercepting clicks
on the Pause button. The offer now waits while a guide, challenge or Diagnosis
Lab is active. No circuit/scoring behavior changes.

Two cable-calculator assertions needed correction: the selected-border check
compared against an idle chip snapshot taken before its transition completed;
it now polls the current selected and idle colors together. The dock hit test
had scrolled to the educational prose and then used a programmatic click above
the viewport; it now returns to the stage before testing the dock controls.
Assertions still require contrasting selection colors and actual hit-test access.
Focused recovery and a renewed full browser run follow separately.

Focused recovery passed **18/18 cases** across Chromium desktop, Pixel 7 and
Safari tablet: real keyboard clipboard copy/paste login, dock hit-testing,
selected/idle contrast, challenge pause/resume and exit/restore, and actual
schema-1 IndexedDB reload/export. Log: `.wrangler/phase19-focused-browser.log`.
The renewed full run is recorded separately in `.wrangler/phase19-e2e-renewed.log`.

### Real membership/API gate

`bun run test:membership` passed **37 groups** against real local D1 and issued
cookies. Evidence: `.wrangler/phase19-membership.log` and isolated directory
`.wrangler/membership-tests-bEd795/`. It includes roles, lifecycle, concurrent
conditional writes/audits, database failure denial, domain/Hono result parity,
diagnosis grading, guest offline browser operation and paid revocation/recovery.

The new 50-write/200-read burst completed with correct persisted content and
ownership. HTTP p95 was **10,074.11 ms writes / 36,170.46 ms reads**, while the
browser suite was also running. These include queueing/auth/network and are
functional burst evidence only. The narrow Worker-to-D1 cached-read/write budgets
and remote replica behavior are not certified by this measurement.

The first runner version treated verify as one nested stage. After its failed
attempt, the runner was refined to derive the same command chain from package.json
and expose all 21 individual stages, preserving default order and rejecting
unrecognized shell syntax. `--list` confirms every required command; recovery can
select `e2e`, `e2e:production`, `test:membership` and each supplemental gate directly.
This refinement does not turn the original failed run into a passing full gate.

### Browser continuation boundary

The renewed attempt passed **98 cases**, then was interrupted after four
context-menu injection failures. Two running cases were interrupted and 451
had not run. Log: `.wrangler/phase19-e2e-renewed.log`. The injection test helper
was still locating a button named Student; current Basic/Pro labels stay visible
and the tooltip declares the active mode. It never switched modes, so the
correctly gated injection menu remained hidden. Related older Pro/guide/Zs and
workbench selectors were updated to those existing user-facing controls.

The 98 passing tests from this attempt remain valid: no production source was
changed by the selector corrections. Their exact project/file/title descriptions
are in `.wrangler/phase19-accepted-browser-cases.txt`. Playwright discovery with
`--test-list-invert` confirmed **457 remaining cases**, including the four failed,
two interrupted and 451 unexecuted cases. 98 + 457 = all 555 discovered cases.
The continuation log is `.wrangler/phase19-e2e-remaining.log`; it is aggregate
coverage, never an uninterrupted full-green browser gate. The list command and
output are retained in `.wrangler/phase19-remaining-list.txt`.

## Resume after learning-mode cleanup

The user resumed Phase 1.9 on 2026-10-10. The current matrix excludes the
removed optional mode; previous passing lists do not certify the changed tree.
Removal acceptance is recorded in `diagnosis-mode-cleanup.md`. Resume work
starts with Run/panel overlap, legacy Inspector/search selectors, then a fresh
complete browser matrix and all required local backend, build and stress stages.
Unchanged solver/generator/dense-rendering targets still require measurement.

### Resumed layout and browser controls

The interrupted continuation had 229 passes, 18 failures, two interruptions and
193 unexecuted cases. These counts belong to its earlier 555-case matrix.
The current discovery is **525 cases in 31 files** after the mode removal.

The Run section now measures its rendered top edge into a shared CSS clearance.
Phone learning sheets, hide/reopen pills and supply notices use that clearance;
short phone screens also bound the sheet height below the header. This handles
wrapped actions/readiness text rather than assuming a fixed Run height.

Runtime helpers now inspect/collapse the current Inspector aside instead of
looking for the older properties dialog; explicit supply-edit dialogs remain.
Palette selectors use the current Search components label. The three-phase
placement case clicks clear canvas space because its old point is now occupied
by the vertical tool strip. Playwright uses a separate Vite optimizer cache.

The focused recovery passed **12 of 14 cases**; the two placement failures
confirmed the old canvas click point. Their correction is checked separately,
then the full current matrix is required. Evidence:
`.wrangler/phase19-resume-focused.log`.

The corrected placement case passed **3/3 browser projects**, recorded in
`.wrangler/phase19-resume-placement.log`. The gate runner now supports explicit
`--keep-going` collection: all ordinary failed stages remain failures, a nonzero
exit is preserved, and interruption/spawn failure stops execution. All eleven
gate-runner tests passed. The collecting command is
`PLAYWRIGHT_DEV_PORT=3002 bun run verify:phase-1.9 --keep-going`; its results
are recorded in `.wrangler/phase19-current-gate.log`.

A diagnostic Bun CPU profile and split compile/solve/adapter/revision probe were
recorded before the current gate at `.wrangler/phase19-profiles/` and
`.wrangler/phase19-resume-breakdown.log`. Profiled timings are diagnostic only;
canonical acceptance timings come from the unprofiled gate. No kernel, model,
measurement contract, fixture workload, sampling count or budget was changed.

### Normal development watcher check

An ad-hoc Chromium check used the normal HMR server at
`http://127.0.0.1:3000/admin/pro/`, filled both login fields with fixture values,
then wrote temporary marker files beneath `.wrangler/` and `.code-graph/`.
After 1,500 ms, main-frame navigation count stayed zero and both values were
unchanged. Both markers were removed. This checks the normal development
watcher independently of Playwright's disabled-HMR server. Generated Worker,
test, graph and optimizer artifacts are excluded from the watcher; application
source retains normal HMR.

### 2026-10-11 continuation boundary

The collecting gate stopped when the prior session ended during the browser
stage. It had completed type/lint/unit, build/assets/links/SEO/CSP and both
performance stages. The unchanged application solve failed at **20.90 ms median
/ 36.19 ms p95 versus 8 ms**; serialization was **27.29/33.33 ms**, **2,741,551 B**.
The renderer handler/idle case passed; zoom p95 **183.4 ms** still misses the
60 fps goal. No solver work or budget was changed.

Its development browser segment records **234 passes / 4 intentional skips**,
one failed phone challenge-reload case, and no final browser summary. These
counts exclude the separate earlier benchmark case. The failed phone case
reproduced: the test clicked a placement point covered by its still-open
challenge sheet before it ever reached reload. It now uses the real Hide
control before placing, as the other construction cases do.

All challenge-file cases are rerun. The exact **223 accepted non-challenge
cases** are recorded in `.wrangler/phase19-current-accepted-browser-cases.txt`.
Discovery with that list inverted gives **302 remaining cases**; together
they cover the 525-case current matrix. This is aggregate acceptance, never an
uninterrupted full-green run. Later backend, production and stress gate stages
remain unexecuted in this collecting attempt and will be resumed explicitly.

The corrected reload case passed **3/3 projects**; evidence is
`.wrangler/phase19-reload-fixed.log`. The 302-case continuation is recorded in
`.wrangler/phase19-current-remaining.log`. The correction only changes the
phone test interaction, so the 223 retained non-challenge cases remain valid.

### 2026-10-12 browser recovery and current coverage

The 302-case continuation finished with **281 passes, 16 intentional skips and
five Safari failures**. The retained 223 cases plus this run account for all
525 current cases. The following recovery supersedes the failed cases:

- Canvas setup opens the public Menu → Import / Export action rather than
  sending a shortcut during editor mount. The actual export case still uses
  the shortcut and checks both SVG artwork and PNG bytes/dimensions.
- Fault edits intentionally invalidate `simResult`. The protection lifecycle
  now waits for the fresh Comlink result to retain its trip latch. An added
  component-state assertion was incorrect for this runtime state and was removed.
  Clear/reset use real Enter keypresses on their labelled controls. This
  multi-stage fixture uses the same 60-second outer envelope as the existing
  multi-cycle fixture; its 20-second electrical polls and numerical budgets
  are unchanged.
- The guide panel, Inspector hand-off and hidden-guide pill now declare
  `data-canvas-occluder`. Shared Fit can exclude them after returning from the
  Inspector. All four staircase switch combinations and the complete affected
  guide/DOL/schematic files were rerun across the three projects.
- Zs validation uses the existing button's stable title, including the tablet
  icon layout. Numerical UK limits and changes of Ze/standard remain asserted.
- The workbench case clears through the active-fault list's distinct accessible
  control using real keyboard input. A diagnostic Safari probe measured a
  one-pixel Inspector scroll oscillation and approximately one animation frame
  during 1.07 seconds. Earlier pointer-stability failures remain recorded; this
  is keyboard-flow evidence, not a claim that headless pointer timing was fixed.

Recovery logs are `.wrangler/phase19-browser-final-recovery.log` (17 passes,
two skips, five failures), `.wrangler/phase19-browser-final-fixes.log` (28
passes, two failures), `.wrangler/phase19-browser-control-final.log` (four
passes, two failures), and `.wrangler/phase19-protection-final-acceptance.log`
(three passes). Superseded failures are not counted as passing runs.

The exact project/file/title reconciliation is
`.wrangler/phase19-final-browser-coverage.json`, reproduced by
`python3 .wrangler/phase19-browser-coverage.py`: **505 passes / 20 intentional
skips / zero unresolved failures**, covering all **525 cases**. Retained cases
are unaffected by the scoped guide Fit and test-interaction changes. This is
aggregate coverage, not one uninterrupted full green gate. Final static,
production, backend and stress stages follow separately.

### Final static and local backend continuation

`.wrangler/phase19-final-static-gates.log` records all eight selected stages
passing after the guide Fit repair: typechecks/boundaries, lint, **142 files /
2,147 unit tests**, simulator and Astro build, assets, links, SEO and CSP.
Entry JavaScript is **250,905 B gzip** against 300,000; CSS is **27,234 B**
against 30,000. Links cover 194 HTML files and SEO covers 191 pages.

The later-stage continuation is
`PLAYWRIGHT_DEV_PORT=3002 bun run verify:phase-1.9 --from e2e:production --keep-going`,
recorded in `.wrangler/phase19-current-backend-gates.log`. Its first production
attempt passed 51 cases and failed two obsolete test assumptions: the app entry
is an `app-*.js` script with a separate `index-*.js` module preload, and Guides
is now reached through Menu → Guided Circuits. The tests now locate the actual
hashed script and public menu action; security/cache and offline asset assertions
remain. A production rerun is required separately.

Fresh real local gates passed **36 membership/API groups**, **20 dedicated
simulator groups**, **842 Bun/workerd parity cases**, all eleven gate-runner
tests, all five graph tests and independent MNA conservation/size workloads.
The MNA workload's 199 parallel loads measured **23.23 ms median / 58.03 ms p95**;
that command reports the unmet 8 ms target and does not certify application
performance.

The membership gate's 50-write/200-read burst retained correct ownership/content.
Observed HTTP p95 was **7,429.44 ms for writes / 24,767.77 ms for reads**; these
include authorization, local queueing and network overhead, not Worker-to-D1-only
latency. No cached-read/write or remote replica budget is certified. Isolated
evidence directories are `.wrangler/membership-tests-3LI9y4/`,
`.wrangler/membership-tests-6tJxzj/` and `.wrangler/domain-tests-joaCUA/`.
Final stress and production recovery results are recorded below.

### Final stress, production recovery and performance

Generator stress held every functional invariant across **3,006 circuits,
174,048 injected faults and 310,476 verified repairs**. There were **zero
identity collisions in 60,000 samples**. Its command correctly exited 1 because
timing budgets failed. Full default workloads and the 5/20/120 ms limits stayed
unchanged.

| Batch | Generation median ms | Generation p95 ms | Full-loop p95 ms |
| --- | ---: | ---: | ---: |
| Beginner | 2.499 | 6.184 | 140.4 |
| Intermediate | 3.490 | 7.754 | 388.7 |
| Advanced | 6.280 | 13.006 | 869.4 |
| Pinned protected load | 1.836 | 4.080 | 82.1 |
| Pinned switched light | 2.071 | 6.441 | 138.9 |
| Pinned two-way lighting | 2.700 | 6.572 | 273.2 |
| Pinned branched lighting | 3.484 | 7.715 | 445.9 |
| Pinned distribution board | 4.963 | 10.046 | 1,059.5 |
| Pinned contactor control | 5.532 | 10.301 | 662.0 |

Diagnosis stress passed **600 scenarios / 10,916 evaluations**, including
wrong-answer, real-repair, deletion/replacement, scoring, answer-leak and replay
invariants. Build p95 was **26.4 ms against 150 ms**; evaluation p95 was **11.2 ms
against 120 ms**. Evidence is the backend continuation log above. Its runner's
failed-stage summary remains `e2e:production, stress:generator`; later focused
recovery does not rewrite that exit into a full gate pass.

The corrected production cases passed **2/2**, recorded in
`.wrangler/phase19-production-final-recovery.log`. Together with 51 unaffected
passes, all **53 production cases** passed against the final simulator/Astro
build. This remains aggregate evidence. The offline case still reloads with a
controlled service worker, disables networking, opens guest dialogs/reference
surfaces and requires zero page/console errors. Header, route and immutable
asset assertions now inspect the actual entry script.

A final unprofiled canonical application run measured **28.06 ms median /
56.65 ms p95 versus 8 ms** for the unchanged **200-component/396-wire** drawing.
Serialization measured **35.13/42.49 ms**, **2,741,551 B**. It correctly exited 1.
Evidence: `.wrangler/phase19-final-simulation-performance.log`.

The final built-asset browser benchmark passed its strict handler/idle checks
at **200 components / 400 wires**. Pan/drag handler p95 was **0.20/0.20 ms**;
release commits were **1.80/2.80 ms**. Idle average/p95 was **18.43/16.80 ms**.
Pan/drag/zoom frame p95 was **66.60/49.90/283.40 ms**: dense 60 fps remains unmet.
Evidence: `.wrangler/phase19-final-built-browser-performance.log`.

No agent build or browser suite ran concurrently with numerical/stress timing.
Other desktop processes were active; these are local host measurements, not
hardware-independent regression claims. The solver, contracts, workloads,
sample counts and timing assertions were not altered. F.3's earlier accepted
performance exceptions remain historical context, not a green Phase 1.9 gate.
On 2026-10-12, after reviewing the final functional results and failed simulation,
generator and dense-rendering measurements, the user explicitly selected
**“Close locally with documented exceptions.”** This closes Phase 1.9 locally
with those exceptions. It does not turn any failed command or interrupted run
into a green full gate, certify unmeasured Worker-to-D1/remote performance, or
authorize publication, deployment or a Cloudflare account operation.
