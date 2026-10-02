# Phase 1.5C.3 — Isolated transformers and protective references

Date: 2026-10-02. Status: **complete locally; full 1.5C.3 acceptance gate passed**. This extends the accepted linear MNA solver with ideal isolated AC transformers and explicit PE/reference findings. The browser and application HTTP endpoint still use the guarded legacy numerical engine until 1.5C.5. All verification uses localhost and local persistence under root `AGENTS.md`.

## Equations and result contract

Electrical contract version remains **1**, with engine `mna-linear-2` and model/capability version **`1.5c.3.1`**. No saved circuit fields, terminal indices or schema versions changed. The three isolated catalogue transformers retain their fixed 230:8, 230:12 and 230:24 winding ratings independently of supply edits.

For turns ratio `n = Nprimary / Nsecondary`, the first terminal of each winding has matching polarity. MNA stamps one additional primary-current unknown with:

```text
Vp - n * Vs = 0
Is = -n * Ip
Vp * Ip + Vs * Is = 0
```

Current is positive into each winding's first terminal; power uses the passive sign convention. Loading either winding changes both currents, so reverse power transfer and cascaded transformers use the same equations. Finite lead resistance is stamped once per conductor at 20 °C; its loss stays separate from winding power transfer. Ideal-transformer loss, magnetizing current, inrush, saturation, thermal limits, insulation ratings and rectification are not modeled.

The compiler preserves galvanic domains. `transformerCoupling` forms separate equation groups; each original domain still receives its own mathematical gauge. Referencing the secondary return at zero adds no physical neutral/PE connection. A single externally drawn interwinding bond joins the physical domains and is reported as `externally-connected`; it does not make the transformer's internal windings non-isolated. Voltages across independently referenced domains remain unavailable.

`transformers` exposes signed winding voltages, currents and powers, ratio, physical domains, connection status, contributing source IDs, frequency and explicit model limits. `references.couplingGroupId` identifies shared equations without implying a shared voltage reference. Conservation checks now verify winding voltage/current ratios and transformer power in addition to terminal KCL, source constraints, per-domain power and equation residuals. Winding absorption/delivery accounts for energy transferred across an isolation boundary; independent domains cannot cancel one another's errors.

The existing **512-unknown allocation bound applies to the whole coupled group**, including winding-current unknowns. The total 2,048-unknown and cubic-work limits remain. The old `maxUnknownsPerDomain` export is retained for existing callers; `maxUnknownsPerCouplingGroup` names the actual bound. No matrix regularization, invented shunt resistance, hidden grounding, dependency change or relaxed tolerance was introduced.

## Protective earth, polarity and faults

Shared readiness traces source identity through complete source/winding paths and coupling without assigning an unsolved secondary voltage. It excludes winding power transfer from the count of consuming loads, preserves no-load/open/partial distinctions and identifies a shorted primary or secondary separately from a short across the original source. Secondary compatibility uses actual terminal voltage after solving; the primary's 230 V value is never assigned to a secondary load.

`readiness.earthing` records explicit neutral/DC-negative/winding-to-PE connections and protective conductor paths to named buses, source PE terminals or electrodes. Conductor-path continuity, a physical return bond and installation assessment are separate. Legacy PE aliases share only their named protective bus. Neither a source N terminal nor an earth rod creates a hidden ground connection; separate rods have no common soil node or invented electrode resistance. An injected L–PE fault is not relabeled as an intentional reference bond.

Diagnostics distinguish missing/broken CPC paths, reversed named supply polarity, neutral-only switching, use of PE as a normal conductor, and actual current in protective connections. The numerical load response remains available for a miswire; it cannot establish correct polarity or installation safety. Floating transformer outputs have winding polarity but are not automatically assigned a physical neutral. A drawn secondary-to-PE bond is reported as a winding connection.

`protectiveCurrents` and `faultCurrents` use accepted branch currents, with null for unavailable measurements. A supported finite loop yields only a **declared-network estimate** using ideal sources and resolved conductor properties; wire defaults retain their existing provenance. Source/winding/soil impedance, installation prospective current, touch voltage and protective clearing remain unassessed. A floating L–PE fault can have zero current while its protective terminal rises to line potential relative to the named source return; zero current is not a safety result. A secondary earth fault cannot return through the primary merely because both sides have mathematical references.

DC excitation, joined sources with differing frequencies or undeclared relative phase, autotransformers, unspecified leakage impedance and ambiguous fault conductor pairs remain unavailable. An internally broken winding needs an explicit failure/magnetizing model; it is not treated as an intact ideal transformer. An entirely floating, unloaded ideal transformer can leave differential voltage unconstrained and return a singular result. Both windings deactivated by existing saved damage/trip state carry no coupled constraint. Unsupported or nonconverged documents receive no accepted telemetry.

## Independent acceptance

The main fixture uses a 230 V / 50 Hz source, a 6 Ω load and four explicit 10 m / 2.5 mm² copper leads, each 0.07 Ω. Independent reflected-impedance arithmetic is:

```text
Ip = 230 / (0.14 + n² * 6.14)
Vp = 230 - 0.14 * Ip
Vs = Vp / n
Iload = n * Ip
```

| Nominal secondary | Primary current | Secondary terminal voltage | Load current | Load power |
|---|---|---|---|---|
| 8 V | 0.045318 A | 7.999779 V | 1.302896 A | 10.185223 W |
| 12 V | 0.101962 A | 11.999255 V | 1.954276 A | 22.915170 W |
| 24 V | 0.407773 A | 23.994043 V | 3.907825 A | 91.626558 W |

Additional fixtures cover open/no-load secondaries, reversed winding connections, backfeeding at 60 Hz, cascaded ratios, external bonds, independent transformer supplies, finite secondary shorts including reflected primary lead resistance, DC/frequency/phase guards, broken windings, nonfinite catalogue data, conservation and singular floating windings. PE cases distinguish a bonded L–PE loop (`230 / 0.21 A`), an L–N loop (`230 / 0.14 A`), floating faults, broken CPCs, normal N returns, PE misuse, swapped polarity, neutral switching, isolated secondary faults and independent earth rods. Ordering, schema-2 round trips, input immutability and membership-independent electrical findings are checked. Existing MNA, operating-point, compiler, persistence and guarded legacy tests remain in the gate.

## Local acceptance

Reproducible command: **`bun run verify:phase-1.5c3` passed end to end**. Evidence is ignored under `.wrangler/phase15c3-verify-approved.log` and `.wrangler/domain-tests-eWsbzS/`.

| Check | Result |
|---|---|
| Types, domain boundary and lint | All projects passed, including strict indexed access; 116 domain runtime modules; lint over 680 files |
| Unit tests | 121 files; **1,878 passed**, plus five explicitly expected failures owned by later phases |
| Build and assets | Passed; initial JS **247,600 B gzip / 250,000 B**, CSS **26,394 B / 30,000 B**; links in 193 HTML files, SEO for 191 pages and CSP checks passed |
| MNA transformer benchmark | Isolated transformer: **0.94 ms median / 1.34 ms p95**, 8 coupled unknowns; two cascaded transformers: **0.87 / 1.27 ms**, 12 unknowns |
| Existing MNA workloads | Two series loads: **1.18 ms median / 3.61 ms p95**; 400/512-unknown workloads: **58.55–82.95 ms median**, retaining the known dense-solver performance limit |
| Bun / local Hono-workerd parity | **551 cases**, including 27 transformer/earthing drawings |
| Local Chromium continuity | **4 passed**: real supply import/edit/undo/export/IndexedDB, DC guard through actual Comlink/local Hono, wire-property edits and unavailable readings |

The first run passed type/lint, unit tests, build/assets and the benchmark, then stopped because the sandbox denied a localhost bind. Approved local process execution allowed the entire gate to be rerun successfully; the first log remains `.wrangler/phase15c3-verify.log`. No acceptance tolerance or performance threshold was relaxed. Dense MNA still exceeds the existing 8 ms target at 200 components; sparse/factorization work remains a later integration decision. This gate does not replace the wider `verify`, membership/stress matrix, dense 60 fps or application MNA switchover. The browser cases verify existing continuity and guards; they do not claim the browser uses the new transformer solve.

## Next step

**1.5C.4** delivers capability-based palette/inspector behavior, confirmed supply edits with Review/Undo, safe variant changes and shared Run readiness. **1.5C.5** switches the supported application domain/Comlink/local-Hono runtime to MNA. Timed protection/damage, three-phase models and complete lab/legacy migration remain 1.5D–F. No remote test, deployment, credential/account operation or remote Cloudflare resource change is part of this milestone.
