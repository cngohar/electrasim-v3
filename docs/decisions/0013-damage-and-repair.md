# ADR 0013: Declared damage and Fault Lab repair

Date: 2026-10-06. Status: accepted for Phase 1.5D.3.

## Decision

The bypass teaching fault disconnects the sensed pole path and routes current through an external ideal shunt. This makes the previously indeterminate parallel-ideal-path case explicit; it does not estimate the current split through a real bridge. Forced-open and bypass readings use actual compiled contact paths. The shared clock also settles the requested final timestamp before accepting changed inputs, so preceding stress is never integrated using a later current.

Extend the deterministic event clock with optional version 1 damage declarations. Resistive loads accept either a current or terminal-voltage stress budget; wires accept a current stress budget. Ratings, cable ampacity and protection laws never imply a damage declaration. Other device families, insulation failure, arcing, temperature, fire, cooling and manufacturer lifetime remain unassessed.

The teaching law integrates `max(I² − Icontinuous², 0)` in A²s or `max(V² − Vmaximum², 0)` in V²s, using actual branch DC/RMS current or the load's measured terminal pair. Exposure is cumulative until an explicit replacement/reset, with no thermal recovery claim. The declared budget opens the element at the first microsecond at or after crossing. Independent branch currents govern cable damage even when protection exists elsewhere. Protection and damage share the event clock; readings after an event come from the changed topology. Events retain pre-event measurements and occur once per transition.

Static solves report damage as unassessed. Timed state records exposure and open latches separately from saved drawings. The app projects irreversible damage and operated fuse links into the existing saved `isBlown` / `isBusted` fields; Stop/Run resets time and resettable trips, but does not replace damaged hardware. Fuse operation is a distinct event and requires replacement. An ordinary MCB/RCBO/RCD trip never creates damage. Domain and local Hono callers receive the same state/events and may explicitly start a fresh experiment by omitting transient state.

Fault Lab keeps three actions distinct: clear injected faults, reset resettable trips, and replace damaged components/wires. Clearing faults leaves damage and trip latches in place. Replacement preserves wiring, configuration and remaining faults; rerunning an unrepaired fault can operate protection or damage the replacement again. Replacement requires a stopped run. Fault injection/clearing during an accepted timed run preserves its clock and latches. Existing membership checks and exercise constraints remain; full authored exercise/result migration belongs to 1.5F.

The existing application start guard still requires replacement/reset before starting a new run with saved failed items. The running step may continue to show the post-event open topology; a pure calculation may inspect saved open elements. A blocked restart neither repairs the drawing nor invents zero current/rating measurements.

Contract version remains 1. Shared model/capability version becomes `1.5d.3.1`, timed engine `mna-controls-4`; old transient state is rejected. All acceptance uses localhost and isolated local persistence.
