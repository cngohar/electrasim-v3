# ADR 0015 — Declared three-phase motor and coil controls

Date: 2026-10-06. Status: accepted and implemented locally in **1.5E.2**;
[scope and acceptance](../audits/phase-1-three-phase-motor.md).

## Decision

Keep E.0's real-conductance phasor solver. Add an explicit, opt-in
`state.motorModel` for `motor-3phase`: a balanced, unity-power-factor delta
equivalent with declared electrical input power, nominal RMS L-L voltage,
frequency, operating voltage range, permitted voltage unbalance and required
ABC/ACB sequence. Each delta resistance is `3 V_LL² / P_input`. This is a
teaching approximation, never an inferred induction-motor impedance from its
mechanical nameplate. No reactive power, efficiency, shaft speed/torque, starting
current, stall, phase-loss heating or damage is calculated.

Successful teaching operation requires three distinct conductive phase paths
from one active phase system, accepted L-L voltages within the declared range,
frequency, balance and required sequence. Trace source phase identity through
wires and contacts, excluding source/load equations. Backfed terminal voltage
alone cannot establish a connected phase. Swapping two motor leads reverses
sequence; cyclic permutations preserve it. A single live, lost phase, repeated
phase, reversed sequence or invalid operating point cannot animate the motor as
running. Under these conditions electrical readings describe only the passive
equivalent; actual motor operation remains blocked/unassessed.

Append isolated A1/A2 terminals to the three-pole contactor, preserving indices
0–5 and their anchor coordinates. An explicit AC coil uses actual terminal-pair
RMS voltage, frequency, consumption, hysteresis and on/off delay. Reuse the
existing deterministic state validation, configuration identity, microsecond
clock and bounded event semantics. Re-solve at each contact event and return
the final phasor topology. Saved `on` never overrides an automatic declared
coil. Transient state is not persisted in the drawing.

Report contact pole current as complex RMS and residual as the magnitude of
the vector sum of signed sensed-pole currents. Contact capacity, residual mA,
coil consumption and motor operation are separate. Bypass current stays outside
the sensed pole. Independent reference domains have no defined relative phase,
so their pole RMS readings remain available while the residual is unavailable.
These readings do not enable automatic phasor protection or
damage; their coverage stays unassessed. No scalar signed-current substitution
or lab repair/standards verdict is supplied. DOL guide migration and the full
three-phase gate remain **E.3**; complete lab/scoring retirement remains **1.5F**.

All acceptance and runtime services remain local under root `AGENTS.md`.
