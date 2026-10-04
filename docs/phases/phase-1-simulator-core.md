# Phase 1 — Simulator Core (Lab Circuit Heart)

> **Status:** IMPLEMENTING — 1.0 inventory and local-only isolation completed 2026-09-26; 1.1 standards corrections completed; 1.2 domain extraction completed; 1.3 memberships/roles completed locally on 2026-09-27; 1.4 canvas foundation implemented locally (dense 60 fps target remains open); 1.5 state/persistence, membership enforcement and relay switching completed locally on 2026-09-29 within their documented scope. **Updated 2026-10-04: 1.5A, 1.5B and 1.5C.0–5 are complete locally. The first 1.5D.1 time/protection foundation is now implemented locally: explicit deterministic state/step/replay, scheduled controls, dimming, coil pickup, branch-aware MCB/RCD/RCBO/AFDD/fuse operation, cable damage events and post-event re-solves. Full 1.5D acceptance, lab/Comlink integration and 1.5D–1.5F still precede 1.6 effects.** Broader simulator/admin UI remains in 1.7/1.8. See [Phase 1.5C.5 acceptance](../audits/phase-1-mna-runtime.md), [Phase 1.5C.4 acceptance](../audits/phase-1-editing-readiness.md), [Phase 1.5C.3 acceptance](../audits/phase-1-transformers-pe.md), [Phase 1.5C.2 acceptance](../audits/phase-1-load-response.md), [Phase 1.5C.1 acceptance](../audits/phase-1-mna-solver.md), [Phase 1.5C.0 acceptance](../audits/phase-1-supply-preflight.md), the [behavior audit](../audits/phase-1-behavior-review.md) and the [core rebuild plan](../plans/SIMULATOR_CORE_REBUILD_PLAN.md).
> **Method:** Sub-phase → Steps → Gate. Each implementation sub-phase ships as its own scoped commit. All development is local-only: the old live-account credentials were removed locally; a new account will be configured after development. Passing a gate never authorizes remote access (see root `AGENTS.md`).
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
| Advanced Diagnosis Lab and all Ohmageddon tiers | Preview; use requires membership | Yes |
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
- Fault Lab, Diagnosis Lab and Ohmageddon consume the same engine. Preserve free basic diagnosis and paid advanced access. Existing identification/repair, structure and server-authorization safeguards remain; add model-aware operating results and authored supply/edit constraints so changing voltage or deleting a load cannot earn a repair success.

Essential correctness interactions ship with **1.5C**, not after the numerical core in the broader 1.7 redesign. Existing labs complete migration in **1.5F**; later game/procedural phases expand their scope.

## 1. Revised sub-phase map

This replaces the previous 1.0–1.7 sequence. Membership foundations precede persistence; **1.5A–1.5F** now precede effects without renumbering the existing UI/admin work. The final local gate remains **1.9**.

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
| **1.5F** | **Integration and legacy retirement** | All validators, templates, generators, Fault Lab, Diagnosis Lab, Ohmageddon, stores and exports adopt versioned results and authored edit/repair rules; retire legacy runtime | Domain, app/local Worker consumers, local regression suites | No false repair from supply/variant/deletion edits; versioned replay/scoring; template behavior matrix; local `verify`, simulator acceptance and all three stress suites |
| **1.6** | **Matter visuals** | Sag/snap/overload effects, throttling and offscreen sleep | planned `src/ui/canvas/MatterLayer.tsx` | Same electrical output with effects on/off; reduced-motion and perf checks |
| **1.7** | **Simulator UI and modes** | Refine palette/Inspector/commands, density, membership/read-only states, time controls and accessible netlist/diagnostics; retain the essential 1.5C compatibility, cable and confirmation behavior | `src/ui/components/**`, access client state | Guest/paid flows work; keyboard/mobile/restore paths obey policy; unsupported models and prospective versus measured values remain clear |
| **1.8** | **Super-admin membership UI** | `/admin/pro` plans/benefits/members/audit; grant, edit, extend, suspend/revoke, archive/delete | admin UI + APIs from 1.3 | Create plan → assign member → unlock → edit → revoke; ordinary admin/org owner denied by API and UI |
| **1.9** | **Verify** | Full local gate, authorization matrix, expiry/revocation, legacy migration, D1 burst and perf | scripts, local API/browser suites | `bun run verify` plus dedicated Worker API/E2E gates against local Wrangler; all required cases below pass |

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
| 1.5D.1 — implemented locally | Add explicit time state/step/replay, scheduled controls, bounded dimming, coil pickup, branch-aware protection, cable exposure and post-event re-solving | [Foundation record](../audits/phase-1-time-protection.md): deterministic snapshots/events; actual pole currents; resettable breaker versus destructive fuse; RCCB role separation; opened cable re-solve |
| 1.5D.2 — planned | Add authorized Fault Lab repair/reset, stronger pickup/dropout/coordination fixtures and route time/events through application adapters | Full 1.5D gate: repair cannot hide an active fault; coordination limits are explicit; basic/Pro parity; Comlink/local Hono/browser equivalence |
| 1.5F.1 — planned | Complete Fault Lab, validator, instrument/analytics, template and export result migration after 1.5D/E | Every current fault type has applicability and coverage; coherent repair/reset/events; no cached or unassessed pass |
| 1.5F.2 — planned | Migrate basic/advanced Diagnosis Lab and Ohmageddon evaluation, generation, authorized server attempts and replay | Identification and repair remain separate; intended operating points/edit constraints and versions checked; compound/partial/full recovery proven |
| 1.5F.3 — planned | Retire legacy numerical runtime after independent fixtures, reviewed differences and full local integration gates | `verify`, `test:simulator`, `stress:generator`, `stress:diagnosis`, `stress:ohmageddon`; separate solver/serialization/renderer measurements |

The 1.0–1.3 gates and the 1.4 canvas foundation/measurement gate are recorded complete locally. Phase 1.5 completed shared circuit-file validation, owner/version circuit CRUD, fresh premium-action authorization, server-owned diagnosis results, preserved downgrade/restore work, isolated relay contacts with coil-driven switching, and saved-document continuity across the modal lifecycle. Its historical validation passed 1,546 unit tests, typechecks/lint, the asset build and budgets, real local D1/cookie/browser acceptance, and all 51 selected desktop browser scenarios across the main run and targeted rerun. The final simulator and membership acceptance runs passed 9 and 25 groups respectively; migration 0005 was applied locally. These results are not a full electrical-correctness or current `verify` pass. See [Phase 1.5 evidence and limits](../audits/phase-1-persistence.md) and the [simulator API contract](../api/simulator.md).

**1.5C.0–5 are complete locally and 1.5D.1's explicit time/protection foundation is implemented locally.** Next is **1.5D.2**, followed by 1.5E–1.5F. The [MNA runtime acceptance](../audits/phase-1-mna-runtime.md) closes the shared supported-result runtime across domain, Comlink and local Hono. The [editing/readiness acceptance](../audits/phase-1-editing-readiness.md) closes the confirmed supply-change workflow, safe variants and shared Run guidance. The [supply/preflight record](../audits/phase-1-supply-preflight.md), [MNA acceptance](../audits/phase-1-mna-solver.md), [load-response acceptance](../audits/phase-1-load-response.md) and [transformer/PE acceptance](../audits/phase-1-transformers-pe.md) retain the earlier persistence, equation and measurement evidence. The application, Comlink worker and local Hono API now use the MNA runtime for supported circuits, with guarded legacy observation retained only for unmigrated models. Effects resume in 1.6 after corrected electrical results are integrated; a resettable protection trip must not trigger destruction artwork. The broader interface/admin work remains in 1.7/1.8 and the full verification matrix in 1.9. Dense interaction performance is not yet 60 fps; see [performance evidence](../PERFORMANCE.md). The [membership API/bootstrap contract](../api/membership.md) and [standards evidence](../audits/phase-1-standards-implementation.md) remain authoritative for those completed sub-phases.

### Exercise and later-phase ownership

| Surface | Phase 1 responsibility | Later scope |
|---|---|---|
| Fault Lab | Capability/coverage and readings in **1.5C**; timed injection/trip/damage/repair in **1.5D**; all entry paths accepted in **1.5F** | State-driven effects **1.6**, layout/discoverability **1.7** |
| Diagnosis Lab | Authored supply/edit constraints during **1.5C** rollout; full basic/advanced operating-point, repair and local server parity in **1.5F** | Comparable scoring **3**, expanded generation/content **4/5**, pinned assessment evidence **6** |
| Ohmageddon | Only supported models during rollout; time/phase prerequisites **1.5D/E**; compound/masked faults, recovery, replay/model versions and grading in **1.5F** | New tiers/content/generation **3–5**, not deferred correctness for existing scenarios |
| Shared circuits/results | Persist supply/device/source identity and migrate all saved/worker/export consumers in **1.5C/F** | Assessment freshness and versioned sharing **2**; full local hardening **8** |

The [audit's consumer map](../audits/phase-1-behavior-review.md#5-fault-lab-diagnosis-lab-and-ohmageddon) names the actual modules, existing safeguards and acceptance cases. Unsupported physics never earns exercise success; naturally occurring safety findings stay visible independently of paid access or concealed answers.

## 3. Membership acceptance scenarios

- Guest/free users build a basic circuit, inject one basic fault, trace it and complete a basic diagnosis without payment.
- A paid member uses Pro components, advanced injection, advanced diagnosis and Ohmageddon; identical authorized scenarios produce identical electrical results.
- Super admin creates, edits and removes plans/grants. Membership removal revokes access while preserving audit; referenced-plan removal archives without erasing grants or circuits.
- Browser settings, forged payloads, direct URLs, imported/pasted components, shared seeds and resumed IndexedDB sessions cannot grant server-authorized paid access.
- Expiry/logout/suspension/revocation and plan capability edits apply on the next protected action, independently of stale public config caches.
- Downgrade preserves premium documents read-only and permits raw backup and a user-created basic copy. It never silently deletes components or suppresses known hazards.
- Naturally miswired free circuits still receive multiple safety findings. The paid multi-fault limit applies to deliberate exercises/injection.
- No payment provider is needed for the Phase 1 flow; unimplemented benefits are not advertised.

## 4. Verification and risks

- **Current 1.5C.5 acceptance:** `bun run verify:phase-1.5c5` passed end to end, including type/lint/build/asset checks, 2,000 unit passes, the bounded MNA benchmark, 626 local domain parity cases, 10 real Worker/D1/session simulator groups and 49 browser cases. The [acceptance record](../audits/phase-1-mna-runtime.md#local-acceptance) records measurements; the prior [1.5C.4](../audits/phase-1-editing-readiness.md#local-acceptance), [1.5C.3](../audits/phase-1-transformers-pe.md#local-acceptance), [1.5C.2](../audits/phase-1-load-response.md#local-acceptance), [1.5C.1](../audits/phase-1-mna-solver.md#local-acceptance) and [1.5C.0](../audits/phase-1-supply-preflight.md#local-acceptance) records retain their historical gates. This does not close 1.5D–1.5F or the wider `verify`/stress/rendering gates.
- This behavior-planning revision ran **42 local probe observations** and **4 existing test files: 145 passes plus 5 expected failures**. It did not run a fresh build/browser/Worker gate or implement MNA. [Evidence and limits](../audits/phase-1-behavior-review.md#1-evidence-and-interpretation) are separate from the historical 1.5B acceptance.
- Current `e2e:production` defaults to `scripts/preview-server.mjs`; it checks built assets, not membership authorization. Preserve the separate real local Worker/D1/session suites delivered in 1.5 (`test:membership` and `test:simulator`). All URLs stay pinned to localhost and local state.
- Preserve `bun run verify` (including Worker membership acceptance) and the dedicated simulator acceptance. Add the independent engine fixtures and run all three stress commands at 1.5F/1.9. Old test counts and parity with incorrect legacy results are not acceptance criteria. The 2026-09-30 single homepage case reproduced N30; full `verify` was not rerun in this planning review.
- Browser simulation code can be modified by its owner. UI gates cover supported flows; Hono protects server actions, premium content delivery and accepted results. Basic offline use remains; Phase 1 premium actions require online validation, without a tamper-proof offline licensing claim.
- `appMode` electrical parity was observed for the reproduced overload and existing relay cases; preserve it across the replacement engine. Audit stale comments/help text separately from actual behavior. Access, presentation and exercise answer narration must not change electrical truth.
- Publisher summaries do not verify every numerical rule. Mark unsupported national rules, earthing arrangements and device models explicitly.
- D1 authorization needs fresh primary reads and atomic conditional writes where needed; a 60-second public cache cannot extend revoked access. See the membership plan and §33.
- No remote deployment, checkout activation or production membership migration is part of this planning update.
- No hosted CI/test runs under the current local-only rule. Prepare reproducible local gates now; activation of hosted CI needs an explicit change to that rule. Never add live Cloudflare credentials to tests or workflows.

## 5. Phase 1.5 relay correction (2026-09-28)

The user-reported relay bug reproduced in the V3 solver: same-rail traversal joined coil, COM, NO and NC, and coil supply did not operate contacts. Corrected in 1.5 before effects work: isolated poles, exclusive NO/NC selection, automatic coil operation/dropout, derived visual state and regression tests. Canonical saved terminal indices are preserved. SPST/SPDT remain free; DPDT/industrial control relays remain Pro, as confirmed by the user. See [reproduction and limitations](../audits/phase-1-relay-regression.md) and [simulator API contract](../api/simulator.md).
