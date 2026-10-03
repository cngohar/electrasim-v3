# Simulator behavior — compatibility, editing, readiness and electrical feedback

Updated: 2026-10-03. Status: **1.5C.0–4 complete locally; 1.5C.5 application runtime integration is next**. [Editing/readiness acceptance](../audits/phase-1-editing-readiness.md) records the latest passing local gate; earlier numerical and persisted-contract evidence is linked in the delivery table below. Applies to [Phase 1.5C–1.5F](../phases/phase-1-simulator-core.md) and the later UI/effects gates. The [behavior review](../audits/phase-1-behavior-review.md) records the pre-implementation findings; [ADR 0009](../decisions/0009-mna-solver.md) selects Modified Nodal Analysis (MNA).

This extends the [core rebuild plan](SIMULATOR_CORE_REBUILD_PLAN.md). Essential compatibility controls, supply-change confirmation, truthful measurements and run readiness belong to the electrical-core milestones. They must not be deferred wholesale to 1.7's interface redesign. Keep the existing editor and rebuild the electrical computation and its consumers in stages.

## 1. One source of electrical truth

Use pure domain functions for device capabilities, compatibility, readiness and diagnostics. The palette, inspector, connection guidance, Run action, validator, worker/server paths and exercise evaluators consume these contracts. UI filtering is guidance; direct imports and simulation must still validate the actual document.

Extend the accepted 1.5B contracts, compiler and shared wire resolver. **1.5C.0 now persists typed supplies in schema 2**, inventories 115 component variants and exposes shared terminal-group compatibility/readiness. Save/import/undo, Comlink and local server boundaries preserve the profiles. Their resistive load models do not yet drive runtime telemetry, and the complete palette/inspector/Run and confirmed editing workflow remains pending. The [acceptance record](../audits/phase-1-supply-preflight.md) separates these working foundations from unfinished numerical and consumer behavior.

Keep these concepts separate:

| Concept | Required meaning |
|---|---|
| Source profile | Stable source/domain identity, DC or AC, voltage convention, AC frequency and supported phase arrangement/sequence. A global selection configures a named document supply/default, not every independent source. |
| Device design rating | Nominal voltage and power, supported supply kinds and frequencies, terminals/poles and declared operating range. A source edit does not re-rate a device. |
| Limits | Maximum withstand/operating voltage, current capacity, coil pickup/dropout, driver limits and damage assumptions are distinct, with provenance and unknown states. |
| Load law | Explicit fixed resistance, supported driver approximation, coil model or another documented law. A `powerWatts` label alone does not select a constant-power or resistive model. |
| Cable properties | Effective size, length, material, installation method and derating from the shared resolver, including value provenance. Capacity is not the current flowing. |
| Runtime result | Solved node/branch measurements, device state/events, readiness and per-aspect coverage for the current document revision. Missing measurements are not fabricated zeroes or default ratings. |
| Assessment | A limited teaching check, model coverage and jurisdiction/standards applicability; none is automatically a certificate of safety. |

- Persist typed source settings through an explicit format migration. Preserve schema-1 IDs, terminals and the documented legacy assumptions; `globalVoltage` alone cannot encode AC/DC, phase or frequency. Standards-view changes do not silently reconfigure saved supplies.
- Catalogue all component variants by explicit capability. Unknown ratings remain unknown or are clearly declared, versioned teaching assumptions. Remove substring inference such as `includes('ac')`, `includes('cell')` and the use of `isSource` to infer battery chemistry.
- Compatibility uses the relevant terminal group/domain and actual terminal voltage when solved. A relay coil and its isolated contacts, or a transformer's two windings, can have different ratings and supplies.
- Return structured reasons for incompatible supply kind, undervoltage/underpowered operation, overvoltage, frequency/phase mismatch, missing return, unsupported model and unknown rating. Keep structural validity, physical hazards and model coverage distinct.
- No generic 250 V destruction limit, universal 110/230 V buckets, fixed 20 A telemetry fallback or fabricated 0.05 Ω measurement. An unknown rating cannot produce a claimed physical explosion.
- Electrical truth and basic hazard reporting remain the same for guests, free accounts, paid members and presentation modes. Membership governs authorized features, not equations or diagnostic accuracy.

## 2. Supply changes with a circuit already present

The user explicitly requires confirmation/notification for this operation. **Use a confirmation dialog before changing a populated circuit and a notification with Undo after applying it. A toast alone is not confirmation.**

1. Open the supply editor and choose a candidate source profile. Show which supply/domain is being changed. Stage all numeric/type/frequency edits; typing into a field must not partially mutate the live circuit.
2. Compute an impact preview against the current document: old/new supply, affected source aliases, incompatible/unknown devices, ratings, isolated domains and any source/terminal mapping needed. In a nonempty drawing, show confirmation even when the impact count is zero. Choosing the identical profile is a no-op.
3. Present an accessible dialog with **Cancel** and **Apply supply change**, an affected-parts list and clear consequences. Escape cancels and focus returns to the triggering control. If the document changes while the dialog is open, refresh the preview before allowing confirmation.
4. Apply one undoable transaction. Preserve placed components, wire endpoints/routes, IDs, explicit device ratings, unrelated independent supplies and existing faults. Never delete incompatible parts, silently replace devices, rewrite all batteries or use the first arbitrary component as a voltage holder.
5. Invalidate old simulation/validation/analytics results and obsolete pending worker responses. Preserve genuine trip/damage state; changing voltage is not Repair. Stay stopped after configuration changes. Source/variant configuration stays locked while running, consistently across all controls and mutation entry points; supported runtime switches remain operable.
6. Update palette/inspector guidance and show a notification such as “Supply changed from 12 V DC to 230 V AC. 3 components need review,” with **Review** and **Undo**. Counts and messages come from the actual impact report. Findings remain in a persistent panel after the notification disappears. Undo/redo restores the transaction coherently and cannot undo an unrelated later edit by mistake.
7. On Run, assess the new document. A structurally valid mismatch may be simulated as a fault/underpowered teaching case where the model supports it, with explicit findings and no false healthy/pass state. Unsupported calculations return not-assessed; they do not reuse legacy values. Invalid topology or contradictory ideal constraints block solving with an actionable reason.

For an empty drawing, changing its new-component supply default can apply directly with a notification. A 12 V device already placed in a circuit keeps its 12 V rating when the source becomes 230 V. A 230 V heater supplied at 12 V is underpowered under its declared resistive model; it does not silently become a 2 kW / 12 V heater.

AC/DC and phase changes are more than a magnitude edit. If the source interface requires a replacement or terminal mapping, preview that separately and require an unambiguous supported mapping. Preserve PE's role; never turn it into DC negative or silently relabel one live terminal as three phases. Keep unsupported source arrangements unavailable with an explanation until their phase gate passes.

## 3. Conditional palette, inspector and variants

- Default placement/search/recent/command/context-menu suggestions to components compatible with the selected supply/domain. Use the same service everywhere. Clearly identify incompatible and unassessed options in an explicit **Show all / fault exercise** view; retain entitlement restrictions separately.
- Keep independent-source and converter creation discoverable. A 230 V circuit may legitimately contain an isolated 12 V control circuit; adding that source or transformer must remain possible. Filter by the active domain and terminal role, not one canvas-wide voltage number.
- Never hide or remove already placed incompatible devices. Mark them on the canvas and in the inspector with the relevant rating, applied supply and corrective options. Imported/pasted/restored documents keep their contents and receive the same findings before simulation.
- Do not reject equipment solely because its maximum rating is higher than the supply. A withstand rating is not a required operating voltage. Conversely, an AC contact rating does not establish DC breaking capability; require the appropriate declared rating or mark it unknown.
- Battery chemistry appears only for a modeled battery. AC mains, Live/Neutral/PE terminals, earth rods, photocells and generic loads do not receive battery controls. PE has no adjustable source-voltage or power-generation controls. If battery discharge/chemistry behavior is unmodeled, say so.
- Show source output settings only on sources, load design parameters only on applicable loads, coil ratings on coils, and separate pole/protection properties where relevant. Source controls use the same staged change flow as the toolbar. A space heater must not gain a Supply Voltage editor because its type contains `ac`.
- Separate editable nameplate/design settings from read-only measured values. Display voltage **across specified terminals**, conductor potential relative to a named reference, actual current and power, and coverage. Labels/artwork/analytics must use these meanings consistently.
- Replacing a variant compares electrical capabilities, meaningful settings and terminal roles before committing. Preserve wires only through an explicit compatible mapping; reject or preview ambiguous mappings. A two-port MCB and four-port RCCB are not interchangeable by saved port index. Preserve IDs/history and make every affected connection reviewable.
- Reset or retain overrides by documented field meaning. Do not carry stale `customVoltage`, maximum ratings, coil settings or trip state blindly into a different device. An intended physical replacement and a cosmetic appearance change are separate actions.
- Verify changes where behavior should differ: different resistances/wattages, coil voltage, dimming level and protection characteristics. Equal-looking results are legitimate when the electrical properties and operating condition are equivalent; B and C breakers need not differ under a healthy small load.

## 4. Run readiness and incomplete circuits

Run readiness must be a shared domain result shown before/after every Run entry point, including shortcuts and worker/server callers. Do not depend on the learner manually pressing Validate, component ID strings or a cached report. Do not require every diagnostic experiment to be a closed circuit.

| Circuit state | Required behavior |
|---|---|
| Empty canvas | Disable ordinary Run with an accessible “Add a source and components” explanation; direct engine calls return an empty/no-circuit result, never operational success. |
| Live + Neutral only, no wires/load | Explain “No complete load path; connect a load and return.” Do not silently enter a normal-running state. Any explicit no-load measurement workflow is labeled as such. |
| Load with no source | Identify missing supply; zero delivered power, no successful operation claim. |
| Open return or switch | Allow an explicit diagnostic run where supported. Report the open/no-current condition and distinguish live conductor potential from zero branch current. An intentional off switch is not automatically a wiring mistake. |
| One working branch and one open branch | Solve the working branch, give the open branch zero current, and identify partial operation. Never copy the working branch's current into the dangling conductor. |
| Pure supply short | Treat as a short with declared impedance/current coverage; “no load” must not hide the fault. |
| Invalid port/source constraints | Block with entity-linked errors and preserve the document for repair. |
| Unassessed device/domain | Show what is unsupported and which results are unavailable. Independently verified islands may be reported separately; do not assess an island with unknown connected load behavior. |

Readiness, calculation/convergence, operating state and standards assessment are separate fields. `faultsCleared` or an empty error array alone must not mean the circuit is complete, working or safe. The status bar must not label every warning “Open Circuit” or show “Healthy” just because one component is active. Use distinct text for no-load, partial operation, undervoltage, cable capacity/drop warnings, trip, damage and unsupported calculation. Provide keyboard/screen-reader equivalents, not color alone.

## 5. Current, cables, load response and protection

### Voltage-dependent loads

The fixed-resistance reference below assumes the stated voltage **across the load**, a 2 kW / 230 V element, `R = 26.45 Ω`, and no temperature variation. Actual circuit fixtures additionally include their declared finite wire losses. Heater control electronics, cold-filament behavior and LED drivers must not be silently covered by this approximation.

| Load voltage | Expected current | Expected power |
|---|---|---|
| 230 V | 8.695652 A | 2000 W |
| 120 V | 4.536862 A | 544.423440 W |
| 48 V | 1.814745 A | 87.107750 W |
| 24 V | 0.907372 A | 21.776938 W |
| 12 V | 0.453686 A | 5.444234 W |

Keep the same device and rating through the whole sweep. A constant-power approximation is allowed only for an explicitly supported electronic model within its declared range, with documented startup/dropout/current-limit behavior. An unspecified mains LED at 12 V receives an operating-range/coverage finding; never assume 9 W and 0.75 A constitute valid operation.

### Cable and current rules

- Solve each branch current and shared-feeder total using MNA. Check KCL, KVL and power balance. A conductor can be live at zero current; healthy PE normally carries no load current, and an unintended PE return is a separate finding.
- Include finite conductor resistance in the circuit solve so length, cross-section and material affect load voltage/current/power. Derive wire loss as `I²R` and its terminal drop consistently. Label temperature and one-conductor versus loop assumptions; do not double-count the two-conductor design table as two individual wire resistances.
- Preserve Phase 1.5B's shared size precedence (wire mm² → saved AWG → explicit endpoint → default) and provenance in **all** inspector, validator, Zs, fault and analytics consumers. Changing the display unit must not change the physical conductor or leave a stale AWG/mm² pair.
- Separate a suggested component tail size from a modeled cable run or independently modeled appliance flex. A stale endpoint recommendation cannot declare an explicit 6 mm² wire undersized. Defaults and recommendations cannot earn an unqualified cable-safety pass.
- Calculate base/derated capacity under its declared installation/material/profile assumptions. Current in A, residual current in mA, conductor area in mm²/AWG, resistance in Ω and voltage in V must be labeled and converted explicitly. Preserve rejection of negative/nonfinite length, zero area, invalid ports and invalid derating; do not coerce impossible input into normal measurements.
- Protection observes the actual current in its poles/branch. A 1 A breaker supplying a 9 W lamp cannot trip because a separate heater consumes 8.7 A. A breaker elsewhere cannot protect an unprotected branch. Shared neutral current, phase cancellation and residual imbalance require the appropriate supported model.
- Keep load current (`Ib`), protective-device rating (`In`) and cable capacity (`Iz`) distinct. A maximum rating is not an imposed current or an instantaneous trip threshold. Preserve correct isolator, fuse, MCB, RCCB and RCBO roles; AC/DC interruption and residual-waveform suitability need declared coverage.
- Capacity exceedance is a hazard finding, not automatic instantaneous melting. Trips, fuse operation, cable damage, coil operation and reset require the declared time/thermal/device state in 1.5D. Compare applicable clearing behavior and energy limits; otherwise report damage/coordination unassessed. Do not invent an explosion to make the UI look responsive.
- Distinguish steady-state, prospective fault, event and post-clearing currents. Re-solve after a protective event before showing post-event telemetry. Do not simultaneously display a destroyed load as operating normally or a short as an unexplained measured 0 A.

## 6. Fault Lab, Diagnosis Lab, Ohmageddon and other consumers

| Consumer | Required integration |
|---|---|
| Fault Lab / fault dialogs | **1.5C:** physically applicable targets/parameters, coverage and affected-branch readings. **1.5D:** timed operation, reset and repair. **1.5F:** complete all entry paths. Repair never changes a rating or hides a supply mismatch. Remove hardcoded 110/230 V explanations and global-voltage guesses. |
| Basic and advanced Diagnosis Lab | Preserve existing identification-versus-repair, structural and authorized-server checks. **1.5C:** keep authored supply/edit rules during rollout. **1.5F:** compare actual operating results, coverage and authored supply/device context. Supply changes, deleted loads or unsupported variants cannot count as repair. Keep real instrument readings and independent hazards visible; withhold answer narration separately. |
| Ohmageddon | **1.5D/E:** prerequisites for timed/three-phase scenarios. **1.5F:** generate and grade only supported, observable, repairable scenarios; prove compound/masked faults and partial/full recovery. Decoys/difficulty cannot invent readings or change physics. Store engine/model/generator/profile versions for replay/scores. **Phases 3–5** add comparable scoring and new content/generation. |
| Guided circuits/challenges | Declare supply, operating models, permitted edits and expected actions/measurements. Lock the authored supply during graded attempts with a reason; an explicit exit-to-sandbox/restart confirmation can allow changes without awarding the old attempt a success. |
| Palette during exercises | Base nominal availability on the authored context and allowed components, not the hidden answer or fault-distorted measurements. Filtering must not reveal the fault's location or silently remove it. |
| Inspector/analytics/export/server results | Consume the same revision/versioned contract; no independent P/V, default-rating or global-rail shortcuts. Never export cached or unassessed results as a fresh passing assessment. |
| 1.6 visual effects | Consume truthful state/events after integration. No destruction on ordinary breaker operation, no current-flow animation on a zero-current dead end, and no effect-driven electrical behavior. |
| 1.7 UI/UX refinement | Finish layout, density, discoverability and accessibility across desktop/mobile after the essential correctness interactions are in place. Refinement must retain confirmation, coverage and diagnostic meaning. |

Preserve paid-feature authorization and free basic diagnosis. Basic/pro equality means equal electrical outcomes for the same authorized circuit. It does not require exposing advanced exercise content without membership. No remote or live-site work is part of these gates.

The [audit consumer map](../audits/phase-1-behavior-review.md#5-fault-lab-diagnosis-lab-and-ohmageddon) identifies the actual modules and existing safeguards. During staged integration, guard an exercise whose required models are not supported; never keep a separate legacy numerical truth for grading a circuit shown with MNA results. The shared evaluator and local server must enforce authored context as well as the UI.

## 7. Delivery order and exit gates

| Step | Deliverable | Required evidence |
|---|---|---|
| **1.5C.0 — complete locally** | Extend 1.5B contracts with typed persisted supply/profile migration, catalogue capability/rating/load-law inventory, compatibility/readiness and ADR 0009's MNA implementation design | [Full local gate passed](../audits/phase-1-supply-preflight.md): legacy round-trip and source isolation; explicit unknown ratings; deterministic preflight; no source re-rating or membership-dependent physics. |
| **1.5C.1 — complete locally** | First MNA resistive series/parallel/independent-source slice | [Passing gate](../audits/phase-1-mna-solver.md): analytical values with stated wire resistance, KCL/KVL/power balance, current direction, singular/conflicting-source cases and stable order-independent results. |
| **1.5C.2 — complete locally** | Operating-range checks, independent supplies, real branch/wire losses and load response; shared wire-property consumers | [Passing gate](../audits/phase-1-load-response.md): full heater sweep, LED range/coverage, current/ampacity/units, open and long-cable cases, AWG/mm² edits and no invented load thresholds; 1,818 unit passes, 524 parity and 4 browser cases. |
| **1.5C.3 — complete locally** | Isolated AC transformers, PE/reference relationships and supported fault paths | [Passing gate](../audits/phase-1-transformers-pe.md): winding ratios/energy/isolation, backfeeding/cascades, explicit bonds/CPC/polarity/PE-return findings and limited fault estimates; 1,878 unit passes, 551 parity cases and 4 browser continuity cases. |
| **1.5C.4 — complete locally** | Essential palette/inspector controls, source-change confirmation/notification/Undo, safe variant transitions and run readiness | [Passing gate](../audits/phase-1-editing-readiness.md): Cancel/Apply/Undo, AC/DC and independent sources, terminal/fault mapping, running/exercise locks, all readiness states and stale Comlink responses; 1,921 unit passes, 569 parity cases, 9 Worker/D1 groups and 42 browser cases. |
| **1.5C.5** | Expose the supported slice through direct domain, Comlink and local Hono adapters; record and run a reproducible local phase gate | The browser actually uses the new results for models claimed fixed; explicit coverage for the rest, including 1.5D/E dependencies. Backend-only success while the UI still runs legacy P/V does not close 1.5C. |
| **1.5D** | Timed coils, dimming, protection, cable/device damage and repairs | Actual branch currents, applicable device/thermal models, consistent event/post-event telemetry, deterministic step/reset/replay and no remote operations. |
| **1.5E** | Supported three-phase MNA/phasor extension and UI semantics | L-L/L-N convention, actual phase terminals, phase loss/sequence, balanced load/current fixtures and clearly unsupported cases. |
| **1.5F** | Full consumer/exercise integration and legacy retirement | Browser/local Worker equivalence, graded-edit restrictions, template and all three stress suites, memberships, persistence/exports and full local gates. |

Acceptance also covers independent batteries beside mains, 12 V AC versus 12 V DC, 24/48 V DC, 110/120/230/240 V AC with explicit frequency, and 400 V three-phase once 1.5E supports it. Include source conflicts, missing ratings, no-op/canceled edits, changing a profile with the dialog open, failed authorization, imported incompatible content, variant port-count changes and undo/restore after edits.

The diagnostic [probe](../../scripts/probes/phase15c-behavior.ts) records current behavior and independent expectations. Its successful execution is **not** a correctness gate. Convert each owned defect into independent acceptance assertions as the relevant stage ships; promote existing `it.fails` cases when repaired. Do not preserve known incorrect outputs as the new solver's oracle.
