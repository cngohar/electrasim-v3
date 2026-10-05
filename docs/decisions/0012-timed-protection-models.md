# ADR 0012: Timed protection teaching models

Date: 2026-10-05. Status: accepted for Phase 1.5D.2.

Protection computation previously produced only legacy demos and never exposed timed operation through `simulate()`. Extend [ADR 0010](0010-deterministic-control-steps.md) and [ADR 0011](0011-rms-dimming-and-timer-programs.md) through the same domain/runtime boundary.

## Decision

Add an optional, versioned `state.protectionModel` for the automatic overcurrent/residual families (`mcb`, `mcb-type-c`, `mcb-type-d`, `mccb`, `fuse`, `fused-spur`, `rcd`, `rcbo`, `afdd`). Declarations stay opt-in; an existing saved document never acquires a guessed protection law. Isolators and surge devices never declare a `protectionModel` and cannot auto-trip. A protection model cannot coexist with a coil, timer or dimmer model on one component.

Four kinds carry explicit teaching laws:

- **mcb / rcbo overcurrent:** the IEC 60898-1 teaching law — conventional non-trip below 1.13×In, instantaneous zone at the curve's upper band edge (B 5×In, C 10×In, D 20×In), and the thermal power law `∫ sign(m²−1)·|m²−1|^α dt ≥ K` calibrated to the standard anchors (3600 s at 1.45×In, 60 s at 2.55×In).
- **fuse:** `∫(m²−1) dt ≥ meltingIntegralSeconds` (default teaching anchor 10), instantaneous at ≥10×In, passive cooling at the same law.
- **rcd:** residual current magnitude `|Σ signed pole currents|` compared with the declared IΔn; the device starts timing when it reaches 0.5×IΔn and trips at the IEC 61008-1 general-type break times (0.6 s in the 0.5–1× band, 0.3 s at 1×, 0.15 s at 2×, 0.04 s at 5×).
- **rcbo:** both laws; the earliest due trip wins.

Measurements always drive decisions: worst-pole current decides overcurrent, the signed pole sum decides residual ground-fault detection. Bypassed poles carry current around the device through their fault shunts, so injected `protection-bypass` makes the device blind to the downstream load — actual topology decides. Non-B residual types stay blind to a declared `smooth-dc-residual` fault component; Type B trips on it. The raw residual is still reported.

## State, events and boundary

Transient heat, trip latches, residual-since timestamps and the last-evaluated second live only in `simulationState.protection`. A tripped device stays open until the user switches it OFF (operator reset) or the whole run resets; a latched trip never persists into the saved circuit. Overload/fuse trip times are projected each solve as `pending` and consumed by the shared event clock with microsecond resolution; residual delay bands, like coil/timer pending deadlines, step continuously. Events carry pre-event pole currents, multiple of In and residual mA; post-event readings describe the opened topology. Cooling uses the same unsigned laws while no current flows.

Static `solveCircuit()` never trips. Configuration changes require reset; turn inputs and faults remain step inputs. The trip boundary crosses the step's µs-scheduled event time, never wall time. This teaching boundary does not certify discrimination between devices, prospective-fault energy, arc-fault physics, damage or RCD selectivity.

Contract version remains 1, shared model/capability version becomes `1.5d.2.1`, the timed engine becomes `mna-controls-3`, and damage/Fault Lab reset/repair remains **1.5D.3**. Existing static fan/driver exercises keep the tagged legacy observation boundary; no numerical protection result uses legacy fallback.
