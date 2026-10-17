# Phase 1.13 — UI clarity and Fault Lab reliability

**Status (2026-10-17): locally functionally complete for 1.13.0–8; performance limitations retained.**
**Requested:** 2026-10-16. The user asked for one next-phase plan combining the
workspace UI/wire review and the all-type Fault Lab investigation. This document
is the authoritative combined execution plan. Planning and local functional execution are complete; milestone
acceptance and explicit limitations are recorded in the tracker. A later instruction to start/continue Phase
1.13 resumes this scope from the handoff, without repeating the investigations.

[Handoff](../handoffs/ui-fault-lab-next-chat.md) ·
[Acceptance tracker](../audits/phase-1-ui-fault-lab.md) ·
[Phase map](../phases/phase-1-simulator-core.md)

## 1. Outcome

Make editing, running, investigating and repairing a circuit understandable from
the interface: users see their action's outcome, know which faults are applied,
can return to Fault Lab after a blocked run, see faults at their actual locations,
and can read the selected component/wire's effective properties and limitations.

Retain the approved Open Drafting Table direction: muted slate surfaces, centered
commands, full-width bottom shelf, desktop-right/phone-bottom Inspector, readable
contrast and semantic labelled icons. Use diagrams for relationships and steps;
keep precise values, limitations and actions in short text.

## 2. Verified baseline and authority

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| [UI/wire review](../audits/workspace-ui-followup-review.md) and [116-entry data](../audits/data/workspace-ui-followup-inventory.json) | Separate Console/toast paths; header/shelf mismatch; validation/badge/spec gaps; AWG/material/method save and affect resolved calculations while canvas styling stays unchanged | A completed UI fix, 72 broken devices, new electrical laws or complete rating certification |
| [All-type Fault Lab review](../audits/fault-lab-followup-review.md) and [matrix](../audits/data/fault-lab-followup-matrix.json) | All 14 types lack Applied cards and visible duplicate rejection; Run handoff and route defects; 16 native source scenarios with focused recovery | Every fault/component combination, built delivery or the proposed fixes passing |
| [Workspace preview](../design/workspace-ui-followup/index.html) and [guide](../design/workspace-ui-followup/README.md) | Concrete header/shelf, notifications, Inspector/model/spec and wire-summary direction | Production stores, numerical behavior or final layout approval beyond the user's accepted choices |
| [Fault Lab preview](../design/fault-lab-followup/index.html) and [guide](../design/fault-lab-followup/README.md) | Internal/wire/terminal opening cues, Applied state and six Help rows | A new fault model, automatic arcing/damage or production implementation |
| [Phase 1.12 acceptance](../audits/phase-1-missing-component-calculation.md) | Completed declared catalogue teaching-model scope with combined functional evidence and retained exceptions | Permission to restart numerical work, a strict performance-green gate or deployment authorization |

Important distinctions to preserve:

- The reported CFL diagnostic succeeded on desktop and phone: current converged
  **230 V across the open load / 0 A / 0 W**. Remaining in a continuous run is
  different from a failed calculation. Do not invent a solver defect or silently
  auto-stop a valid run to make the UI appear fixed.
- Ten reviewed fault effects are supported; switched neutral, unspecified
  live-to-earth leakage, smooth DC residual and arc/AFDD detection are unassessed.
  Clear removes an injected cause, not proof of repaired protection or damage.
- All 116 types have a Specs route; only 34 have authored help and 82 fall back to
  generic content. Only two authored pinout/clauses records does not mean only two
  components have terminals. Canonical ports already exist.
- Unknown rating, unsupported electrical law, missing supply and not-applicable
  metadata are separate states. The default placement inventory is not a runtime
  failure count. Do not guess a rating to remove a badge.

## 3. Issue register and required behavior

| ID | Verified problem / request | Required outcome | Milestone |
| --- | --- | --- | --- |
| UI-01 | Errors/warnings/task outcomes and Undo/notice use separate paths | One user-action notification contract, persistent bounded Console entry and actionable severity toast | 1.13.1 |
| FL-01 | All 14 cards lack applied state; duplicate rejection reaches developer console only | Exact type/target Applied badge, visible duplicate/conflict outcome, no second edit, Inspect/Clear actions | 1.13.2 |
| FL-02 | Pro validation hides Lab while its open flag stays true; reopening takes two clicks | Explicit open/return restores Lab once with target retained; the existing validation/access gates remain authoritative | 1.13.2 |
| FL-03 | Continuous zero-current, unsupported, blocked and stale runs are hard to distinguish | Explicit Not run / Running / Captured / Blocked / Unavailable / Stale presentation from actual state | 1.13.2–3 |
| UI-02 | Terminal-name supply heuristic and incomplete reports logged as success | Shared compiled source identity; correct empty/incomplete/failure/success classification | 1.13.3 |
| UI-03 | Percentage and `Compliant & Safe` overstate limited checks | Separate Connections, Ratings, Calculation and Teaching rules with checked/pending/needs-attention counts | 1.13.3 |
| FL-04 | Off-route cuts; internal component open drawn as external cable cuts | Actual-path position/tangent; separate internal, conductor and terminal visuals | 1.13.4 |
| FL-05 | Help list loses numbers; long text and first-cause-only detail | Six numbered illustrated rows, short titles, progressive detail and explicit multi-cause selection | 1.13.4 |
| UI-04 | Header/shelf differ from approved HTML; legacy subheader duplicates controls | Restore approved scale/spacing; relocate supply/readiness to styled Circuit entry and remove duplicate context row | 1.13.5 |
| UI-05 | Dense paragraphs replace useful visual structure | Consistent sparse labelled icons, status rows, diagrams and sections; retain exact values and accessible text | 1.13.4–7 |
| UI-06 | Detailed model dialog duplicates rotation and mixes sections | Conditional Electrical / Behaviour / Installation sections; remove dialog rotation only | 1.13.6 |
| WR-01 | AWG/Cu/Al/method have little persistent visual feedback | Effective AWG/mm², material swatch, full method/diagram, length, derating, resistance, capacity status and provenance in Properties | 1.13.6 |
| CT-01 | Generic Ratings unknown also labels missing supply; usable parts hidden | Reason-specific badges/actions and discoverable components with clear assessment state | 1.13.7 |
| CT-02 | Generic help and catalogue/reference value disagreements | Reconciled 116-entry reference/ratings matrix and shared instance-aware Specs renderer | 1.13.6–7 |

### Notification contract

Default completed-event expiry is **five seconds**, paused on hover/keyboard
focus. Error red, warning amber, success green and information blue include text
and a semantic icon; colour is never the only distinction. Task progress remains
visible until completion/failure. Dismissal removes the toast, not its Console
entry or unresolved finding. Preserve relevant Undo, Inspect and View Console.

Audit direct log-array writers as well as `addLog`/notice/Undo callers. Emit once
per meaningful event, coalesce bursts and repeated same-revision solver findings,
and do not toast every simulation frame. Preserve bounded in-session Console
history/filter/clear behavior; cross-reload log persistence is outside this phase.
Do not let an informational toast silently replace a valid Undo opportunity.
Fatal recovery and persistent blocking states retain their dedicated surfaces.

### Fault identity, Run and repair contract

Applied identity is fault type plus exact component/wire/port target, including
the terminal index. Unavailable target and unsupported effect are distinct.
Selecting an applied card focuses its existing details; it does not offer another
ordinary Apply. A rejected duplicate/conflict creates no edit or undo entry and
produces a visible explanation through the shared notification path. Preserve
Cancel, draft revision checks and running/read-only/access locks.

Unify visible tool ownership and explicit navigation; a hidden open flag must not
require an extra click. Return from readiness/validation preserves the target and
investigation. Ordinary and diagnostic Run share authoritative preflight. Existing
Pro teaching overrides remain explicit and cannot bypass actual repair/access
guards. Report the accepted result or the actual reason it is unavailable; never
relabel an unsupported result as captured. Edits invalidate stale readings and
causal claims immediately. Playback cannot alter circuit inputs or solver time.

Clear cause, reset protection to OFF, deliberate ON and damaged-item replacement
remain separate operations under their existing contracts. Preserve documented
runtime Stop/Run reset semantics; do not invent a new latch-persistence behavior
as part of a presentation change. Multiple causes have visible counts and an
explicit cause selection instead of silently using the first record.

### Geometry and animation contract

For a wire break, sample the renderer's actual path for position and tangent. For
a named terminal, use the actual terminal and that rendered wire's direction.
For a component open, show its internal modeled path without breaking attached
external wires or guessing which physical part failed. Preserve canonical IDs,
saved routes, terminal geometry, selection/hit targets and ordinary/dense parity.

Optional motion is a short separation/withdrawal followed by a static gap. No
continuous sparks, fire or invented damage from an open fault. Keep conductor-role
colour independent of metal, potential and current. Polarity, PE bridge, jam and
bypass get their own semantic cue; the four unassessed effects retain a labelled
scenario marker. Reduced motion, hidden-page and static/export states must work.
No new Matter dependency or solver-driven effect is required for the short cue.

### Inspector, wires and catalogue contract

Properties owns selected-instance/reference information; Readings owns current
calculated output; Configure owns drafts. Reuse existing family editors in
conditional model sections and omit irrelevant/empty sections. Remove only the
two detailed-dialog ±90° controls/handlers/imports; retain context-menu, keyboard
and shared rotation actions. Source/variant changes retain reviewed confirmation.

**Required wire solution is Inspector-first.** Display resolved values from the
shared wire resolver, both size units where valid, Cu/Al with text and cross-section
swatch, full C/B1/A name/diagram, physical length, derating, resistance, capacity
basis/status and explicit/default/endpoint provenance. Draft changes are distinct
from saved values. Copper/aluminium changes resistance; installation affects
capacity assumptions, not route geometry. AWG-derived non-table areas remain
unassessed for ampacity. Keep the existing aluminium approximation explicitly
labelled. New ampacity tables and physical gauge-scaled canvas widths are outside
the base scope; a selected-wire summary can provide a compact optional callout.

All 116 entries need a reviewed content/metadata disposition. Use canonical ports
and actual instance/model ratings, with labelled reference guidance separate.
Replace generic fallback claims with reviewed type/family content, supported
derivations or an explicit missing-data state. Reconcile downlight/tube/motor/heater
differences and distinguish consumption from contact capacity. Do not fabricate
IP ratings, standard clauses, suitability, voltage limits or load laws. Genuine
unknowns remain visible with their reason and next action; no universal rating fill.

## 4. Ordered milestones and exit criteria

Each milestone begins with a focused graph briefing, reads linked evidence, runs
appropriate affected checks and updates graph findings/check mappings after each
verified step. A milestone closes only with its own evidence, not a fingerprint.

| Milestone | Deliverable | Exit evidence |
| --- | --- | --- |
| **1.13.0** | Freeze requirements/visual decisions against both previews; reproducible failing cases and source/built baseline; create stage runner/acceptance ledger | Every issue ID mapped to source and a meaningful check. Preserve existing worktree and prior evidence. Record layout choices before affected production edits. Initial status remains planned. |
| **1.13.1** | Shared notification/action-result path | Severity, five-second expiry, hover/focus pause, progress completion, burst deduplication, Undo and Console retention/clear verified. Duplicate failure has an app-visible path. |
| **1.13.2** | All-type applied/duplicate/multi-cause state and Run/validation/Lab navigation | All 14 exact-target cards, no duplicate edits, conflict feedback, first-click return, target retention and current/unavailable/stale outcomes. CFL open zero-current capture retained; unsupported effects remain unavailable. |
| **1.13.3** | Shared readiness/validation correctness and Circuit checks presentation | Terminal-strip no-source regression, intentional open diagnostics, empty/incomplete severity, current/stale reports, limited coverage labels, target navigation and Pro/repair gates pass. |
| **1.13.4** | Correct fault geometry, meaningful cues and six-row Help | Correct expected wire/terminal route at ≤1 screen-pixel marker-anchor error, tested bends/zoom/rotation; internal opens leave external runs intact. Ordinary/dense and export/static/reduced-motion checks. All 14 cues match supported scope. |
| **1.13.5** | Header, shelf, relocated Circuit controls and common visual hierarchy | Approved HTML comparison; 1440/1024/640/390/360 px, light/dark, collapse, overlays, Console/toast clearance, Fit and keyboard hit targets. Supply kind/frequency/phase and edit locks retained. |
| **1.13.6** | Sectioned component models, shared Specs location and wire summaries | Every model family; draft/cancel/apply/reset/Undo and source/variant guards. Dialog rotation removed with keyboard/context rotation working. AWG↔mm²/Cu↔Al/C/B1/A persistence and complete labelled Properties/Readings/Configure behavior. |
| **1.13.7** | Reason-specific ratings and full catalogue/reference reconciliation | Updated reproducible 116-entry matrix; every entry has authored/family/derived/explicit-missing-data disposition, consistent actual values/provenance, canonical terminals and actionable unknowns. Palette discoverability checked without false compatibility. |
| **1.13.8** | Integrated local acceptance and handoff | Required functional/static/source/built/access/runtime checks completed as below; evidence and exceptions reconciled, final graph scopes reviewed and phase status truthful. |

The order puts core feedback/lifecycle defects ahead of decorative polish.
Milestone acceptance is tracked in the audit; starting implementation does not accept 1.13.0–8. No implementation date or duration is
promised by this document. Do not mark the phase complete by finishing the plan.

## 5. Verification and acceptance matrix

| Area | Required check and substantive assertion |
| --- | --- |
| Fault lifecycle | Each of 14 registered types on an applicable real target: draft/cancel, Apply, Applied badge, duplicate/conflict, Run or explicit gate/unavailable reason, selected-cause detail, Clear, Undo/Redo and reapply. Include mismatched/unsupported targets and multiple causes. |
| Original report | Native L/N/CFL open workflow on desktop and phone using the real current-schema serializer; readiness → diagnostic → current zero-current/power capture. Verify status feedback, single-click Lab return and stale rejection after edits. |
| Geometry | Compare against the **expected associated rendered path**, not merely the nearest wire or a badge transform. Include orthogonal bends, Bezier, terminal-end direction, zoom, moved/rotated components, dense renderer and SVG/static output. |
| Notifications | Real import/edit/fault/run/validation outcomes; colours plus labels/icons, timing/focus/hover, repeated-frame suppression, progress completion, target action, accessible announcements and retained Console history. |
| Validation | Shared source identity, no-source terminal-strip case, intentional opens, empty/incomplete status, scalar/phasor coverage boundaries, stale reports, truthful assessment counts and unchanged blocking/override semantics. |
| Wire data | Supported AWG equivalents and metric edits, material and C/B1/A/derating; saved-versus-draft summaries, resistance/capacity boundaries, default provenance, Undo/Redo, reload and import/export. Unsupported ampacity never rounds up. |
| Component models/specs | All supported editor families, 116 metadata dispositions, actual instance overrides, reference-only information labelled, no generic fallback presented as a device rating; preserved access/source/variant constraints. |
| Responsive/accessibility | Source and freshly built delivery at 1440/1024/640/390/360 px; all configured Chromium/phone/WebKit projects for affected source flows, built desktop/phone, keyboard/focus/Escape, reduced motion, both themes, touch/scroll and no overlap/overflow. |
| Repository | Full types/lint/registered units; fresh simulator/Astro build; assets/links/SEO/CSP. Local Worker/D1 real-cookie guest/paid/read-only/revocation and protected import/edit/export flows. Current direct/Comlink/local Worker parity for changed shared behavior. |
| Performance | Measure affected dense interaction/effects and asset budgets. Compare with the recorded baseline without relaxing thresholds or treating historical solver/render/generator exceptions as passes. New regressions require resolution or an explicit documented decision. Unrelated generator timing need not be rerun unless its code/contracts change. |

Relevant starting tests: `src/store/uiStore.test.ts`,
`src/store/wireProperties.test.ts`, `src/store/useSimulation.test.ts`,
`packages/domain/src/circuitValidation.test.ts`,
`packages/domain/src/circuitValidation.wires.test.ts`,
`packages/domain/src/core/readiness.test.ts`, `packages/domain/src/faults.test.ts`,
`src/ui/canvas/faultFx.test.ts`, `src/ui/canvas/FaultFxLayer.test.tsx`,
`src/ui/components/inspector/InspectorFaultLabView.test.tsx`,
`src/ui/components/inspector/faultLabEvidence.test.ts`,
`e2e/fault-lab-application-review.spec.ts`, `e2e/fault-lab-redesign.spec.ts`,
`e2e/fault-lab-redesign.production.spec.ts`, `e2e/open-drafting-table.spec.ts`,
`e2e/open-drafting-table.production.spec.ts`, `e2e/electrical-editing.spec.ts`,
`e2e/damage-repair.spec.ts` and `e2e/unsupported-load-feedback.spec.ts`.
Read them before extending coverage: old all-type Apply/Clear checks did not test
duplicate feedback, Lab return, all-type Run or cut-to-route placement.

Create `verify:phase-1.13` during 1.13.0 following existing stage tooling, with
`--list`, `--only` and `--from`. The command does not exist at planning time.
Selected runs report partial acceptance. Preserve failed attempts, skips and
focused recovery; reconcile exact case keys and changed units. One consolidated
final report follows implementation; rerun affected failures rather than
restarting accepted unchanged work without a reason.

## 6. Boundaries and completion record

All development, browsers, Worker/D1 and persistence remain local under `AGENTS.md`.
No live-site tests, old-account credentials, remote resources, commits/pushes or
deployments follow from this plan. Preserve stored circuits, schema compatibility,
membership permissions, retired Diagnosis/Challenge decisions and electrical
truth. No new leakage/arc/AFDD/control model, solver rewrite or standards table is
authorized by a UI improvement.

At each verified step, update `docs/code-graph.json` with source/evidence paths,
meaningful test mappings, measured results and actual status. Search supplements
a missed graph query; record the discovered path so it is retrievable next time.
Never bulk-renew review baselines. Graph freshness is not passing tests.

Close in the acceptance tracker with issue/milestone dispositions, exact command
results, inspected source/built screenshots, catalogue coverage, preserved
limitations and measured performance. Keep design acceptance, implementation,
focused recovery, full functional acceptance and historical exceptions separate.
