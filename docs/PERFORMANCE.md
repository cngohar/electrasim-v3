# Performance Guardrails

Performance work is measured against the production build. Splitting a source file is a
maintainability change unless it also creates a dynamic import boundary or reduces runtime work.

## Automated budgets

Run:

```bash
bun run build
bun run check:perf
bun run benchmark:simulation
bun run benchmark:browser
```

The budget check covers the default app JavaScript and CSS, generated HTML volume, tag archive
count, and the homepage's high-priority image. Hashed build assets are served with immutable cache
headers; HTML, the service worker, and the manifest must revalidate.

On 2026-10-06 the user approved raising the default app JavaScript allowance from **250,000 to
300,000 bytes gzip** to provide headroom for the growing simulator. This limit applies to the
entry scripts in the built app HTML; it does not cap the whole project or its dynamically loaded
feature chunks. Continue loading optional inspectors, labs, guides and other larger features on
demand. The CSS, generated-page, image and interaction/solver targets retain their existing limits.

Tag archives are intentionally generated only for normalized tags used by at least three published
posts. Long-tail tag URLs are not retained as empty or one-post pages; all generated on-site tag links
use the same threshold. This keeps the static output bounded as the article corpus grows.

## Interaction baseline

`bun run benchmark:browser` imports a deterministic **200-component / 400-wire** circuit through
normal JSON import, runs simulation, and measures idle, frame-paced pan, drag and wheel zoom in
headless Chromium. It verifies the actual component/wire counts and that enhanced artwork remains
present. The earlier gzip share fixture exceeded the share-link size limit at 400 wires; importing
JSON fixes the harness without raising the product's share limit.

The normal Playwright configuration serves Vite development assets. For a production-asset run,
start `PORT=8788 node scripts/preview-server.mjs` after building and set
`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8788/app/`. All targets must remain localhost.

The strict gate covers pointer-handler CPU, release commits and static-scene frame intervals.
Gesture frame intervals and wheel-handler CPU are attached telemetry, **not a 60 fps acceptance
claim**. Do not run the benchmark alongside builds, tests or other CPU-heavy tasks.

`PERF_COMPARE=1 bun run benchmark:browser` also runs a test-only Canvas 2D paint experiment. It
uses the current 200-component circuit, actual SVG wire paths and cached device artwork inside
the same editor shell, with equivalent pan/drag/zoom deltas. It starts from the scene after the
SVG gestures, uses programmatic transforms rather than production input handling, and omits
editing, accessibility, diagnostics and export parity. Its frame times are directional evidence,
not an interchangeable renderer benchmark. It is never imported by production code.

### Phase 1.4 measurements (2026-09-27)

Local headless Chromium, desktop Playwright viewport, no concurrent build/test load.
Development assets unless the row explicitly says production assets. Average / p95 frame intervals in milliseconds:

| Scene | Idle | Pan | Drag | Wheel zoom |
| --- | --- | --- | --- | --- |
| Original renderer, 200/400 | 16.97 / 16.8 | 98.30 / 166.7 | 43.50 / 99.9 | not recorded |
| Enhanced SVG, final comparison run | 18.76 / 16.8 | 20.90 / 33.4 | 40.96 / 66.6 | 133.89 / 183.3 |
| Enhanced SVG, production assets | 19.82 / 16.8 | 20.90 / 33.4 | 21.18 / 66.6 | 148.58 / 233.4 |
| Canvas 2D paint experiment | not recorded | 45.48 / 66.6 | 45.20 / 50.1 | 42.65 / 50.1 |

Final SVG pan/drag handlers average 0.10/0.06 ms, p95 0.20/0.10 ms; release commits 0.30/2.00 ms.
Development wheel handlers average 1.58 ms, p95 3.70 ms. The separate production-asset run
passed the same gates; wheel handlers average 3.96 ms, p95 37.30 ms, while pan/drag handlers
average 0.11/0.07 ms with 0.20/0.20 ms p95 and 0.30/1.80 ms release commits. Before layer memoization and preserving the zoom
gesture's reduced-blur state, zoom was 294.06 ms average with 17.21 ms average handler work.
Orthogonal routes remain memoized by circuit geometry; viewport changes do not invalidate them.
These measurements separate event CPU from frame delivery, but are not a full GPU/paint trace.

The **60 fps dense-interaction target remains unmet**, particularly for zoom. SVG remains the
Phase 1 renderer: the paint experiment improves zoom but slows pan, lacks application parity,
and also misses 60 fps. Before any renderer migration, profile trusted input on target hardware
and production assets, then run matched-view comparisons with interaction/accessibility/export
parity. See [ADR 0007](decisions/0007-renderer-svg-matter-only.md).

Canvas 1.4 retains every component and wire in the scene. Count-based LOD removes decorative
animation and secondary labels while retaining device bodies, focusable terminals and safety
indicators. Viewport culling is deferred: gesture previews and offscreen wires crossing the view
must remain correct, and snapshots must not lose offscreen circuit content.

Raw local logs: `.wrangler/phase-1.4-baseline.log`, `.wrangler/phase-1.4-renderer-comparison.log`,
`.wrangler/phase-1.4-production-benchmark.log`.

Target behavior:

- Default app JavaScript: at most 300 kB gzip (300,000 bytes).
- Default app CSS: at most 30 KB gzip.
- Dense-editor headless gate: pointer handlers average below 1 ms and stay below 2 ms p95;
  pointer-up commits stay below 16 ms; the static dense scene stays below 30 ms average, 50 ms p95,
  and 10% long frames. Pan/drag paint intervals are recorded for manual cross-run comparison.
- Simulation fallback: below 8 ms for a 200-component circuit.
- Marketing pages: no hydration JavaScript unless a feature requires it.
- Homepage priority image: at most 200 KB in its largest delivered format.

## Historical measured floor (2026-08-19)

Before the budgets were revised, `bun run check:perf` reported:

```
FAIL  initial JS is 232,413 B gzip; budget is 115,000 B
FAIL  initial CSS is  20,470 B gzip; budget is  15,000 B
```

This is retained as evidence for why the original budgets were unreachable, not as the current
gate. The active limits are 300 kB gzip for JavaScript and 30 kB gzip for CSS; the former 250 kB
JavaScript gate was superseded by the user's 2026-10-06 decision above.

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

### Budget decision

The original 115/15 KB budgets were raised to 250/30 KB on 2026-08-27 so the gate fails loudly on
regressions against the measured v2 baseline instead of failing permanently on every valid build.

### Regenerating the evidence

```
BUILD_STATS=1 npx vite build      # writes dist/stats.html
```

Parse the `const data = {...}` blob: `nodeParts[uid].renderedLength` for sizes,
`nodeMetas[uid].id` / `.importedBy` for the graph. To find why a module is in the entry chunk, BFS
*upward* over `importedBy` to an eager root — reading only the first parent is misleading and cost a
session's worth of a dead end.

## Phase 1.6 effects — 2026-10-09

The separate lazy Matter chunk is 28.07 kB gzip. Initial JS totals 252,084 B gzip
and CSS 26,092 B, inside unchanged 300,000/30,000 B budgets.

| Measurement | Result | Scope |
|---|---:|---|
| Maximum Matter scene (24 targets / 48 bodies), 900 samples | median 0.197 ms; p95 0.260 ms | Two fixed substeps plus SVG path generation; 4 ms p95 budget |
| Chromium effect updates, 45 displayed frames | mean 0.300 ms; p95 0.900 ms | Physics plus SVG attribute writes; excludes paint; 4 ms p95 budget |
| Dense 200 components / 400 wires | idle frame p95 16.7 ms; 0 physics bodies | Performance mode; idle sample only |

The dense fixture does not certify 60 fps panning/dragging/zooming. F.3 solver and
generator exceptions remain unchanged. Effects stop allocating active scenes
when hidden/offscreen/reduced/stopped and dispose settled scenes after 45 steps.
See [acceptance and evidence](audits/phase-1-visual-effects.md).
