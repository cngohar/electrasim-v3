# Workspace UI follow-up review — 2026-10-15

Status: review and local design proposal complete. Production implementation has not
started. This review does not advance the completed Phase 1.12 or renew its
functional/performance acceptance. All inspection and previews are local.

The user requested notification toasts above the component shelf, removal of the
subheader except relocated supply/readiness controls, comparison with the approved
Open Drafting Table HTML, a validation-engine explanation/redesign, investigation
of unknown ratings, clearer readiness, removal of rotation from detailed model
settings, improved sections/tabs and a component/specification coverage audit.

## Step 1 — graph navigation and notification/context source review

Started with `graph:phase`, `graph:brief`, targeted `graph:find` and
`graph:impact`. The multi-term briefing had no curated match; the narrower
`drafting`, `toast`, `Header`, `Readiness`, `Validation` and `Inspector` queries
identified implementation and historical design evidence. Search was used only
for missing literal labels and call sites after graph navigation.

Verified from source:

- `src/store/uiStore.ts` stores Console entries in `addLog`; that action does not
  create a toast. `showUndoToast` and `showNoticeToast` share one separate slot,
  with 4 s and 5 s expiry respectively. Those actions do not themselves log a
  Console entry. Individual callers can call both paths.
- `src/ui/components/UndoToast.tsx` renders the shared transient surface without
  a severity variant. `src/ui/open-table.css` positions it above the shelf and
  adjusts it when the phone Inspector is open.
- `src/ui/components/LogPanel.tsx` keeps errors/warnings/info filters and target
  navigation. Clear removes messages only; faults and event history are separate.
- `src/ui/components/SimulationFeedback.tsx` is another, persistent calculation
  feedback surface. It requires current simulation evidence; unavailable and
  outside-voltage findings must stay discoverable after a toast expires.
- `src/ui/components/SubHeaderBar.tsx` still renders supply, readiness, selected
  item/multi-selection context or project name, plus simulation status. The
  legacy context is mounted by `src/ui/Editor.tsx`; preserving supply/readiness
  entry points requires relocation before removing that row.

These are source findings, not browser acceptance. Proposed notification design:
one semantic event produces a Console entry and a severity-coloured 5 s toast;
errors red, warnings amber, success green, information blue. Coalesce repeated
simulation findings, pause expiry on hover/focus, support dismiss/View Console,
preserve Undo actions and persistent unresolved findings. Task progress needs an
explicit completion state rather than an arbitrary expiry while still running.

## Step 2 — validation, readiness, ratings and specification coverage

Reviewed `core/readiness.ts`, `readinessPresentation.ts`, `capabilities.ts`,
`compatibility.ts`, `placement.ts`, `circuitValidation.ts`, the validation action
and stale watcher in `uiStore.ts`, `ComponentLayer.tsx`, `ComponentNode.tsx`,
`ComponentPropertiesView.tsx`, `InspectorOverview.tsx`, `ComponentInfoModal.tsx`
and `componentHelp/index.ts`.

- Readiness compiles the current document, checks source/load paths, shorts,
  terminal-group compatibility and earthing. It does not solve current/power,
  establish operation or certify standards compliance. Empty/invalid/no-source
  block ordinary Run; open/no-load can use explicit diagnostic runs.
- Validation is an explicit rule pass over normalized inputs, readiness,
  applicable current simulation evidence, wiring, earth paths, conductor sizes,
  protection and the selected teaching standard. Stale simulation is excluded;
  edits mark an existing report stale. Its score is only
  `max(0, 100 - 30 * errors - 15 * warnings)`.
- The report UI still says `Circuit Compliant & Safe` for a pass despite the
  engine's explicit limited standards coverage. Empty/incomplete validation
  reports are logged as success by the current status-to-log mapping. Some
  actions write `logs` directly, bypassing `addLog`; a shared notification change
  must include those producers without emitting every simulation frame.
- Supply detection in validation still uses type substrings including
  `terminal`. A direct probe of terminal-strip + LED with one wire has readiness
  `no-source` but no `no_supply` issue and no incomplete marker. Reuse compiled
  source identity rather than expanding this heuristic.
- The canvas maps every unassessed non-missing-model result to `Ratings unknown`.
  A disconnected LED probe instead reports `missing-supply`. The badge therefore
  sometimes describes missing wiring as a missing rating. Map reason codes to
  specific labels and an actionable Inspector section.
- Real rating gaps remain: contacts/outlets often lack declared AC/DC suitability;
  resistive loads often lack a maximum voltage; winding/control models can lack
  explicit ratings or setup. Never fill these from a help-page string or from
  nameplate power. The correct fix is reviewed catalogue metadata or explicit
  model settings with provenance, followed by compatibility/model checks.
- Detailed model settings contain two direct ±90° rotation buttons. Remove those
  controls and their local handlers/imports when implementing the requested
  redesign. Preserve the shared rotation action used by context menus/shortcuts.

Static inventory: all **116** catalogue types can reach the same Specs dialog;
**34** have authored help and **82** use generic fallback content. Only **2** have
explicit authored terminal pinouts and **2** explicit regulation-clause arrays;
other pinouts are derived from ports and generic clauses are injected by the
dialog. Those counts measure dedicated authored fields, not missing terminal
geometry or an absence of learning content.

The default **230 V AC placement probe** produces unknown-rating reasons for
**72** types and conditional unassessed terminal-group law reasons for **16**.
This is a metadata/configuration probe, not 72 confirmed faulty devices or a
regression to the 30 missing models completed in Phase 1.12. An inappropriate
230 V supply can also create expected incompatibility for other devices.

Help/catalogue examples: LED downlight **8/12 W**, tube light **18/36 W**, motor
**1500/750 W**, water heater **3000/2000 W**. Some other differences describe
switching capacity rather than input power; they require semantic review before
correction. The generic fallback currently gives the same broad voltage/current
claims to unrelated types, and ComponentInfoModal requests help by type without
the category fallback argument. Reference help also does not follow instance
overrides. Show actual instance/model data separately from representative help.

The complete inventory, targeted probe results and measured visual metrics are
in [the review data](data/workspace-ui-followup-inventory.json). These are local
static/direct probes, not full numerical or source/built acceptance.

## Step 3 — actual app versus approved HTML

Opened both local pages at **1440×900** and **390×900** with isolated browser
storage; no page exceptions were observed. Captures and raw metrics are local in
`.wrangler/workspace-ui-review/`. The desktop captures were visually inspected.

| Surface | Actual app, desktop | Approved HTML, desktop |
| --- | --- | --- |
| Main command bar height | 54 px | 60 px |
| Command text | 11 px | 13 px |
| Shelf height | 154 px | 166 px |
| Shelf category text | 11 px | 13 px |
| Selected category | underline, square corners | filled soft pill, 9 px radius |

Production's context row is explicitly positioned at left 24 / top 88 px with a
transparent background and 10 px text; it is not a loading/CSS-import failure.
The app also filters ordinary switch/protection parts out of the initial shelf
when their compatibility is unassessed; the prototype shows a fuller Essentials
row. Keep useful parts discoverable with a clear review state rather than
silently treating undeclared ratings as missing functionality.

The discrepancy is real. Restore the approved control scale, pill categories,
tile label spacing and shelf rhythm, with responsive containment checked against
actual production actions. Historical UI acceptance did not assert pixel parity.

## Step 4 — standalone proposal and initial preview checks

The [local interactive wireframe](../design/workspace-ui-followup/index.html)
and [implementation proposal](../plans/WORKSPACE_UI_FOLLOWUP_PLAN.md) cover the
requested layout and workflows. Initial Chromium checks passed eight workflow
groups at each of 1440/1024/640/390/360 px, including control containment/hit
testing, notification-to-Console handoff, filters, readiness, model sections without
rotation, Escape, uncalculated readings, inline/full Specs and dark theme. A
separate timed check passed five-second expiry, hover pause and retained history.
Desktop, phone and phone model captures were visually reviewed. Preview data and
actions are illustrative; this is not source/built application acceptance.

The first scoped formatting/lint check failed on three preview style rules and
graph JSON formatting after `graph:review` rewrote JSON. The preview style fixes
and final formatting/checks are recorded below. The initial browser checks predate
the added wire workflow and later timer pause guard; final targeted checks are
required for those additions.

## Step 5 — wire size, material, installation and visual presentation

User follow-up explicitly added AWG, copper/aluminium and installation method.
Started with `graph:brief wire`, `graph:find WireInspectorView/WirePath/
wireProperties/updateWireProperties`, then targeted impact. The graph did not
index the store method name; search located it in `src/store/circuitStore.ts`.

Verified source: `core/wireProperties.ts` resolves size/AWG, length, material,
installation and derating with provenance. The store synchronizes AWG/mm², clears
contradictory gauge labels and preserves undo/portable data. `WireLayer.tsx` and
`DenseWireLayer.tsx` use theme/state widths and conductor-role colours; neither
uses gauge, material or installation method to style the wire. Route geometry
uses path settings, not the installation method.

Native **source app** reproduction in isolated browser storage selected the demo
wire, opened its real detailed settings, chose **12 AWG**, **Aluminum**, and
**Method B1**, then returned to the real Inspector. There were no page exceptions:

| State, 10 m wire | Resolved area | Material/method | Resistance | Visible SVG |
| --- | --- | --- | --- | --- |
| Initial default | 2.5 mm² | Copper / C | 0.070000 Ω | #b45309, 3.5 px, same path |
| After 12 AWG | 3.31 mm² | Copper / C | 0.052870 Ω | unchanged |
| After material/method | 3.31 mm² | Aluminum / B1 | 0.085196 Ω | unchanged |

The main Inspector already displays length, mm², material and `Method B1`; it
does not show AWG there, expand the method name, or offer a conductor/installation
diagram. Quick Configure has copper/aluminium icons; these are editor choices,
not persistent canvas or Properties indicators. The main summary should show
both units, effective values and whether each came from a default or declaration.

Capacity is deliberately **unassessed for AWG-derived non-table areas** such as
3.31 mm². No next-size ampacity is substituted. Installation method still saves;
its table effect is available only for supported areas. Direct resolver/capacity
probes at 4 mm² / 10 m / derating 1 give Cu C/B1/A = 37/32/25 A and Al =
29/25/20 A under the application's existing teaching table. The Al capacity uses
a documented 0.78 copper-table approximation. These are app-model observations,
not engineering recommendations or a new acceptance of the table.

`bun x vitest run src/store/wireProperties.test.ts
packages/domain/src/circuitValidation.wires.test.ts` passed **9 tests / 2 files**.
This covers AWG/metric precedence, Undo/Redo/export/import and capacity/reporting
boundaries; it does not test thickness/material visuals. The browser attempt first
timed out because a role query excludes the inert background while a native modal
is open. Recovery kept native edits and inspected the background SVG through a
DOM query; evidence is `.wrangler/workspace-ui-review/wire-browser-results.json`
with advanced/overview screenshots. This is one source-browser workflow, not a
built-delivery gate.

Recommendation: labelled Properties rows for size (`12 AWG · 3.31 mm²`), material
(Cu/Al plus a cross-section swatch), installation (small method diagram + full
name), physical length, derating, resistance and capacity status/basis. Keep
conductor-role colour authoritative. An optional selection/hover callout can show
`12 AWG · Al · B1`; do not recolour line/neutral/earth to metal colours. Optional
bounded gauge width is illustrative and needs both ordinary/dense rendering,
zoom/hit-target and performance checks. A method mini-diagram in the Inspector is
clearer than drawing an unmodeled real conduit around every circuit wire.

## Step 6 — final preview and handoff

The final combined standalone Chromium run passed **10 workflow groups at each
of five widths** (1440/1024/640/390/360 px), with no page exceptions, horizontal
overflow or missed header/control hit targets. It exercised all four notification
severities, bounded notifications, retained history/filtering, supply/readiness,
model tabs without rotation, Escape, uncalculated readings, inline/full Specs,
wire AWG/mm² summary, preview changes to 4 mm² / aluminium / Method A / 12 m,
capacity/resistance display and dark theme. A separate timed interaction passed
five-second expiry, hover and keyboard-focus pause, and retained Console history.
Results: `.wrangler/workspace-ui-review/final-preview-results.json`.

Visual inspection then found retained scrolling hid the first wire rows after
Apply, and stacked phone toasts covered the Inspector. The preview now resets
Inspector content scroll after changing views/values and shows one toast at a
time on phones. **Three final focused workflows** at 1440/390/360 px passed with
visible size/method labels, scrollTop 0 and no toast/Inspector overlap. Results and
screens: `final-wire-polish-results.json`, `final-wire-summary-*.png` in the same
local evidence folder. The phone final wire summary was visually inspected.

Failed preview attempts are explicit: the first final run could not connect after
the previous local Vite process stopped; a localhost-only Vite was restarted. The
next run exposed select labels that included option text rather than their intended
short accessible names. Explicit matching accessible names fixed the controls;
the combined and focused runs above passed afterward. These failures do not erase
the earlier initial preview or source-wire results, whose scopes remain separate.

Additional checks: **five graph-tool tests passed**, preview JavaScript syntax
passed, scoped Biome checks passed, all **eight relative proposal document links**
resolve, and `git diff --check` passed before final metadata formatting. Final
format/freshness checks are navigation/static evidence only. Historical unrelated
unreviewed/changed graph records are not automatically renewed.

The output is a verified review plus interactive proposal. Production source,
numerical models and tests remain unchanged. No build/full application suite is
claimed for a documentation/standalone-preview change. Phase 1.12 status and its
accepted exceptions remain unchanged; no commit, push or remote action occurred.
