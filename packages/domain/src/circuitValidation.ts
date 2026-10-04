import { runComplianceChecks } from './compliance';
import { COMPONENT_DEFS } from './components';
import { validateCircuitInput } from './core/input';
import { normalizeCircuitDocument } from './core/normalize';
import { assessCircuitReadiness } from './core/readiness';
import { assessWireCapacity } from './core/wireCapacity';
import { resolveWireProperties } from './core/wireProperties';
import { isOvercurrentDevice, isResidualDevice } from './protectionRoles';
import { getSimulationLimitations } from './simulationCoverage';
import { getStandard } from './standards';
import type { StandardId } from './standards';
import type { Circuit, ComponentInstance, SimulationResult, WireInstance } from './types';

// Types used by this module's own signatures. The rest of the moved type set is
// re-exported below straight from its new home, so it needs no local binding.
import type { PassedCheck, ValidationIssue, ValidationReport } from './circuitValidationTypes';

// Re-export the moved types so existing imports keep working.
export type {
  DetailedBreakdown,
  DetailedStep,
  PassedCheck,
  QuickFixAction,
  QuickFixType,
  ValidationIssue,
  ValidationReport,
  ValidationSeverity,
} from './circuitValidationTypes';

/** Shared wire resolution; declared sizes retain their provenance for advice. */
function resolveConductorMm2(
  wire: WireInstance,
  byId: Map<string, ComponentInstance>,
): { mm2: number; declared: boolean } {
  const resolved = resolveWireProperties(wire, byId);
  return { mm2: resolved.cableMm2, declared: resolved.provenance.cableMm2 !== 'default' };
}

export function validateCircuit(
  rawCircuit: Circuit,
  simResult?: SimulationResult | null,
  standard: StandardId = 'uk',
): ValidationReport {
  const input = validateCircuitInput(rawCircuit);
  if (!input.valid)
    return {
      timestamp: Date.now(),
      score: 0,
      status: 'fail',
      blockingErrorsCount: input.diagnostics.length,
      summary: {
        errorsCount: input.diagnostics.length,
        warningsCount: 0,
        infoCount: 0,
        passedCount: 0,
      },
      issues: input.diagnostics.map((diagnostic, index) => ({
        id: `input_${diagnostic.code}_${index}`,
        severity: 'error',
        category: 'configuration',
        blocking: true,
        title: 'Invalid circuit data',
        description: diagnostic.message,
        recommendation:
          'Repair the referenced component, terminal, wire or fault before simulation.',
        componentId: diagnostic.componentId,
        wireId: diagnostic.wireId,
      })),
      passedChecks: [],
      standard,
    };
  const circuit = normalizeCircuitDocument(input.circuit, false);
  const issues: ValidationIssue[] = [];
  const passedChecks: PassedCheck[] = [];

  const { components, wires } = circuit;

  // 1. EMPTY CANVAS CHECK
  if (components.length === 0) {
    return {
      timestamp: Date.now(),
      score: 0,
      status: 'empty',
      isEmpty: true,
      summary: { errorsCount: 0, warningsCount: 0, infoCount: 0, passedCount: 0 },
      issues: [],
      passedChecks: [],
    };
  }

  // Index wires by "compId:portIdx"
  const portToWiresMap = new Map<string, WireInstance[]>();
  const compWiresMap = new Map<string, Set<WireInstance>>();

  for (const w of wires) {
    const keyFrom = `${w.fromComponentId}:${w.fromPortIndex}`;
    const keyTo = `${w.toComponentId}:${w.toPortIndex}`;

    if (!portToWiresMap.has(keyFrom)) portToWiresMap.set(keyFrom, []);
    portToWiresMap.get(keyFrom)!.push(w);

    if (!portToWiresMap.has(keyTo)) portToWiresMap.set(keyTo, []);
    portToWiresMap.get(keyTo)!.push(w);

    if (!compWiresMap.has(w.fromComponentId)) compWiresMap.set(w.fromComponentId, new Set());
    compWiresMap.get(w.fromComponentId)!.add(w);

    if (!compWiresMap.has(w.toComponentId)) compWiresMap.set(w.toComponentId, new Set());
    compWiresMap.get(w.toComponentId)!.add(w);
  }

  const componentsById = new Map(components.map((c) => [c.id, c]));

  // 2. POWER SUPPLY CHECK
  const supplyComponents = components.filter((c) => {
    const def = COMPONENT_DEFS[c.type];
    return (
      def?.isSource ||
      c.type.includes('supply') ||
      c.type.includes('terminal') ||
      c.type === 'ac-mains-supply' ||
      c.type === 'distribution-board'
    );
  });

  if (supplyComponents.length === 0) {
    return {
      timestamp: Date.now(),
      score: 0,
      status: 'incomplete',
      isIncomplete: true,
      summary: { errorsCount: 1, warningsCount: 0, infoCount: 0, passedCount: 0 },
      issues: [
        {
          id: 'no_supply',
          severity: 'error',
          title: 'Missing Power Supply Source',
          description:
            'The circuit contains no AC Mains, Battery, or Supply Terminals to energize components.',
          recommendation:
            'Add an AC Mains Supply or Live/Neutral Source terminals from the Power Supply category in the palette.',
          category: 'configuration',
          quickFix: {
            label: 'Add AC Mains Supply',
            type: 'add_power_supply',
          },
          detailedBreakdown: {
            bs7671Regulation: 'BS 7671 Section 312 (Supply & System Types)',
            physicsExplanation:
              'Without an energized supply source, potential difference (voltage) cannot drive current through closed circuit loops.',
            steps: [
              {
                stepNumber: 1,
                title: 'Topology Inspection',
                description: 'Scanned component mesh for source nodes.',
              },
              {
                stepNumber: 2,
                title: 'Source Verification',
                description: 'Zero AC or DC voltage sources were detected on canvas.',
              },
              {
                stepNumber: 3,
                title: 'Remediation Action',
                description: 'Place an AC Mains supply module or distribution board.',
              },
            ],
            practicalTip:
              'Every functional electrical distribution system begins with a certified main service supply or consumer unit entry point.',
          },
        },
      ],
      passedChecks: [],
    };
  }

  // 3. INCOMPLETE CIRCUIT CHECK (No wires attached at all)
  if (wires.length === 0) {
    return {
      timestamp: Date.now(),
      score: 0,
      status: 'incomplete',
      isIncomplete: true,
      summary: { errorsCount: 0, warningsCount: 1, infoCount: 0, passedCount: 0 },
      issues: [
        {
          id: 'incomplete_no_wires',
          severity: 'warning',
          title: 'Incomplete Circuit (No Wires Connected)',
          description:
            'Components are placed on the canvas, but no wires have been connected between them yet.',
          recommendation:
            'Connect Live (L), Neutral (N), and Earth (E) wires between components to complete the circuit before validating.',
          category: 'continuity',
          detailedBreakdown: {
            bs7671Regulation: 'BS 7671 Regulation 132.14 (Electrical Connections)',
            physicsExplanation:
              'Electrical charge requires continuous conductive pathways to form a closed current loop.',
            steps: [
              {
                stepNumber: 1,
                title: 'Mesh Connectivity Analysis',
                description: 'Evaluated terminal node connections.',
              },
              {
                stepNumber: 2,
                title: 'Wire Count Check',
                description: '0 active conductors were found bridging component terminals.',
              },
              {
                stepNumber: 3,
                title: 'Wiring Requirement',
                description: 'Draw L, N, and E conductors between components to complete loops.',
              },
            ],
            practicalTip:
              'Click and drag from any terminal port in Wire mode to lay insulated copper conductors.',
          },
        },
      ],
      passedChecks: [],
    };
  }

  const modelLimitations = simResult?.modelLimitations ?? getSimulationLimitations(circuit);
  for (const limitation of modelLimitations) {
    issues.push({
      id: `model_${limitation.componentId}_${limitation.code}`,
      componentId: limitation.componentId,
      severity: limitation.blocking ? 'error' : 'warning',
      title: 'Electrical model not assessed',
      description: limitation.message,
      recommendation:
        'Keep this drawing for editing or export; use supported device models for electrical assessment.',
      category: 'configuration',
      blocking: limitation.blocking,
    });
  }

  // Shared topology/solved findings keep source conflicts, polarity and solver
  // failures out of the old generic "short circuit" bucket. Full design-check
  // and exercise migration remains a separate gate.
  const readiness = simResult?.readiness ?? assessCircuitReadiness(circuit);
  const seenElectrical = new Set<string>();
  for (const diagnostic of [
    ...readiness.diagnostics,
    ...(simResult?.electrical?.diagnostics ?? []),
  ]) {
    if (diagnostic.severity === 'info') continue;
    const key = JSON.stringify([
      diagnostic.code,
      diagnostic.componentId,
      diagnostic.wireId,
      diagnostic.faultId,
    ]);
    if (seenElectrical.has(key)) continue;
    seenElectrical.add(key);
    issues.push({
      id: `electrical_${diagnostic.code}_${seenElectrical.size}`,
      severity: diagnostic.severity,
      title: 'Electrical calculation finding',
      description: diagnostic.message,
      recommendation: 'Review the referenced connection or model and run the calculation again.',
      category: diagnostic.code.includes('polarity')
        ? 'polarity'
        : diagnostic.code.startsWith('pe-') || diagnostic.code.includes('-pe')
          ? 'grounding'
          : diagnostic.code === 'readiness-short'
            ? 'short_circuit'
            : diagnostic.code === 'wire-capacity-exceeded'
              ? 'cable_sizing'
              : 'configuration',
      blocking: diagnostic.severity === 'error',
      componentId: diagnostic.componentId,
      wireId: diagnostic.wireId,
    });
  }

  // Check for unwired components
  const unwiredComps = components.filter((c) => {
    const attached = compWiresMap.get(c.id);
    return !attached || attached.size === 0;
  });

  if (unwiredComps.length > 0) {
    const compNames = Array.from(
      new Set(unwiredComps.map((c) => COMPONENT_DEFS[c.type]?.label || c.type)),
    ).join(', ');

    issues.push({
      id: 'unwired_components_group',
      severity: 'warning',
      title: `Incomplete Wiring (${unwiredComps.length} Unwired Component${unwiredComps.length > 1 ? 's' : ''})`,
      description: `The following placed component(s) have no wire connections: ${compNames}.`,
      recommendation:
        'Complete wiring for all components or delete unused items to finalize circuit validation.',
      category: 'continuity',
      componentId: unwiredComps[0].id,
      detailedBreakdown: {
        bs7671Regulation: 'BS 7671 Regulation 526.1 (Electrical Connections)',
        physicsExplanation:
          'Unwired components remain isolated floating nodes in the circuit mesh, rendering them non-functional.',
        steps: [
          {
            stepNumber: 1,
            title: 'Node Graph Scan',
            description: `Identified ${unwiredComps.length} component(s) with 0 connected wires.`,
          },
          {
            stepNumber: 2,
            title: 'Continuity Verification',
            description: `Unwired items: ${compNames}.`,
          },
          {
            stepNumber: 3,
            title: 'Resolution',
            description: 'Wire all terminal ports or remove unused components.',
          },
        ],
        practicalTip: 'Ensure every load or switch terminal is connected into the circuit loop.',
      },
    });
  } else {
    passedChecks.push({
      id: 'pass_continuity',
      title: 'Full Circuit Connectivity',
      description: 'All placed components are connected into the circuit mesh.',
    });
  }

  // Helper to get connected neighbor port keys
  function getConnectedPorts(
    compId: string,
    portIdx: number,
  ): { compId: string; portIdx: number }[] {
    const key = `${compId}:${portIdx}`;
    const connectedWires = portToWiresMap.get(key) || [];
    const results: { compId: string; portIdx: number }[] = [];

    for (const w of connectedWires) {
      if (w.fromComponentId === compId && w.fromPortIndex === portIdx) {
        results.push({ compId: w.toComponentId, portIdx: w.toPortIndex });
      } else if (w.toComponentId === compId && w.toPortIndex === portIdx) {
        results.push({ compId: w.fromComponentId, portIdx: w.fromPortIndex });
      }
    }
    return results;
  }

  // Earth supply ports
  const earthSourcePorts: { compId: string; portIdx: number }[] = [];
  for (const c of components) {
    const def = COMPONENT_DEFS[c.type];
    if (!def) continue;
    def.ports.forEach((p, idx) => {
      if (
        p.type === 'earth' &&
        (def.isSource ||
          c.type.includes('earth-terminal') ||
          c.type.includes('mains') ||
          c.type.includes('distribution'))
      ) {
        earthSourcePorts.push({ compId: c.id, portIdx: idx });
      }
    });
  }

  function reachesEarthSupply(compId: string, portIdx: number): boolean {
    if (earthSourcePorts.length === 0) return false;
    const visited = new Set<string>();
    const queue = [{ compId, portIdx }];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const key = `${curr.compId}:${curr.portIdx}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (
        earthSourcePorts.some((esp) => esp.compId === curr.compId && esp.portIdx === curr.portIdx)
      ) {
        return true;
      }

      const neighbors = getConnectedPorts(curr.compId, curr.portIdx);
      for (const n of neighbors) {
        const targetComp = components.find((c) => c.id === n.compId);
        const targetDef = targetComp ? COMPONENT_DEFS[targetComp.type] : null;

        queue.push(n);

        if (
          targetDef &&
          (targetDef.isJunction ||
            targetDef.category === 'junction' ||
            targetComp?.type === 'distribution-board')
        ) {
          targetDef.ports.forEach((p, idx) => {
            if (p.type === 'earth' && idx !== n.portIdx) {
              queue.push({ compId: n.compId, portIdx: idx });
            }
          });
        }
      }
    }
    return false;
  }

  // 4. GROUNDING / MISSING EARTH CHECKS
  const requireEarthTypes = new Set([
    'socket-2pin',
    'socket-3pin',
    'double-socket',
    'socket-usb',
    'socket-gfci',
    'socket-industrial',
    'water-heater',
    'space-heater',
    'air-conditioner',
    'induction-hob',
    'ev-charger',
    'cooker-unit',
    'industrial-exhaust-fan',
    'distribution-board',
  ]);

  const ungroundedComps: ComponentInstance[] = [];
  for (const c of components) {
    const def = COMPONENT_DEFS[c.type];
    if (!def) continue;

    const earthPortIndices = def.ports
      .map((p, idx) => (p.type === 'earth' ? idx : -1))
      .filter((idx) => idx !== -1);

    if (earthPortIndices.length === 0) continue;

    for (const portIdx of earthPortIndices) {
      const wiresOnEarthPort = portToWiresMap.get(`${c.id}:${portIdx}`) || [];
      if (wiresOnEarthPort.length === 0 || !reachesEarthSupply(c.id, portIdx)) {
        ungroundedComps.push(c);
        break;
      }
    }
  }

  if (ungroundedComps.length > 0) {
    const names = Array.from(
      new Set(ungroundedComps.map((c) => COMPONENT_DEFS[c.type]?.label || c.type)),
    ).join(', ');

    issues.push({
      id: 'missing_earth_group',
      severity: ungroundedComps.some((c) => requireEarthTypes.has(c.type)) ? 'error' : 'warning',
      title: `Missing Earth Bonding (${ungroundedComps.length} Item${ungroundedComps.length > 1 ? 's' : ''})`,
      description: `Class I equipment / socket outlets (${names}) are missing active Earth protective conductor bonding.`,
      recommendation:
        'Connect a protective CPC/Earth conductor from all socket & metalwork earth terminals to the Earth supply rail.',
      category: 'grounding',
      componentId: ungroundedComps[0].id,
      quickFix: {
        label: 'Auto-Connect Earth Wire',
        type: 'add_earth_wire',
        componentId: ungroundedComps[0].id,
      },
      detailedBreakdown: {
        bs7671Regulation: 'BS 7671 Regulation 411.3.1.1 (Protective Earthing & CPC Bonding)',
        physicsExplanation:
          'If an insulation breakdown occurs inside a Class I appliance or socket enclosure, exposed metalwork will energize to 230V. Without low-impedance Earth bonding (CPC), fault current cannot flow to ground to trigger overcurrent protection (MCB/RCD), exposing users to fatal electric shock.',
        steps: [
          {
            stepNumber: 1,
            title: 'Earth Continuity Verification',
            description: `Traced green/yellow protective conductors from Earth terminal on ${names}.`,
          },
          {
            stepNumber: 2,
            title: 'Supply Path Tracing',
            description:
              'No continuous low-impedance Earth path leading back to the Main Earth Terminal (MET) was found.',
          },
          {
            stepNumber: 3,
            title: 'Risk Evaluation',
            description: 'Violation of shock protection requirements under BS 7671 Part 4.',
          },
        ],
        practicalTip:
          'Always run a dedicated green/yellow CPC protective conductor alongside Live and Neutral in radial and ring final circuits.',
      },
    });
  } else {
    passedChecks.push({
      id: 'pass_grounding',
      title: 'Earth Bonding Compliance',
      description: 'All Class I appliances and socket outlets are properly bonded to Earth.',
    });
  }

  // 4.5. VOLTAGE MISMATCH DETECTION
  const voltageGroups = new Map<number, ComponentInstance[]>();
  for (const c of components) {
    const def = COMPONENT_DEFS[c.type];
    if (!def) continue;

    // Get component voltage (from custom or default)
    const voltage = c.state.customVoltage ?? def.maxVolts ?? 0;
    if (voltage > 0) {
      if (!voltageGroups.has(voltage)) {
        voltageGroups.set(voltage, []);
      }
      voltageGroups.get(voltage)!.push(c);
    }
  }

  // Check for dangerous voltage mismatches (e.g., 110V and 230V in same circuit)
  if (voltageGroups.size > 1) {
    const voltages = Array.from(voltageGroups.keys());
    const lowVoltage = Math.min(...voltages);
    const highVoltage = Math.max(...voltages);

    // Flag if there's a significant difference (> 50V)
    if (highVoltage - lowVoltage > 50) {
      const lowVoltComps = voltageGroups.get(lowVoltage) || [];
      const highVoltComps = voltageGroups.get(highVoltage) || [];

      const lowVoltNames = Array.from(
        new Set(lowVoltComps.map((c) => COMPONENT_DEFS[c.type]?.label || c.type)),
      )
        .slice(0, 3)
        .join(', ');
      const highVoltNames = Array.from(
        new Set(highVoltComps.map((c) => COMPONENT_DEFS[c.type]?.label || c.type)),
      )
        .slice(0, 3)
        .join(', ');

      issues.push({
        id: 'voltage_mismatch',
        severity: 'error',
        title: `Voltage Mismatch Detected (${lowVoltage}V and ${highVoltage}V)`,
        description: `Components with different voltage ratings are connected in the same circuit. Low voltage: ${lowVoltNames}. High voltage: ${highVoltNames}.`,
        recommendation: `Ensure all components are rated for the same supply voltage. A ${highVoltage}V supply will damage ${lowVoltage}V components.`,
        category: 'configuration',
        componentId: lowVoltComps[0].id,
        detailedBreakdown: {
          bs7671Regulation: 'BS 7671 Regulation 512.1.3 (Compatibility of Characteristics)',
          physicsExplanation: `Applying ${highVoltage}V to a component rated for ${lowVoltage}V will cause excessive current flow (I = V/R), leading to overheating, insulation breakdown, and potential fire hazard.`,
          steps: [
            {
              stepNumber: 1,
              title: 'Voltage Rating Analysis',
              description: `Detected ${lowVoltComps.length} component(s) rated at ${lowVoltage}V and ${highVoltComps.length} component(s) rated at ${highVoltage}V.`,
            },
            {
              stepNumber: 2,
              title: 'Risk Assessment',
              description: `${lowVoltage}V components will experience ${((highVoltage / lowVoltage) * 100).toFixed(0)}% overvoltage, causing immediate or rapid failure.`,
            },
            {
              stepNumber: 3,
              title: 'Corrective Action',
              description:
                'Replace incompatible components or use separate circuits with appropriate transformers.',
            },
          ],
          practicalTip:
            'Always verify voltage ratings match the supply before connecting components in parallel or series.',
        },
      });
    }
  }

  // 5. PROTECTION DEVICE & CABLE AMPACITY CHECKS
  // Overcurrent devices only: the In ≤ Iz check below compares a *breaker*
  // rating against cable ampacity, which is meaningless for a plain RCD (no
  // overcurrent element), an SPD, or a main switch.
  const protectionComps = components.filter((c) => isOvercurrentDevice(c.type));

  const overratedBreakers: {
    comp: ComponentInstance;
    ratingAmps: number;
    cableMm2: number;
    ampacity: number;
    /** True when the circuit named no conductor and the default was assumed. */
    assumed: boolean;
  }[] = [];
  let cableCapacityUnassessed = false;
  let checkedCableRatings = 0;
  let assumedCableSizes = false;

  for (const c of protectionComps) {
    const def = COMPONENT_DEFS[c.type];
    if (!def) continue;

    const ratingAmps = c.state.customMaxAmps ?? def.maxAmps;
    if (ratingAmps === undefined || !Number.isFinite(ratingAmps) || ratingAmps <= 0) {
      cableCapacityUnassessed = true;
      continue;
    }
    if (!compWiresMap.get(c.id)?.size) cableCapacityUnassessed = true;

    // Worst (smallest) conductor this device sits on: In ≤ Iz has to hold for
    // every conductor it protects, so the verdict must not depend on which wire
    // happens to come first.
    //
    // Two things used to decide it arbitrarily. `w.lengthMeters ? 1.5 : …`
    // treated a measured run length as evidence the cable is 1.5 mm², and the
    // loop stopped at the first attached wire — usually the supply-side wire
    // into a bare Live terminal, which declares nothing. That is where
    // "Over-rated Breaker (32A MCB vs 1.5mm² Cable)" came from on circuits no
    // one had ever given a cable size, and no Inspector edit could clear it.
    //
    // Declared conductors outrank assumed ones. The supply-side wire into a
    // bare Live terminal never declares a size, so letting it compete would
    // drag every declared load conductor down to the default — which is the
    // same failure mode in a quieter outfit.
    let worstDeclared: { cableMm2: number; ampacity: number } | null = null;
    let worstAssumed: { cableMm2: number; ampacity: number } | null = null;

    for (const w of compWiresMap.get(c.id) || []) {
      const { mm2, declared } = resolveConductorMm2(w, componentsById);
      const properties = resolveWireProperties(w, componentsById);
      const ampacity = assessWireCapacity(properties).deratedAmps;
      if (ampacity === null) {
        cableCapacityUnassessed = true;
        continue;
      }
      checkedCableRatings++;
      if (!declared) assumedCableSizes = true;
      if (declared) {
        if (!worstDeclared || ampacity < worstDeclared.ampacity) {
          worstDeclared = { cableMm2: mm2, ampacity };
        }
      } else if (!worstAssumed || ampacity < worstAssumed.ampacity) {
        worstAssumed = { cableMm2: mm2, ampacity };
      }
    }

    const worst = worstDeclared ?? worstAssumed;

    if (worst && ratingAmps > worst.ampacity) {
      overratedBreakers.push({
        comp: c,
        ratingAmps,
        cableMm2: worst.cableMm2,
        ampacity: worst.ampacity,
        assumed: worstDeclared === null,
      });
    }
  }

  if (overratedBreakers.length > 0) {
    const b = overratedBreakers[0];
    const defLabel = COMPONENT_DEFS[b.comp.type]?.label || 'Breaker';
    // A named conductor that is too small is a definite violation. An assumed
    // one is a heads-up: the circuit never said what it was wired in, so the
    // check states its assumption instead of asserting a fault that the user
    // cannot find anywhere in the Inspector.
    const sizing = b.assumed
      ? `No cable size is declared on this run, so ${b.cableMm2}mm² (${b.ampacity}A) was assumed.`
      : `The declared ${b.cableMm2}mm² conductor has an estimated capacity of ${b.ampacity}A under the configured installation assumptions.`;
    issues.push({
      id: 'mcb_overrated_group',
      severity: b.assumed ? 'warning' : 'error',
      title: b.assumed
        ? `Protection May Be Over-rated (${b.ratingAmps}A device, cable size not declared)`
        : `Over-rated Breaker (${b.ratingAmps}A MCB vs ${b.cableMm2}mm² Cable)`,
      description: `Protection device ${defLabel} rating (${b.ratingAmps}A) exceeds the connected conductor ampacity (${b.ampacity}A). ${sizing} BS 7671 requires In ≤ Iz to prevent fire before tripping.`,
      recommendation:
        'Review the modeled wire size, installation, material and derating alongside load current Ib and device rating In. No automatic size or device substitution is assessed.',
      category: 'protection',
      componentId: b.comp.id,
      detailedBreakdown: {
        bs7671Regulation: 'BS 7671 Regulation 433.1 (Overcurrent Coordination In ≤ Iz)',
        physicsExplanation:
          'In above estimated Iz indicates a possible conductor overload risk. Cable operating temperature, protective clearing and damage depend on separate thermal and time-current models; this comparison does not predict melting or a trip.',
        steps: [
          {
            stepNumber: 1,
            title: 'Device Rating Inspection',
            description: `Evaluated protective device nominal rating: In = ${b.ratingAmps}A.`,
          },
          {
            stepNumber: 2,
            title: 'Cable Capacity Calculation',
            description: `Estimated connected-conductor capacity: Iz = ${b.ampacity}A (${b.cableMm2}mm² with its resolved material, installation method and derating).`,
          },
          {
            stepNumber: 3,
            title: 'Safety Rule Evaluation',
            description: `Violation detected: In (${b.ratingAmps}A) > Iz (${b.ampacity}A). Risk of cable overheating.`,
          },
        ],
        practicalTip:
          'Compare actual load current Ib, device rating In and derated cable capacity Iz separately; installation and protection coverage remain essential.',
      },
    });
  } else if (checkedCableRatings > 0 && !cableCapacityUnassessed && !assumedCableSizes) {
    passedChecks.push({
      id: 'pass_protection',
      title: 'Connected Cable Rating Estimate',
      description:
        'Declared In does not exceed estimated Iz on the checked adjacent conductors. Installation assumptions, downstream coverage and protective clearing still require assessment.',
    });
  }
  if (cableCapacityUnassessed) {
    issues.push({
      id: 'cable_capacity_unassessed',
      severity: 'warning',
      title: 'Cable Capacity Comparison Unassessed',
      description:
        'A connected conductor has no supported capacity table, a device current rating is unknown, or a protective device has no connected conductors. No capacity or coordination pass is available for that path.',
      recommendation:
        'Declare supported conductor and device data; AWG/nonstandard areas are not rounded up to a larger table size.',
      category: 'cable_sizing',
    });
  }

  // 6. CATALOGUE WIRE-SIZE ADVICE
  // Compare the actual modeled runs, not an independently unmodeled appliance
  // flex. Explicit wire/AWG sizes outrank endpoint settings in every consumer.
  const undersizedRuns = new Map<
    string,
    { componentId: string; mm2: number; recommendedMm2: number }
  >();
  let declaredRuns = 0;
  let assumedRuns = 0;
  for (const c of components) {
    const def = COMPONENT_DEFS[c.type];
    const recommendedMm2 = def?.recommendedCableMm2;
    if (!recommendedMm2) continue;
    for (const wire of compWiresMap.get(c.id) ?? []) {
      const port = wire.fromComponentId === c.id ? wire.fromPortIndex : wire.toPortIndex;
      if (def.ports[port]?.type === 'earth') continue;
      const properties = resolveWireProperties(wire, componentsById);
      if (properties.provenance.cableMm2 === 'default') {
        assumedRuns++;
        continue;
      }
      declaredRuns++;
      if (
        properties.cableMm2 < recommendedMm2 &&
        recommendedMm2 > (undersizedRuns.get(wire.id)?.recommendedMm2 ?? 0)
      ) {
        undersizedRuns.set(wire.id, {
          componentId: c.id,
          mm2: properties.cableMm2,
          recommendedMm2,
        });
      }
    }
  }

  if (undersizedRuns.size > 0) {
    const [wireId, first] = undersizedRuns.entries().next().value!;
    issues.push({
      id: 'undersized_cable_group',
      severity: 'warning',
      title: `Wire Size Below Catalogue Recommendation (${undersizedRuns.size} Runs)`,
      description: `Wire ${wireId} resolves to ${first.mm2} mm², below the connected equipment's ${first.recommendedMm2} mm² recommendation. This comparison does not establish cable capacity or safety.`,
      recommendation:
        'Review the wire cross-section, actual branch current and installation conditions. Component-tail advice is not a separately modeled appliance flex.',
      category: 'cable_sizing',
      componentId: first.componentId,
      wireId,
    });
  } else if (declaredRuns > 0 && assumedRuns === 0) {
    passedChecks.push({
      id: 'pass_cable_sizing',
      title: 'Declared Wire Sizes Meet Catalogue Recommendations',
      description:
        'The resolved wire sizes meet component recommendations. Actual capacity, installation suitability and protection coordination require separate assessment.',
    });
  }

  // 7. SWITCHED NEUTRAL HAZARD
  const singlePoleSwitches = components.filter((c) => {
    const def = COMPONENT_DEFS[c.type];
    return (
      def?.isSwitch &&
      (c.type === 'single-way-switch' || c.type === 'two-way-switch' || c.type === 'dimmer-switch')
    );
  });

  const switchedNeutralList: ComponentInstance[] = [];
  for (const sw of singlePoleSwitches) {
    const port0Wires = portToWiresMap.get(`${sw.id}:0`) || [];
    const port1Wires = portToWiresMap.get(`${sw.id}:1`) || [];

    if (port0Wires.length > 0 && port1Wires.length > 0) {
      const isNeutral0 = port0Wires.some((w) => {
        const otherId = w.fromComponentId === sw.id ? w.toComponentId : w.fromComponentId;
        return otherId.includes('neutral');
      });
      const isNeutral1 = port1Wires.some((w) => {
        const otherId = w.fromComponentId === sw.id ? w.toComponentId : w.fromComponentId;
        return otherId.includes('neutral');
      });
      if (isNeutral0 && isNeutral1) {
        switchedNeutralList.push(sw);
      }
    }
  }

  if (switchedNeutralList.length > 0) {
    const names = switchedNeutralList
      .map((sw) => COMPONENT_DEFS[sw.type]?.label || sw.type)
      .join(', ');
    issues.push({
      id: 'switched_neutral_hazard_group',
      severity: 'error',
      title: 'Switched Neutral Hazard',
      description: `Switch (${names}) is inserted into Neutral instead of Live. Connected loads remain live at 230V even when switched OFF.`,
      recommendation: 'Rewire switch into the Live conductor rail per BS 7671 safety standards.',
      category: 'polarity',
      componentId: switchedNeutralList[0].id,
      quickFix: {
        label: 'Rewire Switch to Live Conductor',
        type: 'rewire_switch_live',
        componentId: switchedNeutralList[0].id,
      },
      detailedBreakdown: {
        bs7671Regulation: 'BS 7671 Regulation 132.15 (Single-Pole Switching in Line Conductor)',
        physicsExplanation:
          'When a single-pole switch is placed in the Neutral line, opening the switch stops current flow by breaking the neutral return. However, the appliance and lamp socket terminals remain at full 230V potential relative to Earth. An unsuspecting user replacing a bulb or touching terminals will suffer severe electric shock.',
        steps: [
          {
            stepNumber: 1,
            title: 'Polarity Trace',
            description: `Traced conductors connected to single-pole switch ${names}.`,
          },
          {
            stepNumber: 2,
            title: 'Hazard Identification',
            description:
              'Switch breaks Neutral (N) return path while Live (L) potential remains uninterrupted.',
          },
          {
            stepNumber: 3,
            title: 'Safety Correction',
            description: 'Insert switch into Live line conductor only.',
          },
        ],
        practicalTip: 'Never switch Neutral alone in single-phase installations.',
      },
    });
  } else if (singlePoleSwitches.length > 0) {
    passedChecks.push({
      id: 'pass_polarity',
      title: 'Live Switching Compliance',
      description: 'Single-pole switches properly control the Live conductor.',
    });
  }

  // 8. RCD ADVISORY FOR SOCKETS
  const socketsAndWetComps = components.filter((c) => {
    const def = COMPONENT_DEFS[c.type];
    return def?.isSocket || c.type === 'water-heater' || c.type === 'ev-charger';
  });

  if (socketsAndWetComps.length > 0) {
    // Substring matching missed the AFDD entirely — it is an RCBO with arc
    // detection, so a correctly-protected circuit was told it had no RCD.
    const hasRCD = components.some((c) => isResidualDevice(c.type));
    if (!hasRCD) {
      issues.push({
        id: 'missing_rcd_sockets',
        severity: 'info',
        title: 'Residual Protection Recommendation',
        description:
          'Review additional residual-current protection for socket outlets and wet-room loads under the applicable rules.',
        recommendation: 'Add an RCD or RCBO breaker module for enhanced shock protection.',
        category: 'protection',
        quickFix:
          standard === 'us'
            ? undefined
            : {
                label: 'Add teaching RCD module',
                type: 'add_rcd',
              },
        detailedBreakdown: {
          bs7671Regulation:
            standard === 'us'
              ? 'Check the locally adopted NEC GFCI requirements'
              : 'UK teaching reference: BS 7671 Regulation 411.3.3 (additional protection)',
          physicsExplanation:
            'Residual devices detect current imbalance. Operating time depends on residual current, waveform and device type; they do not guarantee prevention of injury.',
          steps: [
            {
              stepNumber: 1,
              title: 'Equipment Scan',
              description: 'Identified general-use socket outlets or wet location loads.',
            },
            {
              stepNumber: 2,
              title: 'Residual Device Check',
              description: 'No residual-current device was detected on the canvas.',
            },
            {
              stepNumber: 3,
              title: 'Enhancement Recommendation',
              description: 'Insert an RCD or RCBO device before socket branch circuits.',
            },
          ],
          practicalTip:
            'Required locations, residual current rating, waveform type and operating time depend on the applicable rules and equipment.',
        },
      });
    } else {
      passedChecks.push({
        id: 'pass_rcd',
        title: 'Residual Device Present',
        description:
          'A residual device is present. Placement, sensitivity, timing and coverage still require assessment.',
      });
    }
  }

  // 8.5 STANDARD-AWARE COMPLIANCE (UK / US / EU)
  // Voltage drop, RCD/GFCI on sockets, motor MCB curve. These are merged
  // into the same report so the existing UI surfaces them.
  const nominalVoltage = circuit.globalVoltage ?? getStandard(standard).nominalVoltage;
  const compliance = runComplianceChecks(circuit, standard, nominalVoltage);
  for (const c of compliance.issues) {
    issues.push({ ...c, blocking: c.blocking });
  }
  issues.push({
    id: 'standards_coverage',
    severity: 'info',
    category: 'protection',
    title: `${getStandard(standard).shortLabel} teaching checks — ${compliance.status === 'not-assessed' ? 'not assessed' : 'limited coverage'}`,
    description: compliance.coverageNotes.join(' '),
    recommendation:
      'Use the selected profile as a teaching aid; verify applicable installation rules separately.',
  });

  // 9. SIMULATION ACTIVE FAULT
  if (
    !simResult?.electrical &&
    simResult?.errors &&
    simResult.errors.length > 0 &&
    !simResult.modelLimitations?.some((l) => l.blocking)
  ) {
    issues.push({
      id: 'sim_active_fault',
      severity: 'error',
      title: 'Active Short Circuit / Overcurrent Fault',
      description: simResult.errors[0],
      recommendation: 'Check wire routing to clear direct Live-to-Neutral short circuit condition.',
      category: 'short_circuit',
      detailedBreakdown: {
        bs7671Regulation: 'BS 7671 Section 434 (Protection Against Fault Currents)',
        physicsExplanation:
          'A direct zero-impedance connection between Live and Neutral creates prospective fault currents (PFC) exceeding thousands of amperes, generating severe arcing and thermal explosion hazards.',
        steps: [
          {
            stepNumber: 1,
            title: 'Simulation Matrix Check',
            description: 'Detected singular or ill-conditioned electrical nodal matrix.',
          },
          {
            stepNumber: 2,
            title: 'Fault Isolation',
            description: `Active fault error: ${simResult.errors[0]}`,
          },
          {
            stepNumber: 3,
            title: 'Resolution',
            description: 'Inspect wire connections to eliminate direct short circuit paths.',
          },
        ],
        practicalTip:
          'Always verify load impedance sits between Live and Neutral before energizing.',
      },
    });
  }

  // 10. PARTIALLY-WIRED DEVICES & CONDUCTOR BYPASS
  // Two real-world wiring defects the earlier checks cannot see because the
  // circuit still forms a complete loop:
  //   (a) a component sits on the canvas with no wires at all;
  //   (b) a pass-through / protection device (FCU, RCD, RCBO, DP switch…)
  //       carries one conductor while its other conductor pair is left
  //       completely unwired — e.g. Live routed through an FCU while the
  //       load's Neutral returns straight to the supply, bypassing the
  //       device. The simulation legitimately runs (the loop is closed),
  //       so validation must be the layer that flags it.
  const unwiredComponents: ComponentInstance[] = [];
  let bypassIssueCount = 0;
  let inUseRoutedDevices = 0;

  for (const c of components) {
    const def = COMPONENT_DEFS[c.type];
    if (!def) continue;

    const attached = compWiresMap.get(c.id);
    if (!attached || attached.size === 0) {
      unwiredComponents.push(c);
      continue;
    }

    // Conductor-bypass check only where in/out routing is the device's job.
    if (!def.isPassThrough && !def.isProtection) continue;

    let deviceFlagged = false;
    for (const conductor of ['live', 'neutral'] as const) {
      const portIndexes = def.ports
        .map((p, idx) => ({ p, idx }))
        .filter(({ p }) => p.type === conductor);
      // Needs an in/out pair for "routing through" to be meaningful.
      if (portIndexes.length < 2) continue;

      const anyWired = portIndexes.some(
        ({ idx }) => (portToWiresMap.get(`${c.id}:${idx}`) || []).length > 0,
      );
      if (anyWired) continue;

      // The device is wired on another conductor but this conductor pair is
      // fully bypassed.
      deviceFlagged = true;
      bypassIssueCount++;
      const isResidual = c.type === 'rcd' || c.type === 'rcbo';
      const conductorLabel = conductor === 'live' ? 'Live' : 'Neutral';
      const portNames = portIndexes.map(({ p }) => p.label).join(' / ');

      issues.push({
        id: `device_conductor_bypass_${c.id}_${conductor}`,
        severity: 'warning',
        title: `${conductorLabel} Bypasses ${def.label}`,
        description: isResidual
          ? `${def.label} carries only one conductor: its ${conductorLabel} terminals (${portNames}) are unwired. A residual device compares Live and Neutral current — with the ${conductorLabel} routed around it, a real ${def.label} would sense a permanent imbalance and trip the moment the circuit is energised.`
          : `${def.label} carries only one conductor: its ${conductorLabel} terminals (${portNames}) are unwired, so the ${conductorLabel} path bypasses the device. The circuit still works electrically, but the device cannot fully isolate or protect the load it feeds.`,
        recommendation: `Route the load's ${conductorLabel} through the device: wire into ${portNames} instead of connecting the load's ${conductorLabel} directly to the supply.`,
        componentId: c.id,
        category: 'configuration',
        detailedBreakdown: {
          bs7671Regulation: isResidual
            ? 'BS 7671 Regulation 531.3.2 (all live conductors routed through the RCD)'
            : 'BS 7671 Regulation 132.14 / 537.2 (isolation and switching arrangements)',
          physicsExplanation: isResidual
            ? 'Residual devices sum the currents in Line and Neutral through a toroidal transformer. A conductor routed outside the toroid registers as leakage: IΔ equals the full load current, far above the 30 mA threshold.'
            : 'Current follows every closed path presented to it. A conductor wired around a protective or switching device keeps the loop closed, so the device only interrupts the conductors that actually pass through it.',
          steps: [
            {
              stepNumber: 1,
              title: 'Port Connectivity Scan',
              description: `${def.label}: ${conductorLabel} terminals (${portNames}) have zero attached conductors while other terminals are wired.`,
            },
            {
              stepNumber: 2,
              title: 'Loop Analysis',
              description: `The circuit closes through a ${conductorLabel} path that does not traverse the device.`,
            },
            {
              stepNumber: 3,
              title: 'Remediation',
              description: `Break the direct ${conductorLabel} connection and re-route it through ${portNames}.`,
            },
          ],
          practicalTip: isResidual
            ? 'On a real installation this is found instantly: the RCD/RCBO trips on first energisation because the return current never passes back through its sensing coil.'
            : 'Double-pole devices (FCUs, DP switches) only provide full isolation when both Live and Neutral are routed through their terminals.',
        },
      });
    }
    if (!deviceFlagged) inUseRoutedDevices++;
  }

  if (unwiredComponents.length > 0) {
    const names = unwiredComponents
      .slice(0, 4)
      .map((c) => COMPONENT_DEFS[c.type]?.label ?? c.type)
      .join(', ');
    const extra = unwiredComponents.length > 4 ? ` and ${unwiredComponents.length - 4} more` : '';
    issues.push({
      id: 'components_unwired',
      severity: 'warning',
      title: `${unwiredComponents.length} Component${unwiredComponents.length === 1 ? ' Is' : 's Are'} Not Wired`,
      description: `${names}${extra} ${unwiredComponents.length === 1 ? 'is' : 'are'} placed on the canvas but not connected to anything, so ${unwiredComponents.length === 1 ? 'it plays' : 'they play'} no part in the circuit.`,
      recommendation:
        'Wire the component into the circuit, or delete it to keep the diagram honest.',
      componentId: unwiredComponents[0].id,
      category: 'continuity',
      detailedBreakdown: {
        bs7671Regulation: 'BS 7671 Regulation 132.14 (Electrical Connections)',
        physicsExplanation:
          'A component with no conductive path to the rest of the circuit carries no current and provides no function or protection.',
        steps: [
          {
            stepNumber: 1,
            title: 'Connectivity Scan',
            description: `${unwiredComponents.length} component(s) found with zero attached wires.`,
          },
          {
            stepNumber: 2,
            title: 'Impact Assessment',
            description: 'Disconnected components cannot conduct, switch, or protect.',
          },
          {
            stepNumber: 3,
            title: 'Remediation',
            description: 'Connect matching ports (L→L, N→N, E→E) or remove the component.',
          },
        ],
        practicalTip:
          'On real jobs, abandoned accessories left in an installation must be disconnected AND removed or blanked off — a diagram should hold itself to the same standard.',
      },
    });
  }

  if (bypassIssueCount === 0 && inUseRoutedDevices > 0) {
    passedChecks.push({
      id: 'conductor_routing_ok',
      title: 'Conductor Routing Through Devices',
      description: `${inUseRoutedDevices} pass-through / protection device(s) carry every conductor pair they are designed to route — no Live or Neutral bypasses detected.`,
    });
  }

  // CALCULATE SCORE & SUMMARY
  const errorsCount = issues.filter((i) => i.severity === 'error').length;
  const warningsCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;
  // Issues flagged `blocking` prevent the simulation from starting until
  // they are resolved. Error-level compliance violations block by design.
  const blockingCount = issues.filter((i) => i.blocking && i.severity === 'error').length;

  let score = 100 - errorsCount * 30 - warningsCount * 15;
  if (score < 0) score = 0;

  const status: 'pass' | 'warning' | 'fail' =
    errorsCount > 0 ? 'fail' : warningsCount > 0 ? 'warning' : 'pass';

  return {
    timestamp: Date.now(),
    score,
    status,
    summary: {
      errorsCount,
      warningsCount,
      infoCount,
      passedCount: passedChecks.length,
    },
    issues,
    passedChecks,
    blockingErrorsCount: blockingCount,
    standard,
  };
}
