# Full simulator design coverage

Review from Project menu → Full simulator design map. The original map enumerated 52
screen designs; 51 remain active after the user-directed Challenge Mode retirement, in addition to the canvas, shelf, catalogue, Inspector, Console,
quick settings, context menu and task sheets. All share the same visual system;
none embed an old production panel. This is a design coverage inventory, not a
claim of implemented backend or solver behavior.

| Workflow and prototype screen IDs | Production source references under src/ |
| --- | --- |
| files, import, export, templates | ui/components/CircuitLibrary.tsx, ImportExportModal.tsx, TemplatesModal.tsx |
| commands, placement | ui/components/CommandPalette.tsx, Palette.tsx, Toolbar.tsx |
| settings-editing, settings-display, settings-simulation, settings-backup, settings-about | ui/components/SettingsModal.tsx, settings/SettingsTabContent.tsx |
| variant, variant-review, supply, supply-review | ui/components/inspector/ComponentPropertiesView.tsx, variantFamilies.ts; ui/components/ElectricalEditDialog.tsx |
| component-info, device-model | ui/components/ComponentInfoModal.tsx; inspector/InspectorPropertiesContent.tsx |
| coil-model, timer-model, motor-model, protection-model | ui/components/inspector/CoilModelEditor.tsx, TimerModelEditor.tsx, MotorModelEditor.tsx, ProtectionModelEditor.tsx |
| wire, connections, netlist | ui/components/inspector/WireInspectorView.tsx, InspectorConnectionsContent.tsx; ui/Editor.tsx |
| selection-tools, confirm-delete | ui/components/contextMenuItems.ts; ui/components/ConfirmDialog.tsx |
| readiness, validation, analytics, zs | ui/components/ValidationReportView.tsx, ValidationDetailsModal.tsx; inspector/InspectorAnalyticsView.tsx, ZsCheckPanel.tsx |
| history, fault-alert, what-happened | ui/components/EventHistoryPanel.tsx, FaultAlertModal.tsx, WhatHappenedModal.tsx |
| faults, diagnosis, guided, practice-result, pause | ui/components/inspector/Inspector.tsx, InspectorFaultLabView.tsx, DiagnosisPanel.tsx, GuidedCircuitPanel.tsx |
| account, sign-in, recovery, basic-copy | App.tsx; ui/components/SimulatorAccessBanner.tsx; store/simulatorAccess.ts |
| help, shortcuts, contact, welcome, tour, mobile | ui/components/docs/, ShortcutsOverlay.tsx, ContactModal.tsx, WelcomeModal.tsx, MobileSuitabilityModal.tsx; ui/tour/ |
| error, states, map | ui/Editor.tsx and App.tsx; design-only gallery demonstrates loading, offline, blocked and access states |

## Interaction specification

- Hover-in and hover-out both transition. Panels enter in 180 ms and leave in
  160 ms; removal from layout waits for exit. Rapid reopening cancels the old
  exit. Manual and OS reduced motion bypass animation.
- Console uses visible All / Errors / Warnings / Info selection buttons. Counts
  stay available outside the drawer. Clearing logs never repairs a circuit.
- Variants come from the existing family mapping. Hover or keyboard focus shows
  representative photo and terminals without changing the selection. Choose →
  review current/proposed variant → Apply or Cancel. Apply is access-gated;
  Undo restores the previous type. Production must retain its authoritative
  compatibility and connected-wire preview before commit.
- Supply and wire editing use draft values. Closing or cancelling does not commit
  them. Save/Apply records a reversible preview change.
- Properties retains compact raster photos and click-to-enlarge. Artwork remains
  icon + diagram, with optional device-only and symbol-only views.
- Readings show unavailable values. Practice, sign-in, recovery and file actions
  demonstrate explicitly labelled example states without engine or API execution.
- Specialized forms demonstrate the layout of declared teaching models. Their
  complete production validation, individual applicability rules and data
  persistence must use existing implementations during migration.
- Export format cards demonstrate the flow; downloads are labelled preview JSON,
  not finished image/PDF/certificate generation. Rotation/alignment act directly
  in the prototype with Undo and illustrative wire rerouting; production must
  retain its canonical geometry and batched history contracts.

## Review scope before production

Review visual hierarchy and interactions across all map groups, including
phone sheets and dark mode. Then migrate existing behaviors as a scoped UI change,
with source and built-delivery checks, canonical geometry checks, and preserved
access/repair/learning semantics. This prototype does not change phase acceptance.
Cleanup remains subject to the explicit process in CLEANUP_REVIEW.md.


Artwork uses an explicit type registry (artwork.js), rather than a category
fallback. 116 entries share 60 recognisable physical families, with variant
details where appropriate. Combined mode keeps schematic badges separate from
device faces. Readings has unavailable metric rows and conditional model sections;
reference production inspector/ElectricalReadings.tsx and PhasorReadings.tsx.


Right-click component menus include Align, Distribute and Rotate icon rows.
Shift-click adds/removes components from selection; right-clicking one of a
selection preserves that selection. Align requires 2+, Distribute 3+, Rotate 1+.
Empty-canvas menus omit these controls. Actions run directly, without opening
selection-tools; running and read-only states lock arrangement. The standalone
selection.js handles preview transforms and wire paths. Production references:
ui/components/InlineArrange.tsx, contextMenuItems.ts and ui/canvas-actions.ts.


Inspector tabs now divide reference Properties, calculated Readings and quick
Configure edits. The same pattern covers components and wires. Basic edits use
Apply/Reset/Undo; variants and source changes preserve review. Advanced model
and installation editors remain separate. Layout implementation: inspector-quick.js.
Production references: inspector/ComponentPropertiesView.tsx and WireInspectorView.tsx.


## Production migration

The accepted production migration and current validation are recorded in
[the implementation audit](../../audits/open-drafting-table-implementation.md).
Challenge Mode plans and historical design evidence remain available for its
later rebuild; its runtime components are no longer active source references.
The context arrangement replacement is `src/ui/components/InlineArrange.tsx`.
The user explicitly approved the concrete [cleanup](CLEANUP_REVIEW.md) on
2026-10-14. Its four obsolete wrappers/styles are removed, with exact local
backups; shared arrangement and fault/repair actions remain active.
