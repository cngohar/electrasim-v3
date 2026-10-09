# Phase 1.6 — state-driven visual effects

Status: complete locally, 2026-10-09.

## Delivery agreement

Implement the complete phase continuously. Foundation, visuals, accessibility and
performance are work items within one phase, with no intermediate acceptance
gates. Builds and typechecks may run during implementation. Run the consolidated
local acceptance once implementation is complete, then rerun affected checks for
any fixes. No Cloudflare operation or publication is included.

## Implementation

- Add a read-only visual projection of current versioned results and saved damage.
  Distinguish overload, irreversible damage and resettable protection trips.
  Unavailable/stale evidence must not start electrical consequence animations.
- Introduce a lazy Matter.js SVG layer for bounded sag/snap/overload accents.
  Electrical inputs, conductor routes, hit targets, saved documents, scoring and
  simulation time remain owned by their existing systems. Physics is illustrative.
- Provide a persisted effects preference, reduced-motion/static fallback,
  visibility/offscreen suspension, bounded bodies and a throttled fixed-step loop.
  Preserve fault/repair indicators when animation is disabled. Stop, reset,
  replacement, document changes and unmount dispose obsolete physics.
- Cover desktop and phone use, viewport movement, stale evidence, ordinary trips,
  damage/replacement and effects on/off electrical parity.

## Final acceptance

One `verify:phase-1.6` entry point: typecheck, lint, unit tests, production build,
asset/link/SEO/CSP checks, local electrical runtime parity, targeted browser
effects/repair/consumer/lab regression coverage and effects performance measurements.
Record correctness and effects overhead separately from existing solver and dense
renderer budgets. F.3 accepted exceptions are retained; this phase cannot declare
the previously failed full `verify` gate green. Phase 1.9 retains full acceptance.

## Evidence

[Local acceptance](../audits/phase-1-visual-effects.md) records all completed
requirements: comprehensive unit coverage with focused expectation fixes, build
and asset checks, 858 exact runtime parity cases, 20 API groups and 24 browser
cases. Effects physics/path p95 is 0.260 ms at 48 bodies; the browser effects
update/write p95 is 0.900 ms. The dense idle sample is explicitly separate from
still-open interaction performance. No slice was independently gated.
