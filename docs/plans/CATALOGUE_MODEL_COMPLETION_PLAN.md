# Catalogue model completion proposal

Status: **proposed scope; no missing load models implemented by the feedback repair**. See [the current catalogue audit](../audits/catalogue-simulation-gaps.md) for the exact 31 default unassessed entries and conditional settings. Completed Phase 1 milestones cover their documented models, not every catalogue appliance.

## Order of implementation

| Slice | Deliverable | Required evidence |
| --- | --- | --- |
| 1 · Common lamps | Explicit AC electronic lamp teaching models for LED bulb/downlight, CFL, fluorescent tube and smart LED. Store design voltage, an explicit adjustable operating band, on/off state and power law. At 12 V, a declared 230 V lamp model must report out-of-range operation visibly. | Below/within/above-band and open/series/parallel cases; no lamp illumination without accepted operating power; saved defaults, supply edits, direct/Comlink/local Worker parity and source/built browser results. |
| 2 · Single-phase motors and fans | Declared motor equivalent, rated supply, input power and operating limits for fan/pump/motor families. Clearly bound startup, mechanical load and reactive behaviour. | Electrical conservation and operating bands; low voltage, switching and multiple loads; no invented shaft speed or universal power factor. |
| 3 · Appliance loads | Declared consuming branches and mode/state assumptions for heater/control/compressor/electronic appliance groups, rather than converting all nameplate watts into a resistor. | Independent expected results for each accepted appliance class, off/open/invalid supplies and combined circuits; UI states track the accepted branch results. |
| 4 · Remaining sources and controls | PV generation, autotransformer, sensors and automatic control semantics. Make existing configurable coil/timer/protection/motor prerequisites discoverable in ordinary placement. | Source and contact identity, isolation where applicable, explicit input/state/time models, unsupported limits and configuration persistence. |

## Model decisions before numerical implementation

- Select and document the electronic-load law and numerical method. A regulated lamp is not a fixed resistor inferred from its wattage.
- Use reviewed catalogue/manufacturer data where available. Any generic operating bands must be explicit teaching assumptions and editable; a 230 V nominal label alone is not an operating range or destruction threshold.
- Keep supply compatibility, operating power, damage and protective operation separate. Do not introduce guessed trips or damage to make a lamp react.
- Preserve existing source profiles, terminal mappings, fixed-resistance models, timed controls and faults; changes must pass the affected broader core and runtime gates.
- Record each newly supported default and each remaining gap in the graph and audit. Never count a visible warning as implementation of a missing calculation.

## Acceptance

A component is counted as operational only when its default or explicitly required configuration has a declared numerical model, independent expected-value evidence and actual browser behaviour at valid and invalid supplies. End each slice with an updated default catalogue inventory. All development and verification are local under AGENTS.md.
