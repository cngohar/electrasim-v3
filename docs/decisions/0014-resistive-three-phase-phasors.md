# ADR 0014 — Resistive three-phase phasor foundation

Date: 2026-10-06. Status: implemented in **1.5E.0**; local acceptance is recorded in [the phasor audit](../audits/phase-1-phasor-foundation.md). Source catalogue/UI, motor models and application phasor consumers remain later 1.5E slices.

## Decision

Extend the source contract with explicit `phasePorts: [L1, L2, L3]`, with `ports: [L1, N]`. Validate four distinct canonical terminals and their live/neutral roles. A declared three-phase source compiles three voltage constraints with one component-derived `phaseSystemId`, explicit phase IDs and saved `abc`/`acb` sequence. Sequence `abc` uses 0°, −120°, +120°; `acb` reverses the latter two angles. The persisted voltage convention stays RMS **L-N**, so a 230 V profile produces √3 × 230 V L-L. No two-terminal source or document alias acquires extra terminals implicitly.

Expose a separate `solvePhasorCircuit()` API returning complex RMS voltages/currents as `{ real, imaginary }`. It reuses the bounded resistive MNA equations for the real and imaginary excitation vectors. The matrix has real conductances, so two real solves are algebraically equivalent to one complex solve. Both projections preserve identical incidence, ordering and mathematical references. The projected signed/zero RHS values are internal equations, never persisted DC configurations or user-facing measurements.

The initial implementation uses two factorizations under the existing bounds (512 unknowns per driven group, 2,048 total and the existing cubic work limit per projection). It does not claim a sparse solver, factorization reuse or improved dense performance. Reactive impedance requires a future complex matrix extension; it cannot be represented by a resistor or a motor nameplate.

Compute branch active power as `Re(V × conjugate(I))` and conductor loss as `|I|²R`. Verify complex KCL, source KVL and real power in each independent galvanic domain, in addition to both projections' accepted residual checks. Keep the existing 1e-6 relative / 1e-9 absolute tolerances. A failed projection or conservation check returns no measurements. Neutral current is the vector sum of the phase currents, never the sum of their RMS magnitudes.

For runtime reproducibility, compute magnitude with an explicit scaled square-root norm and wire loss directly from `(real² + imaginary²) R`. Bun and workerd produced last-bit differences with `Math.hypot`; exact serialized parity remains required. Numerical measurements are not rounded to make the comparison pass. User-facing capacity-warning text uses six significant digits.

Retain the original shared readiness/earthing diagnostics in the complex result. Compare cable capacity against the combined RMS current magnitude; a projection's real or imaginary current alone cannot determine that rating exceedance. Protection/damage coverage stays unassessed in this static API even when a caller supplies a previously opened contact snapshot.

Conductive L-L paths between distinct phases of the same source are readiness shorts. Ideal-source contradiction checks compare both complex axes. Finite conductor resistance permits a declared-network inter-phase current estimate, while a contradictory zero-impedance connection remains invalid. Independent source systems have no declared relative synchronization; joining them is unsupported even at equal voltage/frequency. Different-frequency sources in one domain are unsupported. Independent domains retain separate gauges and cannot produce cross-reference voltage readings. PE remains a separate conductor unless explicitly wired.

## Scope and migration

The E.0 API supports resistive star/delta and static contact networks, including unbalanced resistive stars and floating star points. This is not an induction-motor, phase-loss protection, transient, reactive-power, thermal or installation-compliance model. Unsupported loads, transformer coupling, timed coils/timers/dimmers and DC remain guarded. Static protection contacts never imply automatic clearing or damage.

`PhasorSimulationResult` is deliberately separate from the scalar `ElectricalSimulationResult`. It always leaves operation/repair/standards assessment unassessed. `solveCircuit()` and the existing application/timed consumers explicitly reject compiled phase systems; RMS magnitudes cannot be substituted into signed-current residual/protection logic. The five-terminal source definitions in the acceptance fixtures are test overrides; they are not a newly placed catalogue component or a portable saved-circuit migration.

Shared model/capability version becomes **1.5e.0.1**. Electrical contract 1, circuit-file schema 2 and the existing scalar/control engines stay at their current versions. Old transient simulation state is invalidated through the existing model-version boundary. The standalone phasor engine reports **mna-phasor-resistive-1**.

Next slices must add a real source catalogue entry and its artwork/placement/persistence/confirmed editing; declared motor and contactor operating models; phasor-aware branch/pole/residual consumers; and actual app/Comlink/local-Hono/browser acceptance. N27 and the DOL guide remain open until a single connected live cannot produce successful motor operation. All gates remain local under root `AGENTS.md`.

## E.1 application boundary — 2026-10-06

The real `ac-three-phase-supply` catalogue component now declares canonical L1/L2/L3/N/PE ports and a separately persisted source profile. Existing L/N source geometry is unchanged. Named source edits confirm L-N/L-L voltage, frequency and ABC/ACB sequence through the shared editor transaction. The application, Comlink and existing local Hono simulation endpoint dispatch explicit phase systems to the complex result and return named display readings in `phasorComponents`. Scalar `electrical` and `componentCalculations` fields, timed state/protection and thermal measurements are absent; RMS magnitudes never become signed scalar currents. `faultsCleared` stays false. Independent AC domains retain separate references; joined systems and unknown motor/timed/reactive/transformer/DC cases remain guarded. Shared model/capability version becomes **1.5e.1.1**; engine/contract/file versions are unchanged. [E.1 scope and local acceptance](../audits/phase-1-three-phase-source.md) supersedes the E.0 application/source deferral above. Motor/contactors and DOL/full acceptance remain E.2–3, followed by complete lab/instrument/export/scoring migration in 1.5F.

## E.2 motor/control boundary — 2026-10-06

[ADR 0015](0015-three-phase-motor-controls.md) extends the existing real-conductance
solver with an explicit unity-PF motor equivalent, three-conductive-phase operating
guards, appended isolated contactor coil terminals, deterministic phasor coil
controls and signed complex sensed-pole/residual readings. It supersedes the
motor/coil deferral for those declared models; reactive/transient motor behavior,
automatic phasor protection/damage, DOL migration and complete lab/scoring
integration remain outside this slice. [E.2 acceptance](../audits/phase-1-three-phase-motor.md)
records the local evidence. Shared model/capability version is **1.5e.2.1**;
static engine/contract/file versions are unchanged, with separate timed engine
**mna-phasor-controls-1**.
