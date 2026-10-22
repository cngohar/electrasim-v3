# Phase 1.14 — Simulator performance reliability

**Status (2026-10-22): closed locally by explicit owner decision with a
hardware/environment-dependent performance exception. Functional evidence passes;
the strict solver 8 ms p95 and dense 60 fps/device targets are not certified on
this host. This is not a measured performance pass and no budget changed.**
Phase 1.13 is locally functionally complete and published to GitHub as `9ee378a`.
This plan follows the graph's latest functional checkpoint and consolidates the
still-open solver and dense-editor performance
findings already recorded by Phase 1.5F.3, 1.9, 1.12 and 1.13. Challenge Mode
was explicitly retired; its historical generator timings are not active product
work or a reason to restore that mode.

[Handoff](../handoffs/performance-reliability-next-chat.md) ·
[Baseline and acceptance ledger](../audits/phase-1-performance-reliability.md) ·
[Simulator phase map](../phases/phase-1-simulator-core.md)

## Outcome

Use reproducible profiles to identify and reduce the measured costs in the
200-component solver and dense editor interactions. Preserve electrical
contracts, editable SVG/accessibility behavior and all applicable existing timing
limits. Complete each track only with fresh functional evidence and measurements
from its stated workload. Diagnosis continues to use shared generation code;
preserve it if active scoped work touches that path, without reopening Challenge
Mode or taking on a separate generator optimization track.

## Evidence and current limits

| Track | Existing evidence | Target that remains in force |
| --- | --- | --- |
| Simulation | The 200-component/396-wire benchmark measured 45.07 ms p95 in Phase 1.12 against 8 ms; earlier and later recorded runs also missed. Solver and result JSON serialization are measured separately. | `benchmark:simulation` stays at p95 ≤8 ms; independent numerical fixtures and supported runtime parity remain mandatory. |
| Challenge Mode generator (historical, excluded) | The retired mode's last full sweep preserved functional invariants across 3,006 scenarios, 174,048 injected faults and 310,476 repair checks, but reported difficulty loop p95 of 88.7/225.6/611.6 ms against 120 ms and pinned advanced generation median of 5.336 ms against 5 ms. | No Phase 1.14 target: Challenge Mode was explicitly retired. Keep this as historical evidence; do not restore the mode or schedule a broad generator optimization. |
| Dense editor | Phase 1.13 recorded six sequential same-host runs of the 200-component/400-wire browser fixture. Current zoom p95 values were 249.9, 200.0 and 166.7 ms; the matched profiled baseline also measured 166.7 ms. All sampled zoom frames remained above 50 ms. | Preserve the existing dense static-scene gate (average <30 ms, p95 ≤50 ms, long-frame ratio <10%) and handler/commit limits. The separate 60 fps gesture objective remains open; headless frame timing alone cannot certify target-device performance. |

These are historical results from distinct runtimes, machines, fixture revisions
and run conditions. The completed 1.14.0 ledger separately records current-tree
measurements and their environment. Do not merge samples into a single baseline or infer
regression/cause from unmatched runs.

## Boundaries

- Do not change any budget, skip a timing assertion, downsample the workload or
  turn a failed measurement into an accepted exception by documentation alone.
- Do not invent or alter electrical laws, component ratings, tolerances or fault
  behavior to make a workload faster. Do not restore retired Challenge Mode.
- Preserve the public `simulate()` result/serialization contract, application
  and Comlink/local Worker parity. Preserve Diagnosis behavior if a scoped change
  touches shared generation code.
- Keep the production SVG renderer unless native profiling shows a limiting cost
  and an equivalent prototype demonstrates material benefit with interaction,
  keyboard/accessibility, terminal-hit, zoom/fit, reduced-motion and export parity.
  Canvas/Pixi/WebGL adoption is not preselected.
- Profile one expensive workload at a time. Keep Wrangler, browser and database
  state local. This plan authorizes neither deployment nor live-site testing.
- Performance acceptance is not human hardware/owner acceptance. Record the
  device/browser and the limits of headless evidence; request a device target only
  if a decision cannot be made without it.

## Milestones

| Milestone | Scope | Exit evidence |
| --- | --- | --- |
| **1.14.0 — Reproduce and profile — complete locally (2026-10-18)** | Refreshed solver and dense-browser baselines on unchanged Phase 1.13 application source; separate transport timing, solver-only CPU profile, two source/two production browser runs and a separate production CDP profile. | [Ledger](../audits/phase-1-performance-reliability.md) and [manifest](../audits/data/phase114-baseline.json). Canonical solve p95 41.88/47.10 ms fails 8 ms; reporting clone 65.65 ms retained. Narrow browser gates pass; production zoom p95 216.7/300.0 ms and 60 fps remain open. Profiles distinguish solver preparation/results from browser rendering/commit waits; exact raster cause unresolved. |
| **1.14.1 — Solver throughput — closed with explicit hardware-dependent exception (2026-10-22)** | Optimize only measured hotspots in the supported solver path. Preserve deterministic ordering and independent analytical fixtures; check allocation/compile/reduction work as well as solve time. | Bounded numeric series reduction, normalized-circuit revision reuse, operating-point lookup/allocation reduction and voltage-lookup fast path are implemented. **811** core/simulation tests, **897** Bun/workerd parity cases, full types/lint pass. Strict 200/396 p95 ≤8 ms was not met; all failed/retained measurements remain authoritative. |
| **1.14.3 — Dense editor interaction — closed with explicit hardware-dependent exception (2026-10-22)** | Profile route computation, React updates and browser paint separately on the existing 200/400 fixture. Optimize only the measured production SVG path; treat alternate-renderer comparisons as prototypes until they pass parity. | Existing static-scene, handler and commit gates pass unchanged. Retained production p95 values remain **316.6 / 216.6 ms** with every sampled zoom interval >50 ms. **60 fps/device acceptance remains uncertified**; no new 60 fps claim is made. |
| **1.14.4 — Integrated acceptance — closed locally with explicit exception (2026-10-22)** | Run the declared performance and regression matrix sequentially after changes stop. Reconcile original failures and any focused recovery without combining them into an uninterrupted green run. | Original failures and focused recovery remain separate; the full earlier matrix evidence is unchanged. Post-checkpoint changes were verified with affected suites and **897** parity cases. Each timing target remains reported separately: solver and dense **60 fps/device** targets are not certified on this shared host. Graph, plan, manifest and ledger agree. |

The earlier bounded implementation and declared full matrix remain the integrated
evidence for that tree. Exact pre/post **897** fixture outputs, **2,224 units**,
types/lint, local runtime and API checks, build/static and **63 production-shell**
cases pass. Original source **147/8/1** and built **58/10/2** results remain failed
attempts; focused **24 source / 10 built / 2 unchanged Safari** recoveries yield
**156 source / 68 built unique passing cases**, with two intentional built parity
skips. The [acceptance manifest](../audits/data/phase114-acceptance.json) keeps
these distinct.

Solver p95 **37.41 / 61.06 / 41.49 ms** still fails **8 ms**. Actual ordinary
production zoom p95 **316.6 / 216.6 ms**, and a separate CDP diagnostic **316.7 ms**,
leave **60 fps/device acceptance open**. The initially skipped production timing
and intermediate guarded skip remain preserved; the corrected runner sets
`PERF=1` and fails empty/skipped measurement stages. No budgets changed.

## Owner closure note — 2026-10-22

The user explicitly closed Phase 1.14 with this note: the wall-clock targets are
hardware/environment-dependent, and a faster or quieter machine may produce
different results. Closure is a scope decision, **not a passing measurement**:

- The unchanged budgets remain in force for future target-hardware validation:
  solver p95 **≤8 ms** on 200 components/396 wires, dense static-scene limits and
  the separate **60 fps/device** objective.
- No assertion was skipped, no workload was downsampled, and every original
  failure/failed timing remains retained. Neither target may be reported as met
  on this host.
- The 2026-10-22 bounded changes (numeric series reduction, normalized-circuit
  revision reuse, operating-point lookup/allocation reduction and voltage-lookup
  fast path) were verified with **811** affected core/simulation tests, **897**
  exact Bun/workerd parity cases, full types/lint and no contract changes.
- Fresh benchmark attempts during the active desktop (load average roughly 5–11)
  were noisy and are environment evidence only, not a new pass/fail. The retained
  canonical solver and production-browser rows above remain authoritative.
- Phase 2 (Community) is the next roadmap phase, but remains planned and
  unauthorized until the user starts it. No commit, publication or deployment is
  implied by this local closure.

## Source map and first reads

- `docs/PERFORMANCE.md` — required measurement environment and unchanged limits.
- `docs/audits/phase-1-full-verification.md` and
  `docs/audits/phase-1-legacy-retirement.md` — original closure boundaries and
  failures.
- `docs/audits/phase-1-missing-component-calculation.md` and
  `docs/audits/phase-1-ui-fault-lab.md` — latest solver and dense-editor evidence.
- `scripts/benchmark-simulation.ts` → `packages/domain/src/simulation/index.ts`
  → `packages/domain/src/core/mna.ts` — timed solver workload and dependencies.
- `docs/audits/challenge-mode-retirement.md` — scope of the explicit retirement;
  historical generator evidence remains in the F.3 ledger.
- `e2e/performance.spec.ts`,
  `playwright.config.ts` and `src/ui/canvas/` — dense editor workload, configured
  browser and production rendering path.

Import/impact edges help navigate these paths; the fixtures and native reports
remain the evidence for runtime behavior and timing.
