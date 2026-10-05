# Phase 1.5D.0 — deterministic time and declared coil controls

Updated 2026-10-05. **Complete locally within the scope below.** This is the first slice of **1.5D**, following the [1.5C.5 runtime gate](phase-1-mna-runtime.md); it does not close the protection/damage milestone.

## Model and runtime

[ADR 0010](../decisions/0010-deterministic-control-steps.md) introduces explicit `state.coilModel` version 1 for the existing relay families, single-pole contactor and isolated delay timer. The inspector requires the user to supply nominal voltage and real power; waveform, hysteresis ratios and delays are visible settings. Contact ratings never fill missing coil ratings. Existing documents do not acquire an assumed coil model.

The supported law is a resistive equivalent `R = Vnom² / Pnom`, driven by actual MNA coil terminal voltage. Pickup and dropout use separate thresholds; on/off delays count continuous qualifying excitation. Interrupted pickup cancels, re-excitation starts the full delay, and both poles of a changeover remain exclusive. A 12 V DC coil can switch a separately referenced 230 V AC circuit. Configured AC models retain their declared frequency. Unsupported waveform/frequency combinations do not fall back to legacy switching.

`simulate(circuit, { simulationState, deltaSeconds })` exposes the same pure step through direct domain, Comlink and `POST /api/simulator/simulate`. Omitting state resets to time zero. Time uses one-microsecond resolution, with a 3600-second maximum step and bounded elapsed time/events/settling. Inputs apply at the start of the requested interval. Simultaneous events have canonical ordering, the circuit is re-solved after changes, and returned measurements describe the final topology; event fields preserve the pre-event coil readings. Zero-delay oscillation produces an unavailable result with a diagnostic.

State carries the electrical model version and a circuit configuration key. Changes to sources, coil settings or circuit structure require reset; manual switches and injected faults are step inputs. The domain validates state shape and bounds on every call. The local calculation endpoint rejects malformed state/deltas with HTTP 400 and performs its normal membership authorization. This is a calculation API, not a server-authoritative replay or scoring protocol; grading does not accept caller-supplied simulation state.

The app advances explicit 100 ms steps while running, without overlapping accepted worker requests. An obsolete reply cannot advance the accepted clock or overwrite new switch inputs. A clock-only continuation uses the current run's authorization; changed inputs/access revisions and a new Run perform the existing fresh action check. Stop/Run resets the transient clock. Settings participate in undo/redo, import/export and IndexedDB recovery; derived contact states and timer progress do not enter the saved circuit.

The inspector separates coil readings from contact currents and displays simulated time, contact drive and pending transition deadlines. Applied settings lock while running or inside authored exercises. Coil events appear once in the console at their simulated event time.

Electrical contract remains 1; shared model and capability catalogue are `1.5d.0.1`; the control runtime reports `mna-controls-1`, while static MNA remains `mna-linear-2`. Circuit schemas remain 1/2 with a versioned optional coil field. Older engines reject the unknown field rather than silently interpreting it. The optional keyboard-shortcuts panel loads on demand to keep the initial-JavaScript budget unchanged.

## Coverage limits

Only explicitly configured coils enter this model. Unconfigured coils, unsupported loads and other timer families retain their coverage guards. A configured coil in an unsupported circuit cannot use qualitative legacy observations to fabricate timed measurements. Static `solveCircuit()` does not operate timed devices; callers use `simulate()` or supply an explicit contact snapshot.

Inductance, AC phase/reactance, inrush, rectification, contact bounce, energy storage, damage and manufacturer performance are unassessed. This is not a general relay transient model or protection certificate. Dimming and other timer behaviors remain **1.5D.1**; branch-aware protection/fuse/residual events remain **1.5D.2**; damage coverage and the complete Fault Lab reset/repair flow remain **1.5D.3**. Three-phase behavior remains **1.5E**, and full exercise migration/legacy retirement remain **1.5F**. Existing dense solver/rendering targets remain open.

## Local acceptance

Reproducible command: `bun run verify:phase-1.5d0`.

The required gate checks passed on 2026-10-05. Independent fixtures cover independent coil/load currents and conservation, exact delay boundaries, interrupted pickup, dropout, hysteresis with a switched resistive feeder, input-order/step-partition invariance, reset/replay, malformed/foreign state, persistence, waveform mismatch, unstable feedback, basic/Pro parity, stale worker replies and application clock reset. The command also includes real Chromium, local Worker/D1/session and Bun/workerd gates. No remote testing or deployment is authorized.

Results: **125 Vitest files / 2,020 passes**, all project typechecks, the 129-module domain boundary, repository lint, Vite/Astro/postbuild, all asset/link/SEO/CSP checks, **631 Bun/workerd parity cases**, **11 real local Worker/D1/cookie groups** and **52 Chromium regression cases**. The main command passed all earlier steps and 51 browser cases; its only failure was an existing browser assertion still expecting model `1.5c.5.1`. Updated that assertion to `1.5d.0.1` and reran the affected case successfully. Electrical readings were correct before the fixture correction. No application code changed after that gate run; the passing result is the main run plus this focused rerun, not a claim that the original process exited green.

Focused rerun: `bun x playwright test e2e/mna-runtime.spec.ts --project=chromium --workers=1 --grep 'running application and inspector'` — **1 passed**.

Initial JavaScript is **245,616 B gzip / 250,000 B**, CSS **26,165 B / 30,000 B**. Links checked 193 HTML files; SEO checked 191 pages. MNA medians were **1.09 ms** for two series loads, **0.88 ms** for the isolated transformer and **0.78 ms** for cascaded transformers. Dense 200–256-component cases measured **47.80–69.30 ms median**; the existing dense fallback/60 fps targets remain open and no budget was increased.

The built application was also checked at desktop **1440 × 1000** and phone **390 × 844** on `127.0.0.1:8801`. Coil settings and readings fit both viewports; the emitted Comlink worker displayed **0.0833 A / 11.9956 V / 0.9993 W** for the declared 12 V, 1 W coil including lead resistance. The keyboard-shortcuts dialog loaded and closed correctly, with no page errors or external requests. Four screenshots were visually inspected. This static-preview check stubbed only the guest membership response; the separate local Worker/D1/session gate above exercised real authorization. The preview and browser were stopped afterward.

Evidence remains in ignored `.wrangler/phase15d0-gate.log`, `.wrangler/phase15d0-version-regression.log`, `.wrangler/phase15d0-visual.log`, `.wrangler/phase15d0-built-evidence/`, `.wrangler/domain-tests-omO48Z/` and `.wrangler/membership-tests-l6NGGo/`. The local-only deployment, credentials and binding restrictions are unchanged.
