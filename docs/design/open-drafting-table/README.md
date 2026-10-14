# Open Drafting Table — simulator design proposal

Status on 2026-10-14: this accepted standalone prototype has been migrated to
production locally in Phase 1.10; see the
[implementation audit](../../audits/open-drafting-table-implementation.md).
The user confirmed the centered header, icon + diagram appearance and right-side
desktop / bottom-sheet phone Inspector. Reference images are retained. The active
prototype has 51 screen designs after the user-directed Challenge Mode deferral;
historical 52-screen screenshots/checks below preserve the earlier design state.
Hover and exit motion, Console selection buttons and variant review workflows are
implemented in the prototype and production migration. The approved four-file
cleanup is complete. Phase 1.9's historical performance exceptions remain unchanged.
This file's dated prototype results are design evidence, separate from production
acceptance; the existing Astro/React and electrical-engine boundaries remain.

Open `index.html` in a browser. Photo previews reference existing images in
`src/assets/images`; there are no external assets or network dependencies.

## Design rationale

The existing shell still combines a workspace rail, vertical component library,
full-width header, supply/context strip, multi-tab Inspector, bottom simulation
controls and status surfaces. Enlarging those controls would retain competing
layers. This proposal reduces the number of surfaces visible during ordinary
editing and keeps larger readable controls and whitespace.

- Full-width component shelf at the bottom: one category and one row of parts,
  horizontal overflow, and a searchable catalogue containing metadata for all 116
  current component definitions. Placement controls expose supply and standard
  choices. Production must retain authoritative compatibility and membership rules.
- Centered floating header: Select, Wire, Undo/Redo, Fit, Labs and Run. Project/file,
  account, standards, configuration and general navigation use the project menu
  or settings. A full-width header option is included for comparison.
- Right Inspector: opens on selection or Inspect; closes completely without a
  permanent tab rail. Properties, Readings and Configure separate reference information, results
  and quick edits. Detailed model controls open from Configure. Pin reserves
  canvas space on desktop. Fit in production must account for visible surfaces.
- Component photos remain near the top of Properties as a compact reference,
  with click-to-enlarge. The production mapping is already provided by
  `src/ui/components/componentImages.ts` and consumed by
  `src/ui/components/inspector/ComponentPropertiesView.tsx`. Some assets represent
  a family or different variant; label them as representative rather than an
  exact device or manufacturer specification. Photos identify physical hardware;
  the icon + schematic view remains the editing representation on the canvas.
- Console is independent of component selection. Its always-visible entry above
  the shelf shows error/warning counts. An expandable drawer filters error,
  warning and information messages, supports clearing messages and navigation to
  the affected component. Desktop Console clears the open Inspector. On phones,
  Console and Inspector share the sheet area and open one at a time. Both leave
  zoom and the Console trigger accessible above the component shelf.
- Production run-blocking errors must also appear near Run with an action to
  review the cause. Preserve existing logs/event history and accessible error
  presentation. Clear logs is separate from clearing faults, resetting protection
  or replacing damaged devices. The Console preview uses explicitly sample data.
- Learning, Diagnosis, Fault Lab, diagnostics, logs and netlist remain reachable
  through explicit entries. A task sheet opens above the bottom shelf; only one
  task sheet at a time. Basic/Pro and entitlement remain separate, with existing
  membership, supply-confirmation, readiness and repair semantics.
- Phones: compact two-level header, scrollable full-width component shelf and
  an Inspector sheet above it. Use safe-area padding and keyboard-aware clearance
  in production. The desktop pin option is hidden on phones.
- Existing blue/slate branding and light/dark choices, with opaque quiet surfaces,
  larger spacing and fewer borders, badges and permanent information strips.

## New component appearance study

The user requested exploration of new component artwork as well as shell layout.
This prototype draws simplified device faces (supply, rocker and lamp), readable
terminal labels and modest selection outlines. Compare Sculpted devices, Clean
symbols and Device + symbol through the design controls. Both uses a separate small schematic badge beside the device, keeping its
physical face unobscured. These are artwork ideas, not new components.
The user preferred this icon + diagram combination; Both is now the preview's
default, with separately persisted preview choices continuing to take precedence.

The sample diagram, schematic glyphs, device shells and port coordinates are
illustrative. They are not electrical fixtures or an approved symbol standard.
Production artwork must use the existing canonical terminal IDs and coordinates,
wire anchors and rotation contracts. Preserve zoom scaling, selection/hit targets,
saved circuit content, simulation inputs/results and appearance preference behavior.
Do not infer electrical validity from this illustration.

## Review and implementation boundary

Try the two headers, all three appearances, theme, Inspector open/close/pin,
categories, search, preview placement and Undo/Redo. Run changes visual state
only; Readings explicitly has no simulation data. Preview settings are stored in
the separate `electrasim-open-table-preview` localStorage key.

Motion uses brief feedback in both directions: 180 ms panel entrance, 160 ms
panel exit, a 2 px hover lift with return transition, a fading selection outline
and a short placement reveal. Panels remain mounted until exit completes; rapid
reopening cancels the pending exit without hiding the reopened panel. No idle
decoration loops. The preview offers Subtle transitions / No animation and honors
OS reduced motion. Production device/current-flow effects continue to consume
fresh accepted engine results with existing reduced-motion, offscreen and dense
scene safeguards. No numerical or dense-rendering improvement is claimed here.

The first production milestone, after design agreement, would rehost existing
actions in this shell. Then redesign palette browsing, Inspector/task workflows
and component artwork in one scoped implementation. Preserve current lab/access,
electrical-edit confirmation and persistence behavior. Use meaningful development
checks and one consolidated local gate, with desktop/phone/light/dark/keyboard
coverage and canonical anchor invariants. Existing performance exceptions remain
unresolved unless measured improvements actually meet the unchanged targets.

No Community implementation, commit, publication, deployment, Cloudflare resource
operation or production UI change is included in this prototype.

## Earlier shell-only preview evidence — 2026-10-13

These historical checks preceded the complete multifile prototype below. Their
old selectors and animation assertions are superseded by the current checks.

Chromium passed 35 preview assertions with no browser page errors. Checked
selection/Inspector open-close-pin, keyboard tabs, empty Readings, category/catalogue
search, inert modal background, preview placement/Undo/Redo, visual Run/Stop and
separate theme/appearance persistence. Layout checks covered 1440×900, 1280×720,
1024×768, 768×1024, 390×844 and 360×740: no page overflow, full-width shelf and
header containment. Phone Inspector clears the shelf and hides desktop pinning.

Screenshots: `desktop.png`, `desktop-inspector.png`, `desktop-wide-symbols.png`,
`desktop-dark-both.png`, `phone.png`, `phone-inspector.png`, `phone-wide.png`.
The desktop, pinned desktop, phone and dark/combined screenshots were visually
reviewed. The ignored runner and assertion ledger are in
`.wrangler/open-drafting-table/`. This is prototype evidence, not production
acceptance, electrical validation, accessibility certification or a performance gate.

### Confirmed direction, images, motion and Console refinement

The user confirmed the centered header, icon + diagram appearance and desktop
right / phone bottom Inspector. Retained reference images from the existing
registry; the preview does not change the production registry or source assets.
Added click-to-enlarge, brief interaction motion with manual/OS reduced-motion
handling, and the previously missing visible Console with sample severity counts,
filtering, message clearing and component navigation.

The first refinement run exposed a phone sheet covering the Console trigger.
The corrected sheet reserves room for zoom/Console controls. Subsequent Chromium
refinement checks passed 27 assertions: all eight referenced assets decode, photo
enlargement restores focus, error navigation selects the source, desktop Console
clears Inspector, phone sheets swap and clear the shelf, the 360 px Console trigger
clears zoom, and manual/OS reduced motion suppresses panel animation. The existing
35-check preview run also passed after the initial refinement. Evidence is
aggregate preview coverage, not a production acceptance gate.

Additional screenshots: `desktop-photo-console.png`, `phone-photo.png` and
`phone-console.png`; motion is allowed to settle before capturing these images.
The runner and ledger remain ignored in `.wrangler/open-drafting-table/`.

## Complete simulator prototype — current review

Open **Project menu → Full simulator design map** to browse every screen.
Ctrl/Cmd+K opens searchable commands. The map includes file and template flows,
all five settings sections, component variants and references, specialised
device forms, supply and wire review, connections/netlist, diagnostics/readings,
Fault Lab, Diagnosis, challenges/guides, account/recovery and help/onboarding.

See [SCREENS.md](SCREENS.md) for the source-to-screen inventory, interaction
specification and intentionally illustrative operations.
See [CLEANUP_REVIEW.md](CLEANUP_REVIEW.md) for the user-confirmed deletion policy.
No production code was deleted or changed for this prototype.

### Files

- index.html: workspace markup and shared SVG artwork.
- prototype.css: shared visual system, responsive layouts and hover transitions.
- artwork.js: explicit catalogue mapping and 60 representative physical families.
- workspace.js: canvas demonstration, panel motion, focus, Console and preferences.
- catalog-data.js: static public metadata from current definitions, variant
  families and photo registry; 116 definitions and 75 family-map entries.
- views.js: all 52 screen layouts.
- inspector-quick.js: contextual component/wire Configure layouts and summaries.
- selection.js: preview selection, canvas arrangement and inline menu controls.
- flows.js: local interactive states, drafts, review/apply/cancel and Undo.
- SCREENS.md and CLEANUP_REVIEW.md: coverage and migration boundaries.

Classic scripts allow direct file opening with no build, server, external assets
or API. The existing repository raster images remain referenced in place.

### Current verification

Chromium completed 328 assertions with no page errors: 52 screens at six viewport
sizes (1440×900, 1280×720, 1024×768, 768×1024, 390×844, 360×740), plus panel exit
timing and rapid reversal, manual/OS reduced motion, variant cancel/apply/undo,
supply/wire cancellation, command search and Console selection buttons.
The layout assertions check page and dialog-body horizontal overflow.

Current screenshots include full-settings.png, full-variants.png, full-map.png,
phone-settings.png and phone-wire.png. Desktop settings/variants and phone wire
screenshots were visually reviewed. These results validate the standalone
prototype, not solver behavior, complete accessibility or production acceptance.
Ignored local runners and assertion ledgers are in .wrangler/open-drafting-table/.

An additional Chromium workflow run passed 22 assertions without page errors:
hover-in/out and keyboard variant previews, read-only editor locks, supply apply/
undo, draft retention across wire selections, diagnostic filtering, import errors
and confirmation, specialised timer fields/save, task pause/resume and phone
Console accessibility. Its first run stopped on an ambiguous test locator; after
scoping it to the task sheet, the complete run passed. These are aggregate
prototype checks (350 assertions), not an uninterrupted production gate.

Additional reviewed screenshots: full-task.png, full-dark-files.png and
full-phone-console.png. Desktop tasks reserve drawing space; phone panels share
the sheet area and transient messages do not intercept input.

The existing Phase 1.9 local closure and performance exceptions are unchanged.

### Muted palette and selective layout refinement

Darkened light-theme secondary text, canvas, dividers and muted selection surfaces.
Dark-theme canvas and panels are deeper while secondary text remains readable.
“What happened?”, the component netlist and welcome choices now use three cards
across on desktop, stacking on phones. Validation and confirmation layouts retain
their focused reading order. Copper/Aluminium selectors have small metallic Cu/Al
material badges, with text labels and pressed states; no new SVG art or general
icon decoration was introduced.

Focused Chromium review covered these six affected/adjacent screens at 1440, 390
and 360 px (18 overflow checks), material selection and light/dark screenshots,
without page errors. Screenshots: refined-repair.png, refined-phone-wire.png,
refined-dark-repair.png. This is a prototype-only visual refinement.


### Component artwork, light response and Readings refinement

The earlier combined-mode screenshot exposed a schematic overlay obscuring the
device face. Both now separates physical artwork from a small schematic badge.
The new artwork.js maps all 116 catalogue types explicitly across 60 physical
families. Related ratings and contact variants share their underlying housing;
unrelated appliances no longer inherit the same motor/junction drawing. These
remain illustrative silhouettes, not exact manufacturer or certified symbols.
The shelf, catalogue and preview placement use the same registry.

The lamp uses a warm local lens glow and a soft surrounding halo, with an on/off
fade. The whole selection box stays neutral. Production illumination must depend
on fresh supported load response, not merely the Run button or conductor voltage.
Run remains a visual-only demonstration here; no electrical claim is added.

Readings now previews terminal-pair voltage, branch current and power plus
expandable device-specific fields. Transformer, coil/contact, timer, protection
and three-phase motor sections depend on the selected device. Values remain
unavailable. Actual integration must preserve ElectricalReadings.tsx and
PhasorReadings.tsx contracts, freshness guards and unsupported-model limits.
Waveform, temperature and energy displays are not invented.

Context-menu actions have no individual box borders; hover and keyboard focus
remain visible, with one outer menu surface and a divider before removal.

Focused checks cover 116 artwork mappings, 60 physical families, separate canvas
badges, lamp on/off glow, borderless menu hover, all catalogue entries, matching
placement artwork, unavailable Readings and desktop/phone containment. Reviewed
canvas, catalogue-family, context-menu and Readings screenshots. The first
exploratory browser run stopped on an ambiguous junction-category test selector;
the scoped artwork runner completes the workflow separately. Local evidence:
.wrangler/open-drafting-table/check-artwork.mjs and artwork-checks.json.

Review images: artwork-both-running.png, artwork-family-sheet.png,
artwork-catalog-junction.png, artwork-catalog-relay.png, artwork-catalog-load.png,
artwork-context.png, artwork-readings.png and artwork-phone-relays.png.
This remains a design prototype; production code and electrical models are unchanged.

### Canvas artwork connection correction

The user correctly identified that the first artwork update left the three
existing canvas devices on their old inline drawings. The canvas now renders
their device faces and schematic views from artwork.js too. Variant Apply/Undo
refreshes the canvas silhouette and any matching placement preview. DOM-equivalence
checks compare the three rendered faces against the registry after parsing SVG,
rather than comparing raw self-closing markup strings.

Focused Chromium checks passed for shared canvas rendering, bulb-to-CFL Apply and
Undo, placement variant refresh, appearance modes and phone containment, without
page errors. Reviewed artwork-canvas-shared-running.png; phone capture is
artwork-canvas-shared-phone.png. Terminal/wire geometry remains an illustrative
prototype, not a migrated production circuit. Canvas rendering is now connected;
production implementation still has not started.


### Inline right-click arrangement

Component context menus now contain labelled Align, Distribute and Rotate
sections with borderless icon controls, hover feedback and accessible names.
Clicking an icon immediately arranges the current selection; no new modal opens.
Alignment requires two components, distribution three, and rotation one.
Shift-click adds/removes selections; an empty-canvas menu has no arrangement
section. Running and read-only states disable changes.

Preview positions and rotation participate in the existing local Undo/Redo
history. Rotated/moved terminals update illustrative wire endpoints; captions
remain upright. Production must still use its canonical geometry, circuit
selection and history functions during the later UI migration.

Focused Chromium passed immediate actions, selection thresholds, Undo restoring
wire paths, empty-canvas behavior, read-only locks and phone containment, with
no page errors. Reviewed inline-arrange-menu.png and inline-arrange-phone.png.
Local runner: .wrangler/open-drafting-table/check-inline-arrange.mjs.


### Inspector quick editing — Properties / Readings / Configure

The third tab, Configure, handles common edits in the Inspector. Properties keeps
reference photos, category/terminal summaries and connections; Readings remains
current-results-only. Configure shows component label, family variant and
applicable basic nameplate/operating/source controls. Detailed coil, timer,
protection, motor and winding settings retain focused windows.

Selecting a wire now opens this same Inspector with wire-specific Properties,
Readings and Configure. Quick wire edits are label, length, cross-section and
Copper/Aluminium. Installation method, derating and assessment context remain
in the detailed cable editor. Sample live/neutral/earth paths keep separate
preview settings. There is no electrical calculation behind these example values.

Configure uses drafts with Apply and Reset. Apply is one Undo step; cancelled
variant/source reviews do not commit drafts. Connection/rating-sensitive variant
and source changes retain their review windows. Variant default labels and
nameplate power follow the chosen variant, while custom edits stay intact.
Advanced and quick editors read the same saved basic values. Running/read-only
states lock configuration; keyboard arrows/Home/End navigate all three tabs.

Chromium passed 37 focused checks without page errors: quick Apply/Reset/Undo,
invalid-number blocking, reviews/cancellation, wire selection and independent
path values, keyboard tabs, desktop/phone overflow and editing locks. Additional
checks passed variant defaults/custom values, advanced-editor consistency and
wire Inspector reopening. Reviewed component, wire, phone and dark screenshots:
inspector-configure-component.png, inspector-configure-wire.png,
inspector-configure-phone.png and inspector-configure-dark.png.

Local runners/evidence remain in .wrangler/open-drafting-table/.
These are standalone prototype checks; production migration, authoritative
capability/validation rules and built-delivery acceptance are still future work.

Configure's Apply/Reset actions now remain in a fixed Inspector footer while
fields scroll. Screenshot review identified the need on small viewports. The
37-check focused run passed again after this adjustment; the action bar was also
checked within desktop, wire, phone and dark panels.

## Accepted implementation and Challenge Mode deferral — 2026-10-13

The user accepted this design and authorised actual implementation. Before
production redesign, they explicitly requested removing Challenge Mode runtime
while preserving plans/docs for its later-stage rebuild. Its active prototype
route/actions are removed; the preview now has 51 screen designs. Historical
52-screen screenshots/results above stay historical evidence.

See the [retirement audit](../../audits/challenge-mode-retirement.md) and
[accepted implementation plan](../../plans/OPEN_DRAFTING_TABLE_IMPLEMENTATION_PLAN.md).
Other simulator behavior and unrelated deletion approval boundaries are preserved.
