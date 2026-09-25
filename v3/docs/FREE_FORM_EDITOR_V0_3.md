# Free-form simulator editor v0.3

**Status:** implemented and locally validated on 2026-09-25.

## User-visible capability

The simulator is no longer limited to selecting fixed demonstrations. A user can start a blank schema-v2 document, add free launch equipment, drag equipment on the SVG work area, connect terminals, edit bounded electrical properties, run the resulting network, and undo or redo domain commands.

The free component bench currently includes:

- single-phase regional distribution supply;
- IEC educational MCB or explicitly non-certified North-American educational breaker model;
- IEC RCCB or North-American Class A GFCI;
- line, neutral, CPC, or equipment-grounding conductor variants;
- resistive lamp load;
- single-pole wall switch; and
- IT insulation-monitoring device.

The authored layout is part of schema v2 as optional presentation evidence. It survives database revisions, JSON import/export, sharing, and undo/redo without affecting electrical solving.

## Visual-fidelity boundary

Equipment uses original, scalable technical-hybrid SVG artwork with recognizable real-world construction cues: DIN module proportions, toggle and test controls, rating marks, terminals, enclosure seams, cable jacket/copper core, lamp glass/filament/base, and insulation-monitor display states. These are generic educational representations. They are deliberately **not** labeled as exact manufacturer products, certification marks, or dimensionally interchangeable field equipment.

A truthful “100% identical” claim is not possible for a generic catalog because real devices differ by manufacturer, model, market, terminal arrangement, dimensions, labeling, intellectual property, and certification. Exact product replicas must be added only from licensed manufacturer drawings/assets and reviewed product data. Visual resemblance never implies listing, approval, compatibility, or installation compliance.

## Authoring boundary

Every mutation is sent through `POST /api/simulator/command` and the shared domain command validator. The endpoint returns the inverse command used by browser undo/redo. Supported editor mutations include:

- add/remove/restore component;
- connect/disconnect terminals;
- update bounded component properties;
- set the regional supply family; and
- persist or remove component positions.

Terminal-domain compatibility is enforced before a wire is accepted. Incomplete or singular circuits remain editable, but simulation fails closed with a readable correction prompt.

## Accessibility and responsive behavior

- Components and terminals are represented in the accessibility tree.
- Components can be selected with Enter and removed with Delete.
- Terminals can be activated with Enter or Space.
- Electrical state is repeated in text rather than conveyed only through animation or color.
- Reduced-motion mode preserves static current/fault and danger information.
- Existing component and evidence panels remain responsive drawers on constrained screens.

## Editor usability v0.4

The next authoring pass adds persisted canvas and connection geometry without contaminating electrical physics:

- mouse-wheel zoom centered on the pointer;
- Shift-drag or middle-button canvas panning;
- Fit-view framing;
- persisted schema-v2 viewport state;
- arrow-key component movement in 10-unit increments and Shift+Arrow in 50-unit increments;
- selectable, keyboard-focusable wires;
- individual wire deletion with inverse-command restoration;
- optional visual bend points, draggable bend handles, and automatic-route restoration; and
- preservation of custom routes when a component removal is undone.

Connection routes and viewport state are bounded and validated at the same import/persistence boundary as other schema-v2 data. They do not affect solver topology, impedance, protection, or rule results.

## Validation

The implementation is covered by domain layout/history tests, HTTP command-boundary tests, static UI contract tests, and npm-registry Chromium desktop/mobile checks. Browser validation exercises wire selection, adding a route bend, wire deletion and restoration, blank → add → undo → redo, overload tripping, and reduced-motion open-PEN persistent danger.

## Next fidelity steps

1. Add licensed model-specific equipment packs only when exact drawings, terminal maps, ratings, curves, provenance, and usage rights are available.
2. Add multi-select, group alignment, clipboard operations, named connection routes, and touch-specific viewport gestures.
3. Add dedicated neutral/earth bars, junctions, measurement instruments, and enclosure assemblies.
4. Obtain independent electrical-SME and accessibility review before presenting the editor as release-ready.
