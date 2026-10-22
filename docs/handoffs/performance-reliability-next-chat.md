# Phase 1.14 handoff — simulator performance reliability

**Current state (2026-10-22): Phase 1.14 is closed locally by explicit owner
decision with a hardware/environment-dependent performance exception. Functional
evidence passes; strict solver p95 ≤8 ms and dense 60 fps/device targets are not
certified on this host.** Graph active phase advances to planned **2**; no Phase 2
work is started or authorized by this closure. All changes remain local and
uncommitted; no publication/deployment is authorized. Challenge Mode remains
retired and excluded.

Start with `bun run graph:phase`, then
`bun run graph:brief -- "Phase 1.14 performance reliability"`. Read the
[plan](../plans/PHASE_1_14_PERFORMANCE_RELIABILITY_PLAN.md),
[ledger](../audits/phase-1-performance-reliability.md),
[immutable baseline](../audits/data/phase114-baseline.json),
[execution manifest](../audits/data/phase114-acceptance.json) and
`docs/PERFORMANCE.md`. Preserve the current implementation and original failed
attempts. Graph freshness is navigation/review evidence, not a passing test.

## Verified implementation and functional evidence

MNA indexes the first closed load branch per component instead of repeated linear
scans. Ideal-link recovery returns before allocating forests when no closed ideal
conductor exists. Equations, deterministic order, conservation checks, tolerances
and public result fields remain unchanged. All **897 same-runtime pre/post
fixture outputs match exactly**, and **897 Bun/workerd cases** pass.

The SVG grid now paints a viewport-sized root rectangle with its pattern following
the world transform. Pan commits synchronize world/pattern transforms. All
components, wires, artwork and hit targets remain. Native grid comparison uses
the original oversized world grid as reference after zoom, pan commit and cancel.
Chrome reports zero differing pixels above delta 4; Safari records at most
106/216,000 pixels in the initial sample, below 0.05% and the test's 1% allowance.

The sequential full attempt passes **2,224 units / 145 files**, full types/lint,
**11 gate / five graph tests**, both 116-entry catalogue checks, fresh build and
static budgets, **34 local API/D1/cookie groups**, and **63 production-shell
cases**. Production assets are **266,488 B JS / 29,450 B CSS gzip** within unchanged
300,000/30,000 B limits. Application source has not changed since that build.

The original source stage was **147 passed / 8 failed / 1 skipped**; built was
**58 passed / 10 failed / 2 intentional skips**. Corrected harness flows use
`/app/` in built delivery, explicit Export and filename confirmation, Settings →
Display → Dark, and modal closure before Fit. Source recovery **24/24**, built
canvas **10/10**, unchanged Safari selection **2/2** pass. Aggregate evidence
covers **156 source and 68 built unique passing cases**, with two intentional
built source-module parity skips. Do not describe this as an uninterrupted green
gate. The original Safari empty-Inspector failure remains an unreproduced
intermittent selection failure; no product fix or root cause was established.

## Measurements and remaining requirements

Same four-core AMD A8 host, Bun 1.4.2, Node 24.14.1, Playwright 1.63.0, headless
Chromium 153.0.8010.12, 1280×720; user desktop remained active. Performance jobs ran
sequentially without builds or other agent test jobs. Hardware was not exclusive.

- Immutable baseline: canonical solver p95 **41.88 / 47.10 ms**; reporting clone
  **65.65 ms**. Production zoom p95 **216.7 / 300.0 ms**; separate profile **250 ms**.
- After implementation, canonical solver median/p95 **21.36/37.41**,
  **31.73/61.06**, **22.89/41.49 ms**. All fail unchanged **8 ms**. JSON remains
  separate: **2,741,551 B**, latest median/p95 **29.28/36.77 ms**. All benchmark
  electrical assertions pass.
- Two actual ordinary production browser runs pass narrow checks with zoom p95
  **316.6 / 216.6 ms**, pan/drag p95 **50/50 ms**, idle p95 **16.8/16.7 ms**.
  Every sampled zoom interval exceeds 50 ms. Separate CDP diagnostic passes narrow
  checks with zoom p95 **316.7 ms**; it is not ordinary timing.
- Post-change diagnostic: **11.363 s** zoom window; **5.172 s** commit waits,
  **1.655 s** layout, **0.835 s** paint, **0.850 s** FunctionCall, **21.559 s** summed
  raster across concurrent threads. Categories overlap. Actual production asset
  requests are retained. The grid bound alone does not solve these costs.

These distributions do not establish a stable speed improvement. The strict
targets were **not met**. On 2026-10-22 the user explicitly closed the phase on
the basis that these wall-clock results depend on hardware/environment, with the
following binding note:

- Closure is a scope decision, not a performance pass. Keep the unchanged solver
  **8 ms p95** and dense **60 fps/device** limits in force for target-hardware
  validation; do not claim either passed here.
- No original failure, skipped timing, recovery or measurement was deleted or
  rewritten. A faster or quieter machine must rerun the same workloads.
- Post-checkpoint bounded changes (numeric series reduction, normalized-circuit
  revision reuse, operating-point lookup/allocation reduction and voltage-lookup
  fast path) passed **811** affected core/simulation tests, **897** exact
  Bun/workerd parity cases, full types/lint and preserved the result contract.
- Fresh follow-up runs on the active desktop (load average roughly 5–11) were
  environment evidence only; they are not a new pass/fail or regression claim.

Phase 2 (Community) is the next roadmap phase but remains planned and
unauthorized. If target-device performance is pursued later, rerun the retained
solver/browser workloads on that hardware before making a speed claim.

## Evidence and useful commands

Raw artifacts/wrappers are ignored under `.wrangler/phase114/`; tracked manifests
retain sanitized case results, aggregates and SHA-256 hashes.

- `integrated-1.log` and `integrated-1/`: original full attempt and configuration
  correction. Never replace these with recovery reports.
- `recovery-source.json`, `recovery-built.json`, `recovery-safari-selection.json`:
  focused functional recovery and original Safari case repeats with traces.
- `timing-recovery/`: intermediate skipped production benchmark correctly failed
  by the new guard; the solver repeat still ran and failed its 8 ms target.
- `timing-recovery-2/`: corrected runner's actual production measurement.
- `browser-built-after-2.json`: independent ordinary production repeat.
- `browser-built-after-profile.json`: unavailable-preview setup failure, no workload.
- `browser-built-after-profile-2.json`, `browser-after-profile-summary.json`:
  successful separate CDP capture and summary. Baseline profiles remain untouched.

`bun run verify:phase-1.14 --keep-going` runs the full declared local matrix and
preserves per-stage reports. `--list`/`--dry-run` inspect it; `--only`/`--from`
are explicitly partial. Production timing stage is `browser:4`; the runner now
sets `PERF=1` and rejects empty/skipped performance stages. Standalone production
benchmark also needs `PERF=1` with `playwright.performance-built.config.ts`.
Build first after product edits; never build or run another workload while timing.

All Wrangler/Worker/D1 and browser operations stay local. No credentials, old
Cloudflare account operations, live-site tests, remote migrations or deployment.
