# ElectraSim — Electrical Toolbox
## Master Implementation Plan
### Foundation Tool: Voltage Drop Calculator

> **Instruction to coding agent:** Execute this plan sequentially. Do not skip ahead to later tools. After each phase, run the appropriate validation checks and leave the project in a working state. Reuse existing project architecture and patterns wherever possible.

---

# 0. Product decisions — LOCK THESE FIRST

## Electrical Toolbox

The marketing site will have:

```text
/tools/
```

as the **Electrical Toolbox hub**.

The hub is a normal SEO-friendly marketing page containing the available electrical tools.

The first tools planned are:

1. Voltage Drop Calculator
2. Cable Size Calculator
3. Power Calculator
4. Electrical Load Calculator
5. Energy Cost Calculator

Additional tools can be added later.

---

# 1. Individual tools are full-screen applications

When the user clicks a tool from the Toolbox hub, they enter a **full-screen interactive workspace**.

Example:

```text
/tools/voltage-drop-calculator/
```

The tool should not look like a normal blog/article page.

It should feel like a lightweight electrical software application.

### Approved interaction model

```text
┌─────────────────────────────────────────────┐
│ Header                                       │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│           MAIN VISUALIZATION                │
│                                             │
│                                             │
│     floating INPUTS     floating RESULTS    │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

The visualization owns the majority of the screen.

Inputs and results are secondary floating panels.

There is **no permanent three-column layout**.

---

# 2. Approved header

Desktop header:

```text
☰   ⚡ ElectraSim
       Electrical Toolbox

                 Voltage Drop Calculator ▾

                              ☾ Dark Mode
                              ? Help
                              ⛶ Fullscreen
```

The exact visual design already approved should remain the reference.

### Header responsibilities

- Hamburger menu
- ElectraSim identity
- Electrical Toolbox label
- Current tool name
- Quick tool switch
- Appearance toggle
- Help
- Fullscreen

Do not add a permanent breadcrumb just for SEO.

---

# 3. Tool switching

Users must be able to move between tools **without returning to `/tools/`**.

## 3.1 Hamburger menu

The hamburger opens the Electrical Toolbox navigation.

Example:

```text
Electrical Toolbox

Search tools...

CALCULATORS

✓ Voltage Drop Calculator
  Cable Size Calculator
  Power Calculator
  Electrical Load Calculator
  Energy Cost Calculator

COMMANDS

  Toolbox Home
  Help
  Settings
  Reset Current Tool
```

The current tool must be visually highlighted.

Selecting another tool navigates directly to that tool route.

---

# 4. Command palette

Implement a command palette available from:

### Keyboard

`Shift + Space`

### UI

A visible shortcut hint can appear in the header.

The command palette should support:

```text
Search tools or commands...
```

### Tools

- Voltage Drop Calculator
- Cable Size Calculator
- Power Calculator
- Electrical Load Calculator
- Energy Cost Calculator

### Commands

- Toolbox Home
- Reset Current Tool
- Help
- Settings

### Keyboard behavior

```text
↑ / ↓     navigate
Enter     open
Esc       close
```

The current tool should have a check/highlight.

The command palette should be reusable by every future Toolbox tool.

---

# 5. SEO architecture

The full-screen application must still have an individual crawlable page.

Example:

```text
/tools/
/tools/voltage-drop-calculator/
/tools/cable-size-calculator/
/tools/power-calculator/
```

The tool page must contain normal HTML metadata even though the interactive calculator itself is client-side.

Use the existing ElectraSim SEO architecture rather than creating a second SEO system.

### Voltage Drop SEO

Suggested title:

**Voltage Drop Calculator — Free Electrical Tool | ElectraSim**

Suggested description:

**Calculate voltage drop in a cable run and see exactly how cable length, current and cable size affect voltage at the load. Free interactive electrical calculator.**

Use:

- canonical URL
- Open Graph metadata
- Twitter metadata
- appropriate structured data
- sitemap inclusion
- crawlable explanatory text

Do not rely on canvas/3D-rendered text for SEO.

---

# 6. Architecture decision

The marketing site remains Astro.

The interactive tool should be implemented as a **React-powered interactive island/component mounted on the Astro tool route**, unless inspection of the existing implementation reveals a better already-supported pattern.

Conceptually:

```text
src/
├── pages/
│   └── tools/
│       ├── index.astro
│       └── voltage-drop-calculator.astro
│
└── components/
    └── tools/
        └── ...
```

React tool code should be separated from marketing content.

Do not turn the Astro marketing page into a giant React application.

---

# 7. Reusable Tool Workspace architecture

Build the workspace shell **before** completing the calculator.

Suggested conceptual structure:

```text
ToolWorkspace
│
├── ToolHeader
│   ├── ToolboxMenu
│   ├── ToolSwitcher
│   ├── AppearanceToggle
│   ├── HelpButton
│   └── FullscreenButton
│
├── CommandPalette
│
├── VisualizationCanvas
│
├── FloatingPanel
│   ├── InputPanel
│   └── ResultPanel
│
└── MobileBottomSheet
```

The names are suggestions, not mandatory filenames.

The important requirement is separation of responsibilities.

---

# 8. Keep electrical calculations separate from UI

Create a pure calculation/domain layer.

Conceptually:

```text
tool-domain/
└── voltage-drop/
    ├── types
    ├── validation
    ├── calculation
    ├── formatting
    └── tests
```

The calculation layer must have **no React dependency**.

Architecture:

```text
User Input
    ↓
Validation
    ↓
Calculation Engine
    ↓
Structured Result
    ↓
UI
 ┌──┴──────────────┐
 ↓                 ↓
Visualization    Result Panel
                   ↓
              Explanation
```

This allows future tools to reuse the same calculation/domain conventions.

---

# 9. Voltage Drop v1 scope

Keep this version intentionally simple.

The Toolbox is an educational toolset, not a full engineering configuration suite.

## Inputs

### Required

**System voltage**

Default:

`230 V`

**Load current**

Default:

`40 A`

**Cable length**

Default:

`50 m`

One-way length from source to load.

**Cable size**

Default:

`10 mm²`

**Conductor material**

Default:

`Copper`

---

# 10. Do not expose unnecessary options in v1

Do not add these to the normal interface:

- power factor
- installation method
- ambient temperature
- grouping factors
- thermal derating
- manufacturer-specific tables
- complex cable construction
- 3-phase configuration
- protection-device selection
- automatic cable sizing
- full standards compliance engine

These can be future advanced features if there is a real need.

---

# 11. System type decision

For v1, support:

- DC
- Single-phase AC

Do **not** implement three-phase yet.

If the implementation chooses to expose only one default system initially, document that limitation clearly rather than pretending to support additional systems.

---

# 12. Calculation engine

Implement the calculation as a deterministic pure function.

For the simple resistive model:

```text
Voltage drop = I × R
```

Cable resistance is derived from:

```text
R = ρ × L / A
```

For a two-conductor single-phase/DC run, the effective conductor length includes the outgoing and return paths.

The implementation must explicitly document the assumed model rather than hiding assumptions.

### Required result fields

```text
sourceVoltage
loadCurrent
cableLengthOneWay
cableLengthRoundTrip
cableSize
material
resistance
voltageDrop
voltageDropPercent
voltageAtLoad
status
```

Power-loss calculation may be included if the underlying model is explicitly defined and tested.

---

# 13. Validation

Inputs must reject:

- empty values
- non-numeric values
- negative voltage
- negative current
- negative cable length
- zero cable size
- impossible numeric values

Validation should be friendly and educational.

Bad:

> Invalid input.

Better:

> Cable length must be greater than 0 m.

---

# 14. Result interpretation

The result should not simply dump numbers.

Display:

### Voltage Drop

Example:

**6.33 V**

### Voltage Drop %

Example:

**2.75%**

### Voltage at Load

Example:

**223.7 V**

### Status

Example:

**Good**

with an explanation such as:

> The calculated voltage drop is within the selected recommended limit.

---

# 15. Recommended-limit handling

Do not hard-code a regulatory claim into the calculation engine.

Represent the comparison as a configurable educational threshold.

Example:

```text
recommendedDropPercent = 3
```

The UI can explain that the displayed threshold is an educational/reference value and that actual design requirements depend on the applicable wiring rules and installation.

This prevents the calculator from pretending to be a complete compliance engine.

---

# 16. Visualization

The visualization is the **main purpose of the tool**.

The user should see:

```text
SOURCE
230 V
  │
  │
  ═════════════════════
       cable
  ═════════════════════
  │
  ▼
LOAD
223.7 V
```

Use the approved visual concept:

**source → cable → load**

The visual language should communicate the electrical relationship clearly.

---

# 17. Visualization behavior

When inputs change:

### Increase cable length

Visual voltage loss increases.

### Increase current

Visual voltage loss increases.

### Increase cable size

Visual voltage loss decreases.

### Decrease cable size

Visual voltage loss increases.

### Change voltage

Source value and percentage relationship update.

The animation should reinforce the mathematical relationship.

---

# 18. Visual states

Use three simple visual states:

### Good

Green.

### Attention

Amber/orange.

### Excessive

Red.

Do not make the entire interface red/green.

Only the relevant cable/result indicators should change.

---

# 19. Animation requirements

The scene should visually communicate current flow.

Possible implementation:

- animated particles
- moving dots
- cable glow
- subtle pulse

But performance is more important than visual complexity.

Prefer lightweight animation techniques.

Avoid expensive filter-based animation patterns that continuously invalidate rendering.

---

# 20. Respect reduced motion

If:

```text
prefers-reduced-motion: reduce
```

is active:

- stop particle movement
- remove unnecessary pulsing
- keep a static representation of current flow
- retain all information without animation

---

# 21. Floating input panel

The input panel should be:

- visually secondary to the scene
- collapsible
- dismissible/hidden
- usable with mouse, keyboard, and touch

Desktop:

```text
┌───────────────┐
│ INPUTS     ˄  │
│               │
│ Voltage       │
│ [230] V       │
│               │
│ Current       │
│ [40] A        │
│               │
│ Length        │
│ [50] m        │
│               │
│ Cable         │
│ [10] mm²      │
│               │
│ Copper        │
└───────────────┘
```

---

# 22. Floating results panel

Same principle.

It can collapse so the visualization can become almost completely unobstructed.

Results should include:

```text
Voltage Drop
6.33 V

Voltage Drop
2.75%

Voltage at Load
223.7 V

Status
✓ Good
```

Then:

### What Happened?

Expandable educational explanation.

---

# 23. Mobile layout

Do **not** shrink the desktop UI.

On phones, use an intentional one-column/bottom-sheet adaptation.

Conceptually:

```text
┌─────────────────────────┐
│ ⚡ Voltage Drop      ☰ │
├─────────────────────────┤
│                         │
│       VISUALIZATION     │
│                         │
│          ⚡             │
│          │              │
│       ═══════           │
│          │              │
│          🏠             │
│                         │
├─────────────────────────┤
│ INPUTS                  │
│                         │
│ Voltage       230 V     │
│ Current        40 A     │
│ Length         50 m     │
│ Cable          10 mm²   │
│                         │
└─────────────────────────┘
```

Use a bottom-sheet/drawer pattern for controls.

---

# 24. Mobile visualization

The mobile visualization should become vertical:

```text
SOURCE
230 V

  ⚡
  │
  │
  │
  │
  ▼

LOAD
223.7 V

6.33 V
2.75% drop
```

The user should still understand:

**source → cable → load**

without needing to rotate the phone.

---

# 25. Touch targets

All interactive controls should have comfortable touch targets.

Prioritize:

- inputs
- collapse buttons
- hamburger
- command palette
- tool switching
- fullscreen
- theme toggle

---

# 26. Accessibility

Implement:

- keyboard navigation
- visible focus states
- semantic labels
- `aria-expanded` on collapsible panels
- `aria-label` for icon buttons
- Escape closes overlays
- command palette focus management
- no information conveyed only through color
- sufficient contrast
- reduced-motion support

The calculator must remain understandable if visualization animation is disabled.

---

# 27. Theme

### Default

**Light theme.**

This is locked.

The tool should look excellent in white/light mode first.

### Optional

Dark-mode toggle.

Dark mode must not delay or compromise the light-mode implementation.

Reuse existing theme conventions where practical.

---

# 28. Tool switching architecture

The workspace must not duplicate tool navigation for every calculator.

Create a central tool registry.

Conceptually:

```text
toolRegistry = [
  {
    id: "voltage-drop",
    name: "Voltage Drop Calculator",
    route: "/tools/voltage-drop-calculator/",
    category: "calculator",
    status: "available"
  },
  {
    id: "cable-size",
    name: "Cable Size Calculator",
    route: "/tools/cable-size-calculator/",
    category: "calculator",
    status: "coming-soon"
  }
]
```

The registry should drive:

- hamburger menu
- command palette
- tool switcher
- Toolbox hub metadata where appropriate

This avoids maintaining several unrelated tool lists.

---

# 29. Future tool compatibility

The workspace must make it easy to add:

```text
VoltageDropTool
CableSizeTool
PowerTool
LoadTool
EnergyCostTool
```

without modifying the core workspace.

The workspace owns:

- header
- command palette
- panels
- responsive behavior
- theme
- fullscreen
- navigation

The tool owns:

- inputs
- calculation
- visualization data
- results
- educational explanation

---

# 30. Cable Size preparation

Do **not implement Cable Size Calculator yet.**

But ensure the Voltage Drop engine can later be called like:

```text
calculateVoltageDrop({
  voltage,
  current,
  length,
  cableSize,
  material
})
```

Then Cable Size can test candidate sizes:

```text
1.5 mm²
2.5 mm²
4 mm²
6 mm²
10 mm²
...
```

and determine which candidates meet its criteria.

This is the primary architectural reason Voltage Drop is the first Toolbox tool.

---

# 31. Testing — calculation engine

Create unit tests before considering the calculator complete.

Test:

### Normal case

```text
230 V
40 A
50 m
10 mm²
Copper
```

### Lower current

Voltage drop should decrease.

### Longer cable

Voltage drop should increase.

### Larger conductor

Voltage drop should decrease.

### Smaller conductor

Voltage drop should increase.

### Boundary conditions

- zero length
- zero current
- invalid cable size
- negative values
- invalid strings

### Percentage

Verify:

```text
dropPercent = voltageDrop / sourceVoltage × 100
```

### Load voltage

Verify:

```text
loadVoltage = sourceVoltage - voltageDrop
```

Do not merely test that the UI renders numbers.

Test the actual calculation engine independently.

---

# 32. Testing — UI

Tests should verify:

- input values render
- changing inputs updates results
- panels collapse
- panels reopen
- command palette opens
- Escape closes command palette
- tool search works
- current tool is highlighted
- reset restores defaults
- invalid inputs show useful messages
- visualization receives updated result data

---

# 33. Testing — E2E

Use the project's existing Playwright setup.

### Desktop

```text
Open Toolbox
→ click Voltage Drop
→ tool loads
→ change input
→ result changes
→ open command palette
→ switch tool route
→ return
```

### Mobile

Test:

- tool loads
- panel opens
- panel closes
- bottom-sheet behavior
- inputs remain usable
- visualization remains visible
- command palette works

---

# 34. Performance

Do not sacrifice the marketing site's performance for the interactive tools.

The new tool should therefore:

- lazy-load heavy visualization code
- avoid loading calculator code on unrelated marketing pages
- avoid unnecessary dependencies
- avoid expensive per-frame React updates
- avoid unnecessary SVG filters
- keep animations lightweight
- render only what changes
- keep the Toolbox hub lightweight

If a 3D/visual library is already present in the implementation, inspect whether it is actually necessary before adding another dependency.

**Do not introduce a heavy 3D framework simply because the mockup looks 3D.**

The visual result is more important than the rendering technology.

---

# 35. SEO/content relationship

The calculator should have useful educational content associated with its page.

Suggested structure:

```text
Interactive Calculator
        ↓
How the result works
        ↓
What is voltage drop?
        ↓
What increases voltage drop?
        ↓
Example
        ↓
Related ElectraSim guide
        ↓
Build the circuit in ElectraSim
```

Link the calculator to the existing relevant ElectraSim guide rather than duplicating large amounts of content.

Do not rely on canvas/3D-rendered text for search engines.

---

# 36. Marketing CTA

At an appropriate location, include:

> **Want to see the circuit?**

> Take your calculated values into ElectraSim and build the circuit interactively.

Button:

**Build It in ElectraSim →**

This connects the SEO/tool funnel back to the simulator.

---

# 37. Privacy

All Voltage Drop calculations should run locally in the browser.

No account.

No backend calculation API.

No unnecessary data collection.

Do not introduce analytics specifically for the Toolbox unless the privacy/tracking documentation is intentionally updated.

---

# 38. Error handling

The tool must fail gracefully.

If the visualization fails:

**results/calculation must still be accessible.**

If the calculation engine fails unexpectedly:

Show:

> Something went wrong calculating this result.

and allow:

**Reset Calculator**

Do not leave a blank screen.

Reuse the project's established error-handling philosophy.

---

# 39. Reset behavior

Reset should restore:

```text
Voltage       230 V
Current       40 A
Length        50 m
Cable size    10 mm²
Material      Copper
```

and restore the visualization to its initial state.

No page reload required.

---

# 40. URL behavior

The calculator route should be directly accessible.

Example:

```text
https://electrasim.com/tools/voltage-drop-calculator/
```

Refreshing the page must work.

Opening the URL directly must work.

Sharing the URL must work.

The route must be included in the generated sitemap.

---

# 41. Documentation discipline

When the feature is implemented, update:

### CHANGELOG.md

Add an entry describing:

- Electrical Toolbox
- Voltage Drop Calculator
- Tool workspace
- command palette
- responsive behavior
- SEO route

### progress.md

Record:

- what was implemented
- tests
- build status
- performance measurements
- known limitations
- next step

---

# 42. Verification commands

Before declaring the feature complete, run the project's existing checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run check:perf
npm run e2e
```

If the repository's current command names differ, inspect `package.json` and use the existing equivalent commands rather than inventing new ones.

---

# 43. Final acceptance criteria

## Toolbox

- [ ] `/tools/` exists
- [ ] Toolbox hub is SEO-friendly
- [ ] Voltage Drop appears as an available tool
- [ ] future tools can be registered without rewriting navigation

## Workspace

- [ ] full-screen tool workspace
- [ ] visualization is primary
- [ ] floating panels
- [ ] collapsible panels
- [ ] hamburger menu
- [ ] tool switcher
- [ ] command palette
- [ ] `Shift + Space`
- [ ] Escape closes overlays
- [ ] fullscreen support
- [ ] light theme is polished
- [ ] optional dark toggle works

## Calculator

- [ ] voltage input
- [ ] current input
- [ ] cable length input
- [ ] cable size input
- [ ] copper material
- [ ] simple AC/DC handling
- [ ] voltage-drop calculation
- [ ] voltage-drop percentage
- [ ] voltage at load
- [ ] clear status
- [ ] reset

## Visualization

- [ ] source visible
- [ ] cable visible
- [ ] load visible
- [ ] source voltage visible
- [ ] load voltage visible
- [ ] current-flow animation
- [ ] visual voltage-drop state
- [ ] animation updates from calculation
- [ ] reduced-motion mode works

## Mobile

- [ ] phone layout is intentionally designed
- [ ] vertical source → cable → load visualization
- [ ] bottom-sheet controls
- [ ] usable touch inputs
- [ ] no horizontal overflow
- [ ] command palette usable
- [ ] results accessible

## SEO

- [ ] unique title
- [ ] unique description
- [ ] canonical URL
- [ ] Open Graph
- [ ] structured data where appropriate
- [ ] sitemap entry
- [ ] crawlable educational content
- [ ] internal link to voltage-drop guide

## Quality

- [ ] calculation unit tests
- [ ] UI tests
- [ ] E2E desktop test
- [ ] E2E mobile test
- [ ] typecheck passes
- [ ] lint passes
- [ ] tests pass
- [ ] build passes
- [ ] performance checks pass
- [ ] CHANGELOG updated
- [ ] progress updated

---

# 44. Execution order

Execute these in exactly this order:

```text
PHASE 1
Inspect existing architecture
        ↓
PHASE 2
Create Toolbox route + SEO foundation
        ↓
PHASE 3
Create reusable Tool Workspace shell
        ↓
PHASE 4
Implement hamburger + tool registry
        ↓
PHASE 5
Implement command palette
        ↓
PHASE 6
Implement responsive/mobile workspace
        ↓
PHASE 7
Extract Voltage Drop domain/calculation engine
        ↓
PHASE 8
Add calculation validation + unit tests
        ↓
PHASE 9
Connect calculator to existing visualization
        ↓
PHASE 10
Add floating input/result panels
        ↓
PHASE 11
Add educational explanations
        ↓
PHASE 12
Add animation + reduced-motion handling
        ↓
PHASE 13
Add SEO content + internal links
        ↓
PHASE 14
Desktop/mobile E2E testing
        ↓
PHASE 15
Performance + accessibility audit
        ↓
PHASE 16
CHANGELOG + progress
        ↓
PHASE 17
Final verification
```

---

# 45. Stop condition

**Do not begin Cable Size Calculator automatically after Phase 17.**

Stop and report:

```text
Electrical Toolbox Foundation: COMPLETE
Voltage Drop Calculator v1: COMPLETE

Tests:
Typecheck:
Lint:
Unit:
E2E:
Build:
Performance:

Known issues:
...

Recommended next step:
Cable Size Calculator
```

Then review the implementation before starting the second tool.

---

# 46. Core architectural goal

The deliverable of this first tool is **not merely a voltage-drop calculator**.

It is the foundation of the entire Electrical Toolbox:

```text
              ELECTRICAL TOOLBOX
                      │
              Tool Workspace
                      │
       ┌──────────────┼──────────────┐
       │              │              │
   Navigation    Visualization    Panels
       │              │              │
 Command Palette   Animation      Inputs
 Tool Registry     Responsive     Results
       │
       └──────────────┐
                      ↓
             Voltage Drop Engine
                      ↓
                Voltage Drop v1
                      ↓
             ┌─────────────────┐
             │ Future Tools    │
             ├─────────────────┤
             │ Cable Size      │
             │ Power           │
             │ Load            │
             │ Energy Cost     │
             └─────────────────┘
```

**Implement the foundation cleanly, validate it thoroughly, and only then proceed to the next tool.**
