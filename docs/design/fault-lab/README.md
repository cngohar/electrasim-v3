> **Current status (2026-10-14):** The user approved this design. Phase 1.11 implementation and aggregate local functional acceptance are complete, including focused Console recovery. The replacement passed scoped acceptance before the approved Diagnosis runtime was retired; browser/D1 records and shared electrical behavior remain. See [the audit](../../audits/phase-1-fault-lab-redesign.md). The prototype below remains design history, not electrical test evidence.

# Fault Lab redesign · review package

**Historical checkpoint: this package was prepared for review before production implementation. That approval gate is now satisfied.**

This package proposes retiring the separate Diagnosis Lab experience and replacing the current Fault Lab surface with a complete, evidence-led investigation workflow. The shared circuit, simulation, protection, damage and repair systems remain in use. The proposal does not authorize code deletion or remote work before the design review.

The user requested that the current repository be checkpointed and pushed before the plan and design were prepared. The checkpoint is `fa74721694d57f9266c1988be51eea55b65cb92b` (`feat: complete simulator redesign and defer Challenge Mode`). The design files in this folder and the supporting plan are local review material created after that push.

## Open the prototype

Open `index.html` in a browser, or start the local-only static preview from the repository root:

```sh
node scripts/preview-fault-lab.mjs
```

Then open `http://127.0.0.1:8765/docs/design/fault-lab/index.html`. To choose another available local port, set `FAULT_DESIGN_PORT`, for example `FAULT_DESIGN_PORT=8786 node scripts/preview-fault-lab.mjs`.

The prototype loads the installed Matter.js build, existing catalogue artwork and existing local reference images. It has no Worker, API, simulator-store, saved-circuit or network connection. Every reading and log entry is labeled as illustrative sample content. The actual server binds to loopback and serves only the files listed in its allowlist.

## What to review

- The darker slate visual system; centered header; circuit/cutaway switch; full-width bottom shelf; desktop right Inspector and phone bottom-sheet Inspector.
- The six-stage conductor-break and short-circuit examples, plus the derived overload/damage-budget example.
- Fault Inspector **Explain**, **Readings** and **Repair** tabs, the 14-type library, target/model limits, history and Undo.
- The Console entry and visible **All / Error / Warning / Info** selection buttons. Clearing Console messages leaves faults, protection and damage unchanged.
- The separate **Apply sample edit → Run sample → Play** flow. The Run button creates only an illustrative response; it never calls a simulator.
- The separate actions to clear a cause, reset a breaker to OFF, switch it ON, and replace damaged cable.
- The 21-state map under **Review states**, including empty, stale, blocked, unsupported, multiple-fault and leave/restore views.
- The physical-reference behavior. Exact cable photography is unavailable in the repository; those targets say so instead of showing an unrelated device as the cable.

The full screen inventory and flow notes are in [SCREENS.md](SCREENS.md). The product and implementation sequence is in [the Phase 1.11 plan](../../plans/FAULT_LAB_REDESIGN_PLAN.md). The exact Diagnosis retirement and data-preservation proposal is in [DIAGNOSIS_RETIREMENT_REVIEW.md](DIAGNOSIS_RETIREMENT_REVIEW.md). The next-chat handoff is [here](../../handoffs/fault-lab-next-chat.md).

## Prototype limits

This is a clickable design study, not an electrical simulator. It demonstrates layout, state transitions, wording, animation controls and the separation between edits. It does not calculate currents, trip times, temperatures, arc energy, standards compliance or real component failure. Only two fault examples have a full sequence; the overload example represents a configured damage budget. Other catalogue items show target and coverage requirements until each receives an assessed model and a reviewed storyboard.

The prototype has not received final visual review in the restricted authoring environment. A browser process could not be launched there, so no browser screenshot or responsive-layout acceptance is claimed. The files are ready for direct review in a normal local browser. This limitation does not change the already-pushed Phase 1.10 checkpoint.
