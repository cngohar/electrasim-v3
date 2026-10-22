# Phase 1 — Simulator Core (Lab Circuit Heart)

> **Status:** PHASE 1 COMPLETE LOCALLY WITH DOCUMENTED PERFORMANCE EXCEPTIONS (2026-10-12) — Phase 1.0–1.5 milestones and 1.5A/B/C.0–5 are recorded complete within their documented scope; dense rendering/solver targets remain open. **Updated 2026-10-07: 1.5D.0–3 are complete locally.** The accepted slices cover declared coil controls, deterministic time/state/events, timer programs, resistive RMS dimming, actual-pole timed protection and explicit cable/device damage budgets. Fault Lab separates clearing injected faults, resetting breakers to OFF and replacing damaged items, using shared desktop and phone controls. The [damage/repair acceptance](../audits/phase-1-damage-repair.md) closes the complete local D.3 gate. **1.5E.0–3 are complete locally: phasor foundation, source/editing/application measurements, declared motor, timed contactor operation and the migrated DOL guide. [E.3 acceptance](../audits/phase-1-dol-guide.md) closes the complete local three-phase teaching gate**, **1.5F.1 current consumers and 1.5F.2 Diagnosis Lab are complete locally; [consumer acceptance](../audits/phase-1-consumer-integration.md) and [diagnosis acceptance](../audits/phase-1-diagnosis-integration.md) record the gates. F.3 is finished with user-accepted performance exceptions (2026-10-08); the full gate is not green and budgets remain unchanged**, **1.6 visual effects are complete locally (2026-10-09)**; [acceptance](../audits/phase-1-visual-effects.md) records the consolidated gate and focused recovery. [1.7 UI and modes](../audits/phase-1-ui-modes.md) are complete locally with consolidated and focused recovery evidence. [1.8 super-admin membership UI](../audits/phase-1-membership-ui.md) is complete locally. [1.9 full local verification](../audits/phase-1-full-verification.md) is complete locally by explicit user decision with documented performance exceptions; the strict full gate is not green. See [timed-control acceptance](../audits/phase-1-timed-controls.md), [timer/dimming acceptance](../audits/phase-1-timers-dimming.md), [protection acceptance](../audits/phase-1-protection.md), [ADR 0013](../decisions/0013-damage-and-repair.md), the preceding [MNA runtime gate](../audits/phase-1-mna-runtime.md) and [core rebuild plan](../plans/SIMULATOR_CORE_REBUILD_PLAN.md).
> **Method:** Sub-phase → Steps → Gate. Each implementation sub-phase ships as its own scoped commit. All development is local-only: the old live-account credentials were removed locally; a new account will be configured after development. Passing a gate never authorizes remote access (see root `AGENTS.md`).
> **Previous extension (2026-10-14):** [Phase 1.11 Fault Lab redesign and Diagnosis retirement](../audits/phase-1-fault-lab-redesign.md) is complete locally after explicit design approval. Diagnosis runtime is retired; shared electrical behavior and historical records remain. Acceptance is aggregate with focused recovery, and historical performance exceptions remain open.

> **Catalogue gap resolved within declared teaching scope (2026-10-15):** The historical [default catalogue audit](../audits/catalogue-simulation-gaps.md) found 31 unassessed placement defaults. [Phase 1.12 acceptance](../audits/phase-1-missing-component-calculation.md) now records all 30 missing teaching laws implemented plus explicit setup for the existing three-phase motor. Generic parameters, conditional models and unmodeled physics remain explicit; this is not complete operation or certified ratings for every palette entry.

> **Previous phase (2026-10-15):** **1.12 — Missing component calculation** is complete locally within its declared functional scope, through milestones 1.12.0–7. Combined full-attempt and focused recovery evidence, intentional skips and performance exceptions remain recorded in its [acceptance](../audits/phase-1-missing-component-calculation.md). Its separately authorized GitHub checkpoint does not authorize publication of subsequent work or deployment.

> **Active checkpoint (2026-10-18):** **1.14 — Simulator performance reliability** remains in progress. Baseline 1.14.0 is complete; bounded solver/grid changes have passing functional evidence after explicit recovery (156 source / 68 built unique cases, 2 intentional built skips; 63 production-shell cases). Strict solver 8 ms and dense 60 fps/device targets remain unmet; original full gate failed. Phase 1.13 remains published at `9ee378a`; current changes are local and uncommitted. [Plan](../plans/PHASE_1_14_PERFORMANCE_RELIABILITY_PLAN.md) · [Ledger](../audits/phase-1-performance-reliability.md) · [Execution manifest](../audits/data/phase114-acceptance.json) · [Handoff](../handoffs/performance-reliability-next-chat.md).

> **Feedback and reruns:** For 1.6, the user requested one continuous implementation with builds/typechecks during work and one consolidated final acceptance gate, followed only by affected failure recovery. For other phases, use affected-file tests during implementation. Phase commands support `--only STAGE` and `--from STAGE` for focused reruns; retain earlier passing evidence only when the fix leaves it valid. Every required stage still needs acceptance evidence, and selected runs report partial acceptance. See [local development workflow](../DEVELOPMENT.md).
> **Previous baseline:** Phase 0 recorded `typecheck/lint/vitest 97/1464`, local D1 14 tables and auth 200. These are historical results, not checks rerun for this planning revision.
> **Principle:** Electrical standards are code-owned (§32). D1 `electrical_standards` remains read-only, including for super admins. Membership controls features, never electrical rules or the truth of basic safety diagnostics.

> **1.5A closure (2026-09-30):** immediate protection fixes, coverage guards, regression corpus and ADR 0008 are accepted within their documented scope. The complete local phase command passed: 1,574 unit tests plus seven expected core failures, all type/lint/build/assets checks, 53 built-output and 3 simulator browser cases. Real local Worker/D1 membership acceptance passed 25 groups. [Acceptance evidence](../audits/phase-1-audit-baseline.md) and [dependency review](../audits/phase-1-dependencies.md) record the Vitest 4.1.11 migration and one remaining, currently unexposed tooling advisory. The user resumed 1.5B on 2026-10-01; its [separate acceptance record](../audits/phase-1-electrical-contracts.md) supersedes the earlier deferral.

## 0. Decisions before code

### 0A. Retain SVG; Matter is visual only

Keep the accessible SVG renderer, `labGlassLight/Dark`, `editorBackground` and orthogonal routing. Enhance existing component artwork to resemble physical electrical devices using clean vector illustrations, as confirmed by the user on 2026-09-27. Introduce viewport culling, LOD and dirty-flag rendering as measurements require. Target 60 fps at 200 components + 400 wires and simulation median <5 ms; measure renderer and solver costs separately during this phase. The current 202-component/300-wire headless fixture does not establish the new rendering target; use ADR 0007's measurement-based decision boundary before considering another renderer.

Matter.js is limited to sag, snapping and overload effects. It must never change `simulate()` results. Pixi/Three remain outside this phase. Record the decision in `docs/decisions/0007-renderer-svg-matter-only.md` during inventory.

### 0B. Standards audit runs first

Use [the revised electrical standards audit](../audits/electrical-standards-gap.md). Public IET, NFPA and IEC sources were checked on 2026-09-26. Required corrections include:

- BS 7671:2018+A4:2026 is published; the A2:2022 book with A3:2024 remains valid during the transition until **15 October 2026**.
- NEC 2026 is published; adoption is jurisdiction-specific. A citation must not imply every US installation uses that edition.
- IEC 60364 is a series with separately versioned parts. **IEC 60364-8-81:2026 replaces 8-1:2019**; **8-82:2022+AMD1:2026** is the current consolidated prosumer reference found in the publisher search.
- `int` is a generic IEC teaching profile. Countries sharing 230 V / 50 Hz do not necessarily share installation rules; `eu` also needs national-adoption caveats.
- Do not mandate a C-curve breaker for every EV charger, reuse UK Zs rules as NEC rules, or use 400 V line-to-line voltage for a 230 V line-to-earth loop check. The audit replaces these earlier proposed fixes.

Edition metadata, implemented model coverage and jurisdictional adoption are separate facts. Updating a citation or passing an internal score does not establish full-standard compliance.

### 0C. Membership decisions confirmed by the user

| Capability | Guest / free account | Active paid member |
|------------|----------------------|--------------------|
| Basic simulator and components | Yes | Yes |
| Basic fault injection and diagnosis | Yes, including guests | Yes |
| Basic safety warnings and detection of wiring mistakes | Yes | Yes |
| Existing Pro components | Preview; use requires membership | Yes |
| Advanced fault exercises, including multiple injected faults | Preview; use requires membership | Yes |
| Additional benefits | Existing free functionality remains | Configurable framework; no additional benefit enabled or promised yet |

**Phase 1:** super admins create/edit/delete paid plans and manually grant/edit/revoke memberships. **Phase 7:** online checkout and payment lifecycle, using the same entitlement model. Prices, durations and names are data; do not invent commercial defaults.

Membership is separate from platform/organization roles. Ordinary admins, instructors and organization owners cannot manage paid plans or grants. Data model, access boundaries, deletion semantics and tests: [Paid Membership Plan](../plans/PAID_MEMBERSHIP_PLAN.md).

### 0D. Dense, legible simulator UI

Use the same theme tokens with two densities: spacious marketing shells and a dense simulator. Preserve search, plug-family filtering, recent components, resizable panels, minimap, command palette and zoom-to-fit. Inspector v2 groups Properties, Wiring, Simulation and Analytics. Lock indicators explain membership features without hiding free diagnostics.

### 0E. Component appearance — user-confirmed 2026-09-27

Enhance the current SVG artwork into consistent, recognizable illustrations of actual device families. The user approved the rest of the proposed canvas direction: a large wiring surface, compact surrounding controls, clear routing/terminals and uncluttered navigation.

- Use meaningful silhouettes, housing proportions, terminal blocks, screws, toggles, knobs and restrained shading. Keep drawings legible in both themes and at working zoom levels. Photorealistic raster imagery is outside this brief.
- Distinguish device families: DIN-rail protection with toggles/test-button markings as applicable; region-appropriate socket faceplates; contactors with terminal blocks; motors with fins, terminal boxes and shafts; switches/dimmers with recognizable actuators.
- Printed ratings and animated states must match the configured component and solver state. Replace hardcoded illustrative ratings when they can disagree with the device configuration. Artwork must not imply unsupported terminals, functions or electrical findings.
- Preserve canonical component/terminal IDs, connectivity and saved-circuit compatibility. Align artwork with the existing interactive terminal anchors; any geometry change needs explicit routing and restore regression checks.
- Build reusable artwork by device family and evaluate the enhanced catalog in the dense-circuit benchmark. Reduce decorative detail at distant zoom levels while retaining important state and fault cues.

This visual work belongs to 1.4's component rendering foundation. The broader palette/toolbar/inspector redesign remains in 1.7; physical cable effects remain in 1.6.

### 0F. Rebuild the electrical core before further effects

The supplied [V2 deep scan](../../v3-audit.md) is a historical finding set, not a current V3 completion checklist. Local V3 probes on 2026-09-30 confirmed dead series loads, shared total current on separate branches, incorrect battery/transformer voltages, missing three-phase source semantics and protection/validation defects. Other findings are already fixed or partial: basic/Pro overload parity, relay NO/NC/coil operation, forced-open protection and strict file validation. The audit itself retracts its benchmark-failure claim.

Use the [rebuild plan](../plans/SIMULATOR_CORE_REBUILD_PLAN.md) for the complete finding register, independent acceptance fixtures and later-phase dependencies. Replace the electrical computation in stages through the existing domain boundary; retain the editor, artwork, persistence, memberships and useful regression coverage. Extracting the domain package did not replace its BFS electrical model. Do not require parity with known incorrect legacy results.

The new core separates document normalization, terminal graph compilation, source/load equations, timed device state and result/diagnostic derivation. Start with declared DC/single-phase load models and isolated transformers, then timed protection/controls and supported three-phase teaching models. Unsupported cases must be explicit and cannot earn a false pass. PE is not a normal power source; device ratings, cable capacity and protection operation are separate concepts. Electrical output remains independent of membership and visual effects.

### 0G. MNA and shared simulator behavior — 2026-10-01

[ADR 0009](../decisions/0009-mna-solver.md) selects **Modified Nodal Analysis (MNA)** for the replacement solver. Extend the accepted 1.5B compiler/contracts with source constraints, actual terminal voltages, branch currents and wire losses. Graph traversal still serves connectivity and diagnostic paths. Do not preserve the legacy fixed-nameplate `P/V`, copied total current or last-source-wins voltage behavior.

The [behavior audit](../audits/phase-1-behavior-review.md) records 42 current local observations plus source-inspected UI/exercise findings. The [behavior plan](../plans/SIMULATOR_BEHAVIOR_PLAN.md) owns the detailed interaction and acceptance requirements:

- One domain compatibility/readiness service feeds the palette, inspector, Run, validator, imports, Comlink/local Hono and exercise evaluation. Source type/frequency/phase, device nominal rating, operating range, capacity and damage model are separate. Preserve 1.5B validation/defaults/wire provenance and 1.5A unsupported-model guards until replacements pass.
- Confirm a staged supply change on every populated drawing with Cancel/Apply, then notify with Review/Undo. Preserve explicit device ratings, wires, faults and unrelated independent sources. Lock configuration while running; keep supported runtime switches usable. Invalidate obsolete results and reassess the circuit on the next Run.
- Show empty, no-source, no-load, open/partial, incompatible, invalid and unassessed states explicitly. Open-circuit diagnostic measurements remain useful; a live conductor need not carry current. An empty error list or `faultsCleared` is not readiness, successful operation or a compliance certificate.
- Wire length/material/area must affect the solve. Use one-conductor resistance with its stated temperature, distinct from the two-conductor design-drop table. Keep `Ib`, `In`, `Iz` and residual mA separate; unknown measurements/ratings cannot become fabricated 0.05 Ω, 20 A or 250 V defaults. Timed trip/damage belongs to 1.5D.
- Fault Lab, Diagnosis Lab consume the same engine. Preserve free basic diagnosis and paid advanced access. Existing identification/repair, structure and server-authorization safeguards remain; add model-aware operating results and authored supply/edit constraints so changing voltage or deleting a load cannot earn a repair success.

Essential correctness interactions ship with **1.5C**, not after the numerical core in the broader 1.7 redesign. Existing labs complete migration in **1.5F**; later game/procedural phases expand their scope.

## 1. Revised sub-phase map

This replaces the previous 1.0–1.7 sequence. Membership foundations precede persistence; **1.5A–1.5F** now precede effects without renumbering the existing UI/admin work. **1.9** records the original full local closure with documented performance exceptions. Extensions **1.10–1.13** have their own scoped acceptance; they do not turn the historical strict gate green.

| Sub-phase | Title | Scope | Key files / planned modules | Local exit gate |
|-----------|-------|-------|-----------------------------|-----------------|
| **1.0** | **Inventory and scope** | Refresh domain/UI census; trace tiers, faults, imports, seeds and auth; finish standards register and renderer ADR | `docs/audits/*`, `docs/decisions/0007-*.md`, membership plan | Confirmed requirements map to implementation/tests; uncertain clauses marked unverified |
| **1.1** | **Standards corrections** | Correct claims/edition metadata; review EVSE, Zs applicability, voltage-drop/rating policies and regional diagnostic text; reseed verified changes | `packages/domain/src/{standards,zsCheck,compliance,faults,templates}.ts`, electrical helpers, relevant Astro tools, migrations | Typecheck + targeted Vitest; independent expected-value fixtures; unsupported cases never yield a false compliance pass |
| **1.2** | **Domain package** | Extract pure `packages/domain`; retain one `Circuit` format; separate electrical computation from access policy | `packages/domain/**`, workspace/import configuration | Typecheck all projects; browser/Hono Worker compatibility; parity tests |
| **1.3** | **Membership and roles** | Trusted global role, super-admin bootstrap, plans/features/entitlements/audit schema, resolver and manual APIs | `packages/db/**`, migrations, planned `packages/access/**`, Hono routes | Local D1 + cookie-authenticated role/entitlement tests; signup cannot self-assign role/access |
| **1.4** | **Canvas base** | SVG layers, enhanced physical-device artwork, routing, fitRegion, measured culling/LOD, theme CSS variables | `src/ui/canvas/**` | Browser/a11y checks; measure 200-component/400-wire workload with enhanced artwork |
| **1.5** | **State, simulation and persistence** | Slim Zustand; `comlink`; circuit CRUD; gate premium actions, imports, copies, restores and server results | `src/store/**`, `src/sim-worker/**`, Hono circuit/scenario routes | Free local sim without login; fresh paid authorization; imported content cannot bypass gates; downgrade preserves documents |
| **1.5A** | **Audit baseline and immediate corrections** | Reproducible fixtures; N30 local gate repair; dependency-advisory verification; device-role/damage fixes; unsupported-model guards; ADR 0008 | Rebuild plan, domain tests, local scripts, catalogue/help text | Findings classified; independent fixtures; targeted checks/build/built-assets tests pass; no hosted CI activation |
| **1.5B** | **Electrical contracts and graph** | Source/device models, result coverage, canonical defaults, shared wire-property resolution, input validation and terminal graph | `packages/domain/**`, circuit-format adapters | Invalid topology cannot pass; deterministic normalization; source/pole/winding isolation; saved IDs and explicit states preserved |
| **1.5C** | **MNA solver and essential behavior** | Supported DC/single-phase models, independent supplies, branch/wire losses, PE and isolated transformers; persisted supply migration, shared compatibility/readiness, confirmed supply edits and safe variants | `packages/domain/src/core`, source/file adapters, stores, palette/inspector/Run | Analytical fixtures, KCL/KVL/power balance; Cancel/Apply/Undo and readiness browser cases; supported results actually used through domain/Comlink/local Hono |
| **1.5D** | **Time, controls and protection** | Coil models, timers, dimming, explicit state/events, bypass, branch-aware device operation, cable/device damage coverage and Fault Lab reset/repair | Domain device models, simulation state/result contract, fault consumers | Replay/reset deterministic; actual pole currents; correct RCCB/RCBO/isolator roles; coherent event/post-event values; no destroyed breaker on ordinary clearing; basic/Pro parity |
| **1.5E** | **Three-phase teaching models** | MNA/phasor extension with real source/phase identity, voltage conventions and supported motor/contactors | Source catalogue, domain models, supply UI, DOL template | Phase loss/sequence and inter-phase faults; balanced model fixtures; no single-live success for a three-phase motor |
| **1.5F** | **Integration and legacy retirement** | All validators, templates, generators, Fault Lab, Diagnosis Lab, stores and exports adopt versioned results and authored edit/repair rules; retire legacy runtime | Domain, app/local Worker consumers, local regression suites | No false repair from supply/variant/deletion edits; versioned replay/scoring; template behavior matrix; local `verify`, simulator acceptance and both stress suites |
| **1.6** | **Matter visuals — complete locally (2026-10-09)** | Sag/snap/overload effects, throttling and offscreen sleep; [continuous delivery plan](../plans/PHASE_1_6_EFFECTS_PLAN.md) | `src/ui/canvas/MatterLayer.tsx` | [Acceptance](../audits/phase-1-visual-effects.md): consolidated gate with focused recovery; electrical parity, reduced-motion and performance checks |
| **1.7** | **Simulator UI and modes — complete locally** | Refine palette/Inspector/commands, density, membership/read-only states, time controls and accessible netlist/diagnostics; retain the essential 1.5C compatibility, cable and confirmation behavior | `src/ui/components/**`, access client state | Guest/paid flows work; keyboard/mobile/restore paths obey policy; unsupported models and prospective versus measured values remain clear |
| **1.8** | **Super-admin membership UI — complete locally** | `/admin/pro` plans/benefits/members/audit; grant, edit, extend, suspend/revoke, archive/delete | admin UI + APIs from 1.3 | Create plan → assign member → unlock → edit → revoke; ordinary admin/org owner denied by API and UI |
| **1.9** | **Verify — complete locally with user-accepted performance exceptions (2026-10-12)** | Full local gate, authorization matrix, expiry/revocation, legacy migration, D1 burst and perf | scripts, local API/browser suites | `bun run verify` plus dedicated Worker API/E2E gates against local Wrangler; all required cases below pass |
| **1.10** | **Accepted simulator redesign — complete locally (2026-10-14)** | User-directed Challenge runtime deferral, complete accepted simulator UI migration and explicitly approved four-file cleanup | `src/ui/**`, UI settings, approved unused wrappers/styles, phase/audit/graph records | [Scoped acceptance](../audits/open-drafting-table-implementation.md), clean post-cleanup types/lint/2,115 units, build/static checks, 18 affected source cases and six built cases; historical Phase 1.9 performance exceptions remain |
| **1.11** | **Fault Lab redesign and Diagnosis retirement — complete locally (2026-10-14)** | Approved target investigation, captured explanation, bounded motion and direct Diagnosis runtime retirement; preserve historical data and shared electrical contracts | Fault Lab UI/display store, Console, approved Diagnosis integration boundaries | [Consolidated and focused recovery evidence](../audits/phase-1-fault-lab-redesign.md): 2,004 units, 138 unique source cases, 8 built cases, 842 Bun/workerd cases, 34 Worker/D1 groups; historical performance exceptions remain |
| **1.12** | **Missing component calculation — complete locally within declared functional scope** | All 30 missing teaching models plus explicit motor/control setup; 1.12.0–7 accepted through combined full-attempt and focused recovery evidence | Versioned laws, shared numerical runtime, schema-3 migration, Inspector, faults and actual source/built consumers; generic assumptions and physics limits stay explicit | [Acceptance and recovery](../audits/phase-1-missing-component-calculation.md), [milestones](../plans/MISSING_COMPONENT_CALCULATION_PLAN.md) and [current 116-entry inventory](../audits/data/phase-1.12-catalogue.json). 2,197 units, 897 runtime cases, 34 local API groups, 207 source and 22 built cases; two intentional built parity skips. Historical performance exceptions remain; GitHub checkpoint separately authorized, no deployment. |
| **1.13** | **UI clarity and Fault Lab reliability — locally functionally complete (2026-10-17); published to GitHub `9ee378a` after explicit authorization** | Combined UI/wire and all-type Fault Lab scope; milestones 1.13.0–8 | Feedback/lifecycle, truthful readiness, target-following cues/Help, shell, model/wire settings and116 reference dispositions | [Local acceptance](../audits/phase-1-ui-fault-lab.md):246 source/76 built/10 shell unique passing cases with documented split/recovery,2224 units, local parity/access and static checks. Dense zoom/solver/generator performance limitations remain explicit; GitHub publication does not imply deployment. |
| **1.14** | **Simulator performance reliability — closed locally (2026-10-22) by explicit owner decision with a hardware/environment-dependent performance exception** | Baseline and bounded solver/grid work complete; functional checks verified. Strict 8 ms p95 and 60 fps/device targets are **not certified** on this shared host; budgets unchanged and all failures retained. Retired Challenge generator remains excluded | 200/396 solver and separate transport; 200/400 SVG interaction and rendering | [Plan](../plans/PHASE_1_14_PERFORMANCE_RELIABILITY_PLAN.md), [handoff](../handoffs/performance-reliability-next-chat.md), [ledger](../audits/phase-1-performance-reliability.md), [baseline](../audits/data/phase114-baseline.json), [execution](../audits/data/phase114-acceptance.json). Retained solver p95 37.41/61.06/41.49 ms; production zoom 316.6 / 216.6 ms. Post-checkpoint changes: 811 affected tests, 897 parity, types/lint. No publication/deployment; Phase 2 remains planned/unauthorized. |

**Phase 1.9 closure (2026-10-12):** the user selected “Close locally with documented exceptions” after functional verification. The [acceptance record](../audits/phase-1-full-verification.md) preserves 2,147 unit passes, 505 development browser passes plus 20 intentional skips, 53 production passes, 36 membership/API groups, 20 simulator groups, 842 runtime parity cases and full generator/Diagnosis invariants. Browser evidence is aggregate. Simulation p95 56.65 ms versus 8 ms, generator timing limits and dense 60 fps remain unmet; no assertion was relaxed to turn these into passes. Local closure does not authorize remote work.

Re-estimate after 1.5A and the first 1.5C vertical slice. The added membership/admin and electrical-core scope is not assumed to fit the original simulator-only estimate.

## 2. Implementation steps and status

| Step | Action | Evidence / gate |
|------|--------|-----------------|
| 1.5A.1 — complete | Turn the reconciled audit cases into a durable regression corpus with independent expected outcomes | Every audit ID has a status, owner and local evidence; known incorrect legacy behavior is not the oracle |
| 1.5A.2 — complete | Repair homepage test/copy drift and verify the current dependency advisories with Bun, including the required Vitest 3.2.7 → 4.1.11 migration | Local built-assets suite; [resolved versions, compatibility fixes and remaining tooling finding](../audits/phase-1-dependencies.md); further dependency review in Phase 8 |
| 1.5A.3 — complete | Correct protection-role/damage reporting and guard unsupported advertised models; retain already-fixed free diagnostics and relay behavior | RCCB is not an MCB; isolator does not auto-trip; ordinary breaker clearing is not destruction; no false success for unsupported models |
| 1.5A.4 — complete | Record ADR 0008, result/model version policy and the declared load-model scope | Staged core replacement, numerical fixtures and legacy migration boundaries are reviewable |
| 1.5B.1 — complete | Introduce versioned source/device/coverage contracts and the terminal compiler behind the domain entry point | Explicit source identities, load approximations, contact/winding isolation and unassessed physics |
| 1.5B.2 — complete | Share bounded input validation, canonical state defaults and wire-property resolution | N13 defaults and N17/invalid-port N26 regressions pass; saved values and wire provenance retained |
| 1.5B.3 — complete | Compile deterministic fault topology and independent conductive domains | Earth short/open/leakage distinctions, pole bypasses, contact disconnection and polarity composition fixtures |
| 1.5B.4 — complete | Verify import/export/undo/restore, runtime parity and local acceptance | [Full passing gate](../audits/phase-1-electrical-contracts.md): 1,645 unit passes plus five owned expected failures, 486 parity cases, 9 Worker/D1 groups and 56 browser cases; strict indexed-access checks for the core |
| 1.5C.0 — complete locally | Extend 1.5B contracts with persisted typed supply migration, capability/rating/load-law inventory, shared compatibility/readiness and ADR 0009's MNA design | [Passing local gate](../audits/phase-1-supply-preflight.md): schema 1/2 persistence, 115 variants, 1,701 unit passes plus five expected failures, 494 parity cases, 9 Worker/D1 groups and 59 browser cases; independent supplies and explicit device ratings preserved |
| 1.5C.1 — complete | Implement the first MNA resistive series/parallel/shared-feeder and independent-source slice | [Passing local gate](../audits/phase-1-mna-solver.md): analytical voltages/currents, KCL/KVL/power balance, floating references, singular/conflicting-source diagnostics and input-order invariance across 1,763 unit passes and 510 runtime parity cases |
| 1.5C.2 — complete locally | Derive operating ranges, fixed-rating load response, wire losses and pole currents; correct effective cable-property consumers | [Passing local gate](../audits/phase-1-load-response.md): full heater sweep, LED/range coverage, finite wire effects, open/independent branches, capacity/units and AWG/mm²/provenance; 1,818 unit passes, 524 parity cases and 4 browser cases |
| 1.5C.3 — complete locally | Add ideal isolated AC transformer coupling, explicit PE/reference relationships and supported fault paths | [Passing local gate](../audits/phase-1-transformers-pe.md): ratios/power/isolation, backfeeding/cascades, explicit bonds/CPC/polarity/PE-return findings and fault limits; 1,878 unit passes, 551 parity cases and 4 browser continuity cases |
| 1.5C.4 — complete locally | Deliver capability-based palette/inspector, confirmed supply edits with notice/Undo, safe variant mappings and shared Run readiness | [Passing local gate](../audits/phase-1-editing-readiness.md): Cancel/Apply/Undo, running/exercise locks, AC/DC/independent supplies, terminal/fault mapping, all readiness states and stale Comlink responses; 1,921 unit passes, 569 parity cases, 9 Worker/D1 groups and 42 browser cases |
| 1.5C.5 — complete locally | Use supported results through direct domain, browser Comlink and local Hono; record a reproducible local phase gate | [Passing local gate](../audits/phase-1-mna-runtime.md): equivalent electrical outputs and coverage in all runtimes; UI models claimed fixed actually use MNA; unsupported 1.5D/E models stay guarded; 2,000 unit passes, 626 parity cases, 10 Worker/D1 groups and 49 browser cases |
| 1.5F.1 — complete locally (2026-10-07) | Complete Fault Lab, validator, instrument/analytics, template and export result migration after 1.5D/E | Every current fault type has applicability and coverage; coherent repair/reset/events; no cached or unassessed pass. [Acceptance](../audits/phase-1-consumer-integration.md): 2,185 unit tests, 821 exact parity cases, 18 Worker/D1 groups and 47 unique browser cases across complete and focused stages. |
| 1.5F.2 — complete locally (2026-10-07) | Migrate basic/advanced Diagnosis Lab evaluation, generation, authorized server attempts and replay | Identification, removal and recovery remain separate; authored devices/connections/ratings and actual operating points checked; generator/model/engine/profile versions pinned; current generation is limited to supported models. [Acceptance](../audits/phase-1-diagnosis-integration.md): 849 exact parity cases, 20 D1 groups and 35 browser cases across comprehensive/focused stages. |

The 1.0–1.3 gates and the 1.4 canvas foundation/measurement gate are recorded complete locally. Phase 1.5 completed shared circuit-file validation, owner/version circuit CRUD, fresh premium-action authorization, server-owned diagnosis results, preserved downgrade/restore work, isolated relay contacts with coil-driven switching, and saved-document continuity across the modal lifecycle. Its historical validation passed 1,546 unit tests, typechecks/lint, the asset build and budgets, real local D1/cookie/browser acceptance, and all 51 selected desktop browser scenarios across the main run and targeted rerun. The final simulator and membership acceptance runs passed 9 and 25 groups respectively; migration 0005 was applied locally. These results are not a full electrical-correctness or current `verify` pass. See [Phase 1.5 evidence and limits](../audits/phase-1-persistence.md) and the [simulator API contract](../api/simulator.md).

**1.5C.0–5 and 1.5D.0–3 are complete locally.** [Damage/repair evidence](../audits/phase-1-damage-repair.md) records the full D.3 Worker/D1/Comlink/browser gate. **1.5E.0–3 phasor foundation, source/application measurements, declared motor/contactor operation and DOL migration are complete locally; [E.3 acceptance](../audits/phase-1-dol-guide.md) records the complete three-phase teaching gate**, followed by full lab migration in 1.5F. The [timed-control acceptance](../audits/phase-1-timed-controls.md) records explicit coil settings, state/events and the completed local checks; the [timer/dimming acceptance](../audits/phase-1-timers-dimming.md) records declared dimming levels, timer programs, events and the D.1 gate; the [timed-protection acceptance](../audits/phase-1-protection.md) closes D.2. The [MNA runtime acceptance](../audits/phase-1-mna-runtime.md) closes the shared supported-result runtime across domain, Comlink and local Hono. The [editing/readiness acceptance](../audits/phase-1-editing-readiness.md) closes the confirmed supply-change workflow, safe variants and shared Run guidance. The [supply/preflight record](../audits/phase-1-supply-preflight.md), [MNA acceptance](../audits/phase-1-mna-solver.md), [load-response acceptance](../audits/phase-1-load-response.md) and [transformer/PE acceptance](../audits/phase-1-transformers-pe.md) retain the earlier persistence, equation and measurement evidence. The application, Comlink worker and local Hono API now use the MNA runtime for supported circuits, with missing models returning unavailable results after removal of the rail fallback. [F.3 closure and retained exceptions](../audits/phase-1-legacy-retirement.md) record the user decision and measured limits. [1.6 visual effects acceptance](../audits/phase-1-visual-effects.md) records completed local delivery; resettable trips do not trigger damage artwork. [1.7 UI and modes](../audits/phase-1-ui-modes.md) are complete locally with consolidated and focused recovery evidence. [1.8 super-admin membership UI](../audits/phase-1-membership-ui.md) is complete locally. [1.9 full local verification](../audits/phase-1-full-verification.md) is complete locally by explicit user decision with documented performance exceptions; the strict full gate is not green. The super-admin interface remains in 1.8 and the full verification matrix in 1.9. Dense interaction performance is not yet 60 fps; see [performance evidence](../PERFORMANCE.md). The [membership API/bootstrap contract](../api/membership.md) and [standards evidence](../audits/phase-1-standards-implementation.md) remain authoritative for those completed sub-phases.

### Exercise and later-phase ownership

| Surface | Phase 1 responsibility | Later scope |
|---|---|---|
| Fault Lab | Capability/coverage and readings in **1.5C**; timed injection/trip/damage/repair in **1.5D**; all entry paths accepted in **1.5F** | State-driven effects **1.6**, layout/discoverability **1.7** |
| Diagnosis Lab | Authored supply/edit constraints during **1.5C** rollout; full basic/advanced operating-point, repair and local server parity in **1.5F** | Comparable scoring **3**, expanded generation/content **4/5**, pinned assessment evidence **6** |
| Shared circuits/results | Persist supply/device/source identity and migrate all saved/worker/export consumers in **1.5C/F** | Assessment freshness and versioned sharing **2**; full local hardening **8** |


## 2A. Phase 1.5D delivery slices — started 2026-10-05

| Step | Scope | Status |
|------|-------|--------|
| **1.5D.0** | Explicit coil settings, deterministic time/state/events, on/off delay, final-topology readings, Run/Stop and runtime parity | Complete locally; [scope and local acceptance](../audits/phase-1-timed-controls.md) |
| **1.5D.1** | Declared dimming response and remaining supported timer behaviors | Complete locally; [scope and local acceptance](../audits/phase-1-timers-dimming.md) |
| **1.5D.2** | Actual-pole timed overload/fuse/residual operation, bypass and event/post-trip values | Complete locally; [scope and local acceptance](../audits/phase-1-protection.md) |
| **1.5D.3** | Explicit cable/device damage coverage and complete Fault Lab reset/repair acceptance | Complete locally; [scope and local acceptance](../audits/phase-1-damage-repair.md) |

D.0–3 close 1.5D within the declared teaching-model scope. Three-phase 1.5E and full lab migration 1.5F still precede effects.

## 2B. Phase 1.5E delivery slices — started 2026-10-06

| Step | Scope | Status |
|------|-------|--------|
| **1.5E.0** | Explicit phase-source compiler contracts, complex RMS resistive MNA, balanced/unbalanced star/delta fixtures, phase loss/L-L faults and guarded scalar consumers | Complete locally; [acceptance across the main gate and focused reruns](../audits/phase-1-phasor-foundation.md). [ADR 0014](../decisions/0014-resistive-three-phase-phasors.md) defines scope and the separate result API. |
| **1.5E.1** | Real source catalogue/artwork, placement, saved canonical terminals, L-N/L-L supply/sequence controls and phasor application measurements | Complete locally; [source/editing/application acceptance](../audits/phase-1-three-phase-source.md) records confirmed edits, persistence, independent supplies and exact direct/Comlink/local-Hono/browser parity |
| **1.5E.2** | Declared motor teaching model, contactor operation, phasor-aware pole/residual measurements and phase loss/sequence diagnostics | Complete locally; [motor/coil/pole acceptance](../audits/phase-1-three-phase-motor.md) records no single-live motor success, deterministic contactor steps, signed complex pole/residual measurements and explicit unassessed mechanical/reactive/transient behavior |
| **1.5E.3** | DOL guide migration and complete local three-phase acceptance | Complete locally (2026-10-07); [DOL and three-phase acceptance](../audits/phase-1-dol-guide.md) records 2,178 unit tests, 800 exact Bun/workerd cases, 17 local Worker/D1 groups and 35 browser cases across the initial gate and focused rerun. |

E.0 provides the numerical foundation. E.1 adds the real five-terminal source, confirmed supply/sequence edits, saved canonical terminals and separate complex application readings. E.2 adds an explicit unity-PF motor teaching equivalent, deterministic AC contactor controls and signed complex pole/residual measurements. E.3 migrates the DOL guide and closes the complete local three-phase teaching gate. **1.5F.1 current consumer migration is complete locally**; [acceptance](../audits/phase-1-consumer-integration.md) records revision/coverage guards, Fault Lab entry paths, instruments/analytics, guide history and exports. **1.5F.2 Diagnosis Lab grading, supported generation and replay are complete locally**; [acceptance](../audits/phase-1-diagnosis-integration.md) records authored repair constraints and versioned evidence. **F.3 is finished with user-accepted performance exceptions; [F.3 evidence](../audits/phase-1-legacy-retirement.md) records failed timing limits, aggregate browser coverage and the absence of a full green gate. [1.6 visual effects](../audits/phase-1-visual-effects.md) are complete locally. [1.7 UI and modes](../audits/phase-1-ui-modes.md) are complete locally with consolidated and focused recovery evidence. [1.8 super-admin membership UI](../audits/phase-1-membership-ui.md) is complete locally. [1.9 full local verification](../audits/phase-1-full-verification.md) is complete locally by explicit user decision with documented performance exceptions; the strict full gate is not green.**

## 3. Membership acceptance scenarios

- Guest/free users build a basic circuit, inject one basic fault, trace it and complete a basic diagnosis without payment.
- A paid member uses Pro components, advanced injection, advanced diagnosis; identical authorized scenarios produce identical electrical results.
- Super admin creates, edits and removes plans/grants. Membership removal revokes access while preserving audit; referenced-plan removal archives without erasing grants or circuits.
- Browser settings, forged payloads, direct URLs, imported/pasted components, shared seeds and resumed IndexedDB sessions cannot grant server-authorized paid access.
- Expiry/logout/suspension/revocation and plan capability edits apply on the next protected action, independently of stale public config caches.
- Downgrade preserves premium documents read-only and permits raw backup and a user-created basic copy. It never silently deletes components or suppresses known hazards.
- Naturally miswired free circuits still receive multiple safety findings. The paid multi-fault limit applies to deliberate exercises/injection.
- No payment provider is needed for the Phase 1 flow; unimplemented benefits are not advertised.

## 4. Verification and risks

- **Initial JavaScript allowance (2026-10-06):** the user approved **300,000 bytes gzip**, up from 250,000, for the default app entry scripts. Optional features continue loading on demand. Other asset limits and dense interaction/solver targets retain their existing values; historical measurements below retain their original budgets. See [performance guidance](../PERFORMANCE.md).
- **Current 1.5D.3 acceptance:** `bun run verify:phase-1.5d3` passed end to end: all type/lint/build/asset checks, **2,084 unit tests**, the bounded MNA benchmark, **705 Bun/workerd parity cases**, **15 actual local Worker/D1/session groups** and **63 Chromium cases**. The [acceptance record](../audits/phase-1-damage-repair.md) covers declared damage, saved failures, distinct fuse operation and shared desktop/phone clear/reset/replacement controls, with unchanged dense-solver limits. This closes D.3 locally; 1.5E/F and the wider `verify`/stress/rendering gates remain open.
- **Previous 1.5D.2 acceptance:** `bun run verify:phase-1.5d2` passed end to end, including type/lint/build/asset checks, 2,054 unit passes, the bounded MNA benchmark, 675 local domain parity cases, 13 real Worker/D1/session groups and 59 Chromium cases. The [acceptance record](../audits/phase-1-protection.md) records the exact run boundary, evidence and unchanged dense-solver limitation. That historical gate closed D.2 only; the current D.3 acceptance is recorded above.
- **Previous 1.5D.1 acceptance:** `bun run verify:phase-1.5d1` passed end to end, including type/lint/build/asset checks, 2,045 unit passes, the bounded MNA benchmark, 666 local domain parity cases, 12 real Worker/D1/session groups and 56 Chromium cases. The [acceptance record](../audits/phase-1-timers-dimming.md) records the exact run boundary, evidence and unchanged dense-solver limitation. That historical gate closed D.1 only; the later D.2–3 acceptance is recorded above.
- **Previous 1.5D.0 acceptance:** required `bun run verify:phase-1.5d0` checks passed across the main run and a focused rerun after correcting an old model-version assertion: type/lint/build/asset checks, 2,020 unit passes, 631 local domain parity cases, 11 real Worker/D1/session groups and 52 Chromium cases. Built desktop/phone settings and readings also passed inspection. The [acceptance record](../audits/phase-1-timed-controls.md#local-acceptance) records the exact run boundary, evidence and unchanged dense-solver limitation. That historical gate closed D.0 only; the later D.1–3 acceptance is recorded above.
- **Previous 1.5C.5 acceptance:** `bun run verify:phase-1.5c5` passed end to end, including type/lint/build/asset checks, 2,000 unit passes, the bounded MNA benchmark, 626 local domain parity cases, 10 real Worker/D1/session simulator groups and 49 browser cases. The [acceptance record](../audits/phase-1-mna-runtime.md#local-acceptance) records measurements; the prior [1.5C.4](../audits/phase-1-editing-readiness.md#local-acceptance), [1.5C.3](../audits/phase-1-transformers-pe.md#local-acceptance), [1.5C.2](../audits/phase-1-load-response.md#local-acceptance), [1.5C.1](../audits/phase-1-mna-solver.md#local-acceptance) and [1.5C.0](../audits/phase-1-supply-preflight.md#local-acceptance) records retain their historical gates.
- This behavior-planning revision ran **42 local probe observations** and **4 existing test files: 145 passes plus 5 expected failures**. It did not run a fresh build/browser/Worker gate or implement MNA. [Evidence and limits](../audits/phase-1-behavior-review.md#1-evidence-and-interpretation) are separate from the historical 1.5B acceptance.
- Current `e2e:production` defaults to `scripts/preview-server.mjs`; it checks built assets, not membership authorization. Preserve the separate real local Worker/D1/session suites delivered in 1.5 (`test:membership` and `test:simulator`). All URLs stay pinned to localhost and local state.
- Preserve `bun run verify` (including Worker membership acceptance) and the dedicated simulator acceptance. Add the independent engine fixtures and run both stress commands at 1.5F/1.9. Old test counts and parity with incorrect legacy results are not acceptance criteria. The 2026-09-30 single homepage case reproduced N30; full `verify` was not rerun in this planning review.
- Browser simulation code can be modified by its owner. UI gates cover supported flows; Hono protects server actions, premium content delivery and accepted results. Basic offline use remains; Phase 1 premium actions require online validation, without a tamper-proof offline licensing claim.
- `appMode` electrical parity was observed for the reproduced overload and existing relay cases; preserve it across the replacement engine. Audit stale comments/help text separately from actual behavior. Access, presentation and exercise answer narration must not change electrical truth.
- Publisher summaries do not verify every numerical rule. Mark unsupported national rules, earthing arrangements and device models explicitly.
- D1 authorization needs fresh primary reads and atomic conditional writes where needed; a 60-second public cache cannot extend revoked access. See the membership plan and §33.
- No remote deployment, checkout activation or production membership migration is part of this planning update.
- No hosted CI/test runs under the current local-only rule. Prepare reproducible local gates now; activation of hosted CI needs an explicit change to that rule. Never add live Cloudflare credentials to tests or workflows.

## 5. Phase 1.5 relay correction (2026-09-28)

The user-reported relay bug reproduced in the V3 solver: same-rail traversal joined coil, COM, NO and NC, and coil supply did not operate contacts. Corrected in 1.5 before effects work: isolated poles, exclusive NO/NC selection, automatic coil operation/dropout, derived visual state and regression tests. Canonical saved terminal indices are preserved. SPST/SPDT remain free; DPDT/industrial control relays remain Pro, as confirmed by the user. See [reproduction and limitations](../audits/phase-1-relay-regression.md) and [simulator API contract](../api/simulator.md).

## 6. Phase 1.10 — accepted simulator redesign (2026-10-13)

The user accepted the complete Open Drafting Table design and authorised actual
implementation before Community work. They explicitly required Challenge Mode
runtime removal first, preserving its plans/docs for a later-stage rebuild.
The [retirement audit](../audits/challenge-mode-retirement.md) records this direct
instruction and current local validation. The
[implementation plan](../plans/OPEN_DRAFTING_TABLE_IMPLEMENTATION_PLAN.md) defines
the complete simulator UI migration and checks.

Status on 2026-10-14: Challenge Mode retirement and the accepted production UI
migration are complete locally within their documented scopes. The
[redesign audit](../audits/open-drafting-table-implementation.md) records 2,115
units, 63 core UI and 90 consumer assertions, clean bounded source/built recovery,
20 actual Worker/D1/session groups, source/built assets and the two long outer-shell
teardown signals. This is not a renewed full-green Phase 1.9 performance gate.
The [four-file cleanup](../design/open-drafting-table/CLEANUP_REVIEW.md) was
explicitly approved by the user on 2026-10-14 and applied exactly as reviewed;
all post-deletion type/lint/2,115 unit, build/static, 18 affected source-browser,
six built-browser and five graph implementation tests passed with clean command
exit 0. **Phase 1.10 is complete locally, including the approved cleanup.**
Phase 1.9 closure and performance exceptions remain unchanged; no Community phase
or remote action starts here.

## 7. Phase 1.11 — Fault Lab redesign and Diagnosis retirement (2026-10-14)

**Status: complete locally after explicit user design approval.** After the
Phase 1.10 checkpoint (`fa74721`), the user reviewed and approved the Fault Lab
plan/prototype and instructed implementation. The replacement passed scoped
local acceptance before the approved direct Diagnosis runtime was retired.
See the [Phase 1.11 plan](../plans/FAULT_LAB_REDESIGN_PLAN.md),
[clickable design](../design/fault-lab/index.html), [screen inventory](../design/fault-lab/SCREENS.md),
and [concrete Diagnosis retirement review](../design/fault-lab/DIAGNOSIS_RETIREMENT_REVIEW.md).

The redesigned modeless workspace uses real targets, the full 14-type fault
library, reviewed edits, detached fresh captures, Explain/Readings/Repair,
bounded visual-only motion and independent Console navigation. Cause clear,
protection reset/ON and damage replacement remain separate. Diagnosis runtime
entry points and grading/persistence/API services are retired; historical
browser/D1 records, schema/migrations, grants and Challenge plans remain.
Shared electrical simulation, faults, protection and damage remain authoritative.

[Acceptance](../audits/phase-1-fault-lab-redesign.md) records the exact 2,115 →
2,004 unit reconciliation, 138 unique source-browser cases, 8 built cases,
842 actual Bun/workerd parity cases and 34 local Worker/D1/cookie groups, with
passing types/lint/build/assets/links/SEO/CSP and scoped failure recovery.
This is aggregate functional acceptance. Phase 1.9 solver/generator/dense-render
performance exceptions remain unchanged. No commit, push or deployment occurred.

## 8. Phase 1.13 — UI clarity and Fault Lab reliability (locally functionally complete 2026-10-17)

The user requested a single next-phase plan from both the workspace UI/wire review
and the all-type Fault Lab investigation. The
[combined execution plan](../plans/PHASE_1_13_UI_FAULT_LAB_PLAN.md) owns the issue
register, contracts and acceptance criteria. The
[handoff](../handoffs/ui-fault-lab-next-chat.md) resumes from the existing reviews
and previews; the [tracker](../audits/phase-1-ui-fault-lab.md) separates planning
checks from implementation acceptance.

| Milestone | Scope | Current status |
| --- | --- | --- |
| **1.13.0** | Visual decisions, reproducible regressions/baseline, issue/check mapping and stage runner | Complete locally; baseline, decisions and runner recorded |
| **1.13.1** | Shared notifications, task outcomes, Undo and Console retention | Complete locally; combined source/built evidence and limits in tracker |
| **1.13.2** | All-14 Applied/duplicate/multi-cause state, diagnostic Run and first-click Lab return | Complete locally; combined source/built evidence and limits in tracker |
| **1.13.3** | Source/readiness/validation correctness and truthful Circuit checks | Complete locally; combined source/built evidence and limits in tracker |
| **1.13.4** | Exact fault geometry, meaningful bounded cues and six-row Help | Complete locally; combined source/built evidence and limits in tracker |
| **1.13.5** | Approved header/shelf fidelity, relocated Circuit controls and responsive hierarchy | Complete locally; combined source/built evidence and limits in tracker |
| **1.13.6** | Sectioned component models, Specs placement, dialog rotation removal and wire summaries | Complete locally; combined source/built evidence and limits in tracker |
| **1.13.7** | Reason-specific unknown ratings and all-116 catalogue/reference reconciliation | Complete locally; combined source/built evidence and limits in tracker |
| **1.13.8** | Integrated local functional/static/source/built/access and affected runtime/performance acceptance | Local functional acceptance complete; recovery/performance limits explicit |

Local acceptance is bounded by the tracker and its retained limitations. Preserve valid zero-current
open-circuit diagnostics, explicit unsupported fault effects and genuine missing
ratings. Retain separate cause clearing, protection reset/ON and damage repair.
No new electrical law, guessed rating, solver rewrite or remote operation is
authorized by this plan. Phase 1.12 functional closure and historical performance
exceptions remain unchanged.
