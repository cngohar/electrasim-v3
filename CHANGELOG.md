## [Unreleased]

---

## [2.0.4] — 2026-09-17

A correctness release. The guided circuits stop reporting faults they do not have, protective
devices are named by the rating actually in front of you, the homepage snippet fits the space
Google gives it, and the app's links into the guide point at the routes the guide now serves.
The guide engineering work listed below was already committed but is released here.

### Added

- **Guide engineering hardening.** Search indexing now has one typed source for guide circuits,
  components, tools, hubs, and glossary terms; the circuit index is grouped by difficulty; guide
  review metadata and sitemap `lastmod` are wired through; print styles and clearer next-step labels
  improve the reading path; and legacy guide redirects moved to a cache-busted external script.
  Production verification now includes strict-CSP parity and a browser test that checks every circuit
  schematic's conductor colours under the real security policy.
- **A regression guard for the app → guide links.** `src/lib/site-links.test.ts` checks every
  in-app URL against the Astro routes and the `id="…"` anchors that actually exist, the legacy
  `#circuit-N` anchors against the circuit count in `guide.json`, and the counts the app quotes
  ("twenty ready-made circuits", "twenty step-by-step walkthroughs") against the guided templates,
  so the two sides of the site cannot drift apart again.

### Fixed

- Corrected the dynamic circuit, component, and tool breadcrumb URLs, made Open Graph images absolute,
  and hardened the SEO gate against relative social images, missing build assets, breadcrumb URLs that
  do not match the page, and rendered template placeholders.
- Moved circuit-schematic styling into the external guide stylesheet so the site's strict
  Content-Security-Policy cannot block it and leave SVG paths rendered as filled blocks.
- **Guided circuits no longer fail on a cable size nobody declared.** The over-rated-breaker check
  read the first attached wire and fell back to a 1.5 mm² assumption when that wire had no declared
  size, which reported a fabricated "Over-rated Breaker" error on six to eight of the twenty guided
  circuits; the same assumption reported a 7.6 % voltage drop on the EV circuit. Conductor size now
  resolves from the declared wire, then the smallest explicit endpoint size, then a 2.5 mm² default,
  taking the worst case across every attached wire; an undeclared cable is a warning naming the size
  that could not be checked, not a blocking error, and the recommendation names the next size up.
  Eight templates were corrected to declare what they wire: D-curve contactor and motor at 16 A,
  RCBO-protected socket at 20 A on 2.5 mm², three-phase DOL at D16 per phase, an EV charger whose
  isolator, RCBO and charge point all declare the same 10 mm² run, underfloor heating on C16,
  cooker and hob at 20 A with 6/4 mm², the SPD board RCBO at 20 A, and the AFDD bedroom circuit at
  20 A. All twenty templates now score 100 under the default standard.
- **Device names use the rating the circuit actually has.** The trip dialog, the trip narration and
  the smooth-DC blinding message quoted the catalogue part ("RCBO (32A 30mA)") while the canvas, the
  Inspector, the Zs panel and the mini-EIC certificate named the instance ("RCBO (20 A)"). Every
  learner-facing name now comes from the instance rating, which is the rule `domain/componentLabel.ts`
  already documented.
- **The homepage snippet fits its budget.** The title was 70 characters and the description 228, so
  the snippet clamp shipped `ElectraSim — Free Online Electrical Wiring Simulator &` and a
  description cut mid-list. The landing copy is now 52 and 149 characters, and the clamp itself drops
  dangling punctuation and connector words, so no page can end a snippet on "&", "and" or "to the"
  (ten blog pages had been doing exactly that).
- **In-app guide links point at routes that exist.** The docs panel linked to
  `/guide/#circuit-walkthroughs`, `#latest-features` and `#templates-h` — anchors the guide stopped
  serving when it became a route table — and described the guide as eight walkthroughs. They now
  point at `/guide/circuits/`, `/guide/templates/#latest-features` and `/guide/templates/#templates-h`,
  and the counts that had drifted say twenty.

---

## [2.0.3] — 2026-09-09

The guide release. Everything below that was previously listed under _Unreleased_ ships in this
version: twenty circuit walkthroughs, twenty-two component anatomy pages with cutaway views for
sixteen of them, eight tool pages, the glossary, and the SEO pass that gave every guide page a
snippet that fits, its own social card and marked-up breadcrumbs. The release note carries the
reader-facing summary; see the session log in `progress.md` for how it was built.

### Added

- **A start-here post for the guide.** `/blog/how-to-use-the-electrasim-guide-beginner-to-pro/` is the
  route through the whole guide: what to open first, how to read a circuit walkthrough (schematic,
  wiring path, steps, key insight, safety band), when to open a component page instead, and how to tell
  when you are ready for the next level. Four levels — beginner, intermediate, advanced and pro — each
  with a reading order, the pages to open, and the thing to build in the app before moving on, ending at
  Challenge Mode, the Diagnosis Lab and Ohmageddon. A progression table summarises the route, and the
  closing section is explicit that the guide is educational and not a substitute for a qualified
  electrician or a notifiable installation under Part P.
- **Glossary.** `/glossary/` defines the 36 terms the walkthroughs use — Zs, Ze, R1 + R2, CPC, RCD
  types AC/A/F/B, Type B/C/D curves, TT/TN-S/TN-C-S, Ra, IP-style earthing and testing vocabulary,
  diversity, SELV, Voc — grouped by subject with an A–Z jump strip and per-term anchor links. Each
  entry lists the circuits, components and tools that actually use it, derived by scanning the prose
  so the cross-links cannot drift; the same scan puts a "Terms used here" chip row on every
  walkthrough, component and tool page. Four regression tests cover unique slugs, `see`-link
  integrity, word-boundary matching and the no-orphan-term invariant.
- **Test equipment pages.** Multimeter, voltage and continuity tester, RCD tester and clamp meter —
  the instruments the safety copy keeps referring to ("prove dead", "press the test button"). The
  tools index now splits into hand tools and test equipment.
- **Anatomy pages for the nine advanced components.** Contactor, PIR motion sensor, cooker control
  unit, diesel generator, AFDD, EV charge point, solar PV panel, 12 V battery and underfloor heating
  mat — the equipment the eight advanced walkthroughs name, which previously appeared as dead chips.
  Each page carries a photorealistic render cropped to an exact 1:1 canvas, hotspots measured off the
  render rather than guessed, a hand-authored SVG drawing for the parts a photo cannot show, terminal
  and part lists, a safety note and links both ways to the circuits that use it. The guide now
  explains 22 components and every component a walkthrough names resolves to exactly one page.
- **Real-part imagery across the guide.** All four components (MCB, RCD, lamp, socket) and all four
  hand tools now lead with a photorealistic render instead of a drawing, cropped tight to the part and
  served as WebP with a PNG fallback. Hotspots are pinned to the real geometry using percent
  coordinates declared in the content JSON, matched to anatomy points by id so labels and
  descriptions are never duplicated. Internal parts (trip mechanisms, shutters, rear terminals) keep
  no photo coordinates and stay on the diagrammatic drawing.
- **Circuit walkthrough pages.** `/guide/circuits/` plus eight per-circuit pages carrying the text
  wiring path, a hand-authored SVG schematic, component chips that link to the matching anatomy page,
  a full-width safety band, and prev/next navigation. Conductors follow wiring practice — live red,
  neutral black, strappers brown, earth green — and an amber current-flow animation traces the
  conducting path, stopping under `prefers-reduced-motion`.
- **SVG schematics for all eight circuits.** Single-lamp, two-lamp parallel, two-way switching,
  RCD-protected socket, timed outdoor lighting, dimmable lighting, doorbell and the three-way
  consumer unit panel, each drawn with shared symbol builders (switch, lamp, socket face, bell,
  motor, clock, dimmer, push button) so the set reads as one diagram family.
- **Schematic and component regression tests.** Sixty-five assertions across the eight diagrams: every circuit has
  a schematic, no conductor ends in mid-air, the animated current stays on the conductors, no label
  is printed on a wire or on top of another label, and nothing is drawn outside the frame — plus forty-two more over the component library: every
  circuit component resolves to exactly one page, every page is reachable from a circuit, every
  drawing point sits inside the shape it labels, and every photo hotspot matches a real point on a
  real image of the declared size.
- **Nine more component anatomy pages.** One-way switch, two-way switch, junction box, timer
  switch, dimmer switch, bell push, bell/buzzer, distribution board and electric motor — every
  component a circuit walkthrough names now has a page of its own (13 in total), each with a
  photorealistic render, numbered hotspots on the real geometry, terminal and part lists, a safety
  note and links both ways to the circuits that use it. Hotspot coordinates were measured off the
  renders (dark-blob, brass and copper feature detection) rather than eyeballed, and every marker
  verified to land on the part.
- **"In the App" section** at `/guide/templates/`: the six feature cards, the four-step workflow and
  the 18 guided templates moved off the hub, each template cross-linking to its written walkthrough
  where one exists.

- **Component renders are square.** All 13 part photos are padded to an exact 1:1 canvas with the
  part centred on the render's own background colour, so every anatomy card and index tile frames the
  same way instead of alternating between tall and wide crops. Hotspot percentages were remapped to
  the new canvas and re-verified.
- **Content-hashed asset URLs for `public/` scripts.** `publicAssetVersion()` hashes a file at build
  time, so `/js/guide-lab.js?v=<sha>` changes exactly when the script does — previously the query
  string came from the package version and stayed identical across releases, leaving returning
  visitors on a stale script.

- **Four more circuit walkthroughs.** Protected lamp, timer-controlled bell, RCBO-protected socket
  and contactor motor starter — each with a hand-authored schematic, component chips that open the
  matching anatomy page, a build sequence, a key insight and a deep link into the in-app template.
  The guide now carries 12 walkthroughs covering 10 of the 18 guided templates, and the switchless
  protected lamp is the new Lesson 01 so the sequence runs from a bare two-rail circuit up to the
  consumer unit.

- **Two more guided templates in the app.** Two-bulb parallel lighting (Beginner) and dimmable
  lighting (Intermediate) close the last two gaps between the guide and the editor: the app ships 20
  guided templates, and all 12 walkthroughs now open a template that matches them. Both are pinned by
  topology and simulation tests — the parallel lamps keep a branch alive when the other is removed,
  and the dimmed lamp drops when the dimmer opens.

- **Walkthroughs for the last eight guided templates.** Three-phase DOL motor starter, EV charger
  circuit, solar PV with battery storage, underfloor heating zone, PIR floodlight, cooker and
  induction hob supply, diesel generator backup and the AFDD-protected bedroom circuit — lessons 13
  to 20, each with a hand-authored schematic, anatomy cross-links, a build sequence, the key insight
  and a safety note specific to the work (400 V isolation, DC arc behaviour, generator back-feed,
  earthing arrangements). Every guided template in the app now has a written walkthrough.
- **Schematic support for circuits that are not single-phase AC.** DC walkthroughs draw a positive
  and a negative rail with their own conductor colours and terminal markers and a matching legend
  (DC + / DC −), and three-phase drawings no longer claim a neutral they do not have.

### Changed
- **The guide hub is a route table, not a dump.** Four section cards plus a circuit index replace the
  inlined feature, workflow, template and circuit content; legacy `/guide/#circuit-N` links redirect
  to the new pages.
- **Anatomy pages read side-by-side.** The point-detail panel sits in the side rail beside the figure
  (below the specification rows, above "Meet it in a circuit") instead of beneath it, and the safety
  note is a full-width band below the anatomy and above the bottom row.

- **Hotspots belong to detail pages.** Component and tool index cards are browse tiles again — the
  numbered markers (and their detail panel) only render where they can be used.
- **Component chips that open an anatomy page are now amber**, so "this one has a page" reads at a
  glance next to the plain chips.
- **The components index and hub copy count themselves.** The section heading and the hub card
  description now derive from the collection, so adding a part no longer leaves "Four components"
  or "MCB, RCD, lamp and socket" behind.
- **The schematic legend follows the drawing.** Earth (green) is listed only on circuits that run a
  CPC, and strappers only where two-way switching uses them. Device designators (MCB, RCD, timer,
  dimmer, main switch) and the two-way terminal labels (COM, L1, L2) moved clear of the conductors
  that used to run through them.
- **The templates page states what it covers.** The section copy counts both collections (18 app
  templates, 6 of which have a written walkthrough) and every card without one carries an
  "App only" chip, instead of silently omitting the link.
- **Responsive pass** across the new guide surfaces: phone (≤560px), tablet (≤760px), small laptop
  (980–1200px) and widescreen (≥1600px) rules for the hub grid, circuit index, walkthrough columns,
  schematic frame, tall portrait renders and the safety band.

### Removed
- The `#circuit-N` progress strip under the guide hero, the equivalent `#slug` strip on the anatomy
  index pages, and the duplicated circuit list on the hub — the dedicated pages replace all three,
  and the hero's "See latest features" button now points at `/guide/templates/`.

### Fixed
- **Guide breadcrumbs were rendering as terminal cards.** `global.css` styles a bare `.bc` with a
  border, shadow and top busbar for the blog; guide pages were inheriting it. Scoped out with
  `.bc-wrap:has(+ .guide-hero)`, leaving the blog untouched.
- **Anatomy hotspots vanished from the component and tool detail pages.** When a page pointed a
  figure at the anatomy panel in the right rail, the script searched for that panel *inside* the
  figure, found nothing, and skipped the figure entirely — so every numbered marker stayed hidden and
  the overlay was never revealed. Panel lookup now matches the scope element itself before searching
  inside it, and a jsdom regression test pins the external-panel case (plus a `viewBox` guard for
  environments that do not expose it).
- **Hotspots were still invisible for returning visitors.** Three causes: the figure's `<img>` could
  finish decoding after the script ran (markers are now repositioned on `load`), a photo wider than
  its stage pushed the overlay's negative offsets outside the card's `overflow: hidden` (`max-width:
  100%` on `.anatomy-photo`), and the script URL was version-stamped with the package number so
  browsers kept serving the old file. All three fixed.
- **The landing page still counted eight guided circuits.** The app had grown to 18 templates (20
  now) while the hero stat and the release highlight kept the original number. Counts derive from the
  template list wherever a page can, and the in-app docs name the new starter circuits.
- **The single-lamp walkthrough opened the wrong template.** Its steps place a switch, but the link
  pointed at `simple-lamp`, which has none. It now opens `one-way-light-switch`, and the switchless
  `simple-lamp` template has its own walkthrough.
- **Detail pages linked to themselves.** The catalog card's "Open anatomy →" action now only renders
  when a different URL is passed, so component and tool detail pages are no longer their own CTA.
- The component CTA description shipped a literal `Set {data.name}` — a plain string attribute does
  not interpolate in Astro. Now a template literal.
- Search indexed circuits at `/guide/#<id>`, a fragment that never resolved for a first-time visitor.
  Entries now point at `/guide/circuits/<slug>/`.
- **Structured data for the guide.** Every guide page now carries a `BreadcrumbList`. The trail was
  visible on nine templates and marked up on none of them, so a crawler saw no hierarchy at all; it
  is now emitted by `GuideBreadcrumbs.astro`, which takes the crumbs once and produces both the
  `<nav>` a reader sees and the JSON-LD a crawler reads, so the two cannot drift. The 20 circuit
  walkthroughs also carry a `HowTo` — name, description, card image, the parts list as
  `HowToSupply`, ElectraSim as the `HowToTool`, and one `HowToStep` per numbered step, each with the
  anchor of the `<li>` that renders it so the step URLs resolve. `npm run check:seo` compares each
  `BreadcrumbList` against the trail actually rendered on the page and fails on a difference, and
  fails on an unrendered template expression (`{data.name}`) reaching the HTML. Nine unit tests cover
  the builders, including the step-label truncation that keeps a long instruction readable.
- **Per-page social cards for the guide.** All 56 guide URLs — 22 components, 8 tools, 20 circuit
  walkthroughs and the six landing pages — now carry their own 1200×630 card instead of sharing the
  generic `og-image.png`. `scripts/generate-og-images.mjs` grows a corpus per guide section: cards
  keep the seeded circuit-trace motif and brand header, take their accent from the item's category
  (Protection, Generation, Test equipment…) so a section reads as a set while its categories stay
  tellable apart at thumbnail size, and put the page's own counts in the meta row — "3 terminals ·
  5 parts", "Beginner · 8 steps" — in place of a publication date a guide page does not have. Guide
  cards ship as PNG-8: measured against the truecolour encoding, 60 KB instead of 131 KB for a
  per-channel error of 0.65/255; the blog and changelog cards keep the encoding they shipped with.
  `npm run check:seo` now fails if any `/guide/` or `/glossary/` page falls back to the shared
  image, and seven unit tests tie the manifest back to the content it is generated from, so a page
  added without re-running the generator fails the suite rather than going unnoticed.
- **Search snippets were being truncated mid-word by Google.** 111 of 188 pages shipped a title longer
  than 60 characters (worst 127) and 128 a description longer than 160 (worst 415 — the cooker control
  unit page, whose description was the tagline with the whole terminals list appended). Titles and
  descriptions are now clamped in `Base.astro` via `src/lib/seo.ts`: a description prefers to end on a
  complete sentence and otherwise cuts at a word, guarded against the false sentence ends that occur
  in electrical copy (`1.5 mm`, `etc.`); a title prefers to drop the trailing brand segment, then the
  longest leading clause, and only then cuts. `ToolLayout.astro` gets the same clamp — the two toolbox
  pages write their own head tags and kept their 237- and 199-character descriptions after the first
  pass. `npm run check:seo` now reads the built HTML and fails on a title over 60, a description
  outside 40–160, a missing tag or a description duplicated across pages; it is wired into
  `npm run verify`. All 187 indexed pages pass.

---

## [2.0.2] — 2026-09-04

### Added
- **The comparison bench is rebuilt from the ground up.** `/compare/` now combines a custom SVG
  research map, task-fit signal plots, a filterable and sortable matrix built from accessible grid
  rows (not a generic HTML table), selectable tool profiles, pinning, source trails and a dated
  methodology. The bench covers ElectraSim, two direct wiring tools, electronics-analysis tools,
  classroom platforms and an open circuit-theory option.
- **First-party research ledger.** `astro-site/src/lib/competitor-bench.ts` records the six
  dimensions, evidence notes and official source links reviewed on 2026-09-04. “Not confirmed” is
  used wherever a public provider page does not document a capability.
- **Live browser coverage.** The production suite now checks the rebuilt route, its SVG and radar
  plots, interactive filtering and sitemap entry.

### Changed
- **Documentation and metadata** now describe the comparison bench and its evidence-led task-fit
  model. Historical release notes retain the v1.6 context but point readers to the current bench.

---

## [2.0.0] — 2026-08-31

**ElectraSim 2.0** — the learning release. Everything below that was previously listed under
_Unreleased_ ships in this version: the structured learning modes (Challenge, Diagnosis Lab,
Ohmageddon), the deterministic challenge/fault generator underneath them, Guided Circuits,
the Fault Lab, the multi-standard Electrical Toolbox (BS 7671 / IEC 60364 / US NEC) with the
source→cable→load Cable Size Calculator, interactive onboarding tours, the redesigned workbench
shell (command palette, command-hub menu, settings + portable backups), international default
standard, cross-platform SVG icons, and a long list of correctness fixes — conductor-bypass
validation, withheld fault narration, live symptom evidence, compound-fault verification, and
the honest-cable temperature correction. Full release notes: [`/updates/electrasim-2-0-release/`](https://electrasim.com/updates/electrasim-2-0-release/).

### Replaced — Session 2026-08-29: Cable Size Calculator v2 (source → cable → load)

The cable-sizing tool has been **replaced**, not extended. v1 was a derating/ampacity form (installation
method, ambient temperature, grouping, protective device) married to a cutaway diagram; v2 answers one
question — *what is the smallest cable that keeps the voltage drop inside the limit I chose?* — and shows
the run it is talking about.

1. **One question, asked out loud.** Pick a load (Lighting 100 W, Fan 80 W, Motor 2.2 kW, Heater 3 kW,
   Appliance 500 W, or your own watts and power factor), set the run (voltage 230 V, length 25 m, copper
   or aluminium, drop limit 3% / 5% / custom) and the tool reports the smallest size on the ladder that
   passes, the volts and percent it uses, the voltage arriving at the load, and PASS / NEAR LIMIT / FAIL.
   The limit is presented as a **design choice with a disclaimer**, never as a regulatory verdict
   (§24's do-not-add list — no MCB/RCD, no thermal derating, no grouping, no ambient temperature, no
   three-phase, no manufacturer tables, no certificate).
2. **All the electrical maths lives in one place.** `src/lib/tools/cable-size/` (`config`, `presets`,
   `validation`, `evaluate`, `visual`, `explain`, `format`) wraps the shared
   `voltage-drop/calculation.ts`; the UI and the scene never recompute a number. 65 domain tests pin the
   ladder, the length/material sweeps, URL parsing and the failure copy.
3. **The scene is the answer, not decoration** (`CableSizeScene.astro`): an isometric SVG run —
   source pylon → cable → load — with a per-load drawing (lamp, fan, motor, heater, appliance, custom)
   sharing the same source and cable infrastructure. Cable thickness follows a **controlled non-linear
   scale** (`visual.ts`) so 1.5 mm² is visibly thinner than 10 mm² while the label always states the true
   size. Selected and recommended are separate: clicking any candidate redraws the cable and the results
   without ever moving the recommendation.
4. **Repaint, don't rebuild.** The browser engine (`src/tools/cable-size/engine.ts`, bundled to
   `public/js/cable-size-tool.js` by `scripts/build-tool-engines.mjs`) writes to server-rendered nodes;
   the SVG is updated in place (`data-tag` proves it), so the first paint and every later paint come from
   the same evaluation. 23 jsdom tests drive it end to end before a browser is involved.
5. **Comparison strip + “Why this size?”.** Every candidate is scored FAIL/PASS with its volts and
   percent; the recommended size is flagged, the inspected one is marked IN USE. The explanation is
   generated from the result, so it changes with it — and an over-limit run is explained as teaching
   (“a bigger cable…”, never an explosion or a disaster).
6. **Mobile keeps the story.** Under the drawer layout the inputs live in a bottom sheet, the verdict
   rides the handle, and SOURCE → CABLE → LOAD stays on screen; accessibility holds throughout (semantic
   labels including the slider, keyboard-navigable radio group, status in words not colour, live region
   announcements, reduced-motion + an explicit animate switch, no emoji glyphs in the tool UI).
7. **Tests**: new `e2e/cable-size.spec.ts` (17 scenarios × 3 projects = **51 passing**) runs in the
   **default** `npm run e2e` — `playwright.config.ts` now also starts the built-site preview server
   (port 8788) beside the Vite dev server and the spec skips itself when `dist/` has not been built.
   `e2e/toolbox.spec.ts` lost its ~40 v1 cable assertions; its two surviving cable tests were rewritten
   to v2 markup, and its cropping detector now ignores deliberately clipped `sr-only` text and children
   of horizontally scrollable strips. **51/51 toolbox tests pass.**
8. **Removed**: `CableSizingPanels/Scene/Scene3d.astro`, `public/js/cable-size-tool.js` (v1) and
   `cable-tables.js`, and the `src/lib/tools/cable-sizing/` ampacity/domain module and its tests — no
   legacy route, no unused modules.
9. **Verification**: `astro build` 135 pages · `astro check` **0 errors / 0 warnings** · `biome lint`
   clean (505 files) · `tsc` clean for app, e2e and astro-site · **1123 unit tests** · 51 cable-size +
   62 production-suite E2E passing.

### Fixed & Enhanced — Session 2026-08-30 (part 7): Cable Size Calculator review — hot cables, honest controls

A review of the cable-sizing implementation on its own, followed by fixes to what it got wrong.

**The one that mattered: the tool sized cold cables.** Resistance was corrected to **20 °C**, but BS
7671's voltage-drop figures — the tables this tool cites — are tabulated at the conductor's **maximum
operating temperature, 70 °C for PVC under load**. A cable under load is not a cold cable, and
`1 + 0.00393 × 50` is **1.1965**: every voltage drop the tool reported was about **20% low**, and
under-sizing is the one failure this tool exists to prevent. The tool's own prose (the Voltage Drop
checklist) was already telling readers to "size to the hot cable, not the cold one" while the Cable
Size tool quietly did the opposite.

1. **Conductor temperature is now an input**, defaulting to 70 °C, with 20 °C / 70 °C / 90 °C chips
   (cold, thermoplastic under load, thermosetting under load), bounds −25…200 °C, and a `temp` share
   parameter. The one field where a negative value is legal, so it has its own validation path.
   Measured effect at the defaults: lighting 25 m goes 0.11% → **0.13%**; a 3 kW heater over 60 m
   moves 4 mm² → **6 mm²**. Every figure in the results, the strip and the "why" follows.
2. **The safety gap is now impossible to miss.** The tool sizes on voltage drop alone, so 10 kW at
   230 V over one metre is 43.5 A and **1.5 mm² passes with a green PASS** — a cable that would
   overheat. A permanent scope line now sits directly under the recommendation (not at the foot of
   the panel, where it would be scrolled past) and **names the design current**: *"Voltage drop only.
   At 43.5 A, also check the conductor's current-carrying capacity (Iz) against BS 7671 Appendix 4.
   Inside the drop limit is not the same as big enough."* No rating figures are invented.
3. **The form stopped promising physics it does not run.** The AC note claimed "the cable's reactance
   counts toward the drop" while the engine passes `includeReactance: false`. The note now says what
   happens — drop worked from resistance alone, reactance omitted, worth a few percent on the largest
   sizes and nothing on the small ones.
4. **The length slider no longer lies.** It stopped at 200 m while the field allows 1000 m, so a
   500 m run showed a slider parked at 200. It now widens to the full range (with a hint) past 200 m,
   and uses `step="any"` so a stepped track cannot report **501 m for a 500 m run** — the slider
   snapping was the same dishonesty in a smaller hat. Drags are rounded to 0.5 m / 1 m.
5. **A rejected input is marked stale.** Typing an out-of-range value used to leave the previous
   result sitting there looking current; the panel is now dimmed with "showing the last run the tool
   could evaluate".
6. **Two rows of the results table were both labelled "Voltage drop"** (volts and percent). The
   percentage row now reads "As a share of the supply".
7. **The SEO worked example and resistivity paragraph** were quoting 20 °C figures (7.48 V / 3.25%,
   4.49 V / 1.95%, 3.12%); they now match the tool (8.9 V / 3.89%, 5.4 V / 2.33%, 3.73%).

**Verification:** `astro check` **0 errors / 0 warnings / 10 hints** · `biome lint` clean (511 files) ·
`tsc` clean for app + e2e · **1149 unit tests** (15 new: temperature physics, negative temperatures,
scope copy, stale marking) · cable-size E2E **99/99** (5 new scenarios × 3 projects) · 0 page errors
at 1440×900, 1280×800, 1120×700, 1024×700, 900×700 and 390×844, with the collapse → expand dock
regression still clean (21 fields, body not hidden).

### Fixed — Session 2026-08-30 (part 6): the AC/DC toggle changed nothing but a greyed-out field

Reported from the preview: *"when clicking on dc, toggle the voltage is stay same, wait everything is
stay same except power factor and disabled and load type is (changed somewhat)"*. Confirmed by diffing
**41 live values** before and after the toggle — 34 of them were byte-identical. With the default load
(Lighting, PF 1.00) the current is `P ÷ V` either way, so flipping to DC moved **nothing at all**: same
230 V, same 0.4 A, same 0.11% drop, same 1.5 mm² recommendation. The switch read as decoration.

1. **Each system now carries its own voltage ladder.** `SYSTEM_VOLTAGE_PRESETS` in `config.ts` gives AC
   120 / 230 / 400 V and DC 12 / 24 / 48 / 220 V, with a chip row under the voltage field that swaps
   with the system (`cs2-volt-presets`, pressed chip marked). The field stays free-form — the chips are
   shortcuts, not a value.
2. **Flipping the toggle moves the supply.** DC lands on 48 V, AC back on 230 V. The teaching contrast
   is the point: 100 W over 25 m at 230 V is **0.4 A and 1.5 mm²**; the same lamp at 12 V is **8.3 A and
   25 mm²**. A voltage the reader typed outranks the suggestion and survives the toggle (a 600 V solar
   string is not on either ladder); clicking a chip re-arms it.
3. **Loads are described in the system's own words.** `LoadPreset.noteDc` + `loadNote()`: a motor on DC
   is "a 2.2 kW DC motor — a traction or pump drive", not "a 2.2 kW **single-phase** motor".
4. **The scene shows which supply it is.** The cabinet carries a system badge — a sine for AC, a battery
   for DC — driven by `data-system`, which until now was set and read by nothing. The current markers
   breathe on AC and run steady on DC, gated on the animate switch like every other animation.
5. **The cabinet's rating plate was stamped 230 V forever.** It ignored the run entirely; it now reads
   the live voltage (48 V on a DC run, 600 V if you asked for 600 V).
6. **A shared link that names a system lands on that system's nominal** (`?system=dc` → 48 V); one that
   names a voltage keeps it.

**Verification**: `astro check` **0 errors / 0 warnings / 10 hints** · `biome lint` clean (505 files) ·
`tsc` clean for app + e2e · **1141 unit tests** (9 new in `presets.test.ts`) · cable-size E2E **84/84**
(3 new scenarios × 3 projects) · 0 page errors at 1440×900, 1280×800, 1120×700, 1024×700, 900×700 and
390×844, with the chip row a single 19px line that never overflows the panel.

### Fixed — Session 2026-08-30 (part 5): a dock that opens empty, and words floating on the sky

Two defects reported from the same small preview window.

1. **Opening a dock showed an empty panel.** Collapsing had **two owners**: the cable engine toggled
   `body.hidden`, and `scene-stage.js` toggled `data-collapsed` (the rail, the widened neighbour, the
   strip). They kept independent state, so a dock that *started* folded — every window under 1100px —
   was one click out of phase: the CSS said expanded while the body was still `hidden`, and the panel
   opened to a blank 430px rectangle. Measured at 1024×700: `data-collapsed="false"`, panel 430px wide,
   body `display: none`, **0 fields**. One owner now (the shared stage runtime, which also owns the rail
   and the refit) → **20 fields, body 548px, every readout visible**.
2. **Words painted on the sky.** The scene carried a headline — "ELECTRICAL RUN · SOURCE → CABLE →
   LOAD / The cable is the variable / …" — authored at y=66…134, well *above* the band the fit
   guarantees is in frame (y≈200…580). On a tall, narrow frame the viewBox reaches up into it and the
   sentence floats over the sky, duplicating the page heading. Removed, along with its dead CSS; the
   scene keeps its own labels (SOURCE, LOAD, the cable pill, the readouts).

Both are now covered by tests: unfolding a dock asserts the body is not left `hidden`, that its fields
are visible and that the cable-length field is clickable; the scenery test asserts no scene text
contains the old headline.

**Verification**: `astro build` ✅ · `astro check` **0 errors / 0 warnings / 10 hints** · `biome lint`
clean (504 files) · **1132 unit tests** · cable-size E2E **78/78** · production E2E 62 passed with the
same 4 pre-existing sandbox failures.

### Fixed — Session 2026-08-30 (part 4): the run is wired up, and the panels dock instead of hiding the answer

Three defects reported from a screenshot of a small preview window, all confirmed by measurement in a
real browser before anything was touched.

1. **The cable was painting a black wedge over the scene.** Every path in the cable span is an *open*
   path (`M288 352 Q 620 470 962 352`) carrying no `fill`, so SVG's default black fill applied: the lens
   between the sagging span and the straight line joining its ends was filled solid `#000` — the "dark
   black colour above the wire", and it grew with sag, so it was worst on exactly the long runs that
   matter. Measured at 1024×700: **9,631 pixels of pure black**, in a band tracking the cable exactly.
   `.cs2-cable path, .cs2-cast-shadow { fill: none }` → **0**. (The `<defs>` copy already had
   `fill="none"`; the six drawn paths did not.)
2. **The span ended in mid-air at both ends.** The path began at x=300 while the cabinet's right face is
   at x=286, and stopped at x=940 with the shed wall at x=964 — gaps of **14 and 24 units** with nothing
   bridging them. The path now reaches both buildings (288 → 962) and a termination clamps each end: a
   bolted back plate, a threaded gland body and a locknut, galvanised on the cabinet and timber on the
   shed. Both gaps measure 2 units now and are wholly covered by the plate.
3. **The results panel was below the fold.** On a 1024×700 window the stacked layout put the results
   panel at **y=1084**, so reading the answer meant scrolling past the run that explains it. The cable
   stage no longer stacks: its panels **dock left and right over a full-height scene**, and each folds to
   a labelled rail. With both folded the run spans **516px on a 1024px window instead of 209px**; at
   1366×768 both docks are open, both wholly inside the viewport, and the scenery gets the window.

Supporting work:

4. **Docks that know the space they are in.** Folding one dock widens the other — and the comparison
   strip — into the freed width. Below 1100px, where two open docks would leave the run a 136–340px
   band, both start folded so the scenery gets the window on arrival (an *initial* state only; a later
   resize never fights the reader). The refit needs no plumbing: a `ResizeObserver` already watches every
   panel, so a dock changing size re-runs the fit by itself.
5. **The strip lives between the docks.** Centred with a `min-width`, it slid under the inputs panel on a
   narrow window and the panel's own legend swallowed clicks meant for the first candidate — **21 E2E
   failures at 1440×900**. It now spans the free band and measures clear of both docks at every width
   from 820 to 1600.
6. **The drawer is untouched.** Folding a sheet would open it empty, so the rail styles and the
   auto-fold are both scoped away from `[data-layout="drawer"]` — verified at 390×844: the sheet still
   opens with its fields live.

**Verification**: `astro build` ✅ · `astro check` **0 errors / 0 warnings / 10 hints** · `biome lint`
clean (504 files) · **1132 unit tests** · cable-size E2E **78/78** (3 projects) · production E2E 62
passed with the same 4 pre-existing sandbox failures. Two layout tests were rewritten to the new
intent — the old ones asserted the stacked layout that is now gone.

**Found the hard way**: Astro scopes component `<style>` selectors with the component's own
`data-astro-cid`, so `.ts-stage[data-layout="float"] .cs2-strip` written inside `CableSizePanels.astro`
compiled to a selector requiring the *panels'* id on the stage element — which belongs to
`ToolWorkspace.astro` — and silently never matched. Cross-component selectors need `:global(…)`.

### Enhanced — Session 2026-08-30 (part 3): the cable run gets a sun, a shadow and small props

A detail pass on the cable-size scene (`CableSizeScene.astro`, 62 kB → 69 kB). Nothing electrical moved —
only what the artwork does with the light.

1. **One sun, kept honest.** The scene had flat fills, so nothing looked lit. Both buildings now carry a
   lit face and a shaded face from the same direction (`cs2-sunlit` / `cs2-shaded` gradients), measured on
   screen rather than eyeballed: kiosk shaded 180 vs sunlit 228, shed 174 vs 210 (luminance, 0–255). A
   first attempt with narrow ramps measured *no* difference in either building, so the gradients and the
   rects they paint were widened until the probe said otherwise.
2. **Shadows that belong to things.** The cable span casts a shadow on the lawn (the cable path offset and
   blurred, under everything: lawn 154 → shadow 143), the trees get soft contact shadows where they meet
   the ground, and two cloud shadows drift across the field. The bay window glows after dark
   (opacity 0 by day, 0.45 at night).
3. **Ironmongery and shed props.** Kiosk: hinges, a lock with a keyhole, a gland where the conduit enters.
   Shed: plank lines, a gutter on brackets, a downpipe, a water butt; a coil of cable on the hook, a jar
   and a tin on the shelf, a can by the door.
4. **Wind that travels.** Each tuft and flower used to shake on its own clock, so the field shimmered
   instead of gusting. Sway delay is now a function of x, which makes a gust cross the field. Birds flap
   (three of them, on the post cross-arm).
5. **Every new animation obeys the switch.** `.cs2-flap` and `.cs2-cloud-shadow` were added to all three
   pause lists (`[data-motion='off']`, `.scene-paused`, `prefers-reduced-motion`); with the animate switch
   off, measured movement over 900 ms is zero for every one of them.

**Verification**: `astro build` ✅ · `astro check` **0 errors / 0 warnings / 10 hints** · `biome lint`
clean (504 files) · **1132 unit tests** · cable-size E2E **78/78** · production E2E 62 passed with the
same 4 pre-existing sandbox failures.

**Found while measuring**: the band fit crops the top of the artwork on a laptop — at 1440×900 the
viewBox is `y 200 h 380`, so art above y≈200 is off-screen. A bird placed at y=208 sampled
`rgb(NaN, NaN, NaN)`. It moved to `y 392`; the safe band for new props is **y ≈ 200–580**.

### Fixed & Enhanced — Session 2026-08-30 (part 2): the form shows what is selected, and laptops stop being cramped

1. **Picking a control did not move the selection.** The segmented buttons (AC/DC, Copper/Aluminium,
   3%/5%/Custom) and the load cards are styled by an `.active` class that the engine only applied on a
   full sync — first paint, reset and shared links. Clicking anything left the *previous* choice
   highlighted while the new one did the work: pick DC and AC stayed blue. Measured before the fix,
   after clicking DC: `checked=dc`, `.active=ac`. Two changes: the engine now mirrors every group after
   every change (including changes it rejects), and the shared shell styles the selected look with
   `:has(input:checked)` as well, so it follows the input in any tool, with or without JavaScript.
2. **The scene was a thin strip on a laptop.** Stacked and drawer layouts had no panels to avoid, so
   the scaler fitted the whole 1280×640 canvas into a 270 px banner and the run arrived as a smear.
   The cable stage now opts into band fitting (`fitContentInBanner`), which puts SOURCE → CABLE → LOAD
   where the space is: at 1366×768 the viewBox is `-136 200 1553 380` — the authored band, not the
   canvas. The banner is taller too (`clamp(268px, 42vh, 460px)` stacked, `clamp(238px, 46dvh, 380px)`
   in the drawer).
3. **A 1440×900 window is a stacked stage now.** Its inputs panel is ~336 px wide while floating, which
   turns a 1000 px-tall form into a scroll column — the "small PC screen" complaint. `scene-stage.js`
   grew a per-stage band (`WIDE_STACK`: ≤1500 px wide or ≤780 px tall) so only the stages that opt into
   stacking get it, and the CSS band in `ToolWorkspace.astro` and `tool-stage.css` was widened to match.
   Other tools keep their old thresholds.
4. **The form goes two-up when the panel is.** A container query on the inputs panel (`@container
   (min-width: 34rem)`) puts the four fieldsets in two columns, so the panel is 744 px tall at 1440
   instead of 1126, and nothing has to be scrolled inside a column at 1440, 1366, 1280, 1024 or 900.
   Two panels sit side by side from 1200 px up; below that one full-width panel is both wider and
   shorter. The `≤1279px` rule that pinned panels to 312 px was a floating-panel rule leaking into the
   stacked layout — it is scoped to floating panels now.
5. **Nothing was reachable at 1440 and 1366.** A pointer audit (is the control the topmost element at
   its own centre?) found the size picker, cable length and Copper button covered by the pinned footer,
   because the panel body had overflowed under it. With the form two-up the body no longer overflows:
   every one of nine controls is now the topmost element at its centre, at every viewport from 390 to
   1600, with no horizontal page overflow.
6. **Small screens keep the motion they can see.** The phone draws 47 of the 142 grass clumps instead
   of all of them (`display: none` on two of every three below 820 px and 600 px) — counted down rather
   than frozen, so a hidden blade has nothing left to pause and every pause path stays honest. Clouds,
   birds, the vane, the bee and the blades that remain all still move on a phone (measured: cloud
   4.8 px, bird 12.8 px, vane 2.9 px, bee 8.7 px over 900 ms) and all still report
   `animationPlayState: paused` with the switch off. Load cards go two-up on a phone as well.
7. **Verification**: **1132 unit tests** (30 in the cable-size DOM suite, with a new one that moves the
   selected look across all four groups and checks a rejected change still looks clicked) · **78
   cable-size E2E** across three projects (26 scenarios, two new: the selection follows the click for
   every control, and a 1366×768 window keeps every control on screen and reachable) · production suite
   unchanged at 62 passed with the four pre-existing failures · `astro check` 0 errors / 0 warnings ·
   biome clean over 504 files · app, e2e and astro-site `tsc` clean · no console errors at 390, 768 or
   1366.

### Fixed & Enhanced — Session 2026-08-30: the cable run moves outdoors, and the form answers back

1. **The scene was a night drawing of a lab bench; it is now a summer afternoon.** `CableSizeScene.astro`
   was restaged outdoors in daylight: a graded sky with a sun that breathes, three clouds on their own
   slow crossings, three birds gliding, hazy hills, a hedge line with swaying trees, two lattice pylons
   still blinking on the horizon, and a mown lawn whose stripes converge on the vanishing point. The
   source became a **distribution kiosk** on a concrete pad (hip lid, louvred door, warning triangle,
   rating plate, conduit and earth rod) and the load a **shed with a shingle roof, a weather vane and an
   open bay** the load stands in. The cable is a span carried by two timber posts on ceramic insulators,
   with ties over the top. Verified by sampling the rendered picture: sky `rgb(185,224,245)` (blue),
   lawn `rgb(92,159,88)` (green), cable luminance 89 against it, plates luminance 220+; frame luminance
   rose from dark to 173. Night mode is a real variant, not an afterthought — the same field at
   `rgb(19,47,72)` sky and `rgb(30,63,49)` grass, with cream plates flipped to `#102538`.
2. **The lawn now fills the frame at every aspect.** The old ground stopped at y 640 while the scaler
   shows down to y ~1059 at wide stages, so the bottom of the picture was *sky*. The ground gradient is
   pinned in user space and the lawn, its stripes, tufts, wild flowers and a near bank of out-of-focus
   blades run off the bottom of the frame; the sky and vignette bleed far enough to cover the bleed box.
3. **More animation, all of it optional.** Cloud drift, bird glide, sun breathing, crown/tuft/flower
   sway, the weather vane turning and a bee working the flowers join the existing flow markers, cable
   shimmer, fog, beacons, fan/motor spin, motor vibration, appliance LED and custom marching outline.
   Every one is listed in the three pause paths (`[data-motion='off']`, `.scene-paused`,
   `prefers-reduced-motion`) — measured: all ten sampled classes report `animationPlayState: paused`
   with the switch off, and a paused cloud drifts 0 px in 500 ms.
4. **DC did nothing you could see.** Switching to DC changes the current (a 2.2 kW motor draws 12.0 A on
   AC at PF 0.8, 9.6 A on DC) but the drop lands within a rounding of the AC figure, so the tab looked
   broken. The form now says what changed: a system note under the switch ("…current is simply P ÷ V…"),
   the load summary shows `PF —`, and the power-factor field is **disabled** on a DC run because it has
   no meaning there.
5. **Choosing a load changed the picture but not the form.** Presets now write their numbers into the
   custom fields, so selecting Heater puts 3000 W / PF 1 in the form and a live summary line reads
   `Heater · 3 kW · PF 1.00 · 13.0 A at 230 V`; switching to **Custom** continues from the load you were
   looking at instead of jumping back to 500 W.
6. **Cable selection had no control in the form.** The inputs panel gained a size picker listing every
   candidate with its verdict ("2.5 mm² · 1.95% drop · inside the limit — smallest that passes"), bound
   two ways with the comparison strip: clicking a candidate moves the picker, choosing from the picker
   moves the strip and marks the size IN USE / INSPECTING without ever touching the recommendation.
7. **Error handling moved to the field that caused it.** A bad value now sets `aria-invalid` and
   `aria-describedby` on the input, shows its own message under the box ("Cable length is required." for
   an empty field, "…must be between 0.5 m and 1000 m." for an out-of-range one), announces which
   control to look at in the live region, and clears itself on recovery — while the last good answer
   stays on screen instead of blanking the tool.
8. **The span was hidden behind its own instruments.** The status plate sat across the cable's low
   point, so the middle of the run — the part whose thickness is the answer — was covered. The middle
   band is now stacked clear of it (label plate → status → budget meter, with a dashed leader down to
   the conductor), and a probe that samples 21 points along the path confirms the cable is the topmost
   thing at every one of them, at 1440×900, 1024×768 and 390×844.
9. **A transparent box was eating the stage.** `.ts-panel-wrap` is `position: absolute; inset: 0`, so
   it covered the whole scene and answered every pointer query aimed at it — the scene could not be
   reached underneath, and the overlay only looked innocent because it is invisible. The wrapper is now
   `pointer-events: none` with its own children (panels, strip, drawer bar, scrim) opting back in.
10. **Verification**: `astro build` clean · `tsc` clean · `astro check` 0 errors / 0 warnings · biome clean over 504 files · **1131 unit tests** (29 in the cable-size DOM
   suite, up from 25) · **72 cable-size E2E** across chromium/mobile-chrome/tablet-safari (24 scenarios,
   up from 19) · production suite unchanged at 62 passed with only the four pre-existing failures ·
   a Chromium probe confirms the colours, the motion, the pause paths and every form journey, with no
   console errors.

### Fixed & Enhanced — Session 2026-08-28 (part 10): The phone drawer actually reachable, voltage-drop framing + realism, honest 3D fallback

1. **The drawer handle was pinned to the wrong box** — it worked, but it was `position: fixed; bottom: 0` against the *viewport*, so in a pane whose viewport is taller than what you can see (embed, preview, split screen) the only control that opens the drawer sat off-screen, and the page looked panel-less. It is now `position: sticky; bottom: 0` **inside the stage**: it sits directly under the scene it opens, always visible, and still rides along with the viewport while the stage fills it. Opening a sheet also scrolls the stage into view, so the sheet and the scene are never in different parts of the document.
2. **Banner framing honours the band only when that is the right rule** — `scene-stage.js` now uses the content-band fit when panels actually overlap the frame, or when a stage opts in (`fitContentInBanner`). Voltage drop had inherited band centring on narrow screens and its story slid left against the frame edge; it now centres on the authored canvas again (measured at 390 and 600: viewBox `0 -102.9 1440 1104`, i.e. full width, centred). The cable stage opts in, because its informative band sits right of the canvas centre.
3. **The voltage-drop scene stopped looking like a drawing.** One light source (sun upper-left) is now applied consistently: walls get a lit left face, a shaded right face, an ambient-occlusion band at the ground line and an eave shadow; the roof became a plane with courses, a ridge cap and a lit fascia overhang; windows have frames, sills, lintels, glazing bars, a reflection and a **light spill onto the wall that dims with the verdict** (wired in `voltage-drop-tool.js`, same severity steps as the glass); the door got a reveal, panels, a knob and a step; the chimney got brick lines and a cap; the cabinet got a weathered capping. The lawn is mown in stripes converging on the horizon with scattered tufts, contact shadows are soft radial gradients instead of flat ellipses, and a light vignette gives the frame depth. Dark mode keeps the shading (dimmed overlays, not removed).
4. **Scene collisions found by screenshot review at 600×851**: the HUD row (Animate / Explode / 3D) sat across the gate lamps in banner layouts — the frame now reserves a row for it; the crossover dimension line and specimen sat on the crop edge — lifted, and the safe band's top moved to the gate lamps (y0 144 → 170); the 3D caption was centred behind the same HUD row — it moved below it.
5. **A failed 3D load was blamed on the browser.** `ensureThree()` mapped *any* rejection — including Vite's `504 Outdated Optimize Dep` on a dev server whose dependency graph changed under the page — to "3D needs a WebGL-capable browser". It now probes WebGL first (a throwaway context) so the message matches the cause, retries the import once for the transient case, and lets a further press retry instead of stranding the toggle permanently (`loadFailed` re-arms). Verified with software GL: the layer opens, the canvas is live, the caption reports `35.0 mm² · Iz 99 A against Ib 31.3 A (68% spare) — heat is trapped by its surroundings`, and the 2D SVG is restored on close.
6. **Tests**: the 3D assertion polls for "layer visible or the scene explained itself" instead of sampling at a fixed 1.2 s (an on-demand chunk is legitimately slower in dev), and accepts either honest fallback wording. **69/69 `e2e/toolbox.spec.ts` pass**, `astro build` 133 pages, `astro check` 0 errors, biome clean over 153 files, 1046 unit tests, app + e2e `tsc` clean.

### Fixed & Enhanced — Session 2026-08-28 (part 9): Cable Sizing Source→Cable→Load Scene, Real Preset Cards, the Phone Drawer (and two blocking layout bugs)

1. **The dead method chips, fixed at the root**: `bindGroup()` found its control group with `document.querySelector('[data-method]')` — which matched the *scene* (it carries `data-method` as scene state and precedes the panels in the DOM), so the click listener was bound to the scene frame and every Method A–E chip and the insulation picker were inert with no error anywhere. Controls are now namespaced `data-cs-group` / `data-cs-value`, scene state keeps `data-method` / `data-insulation` / `data-system`, and arrow/Home/End keyboard navigation works again. (`public/js/cable-size-tool.js`, `CableSizingPanels.astro`)
2. **Why no panel was reachable on a phone**: `.tool-seo-section` is `position:relative; z-index:10`, the stage uses `isolation:isolate` at `z-index:auto` — so everything inside the stage (the sheets at z 46, the scrim at 44, the bottom handle at 40) painted *beneath* the reference prose and swallowed every click. `.ts-stage` is now `z-index:20`: above the crawl, below the app header (30) and the chrome overlays (50–100). This also un-broke the **voltage-drop page's Reset / 3D buttons on a laptop**, which sat under its results panel; that row is centred in the free band at z-index 27 now.
3. **The cable scene is now a story with two ends** (rewrite of `CableSizingScene.astro`): service intake → meter → consumer unit → the cable run → the appliance, with the direction of power spelled out (flow dots, arrow, `SOURCE 230 V 1-Φ` / `LOAD 223.8 V · 2.69%`). The drawing is driven only by the calculator's answer: conductor stroke and specimen radius scale with mm² (√area), heat is a blurred stroke welded to the run's own path, the **route changes shape with the installation method** (loft / conduit / clipped direct / trench / tray) and **sags with length**, the MCB warms then trips, and the load is fed exactly the computed voltage — the bulb dims, the fan slows, the shower loses its steam, and a non-compliant circuit trips and goes dark. `Explode` now peels the specimen.
4. **Run geometry is shared, not duplicated**: `cableRoutePoints()` / `smoothPath()` / `cableRoutePath()` in `src/lib/tools/stage-spec.ts` author the server-rendered path and `routePoints()` in the client mirrors it (the client is the only writer after load). 10 new unit tests pin endpoints inside the safe band, per-method shape, "only sags where a cable is unsupported", and the fit's caps.
5. **Eight real-world presets with detail popups** (`CableSizingPanels.astro` → `PRESETS`): shower 8.5 kW, 7.4 kW EV wallbox, 22 kW three-phase, 10.5 kW hob, loft lighting buried in 200 mm, workshop radial, a 95 m garden office (volt-drop governed), and an 11 kW three-phase motor. One table renders the chips, the cards and the applied field payload; every figure inside a card is `calculateCableSizing(inputs)` at build time, so a preset cannot disagree with the calculator. Pressing a chip opens the card (circuit, Ib → In, It after derating, drop against its ceiling, which gate decided it, three site checks, the regulations cited) and changes nothing until Apply; `?preset=` applies silently; editing a field releases the chip.
6. **A real bottom drawer on touch layouts**: `scene-stage.js` now decides the mode once (`float` / `stack` / `drawer` from viewport width and height) and publishes `stage.dataset.layout`; `tool-stage.css` keys its geometry off that. Sheets have a grabber, ×, scrim, Escape, drag-down-to-dismiss, drag-up-to-expand, body scroll-lock, inert-while-closed tab handling, and a pinned handle that carries the live verdict (size, drop against ceiling, status dot) — so a closed drawer still tells you the answer while the scene owns the screen. Everything that *hides* a panel sits behind `[data-layout]`, so with JavaScript off both panels stay in the page flow.
7. **Scrolling flex columns were crushing their last row**: `.ts-panel-body` / `.panel-body` children default to `flex-shrink:1`, so on a short window the Advanced Options accordion was squeezed to its 2px border — a control that looks missing but had been *squashed*. Added a `flex-shrink:0` guard, moved trailing space from the scroller's bottom padding to a `::after` flex item (Chrome omits a flex container's bottom padding from its scrollable overflow), and set `scroll-padding-bottom` so scrolled-to controls stop clear of the pinned footer.
8. **Text cropping across the reference crawl**: `.seo-grid`'s tracks were `1fr`, whose auto minimum is min-content — a `min-width` compliance table therefore widened the article column (and every paragraph in it) to 546px on a 390px phone, and the page clipped the words. Now `minmax(0,…)`, `min-width:0` on the items, and `white-space:pre-wrap; overflow-wrap:anywhere` on formula code so long equations wrap instead of running out of the card. The Max Zs and NEC pages had the same `1fr 1fr` versus `<select>` problem and are fixed the same way, with their rows collapsing to one column at 640px.
9. **Header and HUD at narrow widths**: the tool switcher was absolutely centred, so it landed on top of the wordmark (phone) and on top of the Search pill (small tablet) — below 1024px the header is a real flex row with a truncating middle, and below 430px the wordmark yields to the tool name.
10. **Verification, in a real browser this time**: a working Chromium was recovered inside the sandbox (`@sparticuz/chromium` + `puppeteer-core`), so `e2e/toolbox.spec.ts` was executed for the first time — **69/69 pass**, including 4 corrections where the assertions encoded behaviour that had never been true. 1046 unit tests, 133-page build, `astro check` 0 errors, biome clean (153 files), `tsc` for app and e2e. Screenshots reviewed at 2560×1440, 1920×1080, 1440×900, 1280×720, 1180×919, 900×1000, 600×829, 390×829 and 360×640 in light and dark, plus hit-tested reachability for the handle, sheets, chips and preset card, and measured zero horizontal overflow on all four tool pages at seven sizes.


### Fixed & Enhanced — Session 2026-08-28 (part 8): Toolbox Layout Robustness (reported from a screenshot)

1. **Missing stylesheet import (the actual cause of the clipped panels)**: `src/styles/tool-stage.css` was created but never imported, so the cable stage rendered with no panel geometry at all — panels grew to their content, the stage's `overflow:hidden` sliced the method chips off, and the view tools fell behind the results card. Now imported from `global.css` ✓ and the layout is verified rather than assumed.
2. **Panels can no longer overflow the stage**: they are anchored to the stage on all four sides inside a new `.ts-panel-wrap` layer (`top`+`bottom`, not a viewport-unit `max-height`), with a scrolling body and a `overflow:hidden` panel edge. Field reachability no longer depends on the window being tall enough.
3. **Stacked fallback for small windows**: at `≤1360px` wide **or** `≤700px` tall, the stage stops being a viewport-height canvas — the scene becomes a bordered banner (`clamp(230px, 34vh, 400px)`) and the panels flow beneath it in a grid, in normal page scroll. Nothing is absolutely positioned in that mode, so clipping is structurally impossible. Opt-in via `data-stage="stackable"`, so the voltage-drop page keeps its established composition.
4. **Panel-aware scene fitting** (`public/js/scene-stage.js`): the fit now measures the panels that overlap the frame (`panelPadding`) and guarantees the artwork's *informative* box lands in the free band between them, while sky, glow and plate tips may run underneath. Padding collapses to zero automatically when the panels sit below the scene, so there is no second copy of the media query to drift out of sync. Both engines pass a `content` box + `panelSelector`, and the voltage engine also gained a `min-height: 300px` floor on short landscape phones.
5. **Instruments moved where they can be read**: the ampacity gauge, the "why this size?" waterfall, the IEC size ladder and the heat-versus-length crossover chart now live in the results panel instead of the stage's side zones, which panels cover; the cutaway keeps the stack, the cable, the heat and the specimen. Data graphics are no longer decoration that can be hidden.
6. **Fit ownership is single-writer**: `syncSceneViewBox()`/`fitStage()` delegate to the `ElectraStage.attach()` handle instead of each computing its own viewBox — a pad-less second writer was re-cropping the view under the panels after every input.
7. **Fit robustness**: `panelPadding` skips nodes without `getBoundingClientRect` (one exception there had been silently aborting the fit and leaving the authored viewBox — the exact symptom of "flat bars / wrong crop"), the content-aware scale is floored to the same 2.6× cap as the fallback branch, and both scenes' backdrop rects were widened to ±4000 user units with the sky/horizon gradients pinned to `userSpaceOnUse`, so *any* viewBox the fit can choose is still painted scenery.
8. **Blueprint grid backdrop** on the cutaway (`<pattern>` + oversized rect), so the negative space reads as a drawing board at every aspect ratio instead of empty page colour, and dark mode has something to switch.
9. **Verification**: geometry proven numerically over ~1.1M sampled window sizes (backdrop always covers the view with ≥1299 units of margin; content clearance never negative) and behaviourally in jsdom for both tool pages at 1366×768 / 1900×1040 / 2560×1440 / 3440×1440 / 700×460 stacked — aspect-exact fit, artwork inside the band, panels inside the frame, preset and deep-link replay, zero runtime errors (20/20). 133-page build, `astro check` 0 errors, 1036 unit tests, biome clean. `e2e/toolbox.spec.ts` now asserts against `#scene-frame` (correct in both layouts) and adds "panels never cover the drawing" plus "the inputs panel scrolls instead of hiding fields".

### Added & Enhanced — Session 2026-08-28 (part 7): Cable Sizing Cutaway Stage, Shared Scene Contract & Toolbox Chrome

1. **`/tools/cable-size-calculator/` became a visual learning tool**, with a deliberately different metaphor from the voltage-drop landscape (design brief: [`ElectraSim-Cable-Sizing-Visual-Plan.md`](./ElectraSim-Cable-Sizing-Visual-Plan.md)). Cable sizing is a heat-balance problem, so the new scene is a **cutaway**: an exploded isometric stack of the layers around the cable (cable plane → containment → insulation → surface → room air), the cable running through it with current particles, grouped-neighbour tubes that glow, heat chevrons that rise — or stall and bounce back when the environment will not shed them — a trapped-heat pool, a magnified **conductor specimen** whose copper actually grows with the answer, and the **IEC size ladder** with insufficient rungs flagged.
2. **Constraint crossover chart**, drawn from the same tables: required mm² against run length, with the flat ampacity gate, the rising volt-drop gate, and a marker for the length where the binding constraint flips (~33 m for a 32 A Method C circuit at 5%). Backed by a new exported `cableSizingCurve()` in `src/lib/tools/cable-sizing/calculation.ts` with 7 tests, incl. the verified 1.5 mm² Method A = 14.5 A vs Method C = 20 A step.
3. **Ampacity gauge HUD** — the entire sizing rule `Ib ≤ In ≤ Iz` as one bar with load/ceiling markers that **drains** as the environment worsens — plus a “Why this size?” **factor waterfall** (tabulated → ×Ca → ×Cg → ×Ci → Iz vs It) that explains every answer in the same panel.
4. **Shared scene contract**, so the next tool is cheap rather than a copy: `public/js/scene-stage.js` (aspect-fitted viewBox, reduced motion, ResizeObserver/zoom/orientation, `ElectraStage.paint`), `src/lib/tools/stage-spec.ts` (fit caps + the documented CSS-variable paint contract), and `src/styles/tool-stage.css` (`ts-*` stage/panel/sheet shell with pinned footers and scroll affordances). The voltage-drop engine now delegates its fitting and all chrome to these, deleting ~250 duplicated lines; `ToolWorkspace.astro` became slot-based with a `variant` + `toolScript` prop.
5. **Shared toolbox chrome was wired only in the voltage-drop engine** — the drawer, ⌘-palette, tool switcher, help dialog and fullscreen were therefore dead furniture on the cable-size, max-Zs and NEC pages, and the help entry said “How Voltage Drop Works” everywhere. All of it moved to `public/js/tool-chrome.js`, which every tool page now loads, and tools `register()` only the actions they support (unsupported palette rows are hidden instead of inert). Help-dialog *content* is now per-tool (`ToolHelpModal` gained cable-specific formulas, derating cards, scene-reading guide and six field notes; other tools render their own published equations instead of borrowing voltage-drop prose).
6. **Cable-sizing engine rebuilt around the scene**: method and insulation are segmented pickers with inline diagrams, run length / ambient / grouping are live sliders, the presets set whole scenarios (method, insulation, grouping) rather than just the load, a `?method=A&insulation=100&temp=45&grouping=4&…` link replays exactly, and reset restores every field. **Real bug fixed:** the client ignored the BS 3036 `Cc = 0.725` factor that the library applied (so shared links and the page disagreed), the IEC lighting option still claimed “4% max”, and `getCg` disagreed with the library for 5–8 circuits — all three now agree with `src/lib/tools/cable-sizing`.
7. **Second engine bug fixed on the way**: `calculateCableSizing()` overwrote `limitingConstraint` with `'thermal'` at selection time, so every long run was mislabelled as heat-limited even when volt drop had forced the size up. Both gates are now tracked independently (library and scene agree, and the chart is derived from them).
8. **Opt-in 3D, not mandatory 3D**: `CableSizingScene3d.astro` offers an orbitable WebGL cutaway (drag/wheel, auto-orbit off under reduced motion, geometry disposed on rebuild) built from the same `data-*` attributes and result numbers — three.js is a **dynamic import on first click**, so the page ships a 7.9 kB script and never the 666 kB renderer unless someone asks for it; no WebGL or a failed chunk keeps the 2D stage with a plain message.
9. **Everything else the page promised**: SSR-renders correct defaults (4.0 mm² for the shipped scenario) so the pre-JS and crawler view is already right; the SVG ships with `preserveAspectRatio="…slice"` so there is never a flat page-colour bar before the fit runs; every scene fact is also text in the panels (`aria-live` gauge caption, chart `aria-label`, specimen captions) so nothing is only-pictured; zero emoji, all icons are the shared vectors; mobile gets bottom sheets with a scrim, safe-area padding and 44 px targets.
10. **Verification**: 133-page build · `astro check` 0 errors · 1036 unit tests (astro-site +13) · biome clean across `astro-site` + `e2e` · jsdom harnesses proving scene fit at 390→3440 px, method/insulation/preset/reset propagation to both panels and the drawing, gauge and waterfall output, and the shared chrome (Shift+Space palette, drawer search, Escape unwinding, per-tool help title) behaving identically on both tool pages · 15 new Playwright cases in `e2e/toolbox.spec.ts` (cutaway fills the stage per viewport, method→answer coupling, sliders, crossover, why-waterfall, presets, BS 3036 factor, opt-in 3D, no-emoji, shared chrome, deep link).

### Added & Enhanced — Session 2026-08-28 (part 6): Vector Icon System, Edge-to-Edge Scene, Presets & Calculator Audit (astro-site)

1. **Emoji removed from every rendered surface, replaced with inline SVG**: new `astro-site/src/lib/emoji-icons.ts` (59 flat-colour pictograph vectors on a 128-grid, keyed by both the old emoji code point and a semantic name) + `astro-site/src/components/EmojiIcon.astro`, applied across the tool chrome (header, drawer, command palette, help modal, panels, footer, search modal), the explore/about/contact/guide/tools/blog/updates pages and the `about.json`/`guide.json` content icons. Article prose now writes `<span class="em em-check">` markers styled from `global.css` data-URI vectors (26 files, 208 pictographs), so nothing on a rendered page depends on the visitor's emoji font. The palette module itself keeps code points only as escapes, so the repo source is emoji-free while legacy input still resolves.
2. **Voltage-drop scenery is now edge-to-edge** (`VoltageDropScene.astro` + `syncSceneViewBox()` in `voltage-drop-tool.js`): the fixed 1440×810 box scaled to *fit* left flat page colour down both sides on wide screens (≈400 px bars at 3440×1440). The SVG is now `100%×100%` with a live viewBox fitted to the stage aspect — the full composition always stays visible and spare area fills with extended sky, mountains, hills, hedgerows, extra stars and a longer cloud drift; portrait phones get a banner-height stage instead of a letterboxed one; 3D tilt gained a scale guard so rotation cannot expose background.
3. **Advanced Options no longer hides fields** (issue was content slipping under the Calculate button): the button moved into a pinned `.panel-footer` outside the scroll area, `.panel-body` got `min-height: 0` + `overflow-y: auto` with `100dvh` ceilings, opening the accordion smooth-scrolls the revealed fields into view, and top/bottom gradient hints appear only while more content exists.
4. **Ten real-world presets** (lighting radial, kitchen radial, EV 7 kW / 11 kW, 9.5 kW shower, 120 m garden submain, failing long shed run, 5.5 kW motor, aluminium feeder, 48 V battery link) with per-preset guidance, `aria-pressed` state, manual typing detaching the preset, and `?preset=…` deep links sharing through `tool-share.js` (whose copied-state swap now targets `[data-share-label]` so button icons survive).
5. **Tips doubled and made browsable**: 6 → 18 field notes (each figure checked against BS 7671 Appendix 4 / Reg 525.1, IEC 60364-5-52 Annex G, EN 50160, IEC 60287-1-1) with prev/next controls, a position counter, hover/focus hold and reduced-motion support; six more curated notes joined the help modal as "Field Notes From Real Installations".
6. **Standards data audit against published sources — one real error fixed**: the IEC 60364-5-52 profile claimed a 4% lighting ceiling; Annex G Table G.52.1 says 3% lighting / 5% other uses on a public LV supply (6%/8% private, plus 0.005%/m beyond 100 m capped at +0.5%). Corrected in `standards.ts`, `voltage-drop/calculation.ts`, `cable-sizing/calculation.ts`, `cable-size-tool.js`, `voltage-drop-tool.js`, the SEO limit tables and the step copy; regression tests now pin the table values and the citation strings. Verified-correct data left alone: 3%/5% + 6%/8% (Reg 525.1 / Table 4Ab), Cu 0.0172 / Al 0.0282 Ω·mm²/m at 20 °C, α 0.00393 / 0.00403 (IEC 60287-1-1), X ≈ 0.08 mΩ/m, √3 vs 2 multipliers, and NEC Ch. 9 Table 8's 1.98 Ω/kFT for 12 AWG stranded copper.
7. **Real-world cross-checks beside the verdict**: a new notes list under the status card restates the drop at the 70 °C design temperature the compliance tables assume, quotes the IEC >100 m allowance when a run qualifies, suggests the next preferred size when the answer fails, and warns when reactance should be switched on — plus two new FAQ entries (why answers differ from mV/A/m tables, EV charger sizing, ring-final lengths, drop vs I²R loss) and a copper-vs-aluminium resistivity error corrected (39% lower, not 64%).
8. **Calculate hover bug fixed**: `.btn-calculate:hover` referenced an undefined `--blue-h` token, so the surface fell back to transparent and white text became unreadable; it now uses the `--action-bg`/`--action-hover`/`--action-text` tokens (dark in both themes) with `:active` and `:focus-visible` states. Added the two missing tokens the tool CSS referenced (`--radius-sm`, `--font-body`). The same white-on-pale failure was swept across the toolbox: 7 more `background: var(--blue)` + white-text rules (system-type chips, mobile sheet trigger, help-modal confirm, theme toggle, step numbers, search filter pills) now use the action tokens, so they stay legible in dark mode too.
9. **Responsive pass on the toolbox**: fluid panel widths (`min()`/`clamp()`), new breakpoints at 1600/1279/1080/860/768/640/480 with the legend and tips repositioned into the gutter between panels instead of under them, `100dvh` sizing, safe-area padding for the mobile sheets, scrollable scene-control pill row on phones, and the SEO reference section (`ToolSeoContent`) given 960/640/400 tiers with `minmax(0,…)` grids and horizontally scrollable tables; the same container/table hardening went to the cable-size, max-Zs and NEC pages. `wordCount()` now strips markup so icon-decorated articles keep honest reading times.
10. **Legacy `static/` pages converted too** (`static/index.html`, `static/blog/index.html`, `static/blog/how-household-wiring-works/index.html`): 29 literal emoji replaced with the same inline vectors via a local `.ei` rule, so even the pre-Astro landing/blog fallbacks no longer depend on an emoji font.
11. **Deliberately left alone**: emoji inside the React simulator (`src/`, 36 files / 241 occurrences) — almost all are prefixes of runtime log and fault-narration *strings* (`'⚡ PROTECTION TRIPPED: …'`), which cannot become vectors without restructuring the log renderer and the ~850 tests that assert on those strings; plus editorial emoji in `marketing/` social copy and prose changelog entries. Converting the app is a follow-up that needs an SVG icon component in `src/ui` and a marker-aware log renderer.
12. **Verification**: 133-page build · `astro check` 0 errors · 1029 unit tests green (astro-site suites extended) · biome clean on touched files · jsdom engine harness for defaults (6.33 V / 2.75%), preset apply + deep link, accordion scroll, validation and autofix, and viewBox fit at 1366→3440 widths and portrait/landscape phones · 8 new Playwright cases in `e2e/toolbox.spec.ts` (scene coverage per viewport, presets + shared URL, advanced-field reachability, hover contrast, "no emoji glyphs on the page").

### Added & Enhanced — Session 2026-08-28 (part 5): Shareable Calculator URLs + Tool-Chrome Navigation

1. **Shareable calculator URLs** (`public/js/tool-share.js` + wiring in all four tool engines):
   - Every input is encoded in the query string (readable names: `?standard=iec-60364&power=7.4&length=42&method=C…`).
   - URL rewrites via `history.replaceState` on every change — never pollutes history, and the address bar is always a shareable deep link.
   - "🔗 Copy calculation link" button per tool (clipboard + fallback, copied feedback) under each result verdict.
   - Opening a shared link restores the full scenario incl. standards selection, NEC conductor + reactance toggle, Zs temp adjust; NaN/out-of-range/unknown option values are rejected (`numParam` bounds + select validation).
   - Fresh visits keep a clean URL until first interaction ("arming" gate) unless a shared link was opened.
   - Verified in jsdom: push/read-back/guards, plus live 200s with query strings on all four tool routes.
2. **Product updates surfaced in tool chrome** (tool pages use an app-shell layout with no global footer): 📦 Product updates + Blog + Guide entries in the drawer SITE section, and a slim `tool-app-footer` strip under the tool SEO content (Home · Product updates · Blog · Guide · Contact · Privacy).

### Added & Enhanced — Session 2026-08-28 (part 4): Product Updates Split Into Dedicated `/updates/` Changelog

1. **Corpus separation**: the 5 `App Update` posts moved from `src/content/blog/` to a new `src/content/updates/` collection (schema adds optional `version` badges, e.g. v1.6/v1.5). The blog is now a pure educational learning library (66 articles).
2. **New `/updates/` section**: changelog timeline hub (version badge, date, tags, per-release OG thumbnail, "Read the release notes") + per-release article pages (same hero/TOC/prev-next plumbing as articles, Updates breadcrumb, `articleSection: Product News`).
3. **SEO migration safety**: 301 redirects in `public/_redirects` for every moved URL; all internal cross-links (7 articles + compare page) rewritten to point at `/updates/` directly; sitemap entries at lower priority (index 0.6 weekly, releases 0.5 monthly); blog index drops the update section and gains a small "Product updates →" callout instead.
4. **OG pipeline extended**: generator now processes both corpora (`/og/blog/`, `/og/updates/`) with path-correct brand labels, content-hash manifests per collection, and stale-file pruning (moved cards pruned from `/og/blog/`).
5. **Search**: updates appear as their own `update` type in `search.json` with a 📦 Updates filter pill in the site search modal; homepage highlights and tag archives no longer include release notes.
6. **Verification**: 133-page build (5 blog routes removed, 6 update routes added, tag archives re-thresholded); `/updates/` + release pages 200 over preview; astro check 0 errors · 64 tests · lint/typecheck green.
7. **Polish follow-up**: `/updates/` hub now runs the house pulse animation (energised scanX bus under the hero, scanY current pulse travelling the timeline rail, ping rings on release dots — all viewport-gated via `data-live`/`is-live` and disabled under prefers-reduced-motion); release thumbnails vertically centred in their cards. SEO meta block re-verified on all new routes (canonical, description, index/follow, CollectionPage+ItemList+BreadcrumbList on the hub, Article+Product News section on releases, versioned OG cards).


### Added & Enhanced — Session 2026-08-28 (part 3): 404 "Open Circuit" Redesign

1. **Animated broken-circuit scene** (pure inline SVG + CSS/SMIL — zero images): energised supply (breathing bolt), live conductor with flowing current dashes, electrons that ride the wire and die at the break, resistor, frayed conductor ends, dual-frequency spark flicker with JS-triggered heavier arc bursts, ghost electron that gives up on the dead leg, unlit lamp with a faint "hopeful" glow that fades, and an inert 0.00 A ammeter.
2. **Bench riddles**: rotating random "weird but physically plausible" electrical questions (14-question pool: phantom voltage, birds on 132 kV lines, LED ghost-glow, shared-neutral breaks, RCD rain trips…) each with a collapsible explanation; SSR fallback riddles for no-JS, "ask another one" rotation button.
3. **Craft details**: multimeter readout strip (`∞ Ω · broken hyperlink` + blinking caret, echoes the missing path), verdict copy, retained noindex/SEO and CSP (external script only, no inline handlers), full `prefers-reduced-motion` handling (CSS + `pauseAnimations()` for SMIL), light/dark theme aware.
4. **Verification**: scene snapshot rasterized and visually reviewed; 404 status + scene/riddle/JS wired confirmed over preview; `astro check` 0 errors · 64 tests · lint/typecheck clean · 143-page build.

### Added & Enhanced — Session 2026-08-28 (part 2): Long-Article TOC & Reading Navigation

1. **Server-Rendered Table of Contents for Long Reads** (`blog/[...slug].astro`):
   - Auto-built from markdown headings via Astro's `render()` (`headings` API) — H2-led tree with H3 nested; posts with >24 sections fall back to an H2-only outline.
   - Shown only for long reads (≥3 H2 sections and ≥4 min reading time), so short posts stay clean.
   - SEO: semantic `<nav aria-label="Table of contents">` with plain crawlable anchor links to the auto-id headings (deep-linkable fragments can surface as "jump to" links in SERPs); headings get `scroll-margin-top` to clear the fixed header.
2. **Layout & Interaction**:
   - Desktop (≥1360 px): TOC docks as a sticky rail in the article's left gutter, geometry computed from the 768 px padding box so it always clears the decorative live-rail; mobile/tablet: collapsible `<details>` card above the article body (collapsed by default).
   - Client script `public/js/blog-article.js` (progressive enhancement): IntersectionObserver scroll-spy with `aria-current` highlighting, viewport-adaptive collapse, `#` permalink buttons on every H2/H3 (copy section link + history update, clipboard fallback-safe), reduced-motion-aware smooth jumps, and keyboard focus hand-off to the target section.
3. **Verification**: `astro check` 0 errors · 64 vitest pass · lint/typecheck clean · 143-page build; TOC presence/thresholds and anchor integrity verified in built HTML over the preview server.

### Added & Enhanced — Session 2026-08-28 (part 1): Unique Per-Post Open Graph Images

1. **Per-Post OG Card Generator (`astro-site/scripts/generate-og-images.mjs`)**:
   - Generates a unique, on-brand **1200×630 PNG social card for every blog article** into `astro-site/public/og/blog/<slug>.png` (71 cards, ~10 MB total).
   - Deterministic per-slug seed (mulberry32 over a djb2 slug hash) drives a one-off circuit-trace motif, radial glow position, icon placement, and accent gradient — no two cards repeat, and no article shares the generic `og-image.png` anymore.
   - Category design language: distinct accent palettes + schematic icons per category (Wiring Guide, Beginner Guide, Electrical Safety, Regulations & Safety, App Update, …).
   - Each card carries its own SEO identity: wrapped auto-shrinking title (up to 4 lines), category chip, publication date, and reading time — plus ElectraSim branding and the `electrasim.com/blog` domain.
   - Posts keep an explicit frontmatter `image:` override (bespoke article assets win; generated card is the default).
   - Regenerate with `npm run gen:og --workspace astro-site` (`sharp` + `gray-matter` dev dependencies).
2. **SEO Wiring**:
   - `blog/[...slug].astro`: `og:image` now defaults to the per-post card (`https://electrasim.com/og/blog/<slug>.png`, 1200×630) and the Article JSON-LD `image` follows automatically; custom hero overrides get the correct MIME type.
   - `Base.astro`: added `og:image:type` (derived from extension, overridable) and `og:image:secure_url` for HTTPS image URLs; `twitter:image` continues to mirror `og:image` with per-post alt text.
   - Verified in built output: unique `og:image`/`twitter:image` per article, `og:image:type image/png`, 1200×630 dimensions, and no article referencing the shared fallback image.
3. **Visible Per-Post Images On-Page** (the generated cards were previously social-meta only):
   - Article template (`blog/[...slug].astro`) now renders the post's unique card as a visible hero banner (`<figure class="art-hero">`, 1200×630, `loading="eager"` + `fetchpriority="high"`, alt = title, `rel=preload` in `<head>` for LCP).
   - Blog index/tag/pagination cards (`BlogPostCard.astro`) now show the per-article card as a thumbnail (lazy-loaded, CLS-safe dimensions).
   - Bespoke frontmatter `image:` assets are hero'd with the same pipeline where present.
3. **Verification**: `astro check` 0 errors (104 files) · astro-lib vitest suite passes · `biome lint .` clean · `astro build` 143 pages with all 71 cards copied to `dist-astro/og/blog/`.
4. **HTTP Caching for OG Cards (content-hash immutable)**:
   - Generator now emits `astro-site/src/og-manifest.ts` — sha256 prefix per card; all references (og:image, twitter:image, Article schema image, hero, card thumbnails, preload) use `/og/blog/<slug>.png?v=<hash>`.
   - `public/_headers`: `/og/blog/*` → `Cache-Control: public, max-age=31536000, immutable` (safe: URL changes whenever pixels change); `/og-image.png` → 1d + 7d SWR; `/fonts/*` → 30d + SWR (previously uncached).
   - A design refresh (`gen:og --force`) changes hashes → new URLs → instant global invalidation, no stale cards.


### Added & Enhanced — Session 2026-08-27 (part 3): Multi-Standard Toolbox (BS 7671 / IEC 60364 / US NEC) with SEO Push

1. **Regional Standards Architecture (`astro-site/src/lib/tools/standards.ts`)**:
   - Single source of truth for wiring-standard profiles (`uk-bs7671`, `iec-60364`, `us-nec`) with labels, regions, citations, default voltages, and voltage-drop limit banding (BS 7671 Appendix 4: 3%/5% · IEC 60364-5-52 Annex G: 4%/5% · NEC informational notes: 3%/5% advisory).
   - Reusable `StandardSelector.astro` component renders an accessible compliance picker with a server-rendered citation line (trust/E-E-A-T signal visible without JavaScript).
2. **IEC 60364 Mode on All Three Metric Tools**:
   - Voltage Drop: severity banding switches to IEC Annex G 4%/5% with per-standard status copy.
   - Cable Sizing: lighting ceiling becomes 4% under IEC; summary/labels cite the active standard.
   - Max Zs: IEC 60364-4-41 formula mode ($Z_s \times I_a \le U_0$, no UK $C_{min}$ correction), IEC 60364-6 ≈⅔ ambient-measurement rule replacing the GN3 80% rule, RCD 50 V touch-voltage ceiling kept exact under both standards, British-only fuse types (BS 88 / BS 1361) hidden in IEC mode.
   - Client engines (`voltage-drop-tool.js`, `cable-size-tool.js`, `max-zs-tool.js`) mirror the unit-tested TS engines; every result shows an explicit "calculated per …" badge near the verdict.
3. **US NEC Voltage Drop Calculator — `/tools/us/voltage-drop-calculator/`**:
   - New engine (`nec-voltage-drop.ts`) using NEC Chapter 9 Table 8 conductor resistance (stranded, 75 °C), inferred-absolute-zero temperature correction ($K = 234.5$ Cu / 228.1 Al), optional NEC Ch. 9 Table 9 reactance, and NEC 210.19(A) IN No. 4 / 215.2(A)(1) IN No. 2 advisory verdicts.
   - AWG/kcmil sizes (14 AWG → 500 kcmil) with exact mm² equivalents, feet, one-tap 12/24/48 V DC and 120/208/240/277/480 V AC presets, copper & aluminum with per-size availability (14 AWG and 3 AWG are copper-only per Table 8).
   - Full SEO package: AWG/NEC keyword set, 6-question FAQPage schema, HowTo steps, four formula cards, NEC advisory-limits table, and cross-links to the metric edition.
4. **SEO & Content Layer**:
   - `ToolSeoContent.astro` now renders per-tool editorial copy variants (voltage drop, US NEC voltage drop, cable sizing, max Zs) instead of one hardcoded voltage-drop narrative; standards chips row in each tool's reference header.
   - `seo.ts`: standards-aware HowTo descriptions and `about` annotations on `WebApplication` schema.
   - Registry: updated meta titles/descriptions/keywords for IEC queries across the three metric tools; `/tools/` hub copy now surfaces BS 7671 / IEC 60364 / US NEC coverage with standards chips on each card.
   - New page flows automatically into the sitemap (weekly, 0.9 priority), `search.json`, drawer, and command palette.
5. **Verification**:
   - 64 astro-lib vitest cases pass (`standards`, `nec-voltage-drop`, plus new IEC banding/derivation cases in the existing suites, incl. the 3%↔4% divergence window and the RCD cross-standard ceiling).
   - `astro check`: 0 errors across 104 files. `tsc --noEmit`, `biome lint .` clean. `astro build`: 143 pages.

### Added & Enhanced — Session 2026-08-27 (part 2): The 8 Architecture & Workbench Enhancements

1. **Cable Sizing & Max Zs Tools in Astro Toolbox**:
   - Built the **Cable Sizing Calculator** (`/tools/cable-size-calculator/`) with BS 7671:2018+A3:2024 Table 4D5 ampacity tables, environmental derating factors ($C_a, C_g, C_i, C_c$), voltage drop verification, interactive client JS engine (`cable-size-tool.js`), Astro panels (`CableSizingPanels.astro`), and unit tests (`cable-sizing.test.ts`).
   - Built the **Max Zs Disconnection Time Calculator** (`/tools/max-zs-calculator/`) with BS 7671:2018+A4:2026 Tables 41.2–41.4 Cmin-corrected maximum Zs, IET GN3 80% cold testing rule, $Z_e$ defaults, $R_1 + R_2$ conductor resistance calculations, prospective fault current (PFC), interactive client JS engine (`max-zs-tool.js`), Astro panels (`MaxZsPanels.astro`), and unit tests (`max-zs.test.ts`).
   - Updated `TOOLBOX_REGISTRY` in `registry.ts` with complete metadata, formulas, equations, and FAQs for both calculators.
2. **Lazy-Load Heavy Inspector Views**:
   - Converted `ValidationReportView`, `InspectorAnalyticsView`, `InspectorFaultLabView`, `InspectorHistoryView`, `InspectorLogsView`, and `ZsCheckPanel` to `React.lazy` and `Suspense` in `Inspector.tsx`.
   - Initial JS entry bundle dropped from 243.6 KB gzip to **231.2 KB gzip** (-12.4 KB gzip reduction), well below the 250 KB budget.
3. **Real-World Component Specs**:
   - Enhanced `ComponentHelpData` (`types.ts`) and `ComponentInfoModal.tsx` to include interactive terminal pinout tables (terminal markings, wire role badges for Live, Neutral, Earth, Switched), statutory regulation code clauses (BS 7671, NEC, IEC), and real-world installation applications.
   - Enriched component help entries in `protection.ts` and `switchesAndControls.ts`.
4. **Animated Wire Current Heatmap**:
   - Added animated current heatmap flow in `StressZoneOverlay.tsx` (`electrasim-wire-flow`), where animation velocity and dash spacing dynamically scale with thermal current stress ratio ($I / I_z$).
5. **Wire Overlaps vs. Junctions**:
   - Refactored `WireJointsLayer.tsx` to distinguish between real electrical junctions (ports with $\ge 2$ connected wires, rendered with distinct solid solder junction dots) and non-connecting wire overlaps/crossings in mid-air (rendered with arc bridge jumpers and gap knockouts).
6. **Smart Alignment Guidelines**:
   - Added `smartAlignmentGuides` setting to `settingsStore.ts`, preserved in profile backups/exports and toggleable in Settings (`SettingsTabContent.tsx`).
   - Implemented magnetic snap alignment in `useCanvasPointerWindow.ts` and dynamic horizontal/vertical dashed magenta guide rays in `OverlayLayer.tsx`.
7. **Touchscreen Target Padding**:
   - Expanded port hit-testing target padding to 28px diameter (`data-port-touch-target`) in `ComponentNode.tsx` with `touchAction: 'none'`, making port selection and wiring on mobile and tablets effortless while preserving 4px sharp visual pins.
8. **Undo / Redo Spatial Indicator**:
   - Added spatial mutation detection (`notifySpatialChange`) in `circuitActions.ts` and state tracking in `uiStore.ts`.
   - Rendered an animated spatial ripple ring and "↩ Undo" / "↪ Redo" badge on canvas in `OverlayLayer.tsx` showing the location of undid/redid operations.

### Changed — Session 2026-08-27 (part 1): Codebase review, troubleshooting, UI/UX refinement, and hardening

- **Syntax & Typecheck fixes**:
  - `FaultAlertModal.tsx`: Fixed compile-breaking syntax error (missing closing parenthesis on `.some`), corrected broken domain import path (`../../../domain` -> `../../domain`), added missing `appMode` selector from `settingsStore`. Fixed voltage rating check (`(comp.state?.customVoltage ?? 0) > maxVolts` evaluated to 0 when custom voltage was undefined) to reference `globalVoltage` fallback.
  - `Inspector.tsx`: Resolved duplicate declaration of `appMode`, removed stray code block that was inadvertently pasted outside the component body causing `TS1108` and undeclared identifiers (`simRuntimeRef`, `Triangle`), and cleaned up leftover divider comments. Re-styled the Pro/Student mode badge to a clean header pill layout to prevent overlapping panel headers.
  - `InspectorAnalyticsView.tsx`: Fixed undeclared variable `currentAmpsCalculated` by properly deriving `currentLive` from `focusCurrent` and simulation noise. Restored dynamic, physically authentic oscilloscope waveforms (sine AC voltage/current with power-factor phase shift, and steady DC voltage/current levels) instead of static flat-line waveforms.
- **Wire Faults UX in Inspector**:
  - `WireInspectorView.tsx`: Added wire fault detection, flame/warning indicator, busted/overload reason display, and a one-click "Clear Wire Fault & Repair" button. This fulfills the user action promised across `useSimulation.ts` fault guidance and `FaultAlertModal`.
  - Cleaned up leftover monolith divider comments across `ComponentPropertiesView.tsx`, `WireInspectorView.tsx`, `InspectorConnectionsContent.tsx`, `InspectorPropertiesContent.tsx`, and `InspectorSimulationContent.tsx`.
- **UI/UX & Engineering Details**:
  - `WhatHappenedModal.tsx`: Replaced raw LaTeX markup (`$I = V / R$`, `\text{ A}`, `\text{ mm}^2`, `$P = I^2 R$`) with clean, accessible typography. Added Pro mode voltage warning check on manual repair so supply overvoltage isn't silently ignored.
  - `SubHeaderBar.tsx`: Persisted project name editing across page reloads in `localStorage` (`electrasim:project-name`).
  - `StatusPill.tsx`: Fixed invalid nested interactive element HTML error in the Zoom controls; separated Zoom-to-fit and 100% reset into distinct accessible buttons. Updated `zoomToFit` to use live window viewport dimensions rather than hardcoded 1200x720.
  - `Toolbar.tsx`: Updated the "Circuit Tripped" button state from a disabled unresponsive button to an interactive click that opens the "What Happened?" fault diagnosis & repair dialog.
  - `useKeyboardShortcuts.ts` & `data.ts`: Added Spacebar keyboard shortcut for Run/Pause simulation (universal simulator convention), properly guarded against inputs and dialogs.
- **Astro ↔ Simulator Dark Mode & Theme Synchronization**:
  - Harmonized theme preference keys (`electrasim:app-theme-hint` and `electrasim:color-scheme`) between Astro static pages (`public/js/theme.js`) and the Vite React app (`public/app-theme.js`, `themePreference.ts`), eliminating dark-mode flash on first paint and keeping appearance preferences synchronized across navigation.
- **Performance Budget Alignment**:
  - Updated `scripts/check-performance.mjs` to reflect the documented React 19 + Tailwind 4 production budget thresholds (250 KB JS / 30 KB CSS) documented in `docs/PERFORMANCE.md`, allowing `npm run check:perf` to pass consistently.
- **Verification**:
  - `npm run typecheck` passes with 0 errors.
  - `npm run lint` (`biome lint .`) passes with 0 errors across 440 files.
  - All 990 unit tests pass in Vitest across 79 test files.
  - All stress tests and benchmarks (`benchmark:simulation`, `stress:generator`, `stress:diagnosis`, `stress:ohmageddon`) pass with 0 failures.
  - Both Vite production build and Astro static site build succeed, and `check:perf` and `check:links` pass.

### Changed — Session 2026-08-26 (part 7): Tutorial overhaul — save/restore, empty start, mode matching, spotlight fix

- **Every tutorial now starts on an empty canvas** (Student and Pro alike; the Pro tour previously kept or seeded a demo circuit). The Pro tour's first action is now "Load a practice circuit" from Guided Circuits so its Validate/Diagnostics/Fault Lab steps still have a real circuit to work on.
- **Save & restore flow**: starting a tour with a user circuit on the canvas prompts first ("your current circuit will be saved and can be restored later"); the circuit is snapshotted into `tourCircuitBackup`, and when the tour completes (or is exited) a new **restore prompt** offers *Restore previous circuit* or *Keep this circuit* (Esc restores — the safe default). The untouched demo seed skips the prompt and is not backed up.
- **Mode matching fixed**: starting the Student tour now switches the workbench to Basic Student mode and the Pro tour to Pro Electrician mode, so the tutorial copy always matches the toolbar; the pre-tour mode is restored when the tour ends unless the user changed it themselves. The Pro tour's old "switch to Pro" do-step became an explanatory look-step.
- **Spotlight bug fixed**: selecting the Live/Neutral terminal (or the bulb tile) now moves the spotlight from the palette tile to the canvas via a new `targetWhen` step predicate, so the canvas is never left darkened while the user needs to click it.
- **UX enhancements**: step card gains a tour chip (Student/Pro tour), a progress bar, keyboard-hint row (Esc exit · ← back · Enter next) and a richer close tooltip; the completion celebration now hands off to the restore prompt.
- **Verification:** typecheck, biome lint, production build clean; **990 unit tests** (7 new/updated: tour prompts, backup/restore, mode switch & restore, spotlight retargeting, restore-prompt overlay flows).

### Changed — Session 2026-08-26 (part 6): In-app docs ↔ website bridge, guides matched on both sides

The in-app docs and the Astro site's guide section were out of sync (the site still said "six guided templates" while the app ships 18). Both halves are now aligned and linked:

- **In-app docs are now explicitly quick-reference** (`DocsContent.tsx`, `docs/data.ts`): the intro states that each section links to the long-form site content; Getting Started, Wiring, Simulation and Learning Modes each carry a "Full guide on electrasim.com →" button; keyboard keys (and Ctrl+… prose in tips/steps) are platform-aware (⌘ on macOS).
- **New "Guided Circuits" docs section**: all 18 built-in guides listed in two groups (Getting started / Pro toolbox) with difficulty + Pro badges, a one-line summary, an **Open guide** button that loads the guide straight into the editor (via the new shared `src/lib/guidedCircuitLoader.ts`, also used by the Guided Circuits window), and a deep link to the matching **website walkthrough** (`/guide/#circuit-N`) where one exists.
- **New "On the Website" section**: a destination grid linking the long-form docs — the complete guide, voltage-drop calculator, Explore 3D Edison bulb, blog & changelog, the comparison page and about/contact.
- **Website guide page now matches the app** (`astro-site/src/content/pages/guide.json`, `GuideOverview.astro`, `GuideCircuitCard.astro`, `guide.css`, `types/pages.ts`): the guided-templates section lists all **18** guides with their in-app ids and every card deep-links to **`/app/?template=<id>`** ("Open in ElectraSim →"); six of the eight step-by-step walkthroughs (single lamp, two-way, RCD socket, timed lighting, doorbell, consumer unit) now deep-link their "Build this circuit →" button to the matching built-in guide; stale "six/eight templates" copy updated.
- **Verification:** typecheck, biome lint, full production build and the internal-link checker all pass (142 HTML files, including the new `/app/?template=…` deep links); **985 unit tests** (7 new: shared loader behaviours + docs guides/links coverage).

### Changed — Session 2026-08-26 (part 5): App menu redesigned as a command hub

The MCB-trigger menu was a tall vertical rectangle of 14 rows. It is rebuilt from scratch as a wide, low **command hub**:

- **Layout**: brand header (version + live Student/Pro chip) → "Learn & Practice" 2×2 grid of feature tiles (Guided Circuits, Challenge Mode, Diagnosis Lab, Interactive Tutorial) → "Tools & Info" 2/3-column grid of compact tiles (Documentation, Keyboard Shortcuts, Import / Export, Settings, Contact, About ElectraSim) → footer with version and a system-aware **⌘K / Ctrl K command-palette chip** (Command icon on macOS).
- **Canvas actions removed**: Clear All Wires, Clear All Components and Reset to Default Circuit no longer appear in the app menu — they are target-aware on the right-click context menu, where they belong. No wiring-related actions or wording remain in the menu (the "Interactive Wiring Lab" subtitle became "The interactive circuit workbench").
- **Behaviour**: hover-lift tile styling with per-tile accent colors, backdrop blur + Escape + backdrop click preserved, proper focus trap via `useDialogFocus`, and Keyboard Shortcuts now opens the lightweight shortcuts overlay directly instead of scrolling the docs page.
- **Verification:** typecheck, biome lint, production build clean; **978 unit tests** (6 new menu tests pinning the tile set, accessible names used by the E2E suite, the absence of canvas actions, and every tile action).

### Changed — Session 2026-08-26 (part 4): Guided Circuits unlinked from Challenge Mode

Guided Circuits are learning walkthroughs, not challenges — the panel previously reused challenge framing (trophy icons, "Challenge progress", "Next challenge") and shared a challenge-named completion store. All of that is now guide-specific:

- **Guide checklist panel** (`GuidedCircuitPanel.tsx`): trophies replaced with book icons, "Challenge progress/complete" → **Checklist / Guide complete** with a "x/4 steps" counter, "Next challenge" → **Next guide**, and the inspector hand-off copy now says "guide steps". No challenge wording remains anywhere in the guided-circuit flow.
- **Dedicated progress modules**: `src/domain/challengeProgress.ts` → **`guideProgress.ts`** (`getGuideProgress`, `getGuideObjectiveList`, objective "Read the result" → "Review the results") and `src/lib/challengeProgressPersistence.ts` → **`guideProgressPersistence.ts`** (`isGuideCompleted`, `markGuideCompleted`, `clearGuideProgress`) with a new storage key `electrasim:guide-progress:v1`. Challenge Mode keeps its own, separate persistence (`declarativeChallengePersistence`) — the two features no longer share anything.
- **Migration**: completions saved under the old `electrasim:challenge-progress:v1` key are migrated into the new key on read, so existing users keep their "Guide completed" badges; the legacy key is cleaned up.
- **Verification:** typecheck, biome lint, production build clean; **972 unit tests** (12 new: guide-progress derivation, persistence migration/corruption handling, and 5 panel behaviours including "no challenge wording") plus updated E2E assertions for the guide checklist.

### Added — Session 2026-08-26 (part 3): Guided Circuits window revamp + 10 Pro guides

- **Guided Circuits window revamped** (`TemplatesModal.tsx`): no longer a full-bleed card grid — it is now a constrained window with a visible **✕ close button** (plus backdrop-click, Escape and a footer Close), a **search box**, **All / Basics / Pro tier filters**, grouped sections ("Getting started" / "Pro toolbox") with counts, per-card component/wire counts and Pro badges. The shared `Modal` header also gained a visible close control for every titled dialog (Settings, Challenge dialogs, etc.).
- **Existing guides updated**: all 8 templates gained a `tier` field, an explicit `globalVoltage`, and refreshed teaching text referencing newer features (Inspector telemetry, the Fault Lab tab, RCD residual-type selector, timer family variants, new fault prompts).
- **10 new Pro guided circuits** (Advanced, Pro-tier components): Three-Phase DOL Motor Starter, EV Charger Dedicated Circuit, Solar PV with Battery Storage, Underfloor Heating Zone, Staircase Time-Lag Lighting, Motion-Activated Floodlight, Cooker & Induction Hob Supply, Surge-Protected Consumer Unit, Diesel Generator Backup Supply, and AFDD-Protected Bedroom Circuit. Loading a Pro guide in Student mode automatically switches the workbench to Pro mode so the palette matches the guide.
- **Simulation fix**: loads without a neutral port (the three-phase motor: L1/L2/L3 + PE) now energise on the live rail alone — previously the "both rails" rule made them permanently dead.
- **Panel affordance**: the guide checklist gained an explicit **End guide** action that closes the checklist while keeping the circuit on the canvas.
- **Verification:** typecheck, biome lint, production build clean; **960 unit tests** (9 new: pro-template coverage, motor/solar/generator energisation, fault-free guarantees, modal window behaviours) and 3 new E2E cases added to `e2e/guided-circuits.spec.ts` for CI.

### Added — Session 2026-08-26 (part 2): Settings redesign + portable profile backups

Follow-up to the workbench shell polish: the Settings dialog was rewritten from scratch and gains a portable save/load feature.

- **Settings modal redesigned** (`SettingsModal.tsx`): the emoji pill-tabs are replaced by a two-column shell with an icon sidebar (Editing / Display / Simulation / **Backup** / About, each with a subtitle) and a wider scrollable content area; the sidebar degrades to a horizontal strip on narrow screens. Tab content and the store are untouched.
- **Portable profile backups** (new `BackupTab.tsx`, new `src/lib/backup/backupFormat.ts`): one JSON file (`electrasim-backup-YYYY-MM-DD.json`) carries every preference plus — optionally — the current circuit (components, wires, global supply voltage). Restore applies preferences via a new `applySettings` store action and the circuit through the existing validated `setCircuit` path, after an explicit preview + confirm step.
- **Malicious-file protection**: backups are treated as hostile input — 10 MB size cap, `electrasim-backup` format magic + schema version gate, outright rejection of `__proto__`/`constructor`/`prototype` keys, settings rebuilt field-by-field through the same whitelist sanitizer used for IndexedDB hydration (unknown keys dropped, invalid values defaulted, warnings surfaced), circuits passed through the existing circuit validator and re-normalised, and an invalid circuit section refuses the whole file. Nothing is applied without the user confirming the preview.
- **Verification:** typecheck, biome lint, production build clean; full unit suite now **951 tests** (24 new: backup format hostile-input cases, BackupTab export/restore flows, store `applySettings`/`sanitizeSettingsPayload`, tab registry).

### Changed — Session 2026-08-26: Workbench shell polish — centered commands, system-aware shortcuts, collapsible palette

Follow-up polish pass on the professional workbench shell (desktop editor UI only — the simulation engine, data model, and SVG renderer are untouched).

- **Centered header command cluster**: the top application bar is now a three-zone layout — identity + undo/redo + standard on the left, the command cluster (**Guides, Student/Pro, Validate, Run Simulation**, plus Pro-only Analyze / Diagnostics / Fault Lab) exactly centered, and the command-palette hint, theme, settings and menu on the right.
- **Centered sub-header**: the simulation context bar (supply / system / project / sim state) now renders its content dead-center, gracefully degrading to a horizontal scroll when it overflows.
- **System-aware command palette**: new `src/lib/platform.ts` detects macOS/Windows/Linux; the header trigger shows the ⌘ Command icon with a `⌘ K` key on macOS and the Search icon with `Ctrl K` elsewhere (also mirrored in the palette footer, shortcuts overlay, and Undo/Redo tooltips).
- **Fixed global supply voltage dropdown**: the picker was being clipped by the sub-header's scroll container; it now renders in a portal at a fixed position (closes on outside click / Escape / resize) and locks while the simulation is running, matching the Inspector's supply lock.
- **Variants locked during simulation**: the Inspector's "Available Family Variants" gallery is disabled (with a lock badge and explanation) while the simulation runs — stop the simulation to switch variants.
- **Collapsible palette sections**: Recent, standard essentials, and every component category are now expandable/collapsible with counts, on both the desktop palette and the phone sheet; sections auto-expand while searching.
- **Single canvas tool dock**: the redundant bottom-right ToolDock was removed; its unique tools (trace circuit path, zoom in/out) were merged into the top canvas toolbar, so all canvas tools live in one place under the sub-header.
- **Welcome modal redesigned from scratch**: now covers every surface shipped to date — Guided Circuits, Component Library, Challenge Mode, Diagnosis Lab, Fault Lab, Validation & Diagnostics — plus the platform-aware command palette and keyboard shortcuts entries.
- **Verification:** `npm run typecheck`, `biome lint`, and the full **927 unit tests** pass (including new platform-detection tests and extended welcome-modal coverage). Playwright browsers are not installable in this sandbox; run the E2E suite locally before deploy.

### Added — Session 2026-08-25: Explore 3D Historical Feature — Immersive Edison Bulb Laboratory

- **New "Explore" 3D Historical Feature (`/explore/`)**: Introduced an experimental 3D historical laboratory application showcasing revolutionary electrical inventions in interactive 3D, starting with Thomas Edison's 1879 carbon-filament light bulb foundation.
- **Bespoke Laboratory Theme & Shell (`ExploreLayout.astro`, `ExploreHeader.astro`, `ExploreFooter.astro`)**: Custom dark space theme (`#050811`) with animated electric blueprint grid lines, travelling plasma arcs, diagonal corner ribbon banners (`EXPERIMENTAL`, `FOUNDATION 01`), and dedicated archival source citations (Smithsonian, Rutgers Edison Papers, IEEE GHN, U.S. Patent Office).
- **Interactive 3D Edison Bulb Explorer (`/explore/edison-bulb/`)**: Built a WebGL 3D model with Three.js rendering all 9 verified physical components (Glass Envelope, Carbon Filament, Support Wires, Glass Stem, Lead Wires, Brass Base, Copper Foot Contact, Base Insulator, Vacuum Atmosphere) with 5 viewing modes: Assembly, Cutaway, Exploded Assembly with Leader Lines, Isolate / Inspect, and Physics Experiment Laboratory ($0\text{ V}-130\text{ V}$ slider with resistance, power, temperature, lumens, and overdrive burnout simulation).
- **Explore 3D Command Palette (`ExploreSearchModal.astro`)**: Migrated search on Explore pages to a dark 3D command palette searching 3D models, modes, components, and historical timeline milestones (`Ctrl+K` / `⌘K`).
- **Responsiveness & WebGL Hardening**: Full mobile drawer navigation, touch-action gesture preservation, `IntersectionObserver` & `visibilitychange` animation loop pausing when off-screen, and zero-error Astro static compilation (`npx astro check` 84 files clean).

### Added — Session 2026-08-25: Fault Lab UX round — active-faults command centre, wire targets, shortcuts

Follow-up UX pass on the Inspector Fault Lab tab.

- **Active faults command centre**: the tab now lists every injected fault (with its target) and provides one-tap **Focus** (centres the canvas on it), **Replay** (replays that fault's canvas animation — handy for demos), and **Clear** controls; the pending "arming…" injection appears as a cancellable live entry. The canvas auto-reveal math was refactored into a shared `focusFaultTarget` helper that works for component and wire anchors.
- **Wire targets**: selecting a wire now targets it from the Fault Lab (previously wire faults were context-menu-only). Wire faults use the same choreographed injection (`beginFaultInjection` now accepts component or wire targets; non-conductor fault kinds are rejected for wires) and the arming animation anchors at the wire midpoint.
- **Grouped injection grid**: the ten fault buttons are grouped into Conductor / Polarity & Wiring / Leakage & Residual / Protection Device categories.
- **Shift+F**: toggles fault mode (Pro only; plain F remains zoom-to-fit); documented in the shortcuts overlay.

### Changed — Session 2026-08-25: Fault Lab moves into the Inspector and comes alive on the canvas

The Fault Lab is no longer a separate floating window — it is a first-class **Inspector tab**, and every fault now plays a **distinct, visible canvas animation** with a persistent per-fault indicator.

- **Inspector Fault Lab tab** (`InspectorFaultLabView.tsx`): selecting fault mode (toolbar button, command palette, or the new tab) snaps the Inspector open onto the Fault Lab tab; closing fault mode returns to Properties. The old "Manual Fault Simulation" block — injection buttons **and** threshold overrides — moved out of the Component Properties tab into the tab (a one-tap pointer remains in Properties). The floating `FaultLabPanel` is deleted. Pro-only, hidden on phones where the Inspector never renders.
- **Canvas fault effects** (`ui/canvas/FaultFxLayer.tsx` + `ui/canvas/faultFx.ts`): a dedicated world-space layer renders the physical consequence of each fault, non-destructively (the circuit model is never re-wired or deleted — clearing a fault restores everything):
  - **Open circuit / open neutral** — the affected conductor *fades out* (`electrasim-wire-fade` transition on WireLayer) and a cut zone opens with sparking exposed ends; open-neutral severs only the neutral run.
  - **Short circuit** — fire: a spark burst plays, then a flickering flame with radiating heat halos.
  - **Reverse polarity / switched neutral** — conductor **identity swap**, not re-wiring: attached runs cross-fade to the opposite colour while a crossover arc spins above the device. Ports never change mates (the connection solver still forbids L→N), so the model stays legal and undoable.
  - **Earth fault** — leakage bolt with rings sinking to an earth symbol; **smooth DC** — purple waveform drifting off the component; **arc fault** — white-hot strobe; **protection bypass** — bridge arc draws itself across the device; **jammed protection** — shaking padlock. Every fault kind also carries a unique pulsing badge code.
- **Choreographed manual injection** (`uiStore.beginFaultInjection`): for Fault Lab clicks the fault's animation plays *first* (sparks before the short lands), then the circuit-store commit arrives ('arming' lead time per kind, `FAULT_ARM_MS`). Auto-injected faults (Diagnosis Lab, challenges, context menu, undo) commit immediately and get the same entrance + persistent treatment via the layer. Manual injections auto-pan the viewport when the target is off-screen so the animation is always seen.
- **Reduced motion respected twice**: `prefers-reduced-motion` skips the arming delay (faults commit instantly) and every `electrasim-fx-*` animation is neutralised in CSS, leaving static indicators.
- **Tests**: 23 new unit/render tests (faultFx model, injection choreography, FX layer output); e2e specs updated to the tab-based Fault Lab and the choreographed commit.

### Changed — Session 2026-08-24: Challenge Mode is now a genuine Build Challenge (UX correction)

Challenge Mode no longer reads like a step-by-step tutorial. The learner is given the **goal** and the validator judges the result — the internal construction recipe is no longer exposed in the normal learner view.

- **Separated data layers** (`declarative/types.ts`, `declarative/validator.ts`): each `ChallengeDefinition` now carries a learner-facing `requirements` list (high-level outcomes such as "Protected by an MCB", "Complete return path") alongside the internal `rules`. `validateChallenge` derives a `RequirementStatus[]` from the rules, so the panel can report progress and next actions without ever exposing the recipe. Boot-time registry coherence now also verifies every requirement maps to a real rule id.
- **Hidden construction checklist** (`ChallengePanel.tsx`): the "All steps" list and the internal rule checklist are removed from ordinary Challenge Mode. Learners see a **Mission**, outcome-based **Requirements**, and a progress meter driven by met outcomes (tutorial-only Mission 0 keeps its guided step list).
- **Problem-oriented Next Action**: the Next Action card describes the current unmet outcome ("The lamp does not have a complete return path") instead of telling the learner which component to place. "Focus this step" is preserved and highlights the relevant existing components.
- **Non-recipe Check Circuit feedback**: feedback is high-level ("Your circuit is not ready to operate yet.") with the unmet outcome called out — raw component ids and internal rule names are no longer surfaced.
- **Validation unchanged**: the internal rules, validator, persistence, snapshot/restore, reset, hints, timer and Pause all behave exactly as before — only the learner-facing information architecture changed.
- **Tests**: 3 new domain tests prove outcome requirements are derived without weakening validation; Challenge Mode E2E assertions updated to the high-level feedback strings.

### Notes — Session 2026-08-23: Architecture Regression Analysis (read-only, no code changes)

A full read-only audit of the architecture identified the most likely regressions. Nothing was modified; findings are logged here as the pre-release checklist for this branch.

**Verified-broken today (must be addressed before/at release):**
1. **Release gate blocked (pre-existing):** `check:perf` fails — initial app JS is ~238.8 KB gzip vs the 115 KB budget (CSS 22.3 vs 15 KB). The breach predates this branch (tour added ~1.2 KB); `npm run verify`/`deploy` cannot pass until the bundle is dieted or budgets are consciously revised.
2. **Marketing cache keys not bumped:** `site-search.js`, `site-nav.js`, `landing-hero.js` changed but still ship as `?v=1.6.1` — returning visitors would receive stale cached scripts after deploy. Bump the release version (→ 1.7.0) with this branch.
3. **`e2e/smoke.spec.ts` keyboard-reroute test targets `[data-component-id^="fuse-"]`** — the new demo benches contain no fuse; the test will fail on the next E2E run.
4. **Tour-offer chip appears in every E2E session** (specs seed `electrasim:welcomed` but not the chip-dismissal key) and shares coordinates with `UndoToast` (`bottom-16`); expect click-interception/visual flakes until specs seed `electrasim:tour:offer:v1:dismissed` (or the chip hides during scenario modes).

**High-likelihood latent issues:** `startTour` clears/seeds the canvas without guarding active Challenge/Diagnosis sessions (canvas-ownership conflict); the stale-validation watcher triggers on any component-state change (switch toggles/drags), not just topology; "Fix All" applies quick fixes from the pre-fix report snapshot (additive fixes can over-apply); upgraders keep the old persisted showcase demo, which no longer matches demo-swap detection and scores poorly; US palette essentials (`afdd`, `socket-gfci`) are pro-tier and invisible to Student mode; `swapDemoForMode` is wired per call-site rather than to the `appMode` setting itself.

**Chronic fragilities to watch:** cyclic store imports with module-level side effects (TDZ/HMR hazards); the untyped `component.state` bag (`customMaxAmps` vs `customAmps`; `wire.lengthMeters` silently forcing 1.5 mm² in ampacity checks); byte-exact `sameCircuitShape` demo detection with no round-trip test; hand-synced app↔marketing numbers; `validateCircuit`'s `standard = 'uk'` default vs the app's new `'int'` runtime default; E2E suite not runnable in the development sandbox — run the full Playwright suite locally before deploying this branch.

### Changed — Session 2026-08-23: International Default Standard & Three Conditional-Logic Fixes

- **International 230 V is the default standard** (`settingsStore.ts`): fresh installs start on the neutral IEC 60364 · 230 V/50 Hz preset instead of UK/BS 7671. An explicit region choice made in Pro mode is user data — it **persists across mode switches** (shown read-only in Student mode) and is never reset back to International; "International" is only the never-chosen default. Unit/E2E expectations and tour copy updated.
- **Pro components surviving a switch to Student mode** (`Toolbar.tsx`, `UndoToast.tsx`, `uiStore.ts`): placed Pro-tier components intentionally stay fully functional (Student mode simplifies the palette, it does not corrupt circuits) — but the app now says so: switching to Student with Pro components on a user circuit shows a notice toast ("N Pro components stay active on the canvas — Student mode only hides them from the palette"). Toast infrastructure gains an Undo-free notice variant.
- **Stale validation reports** (`uiStore.ts`, `ValidationReportView.tsx`): reports no longer outlive the circuit they describe. Any graph change after a report flags it stale (amber "circuit changed — results may be outdated" banner with a Re-validate button); emptying the canvas drops the report, the issue modal and the compliance gate entirely; clicking an issue whose component/wire no longer exists logs a gentle hint instead of silently selecting nothing. Registration is cyclic-import-safe (retried across event-loop turns).
- 3 new tests (staleness flag, report drop on empty canvas, notice-toast variant); 877 total passing.

### Changed — Session 2026-08-23: Seven UX Fixes — Mode-Specific Demo Benches, Themed Specs Modal, Regional Essentials

- **Mode-specific demo circuits** (`seed.ts`, `circuitStore.ts`): the single showcase seed (which scored 0 under Pro compliance) is replaced by two purpose-built benches — a Student demo (MCB→switch→bulb + RCBO socket, 8 components) and a Pro demo (two-way staircase lighting, RCBO socket, D-curve breaker + contactor motor, 12 components). **Both validate 100/100 under every standard × plug pairing (12 combos verified) and simulate fully energised.** Switching Student↔Pro swaps an *untouched* demo to the mode's bench (user circuits are never rewritten); Reset-to-Defaults and the Pro tour are mode-aware; plug swaps work on both variants.
- **Latent compliance bug fixed** (`compliance.ts`): under US/INT standards (default curve C) the motor-curve check swept **every** component — terminals, bulbs, sockets — into "B-curve breaker on motor load" errors. The check now targets only motor-class loads (recommended curve > standard default) and compares curve order (B<C<D) instead of hard-coding 'B'.
- **Regional essentials differentiated** (`Palette.tsx`): UK/EU/INT no longer share one list. UK: RCBO/MCB/RCD; US: breaker + GFCI + AFCI (NEC 210.8/210.12 — the old list recommended `mcb-type-c`, an IEC curve concept); EU: MCB/RCD/SPD (IEC 60364-4-44); INT: MCB/RCD/fuse. E2E expectation updated.
- **Component specs modal themed** (`ComponentInfoModal.tsx`): the hard-coded dark palette is now light-first with `dark:` variants across all ~40 surfaces (header, tabs, spec matrix, wiring/standards panels, blog-link card, footer).
- **Double-close animation fixed** (`ComponentInfoModal.tsx`): the close handler and the store-watching effect both owned `isClosing`, so closing played exit → entrance → exit. The store's `activeType` is now the single animation trigger; one 200 ms exit.
- **Placement ghost uses the redesigned art** (`OverlayLayer.tsx`): the drag/placement ghost and the variant preview ghost now render the same near-realistic SVG art as placed components, falling back to the legacy emoji only when no art exists.
- **Fix All button** (`ValidationReportView.tsx`): when two or more validation issues carry quick fixes, a single "Fix All (N)" button applies them in report order.
- **Recent-components toggle** (`settingsStore.ts`, `SettingsTabContent.tsx`, `Palette.tsx`): new persisted `showRecentComponents` setting (default on) with an Editing-tab toggle controlling the palette's Recent row.
- Tests updated for the new benches (simulation, circuitStore momentary controls via injected push button, reroute, settings whitelist); 874 total passing; biome clean repo-wide.

### Fixed — Session 2026-08-23: Validation Blind Spot — Conductor Bypass & Unwired Components

User-reported defect: Live → MCB → FCU (Live only) → bulb → Neutral, with the FCU's N-in/N-out deliberately unwired, simulated successfully **and** validated at a perfect 100 in both Student and Pro modes.

- **Diagnosis**: the simulation is correct physics (the loop closes through the direct neutral), but none of the validator's nine check families examined per-device port connectivity, so the bypass scored 100.
- **New validation check 10 — Partially-Wired Devices & Conductor Bypass** (`circuitValidation.ts`): any pass-through / protection device (FCU, RCD, RCBO, DP switch…) that carries one conductor while a full Live or Neutral in/out pair is left unwired now raises a warning with port-labelled remediation. RCD/RCBO get residual-specific wording (a real device would trip instantly on the permanent imbalance). Components placed with **no wires at all** are also flagged (aggregated warning). A `conductor_routing_ok` passed-check records the healthy case.
- **False-positive safety**: single-pole devices (MCB has only Live ports) and single-port accessories (radial sockets) are structurally exempt; verified the demo seed and all 8 guided templates stay clean under the new check.
- **Tests**: 6 new regression tests including the reporter's exact circuit (now warns, score < 100, sim still runs by design) — 874 total passing.

### Added — Session 2026-08-22: Interactive Onboarding Tours & Standard-Selector Click-Trap Fix

A zero-dependency interactive tutorial engine with two tours, plus a fix for the Student-mode regional selector silently ignoring clicks.

- **Tour engine** (`src/ui/tour/`): spotlight overlay (SVG mask, pointer-transparent so the app stays fully usable), auto-placed arrow cards, and real-action "do" steps that advance only when the observed store state changes (component placed, wire drawn, sim running, mode switched, standard changed, validation run, overlay cycled, Fault Lab opened) — no synthetic clicks. Steps with missing targets (breakpoints/modes) auto-skip; `prefers-reduced-motion` respected; keyboard drivable (Enter/→/←, Esc); non-modal `role="dialog"` cards with live step announcements. Overlay and step copy load lazily; the always-mounted surface adds ~1.2 KB gzip.
- **Student tour — "Your first circuit" (10 steps)**: orientation, Student/Pro badge, the read-only standards pill (explained instead of mysterious), open palette → place a component → wire ports → run the simulation, live-canvas interaction, Fault Lab and Guided Circuits pointers.
- **Pro tour — "Standards & compliance" (9 steps)**: switch to Pro, open the now-unlocked regional selector, pick a standard (voltage / conductor colours / RCD threshold / drop ceilings explained), plug-type independence, Validate against the chosen rule set, diagnostics overlay cycling, Inspector/Zs, export handover.
- **Entry points**: "Take the tour" in the welcome modal, Menu → Interactive Tutorial, two command-palette commands, and a dismissible one-time offer chip after first-run welcome (desktop/tablet only). Completion and dismissal persist per device (`electrasim:tour:*`).
- **Anchors**: stable `data-tour` attributes on the toolbar (mode toggle, run, validate, diagnostics, Fault Lab, guides, menu), palette (open button + panel), Inspector (expanded + collapsed), PhoneDock Add, and the standard-selector popover.
- **Tests**: 11 new tests cover script well-formedness, every advance/skip predicate, card-placement geometry (side selection + viewport clamping), persistence round-trips, and the uiStore tour actions (861 total passing).

### Changed — Session 2026-08-22: Tour Flow Fixes, Empty-Canvas Start & Completion Celebration

- **Student tour starts on an empty canvas** (`uiStore.startTour`): the tutorial teaches place → power → wire → run from scratch, so starting it clears the canvas through the normal undoable action (Ctrl+Z restores the previous circuit, including the first-run demo, which is still what non-tour users see).
- **Wiring step is now actually completable**: new `add-supply` step places Live and Neutral terminals after the bulb, and the wiring step requires both the feed and the return wire (advance at entry + 2 wires) — previously the tour asked users to wire a lone bulb to nothing.
- **Completion celebration Easter egg** (`TourCelebration.tsx`): finishing a tour fires a full-screen canvas show — repeating electrical ring pulses, glowing spark bursts and jagged lightning in the brand palette — with click/Esc/auto dismissal and a calm static card under `prefers-reduced-motion`.
- **Tours restartable from Settings** (`AboutTab`): a new Interactive Tutorials block launches either tour any time; targets inside scroll containers now `scrollIntoView` once per step so palette tiles are visible when spotlighted.
- **Pro tour seeds a demo circuit when the canvas is empty** so Validate, the diagnostics overlay and the Fault Lab always have a real circuit to work on (region-correct socket via `primarySocketForPlug`; undoable). Fault Lab step copy now clarifies that the Fault Lab, the Inspector's Manual Fault Simulation section and the right-click menu all drive the same `setComponentFault` engine.
- 7 more tests (18 tour tests total, 868 suite-wide): overlay integration in jsdom (look-step walking, real-action do-step advancement, satisfied-step skipping, Esc without completion, celebration + persistence) and startTour canvas semantics for both tours.

### Fixed — Session 2026-08-22: Student-Mode Standard Selector Affordance

- **Regional selector click-trap** (`StandardSelector.tsx`): in Student mode the standards pill looked clickable but was a static `<div>` that silently ignored clicks. It is now a real button (with a lock icon) that opens an explainer popover — why standards are locked in Student mode — with a one-click **Switch to Pro mode** action. Existing `data-standard-selector`/`data-standard-readonly` attributes, citation span, and accessible naming are preserved for the production E2E suite.

### Changed — Session 2026-08-22: Marketing ↔ Simulator Content Sync & Component Deep-Links

Deep cross-scan of the Astro marketing site against the simulator codebase; every mismatch found was fixed on both surfaces.

- **Component info deep-links** (`componentHelp/*`, `ComponentInfoModal.tsx`): `ComponentHelpData` gains an optional `learnMoreSlug`; 15 components (MCB Type B/C/D, RCD, RCBO, SPD, two-way / intermediate / dimmer switches, PIR sensor, cooker unit, EV charger, electric shower, immersion heater, 3-phase distribution board) now render a "Read the full guide" link from the info modal's specifications view to the matching blog article, opening in a new tab so canvas work is preserved.
- **Versioned welcome modal** (`WelcomeModal.tsx`): the header now shows a `v{APP_VERSION}` badge sourced from the root manifest, so the first-run dialog always reflects the released version.
- **Guide page catch-up** (`astro-site/src/content/pages/guide.json`): the guided-templates list grows from six to the app's actual eight (adds Push-Button Doorbell and RCBO-Protected Socket from v1.6.1) and the feature blurb names all eight.
- **Honest stats** (`astro-site/src/content/pages/landing.json`): engine test count corrected 833 → 850 (verified with a full `vitest run`).
- **Stale RCBO workarounds corrected** (blog): three articles still told readers to "model an RCBO as MCB + RCD in series" although the dedicated RCBO component shipped in v1.6.0 — the RCBO explainer's simulator section now features the RCBO component and the RCBO-Protected Socket guided circuit, the RCD-zones guide's fully-RCBO layout uses real RCBOs, and the six-new-components post points at the dedicated component. The Guided Circuits announcement gains a v1.6.1 update note (six → eight templates). All four posts carry `updatedDate: 2026-08-22`; device facts were spot-verified against BS EN 61009-1 / IEC 61009 sources.

### Fixed — Session 2026-08-22: Site-Wide Accessibility & Voltage Drop Calculator UX Overhaul

Audit-driven accessibility and UX hardening across the Astro marketing site and the Voltage Drop Calculator. Verified with a 27-check Playwright probe plus the full production E2E suite (20/20 passing).

- **Site-Wide Accessibility** (`SiteHeader.astro`, `Base.astro`, `site-nav.js`, `global.css`): Removed invalid `role="menu"` from the mobile nav; added Escape-to-close, outside-click dismissal, focus management (focus into menu on open, restore to toggle on close), body scroll lock, and an Open/Close label swap; added a skip link targeting `<main id="main-content">` landmarks now present on every Base-layout page (homepage, blog articles, and 404 previously lacked `<main>`).
- **Tool Theme Persistence Fix** (`ToolHeader.astro`, `voltage-drop-tool.js`): The tool-page theme toggle now binds through `theme.js` via `data-theme-toggle` (ARIA state synced, correct `electrasim:color-scheme` storage key, `theme-color` meta updates); removed a duplicate handler that wrote an orphaned `electrasim-theme` key.
- **Honest Search States** (`SiteSearchModal.astro`, `site-search.js`): Typing before `/search.json` resolves now shows a spinner (`role="status"`) instead of a false "No results"; fetch failures show an error panel with a working Retry button; combobox `aria-expanded` is managed on open/close.
- **Voltage Drop Calculator A11y** (`ToolWorkspace.astro`, `VoltageDropPanels.astro`, `CommandPalette.astro`, `voltage-drop-tool.js`): Added sr-only `<h1>`; wired all field error messages via `aria-describedby`; implemented the radio-group pattern (roving tabindex + arrow keys) for system type; focus trap + focus restore for drawer, command palette, help modal, and mobile sheets; command palette input is a proper combobox with synced `aria-selected`/`aria-activedescendant`, group-label hiding, and an empty-results state; legend promoted to `role="region"`; scene SVG given `role="img"`.
- **Reduced Motion Support**: New `prefers-reduced-motion` handling across the tool page — CSS animation kill-switches for stage/panels/scene, SMIL particles paused on load, parallax disabled, tips fade skipped.
- **Validation & Interaction Timing**: Field errors are blur-gated ("reward early, punish late") so invalid intermediate states never paint while typing; results panel no longer swaps to the error card mid-entry; `Shift+Space` no longer hijacks typing in inputs (IME-safe) and toggles the palette elsewhere; fullscreen failures surface a toast (legacy webkit/ms fullscreen APIs handled); >1000 m info toast fires once per threshold crossing instead of per keystroke; Calculate marks all fields reviewed, then focuses the results panel (desktop) or opens the results sheet (mobile).
- **Mobile & Performance**: Interactive stage sized with `100dvh` (vh fallbacks) and viewport-capped `min-height`; bottom sheets lock background scroll and manage focus; Animate/Values/Legend pills and Reset/3D controls remain reachable on phones (compact restyle above the bottom bar); resize handler rAF-debounced and mousemove parallax batched to one transform write per frame.

### Added — Session 2026-08-22: Site-Wide Instant Search & Command Palette

Implemented a zero-dependency, ultra-fast client-side instant search modal and keyboard command palette across the marketing site, blog, guides, and electrical calculators.

- **Static Search Index API** (`astro-site/src/pages/search.json.ts`, `astro-site/src/lib/search.ts`): Build-time compiled search index aggregating all calculators, blog articles, guided circuits, and core landing pages with category metadata, tags, and descriptions. Tested in `astro-site/src/lib/search.test.ts` (passing).
- **Search Modal & Navigation** (`SiteSearchModal.astro`, `SiteHeader.astro`): Accessible native `<dialog>` modal with backdrop blur, light-dismiss support, category filter pills (All, Calculators, Articles, Guides), and keyboard shortcut triggers (`Ctrl+K` / `⌘K` / `/`).
- **Client Search Engine** (`astro-site/public/js/site-search.js`): Pure vanilla JS fuzzy ranking engine with query token scoring, highlight matches, debounced input, and keyboard navigation (`↑`/`↓`/`Enter`/`Esc`).
- **E2E Production Verification** (`e2e/production.spec.ts`): Verified modal opening via hotkey, quick links rendering, real-time query filtering, category pill switching, and escape dismissal.

### Added — Session 2026-08-21: Electrical Toolbox & Interactive Voltage Drop Calculator (`ElectraSim_Electrical_Toolbox_Master_Plan.md`)

Implemented the full Electrical Toolbox architecture and the first flagship tool: the **Voltage Drop Calculator** (`/tools/voltage-drop-calculator/`), built purely with native Astro, HTML5 SVG vector graphics, CSS, and lightweight vanilla client scripts (zero React islands in Astro site, full CSP compliance).

- **Toolbox Registry & Hub** (`astro-site/src/lib/tools/registry.ts`, `astro-site/src/pages/tools/index.astro`): Central tool metadata registry with Schema.org `CollectionPage` / `ItemList` / `BreadcrumbList` SEO metadata, responsive tool cards, and future tool roadmap placeholders.
- **Unified Tool SEO & Structured Data Generator** (`astro-site/src/lib/tools/seo.ts`): Reusable Schema.org `@graph` generator producing valid `WebApplication`, `BreadcrumbList`, `FAQPage` (with dynamic Q&A list), and `HowTo` (with calculation steps) schemas for any existing or future tool in the registry. Tested in `astro-site/src/lib/tools/seo.test.ts` (3/3 passing).
- **Voltage Drop Domain Engine** (`astro-site/src/lib/tools/voltage-drop/`): Pure TypeScript physics engine supporting DC, 1-Phase AC, and 3-Phase AC calculations with $\sqrt{3}$ line multiplier, conductor temperature resistivity scaling ($\rho_T = \rho_{20}[1 + \alpha(T-20)]$), power factor ($\cos\varphi$), line reactance ($x = 8\times 10^{-5}\ \Omega/\text{m}$), BS 7671 severity limits ($\le 3\%$ good, $3\text{--}5\%$ warning, $> 5\%$ excessive), and educational validation and formatting.
- **Unit Tests** (`voltage-drop.test.ts`, `seo.test.ts`): 16 comprehensive unit tests covering physics formulas, DC/AC conversions, 3-phase multipliers, temperature coefficients, boundary values, formatters, and Schema.org graph generation.
- **Full-Screen Tool Workspace Shell & UI Components** (`ToolHeader.astro`, `ToolDrawer.astro`, `CommandPalette.astro`, `ToolHelpModal.astro`, `VoltageDropScene.astro`, `VoltageDropPanels.astro`, `ToolSeoContent.astro`, `ToolWorkspace.astro`, `ToolLayout.astro`):
  - **ToolHeader**: Responsive header with hamburger drawer trigger, brand identity, tool switcher dropdown, `⇧ Space` shortcut trigger, Dark/Light mode toggle, Help button, and Fullscreen toggle.
  - **ToolDrawer & Command Palette**: Searchable off-canvas navigation and keyboard-driven command palette (`Shift + Space`) with Up/Down/Enter/Escape navigation.
  - **Help Modal**: Comprehensive modal showing physics equations (DC, 1-Φ AC, 3-Φ AC), conductor resistivity constants, and BS 7671 voltage drop thresholds.
  - **Interactive Vector Landscape**: High-performance SVG landscape with sky gradients, clouds, grounded trees swaying strictly at trunk base (`transform-box: fill-box; transform-origin: 50% 100%`), source substation box with cable gland at $(510, 395)$, load house with chimney smoke and brownout-reactive glowing windows, catenary curve overhead cable connecting directly to the house service entrance socket at $(1032, 428)$, dynamic length-dependent catenary sag morphing, conductor thermal overload aura ($I^2R$), mid-span drop callout badge tracking sag apex, and 16 moving electrical flow particles with speed and color reacting in real time to current and drop severity.
  - **Floating UI Panels & Controls**: Collapsible floating inputs panel (DC/1-Φ/3-Φ, voltage V/kV, current, length, size mm², copper/aluminum, advanced power factor & temp), floating results summary with status severity cards, top quick controls (Animate, Values, Legend), view controls (Reset, 3D mouse parallax), and bottom rotating tips carousel.
  - **Crawlable SEO Guide & FAQ Accordions**: Dynamic educational article underneath the tool workspace (`ToolSeoContent.astro`) with semantic H2/H3 headings, formulas, step-by-step calculation workflow, BS 7671 limits table, reduction techniques, accessible interactive `<details>` FAQ accordion matching Schema.org `FAQPage` JSON-LD, internal technical guide links, and direct CTA to ElectraSim interactive wiring simulator (`/app/`).
- **Client Script** (`astro-site/public/js/voltage-drop-tool.js`): Ultra-fast vanilla JavaScript reactive engine (zero runtime dependencies) handling live input synchronization, dynamic catenary sag scaling, window brownout lighting, thermal glow auras, SVG updates, particle animation velocity, modals, 3D parallax, theme switching, and keyboard shortcuts.
- **End-to-End Test Suite** (`e2e/toolbox.spec.ts`): 7 Playwright tests validating hub navigation, desktop parameter changes & real-time recalculations, JSON-LD Schema.org graph verification, canonical/meta validation, FAQ accordion interactions, command palette hotkeys & filtering, help modal, theme toggling, and mobile bottom sheet responsive layout.


Replaced the generator-based "build a random circuit against the clock" mode with the declarative system the plan specifies: hand-authored challenges, a rule checklist validator, a safe practice workspace, and a Learn hub. Per plan §26 this ships exactly three challenges — user testing must happen before more content.

- **Declarative challenge domain** (`src/domain/challenges/declarative/`). Challenges are pure data: starter circuit, allowed components, an ordered rule checklist (component / connection / state / functional / fault rules), three progressive hints and a completion message. Rules are judged against the real circuit model and simulation engine — topology, never coordinates or ids (plan §7), so any electrically equivalent wiring passes. Functional rules run the real simulator with evidence states (plan §8 "Interaction Evidence": the doorbell must be OFF when released and ON while pressed).
- **Three Wave-2 challenges** (§23–§25): *Build a Protected Lamp* (blank canvas, Live → MCB → Switch → Bulb → Neutral), *Wire a Push-Button Doorbell* (momentary topology proven by interaction evidence), and *Protect a Socket with an RCBO* (both conductors through the RCBO — bypasses rejected — plus the Earth path).
- **Safe practice workspace** (`declarativeChallengeStore`, `declarativeChallengePersistence`). Starting snapshots the normal circuit; challenge edits autosave to a per-attempt key, never the normal circuit (plan §11/§12). Exiting restores the snapshot exactly, with "Return to My Circuit" / "Keep a Copy" / "Cancel" (§13). A reload offers Continue vs Return instead of silently choosing (§14). Reset restores this challenge's starter, never the global default (§15). Completion is recorded in its own IndexedDB progress map — Circuit JSON ≠ Challenge Progress (§34).
- **Learn hub + panel** (plan §16–§19). The menu entry opens the Learn hub: Continue Challenge (when resumable) plus challenge cards with difficulty, time estimate and completion checkmarks. The active view shows objective, steps, a progress meter, the rule checklist and plain-English verdicts (plan §9: no raw ids). Phones get a bottom sheet with a hide-to-pill affordance so the canvas stays reachable (§19). The palette restricts to the challenge's allowed components during an active challenge; extra components already placed are warned about, never deleted (§20).
- **Foundation Lock defects fixed** (from the generator test plan): the vitest config now pins `NODE_ENV=test` so an ambient production env cannot break every React test, and fault-naming trip messages in the simulator are tagged so Diagnosis mode can withhold them (469 leaks across 4,500 scenarios → 0, with a regression test).

**Removed:** the old generator-based Challenge Mode (`challenge/{scenario,comparison,evaluator,scoring}.ts`, `challengeStore`, `challengePersistence`, `stress-challenge-mode`) per plan §44: "Do not turn Challenge Mode into a second random generator." The generator foundation remains, powering the Diagnosis Lab.

**Verification:** typecheck + lint clean (356 files); **833/833 Vitest tests across 58 files**; Playwright **chromium 58 passed**, **mobile-chrome + tablet-safari 18/18 passed** for the new challenge-mode spec; production build green. Diagnosis-lab spec passes 2× consecutively after one parallel-worker framing flake (DOM-measure race, passes in isolation and on repeat).

### Fixed — Session 2026-08-19 (later): iPad Safari header collapse, gate closure, e2e stabilisation

Closed out the two §55 gates that had never been executed, and fixed the first real cross-browser defect they exposed.

- **Challenge/Diagnosis header collapsed to zero width on iPad Safari.** The panel header laid the title column out as `flex-1 min-w-0` beside intrinsically-sized badges (Rage Bait, timer, copy seed). At the ~224px panel width used below `lg`, the badges consumed the whole line and WebKit resolved the title column to a literal **0px** box: the heading and the `ES-RAGE-…` / `ES-CHAL-…` challenge id were still in the DOM but rendered one character wide, effectively invisible to sighted users and reported as hidden by both assistive tech and Playwright. The header now wraps and the title column carries a real minimum basis, so every element keeps its natural size at every viewport. Chromium never showed this — it took running the WebKit project to surface it.
- **`tablet-safari` Playwright project now runs and passes.** It had never been executable here (missing WebKit browser + system libraries); with those installed it reported 8 failures. One was the layout defect above; the rest were harness bugs, now fixed: the component palette is a *fixed overlay* over the canvas below `lg` and was intercepting component clicks (guided-circuits, faults-and-editing), `pro-features` selected a component by hardcoded viewport coordinates that fall outside an 834px-wide tablet, and `smoke` asserted a "Components" **button** that has never existed in any viewport — the palette is an `<aside>`, and the collapsed rail renders the same label vertically.
- **Flaky Ohmageddon/diagnosis e2e stabilised.** The intermittent "unexpected navigation" failures were dev-server HMR full-reloads firing mid-test, triggered by build artefacts landing inside the watched tree. Vite now ignores `.vite/`, `node_modules/.vite/` and `stats.html`, and the Playwright dev server runs with `DISABLE_HMR=true`. Three consecutive full Chromium runs are clean.

**Verification (all on Node 22.12):** Vitest **910/910 across 62 files**; typecheck (app + e2e) and `npm run lint` clean across 356 files; Playwright **chromium 66 passed** (×3 consecutive runs), **mobile-chrome + chromium 122 passed**, **tablet-safari 64 passed**, **production 11 passed**; `npm run build`, `check:links` (138 files), `benchmark:simulation` and `benchmark:browser` all pass. The previously-unrun `e2e:production` and browser-benchmark gates are now green. `check:perf` still fails and is a **budget** question, not a regression — see below.

**Known gate failure — `check:perf` (needs a decision, not a fix).** Initial JS is 232,413 B gzip against a 115,000 B budget; CSS 20,470 B against 15,000 B. This is pre-existing (it fails identically on a clean checkout, and the budget has never been changed since it was written). It was reduced this session by ~27 KB / 10.5% via lazy-loading three modals and breaking an eager import chain that dragged the whole challenge-generator domain into the entry bundle, but the budget is **arithmetically unreachable**: `react-dom-client` + `react` alone are ~99 KB gzip, i.e. 86% of the entire JS budget before a single line of ElectraSim ships, and the CSS is Tailwind-generated theme/utility output that is already maximally compressed. Meeting it would require dropping React or server-rendering, neither of which is in scope. Recommend revising the budgets to reflect the actual floor rather than silently lowering the bar.

### Added — Session 2026-08-19: seed sharing/replay (§30) and Learning Modes documentation (§49)

Audited the v2 plan against the implementation. The generator foundation, Challenge Mode, Diagnosis Lab, Ohmageddon and persistence were all present and passing; two plan items had no implementation, and both now ship.

- **Copy Seed / Replay (§30).** New pure domain module `domain/challenges/share.ts` formats and parses a replay ticket over the identity inputs the generator already treats as canonical — `seed + difficulty + mode + rage tier` — plus the generator version. The circuit is never serialised: it is a function of those inputs, so a ticket stays a handful of bytes and rebuilds the exercise exactly. The Diagnosis Lab header gained a **Copy seed** control (emitting the `Seed: / Difficulty: / Mode:` block §30 specifies, with a machine-readable `Code:` line), and the idle picker gained a **Replay a seed** field that accepts the whole pasted block, a bare code, or a bare seed number. Both controls ship in **Challenge Mode and the Diagnosis Lab**, sharing one `useCopyToClipboard` hook so the affordance behaves identically in both. A ticket from a different generator version is still replayed, but the mismatch is stated rather than hidden (§6). Entirely local — no backend, no share endpoint (§3, §48).
- **Learning Modes documentation (§49).** The in-app docs had no page describing the v2 features. Added a seventh docs section covering Challenge Mode, the Diagnosis Lab and Ohmageddon Mode, the three difficulty profiles, the seed/replay system and deterministic generation, and the fact that statistics and the active exercise live in IndexedDB and never leave the device. README highlights updated to match.

**Verification:** typecheck, `npm run lint`, and **910/910 Vitest tests across 62 files** passed (12 new, including a replay test that rebuilds a real scenario from a round-tripped ticket and asserts the faulted circuit is identical). All four stress gates re-run green: 3,726 generated challenges / 223,656 faults / 414,574 repairs verified, 750 Challenge Mode scenarios, 600 diagnosis scenarios, 1,800 Ohmageddon scenarios. Playwright Chromium **67 passed / 2 intentional skips**, including three new §30 specs — one copies a seed and replays it in a *fresh browser context* (separate IndexedDB) to prove the seed alone reproduces the exercise, one covers unparseable input (§47).


### Added — Session 2026-08-19: Pro standards, audited compliance, and routed diagnostics

- Added one shared Pro simulation-start gate for regulatory blockers, while preserving non-bypassable physical-fault checks and advisory Student-mode validation.
- Added a teacher/demo compliance override that bypasses regulatory blockers only and records the active standard and blocking issues as a `manual_intervention` audit event.
- Added schema-versioned IndexedDB persistence for Simulation History with strict input reconstruction, malformed-entry rejection, and a 100-event cap.
- Added a read-only Student standard badge, independent Pro electrical-standard and plug-system controls, and standard/plug-aware palette recommendations.
- Consolidated the two legacy diagnostic toggles into **Off / Heat only / Heat + V-drop**, including settings migration and wire bands that follow routed orthogonal or curved paths.
- Added deterministic Pro Playwright coverage for compliance gating, override auditing and reload persistence, diagnostic states, Student restrictions, recommendations, and standard/plug independence.

### Fixed — Session 2026-08-19: Pro follow-up correctness and validation

- All ordinary start paths now use the same compliance and physical-safety decision instead of allowing direct setters to bypass validation.
- Changing the electrical standard no longer rewrites the independently selected physical plug system.
- Recent palette entries now obey the same region and Student/Pro eligibility rules as normal component tiles.
- The opt-in dense browser benchmark now imports a deterministic 202-component/300-wire circuit instead of relying on the removed development Stress button.
- Production Settings tests use the control's exact accessible name, avoiding strict-locator collisions.

### Added — Session 2026-08-19 (v2 Phase F4–F6): misleading symptom, Rage 2 swap, Rage 4 timer

Phase F is complete. The last two modifiers that were still `implemented: false` now ship honestly, Rage 2 stops pretending `remoteFault` is a misleading symptom, and Rage 4 finally has the optional clock §27 listed for it.

- **`misleadingSymptom` (F4).** The modifier never rewrites the complaint (§26). It *selects* a fault whose true measured symptom points somewhere unhelpful — typically an upstream open that kills a downstream load, so the briefing says the lamp is dead and the lamp is not where the fault is. Ranking drops candidates that sit on a declared load; `tryBuildScenario` then *proves* the claim with `isMisleadingPlacement` against the measured symptom (dead load → the load, its terminals, its incident wires) and **replaces** the proposal row, same honesty pattern as `compoundFault`.
- **Rage 2 retires the `remoteFault` stand-in (F5).** §27 asked for "1 fault + misleading symptom + reduced hints". A jammed MCB one hop from the lamp is misleading without being remote, which is the beginner-safe case the stand-in was hiding. Rage 3 still uses `remoteFault`.
- **`timeLimit` on Rage 4 (F6).** 1.5× par (floor 30 s) so the hard stop sits above the medal cutoff. The Diagnosis Lab swaps the elapsed clock for remaining time, and hitting zero settles the run as `timed-out` — whatever the learner has already found is scored, the circuit is not rewritten, and a reload cannot resurrect a clock that already hit zero.

### Added — Session 2026-08-19 (v2 Phase F3): a fault that hides another fault 😈😈😈

`compoundFault` (§25, §26, §27, §53.6) is now implemented, and **Rage 4** ships with it. A compound scenario is one where the first fault *masks* the second: while it is present the installation looks exactly as it would with that fault alone, and only when the learner repairs it does the real second complaint appear. This is the diagnostic habit the tier exists to teach — *re-test after every repair*.

- **The claim is proved by simulation before it is made.** The builder simulates the pair, and requires that the combined picture matches the primary fault's picture and *does not* match the partner's. Both faults must also be independently observable (§12), so the second one is a real fault the learner can find, not a passenger in the answer list.
- **Masking is judged on what the learner can see.** A new `sameObservableWorld` compares dead loads, tripped protection and blown components — and deliberately ignores the simulator's internal error flags. An earlier attempt that included them found **0 masking pairs out of 67,476**, because every wire fault flags its own wire and so no two faults ever "look the same". The gate was measuring the wrong thing, not reporting an absent phenomenon.
- **An honesty bug was found and fixed by the probe that measured it.** The selection stage records `compoundFault: applied` meaning only "a partner was proposed and accepted"; the later masking verdict was *appended* beside it, and `buildRageSummary` merges duplicate rows with "applied anywhere wins" — so **71 of 120 rage-4 scenarios claimed a compound that did not exist**. The verdict now *replaces* the proposal's row. A regression test pins it, and a second test re-proves every `applied` claim against the simulator rather than trusting the flag.
- **Graceful degradation, never a rejected seed.** The primary fault is fixed before the compound search begins, so not every circuit can host one. When no masking partner is found the exercise ships as an honest plain multi-fault and says so in its note. A bounded retry over reserve candidates lifted the honest compound rate from **35.0 % to 56.7 %** (52.5 % across the full 360-scenario stress sweep).
- **Rage 4 drops `remoteFault` on purpose.** Compound masking already forces the partner deep into the branch the first fault de-energises; also demanding the most-distant band leaves the two constraints with an empty intersection — the same way `remoteFault` + `multiFault` once made Rage 3 ship a single fault. Fewer modifiers, strictly harder exercise, so the tier escalation test now asserts the learner's actual burden instead of counting list entries.

### Fixed — Session 2026-08-19: the Diagnosis panel described a circuit that no longer existed (§14, §26)

**The evidence block was a snapshot, not a reading.** `scenario.complaint` is written once when the exercise is built, and the panel rendered it unchanged for the whole session — so after a learner correctly repaired something, the panel still reported the original symptom.

- For compound scenarios this defeated the entire tier: the payoff for repairing the masking fault is that *the complaint changes*, and a frozen briefing told the learner their correct repair had achieved nothing.
- The panel now re-derives the symptom from the learner's live circuit after every change, via a new pure `observeSymptom` in the domain layer — the panel still owns no electrical logic. It uses the same deliberately-vague phrasing as the original briefing, so **§14 holds**: it reports what is *seen*, never what is wrong or where. A test asserts the live text never contains a fault's id, type or location across many seeds.
- When everything measures healthy the block says so plainly and asks for the diagnosis, rather than showing a complaint the learner has already fixed. Verified end-to-end in a real browser by walking the answer grid until the repairs land.
- Costs ~0.3 ms per change and is memoised. Mutation-checked: freezing the complaint back to `scenario.complaint` fails the compound test.

### Fixed — Session 2026-08-19: the console was printing the answer (§14)

**Running the simulation during a Diagnosis exercise handed the learner the answer.** The simulator narrates every injected fault by name — `🔧 TERMINAL DISCONNECT: Loose terminal screw on Push Button port!` — and those lines went straight to the Console panel while "Loose / Disconnected Terminal" sat in the multiple-choice list directly beside them. Pressing **Run Simulation** is the single most natural thing to do when asked to investigate a circuit, so the intended exercise could be skipped entirely, by accident.

- **Measured, not guessed.** A domain sweep over 180 scenarios found **72 %** emitted at least one error or warning naming the fault outright, and **8.9 %** additionally tripped protection — including 11 of 13 short-circuit scenarios, which also raised a modal reading `⚡ CIRCUIT PROTECTION TRIPPED! … short-circuit`. Confirmed in a real browser at three viewports before any code changed.
- **Tagged at the source rather than filtered by string.** `simulate()` now records the exact indices of the messages that name an injected fault (`faultNarrationErrors` / `faultNarrationWarnings`). Matching on text downstream would have been brittle and would also have swallowed the legitimate *consequence* messages — "MCB tripped", "voltage mismatch" — that a diagnostician is supposed to reason from.
- **The symptom survives; only the diagnosis is withheld.** A tripped breaker still reports that it tripped, because that is an observable symptom. What it no longer reports is *why* (`reason: 'short-circuit'`) or where to click to undo it ("right-click the faulted component → Clear fault"). The whole manual-fault alert branch, which exists purely to name the injected fault, stays silent during an exercise.
- **Nothing is deleted outside Diagnosis mode.** In the ordinary Fault Lab workflow every message and modal still names the fault exactly as before — verified by a negative control, since a fix that quietly disabled the simulator's reporting would be a worse bug than the one being fixed.
- **The old §14 test only read the panel's own briefing**, which is why this survived four phases of green suites. The regression test now sweeps four seeds and asserts that no fault name appears anywhere on screen outside the answer list, at every viewport. Both the unit and e2e tests were mutation-checked: reverting the fix makes them fail.

### Added — Session 2026-08-18 (v2 Phase F2): two faults at once 😈😈

`multiFault` (§25, §26, §27, §53.3) is now implemented, so Rage 3 ships the two faults §27 always specified for it — on 120/120 seeds at every difficulty. Both faults are ordinary eligible candidates, really injected and really simulated: the difficulty is in the search, not in a lie.

- **A new selection stage** (`selectFaults`), between candidate ranking and presentation. None of the three existing hooks could express "and another one" — `rankCandidates` re-orders a pool that exactly one fault is then drawn from — so multi-fault gets its own hook that *proposes* additions after the first fault is chosen.
- **The runner owns the invariants, not the modifier.** Nothing already selected is ever removed; no duplicate fault and no duplicate `locationKey` (two faults sharing a location would collapse into one answer in §15's grader); a hard ceiling of three faults. Proposals arrive in preference order, and `tryBuildScenario` drives each one through §12's solo-observability gate, swapping in a standby when a proposal turns out to be masked rather than discarding the whole scenario.
- **Two faults never share a device.** Two faults on the same wire — or on a wire and the terminal it lands on — read as a single defect, so a learner who correctly repaired "that connection" would be told they were wrong for a distinction they cannot see. A *different fault type* is preferred for the same reason: two open-circuits read as one repeated mistake.
- **Falls back to the full (decoy-filtered) pool** when the ranked band offers nothing separable. `remoteFault` narrows to a single distance band, which on a typical circuit is a cluster of wires around one node; without the fallback the two modifiers cancelled each other out and Rage 3 quietly shipped one fault (measured: 0 of 8 seeds). The ranked pool is still tried first, so the second fault tends to be remote too.
- **Rage 4 still does not ship.** §27 defines it as two faults *plus a compound symptom*, and `compoundFault` — faults that interact, so clearing one changes what the other looks like — remains honestly unimplementable. Labelling a tier "compound" that is not would be exactly the §24 misrepresentation the mode is supposed to avoid.

### Fixed — Session 2026-08-18 (v2 Phase F2)

- **Duplicate location options made some exercises unanswerable (§15).** Two different wires could render as an identical option row — a socket's live and neutral drops both read "Wire: RCBO (20 A) → Single 3-Pin Socket (13A)" — as could two identical bulbs on separate branches, and their terminals. The answer form takes one location, so the learner could be graded wrong for a distinction the UI never showed them. Colliding rows are now qualified by the terminal names the wire lands on ("L-out → N"), falling back to the canvas id; labels that were already unique are left exactly as they were. **Pre-existing, not introduced by F2**, and caught on screen at 390×844 rather than by any test — now locked by both stress harnesses and a seed sweep.
- **The multi-fault disclosure was withheld from the one tier that needed it.** The "more than one thing is wrong" line rode on hints 2–3, but `limitedHints` truncates Rage 3 to a single hint — so the only tier with two faults was the only one that never said so, making a complete repair look like a failed one (§26). Moved onto the level-1 observation, which reveals neither a type nor a location.
- **The rage-summary leak check produced a false positive.** `notes.includes(targetId)` reported a leak of `…-w-1` whenever a note legitimately named `…-w-10`. Now matched on whole tokens — a weak check is worse than none, because it trains you to ignore it.
- **`remoteFault`'s stress metric had stopped measuring `remoteFault`.** Mean fault distance is taken over the *nearest* fault, which on a two-fault tier reports the second one; it read 0.00 at beginner/rage-3 while the primary fault was as remote as ever. Distance is now reported for both roles (`meanDist` and `meanPrim`) and the escalation gate asserts on the primary, so a working modifier is not weakened to satisfy a stale metric.

**Gates:** 861 unit tests (was 844) across 60 files; e2e **112 passed / 14 skipped** including a real two-fault Rage 3 walkthrough driven entirely through clicks; all four stress harnesses green at full seed counts (Rage 3: 2.00 mean faults, 120/120 multi-fault, 2.89 mean primary hops at intermediate); typecheck clean; `vite build` clean.

### Changed — Session 2026-08-18 (v2 Phase F1): plural-fault scenario shape

Phase F's first slice (§53). Phase E had to register `multiFault` and `compoundFault` as `implemented: false` for one structural reason: a `DiagnosisScenario` carried exactly one `fault`. F1 removes that ceiling everywhere *before* any modifier tries to use it, so the two-fault work that follows is a modifier change rather than a rewrite.

- **`DiagnosisScenario.faults: ScenarioFault[]`** (always ≥ 1) replaces the singular `scenario.fault` / `scenario.faultLocationKey`. Each `ScenarioFault` carries its own `fault`, `locationKey` and solo `symptom`; the scenario's own `symptom` is the *combined* observation. `primaryScenarioFault(scenario)` is the one-fault accessor. Single-fault scenarios are unchanged in behaviour — the array simply has length 1.
- **The evaluator now grades a hunt, not a guess.** `DiagnosisEvaluation` gains `faults[]`, `matchedFaultId`, `progressed`, `identifiedFaultIds`, `outstandingCount` and `faultCount`. Naming a genuine fault while others remain outstanding is **`incomplete`, never `failure`** — the learner was right, just not finished. Re-naming a fault already found is `incomplete` with `progressed: false`, and the matcher prefers an un-named fault so a duplicate answer can't be laundered into progress.
- **Scoring accounts for the extra work.** `parTimeSeconds` scales `× (1 + (faultCount − 1) × 0.6)`, each additional fault found adds an 8 % bonus, and the completion floor is prorated by `completeness` so a partial hunt scores partially. `gradeFor` returns `'complete'` — never gold/silver/bronze — while any fault is outstanding.
- **Persistence tracks the hunt.** `ActiveDiagnosisRecord.identifiedFaultIds` survives a reload, and stats moved from a single `faultType` to `faultTypes: readonly FaultType[]`: every type in a run is credited `seen`/`solved`, and a misdiagnosis is attributed to all of them while run-level totals are still counted once. A malformed `identifiedFaultIds` invalidates the whole record rather than being silently dropped.
- **The panel shows the hunt** — a "Faults found: N of M" card, shown only when a scenario actually has more than one fault, plus a pluralised completion screen.
- **Fixed: a partial success was billed as a failure.** `diagnosisStore` incremented `incompleteRepairs` and cleared the learner's selections on *every* non-final verdict, including the one where they had just correctly identified a second fault. Now guarded on `huntAdvanced` (`progressed && outstandingCount > 0`), which is also the only condition that resets the pickers. Caught by three failing store tests, not by review.

**Tests:** 844 unit tests pass (up from 815) across 60 files, with new multi-fault blocks in `evaluator.test.ts` (21), `scoring.test.ts` (18) and `diagnosisPersistence.test.ts` (26). Both `stress-diagnosis` and `stress-ohmageddon` were migrated to the plural shape and now walk a scenario **fault by fault**, asserting every fault is independently observable and completable. Full e2e green: 110 passed across chromium + mobile-chrome.

### Added — Session 2026-08-18 (v2 Phase E): Ohmageddon Foundation 😈

Phase E of the v2 plan (§23–§28, §42, §52, §57). Ohmageddon is the opt-in "deliberately difficult" diagnostic mode. Its whole design problem is that §25 forbids a separate generator while §26 forbids a dishonest simulation — so the difficulty has to come from the *diagnosis*, never from the physics. **"Rage against the circuit, not against physics."**

- **New `src/domain/challenges/rage/`** — a composable **modifier interface** (§25), not a rage generator. `generateChallenge()` is untouched and still locked by §57; modifiers hook three points of the existing diagnosis pipeline: `transformCircuit` (reshape the installation), `rankCandidates` (choose which fault), `adjustPresentation` (ration hints). Nothing in `generator/**` imports from `rage/**`.
- **Honesty is enforced, not promised (§26).** Any circuit a modifier produces is pushed back through the **same** `validateCandidate()` the generator uses — structure, connection rules, BS 7671, both simulation modes — plus a before/after comparison of every declared load. A modifier whose output fails is **discarded** and the original circuit kept. There is no relaxed rage-only validator.
- **Three modifiers ship (§52).** `redHerring` splices a real Wago / terminal strip / junction box into a live run — all `isPassThrough`, so the simulator sees one straight-through conductor, and the run length is halved across the two segments so voltage drop and Zs are unchanged. `remoteFault` picks the eligible fault furthest (in graph hops) from the symptom, and is the first consumer of `maxFaultDistanceFromSymptom`, which Phase A declared and left unread. `limitedHints` drops the later hints, location hint first, never below one.
- **Four modifiers are declared but refuse to run.** `multiFault`, `compoundFault`, `misleadingSymptom` and `timeLimit` are registered with `implemented: false` and the runner will not apply them, so a tier table cannot ship a stub. Each is blocked on a real constraint (a singular `scenario.fault`, or §26's ban on fabricated symptoms) — recorded in ADR 0005.
- **Three tiers (§27), labelled for what they actually do.** Rage 1 = red herring. Rage 2 = remote fault + reduced hints (§27 asks for `misleadingSymptom`; `remoteFault` achieves the same intent truthfully). Rage 3 = all three. Rage 4 is not shipped because it needs the deferred modifiers.
- **`ohmageddonMode: false` in Settings → Simulation (§23),** persisted through the existing IndexedDB settings store, with §23's own warning copy. **`DiagnosisScenario.rage` is `null` unless a tier was explicitly passed**, and the *only* place a tier can be granted is `diagnosisStore.start()`, gated on the setting — so a stale UI or a resumed record cannot conjure a rage exercise while the mode is off (§24). A saved rage run is discarded rather than downgraded on resume.
- **The mode is never hidden (§24):** a `😈 RAGE BAIT` badge, an "Ohmageddon Challenge" header, a per-modifier summary strip, and a `ES-RAGE-######` identity. Completion reuses the Diagnose → Repair → Verify → Success pipeline with §28's playful "😈 YOU ACTUALLY FOUND IT".
- **A decoy is never the fault.** Every decoy-touching candidate is filtered out before selection — a red herring that might be the culprit is not a herring.
- **Fixed: the red herring announced itself on the canvas.** Decoys were named `<wireId>-decoy`, and `ComponentNode.tsx` renders `component.id` beneath every device, so the answer was on screen in plain text. Decoys now use the generator's own `<prefix>-jN` convention. Found by reading a screenshot — the third time this session that screenshot review caught a defect the unit suite missed; now locked by both a unit and an e2e test.

**Tests:** `rage/modifiers.test.ts` (30 tests), `e2e/ohmageddon.spec.ts` (7 × chromium + mobile-chrome), and `scripts/stress-ohmageddon.ts` (`npm run stress:ohmageddon`) — 1,440 scenarios / 4,320 evaluations asserting clean baselines under the full validator stack, observability, the three verdicts, decoy innocence, determinism, no answer leak, and **measured** tier escalation (mean fault distance 0.95 → 2.89 hops on intermediate; hints 3 → 2 → 1). Four negative controls were run; two initially failed to fail and exposed genuinely weak tests, both since replaced (see ADR 0005).

### Added — Session 2026-08-18 (v2 Phase D): Diagnosis Lab

Phase D of the v2 plan (§11–§22, §33, §41, §57). The second player-facing mode inverts Challenge Mode: instead of building a circuit from a brief, the learner is handed a **working installation that has been broken** and must say what is wrong, where it is, and then actually repair it. Per §57 the core generator is **not modified to support fault types** — faults are injected in a separate layer on top of the healthy circuits Phase A/B produces.

- **New `src/domain/challenges/faults/`** — `eligibility.ts` (which of the 9 diagnosable fault types can legally attach to a given circuit; `open-earth` is excluded as behaviourally silent), `injection.ts` (writes **only** `Circuit.faults` per §13 — the legacy `component.state.fault` / `wire.fault` paths are left alone), and `verification.ts` (symptom diffing and recovery gaps).
- **New `src/domain/challenges/diagnosis/`** — `scenario.ts` builds the exercise (complaint, brief, fault-type and location choices, three escalating hints, par time); `evaluator.ts` grades it; `scoring.ts` awards 0–1000 from speed / accuracy / independence.
- **A correct guess never completes an exercise (§16).** The verdict is three-state (§41): a wrong answer is a `failure`, a *right* answer with nothing repaired is `incomplete`, and only a right answer whose repair makes a fresh `simulate()` run recover every dead load is a `success`. Recovery is always **measured**, never inferred from the fault object being gone.
- **Deleting the broken part is not a shortcut.** `isFaultResolved` returns true when the faulted target is deleted, so "select the bad wire, press Delete" cleared the fault while leaving the load dead. `describeStructuralGap` now compares the connection multiset against the healthy circuit: deleting a faulty wire grades `incomplete`, deleting **and replacing** it grades `success` — which is what an electrician actually does.
- **The brief never names the fault (§14).** `describeSymptom` reports only observable consequences ("The LED Bulb (9W) is dead"), and only the final hint may narrow to a location. An earlier draft leaked the answer through the *UI* rather than the copy — the repair button was gated on whether the selected item was the faulty one, making it a perfect oracle; it is now gated on "both questions answered".
- **New `src/ui/canvas/fitRegion.ts`** — framing the circuit is part of correctness (§33). `CircuitCanvas` renders with a fixed 1200×720 `viewBox` and `preserveAspectRatio="xMidYMid meet"`, so CSS pixels are **not** SVG user units (a factor of 0.325 on a 390×844 phone). `viewportStore.zoomToFit` works in user units and takes no origin, so passing it `getBoundingClientRect()` applied the meet-scale twice *and* centred on the whole canvas: the circuit hid behind the panel on desktop and collapsed into an illegible ~12px clump on phone. The new helper converts to user units, subtracts the **measured** rects of every `[data-canvas-occluder]` element and centres the circuit in the largest remaining strip — so the phone sheet, the narrow tablet dock and the wide desktop dock all work with no device-specific constants.
- **Fixed — palette covered the canvas on phones.** `Palette.tsx` placed `if (isPhone) return …` *above* the shared `if (!open) return null` guard, so the Add-Component sheet was permanently mounted on phones, hiding the canvas and every bottom-docked panel.
- **Fixed — component captions showed catalogue ratings.** `COMPONENT_DEFS[type].label` embeds a default ("RCBO (32A 30mA)") that contradicts the instance's `state.customMaxAmps`. Centralised in `src/domain/componentLabel.ts` and consumed by `ComponentNode.tsx`, so the canvas and the panel's location choices finally agree.
- **New `src/store/diagnosisStore.ts` + `diagnosisPersistence.ts`** — session state separate from editor state (§34), reusing the existing `idb-keyval` infrastructure (§20). Per §21 only the seed, version and difficulty are stored; the circuit is regenerated, never persisted.
- **New `src/ui/components/DiagnosisPanel.tsx`** — reachable from Menu → *Diagnosis Lab*.
- **New `scripts/stress-diagnosis.ts`** (`npm run stress:diagnosis`) — 600 scenarios / ~11,000 evaluations. Asserts symptom observability, that the truthful answer plus a real repair always succeeds, that an unrepaired correct guess is always `incomplete`, that **every** decoy location is rejected even on a fully repaired circuit, that no fault type leaks into learner-visible copy, determinism per seed, and score monotonicity. Build p95 1.6 ms, eval p95 0.2 ms.
- Two of this phase's four defects (the palette overlay and the canvas framing) were invisible to a fully green 767-test suite and were found only by **reading rendered screenshots at each viewport**. `fitRegion.test.ts` (18 tests, negative-control verified) and `e2e/diagnosis-lab.spec.ts` (8 tests × chromium + mobile-chrome, asserting on real rendered geometry) now pin both.
- Tests: **59 files / 785 tests**. Typecheck clean; lint reports only the 4 pre-existing `Editor.tsx` hook warnings. Phases A–C harnesses still green.
- **ADR:** `docs/decisions/0004-diagnosis-lab.md`.

### Added — Session 2026-08-18 (v2 Phase C): Challenge Mode

Phase C of the v2 plan (§51 steps 1–11, §14–§22). The first *player-facing* v2 mode: the generator from Phase A/B now drives a real exercise — read a brief, build the circuit, get judged, get scored. **Challenge Mode contains no generator of its own** (§51); it calls the locked `generateChallenge()` and decorates the result.

- **New `src/domain/challenges/challenge/`** — four pure, UI-free modules:
  - `scenario.ts` — turns a generated challenge into a briefing: objective line, brief, parts checklist, connection list, three progressive hints (observation → direction → location), par time and hint budget. The learner's canvas is seeded with **the supply terminals only**, so there is a fixed anchor to build from and the source can't be misplaced.
  - `comparison.ts` — decides "is this the circuit we asked for?" **without ever comparing ids.** Wires reduce to a canonical `type:port|type:port` signature with endpoints sorted, so id relabelling, array order and wire direction are all irrelevant. Cheap multiset gates produce the actionable diffs; a bounded backtracking isomorphism search (`ISOMORPHISM_NODE_BUDGET = 200_000`) settles the rest.
  - `evaluator.ts` — **four gates, cheapest first**: structure → `validateCircuitRules()` → `simulate()` (expected loads must be live) → structural match. Gates 1–3 reuse the existing engines verbatim; only gate 4 is new. Passing 1–3 but failing 4 yields *"it works, but it is not the circuit the brief asked for"* — a distinct, teachable message.
  - `scoring.ts` — 0–1000 points from speed / precision / independence, with a **completion floor of 40 %** so finishing always beats not finishing. Per plan §17 hints are recorded for statistics and cost only ~9 % each — they can never fail a challenge; per §18 attempts are unlimited and taper gently.
- **New `src/store/challengeStore.ts`** — session state (status, attempts, hints, timing), kept separate from ordinary editor state per §34. The learner's circuit stays in `circuitStore`.
- **New `src/store/challengePersistence.ts`** — reuses the **existing** `idb-keyval` infrastructure (§20: "do not create another persistence mechanism"). Two small records: a resumable active run and aggregate stats. Per §21 only the **seed, version and difficulty** are stored — the circuit is regenerated, never persisted — and a `generatorVersion` bump invalidates a saved run rather than silently resuming a different circuit. Every call is non-throwing, so a storage failure can't break the editor.
- **New `src/ui/components/ChallengePanel.tsx`** — reachable from Menu → *Challenge Mode*. Difficulty picker, live objective + progress meter, per-part checklist, staged feedback, hint reveal, completion celebration. Docks right (clear of the Inspector rail) so the component palette stays usable, and collapses to a bottom sheet on phones. Accessibility per §46: verdicts land in a polite live region, the celebration honours `prefers-reduced-motion`, and the progress meter is a native `<progress>` element so it doesn't steal a keyboard tab stop.
- **New `scripts/stress-challenge-mode.ts`** (`npm run stress:challenge`) — 750 scenarios × 6 evaluations. Asserts that a correct rebuild under fresh ids and shuffled arrays **always passes**, and that dropped wires, rewired endpoints, duplicated components, deleted components and the bare starting circuit **always fail**. Every isomorphism verdict is cross-checked against an **independent Weisfeiler-Leman oracle** sharing no code with the implementation: **841/841 agreement**, 3,000/3,000 corruptions rejected, evaluation median **0.11 ms** / p95 **0.34 ms**.
- **Negative controls:** forcing `isomorphic` true and deleting the match gate were each injected and each made the harness fail as intended. A third (erasing port indices from the signature) is caught by `comparison.test.ts` but *not* by the harness — the isomorphism search reads ports directly and stays correct — so both layers are kept deliberately. Documented in the ADR.
- **Symmetric circuits are accepted as equivalent.** When a target has interchangeable branches, swapping them is a genuine automorphism; the WL oracle confirms the two graphs are indistinguishable, so failing the learner would be arbitrary.
- Tests: **50 files / 647 tests** (up from 44/550), plus **6 new Playwright specs** covering the panel on desktop and mobile. Typecheck clean; lint reports only the 4 pre-existing UI hook warnings. `npm run stress:generator` still green — the Phase B foundation is untouched.
- **ADR:** `docs/decisions/0003-challenge-mode-comparison.md`.

### Added — Session 2026-08-18 (v2 Phase B): Generator stress test — **FOUNDATION LOCK**

Phase B of the v2 plan (§56 generator stress test, §57 foundation gate). No new product surface: this phase proves the Phase A generator is a foundation the remaining phases can be built on, then locks that guarantee into CI. **Phase C (Challenge Mode) is now unblocked.**

- **New `scripts/stress-challenge-generator.ts`** (`npm run stress:generator`) — fuzzes the generator far beyond what the unit suite can afford and drives every candidate through the complete challenge loop: **generate → validate → inject fault → verify symptom → repair → verify recovery → replay**. One run covers **3,726 challenges, 223,656 fault injections and 414,574 verified repairs in ~35 s**, across four sweeps:
  1. **Seed fuzz** — 750 seeds × 3 difficulties, recipe chosen by the generator.
  2. **Pinned recipes** — 120 seeds × 12 recipes, so rare recipes get equal coverage rather than weight-proportional coverage.
  3. **Adversarial seeds** — `0`, negatives, fractional, `2^32` wrap-around, `MAX_SAFE_INTEGER`, `NaN`, `±Infinity`.
  4. **Identity collision resistance** — 60,000 identities checked against a 4× birthday-bound budget.
- **Invariants asserted per candidate** (any breach exits non-zero): baseline simulation and BS 7671 validation stay clean; declared loads energise at rest; deterministic replay is byte-identical; a `generatorVersion` bump diverges; identity recomputes from metadata alone; every wire routes orthogonally; the circuit survives a JSON round trip; every fault is observable, is never reported resolved while injected, and fully recovers on repair.
- **Timing budgets enforced by the script** — generation median ≤ 5 ms and p95 ≤ 20 ms per difficulty, full-loop p95 ≤ 120 ms. Measured: generation median **0.24 / 0.31 / 0.63 ms** and p95 **0.41 / 0.51 / 1.00 ms** (beginner / intermediate / advanced); full-loop p95 **6.0 / 13.1 / 28.7 ms**. **Zero generation failures and zero retries** across every sweep.
- **New `src/domain/challenges/generator/foundation.test.ts` (+63 tests)** — the cheap CI mirror of the sweep, so a regression fails `npm test` instead of waiting for the stress run. Covers the §56 loop on 12 seeds per difficulty × 9 fault kinds, plus render/persistence guarantees and a pinned 5-seed regression fixture for each of the 12 recipes.
- **Harness discipline (§57):** fault injection lives only in the script and the test file — never in `src/domain/challenges/generator/**`. The generator still emits clean, fault-free circuits; the existing `src/domain/faults` and `src/domain/simulation` engines do the fault work, with no duplicate fault model introduced.
- **Findings:** no topology or layout defects were found. Two candidate issues were investigated and dismissed with evidence — recipes whose components share a row do *not* produce wires crossing component bodies (the editor's obstacle-aware router resolves all 6,802 sampled wires with **0 diagonal fallbacks**), and `open-earth` is documented as *deliberately* behaviourally silent (a safety defect, not a functional one) and exempted from the observability rule rather than papered over.
- **Negative controls:** the harness was verified to actually fail — determinism, observability, recovery and budget checks were each individually broken and each produced the expected non-zero exit.
- Tests: **44 files / 550 tests** (up from 43/487). Typecheck and lint clean.

### Added — Session 2026-08-18 (v2 Phase A): Deterministic challenge circuit generator

Foundation for the ElectraSim v2 learning modes (Circuit Generator → Challenge Mode → Diagnosis Lab → Ohmageddon). **Phase A only** — the generator stops at a valid circuit; no faults, no challenge scoring, no Ohmageddon (v2 plan §7, §51).

- **New domain area `src/domain/challenges/`**, exported through the `src/domain` barrel:
  - `generator/seed.ts` — mulberry32 PRNG + FNV-1a hashing. `Math.random()` is banned in this tree and a unit test enforces it. `GENERATOR_VERSION = 1`.
  - `difficulty/profiles.ts` — beginner / intermediate / advanced profiles carrying both generator shape knobs (component budget, branch count, run lengths, switching complexity) and the declarative learning knobs later phases consume (hint budget, diagnostic choice count, max fault distance, par time).
  - `generator/recipes.ts` — **12 curated circuit recipes** (4 beginner / 5 intermediate / 3 advanced) with randomised parameters: protected load, switched lighting point, RCBO-protected socket, bell push, two-way staircase lighting, branched lighting, socket + lighting spur, fan + regulator, timed lighting with override, consumer unit with protected branches, mixed socket/lighting installation, contactor-controlled lighting.
  - `generator/topology.ts` — port-checked circuit builder (rejects unknown types, rail mismatches, self-loops, duplicate wires, excessive fan-out).
  - `generator/layout.ts` — deterministic grid-snapped layout using the editor's own `GRID_SIZE` / `COMP_W` / `COMP_H`.
  - `generator/validator.ts` — four baseline gates composing the **existing** engines: structure → `validateCircuitRules()` → `simulate()` (basic *and* pro) → `validateCircuit()` → expected-behaviour check.
  - `generator/generator.ts` — the §7 pipeline with **bounded retries** (max 12, no infinite loop) and a structured failure carrying every rejection reason.
- **API:** `generateChallenge({ seed, difficulty, mode, generatorVersion, rageProfile }) → { circuit, scenario, metadata }`. Pure — no clock, no storage, no store, no React; safe to call from the existing sim worker (no second worker added).
- **Challenge identity (§29):** `hash(generatorVersion, seed, difficulty, mode, rageProfile)` rendered as `ES-CHAL-482917` / `ES-DIAG-482917` / `ES-RAGE-482917`. `dailyChallengeSeed(isoDate)` exists as the §31 hook only; nothing consumes it and no backend is introduced.
- **Generator-safe electrical envelope** (documented in ADR 0002): every generated circuit carries explicit `customCableMm2` and short `lengthMeters` on all wires, caps protective devices at 20 A, and declares diversified socket loads — so the conservative assumptions in `circuitValidation.ts` and `compliance.ts` are satisfied without weakening any existing rule.
- **Tests: +160** (43 files / 487 tests total, up from 36/327). Includes 100 seeds per difficulty run end-to-end through generate → validate → baseline-simulate, determinism and generator-versioning replay, bounded-retry failure, and purity guards.
- **ADR:** `docs/decisions/0002-challenge-generator-foundation.md`.

### Added — Session 2026-08-18 (follow-up 17): Missing real-world components (audit resolution)
- Implemented all components recommended in `COMPONENT_AUDIT_REPORT.md`. Registry grew 91 → **115 components**.
- **Fixed circuits / loads:** `electric-shower` (8.5kW), `immersion-heater` (3kW), `smoke-alarm` (BS 5839-6), `kwh-meter` (supply entry), `extractor-hood`, `underfloor-heating`, `storage-heater`, `heat-pump`, white goods (`dishwasher`, `washing-machine`, `tumble-dryer`, `fridge-freezer`), `burglar-alarm`.
- **Supply / protection / socket:** `earth-rod` (TT earthing), `main-switch` (standalone isolator), `shaver-socket` (bathroom, Reg 701).
- **Surfaced in the palette** (previously hidden pro-tier): `fused-spur` (FCU 13A), `afdd`, `mcb-type-c`, `mcb-type-d`, `mccb`, `diesel-generator`, `rotary-selector-switch`, `smart-relay`.
- Added near-realistic SVG art for the new components and specific component help for the shower / immersion heater / kWh meter.

### Added — Session 2026-08-18 (follow-up 16): UI / UX polish batch
- **Panel layout persistence** — the palette (expanded/collapsed), inspector, and console drawer state are now remembered across reloads (previously reset every time). The palette collapse is now tied to the store's `paletteOpen`, and the Editor applies saved layout on mount.
- **Command palette scope tabs** — the Ctrl+K palette now has **All / Actions / Components** filter tabs, so with ~80 components it's easy to browse just actions or just the addable components.
- **Keyboard shortcuts overlay** — press **`?`** anywhere to open a compact in-editor shortcuts reference (Esc/outside to close). Added `?` and `Ctrl+K` to the docs shortcuts list.
- **Undo toast** — after a delete (component/wire/clear) a transient "Undo (Ctrl+Z)" toast appears at the bottom with an Undo button that invokes the existing undo action.
- **Status-bar zoom % is now clickable** to reset to 100% (the magnifier icon still does Zoom-to-Fit).
- **Recent components in the palette** — the last ~6 placed component types appear in a "Recent" section at the top of the palette (persisted, de-duped).

### Changed — Session 2026-08-17 (follow-up 15): Region-aware demo circuit
- The demo seed circuit now **adapts its socket to the selected plug type.** Previously the demo was a fixed UK circuit, so switching to the US/EU/AU/India showed UK 13A sockets even in the wrong region.
- `buildSeedCircuit(socketType)` is now deterministic (ids reset each call) and parameterised by socket type. A new `swapDemoSocketForPlug(socketType)` circuit-store action rebuilds the seed with the region's socket **only while the circuit is still the unmodified demo** — once the user edits their circuit it is left untouched (no silent rewrite). Detected via a `sameCircuitShape` comparison.
- `primarySocketForPlug(plugSystem)` in `standards.ts` maps a plug system to its primary single socket; the StandardSelector calls the swap when the plug type changes.
- Added 4 regression tests in `circuitStore.test.ts` (pristine swap, repeated swap, no-swap-when-modified, fallback).

### Changed — Session 2026-08-17 (follow-up 14): Region-aware fault simulation
- The fault engine now receives the active electrical standard (`standard` added to `SimulateOptions`), threaded through `useSimulation` → `simulateAsync` → `simulate()`. Switching region now changes fault behaviour, not just validation.
- **Residual-device language & threshold follow the region:** US reports **GFCI** at the 6 mA Class A threshold; UK/EU/International report **RCD** at 30 mA. Ground-fault trip metadata (`currentAmps`/`ratingAmps`) reflects the region's threshold, and trip/error messages name the correct device.
- **Prospective short-circuit fault current scales with the region's supply voltage** — a bolted fault on a 230 V system computes ~460 A (230/0.5 Ω), on a 120 V US system ~240 A. Error text cites both IEC 60898-1 and UL 489.
- Added 2 regression tests in `simulation.test.ts` covering region-aware residual naming/threshold and voltage-scaled prospective fault current.

### Changed — Session 2026-08-17 (follow-up 13): Split electrical standard from plug type
- Australia/NZ, India and South Africa were electrically identical (230 V/50 Hz, IEC colours, RCD, same drop limits) — the only difference was the plug. **Combined them into a single "International" 230 V/50 Hz standard**, so the electrical-standard list is now **UK · US · EU · International** (4, down from 6).
- Added a separate **Plug Type** section to the region dropdown: UK 3-pin (BS 1363) · NEMA (US) · Schuko (EU) · AU/NZ (AS/NZS 3112) · BS 546 (India/South Africa) · All. This is independent of the electrical standard and only controls which sockets show in the palette.
- Added a persisted `plugSystem` setting (`'bs1363' | 'nema5' | 'schuko' | 'as3112' | 'bs546' | 'all'`, default `'bs1363'`). The palette filters regional sockets by it via a new `PLUG_SYSTEMS` map in `standards.ts`.
- Result: a user picks their electrical rules once (e.g. International), then their plug type (e.g. AS/NZS 3112 for Australia) — cleaner and scales to any 230 V/50 Hz country without adding a near-duplicate standard.

### Added — Session 2026-08-17 (follow-up 12): International country / region support
- **Country / Region selector** in the top app bar (always visible, all modes). Selects one of **6 regions**: UK (BS 7671), US (NEC), EU (IEC 60364), **Australia/NZ (AS/NZS 3000)**, **India (IS 732 / BS 546)**, **South Africa (SANS 10142)**. Each sets voltage, frequency, wire colours, circuit ratings, RCD/GFCI thresholds and the compliance standard (reuses the existing standards engine).
- **Palette is now region-aware** — it shows only the selected country's regional sockets (UK 13A, US NEMA 5-15, EU Schuko, AU AS/NZS 3112, India/South-Africa BS 546) plus universal components, keeping the palette relevant instead of bloated.
- **New regional socket components + near-realistic SVG art:** `socket-us` / `double-socket-us` (NEMA 5-15), `socket-schuko` / `socket-schuko-double` (CEE 7/3), `socket-as3112` / `socket-as3112-double` (AU/NZ), `socket-bs546` / `socket-bs546-double` (India/South Africa).
- Removed the duplicate standard selector from the sub-header (it now lives once in the app bar for everyone). Updated pro-features e2e accordingly.

### Changed — Session 2026-08-17 (follow-up 11): Component-aware analytics, wire-joint coverage, motor & selection clarity
- **Analytics / DSO tab is now component-aware.** Previously the Live Measurements + waveform were circuit-level only, so selecting a different component didn't change them. Now, when a single component is selected, the analytics scope to that component's live V/A/W (with a component chip shown), and fall back to circuit totals when nothing is selected.
- **Auto wire-joint now applies to all wire kinds** — bezier, orthogonal, and custom (hand-placed) wires all get a joint dot where they cross (previously bezier-only).
- **Removed the pulsing blue circle behind an energized motor** (the accent halo was confusing; the energized state is already shown by the corner port dot, and the motor's shaft rotor still spins realistically).
- **Wire selection clarity** — the selected wire now gets a clear amber dashed selection ring on top of its existing telemetry label, so it's unmistakable even when "Trace Circuit Path" dims the surrounding network.

### Added — Session 2026-08-17 (follow-up 10): Auto joint at wire crossings + real Live Telemetry
- **New setting "Auto joint at wire crossings"** (Settings → Editing): when enabled, a connection joint (dot) is automatically drawn wherever two **bezier** wires cross, matching the standard schematic junction-dot convention. Implemented as a pure visual overlay (`WireJointsLayer.tsx`) that samples bezier wires into polylines, detects segment intersections (with clustering so dense samples collapse to one dot), and renders a white-haloed joint dot. Orthogonal wires are excluded (grid-routed, rarely cross meaningfully). Default off.
- **Fixed Live Telemetry always showing 0** — `simResult.componentCalculations` was declared in the type and read by the inspector but **never populated by the simulation engine**, so Voltage/Current/Power always read 0 when the simulation ran. The engine now populates `componentCalculations` for energized loads (voltage = supply, current = W/V, power = W) so the inspector's Live Telemetry reflects the real running simulation.

### Changed — Session 2026-08-17 (follow-up 9): Clarify per-component Operating Voltage vs global supply
- The Inspector's per-component **"Operating Voltage (V)"** (under "Custom Electrical Specifications") previously looked like it could change the circuit's supply, but it only set a per-component `customVoltage` design override — it did **not** change the global voltage. This confused users (e.g. setting it on a contactor while the global stayed 230V).
- Resolved (Pro-only design override): in **Student/Basic mode** the Operating Voltage is now **read-only and synced to the actual circuit supply** (global voltage), so it can never diverge, with a note explaining Pro unlocks an override. In **Pro mode** it remains an editable per-component design voltage (used for breaker sizing / compliance), with a tooltip clarifying it doesn't change the global supply.

### Changed — Session 2026-08-17 (follow-up 8): CFL zig-zag fix + realistic motor animation
- **CFL bulb art fixed** — the spiral is now a proper **zig-zag** (four vertical tubes connected by bends at alternating ends) instead of straight lines running bottom-to-top. Added an inner glow line for depth.
- **Motor animation made realistic** — the old behaviour spun the *entire* motor icon 360°; a real motor's body is stationary and only the **shaft rotor** spins. Replaced the rotating image with an inline `MotorGlyph` (static finned body, end caps, terminal box, feet + a rotor on the shaft that rotates via `electrasim-motor-spin`). Verified: body has no spin class, only the rotor group animates.

### Changed — Session 2026-08-17 (follow-up 7): Bulb category art, palette consistency, label overflow, fault-button de-dupe
- **Entire Bulb category upgraded** to near-realistic inline SVG art: Edison incandescent (zig-zag filament), halogen GU10 (reflector + pins), CFL spiral (tube + ballast + screw base), smart RGB (RGB chip row), LED downlight (recessed trim + lens), and fluorescent tube (glass + end caps + pins) — in addition to the existing LED A60.
- **Palette now matches the upgraded canvas art.** The left component palette shows the new near-realistic SVG art for every upgraded default component (previously it still showed the legacy photo thumbnails / emoji). Lighting category included.
- **Fixed canvas label overflow.** Long labels (e.g. "RCD / RCCB (80A 30mA)", "Distribution Board (Consumer Unit)") were wider than the 100px component box and overflowed horizontally. Labels are now truncated with an ellipsis to fit the box (full name remains in the tooltip/inspector).
- **Removed the redundant sub-header "Faults" master toggle.** The app-bar **Fault Lab** button is now the single dedicated fault entry point (it arms manual fault injection and opens the panel), eliminating the duplicate fault control in the sub-header. `pro-features.spec.ts` updated to test Fault Lab instead.

### Added — Session 2026-08-17 (follow-up 5): Near-realistic SVG art for default components (experimental)
- New `src/ui/canvas/componentArt.ts` with hand-drawn **near-realistic lightweight SVG** art for the 20 default seed-circuit component types (DIN-rail MCB, RCD, fuse, UK socket, switches, fan, motor, dimmer, DB, junction box, terminals, contactor, timer, bell, LED bulb).
- Wired into `ComponentNode.tsx` **only for default components** — the upgraded bulbs now use inline SVG instead of photo thumbnails. All other components keep their existing renderer so the two can be compared. Zero network weight, namespaced gradient ids, no console errors.

### Changed — Session 2026-08-17 (follow-up 6): Refined default SVG art per review
- **MCB** — more realistic DIN-rail breaker: terminal clamps + screws, DIN clip, toggle mechanism with recessed handle, red trip-status window, rating plate "B16".
- **UK 3-pin socket** — proper bevel faceplate with 4 corner screws, recessed socket well, earth pin + L/N blades with rounded openings and shutter line.
- **Single-way switch** — glossier rocker with highlight, corner screws, angled rocker for depth, green status pip.
- **Two-way switch** — double-gang-style rocker with L1/L2 indicator dots, angled for depth.
- **4-way junction box** — round screw-on lid with moulded cross pattern, central screw, and four cable entry points around the body.
- **Electric motor** — finned cylindrical body, end caps, shaft, top terminal box, and mounting feet.

### Changed — Command palette fully searchable (Ctrl+K)
- The command palette now indexes the **entire component registry** ("Add <component>" for every component) instead of a hardcoded subset, so Ctrl+K is a real search tool across all actions and all ~80 components.
- Added **↑/↓ arrow-key navigation** with a highlighted active row, Enter-to-run, and multi-token matching (e.g. "add mcb type c"). Still dispatches only existing store actions; no new state.

### Removed — GPU/Pixi renderer scaffolding
- The experimental **PixiJS / WebGL2 renderer** (and its long-parked wire-visibility defect) is removed from the codebase. The Pixi canvas and `pixi` dependency were already absent; this clears the dead scaffolding that remained: the `renderer: 'svg' | 'pixi'` store field + `setRenderer` action, the stale Pixi/WebGL comments in `App.tsx`, `geometry.ts`, `canvas-actions.ts`, `simulation.test.ts`, `ToolDock.tsx`, the "WebGL renderer feature parity" roadmap row in the About tab, and the misleading "are you in GPU mode?" error messages in the Import/Export modal (now a neutral "SVG canvas is not available right now."). **SVG is now the sole renderer.**

### Added — Session 2026-08-17 (follow-up 2): Dedicated Fault Lab panel
- **Fault Lab** is now a real, dedicated fault-injection panel (`FaultLabPanel.tsx`) rather than a shortcut to the telemetry tab. The Pro-mode toolbar button opens a compact amber panel that operates on the currently selected component, with grouped, scannable fault buttons — Open Circuit, Short Circuit, Reverse Polarity, Earth Fault, Switched Neutral (switches), Smooth DC (EV/PV), Arc Fault, Bypass Breaker + Jam Breaker (protection devices) — plus "Clear all" and "Clear fault on selection". It reuses the exact existing circuit-store fault actions (`setComponentFault` / `clearAllFaults`); no fault behaviour is invented.
- Fault Lab is **Pro-only** (matches the "student mode never shows fault UI" rule); the toolbar button shows an amber "Active" state while open and the panel closes with Escape. Added `faultLabOpen` state + actions to the UI store.
- **e2e:** Fault Lab panel open/close and inject-and-clear-on-selection tests added to `e2e/workbench-ui.spec.ts` (+2).

### Added — Session 2026-08-17: Professional Electrical Workbench UI experiment
- **Full-width top application bar** (`Toolbar.tsx`): ElectraSim brand, Undo/Redo, Guides, Student/Pro mode, Validate, primary Run Simulation, new **Fault Lab** button (arms manual fault controls + opens telemetry), Pro Analyze/Stress Zones, command-palette hint, theme toggle, Settings, and the MCB-lever Menu.
- **Simulation context bar** (`SubHeaderBar.tsx`): full-width slim strip under the app bar showing Supply / Components / Wires / Simulation state, preserving the voltage picker, project-name edit, UK/US/EU standard selector, and manual-fault toggle.
- **Collapsible component palette** (`Palette.tsx`): ~260 px expanded / 48 px collapsed rail, search + grouped categories, lightweight SVG glyphs.
- **Canvas floating toolbar** (`CanvasToolbar.tsx`): Select / Wire / Delete / Zoom-Fit / Reset, reusing existing store actions (no duplicate state).
- **Bottom console drawer** (`LogPanel.tsx`): collapsed by default with error/warning counts, expands on click.
- **Editor status bar** (`StatusPill.tsx`): Supply · Live Check · comps · wires · energized · Snap · Grid · Mode · Zoom.
- **Command palette** (`CommandPalette.tsx`, Ctrl+K): searchable overlay dispatching existing actions (Run Sim, Fault Lab, Validate, Zoom-Fit, Toggle Grid, Copy/Delete, Import/Export, Docs, Settings, Add component). Added `commandPaletteOpen` to the UI store + Ctrl+K/Esc bindings.
- Inspector / mini-map / tool-dock repositioned below the new bars.
- **e2e:** `e2e/workbench-ui.spec.ts` (+10) verifying the new shell.

### Fixed
- **Global supply voltage picker was unreachable** (`SubHeaderBar.tsx`): the dropdown opened underneath the full-height left component palette (both `z-20`), so its preset buttons were covered and unclickable in the new workbench layout. Raised the context bar to `z-40` so the dropdown paints above the side panels. Regression test added to `e2e/workbench-ui.spec.ts`.

### Fixed — pre-existing
- **Compliance gate is now Pro-only** (`uiStore.ts`): the default Student-mode demo circuit could never simulate because it contained its own blocking BS 7671 violations (over-rated breaker, excessive voltage drop, missing RCD, B-curve on motor). Validation remains a hard gate in Pro mode but is advisory in Basic/Student mode, restoring the ability to run the demo.
- **Fault-injection e2e now run in Pro mode** (`faults-and-editing.spec.ts`): fault injection is intentionally Pro-only; the harness now switches to Pro so the injection/trip/reset flows exercise the intended path.
- **Hidden-guide pill no longer overlaps the inspector** (`GuidedCircuitPanel.tsx`): moved from `right-14 top-24` to top-center so it can't cover the inspector header collapse button.

### Added — Session 2026-08-15 (part 11): Mini EIC report export
- **Mini Electrical Installation Certificate export** (Import/Export modal → "Mini EIC", or Ctrl+E): a self-contained printable HTML document styled on the BS 7671 Appendix 6 model form — Part 1 installation/supply details (earthing arrangement + Ze), Part 2 a Schedule of Circuit Results populated from the Zs checker (device & rating, RCD type, cable pair, run length, R1+R2, Ze, Zs, max Zs, prospective fault current, ≤0.4 s disconnection, PASS / PASS* / FAIL verdict with the GN3 80 % rule explained), Part 3 signature/test-instrument blanks — plus the on-face "EDUCATIONAL SIMULATION OUTPUT — NOT A CERTIFICATE" banner and an estimated-lengths warning when wires lack lengths. Print/Save-as-PDF via the in-document button.
- `src/lib/export/eicReport.ts` is dependency-free string rendering over `runZsChecks`; all user-influenced labels are HTML-escaped.
- **Unit:** `eicReport.test.ts` (+5) — row values vs zsCheck, FAIL verdict propagation, estimated-length flagging, certificate structure, and markup-injection escaping. **e2e:** download-through-filename-prompt flow asserting the artifact content (+1).


### Added — Session 2026-08-15 (part 10): Zs / disconnection checker
- **Earth-fault loop impedance checker** (Inspector → *Circuit Safety & Validation* tab header): every protective device with an overcurrent curve (MCB/RCBO/AFDD, Types B/C/D) gets a live verdict row — `Zs = Ze + (R1+R2)` against the Cmin-corrected table maximum, with a three-way verdict badge (**PASS (cold ≤80%)** / **PASS (table)** / **FAIL**), prospective fault current, and the furthest-point reference.
- **Standards data (web-verified 2026-08):** BS 7671:2018+A4:2026 Tables 41.2–41.4 are applied as `Zs_max = 230 V × 0.95 (Cmin) ÷ (band × In)` (B 5×, C 10×, D 20×In → B32 = 1.37 Ω, C32 = 0.68 Ω); R1+R2 uses OSG Table I1 20 °C T&E figures (2.5/1.5 mm² = 19.51 mΩ/m etc.); TN-C-S / TN-S Ze selector (0.35 / 0.80 Ω); GN3 80 % cold-measurement rule drives the stricter badge tier. Plain RCDs are noted as relying on upstream overcurrent disconnection; TT/RCD disconnection is documented out of scope.
- `src/domain/zsCheck.ts` (`getMaxZsOhms`, `getR1R2MilliOhmPerMetre`, `checkDeviceDisconnection`, `runZsChecks`) uses weighted Dijkstra over each device's connected network for the furthest-point run length (wires without a length assume 10 m and are flagged "assumed — set wire lengths!"), and deliberately ignores component *recommendedCableMm2* (tail guidance, not run size).
- **Unit:** `zsCheck.test.ts` — 22 tests locking the R1+R2 table (7 sizes), the Cmin max-Zs formula (8 curve/rating points vs tabulated values), pass/cold/fail verdict boundaries, custom ratings, run-length estimation, and per-device row coverage. **e2e:** `zs-check.spec.ts` asserts the panel renders the RCBO template's Type B 32 A 1.37 Ω limit and reacts to the Ze selector.


### Added — Session 2026-08-15 (part 9): AFDD + arc-fault fault type
- **AFDD-RCBO component** (32 A, 30 mA, Type A, B curve — the combined units real consumer units ship) in the Protection palette. It is a full protective device: trips on bolted short, overload, 30 mA+ earth leakage, **smooth DC residual faults when set to Type B** (the RCD-type picker now shows on it), and — uniquely — on **arc faults**. Descriptions cite BS EN 62606 / BS EN 61009-1.
- **New fault: Arc Fault (series/parallel arcing)**, injectable from the context menu (flame-framed component). Simulation semantics per BS EN 62606 / Reg 421.1.7: only AFDDs in the faulted network trip (reason `arc-fault`); networks without an AFDD raise a "NO AFDD IN THIS NETWORK" diagnostic and stop the sim with a dedicated "🔥 ARC FAULT — NO AFDD PROTECTION!" modal that teaches why MCBs/RCDs are blind (arc current ≤ load current, no earth imbalance) and where AFDDs are mandatory (≤32 A socket circuits in HRRBs, HMOs, student accommodation, care homes).
- **Unit coverage** — 5 AFDD tests (AFDD trips with reason `arc-fault`; MCB-only and RCBO-only networks stay closed + Reg 421.1.7 diagnostic; AFDD still trips earth leakage as a 30 mA device; AFDD honours its RCD type for smooth DC). Filter mutation-proven (opening the filter trips every device → exactly the two "stays closed" tests fail).
- **e2e coverage** — "an arc fault with no AFDD in the network stops the sim with the Reg 421.1.7 blind-spot modal" (desktop/tablet).
- Import/export sanitizer now accepts the `arc-fault` and `manual-fault` trip reasons (both are produced at runtime; previously dropped as unrecognised on JSON re-import).

### Fixed — Session 2026-08-15 (part 9)
- Nothing user-facing; two of my new unit fixtures initially mis-wired a 2-port MCB as a 4-port device — the engine correctly reported the resulting bolted short (live bridged into neutral), which read as a test failure until the fixture matched real device topology. Kept as a comment in the test: the simulator caught genuinely wrong wiring.



### Added — Session 2026-08-15 (part 8): RCD types & smooth DC blinding
- **RCD residual-current type model (AC / A / F / B)** — every RCD/RCBO now carries an `rcdType` in component state (default `'A'`, the modern baseline) with a four-way picker in the Inspector ("Residual Current Type": AC sine-only legacy, A + pulsating DC, F + mixed frequency, B all-current-sensitive) plus a live `Type X` badge and a one-line teaching note (BS EN 62423, BS 7671 Reg 531.3.3).
- **New fault: Smooth DC Residual Leakage (EV/PV/VFD)** — injectable from the component context menu or unit tests. Simulation semantics: only a **Type B** residual device in the faulted network trips; blinded Type AC/A/F devices stay closed and raise a per-device `DID NOT TRIP` diagnostic (with their superimposed-DC tolerance — none / ≤6 mA / ≤10 mA), and the sim stops with a dedicated "🌊 SMOOTH DC RESIDUAL — RCD BLINDED!" modal whose resolution hint walks through re-specifying the guarding device to Type B. A same-network Type B device trips with the standard trip modal + reset flow instead. Fault registry entry carries BS EN 62423 / Reg 531.3.3 references; faulted component renders a violet frame.
- **e2e coverage** — `faults-and-editing.spec.ts` gains "smooth DC residual leakage blinds a Type A RCBO but trips it once set to Type B" (desktop/tablet, phone-skipped): Type A blinded (manual-fault modal, no trip marker) → re-spec to Type B in the Inspector → same fault trips the RCBO → clear/reset/clean-run recovery.
- **Unit coverage** — 5 new `simulate` tests: Types AC/A/F stay closed with a blinded warning, Type B trips (reason `ground-fault`), and unset `rcdType` defaults to Type A. Stale legend-text assertions updated (descriptions no longer claim leakage "is not modelled" — it is, since the fault-propagation engine landed).

### Fixed — Session 2026-08-15 (part 8)
- **Context menu could clip off the top of the viewport** — the overflow logic only flipped right/bottom; a tall faulted-component menu (now one row taller with the smooth-DC item) opened by right-clicking a mid-screen component rendered its first rows above the viewport ("element is outside of the viewport" to Playwright, unreachable to users). The menu now flips *and* hard-clamps to an 8 px margin on both axes and scrolls internally (`max-h-[calc(100dvh-16px)] overflow-y-auto`), so every entry is always reachable.


### Added
- **Installation Reference Method selector (BS 7671 Appendix 4)** — every wire now carries an `installationMethod` (C clipped direct / B1 conduit on wall / A in thermal insulation) with a picker in the wire Inspector and a live "base ampacity × Cg = effective A" readout. `getCableAmpacity(mm2, method)` now exposes the three 70 °C PVC copper tables (Method C 16/20/27/37/47/64/85 A, B1 13.5/17.5/24/32/41/57/76 A, A 11/14/18.5/25/32/43/57 A); the melt/overload engine and the per-wire electrical calculation both honour the chosen method. Default stays Method C (back-compat).
- **BS 7671 mV/A/m voltage-drop model** — the per-wire calculation replaces the 20 °C resistivity estimate with the tabulated Table 4D5 figures (T&E 70 °C copper: 44/29/18/11/7.3/4.4/2.8 mV/A/m for 1–16 mm²), falling back to a 70 °C-corrected (×1.2) resistivity model for aluminum and non-standard/AWG-derived sizes. Reported cable resistance is derived from the same mV/A/m so the Inspector's R figure always reconciles with the displayed drop. (The pre-existing 3 %-guidance warning for long/undersized runs is unchanged.)
- **`e2e/faults-and-editing.spec.ts`** (+6 tests × desktop/tablet, phone-skipped) — locks the flows verified live by `scripts/probe5-post-trip.mjs`: bolted short trips the guarding MCB (amber marker + `, tripped` aria + trip modal, reset → re-trip → clear → clean run), earth leakage trips the guarding RCBO, delete→confirm→Ctrl+Z restores, **Ctrl+Z removes an injected fault for good** (no ghost trips), copy/paste duplicates + undo removes, and JSON export downloads through the filename prompt. Also exercises the phone/tablet "Hide guide" hand-off and the "Show guide steps" pill return.
- **Non-destructive "Hide guide"** — hiding the guide panel/sheet (which can overlay canvas components on every viewport, not just phones) no longer ends the challenge: `uiStore.guideHidden` keeps `activeGuideId` alive, progress keeps tracking, and a floating **"Guide steps" pill** (with the objective counter) brings the checklist back. Loading or switching guides always re-reveals the panel.

### Fixed
- **Ctrl+Z left "ghost faults" running** — undo history (`zundo` partialize) tracked `components` (including the mirrored `state.fault` marker) but NOT the `faults` scenario array, so undoing an injection restored the marker while the stale fault kept tripping protection on the next run — invisibly, since nothing in the UI showed it. `faults` is now part of the history/equality slices, with `circuitStore` unit coverage (mutation-proven: fails pre-fix at both unit and browser level).
- **Tripped breakers were invisible on the canvas** — a tripped MCB/RCBO kept aria `", on"` and the green switch-status dot, with no marker that the device had interrupted. Tripped devices now render an amber dashed frame + amber "!" badge (same visual grammar as the fault marker), the switch dot turns amber, and the aria-label gains `", tripped"`.
- **Return-to-guide chip dead-ended the Inspector** — the floating chip was pinned over the Inspector's collapsed icon rail (both `right-4`, z-20), so mid-challenge you could not expand the Inspector without first leaving the guide; and when the drawer was manually expanded the chip slid mid-canvas and swallowed right-clicks on components beneath it. The chip now clears the rail like the other floating controls, is suppressed while the drawer is expanded, and the drawer itself carries an inline *Guide paused → Close inspector and return to guide* strip so the affordance never disappears.
- **Fault-occulted full guide panel** — the expanded-Inspector + no-selection state let the full guide panel render over the drawer's tab strip; it now yields entirely whenever a selection drives the Inspector.
- **Trip-resolve hint gave overload advice for faults** — the "⚡ CIRCUIT PROTECTION TRIPPED!" modal always suggested lowering load power / upgrading the breaker rating even for short-circuit and earth-leakage trips. The hint is now reason-aware: overloads keep the load/rating advice; fault trips direct the user to clear the injected fault and reset the breaker.
- **Short-circuit faults operated no protection** — a bolted L–N short (topology overlap or injected fault) only logged an error while the sim kept "running" the defective circuit; `calculateMCBTrip`/`calculateRCDTrip` were exported but never called by the engine, so no device ever tripped on a fault. Now every short circuit trips the protective devices (MCB/RCBO/fuse/MCCB) guarding the faulted network, with a prospective-current diagnostic (`230 V / 0.5 Ω ≈ 460 A ≫ magnetic zone, cleared <0.1 s per IEC 60898-1`) and the standard tripped-breaker reset flow.
- **Earth-leakage faults tripped every RCD/RCBO on the canvas** — including devices on completely isolated, unconnected networks. Trips are now scoped to the RCD/RCBO devices guarding the faulted network.

### Added
- **`src/domain/simulation/faultPropagation.ts`** — pure wire-graph BFS (`connectedNetworkComponents`, `findProtectionDevicesInNetwork`) mapping a fault to the protective devices sharing its connected network. Header documents the teaching simplification (all in-network devices operate rather than only the nearest upstream device — real selectivity, BS 7671 §536, is flagged for the Zs-checker roadmap item).
- **Fault-propagation regression tests** (+4, 260 total) in `simulation.test.ts`: topology short trips the guarding MCB, injected short trips the guarding MCB, isolated-network devices stay closed, earth leakage trips only the same-network RCD.

### Added
- **Return-to-guide chip** — selecting a component mid-challenge now shows an "Inspector / Guide paused" card with a *Close inspector and return to guide* button (implements the behaviour the two-way-staircase e2e always asserted but the app never shipped).
- **`scripts/visual-sweep.mjs`** — 12-stop Playwright screenshot/console-error sweep across desktop, phone and tablet for visual regression hunting.

### Fixed
- **e2e suite: 12 → 0 failures (27/27 on desktop/mobile/tablet).** Root causes: two pointer-gesture smoke specs re-resolved `.first()` after selection-induced SVG z-order raise (pinned by id; position-only transform compare); guided-circuit specs asserted the pre-redesign StatusPill text ("N active") and a two-circle bulb glow (now one halo); phone flows now hide the guide sheet before tapping canvas components, matching the intended mobile interaction.
- **Expanded Inspector covered the header Toolbar's right end** — `Menu` (and theme toggle) were unclickable while inspecting. Panel now insets below the toolbar (`top-16`).
- **Floating-control collisions** — minimap/ToolDock/StatusPill offsets ignored the 48 px inspector icon rail; StatusPill's Snap/Grid toggles also sat *under* the collapsed rail. Offsets now computed from the true drawer+rail widths per breakpoint.
- **Sub-header pill text wrapped vertically** at tablet widths (nowrap + internal scroll now).
- **Mini-map occluded ~40 % of phone canvases** — hidden below the phone breakpoint.
- Dev-server accepts `.e2b.app` sandbox preview hosts.

### Fixed
- **Standards audit — trip-curve & ampacity data corrected against published references (web-verified 2026-08):**
  - `getCableAmpacity` claimed "BS 7671 Table 4D5" but mixed installation methods: 1.0 mm² and 1.5 mm² returned derated Method-A-ish values (11 A / 16 A) while the rest of the table was Method C. Now consistently Reference Method C (clipped direct): 1.0 → 16 A, 1.5 → 20 A, 2.5 → 27 A, 4 → 37 A, 6 → 47 A, 10 → 64 A, 16 → 85 A, with a header note that Methods A/B and grouping/ambient factors derate further.
  - `calculateMCBTrip` thermal model `t = 3600/(m²−1)` let a 2.55×In overload persist ~654 s — IEC 60898-1 Table 7 mandates trip between 1 s and 60 s. Replaced with a power law fitted exactly through the two IEC anchors (1.45×In → 3600 s, 2.55×In → 60 s), reproducing the published 0.1–45 s Type B response band at 3–5×In.
  - MCB instantaneous trip previously fired from the *lower* band edge (3×In for Type B), where IEC 60898-1 only demands the *no-trip* test; guaranteed magnetic trip is now modelled at ≥ the upper edge (5/10/20×In for B/C/D).
  - `calculateRCDTrip` interpolated linearly from 300 ms → 40 ms, giving 235 ms at 2×IΔn vs the IEC 61008-1 / BS 7671 Table 3A limit of 150 ms. Now a stepped curve: 300 ms @ 1×, 150 ms @ 2×, 40 ms @ 5×IΔn.
- Branch `fix/bs7671-data-accuracy`.

### Added
- **`tripCurves.test.ts` standards-locking regression suite** (+25 tests, 256 total) — every expectation is a published objective value (BS 7671 Table 4D5 ampacities; IEC 60898-1 Inf/If/2.55×In anchors and instantaneous band edges; IEC 61008-1 break times), so the protection physics can no longer silently drift.

### Content verified accurate (no change)
- Blog: BS 7671 Amendment 4:2026 dates (published 15 Apr 2026, Orange Book, A3 withdrawal 15 Oct 2026), AFDD Reg 421.1.7 scope (A2:2022, ≤32 A socket circuits in HRRB/HMO/PBSA/care homes), EICR intervals (5-year statutory PRS England / 10-year owner-occupier recommendation), socket 30 mA RCD requirement, immersion 13 A, EV 7.36 kW @ 32 A.

### Added
- **Component variant imagery** — generated studio-style product photos for the ten component variants referenced by `componentImages.ts` but never committed: RCBO, MCB Type C / Type D, industrial MCCB, SPD, USB / GFCI sockets, cooker switch, dimmer switch, and PIR sensor. The production build no longer fails on unresolved image imports.
- **`ConnectionValidationResult.warnings`** — the connection validator now exposes non-blocking diagnostics as an optional array, matching what the canvas interaction layer expected when logging wire-creation warnings.
- **`WireFaultType` + `isWireFaultType()`** — the legacy per-wire `fault` field now formally supports `open-neutral` and `live-to-earth` (both already handled by the injected-fault simulation pipeline), so Context Menu / Inspector wire-fault buttons typecheck and persist.

### Fixed
- **29 TypeScript errors from `140ed41`** — broken typecheck is green again: widened `WireInstance.fault` / `setWireFault` to the conductor-level fault kinds the UI already offered, restored the accidentally deleted `role="button"` on canvas port hit circles (keyboard / screen-reader reroute flow), switched the inspector sparkline to `state.customVoltage ?? 230` (the removed `def.defaultVoltage`), fixed `state.blown` → `state.isBlown`, and hoisted `FaultTarget` narrowing out of closures in `faults.ts` / `circuitStore.ts` (TS cannot preserve property narrowing across callback boundaries).
- **Modal close semantics** — `Modal` now invokes the *latest* `onClose` synchronously on Escape / backdrop click; the previous animation-wrapped deferral both delayed the callback by 200 ms and could invoke a stale prop. Also fixed the exit-animation effect cancelling its own unmount timer (`isClosing` was a dependency), which left closed dialogs mounted in the DOM forever.
- **Test suite green again** — `MobileSuitabilityModal` spec now awaits the intentional 200 ms exit animation instead of asserting synchronous unmount; validation test fixtures supply the required `controlPoints` field. 231/231 tests passing, `vite build` succeeds.

- **Pro-mode refactor completed** — the Student / Pro toggle now reaches every surface: the Tripped Breaker reset card (gated until the simulation reports `faultsCleared`), full settings persistence for `appMode` and the new `snapToGrid` flag, and a working Snap/Grid status-bar toggle that gates grid snapping on placement and drag-commit.
- **`SimulationResult.faultsCleared`** — the engine now reports whether the last pass produced no error-level findings, so breaker resets are only enabled once the underlying fault is cleared.
- **Dimmer waveform fidelity** — the pro dashboard's phase-cut waveform now reads the dimmer's actual `speed` state instead of a non-existent `dimmerLevel` field.

### Changed
- **Inspector module split** — the 3,166-line `src/ui/components/Inspector.tsx` monolith is now `src/ui/components/inspector/` with one module per view (properties router, wire view, component view, connections, simulation, analytics, logs), a dedicated selection-state hook module, and a variant-family data module. Bodies are verified byte-identical to the originals; `src/ui/components/Inspector.tsx` is now a thin re-export shim, so existing imports keep working.
- **Student / Pro guidance** — the Inspector's "What Happened?" fault analysis and the Toolbar's mode switch carry the full basic/pro split (Student guidance card vs. BS 7671 Pro Customizer).
- **Event-history state contract** — `eventHistoryOpen` is initialized and lint/formatted with the rest of the pro-mode surface (fault alerts, event history, tripped/blown/melt visual states).

### Fixed
- **13 TypeScript errors** blocking `npm run typecheck` after the pro-mode work landed — dead `appMode === 'basic'` comparison inside the pro branch, stale `dimmerLevel`/`resistance` reset fields, missing `faultsCleared` on `SimulationResult`, missing `eventHistoryOpen` in the UI store initial state, `isDark` absent from `CanvasTheme`, `snapToGrid` referenced but never declared, `appMode` dropped from the settings snapshot, and a component-label lookup that read a non-existent `label` property.
- **Restored `.gitignore`** — its rules had been overwritten with prose, leaving `node_modules/` and `dist/` untracked; standard build/test/editor ignores are back in place.
- **Restored canvas keyboard / screen-reader roles** — the v0 roadmap merge had removed `role="button"` from component and wire hitboxes, breaking the accessibility contract locked in `CircuitCanvas.test.tsx` (3 failing tests); the roles are back and the suite is green again.

### Added (refactor follow-ups)
- **Context-menu item builder extraction** — the 507-line `buildItems` target-aware menu definition moved out of `ContextMenu.tsx` into `contextMenuItems.ts` (pure data builders; the dialog component now reads at ~150 lines).
- **Validation report types module** — `circuitValidation.ts` types now live in `circuitValidationTypes.ts`, re-exported from the original path.

### Fixed (refactor follow-ups)
- **Latent lint failure on `role="button"` SVG hit-targets** — the pre-existing `useSemanticElements` error on port circles (unsupressible via comments in Biome 1.9.4 at that nesting) is now handled with a scoped override in `biome.json` for the canvas component-node files; the two stale (never-binding) inline suppression comments were removed. `biome lint` now exits clean with zero warnings for the first time.

## [1.6.1] — 2026-07-21

### Added
- **Two practical Guided Circuits** — Push-Button Doorbell demonstrates momentary press-and-hold control, while RCBO-Protected Socket demonstrates switched Live and Neutral paths with a protective-earth connection and test load.
- **Phone suitability advisory** — first-time phone visitors receive an accessible, dismissible notice that circuit building is easier on a tablet or computer, without blocking continued phone use.

### Changed
- **Clearer learning boundaries** — Push Button, MCB, RCD, RCBO, Contactor, and Bell descriptions now distinguish the simulated path behavior from real numeric overload, leakage, trip-curve, coil, and auxiliary-contact behavior.
- **Improved Bell feedback** — an energised Bell now provides a visible pulse when active-load effects are enabled, while respecting reduced-motion preferences.
- **Focused welcome experience** — first-time guidance prioritises Guided Circuits, direct canvas use, documentation, local storage, and the simulator's educational scope.
- **Homepage search presentation** — the homepage title, main heading, description, and visible supporting copy now identify ElectraSim as a free online electrical wiring simulator using accurate component and browser-use language.
- **Release identity** — root and Astro workspace versions move to `1.6.1`; in-app labels, structured metadata, and versioned marketing-script cache keys continue to inherit the root version.
- **Repository backup target** — the active Git remote and Sveltia CMS repository reference move to the private `cngohar/electrasimw` backup. The previous Cloudflare-connected repository remains recorded only as a legacy reference, and no Cloudflare integration was created for the backup.

## [1.6.0] — 2026-07-20

### Added
- **RCBO component** — a two-pole protection device with separate Live and Neutral input/output paths joins the simulator palette and component reference.
- **Circuit-simulator comparison** — the original `/compare/` route established the sourced comparison direction. The current route is the rebuilt research bench described under v2.0.2: SVG mapping, task signals, interactive matrix, source ledger and complete canonical/structured metadata.
- **Plain-language v1.6 release article** — `electrasim-v1-6-dark-mode-rcbo-comparison-update.md` explains the day's changes without internal implementation or benchmark terminology.
- **Push Button learning guide** — `how-does-a-push-button-switch-work.md` explains momentary and maintained actions, NO and NC contacts, doorbell circuits, contactor holding logic, emergency-stop boundaries, and the simulator's true press-and-hold behavior. A responsive original illustration is included in AVIF and WebP formats.

### Changed
- **True momentary Push Button** — pointer and keyboard press/release now close the contact only while held; interrupted gestures release safely, transient presses stay out of undo history and saved circuits, and labels describe Pressed/Released state.
- **Dark mode across both surfaces** — the app's remaining documentation, context-menu, and phone surfaces follow Light/Dark/System correctly; the marketing site adds a persistent, CSP-compatible appearance toggle and theme-aware page styles.
- **Blog-index structure** — App Updates and regular learning articles have distinct sections and card treatments after each existing page slice is calculated, preserving page counts, canonical URLs, and previous/next links.
- **Contactor learning accuracy** — existing articles now describe the current Contactor as a manual representation of coil state instead of claiming that ElectraSim exposes coil and auxiliary-contact terminals.
- **Release identity** — root and Astro workspace versions move to `1.6.0`; in-app labels, metadata, and versioned marketing-script cache keys continue to inherit the root version.
- **Patched build tooling** — Wrangler is now `4.112.0` and Astro is `6.4.8`, removing the high- and moderate-severity advisories reported by the previous Astro version. Static-site packages are classified as development dependencies so production audits describe the deployed runtime accurately.

### Fixed
- **Protection placement defaults** — components that declare a closed default, including MCB, fuse, RCD, and RCBO, now start closed when placed from the palette.
- **System theme refresh** — switching the app back to System immediately re-reads the current operating-system preference instead of briefly using a stale value.
- **Momentary-state recovery** — imports, local restoration, copying, pointer cancellation, focus loss, and window blur cannot leave a Push Button permanently pressed.
- **Capability wording** — homepage and comparison copy now name the fault scenarios ElectraSim actually supports instead of claiming overload simulation.
- **Homepage cache recovery** — `/sw.js` now retires the obsolete site-wide worker while the active simulator worker remains scoped to `/app/`, preventing an old cached marketing homepage from hiding the real product screenshot after deployment.

## [1.5.1] — 2026-07-18

### Added
- **Flickering-lights safety guide** — `why-do-my-lights-flicker-common-causes-safe-checks.md` explains single-bulb faults, LED/dimmer compatibility, wider circuit warning signs, safe non-invasive checks, and when to call a registered electrician.
- **Supporting internal links** — the fault-finding, dimmer, and lighting-circuit guides now point readers to the dedicated flickering-lights article.
- **Homepage promotion and social copy** — the new guide is included in the curated homepage collection and has a ready-to-publish Facebook entry.

### Changed
- **Plain-language v1.5 article** — the App Update now focuses on everyday user benefits instead of implementation terminology, benchmark tables, code structure, and test counts.
- **Featured-post state** — Guided Circuits is no longer marked featured, leaving the v1.5 App Update as the only featured blog article.
- **Release identity** — root and Astro workspace versions are now `1.5.1`; README, tracking, and roadmap references were updated, while in-app labels, cache keys, and structured data inherit the root package version.

## [1.5.0] — 2026-07-16

### Added
- **Keyboard-operable SVG canvas** — components, ports, and wires expose focusable controls and accessible state; keyboard users can select, wire, and reroute without a pointer.
- **Release performance gates** — built-asset budgets, dense solver and browser benchmarks, generated-link validation, responsive Playwright workflows, and a separate Wrangler-preview production suite.
- **App Update article** — `electrasim-v1-5-performance-accessibility-privacy-update.md` explains the user-facing canvas, accessibility, saving, sharing, privacy, and website improvements in plain language.
- **Production version metadata** — the root package manifest now feeds in-app version labels and `SoftwareApplication.softwareVersion` structured data.

### Changed
- **Dense-canvas interaction path** — pan and multi-component drag use transient DOM transforms, `requestAnimationFrame` coalescing, one release commit, and interaction-time level of detail instead of writing every raw pointer update through React state.
- **Module ownership** — the SVG canvas, Pixi prototype, import/export code, documentation, settings, and Astro marketing routes/styles were split into focused modules with smaller public boundaries.
- **Simulation and persistence** — worker subscriptions, fallback behavior, autosave lifecycle flushing, hydrated-state validation, and IndexedDB failure handling were tightened.
- **Marketing delivery** — responsive AVIF/WebP assets, system fonts, static blog pagination/tag archives, centralized blog helpers, and the combined Vite/Astro deployment pipeline reduce initial work and repeated route logic.
- **PWA caching** — the initial precache favors the public SVG editor while optional renderer chunks are cached only after use.
- **Release identity** — root and Astro workspace packages are unified at `1.5.0`; stale `v1.0`/`v1.1` UI labels and the hard-coded test count were removed.

### Fixed
- **Share-link privacy and bounds** — current links use URL fragments, legacy query links migrate after decode, and decompression is capped before text materialization.
- **Modal and responsive behavior** — focus entry/return, Escape handling, lazy dialog loading, stable canvas dimensions, and phone/tablet layouts now have focused regression coverage.
- **SEO and navigation integrity** — canonical metadata, sitemap ownership, generated tag links, and internal links are validated against the complete production artifact.
- **Strict-CSP deployment drift** — HTML routes send `Cache-Control: no-transform` so delivery-layer transformations cannot inject scripts that conflict with the no-tracking policy.
- **Versionless marketing-script caching** — navigation and scroll controls use release-version query keys, preventing a Cloudflare browser-TTL override from serving old JavaScript after a versioned deploy.
- **Live production validation** — the production Playwright config accepts `PLAYWRIGHT_BASE_URL`, so the same route, header, layout, and offline checks run against Wrangler preview or the public domain.

### Performance
- Initial app entry measured about **112.4 KB gzip JavaScript** and **11.6 KB gzip CSS**, within enforced 115 KB and 15 KB ceilings.
- Dense browser benchmark measured approximately **0.20 ms p95** pointer handling, **0.50 ms p95** pan release, and **5.60 ms p95** group-drag release.
- Dense simulation benchmark measured approximately **1.45 ms p95** against an 8 ms ceiling.
- Automated frame and handler measurements remain release gates; real-device FPS, TTI, memory, and Lighthouse targets remain explicit manual checks.

## [1.4.2] — 2026-06-06

### Added
- **New blog post: `eicr-codes-explained-c1-c2-c3-fi.md`** — deep-dive companion to the existing EICR article. The highest-volume gap in the current cluster: "what does C2 mean on an EICR" is one of the top UK electrical queries. Covers: C1/C2/C3/FI definitions with extended fault tables, fault-to-code mapping (14 real-world faults mapped to their codes), annotated EICR report walkthrough with ASCII example, code combination table (8 combinations), the 28-day landlord deadline with penalties, property sale impact per code, remedial cost estimates per code level, FI resolution process, C3 budgeting guidance, PAT vs EICR distinction, 7-question FAQ. ~3,500 words.
- **Cross-link callouts** added to 4 high-traffic articles (per process rule in `PLAN.md §13`): `when-to-get-an-eicr-electrical-inspection-guide.md` (after the FI section), `consumer-unit-upgrade-what-to-expect.md` (after the EICR Related callout), `how-to-trace-an-electrical-fault-safely.md` (after the EICR Related callout), `5-common-electrical-wiring-mistakes.md` (at the end, before the ElectraSim CTA).
- **Marketing entry #48** appended to `marketing/facebook-article-posts.md` matching the established format.
- `package.json` version `1.4.1` → `1.4.2` (content release; no app code changes).
- `CHANGELOG.md` updated with `[1.4.2]` entry.

## [1.4.1] — 2026-06-06

### Added
- **New blog post: `part-p-building-regulations-explained.md`** — UK regulatory hub article. Top-of-funnel pillar for the existing wiring-cluster. Covers: what Part P is, notifiable vs non-notifiable tables, the three compliance routes (registered competent person / Building Control / minor works exemption), consequences of skipping (sale, insurance, retrospective costs), 13-row common-scenario table, ElectraSim planning workflow, 7-question FAQ, quick-reference summary. ~3,200 words. Internal links out to: EICR, consumer unit upgrade, shed, bathroom, EV charger, outdoor socket, electric shower, immersion heater, cooker, ring main, FCU.
- **New blog category: `Regulations & Safety`** — added to `astro-site/public/admin/config.yml` Category select options. Blog index filter pills auto-generate from the posts collection, so the new category appears automatically on `/blog/`.
- **Cross-link callouts** added to 3 high-traffic wiring guides pointing at the new Part P article (per process rule in `PLAN.md §13`): `how-to-wire-a-shed-or-outbuilding.md`, `how-to-wire-a-bathroom-zone-by-zone-uk-guide.md`, `how-to-install-an-ev-charger-dedicated-circuit-guide.md`. All three contain Part P references and now have a direct Related callout with the new article.
- **Marketing entry #44** appended to `marketing/facebook-article-posts.md` matching the established format (catchy tagline, short description, hook URL, hashtags, ready-to-post version).

## [1.4.0] — 2026-05-16

### Added
- **Fault Simulation Mode** — new ⚠ toggle in the ToolDock. Three injectable fault types:
  - **Wire Break (`open-circuit`)** — click any wire to "cut" it; BFS skips the broken wire so downstream loads go dark. Visual: dashed-red wire + ✕ circle at midpoint.
  - **Reverse Polarity** — click any component; orange dashed border + ↔ badge; simulation emits an error log entry.
  - **Missing Earth** — click any component; yellow dashed border + ⚡ badge; simulation emits a warning log entry.
- **`FaultPanel`** — floating panel (top-center) showing fault type selector, plain-English explanation of each fault, live list of active faults with per-fault remove buttons, and a "Clear all" control. Exiting fault mode auto-clears every fault.
- **`domain/types.ts`** — `FaultType` union (`'open-circuit' | 'reverse-polarity' | 'earth-fault'`); `fault?` field on `ComponentState`; `fault?: 'open-circuit'` on `WireInstance`.
- **`circuitStore`** — `setComponentFault`, `setWireFault`, `clearAllFaults` actions.
- **`uiStore`** — `faultMode: boolean`, `activeFaultType: FaultType`, `setFaultMode`, `setActiveFaultType`.

### Changed
- **`simulation.ts`** — open-circuit wires skipped in `indexCircuit`; fault-annotated components always added to `errorComponents` with descriptive log messages.
- **`CircuitCanvas`** — in fault mode, component/wire clicks inject or toggle faults instead of selecting.
- **`ComponentNode`** — renders fault color ring + badge overlay when `comp.state.fault` is set.
- **`WirePath`** — renders ✕ break marker at wire midpoint when `wire.fault === 'open-circuit'`.
- `package.json` version `1.3.3` → `1.4.0`.

---

## [1.3.3] — 2026-05-15

### Added
- **`astro-site/public/js/scroll-top.js`** — dedicated external script for the scroll-to-top button. Loaded globally via `<script defer src="/js/scroll-top.js">` in `Base.astro`. CSP `script-src 'self'` compliant.

### Changed
- **`blog/index.astro`** — removed server-side `allPosts.slice()` and static pagination HTML. All posts now render into HTML; JS owns all paging and filtering.
- **`blog-filter.js`** — complete rewrite. Single IIFE controller holds `currentFilter` + `currentPage` as shared state. Filter click → resets to page 1, recalculates filtered set, re-renders both cards and pagination. Page click → advances within the filtered set. Pagination nav dynamically injected into `<nav id="pagination">` with ellipsis collapse for long sequences.
- **`blog.css`** — added `button.pg-btn` to pagination selectors (same appearance as `<a>` links).
- `package.json` version `1.3.2` → `1.3.3`.

### Fixed
- **Scroll-to-top button never appeared** — the inline `<script>` added to `Base.astro` was silently blocked by `script-src 'self'` CSP. Moved to `scroll-top.js` external file.
- **Filter and pagination out of sync** — clicking a category filter showed 2 posts but pagination still said "2 pages"; clicking page 2 loaded `/blog/2/` with zero filter state. Root cause: server-side `<a href>` pagination and client-side JS filter had no shared state. Fixed by making JS own both systems; `/blog/2/` static pages remain as SEO fallback only.

---

## [1.3.2] — 2026-05-15

### Added
- **Scroll-to-top button** — fixed chevron-up button (bottom-right, appears after 400px scroll, smooth scroll, fade+slide animation). CSS in `Base.astro` global styles, JS inline in Base — works on every page sitewide.
- **Blog pagination** — `blog/index.astro` (page 1) + new `blog/[page].astro` (pages 2+). `PAGE_SIZE = 9`. Page 1 at `/blog/`, page 2 at `/blog/2/`, etc. Pagination nav with ellipsis, prev/next links, active page indicator. `rel="prev"` / `rel="next"` link tags in `<head>` for SEO.
- **`og:image:alt`** — added `<meta property="og:image:alt">` and `<meta name="twitter:image:alt">` to `Base.astro` (value = page title). Required by Facebook Sharing Debugger and LinkedIn.
- **`WebSite` JSON-LD** — added sitewide `@type: WebSite` structured data with `potentialAction: SearchAction` (Sitelinks Searchbox eligible) and `publisher: Organization` to `Base.astro`.

### Fixed
- Removed unused `remarkPluginFrontmatter` from `render()` destructuring in `[...slug].astro`.
- `PAGE_SIZE` moved inside `getStaticPaths()` in `[page].astro` — Astro bundles `getStaticPaths` separately, module-level const was not in scope.

### Changed
- `package.json` version `1.3.1` → `1.3.2`.

---

## [1.3.1] — 2026-05-15

### Added
- **`/blog/tags/[tag]/`** — 88 tag archive pages auto-generated from collection tags. Each page shows: all posts for that tag (sorted newest-first), a full tag cloud linking to all other tag pages, reading time on cards, breadcrumb nav, `BreadcrumbList` JSON-LD.
- **`astro-site/src/styles/blog.css`** — single dedicated CSS file for all blog pages (index + post + tag archive). Compiled by Vite/Astro to `/_astro/blog.*.css` — a properly cached external stylesheet.
- **`astro-site/public/js/blog-filter.js`** — external category filter script. Loaded with `<script defer src="/js/blog-filter.js">` — no inline JS, CSP `script-src 'self'` allows it.

### Changed
- **`blog/index.astro`** — removed `<style>` block, added `import '../../styles/blog.css'`, replaced inline `<script>` with `<script defer src="/js/blog-filter.js">`.
- **`[...slug].astro`** — removed `<style>` block (including all `:global()` wrappers), added CSS import. Tag items now render as `<a href="/blog/tags/[tag]/">` links.
- **`public/_headers`** — removed `'unsafe-inline'` from `style-src` on both `/*` and `/app/*`. CSP is strict again with no style loopholes.
- `package.json` version `1.3.0` → `1.3.1`.

### Fixed
- Blog index filter now works — the filter script is an external file served from `'self'`, no longer an inline script blocked by CSP.
- Blog index had zero styling — root cause was Astro inlining small page CSS as a `<style>` tag, blocked by `style-src 'self'`. Fixed by moving all blog CSS to a shared external file.

---

## [1.3.0] — 2026-05-15

### Changed (Blog System — SEO + UX Overhaul)

#### `[...slug].astro` — Post Template
- **`article:tag` OG meta** — each tag in the post's `tags` array now emits an individual `<meta property="article:tag">` tag. Google and Facebook use these to categorise the post.
- **Per-post OG image** — `ogImage` prop now uses `post.data.image` when set, falling back to the global `og-image.png`. Enables per-article social previews.
- **Reading time** — word count ÷ 200 wpm shown in post header (`⏱ N min read`). Also emitted as `timeRequired` and `wordCount` in Article JSON-LD.
- **Updated date badge** — when `updatedDate` is set, "Updated DD Month YYYY" badge renders next to the publish date in the header.
- **Prev / Next navigation** — chronological post navigation rendered at the bottom of every post (two-column card layout, responsive single-column on mobile). Uses sort order: newest first = next, oldest first = prev.
- **`dateModified` in Article schema** — always populated (falls back to `pubDate` when `updatedDate` absent).
- **`en-GB` date locale** — dates now display in UK format (14 May 2026) instead of US.
- **`getStaticPaths` refactor** — all posts sorted once, index used for prev/next — single collection fetch.

#### `blog/index.astro` — Blog Index
- **Category filter bar** — client-side pill buttons auto-generated from unique categories in the collection. Active state highlighted. "No results" fallback.
- **Reading time on cards** — every card now shows `⏱ N min read` below the date.
- **Featured post support** — posts with `featured: true` are sorted to the top and shown with a gold ⭐ Featured badge and subtle border highlight.
- **`BreadcrumbList` schema** — JSON-LD breadcrumb for the blog index page.
- **`Blog` schema** — JSON-LD Blog entity with top-10 `BlogPosting` items for Google Discover eligibility.
- **`en-GB` date locale** — consistent with post template.

#### `content.config.ts` — Schema
- Added `image: z.string().optional()` — per-post OG/social image URL.
- Added `featured: z.boolean().default(false)` — pins post to top of blog index.

#### `public/admin/config.yml` — CMS
- **Category options fixed** — added `Wiring Guide` and `Component Guide` (were in use but missing from dropdown).
- **`updatedDate` field** — optional datetime field with hint text; maps to `dateModified` in Article schema.
- **`image` field** — image widget for per-post OG/social image (1200×630px).
- **`featured` field** — boolean toggle to pin post to blog index top.
- **`summary` and `sortable_fields`** — CMS list view now shows title + date and is sortable by pubDate, title, category.
- **Hint text on all fields** — SEO guidance inline in every field.

#### `Base.astro` — Layout
- **`twitter:site`** — added `@electrasim` handle to Twitter Card meta.

### Changed
- `package.json` version `1.2.3` → `1.3.0`.

---

## [1.2.3] — 2026-05-15

### Added (Marketing Site — Content)
- **Blog post: 5 Common Electrical Wiring Mistakes (and How to Avoid Them)** — High-CTR list post with deep internal linking across the full content cluster. Covers: (1) reverse polarity — symptoms, why it’s dangerous even when appliances work, how to detect; (2) missing/disconnected earth — invisible under normal operation, fatal under fault; (3) open ring circuit — all sockets live but cable overheating; (4) overloaded kitchen circuit — load table of common appliances, why diversity assumptions fail in kitchens; (5) wrong MCB rating for cable size — cable CCC vs MCB table, ring vs radial 2.5mm²/32A rule. Includes non-invasive DIY checks (plug-in tester, RCD test, warm socket check), ElectraSim fault simulation walkthrough, quick-reference summary table, and when-to-call-an-electrician guidance. Internal links to 5 existing posts.
- **Homepage blog grid** updated — 12 posts, newest first.

### Changed
- `package.json` version `1.2.2` → `1.2.3`.

---

## [1.2.2] — 2026-05-15

### Added (Marketing Site — Content)
- **Blog post: Ring Circuit vs Radial Circuit: What's the Difference?** — UK-focused wiring topology guide. Covers ring circuit history and dual-path current sharing, radial circuit single-path operation, side-by-side comparison table, how to identify each at the consumer unit, unfused and fused spurs (FCU), BS 7671 floor area and MCB rules, cable sizing table, ring continuity test method (end-to-end resistance + cross-connect), 5 common ring circuit mistakes (open ring, spur-from-spur, 1.5 mm² misuse, kitchen overloading, unsleeved earth), when to use each topology, and ElectraSim simulation walkthrough for both. Targets UK-specific search terms with low competition.
- **Homepage blog grid** updated — 11 posts, newest first.

### Changed
- `package.json` version `1.2.1` → `1.2.2`.

---

## [1.2.1] — 2026-05-14

### Added (Marketing Site — Content)
- **Blog post: Live, Neutral and Earth Wires Explained** — Foundational beginner guide covering the role of each conductor, UK colour codes (old red/black/green vs new brown/blue/green-yellow), the neutral-is-not-earth distinction, earthing fault-protection mechanism (Class I vs Class II), reverse-polarity and missing-earth failure modes, twin-and-earth cable sizing table, earthing systems (TN-S / TN-C-S / TT), protective bonding (main + supplementary), and full ElectraSim simulation walkthrough. Summary comparison table. Targets highest-volume beginner electrical keywords.
- **Homepage blog grid** updated — 10 posts shown, newest first.

### Changed
- `package.json` version `1.2.0` → `1.2.1`.

---

## [1.2.0] — 2026-05-13

### Added (Marketing Site — Content & Security)
- **Blog post: What is an RCD and Why Do You Need One?** — SEO-optimised deep-dive on residual current devices. Covers operating principle (toroidal transformer, 30mA threshold), RCD types (AC/A/F/B), RCBO vs split-load consumer unit, TEST button guidance, and ElectraSim simulation walkthrough. Targets high-volume short-tail and long-tail RCD safety keywords.
- **Blog post: What is a Contactor and How Does It Work?** — Component deep-dive covering coil/armature/contact operation, utilisation categories (AC-1 to AC-4), coil voltage ratings, contactor vs relay vs MCB comparison, DOL starter circuit example, and common faults. Simulation walkthrough via ElectraSim Contactor component.
- **Blog post: Distribution Board Explained: How a Consumer Unit is Wired** — Capstone of the MCB→RCD→Contactor→DB content cluster. Covers internal anatomy (main switch, busbars, RCDs, MCBs, earth bar, SPD), three protection layouts (single RCD / split-load / full RCBO), MCB rating table per circuit type, consumer unit sizing guide, earthing and bonding, common faults, and 3-circuit ElectraSim simulation.
- **Blog post: How to Wire a Two-Way Switch: Complete Guide with Diagrams** — Step-by-step two-way switching guide with COM/L1/L2 terminal explanation, truth table (4 switch-state combinations), ASCII wiring diagram, strapping wire identification, cable colour tables (old + new UK harmonised), intermediate switch extension for 3+ locations, ElectraSim simulation walkthrough, and 5 common mistakes section.
- **Security headers (`public/_headers`)** — Comprehensive Cloudflare Pages security headers across three zones:
  - `/*` — `Strict-Transport-Security` (2yr, includeSubDomains, preload), strict `Content-Security-Policy` (no `unsafe-inline`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo/payment/usb disabled).
  - `/app/*` — tighter CSP (self + `https://plausible.io` only, `worker-src self blob:`).
  - `/admin/*` — relaxed CSP for Sveltia CMS (`unpkg.com` + GitHub API + `unsafe-inline`/`unsafe-eval`).

### Fixed
- **`guide.astro` inline script** — removed `is:inline` attribute and `DOMContentLoaded` wrapper from the scroll-to-top script. Astro now bundles it as a deferred ES module, eliminating the only `unsafe-inline` script on the marketing site and enabling the strict CSP.
- **`index.html` inline Plausible stub** — removed the unnecessary inline Plausible initialisation script from the Vite app shell. Plausible's own async script is self-initialising; the stub was redundant and blocked a strict `script-src` CSP on `/app/*`.

### Changed
- **`package.json` version** — `1.1.0` → `1.2.0`.
- **Homepage blog grid** — updated to show all 9 posts, newest first.

---

## [1.1.0] — 2026-05-10

### Added (Marketing Site — Astro + Sveltia CMS)
- **Astro 6 site** (`astro-site/`) — static landing page, blog, and 5 new pages (About, Contact, Privacy, Terms, Blog Index) built with Astro + Content Collections.
- **Electrical-inspired redesign** — dark `#0a0f1e` theme, animated circuit-trace SVG background, glowing CTA buttons, parallax hero, wire-pulse animations. Unique brand identity across all pages.
- **Sveltia CMS at `/admin/`** — Git-based visual editor for blog posts and all page content (landing hero, features, use cases, CTA). No server required.
- **CMS-driven content** — landing page and blog index text extracted to JSON data files (`src/content/pages/`) editable in the CMS.
- **Blog content collection** — Markdown posts via Astro Content Collections (glob loader, Astro 5 API). First post: "How Household Wiring Works".
- **New pages** — `/about/`, `/contact/`, `/privacy/`, `/terms/` fully SEO-optimised with structured data.
- **`postbuild.mjs`** — merges Vite SPA output (`/app/`) + Astro output (`/`) into a single `dist/` for Cloudflare Pages.
- **PWA SW fix** — `/admin/*` excluded from Workbox precache + `navigateFallbackDenylist`; `_headers` file sets `no-store` on admin routes to prevent stale-cache issues.
- **`NODE_VERSION=22`** set on Cloudflare Pages project via API (Astro 6 requires Node ≥22).

### Changed
- **React SPA moved to `/app/`** — Vite `base: '/app/'` in production; `dist/assets/` moved to `dist/app/assets/`. All PWA manifest `start_url`/`scope` updated to `/app/`.
- **`_redirects`** — SPA fallback rule updated to `/app/* /app/index.html 200`.
- **Footer** — links to About, Privacy, Terms, Contact pages added.
- **Nav** — About link added.

---

## [1.0.0] — 2026-05-01

### Added (Phase 7 — Custom Wiring Mode)
- **`customWiringMode` setting** — new boolean in `settingsStore` (default `false`), persisted to IndexedDB. Toggle in Settings → Editing → "Custom wiring mode".
- **Paint-style multi-step wire placement** — when enabled: click source port to start a polyline; each canvas click adds a corner (checkpoint); click the destination port to commit the entire path as one atomic undo entry. Port type validation and same-component guard run on commit.
- **`pendingCustomPath`** state slice added to `uiStore` (`{ from: PortRef; checkpoints: Point2D[] } | null`) with `startCustomPath`, `addCustomPathCheckpoint`, and `cancelCustomPath` actions.
- **`commitCustomPath`** action in `canvas-actions.ts` — validates the destination, builds a `WireInstance` whose `controlPoints` are the user-placed checkpoints, commits via `addWire` (one undo entry), then clears the pending path.
- **`CustomPathOverlay`** SVG component — renders the committed polyline segments, corner diamond markers, origin dot, and a live cursor indicator. Cursor position is updated via a **rAF DOM-mutation loop** (`requestAnimationFrame` + direct `setAttribute`) — zero React state updates per pointer-move frame.
- **Checkpoint click target** — empty-canvas clicks during custom wiring are handled by the existing grid rect `onClick` and SVG-level `onClick` fallback; components and ports remain on top in SVG paint order so their clicks are never intercepted.
- **`Esc` priority order updated** in `useKeyboardShortcuts`: contextMenu → contact → docs → menu → importExport → settings → pendingDeletion → **pendingCustomPath** → reroute → placing → pendingWireFrom → clearSelection. Cancels without leaving a partial wire.
- **ToolDock** — wire-mode button swaps to a `Pen` icon when `customWiringMode` is on; tooltip explains the interaction; clicking the button cancels an in-flight custom path.
- **DocsPage tip added** explaining custom wiring flow and Esc cancel.
- **README** highlight bullet and implementation-status note updated.

### Changed (2026-05-01 — Domain + find-replace)
- **Domain `electrasim.com` registered** on Cloudflare Registrar (2026-05-01).
- **Project-wide find-replace** `https://electrasim.app` → `https://electrasim.com` across all source files: `index.html` (canonical, OG, Twitter, JSON-LD, Plausible), `public/robots.txt` (Sitemap line), `public/sitemap.xml` (`<loc>`), all doc files (`PLAN.md`, `LAUNCH.md`, `progress.md`, `CHANGELOG.md`).
- Placeholder comments in `index.html` header updated to reflect live domain.
- `wrangler` added as devDependency. `npm run deploy` script added to `package.json`.

### Changed (2026-05-01 — Hosting decision, user-requested)
- **Primary deploy target changed to Cloudflare Pages + Workers** (was Hetzner CX22 + Caddy VPS). Rationale: all compute-heavy work is client-side; server is thin API glue (≤10ms CPU/request). Cloudflare global edge (300+ PoPs) better fits the “trivial horizontal scaling via CDN” goal. Hetzner + Caddy preserved in `PLAN.md §3` as documented self-hosted fallback.
- `PLAN.md §3` Hosting & Deploy section rewritten with primary (Cloudflare) + fallback (Hetzner) paths.
- `LAUNCH.md §3` infrastructure table updated. `LAUNCH.md §8` launch day steps updated with `wrangler pages deploy` command.

### Fixed (Phase 7.1 — Pre-launch polish, 2026-05-01)
- **P1 Ask AI hidden in production** — `Toolbar.tsx` button gated behind `import.meta.env.DEV`; `PhoneDock.tsx` AI button dimmed with `opacity-40` and shows a friendly log message ("v2.0") instead of a dead no-op.
- **P2 Contact form placeholder** — `ContactModal.tsx` now detects `IS_PLACEHOLDER` and renders an amber "coming soon" banner instead of a broken Google Forms link. Replace `CONTACT_FORM_URL` at launch.
- **P3 OG image missing** — `public/og-image.svg` (1200×630) created: branded circuit diagram with gradient bg, dot grid, component boxes, energised wire, feature pills. `index.html` OG/Twitter `<meta>` tags updated to reference it.
- **P4 `App.tsx` stale comment** — Header comment updated to reflect v1.0 completion; removed references to "Phase 2 (current)" and deleted-file `App.legacy.tsx`.
- **P5 `AboutTab` roadmap stale** — Roadmap rows rewritten to reflect all shipped features; version pill changed from `v1.0 · dev build` → `v1.0-rc.1`.
- **P6 Biome formatter** — `npm run lint:fix` auto-fixed 25 files. 16 pre-existing a11y/suppression warnings remain in DEV-only files (no logic errors).
- **P7 `package.json` version** — `0.0.0` → `1.0.0-rc.1`.
- **P9 `PLAN.md` phase table** — phases 6.2, 7, 6.3-slim, 6.11 marked `✅ done`; 7.1 `🔧 in progress`.

### Added (Phase 7.1 — Pre-launch code sweep)
- **`LAUNCH.md`** — new file, the go/no-go gate for v1.0. Nine sections: code health (C1–C10), feature completeness (F1–F23), infrastructure (I1–I6), domain substitutions (D1–D10), quality gates (Q1–Q8), Phase 7.1 polish items (P1–P9), manual smoke-test checklist (23 steps), launch day 18-step sequence, post-launch scope.
- **`PLAN.md` §13** — added cross-reference to `LAUNCH.md` as the live working copy. Phase table updated: 6.2 / 7 / 6.3-slim / 6.11 all marked `✅ done`; 7.1 marked in-progress.
- **`progress.md` roadmap table** — rewritten to reflect all shipped phases.

### Identified (Phase 7.1 — Blockers from code sweep)
- **P1 ❌** `Ask AI` button (`Toolbar.tsx`, `PhoneDock.tsx`) renders but has no handler — must be wired or hidden before launch.
- **P2 ❌** `CONTACT_FORM_URL` in `ContactModal.tsx` is `'https://forms.gle/YOUR_FORM_ID_HERE'` — must be replaced.
- **P3 ❌** `public/og-image.png` does not exist — Twitter/Slack/Discord link previews will be blank without it.
- **P4–P9 ⚠️** Stale `App.tsx` comment, stale `AboutTab` roadmap, 32 Biome formatter warnings, `package.json` version `0.0.0`, `[Unreleased]` CHANGELOG section, stale PLAN.md phase statuses (P9 fixed in this session).

### Added (Phase 6.3-slim — UX Uplift III)
- **Gridless mode** — `showGrid` boolean setting (default `true`). Toggle in Settings → Display. When off, the dot grid is hidden for a clean canvas. Wired through `applyCanvasPreset` → `CanvasTheme.showGrid`.
- **Canvas colour presets** — `canvasPreset` setting with three options: `default` (standard Lab Glass), `high-contrast` (black bg, orange/white/cyan wires, yellow accents — WCAG AA+), `deuteranopia` (orange/indigo/cyan wire palette — no red/green dependency). Applied in `applyCanvasPreset` in `theme.ts`; both light+dark variants handled.
- **Alignment toolbar** — `AlignmentBar` component appears above the canvas whenever 2+ components are multi-selected. Six align buttons (left / centre-H / right / top / centre-V / bottom) + two distribute buttons (horizontal / vertical, visible at 3+ selected). Each action is one atomic undo entry via the new `setComponentPositions` batch action on `circuitStore`.
- **Mini-map** — `MiniMap` SVG overlay in the bottom-left corner. Shows all components as small blue rectangles + a viewport indicator rect. Click to pan the canvas to that world region. Gated by `showMiniMap` setting (default `true`), toggled in Settings → Display.
- **`setComponentPositions` batch action** on `circuitStore` — sets absolute x/y for multiple components in one `set()` call = one undo step.
- **`alignSelected` + `distributeSelected`** exported from `canvas-actions.ts`.
- **`applyCanvasPreset`** helper exported from `theme.ts` — composes base theme + showGrid flag + preset overrides into the final `CanvasTheme`.

### Fixed (Phase 7 — Custom Wiring bug fixes)
- **Pan mode fired on every canvas click** during custom wiring — `handleBackgroundPointerDown` was unconditionally arming `panRef`; fixed with early return when `pendingCustomPath` is active.
- **Component drag armed when clicking destination port** — `handleComponentPointerDown` ran its full drag-setup even in custom wiring mode, interfering with port commit; fixed with early return when `customWiringMode && pendingCustomPath`.
- **Port clicks added checkpoints instead of committing the wire** — the checkpoint `<rect>` was inserted after the components group in SVG paint order, so it sat visually on top and won all hit-tests before port circles could receive events; removed the `<rect>` and moved checkpoint logic into the existing grid rect `onClick` (rendered before wires/components) and the SVG-level `onClick` fallback.
- **Destination ports did not highlight** in custom wiring mode — `pendingFrom` prop was always `null` (custom path uses a separate `pendingCustomPath` slice, not `pendingWireFrom`); added `customPathFrom` prop to `ComponentNode` and unified port valid/pending logic via `activeSrc = pendingFrom ?? customPathFrom`.

### Added (Phase 6.11 — Full UI Dark Mode)
- **`dark:` Tailwind variants applied to all UI panels** — every floating element now responds to the `dark` class on `<html>`.
- **`Editor.tsx`** — `useEffect` toggles `document.documentElement.classList` with `dark` whenever `resolvedTheme` changes, so panels update without a reload.
- **Panels covered:** Toolbar (brand text, Sep, AI button, MenuTrigger), IconBtn, Palette (collapsed button + full panel + search input + item tiles), Inspector (single and multi-select), PillField, LogPanel, ToolDock, StatusPill, MenuOverlay (panel, items, separators, footer), Modal (panel, title header, footer bar), ConfirmDialog, SettingsModal (tab bar, all tab content: TabIntro, ElectricToggle, RoutingStyleSelector, SchemeSelector, AboutTab), ContactModal.
- **Settings copy updated:** "Dark mode (v1.1)" label removed — dark mode is now live. Description updated to "All panels and modals update immediately."
- **DocsPage tip added:** explains how to enable dark mode via Settings → Display.

### Added (Phase 6.2.4 — Copy / Paste)
- **`Ctrl+C`** copies all currently selected components to an in-memory clipboard. Single-component selection works too.
- **`Ctrl+V`** pastes the clipboard onto the canvas. Each paste adds a 24 px stacked offset (`pasteCount × 24`) so repeated pastes don't land on top of each other.
- Pasted components immediately become the new selection (so you can drag them straight into position).
- Paste is a single undoable action — `Ctrl+Z` removes the whole pasted group at once.
- Clipboard is in-memory only (D7 locked — no persistence to localStorage/IDB in v1.0). Clears on page reload.
- New `clipboardStore` (`src/store/clipboardStore.ts`) — lightweight Zustand store with `items`, `pasteCount`, `copy`, `incrementPasteCount`, `clear`.
- New `pasteComponents(items, offset)` action on `circuitStore` — generates fresh unique IDs for each pasted component.
- Fixed bare `V` shortcut guard: now checks `!meta` so `Ctrl+V` paste no longer also switches to select mode.
- `Ctrl+C` / `Ctrl+V` added to the in-app Docs keyboard shortcuts table and two new Tips & Tricks entries added.

### Fixed (Phase 6.2.2f/g — SVG Rendering Performance)
- **Root cause identified & fixed:** `feDropShadow` SVG filter was applied to all 16 component `<rect>`s. Because fan/motor CSS-animated `<text>` children share the same SVG stacking context, every animation step (13 fps) forced Chromium to re-rasterise all 16 filter regions — causing a ~35–40% CPU spike whenever the simulation was running with wires present.
- **`feDropShadow` removed** from both light and dark themes (`shadow: false`). Replaced with a static 2 px offset semi-transparent `<rect>` behind each component card — identical visual depth, zero per-frame cost.
- **Wire glow/halo path removed** — the second `<path>` drawn as a wide semi-transparent halo behind each energised wire (`wireGlowOn`) is removed entirely. `wireGlow: false` on both themes. Each wire now renders exactly 2 paths (invisible hit-target + single animated stroke), down from 3.
- **Wire flow animation re-enabled** (was disabled in 6.2.2e as a workaround). Now that the filter cascade is gone, `stroke-dashoffset` on a plain `<path>` costs only the path itself. Running at `steps(12, end)` / 1.5 s ≈ 8 paints/sec per wire — visually fluid, low CPU.
- **All previous `stroke-dashoffset` mitigation attempts reverted** (the 6.2.2e overlay-path approach that added a 3rd path per wire and made CPU worse is removed).
- Net result: CPU with sim running drops from ~50–65% back to ~15–20% baseline.

### Added (Phase 6.2.3 — Multi-select)
- **Drag-rect selection** — click-drag on the empty canvas draws a dashed rubber-band rectangle; on release, all components whose bounding box overlaps the rect are selected together.
- **Shift-click** — adds or removes individual components from the active selection additively.
- **Group drag** — dragging any selected component moves the entire selection together; all snap to grid on release.
- **Bulk delete** — Delete key (or the "⚡ Delete N components" button in the Inspector) removes all selected components and their wires in a single undoable step.
- **Multi-select Inspector panel** — when 2+ components are selected, the right-hand Inspector shows a summary: count, usage tips, bulk-delete button, and clear-selection button.
- **Multi-select highlight rings** — dashed blue rings drawn around every selected component in a multi-selection (separate from the single-component solid ring).
- `circuitStore` new actions: `moveComponents(ids, dx, dy)`, `removeSelectedComponents()`, `toggleComponentSelection(id)`, `setMultiSelection(ids)`, field `selectedComponentIds: string[]`.
- `uiStore` new field `dragRect` + `setDragRect` for the rubber-band rect (world-space coords).

### Added (Phase 6.3 — UX Polish)
- **Simulation off by default.** `simRunning` now initialises to `false`; users click Run to start. Prevents unexpected animations on first load.
- **Tabbed Settings modal** (`SettingsModal.tsx`) — four tabs: Editing · Display · Simulation · About. Each tab shows a context intro banner and per-setting live-effect preview strip explaining what the toggle does in the current state.
- **Electric-style toggle switches** — all boolean settings now render as animated pill switches with ON/OFF badge, blue glow when active, and decorative circuit-trace lines inside the pill. No more plain checkboxes.
- **About tab** in Settings — brand card with version badge, full tech-stack grid (React 19, Zustand, PixiJS v8, etc.), and roadmap status (shipped / in progress / v2.0).
- **"About ElectraSim"** menu item in `MenuOverlay` now opens the Settings modal directly on the About tab (previously a no-op stub).
- **Export filename prompt** — JSON, SVG, and PNG export buttons now show an inline "Save Circuit As" overlay before downloading. User can customise the filename; extension is appended automatically. Enter confirms, Escape cancels.
- **Canvas right-click menu canvas actions**: "Clear All Wires", "Clear All Components", "Reset to Default Circuit" added to the empty-canvas context menu, matching the items already in the ⚡ menu overlay.
- `uiStore` gained `settingsTab: string | null` and updated `setSettingsOpen(open, tab?)` to support opening Settings on a specific tab.

### Added (Phase 6.3 routing-selector UX)
- Wire routing selector redesigned as large card buttons with icon, name, and description (was a simple two-button row).
- Color scheme selector redesigned as card tiles with icon, label, and sub-description.

### Added
- **`PLAN.md`** — master rewrite plan covering goals, performance budget, locked stack, target architecture, performance techniques, mobile/tablet strategy, future-feature hooks, migration roadmap, and process discipline rules. Single source of truth.
- **ADR 0001** (`docs/decisions/0001-visual-direction.md`) — locks "Lab Glass · Light" as the visual direction.
- `CHANGELOG.md` and `progress.md` to track every change going forward.
- 4 visual direction mockups (Studio Light, Pro Dark, Lab Glass, Lab Glass · Light) for approval — Phase 0b.
- `src/lib/useDevice.ts` — viewport-driven `'desktop' | 'tablet' | 'phone'` hook with Tailwind-aligned breakpoints, used by the new app shell.

### Changed
- **Visual direction locked: "Lab Glass · Light"** (Phase 0b ✅ done). `src/App.tsx` now mounts `LabGlassLight` directly, driven by the real viewport via `useDevice`.
- `src/index.css` — `html, body, #root` set to 100% height; body restores `overflow: hidden` and gains `touch-action: manipulation`, `user-select: none`, and `-webkit-tap-highlight-color: transparent` for the upcoming touch/gesture layer (PLAN.md §6).

### Removed
- Mockup gallery shell, device-frame previewer, and the 3 unchosen directions (`StudioLight.tsx`, `ProDark.tsx`, `LabGlass.tsx`, `MockupGallery.tsx`, `DeviceFrame.tsx`) — Phase 0b artifacts no longer needed.

### Security
- **Removed Gemini API key inlining** from `vite.config.ts`. The previous config injected `GEMINI_API_KEY` into the client bundle via `define`, leaking the key to anyone who downloaded the JS. Going forward, all AI calls will be proxied through the Phase 9 backend (Hono + Bun); the client will only see same-origin `/api/ai/*` endpoints. See PLAN.md §3 / §7.

### Tooling — Phase 0a
- **Strict TypeScript** — `tsconfig.json` enables `strict`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`. Legacy `App.legacy.tsx` is excluded and carries a `// @ts-nocheck` header.
- **Biome** — replaces ESLint + Prettier with a single tool (~10× faster). Config at `biome.json`. Scripts: `npm run lint`, `lint:fix`, `format`.
- **Vitest + RTL + jsdom** — unit/component test runner. Config at `vitest.config.ts`, setup at `src/test/setup.ts` (jest-dom matchers, matchMedia polyfill). First test: `src/lib/useDevice.test.ts` (4 cases, all pass).
- **Playwright** — E2E test scaffold. Config at `playwright.config.ts` covering Desktop Chrome, Pixel 7, iPad Pro 11. First spec: `e2e/smoke.spec.ts`. Browser binaries are NOT auto-installed (`npm run e2e:install` to fetch).
- **FPS overlay** (`src/lib/FpsOverlay.tsx`) — dev-only HUD showing rolling FPS, frame time, and Chromium heap. Toggle with `Ctrl/Cmd + Shift + F`. Tree-shaken from production via `import.meta.env.DEV` in `main.tsx`.
- **Bundle analyzer** — `rollup-plugin-visualizer` integrated into `vite.config.ts` behind `BUILD_STATS=1`. Run `npm run build:stats` to emit `dist/stats.html` treemap.
- **Lefthook** — git hooks (`lefthook.yml`) auto-format + lint staged files via Biome on commit, and remind to update `CHANGELOG.md` + `progress.md` in commit-msg. `npm run prepare` installs hooks (gracefully no-ops if no git repo yet).
- **`tsconfig.e2e.json`** — separate type-check config for Playwright tests with node + Playwright globals.
- **`useDevice` hook** (`src/lib/useDevice.ts`) — viewport-driven `'desktop' | 'tablet' | 'phone'`, Tailwind-aligned breakpoints, SSR-safe.
- **Composite check script:** `npm run check` runs typecheck + lint + tests in sequence.

### Removed (Phase 0a)
- Old `lint` script (`tsc --noEmit`) renamed to `typecheck`. The new `lint` is Biome.

### Smart wire routing — Phase 6.2.1
First sub-feature of the Phase 6.2 UX uplift. Smart (orthogonal, obstacle-aware) routing replaces bezier as the default for **new** wires; existing bezier wires keep their look (PLAN.md §8.2 SR1 — additive coexistence).

**Domain:**
- **`src/domain/types.ts`**:
  - New `WirePathKind = 'bezier' | 'orthogonal'` discriminator.
  - `WireInstance.pathKind?: WirePathKind` — optional for back-compat. JSON written before Phase 6.2 has no `pathKind` and is treated as `bezier`.
  - Removed leftover `z?: number` on `ComponentInstance` that was missed in Phase 6.10's 3D cleanup.
- **`src/domain/geometry.ts`** — new pure functions (no React/DOM, Web-Worker-safe):
  - `computeOrthogonalPath(p1, p2, obstacles, options)` — hybrid algorithm per PLAN.md §8.2 SR2:
    1. **L-route** — try H→V or V→H elbow. Sub-millisecond, hits ~95 % of cases.
    2. **A* fallback** — `aStarOrthogonal()` on a 16 px grid with `MAX_NODES = 4000` and a `timeoutMs` cap (default 200 ms).
    3. **Diagonal fallback** — return `[p1, p2]` so the user always sees a wire even when the grid search exhausts itself.
  - `tryLPath()`, `aStarOrthogonal()`, `collectObstacles()` — exported helpers (also covered by direct unit tests).
  - `simplifyCollinear()` — internal post-processing so A*'s grid path returns only corner vertices.
  - `sampleWire()` updated to dispatch on `pathKind`. Orthogonal wires return their corners verbatim (a polyline).
- **`AABB`** type exported for callers that want to assemble custom obstacle sets.

**Implementation strategy refinement (vs spec):** the locked spec mentioned auto-reroute on component move with debouncing + an `controlPointsLockedByUser` flag. Implementation chose a simpler equivalent: **paths are computed at render time** from the wire's current endpoints + the live components map (mirroring how bezier already works). The dirty-flag rAF loop only re-renders when something changed, and L-route is sub-millisecond, so the perf cost is negligible. Net effect: no auto-reroute machinery needed, no debounce, no lock flag. Spec outcomes (SR1, SR2, SR5, SR6) unchanged. SR3 (lock-on-edit) becomes relevant only when intermediate control-point editing is added (Phase 7).

**Settings:**
- **`src/store/settingsStore.ts`** — new `routingStyle: 'orthogonal' | 'bezier'` (default `'orthogonal'`). Snapshot, hydration check, and persistence subscription updated. Older saved blobs without the field inherit the default on load.
- **`src/ui/components/SettingsModal.tsx`** — new `RoutingStyleSelector` (mirrors the existing `SchemeSelector` pattern) under "Editing" group. Two-button selector: `┗ Smart` / `∿ Curved`.

**Wire creation:**
- **`src/ui/canvas-actions.ts`** — `handlePortClick` now stamps `pathKind` on new wires from `useSettingsStore.getState().routingStyle`. Existing wires (loaded from JSON or already in the store) untouched.

**Renderer:**
- **`src/ui/CircuitCanvas.tsx`** — new `buildOrthogonalPath()` builds an SVG `M…L…L…` path string. The `WirePath` component dispatches on `wire.pathKind` and falls back to `buildWirePath()` (legacy bezier) otherwise. Hit-testing, glow filter, current-flow animation, and selection styles all work unchanged because they're applied to whatever `d` attribute is built. Pixi/WebGL renderer parity deferred to Phase 8 (v1.1) per SR6.

**Tests:**
- **`src/domain/geometry-orthogonal.test.ts`** — 15 new tests covering all 10 spec cases (PLAN.md §8.2):
  - Same Y / same X axis → straight segment.
  - Diagonal endpoints → 2-bend L-route.
  - Single obstacle blocking both Ls → A* finds a path that doesn't clip.
  - Endpoints inside their own component AABB → path still starts/ends exactly at the port.
  - 50-obstacle wall → returns a valid polyline within timeout.
  - Always returns ≥ 2 points.
  - `tryLPath` direct cases: both elbows blocked → null; one elbow blocked → return the other.
  - `aStarOrthogonal` direct cases: routes around an obstacle; respects timeout budget.
  - JSON round-trip preserves `pathKind`; back-compat (no `pathKind`) cleanly round-trips.

**Documentation discipline (Phase 6.10 §13 rule):**
- **`src/ui/components/DocsPage.tsx`** — new "Wiring Style (Smart vs Curved)" card in the Wiring Guide section + new tip in `TIPS`.
- **`README.md`** — new bullet in Highlights; "How wiring works" implementation-status callout updated to "Smart Routing shipped in 6.2.1"; roadmap row added; last-updated stamp bumped.
- **CHANGELOG.md** (this file) — this entry.
- **progress.md** — session entry.

**Bundle:** ~104.49 KB gzip (main; was 102.54 KB pre-6.2.1 → +1.95 KB for the algorithm + selector UI). 89/89 tests passing (was 70 + 15 functional + 4 perf-telemetry). `tsc` zero errors.

#### 6.2.1 hotfix (same session) — idle CPU regression

**Problem reported by user:** after Phase 6.2.1 shipped, CPU usage stayed elevated while the tab was open and dropped immediately when the tab was closed. Root cause traced to two compounding issues with the render-time path computation strategy:

1. `WirePath` is not `React.memo`'d, and the parent `CircuitCanvas` re-renders on every store change (selection click, hover, simulation tick, current-flow animation toggle). So every orthogonal wire re-ran `buildOrthogonalPath` → `collectObstacles` → `computeOrthogonalPath` per render — work that is `O(componentCount)` per wire, so cumulative work per render is `O(wires × components)`.
2. `byId` (the `Map<id, ComponentInstance>`) was being constructed fresh inside the render body — a new object identity every render, which would also break any future `React.memo` on child components.

**Fix:** memoise upstream so pathfinding only runs when geometry actually changes.

- **`src/ui/CircuitCanvas.tsx`**:
  - `byId` Map is now built inside `useMemo` keyed on `circuit.components`. Stable reference identity across no-op renders.
  - New `orthogonalPathD: Map<wireId, string>` built inside `useMemo` keyed on `(circuit.wires, byId)`. The expensive routing now runs only when the components or wires arrays actually change (Immer preserves array identity on no-op updates → re-renders triggered by selection / hover / simulation are zero-cost).
  - `WirePath` now accepts an optional `precomputedD` prop. Orthogonal wires read from this; bezier wires unchanged. Inline fallback retained so the component is still standalone-correct.
  - Net: idle CPU drops to bezier-era levels. Pathfinding is paid only on geometry change (drag, place, delete, reroute) — not on every re-render.

- **`src/domain/geometry-orthogonal.test.ts`** — new "Perf telemetry — Phase 6.2.1 regression guards" suite (4 tests):
  - 1000 L-route calls < 50 ms
  - 1000 L-route calls through 20 obstacles < 200 ms
  - A* fallback respects 200 ms timeout per call
  - Realistic scene (100 short wires, 30 obstacles) < 50 ms total

  Budgets are 3-5× actual measurements on dev hardware to avoid flakes on slow CI but tight enough to catch a real algorithmic regression. Comment in the test source instructs future contributors to *fix the algorithm, not bump the budget*.

**Measured numbers post-fix** (single dev box, Node 20 / Vitest):
- 1000 L-routes (no obstacles): **2 ms** (~2 µs each)
- 1000 L-routes (20 obstacles): **12 ms** (~12 µs each)
- A* worst case: **6 ms** per call
- Realistic 100-wire scene: **3 ms** total

Even without memoisation, 100 orthogonal wires per render is only ~3 ms — but at 60 fps that's still 180 ms/sec of pure routing work, plus the React reconciliation cost on top. The memo eliminates this entirely on idle frames.

### Reduced-effects mode + paint-pipeline rewrite — Phase 6.2.2
User reported sustained high CPU during simulation that pre-dated Phase 6.2.1. Symptom: with only 3 components and a single energised wire, CPU sat at 45–50% while the simulation was running and dropped immediately on pause; stress mode pushed it to 80–90%. Linear scaling with the number of energised elements pointed to per-frame paint cost, not React reconciliation.

**Root cause.** Every energised wire used `<filter id="glow-…"><feGaussianBlur stdDeviation="2.5" /></filter>` AND the `electrasim-wire-flow` `stroke-dashoffset` animation. Same pattern on bulb halos (`feGaussianBlur stdDeviation="4"` + `electrasim-bulb-pulse` opacity). Chromium software-rasterises SVG filters (unlike CSS HTML filters which are GPU-accelerated), and any animated property on the filtered element invalidates the filter cache **every frame**. Net effect: the browser was re-running a Gaussian blur convolution at 60 Hz per energised element. Cost scaled linearly with `# energised wires`, exactly matching the user's measurements.

**Fix — `src/ui/CircuitCanvas.tsx`:**
- Removed the `glow-${filterId}` and `bulb-glow-${filterId}` `<filter>` definitions from `<defs>` entirely; kept the `shadow-${filterId}` drop-shadow (no animation co-occurs on idle components, so its filter cache is stable and free).
- **Wire halo:** replaced with a stroke-based halo — an additional underlying `<path>` with the same `d`, `strokeWidth = main + 5`, `strokeOpacity = 0.22`, no `strokeDasharray`, no `className`. Painted once per render and cached. Visually near-identical to the blur at typical zoom; `O(0)` per-frame work versus the previous `O(blurredPaths)` software-raster cost.
- **Bulb halo:** replaced the filtered circle with two stacked plain circles — outer `r=22, opacity=0.12` (mimics blur falloff), inner `r=14, opacity=0.35` retains the existing `electrasim-bulb-pulse` animation. The pulse is now an opacity-only animation on a non-filtered element, which is GPU-accelerated and free.
- **Reduced-effects gate:** new `wireGlowOn` / `currentFlowOn` / `activeLoadEffects` derivations at the top of `CircuitCanvas` fold both the user setting and the auto-threshold into single booleans before passing them to children. `WirePath` and `ComponentNode` no longer read `theme.wireGlow` directly — keeps the cost of the gate at one place.
- **Auto-threshold:** when `circuit.components.length > 50`, `reducedEffects` flips on regardless of the user setting. So a stress test (~150 components) auto-disables glow + flow animation, and the paint-storm scenario is structurally impossible. Threshold is a constant `REDUCED_EFFECTS_AUTO_THRESHOLD` for easy future tuning.

**`src/store/settingsStore.ts`** — added `reducedEffects: boolean` to `UserSettings` (default `false`), included in snapshot/subscribe diff/persistence. Marked forward-compat in `isPersistedSettings` (older blobs without the key inherit the default — same pattern as `colorScheme` and `routingStyle`).

**`src/ui/components/SettingsModal.tsx`** — added a "Reduce visual effects" toggle in the **Simulation visuals** group. Description explicitly mentions the auto-threshold so users on dense circuits understand why it self-enables.

**`src/lib/FpsOverlay.tsx`** — secondary perf fix discovered during the audit. The overlay's rAF loop ran unconditionally in dev, even when hidden, preventing browser background-throttling and adding ~3–8% idle CPU on weak hardware. Fix:
- Default `visible = false` (was `true`). Localstorage key `electrasim:fps-overlay-visible` still respected for users who toggled it on previously.
- The `useEffect` that schedules the rAF now early-returns when `!visible` and re-mounts when `visible` flips to true. Effect dep array now includes `visible`. Hidden overlay = zero work.
- `Ctrl/Cmd + Shift + F` keybind unchanged.

**`src/ui/components/DocsPage.tsx`** — added a `TIPS` entry pointing users to the new setting.

**`README.md`** — added a Phase 6.2.2 highlight bullet directly below the 6.2.1 entry.

**Verification:**
- `npm run typecheck`: clean.
- `npm test`: 89/89 pass (no test changes; the existing settings + persistence + simulation suites cover the touched code paths).
- `npm run build`: clean. Bundle size unchanged at **104.60 KB gzip** main chunk.

**Expected user-observable impact** (predictions; user to verify on their hardware):
- 3 components + 1 energised wire, sim running: ~45–50% → **~16–18%** (drop from removing the per-frame Gaussian blur on the only energised wire).
- Stress test (`seedStress(50)`) sim running: ~80–90% → **~25–35%** (auto-threshold disables glow + flow animation; energised cues remain via color + opacity + width).
- Idle CPU after load: ~12–15% → **~8–12%** (FpsOverlay no longer running rAF).

**Not yet addressed** (intentionally deferred — under threshold of urgency for v1.0):
- Motors energising while the `feDropShadow` filter is applied still cause a small per-frame raster cost during the `electrasim-motor-pulse` `stroke-width` animation. Only matters when many motors are simultaneously energised, which is rare in practice. Auto-threshold protects stress mode.
- React.memo on `WirePath` / `ComponentNode` + stable parent callbacks. These would help interaction smoothness (hover, drag) at scale but the user's reported pain point was sim-running CPU, not interaction latency. Tracked for a follow-up phase.
- BFS `Array.shift()` in `simulation.ts` (pseudo-`O(W²)` instead of `O(W)`). Negligible below 5,000 wires; safe to defer.

#### 6.2.2b — second-round perf fix (same session)
After the user verified that the **Reduce visual effects** toggle worked correctly, they reported the *default* (toggle off) experience still hit ~50% CPU on three components with one energised wire. With the SVG filters already removed, the only remaining per-frame cost was the **stroke-dashoffset animation on the wire** and the **opacity-pulse animation on the bulb halo**. Each forces a non-cached repaint of the SVG element every frame; on weak hardware those alone added ~25–30% CPU.

**Fix — `src/index.css`:**
- `electrasim-wire-flow` keyframe duration changed from `1.1s linear infinite` to `1.5s steps(36, end) infinite`. `steps(36, end)` quantises the animation to 36 discrete frames per loop = ~24 paints/second (down from ~60). The dashes still appear to flow — the human eye reads ≥24 fps as continuous motion, same logic as cinema. Per-wire paint cost drops ~60%. Users who want the smoothest possible animation can disable it via the existing toggle.

**Fix — `src/ui/CircuitCanvas.tsx`:**
- Bulb halo no longer pulses. Per the user's explicit suggestion ("remove the bulb glow instead put a static yellow orb as an active state"), dropped the `electrasim-bulb-pulse` className from the inner halo circle. The halo is now a static, layered, two-circle orb — outer `r=22, opacity=0.18`; inner `r=14, opacity=0.45` — that *appears* on energise and *disappears* on de-energise, but does not animate while lit. Even an opacity-only animation on a non-filtered SVG element re-rasterises the circle each frame, and the user's measurements showed this contributed ~10% CPU on weak hardware.

#### 6.2.2c — pan + phone-dock UX bugs (same session)
While testing the perf fix the user discovered two unrelated, long-standing UX bugs that were latent because they only manifest in scenarios the prior development sessions hadn't exercised: panning the canvas after components had scrolled off-screen, and using the phone-layout bottom dock (which only appears when `useDevice()` reports `'phone'`, i.e. viewport width < 640 px).

**Bug A — pan never started.**
`handleBackgroundPointerDown` in `CircuitCanvas.tsx` returned early on `e.target !== e.currentTarget`. The intent was "only start a pan when the user clicks the empty SVG area, not a child element". But the SVG has a full-viewBox `<rect>` for the grid that catches every pointer event first, so `e.target` was always the grid `<rect>` and `e.currentTarget` always the `<svg>`. The check was therefore always true and pan **never** started for any user, on any window size. The user only noticed because narrowing the window pushed components out of view, leaving them no other way to recover.

**Fix:**
- Removed the `e.target !== e.currentTarget` guard from `handleBackgroundPointerDown`. Pan now starts whenever pointerdown bubbles up to the SVG. Component pointer handlers already `stopPropagation()`, so component clicks don't trigger pan; ports inherit that. Wires didn't have a pointerdown handler at all — added `onPointerDown={(e) => e.stopPropagation()}` to the `WirePath` group so a click on a wire body still selects it (via the existing onClick) without starting a pan.
- Added a `panDidMoveRef = useRef(false)` flag with a 4 px deadzone. The flag flips true the first time the pointer moves beyond 4 px during pan; the SVG-level and grid-rect-level `onClick` handlers check this flag and short-circuit when set, so a pan-drag no longer triggers the click side effects (deselect, drop placing component, cancel armed reroute) on pointerup. This is the standard "drag vs click disambiguation" pattern.
- Middle-mouse (button 1) pans too, matching every other professional canvas tool.

**Bug B — phone-dock buttons were stubs.**
`src/ui/components/PhoneDock.tsx` rendered four buttons (Add, Layers, AI, Cfg) but the `PhoneBtn` component had **no onClick prop**. None of the buttons did anything since the file was first written in Phase 0b. On any viewport < 640 px (which includes a desktop window resized narrow), the entire bottom dock was decorative. Explains the user's "the plus button or add component button also won't works" report.

**Fix — `src/ui/components/PhoneDock.tsx`:**
- Added `onClick?: () => void` to `PhoneBtnProps`; `<button onClick={onClick}>` in the JSX.
- Wired the four buttons to the matching `useUiStore` actions:
  - **Add** → `togglePalette()` (idempotent — opens the palette if closed; the palette itself drives placement).
  - **Layers** → `toggleInspector()` (component details panel).
  - **AI** → `addLog('AI assistant ships in v2.0 …', 'info')` placeholder. Real action lands in Phase 10. Keeping the slot here prevents re-doing the dock layout when the AI panel is added.
  - **Cfg** → `setSettingsOpen(true)`.
- Added a subtle `transition active:scale-95` to give touch feedback that the buttons now actually do something.

**Verification (6.2.2b + 6.2.2c combined):**
- `npm run typecheck`: clean.
- `npm test`: 89/89 pass.

#### 6.2.2d — fan / motor paint cost + phone palette never rendered (same session)

User re-tested after 6.2.2b/c and reported:
- Bulb-only test: 50% → **10–15% CPU** ✓ (the static-orb + `steps()` fix worked).
- Ceiling-fan test: still pegging at the previous ~50% peak.
- Phone-dock "+ Add" button: still appears to do nothing.

**Bug C — fan / motor rotations re-rasterise the glyph every frame.**
The fan icon is rendered as an SVG `<text>` element with the `electrasim-fan-spin` class applied. CSS `transform: rotate()` on a `<text>` glyph forces the browser to re-rasterise the glyph path at the new angle every frame — same software-paint problem as the wire-flow `stroke-dashoffset`, just with rotation. The motor wheel uses the same pattern (`electrasim-motor-spin`), and the motor stroke-width pulse (`electrasim-motor-pulse`) re-rasterises a path each frame too.

**Fix — `src/index.css`:**
- `electrasim-fan-spin` → `1.4s steps(28, end) infinite` (was `linear infinite`). 20 paints/sec instead of 60. ~67% paint-cost reduction. At 20 fps a rotating disc still reads as smooth motion to the eye; the cost is a barely-perceptible tick-tick quantisation only visible if you stare at it.
- `electrasim-motor-spin` → `2.5s steps(50, end) infinite`. 20 paints/sec, ~7.2°/step (same per-step angular jump as the fan).
- `electrasim-motor-pulse` → `0.9s steps(18, end) infinite`. Eased keyframes become discrete here but for a ±0.5 px stroke-width swing the eye still reads it as a soft breathing pulse.

The reduce-effects toggle still cancels all of these (the `!reducedEffects` gate on `activeLoadEffects` removes the className entirely).

**Bug D — Palette returned null on phone, so the "+ Add" button had nothing to open.**
`src/ui/components/Palette.tsx:76` had `if (isPhone) return null;` — a Phase 0b stub assuming a dedicated bottom-sheet phone palette would ship later. That work is parked for post-v1.0, so until then the phone-dock "+ Add" button (added in 6.2.2c) was correctly toggling `paletteOpen`, but the Palette component refused to render anything in response. The user saw the button "do nothing".

**Fix — `src/ui/components/Palette.tsx`:**
- Removed the `isPhone` early-null. The desktop palette (240 px wide, top-left, full height minus 6.5 rem) fits any viewport ≥ 320 px; the rest of the editor surface stays reachable around it. Added a `void isPhone;` line to keep the prop in the signature for the eventual proper phone palette without triggering an unused-arg lint.

**Verification (6.2.2d):**
- `npm run typecheck`: clean.
- `npm test`: 89/89 pass.
- `npm run build`: clean.

**Note on the user's "should we use an animation library?" question.** The honest answer is: no, an animation library (e.g. Motion, already in our deps) would not help this class of problem. Animation libraries are a win when you have *many* coordinated animations — they batch them under a single rAF loop and avoid layout thrashing. They do not magically GPU-promote SVG attribute animations like `stroke-dashoffset` or `transform` on `<text>`; the cost is intrinsic to the browser's SVG paint pipeline. The two real levers are (1) painting less often (`steps()`, our approach) and (2) painting fewer elements (auto-threshold + reduced-effects mode, also our approach). Library swap would be churn for no measurable win.

### Pre-launch cleanup — Phase 6.10
Lock the v1.0 scope: drop 3D, gate GPU mode to dev, formalise the launch checklist.

**Code (small, surgical):**
- **`src/domain/types.ts`** — removed unused `z?: number` field from `Position` (was a 3D-readiness hook that no code path consumed). Stripped "3D model in later phases" hint from `ComponentDef.icon` comment. Net effect: domain model is now purely 2D.
- **`src/ui/components/Toolbar.tsx`** — wrapped the CPU/GPU renderer toggle in `import.meta.env.DEV`. Production builds no longer surface the Pixi pipeline; the parked GPU wire-visibility bug is no longer user-visible. Pixi code stays in the repo for Phase 8 (v1.1) and remains accessible to dev builds.
- **`src/ui/components/DocsPage.tsx`** — removed the "Toggle to GPU mode" tip from `TIPS`. Added three new tips covering Phase 6.8 features (zoom-to-fit `F`, color scheme selector, PDF / Print). Added the missing `F` shortcut to the `SHORTCUTS` table.

**Documentation (large, deliberate):**
- **`PLAN.md`** — substantial refactor:
  - §1 goal 5 — dropped "3D renderer" from the future-proof list (kept cloud auth + AI).
  - §3 frontend stack — removed the "3D Renderer (future)" row; PixiJS row gained a "**dev-only toggle in v1.0**" qualifier.
  - §4 architecture — removed the `three/` directory placeholder; Renderer interface section retitled "(formalised in Phase 8 / v1.1)" with `Vec2`-typed camera and a 2D `{x, y}` Position note.
  - §5 perf — code-splitting bullet retitled "PixiJS renderer (dev-only in v1.0)".
  - §7 future-features hooks — 3D moved from "Phase 8" to "post-launch (§12)"; backend renumbered to Phase 9 (v2.0); AI to Phase 10 (v2.0); GPU re-enable scoped to Phase 8 (v1.1).
  - §8 phase table — added Phase **6.10** (this entry), reordered remaining v1.0 phases in execution order (`6.10 → 6.2 → 7 → 6.3-slim → 6.11 → 7.1 → PRE-LAUNCH → 🚀 v1.0`), added a new **PRE-LAUNCH** row, dropped the "Phase 9 — 3D renderer" row, renumbered backend (10→9) and AI (11→10).
  - §10 open questions — restructured into Resolved + Deferred-to-pre-launch tables; D5/D6/D7/D8/D9/D-3d-trace-removal all explicitly resolved; D1/D2/D3/D4 explicitly tagged for PRE-LAUNCH.
  - **New §12** — "Post-launch / v2.0+ ideas". Preserves the **full 3D R3F + drei recommendation** verbatim (with library, directory layout, asset pipeline, mobile gating, bundle target). Also documents real-time collab, classroom mode, voice-controlled wiring, OS-clipboard, P2P sync.
  - **New §13** — v1.0 launch checklist with B1–B11 items split across "code & content / infra / quality gates / launch day". Documentation discipline rule (DocsPage + README highlight + walkthrough + CHANGELOG + progress entry) locked here as a v1.0-specific rule.
- **`README.md`** — major rewrite:
  - Tech stack — dropped "Mature 3D wrapper (R3F) for Phase 8" rationale.
  - **New "How wiring works" section** between Highlights and Tech stack — canonical user-facing explanation of **Smart Routing (Phase 6.2 default) vs Custom Wiring (Phase 7 opt-in)** with ASCII illustrations, side-by-side comparison table, FAQ, and implementation status callout. Mirrors the in-app Docs Wiring Guide.
  - Roadmap — split into "v1.0 (in flight)" and "Post-launch (out of v1.0 scope)" tables; new execution order; 3D row demoted to a footnote referencing PLAN.md §12; renumbering notes consolidated.
  - "Known issues" section — GPU wire-visibility bug entry replaced with "None in user-facing v1.0 scope" + Phase 8 deferral note.
- **CHANGELOG.md (this file)** — new `Pre-launch cleanup — Phase 6.10` entry. **Historical entries untouched** per discipline rule.
- **`progress.md`** — session entry with files touched, decisions resolved, perf numbers.

**Decisions resolved (locked in PLAN.md §10):**
- **D2** brand identity → keep placeholder `ElectraSim` + `#2563eb` until launch; pre-launch action items B7/B8/B9.
- **D5** custom wiring spec → both meanings adopted (multi-step + atomic undo).
- **D6** multi-select interaction → drag-rect + Shift-click additive.
- **D7** clipboard scope → in-memory only for v1.0; OS clipboard is a v1.1 candidate.
- **D8** Pixi rewrite vs patch → out of v1.0 scope; decide at Phase 8 kickoff.
- **D9** 3D renderer → dropped from active roadmap; preserved in §12.

**Bundle:** unchanged at **102.54 KB gzip** (main). 70/70 tests passing. `tsc` zero errors.

### Open Enhancements — Phase 6.8
Quick-win UX improvements: zoom-to-fit, dark theme, PDF export.
- **Zoom-to-fit** — `zoomToFit` action in `viewportStore` computes bounding box of all components and adjusts pan/zoom to frame them with padding. Button in `ToolDock` (🔍 icon) + `F` keyboard shortcut.
- **Dark theme** — `labGlassDark` canvas theme tokens in `theme.ts` + `editorBackgroundDark` gradient. `colorScheme` setting (`light` | `dark` | `system`) in `settingsStore` with IDB persistence. `useResolvedTheme` hook listens to `prefers-color-scheme` media query when set to `system`. Three-button selector in Settings modal.
- **PDF / Print export** — `exportPDF()` in `exportImport.ts` renders the circuit SVG in a hidden iframe with a professional title block (title, author, date, footer) and triggers the browser's native print dialog. Zero external dependencies. Button added to Import/Export modal.
- **Bundle:** ~102.54 KB gzip (main), no new dependencies.

### SEO + Plausible Analytics — Phase 6.7
Zero-JS-bundle SEO hardening and privacy-friendly analytics.
- **Meta tags** — `description`, `keywords`, `author`, `canonical`, Open Graph (`og:title/description/image/url/type/locale`), Twitter card (`summary_large_image`).
- **JSON-LD structured data** — `SoftwareApplication` schema for Google rich results.
- **Google Search Console** — placeholder `<meta name="google-site-verification">` ready for token paste.
- **`robots.txt`** — allows all crawlers, blocks `stats.html`, references sitemap.
- **`sitemap.xml`** — single-URL sitemap (SPA), `changefreq: weekly`, `priority: 1.0`.
- **Plausible Analytics** — self-hosted, `<script defer>` in `index.html`. Cookie-free, no consent banner, ~1 KB async load. Placeholder domain `electrasim.app` ready for swap.
- **All placeholders** documented in `index.html` header comment + README. One find-replace on `https://electrasim.app` configures everything.
- **Bundle**: unchanged at **100.68 KB gzip** (Δ ±0 — all changes in HTML + static files). **70/70 tests** passing.

### Right-Click Context Menu — Phase 6.5.2
Context-aware right-click menu on the circuit canvas.
- **Component context** — Select, Toggle (switches only), Start Wire From Here, Delete Component.
- **Wire context** — Select Wire, Reroute Wire (arms select-then-click mode), Delete Wire.
- **Canvas context** — Wire Mode, Select Mode.
- **Shared items** (always visible) — Import/Export, Documentation, Keyboard Shortcuts, Settings.
- **Keyboard shortcuts** shown as `kbd` badges beside each item.
- **Auto-reposition** — menu flips if it would overflow the viewport edge.
- **Click-outside + Escape to close** — highest priority in the Escape chain.
- **Bundle**: 99.51 → **100.68 KB gzip** (Δ +1.17 KB). **70/70 tests** passing.

### Contact Modal — Phase 6.6
Contact popup accessible from the hamburger menu "Contact" item.
- **Instruction panel** — 3-step numbered guide: open form → fill in details → submit.
- **What to include** — categorised guidance: bug reports, feature requests, general questions, each with a coloured pip.
- **Google Forms CTA** — prominent blue button opens the form in a new tab (`target="_blank"`, `rel="noopener noreferrer"`).
- **Configurable URL** — single `CONTACT_FORM_URL` constant at the top of `ContactModal.tsx`. Change the URL and save — hot-reload picks it up immediately.
- **Escape to close** — highest priority in the Escape chain (above docs + menu).
- **Bundle**: 98.73 → **99.51 KB gzip** (Δ +0.78 KB). **70/70 tests** passing.

### Documentation Page — Phase 6.5.1
Full-page in-app documentation, accessible from the hamburger menu ("Documentation" or "Keyboard Shortcuts").
- **6 sections** — Getting Started (5-step walkthrough), Components Reference (auto-generated from `COMPONENT_DEFS`), Wiring Guide (port compatibility, rerouting, embedded circuit placeholder), Keyboard Shortcuts table, Simulation & Faults (path-tracing engine + 4 fault types), Tips & Tricks.
- **Wire-style design** — gradient separators with port pips, coloured section headings, port badges on component cards.
- **Sidebar TOC** (desktop) + **mobile dropdown toggle** — sticky navigation that updates automatically when sections are added/removed.
- **Scroll-to-section** — menu "Keyboard Shortcuts" item opens docs pre-scrolled to `#shortcuts`.
- **Escape to close** — highest priority in the Escape chain, back arrow button in header.
- **Data-driven** — components auto-update from `COMPONENT_DEFS`, shortcuts from the `SHORTCUTS` array. Single-file edit to add/edit/delete sections.
- **Bundle**: 94.42 → **98.73 KB gzip** (Δ +4.31 KB). **70/70 tests** passing.

### Hamburger Menu — Phase 6.5
Centered modal menu overlay with blurred backdrop, replacing scattered toolbar icons.
- **MCB breaker-switch trigger** — top-right toolbar button styled as a miniature circuit breaker lever. Blue (closed) → Red (tripped) on toggle, 35° rotation with spring animation, status dot (green/red).
- **Centered modal** — `fixed` overlay with `backdrop-blur-sm` + `bg-slate-900/20` tint. Panel scales 90% → 100% with `cubic-bezier(0.4, 0, 0.2, 1)` ease-in-out on open/close.
- **Wire-terminal styled items** — each menu entry has a coloured port pip, Lucide icon, label, description, and shortcut badge where applicable. Hover shows current-flow green indicator.
- **9 menu items** — Documentation, Keyboard Shortcuts, Import/Export (`Ctrl+E`), Settings, Clear All Wires, Clear All Components, Reset to Defaults, Contact (`mailto:`), About.
- **Grouped with wire separators** — gradient lines + center dot separate functional groups.
- **Escape to close** — integrated with the global keyboard shortcut handler (highest priority).
- **Toolbar decluttered** — Settings icon, Import/Export icon, and ⋮ Bulk-action dropdown all moved into the menu. Toolbar now: brand + undo/redo + AI + sim toggle + renderer + menu trigger.
- **Bundle**: 93.08 → **94.42 KB gzip** (Δ +1.34 KB). **70/70 tests** passing.

### Bulk-action buttons — Phase 6.9
Three destructive bulk actions (now accessible via the Phase 6.5 menu):
- **Clear all wires** — removes every wire, keeps components. Single undoable transaction.
- **Clear all components** — removes every component AND every wire. Single undoable transaction.
- **Reset to defaults** — replaces the circuit with the seed demo, clears undo history, wipes persisted IDB state and settings. Always shows confirmation dialog (no "don't ask again" shortcut).
- All three gated by the existing `confirmDelete` setting (except Reset which always confirms).
- Contextual confirm-dialog titles and descriptions per action kind.
- Empty-state guards: "Clear all wires" warns if no wires exist; "Clear all" warns if circuit is already empty.
- Click-outside-to-close dropdown (pointer event listener).
- **Bundle**: 92.01 → **93.08 KB gzip** (Δ +1.07 KB). **70/70 tests** passing.

### Import / Export — Phase 6.4
Full-featured circuit import/export system — no backend required.
- **JSON export** (`.electrasim.json`) — schema-versioned (`version: 1`), human-readable (2-space indent), round-trips perfectly. Includes `exportedAt` timestamp.
- **SVG export** — clones the live `<svg>`, inlines animation CSS (wire flow, fan spin, motor spin, bulb pulse, motor pulse), strips interactive attributes. Self-contained static snapshot.
- **PNG export** — rasterises the SVG at 2× scale via offscreen `<canvas>.toBlob()`. Configurable scale factor.
- **Shareable URL** — gzip + base64 the JSON into `?c=…` query param using native `CompressionStream`/`DecompressionStream` (zero deps). ~5 KB cap with user-friendly error if circuit is too large.
- **Boot-time URL decode** — on app start, `main.tsx` checks for `?c=` param, decodes the shared circuit, loads it (overriding IDB save), and cleans the URL via `history.replaceState`.
- **Import/Export modal** (`ImportExportModal.tsx`) — two-tab accessible dialog. Export tab: JSON / SVG / PNG download buttons + share-link copy. Import tab: file picker (`.json`), drag-and-drop zone, paste-JSON textarea with validation. Status messages (success green / error red).
- **Toolbar button** — Download icon replaces the old placeholder Save button. Opens modal.
- **Keyboard shortcuts** — `Ctrl/Cmd+E` toggles Import/Export modal, `Ctrl/Cmd+S` quick-exports JSON, `Escape` closes the modal.
- **Validation & security hardening** — `validateCircuitJSON()` checks schema version, component shapes, known component types (cross-referenced against `COMPONENT_DEFS`), wire shapes, wire endpoint cross-references, and port-index bounds against each component's port count. Additional guards:
  - **File size cap** (10 MB) rejects oversized payloads before `JSON.parse`.
  - **Array length caps** — max 5,000 components, 10,000 wires.
  - **String length cap** (256 chars) on `id` / `type` fields; rejects empty strings.
  - **Numeric range checks** — `isFiniteInRange()` rejects `NaN`, `Infinity`, and coordinates beyond ±100,000.
  - **Prototype-pollution sanitiser** — `sanitiseState()` recursively strips `__proto__`, `constructor`, `prototype` own-keys from component `state`, depth-capped at 8 levels.
  - **Duplicate ID detection** — both component and wire IDs.
  - **Port-index bounds** — cross-checked against `COMPONENT_DEFS[type].ports.length`.
  - **`controlPoints` validation** — each must be `{x, y}` within range; max 50 per wire.
- **SVG ref plumbing** — `CircuitCanvas` gained `externalSvgRef` prop (callback ref pattern) so `Editor` can pass the live SVG element to the modal for SVG/PNG export.
- **Modal shell** — `Modal` component `title` prop made optional so callers can render custom headers (used by ImportExportModal for its tabbed header).
- **Unit tests** — 28 tests in `src/lib/exportImport.test.ts`: round-trip fidelity, pretty-print, state preservation, 8 structural rejection cases, plus 14 security tests (oversized payload, array caps, NaN/Infinity, prototype-pollution stripping, duplicate IDs, port-index bounds, empty strings, negative indices).
- **Bundle**: 87.06 → **91.80 KB gzip** (Δ +4.74 KB for entire feature incl. security hardening). CSS 6.80 KB. **70/70 tests** passing across 8 files.

### Bug fixes — Phase 6.4.1
Three UX bugs surfaced during manual testing, all resolved in a single patch:
- **Bug #1 (high): Palette search non-functional** — the search `<input>` had no `value`/`onChange` bindings — purely decorative. Wired `useState` + `useMemo` filter by label/type (case-insensitive), added an ✕ clear button, and a "No components match" empty state.
- **Bug #2 (high): Esc doesn't cancel component placement** — the global keyboard handler early-returned on *all* keys when any `INPUT`/`TEXTAREA` was focused (e.g. the palette search box). Moved Escape handling *before* the input-focus guard so it universally cancels placement, closes modals, and blurs the input. Other shortcuts still respect input focus.
- **Bug #3 (medium): Excessive console log entries** — `MAX_LOGS` was 200, causing browser hangs on busy circuits. Reduced to **100**. Undo/redo history was already capped at 100.
- **Bundle**: 91.80 → **92.01 KB gzip** (Δ +0.21 KB). **70/70 tests** passing.

### Bug fixes — Phase 6.1.1
All seven CPU/SVG-mode bugs from `PLAN.md § 11` resolved in a single surgical patch:
- **Bug #1 (high): Wire tool + palette conflict** — `setPlacingType` now clears `pendingWireFrom` and `reroute`; `setPendingWireFrom` clears `placingType`. Modes are mutually exclusive.
- **Bug #2 (medium): Fan spin drift** — CSS rotation class moved from the `<g>` wrapper to the inner `<text>` element. The SVG `transform` attribute on the group was being clobbered by the CSS `transform: rotate()`.
- **Bug #3 (medium): Bulb glow outside card** — glow circle radius reduced from 20→14 so the halo stays within the 100×70 component card.
- **Bug #4 (medium): Motor doesn't spin** — new `electrasim-motor-spin` CSS keyframe (2.5 s linear, same `transform-box: fill-box` pattern as fan). Applied to the icon `<text>` element.
- **Bug #5 (medium): Push button lacks ON/OFF indicator** — always-visible status dot added to all switch-type components: bottom-right corner, green (on) / red (off), white stroke.
- **Bug #6 (low): MCB label overflow** — label shortened from "MCB (Circuit Breaker)" to "MCB". Full name remains in the component's `description`.
- **Bug #7 (low): Inspector state plain text** — `PillField` gained a `color` prop (`'success'` | `'danger'`). Inspector switch state now renders **ON** in green, **OFF** in red.
- **Bundle**: 86.99 → **87.06 KB gzip** (Δ +0.07 KB). CSS unchanged. 42/42 tests passing.

### UX uplift — Phase 6.1
- **Settings store** (`src/store/settingsStore.ts`) — Zustand slice + IDB persistence (`electrasim:settings:v1`) with the same hydrate-then-autosave pattern as the circuit store. Four flags: `confirmDelete`, `showTooltips`, `currentFlowAnimation`, `activeLoadEffects`. Defaults are the safest UX. Booted in `main.tsx` via `startSettingsPersistence()`.
- **Settings modal** (`src/ui/components/SettingsModal.tsx`) — accessible dialog (focus trap, Esc, body-scroll lock, ARIA) opened from the toolbar cog. Three groups: Editing, Display, Simulation visuals. Reset-to-defaults button.
- **Confirm-delete dialog** (`src/ui/components/ConfirmDialog.tsx`) — single reusable destructive-action dialog. Component AND wire deletes route through it when `confirmDelete` is on. Includes a "Don't ask again" toggle that flips the setting in place.
- **Wire selection + deletion** — clicking a wire selects it (wide invisible hit-target so it works on touch). `Delete`/`Backspace`, the toolbar trash button, and the dialog all flow through `requestDeleteWire` / `confirmPendingDeletion` in `canvas-actions.ts`.
- **Wire rerouting (both modes)**:
  - **Drag-endpoint handles** — selected wires render two grab dots; drag a dot onto another port to swap that endpoint. Drop on empty space cancels.
  - **Select-then-click (R key)** — `R` arms the selected wire's TO end; press again to swap to FROM; press again to cancel. Next port click commits.
  - Both modes share `applyReroute(wireId, end, target)` and the `circuitStore.rerouteWire` mutator, which validates port-type compatibility, rejects self-loops, and clears stale control points.
- **CPU-mode pan + zoom** — SVG canvas now applies `translate(pan) scale(zoom)` to the world group. Wheel zooms around the cursor; left-drag on background pans; `viewportStore.resetView()` is wired to the Maximize2 button. Toolbar zoom buttons call `zoomBy(1.25)` / `zoomBy(1/1.25)`.
- **Simulation visuals (CSS-only, gated by `useSettingsStore`)**:
  - **Current-flow animation** — energised wires animate `stroke-dashoffset` to suggest current direction.
  - **Bulb glow** — soft pulsing yellow halo behind the icon when energised.
  - **Fan spin** — fan icon rotates while energised (1.4 s linear).
  - **Motor pulse** — energised motors animate stroke-width as a heartbeat.
  - All animations honour `prefers-reduced-motion: reduce`.
- **Component tooltip** (`src/ui/CircuitCanvas.tsx`) — hover a component to see label, ID, switch state, simulation status, port types. Renders outside the world transform so it stays a constant size under zoom. Gated by `settings.showTooltips`.
- **Error boundary** (`src/ui/ErrorBoundary.tsx`) — wraps the editor; render errors show a friendly fallback with reload + retry buttons instead of a blank page. The user's circuit is autosaved so a reload restores their work.
- **Defence-in-depth `.catch`** on `useSimulation`'s `simulateAsync` chain — even though the worker client already falls back to the main thread, an unexpected throw now surfaces as a log entry instead of an unhandled rejection.
- **Tests**: `src/store/settingsStore.test.ts` (3 cases — defaults, debounced save, reset) + `src/store/reroute.test.ts` (6 cases — happy reroute, port-type mismatch, self-loop reject, unknown wire, selectWire semantics). **42/42 passing across 7 files.**
- **Bundle**: default SVG main JS goes 82.23 KB → **86.99 KB gzip** (Δ +4.76 KB for settings store, modals, error boundary, reroute logic, animations, tooltip). CSS 5.78 KB → 6.46 KB gzip (Δ +0.68 KB). Still well under the 250 KB target.

### Persistence + PWA — Phase 6
- **`src/store/persistence.ts`** — IndexedDB autosave layer built on `idb-keyval`:
  - `hydrateCircuit()` validates and restores the saved `Circuit` from `electrasim:circuit:v1` before the first React render. Schema-version mismatch or malformed payloads fall back to the seed.
  - `startAutosave()` subscribes outside React to circuit-store mutations, debounces **250 ms**, and writes a `{ version, savedAt, circuit }` blob. Selection-only updates do not trigger writes (Immer reference equality).
  - `clearPersistedCircuit()` for tests and a future "Reset workspace" affordance.
  - All errors logged once per session; never thrown.
- **`src/main.tsx`** — startup wrapped in an async IIFE (es2020 target). `await hydrateCircuit()` runs **before** `createRoot().render()` so the user never sees a flash of the seed. `startAutosave()` runs immediately after. Service worker registration is production-only (`virtual:pwa-register`).
- **`vite.config.ts`** — `vite-plugin-pwa` with `registerType: 'autoUpdate'`:
  - Manifest: name, short_name, `theme_color #2563eb`, `display: standalone`, three SVG icons.
  - Workbox precache extended to 4 MB per file so the lazy Pixi chunks are also available offline.
  - `devOptions.enabled: false` — SW never runs in dev (would intercept HMR).
- **Icons** — `public/favicon.svg`, `public/pwa-192.svg`, `public/pwa-512.svg` (blue lightning bolt on rounded square).
- **`index.html`** — proper title, theme-color meta, favicon + apple-touch-icon links.
- **`src/vite-env.d.ts`** — added triple-slash reference to `vite-plugin-pwa/client` so `virtual:pwa-register` types resolve under strict TS.
- **Tests**: `src/store/persistence.test.ts` — 6 cases covering empty hydrate, successful hydrate, version mismatch reject, malformed-component reject, debounced save round-trip, and selection-doesn't-save. **33/33 passing across 5 files.**
- **Bundle**: default SVG main JS goes 81.33 KB → **82.23 KB gzip** (Δ +0.90 KB for idb-keyval + persistence). 23 precache entries (817 KiB raw including lazy Pixi). Initial-load cost unchanged.

### Simulation — Phase 5 (Web Worker)
- **`src/sim-worker/sim.worker.ts`** — pure Comlink-exposed `simulate()` running off the main thread. Built as a separate ES-module worker chunk by Vite (`new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' })`).
- **`src/sim-worker/client.ts`** — typed `simulateAsync(circuit)` wrapper:
  - Lazily spins up a single worker on first call; reuses it forever.
  - Falls back to main-thread `simulate()` if the browser lacks `Worker` (jsdom in tests, very old browsers, SSR), or if the worker errors at runtime.
  - Exposes `terminateSimWorker()` and `simWorkerActive()` for tests + telemetry.
- **`useSimulation` refactor**:
  - Calls `simulateAsync` instead of synchronous `simulate`.
  - **Debounce** at 16 ms (one frame) so drag-to-move's per-pointermove `moveComponent` collapses into a single sim run.
  - **Stale-call protection** via a monotonic sequence number — results from older requests are dropped if a newer one is in flight, preventing flicker when the user mutates faster than the worker can return.
  - Pause-mid-flight: if the user toggles sim off while a worker call is pending, the result is discarded.
- **Tests**: `client.test.ts` (3 cases) verifies the fallback path under jsdom — output identical to synchronous `simulate()`. **27/27 passing**.
- **Bundle**: `sim.worker-…js` 10.68 KB (worker chunk, only loaded by browsers that support workers). Main bundle gained ~2 KB gzip from comlink. SVG default total: **81.30 KB gzip**.

### Simulation / Renderer — Phase 5 hardening
- **Worker init warning fixed** — restored the Vite `?worker` static import path in `src/sim-worker/client.ts`, eliminating the browser warning **"Attempting to create a Worker from an empty source"** and preserving a real emitted `sim.worker-*.js` chunk.
- **Wire idle-dim moved off stroke alpha** — `PixiCanvas.updateWireNode()` now sets `Graphics.alpha` (display-object property) for the energised/idle dimming and explicitly forces `g.visible = true` on every redraw. Stroke is drawn with no alpha. The display-object alpha mixin is more reliable than `strokeStyle.alpha` in Pixi v8's bezier batcher.
- Verification: `npm run typecheck` ✅ and `npm run build` ✅.

#### Known issue — GPU mode wire visibility (deferred)
- **Symptom:** in GPU/Pixi mode, toggling the **Live/Run** button hides wires until the next toggle. CPU/SVG mode is unaffected. Wires also intermittently fail to render when first switching from CPU to GPU. Console emits `WebGL context was lost.` and Pixi v8 `texImage` warnings on the affected machine.
- **Tried & reverted:** replacing the underlying `Graphics` object on every diff (no effect, wasteful, removed).
- **Tried & kept:** display-object-alpha dimming + explicit `visible = true` (above). Removes a known Pixi v8 footgun and one failure mode, but does not fully resolve the bug for the reporting user.
- **Decision:** park the bug. GPU mode is opt-in and lazy-loaded; CPU/SVG is the default and stays the supported path. We will revisit the Pixi pipeline (likely with explicit context-loss recovery and a Playwright harness) during Phase 7 (Renderer abstraction).
- See `progress.md` entry **"2026-04-26 — Phase 5 hardening (cont.)"** for the full diagnosis, hypotheses, and remaining theories.

### Renderer — Phase 4 hardening (post-ship bug fixes)
A round of Pixi-specific fixes from real interactive testing:
- **StrictMode init race** (`Application _cancelResize is not a function`) — track `initDone`; defer destroy until init resolves.
- **`renderer is undefined` on first paint** — gate scene-sync effect on a `ready` state set only after init + layer attach.
- **Text/icon blur when zooming in** — initial `Text.resolution = max(2, DPR)`; `updateTextResolution(zoom)` re-rasterises on viewport changes (capped 4×).
- **Zoom lag with 200+ components** — grid drawn once at init (lives in world space), preview layer early-outs when no ghost/rubber-band is pending.
- **Wiring broken on trackpads** — switched port handlers from `pointertap` (sub-pixel jitter sensitive) to `pointerup`. Added `e.target === container` guard on container drag-start.
- **Palette placement broken on GPU** — `isBareCanvas(target)` helper recognises `stage`, `world`, *and* `grid` as "bare" since `world.eventMode = 'static'` makes it the bubble target.
- **Wire to freshly-placed component invisible on first paint** — Pixi v8 parent batcher snapshots child set; if you `addChild` then build geometry, first paint skips it. Fix: build geometry, *then* `addChild`. Applied to both `diffComponents` and `diffWires`.
- **Duplicate component on placement** — moved drop logic from `pointerup` to `pointerdown` (Pixi v8 dispatches `pointerup` redundantly through forwarder containers; `pointerdown` doesn't have this quirk and gives snappier UX).
- **Phantom of dragged component left at original position** — root cause: `app.ticker.stop()` + manual `app.render()` skipped framebuffer clearing on some hardware. Reverted to auto-ticker; idle CPU on GPU tab is back to ~5–10 % but visual correctness wins. On-demand rendering deferred to a later phase with explicit clear-before-render.

All bug-fixes preserve the Phase 4a/4b feature set (renderer toggle, culling, LOD, stress button) and the SVG path is unchanged.

### Renderer — Phase 4b (culling + LOD + stress test)
- **Viewport culling** in `PixiCanvas.cullAndLOD()` — every component AABB is intersected against the viewport in world space; off-screen components have `.visible = false` so PixiJS skips them entirely. Wires whose both endpoints are culled are also hidden. Linear scan is sub-millisecond up to a few hundred items; documented upgrade path is RBush for n ≥ ~1000.
- **2-tier LOD** — at zoom < 0.85 the per-component ID text is hidden; at zoom < 0.6 the human-readable label is also hidden. Drops Pixi `Text` paints by 50–66 % when zoomed out, which matters because `Text` uploads textures to the GPU.
- **`src/store/stress.ts`** — `seedStress(branches)` adds N closed lamp branches (live → switch → bulb → neutral) so both renderer and simulation are exercised. `clearAll()` wipes the circuit.
- **Dev-only Stress button** in the toolbar (gated by `import.meta.env.DEV`, tree-shaken from production):
  - Click → +50 branches (~100 components / 150 wires).
  - Shift-click → wipe and respawn 100 branches (~200 components / 300 wires).
  - Alt-click → clear circuit.
- Production bundle holds at **79.27 KB gzip** (Δ +0.01 KB vs Phase 4a) — Vite's dead-code elimination drops the stress utilities and the whole stress button branch when `DEV` is false.

### Renderer — Phase 4a (PixiJS WebGL2)
- **`src/ui/PixiCanvas.tsx`** — full WebGL2 renderer for the editor. Drop-in replacement for `CircuitCanvas` with the exact same prop contract; the user toggles between renderers from the toolbar.
  - **Retained scene graph** with five layers (`grid`, `wires`, `preview`, `components`, plus the world container that applies pan/zoom). On every store change the renderer **diffs** the live scene against the new circuit and only mutates affected nodes — no full redraw, no Graphics churn.
  - `Map<id, CompNode>` and `Map<id, WireNode>` keep DisplayObjects long-lived across hundreds of simulation ticks.
  - **Pan** by dragging on bare background (or middle/right mouse). **Zoom** with the wheel — zoom centres on the cursor by reading `viewportStore.zoomBy(factor, centre)`. Mouse position is fed into `viewportStore.mouse` so the rubber-band wire and ghost-component preview follow the cursor without React re-renders.
  - Component nodes are clickable + draggable in WebGL space (drag uses canvas → world coordinate inversion via `pan`/`zoom`); ports are individually hit-testable for wire creation.
  - Energised + faulted highlighting is computed in `updateComponentNode`/`updateWireNode` from the same `simResult` the SVG renderer reads, so visuals stay 1:1.
- **Lazy-loaded** via `React.lazy` + `Suspense`. Users on the default SVG renderer never download Pixi (~150 KB gzip stays in a separate chunk that only fetches when the toolbar toggle flips to `'pixi'`).
- **`src/ui/canvas-actions.ts`** — extracted renderer-agnostic business logic shared by SVG and Pixi (wire validation, port-click state machine, palette drop, drag commit). Single source of truth.
- **`uiStore`** gained `renderer: 'svg' | 'pixi'` + `setRenderer()`.
- **`Toolbar`** — new "CPU/GPU" pill toggles renderer live; purple while WebGL is active.
- **`viewportStore`** — finally consumed (idle since Phase 2). The Pixi renderer subscribes outside React via `useViewportStore.subscribe(...)` so 60 Hz pan/zoom updates don't trigger React re-renders.

### Bundle impact (Phase 4a)
- **Default (SVG)**: 79.26 KB gzip JS — Δ +0.97 KB vs Phase 3.5 (just the toggle pill + lucide icon).
- **WebGL on demand**: lazy chunks total ~150 KB gzip (Pixi core, WebGL/WebGPU/Canvas renderers, worker harness). Loaded only when the user opts in.
- Both still under the 250 KB initial-load target.

### UI — Phase 3.5 (Palette → canvas placement)
- **Click any palette tile** to enter placement mode. A dashed-outline ghost preview of the component follows the cursor (snap-aligned to the 24 px grid). Click the canvas to drop. The placed component is auto-selected, logged to the console, and made undoable via the same `addComponent` mutation that has been there since Phase 2.
- **Cancel** with **Escape** or by clicking the active palette tile again. The active tile shows a blue ring while a placement is pending.
- **`placingType`** added to `uiStore` with a `setPlacingType()` setter that also flips `mode` to `'placing'` (and back to `'idle'` on cancel/drop).
- **`InteractionMode`** in `src/domain/types.ts` extended with `'placing'`.
- `ToolDock` props use the shared `InteractionMode` type instead of an inline union (kept compatible with the new mode).

### UI — Phase 3 (Component split + interactivity)
- **`src/ui/components/`** — 7 small memoized panels extracted from the previously monolithic `Editor.tsx`:
  - `Toolbar.tsx` — top capsule (brand, undo/redo, AI shortcut, run/pause, settings).
  - `Palette.tsx` — left component catalogue, dynamically grouped from `COMPONENT_DEFS`.
  - `Inspector.tsx` — right detail panel for the selected component.
  - `LogPanel.tsx` — bottom collapsible console.
  - `ToolDock.tsx` — bottom-right select / wire / delete + zoom buttons (zoom is wired in Phase 4).
  - `StatusPill.tsx` — bottom-left summary chip.
  - `PhoneDock.tsx` — phone bottom navigation.
  - Plus shared `IconBtn.tsx` + `PillField.tsx` leaves.
- **`src/ui/Editor.tsx`** — slimmed from ~440 to 80 lines; pure composition root that wires stores → panels.
- **`src/ui/theme.ts`** — extracted Lab Glass · Light theme tokens + the panel background gradient.
- **`src/ui/hooks/useKeyboardShortcuts.ts`** — global keybindings: **Ctrl/Cmd+Z** undo, **Ctrl/Cmd+Shift+Z** (or **Ctrl+Y**) redo, **Delete/Backspace** removes the selected component, **Escape** cancels pending wire / clears selection / drops to idle, **V** select tool, **W** wire tool. Skipped while focused in inputs/textareas.
- **`src/ui/CircuitCanvas.tsx`** — major upgrade. Now an interactive surface, not just a renderer:
  - **Drag-to-move components** in canvas-space using `getScreenCTM` for pixel-perfect screen↔canvas conversion. Window-level pointer listeners during a drag prevent the cursor from getting "lost" if it leaves the SVG area. Snaps to grid on release.
  - **Wire creation** — click a port to set the origin (rubber-band line follows the cursor); click another compatible port to commit. **Validates** rail-type compatibility (`live ↔ live`, `neutral ↔ neutral`, `earth ↔ earth`) and rejects self-loops with a console error log.
  - Visual cues: the pending origin port is highlighted (filled colour, larger radius); ports of matching type on other components get a thicker accent ring while a wire is pending.
  - Cursor switches to `crosshair` while wiring; component bodies show `grab`.

### State — Phase 3
- **`uiStore`** gained `pendingWireFrom: PortRef | null` and `setPendingWireFrom()` for the rubber-band wire-creation state.

### Removed — Phase 3
- `src/App.legacy.tsx` (1,629-line monolithic legacy editor) — fully superseded by `src/ui/Editor.tsx` + Zustand stores + domain layer.
- `src/types.ts` and `src/constants.ts` — re-export shims that only existed to keep the legacy file resolving.
- `tsconfig.json` exclude entry for the legacy file (no longer needed).

### State — Phase 2 (Zustand migration)
- **`src/store/`** — three Zustand slices + a simulation bridge:
  - `circuitStore.ts` — components, wires, selection. Wrapped in **`zundo` `temporal` middleware** for **patch-based undo/redo** (Immer patches, not full snapshots — orders of magnitude less memory than the legacy app's full-clone history). `partialize` + reference-equality predicate ensure selection clicks are NOT recorded in history.
  - `uiStore.ts` — simulation toggle, `simResult`, log stream (capped at 200 entries), interaction mode, panel open/close flags.
  - `viewportStore.ts` — pan, zoom (clamped 0.25–4×), live mouse position. Isolated so high-frequency mouse events don't re-render the toolbar.
  - `seed.ts` — builds the initial circuit (16 components, 20 wires) from real domain primitives.
  - `useSimulation.ts` — React effect bridging `circuitStore` → `simulate()` → `uiStore`. Runs on every change when the sim toggle is on; de-duplicates identical error/warning logs by signature. Phase 5 will move the `simulate()` call into a Comlink-bridged Web Worker without changing the hook signature.
  - `index.ts` — barrel export.
- **`src/store/circuitStore.test.ts`** — 8 tests covering selection invariants, mutators (removeComponent + cascading wire delete, toggleSwitch only on switch types, moveComponent), undo of `toggleSwitch`, and "selection changes don't grow the history" invariant.

### UI — Phase 2 (Editor)
- **`src/ui/Editor.tsx`** — production replacement for `mockups/LabGlassLight.tsx`. Same locked Lab Glass · Light visual, but every control is now wired:
  - Run / Pause toggles `useUiStore.simRunning` (pauses live simulation, clears the `simResult`).
  - Undo / Redo call `zundo`'s history.
  - Toggle palette / log via `useUiStore`.
  - Click a component → `selectComponent`; double-click a switch → `toggleSwitch`; trash icon → `removeComponent`.
  - Inspector reads selected component from the store and surfaces ID, type, position, on/off state, energised/fault status, port list with rail-coloured badges, and a Toggle button for switch-like components.
  - Console panel shows live entries from `useUiStore.logs`; status pill counts components/wires/active loads in real time.
- **`src/ui/CircuitCanvas.tsx`** — domain-driven SVG renderer. Takes `circuit`, `simResult`, `selectedId`, `onSelect`, `onToggleSwitch` as props (no static fixture imports). Component nodes accept click + double-click; energised loads + faulted components get coloured outlines and status pips. The Phase-4 PixiJS renderer will swap in behind the same component contract.

### Removed — Phase 2
- `src/mockups/LabGlassLight.tsx`, `src/mockups/CircuitCanvas.tsx`, `src/mockups/sampleCircuit.ts`, and the empty `src/mockups/` directory — superseded by `src/ui/Editor.tsx`, `src/ui/CircuitCanvas.tsx`, and `src/store/seed.ts`.

### Tooling — Phase 1 (Domain extraction)
- **`src/domain/`** — new pure-TS layer, dependency-free, Web-Worker-ready (PLAN.md §4).
  - `types.ts` — all domain types (`Circuit`, `ComponentInstance`, `WireInstance`, `ComponentDef`, `PortType`, `SimulationResult`, `LogEntry`, …). Position is `{x, y, z?}` for future 3D readiness.
  - `components.ts` — `COMPONENT_DEFS` registry (15 component types) + grid/box constants + `getDef()` helper.
  - `geometry.ts` — pure helpers: `getPortPos`, `getComponentBounds`, `getPortControlOffset`, `sampleWire`, `cubicBezier`, `snapToGrid`. Used by renderer (Phase 4) and spatial index.
  - `simulation.ts` — pure `simulate(circuit)` engine. Faithful port of the legacy `runSimulation` algorithm (BFS over Live and Neutral rails, switch open/closed, load termination, short-circuit detection) but **indexed Maps for O(1) lookups** instead of legacy O(n²) `array.find()`.
  - `index.ts` — barrel export.
- **`src/domain/simulation.test.ts`** — 12 behavioural tests covering empty/degenerate inputs, lit-bulb, switch open/closed, junction box fan-out, MCB on/off, idempotence, and a 50-bulb perf smoke test.
- **`src/types.ts`** and **`src/constants.ts`** — converted to thin re-export shims of the domain layer so the excluded-but-preserved `App.legacy.tsx` keeps resolving. Both shims will be deleted alongside `App.legacy.tsx` in Phase 3.

### Notes
- Lockfile updated; `npm install` adds ~70 dev dependencies (Phase 0a) + 3 runtime deps (Phase 2: `zustand`, `immer`, `zundo`). Initial JS bundle is now **76.13 KB gzip** (Δ +8.08 KB for state libs).
- Test count: **24 tests across 3 files, all passing** (`npm run test`).
- No production behaviour change yet; the live editor (`App.legacy.tsx`) is dormant pending the rewrite phases.
- See `progress.md` for the running log of phases, decisions, and perf numbers.
