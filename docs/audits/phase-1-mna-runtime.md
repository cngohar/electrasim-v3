# Phase 1.5C.5 — MNA application runtime

Date: 2026-10-04. Status: **complete locally**. The public `simulate()` boundary now uses the accepted MNA model for supported circuits in the application, Comlink worker and local Hono API. Development and verification use localhost and local persistence under root `AGENTS.md`.

## Runtime and measurement changes

`packages/domain/src/simulation/simulate.ts` validates and compiles once, calls `solveCompiledCircuit`, and projects the versioned result through `mnaAdapter.ts`. The independent `solveCircuit()` API uses the same compiled solver. The existing Comlink method and `POST /api/simulator/simulate` consume this shared entry; no new endpoint or document schema is introduced.

Supported DC and single-phase resistive circuits now expose calculated terminal-pair voltage, signed branch current and power. Series loads include every conductor's declared resistance, parallel branches carry their own currents, shared feeders satisfy KCL, and independent supplies retain separate references. Changing a supply preserves the load's nameplate and changes its operating point. Isolated transformers retain separate winding voltages, signed power transfer and galvanic references. An outlet reports available terminal voltage without inventing a consuming load from its current capacity.

Wire results use one-conductor resistance at 20 °C, conductor drop and loss, source-relative endpoint potentials and actual current. A live open conductor can display potential with zero current; flow animation requires nonzero calculated current. Wire current, capacity and protection ratings remain separate. Unknown capacities and cross-domain voltages stay unavailable; there is no default 10 A, 20 A, 230 V or 0.05 Ω telemetry. Device poles show their own currents, overcurrent ratings in A and residual sensitivity in mA.

Component properties, the wire simulation tab, Fault Lab ratings, readiness details and status text consume the new result. Supply edits invalidate old readings before the next Run. Fault Lab rating edits obey the existing running/exercise locks. Optional event-history and fault-alert panels load when opened to preserve the existing initial-JavaScript budget.

## Coverage and migration boundary

The result carries `electrical` with calculation, operation, readiness, diagnostic and coverage data. Electrical contract version remains **1**, numerical engine remains **`mna-linear-2`**, shared model version is **`1.5c.5.1`**, and capability catalogue remains **`1.5c.3.1`**. Circuit-file schemas remain 1/2. Sets retain their native form through Comlink and become arrays at the existing JSON API boundary.

Invalid documents, numerical failures, source conflicts and unsupported source/winding configurations do not fall back to legacy numerical estimates. The MNA adapter returns unavailable readings and explicit findings. Three-phase distribution boards are also explicitly unassessed instead of accidentally receiving a single-phase calculation.

The isolated `legacy.ts` path temporarily preserves existing continuity, switching and fault/protection observations for eligible unmigrated load/control/fault models. Those results carry `legacyObservation`, calculation/operation coverage is unassessed, and component/wire/thermal measurements, global supply telemetry and heat ratios are withheld. Legacy observation and protection approximations are not accepted MNA operating points or timed-device physics. Unsupported DC, transformer, three-phase and conflicting-source cases retain their guards. Complete exercise/result migration and removal of this path remain **1.5F**, after **1.5D/E** implement their prerequisites.

For calculated circuits, algebraic convergence does not invent a trip, melted cable, destroyed component, thermal history or standards verdict. Static bypass and physical polarity findings are now shared with validation, but timed clearing, residual operation, coordination and damage remain **1.5D**. Full validator, instrument, export and lab grading/replay migration remains **1.5F**. Guides with unassessed behavior cannot claim a clean completed result.

## Independent acceptance and reviewed differences

`runtime.test.ts` asserts series/parallel/shared-feeder values, the fixed-rating heater voltage sweep, independent AC/DC supplies, live zero-current wires, isolated transformer transfer, real pole currents, unavailable LED measurements and failure guards. It also compares the complete adapted electrical result with the numerical API, verifies basic/Pro equality and checks structured cloning.

The five previously expected audit failures are now ordinary assertions: series current/voltage, distinct parallel currents, the spurious low-voltage/110 V error, bypass of an open contact, and physical reversed polarity. Series/parallel expectations include the declared conductor resistance; they do not reuse the old fixed `P/V` values. Legacy curve regression tests remain explicitly attached to the retained legacy helper, while MNA regressions require timed operation to remain unassessed. Injected open CPCs and unused travellers remain visible as broken conductors without pretending they carry normal load current.

The browser fixtures import real drawings, run the actual worker, and inspect displayed values. They cover supply-change recalculation, transformer winding/load readings, current-flow animation, live zero-current conductors, per-pole protection current and unsupported measurements. The same 57-circuit corpus is compared across direct domain, real Comlink and authenticated local Hono. Guest DC browser/API acceptance also checks the analytical load values. The reordered Comlink case compares actual 12 V load current/power after delivering the obsolete 230 V result; both calculations now converge, so comparing status alone would no longer prove stale-result protection. Existing persistence, authorization, editing, challenge and relay tests remain in the phase gate.

## Local acceptance

Reproducible command: **`bun run verify:phase-1.5c5`**. The gate includes all project typechecks, domain boundary, lint, unit tests, build, unchanged asset/link/SEO/CSP checks, the MNA benchmark, Bun/workerd parity, real local Worker/D1/session simulator checks and focused Chromium regression suites. **Final local results (2026-10-04):** the complete command passed end to end, including 2,000 unit passes, 626 direct domain parity cases, 10 real local Worker/D1/session simulator groups, 49 focused Chromium regression cases, the bounded MNA benchmark (small circuits sub-2 ms median; dense 200–256-component cases 50–72 ms medians against the legacy main-thread fallback budget, unchanged and still open) and the existing asset/link/SEO/CSP budgets. No unit expectation remains xfail.

The initial browser run found two fixture-navigation issues: refit the canvas after opening the inspector before selecting another component, and open the simulation tab after keyboard-selecting a wire. Existing DC and delayed-response tests were updated from legacy-unassessed expectations to independent current/power assertions; the unavailable-readout check now targets its output element. Electrical tolerances were retained. The initial build exceeded the unchanged 250,000 B gzip JavaScript ceiling; conditional loading of the optional fault/history panels addresses that limit.

The built application was also checked at `http://127.0.0.1:8788/app/` with desktop 1440 × 1000 and phone 390 × 844 viewports. A guest series circuit ran the emitted `/app/assets/sim.worker-*.js` worker and displayed **0.9828 A**, **5.8968 V** and **5.7954 W** per 6 Ω load, including 0.21 Ω total lead resistance. Both layouts were visually inspected; the phone readings fit within its viewport, there were no page errors and no remote requests. Screenshots and the result record remain in ignored `.wrangler/phase15c5-built-evidence/`; the temporary static preview was stopped afterward. This built-assets check does not substitute for the separate real local Hono/D1/session gate.

The dense MNA main-thread fallback target and dense 60 fps rendering target remain open. This phase gate does not close the broader `verify`, the three stress suites, timed/three-phase models, full lab migration or all of Phase 1. No remote testing, deployment, credential restoration or Cloudflare account/resource operation is authorized by these results.

## Next step

**1.5D — time, controls and protection:** declared coil/timer/dimmer behavior, deterministic step/reset/replay, actual branch-aware protective operation, and coherent event/post-event values. Effects remain after 1.5D–F.
