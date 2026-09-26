# ADR 0007 — SVG renderer with visual-only Matter

- Status: accepted for Phase 1
- Date: 2026-09-26

## Decision

Retain the existing accessible SVG renderer, component artwork, orthogonal routing and viewBox/viewport model. Measure representative circuits before adding culling or LOD. Target 60 fps at 200 components and 400 wires; preserve keyboard and pointer behavior, zoom-to-fit and reduced-motion support.

Add Matter.js only for optional cable sag, snapping and overload effects in 1.6. Electrical connectivity, currents, trips and diagnostics remain outputs of the pure domain solver. Renderer/effect state must never feed back into those calculations. Pixi/Three are not Phase 1 dependencies.

## Consequences and gate

SVG keeps DOM accessibility and existing tooling. Large graph costs must be measured rather than assumed. Matter must be lazy/optional, throttle inactive/offscreen work and respect reduced motion. Verify identical electrical results with effects enabled/disabled and test pointer/keyboard behavior after layering changes.
