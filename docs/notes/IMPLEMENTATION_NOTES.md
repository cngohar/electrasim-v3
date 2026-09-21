# Pro Mode & Standards Compliance — Implementation Notes

This document records the completed Pro-mode implementation, including the
follow-up work identified during the original editor review. It also records
which validation was executable in this checkout.

## Delivered behavior

### 1. Focused Pro and Student experiences

- The redundant `? Specs` shortcut was removed from the floating sub-header;
  component specifications remain available from the image card and variant
  gallery.
- Manual fault injection is controlled by the persisted
  `manualFaultInjection` setting and remains Pro-only. Student mode does not
  expose the Fault Lab, component/wire injection controls, breaker-trip
  controls, or fault context-menu actions.
- Student mode now shows the active electrical standard and citation in a
  read-only badge. Switching standards and plug systems remains a Pro action.

Primary files:

- `src/ui/components/SubHeaderBar.tsx`
- `src/ui/components/StandardSelector.tsx`
- `src/ui/components/contextMenuItems.ts`
- `src/ui/components/inspector/ComponentPropertiesView.tsx`
- `src/ui/components/inspector/InspectorSimulationContent.tsx`
- `src/store/settingsStore.ts`

### 2. Independent electrical standards and physical plug systems

`src/domain/standards.ts` is the authoritative source for four electrical
rule sets:

| Code | Rule set | Nominal supply | Frequency | Voltage-drop limit (lighting / power) |
| --- | --- | ---: | ---: | ---: |
| `uk` | BS 7671 | 230 V | 50 Hz | 3% / 5% |
| `us` | NFPA 70 (NEC) | 120 V | 60 Hz | 3% / 5% |
| `eu` | IEC/HD 60364 | 230 V | 50 Hz | 3% / 5% |
| `int` | IEC-style International | 230 V | 50 Hz | 3% / 5% |

Physical plug/socket systems are persisted separately as BS 1363, NEMA 5,
Schuko, AS/NZS 3112, BS 546, or All. Changing a rule set updates nominal
voltage and re-runs validation, but does **not** rewrite `plugSystem` or swap
the user's socket hardware. The plug selector is the sole owner of physical
plug selection.

Settings hydration accepts the International preset, preserves valid
standard/plug combinations, and rejects invalid values field-by-field.
Focused unit and deterministic end-to-end coverage both assert that a
standard change leaves the selected plug system unchanged.

Primary files:

- `src/domain/standards.ts`
- `src/ui/components/StandardSelector.tsx`
- `src/store/settingsStore.ts`
- `src/store/settingsStore.test.ts`

### 3. Standard-aware compliance validation

The validation engine applies the active standard to:

- voltage drop at final loads,
- socket RCD/GFCI protection,
- MCB curve suitability for motor/high-inrush loads,
- standard-specific voltage, conductor colours, ratings, and recommendations.

Blocking issues carry `blocking: true`; reports expose the active standard and
`blockingErrorsCount`.

Primary files:

- `src/domain/compliance.ts`
- `src/domain/circuitValidation.ts`
- `src/domain/circuitValidationTypes.ts`

### 4. Shared simulation-start safety and compliance gate

Every ordinary start path (`setSimRunning(true)` and `toggleSim()`) now passes
through one shared gate:

1. Tripped/blown components and melted wires are checked first and remain
   non-bypassable physical failures.
2. In Pro mode, blocking compliance issues pause the simulation, open the
   Validation inspector, and set `complianceGateBlocked`.
3. A regulatory rejection is shown as an inline compliance state, not as a
   fabricated electrical trip alert.
4. Student-mode compliance remains guidance and does not block simulation.

The Validation tab displays an actionable banner with the blocker count, the
first blocking issue, issue navigation, and a clearly labelled Pro-only
teacher/demo override.

Primary files:

- `src/store/uiStore.ts`
- `src/store/uiStore.types.ts`
- `src/ui/components/ValidationReportView.tsx`
- `src/store/uiStore.test.ts`

### 5. Audited teacher/demo override

`runWithComplianceOverride()` starts a Pro simulation despite regulatory
blockers only. It is inert outside Pro mode and refuses to bypass tripped,
blown, or melted equipment.

Each actual override adds:

- a warning `manual_intervention` event,
- the active standard,
- the titles of all blocking issues,
- a warning in the application log.

The event is included in the History intervention count and exposed to tests
as `data-history-event="manual_intervention"`.

Primary files:

- `src/store/uiStore.ts`
- `src/store/uiStore.types.ts`
- `src/ui/components/ValidationReportView.tsx`
- `src/ui/components/inspector/InspectorHistoryView.tsx`

### 6. Durable Simulation History

The Pro Simulation History audit trail is persisted separately from circuit
data under `electrasim:event-history:v1`. It hydrates concurrently with the
circuit and settings before React's first render, and autosaves changes with a
short debounce.

Persistence is schema-versioned and reconstructs untrusted IndexedDB values
from strict event/severity/detail whitelists. Malformed entries are discarded
and both hydrated and live histories are capped at 100 events. Circuit import
or replacement cannot silently erase the audit trail.

Primary files:

- `src/store/eventHistoryPersistence.ts`
- `src/store/eventHistoryPersistence.test.ts`
- `src/main.tsx`
- `src/ui/components/inspector/InspectorHistoryView.tsx`

### 7. Unified three-state diagnostics

The former thermal and stress-zone booleans are replaced by one persisted
setting:

```ts
type DiagnosticOverlayMode = 'off' | 'heat' | 'heat-vdrop';
```

The Toolbar cycles **Off → Heat only → Heat + V-drop**, while the Analytics
inspector exposes the same setting as a select control. Migration precedence
for old saved data is:

1. a valid `diagnosticOverlayMode`,
2. legacy `stressZonesEnabled: true` → `heat-vdrop`,
3. legacy `thermalOverlayEnabled: true` → `heat`,
4. otherwise `off`.

Heat mode retains detailed component temperature cards and adds thermal wire
bands. Combined mode renders component stress halos and combines wire thermal
loading with standard-relative voltage drop. Wire bands reuse the exact
orthogonal path precomputed by `CircuitCanvas`, falling back to the shared
bezier/polyline geometry builder, so diagnostics follow routed bends rather
than drawing endpoint shortcuts. The overlay remains non-interactive.

Primary files:

- `src/store/settingsStore.ts`
- `src/ui/components/Toolbar.tsx`
- `src/ui/components/inspector/InspectorAnalyticsView.tsx`
- `src/ui/CircuitCanvas.tsx`
- `src/ui/canvas/ComponentNode.tsx`
- `src/ui/canvas/StressZoneOverlay.tsx`
- `src/ui/canvas/geometry.ts`

### 8. Standard- and plug-aware palette recommendations

The palette now promotes a compact essentials set for the selected standard
and independently selected plug:

- mains supply,
- standard-appropriate protection,
- the selected plug system's primary socket,
- a representative lighting load.

US recommendations promote a C-curve MCB and GFCI; IEC/BS-style presets
promote RCBO/MCB/RCD protection. Recommended entries are also promoted within
their normal categories.

Recent components pass through the same eligibility rules as the main
palette: region-incompatible sockets and Pro-only entries in Student mode are
not shown. Every normal, recent, and recommendation tile exposes
`data-palette-type` for deterministic automation.

Primary files:

- `src/ui/components/Palette.tsx`
- `src/domain/standards.ts`

### 9. Recommended load protection

For eligible selected loads, Pro Properties displays the recommended breaker
rating, trip curve, and design current. Values recompute from load power,
voltage, load type, and active standard. Sources, junctions, protection, and
distribution components do not show the badge.

Primary files:

- `src/domain/standards.ts`
- `src/ui/components/inspector/ComponentPropertiesView.tsx`

## Automated coverage

Unit/integration coverage includes:

- settings migration and International-standard hydration,
- standard/plug independence,
- shared physical-safety and compliance gating,
- Pro override auditing and physical-fault refusal,
- strict event-history parsing, capping, hydration, and autosave.

`e2e/pro-features.spec.ts` contains eight deterministic Playwright tests for:

- removal of the redundant Specs shortcut,
- Pro-only fault controls,
- Student read-only standards,
- independent standard/plug selection and palette recommendations,
- compliance gating, override, audit persistence, and reload hydration,
- Simulation History visibility,
- all three diagnostic states,
- recommended load protection.

The compliance test imports a complete, compressed circuit fixture rather
than depending on mutable demo content, so a successful browser run has one
unambiguous regulatory blocker.

## Validation status

Completed in this checkout:

- `npm run check` — TypeScript, Biome lint, and all 61 Vitest files / 898 tests pass.
- `npm run build` — Vite/PWA, Astro, and postbuild pass; only the existing
  large-chunk advisory is emitted.
- `npm run stress:challenge` — 750 scenarios / 4,500 evaluations pass.
- `npm run stress:generator` — 3,726 challenges, 223,656 injected faults, and
  414,574 verified repairs pass.
- `npm run stress:diagnosis` — 600 scenarios / 10,973 evaluations pass.
- `npm run stress:ohmageddon` — 1,800 scenarios / 6,816 evaluations pass.
- `npm run benchmark:simulation` — passes serially at 1.15 ms median and
  1.69 ms p95 for 200 components / 396 wires (8 ms p95 budget).

- `e2e/pro-features.spec.ts` — all 8 focused Pro/standards tests pass in Chromium.
- Full desktop Chromium suite — 63 passed and 2 intentionally skipped (65 total).
- Full mobile Chrome suite — 53 passed and 12 intentionally skipped (65 total).
- Opt-in dense browser benchmark — passes with a deterministic compressed-share
  fixture containing 202 components and 300 wires.
- Production Playwright suite — all 11 tests pass against the built Pages output.

Playwright's normal browser downloads remained unavailable because every
browser CDN reset TLS connections. Chromium execution used a temporary runtime
obtained through the reachable npm registry and matching NSS/NSPR libraries;
no runtime package or browser binary was added to the repository. No genuine
WebKit executable or library was present locally, npm's Playwright WebKit
packages contained only CDN-backed installers, and system package mirrors were
also unreachable.

An exact active Playwright 1.62.1 WebKit cache (revision 2336, browser 26.5) was
located in GitHub Actions, but GitHub's public cache REST API exposes metadata
and deletion rather than archive downloads. A temporary GitHub Actions
validation workflow was also prepared; its push was rejected because the Arena
GitHub App lacks `workflows` permission, and it was removed from the final tree.
The user chose to finalize the environment-blocked commit rather than reconnect
GitHub. The `tablet-safari` project therefore remains an explicit validation gap
rather than being misreported as Chromium coverage.

## Remaining work

No known application implementation item from the original review remains.
Run `npx playwright test --project=tablet-safari` in an environment that can
install Playwright WebKit 26.5/revision 2336 to close the sole browser-validation
gap.
