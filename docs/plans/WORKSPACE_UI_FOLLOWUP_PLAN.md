# Workspace UI follow-up proposal — 2026-10-15

**Consolidated 2026-10-16:** The authoritative next-phase execution plan is now
[Phase 1.13 — UI clarity and Fault Lab reliability](PHASE_1_13_UI_FAULT_LAB_PLAN.md),
combining this UI/wire proposal with the all-type Fault Lab review. This document
remains the historical UI design proposal; the combined plan owns milestones and
acceptance. Production implementation has not started.

Status: reviewed findings and standalone design proposal. Production work awaits
design selection at milestone 1.13.0. At the original review, no phase was advanced.
This proposal follows the user's request
to read and assess the UI notes and the established design-before-implementation
workflow. It does not add a deployment or publication step.

Evidence: [verified audit](../audits/workspace-ui-followup-review.md),
[116-component inventory](../audits/data/workspace-ui-followup-inventory.json),
[interactive wireframe](../design/workspace-ui-followup/index.html).

## Proposed behavior

1. **Notifications and Console.** One semantic application event produces its
   history entry and a coloured toast above the actual shelf edge: error red,
   warning amber, success green, info blue. Default expiry is five seconds;
   hover/focus pauses it. Keep dismiss, View Console and relevant Undo/Inspect
   actions. Queue/coalesce bursts and repeated same-circuit simulation findings;
   do not toast each frame. Keep progress visible until completion, then time the
   completion notice. Persist unresolved problems in Circuit checks after the
   toast disappears. Console expiry/clear never clears faults or event history.
   Review direct log-array producers as well as `addLog`/notice/Undo callers;
   avoid duplicate logging where a caller currently invokes both. Console
   history retains its existing bounded in-session lifetime; cross-reload history
   is a separate product decision, not implied by this proposal.

2. **Subheader and header fidelity.** Remove the legacy project/selection/Sim row.
   Keep supply and readiness in a styled Circuit control near Run/Inspect; desktop
   exposes the current supply and short readiness summary, phone opens both from
   the compact control. Preserve full source-kind/frequency/three-phase labels in
   its contents, existing edit locks and reviewed supply changes. Put project name
   with Files and selection details with Inspector; avoid duplicating the old
   row. Restore the accepted HTML's command scale, 13 px desktop labels, soft-pill
   category selection and 166 px desktop / 151 px phone shelf spacing. Preview
   geometry must be reconciled with real production controls, collapsed shelf,
   overlays and Fit occluders. Do not delete shared component functions merely
   because their duplicate subheader display is removed.

3. **Circuit checks and readiness.** One destination presents distinct Connections,
   Ratings, Calculation and Teaching rules states. Before checks run, say Not run;
   after edits say Out of date. Each issue names its target, why it matters and an
   Inspect/Edit/Re-run action. Keep intentional open-switch diagnostic runs and
   blocked invalid/no-source states. Replace the percentage and `Compliant & Safe`
   wording with checked/pending/needs-attention counts and explicit coverage.
   Preserve existing numerical and rule contracts during the UI change. Fix the
   verified source-substring and incomplete-as-success issues in isolated,
   independently tested changes rather than masking their findings in the UI.

4. **Specific missing data.** Replace generic `Ratings unknown` with reason-based
   labels: Supply not connected, Contact suitability not declared, Coil setup
   required, Operating range not declared, or Model unavailable. Present the
   missing field and a relevant editor, or state that catalogue data is needed.
   Review all 116 entries by family. Add only supported catalogue declarations or
   explicit user/teaching assumptions with provenance; keep contact, coil, winding,
   load and capacity ratings separate. A rating label never creates a numerical
   law or predicts damage. Revisit compatibility-based palette hiding so usable
   parts remain discoverable without claiming assessed suitability.

5. **Detailed model settings.** Remove only the two dialog rotation controls and
   their direct handlers/imports. Right-click arrangement, keyboard rotation and
   the shared store action remain available. Use conditional Electrical,
   Behaviour and Installation sections, with sparse labelled icons. Existing
   coil/motor/timer/protection/profile editors populate the relevant section;
   omit empty sections. Retain draft/reset/apply/Undo, read-only/running locks,
   source/variant review and current-result rules. Reference information belongs
   in Properties; readings stay in Readings. Model-specific grouping is preferable
   to moving every field into another large generic dialog.

6. **Specifications and remaining component gaps.** Give each type useful
   Properties data and catalogue information before placement. Use one shared
   reference renderer in the Inspector and library, with a full view when needed.
   Read instance/model values for actual ratings, show provenance and unavailable
   values explicitly; keep general product guidance separate. Reconcile the
   authored help discrepancies and replace the 82 generic fallbacks with reviewed
   family/type content. Derive terminals from canonical definitions; add dedicated
   notes where needed. Audit stale controller/model-limit wording and inappropriate
   generic standards text. This is content/model metadata coverage, distinct from
   numerical support accepted in Phase 1.12.

7. **Wire properties and visuals.** Display both AWG and effective mm², Cu/Al
   material with a cross-section swatch, full installation method and a labelled
   mini-diagram, length, derating, model resistance, capacity status/basis and
   explicit/default provenance in Properties. The same resolver must populate
   Configure, detailed settings and any canvas callout. Keep conductor-role
   colour. Optional selected-wire labels or bounded gauge thickness need a
   separate visual choice and checks in ordinary/dense rendering. Installation
   method is an ampacity-model input, not route geometry. AWG-derived areas retain
   unassessed capacity until an appropriate table/model is explicitly added and
   independently verified. The initial implementation can improve the Inspector
   without adding a new physical cable rendering system.

## Recommended implementation sequence

| Step | Concrete outcome | Required evidence before calling it complete |
| --- | --- | --- |
| A | Accepted header/shelf/Circuit control and notification layout | Source and fresh built screenshots at 1440, 1024, 640, 390, 360 px; hit targets, no overlap/overflow, shelf collapse, Fit, light/dark, reduced motion |
| B | Shared notification events and reason-based indicators | Actionable error/warning/success/info and Undo, five-second expiry and hover/focus pause, burst deduplication, Console history/filter/clear, no stale response or repeating frame notices |
| C | Readiness/validation presentation plus separately verified identified correctness repairs | Missing source including terminal-strip case, intentional open circuits, source/ratings/calculation distinction, fresh/stale reports, incomplete status mapping, checked coverage and correct target focus |
| D | Conditional model sections and shared Specs placement | Every model family, draft/cancel/apply/reset/Undo and edit locks, source/variant review, right-click/keyboard rotation preserved after dialog control removal |
| D-wire | Resolved wire summary and labelled material/installation diagrams | Native AWG/metric, Cu/Al and C/B1/A edits; Apply/Reset/Undo/reload/export round-trip; full names and provenance, resistance/capacity meaning, ordinary/dense selection/readings; source and built phone/desktop evidence |
| E | Full catalogue metadata/help reconciliation | Reproducible 116-entry matrix, explicit unknown reasons/provenance, authored family help and consistent actual values; model/data changes get applicable numeric/parity/migration checks |

Relevant existing tests (not rerun by this proposal): `src/store/uiStore.test.ts`,
`packages/domain/src/core/readiness.test.ts`,
`packages/domain/src/circuitValidation.test.ts`,
`packages/domain/src/circuitValidation.wires.test.ts`,
`src/ui/components/SimulationFeedback.test.tsx`,
`src/ui/canvas/ComponentNode.test.tsx`, `e2e/open-drafting-table.spec.ts`,
`e2e/open-drafting-table.production.spec.ts`, `e2e/electrical-editing.spec.ts`,
`e2e/unsupported-load-feedback.spec.ts` and affected access/guide/Fault Lab checks.
Their existing assertions do not prove the proposed features exist; augment only
where new behavior needs meaningful coverage. Required repository gates still
apply if production code is changed.

Update `docs/code-graph.json` after every verified step with the actual sources,
evidence and check outcomes. Keep proposal approval, implementation, focused
checks, full functional acceptance and historical performance exceptions distinct.
