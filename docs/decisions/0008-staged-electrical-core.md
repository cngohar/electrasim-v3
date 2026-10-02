# ADR 0008 — Replace the electrical core through a versioned boundary

Date: 2026-09-30. Status: accepted for the Phase 1 rebuild; implementation begins with the 1.5A baseline/guards. Numerical core replacement remains 1.5B–1.5F.

Implementation update (2026-10-01): [1.5B contracts and graph](../audits/phase-1-electrical-contracts.md) implement the validation/defaults/compiler boundary with contract version 1 and model `1.5b.1`. Circuit schema 1 and the guarded legacy numerical runtime remain; new voltage/current solving starts in 1.5C. The linked record distinguishes compilation coverage from solved measurements and records the local acceptance gate.

Follow-up decision (2026-10-01): [ADR 0009](0009-mna-solver.md) resolves the “nodal/modified-nodal” choice below to **Modified Nodal Analysis (MNA)**. The [behavior plan](../plans/SIMULATOR_BEHAVIOR_PLAN.md) adds shared compatibility/readiness, confirmed supply edits and essential UI integration to 1.5C. Neither this follow-up nor the completed audit claims the replacement solver has shipped.

Implementation update (2026-10-02): [1.5C.0 supplies and preflight](../audits/phase-1-supply-preflight.md) passed local acceptance. Circuit/backup writers now use schema 2, reading schemas 1 and 2; contract version stays 1 and model version advances to `1.5c.0.1`. Persisted source profiles and shared capability/readiness services prepare the next MNA slice without replacing the guarded legacy numerical engine.

## Context

[The reconciled audit](../plans/SIMULATOR_CORE_REBUILD_PLAN.md) reproduced defects caused by the existing rail-continuity solver: loads terminate traversal, branch wires receive one total-current scalar, independent supplies share one voltage, transformer windings are not isolated and device state has no time history. Moving that solver to `packages/domain` did not remove those limitations.

The editor, canonical component/port IDs, circuit persistence, authorization, deterministic generators, SVG artwork and many small electrical helpers are useful foundations. Replacing the whole application would increase the migration surface without resolving the numerical model on its own.

## Decision

Build a replacement core inside the DOM-free domain package, with these explicit stages:

1. **Normalize and validate:** validate bounded documents and fault targets; resolve defaults and wire-property provenance once. Explicit saved values win over defaults. Keep an original recoverable document and report unsupported/invalid input rather than silently deleting it.
2. **Compile:** build a terminal graph with conductive nets and explicit device branches, independent source identities, AC/DC/frequency/phase metadata, winding isolation, neutral references and PE/bonding. A source alias is different from a second source. Actual connectivity must reveal miswiring even when terminal role labels disagree.
3. **Solve:** use nodal/modified-nodal equations for declared source/load models. Start with linear DC and single-phase AC teaching cases, then isolated ideal transformers and balanced three-phase RMS/phasor models. Solve real branch currents; preserve open-circuit voltage without inventing load current. Ideal loops or contradictory source constraints need an explicit diagnostic, not an arbitrary current split.
4. **Advance state:** explicit elapsed time, input events, contact state, coil state, timer state and protection accumulation. Re-solve after switching. Enforce bounded iteration and return a convergence/unsupported status for unsettled feedback.
5. **Report:** derive versioned measurements, events, state and teaching findings, with scope and coverage. Basic/Pro presentation, membership and Matter effects cannot change the electrical equations or suppress known hazards.

Keep the `simulate()` boundary as an adapter during migration. Do not require matching known-wrong legacy output. Accepted legacy behavior and independently calculated electrical fixtures are separate checks; every deliberate difference needs an audit ID or a documented model decision.

## Data and version policy

- Keep persisted `Circuit`, transient `SimulationState` and returned `SimulationResult` separate. No simulation pass mutates its input document.
- Preserve canonical component IDs and existing terminal indices. New persisted fields need a document version/migration; do not reinterpret saved ports by their label or current catalogue order.
- Distinguish source nominal voltage from load rated voltage and maximum voltage. A declared resistive load may derive R = Vnom²/Pnom; that conversion must never be assumed for every LED driver, motor or electronic appliance. Record approximation and valid operating range in its device model.
- Define an engine/model version independently of the document schema. Saved results, accepted diagnosis attempts and future shared/LMS assessments carry engine, exercise/generator and standards-profile versions. Preserve historical scores; do not silently regrade them under new physics. Add compatibility/migration behavior when the new result contract is integrated in 1.5F.
- The current 1.5A `modelLimitations` field is an additive result guard, not the completed future result schema. It does not alter document schema version 1 or require a D1 migration.
- Device operation and damage are different events: resettable breaker trip, replaceable fuse-link operation and modeled damage must not share one “blown” interpretation. A plain RCCB is residual protection; an isolator has no automatic trip. Cable ampacity never replaces a device's rating.
- Separate present measurements, prospective fault current, event current and post-clearing current. A current estimated using an assumed loop impedance must expose that assumption. Selectivity requires actual current paths and modeled curves/settings; nearest-device selection is insufficient.

## Interim coverage and migration

Phase 1.5A refuses electrical assessment for drawings containing the currently unsupported DC battery/PV, transformer or three-phase models. The whole electrical result is unavailable, including if an unsupported device is presently unwired; editing, backups, canonical IDs and access rules remain intact. This conservative boundary avoids pretending that independently isolated subnetworks have already been implemented. Per-domain partial results can replace it in 1.5C once isolation is verified.

Timer and dimmer components retain explicit **manual continuity only** behavior with visible limitations. No timing/dimming success is claimed. Numerical and time-state replacements remove these guards only after their independent fixtures pass. Unsupported model findings cannot become a successful validation score or be misreported as a short circuit.

The initial scope excludes semiconductor switching, harmonics, detailed motor transients and arbitrary unbalanced networks. Those require separate model decisions and fixtures. Manufacturer coordination and full national installation compliance remain unassessed where the required data is unavailable.

## Acceptance

- Analytical resistive-series/parallel, shared-feeder and independent-source fixtures; KCL/KVL and power balance. Set/document tolerances per model (start with 1e-6 relative / 1e-9 absolute for small linear reference cases), convergence criteria and supported parameter bounds before integration.
- Existing relay NO/NC/pole-isolation, basic/Pro equality, file validation and membership regressions remain mandatory.
- Direct domain, Comlink and local Hono outputs agree. Timed step/reset/replay sequences are deterministic. Input ordering does not select the circuit voltage.
- Correctness fixtures use declared assumptions and calculated expectations, not values copied from the legacy solver. The 1.5A suite uses `it.fails` for explicitly owned future cases; an unexpected pass fails the suite until that case is promoted to a normal regression. Passing those marked cases means the defect remains recorded, not fixed.
- Preserve the supported benchmark entry point and current budgets. Measure solver, serialization and rendering separately; a quiet 200-component/396-wire benchmark does not establish dense interactive 60 fps.
- Integrate template/diagnosis/export/restore contracts and remove the legacy runtime only after 1.5F. Keep all verification local.

## Local verification and future CI

`bun run verify:phase-1.5a` runs the phase's local check/build/assets/benchmark/browser sequence. `bun run verify` remains the wider project gate; Phase 1.5A passing does not imply the full rebuild is complete.

Do not create an automatically running hosted workflow under the current local-only rule. The runner provides a reproducible command contract that a future authorized CI environment can reuse with the pinned Bun version, frozen lockfile and matching Playwright browser. Dependency-advisory freshness is a separate requirement: registry lookup failure is not a clean security audit.

No deployment, Cloudflare account/resource operation or credential restoration is authorized. Future remote work requires the new user-supplied account and explicit operation authorization under root `AGENTS.md`.
