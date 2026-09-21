# ElectraSim 2.0 — Master Rewrite Plan

> **Source of truth** for the complete rewrite of ElectraSim — Interactive Wiring Lab.
> Every decision below is **agreed and locked** unless explicitly revisited in a later ADR.
>
> **Companion files:**
> - [`CHANGELOG.md`](./CHANGELOG.md) — what shipped, in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.
> - [`progress.md`](./progress.md) — running session log: what was done, what's next, blockers, perf numbers.
> - `docs/decisions/` — ADRs (one short MD per major architectural decision).

---

## 1. Goals & Non-Goals

### Goals
1. **Per-client performance** — buttery 60 fps with **200 components + 400 wires**, on desktop and mid-range mobile.
2. **Stability** — no main-thread blocking, predictable memory, robust undo/redo, autosave.
3. **Mobile / tablet first-class** — touch gestures, large hit-targets, responsive panels, PWA-installable.
4. **Trivial horizontal scaling** — 100+ independent concurrent users via static CDN/edge caching.
5. **Future-proof architecture** — drop-in cloud auth/save, drop-in AI features, all without rewriting the core. (3D renderer is a post-launch idea — see §12.)
6. **Provider-portable output** — one static `dist/` artifact, with Cloudflare Pages primary and self-hosting retained as a fallback.
7. **Minimal & lightweight** — bundle, runtime memory, server resources — without sacrificing any current or planned feature.
8. **Disciplined process** — every change recorded in `CHANGELOG.md` + `progress.md`.

### Non-Goals (for now)
- Real-time multi-user collaboration (Figma-style co-editing). Architecture leaves room for it but it's not on the roadmap.
- SSR for the simulator — the app remains an interactive SPA; the marketing surface uses Astro SSG.
- Native mobile apps — PWA covers it.

---

## 2. Performance Budget (SLOs)

| Metric | Target | Measured at |
|---|---|---|
| Frame rate | **60 fps** sustained while panning/dragging with 200 comps + 400 wires | Phase 4 (renderer) |
| Interaction latency | **< 16 ms** (input → visual) | Phase 4 |
| Initial JS bundle | **< 250 KB** gzip | Phase 0a + every phase |
| TTI on simulated 4G | **< 2 s** | Phase 6 |
| Simulation tick (200 comps) | **< 8 ms** main-thread (worker offload) | Phase 5 |
| Memory after 1 h editing | **< 150 MB** RSS | Phase 5–6 |
| Lighthouse PWA | **≥ 95** (Perf, A11y, Best Practices, SEO) | Phase 6 |

Numbers logged in `progress.md` after each phase.

Current executable gates: `npm run build:stats`, `npm run benchmark:simulation`,
`npm run benchmark:browser`, and `npm run check:perf` (after `npm run build`).

---

## 3. Locked Stack

### Frontend
| Concern | Choice | Rationale |
|---|---|---|
| Framework | **React 19** | Component model and broad tooling ecosystem. |
| Build | **Vite 6 + `@vitejs/plugin-react`** | Fast HMR and native module workers. |
| Language | **TypeScript 5.8 strict** | Catch bugs at compile time. |
| Styling | **Tailwind v4** + custom theme tokens | Already installed. v4 is faster + smaller than v3. |
| UI primitives | **shadcn/ui + Radix UI** | Accessible, composable, owned by us (copy-pasted, not a black-box dep). |
| Icons | **lucide-react** | Tree-shaken, consistent. |
| Animation | **CSS + browser-native APIs** | The unused `motion` runtime dependency was removed. |
| State | **Zustand + Immer + zundo** | Selector subscriptions avoid global re-renders; bounded partial graph states benefit from Immer structural sharing. |
| Router | **TanStack Router** | Lazy routes; future-proof for `/editor`, `/gallery`, `/settings`, `/login`. |
| Public renderer | **Accessible SVG** | Universal browser path with keyboard-operable components, ports, and wires. |
| Renderer prototype | **PixiJS v8** (WebGL2 / WebGPU) | Retained scene-graph experiment, gated behind a development-only toggle until Phase 8 reaches editing, export, and accessibility parity. |
| Gestures | **@use-gesture/react** | Pinch-zoom, two-finger pan, long-press; works for mouse + touch + pen. |
| Spatial index | **rbush** | O(log n) hit-test & viewport culling. |
| Worker RPC | **Comlink** | Type-safe Web Worker bridge for the simulation engine. |
| Persistence (local) | **idb-keyval** (IndexedDB) | Async, non-blocking, debounced autosave. Replaces synchronous `localStorage`. |
| AI SDK | **None in the v1 client** | Add a provider SDK only behind the Phase 9+ server proxy; no API key or unused AI package ships today. |
| PWA | **`vite-plugin-pwa`** | Offline-capable, fast repeat loads. |

### Tooling
| Concern | Choice |
|---|---|
| Lint + format | **Biome** (one tool, ~10× faster than ESLint+Prettier) |
| Unit tests | **Vitest** + **React Testing Library** |
| E2E tests | **Playwright** |
| Pre-commit | `lefthook` (forces `CHANGELOG.md` + `progress.md` updates) |
| Bundle analyzer | `rollup-plugin-visualizer` |
| Build runtime | **Node.js ≥ 22.12** + npm ≥ 10 |

### Backend (deferred — Phase 9+)
| Concern | Choice | Rationale |
|---|---|---|
| Runtime | **Bun** | ~15 MB image, sub-ms startup, Node-compatible. |
| Framework | **Hono** | Tiny, fast, edge-ready. |
| DB (start) | **SQLite** via Bun native driver | Zero config, single-file backup. |
| DB (scale) | **Postgres** | Migrate only if multi-server. |
| Cache | **Redis** | Add only when needed. |
| Auth (future) | **Magic-link email** (Resend or self-hosted SMTP) | Simple, passwordless, low ops. |

### Hosting & Deploy

> **Decision updated 2026-05-01 (user-requested):** Primary deploy target changed from Hetzner VPS to **Cloudflare Pages + Workers**. Rationale: all compute-heavy work (simulation, routing, rendering) runs entirely client-side; the server is thin API glue only (≤10ms CPU per request). Cloudflare's global edge (300+ PoPs) fits the PLAN.md goal of “trivial horizontal scaling via CDN” better than a single VPS. Hetzner + Caddy is preserved below as the **self-hosted fallback** for users who require full control.

#### ⭐ Primary: Cloudflare Pages + Workers (user-selected)
| Concern | Choice | Rationale |
|---|---|---|
| Static hosting | **Cloudflare Pages** | CDN edge, free tier, deploys from `dist/` via `wrangler` or git push. HTTP/3 + Brotli automatic. |
| Domain registrar | **Cloudflare Registrar** | At-cost pricing, DNS managed in same dashboard. |
| Backend (v2.0+) | **Cloudflare Workers** (Hono) | V8 isolates, ~0ms cold start, 128 MB RAM. Hono was built for Workers. |
| Database (v2.0+) | **Cloudflare D1** (SQLite) | Serverless SQLite at the edge. Free 5 GB. Mirrors the Bun SQLite plan. |
| Object storage | **Cloudflare R2** | S3-compatible, zero egress fees. For 3D assets, exports, backups. |
| AI proxy (v2.0+) | **Workers** → Gemini API | API key stays server-side. I/O-bound, well within 10ms CPU limit. |
| Deploy command | `npm run deploy` | Builds Vite + Astro, merges one `dist/` artifact, then deploys it through Wrangler. |

**Current static hosting cost target:** Cloudflare Pages free tier. Phase 9+ backend usage may require Workers Paid, D1, or R2 depending on real traffic.

#### Fallback: Hetzner VPS + Caddy (original plan — self-hosted)

> Use this if you need full server control, want to avoid any PaaS dependency, or are running in a region where Cloudflare is restricted.

| Concern | Choice | Rationale |
|---|---|---|
| Provider | **Hetzner Cloud CX22** | €4.51/mo · 2 vCPU · 4 GB · 20 TB traffic. Best price/perf in EU. |
| OS | **Debian 12 (Bookworm)** | ~400 MB idle, stable, smaller attack surface. |
| Reverse proxy | **Caddy v2** | Auto-HTTPS, HTTP/3, Brotli, single-line config. |
| Container | **Docker Compose** | Reproducible, easy to add services. |
| Git deploy | **Bare git + post-receive hook** | `git push prod main` → rebuild + reload. Forgejo addable later. |
| Backend (v2.0+) | **Bun + Hono** on same VPS | Full Node-compat runtime; no V8-isolate constraints. |
| Database (v2.0+) | **SQLite** (Bun native) → **Postgres** if needed | Single-file, zero config. Migrate only if multi-server. |

**Total monthly cost:** ~€5 (VPS) + ~$1 (domain) ≈ **$7/mo all-in**.

---

## 4. Target Architecture

```
src/
├── domain/                  ← Pure TS, zero deps on React/DOM
│   ├── components.ts          (registry; current src/constants.ts)
│   ├── circuit.ts             (Circuit graph model)
│   ├── simulation/
│   │   ├── engine.ts          (Pure solver: graph BFS, fault detection)
│   │   ├── rules.ts           (Validation: short-circuit, missing earth, …)
│   │   └── engine.test.ts
│   └── geometry.ts            (Bezier, port positions — memoized)
│
├── store/                   ← Zustand slices
│   ├── circuitStore.ts        (components, wires, selection)
│   ├── viewportStore.ts       (pan, zoom, mouse)
│   ├── uiStore.ts             (modals, mode, toasts)
│   ├── settingsStore.ts       (persisted via IDB)
│   └── persistence.ts         (IndexedDB hydration and debounced autosave)
│
├── renderer/                ← Pluggable rendering layer
│   ├── Renderer.ts            (interface: init/render/pick/dispose)
│   ├── pixi/
│   │   ├── PixiRenderer.ts
│   │   ├── ComponentSprite.ts
│   │   ├── WireGraphic.ts     (cached Bezier; redraw only on endpoint move)
│   │   ├── GridLayer.ts       (tiled background sprite, drawn once)
│   │   └── SpatialIndex.ts    (rbush wrapper)
│   *(A `three/` directory is intentionally **not** scaffolded for v1.0;
│   if 3D is ever revisited post-launch — see §12 — it would slot in
│   here behind the same `Renderer` interface.)*
│
├── workers/
│   ├── simulation.worker.ts   (Comlink-exposed engine)
│   └── autosave.worker.ts
│
├── ui/                      ← React components, all small + memoized
│   ├── App.tsx                (~80 lines, layout shell only)
│   ├── Canvas.tsx             (mounts PixiRenderer; subscribes to store)
│   ├── Toolbar/
│   ├── Palette/               (component picker)
│   ├── Inspector/             (selected item props)
│   ├── LogPanel/
│   ├── SettingsModal/
│   └── ImportExport/
│
├── lib/
│   ├── persistence.ts         (idb-keyval wrapper)
│   └── telemetry.ts           (FPS, frame budget — dev only)
│
└── main.tsx
```

The current marketing surface lives in `astro-site/`: route pages compose small layout,
landing, guide, and blog components; blog pages use static nine-post pagination; and tag
archives are generated only for normalized tags used by at least three published posts.

### Renderer Interface (future Phase 8)

```ts
interface Renderer {
  init(canvas: HTMLCanvasElement, store: Store): Promise<void>;
  setCamera(pan: Vec2, zoom: number): void;
  pickAt(x: number, y: number): Hit | null;
  dispose(): void;
}
```

- Domain model is purely 2D: positions are `{x, y}`.
- Switching renderers (currently SVG ↔ PixiJS) is a runtime toggle that lazy-imports either renderer. It remains **development-only** and returns to users only after the GPU path reaches feature parity with SVG editing, accessibility, and export behavior (Phase 8).

---

## 5. Performance Techniques (How We Hit the SLOs)

- **Retained scene graph (Pixi)** — components/wires are persistent display objects, mutated only on change.
- **Dirty-flag rAF loop** — render only when something changed *or* an animation is active.
- **Wire geometry cache** — cached `Graphics` per wire, invalidated only on endpoint/control-point move.
- **Static grid tile** — pre-rendered `RenderTexture`, panned via transform, never recomputed.
- **Viewport culling** — `rbush` query each frame returns only visible items.
- **LOD (level-of-detail)** — below zoom 0.5: skip port glows, labels, control-point handles.
- **Spatial hit-testing** — O(log n) port/wire pick.
- **Transient drag state** — drag mutates a non-reactive ref; commits to store on drop. Zero React re-renders during drag.
- **Selector-based subscriptions** — each panel subscribes only to its slice. Toolbar doesn't re-render when a wire moves.
- **Bounded undo history** — `zundo` stores partial graph states; Immer structurally shares unchanged data.
- **Web Worker simulation** — main thread never blocks on graph solving; results stream back via Comlink.
- **Debounced IndexedDB autosave** — 500 ms debounce in `requestIdleCallback`.
- **Code-splitting** — the PixiJS prototype, import/export, settings, and optional surfaces are lazy-loaded.
- **Targeted memoization** — use explicit memoization only where profiling shows it reduces work.

---

## 6. Mobile / Tablet (First-Class)

- **PointerEvents** (Pixi v8 native) → unified mouse/touch/pen.
- **Pinch-zoom + two-finger pan** via `@use-gesture/react`.
- **≥ 24 px hit-targets** for ports on touch devices (a11y minimum).
- **Responsive shell:**
  - **Desktop** (≥ lg): fixed side panels.
  - **Tablet** (md): collapsible drawers, icon rails.
  - **Phone** (< md): bottom sheet for palette, FAB for primary actions.
- **PWA install** prompt for app-like experience on iOS/Android.

---

## 7. Future Features — Architectural Hooks Reserved Now

| Feature | Hook | Phase |
|---|---|---|
| GPU renderer (Pixi) re-enabled | Dev-only toggle today; Phase 8 formalises the `Renderer` interface and closes editing, export, and accessibility gaps | 8 (future) |
| Email/magic-link auth + cloud save | `/api/*` reverse-proxied to Bun + Hono on same VPS | 9 (v2.0) |
| AI: image → simulation | Importer that emits `Circuit` JSON; same model as the editor | 10 (v2.0) |
| AI: "why doesn't this work?" assistant | Sim engine already produces structured `errors`/`warnings`; we serialise circuit + errors as Gemini context (server-side) | 10 (v2.0) |
| 3D lifelike simulation | Re-add a `three/` renderer behind the same `Renderer` interface; component defs would gain an optional `model3d` field | post-launch (§12) |
| Real-time collab (if ever) | Replace `circuitStore` with a CRDT-backed store (Yjs); rest of architecture untouched | unscheduled |
| Classroom mode | Per-user sandbox + share link; just adds DB rows | unscheduled |

**Gemini key safety:** the current `vite.config.ts` inlines `GEMINI_API_KEY` into the client bundle (a leak). **To be fixed in Phase 0a** by routing all AI calls through the backend.

---

## 8. Migration Roadmap (incremental — no big-bang)

Each phase ships independently; the app stays working throughout. After every phase: append to `progress.md`, bump `CHANGELOG.md`.

| Phase | Title | Deliverable | Status |
|---|---|---|---|
| **0a** | Tooling baseline | Strict TS, Biome, Vitest+RTL, Playwright skeleton, FPS overlay (dev), Gemini key-leak fix, bundle analyzer, lefthook | ✅ done |
| **0b** | **Visual mockups** | 4 themed mockups · **locked: "Lab Glass · Light"** | ✅ done |
| 1 | Domain extraction | `/domain` pure TS modules + Vitest unit tests covering current sim behaviour | ✅ done |
| 2 | State migration | Zustand slices + zundo; new `Editor` reads from store; live `useSimulation` effect | ✅ done |
| 3 | UI split | `Editor.tsx` split into 7 memoized panels; drag-to-move, port-click wire creation, keyboard shortcuts; legacy code deleted | ✅ done |
| 4a | **Renderer swap** | PixiJS v8 retained scene graph, pan + zoom via `viewportStore`, lazy-loaded toggle in toolbar | ✅ done |
| 4b | Renderer hardening | Viewport culling (linear AABB), 2-tier LOD on labels/IDs, dev stress button | ✅ done |
| 5 | Worker simulation | Comlink-bridged simulation worker, debounced + stale-call protection, main-thread fallback | ✅ done |
| 6 | PWA + autosave | `vite-plugin-pwa`, IndexedDB persistence, offline mode | ✅ done |
| **6.1** | **UX uplift (this milestone)** | Wire selection / deletion / rerouting (drag handles + select+click), CPU-mode pan & zoom, settings modal (`confirmDelete`, `showTooltips`, animations), confirm-delete dialog, current-flow animation, bulb glow, fan spin, motor pulse, component tooltip, error boundary | ✅ done |
| **6.1.1** | **Bug-fix patch** | All 7 CPU/SVG-mode bugs from § 11 resolved: wire/palette mode conflict, fan spin drift, bulb glow bounds, motor spin, push-button status dot, MCB label overflow, inspector state colours | ✅ done |
| **6.4** | **Import / Export** | **JSON** (`.electrasim.json`, schema-versioned, round-trips); **SVG snapshot** (serialise live `<svg>`); **PNG** (rasterise SVG via `<canvas>.toBlob()`); **shareable URL hash** (gzip + base64 `?c=…`, ~5 KB cap, no backend). Two-tab modal (Export: JSON/SVG/PNG/share-link; Import: file picker + drag-drop + paste-JSON). Keyboard shortcuts `Ctrl+E` (modal) / `Ctrl+S` (quick export). Boot-time `?c=` decode. 14 unit tests. | ✅ done |
| **6.5** | **Hamburger menu** | **MCB breaker-switch trigger** in toolbar (blue/red lever, 35° rotation). **Centered modal overlay** with `backdrop-blur-sm`, ease-in-out scale animation. 9 wire-terminal styled menu items: Docs, Shortcuts, Import/Export, Settings, Clear Wires, Clear All, Reset, Contact (`mailto:`), About. Grouped with wire separators. Escape to close. Toolbar decluttered. | ✅ done |
| **6.5.1** | **Documentation page** | Full-page in-app docs overlay. 6 sections: Getting Started, Components Reference (auto-generated from `COMPONENT_DEFS`), Wiring Guide, Keyboard Shortcuts table, Simulation & Faults, Tips & Tricks. Wire-style separators, sidebar TOC (desktop) + mobile dropdown. Scroll-to-section from menu. Escape/back to close. Single-file edit to add/edit/delete sections. | ✅ done |
| **6.5.2** | **Right-click context menu** | Context-aware right-click menu on the SVG canvas. Component context (select, toggle, start wire, delete), wire context (select, reroute, delete), canvas context (wire mode, select mode). Shared items: Import/Export, Docs, Shortcuts, Settings. Auto-reposition, click-outside + Escape to close. | ✅ done |
| **6.6** | **Contact modal** | Modal popup from hamburger menu “Contact” item. 3-step instruction panel, categorised guidance (bug / feature / general), prominent “Open Contact Form” button opens configurable Google Forms link in new tab. Single `CONTACT_FORM_URL` constant to change the link. Escape to close. | ✅ done |
| **6.7** | **SEO + privacy** | App and Astro marketing metadata: canonical, Open Graph, Twitter card, JSON-LD, robots, and generated sitemap. Current policy intentionally ships no analytics scripts, tracking pixels, or tracking cookies. | ✅ done |
| **6.8** | **Open enhancements** | Quick-win UX: (a) **Zoom-to-fit** — `zoomToFit` in `viewportStore`, button in ToolDock + `F` shortcut. (b) **Dark theme** — `labGlassDark` tokens, `colorScheme` setting (light/dark/system), `useResolvedTheme` hook, 3-button Settings selector. (c) **PDF / Print** — `exportPDF()` renders SVG in hidden iframe with title block, triggers browser print dialog, zero deps. | ✅ done |
| **6.9** | **Bulk-action buttons** | Three toolbar/menu actions via a ⋮ dropdown, gated by the existing confirm-delete dialog. Clear all wires / Clear all components / Reset to defaults. Each is a single undoable transaction (except reset, which clears history). | ✅ done |
| **6.10** | **Pre-launch cleanup** | (a) Drop 3D from active scope: remove unused `z?` field on `Position`, strip 3D mentions from comments, move R3F + drei recommendation to §12 (post-launch ideas). (b) **Hide CPU/GPU renderer toggle behind `import.meta.env.DEV`** so SVG is the only user-facing renderer in v1.0 — the parked GPU wire-visibility bug is no longer user-visible. Pixi code stays in the repo for Phase 8 (v1.1). (c) Resolve pending decisions D2/D5–D9 (§10). (d) Add this checklist + §13 v1.0 launch checklist. (e) Add `F` shortcut to in-app docs. | ✅ done |
| **6.2** | **UX uplift II** | **Multi-select** (drag-rect on empty canvas + Shift-click additive, in-memory clipboard — D6/D7 resolved), **copy/paste** (Ctrl+C/V), **smarter wire routing** (orthogonal Manhattan path with obstacle-avoidance). | ✅ done |
| **7** | **Custom wiring + multi-step placement** | Paint-style multi-step wire placement. `customWiringMode: boolean` setting (default off). Atomic undo. SVG-only — Pixi parity deferred to Phase 8. Phase 7 bug fixes also shipped (SVG z-order fix, port highlight, pan suppression). | ✅ done |
| **6.3-slim** | **UX uplift III (slim)** | Mini-map (bottom-left, click-to-pan), alignment + distribute toolbar (floats on multi-select), gridless mode toggle, High Contrast + Deuteranopia canvas presets. `applyCanvasPreset` helper in `theme.ts`. | ✅ done |
| **6.11** | **Full UI dark mode** | `dark:` Tailwind variants applied to all panels and modals. `Editor.tsx` toggles `document.documentElement.classList`. | ✅ done |
| **7.1** | Pre-launch bug fixes + polish | Accessibility, responsive UI, app performance, share-link safety, persistence, and production checks completed through the v1.5.0 hardening release. | ✅ done |
| **RELEASE** | **Domain + Cloudflare Pages deploy** | The combined Vite/Astro `dist/` artifact is live at `electrasim.com`; production behavior is covered by an automated Wrangler preview suite. | ✅ live |
| **v1.5.0** | **Performance and architecture hardening** | Dense-canvas interaction work, structured module splits, strict privacy delivery, and expanded release gates. | ✅ shipped |
| **v1.5.1** | **Content and safety guidance patch** | Plain-language release article, single featured-post state, and a dedicated flickering-lights safety guide. | ✅ shipped |
| **v1.6.0** | **Practical components, theming, comparison, and content discovery** | RCBO support, true momentary push-button input, complete app and marketing dark mode, an official-source comparison route, and separate App Update/article sections without changing existing URLs. | ✅ shipped |
| **v1.6.1** | **Learning readiness and homepage SEO patch** | Push-Button Doorbell and RCBO-Protected Socket guided circuits, accurate component and simulation-limit copy, improved Bell feedback and onboarding, a one-time phone suitability advisory, and focused homepage search copy. | ✅ shipped |
| **8** | _(post-launch / future)_ Renderer abstraction + GPU bug fix | _(was Phase 7 before the 2026-04-27 renumbering.)_ Formalise `Renderer` interface + ADR. Re-architect Pixi pipeline to fix the parked GPU-mode wire-visibility bug. Re-enable the user-facing CPU/GPU toggle only after feature and accessibility parity. | future |
| **9** | _(post-launch / v2.0)_ Backend | _(was Phase 10.)_ Hono on Cloudflare Workers + D1, magic-link auth, cloud save (settings + circuits sync across devices), own contact endpoint replacing Google Forms. | v2.0 |
| **10** | _(post-launch / v2.0)_ AI features | _(was Phase 11.)_ Image-to-circuit (Gemini Vision); "why broken?" debug assistant. **Requires Phase 9 backend** — the API key cannot ship to clients. | v2.0 |

_Old "Phase 9 — 3D renderer (R3F)" row removed: 3D dropped from the active roadmap by user decision (2026-04-30). Recommendation preserved verbatim in §12 "Post-launch / v2.0+ ideas" so it can be revisited if real users ask for it._

> **Renumbering notes:**
> - **2026-04-27:** Custom wiring (paint-style multi-step placement) became Phase **7**. Subsequent phases shifted up by +1.
> - **2026-04-30:** 3D renderer dropped from active roadmap. Old "Phase 9 — 3D renderer" removed; old "Phase 10 — Backend" became Phase **9**; old "Phase 11 — AI" became Phase **10**. CHANGELOG and ADRs that have already shipped are immutable and keep their original numbers.
>
> **Completed launch sequence:** `6.10 → 6.2 → 7 → 6.3-slim → 6.11 → 7.1 → RELEASE → v1.5 → v1.6`. See §13 for the archived launch checklist and the current release gates.

**Estimated effort phases 0–6.1:** ~3–4 weeks of focused single-dev work — completed.

---

## 8.1. Phase 7 — Custom wiring spec (locked)

**Trigger:** new setting in the existing Settings modal (`useSettingsStore`) — `customWiringMode: boolean`, default **off**. When on, placing a wire (or component, see below) follows the multi-step flow described here.

**Status overlay.** When `customWiringMode` is on AND a placement is in progress, a small floating pill renders somewhere unobtrusive (top-centre or near the cursor — TBD at design time) reading e.g. `Custom wiring · Esc to cancel · 3 points placed`. When the setting is off, **nothing renders** — zero visual cost.

### Wire placement flow

1. User clicks the wire tool, then clicks a source port. (Same as today.)
2. **Each subsequent click drops a checkpoint** — like Paint, MS Paint's polyline, or Figma's pen tool. The wire renders live with each checkpoint as a kink.
3. The wire keeps following the cursor in an infinite loop until the user clicks a **valid destination port**.
4. On valid drop, the wire is committed with all checkpoints stored as control points on the `Wire` record.
5. **Esc cancels and removes the in-progress wire entirely** (no partial wires saved).

### Component placement flow ("same step for every component")

The same multi-step principle applies to components, scoped to whatever placement they reasonably need (anchor point, then optional rotation/orientation click). For a typical 1-port-pair component this collapses to a single click — i.e. unchanged for the user. For multi-step components (future custom subcircuits or rotated placements) it's the same paint-style flow with Esc-to-cancel.

> **Open interpretation:** "same step for every component" could also mean "single undo removes a whole multi-step component placement" (see undo rule below). I read it as both — multi-step optional placement **and** atomic undo. Will reconfirm at phase start.

### Undo / redo rule (locked)

- **An in-progress, not-yet-connected wire/component is NOT in the undo history.** It only exists in transient UI state.
- **One commit = one undo entry, regardless of how many checkpoints.** A 7-checkpoint wire undoes in a single Ctrl+Z back to "no wire". Same for redo.
- This requires a small change to the existing `zundo` integration: the multi-step builder accumulates in UI state (`useUiStore.pendingCustomPath`) and only `circuitStore.addWire(...)` is called once on commit.

### Implementation sketch

- New UI-state slice in `useUiStore`: `pendingCustomPath: { from: PortLoc; checkpoints: Point[] } | null`.
- Renderer gets a `<CustomPathRubberBand>` that draws the in-progress polyline (mirroring how `<RubberBand>` works today for the simple wire case).
- New keyboard binding: `Esc` cancels custom path (precedence: settings modal → pending deletion → custom path → reroute → placing → pending wire → clear selection).
- Pixi renderer parity is deferred to Phase 8 — Phase 7 ships SVG-only since custom wiring shouldn't be coupled to the GPU bug.

---

## 8.2. Phase 6.2 — Smart wire routing spec (locked 2026-04-30)

**Goal:** the default wire-placement experience produces orthogonal, obstacle-aware paths automatically. Smart routing replaces today's bezier as the default for *new* wires; existing bezier wires stay bezier (no migration). User keeps the option to manually edit a wire's path; once edited, smart routing leaves it alone forever.

### Locked decisions

| ID | Decision | Resolution |
|---|---|---|
| **SR1** | How are existing bezier wires handled? | **Option A — additive coexistence.** Existing wires keep `pathKind: 'bezier'` (or undefined → bezier for back-compat). New wires created when `routingStyle === 'orthogonal'` get `pathKind: 'orthogonal'`. Per-wire context-menu action "Convert to orthogonal" (and reverse) for the user who wants to mix. **No global flip, no migration.** |
| **SR2** | Routing algorithm | **Hybrid: try L-route first, fall back to A* on a 16 px grid.** L-route covers ~95% of paths in sub-millisecond time. A* handles dense layouts with a 200 ms hard timeout — if exceeded, fall back to a straight diagonal segment so the user always sees a wire. |
| **SR3** | What happens when the user drags a wire's control point? | **Pin the path.** Once a control point is hand-edited, the wire gains `controlPointsLockedByUser: true` and auto-reroute never touches it again. Re-running smart routing requires the user to explicitly "Reset path" via the context menu. |
| **SR4** | When does auto-reroute fire? | **On endpoint move only**, debounced to `requestIdleCallback` (250 ms). Not on every drag tick — that would thrash. Not on simulation state change — paths are geometric, not electrical. Locked wires (SR3) are skipped. |
| **SR5** | Setting toggle scope | **Per-circuit default** stored in `settingsStore.routingStyle: 'bezier' \| 'orthogonal'`, default `'orthogonal'`. Applies only to *new* wires. Existing wires keep their saved `pathKind`. |
| **SR6** | Pixi/GPU renderer parity | **Deferred to future Phase 8.** Smart routing ships SVG-only; the dev-only GPU toggle will need its renderer updated when Phase 8 lands. |

### Why this approach? (rationale vs alternatives)

#### SR1 — Additive coexistence vs global flip vs migration on load

Three options were considered:

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Additive coexistence** ✅ chosen | Zero migration. Old saved circuits look identical to before. Fully reversible. Per-wire override is a bonus power feature. JSON schema stays back-compat (the new field is optional). | Slightly more code (renderer must branch on `pathKind`). | **Picked.** Lowest user surprise + lowest risk. |
| B. Global flip | Single source of truth — everyone sees the same style. | Old circuits change appearance on load. Users with hand-tuned beziers lose them. Migration is a one-way trapdoor. | Rejected — too disruptive for a v1.0 default. |
| C. Migration on load | Same global look, but with a one-time conversion banner. | Still destroys hand-tuning. Adds a migration code path that has to live forever. Tested on every JSON import. | Rejected — all the cons of B plus more code. |

**Bottom line:** Option A is the only one that respects existing user data. The "convert to orthogonal" context-menu action gives the same outcome as a global flip for users who actually want it, without forcing it on anyone.

#### SR2 — Hybrid (L + A*) vs pure L vs pure A*

Three routing algorithms were considered:

| Algorithm | Speed | Quality | Verdict |
|---|---|---|---|
| **Hybrid (L-route → A* fallback)** ✅ chosen | Sub-ms common case; <200 ms worst case | Always finds a path that doesn't overlap obstacles. | **Picked.** |
| Pure 2-bend L-route | Sub-ms always | Wires can still cross components when no L-shape works. Suboptimal in dense layouts. | Rejected — visible failure cases on common circuits. |
| Pure A* on 16 px grid | 50–200 ms per path | Always optimal. Handles arbitrary obstacle layouts. | Rejected — too slow when 100+ wires need re-routing after a component move. Even debounced, the perceived lag is real. |

**Bottom line:** real circuits are mostly straightforward connections that an L-route handles instantly. The expensive A* only fires when actually needed. The 200 ms cap means the absolute worst case is still bounded — and we fall back to a straight segment rather than freezing the UI.

#### SR3 — Pin-on-edit vs auto-reroute always vs explicit lock

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Pin on first hand-edit** ✅ chosen | Honours user intent — if you bothered to drag a handle, you cared. No new UI. Implicit but predictable. | Need a flag on the wire (`controlPointsLockedByUser`). | **Picked.** |
| Always auto-reroute | Maximally consistent appearance. | User loses their work on every component move. Maddening. | Rejected on usability grounds. |
| Explicit lock (right-click → "Lock path") | Most explicit. | Extra step for a thing the user already implied by editing. Friction. | Rejected — cognitive overhead. |

**Bottom line:** the moment a user drags a handle, the implication is "I want this exact shape." Anything else feels like the tool is fighting them. The "Reset path" context-menu action gives a clean escape hatch when they change their mind.

#### SR4 — Debounce strategy

A* on 100 wires at 50 ms each = 5 seconds of jank if we ran it on every drag tick. Three strategies considered:

| Strategy | Latency | CPU cost | Verdict |
|---|---|---|---|
| **Debounce 250 ms via `requestIdleCallback`** ✅ chosen | 250 ms after drag stops | Only paid once per drag gesture. | **Picked.** |
| Recompute on every drag tick | Real-time | Brutal — drops drag fps below 60 on 100+ wires. | Rejected. |
| Recompute on drag end (mouseup) | 0 ms after drop | One synchronous burst that may stutter the UI. | Rejected — `requestIdleCallback` does the same thing without blocking the main thread. |

**Bottom line:** the user is dragging the *component*, not the wires. The wires can wait 250 ms and use idle time to recompute.

### Data model changes

```ts
// src/domain/types.ts
export type WirePathKind = 'bezier' | 'orthogonal';

export interface Wire {
  // ...existing fields
  pathKind?: WirePathKind;             // default: 'bezier' for back-compat
  controlPointsLockedByUser?: boolean; // SR3 — once true, auto-reroute skips this wire
}
```

```ts
// src/store/settingsStore.ts
routingStyle: 'bezier' | 'orthogonal'; // default: 'orthogonal'
```

Both fields are **optional** so existing saved JSON loads without migration.

### Implementation surface

```
src/domain/geometry.ts        +computeOrthogonalPath() new pure function (~150 LOC)
                              +computeLPath() helper
                              +aStarOnGrid() helper
src/domain/types.ts           +2 optional fields on Wire (above)
src/ui/.../WirePath.tsx       +1 if-branch: orthogonal → straight segments
src/store/circuitStore.ts     +autoReroute() listener fired on component move
                              +convertWirePath() for context menu actions
src/store/settingsStore.ts    +routingStyle field
src/ui/components/Settings...  +radio group: Smart (orthogonal) / Curved (bezier)
src/ui/.../ContextMenu.tsx    +"Convert to orthogonal/bezier", "Reset path"
src/domain/__tests__/         +geometry.test.ts cases for L-route + A* + obstacle avoidance
src/ui/components/DocsPage.tsx Wiring Guide section update + tip
README.md                     "How wiring works" section update (add real status: "now shipped")
```

**Estimated effort:** 3–4 days. Spec is locked; no design questions remain to be answered during implementation.

### Test cases (write before implementation)

1. Two ports on the same Y → straight horizontal segment, no bend.
2. Two ports on the same X → straight vertical segment, no bend.
3. Diagonal ports, no obstacles → 2-bend L-route (corner at midpoint).
4. Diagonal ports, one component blocks the L → A* fallback, path goes around.
5. Diagonal ports, dense layout (50 components on the L corridor) → A* fallback within 200 ms.
6. Pathologically dense layout (no path exists) → straight diagonal fallback after timeout.
7. Hand-edited wire (`controlPointsLockedByUser: true`) → auto-reroute is a no-op.
8. Bezier wire converted to orthogonal via context menu → `pathKind` flips, path recomputes once.
9. Component drag → only the wires touching that component recompute; others untouched.
10. JSON round-trip preserves `pathKind` + `controlPointsLockedByUser`.

---

## 9. Process & Discipline Rules

1. Every commit/PR must:
   - Add an entry to `CHANGELOG.md` under `[Unreleased]`.
   - Append a session note to `progress.md`.
2. Every architectural decision gets an ADR in `docs/decisions/NNNN-title.md`.
3. Every phase ends with measured perf numbers logged in `progress.md`.
4. **Never delete or weaken tests** without an explicit ADR.
5. **No big-bang rewrites in a single PR** — phase-by-phase only.
6. The legacy editor lives at `src/App.legacy.tsx` until Phase 3 is complete; only deleted in the same commit that introduces its full replacement.

---

## 10. Open Questions / Pending Decisions

### ✅ Resolved

| ID | Question | Resolution |
|---|---|---|
| **D-mockup** | Mockup direction | **Locked (2026-04-26): "Lab Glass · Light"** — Lab Glass floating-panel layout + Studio Light color scheme. White/slate neutrals, single blue accent `#2563eb`, no purple/pink/teal. See `src/mockups/LabGlassLight.tsx`. |
| **D-backend-lang** | Backend language/runtime | **Hono on Cloudflare Workers** (confirmed); D1 is the planned database. Backend work remains deferred to Phase 9 (v2.0). |
| **D1** | Primary hosting target | **Cloudflare Pages + Workers** (confirmed 2026-05-01). `npm run deploy` publishes the combined static artifact through Wrangler. Hetzner remains a self-hosted fallback only. |
| **D-analytics** | Analytics provider | **No analytics in the current release (revisited 2026-07-16).** No provider scripts, pixels, or tracking cookies. Any future activation requires a privacy-policy and CSP review. |
| **D-menu** | Phase 6.5 menu visual | **MCB breaker-switch trigger** shipped. |
| **D-contact** | Phase 6.6 contact backend | Tiered: Google Forms in the current release → own endpoint at Phase 9 (v2.0). |
| **D-export** | Phase 6.4 export formats | JSON primary, SVG + PNG + PDF snapshots, URL-hash share. Done. |
| **D9** | 3D renderer (R3F) | **Dropped from active roadmap (2026-04-30).** Recommendation preserved in §12 "Post-launch / v2.0+ ideas" so it can be revisited if real users ask for it. Architectural cost in v1.0 is now zero. |
| **D5** | Phase 7 — "same step for every component" interpretation | **Both meanings adopted:** multi-step optional placement *and* atomic undo (one commit = one undo entry). Locked in §8.1. |
| **D6** | Phase 6.2 multi-select interaction | **Drag-rectangle on empty canvas + Shift-click additive.** Both work together. Esc / click-empty deselects. |
| **D7** | Phase 6.2 clipboard scope | **In-memory only** in the current release. OS clipboard / cross-tab copy remains a future candidate. |
| **D8** | Phase 8 — Pixi rewrite vs incremental fix | **Decide at Phase 8 kickoff** after a one-day debugging spike. |
| **D-3d-trace-removal** | Should the existing `z?` field on `Position` and `model3d` mention in `ComponentDef.icon` be removed? | **Yes (2026-04-30).** Removed in Phase 6.10. Re-introducing them is part of the post-launch 3D revisit (§12). |

### ⏳ Deferred to pre-launch

| ID | Question | Resolution path |
|---|---|---|
| **D2** | Brand identity (final name, logo, colors) | **Decision (2026-04-30): keep placeholder `ElectraSim` + `#2563eb`** until launch. Marked as a pre-launch action item in §13 (B7/B8/B9). User may rename + rebrand at PRE-LAUNCH; otherwise placeholder ships as the real brand. |
| **D3** | Optional self-hosted repository | Not a launch blocker: the current Pages workflow deploys through Wrangler. Revisit Forgejo or bare-git only if the self-hosted fallback is adopted. |

---

_Last updated: 2026-07-16 — current runtime, deployment, privacy, and performance-gate details reconciled with the hardened implementation._

---

## 11. Known bugs (CPU / SVG mode) — surfaced 2026-04-27 — **ALL RESOLVED in Phase 6.1.1**

| # | Bug | Severity | Fix |
|---|---|---|---|
| 1 | Wire tool + palette both activate at once | high | `setPlacingType` clears `pendingWireFrom`/`reroute`; `setPendingWireFrom` clears `placingType`. |
| 2 | Ceiling fan animation drifts | medium | Rotation class moved from `<g>` to `<text>` (SVG `transform` attr was clobbered by CSS). |
| 3 | Bulb glow outside card bounds | medium | Glow circle radius 20→14. |
| 4 | Motor wheel doesn't spin | medium | New `electrasim-motor-spin` CSS keyframe on `<text>`, 2.5 s linear. |
| 5 | Push button lacks ON/OFF indicator | medium | Always-visible status dot on all switch types: green (on), red (off). |
| 6 | MCB label overflows | low | Label shortened to "MCB"; full name in `description`. |
| 7 | Inspector state plain text | low | `PillField` gained `color` prop; ON = green, OFF = red. |

---

## 12. Post-launch / v2.0+ ideas

Ideas that have been considered, discussed, and **intentionally dropped from v1.0 scope** but preserved here so they can be revisited based on real user demand.

### 3D lifelike simulation

**Status:** dropped from active roadmap on 2026-04-30 (D9). Decision rationale: a 2D wiring lab gets no real pedagogical value from 3D for typical domestic / small-commercial circuits, and R3F adds ~150 KB gzip plus model-asset weight. The architectural hook is already paid for (the simulation engine and store are renderer-agnostic), so re-adding 3D later is a self-contained renderer effort, not a rewrite.

**Recommended approach if revisited:**

| Concern | Recommendation |
|---|---|
| 3D library | **React Three Fiber (R3F) + drei** — mature React wrapper around Three.js, lazy-loadable, same scene-graph mental model as PixiJS so the existing renderer abstraction (Phase 8) carries over cleanly. |
| Renderer wiring | Add a `src/renderer/three/` directory mirroring the `src/renderer/pixi/` layout: `ThreeRenderer.ts`, `ComponentMesh.ts`, `WireTube.ts`, `GridFloor.ts`, `SpatialIndex.ts`. Keep the same `Renderer` interface (PLAN.md §4). |
| Domain model | Re-add the optional `z?: number` field to `Position` in `src/domain/types.ts`. 2D code keeps reading `x`/`y` and ignoring `z`. Re-add `model3d?: string` (path to GLB asset) on `ComponentDef` alongside `icon`. |
| Loading | Lazy-import the three renderer chunk only when the user picks "3D mode" in Settings. Default stays SVG. |
| Asset pipeline | Use `glTF` (.glb) for component meshes — small, fast, well-supported. Pre-bake materials to keep shader cost low. |
| Camera + controls | `<OrbitControls>` from drei with damping. Constrain pitch so users can't flip upside down. |
| Mobile | Three.js + R3F runs fine on modern mobile WebGL2; gate behind a "high-performance mode" device check. |
| Bundle target | < 200 KB gzip lazy chunk. The whole 3D pipeline must stay tree-shaken from the SVG default path. |

**Trigger condition for revisiting:** ≥ 5 unsolicited user requests for 3D *and* a clear pedagogical use case (e.g. "show me how the wires actually run inside the wall"), OR a paid-tier feature that justifies the asset-creation cost.

### Real-time collaboration (Figma-style)

Replace `circuitStore` with a CRDT-backed store (Yjs). Every other layer untouched. Architecturally feasible; requires the v2.0 backend (Phase 9) plus a WebSocket/WebRTC sync server. Not on the roadmap.

### Classroom mode

Per-user sandboxes + shared circuit links + teacher dashboard. Just adds DB rows on top of Phase 9's auth + cloud-save. Compelling if v2.0 picks up institutional users.

### Voice-controlled wiring

Speech-to-action ("connect switch one to bulb three"). Requires the AI features (Phase 10) plus a voice recognition layer. Pure novelty for v1.0; could be interesting accessibility win in v2.x.

### OS clipboard integration (future candidate)

Phase 6.2 ships an in-memory clipboard only (D7). A future release could promote it to the OS clipboard (Async Clipboard API → JSON payload) so users can paste a circuit from one tab to another or share via an issue tracker.

### Cross-device sync without an account

WebRTC peer-to-peer sync via shareable link, no backend needed. Risky on flaky connections; account-based sync (Phase 9) is the safer default.

---

## 13. v1.0 Launch Checklist

> **Live working copy is in [`LAUNCH.md`](./docs/archive/LAUNCH.md)** — that file is the go/no-go gate, includes the 2026-04-30 code-sweep findings (blockers P1–P9), quality gates, smoke-test checklist, and step-by-step launch day instructions.
> The items below are the original planning-time checklist kept here for historical reference.

Every item must be ticked before the public launch announcement. Items prefixed `B` map to the "must-have" bucket from the launch readiness analysis (2026-04-30 conversation).

### Pre-launch — code & content

| ID | Item | Notes |
|---|---|---|
| **B3** | Find-replace `https://electrasim.app` → `https://electrasim.com` | ✅ Done 2026-05-01. Domain registered on Cloudflare Registrar. |
| **B4** | Real Google Search Console verification token in `<meta name="google-site-verification">` | Sign up, verify domain ownership, paste token. |
| **B5** | Tracking/privacy decision implemented | ✅ No analytics scripts or tracking cookies; public privacy content matches the implementation. |
| **B6** | Real contact form URL in `src/ui/components/ContactModal.tsx` (`CONTACT_FORM_URL` constant) | Replace placeholder Google Forms URL. |
| **B7** | Brand identity decision (D2) | If keeping placeholder `ElectraSim` + `#2563eb`, **explicitly confirm**. If rebranding, update `index.html` `<title>`, OG meta, `package.json` `name`, README headings, all docs. |
| **B8** | Real favicon + PWA icons in `public/` | Currently generic blue lightning bolt. Replace if rebranding. |
| **B9** | Real Open Graph image at `public/og-image.png` | ✅ Present and retained for social metadata; the homepage uses smaller responsive AVIF/WebP derivatives. |

### Pre-launch — infrastructure

| ID | Item | Notes |
|---|---|---|
| **B1** | Domain bought + DNS pointed | Porkbun (~$10/yr) or Cloudflare Registrar. A/AAAA records → VPS IP. |
| **B2** | VPS provisioned (D1) | Recommended: Hetzner CX22 (€4.51/mo · 2 vCPU · 4 GB · 20 TB). Debian 12. |
| **B2.1** | Caddy v2 reverse proxy | Auto-HTTPS, HTTP/3, Brotli. Single Caddyfile config. |
| **B2.2** | Static deployment via Docker Compose | One container serving `dist/` via Caddy. No backend in v1.0. |
| **B2.3** | Bare-git push deploy hook (D3) | `git push prod main` → post-receive runs `npm ci && npm run build && systemctl reload caddy`. Forgejo deferred to Phase 9. |

### Pre-launch — quality gates

| ID | Item | Notes |
|---|---|---|
| **B10** | Lighthouse ≥ 95 across Performance / A11y / Best Practices / SEO | Per PLAN.md §2 SLO. Run in production build with throttling. |
| **B11.1** | Manual smoke pass: Chrome (desktop) | Drag, drop, wire, simulate, undo, import, export, share-link, settings, dark mode. |
| **B11.2** | Manual smoke pass: Firefox (desktop) | Same checklist. |
| **B11.3** | Manual smoke pass: Safari (desktop) | Same checklist. Watch for any `prefers-color-scheme` quirks. |
| **B11.4** | Manual smoke pass: iOS Safari | Touch, pinch-zoom, palette bottom sheet, PWA install. |
| **B11.5** | Manual smoke pass: Android Chrome | Same as iOS. |
| **B11.6** | Playwright E2E suite green | `npm run e2e`. Hardware constraint: only run if Playwright browsers installed. |
| **B11.7** | Vitest unit suite green | `npm run test` — all current tests must pass; do not encode a stale fixed count. |
| **B11.8** | Production typecheck green | `npm run typecheck` — zero errors. |
| **B11.9** | Production performance budgets | Run `npm run build && npm run check:perf`; enforced limits live in `scripts/check-performance.mjs`. |
| **B11.10** | PWA install + offline test | DevTools → Application → "Add to home screen" → Offline mode → reload → app loads. |

### Launch day

| Item | Notes |
|---|---|
| Run `npm run deploy` | Builds and publishes the complete Vite + Astro `dist/` artifact through Wrangler. |
| Post-deploy Lighthouse re-run on the live URL | Sanity check. |
| Smoke-test the live site in 1 browser | Quick happy path. |
| Submit `https://electrasim.com/sitemap-index.xml` to Google Search Console | Trigger or refresh crawling. |
| Announcement | Wherever the user wants — Twitter/X, HN, Reddit r/electrical, ElectronicsStackExchange, etc. **User-driven, not in scope here.** |

### Documentation discipline (locked rule, applies to every v1.0 phase)

Every Phase 6.x / 7 / 7.1 PR must include, before merging:

1. **In-app `DocsPage.tsx` update** — at minimum a Tip in the `TIPS` array; if the feature has a learning curve, a paragraph in the relevant section (Wiring Guide / Tips & Tricks / Shortcuts table).
2. **README highlights bullet** — one-line description with the phase number tag.
3. **README walkthrough or example** — for any feature that introduces a *new interaction model* (multi-select, custom wiring, smart routing, etc.), add a short tutorial section under a new "## How to use" heading or a dedicated `docs/walkthroughs/<feature>.md` if the example is too long for the README.
4. **CHANGELOG entry** under `[Unreleased]`.
5. **progress.md session entry** with files touched + perf numbers.

This rule lives here — not in §9 — because it specifically governs v1.0 launch readiness. After v1.0 ships, the rule may be relaxed for purely-internal phases.
