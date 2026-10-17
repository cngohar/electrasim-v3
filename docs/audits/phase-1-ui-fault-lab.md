# Phase 1.13 acceptance tracker — UI clarity and Fault Lab reliability

**Status (2026-10-17): locally functionally complete for 1.13.0–8, with explicit performance limitations.**
**Prepared:** 2026-10-16, at the user's request to combine both review findings
into the next phase. [Authoritative plan](../plans/PHASE_1_13_UI_FAULT_LAB_PLAN.md) ·
[Resume handoff](../handoffs/ui-fault-lab-next-chat.md).

## Planning versus implementation

The combined scope, issue register, ordered milestones, source/test entry points,
validation matrix and local-only boundaries are documented. Existing
[workspace review](workspace-ui-followup-review.md) and
[Fault Lab review](fault-lab-followup-review.md) remain the investigation evidence.
Their test/preview results are not Phase 1.13 implementation acceptance.

| Milestone | Status | Required acceptance |
| --- | --- | --- |
| 1.13.0 | Complete locally; reproduced baseline, decisions and runner | Visual decisions, reproducible baseline/regressions, issue/test map and stage runner |
| 1.13.1 | Complete locally; shared notifications/Console and guarded actions | Shared severity notifications, progress, Undo and Console behavior |
| 1.13.2 | Complete locally; all 14 source/built lifecycle coverage | All-type applied/duplicate/multi-cause lifecycle and one-click Lab/Run return |
| 1.13.3 | Complete locally; source/readiness/validation and fresh-result boundaries | Source/readiness/validation correctness and truthful presentation |
| 1.13.4 | Complete locally; exact path/movement/static cues and six-step Help | Correct target/path cues, bounded motion and numbered Help |
| 1.13.5 | Complete locally; five widths/themes, Lab/tools/HUD clearance | Header/shelf/Circuit controls and responsive visual hierarchy |
| 1.13.6 | Complete locally;17 model families, wire durability and shared Specs | Component model sections, Specs placement and wire summaries |
| 1.13.7 | Complete locally;116 reproducible reference/metadata dispositions | All 116 catalogue/help/rating dispositions and consistent values |
| 1.13.8 | Local functional acceptance complete; combined recovery and performance limits explicit | Integrated local acceptance, recovery reconciliation and handoff |

## Execution evidence ledger — fill during implementation

For every entry, record milestone/issue IDs, changed files, exact command and exit
status, current case keys/counts, artifact paths, inspected screenshots, outcome
and remaining limitations. Preserve failures and why any focused recovery remains
valid for the final tree. A skipped or selected stage is not a full pass.

| Gate | Current phase result |
| --- | --- |
| Phase 1.13 full types/lint/registered units | Final application logic:2224 tests/145 files, full types/lint pass (`check-lab-clearance-final.log`). Subsequent Console-count CSS/harness has refreshed e2e types/lint, build/static and current source/built/production recovery. |
| New defect regressions and focused units | 53 focused UI/fault/validation tests / six files pass; 31 catalogue/reference/editing tests / two files pass after correcting an incorrect 6 A expectation to the existing 16 A MCB declaration. |
| All-14 native source lifecycle/Run matrix | 246 unique source cases pass across Chromium, phone Chrome and tablet WebKit after exact-case recovery. Full run237 pass/nine fail; selected recovery21, harness6, Lab9 and final CFL3. Latest case keys have no unresolved outcome; this is combined evidence. |
| Fresh built desktop/phone lifecycle and UI | 76 unique cases pass through four finalized file groups and focused recovery; all 14 lifecycles/markers in both projects. Production shell:10 unique cases pass with explicit recovery. Interrupted76-case attempt and failed hover/production cases remain recorded. |
| Five-width layout, Help, Inspector, toast clearance and accessibility | Source/built five-width and both-theme checks pass; native Undo/Fit/Console, guide and six-step Help. Wider Lab separation/Help hit is checked at five widths; real phone warning counts stay clear and clickable. Current source/built captures reviewed; no new human owner acceptance claimed. |
| 116-entry catalogue/reference reconciliation | New reproducible matrix: 30 authored references, four reconciled derived references, 82 reviewed family/catalogue dispositions. All 116 have explicit missing manufacturer-data state. Both inventory consistency commands pass; not runtime certification. |
| Direct/Comlink/local Worker parity for affected shared behavior | 897 real isolated local Workerd compiler/preflight/MNA parity cases pass (`domain-local.log`). |
| Local Worker/D1/cookie access and preserved document workflows | 34 real isolated local D1/cookie groups pass (`membership.log`), including paid browser, revocation/document preservation and direct/Hono parity. |
| Fresh build, asset budgets, links, SEO and CSP | `build-console-clearance-final.log` passes. JS266412B/300000B and CSS29447B/30000B gzip;194 HTML links,191 SEO pages and CSP pass (`console-final-*`). |
| Affected dense rendering/performance comparison | Existing unchanged assertions pass in three current and three same-host HEAD runs (two ordinary runs plus one matched CPU-profile run per tree). Matched profile zoom p95: 166.7 ms both; means 158.75 ms current / 155.93 ms HEAD. Initial current p95 249.9 ms remains recorded. Dense zoom remains an explicit performance limitation, not a 60 fps pass. |
| Planning document/graph validation | Final document/case reconciliation and selected graph reviews are recorded below. Historical unreviewed/changed graph records remain explicit; graph fingerprints are not runtime proof. |

## Planning checks — 2026-10-16

- `bun run test:graph` exited 0: five tests, no failures/skips. These check graph
  tooling, not the application defects.
- A local Python document/status check exited 0: 59 relative Markdown/code
  references across the combined plan, handoff, tracker and historical UI proposal
  resolve; parent phase plus nine milestones are planned; all 14 issue IDs exist;
  Phase 1.12 retains its completed status; the proposed phase runner is correctly
  absent from `package.json` until milestone 1.13.0.
- `bun run graph:phase`, `bun run graph:phase 1.13.0` and
  `bun run graph:brief -- "phase-1.13"` resolve the combined plan and pending
  implementation. `bun run graph:phase 1.12` preserves prior functional closure
  and its performance exceptions.
- `bun x biome check docs/code-graph.json` and `git diff --check` pass after
  formatting the new check mapping. The first formatting check requested a compact
  one-item array; `bun x biome format --write docs/code-graph.json` corrected it.
- `bun run graph:check` exits 1 for existing unreviewed/changed records, including
  records affected by the updated roadmap/progress links. Only the combined-plan
  fact and feature receive final scoped review here. Historical baselines are not
  automatically renewed, and fingerprint freshness does not certify tests.

## Retained exceptions and publication boundary

Phase 1.12 remains locally complete within its declared scope. Its recorded solver
p95 45.07 ms versus 8 ms, dense zoom p95 199.9 ms and historical generator timing
exception remain open. They are not new measurements or passing Phase 1.13 gates.
Retain both old and newly measured outcomes; do not silently accept a regression.

At the planning checkpoint, no application implementation or remote work had occurred.
Current local execution is recorded below; no commit/push/deployment is authorized.

## Execution started — 2026-10-16

The user requested starting the next phase from the graph, then continuation,
and specifically asked whether wire-cut and other fault markers follow movement.
Preserved all existing uncommitted review/proposal/plan work. No remote action.

### 1.13.0 baseline

- Recorded [visual decisions](../design/phase-1.13-decisions.md) from both existing
  previews and inspected desktop/phone captures. No new human production approval
  is claimed. All 14 issue IDs have [source/check mappings](phase-1.13-issue-checks.md).
- Added `verify:phase-1.13`, reusing `phase-gate.mjs`: `--list`, selected
  `--only test:gates,test:graph`, and `--from browser:2 --dry-run` behave correctly.
  **11 gate tests and five graph tests pass**. Selected execution explicitly says
  partial; no stage success implies full phase acceptance.
- Added eight real-cookie/native import acceptance cases, shared unchanged between
  source and built delivery. The actual current-schema `exportJSON` serializer is
  used; no page imports of source stores. Seven source assertions reproduce missing
  Applied, silent duplicate, two-click Lab return, terminal-strip source detection,
  incomplete success severity, external cuts for internal open and off-route cuts.
  The route oracle compares the associated neutral path, measuring **132.31 px**.
- The source CFL positive control initially read the wrong UI tab. The first
  correction opened Response only; the final correction also opens Readings.
  `.wrangler/phase113/source-control-final.json` passes fresh **230 V / 0 A / 0 W**
  and continuing Run. This was a harness correction, not a solver defect or fix.
- Fresh `bun run build` passes. Built desktop/phone baseline reproduces the same
  **14 defect failures**, with **two CFL positive controls passing**. No skips.
  Initial built attempt could not connect after the preview stopped between user
  turns; it exercised no application behavior and is retained separately.
- Existing baseline units: **52 tests / five files pass** (uiStore and the four
  earlier Fault Lab suites). Earlier external-cut expectations are baseline
  behavior, not the intended acceptance contract.
- Reports, logs and screenshots are under `.wrangler/phase113/`. Sanitized exact
  case/project summaries: [baseline data](data/phase113-baseline.json).

### User-prioritized 1.13.4 movement work — in progress

This bounded geometry slice precedes notifications because the user explicitly
asked to check moving wires/components and all other faults. It does not close
Help, the remaining visual matrix or Phase 1.13.

Native built baseline checks all **14 registered types**, before/during/release/
rotation. Wire badge lag during drag: **57.01 px**; component/terminal badge lag:
**114.02 px**. All catch up after release/rotation in those fixtures. This is a
separate defect from final off-route cut placement.

Implementation: sample the exact rendered M/L/H/V/Q/C path with bounded geometric
error; keep preview geometry out of the circuit/solver/undo state; update the main
fault overlay with the same transient drag positions/routes; clear it on release,
cancel, blur and cleanup. Internal component opens now show an internal-path cue,
without fading/cutting attached cables. Ordinary/dense duplicate midpoint crosses
are removed in favour of the shared route-aware cut. Static fault tips no longer
claim conductor metal or continuous sparks.

First source fix evidence: **three browser cases pass**, covering all 14 badge
anchors throughout native drag/release/rotation plus both original geometry
regressions. **27 geometry/gesture units across four files pass** after correcting
an old terminal test's assumption that 18 units of arc length equals 18 units of
straight-line distance. Independent straight/quadratic/cubic expected-value tests
cover the sampler. Expanded special-overlay/zoom/reroute/dense/source/built checks
and full static/unit checks are running; they are not yet accepted here.


## Implementation and focused verification — 2026-10-17

This checkpoint extends the geometry slice; no phase closure or remote publication is claimed.

- **Geometry:** `.wrangler/phase113/geometry-source-expanded.json` has seven source passes, including all 14 marker anchors and four bend/zoom/reroute density/style combinations. Built desktop/phone has 16 unique passing cases across `geometry-built-final.json`, `geometry-built-recovery.json` and `geometry-phone-commit-recovery.json`. Initial export cases omitted the actual filename Download confirmation. The phone rotation check also raced asynchronous premium-move authorization; it now waits for committed movement before rotating. Failed attempts are retained; this is combined recovery evidence, not one uninterrupted green run.
- **Notifications:** one typed path feeds all four severity cards and bounded Console history. Five-second expiry pauses independently for hover/focus; progress replaces its own entry; repeated meaningful events coalesce; revision-scoped solver notices do not flood. Undo is protected from unrelated newer edits. Eight new UI tests cover these behaviors. Import failures retain inline error plus shared notice.
- **Fault lifecycle:** exact type/target/port Applied state, visible duplicate feedback, explicit cause selection and run-state labels; first-click Lab restoration and validation Return preserve selection/gates. Accepted current-revision results capture even while validation owns the Inspector, preventing missed timed responses. Clear/reset/OFF/ON/replacement remain separate. `.wrangler/phase113/lifecycle-source.json`: **24 passed, zero skipped**, including all 14 lifecycle cases, both Run gate paths and four unavailable effect types. Fresh CFL remains 230 V / 0 A / 0 W during continuous Run.
- **Readiness/validation:** compile-derived source identity is shared with readiness; terminal strip is not a source, intentional open does not erase a real source. Four assessment groups describe recorded checks/findings and pending calculation without safety certification or percentage. Incomplete/empty reports never announce successful completion. Six-file focused run (`phase113-focused-final.log`) has **53 passes**. The first domain fixture incorrectly treated a single named Live rail as non-source; that existing supported source semantic was retained and the regression uses terminal-strip only.
- **Help and shell:** six numbered illustrated Help rows, bounded/reduced/hidden-page cues; centered commands and full shelf; combined Supply/readiness card; project name moved to Files using its existing storage key. Existing native shell checks pass at **1440/1024/640/390/360 px** (`shell-source.json`). Desktop and 360 px screenshots were inspected; no new owner acceptance is asserted.
- **Models/wires/Specs:** existing editors are grouped under conditional Electrical/Behaviour/Installation sections; only the detailed-dialog rotation pair is removed. Saved/draft conductor summaries share the existing resistance/capacity resolvers. AWG non-table areas remain unassessed for capacity, aluminium approximation is labelled, and source/variant guards remain. Initial Inspector run passed metric-method and instance Specs cases; the AWG test incorrectly assumed the existing store saves no physical equivalent. It intentionally saves AWG plus mm²; the assertion now follows that contract, and Configure preserves AWG mode for a consistent saved pair. Broader source/built recovery is running.
- **Catalogue:** shared instance-aware Specs rows use preflight capabilities with known/unknown provenance, canonical terminals and separate consumption/capacity. Removed manufactured generic rating/standards fallbacks. Four reference mismatches now match existing defaults: downlight 12 W, tube 36 W, motor 750 W, water heater 2000 W. Reason labels distinguish supply, missing ratings and unsupported model; unassessed parts remain discoverable while known mismatches retain their status. `bun run catalogue:reference --check` and unchanged Phase 1.12 inventory pass. Snapshot: [116 dispositions](data/phase-1.13-catalogue-reference.json). `reference-unit-final.log`: **31 tests pass**.

Final-tree full checks, fresh build/static gates, complete source/built affected browser projects, local access/parity and dense performance comparison are still required. Later ledger entries supersede only the explicitly rerun cases.


### Integrated gate checkpoint

- `check-integrated.log`: full typecheck, lint and **2223 unit tests / 145 files pass**. The later interactive badge has its four existing ComponentNode tests rerun successfully; application/e2e types and final lint also pass.
- `build-integrated.log`: fresh build passes. Static budgets **266223 B JS / 29190 B CSS gzip**, unchanged limits 300000/30000; 194 HTML link checks, 191 SEO pages and CSP pass. A later canonical-terminal/reference-label cleanup gets a fresh final build before built tests.
- `domain-local.log`: **897 real local Workerd parity cases pass**. `membership.log`: **34 real local D1/cookie groups pass**, including paid browser flows, revocation/document preservation, malformed-state rejection and direct/Hono model parity. Burst timings are retained as HTTP queue/auth measurements, not D1 operation latency.
- `inspector-clarity.json`: nine native passes (wire round trip, metric C/B1/A and shared instance Specs on Chromium, phone Chrome, tablet Safari). Six failures came from two newly authored fixtures: DC profile/legacy voltage disagreement and invalid fault category/target. Import correctly rejected them. Fixtures now use consistent supply and registered fault metadata/targets; the target applicability guard was not weakened.
- `clarity-recovery.json`: reason-specific badge action/discoverable unassessed palette and all **17 declared model-family** surfaces pass in Chromium. The Help fixture still incorrectly targeted a wire with a component-only arc record; corrected to two causes on the heater. That guard remained authoritative.
- Inspected the 17-family model screenshot. Corrected section grid packing to avoid empty vertical space beside a taller section and made the reference-photo description readable. This small CSS-only refinement landed after the integrated source run began; affected model/shell visual checks require current-tree recovery. Notification screenshot confirms severity/action lane; a current final-shell capture still required.

Source integration is running all **225 cases across three configured projects**. Final built, production-shell, visual recovery and dense performance are pending; no strict full-green acceptance yet.


### Responsive recovery and frozen broader run

The first expanded source run was stopped gracefully after six passes, three ambiguous-locator failures and one interrupted case; 215 cases did not run. Added notifications have their own Inspect action, so old global Inspect locators were ambiguous. Scoped the intended workspace Inspect in shared helpers/affected existing specs; no application control was removed to satisfy a test. `source-integrated.json` retains this partial attempt.

`visual-recovery.json`: Help and explicit multiple-cause selection pass after correcting the fixture to a component target. Both theme/clearance tests exposed the 640 px desktop/phone breakpoint collision and excessive text compression. Desktop notification width now applies only above 640 px; compact cards put actions on their own row. Clearance compares the visible scroll lane and verifies the actual Undo hit target, rather than treating clipped offscreen card content as visible overlap. `visual-clearance-final.json`: **two cases pass**, covering all five widths in both themes. Dark360/light640 screenshots inspected: notices, Inspector and shelf are separate and readable. The shelf assessment label also received a static row so it does not overlay artwork; built visual checks must include that refinement.

The restarted final source suite contains **231 cases** (including 17-family and both-theme/five-width flows) using the scoped helper. Final results are recorded after completion; no pass is inferred while it runs.


### Supply/variant notification integration

The broader suite exposed two expected copy migrations (Circuit supply punctuation and the new reason-specific “Supply mismatch” label). More importantly, source inspection found the existing supply/variant outcomes still had a separate 12-second banner outside the shared Console path. Migrated those outcomes into the common notification reducer/lane: five-second paused timing, retained Console event, Review action and the original circuit/history/edit-lock Undo guard. Removed only the duplicate legacy banner. Circuit controls now use the common supply description for accessible full source details and a compact visible L-N/phase label. Preserved all electrical transactions, source/variant review and future-edit invalidation.

`supply-notifications-unit-final.log`: **29 tests pass**, including the new Review/disabled-Undo regression. `check-final-complete.log`: final implementation **types, lint and 2224 tests / 145 files pass**. The prior `source-integrated-final` run was stopped gracefully to refresh its cached notification/test code: 31 passes, two presentation-copy failures, one interrupted case, 197 did not run. It is not a final-tree full pass.

The fresh `source-frozen` run includes three-phase source workflows as well as the planned 12 files. It uses the normal configured bound of two total browser workers, with tablet WebKit still limited to one worker; performance will run alone. The stage runner retains its conservative one-worker default. Fresh build is `build-frozen`. Read their actual final exits before recording acceptance.


### Full source matrix and focused clearance recovery

`source-frozen.json`: **237 pass, nine fail, zero skipped/flaky**, all 246 cases across Chromium, phone Chrome and tablet WebKit (47.2 minutes). This is not a full-green gate. All per-type lifecycles, catalogue/model/wire transactions, gates, supply/variant and three-phase workflows passed. Failures: Console hit target covered during guides (three projects); phone Fit covered by a hover-paused import notice (all-14 movement and Help fixtures); phone notification timing observation began after unrelated Fit work; the unsupported-load helper still looked for Running in the retired context row (three projects).

Fixed the actual HUD/guide overlap without suppressing hover pause or bypassing native hit tests. Default notices sit above Fit/Console; desktop side-panel placement includes guides; phone Inspector notices reserve the Console column. While a notice is present, a phone guide leaves readable space above it; its steps and End action remain reachable. The timing test now observes the real import event before unrelated Fit work. The old Running assertion now checks the visible Stop control, retaining the genuine continuous-run contract.

`source-clearance-recovery` runs **21 affected cases** across all three configured projects, including the three all-14 anchor loops and both themes at all five widths. Final source acceptance requires reconciling these exact cases against the 246-case run; no results are inferred while recovery runs. `build-clearance-final` rebuilds the corrected delivery for subsequent built acceptance. Full type/lint/unit evidence remains 2224 tests / 145 files; the recovery changes are CSS and native harness changes.

### Source recovery completed and same-host performance comparison

`source-clearance-recovery.json` completed **21 passes, zero failures/skips/flaky** in 8.5 minutes. These exact cases replace the nine failed case keys in `source-frozen.json`; they also recheck surrounding native movement, Help, notification timing, guide/Console, unsupported-load and five-width/both-theme behavior. The resulting source coverage is **246 unique cases passing through documented recovery**, not an uninterrupted 246-case green run. Current fresh build is `build-clearance-final.log`; final app/e2e types and lint pass. Static checks record JS **266381 B** and CSS **29323 B gzip**, within unchanged 300000/30000 B limits, plus 194 HTML link files, 191 SEO pages and CSP.

Dense performance ran sequentially without other managed browser/build jobs. All six runs use the unchanged `e2e/performance.spec.ts`, 200 components/400 wires and unchanged assertions. Baseline is detached HEAD `884196c` in an isolated temporary worktree with its own local Worker persistence and correct baseline workspace package links, sharing installed dependency versions. Results were copied outside it before removing only that temporary worktree. No application change or threshold relaxation followed these measurements.

| Tree / report under `.wrangler/phase113/` | Zoom mean / p95 | Pan handler p95 | Drag handler p95 / commit | Idle p95 | Existing assertions |
| --- | --- | --- | --- | --- | --- |
| Current `performance-final` | 194.91 / 249.9 ms | 0.20 ms | 0.30 / 4.40 ms | 16.8 ms | Pass |
| HEAD `performance-head` | 152.82 / 150.0 ms | 0.20 ms | 0.20 / 2.40 ms | 16.8 ms | Pass |
| Current `performance-repeat` | 158.75 / 200.0 ms | 0.20 ms | 0.20 / 3.90 ms | 16.7 ms | Pass |
| HEAD `performance-head-repeat` | 155.08 / 150.1 ms | 0.20 ms | 0.20 / 2.50 ms | 16.7 ms | Pass |
| Current `performance-profile` | 158.75 / 166.7 ms | 0.10 ms | 0.20 / 4.20 ms | 16.8 ms | Pass |
| HEAD `performance-head-profile` | 155.93 / 166.7 ms | 0.20 ms | 0.10 / 2.80 ms | 16.8 ms | Pass |

The last pair enables the same CDP CPU sampler around the unchanged benchmark; it is diagnostic instrumentation, not an uninstrumented replacement result. Both profiles are dominated by browser/program work and React development JSX/render logging, rather than new solver work. The matched p95 is equal and means differ by about 1.8%; ordinary current runs retain a worse tail, especially the first run. This limited sample does not establish a persistent new slowdown or prove production rendering performance. **Decision:** retain the existing dense-zoom performance exception and every raw outcome; accept no new numerical threshold or 60 fps claim. Both trees still have all measured zoom frames above 50 ms. Historical solver p95 45.07 ms/8 ms and generator timing remain separate and were not rerun for unchanged numerical/generator code.

The initial profiling wrapper had a config-relative web-server cwd error and exercised no application behavior (`performance-profile-setup.log`). The corrected ignored diagnostic config sets the existing local servers' cwd explicitly. Fresh built desktop/phone acceptance is now running as `built-frozen`; production-shell acceptance follows it sequentially.

### Built persistence harness finding (run still in progress)

Fresh `built-frozen` exposed a desktop WR-01 reload race. Before reload, the saved Inspector and Undo/Redo assertions passed. After reload, the original imported wire returned. Inspection of unchanged `useKeyboardShortcuts.ts` shows Ctrl+S exports JSON; it does not flush IndexedDB. Unchanged `persistence.ts` intentionally autosaves after 250 ms. The test incorrectly exported then reloaded without waiting for the durable record. Existing three-phase/timer tests already poll the real IndexedDB record before reloading. The planned focused correction uses that same browser-storage acknowledgement, retains the complete AWG/Al/method assertions and actual JSON round trip, and changes no persistence or electrical contract. Preserve the running frozen suite; apply/recover this harness case after its workers finish.

### Interrupted built run and durable recovery groups

The managed browser process ended before `built-frozen.json` was finalized. Its partial `built-frozen.log` and captures remain, with 62/76 case starts visible. Three failures were observed: the WR-01 reload race on desktop and phone, plus phone CT-01 fixture signup failing before app navigation with local ProxyWorker “Network connection lost”. No final 76-case pass/fail count is inferred from case-start lines. Source acceptance and completed full/static/local/parity/performance reports remain intact.

The WR-01 harness now polls the actual `keyval-store` / `electrasim:circuit:v1` wire record for gauge, physical area, material, installation, derating and length before reload; no source-store imports, delay-based bypass or persistence implementation change. Final built delivery is split into independently finalized `built-inspector-final`, `built-marker-final`, `built-lifecycle-final` and `built-ui-final` reports (16+12+28+20 cases). Recover the corrected WR-01 source case across all three configured projects separately. The original interrupted attempt is not a full-green run, and the local signup failure remains recorded.

`built-inspector-final.json`: **16 pass, zero fail/skip/flaky**, 3.2 minutes. Both corrected AWG reload/JSON cases and both CT-01 native badge/discoverability cases pass with real local paid cookies. Both themes/five widths, six-step Help/multi-cause selection, all 17 model-family surfaces and instance-aware Specs pass. Inspected current built desktop/phone Help/model and phone light640 plus desktop dark360 notification/Inspector captures; precise electrical/route correctness remains assertion-based. Corrected e2e types and focused lint pass. Remaining built groups run sequentially with their own finalized reports.

`built-marker-final.json`: **12 pass, zero fail/skip/flaky**, 3.0 minutes. Both built projects complete all 14 native live-drag/release/rotation loops, all four ordinary/dense orthogonal/Bezier zoom/reroute combinations and standalone SVG/static export. This independently finalized current-dist report supersedes partial geometry observations from the interrupted run. The final lifecycle and UI groups remain pending.

`built-lifecycle-final.json`: **28 pass, zero fail/skip/flaky**, 6.4 minutes. Every registered fault completes native cancel/apply/exact Applied/duplicate/Run gate-or-outcome/clear/Undo/Redo/reapply on built desktop and phone. Supported capture and four explicit unavailable effects remain distinct. No new application change was needed during these final built groups. The final20 UI cases follow sequentially.

`built-ui-final.json`: **19 pass/one fail**, zero skips/flaky. The failure is phone real-import hover retention after the5200ms hover interval. A traced isolated rerun of the unchanged case passes (`built-notification-probe.json`, one pass), so that rerun alone is not treated as a resolved product defect or a full-green UI run. The test now waits for the import modal to close, moves the pointer outside the newly revealed card, then crosses its boundary with native hover and asserts the actual browser `:hover` state before measuring retention. The previous modal pointer can already overlap the revealed card; explicit entry avoids relying on an incidental hover transition. No production notification timer or handler changed. Repeated two-worker built recovery and affected source recovery are required; retain the failed original and trace.

`built-recovery-final.json`: **four passes**, zero failures/skips/flaky, two repetitions of the real notification case in each built project with two workers (56.7 seconds). Native hover acquisition,5200ms retention, independent focus retention, eventual expiry and one retained Console event all pass with the strengthened boundary check. Together the four finalized file groups and this exact-case recovery cover **76 unique passing built cases**. This is split/recovery evidence, not an uninterrupted76-case green run. Affected source recovery now includes both WR-01 durability and UI-01 hover timing in all three configured projects (six cases); production-shell10 follows it sequentially.

`source-wire-persistence-recovery.json`: **six passes**, zero failures/skips/flaky (1.6 minutes), WR-01 durable wire round trip and UI-01 real hover/focus/timing in Chromium, phone Chrome and tablet WebKit. These replace the same six existing case keys, so source coverage remains **246 unique passing cases**; they are not added as six new cases. Final e2e typecheck and focused lint pass after both harness changes. No application source changed after the full 2224-unit check or fresh final build. Production-shell acceptance is now the last browser group.

### Final visual/production finding — actual Lab/tools clearance

`production-final.json`: **nine pass/one fail**, zero skips/flaky (2.0 minutes). The phone Fault Lab flow could not click the Circuit tools Fault Lab button because a hover-paused notification intercepted it. This is an application layout defect, not a reason to dismiss cards or force the click. Current built CFL screenshot review also shows the notification lane crossing the wider modeless Fault Lab header. Normal Inspector/guide clearance did not cover that wider window. The raw failure and screenshot are retained.

Raise the active Circuit tools menu above notifications while keeping it below blocking modals. Place desktop Lab notices in its reserved left column; while notices exist, phone Lab gets a bounded scroll window below the notification strip. Respect the shared desktop header clearance. The existing CFL test now checks the actual lane/window separation and native Help hit at all five widths before the real fresh diagnostic. Its source branch name now displays “Circuit supply” for the existing legacy document-supply alias; captured IDs/values/revisions remain unchanged and raw solver keys are not repeated as product text. No electrical laws or numerical paths change.

This late presentation change requires fresh full checks/build/static and affected source/built/production recovery; earlier acceptance does not imply this slice is verified. Keep the completed246/76 coverage and recover only affected cases. Previous six-run dense benchmark exercised no open Fault Lab, so these Lab-only layout/label changes do not alter that fixture's scope; the documented performance limitation remains.

`source-lab-clearance-probe.json`: **one Chromium pass**, all five Lab/notification widths plus native Help and fresh 230V/0A/0W/source label (29.3s). Inspected the360px capture: readable Lab header/Help below the bounded notice strip, with Console available alongside. `check-lab-clearance-final.log` exits0: all types, lint and **2224 tests/145 files pass** on this late presentation tree (unit126.36s). `build-lab-clearance-final.log` exits0; fresh static checks pass with JS **266414 B**, CSS **29398 B gzip**, unchanged300000/30000B limits,194 HTML links,191 SEO pages and CSP. Affected recovery is nine source cases/all three projects (CFL five-width clearance, Help and guide/Console), four built desktop/phone CFL/Help cases and two production Fault Lab cases, each finalized separately.

Late Lab recovery completed: `source-lab-clearance-final` **nine pass** (1.7m), `built-lab-clearance-final` **four pass** (38.8s), `production-recovery-final` **two pass** (19.5s), zero fail/skip/flaky. Exact case reconciliation produced246/76/10 unique passing cases, with all original failures retained.

The final phone capture also exposed a dynamic Console width issue: real warning badges made the global trigger wider than its reserved column, crossing the notice lane. Keep every count label; wrap the phone Lab Console within a fixed column and reserve that width in the notification strip. The existing CFL case now additionally requires real count badges, complete lane/trigger separation and a native trigger hit after Run. This is a CSS-only application refinement after the full 2224-unit pass; app logic and the source-alias adapter are unchanged. Fresh build/static and e2e types/lint pass; the narrowed final source CFL3/built CFL2/production Lab2 recovery is required before regenerating the acceptance manifest.

## Final local functional acceptance — 2026-10-17

Final narrowed Console recovery: `source-console-clearance-final` **three passes** (55.6s), `built-console-clearance-final` **two passes** (24.3s), `production-console-clearance-final` **two passes** (20.0s), zero failures/skips/flaky. Inspected the final built phone CFL capture: complete Console/warning labels beside notifications, unobscured Lab/readings and current 230V/0A/0W. All source/built engineering captures referenced above remain local; this does not claim new human/device acceptance.

The [sanitized acceptance manifest](data/phase113-acceptance.json) reconciles project/file/suite/title keys in order, requires the final reports and records current implementation/check fingerprints. It verifies **246/246 source**, **76/76 built**, **10/10 built-shell** latest passing unique cases, with **zero unresolved keys**. Repeated/focused cases do not inflate these counts. The interrupted built attempt has no fabricated final count. Full-source nine failures, built hover failure and production phone failure remain in raw/sanitized history; combined coverage is not an uninterrupted full-green run.

All14 issues and milestones 1.13.0–8 are locally functionally accepted within the declared plan. Shared feedback/lifecycle/readiness, target-following geometry, Help, shell, model/wire settings and116-entry reference dispositions are implemented and verified within their recorded scopes. Final full application check is2224 units/145 files plus types/lint; real local Workerd parity897 and local D1/cookie groups34 remain valid for unchanged numerical/access contracts. Latest build/static is JS266412B, CSS29447B gzip within unchanged budgets,194 links,191 SEO pages and CSP. Current metadata/phase linkage is checked separately below.

**Remaining limitations:** source dense zoom retains all measured150–249.9ms p95 outcomes and the failed60fps goal; paired diagnostic current/HEAD p95 is166.7ms both, not production-speed proof. Historical solver 45.07ms/8ms and generator timing remain open. No thresholds were relaxed. Four unsupported fault effects, missing manufacturer ratings and narrow teaching-rule scope remain explicit. Cause clearing, protection OFF/reset, deliberate ON and replacement are separate; all electrical/current-revision/access guards are retained. This acceptance authorizes no publication, commit/push, deployment or remote account work. The active graph checkpoint remains1.13; no unspecified follow-up phase is started.

### Final evidence and metadata validation

The final Console recovery and latest manifest preserve **246/76/10** unique passing case totals with zero unresolved keys. **76 current implementation/check SHA-256 fingerprints**, **30 local document links**, **14 issue mappings**, the completed parent/nine milestones and retained active checkpoint validate. Five final graph-tool tests pass; diff whitespace and JSON formatting pass. Latest static artifacts are `console-final-*` and final application logic/full units are `check-lab-clearance-final`, with the later CSS/harness scope explicitly separated.

Scoped review targets are the Phase 1.13 combined finding, preserved-result contracts, notification/control clearance, marker movement, persistence acknowledgement and dense-performance comparison, plus their four current feature mappings. Their actual review timestamps/scopes/fingerprints live in `docs/code-graph.json`. Historical review baselines are not renewed; global content-freshness flags remain separate from this functional acceptance and from test proof.

### Separately authorized GitHub checkpoint preparation — 2026-10-17

After functional closure the user explicitly requested commit and GitHub push.
The checkpoint includes the implementation, reviews/previews, tests and evidence;
Cloudflare operations, deployment and live-site testing remain unauthorized.
Actual Git refs establish publication separately from this acceptance record.

Staged-file formatting normalized six files. TypeScript syntax trees, CSS rule/
declaration structure and parsed JSON match their pre-format accepted versions
(`.wrangler/phase113/publication-format-equivalence.log`). The first byte-level
catalogue check exposed formatter-only snapshot drift; the reference generator
now uses the same canonical Biome output as the existing model inventory, keeping
the full snapshot comparison read-only and exact. The unchanged 116-entry data
passes its refreshed check (`publication-catalogue-reference.log`), and **16
focused notification/repair tests pass** (`publication-focused.log`). No electrical
law, visual rule or browser assertion changed. Original browser/static/performance
evidence remains scoped as above; the manifest records this preparation and current
fingerprints. Normal formatting/lint and full typecheck commit hooks still apply.
