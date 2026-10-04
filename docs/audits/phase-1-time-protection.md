# Phase 1.5D.1 — Explicit time and protection foundation

**Date:** 2026-10-04  
**Status:** Implemented locally; the broader 1.5D acceptance gate remains open.

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

## Version and boundaries

- Timed state model: `1.5d.1.0`.
- Numerical electrical contract and MNA engine remain unchanged at contract `1`, engine `mna-linear-2`, model `1.5c.5.1`.
- The timed slice does not claim full waveform/phase-angle dimming, thermal product certification, selectivity/coordination, prospective fault current, three-phase behavior or effects.
- Fault Lab/Diagnosis Lab/Ohmageddon consumers, Comlink/browser wiring and legacy retirement remain 1.5F work. The app still uses the static `simulate()` entry point until those consumers are migrated.

## Local evidence

- `npx --yes -p typescript@5.8.2 tsc --noEmit -p packages/domain/tsconfig.json` passed in this sandbox.
- Biome check passed for all changed domain files after formatting.
- Direct local TypeScript probes exercised timed MCB clearing, RCCB residual clearing, fuse opening, scheduled contacts, relay coil pickup, dimmer response, replay determinism and cable opening. The repository's canonical Bun/Vitest phase gate remains to be run in the normal Bun development environment.

## Next

Complete 1.5D.2 with explicit Fault Lab repair/reset authorization, stronger coil pickup/dropout timing and protection coordination/damage fixtures, then route the state/event contract through Comlink/local Hono before 1.5F legacy retirement.
