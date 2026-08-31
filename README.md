# ElectraSim — Interactive Wiring Lab

A browser-based interactive electrical-wiring simulator. Drag, drop, and wire real-world domestic components — switches, MCBs, RCBOs, fuses, sockets, bulbs, fans, motors — and watch the circuit come alive in real time. Built as a learning tool that's accurate enough for an apprentice and fun enough for a hobbyist.

> **Current release:** **v2.0.0** (2026-08-31), live at [electrasim.com](https://electrasim.com/) — the learning release: Challenge Mode, Diagnosis Lab, Ohmageddon, Guided Circuits, the Fault Lab and the multi-standard Electrical Toolbox. Release notes: [/updates/](https://electrasim.com/updates/). The accessible SVG editor and Astro marketing site are built as one Pages artifact; see [`PLAN.md`](./PLAN.md) for future work and [`progress.md`](./progress.md) for the historical session log.

---

## Highlights

- **Structured learning modes (v2).** **Challenge Mode** offers hand-authored build challenges — a protected lamp, a momentary doorbell, an RCBO-fed socket. Each gives the learner a goal and validates the result, without exposing a step-by-step construction recipe: you see a mission and high-level outcome requirements, then figure out how to build the circuit yourself. Judged by the real simulator, with three progressive hints and a safe practice workspace that snapshots your normal circuit and restores it exactly. The **Diagnosis Lab** generates an intentional fault for you to find and repair; opt-in **Ohmageddon Mode** adds deliberately harder, electrically honest scenarios. Diagnosis exercises are reproducible from their seed — copy it, paste it, get the identical circuit. Progress and statistics stay in IndexedDB; no accounts, no backend.
- **Real circuit simulation.** Live/Neutral/Earth path tracing, switch state, fault detection (open neutral, missing earth, short to live, etc.). Pure-TS engine in `src/domain/` with full unit coverage.
- **Practical protection and switching.** The component palette includes two-pole RCD and RCBO devices for protected Live/Neutral layouts, while the Push Button behaves as a true press-and-hold momentary contact for bell and control circuits.
- **Production SVG renderer.** The accessible, lightweight SVG editor is the only user-facing renderer. A lazy-loaded **PixiJS v8 / WebGL2** prototype remains available in development builds while editing, accessibility, and export parity are completed for a future release.
- **Off-thread simulation.** A Comlink-bridged Web Worker keeps circuit solving outside the main interaction path, with a tested main-thread fallback when workers are unavailable.
- **Bounded undo / redo.** `zundo` keeps the last 100 graph states, while Immer structural sharing avoids cloning unchanged objects. Selection-only changes are excluded from history.
- **IndexedDB autosave.** Your circuit and your settings persist across reloads. Schema-versioned, debounced writes (250 ms), validation on hydrate.
- **Installable PWA.** `vite-plugin-pwa` + Workbox precache. Works offline after the first load.
- **Touch-first.** Big hit-targets, gesture-friendly pan + zoom, responsive panels (palette / inspector / log autoscale to phone / tablet / desktop).
- **Live simulation visuals.** Current-flow animation on energised wires, bulb glow, fan spin, motor pulse — all opt-in via the settings modal and respect `prefers-reduced-motion`.
- **Wire rerouting.** Drag the endpoint of a selected wire onto another port, or use `R` to arm an "armed-mode" reroute. Port-type compatibility is validated.
- **Confirm-before-delete** with a "Don't ask again" shortcut. Configurable per device.
- **Friendly error recovery.** A render-time error boundary keeps the user's autosaved work intact and offers reload/retry instead of a blank page.
- **Import / Export (Phase 6.4).** Export your circuit as **JSON** (`.electrasim.json`, schema-versioned, round-trips perfectly), **SVG** (inlined CSS animations), or **PNG** (2× raster). Copy a **shareable URL** (gzip + base64, no backend). Import via file picker, drag-and-drop, or paste-JSON — with full schema validation and user-friendly error messages.
- **Hamburger menu (Phase 6.5).** Centered modal overlay with blurred backdrop, triggered by an MCB breaker-switch lever in the toolbar. 9 wire-terminal styled items — Docs, Shortcuts, Import/Export, Settings, Bulk Actions (Clear Wires / Clear All / Reset), Contact, About. Escape or click-outside to close.
- **Bulk actions (Phase 6.9).** Clear all wires, clear all components, or reset to the seed demo — all gated by the confirm-delete setting. Reset always confirms.
- **In-app documentation (Phase 6.5.1).** Full-page docs overlay with 7 sections: Getting Started, Components Reference (auto-generated from the registry), Wiring Guide, Keyboard Shortcuts, Simulation & Faults, Learning Modes, Tips & Tricks. Wire-style design, sidebar TOC, scroll-to-section from the menu.
- **Contact modal (Phase 6.6).** Popup with 3-step instructions and a Google Forms link that opens in a new tab. Single constant to change the form URL.
- **Right-click context menu (Phase 6.5.2).** Context-aware menu on canvas elements: component actions (select, toggle, wire, delete), wire actions (select, reroute, delete), canvas actions (wire/select mode), plus shared quick-access to Import/Export, Docs, Shortcuts, Settings.
- **SEO without tracking (Phase 6.7).** Full meta tag suite (description, OG, Twitter card, JSON-LD), `robots.txt`, generated sitemaps, and an official-source circuit-simulator comparison page across the app and Astro marketing site. No analytics scripts, tracking pixels, or tracking cookies.
- **Zoom-to-fit (Phase 6.8).** One-click button or `F` shortcut frames all components in the viewport with smart padding.
- **Dark theme (Phase 6.8).** Light / Dark / System color scheme selector in the app, complete dark surfaces across editor documentation and phone controls, plus a persistent appearance toggle throughout the marketing site.
- **Alignment toolbar (Phase 6.3-slim).** Floats above the canvas when 2+ components are multi-selected. Six align actions (left / centre-H / right / top / centre-V / bottom) + two distribute actions (H/V, 3+ components). Each operation is one atomic undo entry.
- **Gridless mode (Phase 6.3-slim).** Toggle in Settings → Display to hide the dot grid for a distraction-free canvas.
- **Canvas colour presets (Phase 6.3-slim).** Three palette options in Settings → Display: Default, High Contrast (WCAG AA+), and Colour-blind / Deuteranopia (orange/indigo/cyan — no red/green dependency). Applies to both light and dark themes.
- **Mini-map (Phase 6.3-slim).** Bottom-left SVG thumbnail showing all components + a viewport indicator. Click to pan. Toggle in Settings → Display.
- **Custom wiring mode (Phase 7).** Paint-style multi-step wire placement — click port → click corners → click destination port. Each completed wire is one atomic undo entry. Cursor dot and committed polyline rendered in SVG via a rAF DOM loop (zero React renders per pointer-move frame). Enable in Settings → Editing. Press Esc to cancel without leaving a partial wire.
- **Full UI dark mode (Phase 6.11).** All floating panels now respond to the dark class: toolbar, palette, inspector, log panel, tool dock, status pill, menu overlay, all modals (Settings, Import/Export, Confirm, Contact). `dark:` Tailwind variants applied throughout. Set via `document.documentElement.classList` in `Editor.tsx`.
- **PDF / Print export (Phase 6.8).** Opens the browser's native print dialog with the circuit rendered in a professional title block — zero external dependencies.
- **Multi-select (Phase 6.2.3).** Drag an empty area to rubber-band select multiple components; Shift-click to add/remove individual ones. Drag any selected component to move the whole group together. Delete key removes all selected in one undo step. Inspector shows a grouped summary panel.
- **Copy / Paste (Phase 6.2.4).** `Ctrl+C` copies selected component(s) to an in-memory clipboard; `Ctrl+V` pastes with a 24 px stacked offset so repeated pastes are visually distinct. The clipboard intentionally clears on page reload (decision D7).
- **Smart wire routing (Phase 6.2.1).** New wires take a tidy right-angle path that automatically avoids overlapping components. Hybrid algorithm — fast L-route hits 95% of cases sub-millisecond, A* fallback handles dense layouts within a 200ms cap. User keeps the option to switch back to curved (bezier) wires per-circuit in Settings. Existing circuits keep their saved style untouched.
- **Reduced visual effects mode + paint-pipeline rewrite (Phase 6.2.2).** Wire/bulb halos no longer use `feGaussianBlur` SVG filters — the previous filter+animation combo forced 60 Hz software rasterisation per energised element and dominated CPU on weak hardware. Halos are now stroke- and circle-based (visually near-identical, computationally free). A new "Reduce visual effects" setting auto-enables on circuits with > 50 components and is exposed under Settings → Simulation visuals for manual control. Dev FPS overlay is hidden by default and only runs its rAF loop when shown.

A more granular feature list lives at the top of [`CHANGELOG.md`](./CHANGELOG.md).

---

## How wiring works — Smart Routing vs Custom Wiring

ElectraSim ships **two distinct ways** of drawing wires. They sound similar but solve opposite problems. This section is the canonical user-facing explanation; it's mirrored in the in-app Docs page → Wiring Guide.

### Smart Routing (default, Phase 6.2)

> **The computer figures out a tidy path for you.**

How it works:

1. Pick the **wire tool** (`W` shortcut) or click the wire icon in the bottom-right ToolDock.
2. Click the **source port** on the first component.
3. Click the **destination port** on the second component.
4. The wire is committed automatically. The path is **orthogonal** (only horizontal + vertical segments) and **avoids overlapping other components** by routing around them.

What it looks like:

```
   [Switch]──┐
             │
             │   ← wire goes UP, OVER the MCB, DOWN to the bulb,
   [MCB]     │     all without you doing anything extra.
             │
             ▼
            [Bulb]
```

When to use it: **almost always**. 90% of users, 90% of the time, just want wires that don't crash through other components.

### Custom Wiring (opt-in, Phase 7)

> **You draw the path yourself, click by click. Like MS Paint's polyline, or Figma's pen tool.**

How to enable it:

1. Open **Settings** (cog icon → or via the MCB-breaker hamburger menu → Settings).
2. Toggle **"Custom wiring mode"** on.
3. A small status pill appears whenever you start placing a wire so you know you're in custom mode.

How it works:

1. Pick the **wire tool** (`W`).
2. Click the **source port**.
3. **Each subsequent click drops a checkpoint** — a kink in the wire. The wire follows your cursor live with each checkpoint as a corner.
4. Keep clicking checkpoints until you click a **valid destination port**. The wire commits with all your checkpoints stored as control points.
5. Press **`Esc`** any time to **cancel and remove** the in-progress wire entirely (no partial wires get saved).

What it looks like:

```
   [Switch]──●           ← click 1: source port
             │
             ●           ← click 2: first checkpoint (drag wire above MCB)
             │
   [MCB]     ●───────●   ← click 3: route to the right
                     │
                     ●   ← click 4: drop down toward the bulb
                     │
                    [Bulb]●  ← click 5: destination port → wire committed
```

When to use it:
- You want a **specific cable run** for teaching ("the wire goes along the wall, drops behind the panel, then enters the box").
- You're modelling a **real-world install** where wires can't take the shortest path.
- The auto-routed path crosses something you care about and you want a different layout.

### Side-by-side comparison

| | Smart Routing | Custom Wiring |
|---|---|---|
| Who decides the path | The algorithm | You |
| Number of clicks | 2 (port → port) | 2 + N checkpoints |
| Path shape | Orthogonal (right angles only) | Whatever you draw |
| Avoids overlapping components | Yes, automatically | Only if you draw around them |
| Opt-in? | Default on (replaces today's bezier curves) | Toggle in Settings |
| Atomic undo | Yes (1 wire = 1 undo) | Yes (1 wire = 1 undo, even with 7 checkpoints) |
| Esc behaviour | Cancels port-A selection if no port-B clicked yet | Cancels and removes the entire in-progress polyline |
| Pixi/WebGL parity | Future Phase 8 | SVG-only in the current release |

### Quick FAQ

**Q: Can I edit a wire's path after committing?**
Select the wire (click it once), then drag any control-point handle, **or** press `R` to enter reroute mode and pick a new endpoint port. Works for both smart-routed and custom-drawn wires.

**Q: Can I switch between the two modes mid-circuit?**
Yes. Toggle the setting any time. Existing wires keep their committed paths.

**Q: Will my custom-drawn wires survive an export/import round-trip?**
Yes. The control-points are part of the JSON schema (`Wire.controlPoints`).

**Q: Are these the only ways to wire?**
Yes in the current release. Future possibilities (e.g. drag-a-segment-sideways nudge) are tracked in `PLAN.md`.

> **Implementation status:** **Smart Routing shipped in Phase 6.2.1** and is the default for all new wires. **Custom Wiring shipped in Phase 7** (2026-04-30) — enable it in Settings → Editing → Custom wiring mode. Both use the production SVG renderer; Pixi/WebGL parity remains future Phase 8 work.

---

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| UI framework | **React 19** | Component model and broad tooling ecosystem. |
| Build | **Vite 6** + `@vitejs/plugin-react` | Fast HMR and native module workers. |
| Language | **TypeScript 5.8** strict | Catches whole categories of bugs at compile time. |
| Styling | **Tailwind v4** + custom theme tokens | Smaller + faster than v3. |
| Icons | **lucide-react** | Tree-shaken. |
| State | **Zustand + Immer + zundo** | Selector subscriptions = no global re-renders. |
| Renderer (default) | Hand-rolled **SVG** | Accessible, low overhead, zero deps. |
| Renderer prototype (dev-only) | **PixiJS v8** | Lazy WebGL2 scene-graph experiment; user-facing parity is future work. |
| Simulation worker | **Comlink** | Typed RPC to a real `?worker` module chunk. |
| Persistence | **idb-keyval** | Tiny IndexedDB wrapper, schema-versioned. |
| PWA | **vite-plugin-pwa** + Workbox | Prompt-mode update activation, offline, installable. |
| Test (unit + integration) | **Vitest** + Testing Library | Fast, ESM-native. |
| Test (E2E) | **Playwright** | Cross-browser, good debugger. |
| Lint + format | **Biome** | Single tool, faster than ESLint+Prettier. |
| Git hooks | **lefthook** | Auto-format + lint on commit. |
| Marketing site | **Astro 6** | Static landing, guide, blog, legal pages, and sitemap. |

The UI uses CSS transitions and browser-native motion; the unused `motion` package has been removed. AI remains a post-v1 feature behind a future server-side proxy, so no `@google/genai` client dependency or API key ships today. Marketing typography uses the system font stack with no external font request.

---

## Performance budget

The app is held to enforced budgets plus explicit manual release targets.

| Metric | Target | Notes |
|---|---|---|
| Frame rate | **60 fps** manual target | profile trusted input on reference desktop/mobile devices |
| Pointer handler CPU | **< 2 ms p95** | enforced with 202 components + 300 wires |
| Gesture release commit | **< 16 ms** | enforced for pan and component drag |
| Initial JS bundle | **≤ 115,000 bytes gzip** | enforced against the app entry |
| Initial CSS | **≤ 15,000 bytes gzip** | enforced against the app entry |
| TTI on simulated 4G | **< 2 s** manual target | verify with Lighthouse before release |
| Simulation tick | **< 8 ms** main-thread | runs in a worker; this is the fallback ceiling |
| Memory after 1 h editing | **< 150 MB RSS** manual target | profile a representative editing session |
| Lighthouse PWA | **≥ 95** manual target | Perf / A11y / Best Practices / SEO |
| Generated marketing HTML | **≤ 10 MiB** | includes statically generated blog pages |
| Generated tag archives | **≤ 80** | archives require at least three posts |

Run the budgets directly:

```bash
npm run build
npm run check:perf
npm run benchmark:simulation
npm run benchmark:browser
```

---

## Browser support

Supported browser targets are the latest two stable releases of:

- Chrome / Edge / Opera (Chromium ≥ 120)
- Firefox ≥ 121
- Safari ≥ 17.2 (desktop + iOS)

Automated browser coverage currently runs Chromium desktop/mobile and WebKit tablet profiles. Firefox, Edge, Opera, and physical-device Safari remain release-candidate manual checks.

The production SVG renderer is the universal path. The development-only PixiJS prototype requires WebGL2 and is not yet feature-equivalent; it remains outside the public release until parity is complete.

---

## Run locally

**Prerequisites:** Node.js ≥ 22.12, npm ≥ 10.

```bash
git clone <this-repo> electrasim
cd electrasim
npm install
npm run dev          # starts on http://localhost:3000
npm run dev:marketing # optional Astro server on http://localhost:4321
```

That's it. No environment variables or client-side AI key are required for local development.

### Build for production

```bash
npm run build        # builds Vite + Astro, then merges both into /dist
npm run preview      # Cloudflare Pages preview on http://127.0.0.1:8788
npm run build:stats  # full build plus dist/stats.html bundle treemap
npm run verify       # checks, builds, and enforces performance budgets
npm run deploy       # verifies, then deploys /dist to Cloudflare Pages
```

---

## Project layout

```
src/
├── domain/          Pure, framework-free TS — components, wires, simulation engine
├── store/           Zustand slices (circuit / ui / viewport / settings) + persistence
├── sim-worker/      Web Worker + Comlink client (off-thread simulation)
├── ui/
│   ├── CircuitCanvas.tsx       Default SVG renderer + interaction surface
│   ├── PixiCanvas.tsx          Lazy-loaded, development-only WebGL prototype
│   ├── canvas-actions.ts       Renderer-agnostic interaction logic
│   ├── ErrorBoundary.tsx       Top-level render-error fallback
│   ├── components/             Toolbar, Palette, Inspector, LogPanel, Modal, etc.
│   └── hooks/                  Keyboard shortcuts, etc.
├── lib/             Generic helpers (useDevice, FpsOverlay, exportImport, …)
├── App.tsx          Composes ErrorBoundary + Editor
└── main.tsx         Bootstraps stores, hydrates IDB, mounts React, registers SW

astro-site/src/
├── components/      Layout, landing, guide, and reusable blog components
├── content/         Blog Markdown and CMS-editable page JSON
├── lib/blog.ts      Static pagination, tag archives, reading time, post selection
├── pages/           Marketing, guide, blog, tag, and legal routes
└── styles/          Global and route-specific external stylesheets

docs/                ADRs (Architecture Decision Records)
e2e/                 Playwright tests
public/              Static assets, PWA icons, manifest
scripts/             Build merge, performance gates, and solver benchmark
```

The legacy monolithic editor was deleted at the end of Phase 3. The tracked `static/` directory
contains legacy standalone marketing snapshots retained for historical reference; neither the Vite,
Astro, nor merged production build reads from it. Current marketing sources live under `astro-site/src/`.

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server with HMR (`:3000`) |
| `npm run dev:marketing` | Astro marketing-site dev server (`:4321`) |
| `npm run build` | Build the Vite app and Astro site, then merge both into `dist/` |
| `npm run build:astro` | Build only the Astro marketing site to temporary `dist-astro/` |
| `npm run build:stats` | Full build + emit `dist/stats.html` app treemap |
| `npm run preview` | Serve `dist/` with the local Cloudflare Pages runtime (`:8788`) |
| `npm run verify` | Run checks, build both surfaces, and enforce production budgets |
| `npm run deploy` | Full build + Wrangler deploy of `dist/` to Cloudflare Pages |
| `npm run check:perf` | Enforce bundle, CSS, HTML, tag archive, and hero budgets after a build |
| `npm run benchmark:simulation` | Benchmark a dense solver graph against the 8 ms p95 budget |
| `npm run benchmark:browser` | Run the opt-in dense-editor Playwright frame benchmark |
| `npm run typecheck` | `tsc --noEmit` for app + e2e configs |
| `npm run lint` | Biome check |
| `npm run lint:fix` | Biome check + auto-fix |
| `npm run format` | Biome format |
| `npm run test` | Vitest run (unit + integration) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run test:ui` | Vitest UI |
| `npm run e2e` | Playwright E2E |
| `npm run e2e:production` | Start/reuse Pages preview and test production headers, routes, CSP, and offline app behavior |
| `npm run e2e:install` | Install Playwright browsers |
| `npm run e2e:ui` | Playwright UI mode |
| `npm run check` | Typecheck + lint + tests in sequence |
| `npm run clean` | Remove `dist/`, coverage, Playwright artefacts |

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `V` | Select tool |
| `W` | Wire tool (click two ports to connect) |
| `R` | Arm reroute on selected wire (cycles TO → FROM → cancel) |
| `Ctrl/Cmd + E` | Open Import / Export modal |
| `Ctrl/Cmd + S` | Quick-export circuit as JSON |
| `Delete` / `Backspace` | Delete selected component or wire |
| `Esc` | Cancel placement / wire / reroute / clear selection (in that order) |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` *(or `Ctrl + Y`)* | Redo |
| `Ctrl/Cmd + Shift + F` *(dev only)* | Toggle FPS overlay |

Click the **breaker lever** (MCB trigger) in the toolbar to open the menu — access Settings, Import/Export, Bulk Actions, and more.

---

## Testing

```bash
npm run test         # unit + integration via Vitest
npm run e2e          # end-to-end via Playwright (run e2e:install first)
npm run check        # full pipeline: typecheck + lint + unit tests
```

The suite includes focused unit, integration, browser workflow, responsive-layout, and dense-circuit performance coverage. Run the commands above rather than relying on a hard-coded test count.

We never delete or weaken tests without an explicit ADR — see `docs/decisions/`.

---

## Architectural decisions

Recorded as ADRs in [`docs/decisions/`](./docs/decisions). Highlights so far:

- Why two renderers behind one component contract.
- Why simulation lives in a worker, not on the main thread.
- Why settings + circuit are in IndexedDB, not localStorage.
- Why we rolled our own modal instead of pulling Radix Dialog.

New significant decisions get an ADR before the code lands.

---

## Roadmap

A high-level view; the source of truth is [`PLAN.md`](./PLAN.md).

### Current release line

| Phase | Title | Status |
|---|---|---|
| 0–6 | Tooling, domain extraction, state migration, UI split, renderer swap + hardening, worker simulation, PWA + autosave | ✅ done |
| **6.1** | **UX uplift — settings, reroute, zoom, simulation visuals, error boundary** | ✅ done |
| 6.1.1 | CPU-mode visual + interaction bug-fix patch (7 bugs resolved) | ✅ done |
| **6.4** | **Import / Export — JSON, SVG, PNG, shareable URLs, two-tab modal** | ✅ done |
| **6.5** | **Hamburger menu — centered modal overlay with MCB breaker trigger** | ✅ done |
| **6.5.1** | **Documentation page — 6-section in-app docs, auto-generated component reference** | ✅ done |
| **6.5.2** | **Right-click context menu — context-aware canvas right-click** | ✅ done |
| **6.6** | **Contact modal — Google Forms link popup with instructions** | ✅ done |
| **6.7** | **SEO + privacy — meta tags, OG, JSON-LD, sitemap, robots, no tracking scripts** | ✅ done |
| **6.8** | **Open enhancements — zoom-to-fit, dark theme, PDF/print export** | ✅ done |
| **6.9** | **Bulk-action buttons — Clear all wires / Clear all components / Reset to defaults** | ✅ done |
| **6.10** | **Pre-launch cleanup — 3D dropped, GPU toggle hidden, decisions resolved, v1.0 launch checklist** | ✅ done |
| **6.2.1** | **Smart wire routing — hybrid L→A* algorithm, additive coexistence with bezier, Settings selector** | ✅ done |
| **6.2** | **UX uplift II** — multi-select, copy/paste, smarter wire routing | ✅ done |
| **7** | **Custom wiring + multi-step placement** — paint-style multi-checkpoint wires, opt-in via settings, atomic undo | ✅ done |
| 6.3-slim | Mini-map, alignment tools, gridless toggle, high-contrast + colour-blind theme presets | ✅ done |
| 6.11 | UI dark-mode polish (`dark:` Tailwind variants on every panel) | ✅ done |
| 7.1 | Pre-launch bug fixes, accessibility, responsive UI, and performance hardening | ✅ done |
| **RELEASE** | Domain + combined Cloudflare Pages deploy + automated production smoke pass | ✅ live |
| **v1.5.0** | **Performance, architecture, accessibility, privacy, and delivery hardening** | ✅ shipped |
| **v1.5.1** | **Reader-focused release notes and flickering-lights safety guide** | ✅ shipped |
| **v1.6.0** | **RCBO, momentary push button, site-wide dark mode, comparison page, and clearer blog index** | ✅ shipped |
| **v1.6.1** | **Guided doorbell and RCBO socket circuits, clearer simulation limits, improved onboarding, mobile guidance, and homepage SEO** | ✅ shipped |
| **v2.0.0** | **The learning release — Challenge Mode, Diagnosis Lab, Ohmageddon, Guided Circuits, Fault Lab, tours, and the multi-standard Electrical Toolbox (BS 7671 / IEC 60364 / NEC)** | ✅ shipped |

### Future work

| Phase | Title | Status |
|---|---|---|
| 8 | Renderer abstraction + GPU bug fix — re-enable user-facing CPU/GPU toggle | future |
| 9 | Backend (Hono on Cloudflare Workers, D1, magic-link auth, cloud save) | v2.0 |
| 10 | AI features — image-to-circuit, "why broken?" assistant | v2.0 |
| — | 3D renderer (R3F) | dropped from active roadmap; preserved as a [post-launch idea in PLAN.md §12](./PLAN.md) |

> **Renumbering notes:** _2026-04-27_ — Custom wiring became Phase 7. _2026-04-30_ — 3D renderer dropped from active scope; old "Phase 10 (Backend)" became Phase 9; old "Phase 11 (AI)" became Phase 10. CHANGELOG and ADRs that have already shipped are immutable.

Full launch checklist (B1–B11 items + infra + quality gates) lives in [`PLAN.md` §13](./PLAN.md).

---

## Editing the documentation page

The docs overlay is split by responsibility under [`src/ui/components/docs/`](./src/ui/components/docs/). [`DocsPage.tsx`](./src/ui/components/DocsPage.tsx) owns modal state and composition, `DocsContent.tsx` owns the sections, `DocsNavigation.tsx` owns the header and table of contents, and `data.ts` owns reusable documentation data.

| Task | How |
|---|---|
| **Add a section** | Add the section in `docs/DocsContent.tsx`, then add its matching entry to `DOCS_TOC` in `docs/data.ts`. |
| **Edit a section** | Change the relevant section component in `docs/DocsContent.tsx`. |
| **Delete a section** | Remove its content component and matching `DOCS_TOC` entry. |
| **Reorder sections** | Reorder the content composition in `DocsContent.tsx` and `DOCS_TOC` in `data.ts` to match. |
| **Add a component** | Add an entry to `COMPONENT_DEFS` in `src/domain/components.ts` — the Components Reference section updates automatically. |
| **Add a keyboard shortcut** | Append a `[key, description]` pair to `SHORTCUTS` in `docs/data.ts`. |
| **Add a tip** | Append a string to `TIPS` in `docs/data.ts`. |
| **Add a fault type** | Append a `[name, description]` pair to `FAULTS` in `docs/data.ts`. |

---

## Changing the contact form link

The Google Forms URL lives in a **single constant** in [`src/ui/components/ContactModal.tsx`](./src/ui/components/ContactModal.tsx):

```ts
const CONTACT_FORM_URL = 'https://forms.gle/YOUR_FORM_ID_HERE';
```

Replace the URL string with your own Google Forms link and save. The app hot-reloads immediately — no rebuild needed.

---

## SEO, privacy, and delivery

Production metadata uses `https://electrasim.com` across both surfaces:

- [`index.html`](./index.html) owns the simulator canonical, social metadata, and `SoftwareApplication` JSON-LD.
- [`astro-site/src/layouts/Base.astro`](./astro-site/src/layouts/Base.astro) owns shared marketing metadata and `WebSite` JSON-LD.
- Astro generates the sitemap from static routes and explicitly includes `/app/`.
- [`public/robots.txt`](./public/robots.txt) points crawlers to the generated sitemap.

ElectraSim currently loads no analytics provider, tracking pixel, or external web font. Keep [`TRACKING.md`](./TRACKING.md), the public privacy content, and the CSP in `public/_headers` aligned before adding any third-party script.

The root `npm run build` command is authoritative: it builds the app, builds Astro, and uses `scripts/postbuild.mjs` to assemble the deployable `dist/`. `npm run deploy` then publishes that complete directory through Wrangler.

---

## Known issues

No known blocking issue is open in v1.6.1. The Pixi/WebGL prototype remains behind a development-only flag because it is not yet feature-equivalent to the accessible SVG renderer.

---

## Contributing

This is currently a single-developer project. Once Phase 9 lands and the project moves to its own self-hosted git, contribution guidelines will appear here.

For now: discipline rules apply to every change.

1. Every commit:
   - Adds an entry under `[Unreleased]` in [`CHANGELOG.md`](./CHANGELOG.md).
   - Appends a session note to [`progress.md`](./progress.md).
2. Every architectural decision gets an ADR in `docs/decisions/`.
3. Every phase ends with measured perf numbers in `progress.md`.
4. Tests are never deleted or weakened without an explicit ADR.
5. No big-bang rewrites in a single PR — phase-by-phase only.

---

## Licence

License terms are still TBD. The code is currently all-rights-reserved.

---

## Acknowledgements

- The pure-TS simulation engine is a from-scratch rewrite, but the original prototype's component vocabulary (live/neutral/earth terminals, MCBs, fuses, sockets, etc.) shaped the model.
- Visual direction (`Lab Glass · Light` — white/slate neutrals, single blue accent `#2563eb`) was locked at the end of Phase 0b. See `src/mockups/LabGlassLight.tsx`.

---

_Last updated: 2026-08-31 for the v2.0.0 release._
