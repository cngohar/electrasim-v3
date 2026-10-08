# Phase 1.5F.3 — legacy retirement and integration gates

Status: **finished with user-accepted exceptions, 2026-10-08**. After reviewing
the reported results, the user instructed: “record this and mark them finish
with explicit notes”. This closes the F.3 milestone administratively; it does
not turn failed timing checks or aggregate browser evidence into a full green
gate. **Next phase: 1.6 visual effects**, not started by this closure.

## Closure decision and retained exceptions

The user accepted finishing this phase with the following recorded limitations:

| Item | Saved evidence and disposition |
| --- | --- |
| Application simulation | 200 components / 396 wires: median 23.07 ms, p95 **29.13 ms against 8 ms**. Timing gate failed; retained as performance follow-up. |
| Generator repair loop | Difficulty p95 **88.7 / 225.6 / 611.6 ms against 120 ms**; intermediate and advanced failed. Pinned-recipe p95 52.1–596.2 ms. All functional invariants passed. |
| Generator creation | Pinned advanced contactor median **5.336 ms against 5 ms**; failed. No new target was approved or implemented. |
| Development browser evidence | All 475 runnable original cases passed across the full attempt and focused reruns, with 20 intentional skips; nine toolbar checks also passed. This is aggregate evidence, not one uninterrupted green full matrix. |
| Dense rendering | Existing 60 fps objective remains unmet: drag frame p95 83.4 ms and zoom 216.6 ms in the recorded run. The narrower pointer-handler/idle fallback gate passed. This older performance limitation remains deferred. |
| Complete gate | No successful uninterrupted `verify:phase-1.5f3` / full `verify` is claimed. The commands retain their existing checks and fail when their budgets are missed. |

Fresh passing evidence: all types and lint, **2,207 unit tests**, **858 exact
Bun/workerd cases**, **36 local membership/API groups**, **53 production browser
cases**, build/assets/link/SEO/CSP, **600 Diagnosis scenarios**, and **1,800
Ohmageddon scenarios**. The full generator sweep passed correctness for **3,006
circuits, 174,048 faults, 310,476 repair checks**, and zero collisions across
60,000 identity samples, while failing the timing requirements above.

Performance work remains tracked here for later optimization and remeasurement;
it is no longer a blocker to starting 1.6 under this user-directed closure.
Do not increase budgets, skip assertions, or report performance completion from
this decision. Older “acceptance open” entries below describe the state before
this closure and are superseded only as milestone status. Measurements remain
valid evidence of failures. Cloudflare development stays local only; this
decision does not authorize any deployment or remote Cloudflare operation.

## Runtime and compatibility

The single `simulate()` boundary now dispatches exclusively to scalar MNA or
complex RMS phasor engines, including declared control/protection/damage steps.
Removed `simulation/legacy.ts`, `coils.ts`, `indexing.ts` and `traversal.ts`.
`SimulateOptions` lives in `simulation/options.ts`, with the existing public
exports and application, Comlink and local Hono entry points preserved.

Component adjacency remains only for the conservative Zs applicability check;
it does not operate protection. Cable tables, standalone trip curves and
educational calculation utilities remain independently usable and never supply
fallback telemetry. Historical fault mirrors, source alias migration and
canonical saved terminals remain supported. No document or D1 schema changed.

Obsolete `legacyObservation` metadata is recognized only to reject historical
results. The runtime never produces it. Freshness checks reject the marker and
old engine even if a cached result has the current document revision.

## Reviewed changes in behavior

| Previous fallback | Current result and independent evidence |
| --- | --- |
| LED, fan, bell and single-phase motor were lit from rail reachability | Unsupported load laws yield unavailable currents, voltages, power and operation, with no automatic trips, timed state or repair success. `retirement.test.ts` covers zero/elapsed-time and export/restore. |
| Missing coil model still operated NO/NC from reached rails | Declared resistive coil supply, hysteresis and elapsed-time engine drive supported transfers/dropout. Undeclared coils retain contact topology but have unassessed operation. Pole-isolation and oscillating feedback remain regression checks. |
| Connectivity triggered protective devices, with guessed fault-loop current | Declared models use actual pole currents, residual differences and deterministic elapsed time; static undeclared contacts do not trip. Existing protection/damage numerical fixtures remain mandatory. |
| Wire leakage, arc and smooth-DC signatures predicted RCCB/AFDD trip/blinding | Missing second-conductor, impedance and waveform laws return unassessed results. N24 wire-leakage regression now checks unavailable assessment; current residual fixtures retain numerical operation evidence. |
| Heat mode invented a temperature from nameplate power | Temperature cards now require finite modeled thermal data. Solved power/current and retained legacy temperatures cannot manufacture Celsius readings; `ComponentNode.test.tsx` exercises a real solved heater. |
| A burned conductor was visually treated as entirely dead | An open damaged wire carries no current while its connected end can retain source-relative voltage. Wire state keeps those concepts separate. |
| Default lighting guides used unmodeled LED nameplates | New lighting demos/templates select the existing incandescent teaching model. Saved user drawings are not converted. The Pro motor demo and bell/electronic/unsupported guides remain unassessed. |

`retirementFixtures.ts` records all 20 guide calculations: ten modeled scalar or
phasor cases and ten explicit gaps. Calculation coverage does not imply guide
completion, safety, protection or compliance. RCBO and generator guide wording
now states declared-model boundaries instead of guessed trips or energization.

The generator stress harness covers all six supported version-3 recipes and
asserts rejection of historical recipes. It respects physical target
applicability, tests component conductor-pair shorts/polarity, separates
unsupported wire markers from modeled faults, requires numerical consequences
rather than diagnostic prose, and checks real recovery and replay. Default seed
counts and time budgets remain unchanged.

## Verification contract

Run `bun run verify:phase-1.5f3`. Its required stages are:

1. `verify`: the existing full type/lint/unit/build/assets, application solver and
   browser benchmarks, all default browser projects, built-site browsers and
   local Worker membership acceptance.
2. `benchmark:mna`: separate numerical timing and conservation checks.
3. `test:domain-local`: exact Bun/workerd parity, including retirement drawings.
4. `test:simulator`: real local Worker/D1/cookie acceptance.
5. `stress:generator`, `stress:diagnosis`, `stress:ohmageddon`: default full seed
   sweeps, unchanged budgets.

`--list`, `--dry-run`, `--only` and `--from` retain the shared gate's partial/full
acceptance distinction. `verify` remains an intact required command. Local
Playwright defaults to two local workers across the existing browser projects;
CI defaults to one. Existing desktop inspector/toolbar workflows explicitly use
the desktop surface on each browser engine. Dedicated phone cases retain their
390 px viewport, and scalar readings use the actual phone Inspect dialog. The
browser regression fixtures now distinguish transient protection from saved
damage, modeled incandescent artwork from old LED halos, supported conductor-pair
faults from waveform gaps, and current analytics from retired scope tabs. No
electrical tolerance or timing deadline was relaxed. WebKit native controls also
use keyboard activation; animated SVG targets are verified visible, enabled and
actually under the pointer before bypassing the driver's stable-frame wait. Timing-sensitive cases also
passed with one worker after combined-run deadline pressure.

The application benchmark uses 200 components / 396 wires with modeled
incandescent loads and checks analytically expected current outside its timed
region. The existing 8 ms p95 budget remains enforced. Result JSON bytes and
serialization median/p95 are reported separately. Renderer gestures remain in
`benchmark:browser`; numerical or quiet-frame timings cannot certify 60 fps.

## Local evidence

| Check | Current evidence |
| --- | --- |
| Project types and boundary | Fresh `check` passed all project typechecks and the 157-module domain boundary after the solver and toolbar changes. |
| Repository lint | Passed, 783 files. |
| Unit checks | Fresh complete `check`: 139 files / 2,207 tests passed, including the unchanged 50 ms smoke check and all three new series-reduction regressions. `.wrangler/resume-current-check.log`. Earlier loaded failures are superseded for this check only. |
| Final build/assets | Fresh build passed. Initial JavaScript 250,029 B gzip / 300,000 B; CSS 26,092 B / 30,000 B. Links: 193 HTML files. SEO: 191 pages. CSP passed. |
| Bun/workerd parity | Fresh post-reduction run passed 858 exact cases; `.wrangler/domain-tests-uXXlFW/`. |
| Actual simulator/D1/cookies | Passed 20 groups; `.wrangler/membership-tests-O3h2dE/`. |
| Full membership acceptance | Fresh run passed 36 groups, including simulator coverage; `.wrangler/membership-tests-FfUANc/`. |
| Diagnosis stress | Fresh run passed 600 scenarios / 10,916 evaluations; build p95 15.4 ms / 150 ms and evaluation p95 7.0 ms / 120 ms. `.wrangler/resume-current-stress-diagnosis.log`. |
| Ohmageddon stress | Fresh full sweep passed 1,800 scenarios / 6,818 evaluations, build p95 39.89 ms / 200 ms. Earlier answer-leak failures remain explicit regression tests. `.wrangler/resume-current-stress-ohmageddon.log`. |
| Generator stress | Fresh full default sweep passed every functional invariant: 3,006 scenarios / 174,048 faults / 310,476 removal/recovery checks; zero collisions in 60,000 identity samples. Timing gate failed. Difficulty full-loop p95: beginner 88.7 ms, intermediate 225.6 ms, advanced 611.6 ms against 120 ms. Pinned advanced contactor generation median 5.336 ms against 5 ms. `.wrangler/resume-current-stress-generator.log`. |
| Numerical benchmark | Earlier conservation/current assertions passed for series, parallel and isolated/cascaded transformers. Latest application benchmark: 23.07 ms median / 29.13 ms p95, failing the unchanged 8 ms limit. No automated tests/builds ran concurrently with this measurement; the user's desktop remained active. `.wrangler/resume-current-benchmark.log`. |
| Serialization | Latest application payload: 2,741,551 B; separate JSON median/p95 33.22/50.87 ms. Serialization is excluded from application-solve timing. |
| Renderer fallback gate | Passed the 200-component/400-wire browser benchmark: pan handler p95 0.2 ms, drag handler p95 0.2 ms, idle average/p95 18.92/16.8 ms. Drag frame average/p95 42.09/83.4 ms and zoom 184.17/216.6 ms remain explicit failures of the broader 60 fps goal. |
| Production browsers | Fresh post-change run passed all 53 cases against built localhost output in 1.3 minutes; `.wrangler/resume-current-production.log`. |
| Development browser matrix | Corrected full matrix: 452 passes, 20 intentional skips, 23 failures. Serial follow-ups passed 19 and then the remaining four, giving aggregate coverage of all 475 runnable cases. The tablet toolbar correction also passed nine focused cases across all three projects. This is not one uninterrupted green matrix; see the continuation below. |

The full default `verify:phase-1.5f3` was attempted and failed inside `verify` at
the unit performance smoke check. A fresh complete `check` now passes. Later independent/focused commands cover the
other checks above; they do not turn that attempt into a green full gate.
Application timing and generator limits still prevent F.3 acceptance. Effects
in 1.6 remain pending. The next work is measured compiler/solver/serialization
optimization and closure of the complete browser/full-gate matrix with unchanged
limits, not a relaxed performance threshold.

Logs are ignored `.wrangler/phase15f3-*.log` artifacts. WebKit's test binary was
installed only in the local Playwright cache. No repository dependency/lockfile,
document or database schema, Cloudflare account/credentials/resources, remote
migration, deployment or live-site operation changed. Work remains local and
uncommitted; the earlier F.2 commit remains separate.

## 2026-10-08 continuation

Local services were restarted after shutdown. The earlier corrected browser run
ended at case 236 without a final result. A restarted Vite initially had HMR
active: source changes caused timestamped imports and duplicate store instances
in tests that inspect modules directly. Reusing that server invalidated the
browser observations. Restarting it with the documented `DISABLE_HMR=true`
setting passed all five affected audit/consumer cases, with unchanged assertions
and deadlines. The fresh full matrix completed: 452 passed, 20 skipped, 23 failed.
The first serial rerun passed 19 of those 23 cases. After using the shared
inspection helper, fitting the canvas before context clicks, and accepting the
platform-specific command-palette shortcut label, the remaining four passed.
This gives aggregate coverage of all 475 runnable cases plus 20 intentional
skips, not an uninterrupted green full browser run. Logs:
`.wrangler/resume-browser-matrix.log`, `resume-browser-failures-live.log`, and
`resume-browser-four.log`.

The tablet toolbar also had a real overlapping-control defect: equal grid
columns let the standards chip cover the Student control. Compact flex layout
and responsive labels now keep these controls unobstructed; the wide layout
retains its grid. Nine focused browser cases passed across all three projects,
including a new hit-testing regression at 834 px. WebKit now runs serially within
its project to avoid concurrent WPE actionability stalls; no deadline changed.

The complete `check` command passed all project types, the 156-module boundary,
repository lint, and **138 files / 2,204 tests**, including the unchanged 50 ms
simulation smoke check. Solver optimizations since that run require final checks:
indexed validation/scaling, allocation-free compensated residual evaluation,
deterministic equation ordering, canonical numerical zero, and exact degree-two
series-path reduction. Source, reference, and transformer terminals are retained;
all authored branch measurements and physical-terminal conservation checks still
run after voltage recovery. Oversized original systems remain bounded before
reduction, and overflowing reduced resistance retains the original equations.
The full core suite passed **430 tests** after reduction. Before reduction,
**858 exact Bun/workerd cases** passed in `.wrangler/domain-tests-kmRJa1/`.

Result identity now constructs sorted-key records without entry-pair allocations;
the no-transformer coupling path avoids building unused indices. These changes
passed **101 focused checks** before series reduction. Numerical and JSON timing
samples are collected separately, with the same counts, independent current
assertions and unchanged 8 ms solve budget. The latest isolated reduced-solver
measurement is **21.78 ms median / 39.97 ms p95**, with JSON **27.42 / 33.70 ms**
and **2,741,551 B**. This remains a failed performance gate, not F.3 acceptance.

The final post-reduction `check` passed **139 files / 2,207 tests**, all project
types, the 157-module boundary and lint across 783 files. Exact Bun/workerd
parity passed all **858 cases**. A later Bun application measurement, without
concurrent automated tests/builds, recorded **23.07 / 29.13 ms** median/p95.
A diagnostic run of the same bundled benchmark under Node recorded
**16.72 / 28.86 ms**, also failing 8 ms. This does not change the required Bun
command or certify browser performance. The profile shows work distributed
across compilation, equation preparation, readiness and result construction;
there is no evidence that changing runtimes alone closes the performance gate.

The refreshed build passed asset/link/SEO/CSP checks and all 53 production
browser cases. Fresh `benchmark:mna` passed analytical-current and conservation
assertions for every scenario. Dense 199-parallel-load median/p95 was
15.74/27.15 ms; 255-series-load was 15.10/25.68 ms; 255-parallel-load was
17.91/29.69 ms. Small isolated/cascaded transformer p95 was 1.10/0.94 ms.
The numerical benchmark command reports timing rather than enforcing the
application gate; its zero exit status does not satisfy the 8 ms requirement.

All three full default stress commands were refreshed sequentially after the
solver changes. Diagnosis and Ohmageddon passed their correctness and timing
requirements. The generator completed in 683 seconds with all functional
invariants intact, but failed full-loop limits and the pinned contactor recipe's
generation median. The pinned full-loop p95 range was 52.1–596.2 ms. No seeds,
assertions, work inside the timed loop, or acceptance limits were reduced.
Fresh local membership acceptance passed all 36 groups, including simulator
coverage. These results still do not constitute a successful full F.3 gate.

At the end of this continuation Vite was restored to normal HMR and development
Worker 8791; the test Worker 8792, built preview 8788, and Astro development
server 4321 were left local. The next work remains application/compiler/result
construction and generator repair-loop performance, followed by the complete
required gate. No completion commit or GitHub push has been made.

GitHub fetch confirmed `origin/main` at `34521c0` (F.1) with local `2d561f5`
(F.2) directly ahead. The user authorized commit/push after completion. No push
or Cloudflare remote operation has occurred.
