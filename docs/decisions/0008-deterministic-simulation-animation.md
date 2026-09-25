# ADR 0008 — Deterministic Simulation Outcomes with Mandatory Animation

- **Status:** Accepted
- **Date:** 2026-09-24
- **Phase:** v3 simulator foundation
- **Deciders:** Product owner and architecture owner
- **Plan references:** `PLAN.md` §§2.1, 9.1–9.4, 16
- **Prototype:** `docs/prototypes/v3-fault-animation-demo.html`

## Context

Animation is a mandatory v3 product requirement. The simulator must make energization, current flow, protection operation, thermal stress, faults, component behavior, physical outcomes, and persistent damage understandable through motion and state changes.

The animation system cannot become the authority for electrical correctness. Frame rates, browser throttling, reduced-motion preferences, and rendering implementation vary across devices. Matter.js provides useful 2D physical behavior but is not an electrical or thermal solver. If visible animation directly determined trips, heating, faults, grades, or damage, identical circuits could produce different results and assessed attempts could not be replayed or audited reliably.

The v2 fault behaviors are a product-knowledge source, but v3 needs explicit contracts for temporal progression, protection curves, persistent damage, replay, and explanations.

## Decision

Electrical, thermal, protection, fault, and damage outcomes are calculated by a **deterministic simulation domain**. Animation is a mandatory projection of timestamped domain state and events.

### Required separation

```text
versioned circuit + scenario + controls + simulation clock
  -> deterministic electrical/thermal engine
  -> snapshots + timestamped domain events
  -> animation/event projection
       ├── SVG / Web Animations
       ├── Canvas or WebGL
       ├── Matter.js physical response
       ├── accessible text/state tree
       └── evidence timeline and replay
```

The renderer may interpolate between authoritative snapshots. It may not invent current, voltage, temperature, trip, fault, damage, score, or repair outcomes.

### Simulation clock

- Use an explicit simulation clock, never wall-clock animation frames, for domain progression.
- Support real-time, accelerated-time, pause, deterministic step, and replay where the scenario permits.
- Persist enough versioned input and event data to reproduce assessed or shared outcomes.
- Background-tab throttling may slow visual playback but must not alter the calculated result.
- Long-running thermal scenarios may use stable fixed steps or a reviewed event-driven integration method; numerical tolerances and maximum steps are versioned.

### Fault and damage lifecycle

Fault-capable entities use explicit, inspectable states rather than a single `broken` boolean. A typical conductor lifecycle may include:

```text
healthy -> loaded -> overloaded -> heating -> thermally_stressed
        -> cooling/serviceable
        -> insulation_damaged -> leakage_or_short/open -> repair_required
```

A protective device may include:

```text
closed -> threshold_accumulating -> tripped -> isolated -> resettable
       -> failed_to_open / welded_contact / nuisance_trip / failed_component
```

A correctly coordinated overload normally causes protection to operate before permanent conductor damage. Permanent damage requires modeled thermal/electrical limits or an explicit scenario fault. Failed or oversized protection may lead to insulation damage, leakage, a configured line/neutral/ground fault, an open conductor, welded contacts, or another cataloged component failure.

Resetting playback does not silently repair persistent damage. Repair/replacement is an explicit command and audit/event action.

### Required animated vocabulary

The v3 renderer must provide perceivable states for:

- de-energized versus energized paths;
- current flow direction/magnitude where technically meaningful;
- voltage presence and hazardous energization;
- heat accumulation and cooling;
- breaker, fuse, relay, contactor, switch, and contact movement;
- lamp, motor, coil, meter, and other load behavior;
- intermittent opens/shorts/high resistance/leakage;
- insulation stress and conductor/component damage;
- protection trip, isolation, failed-to-open, and welded-contact outcomes;
- repair, replacement, and restored service.

Animation is not a post-launch enhancement and may not be removed from a release slice that claims simulator fault support.

### Rendering technology allocation

- **SVG + Web Animations/CSS:** default for vector components, conductors, terminals, ordinary state transitions, trip handles, labels, overlays, and small/medium circuits.
- **Canvas/WebGL:** use where measured component count, particles, heat/field overlays, or frame budgets require it.
- **Matter.js:** use for genuinely physical motion such as loose conductor movement, spring/handle/contact demonstrations, probe/tool manipulation, game collisions, mechanical assembly, or staged physical separation.
- **DOM/accessibility projection:** always expose circuit structure, state, readings, warnings, timeline events, and controls independently of visual animation.

Matter.js receives domain events such as `protection.tripped`, `terminal.failed`, or `conductor.separated`; it never decides whether those events occur.

### Safety and visual integrity

- Do not show routine overloads as explosions or arcs when the model says a breaker safely tripped.
- Arc, smoke, fragmentation, and damage effects appear only for corresponding modeled/scenario outcomes.
- Use technically restrained effects and accompany them with plain-language evidence.
- Color is never the only indication of energization, heat, warning, fault, or damage.
- Clearly label accelerated educational time and approximation level.
- The timeline distinguishes calculated values from visual effects.

### Reduced motion and accessibility

Reduced-motion preference may remove decorative interpolation, particles, camera movement, pulsing, or continuous flow. It must preserve all safety and outcome information through immediate state transitions, icons/patterns, readings, announcements, and the event timeline.

Screen-reader and keyboard users receive the same authoritative state, controls, explanations, and repair actions. Live-region announcements are rate-limited and prioritize trip, hazard, failure, and completion events.

### Performance degradation

Use a documented quality ladder rather than dropping correctness:

1. full animation at target frame rate;
2. lower particle density and overlay update frequency;
3. simplified interpolation/vector effects;
4. discrete state transitions plus readings and timeline.

The deterministic engine, safety state, and evidence never degrade with rendering quality.

## Rationale

- Determinism enables golden tests, assessment integrity, replay, debugging, and server verification.
- Mandatory animation makes temporal electrical behavior understandable and differentiates v3 from a static schematic editor.
- Technology-specific renderers can evolve without rewriting electrical rules.
- Selective Matter.js usage provides physical credibility without coupling correctness to a variable frame loop.
- Explicit persistent-damage states prevent a misleading Reset button from erasing electrical consequences.

## Consequences

### Positive

- The same simulation can drive SVG, Canvas/WebGL, reduced-motion, export, and assessment projections.
- Fault sequences are testable without a browser and visually testable with Playwright.
- Rendering technology can change behind stable event/snapshot contracts.
- Learners receive synchronized animation, readings, explanation, and evidence.

### Costs and limitations

- The project must maintain a versioned simulation clock, event schema, animation mapping, and replay fixtures.
- Animation acceptance tests and visual regression evidence become release gates.
- Complex physical destruction may be intentionally simplified when it adds no learning value.
- Server verification may validate outcomes/events without rendering every visual frame.

## Initial vertical-slice acceptance criteria

The first production simulator slice must demonstrate:

1. supply, conductor, load, and protective-device models;
2. normal energization and current animation;
3. an overload accumulating thermal stress over explicit simulation time;
4. a correctly coordinated protective trip before permanent damage;
5. a failed-to-open or oversized-protection scenario that exceeds a conductor limit;
6. persistent insulation/conductor damage and explicit repair/replacement;
7. run, accelerated time, pause, deterministic step, reset/replay controls;
8. synchronized values, explanation, and timestamped event timeline;
9. reduced-motion and keyboard/screen-reader equivalents;
10. domain golden tests plus Playwright animation/state tests at desktop and mobile sizes.

## Testing requirements

- Golden fixtures assert event order, timestamps within specified tolerance, values, trip outcome, and persistent damage.
- Property tests check conservation/invariants and impossible transitions.
- Renderer contract tests verify every required domain event has accessible and visual projections.
- Playwright tests assert controls, final states, reduced-motion behavior, responsive layout, and no reliance on animation delay for correctness.
- Visual regression captures cover normal, warning, trip, failed protection, damage, and repair states.
- Performance tests separate engine step cost from renderer frame cost.

## Revisit triggers

Revisit this ADR if the chosen renderer fails measured circuit-size budgets, Matter.js cannot produce required physical behavior, the event schema cannot support deterministic replay, or electrical review invalidates the initial thermal/protection approximation.
