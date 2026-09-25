# Simulator renderer benchmark: SVG DOM vs PixiJS

**Date:** 2026-09-25
**Status:** Reproducible software-rendered spike; production renderer decision remains gated on hardware-GPU evidence.

## Decision

Do not couple the simulator to PixiJS yet. Keep the dependency-free TypeScript kernel and a renderer-neutral scene/event contract. Use the existing SVG approach as the initial functional renderer and fallback while preserving a seam for a PixiJS world renderer.

This benchmark does **not** show a PixiJS performance benefit in Arena's browser environment. Chromium is forced through ANGLE SwiftShader software rendering, where the SVG implementation was faster at every tested density. PixiJS did substantially reduce DOM nodes and its parallel accessible DOM layer passed the keyboard/object-count gates, but those benefits did not offset software-rendering cost.

A hardware-accelerated browser trial on representative Windows, Android, macOS, and iPadOS devices is required before PixiJS becomes a production dependency.

## What was measured

Both renderers displayed the same synthetic technical-hybrid circuit scene:

- 50, 100, 250, or 500 labeled components;
- two visible terminals per component;
- one routed conductor between adjacent components;
- two moving current particles per conductor;
- energized-load pulsing;
- continuous world pan and zoom;
- keyboard-accessible semantic objects for every component.

The PixiJS scene used a synchronized parallel DOM button layer. The SVG scene used native focusable SVG groups. Each case animated for approximately three seconds after construction.

The benchmark ran at desktop 1440×900 and mobile 390×844 sizes using npm-registry Chromium 153. PixiJS was pinned to 8.21.0. Raw evidence is in [`renderer-benchmark-results.json`](./renderer-benchmark-results.json).

## Results

### Desktop

| Components | SVG average FPS | PixiJS average FPS | SVG DOM nodes | PixiJS DOM nodes |
|---:|---:|---:|---:|---:|
| 50 | 47.0 | 7.2 | 462 | 63 |
| 100 | 39.5 | 4.4 | 912 | 113 |
| 250 | 25.7 | 3.9 | 2,262 | 263 |
| 500 | 15.2 | 3.8 | 4,512 | 513 |

### Mobile viewport

| Components | SVG average FPS | PixiJS average FPS | SVG DOM nodes | PixiJS DOM nodes |
|---:|---:|---:|---:|---:|
| 100 | 60.0 | 19.0 | 912 | 113 |
| 250 | 40.2 | 10.8 | 2,262 | 263 |

All 12 cases met these structural gates:

- no page errors;
- one accessible object per visible component;
- keyboard focus reached a circuit object;
- renderer result completed and was captured.

## Interpretation

### Evidence in favor of SVG now

- It was substantially faster under the only browser/GPU environment available in Arena.
- Native SVG semantics avoid maintaining two interactive object trees.
- Text, focus, inspection, and SVG export remain straightforward.
- It is sufficient for the first free simulator circuits and the kernel vertical slices.
- It avoids making the rendering library part of the initial product architecture before actual-device evidence exists.

### Evidence still in favor of evaluating PixiJS

- DOM node count was reduced by roughly 88–89% at all densities.
- The parallel accessibility layer worked and scaled linearly at one DOM object per component rather than one node per visual primitive.
- A GPU-backed renderer may perform very differently from SwiftShader when particles, filters, masks, and cached component textures are used.
- PixiJS remains attractive for dense animated effects, but that benefit was not demonstrated by this software-rendered run.

### Important limitations

- SwiftShader is a CPU software rasterizer, not representative hardware WebGL/WebGPU.
- The benchmark is synthetic and does not include the complete editor, inspector, worker traffic, hit testing, culling, or real component art.
- PixiJS labels were live text objects rather than pre-baked/cached technical plates.
- PixiJS current particles were redrawn in one graphics layer each frame; a production GPU scene may instead use sprites or a particle container.
- FPS numbers are comparative evidence from this sandbox, not production guarantees.

## Production gate

Before adopting PixiJS for the main circuit scene, repeat this matrix on actual devices and require:

1. Hardware WebGL/WebGPU confirmed in telemetry.
2. No regression below the SVG baseline at 100 components.
3. Smooth pan/zoom and current flow at 250 components on target desktop hardware.
4. A documented density-reduction policy for phone/tablet and low-power devices.
5. Keyboard and screen-reader parity through the synchronized DOM layer.
6. Reduced-motion parity.
7. A renderer-independent SVG/diagram export path.
8. Recovery or fallback when GPU context creation fails or is lost.

## Reproduction

From `v3/`:

```bash
bun install --frozen-lockfile
bun run benchmark:renderers
```

The command bundles the isolated benchmark client, starts an ephemeral local server, launches npm-registry Chromium, validates accessibility gates, and overwrites the raw JSON evidence.
