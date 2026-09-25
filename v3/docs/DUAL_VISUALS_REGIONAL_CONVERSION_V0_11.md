# Dual visuals, live wiring, and regional conversion v0.11

## Dual visual language

The workbench now defaults to **Beginner icons** and exposes a persistent Visual style selector. Users can switch at any time between:

- beginner icon cards in the component bench and simplified icon equipment on the canvas; and
- the existing technical-hybrid equipment drawings.

Both views use the same component ids, terminals, topology, ratings, state overlays, diagnostic probes, and simulation results. Changing visual style never alters electrical evidence. The selection is stored locally for the next visit.

## Live wire attachment

While one or several components are dragged, every attached wire path is now recomputed from provisional terminal positions on each pointer movement. The equipment and wires therefore move together immediately. Pointer release still sends one bounded atomic position command to persistence and undo history; the UI no longer waits for that server round trip before aligning wires.

## Confirmed regional conversion

Changing the supply family on a custom circuit now presents a conversion summary and requires confirmation. Accepting converts compatible existing equipment:

- nominal source voltage and frequency;
- source label and single-phase winding;
- default breaker label, current rating, and regional protection model;
- resistive load impedance, scaled to preserve approximate real power;
- coil rated voltage and impedance;
- generic socket/outlet form and label; and
- the persisted circuit supply family.

Custom or unsupported equipment is retained and explicitly left for review. Cancelling restores the previous selector. This conversion is a convenience migration, not a jurisdictional compliance verdict.

## Conditional logic boundary

The simulator contains physical conditional behavior: switches alter topology, protection opens on solved current/time evidence, diagnostic workflow transitions are ordered, and energized coils pick up assigned relay/contactor contacts. It does not yet provide a general PLC, Boolean function-block, ladder-logic, or arbitrary scripting engine.

## Validation

Strict TypeScript, targeted domain/UI tests, JavaScript parsing, and desktop/mobile browser journeys pass. Browser validation reports no page errors or horizontal overflow and retains reduced-motion persistent-danger evidence.
