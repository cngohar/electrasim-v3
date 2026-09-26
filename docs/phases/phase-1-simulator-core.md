# Phase 1 — Simulator Core (Lab Circuit Heart)

> **Status:** PLANNING — sub-phase breakdown locked 2026-09-26. Phase 0 verified local (`typecheck/lint/vitest 97/1464`, D1 14 tables, auth 200, i18n 400 gate).
> **Method:** Sub-phase → Steps → Gate. Each sub-phase ships as its own commit. No --remote until 1.7.
> **Principle:** Electrical standards are IMMUTABLE (§32) — fixes land in code (git + migration + release), never via Admin. D1 `electrical_standards` stays read-only projection.

## 0. Decisions locked before code

### 0A. SVG is sufficient — no Pixi/Three renderer

| Concern | Verdict |
|---------|---------|
| **Keep SVG** | **Yes.** CircuitCanvas 1200×720 viewBox, retained-graph SVG is accessible (keyboard, ARIA), styleable via `labGlassLight/Dark` + `editorBackground`, debuggable, and already hits the SLO (V3 budget <5 ms simulate median, 60 fps at 200 comps + 400 wires with rbush culling, LOD <0.5, dirty-flag rAF). |
| **Why not Pixi/Three** | PixiJS/WebGL adds ~60–120 kB gz + shader/framebuffer complexity, breaks a11y (no DOM hit-test), and the old `PixiCanvas` leaked topology. Three/R3F is for post-launch §12 if users demand "wires inside wall" — not V3.0. |
| **Where a dependency is unavoidable** | **Matter.js is the only canvas dep** — and it is **visual-only** (constraint sag, body fracture on overload tear, `frictionAir 0.08`, throttled >150 + sleep offscreen). Never touches `simulate()` BFS result. |
| **Rule** | Stay dependency-free where SVG suffices; add Matter only where physics is teaching value. No Canvas/Pixi shim. Sockets stay DOM-filtered via `PLUG_SYSTEMS`, colours via `getStandard(regulationStandard).wireColors`. |

Record in `docs/decisions/0007-renderer-svg-matter-only.md`.

### 0B. Standards audit runs first

See `docs/audits/electrical-standards-gap.md`. Gap fixes (G2 EVSE C-curve, G7 Zs 120/400 V + TT warning, G3 Method picker surfacing, citation bump to `BS 7671:2018+A4:2026` + `NFPA 70-2026`) land in code before canvas polish.

### 0C. Dense-but-legible UI

Same `labGlass` tokens → CSS vars, two densities: marketing shells 32–48 px gutters + blueprint grid; simulator canvas dense but legible via searchable Palette (90 comps, 9 zones, `PLUG_SYSTEMS` filter, recent 6), resizable panels + minimap + `⌘K` command + `F` zoom-to-fit, Inspector v2 tabs (Properties|Wiring|Simulation|Analytics) with live `wireCalculations/thermalData/zsCheck`. No SaaS/AI-slop gradients.

## 1. Sub-phase map

| Sub-phase | Title | Scope | Key files | Exit gate (`--local` only) |
|-----------|-------|-------|-----------|----------------------------|
| **1.0** | **Inventory** | Census `src/domain/*` + `src/ui/canvas/*` + `astro-site/src/lib/*`; coupling table; audit G1–G10 | `docs/phases/*`, `docs/audits/*` | `docs/audits/electrical-standards-gap.md` checked, ADR 0007 written |
| **1.1** | **Standards fix** | Patch `STANDARDS` cites/edition + `pro-ev-charger-circuit` C-curve + `zsCheck` per-standard nominal + TT warning; no sim logic change | `src/domain/standards.ts`, `templates.ts`, `zsCheck.ts`, `compliance.ts` | `bun run typecheck`, `bun x vitest` G2 template scores 100 under `uk/us/eu` |
| **1.2** | **Domain pkg** | Extract `packages/domain` (pure, no React), `packages/db` stays D1; `domain/types.ts` 508L single Circuit wire format | `packages/domain/**` | `bun x tsc --noEmit` across 3 projects, worker-safe |
| **1.3** | **Canvas base** | SVG layers (`ComponentLayer/WireLayer/DenseWireLayer/OverlayLayer/FaultFxLayer`), `geometry.ts` orthogonal A* + L-route, `fitRegion`, viewport rbush + LOD, `theme.ts` → CSS vars | `src/ui/canvas/**` | Canvas renders 200 comps at 60 fps local, a11y intact |
| **1.4** | **State & sim** | Zustand slimmed (`circuitStore 840L` + `settingsStore 508L` + `viewportStore`), `simulate()` worker via `comlink`, `useSimulation` → `regulationStandard`, D1 `circuits` CRUD `D1.batch()` | `src/store/**`, `src/sim-worker/**` | `simulate` median <5 ms, `D1.batch` 1 round-trip per save |
| **1.5** | **Matter visual** | Matter.js visual-only (Constraint sag, tear-on-overload shards, snap), throttled >150, never electrical | `src/ui/canvas/MatterLayer.tsx`, `matter` dep | Overload tear demo, rAF throttled, `--local` smoke |
| **1.6** | **UI redesign** | Palette (search/fav/recent), Inspector v2 tabs, command palette, log/minimap/dock, dense CSS vars | `src/ui/components/**`, `packages/ui/**` | `bun x biome lint`, `vitest` 97/1464 still green, 250 kB gz budget |
| **1.7** | **Verify** | Full gate: `typecheck/lint/vitest` + `wrangler dev --local` + burst (§33) + `check:perf` | — | `bun run verify` local = `typecheck && lint && vitest && build && check:* && benchmark && e2e` vs local preview — no `--remote` |

## 2. Steps for 1.0 Inventory (this turn)

| Step | Action | Files to touch | Verify |
|------|--------|----------------|--------|
| 1.0.1 | Census 371 `src/` + 250 `astro-site/src/` (find + glob), list `domain/electrical/*`, `simulation/*`, `components/*`, `ui/canvas/*` | `docs/audits/electrical-standards-gap.md` §Inventory | Counts match 112/31/133/30 dirs |
| 1.0.2 | Web-searched standards: BS 7671 A4:2026 + NEC 2026 + IEC 60364 (8-1/8-82/722) — see gap doc §1 | gap doc §1 | Citations pinned to Wikipedia/IET/NFPA 70-2026 |
| 1.0.3 | Measure simulator vs regulation G1–G10 (simulate/BFS, frequency decorative, EVSE B→C, Method UX, 70 °C, TT/400 V, plug vs standard, derating single-factor, RCD types) | gap doc §2 | Each row: regulation + code location + measured discrepancy |
| 1.0.4 | Renderer decision SVG+solo-Matter (this doc §0A) + ADR 0007 | `docs/decisions/0007-*.md` | SVG wins, Matters visual only |
| 1.0.5 | Deps: `bun 1.4.2`, `react 19.3.0`, `hono 4.13.9`, `drizzle 0.45.3` already latest safe; `bun update` patch-safe only (held vite 6→8, ts 5→7, biome 1→2) | `package.json`, `bun.lock` | `bun outdated` checked, patch-only |

Next turn: 1.1 Standards fix (code-owned, super_admin read-only stays).

## 3. Redesign — what it does (not generic SaaS)

Keeps `labGlassLight/Dark` + `editorBackground` + `wireColors` live `#ef4444`/`#3b82f6`/`#10b981` + `wireWidth 2.25` + `Inter`/`JetBrains Mono` → CSS vars so Admin themes extend without code. Marketing hero = blueprint/DIN-rail grid + ample whitespace; simulator canvas = same tokens, dense but legible (200+400 @60 fps + search/recent/minimap/`⌘K`/Inspector v2/thermal/phasor/probe/`simulateAtTime`). Matter tear visual-only.

## 4. Risks

- Large SVG at 400 wires needs rbush culling + LOD; verify with `benchmark:simulation 2.20 ms` + browser perf before 1.5.
- No `--remote` until 1.7 — single-writer D1 (`D1.batch()` <5 ms, KV shield) keeps parallel reads/writes honest.
