# Phase 1.11 — Fault Lab redesign and Diagnosis retirement

**Status: complete locally on 2026-10-14 after explicit design approval; consolidated and focused recovery evidence.**
**Prepared:** 2026-10-14
**Checkpoint:** `fa74721694d57f9266c1988be51eea55b65cb92b` (`feat: complete simulator redesign and defer Challenge Mode`), pushed to GitHub before this proposal was created.

The user asked to remove the Diagnosis Lab, redesign the Fault Lab, and review a complete plan and design before implementation. The user approved this package on 2026-10-14. The replacement passed scoped local acceptance before the direct Diagnosis runtime was retired; [final local evidence](../audits/phase-1-fault-lab-redesign.md) records the completed functional stages and recovery. The [clickable design](../design/fault-lab/index.html) and [21-screen inventory](../design/fault-lab/SCREENS.md) remain the historical review surface. The exact retirement files and preservation rules are in [the Diagnosis retirement review](../design/fault-lab/DIAGNOSIS_RETIREMENT_REVIEW.md).

| Milestone | Local completion |
| --- | --- |
| 1.11.0 | User approved design and direct retirement scope before production edits. |
| 1.11.1 | Fresh accepted capture adapter, guarded edits and preserved persistence/access contracts. |
| 1.11.2 | Responsive real-target workflow, 14-type reviewed library, Console navigation and separate repair actions. |
| 1.11.3 | Labeled captured cutaways, bounded decorative motion and static fallback; measured separately. |
| 1.11.4 | Approved direct Diagnosis runtime retired after replacement acceptance; records/schema/grants retained. |
| 1.11.5 | 2,004 units, 138 unique source cases, 8 built cases, 842 runtime parity cases, 34 Worker/D1 groups and static/type/lint/build checks passed. Graph/docs updated. |
| 1.11.6 | Real target symbol/pins/routes and canonical canvas markers; Circuit/Inside toggle and animation placement repaired. All 14 types pass exact-target Apply/Clear with document restoration; 42 review/applied/cleared captures, 57 focused cases, rebuilt desktop/phone, types/lint/build/delivery budgets pass. The audit keeps the pre-follow-up full-suite boundary explicit. |

The requirements below preserve the approved implementation boundary. Historical Phase 1.9 performance exceptions remain unchanged. All changes are local and uncommitted.

## 1. Why these two labs need different treatment

The current Fault Lab is an exploratory editor feature: a user selects a real circuit target, deliberately injects or clears a fault, inspects the result, and repairs the circuit. The Diagnosis Lab is a generated exercise: the system hides an authored cause, presents symptoms, tracks hints and answers, grades a repair, and stores attempts.

The Fault Lab is the right place for the future detailed animation the user wants. Rebuilding Diagnosis first would retain two overlapping ways to inject and repair faults, with separate screens and persistence. Retiring the Diagnosis experience removes that overlap while leaving the circuit's shared electrical fault and protection models available to Fault Lab and ordinary simulation.

| Area | Fault Lab redesign | Diagnosis retirement |
| --- | --- | --- |
| User action | Inspect a selected live-circuit target, add a known fault/condition, run, understand and repair | Remove the separate hidden-cause exercise and its current entry points |
| Electrical behavior | Continue using current circuit, fault, protection and damage contracts | Do not delete or weaken shared fault/protection/damage behavior |
| Data | Preserve ordinary circuit content and history | Keep browser records and database tables/migrations; stop automatic Diagnosis resume and do not delete attempts |
| Learning | Explanations and model scope stay visible beside the circuit | Keep historical ADRs, plans and acceptance records; do not present the retired runtime as currently available |

This proposal does not remove Challenge Mode plans or expand the Phase 1.10 cleanup list. Challenge Mode remains deferred for a later stage as previously directed.

## 2. Design direction

The design keeps the accepted simulator shell: darker muted blue/slate, a centered header, a full-width bottom component shelf, right-side Inspector on desktop and a bottom Inspector sheet on phones. The phone sheet has a visible show/hide control and stays above the shelf. It gives Fault Lab a dedicated investigation stage without duplicating the circuit or inventing a second solver.

The demonstration area switches between the actual circuit and an expanded, labeled cutaway of the selected target. The cutaway is explanatory; canonical terminal IDs, wire anchors and saved topology remain unchanged. The Inspector has three tabs:

- **Explain** names the selected target, the cause and the parts of the response the model supports.
- **Readings** shows accepted source/branch/protection results, plus explicit unavailable or unassessed values.
- **Repair** offers the next valid edit. Cause clearing, breaker reset to OFF, operation to ON and damaged-item replacement stay separate actions.

Actual repository component photos remain near the selected component reference. When a selected wire or cable has no direct photo, the UI says so. A related lamp or breaker image must name that related device and cannot be presented as the faulted target. Physical photos and the electrical symbol/diagram remain separate.

The Console remains independent from fault state. Use visible **All / Error / Warning / Info** selection buttons, target navigation, and a clear action that only clears messages. Run-blocking errors also stay visible near Run. The prototype puts a Console entry beside the library, active-fault and history entries; production retains the accepted desktop drawer / phone sheet relationship to Inspector.

The full clickable sample has three sequences: open conductor, a declared short with a configured breaker, and a derived overload/damage-budget condition. It exposes all 14 registered fault types with their target/model coverage, but only the two fault examples have full injected-fault sequences. Overload is a third derived-condition sequence. No additional animation is promised for an unassessed model.

## 3. Model truth, captured evidence and motion

The interface must distinguish a circuit edit from an accepted electrical run and from its visual explanation:

1. A target and fault draft are reviewed before applying an edit. Cancel leaves the circuit unchanged; apply creates one undoable edit.
2. The circuit revision changes. Prior readings, protection events and damage claims become stale immediately.
3. A new local simulation produces the accepted response. Fault Lab records or derives its display only from the current circuit revision and that accepted response.
4. Playback reads a captured event/storyboard snapshot. Seeking, changing speed, pausing, replaying or comparing never mutates the circuit, solver clock, fault list, breaker latch or damage budget.
5. A repair, reset, operation or replacement is an explicit new edit. The next result requires another fresh run.

Before production work, inspect the current accepted result and event types to identify which transitions the engine can actually support. Where the solver returns only a final operating point, use a clearly labeled causal walkthrough between known before/after states; do not label it a measured time sequence. Add genuine event timing only where the engine already provides or this phase explicitly validates it.

Matter.js is used only for bounded decorative motion. Accepted engine outcomes select a visual state; Matter.js can move loose conductor ends, a breaker contact or short-lived visual particles. Physics cannot create a fault, calculate current, decide a trip, accumulate damage, measure temperature, predict an arc or claim a real trip time. A lamp's whole visible fixture may receive a restrained warm halo while the filament remains legible; the halo fades with the accepted supply state. Cable stress may tint the cable segment. Avoid page-wide bloom, sparks that imply assessed arc behavior, explosions, smoke or flame.

Use bounded fixed-step updates, clamp positions, lazy engine creation and disposal. Stop physics and playback on pause, hidden page, reduced motion, stale or blocked result, target/circuit replacement and open modal. Static SVG/CSS labels and contact/gap positions remain legible when motion is disabled. Historical solver and dense-render performance limits remain unchanged; any new visual budget must be measured separately.

## 4. Approved implementation sequence

### 1.11.0 — design and retirement scope lock

Review the prototype, screen inventory, fault coverage, model boundaries and every proposed Diagnosis-owned file. Record any additions/removals the user requests. Freeze the list before deleting code. This gate was satisfied by explicit user approval before implementation.

### 1.11.1 — preserve contracts and map the accepted result boundary

Trace fault edits, fresh-result invalidation, circuit revisions, protection operation, persisted damage, Undo, Inspector access, Console log ownership and membership/read-only behavior. Reuse current stores and domain functions where possible. Define the smallest adapter from accepted simulation output to Fault Lab display; do not fork solver truth.

### 1.11.2 — deliver the redesigned Fault Lab against the shared core

Replace the current dense Fault Lab surface with the reviewed workspace, responsive Inspector, Console entry, target/photo handling, searchable fault library, reviewed draft/apply/cancel, active-fault focus/replay/clear, edit history and valid repair actions. Keep existing circuits and file format intact. Implement only sequence storyboards whose model outcomes and targets are reviewed.

### 1.11.3 — implement bounded visual explanation

Connect accepted results and modeled events to the conductor, breaker, lamp and cable visuals. Implement Matter.js as a visual-only consumer with pause/reduced-motion/hidden-page/static-fallback safeguards. Keep the animation state separate from simulation inputs and saved circuit state.

### 1.11.4 — retire Diagnosis runtime after Fault Lab replacement is accepted locally

Remove the separately approved Diagnosis route, UI/store, grading/persistence runtime and user-facing entry points. Preserve shared solver, faults, repair, membership data required for compatibility, local attempt records and migration history. The exact inventory and integration hotspots are listed in the retirement review. Do not expand to generator/challenge cleanup without a separate dependency finding and user review.

### 1.11.5 — consolidated local acceptance and documentation

Run the scoped unit, source-browser, built-browser and local Worker/D1 checks below. Reconcile retired and added test cases explicitly. Update phase, progress, changelog, API/help copy and knowledge-graph evidence with exact results. No remote deployment or live-account access is part of this phase.

## 5. Required behavior and acceptance evidence

### Fault and simulation contracts

- Start from a real saved circuit and real selectable targets; protect target/terminal IDs, wire anchors, variants, circuit format and membership/access checks.
- Preserve the distinction between injected faults, derived stress, latched protection and irreversible damage.
- Clear one or all injected causes without silently resetting a breaker or replacing damage.
- Reset to OFF and operate to ON as separate actions. Replacement is its own undoable edit.
- A new circuit revision invalidates old readings and captured responses. Do not replay a stale trip/damage claim as current.
- Preserve source/branch distinctions, current fresh-result guards, readiness errors, unsupported state behavior, ordinary Save/Undo and Console/event history.
- Keep unassessed faults visible with a clear reason. An animation cannot make an unassessed electrical model appear supported.

### User interface

- Reproduce the reviewed desktop and phone behavior at small/large sizes, dark/light themes, mouse, touch, keyboard and reduced motion.
- Verify target selection, photos/no-photo explanation, fault draft cancel/apply, catalogue filters, stage pause/seek/replay/speed, comparison, tab navigation, repair, active fault list, multiple faults, Undo, history, blocked/stale/unassessed/empty states and leaving/restoring.
- Console severity buttons filter in place; Clear messages does not change a fault, device state, damage, event history or circuit revision. Run-blocking errors remain discoverable near Run.
- Preserve entry and exit fades, focus restoration, modal inertness and OS reduced motion. Do not hide Console or zoom controls behind phone sheets or the bottom shelf.
- Inspect actual rendered desktop/phone screenshots and adjust layout from evidence before sign-off. A static DOM check alone cannot accept visual geometry.

### Electrical, service and persistence coverage

- Test fault applicability and target roles at domain/store boundaries, not just whether a catalogue card renders.
- Exercise clear/reset/operate/replace with fresh simulation outcomes, Undo, stale result and preserved unrelated faults/connections.
- Check original-circuit export/basic-copy/read-only flows and all local membership/access conditions affected by Diagnosis removal.
- Verify Diagnosis routes and runtime entry points are removed only after the replacement is accepted, while saved circuits and pre-existing Diagnosis records remain untouched. Do not issue a destructive database migration or browser-storage clear.
- Re-run affected source and built browser cases across supported browser projects. Re-run broader simulator and real local Worker/D1 parity checks if shared contracts, authorization, or API route behavior change.
- Keep tests for shared fault/protection/damage semantics. Remove only tests for the retired Diagnosis product behavior and add new Fault Lab acceptance coverage. At the beginning of implementation, record the exact current registered unit case count and the case count in the exact removal list. Final reporting must show baseline, retired cases, added cases and resulting count; a lower count alone is not evidence of an incomplete run, and an unchanged count is not evidence that the old behavior was removed.
- Keep separate outcomes for unit checks, source browsers, built-output browsers, local Worker/D1 and performance. Do not call old Phase 1.9 performance green: simulation p95 was 56.65 ms vs 8 ms, generator timing limits remain open and dense 60 fps remains unmet.

## 6. Files and component boundaries

The current implementation map and storage protection are enumerated in [DIAGNOSIS_RETIREMENT_REVIEW.md](../design/fault-lab/DIAGNOSIS_RETIREMENT_REVIEW.md). Key shared paths that this redesign must preserve include:

- `packages/domain/src/faults.ts`, `packages/domain/src/faultApplicability.ts`, fault topology/propagation and the current simulation/protection/damage engine.
- `src/store/circuitStore.faultActions.ts`, current fault edit and repair actions, result freshness guards and accepted `src/ui/components/inspector/InspectorFaultLabView.tsx` / `FaultRepairPanel.tsx` contracts.
- `src/ui/canvas/FaultFxLayer.tsx`, `MatterLayer.tsx` and existing effect helpers as consumers of accepted state, subject to the same visual-only boundary.
- Ordinary circuit save/restore, history, event log, Console, validation, readings and component photo registry.

The Phase 1.10 framework and simulator structure remain in place. This is a redesign of the current lab workflow and presentation, not a simulator, Astro, React, data-format or solver rewrite.

## 7. Local-only and deployment boundary

All implementation and acceptance stay local. Use Wrangler `--local` and local persistence only for any required Worker/D1 checks. Do not restore the old Cloudflare credentials, contact the live account, add credentials, or deploy. The later new account requires its own explicit authorization; this plan grants none.

## 8. Historical design review checklist

Before implementation began, the package required review of:

1. Whether the desktop/phone Fault Lab workspace, Console and animation direction match the intended product.
2. Whether the three representative sequences and stated model limits tell the right story.
3. Whether the direct Diagnosis-owned removal list is complete, and whether any integration or generator cleanup should be added to the reviewed scope.
4. Whether the preservation rules for `diagnosis_attempts`, browser records, existing access capability data, Challenge plans and historical evidence are acceptable.

The review gate was satisfied on 2026-10-14. The next chat can resume from [the current handoff](../handoffs/fault-lab-next-chat.md) and [the acceptance record](../audits/phase-1-fault-lab-redesign.md).

## Approval and implementation checkpoint

On 2026-10-14 the user accepted this review package and instructed implementation. Fault Lab replacement and scoped local acceptance preceded Diagnosis retirement; consolidated functional acceptance and focused recovery are complete. Conditional generator/challenge cleanup is excluded. No commit, push, deployment or stored-data deletion is authorized. Evidence is tracked in `docs/audits/phase-1-fault-lab-redesign.md`.
