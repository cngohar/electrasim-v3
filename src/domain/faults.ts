/**
 * Fault simulation domain registry, definitions, and utility helpers.
 *
 * Provides a rich, extensible catalog of real-world electrical faults
 * according to BS 7671 (IET Wiring Regulations) and IEC electrical principles:
 * - Conductor breaks (Open Live, Open Neutral, Open Earth / CPC, Terminal Disconnection)
 * - Polarity inversions (Reversed Live/Neutral, Switched Neutral)
 * - Earth & Insulation faults (Earth Fault, Live-to-Earth Leakage, Missing CPC)
 * - Protection failures (Forced Open / Jammed Mechanism, Protection Bypass, Short Circuit)
 *
 * Keep pure and dependency-free so it can run seamlessly in Web Workers.
 */

import { COMPONENT_DEFS } from './components';
import type {
  Circuit,
  ComponentInstance,
  FaultCategory,
  FaultDefinition,
  FaultDiagnostic,
  FaultTarget,
  FaultType,
  InjectedFault,
  SimulationResult,
  WireFaultType,
  WireInstance,
} from './types';

// ─── Centralized Fault Definitions ──────────────────────────────────────────

export const FAULT_REGISTRY: Record<FaultType, FaultDefinition> = {
  // ── 1. Conductor Faults ───────────────────────────────────────────────────
  'open-circuit': {
    id: 'open-circuit',
    label: 'Open Circuit Break',
    category: 'conductor',
    targetType: 'any',
    severity: 'error',
    standardReference: 'BS 7671 Part 6 (Continuity Testing)',
    icon: 'Scissors',
    description:
      'Complete conductor discontinuity or internal break. Prevents all electrical current from flowing through this path.',
    simulationEffect:
      'Completely halts graph traversal through the affected component body or wire.',
    detectionBehavior:
      'Low-resistance continuity tester measures infinite impedance (> 2000 MΩ / open loop). Downstream loads fail to energize.',
    repairBehavior:
      'Inspect connections, repair or replace the broken cable segment, or re-terminate loose conductor strands.',
  },

  'open-live': {
    id: 'open-live',
    label: 'Open Live (Line Break)',
    category: 'conductor',
    targetType: 'any',
    severity: 'error',
    standardReference: 'BS 7671 Reg 643.2.1',
    icon: 'Unlink',
    description:
      'The Line (Live / L) conductor is severed or disconnected. Downstream equipment receives no active potential from the supply.',
    simulationEffect:
      'Live rail traversal terminates at the break. Neutral and Earth paths remain physically intact.',
    detectionBehavior:
      'Voltage tester detects 0 V between Line and Neutral / Earth downstream of the break; 230 V present upstream.',
    repairBehavior:
      'Restore Line conductor continuity across the junction, terminal, or cable run.',
  },

  'open-neutral': {
    id: 'open-neutral',
    label: 'Open Neutral (Floating Return)',
    category: 'conductor',
    targetType: 'any',
    severity: 'error',
    standardReference: 'BS 7671 Reg 643.2.1 / Floating Neutral Hazard',
    icon: 'Unlink',
    description:
      'The Neutral (N) return path is broken. Live voltage still reaches the appliance, creating a dangerous elevated potential on floating neutral terminals.',
    simulationEffect:
      'Live rail reaches load terminals, but Neutral return cannot complete the circuit back to the source. Load does not run.',
    detectionBehavior:
      'Downstream Neutral reads 230 V to Earth when load is connected (floating neutral). No current flows.',
    repairBehavior:
      'Trace and re-connect the Neutral return conductor back to the distribution board neutral busbar.',
  },

  'open-earth': {
    id: 'open-earth',
    label: 'Open Earth (Broken CPC)',
    category: 'conductor',
    targetType: 'any',
    severity: 'warning',
    standardReference: 'BS 7671 Reg 411.3.1.1 (Protective Earthing Continuity)',
    icon: 'ShieldOff',
    description:
      'The Circuit Protective Conductor (CPC / Earth) is broken or disconnected. Circuit operates normally until a second fault occurs, creating a severe electric shock hazard.',
    simulationEffect:
      'Loads still energize via Live & Neutral, but the protective earth bond is broken. Produces a high-risk safety warning.',
    detectionBehavior:
      'R1+R2 or R2 continuity test reads open circuit (> 2000 MΩ). Socket tester flags missing ground / CPC.',
    repairBehavior:
      'Reconnect the continuous protective conductor and tighten all earth terminal screws.',
  },

  'terminal-disconnect': {
    id: 'terminal-disconnect',
    label: 'Loose / Disconnected Terminal',
    category: 'conductor',
    targetType: 'port',
    severity: 'error',
    standardReference: 'BS 7671 Reg 526.1 (Electrical Connections)',
    icon: 'Wrench',
    description:
      'Screw terminal or push-in connector is loose, corroded, or disconnected at a specific component port.',
    simulationEffect:
      'Severes all wire connections entering or leaving this specific component terminal.',
    detectionBehavior:
      'Visual inspection reveals loose terminal screw; multi-meter shows open circuit at this terminal.',
    repairBehavior:
      'Re-insert conductor firmly into the terminal block and torque terminal screw to manufacturer specifications.',
  },

  // ── 2. Polarity Faults ────────────────────────────────────────────────────
  'reverse-polarity': {
    id: 'reverse-polarity',
    label: 'Reversed Polarity (L ⇄ N Swap)',
    category: 'polarity',
    targetType: 'any',
    severity: 'error',
    standardReference: 'BS 7671 Reg 643.6 (Polarity Testing)',
    icon: 'ArrowRightLeft',
    description:
      'Line and Neutral conductors are cross-connected. Appliances and switch mechanisms are placed on the return path, leaving Edison screw shells and internal circuits permanently live.',
    simulationEffect:
      'Swaps logical Live and Neutral feeds at this point. In single-pole switches, switching operates on the neutral leg.',
    detectionBehavior:
      'Polarity tester or socket test plug indicates Live/Neutral reversal. Voltage to earth on Neutral terminal reads 230 V.',
    repairBehavior:
      'Swap Line (Brown) and Neutral (Blue) conductors back to their designated terminal positions.',
  },

  'switched-neutral': {
    id: 'switched-neutral',
    label: 'Switched Neutral Hazard',
    category: 'polarity',
    targetType: 'component',
    severity: 'critical',
    standardReference:
      'BS 7671 Reg 132.14 & 537.1.2 (Single-pole switching in line conductor only)',
    icon: 'AlertOctagon',
    description:
      'A single-pole control switch is wired into the Neutral conductor instead of the Live line. Turning the switch OFF stops the load, but the appliance remains energized at 230 V lethal potential!',
    simulationEffect:
      'Switch cuts the neutral return path. The load turns off, but the load terminals remain connected to Live voltage.',
    detectionBehavior:
      'Voltage tester detects 230 V to Earth at the lamp holder or load terminal even when the wall switch is in the OFF position.',
    repairBehavior: 'Rewire switch into the Line (Phase) conductor feed before the load.',
  },

  // ── 3. Earth & Insulation Faults ──────────────────────────────────────────
  'earth-fault': {
    id: 'earth-fault',
    label: 'Earth Fault / Short to Earth',
    category: 'earth',
    targetType: 'any',
    severity: 'critical',
    standardReference: 'BS 7671 Reg 411.3.2 (Automatic Disconnection of Supply - ADS)',
    icon: 'Flame',
    description:
      'Direct low-impedance contact between Line conductor and earthed metalwork or CPC, producing high fault current.',
    simulationEffect:
      'Direct fault path from Live to Earth. Trips upstream RCD/RCBO instantaneously or overcurrent device if loop impedance is sufficiently low.',
    detectionBehavior:
      'Insulation resistance tester shows < 1.0 MΩ (typically 0.00 Ω). RCD/RCBO trips on start.',
    repairBehavior:
      'Locate and isolate damaged cable insulation where conductor touches metal enclosure or chassis.',
  },

  'live-to-earth': {
    id: 'live-to-earth',
    label: 'Insulation Leakage (Live to Earth)',
    category: 'earth',
    targetType: 'any',
    severity: 'critical',
    standardReference: 'BS 7671 Reg 643.3 (Insulation Resistance)',
    icon: 'Activity',
    description:
      'Degraded insulation allows residual leakage current (> 30 mA) from Live conductor into protective earth.',
    simulationEffect:
      'Simulates >35 mA earth leakage current, instantly tripping any 30mA RCD/RCBO protective device upstream.',
    detectionBehavior:
      'Insulation resistance (500V DC test) reads < 1 MΩ (BS 7671 minimum). Clamp meter detects differential earth leakage current.',
    repairBehavior: 'Replace moisture-damaged, degraded, or pinched cable run.',
  },

  'smooth-dc-residual': {
    id: 'smooth-dc-residual',
    label: 'Smooth DC Residual Leakage (EV/PV/VFD)',
    category: 'earth',
    targetType: 'component',
    severity: 'critical',
    standardReference: 'BS EN 62423 & BS 7671 Reg 531.3.3 (RCD type selection)',
    icon: 'Waves',
    description:
      'Power-electronic loads (EV chargers, PV inverters, variable-speed drives) can leak smooth DC residual current that the toroidal core of Type AC/A/F RCDs cannot detect — the device stays closed on a live earth fault.',
    simulationEffect:
      'Injects >10 mA of smooth DC residual current. Only a Type B device in the same network trips; Type AC/A/F tolerate at most 6/10 mA exposed DC before their core saturates and never detect this magnitude.',
    detectionBehavior:
      'Type B RCD/RCBO trips instantly. Type AC/A/F devices show no response — a standard handheld RCD ramp test uses AC and would still PASS, which is why selection by load type matters.',
    repairBehavior:
      'Fit a Type B RCD/RCBO on circuits feeding EV charge points, PV inverters or VFDs, or use EVSE with built-in 6 mA DC detection (RDC-DD, IEC 62955) upstream of a Type A device.',
  },

  'arc-fault': {
    id: 'arc-fault',
    label: 'Arc Fault (Series / Parallel Arcing)',
    category: 'thermal',
    targetType: 'component',
    severity: 'critical',
    standardReference: 'BS EN 62606 & BS 7671 Reg 421.1.7 (AFDD requirements)',
    icon: 'Flame',
    description:
      'A damaged conductor, loose terminal or crushed cable arcs in series with the load (or across insulation in parallel). Arc current sits at or below load current and creates no earth imbalance, so MCBs and RCDs stay closed while the arc reaches ignition temperatures.',
    simulationEffect:
      'Injects an arc-fault signature on the component. Only an AFDD in the same connected network recognises the waveform and trips; a network with no AFDD keeps feeding the arc.',
    detectionBehavior:
      'AFDD trips on the arc signature. MCB/RCD/RCBO give no response — their thermal/magnetic elements and residual-current toroid are blind to this fault by design.',
    repairBehavior:
      'Fit an AFDD (BS EN 62606) at the origin of the circuit — mandatory on ≤32 A socket final circuits in HRRBs, HMOs, student accommodation and care homes (BS 7671 Reg 421.1.7) — and repair the damaged conductor or terminal.',
  },

  // ── 4. Protection Faults ──────────────────────────────────────────────────
  'protection-forced-open': {
    id: 'protection-forced-open',
    label: 'Breaker Jammed / Forced Open',
    category: 'protection',
    targetType: 'component',
    severity: 'warning',
    standardReference: 'BS 7671 Chapter 53 (Protection, Isolation, Switching)',
    icon: 'Lock',
    description:
      'Circuit breaker or switch mechanism is mechanically jammed or locked in the open position and will not conduct.',
    simulationEffect: 'Device remains non-conductive regardless of the user toggle switch state.',
    detectionBehavior:
      'No continuity across input and output terminals when switch toggle is placed in ON position.',
    repairBehavior: 'Replace defective mechanical breaker/switch module.',
  },

  'protection-bypass': {
    id: 'protection-bypass',
    label: 'Protection Bypassed / Shunted',
    category: 'protection',
    targetType: 'component',
    severity: 'critical',
    standardReference: 'BS 7671 Reg 433.1 / 434.1 (Overcurrent Protection Mandatory)',
    icon: 'ZapOff',
    description:
      'Protective fuse or breaker has been bridged/shorted (e.g. copper wire over a fuse carrier). Fails to trip during overloads or short circuits!',
    simulationEffect:
      'Breaker or fuse conducts continuously without ever tripping or blowing, allowing cables to overheat and melt in overload conditions.',
    detectionBehavior: 'Inspection reveals unauthorized jumper or bridged fuse link.',
    repairBehavior:
      'Remove bypass wire and install genuine, correctly-rated fuse cartridge or MCB.',
  },

  'short-circuit': {
    id: 'short-circuit',
    label: 'Dead Short Circuit (L to N)',
    category: 'protection',
    targetType: 'any',
    severity: 'critical',
    standardReference: 'BS 7671 Reg 434.5.2 (Short-Circuit Breaking Capacity)',
    icon: 'Zap',
    description:
      'Direct zero-resistance connection between Line (Live) and Neutral supply rails with no load impedance.',
    simulationEffect:
      'Creates infinite current loop. Causes immediate magnetic trip on upstream circuit breakers or blows cartridge fuses.',
    detectionBehavior:
      'Resistance between Line and Neutral reads 0.00 Ω with loads disconnected. Breakers trip instantaneously.',
    repairBehavior:
      'Isolate shorted wire conductor touching adjacent terminals or replace internally shorted load.',
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

export function getFaultDefinition(type: FaultType): FaultDefinition {
  return (
    FAULT_REGISTRY[type] ?? {
      id: type,
      label: type,
      category: 'conductor',
      targetType: 'any',
      severity: 'error',
      description: 'Injected circuit fault.',
      simulationEffect: 'Modifies circuit behavior.',
      detectionBehavior: 'Use electrical test instruments to locate.',
      repairBehavior: 'Clear the fault to restore normal operation.',
    }
  );
}

export function getFaultCategoryLabel(category: FaultCategory): string {
  switch (category) {
    case 'conductor':
      return 'Conductor & Connection Breaks';
    case 'polarity':
      return 'Polarity & Wiring Reversals';
    case 'earth':
      return 'Earth & Insulation Faults';
    case 'protection':
      return 'Protection & Overcurrent Devices';
    case 'component':
      return 'Component Internal Faults';
    case 'thermal':
      return 'Thermal & Cable Heating';
    case 'voltage':
      return 'Voltage Mismatches';
    default:
      return 'Fault Conditions';
  }
}

/**
 * Filter available faults that can be logically injected on the given target.
 */
export function getAvailableFaultsForTarget(
  circuit: Circuit,
  target: FaultTarget,
): FaultDefinition[] {
  const allDefs = Object.values(FAULT_REGISTRY);

  if (target.type === 'wire') {
    const wire = circuit.wires.find((w) => w.id === target.id);
    if (!wire) return [];
    return allDefs.filter(
      (d) =>
        d.targetType === 'wire' ||
        d.targetType === 'any' ||
        d.id === 'open-circuit' ||
        d.id === 'open-live' ||
        d.id === 'open-neutral' ||
        d.id === 'open-earth' ||
        d.id === 'short-circuit' ||
        d.id === 'reverse-polarity' ||
        d.id === 'earth-fault' ||
        d.id === 'live-to-earth',
    );
  }

  if (target.type === 'port') {
    return allDefs.filter(
      (d) =>
        d.targetType === 'port' ||
        d.id === 'terminal-disconnect' ||
        d.id === 'open-circuit' ||
        d.id === 'earth-fault',
    );
  }

  if (target.type === 'component') {
    const comp = circuit.components.find((c) => c.id === target.id);
    if (!comp) return [];
    const def = COMPONENT_DEFS[comp.type];

    return allDefs.filter((d) => {
      if (d.targetType === 'port') return false;
      if (d.id === 'switched-neutral') {
        return def?.isSwitch === true;
      }
      if (d.id === 'protection-forced-open' || d.id === 'protection-bypass') {
        return (
          def?.isProtection === true ||
          comp.type.includes('mcb') ||
          comp.type.includes('rcd') ||
          comp.type.includes('rcbo') ||
          comp.type.includes('fuse') ||
          comp.type.includes('fused-spur')
        );
      }
      if (d.id === 'open-earth' || d.id === 'live-to-earth') {
        return def?.ports.some((p) => p.type === 'earth') ?? true;
      }
      return true;
    });
  }

  return allDefs;
}

/**
 * Type guard — true when a fault kind can be mirrored onto the legacy
 * per-wire `fault` field (see `WireFaultType` in `types.ts`). The modern
 * `InjectedFault` pipeline accepts any fault type; the legacy field only
 * models the four conductor-level kinds.
 */
export function isWireFaultType(type: FaultType): type is WireFaultType {
  return (
    type === 'open-circuit' ||
    type === 'open-neutral' ||
    type === 'short-circuit' ||
    type === 'live-to-earth'
  );
}

/**
 * Validate coexistence between existing active faults and a newly proposed fault.
 */
export function validateFaultCoexistence(
  activeFaults: InjectedFault[],
  newFault: InjectedFault,
): { valid: boolean; reason?: string } {
  // Check exact duplicate
  const exactDuplicate = activeFaults.find(
    (f) =>
      f.type === newFault.type &&
      f.target.type === newFault.target.type &&
      ((f.target.type === 'component' &&
        newFault.target.type === 'component' &&
        f.target.id === newFault.target.id) ||
        (f.target.type === 'wire' &&
          newFault.target.type === 'wire' &&
          f.target.id === newFault.target.id) ||
        (f.target.type === 'port' &&
          newFault.target.type === 'port' &&
          f.target.componentId === newFault.target.componentId &&
          f.target.portIndex === newFault.target.portIndex)),
  );

  if (exactDuplicate) {
    return {
      valid: false,
      reason: `Fault "${getFaultDefinition(newFault.type).label}" is already injected on this target.`,
    };
  }

  // Same target mutually exclusive checks (e.g. open-circuit vs short-circuit on the exact same wire)
  if (newFault.target.type === 'wire') {
    // Hoist the narrowed id — TypeScript does not preserve property-access
    // narrowing inside the `filter` closure below.
    const newWireId = newFault.target.id;
    const wireFaults = activeFaults.filter(
      (f) => f.target.type === 'wire' && f.target.id === newWireId,
    );
    const hasOpen = wireFaults.some(
      (f) => f.type === 'open-circuit' || f.type === 'open-live' || f.type === 'open-neutral',
    );
    const hasShort = wireFaults.some((f) => f.type === 'short-circuit');

    if (
      (newFault.type === 'short-circuit' && hasOpen) ||
      ((newFault.type === 'open-circuit' ||
        newFault.type === 'open-live' ||
        newFault.type === 'open-neutral') &&
        hasShort)
    ) {
      return {
        valid: false,
        reason:
          'A single wire cannot simultaneously have an open break and a direct short circuit.',
      };
    }
  }

  return { valid: true };
}

/**
 * Generate a unique injected fault record.
 */
export function createInjectedFault(
  type: FaultType,
  target: FaultTarget,
  parameters?: Record<string, unknown>,
): InjectedFault {
  const def = getFaultDefinition(type);
  const targetId =
    target.type === 'component'
      ? target.id
      : target.type === 'wire'
        ? target.id
        : `${target.componentId}_p${target.portIndex}`;
  const id = `fault_${target.type}_${targetId}_${type}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    type,
    category: def.category,
    target,
    parameters,
    createdAt: Date.now(),
    resolved: false,
  };
}

/**
 * Normalizes all faults in the circuit (including legacy ComponentState.fault and WireInstance.fault)
 * into a single unified list of InjectedFault objects.
 */
export function normalizeCircuitFaults(circuit: Circuit): InjectedFault[] {
  const result: InjectedFault[] = [];
  const seenKeys = new Set<string>();

  // 1. Ingest explicit injected faults
  if (circuit.faults && Array.isArray(circuit.faults)) {
    for (const f of circuit.faults) {
      const key = `${f.target.type}:${f.target.type === 'port' ? `${f.target.componentId}:${f.target.portIndex}` : f.target.id}:${f.type}`;
      seenKeys.add(key);
      result.push(f);
    }
  }

  // 2. Ingest legacy component state faults
  for (const c of circuit.components) {
    if (c.state.fault) {
      const key = `component:${c.id}:${c.state.fault}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        result.push(createInjectedFault(c.state.fault, { type: 'component', id: c.id }));
      }
    }
  }

  // 3. Ingest legacy wire faults
  for (const w of circuit.wires) {
    if (w.fault) {
      const key = `wire:${w.id}:${w.fault}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        result.push(createInjectedFault(w.fault, { type: 'wire', id: w.id }));
      }
    }
  }

  return result;
}

/**
 * Checks if a fault is currently considered resolved based on circuit topology and simulation state.
 */
export function isFaultResolved(
  fault: InjectedFault,
  circuit: Circuit,
  simResult: SimulationResult | null,
): boolean {
  if (!simResult) return false;

  // Narrow once into a local — property-access narrowing on `fault.target`
  // is not preserved inside the `.find`/`.some` closures below.
  const target = fault.target;
  if (target.type === 'component') {
    const comp = circuit.components.find((c) => c.id === target.id);
    if (!comp) return true; // Target deleted -> resolved
    if (!comp.state.fault && !circuit.faults?.some((f) => f.id === fault.id)) return true;
  } else if (target.type === 'wire') {
    const wire = circuit.wires.find((w) => w.id === target.id);
    if (!wire) return true; // Target deleted -> resolved
    if (!wire.fault && !circuit.faults?.some((f) => f.id === fault.id)) return true;
  } else if (target.type === 'port') {
    const comp = circuit.components.find((c) => c.id === target.componentId);
    if (!comp) return true;
    if (!circuit.faults?.some((f) => f.id === fault.id)) return true;
  }

  return false;
}
