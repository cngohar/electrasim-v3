# Phase 1.5E.2 — Declared motor, contactor and sensed-pole readings

Date: 2026-10-06. Status: **complete locally within the declared E.2 scope**.
`bun run verify:phase-1.5e2` passed end to end on the final implementation.

## Scope

`motor-3phase` accepts an explicit version-1 `state.motorModel` with
`kind: balanced-resistive`, nominal RMS L-L voltage, electrical input power,
frequency, L-L operating range, permitted voltage-unbalance ratio and required
ABC/ACB sequence. It stamps a unity-PF balanced delta equivalent with
`R_delta = 3 V_LL² / P_input`. Mechanical nameplate power never becomes a
resistance or electrical input by inference. Undeclared motors remain guarded.
The inspector requires the declared values and preserves running/exercise locks,
Undo/Redo and portable persistence; settings are copied and validated at shared
domain/file/store/API boundaries.

`phasor.motors` reports separate teaching states (`running`, `stopped`, `blocked`),
actual U/V/W line currents, L-L voltages, equivalent active input, connected
source-phase identities, terminal sequence, frequency and voltage unbalance.
Conductive paths exclude sources, load equations and backfed winding voltage.
Three distinct phases from one active system are required. Cyclic permutations
preserve sequence; swapping two leads reverses it. Phase loss, one live,
repeated phases, wrong sequence/frequency or out-of-band/unbalanced voltage
cannot energize the motor animation. Diagnostics identify the failed condition.

The three-pole contactor appends isolated A1/A2 at indices 6/7. Existing saved
power indices 0–5 and their anchors are unchanged. Explicit AC coil settings
drive actual RMS terminal-pair voltage, consumption, pickup/dropout hysteresis
and on/off delays, including L-N and L-L control circuits. The phasor control
step shares the original configuration identity, state validator, microsecond
clock and event/solve bounds with the scalar engine. It re-solves at each event
and returns post-event motor/pole/coil readings. Saved/manual `on` does not
override automatic coil state. Omit transient state to reset the clock;
settings and faults remain in the drawing. Obsolete/malformed state and invalid
steps return HTTP 400 through the existing local simulation endpoint.

`phasor.deviceCurrents` contains complex signed sensed-pole currents, maximum
pole RMS current, declared contact capacity and residual mA from the vector
sum. Neutral cancellation, independent coil consumption and external returns
are separate. Poles in independent reference domains retain their RMS readings
but report the residual unavailable, since their relative phase is undefined.
A declared protective bypass routes current outside the sensed
contacts, so the bypassed device reports zero sensed current without hiding
the load current. These readings do not operate a protective device.

Shared model/capability version is **1.5e.2.1**. The new coil runtime reports
**mna-phasor-controls-1**; static phasors remain **mna-phasor-resistive-1** and
scalar control **mna-controls-4**. Contract 1 and portable file schema 2 are
unchanged. Application, actual Comlink and local Hono use the same runtime;
scalar `electrical`, guessed `componentCalculations` and thermal state are absent.
The application fault handler recognizes phasor results separately from legacy
observations: a runtime lost phase keeps the deterministic run active, blocks
the motor and never invents a legacy trip or repair verdict.

## Boundaries

This is an explicit unity-PF teaching equivalent. Reactive impedance, induction
motor slip/efficiency, shaft speed/torque, inrush, stall, phase-loss heating and
actual unbalanced motor behavior are unassessed. Readings outside the declared
operating conditions describe only the passive equivalent, and teaching operation
is blocked. There is no automatic phase-loss relay or inferred destruction.
Timed phasor protection/damage, timers/dimming, transformer coupling, DC/mixed
waveforms and independent joined-source synchronization remain guarded or
explicitly unassessed. Whole-circuit operation/repair/standards assessment remains
unassessed and `faultsCleared` stays false. Membership changes access, never
electrical results; existing paid motor/contactors require the same entitlement.

[ADR 0015](../decisions/0015-three-phase-motor-controls.md) defines these choices.
**E.3** still owns DOL guide migration and the complete three-phase acceptance;
**1.5F** owns full lab/instrument/export/scoring migration and legacy retirement.
Dense solver/rendering targets remain open. Development and tests stay local
under root `AGENTS.md`, with no remote operations or deployment.

## Local acceptance

Gate: `bun run verify:phase-1.5e2`. It includes all project types/lint/unit tests,
Vite/Astro/postbuild, existing asset/link/SEO/CSP checks and MNA benchmark,
exact Bun/workerd parity, real local Worker/D1/session/membership/persistence
groups and Chromium motor/source/scalar-runtime/damage/editing/relay regressions.
Logs and screenshots are retained under ignored `.wrangler/phase15e2-*`.

Independent fixtures assert balanced delta-to-star analytical current, L-L drop,
active power and conductor loss; blocked operation; terminal lead permutations;
explicit model validation and copying; precise delay boundaries and partitioned
replay; actual L-L coil voltage; L2 signed live/neutral cancellation; external
return/bypass currents; and unstable/over-limit feedback without stale readings.
The independent-pole fixture retains RMS currents from separate 50/60 Hz source
references and withholds the undefined residual. Runtime fixtures exercise the
same result through direct domain, actual Comlink and local Hono without numeric
rounding or membership-dependent electrical behavior.

The final local gate records:

- All project typechecks and the **150-module pure domain boundary**; repository
  lint passed across **761 files**.
- **134 Vitest files / 2,175 tests passed**, including analytical motor and
  sensed-current expectations, exact control timing, malformed-state guards,
  editing/persistence and the application phase-loss regression.
- Vite/Astro/postbuild and unchanged asset budgets: initial JavaScript
  **251,529 B gzip / 300,000 B**, initial CSS **26,165 B / 30,000 B**.
  Internal links passed for **193 HTML files**, SEO for **191 pages**, and CSP
  source/build consistency passed.
- **776 exact Bun/workerd cases** passed, without rounding or tolerant parity.
  Evidence: `.wrangler/domain-tests-Fd3hO1/`.
- **17 actual local Worker/D1/cookie groups** passed. The new group checks
  domain/API replay, paid access (401/403), bad state/delta (400), full normalized
  D1 round-trip and absence of transient state in saved circuits.
  Evidence: `.wrangler/membership-tests-zfln8k/`.
- **33 Chromium cases in seven files passed** in 3.6 minutes. All five new
  motor cases verify explicit settings/Undo/Redo/IndexedDB restore, real Comlink
  contactor pickup/dropout and artwork, runtime phase loss/recovery, phone
  sequence/locks and exact domain/Comlink/Hono replay across all ten fixtures.
  Existing source, scalar MNA, damage/repair, supply/editing and relay cases
  remain green.

Existing MNA benchmark assertions passed. Median/p95: series **0.96 / 1.55 ms**,
isolated transformer **0.75 / 1.07 ms**, cascade **0.76 / 1.31 ms**. Dense
200–256-component fixtures measured **46.20–66.28 ms median / 56.80–92.64 ms p95**;
the dense solver and 60 fps rendering targets remain open, with no budget changed.

The preceding aggregate run passed all checks through local Worker/D1 and 31
browser cases, then failed two existing browser assertions that still expected
the E.1 model version. Both now assert the shared `ELECTRICAL_MODEL_VERSION`;
their numerical assertions and deadlines are unchanged. Final evidence is
retained in `.wrangler/phase15e2-final-gate.log`; the earlier run is
`.wrangler/phase15e2-gate.log`.

Inspected the desktop contactor and **390 × 844** phone motor screenshots at
`.wrangler/phase15e2-{contactor-desktop,motor-phone}.png`. They show final coil/pole
readings, blocked reversed-sequence operation and shared running locks in
scrollable properties. No dependency, lockfile or database migration changed.
No Cloudflare account, credential, live-site test, deployment or Git push occurred.
