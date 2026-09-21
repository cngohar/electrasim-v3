## GLOBAL PRODUCT RULES — LIGHT EXPLORER

- Default theme: LIGHT.
- No dark theme.
- No page scrollbar on any Light Explorer page or state.
- Product itself is the primary focus.
- Text is secondary.
- Panels are contextual, collapsible, and hideable.
- The 3D experience must remain usable without permanent UI panels.
- SEO must be implemented without turning the visual product into a scrolling SEO article.

# ElectraSim Experimental Lab
# Light Explorer — Edison Bulb 3D Experience

**Status:** Experimental #001 — Proposed  
**Primary subject:** Edison-style carbon-filament incandescent lamp  
**Default visual theme:** LIGHT ONLY  
**Primary experience:** Full-screen interactive 3D historical laboratory  
**Core rule:** Visual interaction > text  
**Scroll:** None  
**Primary goal:** Let the user *enter, inspect, disassemble, understand, and operate* a historically grounded reconstruction of an early Edison incandescent lamp.

---

## 0. Product Decision — LOCKED

Light Explorer is **not a conventional landing page** and must not be implemented as one.

Do **not** build:

- a long scrolling marketing page
- feature-card grids
- a conventional roadmap section
- a footer-heavy article page
- a dashboard-style three-column layout
- a collection of different modern bulb models
- a generic futuristic "3D showcase"

Instead, build a **single-screen immersive 3D workspace**.

The user should feel:

> "I have entered a reconstructed electrical laboratory and can investigate the lamp myself."

The browser viewport is the application.

**No normal scrollbar.**

---

# 1. Research Foundation

The historical content and 3D asset must be based on documented evidence.

## 1.1 Edison was not the sole inventor of electric lighting

Do not present the experience as:

> "Edison invented the light bulb."

The historically safer framing is:

> **Edison's practical incandescent lighting system / practical incandescent lamp**

Earlier inventors had already demonstrated electric lighting and incandescent-lamp concepts. Edison's achievement involved making incandescent lighting practical and developing the wider generation, distribution, wiring, metering, and lamp ecosystem needed for useful commercial deployment.

Primary research basis:

- U.S. Department of Energy — History of the Light Bulb
- Smithsonian Institution — Edison "New Year's Eve" Lamp
- Smithsonian Institution — Lighting a Revolution
- Rutgers University — Thomas Edison Papers
- National Park Service — Edison National Historical Site / Historical Handbook

## 1.2 The 1879 lamp must not be modeled as a modern screw-base bulb

The Smithsonian's documented 1879 New Year's Eve demonstration lamp has:

- glass envelope
- bottom neck
- top glass tip
- no conventional screw base
- two flat contact plates around the neck
- horseshoe-shaped carbon/Bristol-board filament
- small platinum clamps
- platinum wires through a glass stem
- copper components
- a top tip associated with connection to the vacuum pump during manufacture

The first public demonstration occurred at Menlo Park on **31 December 1879**.

The documented Smithsonian object was used in that demonstration and was one of approximately 70 lamps illuminating the Menlo Park grounds/buildings according to the Smithsonian record.

### Critical implementation rule

**Do not model the 1879 demonstration lamp with a modern Edison screw base.**

A later screw-base design may be discussed historically, but it is not the primary 1879 3D asset.

---

# 2. Historical Timeline — Use History as Interaction

The timeline should not be a row of website cards.

History becomes part of the 3D experience.

Initial timeline:

```text
Earlier electric-light experiments
        ↓
1879 — Menlo Park carbon-filament breakthrough
        ↓
22 Oct 1879 — carbonized cotton-thread experiment
        ↓
31 Dec 1879 — public Menlo Park demonstration
        ↓
1880 — improved commercial lamp development
        ↓
1881 — screw-base style appears in the continuing evolution
        ↓
1882 — Edison commercial electrical lighting system / Pearl Street era
```

Dates must be independently verified before content is published.

The experiment should clearly distinguish:

- documented fact
- reconstructed visualization
- interpretation / educational simplification

---

# 3. Historical Anchor — 22 October 1879

The October 22 experiment is an especially valuable interactive scene because the Edison Papers preserve a contemporary notebook account.

The documented experiment involved:

- cotton thread
- carbonization
- platinum wires
- a bulb placed in vacuum
- electrical operation
- recorded starting resistance of **113 ohms**
- resistance later recorded as approximately **140 ohms**
- approximately half-candle-power output in the notebook account

### UI treatment

Do not present this as a dashboard.

Instead:

1. Show a physical notebook on the laboratory bench.
2. User clicks it.
3. Camera moves toward the notebook.
4. Historical writing/document appears.
5. The relevant experimental materials become highlighted.
6. The scene reconstructs the experiment in 3D.
7. User can operate the reconstructed lamp.

This connects:

**primary document → physical experiment → 3D reconstruction**

---

# 4. Historical Manufacturing Sequence

The National Park Service documents a useful historical sequence for construction.

Use this as the basis for an interactive "How It Was Built" sequence:

```text
Copper wires
      ↓
Platinum sections attached
      ↓
Glass stem blown around the wires
      ↓
Filament carbonized
      ↓
Filament mounted on stem
      ↓
Glass envelope fitted around assembly
      ↓
Air evacuated with vacuum pump
      ↓
Bulb sealed
      ↓
Life test
```

This sequence should be animated as a **physical laboratory process**, not displayed as a static numbered list.

---


# 4J. Visual Timeline & Historical Bulb Preview Upgrade — REQUIRED

The timeline gateway must communicate the **scale of the complete Light Explorer vision visually**, not primarily through text.

The current Edison-first concept is correct, but future eras must not appear as a row of plain text labels.

## 4J.1 Every Era Gets a Visual Bulb Representation

Every roadmap era should have a historically representative visual:

- 3D bulb model where practical
- otherwise a high-quality 2D/illustrated reconstruction
- historically appropriate silhouette
- correct proportions where known
- clearly associated with its era/type

The visual is a **preview**, not a promise that the laboratory already exists.

At launch:

```text
1879 Edison
    🟢 AVAILABLE
    Full 3D laboratory

Future eras
    🔒 COMING SOON / ROADMAP
    Visual preview only
```

Do not use emoji, generic stock icons, or modern generic bulb icons in the final product.

---

## 4J.2 The Timeline Should Tell the Story Without Reading

A visitor should be able to understand the product within seconds:

> **We're building the history of electric light in 3D. Edison 1879 is the first unlocked experience.**

The visual hierarchy should communicate:

```text
HISTORY
   ↓
ERA
   ↓
BULB
   ↓
STATUS
   ↓
3D EXPERIENCE
```

Long explanations are not required on the gateway.

---

## 4J.3 Era Preview States

### Available

The Edison 1879 bulb receives:

- full-resolution visual
- active illumination
- hover/focus animation
- clear `AVAILABLE NOW` state
- `ENTER LABORATORY` action

### Coming Soon

Future bulb receives:

- recognizable historical visual
- subdued treatment
- lock indicator
- `COMING SOON`
- no laboratory entry

### Roadmap

Future concept receives:

- simplified but recognizable visual
- `ROADMAP`
- no fake interaction

The visual treatment must make the states immediately understandable without requiring paragraphs of text.

---

## 4J.4 Historical Accuracy of Timeline Markers

Timeline years must represent **historically defensible milestones or eras**, not arbitrary spacing.

Before a timeline entry is published:

1. Identify the historical claim.
2. Determine whether it represents:
   - invention
   - first practical implementation
   - commercial adoption
   - major technical transition
   - representative era
3. Verify the date/range against authoritative sources.
4. Store the source reference in the timeline data.
5. Use an era range when a single year would be misleading.

Example:

```text
BAD:
1960 — Fluorescent

BETTER:
1930s–1960s
Fluorescent era
```

The exact date must be determined by research rather than visual balancing.

Never invent a date merely to create evenly spaced timeline markers.

---

## 4J.5 Central Edison Visual

The selected Edison 1879 object should be the **visual anchor** of the gateway.

It should not feel like a decorative background icon.

When Edison is active:

- bulb is larger than roadmap previews
- bulb emits a subtle physical light
- filament is visible
- timeline energy/light can visually originate from it
- the selected marker is clearly connected to the bulb
- the surrounding historical atmosphere responds to selection

The bulb should feel like the object that powers the historical timeline.

---

## 4J.6 Timeline as an Electrical Artifact

Where technically practical, make the timeline itself behave like an electrical system.

Concept:

```text
          Edison bulb
               💡
               │
               │ light / energy
               │
───────────────●────────────────────────────
            1879
```

The selected era becomes the active point in the timeline.

Interaction can produce:

- traveling light pulse
- subtle electrical pulse
- camera movement
- illumination of the selected bulb
- historical particles/atmosphere
- transition toward the laboratory

Animation must remain restrained and purposeful.

Do not turn the interface into a decorative animation showcase.

---

## 4J.7 Cinematic Transition Into the Laboratory

The gateway-to-laboratory transition is a core product moment.

When the user enters Edison:

```text
Timeline
   ↓
1879 becomes dominant
   ↓
future eras recede
   ↓
Edison bulb enlarges
   ↓
filament/glass details become visible
   ↓
historical environment forms
   ↓
camera approaches bulb
   ↓
transition into laboratory
```

Avoid:

```text
button click
→ blank/loading screen
→ unrelated page
```

The transition should feel like **entering the historical object**.

Performance must remain acceptable; the animation must not delay access to the actual laboratory unnecessarily.

---

## 4J.8 Laboratory-to-Timeline Transition

Returning to the timeline should feel like leaving the laboratory and returning to the historical index.

Concept:

```text
Laboratory
   ↓
camera pulls back
   ↓
object/environment recedes
   ↓
timeline reappears
   ↓
Edison remains selected
```

The user should always understand where they are in the overall historical journey.

---

## 4J.9 Typography Reduction

The gateway's headline must not consume most of the viewport.

The previous direction of an extremely large multi-line headline is too text-heavy for the final product.

Target:

- shorter primary statement
- large but controlled typography
- more viewport reserved for bulb visuals and timeline
- supporting text limited to one or two concise lines
- detailed history available contextually rather than permanently displayed

The gateway should **look first and explain second**.

---

## 4J.10 Product-First Visual Hierarchy

Final priority:

```text
1. Historical bulb visuals
2. Timeline
3. Selected-era animation
4. 3D/laboratory invitation
5. Historical atmosphere
6. Minimal labels
7. Optional contextual information
```

Do not reverse this hierarchy.

If a proposed UI element competes with the historical object, remove or collapse it.

---

## 4J.11 No Permanent Large Panels

The gateway must not become a dashboard.

The Edison information card may exist, but it should be:

- compact
- contextual
- collapsible
- hideable
- optional

Historical context, sources, and technical details should open only when requested.

Default:

```text
TIMELINE + BULBS + SCENE
```

not:

```text
TIMELINE + BULBS + MULTIPLE TEXT PANELS
```

---

## 4J.12 Screenshot / Presentation Mode

The gateway should support a clean visual state suitable for:

- screenshots
- classroom demonstrations
- social media
- presentations
- product previews

When UI is hidden:

```text
timeline
+
historical bulb visuals
+
scene
```

should remain understandable without permanent control panels.

This reinforces the product's visual identity.

---

## 4J.13 Expansion Requirement

This visual system must support the complete future roadmap without redesign.

Adding a new era should require data/assets, not a new gateway architecture.

Conceptually:

```ts
LightEra {
  id
  period
  title
  visualAsset
  previewModel
  status
  sourceRefs[]
  route
  sceneId
}
```

Therefore:

```text
Add Tungsten
→ add historical visual
→ add verified period
→ status = coming-soon
→ no gateway redesign
```

When its laboratory is completed:

```text
status = available
sceneId = tungsten-lab
route = /experimental/light-explorer/tungsten/
```

---

# 4K. Final Gateway Acceptance Criteria

The timeline gateway is not complete until:

- [ ] It is fullscreen.
- [ ] It has no page scrollbar.
- [ ] Edison 1879 is clearly the only available laboratory.
- [ ] Future eras are visibly represented.
- [ ] Future eras use real historical bulb visuals, not text-only markers.
- [ ] Future eras are clearly marked `COMING SOON` or `ROADMAP`.
- [ ] Timeline dates/ranges are source-verified.
- [ ] The Edison bulb is the visual anchor.
- [ ] The timeline responds visually to era selection.
- [ ] Selecting Edison produces a cinematic transition into the laboratory.
- [ ] Returning from the laboratory returns to the timeline.
- [ ] The headline does not dominate the viewport.
- [ ] Supporting text remains minimal.
- [ ] Panels are collapsible/hideable.
- [ ] A clean visual/no-UI mode exists.
- [ ] SEO semantic content remains available without compromising the fullscreen visual experience.
- [ ] The gateway can accept future eras through data/configuration rather than redesign.

# 5. Core Experience

## 5.1 Entry

The user opens:

```text
/experimental/light-explorer/
```

The page immediately fills the viewport.

No scrolling.

No marketing hero section.

Opening sequence:

```text
archival material
      ↓
handwritten historical note
      ↓
3D laboratory reconstruction
      ↓
camera travels through the scene
      ↓
Edison-style lamp becomes visible
      ↓
"EXPLORE"
```

Keep text extremely short.

---

# 6. 3D Laboratory

The environment should be a historically inspired reconstruction of an Edison-era electrical laboratory/workbench.

Possible scene elements:

- wooden workbench
- glassware
- wires
- tools
- vacuum-pump equipment
- electrical apparatus
- notebooks
- historical sketches
- lamp holder/contact hardware
- subtle daylight

Do not overcrowd the scene.

The bulb remains the hero.

### Visual rule

The laboratory should feel:

- physical
- warm
- historical
- educational
- believable

It should NOT feel like:

- cyberpunk
- dark sci-fi
- futuristic control room
- game HUD

---

# 7. Light Theme — HARD REQUIREMENT

All default visuals must use a **light theme**.

Preferred visual language:

- warm white
- natural wood
- brass/copper
- clear glass
- soft daylight
- subtle blue ElectraSim accents
- realistic shadows
- warm filament glow

Do not use a dark UI or dark "cyber laboratory" aesthetic.

A dark theme may only be introduced if explicitly requested later.

---

# 8. No-Scroll Architecture

The application must occupy:

```text
100vw × 100vh
```

The main document must not require vertical scrolling during normal use.

Use internal scene state instead of page sections.

Conceptual states:

```text
ENTER
  ↓
EXPLORE
  ↓
INSPECT
  ↓
DISASSEMBLE
  ↓
HOW IT WAS BUILT
  ↓
VACUUM
  ↓
POWER
  ↓
EXPERIMENT
  ↓
HISTORY
```

Transitions happen inside the workspace.

---

# 9. Minimal UI

Permanent UI should be extremely small.

Possible controls:

```text
Light Explorer
1879 • Menlo Park

[ Explore ] [ History ]

                         [ ? ]

                 3D VIEW
```

Bottom/edge controls can appear contextually:

```text
Assembly   Cutaway   Exploded   X-Ray
```

Panels should appear only when needed.

---

# 10. 3D Camera Interaction

Desktop:

- drag = rotate
- wheel = zoom
- middle/right drag = pan where appropriate
- click = inspect
- double-click = focus
- reset camera

Touch:

- one finger = rotate
- pinch = zoom
- two fingers = pan
- tap = select
- double tap = focus

Keyboard:

- arrow keys = optional controlled rotation
- `R` = reset camera
- `Esc` = close inspector/return
- `Space` = contextual interaction

Provide a tiny first-use hint:

> Drag to explore

Hide it after interaction.

---

# 11. Edison Lamp 3D Asset

The model must be modular.

Do not make one monolithic mesh.

Suggested scene graph:

```text
Edison1879Lamp
├── GlassEnvelope
├── GlassTip
├── GlassStem
├── CarbonFilament
├── PlatinumClamps
├── PlatinumWires
├── CopperWires
├── ContactPlateA
├── ContactPlateB
└── HolderInterface
```

Exact naming should follow the final historical asset specification.

Every interactive object must have:

- stable ID
- display name
- historical description
- material
- selectable state
- visibility state
- exploded transform
- educational metadata

---

# 12. Component Exploration

Clicking a component should:

1. highlight it
2. dim unrelated geometry
3. focus camera
4. open a compact inspector

Example:

```text
CARBON FILAMENT

Carbonized cotton thread

Produces light by becoming incandescent.

[ ISOLATE ]
```

No long article.

---

# 13. Isolate Mode

Selected component becomes the only fully visible object.

Other components:

- hidden, or
- highly transparent

depending on context.

Camera centers the selected component.

Button:

> SHOW ALL

---

# 14. Assembly Mode

Default state.

Everything is physically assembled.

Purpose:

> Understand the complete lamp.

---

# 15. Cutaway Mode

The glass envelope becomes partially removed or transparently sectioned.

Internal structure remains assembled.

The user can rotate the object while seeing:

- filament
- clamps
- stem
- wires
- contacts

---

# 16. Exploded Mode

Use a smooth physical animation.

Components separate along sensible axes.

Example:

```text
glass envelope
      ↑
filament / clamps
      ↑
glass stem / wires
      ↑
contact hardware
```

The user can rotate the complete exploded assembly.

Selected components remain clickable.

### Naming

Prefer:

> **DISASSEMBLE**

or

> **HOW IT WAS BUILT**

over generic "Exploded View" when the mode is presented to learners.

---

# 17. X-Ray Mode

Use transparency to reveal internal structure while keeping the physical assembly intact.

This is a visualization mode, not a claim about literal X-ray imaging.

Label it:

> X-RAY VIEW

or

> INTERNAL VIEW

---

# 18. "How It Was Built" Mode

This is a signature feature.

Instead of merely exploding the bulb, animate the historical construction sequence.

Example:

```text
Copper + platinum
      ↓
Glass stem
      ↓
Carbonized filament
      ↓
Filament mounted
      ↓
Glass envelope
      ↓
Vacuum
      ↓
Seal
      ↓
Life test
```

Each step should be represented by an actual 3D action.

Minimal text:

```text
STEP 04
CARBONIZE
```

Then let the animation teach the user.

---

# 19. Vacuum Interaction

The top glass tip is historically meaningful and should be interactive.

Sequence:

1. user selects Vacuum
2. vacuum pump becomes active
3. bulb connects visually to pump
4. air inside the envelope is represented subtly
5. air is removed
6. vacuum state indicator changes
7. tip is sealed

The top tip should not be treated as decorative geometry.

The Smithsonian specifically documents the top tip as the point used to connect the bulb to a vacuum pump during manufacture.

---

# 20. Power Experiment

The user physically interacts with a switch or control in the 3D laboratory.

Sequence:

```text
POWER OFF
    ↓
switch interaction
    ↓
current path appears
    ↓
filament heats
    ↓
filament glows
    ↓
laboratory illumination changes
```

Avoid a giant digital dashboard.

The physical scene is the primary feedback.

---

# 21. Electrical Model

The simulation must use deterministic, explainable calculations.

Do not invent fake physics merely to make the animation look good.

At minimum model:

- applied voltage
- resistance
- current
- power
- heating state
- brightness state
- failure threshold

Basic electrical relationships may use:

```text
V = I × R
P = V × I
P = I² × R
P = V² / R
```

The thermal/light model can be an educational approximation, but it must be clearly labeled as a simulation approximation where it is not historically measured data.

---

# 22. Historical Data vs Simulation Data

This distinction is mandatory.

### HISTORICAL

Examples:

- date
- notebook observation
- recorded resistance
- surviving object dimensions
- documented material
- documented construction sequence

### SIMULATED

Examples:

- continuous temperature curve
- brightness interpolation
- animation timing
- hypothetical overload threshold
- estimated current under a selected voltage

The UI should never present simulated values as if they were Edison notebook measurements.

---

# 23. Historical Resistance Experiment

Provide a dedicated historical experiment based on the October 22 notebook.

Initial documented values:

```text
Starting resistance ≈ 113 Ω
Later recorded ≈ 140 Ω
```

The original notebook context must be visible when this experiment is used.

Do not silently reinterpret these measurements as a modern standardized lamp specification.

---

# 24. Filament Heating

Visual behavior:

```text
cold
 ↓
warm
 ↓
red
 ↓
orange
 ↓
yellow/white incandescent glow
```

The visual transition should be smooth.

Temperature numbers should only be shown if the underlying model and source basis are defined.

Do not copy the earlier mockup's unsupported generic:

> 1500–2500 K

without documenting the model and source.

---

# 25. Failure Experiment

The user should be able to intentionally push the simulation outside the normal operating region.

Sequence:

```text
power increases
      ↓
filament heats
      ↓
brightness increases
      ↓
thermal stress
      ↓
filament breaks
```

Then:

> FILAMENT FAILED

and:

> RESET

The failure should be clearly identified as a **simulation**, not a reconstruction of a specific historical failure event.

---

# 26. Historical Documents

Archival documents should be part of the physical scene.

Possible interactive objects:

- Edison notebook
- historical sketches
- lamp drawings
- archival photographs
- object records

Clicking a document should open it in a floating/lightbox layer without leaving the 3D environment.

Where licensing permits, prefer primary institutional material.

The Smithsonian object record provides CC0/public-domain metadata for the documented object media; confirm rights per individual asset before bundling it.

---

# 27. History Navigation

Do not use a conventional horizontal card timeline.

Instead, use:

- physical markers in the environment
- subtle floating date labels
- camera transitions
- objects/documents representing historical milestones

Example:

```text
1879
  ↓
22 OCT
  ↓
31 DEC
  ↓
1880
  ↓
1881
  ↓
1882
```

The user can move forward/backward through historical states.

---

# 28. The 31 December 1879 Scene

Create a special historical scene/state for the public demonstration.

The Smithsonian documents the lamp's use in Edison's public Menlo Park demonstration on 31 December 1879.

Scene possibilities:

- laboratory interior
- illuminated buildings visible through windows
- multiple lamps in the distance
- historically appropriate atmosphere
- the hero lamp in foreground

Keep the 3D lamp itself based on the documented object.

---

# 29. Historical Accuracy Rules

Before any historical statement or visual detail is added:

1. identify source
2. record source URL
3. determine whether the source describes:
   - the exact surviving object
   - a historical event
   - a general Edison lamp
   - a later development
4. label reconstruction where appropriate
5. do not merge different lamp variants into one supposedly exact object

This is especially important because "Edison bulb" can refer to multiple historical lamp forms.

---

# 30. Technical Architecture

The main ElectraSim project already treats 3D as a future/optional renderer direction and recommends:

- React Three Fiber
- Three.js
- drei
- glTF/GLB
- lazy loading
- renderer isolation

Use that architectural direction here, but keep Light Explorer **separate from the core SVG wiring editor**.

Recommended conceptual structure:

```text
src/
├── experimental/
│   └── light-explorer/
│       ├── scene/
│       ├── components/
│       ├── modes/
│       ├── history/
│       ├── physics/
│       ├── data/
│       ├── assets/
│       └── LightExplorerApp.tsx
│
└── pages/
    └── experimental/
        └── light-explorer.astro
```

Adapt paths to the actual repository structure.

Do not force this into the existing 2D circuit renderer.

---

# 31. 3D Library

Recommended:

- React Three Fiber
- Three.js
- drei

Use:

- `Canvas`
- `OrbitControls`
- GLTF/GLB loader
- environment lighting
- controlled shadows
- instancing where useful

Avoid unnecessary dependencies.

---

# 32. Asset Format

Use:

**GLB/glTF**

for the primary lamp and scene assets.

The lamp must be authored with separate component nodes.

Keep:

- meshes optimized
- textures compressed
- materials baked where possible
- polygon count appropriate for browser delivery

---

# 33. Loading

Do not load the 3D experience on unrelated ElectraSim pages.

The experiment route should lazy-load:

- Three.js/R3F chunk
- GLB model
- textures
- historical media
- environment assets

Show a minimal loading state:

```text
LIGHT EXPLORER

Reconstructing laboratory...
```

Then enter the scene.

---

# 34. Performance

The experiment is intentionally heavier than the normal simulator, but it must still feel responsive.

Targets:

- 60 FPS on capable desktop hardware
- graceful degradation on lower-end devices
- no blocking main-thread work during interaction
- controlled shadow complexity
- compressed assets
- lazy loading
- dispose unused resources
- avoid unnecessary React re-renders
- cap expensive post-processing

Provide a reduced-quality mode if necessary:

> PERFORMANCE MODE

Possible reductions:

- shadows
- environment detail
- texture resolution
- particle effects
- post-processing

---

# 35. Responsive Design

Desktop is the primary immersive target.

Tablet/mobile must remain usable.

On small screens:

- hide nonessential permanent UI
- use bottom sheets
- make panels modal/slide-over
- preserve maximum 3D viewport area
- use touch gestures
- avoid tiny controls

The scene should never be reduced to a miniature "3D card."

---

# 36. Accessibility

Support:

- keyboard access to all non-3D controls
- visible focus states
- accessible labels
- reduced-motion preference
- text alternatives for historical information
- accessible document viewer
- clear state announcements where practical

3D-only information must have an accessible textual representation.

---

# 37. Source/Data Architecture

Historical content should be data-driven.

Example:

```ts
HistoricalEvent {
  id
  date
  title
  shortDescription
  sourceRefs[]
  sceneState
  relatedComponents[]
  archivalAssets[]
}
```

Component metadata:

```ts
LampComponent {
  id
  name
  historicalRole
  material
  description
  sources[]
  nodeName
}
```

Physics configuration:

```ts
LampSimulationConfig {
  nominalVoltage
  resistanceModel
  heatingModel
  brightnessModel
  failureModel
  sourceNotes[]
}
```

Never bury historical claims inside React JSX.

---

# 38. Source Registry

Create a dedicated source registry.

Each historical claim should be traceable to a source.

Example:

```ts
Source {
  id
  organization
  title
  url
  accessedAt
  notes
}
```

Recommended initial sources:

1. Smithsonian Institution — Edison "New Year's Eve" Demonstration Lamp
2. Smithsonian Institution — Lighting a Revolution
3. Rutgers University — Thomas Edison Papers — The Carbon-Filament Lamp
4. National Park Service — Edison Historical Handbook
5. U.S. Department of Energy — The History of the Light Bulb

---

# 39. Current Research Anchors

### Smithsonian Institution

Documents the 1879 New Year's Eve demonstration lamp, including its physical construction, materials, lack of a conventional base, contact plates, platinum components, glass stem, and vacuum-pump tip.

### Rutgers University

Provides the Edison Papers and the October 22, 1879 notebook evidence for the carbonized cotton-thread experiment, including the recorded 113 Ω and later ~140 Ω resistance values.

### National Park Service

Documents the historical lamp manufacturing sequence and life-test process.

### U.S. Department of Energy

Provides broader historical context and explicitly explains that incandescent lighting developed through contributions from multiple inventors, with Edison improving the lamp and broader electrical system.

---

# 40. Do Not Build

Explicitly out of scope for Experimental #001:

- separate LED 3D model
- separate CFL 3D model
- separate halogen 3D model
- modern smart-bulb gallery
- complete lighting museum
- VR
- AR
- multiplayer
- accounts
- cloud saves
- social features
- online leaderboard
- AI guide
- full electrical engineering simulator
- generic 3D circuit editor
- modern screw-base bulb as the 1879 hero asset
- long scrolling educational page

**One historically grounded Edison-style lamp. Deeply explored.**

---

# 41. Implementation Phases

## Phase 0 — Research Lock

Before coding:

- verify every historical event
- verify exact hero object
- choose the primary Smithsonian object
- document physical dimensions
- document materials
- document component structure
- create source registry
- identify archival media rights
- separate historical facts from simulation assumptions

### Deliverable

`LIGHT-EXPLORER-SOURCES.md`

---

## Phase 1 — Immersive Shell

Build:

- `/experimental/light-explorer/`
- full viewport
- no page scroll
- light theme
- minimal UI
- fullscreen support
- reduced-motion support
- loading state

Do not build the full model yet.

---

## Phase 2 — Laboratory Scene

Build:

- workbench
- historical environment
- camera
- lighting
- interaction controls
- contextual UI

Acceptance:

> User can enter the laboratory and freely inspect the empty scene.

---

## Phase 3 — Hero Lamp

Build the modular Edison 1879 lamp.

Acceptance:

- historically grounded shape
- no modern screw base
- correct major components
- each component separately selectable
- optimized GLB

---

## Phase 4 — 3D Exploration

Implement:

- rotate
- zoom
- pan
- focus
- assembly
- cutaway
- disassemble/explode
- X-ray
- isolate
- show all

This is the first major milestone.

---

## Phase 5 — Historical Reconstruction

Implement:

- historical dates
- archival notebook
- October 22 experiment
- December 31 demonstration
- construction sequence
- vacuum sequence

All claims must map to the source registry.

---

## Phase 6 — Electrical Experiment

Implement:

- switch
- current visualization
- heating
- glow
- power model
- resistance model
- historical experiment mode
- controlled overload
- filament failure

---

## Phase 7 — Educational Layer

Add:

- component labels
- micro-explanations
- historical document viewer
- contextual facts
- source links
- accessible text equivalents

Keep text minimal.

---

## Phase 8 — Animation & Polish

Improve:

- camera transitions
- assembly/disassembly
- vacuum animation
- filament heating
- electrical flow
- glow
- failure
- historical scene transitions
- subtle environmental animation

---

## Phase 9 — Performance

Test:

- desktop
- mid-range laptop
- low-end desktop
- tablet
- mobile

Measure:

- initial load
- GLB load
- memory
- FPS
- long-session stability

---

## Phase 10 — Experimental User Test

Release as:

> **Experimental #001 — Light Explorer**

Do not immediately expand it.

Measure qualitative feedback:

- Did users understand the object?
- Did they discover the components?
- Did they use disassembly?
- Did they understand the vacuum?
- Did they power the lamp?
- Did they explore the historical documents?
- Did the 3D experience feel worth the extra complexity?
- Did users want more historical experiments?

Only after this evaluation decide whether to expand the experimental lab.

---

# 42. Acceptance Criteria

The experiment is considered functional when a new user can:

1. Enter the full-screen laboratory.
2. Understand immediately that the lamp is interactive.
3. Rotate the lamp.
4. Zoom into it.
5. Select the filament.
6. Select the glass.
7. Inspect the electrical contacts.
8. Isolate a component.
9. Return to the complete assembly.
10. Use Cutaway.
11. Use Disassemble/Exploded mode.
12. Use X-Ray/Internal view.
13. See the historically grounded construction sequence.
14. Understand the role of the vacuum.
15. Open the historical notebook.
16. Explore the October 22 experiment.
17. See the documented 113 Ω / ~140 Ω historical values in their proper context.
18. Navigate to the 31 December 1879 demonstration.
19. Power the reconstructed lamp.
20. See the filament heat and glow.
21. Intentionally push the simulation into failure.
22. Reset it.
23. Do all of the above without page scrolling.
24. Use the core experience on a tablet.
25. Understand which information is historical and which is simulated.

---

# 43. Definition of "Unique"

The experience is **not successful** merely because it contains a 3D bulb.

It becomes successful when these elements work together:

```text
REAL HISTORICAL OBJECT
        +
REAL PRIMARY DOCUMENT
        +
3D RECONSTRUCTION
        +
PHYSICAL INTERACTION
        +
HISTORICAL MANUFACTURING
        +
ELECTRICAL EXPERIMENT
        +
IMMERSIVE ANIMATION
```

The user should be able to move from:

> "What is this?"

to:

> "How was it built?"

to:

> "Why is it built this way?"

to:

> "What happens when I power it?"

without leaving the reconstructed environment.

---

# 44. Final Product Vision

The finished experience should feel like:

> **A living historical laboratory, not a website.**

The user enters a bright Edison-era workspace.

A real 1879-style lamp sits on the bench.

They pick it up with the mouse.

Rotate it.

Inspect the glass tip.

Open the internal view.

Separate the filament.

Find the platinum wires.

Open Edison's notebook.

Reconstruct the October experiment.

Watch the vacuum form.

Close the circuit.

The filament heats.

The lamp begins to glow.

The laboratory becomes brighter.

The user has not simply *read about* the Edison lamp.

They have **explored it**.

---

# 45. Project Rule

## VISUAL INTERACTION > TEXT

If an idea can be taught through:

- animation
- 3D geometry
- lighting
- component separation
- electrical behavior
- historical document
- physical interaction

then prefer that over another paragraph.

Text exists to explain what the user cannot infer visually.

---

# 46. SEO & Discoverability — FOUNDATIONAL ARCHITECTURE

SEO is a **first-class product requirement**, not a launch-day add-on.

Light Explorer is intentionally unusual: the visible experience is almost entirely 3D and has no normal scrolling page. Therefore the application must have a **separate crawlable semantic HTML layer** that accurately describes the same experience.

The 3D canvas must never be the only place where important information exists.

Google can render JavaScript, but crawlability, canonical URLs, useful HTML content, internal links, and clear metadata must be designed deliberately. Google's current documentation also makes clear that canonicalization is a hint rather than a guarantee, sitemaps are a discovery mechanism rather than a ranking guarantee, and structured data does not guarantee a rich result. Build for discoverability and usefulness rather than trying to "game" Google.

## 46.1 SEO Product Goal

The goal is for someone searching Google for topics such as:

- Edison light bulb history
- Edison bulb 1879
- 1879 incandescent lamp
- Edison carbon filament
- carbon filament light bulb
- how Edison's light bulb worked
- how an incandescent bulb works
- Edison lamp construction
- Edison light bulb experiment
- October 22 1879 Edison experiment
- Edison Menlo Park light bulb
- history of the incandescent lamp
- Edison light bulb parts
- carbon filament bulb
- incandescent bulb history

to have a realistic opportunity to discover the Light Explorer page.

Do **not** keyword-stuff the page.

The content must naturally answer real search intent.

---

## 46.2 URL Architecture — Designed for Expansion

The SEO architecture must be reusable for future electrical-history experiments.

Initial structure:

```text
/experimental/
/experimental/light-explorer/
/experimental/light-explorer/edison-1879/
```

The exact final route can be simplified if the existing site architecture makes one route preferable, but the hierarchy must remain scalable.

Future examples:

```text
/experimental/light-explorer/
/experimental/light-explorer/edison-1879/
/experimental/light-explorer/incandescent-lamp-history/
/experimental/light-explorer/carbon-filament/
/experimental/light-explorer/vacuum-lamp/
/experimental/light-explorer/lamp-components/
```

Future categories must receive **real URLs**, not only client-side state or hash fragments.

### Rule

If a future experiment or historical subject deserves to appear independently in Google, it must have its own canonical URL and its own crawlable HTML content.

Do not create hundreds of thin URLs merely for SEO.

Only create a URL when there is a genuinely useful, distinct experience/content target.

---

## 46.3 The Hero Experience Page

The main Edison experience should have one canonical URL.

Recommended canonical:

```text
https://electrasim.com/experimental/light-explorer/
```

The page must include in the initial HTML:

- `<title>`
- meta description
- canonical
- Open Graph metadata
- Twitter/X metadata
- `og:image`
- `og:image:alt`
- robots directives
- semantic headings
- concise introductory description
- key historical facts
- internal links
- structured data
- links to authoritative sources

The visible 3D workspace can remain almost completely free of this text.

---

## 46.4 Proposed Search Title

Initial title:

**Edison Light Explorer — Explore the 1879 Incandescent Lamp in 3D | ElectraSim**

Keep titles concise, descriptive, and aligned with the actual page content.

Do not use:

> "The Ultimate Revolutionary Amazing Edison Bulb 3D Experience!!!"

Google can generate title links from several page signals, so the HTML `<title>`, visible heading, prominent text, Open Graph title, and internal anchor text should tell a consistent story.

---

## 46.5 Proposed Meta Description

Initial description:

**Explore a historically grounded 3D reconstruction of Edison's 1879 incandescent lamp. Inspect its carbon filament, glass envelope, platinum components, vacuum, construction and electrical behavior.**

The description is not a ranking guarantee and Google may choose page text instead, so the page itself must contain useful descriptive content.

---

## 46.6 Semantic HTML SEO Layer

The page should contain an accessible semantic structure similar to:

```html
<main>
  <header>
    <h1>Edison Light Explorer — The 1879 Incandescent Lamp</h1>
    <p>
      Explore a historically grounded 3D reconstruction...
    </p>
  </header>

  <section aria-labelledby="history-heading">
    <h2 id="history-heading">Edison's 1879 Incandescent Lamp</h2>
    ...
  </section>

  <section aria-labelledby="experiment-heading">
    <h2 id="experiment-heading">The October 22, 1879 Experiment</h2>
    ...
  </section>

  <section aria-labelledby="construction-heading">
    <h2 id="construction-heading">How the Lamp Was Built</h2>
    ...
  </section>

  <section aria-labelledby="components-heading">
    <h2 id="components-heading">Edison Lamp Components</h2>
    ...
  </section>
</main>
```

The 3D canvas sits inside this application but does not replace the semantic document.

### Important

Do not hide large keyword-rich blocks exclusively for crawlers.

The SEO content must be the same factual content available to users through the accessible/educational interface.

No cloaking.

---

## 46.7 Crawlable Content Must Exist Before 3D Loads

A crawler, slow device, accessibility tool, or user with WebGL disabled must still receive useful information.

Initial HTML should communicate:

- what Light Explorer is
- what object it reconstructs
- the date/context
- the main components
- the major historical experiment
- the role of the vacuum
- what users can explore
- the historical sources
- a link into the interactive experience

The 3D application then provides the richer layer.

### Fallback concept

```text
Edison Light Explorer
        ↓
Historical HTML content
        ↓
Launch 3D Explorer
        ↓
Interactive 3D laboratory
```

This is not a second product. It is the semantic/accessibility foundation of the same product.

---

## 46.8 Internal Linking — Critical for Future Expansion

Build a reusable internal-link graph.

The main Light Explorer page should link to relevant pages such as:

```text
Edison 1879 lamp
├── Carbon filament
├── Lamp components
├── October 22 experiment
├── Menlo Park demonstration
├── Vacuum process
└── Incandescent lamp history
```

Future pages should link back to the Light Explorer hub.

Use descriptive anchor text.

Prefer:

> Explore the 1879 carbon-filament lamp

over:

> Click here

This creates a clear topical cluster for users and crawlers.

---

## 46.9 Breadcrumbs

Implement semantic breadcrumbs for indexable child pages.

Example:

```text
ElectraSim
  → Experimental Lab
    → Light Explorer
      → Edison 1879 Lamp
```

The visual 3D workspace does not need to display a traditional breadcrumb if it harms the immersive design.

The breadcrumb can exist in the semantic/accessibility layer and structured data.

Use `BreadcrumbList` JSON-LD where appropriate.

---

## 46.10 Structured Data

Create a reusable structured-data generator rather than hard-coding one JSON-LD block.

Potential entities:

### Site-wide

- `WebSite`
- `Organization`

### Light Explorer

- `WebPage`
- `SoftwareApplication` / `WebApplication` where appropriate
- `BreadcrumbList`

### Historical educational pages

- `Article` where the page genuinely functions as an article
- `ImageObject` where useful

Do not mark up a page with a schema type simply because it sounds beneficial.

Structured data must describe visible, user-accessible content and comply with Google's structured-data guidelines.

### Important

Structured data is an enhancement, not a ranking guarantee.

Always validate it with Google's Rich Results Test and inspect the deployed URL in Search Console.

---

## 46.11 Open Graph / Social Discovery

Every indexable experiment page needs unique social metadata.

Required:

```text
og:title
og:description
og:url
og:type
og:image
og:image:alt
og:site_name
twitter:card
twitter:title
twitter:description
twitter:image
twitter:image:alt
```

Create a dedicated **Light Explorer social image** showing:

- Edison-style lamp
- bright laboratory
- "Edison Light Explorer"
- "1879 Incandescent Lamp"
- ElectraSim branding

Do not use a screenshot of the entire UI as the only social image.

---

## 46.12 Image SEO

Important visual assets should use descriptive filenames.

Good:

```text
edison-1879-carbon-filament-lamp.webp
edison-1879-lamp-components.webp
edison-carbon-filament-notebook.webp
menlo-park-1879-lamp.webp
```

Avoid:

```text
img1.webp
final-final2.webp
hero-new.png
3dtest7.jpg
```

Every meaningful HTML image must have useful `alt` text.

The 3D canvas itself does not provide sufficient image-search semantics, so provide representative HTML images where appropriate.

Use responsive image formats and dimensions.

---

## 46.13 3D Asset SEO

The GLB/GLTF model itself is not the primary SEO target.

The page describing the model is.

Therefore:

```text
HTML page
   ↓
historical text
   ↓
images
   ↓
structured data
   ↓
internal links
   ↓
3D model
```

Do not expect Google to understand the historical meaning of a mesh merely because the node is named `CarbonFilament`.

Keep meaningful component names in the code for maintainability, but put the educational meaning into crawlable HTML.

---

## 46.14 Search Intent Content Map

Create a content map before publishing.

Example:

| Search intent | Target page/content |
|---|---|
| Edison light bulb history | Light Explorer hub |
| Edison 1879 bulb | Edison 1879 page |
| carbon filament bulb | Carbon filament section/page |
| how Edison bulb works | Interactive explanation |
| Edison bulb parts | Components page/section |
| October 22 1879 experiment | Historical experiment page/section |
| Menlo Park 1879 demonstration | Historical event page/section |
| how incandescent bulbs work | Educational supporting article |
| history of incandescent lamp | Historical timeline/supporting article |

One page may satisfy multiple closely related queries.

Do not create near-identical pages for every keyword variation.

---

## 46.15 Content Cluster Strategy

Light Explorer should become the foundation of an **Electrical History 3D** content cluster.

Future hierarchy:

```text
Electrical History
│
├── Light Explorer
│   ├── Edison 1879 Lamp
│   ├── Carbon Filament
│   ├── Vacuum
│   ├── Lamp Components
│   └── Menlo Park Demonstration
│
├── Future Experiment
│   └── ...
│
└── Future Experiment
    └── ...
```

Each new experiment should inherit:

- SEO metadata system
- structured data generator
- source registry
- breadcrumb system
- social image conventions
- sitemap generation
- internal-link conventions
- accessibility fallback
- performance budgets

This is why SEO architecture must be implemented **before the first experiment ships**.

---

## 46.16 Sitemap Architecture

Generate the sitemap automatically from the site's canonical routes.

Initial sitemap must contain the Light Explorer canonical URL.

As future experiments/pages are added, they must automatically enter the sitemap if they are:

- indexable
- canonical
- public
- useful search destinations

Do not manually maintain a growing hard-coded URL list.

Use absolute canonical URLs.

The root sitemap should be referenced from `robots.txt`.

If the project eventually becomes large, use a sitemap index.

---

## 46.17 Robots Rules

Default:

```text
User-agent: *
Allow: /
Sitemap: https://electrasim.com/sitemap.xml
```

Do not accidentally block:

- Light Explorer HTML
- important images
- necessary public assets

Do not use `noindex` on the main experiment.

Development/staging URLs must not become accidental production index targets.

---

## 46.18 Canonical Rules

Every indexable page must have one self-referencing canonical URL.

Avoid duplicate URLs caused by:

- query parameters
- alternate demo URLs
- trailing-slash inconsistencies
- temporary preview routes
- hash-state URLs
- duplicated experiment paths

Interactive state must not create separate SEO URLs unless that state represents a genuinely distinct page.

Example:

```text
/experimental/light-explorer/?mode=exploded
```

should normally canonicalize to:

```text
/experimental/light-explorer/
```

The exploded mode is an interaction state, not a separate search page.

---

## 46.19 JavaScript / WebGL SEO Architecture

The page must be statically generated or server-rendered with meaningful HTML before the 3D JavaScript executes.

Preferred architecture:

```text
Astro page
   │
   ├── SEO metadata
   ├── semantic content
   ├── structured data
   ├── internal links
   └── React 3D island
          │
          └── Three.js / R3F
```

Do not make the entire SEO page dependent on client-side rendering.

The 3D bundle should lazy-load after the crawlable shell exists.

---

## 46.20 Performance Is Part of SEO

The experiment will be heavy, so performance is not optional.

Track:

- LCP
- INP
- CLS
- initial HTML response
- JavaScript transfer
- GLB transfer
- image transfer
- main-thread blocking
- memory
- WebGL startup time

The first HTML response should not wait for the 3D model.

The user should see the semantic shell immediately and the 3D scene progressively.

Do not sacrifice the page's search/indexability to make the 3D canvas load first.

---

## 46.21 Core Web Vitals Strategy

Target good Core Web Vitals on the public page.

Strategies:

- static HTML first
- preload only genuinely critical assets
- lazy-load Three.js/R3F
- lazy-load GLB
- compress textures
- avoid huge hero images
- reserve layout space
- avoid layout shifts when the 3D island initializes
- use code splitting
- defer noncritical historical media
- use modern image formats

The 3D experiment can be visually ambitious without forcing the browser to download the entire laboratory before displaying useful content.

---

## 46.22 Google Search Console — Required

Before public launch:

1. Verify `electrasim.com`.
2. Submit the sitemap.
3. Inspect the Light Explorer URL.
4. Confirm Google can crawl it.
5. Confirm the canonical selected by Google.
6. Check rendered HTML/content.
7. Check indexing status.
8. Monitor indexing after launch.
9. Monitor search queries and impressions.
10. Fix coverage/indexing problems before expanding the experiment family.

After major new experiment releases:

- update sitemap
- inspect important new URL
- request recrawl when appropriate
- monitor indexing

Remember: sitemap submission and recrawl requests are discovery/crawl signals, not guarantees of ranking or immediate indexing.

---

## 46.23 SEO Testing — Automated

Add a dedicated SEO test suite for experimental pages.

At minimum verify:

- exactly one `<title>`
- non-empty description
- canonical exists
- canonical is absolute
- canonical matches expected route
- robots allows indexing
- Open Graph title/description/url/image exist
- Twitter metadata exists
- exactly one primary `<h1>`
- important historical text exists in HTML
- structured data parses as valid JSON
- expected schema types exist
- breadcrumb data is valid on child pages
- internal links use real URLs
- sitemap contains canonical indexable routes
- robots references sitemap
- no accidental `noindex`
- no staging/preview URL leaks
- no broken internal links
- representative images have alt text

---

## 46.24 Production SEO Validation

Before declaring Light Explorer launched:

### Google

- Search Console URL Inspection
- Rich Results Test where applicable
- mobile-friendly rendering check
- indexing request
- sitemap validation

### Site

- Lighthouse SEO
- HTML validation
- broken-link scan
- canonical scan
- metadata scan
- structured-data scan
- accessibility scan
- production screenshot test
- WebGL disabled fallback test
- JavaScript disabled/failed-load fallback test

---

## 46.25 SEO Acceptance Criteria

Light Explorer is **not launch-ready** until:

- [ ] The canonical URL is public.
- [ ] The URL is linked from an indexable ElectraSim page.
- [ ] The URL is included in the sitemap.
- [ ] `robots.txt` permits crawling.
- [ ] The page contains meaningful initial HTML.
- [ ] The page has a unique title.
- [ ] The page has a useful meta description.
- [ ] The page has canonical metadata.
- [ ] Open Graph metadata is complete.
- [ ] Twitter/X metadata is complete.
- [ ] The page has one clear H1.
- [ ] Historical facts exist outside the WebGL canvas.
- [ ] Primary-source references are crawlable.
- [ ] Structured data validates.
- [ ] Breadcrumbs exist where applicable.
- [ ] Representative images have descriptive filenames and alt text.
- [ ] The 3D bundle is lazy-loaded.
- [ ] WebGL failure does not produce an empty page.
- [ ] Search Console can render/inspect the page.
- [ ] Sitemap is submitted.
- [ ] Production SEO audit passes.

---

## 46.26 SEO Content Quality Rule

The objective is **not**:

> "Put enough keywords on the page so Google ranks it."

The objective is:

> **Build the most useful web page about this specific interactive historical experiment, then make its content technically easy for search engines to discover, understand, and associate with the correct search intent.**

The fact that this type of 3D educational experience is unusual is an advantage only if the underlying page is genuinely useful.

---

## 46.27 No Fake SEO

Never:

- hide keyword blocks
- generate hundreds of doorway pages
- create fake historical claims for search traffic
- invent measurements
- stuff keywords into alt text
- create duplicate pages for tiny keyword variations
- use misleading structured data
- create fake reviews/ratings
- claim "official Edison" status
- claim Edison invented every incandescent-lamp technology
- publish unsupported historical details just because they sound good

Historical accuracy and SEO accuracy are equally important.

---

## 46.28 Future-Proof SEO Data Model

Create SEO metadata as data, not scattered page code.

Conceptually:

```ts
ExperimentSEO {
  slug
  title
  description
  canonical
  h1
  ogImage
  ogImageAlt
  keywords
  breadcrumb[]
  relatedExperiments[]
  relatedArticles[]
  sourceRefs[]
  schemaTypes[]
  indexable
  publishedAt
  modifiedAt
}
```

This allows future experiments to be added by configuration/data while using the same SEO infrastructure.

---

## 46.29 Future Experiment Template

Every future 3D experiment must inherit this contract:

```text
Experiment
├── unique canonical URL
├── unique title
├── unique description
├── semantic HTML content
├── primary H1
├── structured data
├── breadcrumbs
├── social image
├── source registry
├── sitemap entry
├── internal links
├── accessible fallback
├── lazy-loaded 3D experience
├── performance budget
└── SEO validation tests
```

This makes Light Explorer the **foundation**, not a one-off experiment.

---

## 46.30 Discoverability Reality Check

The product requirement is:

> **Make Light Explorer highly discoverable and technically ready for Google Search from day one.**

It is **not technically possible to guarantee** that Google will automatically rank or index a page simply because these elements are present.

Google's own documentation says sitemap submission is a hint rather than a guarantee, canonical selection can differ from the site's preference, and valid structured data does not guarantee a rich result.

Therefore the engineering target is:

**Maximum legitimate discoverability + strong content + strong technical SEO + strong internal linking + continuous Search Console monitoring.**

Do not promise "Google will automatically rank this."

---

# 47. Research Sources

- Google Search Central — Canonicalization  
  https://developers.google.com/search/docs/crawling-indexing/canonicalization

- Google Search Central — Build and Submit a Sitemap  
  https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

- Google Search Central — Breadcrumb Structured Data  
  https://developers.google.com/search/docs/appearance/structured-data/breadcrumb

- Google Search Central — SoftwareApplication Structured Data  
  https://developers.google.com/search/docs/appearance/structured-data/software-app

- Google Search Central — Title Links  
  https://developers.google.com/search/docs/advanced/appearance/good-titles-snippets

- Google Search Central — Search Result Snippets / Meta Descriptions  
  https://developers.google.com/search/docs/appearance/snippet

- Google Search Central — Image SEO Best Practices  
  https://developers.google.com/search/docs/appearance/google-images

- Google Search Central — General Structured Data Guidelines  
  https://developers.google.com/search/docs/appearance/structured-data/sd-policies

- Smithsonian Institution — Edison "New Year's Eve" Demonstration Lamp  
  https://www.si.edu/object/edison-new-years-eve-lamp:nmah_995925

- Smithsonian Institution — Edison "New Year's Eve" Lamp  
  https://www.si.edu/object/nmah_704361

- Smithsonian National Museum of American History — Edison lamp record  
  https://americanhistory.si.edu/collections/object/nmah_704361

- Smithsonian — Edison Light Bulb  
  https://www.si.edu/collections/snapshot/edison-light-bulb

- Smithsonian — Edison’s light bulb turns 135  
  https://americanhistory.si.edu/explore/stories/edisons-light-bulb-turns-135

- Smithsonian — Lighting a Revolution: 19th Century Invention  
  https://americanhistory.si.edu/lighting/19thcent/invent19.htm

- Rutgers University — The Carbon-Filament Lamp  
  https://edison.rutgers.edu/life-of-edison/biographical-essays/lighting/the-carbon-filament-lamp

- National Park Service — Beehives of Invention  
  https://www.nps.gov/parkhistory/online_books/hh/edis/edisc2.htm

- U.S. Department of Energy — The History of the Light Bulb  
  https://www.energy.gov/articles/history-light-bulb

---

## 48. Status

**Experimental #001 — PLAN READY**

**Foundational architecture locked:**

- Light theme by default.
- Full-screen, no-scroll 3D laboratory.
- Edison 1879 carbon-filament lamp is the first and only hero object.
- Historical claims must be source-backed.
- SEO is a first-class requirement from day one.
- The semantic HTML/SEO layer must exist independently of WebGL.
- The SEO architecture must be reusable for every future Light Explorer experiment and future electrical-history category.
- Every future indexable experiment receives its own canonical URL, metadata, structured data, sitemap entry, internal links, accessibility fallback, and SEO tests.
- Do not expand to additional bulb categories until this foundation is implemented, tested, indexed-ready, and evaluated with real users.

# 49. Product UX Revision — Full-Screen Timeline Selection

This section supersedes any earlier ambiguity about entering the laboratory directly.

## 49.1 Selection Comes Before the 3D Laboratory

Light Explorer must have a **full-screen historical timeline gateway** before the user enters any individual 3D laboratory.

The user's journey is:

```text
LIGHT EXPLORER
      ↓
FULL-SCREEN HISTORICAL TIMELINE
      ↓
SELECT ERA / BULB
      ↓
EDISON 1879 — AVAILABLE NOW
      ↓
ENTER 3D LABORATORY
```

At launch, Edison 1879 is the only usable laboratory. Other historically meaningful eras/bulb types are visible as **COMING SOON** or **ROADMAP** so users immediately understand that ElectraSim is building toward a complete history of electric lighting.

## 49.2 Timeline Is a Visual Experience, Not a Card Grid

The gateway must not look like a normal website section.

Use:

- one fullscreen scene
- chronological movement
- animated era markers
- visual bulb previews
- subtle historical atmosphere
- large visual focus on the selected era
- very little text

Do not use a conventional grid of cards as the primary selector.

The timeline itself is the navigation.

## 49.3 Future Era Visuals

Show representative bulb visuals for future eras, but make their status unmistakable:

```text
1879 Edison Carbon Filament
        ● AVAILABLE NOW

1900s Tungsten Filament
        ○ COMING SOON

1930s Incandescent Era
        ○ ROADMAP

1960s Fluorescent
        ○ ROADMAP

1990s CFL
        ○ ROADMAP

2000s+ LED
        ○ ROADMAP
```

The exact dates and categorization must be historically researched before release. The visuals must never imply that a future laboratory is already implemented.

## 49.4 Animated Era Selection

On entering the gateway:

1. historical atmosphere appears
2. the timeline draws across the viewport
3. eras appear progressively
4. bulb visuals materialize at their historical positions
5. Edison 1879 becomes the active/available point
6. the user can move through the timeline

Selecting an era causes the timeline/camera to animate toward it.

Selecting Edison transitions into the reconstructed laboratory.

Selecting a locked future era shows a minimal `COMING SOON` / `ROADMAP` state rather than opening an unfinished page.

## 49.5 No Scrollbar — Absolute Project Rule

**There must never be a normal page scrollbar anywhere in Light Explorer.**

This applies to:

- timeline gateway
- Edison laboratory
- component inspection
- history states
- experiment states
- source viewer
- future bulb laboratories
- future experiment pages
- mobile/tablet states

Every visual state must fit the viewport or use an internal overlay/modal/sheet.

```text
100vw × 100vh
        ↓
no document scrolling
        ↓
interaction happens inside the experience
```

SEO must not be solved by adding a giant scrolling article beneath the experience.

## 49.6 Product-First Rule

The primary focus is always the product itself:

> **3D object + timeline + interaction + animation + experiment**

not text, cards, dashboards, or panels.

A useful test:

> If removing a panel makes the 3D experience clearer, the panel should probably be hidden by default.

## 49.7 Every Panel Is Optional

All UI panels must be **collapsible/hideable**.

Examples:

- Timeline
- Components
- History
- Controls
- Sources
- Experiment information
- Help

No panel should permanently consume significant screen area.

Default behavior:

```text
SCENE = dominant
UI = minimal
```

On interaction:

```text
USER ACTION
   ↓
relevant UI appears
   ↓
user completes action
   ↓
UI minimizes again
```

## 49.8 Clean View

Provide a `Hide UI` / clean-view control.

When enabled:

```text
3D / timeline scene = 100% focus
persistent panels = hidden
```

This mode is important for:

- exploration
- teaching
- presentations
- screenshots
- demonstrations

## 49.9 SEO and No-Scroll Architecture

SEO remains mandatory while the visual application stays fullscreen.

Use two complementary layers:

```text
SEMANTIC HTML / SEO LAYER
        +
FULLSCREEN IMMERSIVE APP
```

The semantic layer contains crawlable:

- H1/H2 structure
- historical facts
- concise descriptions
- source references
- internal links
- accessible equivalents of timeline labels
- structured data
- canonical metadata

The immersive layer contains:

- timeline
- 3D scenes
- animations
- interactions
- contextual controls

The SEO layer must not force a visible scrollbar onto the product.

## 49.10 Scalable Selection Architecture

The selection gateway must be built as a reusable data-driven system from the beginning.

Conceptual model:

```ts
LightEra {
  id
  year
  period
  title
  shortLabel
  bulbType
  status
  thumbnail
  heroAsset
  route
  historicalSummary
  sourceRefs[]
  sceneId
}
```

Example available item:

```ts
{
  id: "edison-1879",
  year: 1879,
  title: "Edison Carbon-Filament Lamp",
  status: "available",
  route: "/experimental/light-explorer/edison-1879/",
  sceneId: "edison-1879-laboratory"
}
```

Example future item:

```ts
{
  id: "tungsten-era",
  year: 1900,
  title: "Tungsten Filament",
  status: "coming-soon",
  route: null,
  sceneId: null
}
```

This allows future bulb eras to be unlocked without redesigning the application.

## 49.11 Navigation Layers

The final navigation model is:

```text
LAYER 1 — TIMELINE
Which era/bulb do I want?

        ↓

LAYER 2 — LABORATORY
How does this particular object work?

        ↓

LAYER 3 — CONTEXT
What am I looking at and what is its history?
```

The user can return to the timeline at any time through a minimal contextual control.

## 49.12 Selection-to-Lab Animation

The transition into Edison 1879 is part of the product experience, not a normal page navigation.

Recommended sequence:

```text
Timeline centered on 1879
        ↓
future eras recede
        ↓
Edison lamp enlarges
        ↓
historical environment forms around it
        ↓
camera moves toward the lamp
        ↓
laboratory becomes fully visible
        ↓
UI minimizes
        ↓
3D exploration begins
```

The user should feel that they have **travelled from the historical timeline into the physical laboratory**.

## 49.13 Return-to-Timeline Animation

Returning from the laboratory should reverse the feeling:

```text
Laboratory
    ↓
camera pulls back
    ↓
scene transitions into timeline
    ↓
1879 remains selected
```

Do not make the user feel as if they have left the product and opened another unrelated webpage.

# 50. Foundational UX Decision

The first public version is therefore **not**:

> Open page → read about Edison → enter 3D bulb.

It is:

> **Enter Light Explorer → travel through the history timeline → see the complete future vision → select Edison 1879 → enter the immersive laboratory → explore the lamp.**

This structure must be implemented before the Edison laboratory is considered the final product architecture.

The Edison laboratory remains the **first fully built experiment**, while the timeline proves that the architecture is designed to grow into a complete history of electric lighting.
