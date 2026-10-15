# Phase 1.12 handoff — completed local functional scope

The user requested all milestones in one continuous workflow and later said to
continue where left. **1.12.0–7 are complete locally within the declared teaching
scope. Do not restart the phase or ask for implementation authorization again.**
No next phase or deployment is implied. The user subsequently authorized this
Phase 1.12 GitHub checkpoint; see the publication boundary below. Start any further work from
the [acceptance audit](../audits/phase-1-missing-component-calculation.md), current
Git state and targeted knowledge-graph briefing.

## Implemented contract

- All **30** original missing behaviours have versioned editable teaching laws.
  The existing three-phase motor has an explicit editable setup. The 116-entry
  inventory records 30 implemented original gaps, one setup requirement,
  82 declared models with conditions and 33 other contracts.
- Five lamps regulate input power inside the declared band; fans/motors use
  complex impedance; appliances/sounders/alarms have explicit modes; PV,
  shared-common autotransformer, SPD and NTC have separate declared laws.
- Shared electrical model/capability version **1.12.1.0**, profile version 1,
  file schema **3**; schemas 1/2 migrate. Profile editing, coherent nameplate
  changes, Undo/Redo/reload, strict raw API validation and fresh-result guards
  are integrated. Optional explicit stress budgets support consuming profiles.
- Running impedances still draw calculated current outside the running band,
  without claiming running; regulated demand switches off outside its band.
  Standby consumes its declared power without an active visual.
- NTC uses deterministic range reduction/20 terms after a reproduced last-bit
  Math.exp difference; independent error checks and exact three-browser runtime
  parity pass without rounding. Autotransformer ports are LOW/COM/HIGH/COM with
  shared commons; terminal indices and geometry are preserved.
- Generic PF, band, branch, standby and environmental parameters are editable
  teaching assumptions. Speed/shaft output, startup/stall, automatic sensors,
  DC lamp drivers, electronic phase-cut dimming, SPD transients/certification,
  battery SOC and implicit destruction stay outside the declared scope.
  Existing conditional controls have explicit setup or actionable limitations.

## Retained verification — reuse valid evidence

- Full registered **2,197 units / 141 files**, types/lint, gate/graph tools,
  build/assets/links/SEO/CSP, **897 exact Bun/workerd cases** and **34 real local
  API/D1/cookie groups** pass in `.wrangler/phase112-full-functional-gate.log`.
  Runtime artifacts: `.wrangler/domain-tests-Udmomb`,
  `.wrangler/membership-tests-1arcIR`.
- **207 unique source browser cases** accepted through **192 original passes**,
  **20 focused passes** and **one isolated traced pass**. The original attempt's
  15 failures and recovery's one local Vite module-fetch failure remain retained.
  That fetch failure did not reproduce without source changes; root cause is
  unestablished. See `.wrangler/phase112-browser-recovery-final.log`,
  `.wrangler/phase112-countdown-fetch-recovery.log` and their archived artifacts.
- Built delivery: **4 native LED/Fault Lab cases** plus **18 unique catalogue
  cases**, **two intentional source-module parity skips**. Catalogue attempt:
  16 passes; both motor flows recovered with tracing after waiting for each real
  wire commit. Logs: `.wrangler/phase112-built-gate.log`,
  `.wrangler/phase112-built-motor-recovery.log`. Real emitted sim.worker required.
- Final test-only types/lint refresh passes in
  `.wrangler/phase112-final-types-lint.log`. Numerical implementation was frozen
  during final browser recoveries; no redundant full unit/runtime/API rerun.
- Source and built screenshots were inspected across desktop/phone/Safari.
  DOM assertions verify each new entry's actual readings and declared appearance.
- Gate: `bun run verify:phase-1.12`; `--list`, `--only`, `--from` report selected
  stages as partial. **Combined accepted stages do not make a failed original
  invocation green.** Changes require the appropriate affected checks.

## Performance remains separate

Unchanged 200-component/396-wire solver: **24.36 ms median / 45.07 ms p95**, still
failing **8 ms**. Before implementation: 32.11 / 68.23 ms; separate runs are not a
causal comparison. New 1/10/25-profile workloads: p95 **4.03 / 12.45 / 22.81 ms**;
these were previously unsupported, so they are new measurements, not deltas.

The existing rendering benchmark assertions pass, but pan/drag/zoom p95 is
**33.4 / 66.6 / 199.9 ms**. Dense gesture 60 fps remains unmet. Historical generator
timing was not rerun or closed. Raw logs/JSON are `.wrangler/phase112-after-simulation.log`,
`.wrangler/phase112-profile-benchmark.json`, `.wrangler/phase112-browser-performance.log`
and `.wrangler/phase112-browser-frames.json`. The strict repository-wide gate is
not green. No threshold was relaxed or new exception silently accepted.

## Local continuation rules

Use `graph:phase`, `graph:brief -- missing-component-calculation` and bounded
`graph:impact`. The [plan](../plans/MISSING_COMPONENT_CALCULATION_PLAN.md),
[ADR](../decisions/0016-regulated-load-profiles.md),
[family specification](../specs/phase-1.12-model-families.json) and audit are
primary evidence. A graph fingerprint is not a passing test. Inventory refresh
requires explicit `bun run catalogue:inventory --write`, then `--check`.

This change set was prepared from planning checkpoint `ab164ca`, after historical
implementation checkpoint `ac6c1d9`. On 2026-10-15, after functional closure, the
user explicitly authorized committing this Phase 1.12 work locally and pushing to
GitHub. This snapshot is that authorized checkpoint; use Git history and compare
HEAD, origin/main and the actual remote ref to verify publication. The permission
does not extend to future phase work or deployment. Do not restore old credentials
or run Cloudflare account/remote/live-site operations under this GitHub authorization.
