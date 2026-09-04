# Performance Guardrails

Performance work is measured against the production build. Splitting a source file is a
maintainability change unless it also creates a dynamic import boundary or reduces runtime work.

## Automated budgets

Run:

```bash
npm run build
npm run check:perf
npm run benchmark:simulation
npm run benchmark:browser
```

The budget check covers the default app JavaScript and CSS, generated HTML volume, tag archive
count, and the homepage's high-priority image. Hashed build assets are served with immutable cache
headers; HTML, the service worker, and the manifest must revalidate.

Tag archives are intentionally generated only for normalized tags used by at least three published
posts. Long-tail tag URLs are not retained as empty or one-post pages; all generated on-site tag links
use the same threshold. This keeps the static output bounded as the article corpus grows.

## Interaction baseline

`npm run benchmark:browser` builds its own dense fixture (currently 202 components and 300 wires)
from a share URL, runs the simulation, dispatches frame-paced pan and component-drag
gestures, measures pointer-handler and release-commit CPU time, and records
`requestAnimationFrame` intervals in headless Chromium. The strict gate covers application-owned
CPU work and the static-scene frame baseline. Gesture paint intervals remain attached telemetry:
software-rasterized headless SVG throughput varies substantially by runner and is not a substitute
for profiling trusted pointer input on target devices.
The development-only Pixi prototype is an exploratory comparison until v1.1 and is not part of the
current parity or production gate. A benchmark improvement that breaks wire routing, selection, or
fault injection is not acceptable.

Target behavior:

- Default app JavaScript: at most 115 KB gzip. **This budget is currently unmet and, as written,
  unreachable — see "Measured floor" below. Do not treat the failing `check:perf` line as a
  regression, and do not lower the number without recording the decision here.**
- Dense-editor headless gate: pointer handlers average below 1 ms and stay below 2 ms p95;
  pointer-up commits stay below 16 ms; the static dense scene stays below 30 ms average, 50 ms p95,
  and 10% long frames. Pan/drag paint intervals are recorded for manual cross-run comparison.
- Simulation fallback: below 8 ms for a 200-component circuit.
- Marketing pages: no hydration JavaScript unless a feature requires it.
- Homepage priority image: at most 200 KB in its largest delivered format.

## Measured floor (2026-08-19)

`npm run check:perf` currently reports:

```
FAIL  initial JS is 232,413 B gzip; budget is 115,000 B
FAIL  initial CSS is  20,470 B gzip; budget is  15,000 B
```

This is **pre-existing** — it fails identically on a pristine checkout, and neither budget has been
revised since it was first written. It is recorded here so the next person does not spend a session
re-discovering why the number cannot be hit.

### Why 115 KB of JS is unreachable

| Item | gzip |
|---|---|
| `react-dom-client` | 94,782 B |
| `react` | 4,419 B |
| **React floor, before any ElectraSim code** | **≈ 99 KB — 86% of the entire budget** |

The remaining ~14 KB of allowance has to cover the canvas renderer, the simulation engine, the
component registry, the stores and the entire editor shell. Meeting 115 KB would mean dropping React
or moving to server rendering; neither is in scope, and both are excluded by the project's
offline/PWA and pure-client constraints.

What *was* recoverable has been recovered: initial JS went **259,791 → 232,410 B gzip (−27 KB,
−10.5%)** by lazy-loading `ComponentInfoModal`, `WhatHappenedModal` and `ValidationDetailsModal`,
and by breaking the eager import chain
`store/index.ts → useSimulation → diagnosisStore → challenges/index → recipes`, which was pulling
the whole challenge generator into the entry chunk. There are now 18 lazy chunks. What remains in
the entry is core editor code (`componentArt`, `ComponentPropertiesView`, `ComponentNode`,
`circuitValidation`, `Palette`, `circuitStore`, `simulate`), all of which is needed for first paint
of a usable editor.

### Why 15 KB of CSS is unreachable

The 20,470 B is 152,333 B raw of Tailwind-generated output — ~2,032 rules and 27 keyframes, almost
entirely `@layer theme` custom properties plus utilities that are actually referenced. There is no
dead-code component to remove; it is already maximally compressed.

### Recommendation

Revise both budgets to reflect the real floor plus a deliberate headroom allowance, and keep the
gate failing-loud for *regressions* against that revised number. Suggested starting point: JS
240 KB, CSS 22 KB — roughly current usage plus ~3% headroom, so any genuine regression still trips
the gate. **This change requires explicit sign-off and has not been applied.**

### Regenerating the evidence

```
BUILD_STATS=1 npx vite build      # writes dist/stats.html
```

Parse the `const data = {...}` blob: `nodeParts[uid].renderedLength` for sizes,
`nodeMetas[uid].id` / `.importedBy` for the graph. To find why a module is in the entry chunk, BFS
*upward* over `importedBy` to an eager root — reading only the first parent is misleading and cost a
session's worth of a dead end.
