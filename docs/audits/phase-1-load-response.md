# Phase 1.5C.2 — Load response and wire losses

Date: 2026-10-02. Status: **complete locally; full 1.5C.2 acceptance gate passed**. This extends the accepted linear MNA slice with operating-point results and corrects wire-property consumers. The app's numerical runtime still uses the guarded legacy engine until 1.5C.5. Every service and persistence target used here is local under root `AGENTS.md`.

## Result contract and scope

`solveCircuit` now returns the shared compiled `readiness`, `loads`, `wires`, `deviceCurrents` and a separate circuit `operation`. Electrical contract version remains 1; model and capability-catalogue versions are `1.5c.2.1`. Readiness reuses the validated graph without a second compilation and no longer mutates the compiler's diagnostics. Calculation/convergence, physical load response, suitability, circuit operation and standards assessment remain distinct.

Load operating points retain signed terminal voltage/current, power, fixed nominal ratings, power ratio and the actual contributing source identities. Element response is idle/below-nominal/nominal/above-nominal, while compatibility uses the declared AC/DC suitability, frequency, operating range and maximum voltage. Solved range boundaries use the existing numerical tolerance. A missing range or maximum remains unknown; a nominal 230 V element is never re-rated when its supply changes, and no universal 110 V dropout or 250 V destruction threshold is substituted. A converged element can have a valid physical power result while overall suitability/operation is unassessed. No trip, temperature or damage state is advanced.

The existing MNA wire equations already include finite resistance. The new wire results expose resolved size/material/length/installation/derating and provenance, signed current, terminal voltage, intact-conductor `I·R` drop and `I²R` loss. Resistance is for **one conductor at 20 °C**, separate from the existing **two-conductor 70 °C** design-drop table. An open return can have 230 V across its break with zero current and loss; its break voltage is not reported as intact-conductor resistive drop. Cross-reference voltages and unsolved measurements stay unavailable rather than becoming zero.

Cable capacity is a labeled estimate from the existing supported BS 7671 teaching table, with 70 °C PVC insulation, 30 °C ambient, selected installation method and derating. Aluminum retains the documented 0.78 copper-table approximation. Sizes outside the supported table, including AWG-derived nonstandard areas, retain their resistance model but have unassessed ampacity; no next-larger table row is substituted. Default property assumptions remain visible and never establish a cable-safety pass. Actual pole currents, current capacity, overcurrent rating `In`, and rated residual mA are separate. RCCB carrying capacity is not an overcurrent trip rating; residual current and protective timing remain unassessed.

## Consumer corrections

The wire inspector and selected-wire header now use the shared resolver: explicit mm² → saved AWG → explicit endpoint setting → default. A metric edit clears a contradictory AWG label; an AWG edit writes its physical equivalent. Undo/redo and JSON export preserve the transaction. Inspector capacity uses the same supported-table coverage. Missing simulation readings display unavailable values instead of fabricated 0 A, 0.05 Ω or 20 A; remaining legacy drop/resistance estimates are labeled as design-loop values.

Cable validation compares resolved modeled wires with catalogue recommendations. A stale 1 mm² endpoint cannot label an explicit 6 mm² run undersized. Recommendation checks do not claim capacity or safety, and component-only quick fixes that cannot change an explicit wire have been removed. The adjacent-conductor rating check keeps unknown `In`/ampacity unassessed, avoids next-size AWG capacities, and describes its limited estimate rather than claiming complete protective coordination. Full branch-aware validation, analytics and exercise-result migration still belong to 1.5F.

## Independent acceptance

The 230 V / 2 kW element stays at `R = 26.45 Ω` through source sweeps at 230/120/48/24/12 V. With two 10 m, 2.5 mm² copper leads, each lead is 0.07 Ω and the expected current is `Vs / 26.59 Ω`. Separate fixtures compensate that declared lead drop to reproduce these independent **at-load** references:

| Terminal voltage | Current | Power |
|---|---|---|
| 230 V | 8.695652 A | 2000 W |
| 120 V | 4.536862 A | 544.423440 W |
| 48 V | 1.814745 A | 87.107750 W |
| 24 V | 0.907372 A | 21.776938 W |
| 12 V | 0.453686 A | 5.444234 W |

At a 230 V source with 1000 m per 2.5 mm² copper conductor, the expected result is **5.686032 A, 150.395550 V and 855.153931 W** at the element. Additional acceptance covers material/area/length sweeps, declared ranges after actual cable drop, exact range boundaries, frequency mismatch, unknown and explicitly range-declared LED drivers without fabricated current, independent AC/DC supplies, live open returns, source-free/no-load/partial states, per-pole breaker currents on separate lamp/heater branches, shared-feeder KCL, RCCB/RCBO/isolator units and roles, capacity exceedance without damage, AWG/default provenance, invalid catalogue metadata, input-order invariance and save/load/undo continuity. The prior MNA KCL/KVL/power-balance and numerical-limit fixtures remain passing.

## Local acceptance

Reproducible command: **`bun run verify:phase-1.5c2` passed end to end**. Evidence: ignored `.wrangler/phase15c2-verify.log` and `.wrangler/domain-tests-fpULEa/`.

| Check | Result |
|---|---|
| Types, domain boundary and lint | All projects passed, including strict indexed access; 110 domain runtime modules; lint over 671 files |
| Unit tests | 119 files; **1,818 passed**, plus five explicitly expected failures owned by later phases |
| Build and asset checks | Passed; initial JS **247,605 B gzip / 250,000 B**, CSS **26,394 B / 30,000 B**; links in 193 HTML files and SEO for 191 pages checked; CSP passed |
| MNA benchmark | Two series loads: **0.85 ms median / 2.07 ms p95** at 6 driven unknowns; 400/512-unknown drawings **47.90–69.80 ms median** |
| Bun / local Hono-workerd parity | **524 cases**, including the new operating-point fixtures |
| Local Chromium | **4 passed**: wire edits/unavailable readings and existing supply import/edit/undo/export/IndexedDB/Comlink/local-Hono cases |

Before the complete passing gate, focused checks caught and corrected a two-pole isolator test fixture, the expanded inspector's test selector, and a Set/array type mistake in the validator. The sandbox prevented the first browser server startup; approved local process execution resolved that restriction. No test expectation or performance threshold was relaxed. The dense solver still misses the existing 8 ms target at 200 components; this is recorded evidence for the later sparse-solver decision, not a claim of full simulator or rendering performance acceptance.

## Next step

**1.5C.3** adds ideal isolated AC transformer coupling, explicit PE/reference relationships and supported fault paths. Full compatibility/readiness and confirmed supply-editing UI remain 1.5C.4; the actual MNA browser/Comlink/local-Hono runtime switchover remains 1.5C.5. Timed protection/damage, three-phase models and full legacy/lab retirement remain 1.5D–F. This gate does not replace the wider `verify`, membership, stress or dense-rendering gates. No deployment, hosted test, dependency update, Cloudflare credential/account operation or remote Cloudflare resource operation occurred.
