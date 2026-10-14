> **Current status (2026-10-14):** Design approved and Phase 1.11 completed locally. [The audit](../../audits/phase-1-fault-lab-redesign.md) records real UI/electrical acceptance, preserved data and focused Console recovery. The screen descriptions below retain the prototype review state and its sample values; they do not assert an assessed animation for every catalogue entry.

# Fault Lab redesign · screens and flows

**Review state: 21 screens or edge states are represented by the standalone prototype.** This is a design inventory, not a claim that all 14 fault types have production animation or that the simulator has been changed.

## Workspace structure

| Surface | Desktop | Phone | Purpose |
| --- | --- | --- | --- |
| Centered workspace header | Floating island between brand and utilities | Compact centered island | Move among circuit, Fault Lab and design review; expose motion and theme. |
| Demonstration | Main workspace column | Full-width card | Show the circuit or a labeled expanded cutaway for the selected target. |
| Fault Inspector | Right column | Bottom sheet above the shelf, with a visible show/hide control | Explain the cause, inspect accepted readings, or make a separate repair. |
| Component shelf | Fixed full-width bottom row | Horizontally scrolling bottom row | Keep the simulator's current component toolbar visible and familiar. |
| Console | Separate entry with visible severity filters | Same entry; details can share the phone sheet area | Review errors, warnings and information without coupling log clearing to fault state. |
| Review dialog | Centered, scrollable content | Near-full-height scrollable sheet | Browse the catalogue, target draft, hardware references, model limits, history and review states. |

The darker slate theme is the default, with a light theme option. Borders and badges stay restrained. Motion uses short entry and exit transitions; closing content remains mounted through its fade. Reduced motion disables transitions and physics while preserving the same circuit state and labels.

## Complete user paths

### Inspect, inject and repair a broken conductor

1. Select the conductor or a named terminal; the Inspector shows its target and applicable fault types.
2. Choose **Open circuit** and review the target, conductor role and model scope in the draft.
3. Cancel without mutation, or apply the fault as one reversible edit.
4. Run the simulator and capture a fresh accepted result. The timeline remains unavailable while the response is stale or unsupported.
5. Review the staged path, source and branch readings, then restore continuity as a separate edit.
6. Run again. Show the before/after comparison only when both results refer to known circuit revisions.

The design sequence labels are **Before → Break → Path → Response → Inspect → Repair**. Their visual movement explains the state. The electrical claims must come from current accepted results.

### Inspect a declared short and protective response

1. Select the declared L–N conductor pair and applicable protective device.
2. Confirm the pair, protection model and scope in the draft; do not infer an arc or trip from a decorative spark.
3. Apply the fault and run. Show a trip only when the fresh protection result records it.
4. Clear the bridge. Keep the trip latch and damage state intact.
5. Reset the breaker to **OFF** as its own edit, then offer a deliberate **ON** action.
6. Verify the resulting circuit with a new run.

The design sequence is **Before → Bridge → Response → Trip → Inspect → Repair**. Playback speed is presentation speed, never a protection parameter.

### Show a derived overload and damage budget

1. Review the explicit cable threshold and damage budget.
2. Show supported electrical stress or damage progression without claiming temperature, smoke, fire, or universal failure timing.
3. Preserve irreversible damage when a related injected cause is cleared.
4. Replace the damaged cable as an independent edit and verify again.

This condition is derived from the configured model; it is not one of the injected-fault types. The sequence is **Before → Stress → Exposure → Budget → Damage → Replace**.

## Inspector behavior

- **Explain** identifies the exact target and says what the current model supports.
- **Readings** shows accepted values and explicit unavailable/unassessed states. The prototype uses qualitative placeholders only.
- **Repair** offers only the next legal action. Clearing a cause, resetting protection, operating a device and replacing damage stay separate.
- Reference images come from the repository's component image registry or existing assets. A related device image names the related device. A cable target with no cable image says that no direct photo is available.
- Simple settings can be reviewed from the Inspector. Advanced electrical parameters stay in their detailed model window and use the existing draft/confirm path.
- Existing variants, terminal identities and canonical wire anchors remain authoritative. A display illustration cannot change electrical topology.

## Console behavior

The Console opens independently of the selected target. It uses visible **All**, **Error**, **Warning** and **Info** buttons rather than a severity dropdown. Selecting a severity filters entries in place. Error rows can navigate to their affected target or stale response. **Clear messages** changes only the message list; it never clears injected faults, resets protection, repairs damage or deletes event history. The prototype entries are expressly sample data.

In production, an error that blocks Run also stays discoverable at the Run control with an action to open the relevant details. Existing event history and safety messages remain separate from the Console's clearable log list.

## Fault library coverage

The library retains all current registry entries and reports target and assessment limits instead of implying a complete animation for each one.

| Type | Required target or model review | Prototype coverage |
| --- | --- | --- |
| Open circuit | Supported conductor or internal path | Full conductor sequence |
| Open live | Live role or named live terminal | Coverage details only |
| Open neutral | Neutral return; potential and current explained separately | Coverage details only |
| Open earth | Protective conductor; allow a behaviorally silent outcome | Coverage details only |
| Terminal disconnect | Exact terminal identity; preserve other connections | Draft state only; no full sequence |
| Reverse polarity | Declared conductor roles and compatible target | Coverage details only |
| Switched neutral | Switching path and remaining potential | Coverage details only |
| Earth fault | Declared fault path and applicable return | Coverage details only |
| Live to earth | Explicit impedance/return assumptions | Coverage details only; unavailable when undeclared |
| Smooth DC residual | Validated waveform-sensitive detection | Explicitly unassessed |
| Arc fault | Validated AFDD outcome, separate from an arc visual | Explicitly unassessed |
| Protection forced open | Device-state change, not a measured trip | Coverage details only |
| Protection bypass | Declared shunt and protective-device model | Coverage details only |
| Short circuit | Declared conductor pair and configured protection | Full protected-short sequence |

Only the first and last entries have complete injected-fault storyboard flows in the prototype. The third flow is the derived damage-budget demonstration. Each additional production sequence requires a model/target applicability decision, accepted result fields, consequence limits, repair semantics and an accessible static fallback.

## Review-state map

The state selector in the prototype contains these 21 review states:

| State | What it demonstrates |
| --- | --- |
| Healthy target | Selected target before any edit |
| Broken conductor | Six-step open-conductor story |
| Protected short | Declared bridge, trip latch and separate reset |
| Damage budget | Derived stress and separate replacement |
| No target | Selection guidance and disabled actions |
| Named terminal | Exact terminal label in the draft |
| Fault library | Search, category selection and all 14 entries |
| Introduce draft | Apply and cancel semantics |
| Paused playback | Stage selection, resume and presentation speed |
| Readings | Qualitative placeholders with limits |
| Repair controls | Clear / reset / operate / replace separation |
| Multiple faults | Focus, replay and individual or all-clear actions |
| Stale response | Pause and withhold consequence claims until fresh run |
| Unassessed fault | Keep unsupported coverage explicit |
| Editing blocked | Read-only and entitlement loss behavior |
| History & Undo | One edit per transaction, independent of playback |
| Console | Severity selection and separate log clearing |
| Animation preferences | Manual and OS reduced-motion behavior |
| Leave the lab | Stay, restore sample snapshot or keep edits |
| Reference photo | Existing local image or honest no-image state |
| Help | Four-step inspect, run, read and repair guide |

## Animation and physical explanation

The production direction uses Matter.js for bounded visual movement only. Accepted simulator results and modeled protection/damage events choose the visual state; Matter.js positions loose ends, contact movement, short-lived particles and the scene's subtle lighting accents. It cannot create a short, trip, fault current, damage result, temperature, arc energy or real-time trip duration.

When a lamp is supplied, the whole lamp/fixture silhouette should receive a restrained warm halo while the filament or source point remains legible. The glow should stay within the device's visual envelope and fade smoothly when supply is lost. A cable stress state may warm the cable region itself. Neither effect should imply measured heat or a real fire. No broad screen bloom or explosive short-circuit effect is proposed.

Use a fixed bounded step, clamp decorative bodies, stop on pause, hidden page, reduced motion, stale/blocked state and dialog open, then dispose engine bodies. Keep the cutaway, contact position, break gap and labels visible when all motion is disabled. Provide CSS/SVG static fallbacks for low-power or unsupported contexts.

## Source map and limits

| File | Role |
| --- | --- |
| `index.html` | Review workspace, Inspector, bottom shelf, Console entry and dialog shell |
| `studio.css` | Dark/light palette, desktop/phone layout, motion and Console styles |
| `scenes.js` | Three sample storyboards, 14 registry entries and 21 review states |
| `studio.js` | Standalone visual state, playback, draft, repair, history and dialogs |
| `../../open-drafting-table/artwork.js` | Existing device artwork used by the sample |
| `../../open-drafting-table/catalog-data.js` | Existing catalogue metadata |
| `../../../src/assets/images/` | Existing repository hardware references |

The prototype does not test browser geometry or prove electrical behavior. It is design-review evidence and uses no user circuit or server API.
