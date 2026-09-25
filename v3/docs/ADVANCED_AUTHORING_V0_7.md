# Advanced authoring and component breadth v0.7

Status: internally implemented and tested; electrical-SME and jurisdiction-pack review remain release gates.

## Authoring mechanics

- Drag a blank canvas region to create a selection rectangle; Ctrl/Cmd modifies the existing selection.
- Shift-click remains available for additive pointer selection.
- Ctrl/Cmd+C, Ctrl/Cmd+V, and Ctrl/Cmd+D copy, paste, and duplicate disconnected equipment. Deliberately omitting wires prevents accidental energization of an inferred topology.
- `R` or the inspector control rotates selected equipment 90 degrees without changing electrical topology.
- Left/center/top/middle alignment and horizontal/vertical distribution use atomic persisted position commands.
- Dropping equipment within a distribution enclosure records its enclosure id and snaps it onto the nearest represented DIN rail. Moving it out removes containment.
- Diagnose mode turns terminal activation into direct red/black probe placement. The select-based keyboard alternative remains available.
- Position, rotation, containment, wire routes, and viewport persist in schema-v2 project JSON and participate in command undo/redo.

## Added generic equipment

- Signed-reactance inductive and capacitive loads.
- Single- or three-phase-rated motor branch models.
- Relay contacts and power contactors as explicit controlled contact states.
- Regional generic outlet assemblies, including IEC generic, North American NEMA 5-15 educational, and BS 1363 fused forms. These are generic educational geometry and do not assert product certification.
- A directly authorable 230/400 V, 50 Hz, three-phase wye source with phase angles 0°, −120°, and +120°.

Reactive and motor branches are solved as complex AC impedances. Positive reactance produces lagging current and negative reactance produces leading current. Contact states alter topology rather than merely changing a label.

## Safety and scope boundaries

- Copy/paste never invents connections.
- Rotation and visual geometry never alter electrical results.
- Enclosure containment does not imply ingress, thermal, short-circuit, or assembly certification.
- The regional outlet selector is not a jurisdiction compliance verdict.
- Relay and contactor contact state is explicit; automatic coil/contact coupling and transient pickup/dropout remain a later internal checkpoint.
- Exact manufacturer appearance and datasets require licensing and authoritative source data.
