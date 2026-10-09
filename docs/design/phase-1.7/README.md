# Phase 1.7 design preview

Standalone clickable mockup with no electrical simulation.
Open `index.html`, or serve this directory on localhost.

The user accepted the overall layout and existing Lab Glass colors/theme.
Their requested refinement is configurable component appearance: recognizable
device icons, circuit symbols, or both. The updated demo implements all three
in Settings for the library, canvas and selected-component icon. Device icons
are the proposed default; the demo remembers this choice in its own localStorage
key. The illustrations are prototype artwork, not new electrical models.

Production implementation should retain existing device artwork and accessibility
presets where applicable. Appearance must not alter terminals, connectivity,
electrical results or saved circuit content. This approval concerns the design;
the production interface is now implemented separately in the app. See
[local acceptance](../../audits/phase-1-ui-modes.md).

Checked in Chromium: appearance choices, reload persistence, desktop/phone
settings, light/dark screenshots. Earlier preview checks covered component
search, Inspector tabs, preview timer/reset and phone panels.
