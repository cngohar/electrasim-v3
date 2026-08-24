/**
 * compliance.ts — standard-aware validation rules.
 *
 * Builds on the generic `circuitValidation.ts` checks with rules keyed to
 * the active regulation template (UK BS 7671 / US NEC / EU IEC 60364):
 *
 *   - per-load voltage-drop ceiling (3% lighting, 5% power)
 *   - unswitched socket on a non-RCD/GFCI branch
 *   - wrong MCB trip curve for motor / high-inrush loads
 *
 * The module is pure so it can be imported from both the main-thread
 * validation runner and the simulator worker.
 */

import type { ValidationIssue } from './circuitValidationTypes';
import { COMPONENT_DEFS } from './components';
import { getMillivoltAmpMeter } from './electricalCalculations';
import {
  type StandardId,
  getStandard,
  isLightingLoad,
  recommendCurveForLoad,
  voltageDropCeiling,
} from './standards';
import type { Circuit, ComponentInstance, WireInstance } from './types';

interface ComplianceIssue extends ValidationIssue {
  /** Marks the issue as blocking — simulation must not start while open. */
  blocking: boolean;
}

export interface ComplianceReport {
  standard: StandardId;
  issues: ComplianceIssue[];
  errorCount: number;
  warningCount: number;
}

/**
 * Walk every energised branch and compute its actual voltage drop using
 * the same BS 7671 Appendix 4 mV/A/m method used by the simulator. The
 * largest drop seen on the path to a load is compared to the standard's
 * ceiling for that load type.
 */
function checkVoltageDrop(
  circuit: Circuit,
  standardId: StandardId,
  nominalVoltage: number,
): ComplianceIssue[] {
  const { components, wires } = circuit;
  const issues: ComplianceIssue[] = [];
  const byId = new Map(components.map((c) => [c.id, c]));
  const adjacency = new Map<string, WireInstance[]>();
  for (const w of wires) {
    if (!adjacency.has(w.fromComponentId)) adjacency.set(w.fromComponentId, []);
    if (!adjacency.has(w.toComponentId)) adjacency.set(w.toComponentId, []);
    adjacency.get(w.fromComponentId)!.push(w);
    adjacency.get(w.toComponentId)!.push(w);
  }

  for (const comp of components) {
    const def = COMPONENT_DEFS[comp.type];
    if (!def) continue;
    // Only evaluate loads (consumers of power, not sources/protections/junctions).
    if (def.isSource || def.isProtection || def.isJunction || def.isSwitch) continue;
    const power = comp.state.customPowerWatts ?? def.powerWatts ?? 0;
    if (power <= 0) continue;
    const voltage = comp.state.customVoltage ?? def.maxVolts ?? nominalVoltage;
    if (voltage <= 0) continue;
    const current = power / voltage;

    // Naive BFS to the nearest source, summing resistive drop along the path.
    // We don't need a full nodal solve — a conservative radial estimate is
    // sufficient to flag the long/under-gauged runs the user should fix.
    const queue: { id: string; drop: number; visited: Set<string> }[] = [];
    for (const w of adjacency.get(comp.id) ?? []) {
      queue.push({
        id: w.fromComponentId === comp.id ? w.toComponentId : w.fromComponentId,
        drop: wireDrop(w, current),
        visited: new Set([comp.id, w.id]),
      });
    }
    let worstDrop = 0;
    while (queue.length > 0) {
      const node = queue.shift()!;
      const c = byId.get(node.id);
      if (!c) continue;
      if (COMPONENT_DEFS[c.type]?.isSource) {
        if (node.drop > worstDrop) worstDrop = node.drop;
        continue;
      }
      for (const w of adjacency.get(c.id) ?? []) {
        if (node.visited.has(w.id)) continue;
        const next = w.fromComponentId === c.id ? w.toComponentId : w.fromComponentId;
        if (node.visited.has(next)) continue;
        const visited = new Set(node.visited);
        visited.add(w.id);
        visited.add(next);
        queue.push({ id: next, drop: node.drop + wireDrop(w, current), visited });
      }
    }

    if (worstDrop <= 0) continue;
    const percent = (worstDrop / voltage) * 100;
    const ceiling = voltageDropCeiling(comp.type, getStandard(standardId));
    if (percent > ceiling) {
      issues.push({
        id: `vdrop_${comp.id}`,
        severity: 'error',
        title: `Excessive voltage drop to ${def.label} (${percent.toFixed(1)}%)`,
        description: `Voltage drop to ${def.label} reaches ${percent.toFixed(1)}%, above the ${ceiling}% ${isLightingLoad(comp.type) ? 'lighting' : 'power'} circuit limit in ${getStandard(standardId).citation}. The load may under-perform or overheat.`,
        recommendation: 'Shorten the cable run or increase conductor cross-section (mm²).',
        componentId: comp.id,
        category: 'cable_sizing',
        blocking: true,
        detailedBreakdown: {
          bs7671Regulation:
            standardId === 'us'
              ? 'NEC 210.19(A) FPN No. 4 (3 % branch, 5 % total)'
              : standardId === 'eu'
                ? 'IEC 60364-5-52 §525 (3 % lighting / 5 % power)'
                : 'BS 7671 Appendix 4 §525 (3 % lighting / 5 % power)',
          physicsExplanation: `At ${current.toFixed(2)} A the cumulative conductor resistance drops ${worstDrop.toFixed(1)} V. Lengthening or thinning the wire raises R = ρL/A and therefore ΔU = I·R.`,
          steps: [
            {
              stepNumber: 1,
              title: 'Load Current',
              description: `Ib = P / V = ${power} W / ${voltage} V = ${current.toFixed(2)} A.`,
            },
            {
              stepNumber: 2,
              title: 'Path Voltage Drop',
              description: `Σ mV/A/m × L × Ib = ${worstDrop.toFixed(2)} V (${percent.toFixed(1)}%).`,
            },
            {
              stepNumber: 3,
              title: 'Corrective Action',
              description: `Increase cable mm² or shorten run so ΔU ≤ ${ceiling}% (${((voltage * ceiling) / 100).toFixed(1)} V).`,
            },
          ],
          practicalTip:
            'Use 4 mm² or 6 mm² for long cooker / shower radials; ring final circuits tolerate more length than radials.',
        },
      });
    }
  }
  return issues;
}

/** Voltage drop (V) across a single wire at the given current. */
function wireDrop(wire: WireInstance, currentAmps: number): number {
  const length = wire.lengthMeters ?? 10;
  const mm2 = wire.customCableMm2 ?? 2.5;
  const material = wire.material ?? 'copper';
  const mVApm = getMillivoltAmpMeter(mm2, material);
  return (mVApm * length * currentAmps) / 1000;
}

/**
 * Socket outlets require RCD/GFCI additional protection under every
 * supported standard (BS 7671 411.3.3 / NEC 210.8). A socket that is
 * neither downstream of an RCD/RCBO/GFCI nor one itself is flagged.
 */
function checkUnswitchedSocketRcd(circuit: Circuit, standardId: StandardId): ComplianceIssue[] {
  const { components, wires } = circuit;
  const issues: ComplianceIssue[] = [];
  const byId = new Map(components.map((c) => [c.id, c]));

  const rcdTypes = new Set(['rcd', 'rcbo', 'socket-gfci', 'afdd']);
  const isRcd = (c: ComponentInstance | undefined) =>
    Boolean(c && (rcdTypes.has(c.type) || c.type.includes('rcd') || c.type.includes('gfci')));

  for (const comp of components) {
    const def = COMPONENT_DEFS[comp.type];
    if (!def?.isSocket) continue;
    if (isRcd(comp)) continue; // GFCI receptacle covers itself

    // BFS upstream through wires looking for an RCD/RCBO between socket and source.
    const visited = new Set<string>([comp.id]);
    const queue: string[] = [comp.id];
    let protectedByRcd = false;
    while (queue.length > 0) {
      const currId = queue.shift()!;
      for (const w of wires) {
        const neighbourId =
          w.fromComponentId === currId
            ? w.toComponentId
            : w.toComponentId === currId
              ? w.fromComponentId
              : null;
        if (!neighbourId || visited.has(neighbourId)) continue;
        visited.add(neighbourId);
        const n = byId.get(neighbourId);
        if (!n) continue;
        if (isRcd(n)) {
          protectedByRcd = true;
          queue.length = 0;
          break;
        }
        queue.push(neighbourId);
      }
    }

    if (!protectedByRcd) {
      const std = getStandard(standardId);
      issues.push({
        id: `socket_rcd_${comp.id}`,
        severity: 'error',
        title: `Socket ${def.label} missing ${standardId === 'us' ? 'GFCI' : 'RCD'} protection`,
        description: `Socket outlets require ${standardId === 'us' ? 'Class A GFCI (≤6 mA)' : `≤${std.rcdThresholdMa} mA RCD/RCBO`} additional protection. No residual-current device was found upstream of this socket.`,
        recommendation: `Add an ${standardId === 'us' ? 'GFCI breaker/receptacle' : 'RCD/RCBO'} on the socket branch, or replace the socket with a ${standardId === 'us' ? 'GFCI receptacle' : 'RCBO-protected outlet'}.`,
        componentId: comp.id,
        category: 'protection',
        blocking: true,
        quickFix: { label: 'Add 30 mA RCD Module', type: 'add_rcd' },
        detailedBreakdown: {
          bs7671Regulation:
            standardId === 'us'
              ? 'NEC 210.8(A) GFCI protection required'
              : standardId === 'eu'
                ? 'IEC 60364-4-41 §415.1 (≤30 mA additional protection)'
                : 'BS 7671 Regulation 411.3.3 (≤30 mA RCD on sockets ≤32 A)',
          physicsExplanation:
            'A residual device monitors the vector sum of line and neutral current. If more than 30 mA returns through a human body to earth it disconnects within 40 ms, preventing ventricular fibrillation.',
          steps: [
            {
              stepNumber: 1,
              title: 'Topology Scan',
              description: `Traced conductors from ${def.label} toward the supply.`,
            },
            {
              stepNumber: 2,
              title: 'RCD Search',
              description: 'No RCD, RCBO or GFCI device found in the upstream path.',
            },
            {
              stepNumber: 3,
              title: 'Resolution',
              description: `Install a ${std.rcdThresholdMa} mA residual-current protective device ahead of the socket circuit.`,
            },
          ],
          practicalTip:
            'Kitchens, bathrooms, garages, outdoors and EV chargers universally require this protection.',
        },
      });
    }
  }
  return issues;
}

/**
 * Motor / high-inrush loads need a C- or D-curve MCB to avoid nuisance
 * tripping on startup; a B-curve breaker on a compressor is a design
 * error under all three standards.
 */
function checkMotorBreakerCurve(circuit: Circuit, standardId: StandardId): ComplianceIssue[] {
  const { components, wires } = circuit;
  const issues: ComplianceIssue[] = [];
  const byId = new Map(components.map((c) => [c.id, c]));

  const standard = getStandard(standardId);
  const CURVE_ORDER: Record<'B' | 'C' | 'D', number> = { B: 0, C: 1, D: 2 };

  for (const comp of components) {
    const def = COMPONENT_DEFS[comp.type];
    if (!def) continue;
    const recommended = recommendCurveForLoad(comp.type, standard);
    // Only motor-class loads need the inrush check: they are exactly the
    // components whose recommended curve EXCEEDS the standard's default.
    // (Comparing against 'B' swept in every component under standards whose
    // default curve is already C — US/INT — flagging terminals and bulbs
    // as "motor loads".)
    if (CURVE_ORDER[recommended] <= CURVE_ORDER[standard.defaultMcbCurve]) continue;

    // Walk upstream to find the nearest breaker and inspect its curve.
    const visited = new Set<string>([comp.id]);
    const queue: string[] = [comp.id];
    let breakerId: string | null = null;
    while (queue.length > 0) {
      const currId = queue.shift()!;
      for (const w of wires) {
        const neighbourId =
          w.fromComponentId === currId
            ? w.toComponentId
            : w.toComponentId === currId
              ? w.fromComponentId
              : null;
        if (!neighbourId || visited.has(neighbourId)) continue;
        visited.add(neighbourId);
        const n = byId.get(neighbourId);
        if (!n) continue;
        const ndef = COMPONENT_DEFS[n.type];
        if (ndef?.isProtection) {
          breakerId = n.id;
          queue.length = 0;
          break;
        }
        queue.push(neighbourId);
      }
    }
    if (!breakerId) continue;
    const breaker = byId.get(breakerId)!;
    const breakerCurve =
      breaker.state.fault === 'protection-bypass'
        ? null
        : (COMPONENT_DEFS[breaker.type]?.mcbType ?? 'B');

    if (breakerCurve && CURVE_ORDER[breakerCurve] < CURVE_ORDER[recommended]) {
      issues.push({
        id: `motorcurve_${comp.id}_${breakerId}`,
        severity: 'error',
        title: `${breakerCurve}-curve breaker on motor load ${def.label}`,
        description: `${def.label} draws a high inrush current on startup (5–10× running). A ${breakerCurve}-curve MCB will nuisance-trip on that inrush. A ${recommended}-curve breaker is required under ${getStandard(standardId).citation}.`,
        recommendation: `Replace the upstream breaker with a Type ${recommended} MCB/RCBO rated for motor inrush.`,
        componentId: breakerId,
        category: 'protection',
        blocking: true,
        detailedBreakdown: {
          bs7671Regulation:
            standardId === 'us'
              ? 'NEC 430.52 motor branch-circuit short-circuit protection'
              : 'IEC 60898-1 / IEC 60947-2 trip-curve selection',
          physicsExplanation:
            'Inductive motor windings draw 5–10× FLA while the rotor accelerates. B-curve magnetics trip at 3–5×In; C-curve tolerates 5–10×In and D-curve 10–20×In.',
          steps: [
            {
              stepNumber: 1,
              title: 'Load Identification',
              description: `${def.label} is an inductive / high-inrush load.`,
            },
            {
              stepNumber: 2,
              title: 'Breaker Curve',
              description: `Upstream MCB is Type ${breakerCurve}.`,
            },
            {
              stepNumber: 3,
              title: 'Required Curve',
              description: `Swap to Type ${recommended} to ride through startup without nuisance tripping.`,
            },
          ],
          practicalTip:
            'When in doubt, C-curve is a safe default for HVAC, compressors and EV chargers; D-curve for large direct-on-line motors.',
        },
      });
    }
  }
  return issues;
}

/**
 * Run the full standard-aware compliance suite. Returns issues tagged with
 * a `blocking` flag so the simulator can refuse to start while any
 * error-level violation remains unresolved.
 */
export function runComplianceChecks(
  circuit: Circuit,
  standardId: StandardId,
  nominalVoltage?: number,
): ComplianceReport {
  const standard = getStandard(standardId);
  const voltage = nominalVoltage ?? standard.nominalVoltage;
  const issues: ComplianceIssue[] = [];

  if (circuit.components.length > 0) {
    issues.push(...checkVoltageDrop(circuit, standardId, voltage));
    issues.push(...checkUnswitchedSocketRcd(circuit, standardId));
    issues.push(...checkMotorBreakerCurve(circuit, standardId));
  }

  // Stable ordering: blocking errors first, then warnings, then info.
  issues.sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return {
    standard: standardId,
    issues,
    errorCount: issues.filter((i) => i.severity === 'error').length,
    warningCount: issues.filter((i) => i.severity === 'warning').length,
  };
}

/**
 * True when any compliance issue would prevent the simulation from
 * starting (error severity + blocking flag).
 */
export function hasBlockingViolations(report: ComplianceReport): boolean {
  return report.issues.some((i) => i.blocking && i.severity === 'error');
}
