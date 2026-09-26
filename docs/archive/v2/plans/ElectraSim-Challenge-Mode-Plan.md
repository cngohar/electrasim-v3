# ElectraSim Challenge Mode — Implementation Plan

## Status

**Case: CHALLENGE MODE — OPEN**

Challenge Mode is the structured electrical-learning experience where the user is given a practical task and must build or repair the circuit using the normal ElectraSim editor.

It is **not** a separate simulator and **not** the Diagnosis/Circuit Generator. It should reuse the shared Scenario Foundation, circuit model, simulation engine, and validation infrastructure.

---

# 1. Product Definition

The core flow is:

```text
Task
  ↓
Starter Circuit
  ↓
Build / Repair
  ↓
Check
  ↓
Feedback
  ↓
Hint if needed
  ↓
Correct Circuit
  ↓
Functional Verification
  ↓
Complete
```

Challenge Mode should feel like:

> **ElectraSim with a teacher standing beside it.**

The user should continue using the normal editor and simulation tools.

---

# 2. Relationship to Circuit Generator / Diagnosis Lab

Use one shared foundation:

```text
                 Scenario Foundation
                         │
            ┌────────────┴────────────┐
            │                         │
     BUILD CHALLENGES            DIAGNOSIS LAB
            │                         │
     "Build this circuit"      "Find the fault"
```

Shared infrastructure should include:

- scenario identity
- circuit recipes
- deterministic generation where applicable
- topology validation
- simulation validation
- component/port registry
- circuit model

Challenge Mode adds:

- learning objective
- starter circuit
- allowed components
- build rules
- hints
- progression
- completion
- local progress
- safe challenge workspace

**Do not create a second independent validation architecture.**

---

# 3. MVP Scope

Build Challenge Mode in waves.

## Wave 1 — Foundation

- Challenge domain model
- Scenario adapter
- Rule validator
- Challenge persistence
- Safe practice workspace
- Learn hub
- Challenge UI shell

## Wave 2 — First Three Challenges

1. Build a Protected Lamp
2. Wire a Push-Button Doorbell
3. Protect a Socket with an RCBO

### STOP HERE

After the first three challenges are complete, perform real user testing before adding more challenges.

## Wave 3 — Expansion

4. Two-Way Staircase Light
5. Repair an Open Neutral
6. Correct Reverse Polarity
7. Restore Missing Earth
8. Optional Distribution Board challenge

The Distribution Board challenge must only be implemented if the current simulation model can honestly represent and validate it.

---

# 4. Phase A — Audit Existing Generator Foundation

Before implementing Challenge Mode UI, inspect the current system.

Audit:

- current Circuit Generator
- scenario types
- circuit recipes
- component registry
- port registry
- simulation engine
- fault model
- circuit store
- persistence
- Guided Circuits
- Guides entry
- Welcome dialog
- editor routing
- undo/redo
- import/export
- responsive panels

## Important

Do not assume component IDs or port IDs.

Discover them from the actual component and port registries.

## Deliverable

Produce a short architecture report:

```text
Generator foundation: PASS / GAP

Scenario system: PASS / GAP

Reusable validator: PASS / GAP

Persistence boundary: PASS / GAP

Challenge integration points:
...
```

No major UI implementation should begin until this audit is understood.

---

# 5. Phase B — Challenge Domain

Challenge definitions should be declarative rather than hard-coded into React components.

Conceptual model:

```ts
ChallengeDefinition {
  id
  version
  title
  difficulty
  estimatedMinutes

  objective
  steps

  starter
  allowedComponents

  rules

  hints

  completion
}
```

The definition should describe what the challenge expects without embedding the entire challenge inside UI code.

---

# 6. Rule System

Rules are the heart of Challenge Mode.

Each rule answers one concrete question.

Examples:

```text
Does an MCB exist?
Is the MCB closed?
Is Live connected to the MCB input?
Does MCB output reach the Switch?
Does Switch output reach Bulb.L?
Does Bulb.N reach Neutral?
Does the load actually energise?
```

The validator should return structured results:

```text
PASS
INCOMPLETE
FAIL
```

Overall challenge state:

```text
not-started
in-progress
has-errors
complete
```

The validator should also provide:

- completed-rule count
- completion percentage
- recommended next step
- stable result ordering

---

# 7. Topology, Not Coordinates

Validation must never depend on where components are placed.

These should be electrically equivalent:

```text
MCB
 │
Switch
 │
Bulb
```

and:

```text
MCB ───────── Switch
                 │
                Bulb
```

and:

```text
MCB
 │
 └──────────────┐
                │
              Switch
                │
              Bulb
```

If the electrical topology is correct, the challenge should pass.

This means:

- Smart Routing works
- Custom Wiring works
- component movement is irrelevant
- generated IDs are irrelevant

---

# 8. Rule Categories

## Component Rules

```text
requiredComponent
componentCount
componentState
```

## Connection Rules

```text
directConnection
conductorPath
pathThrough
```

## State Rules

```text
switchOpen
switchClosed
mcbClosed
```

## Functional Rules

```text
simulationState
loadEnergised
loadDeEnergised
```

## Fault Rules

```text
faultAbsent
faultPresent
```

## Interaction Evidence

For momentary controls:

```text
pressed
energisedWhilePressed
deenergisedAfterRelease
```

Static topology alone is not sufficient to prove momentary behaviour.

---

# 9. Validation Feedback

When the user presses **Check Circuit**, do not simply say:

> Wrong circuit.

Instead provide actionable feedback.

Example:

```text
⚠ Almost there

✓ Live reaches the MCB
✓ MCB reaches the switch
✓ Switch reaches the bulb
✗ Bulb still needs a Neutral return
```

Then:

> **Next:** Connect the bulb's Neutral terminal to Neutral.

Feedback must be:

- plain English
- actionable
- short
- free of raw internal IDs
- educational

Where useful, the system may highlight the relevant components or wires.

---

# 10. Hint System

Use three progressive levels.

### Hint 1 — Concept

> A load needs a complete return path.

### Hint 2 — Component

> Check the bulb's Neutral terminal.

### Hint 3 — Connection

> Connect Bulb.N to Neutral.

Hints should be revealed sequentially.

Store the number of hints used for the current attempt.

Hints are teaching aids, not penalties.

---

# 11. Safe Practice Workspace

This is non-negotiable.

Starting Challenge Mode must never destroy the user's normal circuit.

Separate:

```text
Normal Workspace
  ├── circuit
  └── viewport

Challenge Workspace
  ├── active session
  ├── challenge state
  └── interaction evidence

Return Snapshot
  ├── circuit
  └── viewport

Progress
  └── completed challenges
```

Challenge persistence must be isolated from normal workspace persistence.

---

# 12. Starting a Challenge

When the user selects **Start Challenge**:

```text
Flush normal autosave
        ↓
Snapshot normal circuit
        ↓
Create attempt ID
        ↓
Load starter circuit
        ↓
Route autosave → challenge workspace
        ↓
Fit circuit
        ↓
Open Challenge panel
```

The normal circuit remains untouched.

---

# 13. Exiting a Challenge

Show:

> **Leave Challenge?**

Options:

### Return to My Circuit

Restore exactly what the user had before the challenge.

### Keep a Copy

Export the challenge circuit as normal ElectraSim JSON.

### Cancel

Stay in the challenge.

Never silently overwrite the normal workspace.

---

# 14. Reload / Crash / Offline

If the browser reloads while a challenge is active:

```text
Active challenge found

[ Continue Challenge ]

[ Return to My Circuit ]
```

Never silently choose one.

The active challenge should be resumable offline once the app is cached.

---

# 15. Reset

**Reset Challenge** means:

> Restore this challenge's starter circuit.

It must not reset the global ElectraSim default circuit.

Reset should also reset:

- current challenge progress
- hints
- interaction evidence
- validation state

The user remains inside the challenge.

---

# 16. Learn Hub

Use the existing **Guides** entry point.

Suggested structure:

```text
LEARN
─────────────────

▶ Continue Challenge

⚡ Challenges

📚 Guided Circuits
```

Show **Continue Challenge** only when an unfinished challenge exists.

Do not create an unnecessary second navigation system.

---

# 17. Challenge Cards

Example:

```text
┌──────────────────────────────┐
│ ⚡ Build a Protected Lamp    │
│                              │
│ Beginner                     │
│ ~5 minutes                   │
│                              │
│ Build your first protected   │
│ lighting circuit.            │
│                              │
│ ✓ Completed                  │
│                              │
│        [ Start ]             │
└──────────────────────────────┘
```

Do not use:

- XP
- coins
- stars
- leaderboards
- streaks

Challenge Mode is a learning system, not a mobile-game reward system.

---

# 18. Unlock Policy

Do not hard-lock challenges.

Show a recommended next challenge based on progress, but allow users to open available challenges directly.

This avoids artificial game-like progression.

---

# 19. Active Challenge UI

## Desktop

Use a side panel.

```text
┌──────────────────────┐
│ ⚡ Protected Lamp    │
│ Beginner             │
│                      │
│ Goal                 │
│ Build a protected... │
│                      │
│ Progress             │
│ ███████░░░ 70%       │
│                      │
│ ✓ MCB connected      │
│ ✓ Switch connected   │
│ ✗ Neutral return     │
│                      │
│ [ Check Circuit ]    │
│ [ Hint ]             │
│                      │
│ Reset   Exit         │
└──────────────────────┘
```

## Mobile

Use a bottom sheet.

Only one bottom surface should be open at a time.

The canvas must remain usable.

---

# 20. Component Restrictions

Challenge 1 should initially expose only relevant components:

```text
Live
Neutral
MCB
Switch
Bulb
```

Other components may be:

- dimmed
- disabled
- or labelled as unnecessary

Do not delete components from the user's circuit simply because they are outside the allowed list.

Extra components should generally produce a warning unless they create a contradictory or unsafe topology.

---

# 21. Preserve the Normal Editor

Challenge Mode should still use the normal editor:

- select
- wire
- Smart Routing
- Custom Routing
- move
- delete
- reroute
- undo
- redo
- zoom
- pan
- mini-map
- inspector
- simulation
- appearance settings
- accessibility

Challenge Mode should feel like the normal ElectraSim editor with a structured learning layer.

---

# 22. Restricted Actions

## Import

Disabled during an active challenge because importing another circuit would bypass the challenge.

## Share

Allowed as an export/copy.

Opening a shared circuit must never mark a challenge complete.

## Reset to Defaults

Becomes:

> Reset Challenge

## Clear All

Only clears the challenge workspace.

---

# 23. Challenge 1 — Build a Protected Lamp

**Difficulty:** Beginner  
**Estimated time:** ~5 minutes

### Starter

Blank canvas.

### Allowed Components

```text
Live
Neutral
MCB
Single-way Switch
Bulb
```

### Required topology

```text
Live
 ↓
MCB
 ↓
Switch
 ↓
Bulb.L

Bulb.N
 ↓
Neutral
```

### Functional requirements

```text
MCB closed + Switch open
→ Bulb OFF

MCB closed + Switch closed
→ Bulb ON
```

### Completion message

> You built a complete lighting circuit with protection, switching, and a Neutral return.

---

# 24. Challenge 2 — Wire a Push-Button Doorbell

**Difficulty:** Beginner  
**Estimated time:** ~5 minutes

### Required topology

```text
Live
 ↓
MCB
 ↓
Push Button
 ↓
Bell
 ↓
Neutral
```

### Functional behaviour

```text
Button pressed
      ↓
Bell ON
      ↓
Button released
      ↓
Bell OFF
```

The validator must use interaction evidence rather than topology alone.

### Completion message

> You used a normally-open momentary contact: active while held, open when released.

---

# 25. Challenge 3 — Protect a Socket with an RCBO

**Difficulty:** Intermediate  
**Estimated time:** ~7 minutes

### Required Live path

```text
Live
 ↓
RCBO L-IN
 ↓
RCBO L-OUT
 ↓
Socket L
```

### Required Neutral path

```text
Neutral
 ↓
RCBO N-IN
 ↓
RCBO N-OUT
 ↓
Socket N
```

### Earth

```text
Earth ─────────→ Socket E
```

RCBO must be closed.

The challenge should reject unsupported reverse polarity and missing-earth conditions.

### Completion message

> You connected both active conductors through the RCBO and preserved the protective Earth path.

---

# 26. Mandatory Stop Point

After the first three challenges:

# STOP CODING NEW CHALLENGES.

Perform real user testing.

Test:

### Beginner understanding

Can a new user understand what to do?

### Interaction

Does wiring feel natural?

### Feedback

Does Check Circuit actually help?

### Hints

Are hints useful without simply giving away the answer?

### Mobile

Can the entire challenge be completed on a phone?

### Safety

Can the normal circuit ever be lost?

### Offline

Can the challenge survive reload/offline use?

### Fun

Does it actually feel like a challenge?

Fix the system before adding more challenge content.

---

# 27. Challenge 4 — Two-Way Staircase Light

**Difficulty:** Intermediate

Validate:

- COM / L1 / L2 usage
- correct switch topology
- supported switch combinations
- lamp control from either switch

The learner must be able to operate the lamp from either switch.

---

# 28. Challenge 5 — Repair an Open Neutral

Starter:

```text
Valid lamp circuit
+
Open Neutral fault
```

User must identify and repair the open Neutral.

Completion requires:

- fault removed
- lamp works
- no new fault introduced

---

# 29. Challenge 6 — Correct Reverse Polarity

Starter:

```text
Socket
Live ↔ Neutral
```

User must restore:

```text
Live → Socket L
Neutral → Socket N
Earth → Socket E
```

---

# 30. Challenge 7 — Restore Missing Earth

Starter:

```text
Working socket
+
Missing Earth
```

User restores Earth without disturbing Live/Neutral.

---

# 31. Challenge 8 — Distribution Board

Conditional only.

Implement only if the current simulation model can honestly represent and validate independent branches.

If the model cannot support it correctly:

> DEFER

Never fake electrical behaviour just to increase the challenge count.

---

# 32. Completion Screen

Keep it educational rather than game-like.

Example:

```text
┌──────────────────────────────┐
│        ⚡ COMPLETE!          │
│                              │
│ Protected Lamp               │
│                              │
│ You proved that the circuit  │
│ has protection, switching    │
│ and a complete return path.  │
│                              │
│ Time       4:32              │
│ Hints      1                 │
│                              │
│ [ Next Challenge ]           │
│ [ Review Circuit ]           │
│ [ Retry ]                    │
│ [ Return to My Circuit ]     │
└──────────────────────────────┘
```

Time and hints are informational, not competitive scores.

---

# 33. Persistence Model

Conceptual model:

```ts
ChallengePersistenceEnvelope {
  schemaVersion
  activeSession?
  returnWorkspace?
  progress
}
```

Progress:

```ts
ChallengeProgressRecord {
  challengeId
  completed
  completionDate
  attempts
  bestCompletionTime
  hintsUsed
}
```

Keep persistence lightweight.

Do not create a huge event log.

---

# 34. Completion Integrity

Challenge completion must be separate from circuit JSON.

```text
Circuit JSON ≠ Challenge Progress
```

A user must not be able to:

```text
Complete Challenge
 ↓
Export JSON
 ↓
Edit JSON
 ↓
Import JSON
 ↓
Forge completion
```

Shared/imported circuits can be opened and inspected, but they cannot forge challenge completion.

---

# 35. Accessibility

Challenge Mode must preserve the existing accessibility quality.

Required:

- keyboard-only completion
- correct dialog labels
- focus management
- Escape handling
- meaningful `aria-live`
- no announcement spam
- reduced motion
- light/dark support
- high contrast
- deuteranopia support
- adequate touch targets

Do not announce every validator recalculation.

Announce meaningful check results and progress changes.

---

# 36. Performance

Challenge Mode must be lazy loaded.

Do not add the full challenge system to the initial editor bundle.

Requirements:

- lazy-load Learn/Challenge UI
- no new large dependencies
- no continuous animation loops
- no validation on every pointer movement
- debounce structural validation
- cache role mappings
- reuse simulation results
- preserve existing performance budgets

Target:

> Challenge validation < 4 ms p95 for the largest shipped challenge.

---

# 37. Testing Matrix

## Domain Tests

Test:

- correct topology
- incomplete topology
- contradictory topology
- duplicate components
- extra components
- equivalent wire routing
- direct vs path-through rules
- functional checks
- fault checks
- stable result ordering

## Persistence Tests

Test:

- normal circuit survives
- challenge autosave is isolated
- reload resume
- exit restoration
- reset
- completion
- corrupted data
- schema migration
- persistence failure
- challenge actions do not enter normal circuit undo history

---

# 38. End-to-End Tests

Minimum Playwright coverage:

1. New user → Challenge → Protected Lamp → Complete → original circuit restored.
2. Existing circuit → Challenge → Exit → exact circuit restored.
3. Start challenge → reload → Resume.
4. Push Button → press → bell ON → release → bell OFF → complete.
5. RCBO → correct topology → complete.
6. RCBO → missing Earth → rejected.
7. Fault challenge → repair → complete.
8. Keyboard-only completion.
9. Phone completion.
10. Theme/accessibility coverage.
11. Offline active challenge.
12. Import/share cannot forge completion.

---

# 39. Release Verification

Run the existing project checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run check:perf
npm run benchmark:simulation
npm run e2e
npm run e2e:production
```

Run browser benchmarks where available.

Record intentional skips separately.

Do not silently ignore failures.

---

# 40. Documentation

After Challenge Mode is genuinely complete:

## README

Add Challenge Mode to product highlights.

## PLAN

Document the architecture and implementation state.

## CHANGELOG

Add the appropriate Challenge Mode release entry.

## progress.md

Record each implementation phase.

## In-App Documentation

Explain:

- What Challenge Mode is
- Starting a challenge
- Checking the circuit
- Hints
- Reset
- Exit
- Progress
- Offline resume
- Current limitations

## ADR

Add an architecture decision record if the Scenario/Challenge validation and persistence architecture becomes cross-cutting.

---

# 41. Explicit Non-Goals

Do not add:

- AI tutor
- accounts
- cloud progress
- leaderboards
- XP
- coins
- certificates
- multiplayer
- teacher dashboard
- numeric electrical calculations
- automatic MCB trip curves
- automatic RCBO leakage thresholds
- 3D
- GPU renderer
- unrelated marketing-site work

Keep Challenge Mode focused.

---

# 42. Final Architecture

```text
                         ELECTRASIM
                             │
                    Scenario Foundation
                             │
               ┌─────────────┴─────────────┐
               │                           │
        BUILD CHALLENGES              DIAGNOSIS LAB
               │                           │
       Challenge Definition          Generated Scenario
               │                           │
       Starter Circuit                Fault Injection
               │                           │
       Rule Validator                 Diagnosis Validator
               │                           │
       Functional Check              Repair + Verify
               │                           │
             Hints                     Rage Bait
               │
         Local Progress
               │
       Practice Workspace
```

One simulation engine.

One circuit model.

One validation foundation.

Two educational experiences.

---

# 43. Implementation Order

Use these steps rather than asking Codex to build everything in one giant operation.

### STEP 0
Audit the current Generator/Scenario foundation.

### STEP 1
Implement Challenge domain + validator.

### STEP 2
Implement safe Challenge persistence/workspace.

### STEP 3
Implement Learn hub + Challenge UI.

### STEP 4
Implement Protected Lamp.

### STEP 5
Implement Push-Button Doorbell.

### STEP 6
Implement RCBO Protected Socket.

### STOP — USER TEST

### STEP 7
Implement Two-Way Staircase.

### STEP 8
Implement Open Neutral.

### STEP 9
Implement Reverse Polarity.

### STEP 10
Implement Missing Earth.

### STEP 11
Evaluate Distribution Board support.

### STEP 12
Full hardening + accessibility + performance + release verification.

---

# 44. Final Product Principle

The three ElectraSim learning layers should eventually feel like this:

```text
GUIDED CIRCUITS
"Show me."
      ↓
BUILD CHALLENGES
"Let me build it."
      ↓
DIAGNOSIS LAB
"Let me figure out what's wrong."
```

That is the progression we should protect.

**Do not turn Challenge Mode into a second random generator.**

**Do not turn it into a game.**

**Do not duplicate the Scenario/Validator foundation.**

Build the structured learning layer on top of the same electrical engine that powers the rest of ElectraSim.
