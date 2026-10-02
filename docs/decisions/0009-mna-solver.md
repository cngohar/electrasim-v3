# ADR 0009 — Use Modified Nodal Analysis for the replacement solver

Date: 2026-10-01. Status: selected for implementation in **1.5C–1.5F**; the bounded linear slice shipped locally in [1.5C.1](../audits/phase-1-mna-solver.md), and operating points/wire-property corrections in [1.5C.2](../audits/phase-1-load-response.md). Transformer/PE equations are next in 1.5C.3. This does not claim the full solver or app runtime integration has shipped.

## Context

[ADR 0008](0008-staged-electrical-core.md) requires replacing the legacy rail-continuity calculations, but leaves the formulation as “nodal/modified-nodal.” The [current behavior review](../audits/phase-1-behavior-review.md) confirms that the running simulator still assigns fixed nameplate power to loads at arbitrary voltage, shares current across unrelated branches and shares voltage across independent supplies. Phase 1.5B compiled the necessary graph; it did not implement the replacement numerical solve.

The agreed scope includes independent voltage sources, resistive branches, isolated transformers, switched contacts and later balanced three-phase teaching models. A plain conductance-only nodal formulation would need additional treatment for ideal voltage constraints. MNA incorporates these constraints explicitly.

## Decision

Use **Modified Nodal Analysis (MNA)** inside `packages/domain/src/core` as the numerical foundation. This resolves the formulation choice in ADR 0008 and the rebuild plan. Graph traversal remains useful for connectivity, islands, readiness and diagnostic paths; it does not calculate load or wire current by copying a circuit-wide total.

The unknowns include node voltages and the additional branch currents required by ideal voltage sources and transformer constraints. Assemble Kirchhoff current equations and the declared device/source constraints, solve them together, then derive each branch's current, voltage difference and power. Passive resistive networks are a simple subset of the same formulation.

| Stage | Numerical scope |
|---|---|
| **1.5C** | Linear DC and supported single-phase steady-state models; independent sources, finite wire resistance, actual load voltage/current/power and ideal isolated AC transformer constraints. |
| **1.5D** | Device state, coil thresholds, timers, declared dimming approximations and protection advance outside the algebraic solve. Re-stamp and re-solve MNA when contacts or device states change. No claim of detailed switching waveforms. |
| **1.5E** | Extend the same formulation to the declared balanced three-phase RMS/phasor model. Distinguish line-to-neutral from line-to-line voltage and phase sequence. |
| **1.5F** | Complete migration of browser/Comlink/local Hono consumers, diagnostics, templates, exercises and exports; retire the legacy numerical runtime. |

## Numerical and modeling rules

- Keep supply identity, AC/DC, frequency and phase explicit. A low voltage is not automatically DC; a 400 V scalar is not a three-phase source. Unsynchronized or different-frequency sources joined into an unsupported network cannot be treated as one supply.
- Choose a mathematical reference for each independent floating domain without creating a physical PE, neutral or DC-negative bond. Transformer-coupled domains retain galvanic separation while their equations exchange power.
- Stamp each finite wire once using its resolved material, cross-section, physical length and stated temperature assumption. The existing two-conductor, 70 °C design voltage-drop table is not the resistance of each individual conductor at 20 °C.
- A fixed-resistance model uses its own nominal rating: `R = Vnom² / Pnom`, `I = Vterminal / R`, `P = Vterminal² / R`. Changing the supply never changes that device rating. LED drivers, motors and electronic appliances require separately declared operating laws and ranges.
- Model nameplate ratings, operating ranges, current limits, cable ampacity and damage thresholds separately. MNA does not establish any of these ratings or invent a thermal failure law.
- Detect contradictory voltage-source constraints, singular/ill-conditioned systems and nonconvergence. Redundant ideal paths with indeterminate individual currents must be reported as such or require declared impedance; do not invent an equal current split.
- Do not secretly ground floating nodes or introduce large/small substitute resistances to make a failing network appear valid. If a numerical aid is eventually required, document and bound its effect independently of the physical model.
- Open circuits can have terminal voltage and zero branch current. No-load, disconnected, invalid and unsupported states are distinct from a successfully operating load and from a standards-compliance verdict.
- An ideal source plus explicitly modeled finite impedance may yield a teaching estimate of short-circuit current. It is not an installation prospective-fault-current assessment without the necessary source/loop data. Missing impedance must never become an unexplained fixed fault current.
- Freeze supported ranges, residual checks and tolerances before accepting results. Begin with ADR 0008's small linear reference tolerances (1e-6 relative / 1e-9 absolute, applied per physical quantity); investigate conditioning failures rather than loosening assertions until they pass.
- Use a reviewed factorization with pivoting and residual checks. Dense versus sparse storage, factorization reuse and any library choice can be decided from the first measured vertical slice; the MNA formulation itself is decided now. Do not invert matrices explicitly or optimize against incorrect legacy output.

## Acceptance and limits

Independent analytical fixtures cover series/parallel networks, shared feeders, floating and independent supplies, wire losses, ideal transformer ratios/power balance and intentional invalid constraints. Verify KCL, KVL, source/load/loss power balance and input-order invariance. Later device tests add deterministic step/reset/replay and protection coordination.

The [behavior plan](../plans/SIMULATOR_BEHAVIOR_PLAN.md) adds supply-change confirmation, catalogue compatibility, run readiness and truthful UI/exercise feedback. These are required alongside the solve: selecting MNA alone does not fix missing ratings, invalid substitutions, misleading warning text or stale results.

Detailed semiconductor switching, harmonics, arbitrary unbalanced networks and motor transients remain outside the accepted increment. Unknown models receive explicit coverage; they cannot earn a normal-operation, repair-success or compliance pass.

Retain SVG, persistence, canonical saved IDs, access enforcement and the domain boundary. All development and verification remain local under root `AGENTS.md`; this decision authorizes no deployment or remote account operation.

## Implementation contract established in 1.5C.0

The persisted boundary is circuit-file schema **2**, with a version-1 `SupplyProfile` on the document and on independent source instances. Schema-1 imports migrate without changing component IDs, saved port indices, faults or explicit load ratings. The named document supply retains the `legacy-mains` identity; independent source identities derive from their canonical component IDs. AC voltage means RMS line-to-neutral, including the reserved three-phase profile. A separate field conversion is required for a future line-to-line editor. Provenance distinguishes explicit settings, legacy instance/document values, catalogue settings and the old 50 Hz assumption.

`resolveDeviceCapabilities` inventories every catalogue variant and separates terminal groups, source controls, nameplate values, maximum ratings, frequency, operating range and load law. `assessTerminalCompatibility` accepts a particular group's solved terminal-voltage magnitude when available. A nominal source comparison is explicitly provisional and is suppressed for an unsolved series/mixed path. Missing ratings remain structured unknowns. `assessCircuitReadiness` reports topology, compatibility and coverage separately from calculation, operation and standards assessment; it performs no numerical solve.

The next implementation slice is deliberately bounded as follows:

1. **Prepare equations:** consume the validated, normalized compiler output; use its canonical terminal/net ordering and one-conductor wire resistances. Keep each source profile and independent reference. Reject an unknown connected load law instead of dropping that branch or substituting a large/small resistance. Identify transformer coupling groups separately from galvanic domains when 1.5C.3 is implemented.
2. **Index unknowns:** assign a voltage unknown to each nonreference net, then signed ideal-source current unknowns in canonical source-ID order. Select one deterministic mathematical gauge in each independent domain. Record the reference in results so voltages in different floating domains cannot be compared as if they shared earth. Referencing a node adds no physical bond or current path.
3. **Stamp MNA:** each resistor or finite wire contributes `+g` diagonals and `-g` off-diagonals. A voltage source from its positive to negative terminal contributes its incidence column/row and the `Vpositive - Vnegative = Vs` constraint. Positive branch current flows from the compiled branch's `from` terminal to `to`; passive power is `Vdrop * I`, including signed source delivery. Closed ideal contacts are already collapsed into nets; open branches are unstamped and carry zero current, without erasing any determinable open-circuit voltage.
4. **Solve and verify:** begin with a small, bounded dense linear-system implementation using scaled partial pivoting and residual checks, without a runtime dependency or explicit inverse. Make the size/memory bound explicit before allocation; larger systems must receive an unavailable result until another implementation is accepted. Benchmark the first vertical slice before deciding on sparse storage, factorization reuse or an external numerical library. Singular, redundant and contradictory constraints must return distinct diagnostics; indeterminate ideal-source currents cannot become an invented equal split.
5. **Derive results:** calculate terminal-pair voltages, branch currents and `I²R` wire loss from the same solution. Check equation residuals, KCL and total signed source/load/wire power using ADR 0008's `1e-6` relative / `1e-9` absolute tolerances per physical quantity. Keep invalid topology, unsupported models, nonconvergence and valid no-load measurements distinct. No trip, damage, repair or standards verdict is inferred from algebraic convergence.
6. **Accept independently:** assert the two 6 Ω series elements at 12 V, unequal parallel branches, a shared feeder with declared resistance, independent floating sources, a dangling live end, a zero-current balanced branch and conflicting/redundant sources. Calculate expectations analytically with the fixture's actual wire resistance, and permute component/wire order. Add transformer energy/isolation assertions in 1.5C.3. Do not use the guarded legacy runtime as the numerical oracle.

During 1.5C.0 the browser still uses the guarded legacy numerical engine. Persistence and source labels preserve the new profiles, while DC, reserved three-phase and mixed/conflicting source profiles cannot obtain legacy measurements. This does not close the MNA, complete readiness UI, confirmation/impact/Undo workflow, capability-based palette/inspector or exercise-operating-point gates in 1.5C.1–5 and 1.5F.
