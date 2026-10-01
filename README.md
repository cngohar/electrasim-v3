# ElectraSim — Interactive Wiring Lab

> **V3 workspace:** development and testing are local-only under [AGENTS.md](./AGENTS.md); the live V2 site/account below is separate. Follow [Phase 1](./docs/phases/phase-1-simulator-core.md). `bun run verify:phase-1.5b` checks the [electrical contracts and terminal graph](./docs/audits/phase-1-electrical-contracts.md), including isolated local Worker/D1 and browser acceptance. Deployment remains disabled.

A browser-based interactive electrical wiring simulator and structured learning laboratory. Drag, drop, and wire real-world domestic and light-industrial electrical components — switches, MCBs, RCDs, RCBOs, fuses, sockets, lamps, fans, motors, EV chargers, and solar storage — and observe real-time circuit behavior and protection trips. Built to be rigorous enough for an electrical apprentice and engaging enough for a curious hobbyist.

> **Current release:** **v2.0.4** (2026-09-17), live at [electrasim.com](https://electrasim.com/) — includes Challenge Mode, Diagnosis Lab, Ohmageddon, 20 guided circuit walkthroughs, 22 component anatomy cutaways, multi-standard Electrical Toolbox (BS 7671 / IEC 60364 / NEC), and a 36-term cross-referenced glossary. Release notes: [/updates/](https://electrasim.com/updates/). The accessible SVG editor and Astro marketing/guide site build together as one Cloudflare Pages artifact; see [`PLAN.md`](./PLAN.md) for roadmap phases and [`progress.md`](./progress.md) for the development session log.

---

## Key Highlights

- **Structured Learning Modes (v2):**
  - **Challenge Mode:** Goal-oriented build missions (e.g. protected lamps, momentary doorbell circuits, contactor motor starters, RCBO-protected sockets). Each challenge defines a mission objective and outcome requirements without giving away a rigid step-by-step recipe, allowing learners to experiment freely. Judged in real time by the simulation engine with three progressive hints and a safe practice workspace that restores your canvas on exit.
  - **Diagnosis Lab:** Generates realistic, intentional circuit faults (open neutral, missing earth, loose connections, swapped conductors) for learners to trace and repair. Every scenario is reproducible via a shareable seed string.
  - **Ohmageddon Mode:** An opt-in high-difficulty diagnostic track featuring complex multi-fault topologies and subtle electrical anomalies.
- **20 Guided Circuit Walkthroughs & In-App Templates:**
  - 20 complete circuits spanning single-phase AC, DC, and three-phase systems — from basic switches and two-way lighting to contactors, EV chargers, heat pumps, SPD consumer units, AFDD protection, and solar PV with battery storage.
  - Interactive in-app templates cross-link directly to comprehensive written walkthroughs featuring hand-authored SVG schematics with animated current flow.
- **Component Anatomy & Interactive Cutaways:**
  - 22 component anatomy guides featuring 1:1 photorealistic renders, measured interactive geometry hotspots, internal mechanism diagrams, terminal specs, and safety warnings.
  - 8 dedicated tool and instrument guides covering multimeters, voltage & continuity testers, RCD testers, clamp meters, and core hand tools.
  - 36-term electrical glossary dynamically cross-referenced across all guide articles.
- **Multi-Standard Electrical Toolbox:**
  - Visual **Voltage Drop Calculator** and **Cable Sizing Calculator** implementing **BS 7671**, **IEC 60364**, and **NEC** standards.
  - Features real-time thermal derating factor waterfalls, constraint crossover charts, and exploded isometric cable cutaway animations.
- **Pure-TS Simulation Engine:**
  - Live, Neutral, and Earth path tracing, switch state evaluation, and rigorous fault detection (open neutral, missing CPC, reverse polarity, dead short, earth leakage, breaker curve overcurrents).
  - Pure TypeScript domain logic in `src/domain/` with 100% deterministic test coverage.
  - Off-thread execution in a dedicated Web Worker via Comlink, with seamless main-thread fallback.
- **Dual Wiring Mechanics:**
  - **Smart Orthogonal Routing (default):** Clean right-angle paths that automatically route around intervening components using a fast hybrid L-route and A* algorithm.
  - **Custom Wiring Mode (opt-in):** Paint-style multi-checkpoint wire placement with a zero-React-render rAF loop preview and atomic undo.
- **Production SVG Canvas & Interaction Surface:**
  - Lightweight, accessible, and fast SVG renderer with zero external canvas runtime overhead.
  - Bounded 100-step undo/redo via `zundo` with Immer structural sharing.
  - Schema-versioned IndexedDB persistence via `idb-keyval` with debounced autosave.
  - Rubber-band multi-select, alignment toolbar (6 align + 2 distribute actions), and copy/paste with stacked offset.
  - Mini-map, gridless canvas mode, and zoom-to-fit (`F`).
  - Dark / Light / System themes with WCAG AA+ high-contrast and color-blind (deuteranopia) palette presets.
  - Full circuit Import/Export: JSON (`.electrasim.json`), SVG (with animated CSS), PNG (2× raster), and compressed URL hash sharing (gzip + base64).
  - Offline-first installable PWA via Workbox and `vite-plugin-pwa`.
  - Zero tracking: no analytics scripts, no tracking pixels, no advertising cookies, no external web fonts.

---

## How Wiring Works — Smart Routing vs Custom Wiring

ElectraSim offers two distinct wire placement modes, accessible via Settings:

### Smart Routing (Default)
The simulator calculates clean orthogonal (right-angle) paths that automatically steer around other components:
1. Select the **Wire Tool** (`W` or click the wire icon in the dock).
2. Click the **source port** on the first component.
3. Click the **destination port** on the second component.
4. The path is calculated and committed immediately as a single atomic undo entry.

### Custom Wiring (Opt-in)
For custom cable runs, conduit paths, or architectural mockups:
1. Enable **Custom Wiring Mode** in **Settings → Editing**.
2. Select the **Wire Tool** (`W`) and click the **source port**.
3. Click anywhere on the canvas to place successive corner checkpoints.
4. Click a valid **destination port** to commit the completed polyline.
5. Press `Esc` at any time during placement to discard in-progress checkpoints without leaving dangling segments.

| Feature | Smart Routing | Custom Wiring |
|---|---|---|
| **Path Determination** | Algorithmic (hybrid Manhattan / A*) | User-drawn checkpoint polyline |
| **Interactions** | 2 clicks (port → port) | 2 ports + N corner checkpoints |
| **Component Avoidance** | Automatic | User-directed |
| **Default State** | Enabled by default | Opt-in via Settings |
| **Undo / Redo** | 1 wire = 1 atomic history step | 1 wire = 1 atomic history step |
| **Post-Edit Support** | Drag endpoints, handles, or press `R` to reroute | Drag checkpoints, handles, or reroute |

---

## Project Structure

The repository is cleanly partitioned into application code, static marketing/docs workspace, documentation, quality-assurance scripts, and test suites:

```
electrasim/
├── src/                    # Main React interactive simulator application
│   ├── domain/             # Pure TS electrical simulation engine, rules, challenges & components
│   ├── store/              # Zustand state slices (circuit, ui, viewport, settings) + persistence
│   ├── sim-worker/         # Web Worker & Comlink RPC client for off-thread simulation
│   ├── ui/                 # Canvas renderer (SVG), toolbar, inspector, modals & overlays
│   └── lib/                # Platform utilities, export/import, site links & helpers
│
├── astro-site/             # Astro marketing website, documentation guide & toolbox
│   ├── src/
│   │   ├── components/     # Astro UI components, layouts & interactive tool islands
│   │   ├── content/        # Markdown articles, blog posts, updates & structured guide data
│   │   ├── pages/          # Marketing, guide, blog, glossary, toolbox & legal routes
│   │   └── styles/         # Global styles & route stylesheets
│   └── public/             # Marketing static assets & client scripts
│
├── docs/                   # Centralized technical documentation & architectural history
│   ├── README.md           # Documentation directory index and guide
│   ├── PERFORMANCE.md      # Performance budgets, bundle limits & telemetry rules
│   ├── decisions/          # Architecture Decision Records (ADRs 0001–0006)
│   ├── plans/              # Feature specifications & implementation plans
│   ├── audits/             # Component audits & capability gap analyses
│   ├── notes/              # Low-level technical implementation notes
│   ├── archive/            # Historic release notes & launch checklists (v1.0.0+)
│   └── branding/           # Brand identity & logo styling notes
│
├── scripts/                # Build orchestration, quality gates, stress tests & benchmarks
│   ├── probes/             # Standalone Playwright UI inspection & diagnostic probe scripts
│   ├── check-*.mjs         # Production gates (performance, links, SEO, CSP)
│   ├── stress-*.ts         # Stress suites for challenge generator, diagnosis & Ohmageddon
│   └── benchmark-*.ts      # Simulation performance benchmark suites
│
├── e2e/                    # Playwright end-to-end and production verification tests
├── marketing/              # Marketing copy, social posts & distribution drafts
├── reference/              # Reference schematics, calculations & assets
├── public/                 # Simulator static assets, PWA icons & manifest
├── CHANGELOG.md            # Complete version history and release logs
├── PLAN.md                 # Canonical project roadmap & architectural phases
├── TRACKING.md             # Release verification records & cache keys
└── progress.md             # Detailed engineering session log
```

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **UI Framework** | **React 19** | Component tree architecture and modern hooks ecosystem |
| **Site Framework** | **Astro 6** | Zero-JS static site generation for marketing, guides, and tools |
| **Build Tooling** | **Vite 6** + `@vitejs/plugin-react` | Ultra-fast HMR and native ESM Web Worker bundling |
| **Language** | **TypeScript 5.8 (strict)** | Strict end-to-end type safety across domain and UI |
| **Styling** | **Tailwind CSS v4** | Lightweight modern utility styles without runtime overhead |
| **Icons** | **lucide-react** | Tree-shaken SVG icon library |
| **State Management** | **Zustand 5 + Immer + zundo** | Selector-based atomic subscriptions with 100-step undo/redo |
| **Renderer** | **Production SVG** | Lightweight, accessible, responsive, zero-dependency canvas |
| **Simulation Worker** | **Comlink** | Typed RPC communication with dedicated Web Worker chunk |
| **Persistence** | **idb-keyval** | IndexedDB key-value storage with schema migration |
| **PWA & Offline** | **vite-plugin-pwa + Workbox** | Automatic precaching, offline capability, install prompt |
| **Unit & Integration Tests** | **Vitest 3 + Testing Library** | ESM-native test runner with JSDOM environment |
| **End-to-End Tests** | **Playwright** | Full browser automation across desktop and mobile profiles |
| **Linter & Formatter** | **Biome 1.9** | High-performance unified linter and code formatter |
| **Git Hooks** | **Lefthook** | Fast pre-commit checks and formatting enforcement |
| **Deployment** | **Cloudflare Pages + Workers** | Fast global edge delivery for combined static artifact |

---

## Performance Budgets

ElectraSim enforces strict automated size and execution ceilings during build verification:

| Metric | Target / Ceiling | Verification Method |
|---|---|---|
| **Initial JS Bundle** | **≤ 250 KB gzip** | Enforced by `scripts/check-performance.mjs` |
| **Initial CSS Bundle** | **≤ 30 KB gzip** | Enforced by `scripts/check-performance.mjs` |
| **Total HTML Output** | **≤ 10 MiB** | Enforced across all statically generated pages |
| **Generated Tag Archives** | **≤ 80 pages** | Requires ≥ 3 articles per tag archive |
| **Simulation Step Time** | **< 8 ms p95** | Benchmark suite on dense solver graphs (200+ elements) |
| **Main-Thread Pointer CPU** | **< 2 ms p95** | Playwright frame and input benchmark |
| **Frame Rate** | **60 fps** | Hardware-accelerated SVG animations, reduced visual effects fallback |
| **Lighthouse PWA** | **≥ 95** | Performance, Accessibility, Best Practices, SEO |

Run the budget validation suite:

```bash
npm run build
npm run check:perf
npm run benchmark:simulation
```

---

## Getting Started

### Prerequisites

- **Node.js** `≥ 22.19.0` (required by the resolved build tools)
- **npm** `≥ 10.0.0`

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/cngohar/electrasim.git
cd electrasim

# Install dependencies
npm install

# Start the interactive simulator (http://localhost:3000)
npm run dev

# (Optional) Start the Astro marketing & guide site in parallel (http://localhost:4321)
npm run dev:marketing
```

No external API keys or cloud configurations are required for local development.

### Production Build & Verification

```bash
# Full build: compiles Vite app & Astro site into dist/
npm run build

# Run local Cloudflare Pages preview runtime (http://127.0.0.1:8788)
npm run preview

# Execute full verification pipeline (types, linter, unit tests, E2E, budgets)
npm run verify
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite development server with HMR on port 3000 |
| `npm run dev:marketing` | Start Astro development server on port 4321 |
| `npm run build` | Build Vite app and Astro site, merging into `dist/` |
| `npm run build:astro` | Build only the Astro marketing workspace into temporary `dist-astro/` |
| `npm run build:stats` | Full build plus visual rollup bundle treemap at `dist/stats.html` |
| `npm run preview` | Run local Cloudflare Pages preview server via Wrangler |
| `bun run verify` | Full local verification gate: checks, builds, tests, and validates budgets |
| `bun run verify:phase-1.5b` | Electrical contracts/graph gate, local Worker parity, persistence and browser acceptance |
| `bun run test:domain-local` | Compare 486 simulation/compiler cases between Bun and an isolated localhost Worker |
| `bun run deploy` | Intentionally disabled under the V3 local-only workspace rules |
| `npm run clean` | Clean build artifacts (`dist/`, `coverage/`, `playwright-report/`) |
| `npm run typecheck` | Run `tsc` typechecks across root, e2e, and Astro workspace |
| `npm run lint` | Check code with Biome linter |
| `npm run lint:fix` | Automatically fix formatting and lint errors with Biome |
| `npm run format` | Format repository files using Biome |
| `npm run test` | Run Vitest unit and integration test suite |
| `npm run test:watch` | Run Vitest in interactive watch mode |
| `npm run test:coverage` | Run Vitest with code coverage reporting |
| `npm run test:ui` | Open visual Vitest UI in browser |
| `npm run e2e` | Run Playwright end-to-end tests |
| `npm run e2e:production` | Run Playwright test suite against production preview headers & routes |
| `npm run e2e:install` | Install required Playwright browser engines |
| `npm run e2e:ui` | Open Playwright test runner interactive UI |
| `npm run check` | Run typecheck, linter, and unit tests in sequence |
| `npm run check:perf` | Validate production bundle sizes and performance budgets |
| `npm run check:links` | Validate all internal links and anchor references in `dist/` |
| `npm run check:seo` | Validate Open Graph images, canonical tags, and structured JSON-LD data |
| `npm run check:csp` | Validate Content Security Policy compliance across routes |
| `npm run benchmark:simulation` | Run solver performance benchmark against 8 ms budget |
| `npm run benchmark:browser` | Run browser frame rate benchmark on dense circuits |
| `npm run stress:generator` | Stress test challenge generator algorithms for determinism |
| `npm run stress:diagnosis` | Stress test Diagnosis Lab scenario generation |
| `npm run stress:ohmageddon` | Stress test high-difficulty Ohmageddon scenario generation |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `V` | Switch to Select tool |
| `W` | Switch to Wire tool |
| `R` | Arm reroute mode on selected wire (cycles endpoint ports) |
| `Ctrl/Cmd + E` | Open Import / Export modal |
| `Ctrl/Cmd + S` | Quick-export circuit as JSON |
| `Ctrl/Cmd + C` | Copy selected component(s) to clipboard |
| `Ctrl/Cmd + V` | Paste copied component(s) with offset |
| `F` | Zoom-to-fit all components in viewport |
| `Delete` / `Backspace` | Delete selected component(s) or wire |
| `Esc` | Cancel current wire / dismiss selection / close active modal |
| `Ctrl/Cmd + Z` | Undo last action |
| `Ctrl/Cmd + Shift + Z` *(or `Ctrl + Y`)* | Redo last undone action |
| `Ctrl/Cmd + Shift + F` | Toggle FPS and heap monitor overlay (dev mode) |

---

## Architecture & Decisions

Architecture Decision Records (ADRs) document key design tradeoffs and principles in [`docs/decisions/`](./docs/decisions):

- **ADR 0001: Visual Direction & Aesthetic System** — White/slate neutrals with indigo/electric blue accents (`#6366F1` / `#3B82F6`).
- **ADR 0002: Challenge Generator Foundation** — Deterministic seeded pseudo-random generation for reproducible scenarios.
- **ADR 0003: Challenge Mode Comparison** — Declarative validation vs. imperative step-by-step guidance.
- **ADR 0004: Diagnosis Lab Architecture** — Non-destructive fault injection and learner inspection flow.
- **ADR 0005: Ohmageddon Mode Foundation** — High-difficulty electrical fault simulations and multi-variable failures.
- **ADR 0006: Seed & Share Format** — URL-safe, compact base64-encoded state serialization.

---

## Contributing & Discipline Rules

ElectraSim follows strict development discipline to prevent technical debt and regressions:

1. **Every commit must:**
   - Add a descriptive record under `[Unreleased]` in [`CHANGELOG.md`](./CHANGELOG.md).
   - Append a detailed session entry to [`progress.md`](./progress.md).
2. **Major architectural decisions** must be recorded in `docs/decisions/` prior to landing code.
3. **Quality gates are non-negotiable:**
   - All tests must pass: `npm run check` (typecheck + lint + 1,460+ Vitest tests).
   - Performance budgets must pass: `npm run check:perf`.
   - Internal links, SEO data, and CSP must pass: `npm run check:links`, `npm run check:seo`, `npm run check:csp`.
4. **Tests are never weakened or deleted** without an accompanying ADR justification.

---

## License

All rights reserved. License terms are currently proprietary.

---

_Last updated: 2026-09-20 for the v2.0.4 release._
