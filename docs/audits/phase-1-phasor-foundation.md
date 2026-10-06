# Phase 1.5E.0 — Three-phase phasor foundation

Updated: 2026-10-06. Status: **complete locally within the numerical E.0 scope**. This is the first numerical slice of 1.5E. The complete three-phase phase, source catalogue/UI, motor model and application migration remain open.

## Implemented scope

- Explicit L1/L2/L3/N source contracts and validation, source/phase identity, `abc`/`acb` sequence and RMS L-N voltage convention. Legacy two-terminal sources/aliases remain guarded.
- Separate `solvePhasorCircuit()` API with complex RMS terminal/branch voltage and current, active power, finite conductor losses, independent mathematical references and conservation checks. Shared readiness/earthing findings and RMS cable-capacity warnings remain visible. [ADR 0014](../decisions/0014-resistive-three-phase-phasors.md) records the equations and migration boundary.
- Balanced/unbalanced resistive star, connected/floating star point, delta, open phase and finite-impedance L-L fault fixtures with analytical expectations. Shared readiness detects inter-phase conductor shorts; ideal constraints check both complex axes.
- Unknown motor/reactive/transformer/timed models, joined unsynchronized source systems, mixed frequencies and DC are unavailable through this entry. Numerical convergence does not award operation, repair or standards success. Existing scalar/app consumers cannot consume these complex measurements yet.
- Shared model/capability version **1.5e.0.1**, phasor engine **mna-phasor-resistive-1**. No dependency, file schema, D1 migration or deployed endpoint changed.

The source's five-port definition is a test override. It proves the compiler/equations without altering the saved terminals of the existing AC block. Catalogue/persistence/artwork and app integration are required next in E.1–3; this gate does not close N27 or enable the DOL guide.

## Independent expectations

All leads declare copper at 20 C, 10 m and 2.5 mm², hence 0.07 Ω each. The 230 V source phases are `230 + j0`, `−115 − j115√3`, `−115 + j115√3` for `abc`. L-L magnitude is 230√3 V.

Balanced 23 Ω star arms each draw `230 / (23 + 0.14)` A; vector neutral current is zero. For arbitrary star-arm resistances `Ri`, define `Gi = 1 / (Ri + 0.14)`. The star-point voltage is `Σ(Gi Ei) / (ΣGi + Gn)`, where `Gn = 1 / 0.07` for the connected neutral and zero for a floating star. Arm currents are `(Ei − Vstar) Gi`. The unbalanced fixtures use 23/46/92 Ω and compare both current axes and the actual star displacement.

Balanced 40 Ω delta arms draw `230√3 / (40 + 0.14)` A; line current is √3 times arm current. An explicit 0.07 Ω conductor joining L1/L2 draws `(E1 − E2) / 0.07` A. This estimate has no implicit source/winding/soil impedance or protective-clearing claim. Open phase conductors carry zero current while their terminal voltage can remain nonzero.

Tests also cover source declaration errors, preserved input and order invariance, unavailable cross-domain voltage, guarded scalar/app entry, independent supply systems and single-phase numerical continuity.

## Local acceptance

Reproducible command: `bun run verify:phase-1.5e0`. It runs repository check/build/assets checks, the existing MNA benchmark, actual Bun/local workerd parity, real localhost Worker/D1/session acceptance and selected existing Comlink/browser regressions. The E.0 parity workload adds 11 complex-result fixtures. Browser cases verify existing simulator/version/supply/edit/relay/damage continuity; they do not claim three-phase UI acceptance.

Acceptance is recorded across the main gate and focused final reruns:

- Repository typechecks, the 142-module domain boundary, lint, **131 files / 2,112 unit tests**, Vite/Astro/postbuild, asset/link/SEO/CSP checks and the existing MNA benchmark passed in the main gate. The sandboxed attempt could not bind localhost; approved execution then reached parity and exposed 12 last-bit differences from `Math.hypot` across Bun/workerd.
- Replaced that norm with explicit scaled square-root arithmetic and calculate wire loss directly from the squared current axes. Added five extreme/zero/sign norm cases. Final `bun run check:core` passed strict core types, lint and **14 files / 400 tests**, including **33 phasor tests**, in 6.18 s for Vitest. The changed runtime-test script's TypeScript check and focused lint also passed. This final arithmetic change affects only the new standalone phasor API; the existing app bundle and scalar consumers are unchanged.
- **716 Bun/workerd cases passed exact serialized equality**, including 11 new phasor cases. No comparison tolerance or measurement rounding was introduced. Failure evidence is now saved as JSON with a compact error instead of printing tens of megabytes.
- **15 real localhost Worker/D1/session groups passed**, including paid browser flows and existing timed controls/protection/damage, authorization, circuit persistence and diagnosis safeguards.
- **23 unique Chromium cases passed across the main run and a focused rerun.** The main run passed 22 cases; the cable repair lifecycle reached its final second-cycle poll after the overall 30 s test deadline. Set only that two-cycle case to 60 s, retaining every individual polling deadline and assertion; its focused trace-enabled rerun passed in 19.9 s.

Initial JavaScript is **249,940 bytes gzip** and CSS **26,165 bytes gzip**. The user approved increasing the JavaScript allowance to **300,000 bytes** during this task; other budgets retain their previous values. MNA medians/p95s from the main gate were **1.12/1.94 ms** for two series loads and **46.36/56.81 ms**, **65.09/75.06 ms** for the recorded dense 199-parallel/255-series fixtures. The dense target is still open.

The user also requested faster development feedback. Added `test:changed`, `test:related` and `check:core`, with [usage guidance](../DEVELOPMENT.md). The related test command selected one phasor file and completed its then-current 28 tests in **0.733 s**; changed-test discovery was checked without rerunning the entire selected suite. Full phase acceptance remains required at milestones.

Evidence: ignored `.wrangler/phase15e0-{acceptance,unlocked-acceptance,core-final,parity-final,simulator-final,browser-final,browser-repair-rerun,related-tests,changed-selection}.log`, `.wrangler/domain-tests-6jpkq8/` and `.wrangler/membership-tests-uuvKmL/`. The main gate stopped at the subsequently fixed parity mismatch; this record does not claim a single end-to-end green run after that fix.

The existing dense solver/rendering targets remain open. Two projection solves do not improve that limitation. No Cloudflare account/credentials/resources, live-site tests or deployment are part of this work.
