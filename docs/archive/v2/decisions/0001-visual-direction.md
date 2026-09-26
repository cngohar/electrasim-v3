# ADR 0001 — Visual Direction: "Lab Glass · Light"

- **Status:** Accepted
- **Date:** 2026-04-26
- **Phase:** 0b
- **Deciders:** Project owner

## Context

The legacy editor (`src/App.legacy.tsx`) ships a clean light theme with a blue
accent. The rewrite (PLAN.md §3) introduces a polished, mobile-first UI built
on shadcn/ui + Tailwind v4. We needed to lock the visual direction *before*
splitting the UI into many small components in Phase 3, so design tokens and
component shapes don't churn.

Four directions were prototyped and reviewed (`src/mockups/*`):

1. **Studio Light** — clean white, soft shadows, blue accent, classic 3-column.
2. **Pro Dark** — engineering-tool aesthetic, neon-trace wires, monospace.
3. **Lab Glass** — floating glassmorphic panels, vivid pink/blue/teal gradient.
4. **Lab Glass · Light** — Lab Glass *layout* + Studio Light *palette*.

## Decision

We adopt **Lab Glass · Light** as the locked visual direction.

- Layout: floating glassmorphic panels over a full-bleed canvas (top capsule,
  left palette card, right inspector card, bottom log strip, corner tool docks).
- Palette: white + slate neutrals, single blue accent `#2563eb`. No purple,
  pink, or teal gradients.
- Wires retain the standard color code (live red, neutral blue, earth green).
- Components: white at 92% opacity, slate-200 borders, 10px radius.
- Glass surfaces: white at 75% with `backdrop-blur-xl` and a 5% slate ring for
  crispness on bright backgrounds.

## Rationale

- The owner explicitly preferred the Lab Glass *layout* but rejected its
  *palette* as "too consumer".
- The Studio Light palette is already familiar from the legacy editor — zero
  re-learning cost for existing users.
- Floating panels are touch-first (PLAN.md §6), addressing the
  must-have mobile/tablet support.
- A single accent color keeps brand identity flexible (the project owner has
  not finalised a brand yet — easy to swap one CSS variable later).
- No glow/neon means lower visual fatigue during long simulation sessions.

## Consequences

- The other three mockups (`StudioLight.tsx`, `ProDark.tsx`, `LabGlass.tsx`)
  and the gallery shell (`MockupGallery.tsx`, `DeviceFrame.tsx`) are removed
  to keep the codebase lean.
- `src/mockups/LabGlassLight.tsx` becomes the seed for the Phase 3 component
  split. It will be torn into ~15 small memoized components but the design
  tokens and structure are now locked.
- `src/mockups/CircuitCanvas.tsx` (SVG renderer) and `src/mockups/sampleCircuit.ts`
  (sample data) are kept; they serve as the visual placeholder until the Phase 4
  PixiJS swap and are useful fixtures for tests.
- Brand identity (final name, logo, exact accent color) is still deferred — see
  PLAN.md §10. The blue accent is parameterised through Tailwind theme tokens
  so a brand change is a one-line edit later.
