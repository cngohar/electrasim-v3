# Phase 1.5D — Explicit time and protection

**Date:** 2026-10-04  
**Status:** 1.5D.1 implemented locally; the 1.5D.2 domain slice is implemented locally and the broader 1.5D acceptance gate remains open.

## Scope

This slice adds the state machine that sits around the accepted 1.5C linear solve. The MNA solver remains a pure steady-state calculation. `packages/domain/src/simulation/timed.ts` owns elapsed time, controls, protection exposure, events and replay state; it never edits a saved `Circuit`.

The public domain entry points are:

- `createSimulationState(circuit)` — creates a serialisable, deterministic state snapshot.
- `stepSimulation(circuit, state, deltaSeconds, options)` — advances one explicit interval.
- `simulateTimed(circuit, options)` — convenience form for an initial state or supplied snapshot.
- `resetSimulationState(circuit)` — clears transient trips, cable exposure and cable openings without changing saved component ratings/faults.
- `replaySimulation(circuit, steps, options)` — replays fixed deltas and returns all states/results/events.

## Implemented behavior

- Scheduled, countdown, staircase, delay and manual contacts are driven by explicit transitions or input events. No control infers history from wall-clock time.
- Dimmer commands are bounded to `0..1`. A requested level uses an explicit finite series-resistance teaching model; zero opens the contact. This is not a phase-angle, harmonic or product-certification model.
- Existing coil terminals are resolved from independent live and neutral rail paths without copying the derived state into `Component.state.on`. Relay feedback that does not settle is reported and leaves controlled contacts open.
- MCB/RCBO overcurrent uses the existing IEC 60898-1 curve functions and accumulated exposure. RCCB/RCBO/AFDD residual operation uses the existing IEC 61008-1 timing model and respects residual type B smooth-DC detection. AFDD arc operation is separate. Fuses are destructive links; ordinary breakers become resettable `tripped` state and are never marked blown by normal clearing. Isolation-only devices do not trip automatically.
- Protection candidates are restricted to the connected fault network. Pole currents come from `ElectricalSimulationResult.deviceCurrents`; no shared-canvas current is substituted.
- Severe cable exposure accumulates a bounded, declared I²t-like teaching value. A cable-damage event opens the wire in the next solve and emits `cable-damaged`; a capacity warning alone does not melt a cable.
- Every protection or cable event triggers a second solve. The returned electrical values therefore represent the post-event circuit, while `trippedComponents`, `wireMeltEvents` and the deterministic event stream retain the pre-event cause and timing.
- `CompileOptions` now accepts transient contacts, protection states, dimmer levels and opened wires. These values are never persisted and all timed state is included in replay snapshots.
- Fault Lab repair commands require an explicit serialisable `surface: 'fault-lab'` operation scope. Resetting a tripped breaker, replacing a blown fuse link and repairing a damaged cable are separate operations; active faults in the target network block all three. The engine validates the scope and physics, while the application/server adapter remains responsible for authenticating the caller and issuing the scope.
- Coil pickup/dropout delays are applied only when explicitly declared per coil. The state records signed continuous energized/de-energized time, so coarse steps cannot silently claim instantaneous relay operation. Protection coordination compares declared clearing curves, operates the earliest candidate, re-solves, and reports manufacturer selectivity as unassessed rather than inventing coordination data.
- The canonical timed suite now covers authorization/replacement semantics, delayed coil pickup/dropout, fastest-curve coordination and post-event upstream re-solving in addition to the 1.5D.1 fixtures.

## Version and boundaries

- Timed state model: `1.5d.2.0`.
- Numerical electrical contract and MNA engine remain unchanged at contract `1`, engine `mna-linear-2`, model `1.5c.5.1`.
- The timed slice does not claim full waveform/phase-angle dimming, thermal product certification, selectivity/coordination, prospective fault current, three-phase behavior or effects.
- Fault Lab/Diagnosis Lab/Ohmageddon consumers, Comlink/browser wiring and legacy retirement remain 1.5F work. The app still uses the static `simulate()` entry point until those consumers are migrated.

## Local evidence

- `bun run typecheck` passed, including the domain boundary and all configured TypeScript projects.
- `bun run lint` passed; Biome check passed for all changed domain files after formatting.
- The focused domain/core run passed 15 files / 521 tests, including the timed, MNA and protection regressions.
- `bun run test` passed 125 files / 2,013 tests.
- The canonical timed suite exercises MCB clearing, RCCB residual clearing, fuse replacement authorization, scheduled contacts, delayed relay pickup/dropout, dimmer response, replay determinism, cable opening and fastest-curve coordination. No browser, remote Worker, deployment or three-phase acceptance is claimed.

## Remaining 1.5D work

The domain slice of 1.5D.2 is implemented locally. Remaining work is to issue the authorization scope only from authenticated Fault Lab adapters, add equivalent Comlink/local-Hono transport fixtures, and complete the cross-runtime acceptance gate. Three-phase models, effects, full Diagnosis Lab/Ohmageddon migration and legacy retirement remain later phases; this record does not claim them supported.
