# Phase 1.13 issue/check map

This is the execution map for [the combined plan](../plans/PHASE_1_13_UI_FAULT_LAB_PLAN.md).
Source paths are relative to the repository root. This table maps the implemented
behavior to substantive assertions. The [tracker](phase-1-ui-fault-lab.md) owns
actual outcomes, final-tree scope, recovery and limitations; a listed path alone
is not proof that a check passed.

| Issue | Source ownership | Meaningful check / implementation mapping |
| --- | --- | --- |
| UI-01 | `src/store/notifications.ts`, `src/store/uiStore.ts`, `src/ui/components/UndoToast.tsx`, `src/ui/components/LogPanel.tsx` | Store/card/Console units and native UI-01: four labelled severities, five-second expiry, independent hover/focus pause, progress replacement, burst suppression, retained guarded Undo, Console filters/clear, real import/edit/run events. Native hover explicitly crosses the card boundary after modal closure. |
| FL-01 | `src/store/circuitStore.faultActions.ts`, `src/ui/components/inspector/InspectorFaultLabView.tsx` | `fault-lifecycle.spec.ts`, application-review and units cover all 14 exact type/target/port identities, Applied/duplicate/conflict, cancel, Run gate-or-outcome, Clear, Undo/Redo and reapply. No duplicate edit/history entry. |
| FL-02 | `src/store/uiStore.ts`, `src/ui/components/Toolbar.tsx`, `src/ui/components/inspector/Inspector.tsx` | Native FL-02 performs actual Pro-blocked Run, confirms no Stop, closes validation and opens Lab once with selection retained. Explicit Return/navigation and authoritative access/repair gates remain covered. |
| FL-03 | `src/ui/components/CircuitReadinessDetails.tsx`, `src/ui/components/inspector/faultLabEvidence.ts`, `src/ui/components/inspector/InspectorFaultLabView.tsx` | Native CFL diagnostic requires fresh 230V/0A/0W with continuing Run; lifecycle/evidence tests distinguish Not run/Running/Captured/Blocked/Unavailable/Stale, current revision, four unassessed effects and stop/replay. Existing legacy source alias gets a readable Circuit supply label; IDs and measured values remain intact. |
| UI-02 | `packages/domain/src/circuitValidation.ts`, `packages/domain/src/core/readiness.ts`, `src/store/uiStore.ts` | Native terminal-strip no-source and incomplete-severity regressions plus domain/store empty/failure/success cases. Shared compiler source identity preserves real sources through intentional opens. |
| UI-03 | `src/ui/components/ValidationReportView.tsx`, `src/ui/components/validationPresentation.ts`, `src/ui/components/CircuitReadinessDetails.tsx` | Validation/readiness/electrical-editing checks cover four limited assessment groups, checked/pending/findings, scalar/phasor scope, stale state, target focus and preserved override/repair gates. No percentage or universal safety claim. |
| FL-04 | `src/ui/canvas/FaultFxLayer.tsx`, `src/ui/canvas/faultDragPreview.ts`, `src/ui/canvas/renderedPath.ts`, `src/ui/canvas/WireLayer.tsx`, `src/ui/canvas/DenseWireLayer.tsx` | Native all 14 live-drag/release/rotation loops and associated-path oracles require ≤1px error, orthogonal/Bezier bends, terminal tangent, zoom, reroute, ordinary/dense and SVG/static output. Independent straight/quadratic/cubic units; internal opens leave external conductors intact. Dense deferred routes and reduced/hidden-page cues retain explicit scope. |
| FL-05 | `src/ui/components/inspector/InspectorFaultLabView.tsx` | Units/native Help checks cover six numbered illustrated rows, explicit multiple-cause selection, accessible text, Escape/focus restoration and phone scrolling. CFL five-width checks also verify a native Help hit while notifications remain. |
| UI-04 | `src/ui/components/Toolbar.tsx`, `src/ui/components/CircuitControls.tsx`, `src/ui/open-table.css` | Source/built shell and Inspector checks cover1440/1024/640/390/360px, both themes, centered commands/full shelf, moved Circuit controls, supply/variant confirmation/locks, collapse, Fit and Console. Late CFL/production regressions cover wider Lab notification clearance and tools-menu input priority. |
| UI-05 | `src/ui/open-table.css`, `src/ui/components/inspector/InspectorOverview.tsx`, `src/ui/components/inspector/InspectorFaultLabView.tsx` | Source/built visual review and native checks cover readable saved/draft values/limits, labelled icons, model sections, six Help rows, keyboard/focus, scroll and current result/source labels. Reviewed captures are local engineering evidence, not new human owner acceptance. |
| UI-06 | `src/ui/components/inspector/ComponentPropertiesView.tsx` | Native Inspector checks visit all 17 declared model families; electrical-editing/catalogue-profile cases preserve existing draft/cancel/apply/reset/Undo and reviewed source/variant changes. Dialog-only rotation pair removed; native context/keyboard rotation remains covered by movement/editing flows. |
| WR-01 | `src/ui/components/inspector/WirePropertiesSummary.tsx`, `src/ui/components/inspector/InspectorQuickSettings.tsx`, `packages/domain/src/core/wireProperties.ts` | Wire units/native WR-01 cover AWG/metric, Cu/Al, C/B1/A, saved/draft provenance, independent resistance value, explicit ampacity gaps, Undo/Redo, real IndexedDB acknowledgement before reload and actual downloaded JSON reimport. Existing consistent AWG/physical-area contract is preserved. |
| CT-01 | `packages/domain/src/core/readinessPresentation.ts`, `packages/domain/src/core/placement.ts`, `src/ui/canvas/ComponentNode.tsx` | Reproducible116-entry reasons distinguish missing supply, ratings, model and not-applicable. Native badges open the actual target; unknown palette parts remain discoverable, while known mismatches retain their status and Show all route. |
| CT-02 | `packages/domain/src/core/componentReference.ts`, `src/ui/components/ComponentSpecs.tsx`, `src/ui/components/ComponentInfoModal.tsx` | Reference inventory/units/native Specs cover116 dispositions, canonical terminals, selected-instance overrides, labelled reference/missing data, four downlight/tube/motor/heater reconciliations and contact capacity separate from consumption. Inventory consistency is not universal runtime or product certification. |

## Reproducible commands

`bun run verify:phase-1.13 --list` lists registered stages. `--only` selects stages;
`--from` resumes in order. Selected checks never certify the full phase. The runner
uses the existing phase-gate failure/partial reporting and unchanged budgets.

The new native regression file imports through the actual `exportJSON` serializer,
uses the isolated paid-cookie fixture and does not import application source into
the page. Run it unchanged against both delivery modes:

```sh
PLAYWRIGHT_DEV_PORT=3003 bun x playwright test e2e/ui-fault-lab.spec.ts --workers=1
bun run build
bun x playwright test --config=playwright.ui-fault-built.config.ts --workers=1
```

Default source includes Chromium, mobile Chrome and tablet WebKit. Built includes
desktop and phone Chromium with a local Worker. An explicitly verified running
local test setup can be selected using `PLAYWRIGHT_BASE_URL`; both configs reject
non-local destinations. Never point the paid fixture at the normal development
database. Keep source and built runs sequential when sharing the test Worker.

The stage runner registers the full types/unit/static/local-access/source/built/
production-shell/performance sequence. Selected or resumed stages remain partial.
Final acceptance also requires the ledger, exact-case reconciliation, reviewed
captures, catalogue dispositions and explicit performance limitations.


## Current added coverage (2026-10-17)

`e2e/fault-lifecycle.spec.ts` adds per-type native cancel/apply/Applied/duplicate/Run/clear/Undo/Redo/reapply checks for all 14, including explicit gates and unsupported outcomes. `e2e/fault-marker-movement.spec.ts` compares expected associated paths during native drag/commit/rotation and reroute/zoom in ordinary/dense renderers, plus standalone SVG export. `e2e/inspector-reference.spec.ts` covers resolved wire drafts, persistence, shared actual-instance Specs, discoverability/reason actions and numbered Help/multiple-cause selection. All new native specs also run unchanged through the built config. Failed harness assumptions and focused recovery are retained in the tracker; their presence here is not a passing-test claim.

`src/ui/components/UndoToast.test.tsx` verifies announcements/severity, hover/focus composition, five-second timing, progress replacement, bounded/deduplicated history and guarded Undo/Inspect/Console actions. Shared validation and reference tests verify source identity, completed/limited assessment, canonical terminals, metadata gaps and actual declaration provenance. The stage runner now includes `catalogue:reference --check`; its snapshot is inventory consistency only.
