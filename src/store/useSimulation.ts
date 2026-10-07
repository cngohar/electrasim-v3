/**
 * useSimulation — bridges the circuitStore → simulation engine → uiStore.
 *
 * Phase 5: simulation runs in a Web Worker via Comlink (`simulateAsync`).
 * The worker receives the latest `Circuit`, returns a `SimulationResult`
 * via structured cloning, and the main thread stays free to render at
 * 60 fps even on dense circuits.
 *
 * This hook handles three concerns the caller would otherwise repeat:
 *
 *   1. **Debounce**: rapid graph mutations collapse into a single sim run.
 *      Canvas drags commit once on release; keyboard and bulk edits can still
 *      arrive in bursts.
 *   2. **Stale-call protection**: if a new sim is requested while one is
 *      in flight, the older result is dropped. Each request bumps a
 *      monotonic sequence number.
 *   3. **Log de-dup**: the same errors/warnings are not re-logged when
 *      the structural signature is unchanged.
 *
 * Falls back gracefully to main-thread `simulate()` if the worker can't
 * start (see `client.ts`).
 */

import { COMPONENT_DEFS } from '@electrasim/domain';
import type { ElectricalSimulationState } from '@electrasim/domain/core/contracts';
import { circuitRevision } from '@electrasim/domain/simulationEvidence';
import { useEffect, useRef, useState } from 'react';
import { simulateAsync } from '../sim-worker/client';
import { useCircuitStore } from './circuitStore';
import { useSettingsStore } from './settingsStore';
import { AccessError, authorizeCircuit, useSimulatorAccess } from './simulatorAccess';
import { useUiStore } from './uiStore';

// Keep continuous drags out of the worker-clone path. A 50 ms quiet period is
// still effectively instant for toggles and edits, while a gesture becomes one run.
const DEBOUNCE_MS = 50;

/** Shared empty set — avoids allocating one per simulation run. */
const EMPTY_INDEX_SET: ReadonlySet<number> = new Set<number>();

export function useSimulation() {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const globalVoltage = useCircuitStore((s) => s.globalVoltage);
  const supply = useCircuitStore((s) => s.supply);
  const faults = useCircuitStore((s) => s.faults);
  const simRunning = useUiStore((s) => s.simRunning);
  const accessRevision = useSimulatorAccess((s) => s.revision);
  const regulationStandard = useSettingsStore((s) => s.regulationStandard);

  // Track the last "errors signature" so we don't re-log identical errors.
  const lastSignatureRef = useRef<string>('');
  // Monotonic sequence per request; results from older sequences are dropped.
  const seqRef = useRef(0);
  // Debounce timer.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runtimeRef = useRef<ElectricalSimulationState | undefined>(undefined);
  const acceptedInputsRef = useRef<unknown[]>([]);
  const acceptedTickRef = useRef(0);
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    // Allocate a revision as soon as the inputs change. Waiting until the
    // debounce fires leaves a window where the previous worker request can
    // publish a result for a circuit that is no longer current.
    const mySeq = ++seqRef.current;
    const membershipRevision = accessRevision;
    const inputs = [
      components,
      wires,
      globalVoltage,
      supply,
      faults,
      accessRevision,
      regulationStandard,
    ];
    const clockStep =
      runtimeRef.current !== undefined &&
      clockTick !== acceptedTickRef.current &&
      inputs.every((value, i) => value === acceptedInputsRef.current[i]);
    if (clockTimerRef.current) clearTimeout(clockTimerRef.current);

    if (!simRunning) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      useUiStore.getState().setSimResult(null);
      runtimeRef.current = undefined;
      acceptedInputsRef.current = [];
      acceptedTickRef.current = clockTick;
      lastSignatureRef.current = '';
      return;
    }

    // Never display a result computed for the previous graph while the
    // replacement request is debouncing or running.
    if (!clockStep) useUiStore.getState().setSimResult(null);

    if (timerRef.current) clearTimeout(timerRef.current);
    const requestDelay = clockStep ? 0 : DEBOUNCE_MS;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      // Snapshot the inputs at scheduling time so a later mutation
      // doesn't slip into the worker call we're about to make.
      const circuit = { components, wires, globalVoltage, supply, faults };

      // Clock-only continuation reuses this run's authorization. Every input,
      // membership revision and new Run goes through the fresh action check.
      void (clockStep ? Promise.resolve() : authorizeCircuit(circuit))
        .then(() => {
          if (mySeq !== seqRef.current || !useUiStore.getState().simRunning) return null;
          return simulateAsync(circuit, {
            appMode: 'pro',
            standard: regulationStandard,
            ...(runtimeRef.current
              ? { simulationState: runtimeRef.current, deltaSeconds: clockStep ? 0.1 : 0 }
              : {}),
          });
        })
        .then((result) => {
          // Drop result if a newer request was kicked off in the meantime
          // or the user paused the sim while we were waiting.
          if (
            !result ||
            mySeq !== seqRef.current ||
            membershipRevision !== useSimulatorAccess.getState().revision
          )
            return;
          if (!useUiStore.getState().simRunning) return;
          const latest = useCircuitStore.getState();
          if (
            latest.components !== components ||
            latest.wires !== wires ||
            latest.supply !== supply ||
            latest.globalVoltage !== globalVoltage ||
            latest.faults !== faults
          )
            return;

          // Derived solver effects are one internal projection, not new user edits.
          // Authorization was checked for this exact request; membership never changes physics.
          const modeled =
            !result.legacyObservation &&
            (result.electrical?.status ?? result.phasor?.status) === 'converged';
          const current = useCircuitStore.getState();
          const changedComponents =
            modeled &&
            current.components.some(
              (component) =>
                (result.blownComponents?.some((item) => item.id === component.id) &&
                  !component.state.isBlown) ||
                (result.trippedComponents?.some((item) => item.id === component.id) &&
                  !component.state.isTripped),
            );
          const changedWires =
            modeled &&
            current.wires.some((wire) => result.bustedWires?.has(wire.id) && !wire.isBusted);
          if (changedComponents || changedWires) {
            const history = useCircuitStore.temporal.getState();
            const tracking = history.isTracking;
            history.pause();
            useCircuitStore.setState({
              components: changedComponents
                ? current.components.map((component) => {
                    const blown = result.blownComponents?.find((item) => item.id === component.id);
                    const trip = result.trippedComponents?.find((item) => item.id === component.id);
                    if ((!blown || component.state.isBlown) && (!trip || component.state.isTripped))
                      return component;
                    return {
                      ...component,
                      state: {
                        ...component.state,
                        ...(blown ? { isBlown: true, blownReason: blown.reason } : {}),
                        ...(trip ? { isTripped: true, tripReason: trip.cause } : {}),
                      },
                    };
                  })
                : current.components,
              wires: changedWires
                ? current.wires.map((wire) =>
                    result.bustedWires?.has(wire.id) && !wire.isBusted
                      ? {
                          ...wire,
                          isBusted: true,
                          bustedReason:
                            result.electrical && !result.legacyObservation
                              ? 'Declared current-stress budget exceeded; wire opened.'
                              : 'Cable melted due to current overload',
                        }
                      : wire,
                  )
                : current.wires,
            });
            if (tracking) history.resume();
          }

          // The final solve includes these declared trip/damage openings. Bind
          // its readings to the saved post-event projection, not an old graph.
          if (changedComponents || changedWires)
            result.inputRevision = circuitRevision(useCircuitStore.getState());
          useUiStore.getState().setSimResult(result);
          runtimeRef.current = result.simulationState;
          acceptedTickRef.current = clockTick;
          acceptedInputsRef.current = inputs;
          if (result.simulationState)
            clockTimerRef.current = setTimeout(() => setClockTick((tick) => tick + 1), 100);
          for (const event of result.simulationEvents ?? []) {
            const eventComponentId =
              event.type === 'damage'
                ? event.target.type === 'component'
                  ? event.target.id
                  : undefined
                : event.componentId;
            const component = components.find((item) => item.id === eventComponentId);
            const label =
              component?.state.autoLabel ??
              (component ? COMPONENT_DEFS[component.type]?.label : undefined) ??
              eventComponentId ??
              (event.type === 'damage' ? `Wire #${event.target.id.slice(0, 8)}` : 'Device');
            const action =
              event.type === 'coil-pickup'
                ? 'coil picked up'
                : event.type === 'coil-dropout'
                  ? 'coil dropped out'
                  : event.type === 'timer-on'
                    ? `timer closed (${event.reason})`
                    : event.type === 'timer-off'
                      ? `timer opened (${event.reason})`
                      : event.type === 'damage'
                        ? 'damage budget reached; replacement required'
                        : event.type === 'fuse-operated'
                          ? 'fuse operated; replacement required'
                          : event.type === 'protection-trip'
                            ? `protection tripped (${event.reason})`
                            : 'timer interval restarted';
            useUiStore
              .getState()
              .addLog(`${label}: ${action} at ${event.atSeconds} s simulated time.`, 'info');
            if (event.type === 'damage' || event.type === 'fuse-operated') {
              const wireId =
                event.type === 'damage' && event.target.type === 'wire'
                  ? event.target.id
                  : undefined;
              useUiStore.getState().addEventHistory({
                eventType: wireId ? 'wire_melted' : 'component_blown',
                componentId: eventComponentId,
                componentName: component ? label : undefined,
                wireId,
                description: `${label}: ${action} at ${event.atSeconds} s simulated time.`,
                severity: 'critical',
                details: {
                  simulatedSeconds: event.atSeconds,
                  modelVersion: result.electrical?.modelVersion,
                  currentAmps:
                    (event.type === 'damage' ? event.currentAmps : event.maxPoleCurrentAmps) ??
                    undefined,
                  voltage: event.type === 'damage' ? (event.voltageVolts ?? undefined) : undefined,
                },
              });
            }
          }

          // Check if protection tripped or wire melted during simulation
          if (modeled && result.trippedComponents && result.trippedComponents.length > 0) {
            const trip = result.trippedComponents[0];
            const ui = useUiStore.getState();
            ui.setSimRunning(false); // Stop simulation immediately
            // §14: a tripped breaker is a legitimate observable symptom, so the
            // learner still sees that it tripped — but not *why*. `trip.cause`
            // is the fault type they are being asked to name, and the normal
            // hint points straight at the faulted component.
            const diagnosing = useUiStore.getState().diagnosisActive;
            const faultAlert = {
              title: 'CIRCUIT PROTECTION TRIPPED!',
              kind: 'trip' as const,
              deviceName: trip.label,
              deviceId: trip.id,
              reason: diagnosing ? 'protection operated' : trip.reason,
              currentAmps: trip.currentAmps,
              limitAmps: trip.ratingAmps,
              /* Standards-derived timing. Withheld while diagnosing: the
                 mechanism narrows the fault down, which is the answer. */
              ...(diagnosing
                ? {}
                : {
                    ...(trip.clearingTimeSeconds !== undefined
                      ? { clearingTimeSeconds: trip.clearingTimeSeconds }
                      : {}),
                    ...(trip.mechanism ? { mechanism: trip.mechanism } : {}),
                    ...(trip.currentMultiple !== undefined
                      ? { currentMultiple: trip.currentMultiple }
                      : {}),
                  }),
              /* Branch on `cause`, not `reason`: the overload branch's `reason`
                 is a full sentence, so `reason === 'overload'` was never true
                 and a plain overload was told to "clear the injected fault"
                 that does not exist. */
              resolutionHint: diagnosing
                ? 'The protective device has operated. Work out what caused it, then submit your diagnosis.'
                : trip.cause === 'overload'
                  ? 'Lower load power/current in the Inspector panel or upgrade breaker rating before resuming simulation.'
                  : 'Clear the injected fault (right-click the faulted component or wire → Clear fault), then reset the tripped breaker in the Inspector before resuming simulation.',
              timestamp: Date.now(),
            };
            ui.setFaultAlert(faultAlert);
            ui.addEventHistory({
              eventType: 'component_tripped',
              componentName: trip.label,
              componentId: trip.id,
              description: diagnosing
                ? 'Circuit breaker/fuse tripped.'
                : `Circuit breaker/fuse tripped due to ${trip.cause}`,
              severity: 'critical',
              details: {
                currentAmps: trip.currentAmps,
                reason: diagnosing ? 'protection operated' : trip.cause,
              },
            });
          } else if (modeled && result.wireMeltEvents && result.wireMeltEvents.length > 0) {
            const melt = result.wireMeltEvents[0];
            const ui = useUiStore.getState();
            ui.setSimRunning(false); // Stop simulation immediately
            const faultAlert = {
              title: 'CABLE OVERLOADED & MELTED!',
              kind: 'melt' as const,
              wireId: melt.wireId,
              reason: `Cable (${melt.cableMm2} mm²) melted and busted carrying ${melt.currentAmps.toFixed(1)} A because current exceeded cable capacity (${melt.capacityAmps.toFixed(1)} A) and NO active protection device (MCB/Fuse) was present in the circuit!`,
              currentAmps: melt.currentAmps,
              limitAmps: melt.capacityAmps,
              cableMm2: melt.cableMm2,
              resolutionHint:
                'Install an MCB or Fuse protection device, increase cable gauge (mm²), or reduce load current/power in the Inspector panel before resuming.',
              timestamp: Date.now(),
            };
            ui.setFaultAlert(faultAlert);
            ui.addEventHistory({
              eventType: 'wire_melted',
              wireId: melt.wireId,
              description: 'Wire overheated and melted due to excessive current',
              severity: 'critical',
              details: {
                currentAmps: melt.currentAmps,
                cableMm2: melt.cableMm2,
                reason: 'Current exceeded cable capacity',
              },
            });
          }

          const signature = JSON.stringify({ e: result.errors, w: result.warnings });
          if (signature === lastSignatureRef.current) return;
          lastSignatureRef.current = signature;

          const ui = useUiStore.getState();
          // §14: during a Diagnosis exercise the console must not name the
          // fault the learner is being asked to identify. The simulator tags
          // those messages by index; consequence messages ("MCB tripped",
          // "voltage mismatch") are untagged and still shown.
          const hideNarration = useUiStore.getState().diagnosisActive;
          const hiddenErrors = hideNarration
            ? new Set(result.faultNarrationErrors ?? [])
            : EMPTY_INDEX_SET;
          const hiddenWarnings = hideNarration
            ? new Set(result.faultNarrationWarnings ?? [])
            : EMPTY_INDEX_SET;

          result.errors.forEach((e, i) => {
            if (!hiddenErrors.has(i)) ui.addLog(e, 'error');
          });
          result.warnings.forEach((w, i) => {
            if (!hiddenWarnings.has(i)) ui.addLog(w, 'warning');
          });
          if (result.errors.length === 0 && result.energizedComponents.size > 0) {
            ui.addLog(
              `Circuit energised — ${result.energizedComponents.size} component${
                result.energizedComponents.size === 1 ? '' : 's'
              } active.`,
              'success',
            );
          }
        })
        .catch((err: unknown) => {
          // simulateAsync handles its own errors and falls back to the
          // main thread, so this catch is a defence-in-depth: if even
          // the fallback throws, surface it once in the log instead of
          // letting it bubble as an unhandled rejection.
          if (mySeq !== seqRef.current) return;
          const msg = err instanceof Error ? err.message : String(err);
          if (!(err instanceof AccessError))
            console.error('[useSimulation] simulation failed:', err);
          const ui = useUiStore.getState();
          ui.setSimRunning(false);
          ui.setSimResult(null);
          ui.addLog(`Simulation failed: ${msg}`, 'error');
        });
    }, requestDelay);

    return () => {
      if (clockTimerRef.current) clearTimeout(clockTimerRef.current);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Also invalidate requests when the hook unmounts. On a dependency
      // change the replacement effect immediately allocates a newer revision.
      if (seqRef.current === mySeq) seqRef.current++;
    };
  }, [
    components,
    wires,
    globalVoltage,
    supply,
    faults,
    simRunning,
    accessRevision,
    regulationStandard,
    clockTick,
  ]);
}
