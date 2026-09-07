# ElectraSim Interactive Guide System — Implementation Plan v3

## 1. Purpose
Redesign ElectraSim Guides into a searchable **Guide Practice / Guide Library** plus reusable interactive learning pages.

Flow: **Discover → Understand → Start Guide → Place → Wire → Test → Complete → Open in ElectraSim**.

The first foundational interactive implementation is **Protected Lamp Circuit**.

## 2. Guide System Structure

### `/guide` — Guide Practice / Guide Home
- Use the existing Astro-site search system.
- Large centered Guide search bar in the first viewport.
- Featured Guides and full catalog below.
- Reuse the existing Guide badges.
- This page is for discovery, not circuit building.

### Individual Guide page
Selecting a Guide opens its own page. Desktop uses a two-column layout:
- **Left:** Guide information, learning objectives, progress, current-step instructions.
- **Right:** Guide introduction/preview initially, then the interactive practice workspace after **Start Guide**.

Mobile becomes a deliberate single-column layout.

## 3. NON-NEGOTIABLE: NO SCROLLBARS IN THE GUIDE SYSTEM

There must **never be an internal scrollbar anywhere inside the Guide system**.

Do not create:
- Internal vertical or horizontal scrollbars.
- Scrollable instruction panels.
- Scrollable builder panels.
- Nested scrolling containers.
- Fixed-height cards with `overflow:auto`.
- A scrollable mini-canvas.
- Horizontal overflow in the interactive workspace.

Desktop should fit the Guide experience to the available viewport. Mobile may naturally continue as a page, but individual Guide components must never become nested scroll regions.

## 4. Audience and Modes

The main simulator has exactly two modes:
- **Student**
- **Pro**

The Guide system must use exactly these two modes. Do **not** introduce a Teacher mode.

Guide badges may communicate intended audience/level using the existing badge system. A Guide can be Student-oriented, Pro-oriented, or suitable for both.

## 5. Foundational Guide — Protected Lamp Circuit

**Protected Lamp Circuit** is the first reference implementation and foundation for the reusable Guide engine.

It establishes:
- AC supply
- Live and Neutral
- MCB/circuit protection
- Single-way switch
- Lamp/load
- Correct conductor routing
- Continuity and topology
- Incorrect wiring
- Short-circuit detection
- Protection behavior
- Testing
- Electrical readings

Existing Guides remain available. They should be migrated progressively to the reusable engine rather than discarded or renamed without reference to the actual Guide catalog.

## 6. Guide Introduction and Onboarding

Before practice begins, the individual Guide explains:
- What the user is building.
- Why it matters.
- Components involved.
- What they will learn.
- Student/Pro applicability.
- How the interactive Guide works.

Example onboarding:
1. **Place** — add required components.
2. **Wire** — drag from terminal to terminal.
3. **Test** — test after wiring is verified.
4. **Learn** — correct circuits work; mistakes explain what went wrong.

The right column may initially show a circuit preview and **Start Guide** button. Only after starting does it become the active builder.

## 7. Verifiable Progressive Step System

Every Guide consists of ordered, **programmatically verifiable** steps.

Protected Lamp foundation:
1. Place the components.
2. Wire the circuit.
3. Test the circuit.
4. Complete / learn from the result.

Users cannot advance simply by clicking Next.

### Step 1 — Placement validator
Verify all required components are actually present and placed.

### Step 2 — Wiring validator
Verify connectivity, conductor type, required topology, and fault state.

### Step 3 — Test validator
Verify required MCB/switch states, valid complete circuit, and expected load behavior.

### Step 4 — Completion validator
Verify all previous requirements and successful final behavior.

## 8. Future Steps Stay Visible

Future steps remain visible but locked/grayed out for orientation, accessibility, SEO/discoverability, and progress awareness.

Example:

✓ 1 Place Components — Completed
● 2 Wire the Circuit — Active
🔒 3 Test the Circuit — Complete Step 2 to unlock
🔒 4 Complete — Complete previous steps to unlock

Locked step content should be genuine useful content, not hidden text inserted solely for SEO.

## 9. Interactive Placement

During placement:
- Component palette is visible.
- Clicking a component places it in the workspace.
- Required components can appear in a checklist.
- Completion is automatically verified.

Protected Lamp components:
- AC supply
- MCB
- Single-way switch
- LED lamp

## 10. Distinct MCB and Switch SVGs

MCB and single-way switch must have **visually distinct SVGs**. Do not reuse one SVG and only change its label.

### MCB
Show a recognizable miniature circuit breaker with enclosure, toggle, input/output terminals and rating information where appropriate.

### Switch
Show a recognizable single-way wall switch with distinct faceplate/mechanism and terminals.

**Both mechanisms operate left ↔ right.** Do not use up/down movement.

Normal MCB/switch clicks must not trigger celebration.

## 11. Wiring Interaction

After placement is verified:
1. Click/touch a terminal.
2. Pick up a wire.
3. Move the pointer/finger.
4. A temporary wire follows the pointer.
5. Click/touch another terminal.
6. The connection is created.

Use pointer events so mouse and touch share the interaction model.

Users may connect **any terminals**, including incorrect ones. The validator decides whether the resulting circuit is valid.

## 12. Mandatory Wire Color Coding

Wire color coding is mandatory:
- **Live = red**
- **Neutral = blue**

This must remain obvious in the workspace and completed circuit.

Current-flow animation is optional and must not replace conductor color coding.

## 13. Fault Detection and Feedback

The Guide intentionally allows incorrect wiring.

### Live → Neutral short circuit
Detect as a distinct fault and show lightweight:
- Electrical flash.
- Warning state.
- Faulted wire/component visualization.
- Protection reaction.
- Optional BOOM/explosion effect.

### Other incorrect wiring
Distinguish:
- Open circuit.
- Lamp bypass.
- Incorrect switch routing.
- Incorrect protection routing.
- Missing neutral.
- Missing live path.

Use SVG/CSS effects rather than heavy animation libraries.

## 14. Test and Success

After wiring is verified, activate the Test step.

The user sets the required MCB and switch states and presses **Test**.

The lamp lights only when the circuit model says the electrical path is genuinely complete and valid.

Protected Lamp expected topology:

**Live → MCB → Switch → Lamp → Neutral**

For a 9 W lamp at 230 V, readings should be calculated from the circuit model (approximately 39.1 mA and 9 W), not hardcoded UI text.

## 15. Completion, Celebration and Reset

Celebration occurs only after genuine final validation:
- Lamp ON.
- Correct circuit status.
- Calculated readings.
- Completion state.
- Lightweight confetti/fireworks/SVG effects/lamp glow.

Never celebrate placement, normal switch/MCB clicks, arbitrary wiring, or reset.

Reset must clear:
- Components
- Wires
- MCB/switch state
- Lamp state
- Fault state
- Completion state
and return to the appropriate initial step.

## 16. Layout

### Desktop
Two columns:
- Left = title, description, badges, progress, current-step learning information.
- Right = preview/start area, then interactive practice workspace.

### Mobile
Single column:
- Guide title/information
- Progress
- Current-step information
- Interactive workspace
- Controls

Requirements:
- No horizontal overflow.
- No nested scrollbars.
- Touch-friendly terminals and controls.
- Responsive SVG.
- Readable instructions.
- No layout jumps.

## 17. Architecture

Marketing/Guide website remains **Astro**.

The interactive builder should use:
- Vanilla TypeScript
- SVG
- CSS
- Web Component

Do not convert the whole Astro site into React and do not introduce Three.js or another heavy rendering engine.

Load the builder only on Guide pages that require it.

Use data-driven Guide definitions so future Guides reuse the same engine.

## 18. Data Model

Conceptually:

```ts
type GuideDefinition = {
  id: string
  slug: string
  title: string
  description: string
  badges: string[]
  modes: ("student" | "pro")[]
  components: ComponentDefinition[]
  steps: GuideStep[]
  circuitDefinition: CircuitDefinition
  learningObjectives: string[]
  relatedGuides: string[]
}
```

Each step needs:
- id
- title
- description
- locked/active/complete state
- requirements
- validator

The exact project implementation may differ, but Guide-specific behavior should not be scattered through hardcoded UI handlers.

## 19. Circuit Graph / Validation

Represent circuits as a graph of components, terminals, and wires.

Validation should evaluate:
- Connectivity
- Live/Neutral conductor type
- Component ordering
- MCB state
- Switch state
- Short circuits
- Open circuits
- Required topology
- Expected electrical behavior

This is the reusable foundation for future Guides.

## 20. SEO and Accessibility

Guide pages must contain genuine indexable content:
- Title
- Description
- Learning objectives
- Components
- Step explanations
- Related Guides
- Appropriate structured metadata

Locked future steps may remain visible as real content. Do not hide essential information purely for SEO.

Accessibility:
- Keyboard navigation
- Focus states
- Accessible component/terminal labels
- Screen-reader step status
- Locked/active/completed states
- Color coding supplemented by text/labels
- Touch-sized controls
- Reduced-motion support
- Fault messages that do not depend only on animation.

## 21. Main Simulator Integration

Where practical, share compatible definitions with the main simulator:
- Component definitions
- Circuit topology
- Electrical calculations
- Validation concepts
- Component properties

Avoid contradictory duplicate circuit definitions.

On completion, **Open in ElectraSim →** must open the exact circuit represented by the Guide, not a generic simulator homepage. Use the project's actual deep-link/template architecture (for example, a protected-lamp template route).

## 22. Visual Direction

Use the established ElectraSim light-theme language:
- Light theme only.
- Electric/ElectraSim blue accents.
- Clean white/light surfaces.
- Soft shadows.
- Rounded cards.
- Recognizable electrical SVGs.
- Professional educational appearance.
- Large usable workspace.

Avoid generic AI-dashboard styling, dark-theme defaults, excessive decorative glass effects, and anything that consumes space needed by the circuit.

## 23. Implementation Phases

### Phase 1 — Guide Home
- `/guide`
- Existing Astro search integration
- Featured/catalog
- Existing badges
- Responsive layout
- No internal scrollbars

### Phase 2 — Guide Detail Shell
- Individual Guide route
- Desktop two-column
- Mobile single-column
- Introduction
- How-this-works onboarding
- Student/Pro
- Step progress

### Phase 3 — Reusable Guide Engine
- Data-driven Guide definitions
- Step state machine
- Verification interfaces
- Locked/active/completed states
- Web Component builder

### Phase 4 — Protected Lamp Foundation
- Distinct supply/MCB/switch/lamp SVGs
- Left/right MCB interaction
- Left/right switch interaction
- Placement

### Phase 5 — Wiring
- Terminal interaction
- Pointer-following wires
- Arbitrary connections
- SVG routing
- Red Live / blue Neutral

### Phase 6 — Validation
- Circuit graph
- Topology validation
- Open-circuit detection
- Short-circuit detection
- Protection/switch validation

### Phase 7 — Fault Feedback
- Short-circuit effect
- Other incorrect-wiring feedback
- Recovery/reset

### Phase 8 — Test + Completion
- Test action
- Circuit calculation
- Lamp response
- Voltage/current/power
- Celebration
- Exact simulator deep link

### Phase 9 — Responsive/Accessibility
- Mobile touch
- Keyboard
- Screen reader states
- Reduced motion
- No nested scrollbars
- Viewport-fit testing

### Phase 10 — Guide Migration
After Protected Lamp proves the engine, migrate existing Guides one by one using their actual content, badges, components, steps, and circuit definitions.

## 24. Testing

### Guide Home
Search, catalog, badges, navigation, responsive behavior.

### Guide Detail
Correct content, badges, modes, onboarding, Start Guide, visible locked steps, progression.

### Placement
All components place correctly; missing requirements prevent completion.

### Wiring
Pointer/touch wiring, arbitrary connections, red Live, blue Neutral, correction/deletion.

### Validation
Correct topology passes; wrong topology/open circuit/short circuit fail appropriately.

### Test
Cannot falsely succeed; lamp and readings follow the actual circuit model.

### Completion
Celebration only after success; exact simulator deep link works.

### Mobile
No horizontal overflow, no nested scrollbars, touch works, circuit remains readable.

### Regression
Existing Astro pages, search, and main simulator remain unaffected.

## 25. Definition of Done

The first release is complete when:
- `/guide` is the Guide Practice / Guide Library homepage.
- Existing Astro search discovers Guides.
- Existing badges are reused.
- Protected Lamp is the foundational interactive Guide.
- Selecting it opens an individual two-column Guide.
- The right side can begin as a preview/Start Guide experience.
- Only Student and Pro modes exist.
- Every step is programmatically verifiable.
- Future steps remain visible in a locked/grayed state.
- Users cannot advance without completing requirements.
- Placement, arbitrary wiring, validation, faults, Test, readings, completion, reset and exact simulator deep linking work.
- MCB and switch have distinct SVGs and left/right mechanisms.
- Live is red and Neutral is blue.
- Desktop is two-column; mobile is single-column.
- **There is never an internal scrollbar anywhere in the Guide system.**
- The implementation remains lightweight: Astro + Vanilla TypeScript + SVG + CSS + Web Component.
- SEO content is genuine and indexable.
- The engine is reusable for future Guides.