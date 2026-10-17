# Workspace refinement proposal

Local standalone wireframe for the 2026-10-15 UI review. Open
`http://localhost:3000/docs/design/workspace-ui-followup/index.html` while the
normal Vite development server is running.

The preview reuses the approved Open Drafting Table artwork and header/shelf
dimensions. It adds a styled Supply & readiness entry, shared five-second
notification/Console examples, Circuit checks, inline technical information and
conditional model-section examples without rotation controls. Desktop, tablet
and phone layouts are included; the theme button exposes both palettes.

The Wire properties button opens a persistent labelled summary of AWG/mm²,
Cu/Al material with cross-section swatch, installation mini-diagram/full name,
length, derating, resistance and explicit capacity coverage. Configure can change
the illustrative wire values. Canvas conductor colours remain distinct from metal
swatches. The tiny preview calculations demonstrate existing resolver/table
behavior; they do not establish a circuit solve or add AWG ampacity tables.

Interactions are illustrative. Run, validation, model edits, category browsing and
component details do not invoke the application stores or electrical engine.
The sample model form describes an LED; other selected component names do not
turn it into a model editor for that family. The supply selection demonstrates
placement only and never applies an electrical change. Native dialog Escape,
focus return, reduced motion and notification hover/focus expiry are supported.

Use [the audit](../../audits/workspace-ui-followup-review.md) and
[implementation proposal](../../plans/WORKSPACE_UI_FOLLOWUP_PLAN.md) for verified
findings, scope and checks. This artifact is a design proposal, not production
implementation, electrical evidence or phase acceptance.
