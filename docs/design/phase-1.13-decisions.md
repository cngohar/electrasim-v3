# Phase 1.13 implementation design baseline — 2026-10-16

The user has now asked to start the next phase from the graph. These decisions
carry the existing [combined plan](../plans/PHASE_1_13_UI_FAULT_LAB_PLAN.md) and
its two previews into implementation. They do not claim new human acceptance
of production screens. No additional material design choice is needed to start.

## Layout and interaction decisions

- Use the [workspace preview](workspace-ui-followup/index.html) and the approved
  Open Drafting Table proportions: centered commands, full-width component shelf,
  desktop-right/phone-bottom Inspector. Preserve the muted slate palette, readable
  contrast, labelled controls, keyboard focus and existing artwork. The preview's
  Explore controls, illustrative calculations and placeholder commands are not
  production features.
- Relocate supply/readiness into one Circuit entry; keep AC/DC, voltage, frequency,
  phase, source-change confirmation and edit locks available. Remove the duplicate
  context row only after its real controls have working destinations.
- Place severity notifications above the shelf with Console/Inspector clearance.
  Completed events last five seconds, paused on hover/focus; progress persists.
  Text and semantic icons accompany colour. Keep Undo available when other events
  arrive; dismissal does not remove Console history or unresolved findings.
- Properties shows saved instance/reference data, Readings shows fresh calculated
  values, Configure owns drafts. Use conditional Electrical / Behaviour /
  Installation sections. Remove rotation only from the detailed model dialog.
- Wire Properties shows AWG/mm², labelled Cu/Al swatch, full installation method and
  diagram, length, derating, resistance, capacity status and provenance. Retain
  role colours and explicit unassessed AWG ampacity. The preview swatch is material
  information, not a new conductor-colour or thickness convention.
- Use the [Fault Lab preview](fault-lab-followup/index.html) for distinct internal,
  conductor and named-terminal openings. Exact type/target Applied state, Inspect,
  Clear and an explicit cause selector replace silent duplicate drafts and hidden
  first-cause selection. Keep six numbered Help rows with small semantic diagrams.
- Motion is a brief separation ending in a static gap, with a reduced-motion final
  state. No invented arcing/fire. Preserve cause clear, protection reset to OFF,
  explicit ON and damaged-part replacement as separate operations.
- Circuit checks separate Connections, Ratings, Calculation and Teaching rules.
  Counts describe assessed/pending/findings scope; no percentage or universal
  safety/compliance claim. Reference guidance never becomes a device rating.

## Review evidence and remaining visual acceptance

Read both preview HTML/CSS/README sources and the two investigation reviews.
Inspected the existing workspace desktop and 390 px wire-summary captures and the
Fault Lab desktop terminal-cue capture. Local paths:

- `.wrangler/workspace-ui-review/final-wire-summary-1440.png`
- `.wrangler/workspace-ui-review/final-wire-summary-390.png`
- `.wrangler/fault-lab-followup-review/proposal-1440.png`

These are historical illustrative previews, not fresh production acceptance.
The phone preview uses scrolling for the lower Properties rows, which must remain
reachable. Production needs fresh 1440/1024/640/390/360 px, light/dark, overlap,
keyboard, touch and reduced-motion checks in milestones 1.13.4–8. Exact associated
wire-path anchoring needs browser geometry assertions, not screenshot judgement.
