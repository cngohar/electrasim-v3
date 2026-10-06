/** Deterministic timed protection teaching model. No wall clock, document mutation or access policy. */
import type {
  CompileResult,
  ElectricalDiagnostic,
  ElectricalSimulationResult,
  ElectricalSimulationState,
  ProtectionControlEvent,
  ProtectionOperatingPoint,
  ProtectionTripReason,
} from './contracts';
import {
  FUSE_INSTANT_MULTIPLE,
  MCB_MAGNETIC_UPPER,
  MCB_THERMAL_ALPHA,
  MCB_THERMAL_K,
  residualTripDelaySeconds,
} from './protectionModel';

type TripEvent = Omit<ProtectionControlEvent, 'sequence'>;

const time = (seconds: number) => Math.round(seconds * 1_000_000) / 1_000_000;

const contactBranchId = (componentId: string, poleIndex: number) =>
  JSON.stringify(['device', componentId, `contact:${poleIndex}:no`]);

export interface ProtectionStepResult {
  readings: ProtectionOperatingPoint[];
  dueEvents: Map<string, TripEvent>;
  error?: ElectricalDiagnostic;
}

/**
 * Measures actual per-pole contact branch currents and integrates the declared
 * thermal/I²t/residual law on top of them. Bypassed poles carry current through
 * their fault shunts, so they do not trip — actual topology decides. A manual
 * OFF clears the latch and resets the energy; a tripped device stays open until
 * then (or until the whole run resets).
 */
export function evaluateProtection(
  compiled: Extract<CompileResult, { status: 'compiled' }>,
  electrical: ElectricalSimulationResult,
  state: ElectricalSimulationState,
): ProtectionStepResult {
  const readings: ProtectionOperatingPoint[] = [];
  const dueEvents = new Map<string, TripEvent>();
  const smoothDcFault = compiled.graph.faults.some((fault) => fault.type === 'smooth-dc-residual');
  for (const { componentId, model } of compiled.graph.devices) {
    if (model.kind !== 'contacts' || !model.protectionModel) continue;
    const protection = model.protectionModel;
    const runtime = state.protection[componentId];
    if (!runtime) continue;
    // Heat and residual integration advances only when simulated time has
    // actually advanced; repeated solves at the same timestamp stay idempotent.
    const dt = time(Math.max(0, state.elapsedSeconds - runtime.lastEvaluatedSeconds));
    runtime.lastEvaluatedSeconds = state.elapsedSeconds;
    const component = compiled.circuit.components.find((c) => c.id === componentId)!;
    const forced = !!(component.state.isBlown || component.state.isTripped);
    const poleCurrents = model.poles.map((_, index) => {
      const value = electrical.branchCurrents[contactBranchId(componentId, index)];
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    });
    // Operator reset: switching the protected device fully off clears the latch
    // and energy. A latched trip persists while the handle stays on.
    if (protection.kind === 'fuse' && component.state.isBlown) {
      runtime.tripped = true;
      runtime.reason ??=
        component.state.blownReason === 'overload'
          ? 'overload'
          : component.state.blownReason === 'overcurrent'
            ? 'short-circuit'
            : null;
    } else if (protection.kind !== 'fuse' && (!component.state.on || forced)) {
      runtime.heat = 0;
      runtime.tripped = false;
      runtime.reason = null;
      runtime.trippedAtSeconds = null;
      runtime.residualSinceSeconds = null;
    }
    const present = poleCurrents.filter((v): v is number => v !== null);
    const maxAbs = present.length ? Math.max(...present.map((v) => Math.abs(v))) : null;
    const ratedCurrentAmps = protection.kind === 'rcd' ? null : protection.ratedCurrentAmps;
    const currentMultiple =
      maxAbs !== null && ratedCurrentAmps !== null ? maxAbs / ratedCurrentAmps : null;
    const isResidualDevice = protection.kind === 'rcd' || protection.kind === 'rcbo';
    const residualMilliamps = isResidualDevice
      ? present.length
        ? Math.abs(present.reduce((sum, v) => sum + v, 0)) * 1000
        : null
      : null;
    // A smooth-DC residual component is invisible to AC/A/F devices (Type B
    // requirement); the raw measurement is still surfaced in readings.
    const residualDetectable =
      isResidualDevice && (!smoothDcFault || protection.residualType === 'B');

    let trip: { reason: ProtectionTripReason; atSeconds: number } | null = null;
    let pending: ProtectionOperatingPoint['pending'] = null;

    if (!runtime.tripped && !forced && component.state.on === true) {
      const overcurrentKind = protection.kind === 'mcb' || protection.kind === 'rcbo';
      const instantBand = overcurrentKind
        ? MCB_MAGNETIC_UPPER[protection.curve]
        : protection.kind === 'fuse'
          ? FUSE_INSTANT_MULTIPLE
          : null;
      if (currentMultiple !== null) {
        if (instantBand !== null && currentMultiple >= instantBand) {
          trip = { reason: 'short-circuit', atSeconds: state.elapsedSeconds };
        } else {
          const delta = currentMultiple ** 2 - 1;
          const rate =
            protection.kind === 'mcb' || protection.kind === 'rcbo'
              ? Math.sign(delta) * Math.abs(delta) ** MCB_THERMAL_ALPHA
              : protection.kind === 'fuse'
                ? delta
                : 0;
          const heatBefore = runtime.heat;
          runtime.heat += rate * dt;
          if (runtime.heat < 0) runtime.heat = 0;
          const limit = overcurrentKind
            ? MCB_THERMAL_K
            : protection.kind === 'fuse'
              ? protection.meltingIntegralSeconds
              : null;
          const projected =
            limit !== null && rate > 0
              ? time(state.elapsedSeconds + (limit - runtime.heat) / rate)
              : null;
          if (
            limit !== null &&
            rate > 0 &&
            (heatBefore + rate * dt >= limit ||
              (projected !== null && projected <= state.elapsedSeconds))
          ) {
            trip = {
              reason: 'overload',
              atSeconds:
                heatBefore + rate * dt >= limit
                  ? time(state.elapsedSeconds - dt + (limit - heatBefore) / rate)
                  : (projected as number),
            };
          } else if (limit !== null && rate > 0 && projected !== null) {
            pending = { reason: 'overload', atSeconds: projected };
          }
        }
      } else {
        // Accepted current unavailable: cooling along the same law (m = 0 gives
        // a unit decay rate for both MCB and fuse teaching elements).
        runtime.heat = Math.max(0, runtime.heat - dt);
      }
      if (
        residualMilliamps !== null &&
        residualDetectable &&
        (protection.kind === 'rcd' || protection.kind === 'rcbo')
      ) {
        const delay = residualTripDelaySeconds(
          residualMilliamps,
          protection.ratedResidualMilliamps,
        );
        if (delay !== null) {
          runtime.residualSinceSeconds ??= state.elapsedSeconds;
          if (state.elapsedSeconds - runtime.residualSinceSeconds >= delay) {
            const residualTrip = {
              reason: 'residual',
              atSeconds: time(runtime.residualSinceSeconds + delay),
            } as const;
            if (!trip || residualTrip.atSeconds < trip.atSeconds) trip = residualTrip;
          } else {
            const residualPending = {
              reason: 'residual',
              atSeconds: time(runtime.residualSinceSeconds + delay),
            } as const;
            if (!pending || residualPending.atSeconds < pending.atSeconds)
              pending = residualPending;
          }
        } else {
          runtime.residualSinceSeconds = null;
        }
      }
      if (trip) {
        runtime.tripped = true;
        runtime.reason = trip.reason;
        runtime.trippedAtSeconds = trip.atSeconds;
        dueEvents.set(componentId, {
          componentId,
          atSeconds: trip.atSeconds,
          type: protection.kind === 'fuse' ? 'fuse-operated' : 'protection-trip',
          reason: trip.reason,
          maxPoleCurrentAmps: maxAbs,
          currentMultiple,
          residualMilliamps,
        });
      }
    }
    readings.push({
      componentId,
      kind: protection.kind,
      closed:
        component.state.on === true &&
        !forced &&
        !runtime.tripped &&
        model.poles.every(
          (_, index) =>
            compiled.graph.branches.find((b) => b.id === contactBranchId(componentId, index))
              ?.closed,
        ),
      tripped: runtime.tripped,
      reason: runtime.reason,
      poleCurrentsAmps: poleCurrents,
      maxPoleCurrentAmps: maxAbs,
      currentMultiple,
      residualMilliamps,
      heat: runtime.heat,
      pending,
    });
  }
  return { readings, dueEvents };
}
