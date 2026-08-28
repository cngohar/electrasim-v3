# Cable Size Calculator — Visual Design Plan

**Status:** Concept A built on 2026-08-28 (A1–A4 + the opt-in three.js view and the shared
`scene-stage.js` / `stage-spec.ts` / `tool-stage.css` contract). Concept B (thermal camera) and the
full `max-zs` fault-loop scene remain open; the shared contract means that one is now mostly art.
**Scope:** `astro-site` `/tools/cable-size-calculator/` (and the visual language it establishes for `/tools/max-zs-calculator/`)
**Constraint set:** zero new runtime dependencies, no emoji (inline SVG only, per `src/lib/emoji-icons.ts`), works with JS off, `prefers-reduced-motion`, dark mode, full responsive including ultrawide, strict `/tools/*` CSP.

---

## 1. The problem with the current page

`CableSizingPanels.astro` is a form plus a results grid. Every competitor in this space is also a form plus a results grid — ampacity tables, derating chips, a pass/fail badge. The one thing cable sizing has that almost nobody shows is *why* the answer moves: cable sizing is a **heat-balance problem wearing an electrical uniform**. A conductor generates I²R heat and has to shed it through its own insulation into whatever is around it; make the surroundings hostile (loft insulation, 6 circuits in one tray, a 45 °C roof space) and the same copper sheds less heat, so the current it may carry drops and the cable has to grow.

That story is physical, spatial and causal — which makes it a visual, not a table.

### What the engine already exposes (all of it is drawable today)

`src/lib/tools/cable-sizing/calculation.ts` returns: `designCurrentIb`, `protectiveDeviceRatingIn`, `requiredAmpacityIt`, `correctionFactors { ca, cg, ci, cc, totalDerating }`, `selectedCableMm2`, `cableAmpacityIz`, `cpcCableMm2`, `voltageDropVolts`, `voltageDropPercent`, `maxPermissibleVdropPercent`, `thermalPass`, `voltageDropPass`, `limitingConstraint: 'thermal' | 'voltage-drop'`, `status`, `standardLabel`, `standardCitation`.

No new maths is required for any of the concepts below — this is a presentation project, not a calculation project.

---

## 2. Design principle: one visual *family*, three different scenes

The voltage-drop tool works because its metaphor matches its physics: a **journey** across distance — source, cable, house, loss accumulating along the run. Copying that scene for cable sizing would be wrong, because cable sizing has no journey to show. Its physics is **layers and heat**.

So: same craft level, same engineering, completely different composition.

| Tool | Question the user is really asking | Metaphor | Camera |
| --- | --- | --- | --- |
| Voltage drop | "how much do I lose out there?" | journey across landscape | side elevation, horizontal |
| **Cable size** | "**can this cable get rid of its heat here?**" | **cutaway of the building fabric around the cable** | **tilted 3/4 section, zoomed in** |
| Max Zs | "will the protective device see enough fault current?" | the fault loop: source → line → fault → CPC → earth | loop / plan view, arcs |

Shared language across the three: same palette tokens, same scene-container stage, same aspect-fitted live viewBox trick (`syncSceneViewBox`), same `scene-paused` / reduced-motion contract, same floating-panel treatment, same vector pictographs.

---

## 3. Concept A (recommended): "The Cutaway"

A close, tilted 3/4 section of the actual structure the cable lives in, with the cable embedded in it. The user changes the form; the *building fabric around the cable changes*, and heat visibly escapes or gets trapped.

### 3.1 Composition

```
             ┌───────────────────────────────────────┐
   ambient   │  heat arrows escaping freely          │   [Method C: clipped direct]
             │        ↗   ↗   ↗   ↗   ↗              │
             │  ▓▓▓▓▓▓▓▓▓▓▓▌cable▐▓▓▓▓▓▓▓▓▓▓▓▓       │  wall surface
             └───────────────────────────────────────┘
             ┌───────────────────────────────────────┐
             │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │   thermal insulation
             │  ░░░░░  ↺ heat trapped, glow builds ░ │   [Method A: enclosed]
             │  ░░░░░░░░░░▓▓▓▌cable▐▓▓▓░░░░░░░░░░░░  │
             └───────────────────────────────────────┘
```

Five authored environments, switched by the existing Method select:

| Method | What the scene shows | The teaching beat |
| --- | --- | --- |
| A — enclosed in insulation | insulation blanket over/around the cable, heat arrows bouncing back, core glow rising to red | "the same cable loses 27% of its rating: 1.5 mm² is 14.5 A in A, 20 A in C" (repo `BASE_AMPACITY_TABLE`) |
| B — conduit/trunking on wall | PVC conduit tube, 2–3 neighbour cables inside it, warm air pocket under the hood | grouping *inside* the containment, not just beside it |
| C — clipped direct | cable on a surface with clips, unobstructed convection arrows, coolest core | the reference case everything else is measured against |
| D — buried in ground | soil strata, depth ruler at 0.7 m, faint soil-resistivity texture | heat has to conduct, not convect — slower, and depth matters |
| E — free air / tray | perforated tray, cable ladder, spacing marks between circuits | airflow is the whole story; touching neighbours costs you |

### 3.2 What each input maps to on screen

| Control | Scene response |
| --- | --- |
| Load power / pf / Ib | current particles along the core (density and speed) and heat generation rate |
| Ambient temperature 10–60 °C | ambient field tint, and how hard the escape arrows strain (at 50 °C they stall) |
| Thermal insulation 0/50/100/200 mm | the blanket physically thickens over the cable; trapped-heat pool grows |
| Grouped circuits 1–20 | neighbour cables appear on the rail/conduit, each glowing; the bundle centre runs hottest |
| Conductor material | copper vs aluminium core colour, and the *diameter penalty* for Al made visible (same ampacity, fatter cable) |
| Selected mm² | the core radius grows through the IEC 60228 ladder with tick marks — you see 1.5 → 2.5 → 4 → 6 → 10 |
| CPC size | the earth core appears at its correct relative proportion next to L/N |
| `Iz` vs `It` vs `Ib` vs `In` | an **ampacity gauge** drawn into the face of the block (see 3.3) |
| `limitingConstraint` | the spotlight: thermal band or volt-drop ruler gets the lit treatment, the other dims |
| `status` | whole-scene tint + heat danger ticks on the insulation surface when failing |

### 3.3 The hero element: the ampacity gauge (the thing people actually misread)

Cable sizing is one inequality: **Ib ≤ In ≤ Iz**. Almost every tool shows those three numbers as three table rows. In the cutaway they become a single object:

```
   Iz (derated capacity)  ███████████████░░░░░░░░░░   ← the cable's headroom
                          ▲Ib load line   ▲In breaker notch
   fill under the load line = FAIL (cable too hot / too small)
```

A horizontal fill bar embedded in the block face, with two markers (load line, breaker rating) and a *draining* animation: when the user makes the environment hostile, the fill visibly **drains leftward** past the Ib marker, the scene flashes amber, and the conductor pops up one size with a one-line caption:

> “Method A + 45 °C + 4 grouped circuits cut the rating to 0.65 × — 2.5 mm² no longer covers 32 A, so 6 mm² is required.”

That drain is the whole learning moment, and it is the single thing no calculator on the web currently shows.

### 3.4 Supporting graphic: the constraint crossover chart

The other insight cable engineers carry in their heads and no web tool plots: **thermal governs short runs, volt drop governs long ones, and the crossover depends on the circuit**. A small SVG chart (120 px tall, part of the same scene, no chart library):

- x-axis: run length 1–120 m; y-axis: required mm²
- two step-lines: “smallest size that passes thermally” (flat) and “smallest size that passes volt drop” (rising)
- the binding one is solid, the other ghosted; a marker labels the crossover (“past 31 m, length — not heat — sets your size”)
- hover a step to preview that size in the cutaway

This is computed from the same tables the engine walks, so it cannot drift from the answer.

### 3.5 Rendering technique (with the trade-offs researched)

**Recommendation: SVG scene geometry + CSS 3D transforms. No WebGL on this route.**

| Approach | Verdict for this page |
| --- | --- |
| SVG (per-element, styled/animated by CSS) | Correct fit: the scene is ~80–150 elements of instructional geometry, far below where SVG degrades; keeps DOM text/ARIA/SEO, crisp at any DPI, themable with existing tokens, and cheap in dark mode |
| CSS 3D transforms (`perspective`, `transform-style: preserve-3d`) on stacked SVG planes | Gives genuine parallax/tilt and the “explode the layers” interaction for free, GPU-composited, no bundle. This is what makes it read as *3D* rather than a diagram |
| three.js / WebGL | Real 3D, orbit, shadows — but ~150 kB gzip before your scene code, no DOM content for crawlers, single-canvas a11y story (one element plus a hand-written description), and device-GPU variance. The repo already ships this pattern on `/explore/edison-bulb/` where the page *is* the 3D object. A calculator route is not that |

Cross-device animation benchmarks (2026) back this split: DOM/SVG approaches show low GPU use and are recommended for instructional graphics, while canvas/WebGL is the right call for sustained high-object interactive workloads. Same conclusion as `docs/PERFORMANCE.md`: only spend runtime where it removes work, not where it adds it.

Optional phase 3: a **“Turn it around” button** that lazy-imports three.js and rebuilds the same cutaway as a real orbitable mesh, sharing the state contract below. Everything works without it, and the marketing route keeps its zero-framework story.

### 3.6 State contract (so the scene and the maths can never disagree)

The scene is painted from *one* object — the calculator's result — never from its own copy of the inputs:

```js
paintCableScene({
  method, ambientTempC, insulationMm, grouping, material,
  ibA, inA, itRequiredA, izA, selectedMm2, cpcMm2,
  totalDerating, voltDropPct, maxVoltDropPct,
  limitingConstraint, status,
});
```

Implementation: set CSS custom properties (`--heat`, `--core-r`, `--insulation`, `--neighbours`, `--gauge`, `--load-mark`) and one `data-method` / `data-status` attribute; CSS does the animation. The existing `cable-size-tool.js` already recomputes on every input, so this is ~200 added lines and no new file load.

---

## 4. Concept B: “Thermal camera” mode (recommended as phase 2, not the base)

Same geometry, second look: an ironbow heat-map of the cutaway with a temperature scale bar, hotspots annotated (“termination”, “bundle centre”, “insulation contact”) and a `Limit 70 °C` line the palette crosses into alarm colours.

- **Strength:** the most viscerally “3D instrument” view in the set; extremely shareable; makes the abstract conductor-temperature limit a colour threshold.
- **Weakness:** needs a colour-blind-safe ramp plus numeric labels (the map alone is not accessible), and the effect can read as gimmick if it is the default view.
- **Build cost:** small once A exists — same SVG, a `data-thermal` attribute swapping gradients and revealing the scale bar.

## 5. Concept C: “Derate it yourself” (interactive cause-and-effect)

Cards for each condition (`loft insulation`, `6 circuits in one tray`, `roof space 45 °C`, `BS 3036 fuse`); drag one onto the run and watch the gauge drain and the cable upsize, then choose the size yourself from a cable tray to “pass”.

- **Strength:** highest engagement and retention; matches the app's Guided Circuits / Challenge Mode DNA, and could double as the app's own cable-teaching mode.
- **Weakness:** turns a reference calculator into a lesson — risky on a page people use mid-job; drag-and-drop needs a full keyboard/AT alternative anyway.
- **Recommendation:** don't build it on this route. Steal its best bit instead: the **“why did the size change?”** popover on the gauge, which shows the factor waterfall `1.00 → ×Ca 0.87 → ×Cg 0.65 → ×Ci 0.88` as stacked bars ending at `0.50`. Same insight, 30 lines, no mode switch.

---

## 6bis. Post-build correction (from a user screenshot of a small preview window)

The stage composition in §6 was wrong in one respect that only a small window exposes: the panels were
sized with viewport-unit `max-height` and the data graphics were placed in the stage's side zones, which
the panels cover. Fixes landed with this session:

- Panels anchor to the **stage** inside a `.ts-panel-wrap` layer (`top` + `bottom`), with a scrolling
  body — a panel can no longer exceed the stage at all.
- A **stacked fallback** (`≤1360px` wide or `≤700px` tall, opt-in per page) makes the scene a banner and
  lets the panels flow beneath it, where clipping is structurally impossible.
- The fit is **panel-aware**: it measures the overlapping panels and keeps the artwork's *informative*
  box inside the free band, with sky/glow/plate tips allowed underneath. In stacked mode the measured
  padding collapses to zero by itself, so the breakpoint logic is not duplicated in JS.
- **Data graphics live in the results panel** (gauge, why-waterfall, size ladder, crossover chart); the
  stage keeps the stack, cable, heat and specimen. A picture the reader can cover is not a readout.

Lesson recorded for the next scene: author the composition to a *central safe band* (the cable scene
keeps everything inside x ∈ [292, 988] of its 1280-unit canvas) and never put information where a
floating panel can land.

## 6. Layout: keep the form, promote the scene

Cable sizing is a *read-out* tool more than a *scrub-it* tool, so unlike voltage drop it should not become a full-bleed stage with floating panels — the inputs are denser (12 controls, 5 methods). Proposed split:

```
 ┌ ToolHeader ──────────────────────────────────────────────┐
 ├──────────────────────────────┬───────────────────────────┤
 │  THE CUTAWAY (sticky)        │  Circuit specifications   │
 │  scene + gauge + crossover   │  (scrolls under the scene │
 │  chart, ~55% of viewport     │   on narrow screens)      │
 ├──────────────────────────────┴───────────────────────────┤
 │  ToolSeoContent (unchanged, still crawlable)             │
 └──────────────────────────────────────────────────────────┘
```

- Desktop: scene left, form right, both visible at once; the scene sticks while the form scrolls.
- ≤1080px: scene becomes a full-width **banner** above the form (the same banner-height reasoning that fixed the voltage-drop phone layout), ~48vh, and it stops being sticky.
- Portrait phones: aspect-fitted viewBox so the cable and the gauge stay legible; the crossover chart collapses to its two numbers.
- Ultrawide: no flat side bars — reuse `syncSceneViewBox()` from `voltage-drop-tool.js` verbatim (it already solves that class of bug).

## 7. Accessibility, motion, and the JS-off contract

- The scene is `role="img"` with an `aria-labelledby` caption, and a **live sentence** updated with the verdict: “6 mm² required; derating 0.50; limiting factor thermal; volt drop 2.1% of 5% allowed.” Every number in the scene also exists as text in the results panel, so the visual never holds unique information.
- All motion is decorative: particles, heat arrows, glow pulse — each behind `@media (prefers-reduced-motion: reduce) { animation: none }`, plus the existing `scene-paused` class and the Animate toggle pattern.
- Keyboard: the “explode layers” control is a real `<input type="range">` (or segmented buttons on touch), focus-visible rings from the shared tokens, and the crossover chart steps are `<button>`s.
- JS off / crawler: the scene is server-rendered in its *default correct state* (Method C, 30 °C, 1.5 mm²) — no blank canvas, no poster.
- Colour is never the only channel: pass/warn/fail pairs hue with a marker shape (tick / wedge / cross) and the gauge with position.

## 8. Build plan and effort

| Phase | Deliverable | Files | Size |
| --- | --- | --- | --- |
| A1 | `CableSizingScene.astro`: SVG cutaway, 5 method environments, ampacity gauge, heat/neighbour animation, painted from state | new component + `cable-size-tool.js` `paintCableScene()` | ~600 lines total, 0 deps |
| A2 | constraint crossover chart + `data-method`/`data-status` theme contract, dark mode pass, ultrawide/portrait fit | same | ~200 |
| A3 | “why did the size change?” factor-waterfall popover; hover-to-inspect layer labels | same | ~150 |
| A4 | layout split + sticky scene + responsive tiers, e2e coverage (scene fills stage per viewport, gauge matches `Iz/Ib`, chart present, no emoji, reduced-motion) | `CableSizingPanels.astro`, `e2e/toolbox.spec.ts` | ~200 |
| B | thermal-camera toggle | additive | ~120 |
| C (optional) | three.js orbit view, lazy import, `/explore/`-style page | new route | ~400 + bundle |

## 9. Decisions (resolved)

Direction chosen: **A full + lazy-loaded three.js switch**, **full-bleed stage layout** (matching the
voltage-drop composition rather than the split I recommended), and **shared scene contract** in this
pass so max-Zs is cheap next.

1. Concept A as designed, with the crossover chart kept (it earned its place: building it exposed a
   `limitingConstraint` bug in the engine).
2. Full-bleed stage like voltage drop — the inputs panel is scrollable with a pinned footer, and both
   panels become bottom sheets on phones.
3. Shared contract committed now (`scene-stage.js`, `stage-spec.ts`, `tool-stage.css`), plus
   `tool-chrome.js` for the drawer/palette/help layer every page was missing.

---

## §10 — Direction change (2026-08-28, part 9): the run needs two ends

The cutaway shipped in §3/§6bis is a good *diagram* and a poor *story*. Feedback on
the built page was specific: "this is simple cable only and there is no way from which
side power came from and which side power goes". A cross-section explains *why* a size
is needed; it cannot show *what the size is for*.

The scene therefore became a single continuous composition —

    service intake → meter → consumer unit (MCB) → the cable run → the appliance

— and kept the parts of the cutaway that earned their place (the specimen disc, the
layer language, the heat arrows, the crossover chart and the size ladder in the results
panel). Rules the rewrite is built on, in case this page is touched again:

1. **The appliance is the volt-drop meter.** A dim bulb, a slow fan, a weak shower:
   all derived from `--delivered = 1 - drop%`, so the drawing and the number in the
   panel are the same fact twice, not two claims.
2. **The cable changes shape, not just colour.** Method decides the route (loft,
   conduit, clipped direct, trench, tray) and length decides the sag, via
   `cableRoutePoints()` in `src/lib/tools/stage-spec.ts` mirrored by `routePoints()`
   in the client. The conductor's stroke and the specimen radius come from `--size`.
3. **Heat lives on the path.** `stroke-width: calc(24px + var(--size) * 34px)` on a
   blurred `<use>` of the run plus a marching dash, rather than an ellipse parked where
   one method happens to put the cable.
4. **Composition inside the safe band** (x 292…1032 of 1280, y 144…718) — see §6bis.
   The captions on either end are stacked and *short*, because a long one line ran under
   a floating panel; on a phone the labels grow and the prose hides (`@media 640px`).
5. **Nothing on the artwork is allowed to be the only place a number lives.** The MCB
   tag, the load voltage, the length dimension and both gate captions are written from
   the model on every paint, and `e2e/toolbox.spec.ts` asserts they match the panel —
   that test exists because an SSR-only caption ("18 m one-way") outlived its data.

### Presets: from chips to cards

A preset is not a number to apply, it is a circuit to understand. `PRESETS` in
`CableSizingPanels.astro` is the single definition (inputs + story + why + site checks +
citations); chips, cards and the applied field payload all render from it, and every
figure in a card is `calculateCableSizing(inputs)` at build time. Press a chip → read the
card → Apply. `?preset=` applies silently for shared links.

### Small screens: a drawer, not a cropped panel

`data-layout="drawer"` (chosen once, in `scene-stage.js`) folds both panels into bottom
sheets with a grabber, a ×, a scrim, Escape and drag gestures, and pins a handle carrying
the verdict (size, drop against ceiling, status dot) so the closed drawer still answers.
Every rule that hides a panel is behind that attribute, so without JS the stacked flow
keeps both panels in the page. The bug this replaces was stacking, not geometry: the stage
was painted under the reference crawl, so the drawer existed and could not be touched.

