/**
 * Simulation engine — pure function that takes a `Circuit` and returns a
 * `SimulationResult`. No React, no DOM, no side effects.
 *
 * Legacy rail-continuity model with explicit coverage guards. Numerical
 * branch/source models and time evolution are replaced in Phase 1.5B–1.5F.
 */

import { instanceLabel } from '../componentLabel';
import { COMPONENT_DEFS } from '../components';
import { configuredSupplySources, resolveDocumentSupply } from '../core/supplies';
import { resolveWireProperties } from '../core/wireProperties';
import { calculateElectricalValues, getStandardCableAmpacity } from '../electricalCalculations';
import { FAULT_REGISTRY } from '../faults';
import {
  isArcFaultDevice,
  isFuseDevice,
  isOvercurrentDevice,
  isResidualDevice,
} from '../protectionRoles';
import { getLegacySimulationLimitations } from '../simulationCoverage';
import { type StandardId, getStandard } from '../standards';
import type {
  Circuit,
  ComponentDef,
  ComponentInstance,
  FaultDiagnostic,
  SimulationResult,
} from '../types';
import { resolveCoils } from './coils';
import { findProtectionDevicesInNetwork } from './faultPropagation';
import { indexCircuit, portKey } from './indexing';
import { calculateMCBTrip, calculateRCDTrip, formatClearingTime } from './tripCurves';

// ─── Public entry point ────────────────────────────────────────────────────

export interface SimulateOptions {
  /** Explicit transient state; omit to reset. Never used for legacy observations. */
  simulationState?: import('../core/contracts').ElectricalSimulationState;
  /** Simulated time, not wall time. Omit for a zero-time solve. */
  deltaSeconds?: number;
  /** Override the registry (used in tests). Defaults to COMPONENT_DEFS. */
  defs?: Record<string, ComponentDef>;
  /** Presentation compatibility only. Electrical behavior is identical in both modes. */
  appMode?: 'basic' | 'pro';
  /** Teaching profile. US device timing is not assessed; choosing a profile
   * never changes a component's physical residual-current rating. */
  standard?: StandardId;
}

/**
 * Pure simulation: takes a circuit, returns the new world state.
 * Idempotent — calling twice with the same input yields equal output.
 */
export function simulateLegacy(circuit: Circuit, options: SimulateOptions): SimulationResult {
  const defs = options.defs ?? COMPONENT_DEFS;
  // Region-aware fault behaviour (see SimulateOptions.standard).
  const standardPreset = getStandard(options.standard);
  const timingAssessed = standardPreset.id !== 'us';
  const residualName = standardPreset.id === 'us' ? 'Residual device' : 'RCD';

  const energizedComponents = new Set<string>();
  const energizedWires = new Set<string>();
  const errorComponents = new Set<string>();
  const errorWires = new Set<string>();
  const overloadedWires = new Set<string>();
  const bustedWires = new Set<string>();
  const wireHeatRatios: Record<string, number> = {};
  const trippedComponents: NonNullable<SimulationResult['trippedComponents']> = [];
  const wireMeltEvents: {
    wireId: string;
    currentAmps: number;
    capacityAmps: number;
    cableMm2: number;
  }[] = [];
  const trippedIds = new Set<string>();
  const errors: string[] = [];
  const warnings: string[] = [];
  const modelLimitations = getLegacySimulationLimitations(circuit, defs);
  const blocked = modelLimitations.filter((limitation) => limitation.blocking);
  if (blocked.length > 0) {
    return {
      energizedComponents,
      energizedWires,
      errorComponents: new Set(blocked.map((l) => l.componentId)),
      errorWires,
      errors: blocked.map((l) => l.message),
      warnings: [],
      modelLimitations,
      faultsCleared: false,
    };
  }
  warnings.push(...modelLimitations.map((l) => l.message));
  const blownComponents: NonNullable<SimulationResult['blownComponents']> = [];
  const damagedIds = new Set<string>();
  const markDamage = (id: string, reason: 'overvoltage' | 'overcurrent' | 'overload') => {
    if (damagedIds.has(id)) return;
    damagedIds.add(id);
    blownComponents.push({ id, reason });
  };
  if (!timingAssessed && circuit.components.some((c) => defs[c.type]?.isProtection)) {
    warnings.push(
      'US protective-device timing is not assessed; device operation uses the generic teaching model, not UL/NEC certification.',
    );
  }

  // Messages emitted below narrate the *injected fault itself* ("TERMINAL
  // DISCONNECT: ...", "SHORT CIRCUIT FAULT: ..."). In Diagnosis mode that is
  // the answer the learner is being asked to work out, so the UI must be able
  // to withhold them. Record their exact indices as they are pushed rather
  // than re-matching strings downstream, which would be brittle and would also
  // catch legitimate consequence messages the learner should still see.
  const faultNarrationErrors: number[] = [];
  const faultNarrationWarnings: number[] = [];
  const pushFaultNarrationError = (message: string) => {
    faultNarrationErrors.push(errors.length);
    errors.push(message);
  };
  const pushFaultNarrationWarning = (message: string) => {
    faultNarrationWarnings.push(warnings.length);
    warnings.push(message);
  };

  /**
   * Fault-driven protection operation (all app modes — a bolted fault must
   * operate capable protection regardless of presentation mode).
   * Network-wide candidates remain a teaching approximation; selectivity
   * requires the branch and time models planned in Phase 1.5D.
   */
  const tripProtectionForFault = (
    faultedId: string,
    kind: 'short-circuit' | 'ground-fault' | 'arc-fault',
    extraFilter?: (type: string, device: (typeof circuit.components)[number]) => boolean,
  ) => {
    const devices = findProtectionDevicesInNetwork(faultedId, circuit, defs).filter((d) => {
      const capable =
        kind === 'short-circuit'
          ? isOvercurrentDevice(d.type, defs)
          : kind === 'ground-fault'
            ? isResidualDevice(d.type, defs)
            : isArcFaultDevice(d.type, defs);
      return (
        capable &&
        (!extraFilter || extraFilter(d.type, d)) &&
        !d.state.isBlown &&
        !d.state.isTripped &&
        !index.faultsByComponent
          .get(d.id)
          ?.some((f) => f.type === 'protection-bypass' || f.type === 'protection-forced-open')
      );
    });
    for (const dev of devices) {
      if (trippedIds.has(dev.id)) continue;
      trippedIds.add(dev.id);
      const devDef = defs[dev.type];
      /* Instance rating, not the catalogue default: the guided templates
         re-spec devices (a 20 A RCBO, a 20 A AFDD-RCBO), and the trip dialog
         was naming them by the catalogue part they were derived from. */
      const label = dev.state.autoLabel ?? instanceLabel(dev);
      if (kind === 'ground-fault' && devDef?.ratedLeakage_mA === undefined) {
        warnings.push(
          `${label}: residual-current rating is unspecified; device operation is not assessed.`,
        );
        continue;
      }
      if (kind === 'short-circuit') {
        const rating = dev.state.customMaxAmps ?? devDef?.maxAmps ?? 32;
        // Bolted fault: supply over an assumed fault-loop impedance. The loop
        // impedance is region-agnostic at the device terminals, but the
        // prospective fault current scales with the supply voltage, so it is
        // naturally higher on 230 V systems than 120 V systems. Deep in the
        // IEC teaching curve model; actual device characteristics vary.
        const faultLoopOhms = 0.5;
        const prospectiveAmps = Math.round(supplyVoltage / faultLoopOhms);
        /* Ask the IEC 60898-1 curve rather than asserting "<0.1 s": for a
           Type D device at 32 A the 20×In magnetic threshold is 640 A, and a
           460 A prospective current lands in the *thermal* region, where the
           real clearing time is seconds, not milliseconds. That distinction is
           the whole point of curve selection, so the message now reports what
           the curve says. */
        const curve = devDef?.mcbType
          ? calculateMCBTrip(prospectiveAmps, rating, devDef.mcbType, Number.POSITIVE_INFINITY)
          : undefined;
        if (isFuseDevice(dev.type, defs)) markDamage(dev.id, 'overcurrent');
        trippedComponents.push({
          id: dev.id,
          label,
          cause: 'short-circuit',
          reason: 'short-circuit',
          currentAmps: prospectiveAmps,
          ratingAmps: rating,
          ...(timingAssessed && curve?.timeToTrip !== undefined
            ? { clearingTimeSeconds: curve.timeToTrip }
            : {}),
          ...(curve?.tripReason ? { mechanism: curve.tripReason } : {}),
          currentMultiple: prospectiveAmps / rating,
        });
        // Names the fault kind ("bolted short circuit") — must be withholdable.
        pushFaultNarrationError(
          !curve
            ? `${label} OPERATED in the teaching model: prospective fault current ${prospectiveAmps} A. Device-specific clearing time is not assessed${isFuseDevice(dev.type, defs) ? '; replace the fuse link' : ''}.`
            : !timingAssessed
              ? `${label} TRIPPED in the teaching model: prospective fault current ${prospectiveAmps} A. US clearing time is not assessed.`
              : curve.tripReason === 'magnetic'
                ? `${label} TRIPPED: bolted short circuit — prospective ${prospectiveAmps} A is ${curve.currentMultiple.toFixed(1)}×In, inside the instantaneous magnetic band of a Type ${devDef?.mcbType ?? 'B'} ${rating} A device; cleared in ≤${formatClearingTime(curve.timeToTrip ?? 0.1)} in the IEC teaching curve model.`
                : `${label} TRIPPED: bolted short circuit — prospective ${prospectiveAmps} A is only ${curve.currentMultiple.toFixed(1)}×In, BELOW the Type ${devDef?.mcbType ?? 'B'} instantaneous band, so the thermal element cleared it in ≈${formatClearingTime(curve.timeToTrip ?? 0)} in the IEC teaching curve model; verify actual device characteristics.`,
        );
      } else if (kind === 'ground-fault') {
        // Illustrative 45 mA fault. Device rating is a component property,
        // not the selected country's default. IEC time bands do not assess GFCI timing.
        const residualThresholdMa = devDef?.ratedLeakage_mA ?? 30;
        const leakAmps = Math.max(residualThresholdMa / 1000 + 0.015, 0.045);
        const residual = calculateRCDTrip(
          leakAmps * 1000,
          devDef?.ratedLeakage_mA ?? residualThresholdMa,
          Number.POSITIVE_INFINITY,
        );
        trippedComponents.push({
          id: dev.id,
          label,
          cause: 'ground-fault',
          reason: 'ground-fault',
          currentAmps: leakAmps,
          ratingAmps: residualThresholdMa / 1000,
          ...(timingAssessed && residual.timeToTrip !== undefined
            ? { clearingTimeSeconds: residual.timeToTrip }
            : {}),
          mechanism: 'residual',
          currentMultiple: residual.leakageMultiple,
        });
        // Names the fault kind ("residual leakage") — must be withholdable.
        pushFaultNarrationError(
          `${label} TRIPPED: ${residualName} operated on ${Math.round(leakAmps * 1000)} mA residual leakage (threshold ${residualThresholdMa} mA) — ${timingAssessed ? `IEC teaching-model time ≤${formatClearingTime(residual.timeToTrip ?? 0.3)}` : 'US operating time not assessed'}.`,
        );
      } else {
        // Arc fault: current floats around load level — far below the device
        // rating, which is exactly why only the AFDD's waveform analysis sees it.
        const rating = dev.state.customMaxAmps ?? devDef?.maxAmps ?? 32;
        trippedComponents.push({
          id: dev.id,
          label,
          cause: 'arc-fault',
          reason: 'arc-fault',
          currentAmps: 3,
          ratingAmps: rating,
          mechanism: 'arc',
        });
        // Names the fault kind ("arc-fault signature") — must be withholdable.
        pushFaultNarrationError(
          `${label} TRIPPED (BS EN 62606): arc-fault signature detected — arcing interrupted before ignition temperatures developed.`,
        );
      }
      errorComponents.add(dev.id);
    }
  };
  const wireCalculations: NonNullable<SimulationResult['wireCalculations']> = {};
  // Per-component live telemetry (voltage / current / power). Populated so the
  // inspector's Live Telemetry section reflects the running simulation instead
  // of always reading 0.
  const componentCalculations: NonNullable<SimulationResult['componentCalculations']> = {};

  // Empty circuit → no-op (legacy returns early).
  if (circuit.components.length === 0) {
    return {
      energizedComponents,
      energizedWires,
      errorComponents,
      errorWires,
      errors,
      warnings,
      blownComponents,
      faultsCleared: true,
    };
  }

  // Pre-check for any blown components
  for (const c of circuit.components) {
    if (c.state.isBlown) {
      errorComponents.add(c.id);
      errors.push(
        `BLOWN COMPONENT: ${defs[c.type]?.label ?? c.type} is damaged (${c.state.blownReason ?? 'overload'}). Repair component to restore flow.`,
      );
    }
  }

  const index = indexCircuit(circuit);

  // Every source terminal is a root.
  const liveSources: ComponentInstance[] = [];
  const neutralSources: ComponentInstance[] = [];
  // Mixed profiles are already blocked above. Identical sources/explicit alias
  // settings no longer select a voltage according to component array order.
  const supplyVoltage =
    configuredSupplySources(circuit)[0]?.profile.model.voltage ??
    resolveDocumentSupply(circuit).model.voltage;

  for (const c of circuit.components) {
    const def = defs[c.type];
    if (!def?.isSource) continue;
    if (def.ports.some((port) => port.type === 'live')) {
      liveSources.push(c);
    }
    if (def.ports.some((port) => port.type === 'neutral')) {
      neutralSources.push(c);
    }
  }

  if (liveSources.length === 0) warnings.push('No Live source found.');
  if (neutralSources.length === 0) warnings.push('No Neutral source found.');

  const { live, neutral, coilStates, unstable } = resolveCoils(
    circuit,
    index,
    defs,
    liveSources,
    neutralSources,
  );
  if (unstable)
    errors.push(
      'Relay feedback does not settle in the static teaching model. Controlled contacts are left open; use a supported stable control circuit.',
    );

  // A component is marked energised when both rails reach it. Loads without
  // any neutral port (e.g. the three-phase motor, which carries L1/L2/L3 + PE
  // only) energise on the live rail alone — three-phase equipment has no
  // neutral connection by design.
  for (const c of circuit.components) {
    const def = defs[c.type];
    if (!def) continue;
    const hasNeutralPort = def.ports.some((port) => port.type === 'neutral');
    const reached =
      def.isLoad && !hasNeutralPort
        ? live.reachedComponents.has(c.id)
        : live.reachedComponents.has(c.id) && neutral.reachedComponents.has(c.id);
    if (reached) energizedComponents.add(c.id);
  }

  // Wires that carry either rail count as energised for visualisation.
  for (const w of live.energisedWires) energizedWires.add(w);
  for (const w of neutral.energisedWires) energizedWires.add(w);

  /*
   * Components the load current actually flows *through*.
   *
   * `energizedComponents` requires BOTH rails to reach a component, which is
   * the right test for "is this device live and working". It is the wrong test
   * for "is this device carrying the circuit current", because a single-pole
   * device only ever touches one rail: an MCB, a fuse and a light switch have
   * L-in/L-out and no neutral port at all, so they were never in the set — and
   * the overcurrent check below therefore skipped every single-pole protective
   * device in the catalogue. A 6 A MCB feeding a 6 kW heater did nothing.
   *
   * Series membership is instead the honest question, and it has a purely
   * topological answer: current can only pass through a device if it enters by
   * one port and leaves by another, so a device is in the current path when at
   * least two of its distinct ports sit on energised wires. A dead-end MCB
   * spurred off a live rail has exactly one, and is correctly excluded.
   */
  const energisedPortsByComponent = new Map<string, Set<number>>();
  for (const wire of circuit.wires) {
    if (!energizedWires.has(wire.id)) continue;
    for (const [compId, portIdx] of [
      [wire.fromComponentId, wire.fromPortIndex],
      [wire.toComponentId, wire.toPortIndex],
    ] as const) {
      const ports = energisedPortsByComponent.get(compId);
      if (ports) ports.add(portIdx);
      else energisedPortsByComponent.set(compId, new Set([portIdx]));
    }
  }
  const currentCarryingComponents = new Set<string>();
  for (const c of circuit.components) {
    if (energizedComponents.has(c.id)) {
      currentCarryingComponents.add(c.id);
      continue;
    }
    if ((energisedPortsByComponent.get(c.id)?.size ?? 0) >= 2) {
      currentCarryingComponents.add(c.id);
    }
  }

  const totalLoadAmps = circuit.components.reduce((total, c) => {
    if (!energizedComponents.has(c.id)) return total;
    const def = defs[c.type];
    if (!def?.isLoad) return total;
    const watts = c.state.customPowerWatts ?? def.powerWatts ?? 100;
    return total + watts / Math.max(1, supplyVoltage);
  }, 0);

  // ── Mode-independent stress estimates ──────────────────────────────────
  {
    // Physical stress and hazards are independent of membership or presentation mode.
    let totalCircuitAmps = 0;

    // 1. Calculate active load currents & overvoltage checks on energized components
    for (const c of circuit.components) {
      if (!energizedComponents.has(c.id) || c.state.isBlown) continue;
      const def = defs[c.type];
      if (!def) continue;

      // Overvoltage check
      const maxVolts = c.state.customMaxVolts ?? def.maxVolts ?? 250;
      if (supplyVoltage > maxVolts) {
        markDamage(c.id, 'overvoltage');
        errorComponents.add(c.id);
        errors.push(
          `OVERVOLTAGE EXPLOSION: ${def.label} blew up! Supply (${supplyVoltage}V) exceeds max rating (${maxVolts}V).`,
        );
        continue;
      }

      // Load overcurrent / overload check
      if (def.isLoad) {
        const watts = c.state.customPowerWatts ?? def.powerWatts ?? 100;
        const loadAmps = watts / supplyVoltage;
        totalCircuitAmps += loadAmps;

        const maxAmps = c.state.customMaxAmps ?? def.maxAmps;
        // No device burnout rating is inferred from a generic household current.
        // Cable capacity and upstream protection are still assessed below.
        if (maxAmps !== undefined && loadAmps > maxAmps) {
          markDamage(c.id, 'overload');
          errorComponents.add(c.id);
          errors.push(
            `OVERLOAD BURNOUT: ${def.label} burned out! Load current (${loadAmps.toFixed(1)}A) exceeds max rating (${maxAmps}A).`,
          );
        }
      }
    }

    // 2. Pass-through / protection / wire overcurrent check
    if (totalCircuitAmps > 0) {
      /*
       * Is there a live protective device in the current path?
       *
       * Check current-carrying paths and automatic overcurrent capability.
       * A single-pole MCB need not appear in `energizedComponents`; an RCCB
       * or isolator's palette classification does not provide overcurrent
       * protection. Branch-aware coordination remains part of Phase 1.5D.
       */
      const hasProtection = circuit.components.some((c) => {
        if (!currentCarryingComponents.has(c.id) || c.state.isBlown || c.state.isTripped) {
          return false;
        }
        return (
          isOvercurrentDevice(c.type, defs) &&
          !index.faultsByComponent.get(c.id)?.some((f) => f.type === 'protection-bypass')
        );
      });

      for (const c of circuit.components) {
        if (!currentCarryingComponents.has(c.id) || c.state.isBlown || c.state.isTripped) continue;
        const def = defs[c.type];
        if (!def || def.isSource) continue;

        if (!(def.isProtection || def.isSwitch || def.isPassThrough)) continue;
        const deviceMaxAmps = c.state.customMaxAmps ?? def.maxAmps;
        if (deviceMaxAmps === undefined) continue;
        if (!isOvercurrentDevice(c.type, defs)) {
          if (totalCircuitAmps > deviceMaxAmps) {
            warnings.push(
              `DEVICE OVERLOAD: ${instanceLabel(c)} carries ${totalCircuitAmps.toFixed(1)} A above its ${deviceMaxAmps} A rating; it has no automatic overcurrent trip. Damage and clearing time are not assessed.`,
            );
          }
          continue;
        }
        if (index.faultsByComponent.get(c.id)?.some((f) => f.type === 'protection-bypass'))
          continue;
        const effectiveLimit = deviceMaxAmps;

        /*
         * A breaker's rating is not a trip threshold.
         *
         * IEC 60898-1 defines Inf = 1.13×In as the *conventional non-tripping
         * current*: a 16 A Type B MCB must carry 18.08 A for a full hour
         * without operating, and only has to trip within the hour at
         * If = 1.45×In. This block used to trip on any excess at all, so a 16 A
         * breaker "tripped" at 16.1 A — which is both wrong and pedagogically
         * backwards, because tolerating a modest overload for a long time is
         * exactly what makes cable sizing (Iz ≥ In) matter.
         *
         * The engine has no time axis; it answers the steady-state question
         * "if this current persists, does the device operate?" — hence
         * elapsedSeconds = ∞ — and reports how long the standard says it would
         * take, which is the number the UI now shows.
         *
         * Only overcurrent devices enter this branch. Fuses/MCCBs without a
         * modeled curve use a rating-only estimate with timing unassessed.
         * Cable ampacity is checked separately and never replaces In.
         */
        const curve = def.mcbType
          ? calculateMCBTrip(
              totalCircuitAmps,
              effectiveLimit,
              def.mcbType,
              Number.POSITIVE_INFINITY,
            )
          : null;
        const operates = curve ? curve.shouldTrip : totalCircuitAmps > effectiveLimit;
        if (!operates) continue;

        if (isFuseDevice(c.type, defs)) markDamage(c.id, 'overcurrent');
        trippedIds.add(c.id);
        errorComponents.add(c.id);
        const clearingText =
          timingAssessed && curve?.timeToTrip
            ? ` Type ${def.mcbType} teaching curve clears ${curve.currentMultiple.toFixed(2)}×In in ≈${formatClearingTime(curve.timeToTrip)}.`
            : ' Device-specific clearing time is not assessed.';
        const reason = `Circuit current (${totalCircuitAmps.toFixed(1)} A) exceeded rated limit (${effectiveLimit} A).${clearingText}`;
        trippedComponents.push({
          id: c.id,
          /* The instance rating, not the catalogue default: a template that
             re-specs the device (e.g. a 20 A RCBO) was being announced as the
             32 A catalogue part everywhere the trip was described. */
          label: instanceLabel(c),
          cause: 'overload',
          reason,
          currentAmps: totalCircuitAmps,
          ratingAmps: effectiveLimit,
          ...(timingAssessed && curve?.timeToTrip !== undefined
            ? { clearingTimeSeconds: curve.timeToTrip }
            : {}),
          ...(curve?.tripReason ? { mechanism: curve.tripReason } : {}),
          ...(curve ? { currentMultiple: curve.currentMultiple } : {}),
        });
        errors.push(
          `PROTECTION TRIPPED: ${instanceLabel(c)} tripped! Load current (${totalCircuitAmps.toFixed(1)} A) exceeded capacity (${effectiveLimit} A).${clearingText}`,
        );
      }

      // Check cable current capacity & thermal heating on energised wires
      for (const wire of circuit.wires) {
        if (!energizedWires.has(wire.id)) continue;

        const fromComp = index.byId.get(wire.fromComponentId);
        const toComp = index.byId.get(wire.toComponentId);
        if (!fromComp || !toComp) continue;

        const properties = resolveWireProperties(wire, index.byId);
        const cableMm2 = properties.cableMm2;
        const cableCap =
          getStandardCableAmpacity(cableMm2, properties.material, properties.installationMethod) *
          properties.deratingFactor;
        const heatRatio = totalCircuitAmps / cableCap;
        wireHeatRatios[wire.id] = heatRatio;

        if (heatRatio > 1.0) {
          overloadedWires.add(wire.id);
          errorWires.add(wire.id);
          errorComponents.add(wire.fromComponentId);
          errorComponents.add(wire.toComponentId);
          warnings.push(
            `CABLE OVERLOAD: ${cableMm2} mm² wire carrying ${totalCircuitAmps.toFixed(1)}A exceeds capacity (${cableCap}A max).`,
          );
        }

        /*
         * Cable damage. Two routes:
         *   - no protective device in the path at all, and the conductor is
         *     over its rating (>1.05×Iz);
         *   - a device is present but the current is far past what the cable
         *     can take (>1.4×Iz), i.e. the device is rated above the cable —
         *     the classic In > Iz mis-coordination, where the insulation
         *     reaches damage temperature before the breaker decides to act.
         */
        if ((!hasProtection && heatRatio > 1.05) || heatRatio > 1.4) {
          bustedWires.add(wire.id);
          errorWires.add(wire.id);
          wireMeltEvents.push({
            wireId: wire.id,
            currentAmps: totalCircuitAmps,
            capacityAmps: cableCap,
            cableMm2,
          });
          // Say which of the two it was. Claiming "NO active circuit
          // protection" while a breaker sits in the circuit is simply untrue,
          // and it hides the actual lesson (In must not exceed Iz).
          errors.push(
            hasProtection
              ? `CABLE BUSTED & MELTED: ${cableMm2} mm² wire (${cableCap} A) burned out carrying ${totalCircuitAmps.toFixed(1)} A — the protective device is rated ABOVE the cable, so the conductor reached damage temperature before the device operated. BS 7671 requires In ≤ Iz.`
              : `CABLE BUSTED & MELTED: ${cableMm2} mm² wire burned out carrying ${totalCircuitAmps.toFixed(1)} A (Capacity: ${cableCap} A) with NO active circuit protection!`,
          );
        }
      }
    }
  }

  for (const wire of circuit.wires) {
    if (!energizedWires.has(wire.id)) continue;
    const fromComp = index.byId.get(wire.fromComponentId);
    const toComp = index.byId.get(wire.toComponentId);
    if (!fromComp || !toComp) continue;
    const properties = resolveWireProperties(wire, index.byId);
    const calculation = calculateElectricalValues({
      powerWatts: totalLoadAmps * supplyVoltage,
      voltage: supplyVoltage,
      currentAmps: totalLoadAmps,
      ...properties,
    });
    wireCalculations[wire.id] = calculation;
    if (calculation.status === 'warning') {
      warnings.push(`VOLTAGE DROP: Wire ${wire.id} — ${calculation.message}`);
    }
    if (calculation.status === 'fail') {
      overloadedWires.add(wire.id);
      errorWires.add(wire.id);
      warnings.push(`CABLE CAPACITY: Wire ${wire.id} — ${calculation.message}`);
    }
  }

  // ── Short-circuit detection ─────────────────────────────────────────
  // Loads stop each traversal at their terminals, so their normal Live and
  // Neutral feeds remain disjoint. If the traversals overlap on a wire or a
  // terminal, a physical conductor has instead joined the supply rails.
  let hasShortCircuit = false;

  for (const wire of circuit.wires) {
    if (!live.energisedWires.has(wire.id) || !neutral.energisedWires.has(wire.id)) continue;
    hasShortCircuit = true;
    errorWires.add(wire.id);
    errorComponents.add(wire.fromComponentId);
    errorComponents.add(wire.toComponentId);
  }

  for (const c of circuit.components) {
    const def = defs[c.type];
    if (!def) continue;
    for (let portIndex = 0; portIndex < def.ports.length; portIndex++) {
      const key = portKey(c.id, portIndex);
      if (!live.visitedPorts.has(key) || !neutral.visitedPorts.has(key)) continue;
      hasShortCircuit = true;
      errorComponents.add(c.id);
      // Bolted L-N short trips the protective devices guarding this network
      tripProtectionForFault(c.id, 'short-circuit');
      const wires = index.byPort.get(key);
      if (wires) for (const wire of wires) errorWires.add(wire.id);
    }
  }

  if (hasShortCircuit) {
    errors.push('Short circuit — Live and Neutral are directly connected.');
  }

  // ── Fault Diagnostics & System Simulation ──────────────────────────────────
  const faultDiagnostics: FaultDiagnostic[] = [];
  const activeFaults = index.activeFaults;

  for (const fault of activeFaults) {
    const def = FAULT_REGISTRY[fault.type] ?? {
      id: fault.type,
      label: fault.type,
      category: fault.category,
      severity: 'error',
      description: 'Fault condition detected in circuit.',
      simulationEffect: 'Modifies circuit operation.',
      detectionBehavior: 'Test with electrical meters.',
      repairBehavior: 'Isolate and fix fault condition.',
    };

    const affectedComponents: string[] = [];
    const affectedWires: string[] = [];
    const affectedPorts: { componentId: string; portIndex: number }[] = [];
    // Component the fault is anchored to — used to find the guarding
    // protective devices in the same connected network.
    const faultAnchorId =
      fault.target.type === 'component'
        ? fault.target.id
        : fault.target.type === 'wire'
          ? (index.wireById.get(fault.target.id)?.fromComponentId ?? null)
          : fault.target.componentId;

    if (fault.target.type === 'component') {
      affectedComponents.push(fault.target.id);
      errorComponents.add(fault.target.id);
      const comp = index.byId.get(fault.target.id);
      const cDef = comp ? defs[comp.type] : undefined;
      for (let pi = 0; pi < (cDef?.ports.length ?? 0); pi++) {
        const ws = index.byPort.get(portKey(fault.target.id, pi));
        if (ws) for (const w of ws) errorWires.add(w.id);
      }
    } else if (fault.target.type === 'wire') {
      affectedWires.push(fault.target.id);
      errorWires.add(fault.target.id);
      const wire = index.wireById.get(fault.target.id);
      if (wire) {
        affectedComponents.push(wire.fromComponentId, wire.toComponentId);
        if (fault.type === 'short-circuit') {
          errorComponents.add(wire.fromComponentId);
          errorComponents.add(wire.toComponentId);
        }
      }
    } else if (fault.target.type === 'port') {
      affectedComponents.push(fault.target.componentId);
      affectedPorts.push({
        componentId: fault.target.componentId,
        portIndex: fault.target.portIndex,
      });
      errorComponents.add(fault.target.componentId);
      const ws = index.byPort.get(portKey(fault.target.componentId, fault.target.portIndex));
      if (ws) for (const w of ws) errorWires.add(w.id);
    }

    // Specific category behaviors and messages
    if (fault.type === 'short-circuit') {
      pushFaultNarrationError(
        `SHORT CIRCUIT FAULT: Direct short circuit detected on ${def.label}!`,
      );
      // Bolted short must operate the upstream protective device(s)
      if (faultAnchorId) tripProtectionForFault(faultAnchorId, 'short-circuit');
    } else if (fault.type === 'open-circuit' || fault.type === 'open-live') {
      pushFaultNarrationError(
        `OPEN CIRCUIT FAULT: Conductor break on ${def.label} — path interrupted.`,
      );
    } else if (fault.type === 'open-neutral') {
      pushFaultNarrationError(
        'FLOATING NEUTRAL FAULT: Broken neutral return path — voltage reaches load without return!',
      );
    } else if (fault.type === 'open-earth') {
      pushFaultNarrationWarning(
        `MISSING CPC / OPEN EARTH: Protective bonding broken on ${def.label}!`,
      );
    } else if (fault.type === 'terminal-disconnect') {
      pushFaultNarrationError(`TERMINAL DISCONNECT: Loose terminal screw on ${def.label} port!`);
    } else if (fault.type === 'reverse-polarity') {
      pushFaultNarrationError(
        '↔ REVERSED POLARITY: Live and Neutral conductors reversed (BS 7671 Reg 643.6)!',
      );
    } else if (fault.type === 'switched-neutral') {
      pushFaultNarrationError(
        `SWITCHED NEUTRAL HAZARD: Switch cuts Neutral; appliance can remain LIVE at the ${supplyVoltage} V supply when OFF!`,
      );
    } else if (fault.type === 'live-to-earth' || fault.type === 'earth-fault') {
      pushFaultNarrationError(
        `EARTH LEAKAGE / FAULT: Insulation breakdown to earth on ${def.label}!`,
      );
      // Trip only the RCD/RCBO devices guarding the faulted network
      // (previously tripped every RCD/RCBO on the canvas, even on isolated networks)
      if (faultAnchorId) {
        // Residual sensing comes from the device's rated leakage, not its name:
        // the substring list here silently excluded the AFDD, which is an RCBO
        // with arc detection and does trip on 30 mA leakage.
        tripProtectionForFault(faultAnchorId, 'ground-fault', (t) => isResidualDevice(t, defs));
      }
    } else if (fault.type === 'smooth-dc-residual') {
      pushFaultNarrationError(
        `SMOOTH DC RESIDUAL: Power-electronic earth leakage on ${def.label} — among the modeled AC/A/F/B devices only Type B detects this smooth DC component; equipment-specific DC detection arrangements need separate assessment.`,
      );
      if (faultAnchorId) {
        const isResidual = (t: string) => isResidualDevice(t, defs);
        const residualDevices = findProtectionDevicesInNetwork(faultAnchorId, circuit, defs).filter(
          (d) => isResidual(d.type),
        );
        // Type B trips (all-current-sensitive); AC/A/F are blind at this magnitude.
        tripProtectionForFault(
          faultAnchorId,
          'ground-fault',
          (t, dev) => isResidual(t) && (dev.state.rcdType ?? 'A') === 'B',
        );
        for (const dev of residualDevices) {
          const rcdType = dev.state.rcdType ?? 'A';
          if (rcdType === 'B') continue;
          const devLabel = instanceLabel(dev);
          const tolerance = rcdType === 'F' ? '≤10 mA' : rcdType === 'A' ? '≤6 mA' : 'none';
          pushFaultNarrationError(
            `${devLabel} (Type ${rcdType}) DID NOT TRIP: smooth DC residual current is outside Type ${rcdType} detection (superimposed-DC tolerance ${tolerance}) — this load needs a Type B device or 6 mA RDC-DD protection.`,
          );
          errorComponents.add(dev.id);
        }
        if (residualDevices.length === 0) {
          pushFaultNarrationWarning(
            `No residual-current device guards this network — no ${residualName} present to evaluate for DC blinding.`,
          );
        }
      }
    } else if (fault.type === 'arc-fault') {
      pushFaultNarrationError(
        `ARC FAULT: Series/parallel arcing on ${def.label} — arc current rides at/below load current with no earth imbalance, so thermal-magnetic and residual-current devices cannot see it (BS EN 62606).`,
      );
      if (faultAnchorId) {
        tripProtectionForFault(faultAnchorId, 'arc-fault', (t) => isArcFaultDevice(t, defs));
        const afdds = findProtectionDevicesInNetwork(faultAnchorId, circuit, defs).filter((d) =>
          isArcFaultDevice(d.type, defs),
        );
        if (afdds.length === 0) {
          pushFaultNarrationError(
            'NO AFDD IN THIS NETWORK: the modeled arc persists while MCB/RCD/RCBO stay closed. Repair the fault and check arc-fault protection requirements for the applicable location and equipment.',
          );
        }
      }
    } else if (fault.type === 'protection-bypass') {
      pushFaultNarrationWarning(
        `PROTECTION BYPASS: Overcurrent protection bypassed on ${def.label}!`,
      );
    } else if (fault.type === 'protection-forced-open') {
      pushFaultNarrationWarning('BREAKER JAMMED OPEN: Device mechanism locked in open state.');
    }

    faultDiagnostics.push({
      id: `diag_${fault.id}`,
      faultId: fault.id,
      type: fault.type,
      category: def.category,
      severity: def.severity,
      title: def.label,
      description: def.description,
      affectedComponents,
      affectedWires,
      affectedPorts: affectedPorts.length > 0 ? affectedPorts : undefined,
      reason: def.simulationEffect,
      resolutionHint: def.repairBehavior,
      standardReference: def.standardReference,
      isResolved: false,
    });
  }

  // ── Voltage Mismatch Check (110V vs 220-240V mixed system) ──
  const voltagesInUse = new Set<number>();
  for (const c of circuit.components) {
    if (!energizedComponents.has(c.id)) continue;
    const def = defs[c.type];
    if (def?.isLoad) {
      const ratedV = c.state.customMaxVolts ?? def.maxVolts ?? c.state.customVoltage ?? 230;
      if (ratedV <= 130) voltagesInUse.add(110);
      else if (ratedV >= 200) voltagesInUse.add(230);
    }
  }
  if (supplyVoltage >= 200) voltagesInUse.add(230);
  else if (supplyVoltage <= 130) voltagesInUse.add(110);

  if (voltagesInUse.has(110) && voltagesInUse.has(230)) {
    const mismatchMsg = `VOLTAGE MISMATCH: 110V rated equipment detected on a ${supplyVoltage}V circuit! Incompatible voltage ratings cause severe overvoltage burnout.`;
    errors.push(mismatchMsg);
    for (const c of circuit.components) {
      if (!energizedComponents.has(c.id)) continue;
      const def = defs[c.type];
      const ratedV = c.state.customMaxVolts ?? def?.maxVolts ?? 250;
      if (ratedV <= 130 && supplyVoltage >= 200) {
        errorComponents.add(c.id);
        markDamage(c.id, 'overvoltage');
      }
    }
  }

  // ── Thermal data computation ──
  const thermalData: Record<
    string,
    {
      powerWatts: number;
      temperature: number;
      maxTemperature: number;
      colorCode: string;
      status: 'normal' | 'warm' | 'hot' | 'critical';
    }
  > = {};

  for (const c of circuit.components) {
    const def = defs[c.type];
    const isEnergized = energizedComponents.has(c.id);
    let pWatts = 0;
    if (isEnergized && !c.state.isBlown && !c.state.isTripped) {
      if (def?.isLoad) {
        pWatts = c.state.customPowerWatts ?? def.powerWatts ?? 60;
      } else if (def?.isSource || c.type.includes('battery')) {
        const chem = c.state.batteryChemistry ?? 'alkaline';
        const rInt = chem === 'lead-acid' ? 0.01 : chem === 'li-ion' ? 0.02 : 0.15;
        pWatts = totalLoadAmps * totalLoadAmps * rInt;
      } else {
        pWatts = totalLoadAmps * totalLoadAmps * 0.02;
      }
    }
    // Per-component live telemetry (voltage / current / power). Only energized,
    // non-blown loads carry real current; sources sit at supply voltage.
    if (isEnergized && !c.state.isBlown && !c.state.isTripped) {
      const v = def?.isSource ? supplyVoltage : supplyVoltage;
      const amps = def?.isLoad && supplyVoltage > 0 ? pWatts / Math.max(1, supplyVoltage) : 0;
      componentCalculations[c.id] = {
        voltage: v,
        currentAmps: amps,
        powerWatts: def?.isLoad ? pWatts : 0,
      };
    }

    const ambientC = 22;
    const tempC = ambientC + (pWatts > 0 ? Math.min(120, pWatts * 0.5) : 0);
    let colorCode = '#22c55e';
    let status: 'normal' | 'warm' | 'hot' | 'critical' = 'normal';
    if (tempC >= 75 || c.state.isBlown) {
      colorCode = '#ef4444';
      status = 'critical';
    } else if (tempC >= 55) {
      colorCode = '#f97316';
      status = 'hot';
    } else if (tempC >= 38) {
      colorCode = '#eab308';
      status = 'warm';
    }

    thermalData[c.id] = {
      powerWatts: pWatts,
      temperature: tempC,
      maxTemperature: 90,
      colorCode,
      status,
    };
  }

  return {
    energizedComponents,
    energizedWires,
    errorComponents,
    errorWires,
    errors,
    warnings,
    ...(coilStates.size ? { coilStates: Object.fromEntries(coilStates) } : {}),
    blownComponents: blownComponents.length > 0 ? blownComponents : undefined,
    overloadedWires: overloadedWires.size > 0 ? overloadedWires : undefined,
    supplyVoltage,
    wireHeatRatios: Object.keys(wireHeatRatios).length > 0 ? wireHeatRatios : undefined,
    wireCalculations: Object.keys(wireCalculations).length > 0 ? wireCalculations : undefined,
    componentCalculations:
      Object.keys(componentCalculations).length > 0 ? componentCalculations : undefined,
    bustedWires: bustedWires.size > 0 ? bustedWires : undefined,
    trippedComponents: trippedComponents.length > 0 ? trippedComponents : undefined,
    wireMeltEvents: wireMeltEvents.length > 0 ? wireMeltEvents : undefined,
    faultDiagnostics: faultDiagnostics.length > 0 ? faultDiagnostics : undefined,
    faultNarrationErrors: faultNarrationErrors.length > 0 ? faultNarrationErrors : undefined,
    faultNarrationWarnings: faultNarrationWarnings.length > 0 ? faultNarrationWarnings : undefined,
    activeInjectedFaults: activeFaults.length > 0 ? activeFaults : undefined,
    faultsCleared: errors.length === 0,
    ...(modelLimitations.length > 0 ? { modelLimitations } : {}),
    thermalData,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────
