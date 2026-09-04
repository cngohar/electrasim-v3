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

import { useEffect, useRef } from 'react';
import { COMPONENT_DEFS } from '../domain';
import { simulateAsync } from '../sim-worker/client';
import { useCircuitStore } from './circuitStore';
import { useSettingsStore } from './settingsStore';
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
  const faults = useCircuitStore((s) => s.faults);
  const simRunning = useUiStore((s) => s.simRunning);
  const appMode = useSettingsStore((s) => s.appMode);
  const regulationStandard = useSettingsStore((s) => s.regulationStandard);

  // Track the last "errors signature" so we don't re-log identical errors.
  const lastSignatureRef = useRef<string>('');
  // Monotonic sequence per request; results from older sequences are dropped.
  const seqRef = useRef(0);
  // Debounce timer.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Allocate a revision as soon as the inputs change. Waiting until the
    // debounce fires leaves a window where the previous worker request can
    // publish a result for a circuit that is no longer current.
    const mySeq = ++seqRef.current;

    if (!simRunning) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      useUiStore.getState().setSimResult(null);
      lastSignatureRef.current = '';
      return;
    }

    // Never display a result computed for the previous graph while the
    // replacement request is debouncing or running.
    useUiStore.getState().setSimResult(null);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      // Snapshot the inputs at scheduling time so a later mutation
      // doesn't slip into the worker call we're about to make.
      const circuit = { components, wires, globalVoltage, faults };

      void simulateAsync(circuit, { appMode, standard: regulationStandard })
        .then((result) => {
          // Drop result if a newer request was kicked off in the meantime
          // or the user paused the sim while we were waiting.
          if (mySeq !== seqRef.current) return;
          if (!useUiStore.getState().simRunning) return;

          // If simulation detected blown components, persist state
          if (result.blownComponents && result.blownComponents.length > 0) {
            const cs = useCircuitStore.getState();
            for (const item of result.blownComponents) {
              const comp = cs.components.find((c) => c.id === item.id);
              if (comp && !comp.state.isBlown) {
                cs.updateComponentState(item.id, { isBlown: true, blownReason: item.reason });
              }
            }
          }

          // If simulation detected melted/busted wires, persist wire state
          if (result.bustedWires && result.bustedWires.size > 0) {
            const cs = useCircuitStore.getState();
            for (const wireId of result.bustedWires) {
              cs.setWireBusted(wireId, true, 'Cable melted due to current overload');
            }
          }

          useUiStore.getState().setSimResult(result);

          // Check if protection tripped or wire melted during simulation
          if (result.trippedComponents && result.trippedComponents.length > 0) {
            const cs = useCircuitStore.getState();
            // Set isTripped state on all tripped components
            for (const trip of result.trippedComponents) {
              const comp = cs.components.find((c) => c.id === trip.id);
              if (comp && !comp.state.isTripped) {
                /* `trip.cause` is the machine-readable enum; `trip.reason` is a
                   full sentence for the overload branch and would fail
                   `validateCircuitJSON` on export/re-import if persisted here. */
                cs.updateComponentState(trip.id, {
                  isTripped: true,
                  tripReason: trip.cause,
                });
              }
            }
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
          } else if (result.wireMeltEvents && result.wireMeltEvents.length > 0) {
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
          } else if (
            (result.faultDiagnostics && result.faultDiagnostics.length > 0) ||
            (result.errors.length > 0 &&
              (useCircuitStore.getState().components.some((c) => c.state?.fault) ||
                useCircuitStore.getState().wires.some((w) => w.fault)))
          ) {
            const cs = useCircuitStore.getState();
            const faultedComp = cs.components.find((c) => c.state?.fault);
            const faultedWire = cs.wires.find((w) => w.fault);
            const ui = useUiStore.getState();
            ui.setSimRunning(false); // Stop simulation immediately on manual fault injection

            // §14: this whole branch exists to narrate the injected fault by
            // name ("MANUAL SHORT CIRCUIT FAULT!", "...injected on Fuse (13A)").
            // During a Diagnosis exercise that is precisely the answer under
            // test, so stop the simulation but say nothing.
            const inDiagnosis = useUiStore.getState().diagnosisActive;
            if (inDiagnosis) {
              // fall through: no alert, no event-history entry
            } else if (faultedComp?.state.fault) {
              const fType = faultedComp.state.fault;
              const def = COMPONENT_DEFS[faultedComp.type];
              const compLabel = faultedComp.state.autoLabel ?? def?.label ?? faultedComp.type;
              let faultTitle = 'MANUAL FAULT SIMULATION DETECTED!';
              let faultReason = `Manual fault injected on ${compLabel}.`;
              let resolution =
                'Fault Clearing Instructions:\n1. Click "Clear Fault" in the Inspector panel.\n2. Restart simulation.';

              if (fType === 'short-circuit') {
                faultTitle = 'MANUAL SHORT CIRCUIT FAULT!';
                faultReason = `A manual short-circuit fault was injected on ${compLabel}, triggering immediate emergency shutdown.`;
                resolution =
                  'Fault Clearing Instructions:\n1. Select the component in the Inspector.\n2. Click "Clear Fault" in the Manual Fault Simulation section.\n3. Restart simulation.';
              } else if (fType === 'open-circuit') {
                faultTitle = 'MANUAL OPEN CIRCUIT BREAK!';
                faultReason = `A manual open-circuit break was injected on ${compLabel}, interrupting the conductive path.`;
                resolution =
                  'Fault Clearing Instructions:\n1. Click "Clear Fault" in the Inspector or Context Menu to restore contact continuity.\n2. Restart simulation.';
              } else if (fType === 'reverse-polarity') {
                faultTitle = 'MANUAL REVERSE POLARITY FAULT!';
                faultReason = `A manual reverse-polarity fault was injected on ${compLabel} (Live and Neutral are swapped).`;
                resolution =
                  'Fault Clearing Instructions:\n1. Click "Clear Fault" in the Inspector panel or reverse wire connections.\n2. Restart simulation.';
              } else if (fType === 'earth-fault') {
                faultTitle = 'MANUAL EARTH FAULT!';
                faultReason = `A manual earth leakage / missing ground fault was injected on ${compLabel}.`;
                resolution =
                  'Fault Clearing Instructions:\n1. Click "Clear Fault" in the Inspector panel.\n2. Ensure continuous CPC protective bonding.';
              } else if (fType === 'smooth-dc-residual') {
                faultTitle = 'SMOOTH DC RESIDUAL — RCD BLINDED!';
                faultReason = `A smooth DC residual fault (EV/PV/VFD earth leakage) was injected on ${compLabel}. Type AC/A/F residual devices cannot detect smooth DC — the sensing toroid saturates and the device stays closed on a live earth fault (BS EN 62423, BS 7671 Reg 531.3.3). Only a Type B device trips on it.`;
                resolution =
                  'Fault Clearing Instructions:\n1. Select the guarding RCD/RCBO and set its Residual Current Type to B in the Inspector (EV/PV/VFD circuits need Type B or 6 mA RDC-DD protection).\n2. Click "Clear Fault" on the faulted component.\n3. Restart simulation and confirm the Type B device trips.';
              } else if (fType === 'arc-fault') {
                faultTitle = 'ARC FAULT — NO AFDD PROTECTION!';
                faultReason = `An arc fault (series/parallel arcing) was injected on ${compLabel}. No AFDD guards this network, so nothing tripped: arc current rides at/below load current with no earth imbalance, leaving MCBs and RCDs blind while the arc reaches ignition temperatures. Only an AFDD (BS EN 62606) detects the waveform.`;
                resolution =
                  'Fault Clearing Instructions:\n1. Add an AFDD (BS EN 62606) at the origin of this circuit — Reg 421.1.7 requires it on socket circuits up to 32 A in higher-risk residential buildings, HMOs, student accommodation and care homes.\n2. Click "Clear Fault" on the faulted component and repair the damaged conductor/terminal.\n3. Restart simulation and confirm the AFDD trips on a reinjected arc.';
              }

              const faultAlert = {
                title: faultTitle,
                kind: fType === 'short-circuit' ? ('melt' as const) : ('trip' as const),
                deviceId: faultedComp.id,
                deviceName: compLabel,
                reason: faultReason,
                currentAmps: 0,
                limitAmps: 16,
                resolutionHint: resolution,
                timestamp: Date.now(),
              };
              ui.setFaultAlert(faultAlert);
              ui.addEventHistory({
                eventType: 'fault_injected',
                componentName: compLabel,
                componentId: faultedComp.id,
                description: faultReason,
                severity: 'critical',
                details: { faultType: fType },
              });
            } else if (faultedWire?.fault) {
              const wfType = faultedWire.fault;
              const faultAlert = {
                title:
                  wfType === 'short-circuit' ? 'MANUAL WIRE SHORT CIRCUIT!' : 'MANUAL WIRE BREAK!',
                kind: wfType === 'short-circuit' ? ('melt' as const) : ('trip' as const),
                wireId: faultedWire.id,
                reason:
                  wfType === 'short-circuit'
                    ? `Manual short-circuit injected across wire #${faultedWire.id.slice(0, 6)}.`
                    : `Manual wire break injected on wire #${faultedWire.id.slice(0, 6)}.`,
                currentAmps: 0,
                limitAmps: 16,
                resolutionHint:
                  'Click "Clear Wire Fault" in the Wire Inspector or Context Menu, then restart simulation.',
                timestamp: Date.now(),
              };
              ui.setFaultAlert(faultAlert);
              ui.addEventHistory({
                eventType: 'fault_injected',
                wireId: faultedWire.id,
                description: faultAlert.reason,
                severity: 'critical',
                details: { faultType: wfType },
              });
            }
          } else if (result.blownComponents && result.blownComponents.length > 0) {
            const blown = result.blownComponents[0];
            const comp = useCircuitStore.getState().components.find((c) => c.id === blown.id);
            const ui = useUiStore.getState();
            ui.setSimRunning(false);
            const isVoltageMismatch = blown.reason === 'overvoltage';
            const faultAlert = {
              title: isVoltageMismatch
                ? 'VOLTAGE MISMATCH & OVERVOLTAGE FAULT!'
                : 'COMPONENT BURNED OUT!',
              kind: 'melt' as const,
              deviceId: blown.id,
              deviceName: comp?.state.autoLabel ?? comp?.type ?? 'Component',
              reason: isVoltageMismatch
                ? `Voltage mismatch detected: A 110V rated load was connected to a ${result.supplyVoltage ?? globalVoltage}V circuit! The excessive potential destroyed the component.`
                : `Component was blown due to ${blown.reason}.`,
              currentAmps: 0,
              limitAmps: 0,
              resolutionHint: isVoltageMismatch
                ? 'Fault Clearing Instructions:\n1. Match the supply voltage in the Inspector panel (e.g. 110V vs 230V).\n2. Alternatively, install a 230V-to-110V step-down transformer before the 110V load.\n3. Click "Repair & Reset" to restore the damaged component.'
                : 'Reduce supply voltage or replace component with higher rated model, then click "Repair & Reset".',
              timestamp: Date.now(),
            };
            ui.setFaultAlert(faultAlert);
            ui.addEventHistory({
              eventType: 'component_blown',
              componentName: comp?.state.autoLabel ?? comp?.type ?? 'Component',
              componentId: blown.id,
              description: `Component destroyed due to ${blown.reason}`,
              severity: 'critical',
              details: {
                reason: blown.reason,
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
          console.error('[useSimulation] simulation failed:', err);
          const ui = useUiStore.getState();
          ui.setSimResult(null);
          ui.addLog(`Simulation failed: ${msg}`, 'error');
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Also invalidate requests when the hook unmounts. On a dependency
      // change the replacement effect immediately allocates a newer revision.
      if (seqRef.current === mySeq) seqRef.current++;
    };
  }, [components, wires, globalVoltage, faults, simRunning, appMode, regulationStandard]);
}
