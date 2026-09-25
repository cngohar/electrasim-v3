# Assemblies and measurement v0.5

**Status:** implemented and locally validated on 2026-09-25.

## Scope

This pass adds practical distribution structures, loading-aware measurement instruments, and multi-selection authoring to the free simulator.

### Electrical assemblies

- Four-way ideal junction points
- Six-terminal neutral bars
- Six-terminal protective-earth / equipment-grounding bars
- Generic IEC-style consumer-unit enclosure
- Generic North-American service-panel enclosure

Junction and bar terminals are explicitly unified into one solved electrical node. Enclosures are visual grouping equipment and never create hidden electrical paths.

### Instruments

- **Digital AC voltmeter:** solved as a two-lead branch with 10 MΩ input impedance and a bounded 600 V range.
- **Series AC ammeter:** solved in the circuit with 0.01 Ω burden resistance and a bounded 20 A range.
- **AC clamp meter:** reads a selected branch non-invasively and does not modify circuit impedance.

Instrument snapshots report quantity, value, unit, and one of: `normal`, `open_lead`, `out_of_range`, or `no_target`. The SVG displays `OPEN`, `OL`, or `NO TARGET` instead of inventing a numeric result.

The current implementation reports AC RMS magnitudes from the deterministic phasor solver. It does not claim CAT safety certification, calibration, true-RMS bandwidth, waveform crest-factor performance, or a manufacturer identity.

### Editor productivity

- Shift-click multi-selection
- Group dragging through one reversible domain command
- Group arrow-key movement
- Align-left and align-top controls
- Dynamic accessible component/terminal structure

## Safety boundaries

Continuity and insulation-resistance testing are intentionally not simulated in this pass. Those tools require a dedicated de-energized test-source model, positive energized-circuit lockout, discharge behavior, and reviewed instructional warnings. A cosmetic tester that merely displays a value would be unsafe and misleading.

Neutral and protective bars remain electrically distinct. The editor does not silently create a neutral-earth bond. Any bond must be an explicit modeled conductor in a supported topology.

## Visual fidelity

The new original SVG artwork uses recognizable generic field cues: brass terminal bars, terminal screws, panel/consumer-unit rails, meter jaws, rotary selectors, display windows, input terminals, and device labels. It deliberately omits protected manufacturer trade dress and certification marks. Exact product packs still require licensed drawings, verified terminal maps, product data, and manufacturer-specific review.

## Validation

- High-impedance voltmeter loading and readings are tested.
- Open meter leads produce `open_lead`.
- Series ammeter current matches branch current while including burden resistance.
- Clamp current matches its selected branch without changing topology.
- A six-terminal bar is proven to form one solved node.
- Browser automation adds all assembly/instrument classes from blank, multi-selects and aligns equipment, and retains previous wire-routing, overload, mobile, and reduced-motion fault gates.

## Deferred follow-up

1. Dedicated safe continuity and insulation-resistance test-source modes.
2. Probe placement gestures and polarity/phase-angle display.
3. Selection rectangle, copy/paste, duplication, distribution, and rotation rules.
4. Enclosure containment semantics and DIN-rail snapping.
5. Independent electrical-SME review and calibrated manufacturer-specific instrument packs.
