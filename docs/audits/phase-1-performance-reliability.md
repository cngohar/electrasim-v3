# Phase 1.14 — performance reliability ledger

**Status (2026-10-22): closed locally by explicit owner decision with a
hardware/environment-dependent performance exception. Functional checks pass;
strict solver p95 ≤8 ms and dense 60 fps/device targets are not certified on this
host. No budget or assertion changed.**
The baseline used unchanged Phase 1.13 `9ee378a` application source. Subsequent
uncommitted changes and their evidence are separate. The [acceptance manifest](data/phase114-acceptance.json)
retains original failures, focused recovery, timing skips, actual measurements,
source/artifact hashes and the immutable baseline-manifest hash.

## Baseline authority

| Track | Historical measurement | Authority and scope | Phase 1.14 baseline result |
| --- | --- | --- | --- |
| Simulation | 45.07 ms p95 on 200 components / 396 wires; existing limit 8 ms. Result JSON serialization is separately measured. | [Phase 1.12 ledger](phase-1-missing-component-calculation.md), `benchmark:simulation`; older values differ and are not combined. | Canonical p95 41.88 / 47.10 ms; reporting clone 65.65 ms. All fail 8 ms; electrical assertions pass. |
| Retired Challenge Mode generator (historical, excluded) | Full-loop p95 88.7/225.6/611.6 ms per difficulty against 120 ms; pinned advanced generation median 5.336 ms against 5 ms. The functional sweep passed 3,006 scenarios, 174,048 faults and 310,476 removal/recovery checks. | [F.3 ledger](phase-1-legacy-retirement.md); retained for historical record only. Challenge Mode retirement is documented in [the retirement audit](challenge-mode-retirement.md). | No Phase 1.14 measurement planned |
| Dense editor | Phase 1.13 current zoom p95 249.9/200.0/166.7 ms across three same-host sequential runs; same-profile Phase 1.13 base/current p95 166.7/166.7 ms. Every sampled frame in both trees exceeded 50 ms. | [Phase 1.13 ledger](phase-1-ui-fault-lab.md); source development assets, 200/400 SVG fixture, limited sample set. | Source zoom p95 233.3 / 333.4 ms; production 216.7 / 300.0 ms. Narrow gates pass; 60 fps remains unmet. |

Do not compare these rows as matched before/after values. Refresh baselines on a
single committed application tree, one workload at a time, with environment and
concurrent load recorded. Raw reports remain under `.wrangler/phase114/`
(ignored); the [tracked baseline manifest](data/phase114-baseline.json) retains
sanitized native aggregates, the additional solver sample arrays, source and raw
artifact hashes, profiling summaries and acceptance boundaries.

## Milestone state

| Milestone | Status | Evidence |
| --- | --- | --- |
| 1.14.0 — reproduce and profile | Complete locally | Repeated source/production baselines, separate solver/transport timing, solver-only CPU profile and production CDP timeline below |
| 1.14.1 — solver throughput | Closed with explicit hardware-dependent exception (2026-10-22) | Bounded optimizations verified by 811 affected core/simulation tests, 897 exact Bun/workerd parity cases, full types/lint. Prior canonical p95 37.41 / 61.06 / 41.49 ms remains failed against unchanged 8 ms |
| 1.14.3 — dense editor interaction | Closed with explicit hardware-dependent exception (2026-10-22) | Source/built artwork, keyboard, hit/fit, export, theme and grid-paint checks pass. Retained production zoom p95 316.6 / 216.6 ms; every sampled zoom interval >50 ms. 60 fps/device not certified |
| 1.14.4 — integrated acceptance | Closed locally with explicit exception (2026-10-22) | Original failed full gate and focused recovery remain separate. Prior full matrix evidence retained; post-checkpoint changes passed affected tests and 897 parity. Strict solver/dense/device targets remain uncertified |

## Limits and acceptance rules

- Solver p95 ≤8 ms for the unchanged 200/396 workload.
- Preserve the current dense-scene average <30 ms, p95 ≤50 ms, <10% long-frame,
  handler <1 ms average/<2 ms p95 and commit <16 ms checks.
- Existing 60 fps dense gesture intent is a separate open target. State the
  browser/device and trace scope; do not certify it with a static/idle or
  development-only measurement.
- Do not restore retired Challenge Mode. Diagnosis continues to use shared
  generation code; preserve its behavior if an active scoped change touches it.
- No threshold, fixture workload, electrical tolerance,
  accessibility behavior or parity requirement may be weakened to pass a gate.
- Preserve failures, interruption and focused recovery as separate evidence.
  Report local functional status, each timing target, strict-gate status and any
  device/owner acceptance independently.

## 1.14.0 environment and procedure

Host: Linux x86_64, AMD PRO A8-8650B R7, four cores/four logical CPUs, maximum
3.2 GHz; Bun **1.4.2**, Node **24.14.1**, Playwright **1.63.0**, headless Chromium
**153.0.8010.12**, Desktop Chrome **1280 × 720**, device scale 1. Source runs use
Vite on `127.0.0.1:3014` and the configured isolated local test Worker;
production runs use a fresh full build served at `127.0.0.1:8788/app/` by
`scripts/preview-server.mjs`. The profiled run records the actual hashed asset
requests, including `app-cSfXkRBf.js` and `index-hosmI_SK.js`.

All expensive jobs ran sequentially: two canonical solver runs, an appended
raw-report clone, a separate solver-only profile, two source-browser runs, full
build/asset check, two production-browser runs, then one production CDP profile.
No agent build/test/stress job ran alongside a measurement. The user's desktop
and Firefox remained active; this is not exclusive or idle hardware evidence.
Initial load averages were 1.69 / 2.08 / 2.24. Preserve the observed variability;
these runs do not prove a regression against historical runs or a speedup from
development to production assets.

`git diff --exit-code HEAD -- scripts packages src e2e` confirms the canonical
benchmarks and application/domain source still match `9ee378a`. Pre-existing
Phase 1.14 planning documents were uncommitted. All diagnostic wrappers and raw
profiles are ignored files, separate from application code.

### Solver baseline and profile

Each run retains the unchanged **200 components / 396 wires**, **20 warmups /
100 timed solves**, analytical current assertion, converged status, absence of
legacy observation and all 198 energized loads. JSON transport uses a separate
100-sample loop after solving; its garbage collection is not interleaved with
the solve samples.

| Report under `.wrangler/phase114/` | Solve median / p95 (ms) | JSON median / p95 (ms) | Result |
| --- | --- | --- | --- |
| `solver-1.log` | 23.92 / 41.88 | 35.92 / 47.08 | Electrical assertions pass; exit 1 for 8 ms p95 |
| `solver-2.log` | 24.28 / 47.10 | 31.52 / 37.77 | Electrical assertions pass; exit 1 for 8 ms p95 |
| `solver-raw.log` | 32.25 / 65.65 | 38.52 / 47.91 | Same assertions/budget, exit 1; reporting appended after all timing |

The result payload remains **2,741,551 bytes**. The raw clone preserves the
entire canonical script and appends only sample output after timing/assertions;
the native sorting retains all sample values but not acquisition order. Its
worse result is retained, not silently discarded or attributed to the reporting
appendix. Reproduction details are in `.wrangler/phase114/reproduce.md`.

`solver-only.cpuprofile` uses the same fixture, 20 warmups, 100 solves and
electrical assertions, stopping before the transport loop. It is diagnostic;
its zero exit does **not** enforce or pass the canonical timing gate. Of sampled
time under `simulate`, stage weights are **67.66% controlled solver**, **17.14%
compile**, **9.21% application adaptation**, **5.08% circuit revision**, **0.91%
other**. The controlled-solver path includes readiness (22.66% of sampled
`simulate` time), operating-point derivation (11.66%) and series reduction
(8.41%). These nested inclusive percentages must not be added together.
Warmup/JIT and sampling overhead remain part of this diagnostic.

Source review followed `simulate.ts` → `dimming.ts` → `mna.ts`, readiness,
operating-point derivation, `mnaAdapter.ts` and `simulationEvidence.ts`.
**Bottleneck statement:** this workload spends substantial time in topology and
result preparation as well as numerical solving. Removing JSON transport alone
cannot close the 8 ms solve budget. Start 1.14.1 by isolating avoidable repeated
traversal/allocation in the measured path; preserve every result, ordering,
freshness and independent numerical contract. No solver optimization or runtime
rewrite is accepted by this profile.

### Dense editor baseline and production trace

The unchanged benchmark imports **200 components / 400 wires**, verifies every
device's artwork, runs simulation and waits 500 ms. It retains cancellation and
dense-wire opacity restoration, a trusted middle-button pan on a wire, then
frame-paced synthetic pan/drag (60 moves each), 60 wheel events and 180 idle
frames. Each gesture report contains 59 frame intervals. Ordinary reports expose
native aggregate attachments, not individual frame arrays; no claim of retained
per-frame arrays is made.

| Report prefix under `.wrangler/phase114/` | Pan / drag / zoom frame p95 (ms) | Zoom mean (ms) | Idle mean / p95 (ms) | Existing assertions |
| --- | --- | --- | --- | --- |
| `browser-source-1` | 50.1 / 66.8 / 233.3 | 192.08 | 16.58 / 16.8 | Pass |
| `browser-source-2` | 133.4 / 100.0 / 333.4 | 205.92 | 16.79 / 16.8 | Pass |
| `browser-built-1` | 50.1 / 50.1 / 216.7 | 168.07 | 17.18 / 16.8 | Pass |
| `browser-built-2` | 50.0 / 66.7 / 300.0 | 185.87 | 16.63 / 16.8 | Pass |
| `browser-built-profile` (diagnostic CDP/marks) | 83.3 / 99.9 / 250.0 | 177.96 | 16.55 / 16.7 | Pass; separate instrumented result |

All five preserve pointer-handler mean <1 ms / p95 <2 ms, release commits
<16 ms and idle mean <30 ms / p95 ≤50 ms / <10% long frames. The maximum measured
release is 8.4 ms in the instrumented run. **Every reported zoom interval exceeds
50 ms in all five runs**. Wheel-handler telemetry itself is also distinct:
ordinary production mean/p95 is 3.745/19.5 ms and 6.10/29.4 ms. The benchmark's
zero exit is a pass of its declared narrow gates, never a 60 fps claim.

The production diagnostic imports the unchanged test and adds CDP CPU/timeline
capture plus user-timing marks around each synthetic wheel dispatch. The zoom
window spans the first wheel mark through the last dispatch plus 200 ms settling:
**10,724.774 ms**, 60 wheel events. On the renderer main thread the trace records
**5,800.317 ms waiting for commit completion**, **1,528.810 ms Layout**,
**651.165 ms Paint**, **621.910 ms PrePaint**, **591.903 ms FunctionCall** and
**513.461 ms Layerize**. Event categories overlap hierarchically; do not sum them
as independent CPU time. RasterTask durations sum to **20,272.163 ms across
threads**, which can overlap each other and the main thread. The CPU profile's
94.37% `(program)` samples during this window are consistent with native browser
work/waits, not a named JavaScript hotspot or a GPU measurement.

Source review confirms wheel input updates the world SVG transform through
`useCanvasGestureStart.ts` and the viewport store. Routes are already memoized by
geometry; the trace does not justify choosing route recomputation as the cause
of each zoom frame. **Bottleneck statement:** browser rendering, raster work and
commit waits dominate this particular production zoom trace. It supports a
bounded investigation of SVG invalidation/paint and compositor behavior in
1.14.3. Exact underlying raster/commit cause remains unresolved; this is not
authorization to replace the renderer, remove artwork/hit targets or claim
hardware acceptance. Profiling overhead and the active desktop limit inference.

### Build and remaining acceptance

Fresh `bun run build` and `bun run check:perf` pass: initial JS **266,410 B gzip**
against 300,000; CSS **29,450 B gzip** against 30,000; HTML **7,960,733 B / 194
pages**, 39 tag pages and 84,798 B priority image. This validates the production
assets used above, not integrated phase acceptance.

Evidence validation passes all five graph implementation tests, JSON formatting,
`git diff --check`, source/ignored-artifact SHA-256 integrity and a direct check
of the recorded workload counts and unchanged native budget assertions. The
global graph check still reports historical/cross-phase unreviewed or changed
records; it is a freshness check, not a runtime test. Only the Phase 1.14 scope,
baseline finding and feature mapping receive new scoped reviews.

At that baseline checkpoint, 1.14.0 closed reproduction/profiling only; no
application optimization or full unit/runtime matrix was claimed. Subsequent
implementation and verification follow below. Device/owner acceptance, commit,
publication and Cloudflare operations remain excluded.

## Continuous execution — bounded implementation

After the user requested all remaining 1.14 milestones in one continuous local
run, implemented two bounded solver changes: index the first closed load branch
per component during preparation, and return from ideal-link recovery before
allocating per-net forests when no closed ideal link exists. The physical
equations, validation/conservation checks, order and result contract are unchanged.
All **897 pre/post fixture results match byte-for-byte**; the first canonical
optimized run reports **21.36 / 37.41 ms median/p95**, still failing 8 ms, with
separate JSON **30.24 / 36.65 ms**, **2,741,551 B**. This is not throughput acceptance.

For SVG rendering, a production DOM isolation probe hid only the grid (diagnostic,
not accepted output), recording zoom p95 183.4 ms. A second probe retained the
visible grid on a viewport-sized root rectangle and transformed its pattern with
the world; zoom p95 was 150.1 ms. Both are single instrumented/prototype samples,
not matched before/after acceptance. Implemented the visible-grid variant in
`CircuitCanvas.tsx`; pan commits synchronize pattern/world transforms before
clearing the preview. All circuit devices, artwork, wires and hit targets remain.
The new native pixel comparison uses the previous oversized world-grid paint as
an independent reference after zoom, committed pan and cancellation. It passes
Chrome desktop/phone and Safari in the initial and focused source attempts,
and desktop/phone built Chrome in recovery.

`bun run verify:phase-1.14 --keep-going` runs the declared sequential matrix and
retains individual stage status and browser reports under a unique ignored
directory. The present full attempt is `.wrangler/phase114/integrated-1/`, with
combined output in `integrated-1.log`. Full types/lint, **2,224 units / 145 files**,
**11 gate / 5 graph tests**, both catalogue checks, full build/static budgets,
**897 Bun/workerd cases** and **34 local API/D1/cookie groups** pass. Latest
assets are **266,488 B JS / 29,450 B CSS gzip** within unchanged limits.

The initial source/built/performance matrix has finished. Initial legacy canvas
export/theme and timed-control navigation failures remain preserved: an Import
tab retained during fast reopening, a removed header theme control, and an open
detailed-settings modal intercepting Fit. These were corrected through the current
visible Export/Settings/Close flows after the frozen attempt, keeping all
download/artwork/reduced-motion/coil/reset assertions. Safari's initial SVG/PNG
case passes, consistent with a slower close/remount returning to Export. The
built-stage configuration was corrected before execution to use existing
production-compatible catalogue/fault/canvas cases; source-import suites remain
fully covered in the source stage. This correction and the initial source
fingerprints are recorded beside the per-stage manifest.

The completed initial source attempt is **147 passed / 8 failed / 1 skipped**
across desktop Chrome, phone Chrome and tablet Safari. The extra Safari
running-lock failure leaves the Inspector unselected after the existing SVG
selection helper; two unchanged isolated repeats subsequently passed. The original failure
remains an unreproduced intermittent selection failure, rather than a proven
navigation correction or a proven fixed product defect.
All three source paint comparisons pass: Chrome desktop/phone report zero pixels
above the delta-4 comparison tolerance; Safari reports 51–106 / 216,000 pixels,
below 0.05%, against the test's 1% allowance. Each engine checks initial, zoom,
committed-pan and cancelled-pan paint.

The new built canvas setup also exposes a harness URL error: its old `/?e2e=...`
opens the marketing homepage rather than `/app/`. Those cases have not reached
the editor and are failed setup evidence, not successful product checks. Recovery corrected
the built URL and passed every affected canvas case.

Final recovery and native measurements are recorded below. Strict solver and
dense/device goals remain open; no phase closure, new accepted exception or
publication is claimed.

## Completed first integrated attempt and focused recovery

The original attempt finished with **147 source passes / 8 failures / 1 skip**,
**58 built passes / 10 canvas setup failures / 2 intentional parity skips**, and
**63 production-shell passes**. Its source dense benchmark passes narrow gates,
with zoom mean/p95 **211.57 / 266.668 ms**, pan p95 **50.0 ms**, drag p95
**66.7 ms**, idle p95 **16.7 ms**. The production dense stage accidentally
skipped its opt-in case; exit zero there is **not timing evidence**. The runner
now selects the benchmark explicitly, sets its required `PERF=1` flag and rejects
a successful but skipped or empty performance stage. An intermediate recovery
also skipped without that flag; the new guard correctly failed it and continued
to the solver. Both skipped attempts remain separate from actual measurements. Its final canonical solver run is **31.73 / 61.06 ms**
median/p95; JSON **37.16 / 46.22 ms**, unchanged **2,741,551 B**. The strict
solver gate fails.

The unchanged Safari running-lock case passed **two of two** isolated repeats
with traces. The initial empty-Inspector failure is retained as an unreproduced
intermittent selection failure, rather than silently recategorized as setup.
Canvas recovery uses `/app/` for built delivery, explicitly chooses Export and
confirms the filename, and changes theme through Settings. Timed-controls closes
the detailed settings modal before Fit. All original physical, export, artwork,
current, replay and reset assertions remain. The recovery also checks phone
theme behavior previously skipped. Source recovery passed **24/24**, built canvas recovery **10/10**, and unchanged
Safari selection repeats **2/2**. Aggregate evidence therefore covers **156
unique source cases and 68 unique built cases**, with the existing **two
intentional built source-module parity skips**. This does not rewrite the
original gate as uninterrupted green. E2E types, repository lint, all **11 gate
tests** and **five graph tests** pass after harness/tooling corrections.

## Final sequential measurements and remaining work

All timings use the original workloads, budgets, runtime/browser and headless
viewport on the same AMD A8 host. No build or other agent test job ran during
these samples; the user desktop remained active. This is not exclusive hardware
or target-device acceptance. Raw conditions are in
`.wrangler/phase114/recovery-timing-environment.json`.

| Solver run after implementation | Solve median / p95 | JSON median / p95 | Result |
| --- | --- | --- | --- |
| First canonical | 21.36 / 37.41 ms | 30.24 / 36.65 ms | Fails 8 ms |
| End of full attempt | 31.73 / 61.06 ms | 37.16 / 46.22 ms | Fails 8 ms |
| Isolated sequential repeat | 22.89 / 41.49 ms | 29.28 / 36.77 ms | Fails 8 ms |

Every electrical benchmark assertion passes; JSON remains **2,741,551 B**.
The timing distributions overlap the baseline; these samples do not establish a
stable throughput improvement or close 1.14.1.

| Actual production browser run | Pan / drag / zoom p95 | Zoom mean | Idle p95 |
| --- | --- | --- | --- |
| Ordinary 1, corrected runner | 50.0 / 50.0 / 316.6 ms | 196.04 ms | 16.8 ms |
| Ordinary 2, separate repeat | 50.0 / 50.0 / 216.6 ms | 148.02 ms | 16.7 ms |
| Separate CDP diagnostic | 33.4 / 66.7 / 316.7 ms | 188.97 ms | 16.7 ms |

All three pass existing narrow handler/commit/idle checks. Each ordinary zoom
sample has **100% intervals above 50 ms**. The grid isolation probe's 150.1 ms
p95 was a prototype; ordinary production repeats do not establish that gain.
No 60 fps, trusted-device or owner acceptance is claimed.

The post-change diagnostic's **11.363 s** marked zoom window contains **5.172 s
commit waits**, **1.655 s Layout**, **0.835 s Paint**, **0.850 s FunctionCall** and
**21.559 s summed raster tasks across concurrent threads**. These categories
overlap and must not be added as independent CPU time. Actual hashed production
asset requests are retained. Browser rendering/commit costs remain substantial;
the grid bound alone does not solve them. The first profile attempt found its
local preview unavailable and measured no workload; its error and recovery are
both retained, without overwriting baseline profiles.

## Owner closure — 2026-10-22

The user explicitly closed Phase 1.14: the solver/dense targets are wall-clock,
hardware/environment-dependent measurements, and the current shared desktop is
not a stable certification environment. This is an explicit scope decision by the
owner, not a passing measurement, budget change or assertion relaxation.

- **Retained evidence:** every earlier failed/skipped timing, original browser
  failure and focused recovery remains in this ledger and the manifests. Nothing
  was overwritten or recategorized as green.
- **Unchanged limits:** solver p95 **≤8 ms** on 200 components/396 wires, dense
  static-scene average/p95/long-frame/handler/commit checks, and the separate
  **60 fps/device** objective all remain in force for future target-hardware
  validation. Neither target is certified here.
- **Post-checkpoint code:** numeric series reduction, normalized-circuit revision
  reuse, operating-point lookup/allocation reduction and a voltage-lookup fast
  path. Verified with **811** affected core/simulation tests, **897** exact
  Bun/workerd parity cases, full types/lint and no result-contract changes.
- **Noisy follow-up attempts:** runs during the active desktop at load averages
  roughly 5–11 were not used as pass/fail or regression evidence. The canonical
  rows in this ledger remain authoritative; faster/quieter hardware must rerun the
  same workloads rather than infer a pass.
- **Next phase:** Phase 2 (Community) is planned but not started or authorized by
  this closure. Work remains local/uncommitted; no publication or deployment is
  implied.
