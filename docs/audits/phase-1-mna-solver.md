# Phase 1.5C.1 — MNA linear solver slice

Date: 2026-10-02. Status: **complete locally; full 1.5C.1 acceptance gate passed**. This replaces the electrical computation for the supported linear slice only; it is not full 1.5C and operation/timed-device models remain guarded. Root `AGENTS.md` keeps every service, test and persistence target local.

## Solver contract

`packages/domain/src/core/mna.ts` implements the ADR 0009 first numerical slice through `solveCircuit(raw, options)`. Consumption starts from the 1.5B compiler output (`compileCircuit`): canonical terminal/net ordering, one-conductor wire resistances resolved from material/cross-section/length, contact-state isolation without advancing devices, and the separate 1.5C.0 source profiles and capability coverage. Unknown or unsupported connected load laws, transformer/motor/PV branches, protection/time/damage models and mixed-frequency or multi-AC-source domains are rejected as unavailable coverage instead of dropped or substituted.

Each driven conductive domain indexes one voltage unknown per non-reference net plus one signed ideal-source current unknown per source, stamps resistor conductances and ideal-source constraints, and selects a deterministic mathematical gauge that creates no PE/neutral bond. Results record `terminalVoltages`, `terminalDomains`, `branchCurrents`, `branchVoltages` (signed `from`→`to`, omitted across independent references as `unavailableBranchVoltages`), `branchPowers` (passive convention; negative source power is delivery), `wireLosses`, per-domain `references`, signed `sourceBranches` and `checks`. KCL at physical terminals, source KVL and per-domain power balance are verified with the ADR 0008 tolerances (`1e-6` relative / `1e-9` absolute) before any measurement is accepted; invalid topology, unsupported models, singular/conflicting/indeterminate sources, size limits and nonconvergence return distinct empty results with no fabricated telemetry. `solveLinearSystem` performs scaled partial pivoting and residual checks with explicit bounded dense storage; the legacy last-source-wins voltage and copied total-current behavior is not an oracle.

Independent analytical acceptance covers two 6 Ω elements in series including all three 0.07 Ω leads, unequal parallel branches, a shared feeder with internal-link current recovered by KCL, balanced and unbalanced bridges against an independent Thevenin calculation, a dangling live end with zero current and a zero-current balanced branch, two independent domains with undefined cross-reference voltages, opposed DC sources with signed absorption/delivery, equal ideal sources made determinate by finite leads, reversed wire sign conventions preserving loss, static contact state with no latching, AC RMS at 12/120/230 V with the saved frequency, a voltage/resistance scale sweep, and stable output under component/wire input-order permutation, JSON round-trip and direct hostile input validation.

## Local acceptance

Reproducible command: **`bun run verify:phase-1.5c1` passed end to end**. It runs the domain boundary check, all seven typecheck projects, Biome lint, the full unit suite, the production build and asset budgets, internal-link/SEO/CSP checks, the bounded MNA benchmark and Bun/local Hono-workerd parity including the MNA acceptance fixtures.

| Check | Result |
|---|---|
| Typechecks, domain boundary and lint | Passed, including strict indexed access for the core; 107 domain runtime modules |
| Unit tests | 116 files; **1,763 passed**, plus five explicitly expected failures owned by later core phases |
| Build, performance assets, links, SEO and CSP | Passed; initial JS **246,774 B gzip / 250,000 B**, CSS **26,394 B / 30,000 B**; links in 193 HTML files and 191 SEO pages checked |
| MNA benchmark | two series loads 6 unknowns **0.44 ms median / 1.17 ms p95**; 400/512 driven unknowns 42.8–65.6 ms median, dense-solver evidence for the later sparse/external decision; the legacy simulation budget is unchanged |
| Bun / local Hono-workerd parity | **510 cases** covering simulation, compilation, persisted profiles, capabilities, readiness and MNA acceptance fixtures |

The first gate attempt failed one flaky orthogonal-routing perf assertion (58.1 ms against a 50 ms guard); the file passed standalone and the rerun gate passed end to end with no solver, fixture or threshold change. The 400/512-unknown dense factorizations do not meet the legacy 8 ms simulation budget at the 200-component drawing; that is recorded evidence for the ADR 0009 sparse/external-library decision, not a regression in the legacy adapter. Evidence: `.wrangler/domain-tests-Ig1Qjk/`.

## Remaining work

Next: **1.5C.2**, operating ranges, the fixed-rating load response and finite wire losses in consumer paths, then 1.5C.3 ideal isolated transformer coupling with explicit PE/reference relationships and supported fault paths. The browser and local Hono simulator still run the guarded legacy numerical engine; this slice does not wire MNA into the app runtime, and no readiness UI, confirmed supply-change workflow or palette/inspector integration ships yet. Timed protection/damage, supported three-phase solving and exercise-operating-point migration remain 1.5D–F. No deployment, remote Cloudflare operation or hosted test is part of this acceptance.
