# ADR 0011: RMS dimming and explicit timer programs

Date: 2026-10-05. Status: accepted for Phase 1.5D.1.

The previous dimmer implementation compiled only a manual contact, so changing its level could not change the load. The remaining timer families had neither a program nor a relationship to simulated time. Extend [ADR 0010](0010-deterministic-control-steps.md) through the existing domain/runtime boundary.

## Dimming decision

The two catalogue dimmer controls use an ideal synchronous switching approximation for fixed-resistance single-phase AC networks. The existing `state.speed` range 0–3 for light dimmers and 0–5 for fan regulators sets the conducted fraction of sine-wave **energy**, `d = speed / maximum`. The five-position fan range preserves existing generated documents. An omitted setting means full output when enabled; zero and manual OFF open the switch. This setting is neither firing angle nor a promise of linear perceived brightness or motor speed.

Solve every distinct switching topology independently using MNA. All dimmers share aligned conduction windows within a source: cascaded controls use the overlapping window, not a product of arbitrary voltage multipliers. For each branch, report `sqrt(sum(weight * value²))` for RMS voltage/current and `sum(weight * power)` for real power and wire losses. Retain the branch orientation where it is consistent. Each sample must pass conservation checks; signed RMS magnitudes from different waveforms are not quantities that can be added for KCL/KVL. Result checks mark their sample scope.

This preserves zero ideal dimmer dissipation, actual wire losses and shared feeder behavior. Source real power need not equal RMS voltage times RMS current. Calculate terminal-pair voltages from the difference **within each sample**, then aggregate; subtracting two RMS potentials is incorrect. Omit potentials whose sample gauges differ and pair voltages across independent references.

Bounds are eight controls / nine switching samples per solve, plus the existing MNA and event-step limits. A branch reversing direction between samples is explicitly unsupported by this signed scalar presentation. DC, LED/driver and motor laws, coil/timer-electronics/transformer excitation in the affected network, arbitrary switching phase offsets, harmonics, device leakage, switch losses and damage are unassessed. Independent unaffected networks retain their existing models. A reduced RMS setting cannot make an incompatible on-state voltage suitable.

## Timer decision

Add an optional, versioned `state.timerModel`; no existing document acquires a guessed program. Mechanical/digital schedule timers have a fixed daily/weekly cycle, explicit start offset and up to 32 sorted, separated half-open ON intervals. Their two-terminal interface exposes no clock supply: declare an independent ideal external clock, with clock consumption/backup unassessed. `on` enables/disables the program. Schedules use simulated seconds, never wall time, timezones or daylight saving.

Staircase/countdown timers have an explicit interval and restart/ignore retrigger policy. A rising manual input starts the interval; releasing it re-arms the input without cancelling the interval, and a held input cannot repeatedly restart it. The staircase clock is external. The three-terminal countdown requires a declared resistive electronics supply across L-in/N-in, including waveform, frequency where applicable, real power and minimum voltage ratio. Loss of that measured supply opens the contact and clears its deadline; restoration needs a fresh trigger. Electronics consumption remains separate from switched pole current.

Timer latches, contact drive and deadlines live only in `simulationState`. Configuration changes require reset; dimmer levels, manual inputs and faults remain step inputs. Canonical copies of programs, windows and supply ratings keep the configuration identity independent of JSON field order. The shared event loop orders simultaneous coil/timer transitions canonically, solves after contact changes, and publishes final measurements plus pre-event contact/coil readings. Existing bounded step/reset/replay semantics remain. An interval is limited to one day and all timing uses microseconds.

## Consumers and boundary

The inspector provides program settings, runtime dimmer levels/triggers, measured clock status and next transitions. Settings lock during runs and authored exercises, participate in undo/redo and survive file/IndexedDB recovery. The canvas uses derived timer contact state. App, Comlink, local Hono and Bun/workerd use the same functions and result version. Membership never changes the equations; the existing paid timer catalogue policy remains.

Contract version remains 1, shared model/capability version becomes `1.5d.1.1`, the timed engine becomes `mna-controls-2`, and standalone dimming uses `mna-dimming-1`. Circuit schemas remain 1/2; older readers reject the unfamiliar timer field. This calculation state is not accepted as authoritative exercise scoring evidence. Protection remains 1.5D.2, damage/Fault Lab lifecycle remains 1.5D.3, and full lab migration remains 1.5F. Development and acceptance remain local under root `AGENTS.md`.

The dimming guide now uses the supported incandescent model and demonstrates level-dependent readings. Existing unmigrated fan/driver exercises retain the 1.5C.5 tagged legacy continuity/fault observation boundary and their saved recipe identities; numerical dimming, motor speed and operating results remain unavailable. Zero level opens this qualitative path too. Explicit timed requests, unsupported waveform/reactive/limit cases and numerical failures cannot use this fallback. Full model-aware grading remains 1.5F.
