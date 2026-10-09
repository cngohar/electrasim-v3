# ADR 0007 — SVG renderer with visual-only Matter

- Status: accepted for Phase 1
- Date: 2026-09-26

## Decision

Retain the existing accessible SVG renderer, orthogonal routing and viewBox/viewport model. Enhance the current component artwork into recognizable illustrations of physical electrical devices, following the user's design clarification on 2026-09-27. Use clean vector shapes, restrained depth, meaningful terminals and readable device markings; preserve terminal identities and the existing Circuit format. Measure representative circuits before adding culling or LOD. Target 60 fps at 200 components and 400 wires; preserve keyboard and pointer behavior, zoom-to-fit and reduced-motion support.

Add Matter.js only for optional cable sag, snapping and overload effects in 1.6. Electrical connectivity, currents, trips and diagnostics remain outputs of the pure domain solver. Renderer/effect state must never feed back into those calculations. Pixi/Three are not Phase 1 dependencies.

## Consequences and gate

SVG keeps DOM accessibility and existing tooling. Large graph costs must be measured rather than assumed. Matter must be lazy/optional, throttle inactive/offscreen work and respect reduced motion. Verify identical electrical results with effects enabled/disabled and test pointer/keyboard behavior after layering changes.

## Performance decision boundary

SVG is already the rendering approach; adding a renderer library is a tradeoff, not an automatic performance upgrade. Profile React updates, wire routing/intersection work, SVG paint and animations separately. Reuse static artwork and simplify decorative details at distant zoom levels while retaining selection, terminals needed for interaction and safety indications.

The Phase 1.4 browser fixture now imports 200 components and 400 wires, with headless CPU/idle thresholds looser than a 60 fps interaction target. The recorded simulation benchmark measures solver time, not rendering. Neither establishes the new 200-component/400-wire target with enhanced artwork. Phase 1.4 must measure that workload while idle, panning, dragging and zooming, recording frame intervals, input latency and the test environment. A 60 Hz display allows roughly 16.7 ms per frame; headless measurements must be reported as such.

If representative browser measurements still show rendering as the limiting cost after targeted optimizations, compare a small Canvas 2D or Pixi/WebGL prototype using the same circuit, artwork and interactions. Adopt a different renderer only with measured benefit and a plan for keyboard access, hit testing, exports and maintenance; revise this ADR before that architectural change. The starting implementation remains SVG.

## Phase 1.4 result — 2026-09-27

The canvas foundation is implemented with cached vector bodies, memoized component/wire layers,
gesture-aware panel blur, rotation-safe dragging and one panel-aware fit action. Full terminal
identity, safety/trace overlays, keyboard controls and theme-aware exports are retained.

[Measured evidence](../PERFORMANCE.md#phase-14-measurements-2026-09-27) shows substantially faster
pan; dense zoom remains below target. The opt-in Canvas 2D paint comparison improves zoom but
slows pan and lacks interaction/accessibility/export parity. Keep SVG for Phase 1; **60 fps is
still an open performance target**, not a passed gate. No production renderer dependency or
Matter effects were added. Culling requires a later measured design that preserves focus,
wire crossings, gesture previews and exports.

## Phase 1.6 implementation — 2026-10-09

Matter 0.20.0 is dynamically imported only for visible, enabled, current-result
consequence animations. SVG draws illustrative local cable sag/snap accents and
device stress/damage halos. The original routed conductors and their hit targets
remain authoritative. No fire or temperature prediction is implied.

At most 24 visible targets / 48 non-colliding bodies run at a throttled 30 Hz,
using two fixed 60 Hz substeps. After 45 displayed steps the scene is disposed and
its settled SVG retained. Hidden/offscreen, stopped, paused, reduced-motion and
dense (>50 components) views allocate no active physics. A persisted setting can
remove the extra layer; existing fault/damage indicators remain. Diagnosis
exercises suppress the extra layer to avoid adding fault-location hints.

The animation clock never advances electrical time. Current contract/revision
checks gate result-driven consequences; saved damage remains visible while
stopped. Trips are separate from irreversible damage. Tests and measurements are
collected once after full implementation in `verify:phase-1.6`; see the
[delivery plan](../plans/PHASE_1_6_EFFECTS_PLAN.md). Earlier dense interaction and
solver performance exceptions remain unchanged.

Physics API reference: [Matter.Engine](https://brm.io/matter-js/docs/classes/Engine.html)
and [Matter.Constraint](https://brm.io/matter-js/docs/classes/Constraint.html).
