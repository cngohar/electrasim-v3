# ElectraSim Marketing Site

This npm workspace contains the static Astro marketing, guide, comparison-bench, legal, and blog routes. The root build merges its output with the Vite simulator under one Cloudflare Pages `dist/` directory.

Run commands from the repository root so the shared lockfile remains authoritative:

```bash
npm install
npm run dev:marketing
npm run build:astro
npm run build
npm run preview
```

Content lives in `src/content/`, route components in `src/pages/`, shared view components in `src/components/`, and external stylesheets in `src/styles/`. Blog pagination and tag generation are centralized in `src/lib/blog.ts`; the dated, first-party comparison-bench data lives in `src/lib/competitor-bench.ts`.

Marketing colours are shared CSS variables in `src/styles/global.css`. The same-origin `public/js/theme.js` bootstrap applies and persists the Light, Dark, or System-resolved appearance before paint. Keep page-specific styles on those variables so every route remains usable in both themes.

The site is fully static. Do not add inline executable scripts or styles: production uses a strict self-only Content Security Policy from the root `public/_headers` file. JSON-LD data blocks are the only inline script exception. Competitor claims on `/compare/` must stay dated, task-based, and linked to official first-party sources.

## Tool layouts: one mode, decided once

`public/js/scene-stage.js` picks the layout mode for a stage from the viewport and
publishes it as `stage.dataset.layout` — `float` (panels beside the art), `stack`
(scene as a banner, panels in the page flow) or `drawer` (phone: panels become bottom
sheets with a pinned handle). `src/styles/tool-stage.css` keys its geometry off that
attribute, so JS and CSS cannot disagree — and every rule that *hides* a panel lives
behind it, which means a browser without JavaScript falls back to the stacked flow and
both panels stay readable in the page.

Two rules worth keeping when editing a stage:

- **Control groups and scene state use different attributes.** Pickers are
  `data-cs-group="<name>"` on the wrapper plus `data-cs-value="<option>"` on each
  button; the scene reports state on `data-method` / `data-insulation` / `data-status`.
  They must not collide: when both were `data-method`, `bindGroup()` resolved to the
  scene root (which precedes the panels in the document) and bound its click listener to
  the artwork, leaving every Method chip dead with nothing in the console.
- **The stage owns a stacking level** (`.ts-stage { z-index: 20 }`, above
  `.tool-seo-section`'s 10, below the header's 30 and the chrome overlays' 50–100).
  The stage is `isolation: isolate`, so the z-index of anything inside it — the floating
  panels, the scrim, the mobile handle — is *local*: drop the stage below the crawl and
  the controls are painted, visible, and unclickable.

Scrolling panel bodies are flex columns, so their children need `flex-shrink: 0`
(otherwise the last row is squeezed to nothing on a short window) and their trailing
space must be a `::after` flex item, not bottom padding (a flex container's bottom
padding is left out of its scrollable overflow in Chrome).

## Tool stages (the shared visual contract)

Every visual calculator renders the same way: a full-bleed scene stage with glass panels floating
over it. Three pieces make that reusable rather than copyable:

- `public/js/scene-stage.js` — fits an authored SVG canvas to the stage box so the artwork is
  edge-to-edge at any aspect ratio (never letterboxed in page colour), owns the resize/zoom/
  orientation/`ResizeObserver` plumbing, and exposes `ElectraStage.paint` for CSS-variable painting.
- `src/lib/tools/stage-spec.ts` — the same fitting caps for the server render, plus the documented
  set of custom properties (`--heat`, `--cool`, `--gauge`, `--core`, …) and attributes
  (`data-method`, `data-status`, `data-constraint`, `data-neighbours`) a scene may read. Scenes are
  painted **from the calculator result only** — never from their own copy of the inputs — so the
  picture and the numbers cannot disagree.
- `public/js/tool-chrome.js` — the drawer, ⌘-palette, tool switcher, help dialog, fullscreen and
  focus trap shared by all four tools. A tool opts into palette/drawer commands with
  `ElectraChrome.register('reset', fn)`; unclaimed commands are hidden, not left inert.

`src/components/tools/ToolWorkspace.astro` wires them together (`variant` + `toolScript` + the
`scene`/`panels` slots). Add a tool scene by authoring SVG on a fixed canvas, honouring the variable
contract, and registering its actions — see `CableSizeScene.astro` for the reference example. Keep
every fact a scene shows in text somewhere too: the drawing is decoration, not the only copy.

## Icons (no emoji)

Every pictograph in the rendered site is a vector, never an emoji character —
emoji render differently per OS (or not at all) and cannot be themed or scaled
cleanly.

- **Components**: `<EmojiIcon name="bolt" />` (`src/components/EmojiIcon.astro`)
  draws the shapes registered in `src/lib/emoji-icons.ts`. Pass no `size` to let
  the glyph track the local `font-size`.
- **Markdown articles**: write `<span class="em em-check" role="img" aria-label="do"></span>`;
  the `.em-*` classes in `src/styles/global.css` carry the matching artwork, and
  their shapes mirror `emoji-icons.ts` — add to both when a new icon is needed.
- **Tool runtime JS** (`public/js/*.js`) keeps a small local mirror of the icons
  it needs (`ICON_SHAPES` in `voltage-drop-tool.js`) because files in `public/`
  are shipped verbatim and cannot import the module.

## Design system — "Living Schematic"

The marketing site is drawn as a wiring diagram rather than a generic SaaS page.

**Motifs**
- **Conductor spine** (`SiteBackdrop.astro`) — a fixed 2px rail down the page gutter with
  terminal nodes and a travelling current pulse. One element, every page.
- **DIN-rail nav** — each nav item carries a breaker lever drawn entirely in a single
  pseudo-element (the box is the track, a `background-image` band is the thumb, and
  `background-position` flips it closed on hover).
- **Terminal blocks** — every card on the site has a busbar across its top edge that
  energises into a blue→amber gradient on hover, plus a mono reference designator
  (`F-01`, `S-03`).
- **Consumer unit** — the Learning Modes section is three ways hanging off a busbar,
  each with its own feed drop, breaker lever and rating label.
- **Blueprint canvas** — a two-level engineering grid, masked so it fades below the fold.

**Every section carries a different current path** — the same streak repeated everywhere
reads as decoration, so each one behaves like the circuit it describes:

| Section | Current path |
|---|---|
| Nav (DIN rail) | thin blue streak, left → right |
| Page spine | slow blue descent |
| Rated capacity | amber **meter sweep** — short, fast spark |
| Way 01 · Workbench | **ring main** — out along the top rail, back along the bottom |
| Way 02 · Learning modes | **busbar** feeding three ways, each with its own drop |
| Way 03 · First circuit | **series chain** — a spark walks the rail while 01→04 light in sequence |
| Way 04 · On the bench | **parallel drops** — one bus, four phase-offset feeds into the cards |
| Way 05 · Reference | **marching signal line** (dashed) — data, not power |
| Final CTA | amber streak across the top edge |
| Footer | slow blue streak on the incoming supply |
- **Hero** — the animated circuit graph with the four lamp photographs sitting on real
  junctions, and a main breaker that actually cuts power to the simulation.

Typography: Space Grotesk (display), Plus Jakarta Sans (body), JetBrains Mono (every
annotation — refs, ratings, labels, timestamps).

### Performance contract

Measured on the built site, home page, 1440×950:

| | |
|---|---|
| HTML + CSS + JS | **23.6 KB gzip** (JS alone: **5.4 KB**) |
| Fonts | 83 KB woff2, ~40 KB critical (subset, preloaded) |
| Hero lamps | 48 KB WebP (was 240 KB PNG) |
| First Contentful Paint | ~285 ms |
| Cumulative Layout Shift | **0** |
| Requests | 17 |

Rules the code holds to:

1. **Zero framework JS.** Astro ships static HTML; the only scripts are four hand-written
   files loaded with `defer`.
2. **Nothing animates off-screen.** Every loop ships `animation-play-state: paused`;
   `/js/schematic.js` (600 bytes gzip) flips `.is-live` from an `IntersectionObserver`.
   The hero's `requestAnimationFrame` loop is *cancelled*, not throttled, when the hero
   leaves the viewport or the tab is hidden — measured 113 frames/1.5 s visible vs 17
   after scrolling past.
3. **Compositor-only motion.** Transform and opacity, or the repaint of a 2px line.
4. **Budgeted canvas.** Device-pixel-ratio capped at 2; particle count scales
   30 / 20 / 12 by viewport width.
5. **`content-visibility: auto`** on below-fold sections so they skip layout and paint
   until they are scrolled near.
6. **`prefers-reduced-motion`** disables every loop; the hero renders one static, fully-lit
   frame and stops.
7. **CSP-clean.** Production is `script-src 'self'; style-src 'self'; font-src 'self'` —
   no inline styles, no inline scripts, no CDN. Fonts are self-hosted and subset with
   `pyftsubset`; icons are inline SVG from `src/lib/icons.ts`.

### Per-page treatments

Every route has its own electrical identity rather than a reskinned template:

| Route | Metaphor | Current path |
|---|---|---|
| `/` | the workbench | ring main · busbar · series chain · parallel drops · signal line |
| `/about/` | the build log | a supply riser down the page; mission is a drawing sheet with a title block, principles are `P-01…P-04` terminal blocks |
| `/guide/` | drawing sheets | progress strip is a **DIN rail of ways** with feed drops; each circuit is a sheet with a title block, a terminal strip of parts and a framed diagram with corner ticks |
| `/compare/` | the test bench | SVG research map, task filters, instrument plots, and an interactive evidence matrix |
| `/blog/` | the reference library | marching dashed topic rail; product-news feeder runs **amber** so release notes read apart from guides |
| `/blog/[slug]` | the datasheet | a reading conductor down the margin with every `h2` as a terminal on it |
| `/contact/` | the terminal block | busbar with a phase-offset drop into each terminal; FAQ items are `Q01…` ways |
| `/privacy/`, `/terms/` | specification sheet | numbered clauses, each heading on a terminal |
| `/404` | **open circuit** | the live conductor runs in from the left, stops at a red fault indicator, and the leg past the break stays inert |

### Content

`src/content/pages/landing.json` is the source of truth and covers what actually ships:
115 components, Challenge Mode, the Diagnosis Lab, Ohmageddon, seed replay, Pro/BS 7671
standards mode, and the off-thread solver. Keep it in sync with `CHANGELOG.md`.

### Running it locally

This workspace requires **Node >= 22.19.0** for its resolved build tools.

```bash
npm install                 # from the repo root (npm workspaces)
npm run dev:marketing       # http://localhost:4321
npm run build:astro
```

`astro.config.mjs` allows `*.e2b.app` dev hosts so the site can be previewed through a
remote sandbox; drop that entry if you do not need it.
