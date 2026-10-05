# ADR 0010: Deterministic control steps and explicit coil models

Date: 2026-10-05. Status: accepted for Phase 1.5D.0.

The MNA runtime computes an operating point, but cannot advance a timer or derive a relay's state from unspecified coil ratings. Legacy rail-driven contacts remain a separately labeled observation until a device has a declared model.

## Decision

Add an opt-in, versioned `ComponentState.coilModel` for devices with isolated coil/contact terminals. It declares a DC or single-phase AC nominal supply, nominal real power, pickup/dropout voltage ratios, and on/off delays. Its resistive equivalent is `Vnom² / Pnom`. Hysteresis and delays are teaching parameters, not manufacturer data; inductance, inrush, rectification, contact bounce, damage and protection remain unassessed. Contact ratings never supply coil ratings. Existing documents acquire no guessed coil values.

`simulate(circuit, { simulationState, deltaSeconds })` advances explicit simulated time. Omitting the state resets to time zero; omitting the delta performs a zero-time solve. State and events are transient and separate from the circuit document. A versioned coil field is additive to schema 2; old schemas still read, and older engines reject the unknown field rather than silently use it. Only settings, never timer progress or derived contact states, enter circuit saves/undo.

The core uses no wall clock. It solves at the interval start and at each scheduled contact event, applies simultaneous changes in canonical ID order, and returns measurements for the final topology. Event readings describe the coil immediately before the event. Delays count continuous excitation and cancel when the threshold condition ceases. Configuration signatures reject state from another circuit/model; manual switches and injected faults are inputs at the start of a step. Finite step, time, event and settle limits reject unstable feedback without publishing a fabricated operating point.

The app advances in explicit 100 ms steps while running a configured control circuit. Worker requests are sequential, stale replies cannot advance accepted time, and Stop/Run starts a fresh simulation. The same stateless options work in direct domain, Comlink and the local Hono calculation endpoint. Accepted exercise scoring does not consume caller-supplied runtime state.

## Scope

Phase 1.5D.0 delivers declared resistive coils, hysteresis, on/off delays, deterministic state/events/reset, essential settings/readings and runtime parity. Dimming, protective trip curves, fuse replacement, residual operation, damage and the complete Fault Lab lifecycle remain later 1.5D steps. Three-phase models remain 1.5E; full lab migration and legacy retirement remain 1.5F. All verification is local under root `AGENTS.md`.
