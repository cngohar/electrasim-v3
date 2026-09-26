/** Limited teaching checks. An empty issue list is never a compliance certificate. */
import type { ValidationIssue } from './circuitValidationTypes';
import { COMPONENT_DEFS } from './components';
import { getMillivoltAmpMeter } from './electricalCalculations';
import { isResidualDevice } from './protectionRoles';
import { type StandardId, getStandard, isInrushLoad, voltageDropCeiling } from './standards';
import type { Circuit, ComponentInstance, WireInstance } from './types';

interface ComplianceIssue extends ValidationIssue {
  blocking: boolean;
}

export interface ComplianceReport {
  standard: StandardId;
  status: 'limited-model' | 'not-assessed';
  coverageNotes: string[];
  issues: ComplianceIssue[];
  errorCount: number;
  warningCount: number;
}

/** Line-only graph: prevents counting neutral return twice with two-conductor
 * mV/A/m values. Component-level continuity remains an approximation. */
function lineAdjacency(circuit: Circuit): Map<string, WireInstance[]> {
  const byId = new Map(circuit.components.map((c) => [c.id, c]));
  const adjacency = new Map<string, WireInstance[]>();
  for (const w of circuit.wires) {
    const from = byId.get(w.fromComponentId);
    const to = byId.get(w.toComponentId);
    if (!from || !to || w.fault || w.isBusted) continue;
    if (
      COMPONENT_DEFS[from.type]?.ports[w.fromPortIndex]?.type !== 'live' ||
      COMPONENT_DEFS[to.type]?.ports[w.toPortIndex]?.type !== 'live'
    )
      continue;
    for (const id of [from.id, to.id]) {
      if (!adjacency.has(id)) adjacency.set(id, []);
      adjacency.get(id)!.push(w);
    }
  }
  return adjacency;
}

function wireDrop(
  wire: WireInstance,
  current: number,
  byId: Map<string, ComponentInstance>,
): number {
  const sizes = [wire.fromComponentId, wire.toComponentId]
    .map((id) => byId.get(id)?.state.customCableMm2)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const mm2 = wire.customCableMm2 ?? (sizes.length ? Math.min(...sizes) : 2.5);
  return (
    (getMillivoltAmpMeter(mm2, wire.material ?? 'copper') * (wire.lengthMeters ?? 10) * current) /
    1000
  );
}

export function runComplianceChecks(
  circuit: Circuit,
  standardId: StandardId,
  nominalVoltage?: number,
): ComplianceReport {
  const standard = getStandard(standardId);
  const voltage = nominalVoltage ?? circuit.globalVoltage ?? standard.nominalVoltage;
  const byId = new Map(circuit.components.map((c) => [c.id, c]));
  const adjacency = lineAdjacency(circuit);
  const issues: ComplianceIssue[] = [];
  const coverageNotes = [
    standard.metadata.coverage,
    'Voltage drop is a per-load radial estimate at the selected supply voltage; shared branch current, switching and ring current division are not solved here.',
    'Residual-device presence does not establish correct placement, sensitivity, timing or waveform coverage.',
  ];

  for (const comp of circuit.components) {
    const def = COMPONENT_DEFS[comp.type];
    if (!def || def.isSource || def.isProtection) continue;
    // A visited set bounds work even on cyclic or highly connected imports.
    const visited = new Set([comp.id]);
    const queue = [{ id: comp.id, drop: 0 }];
    let sourceDrop: number | null = null;
    let residualFound = isResidualDevice(comp.type);
    let breaker: ComponentInstance | undefined;
    const power = comp.state.customPowerWatts ?? def.powerWatts ?? 0;
    const current = Number.isFinite(voltage) && voltage > 0 ? power / voltage : 0;
    while (queue.length) {
      const node = queue.shift()!;
      const c = byId.get(node.id)!;
      if (COMPONENT_DEFS[c.type]?.isSource) {
        sourceDrop ??= node.drop;
        continue;
      }
      if (isResidualDevice(c.type)) residualFound = true;
      if (COMPONENT_DEFS[c.type]?.mcbType) breaker ??= c;
      for (const wire of adjacency.get(c.id) ?? []) {
        const next = wire.fromComponentId === c.id ? wire.toComponentId : wire.fromComponentId;
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push({ id: next, drop: node.drop + wireDrop(wire, current, byId) });
      }
    }

    const ceiling = voltageDropCeiling(comp.type, standard);
    const percent = sourceDrop === null ? 0 : (sourceDrop / voltage) * 100;
    if (ceiling !== null && Number.isFinite(percent) && percent > ceiling && power > 0) {
      issues.push({
        id: `vdrop_${comp.id}`,
        severity: 'warning',
        blocking: false,
        title: `Estimated voltage drop to ${def.label} (${percent.toFixed(1)}%)`,
        description: `Per-load estimate exceeds the ${ceiling}% teaching threshold at ${voltage} V. Component maximum ratings are not supply voltages. This does not assess the whole installation.`,
        recommendation:
          'Review run length, conductor size, actual branch current and supply conditions.',
        componentId: comp.id,
        category: 'cable_sizing',
      });
    }
    if (def.isSocket && !residualFound) {
      issues.push({
        id: `socket_rcd_${comp.id}`,
        severity: 'warning',
        blocking: false,
        title: `No residual protection found for ${def.label}`,
        description: `No ${standardId === 'us' ? 'GFCI' : 'RCD/RCBO'} was found on the connected line path. Required locations and device characteristics depend on the applicable rules.`,
        recommendation:
          'Check the protective-device arrangement and applicable additional-protection requirements.',
        componentId: comp.id,
        category: 'protection',
      });
    }
    if (
      standardId !== 'us' &&
      isInrushLoad(comp.type) &&
      breaker &&
      COMPONENT_DEFS[breaker.type]?.mcbType === 'B'
    ) {
      issues.push({
        id: `motorcurve_${comp.id}_${breaker.id}`,
        severity: 'warning',
        blocking: false,
        title: `Review inrush protection for ${def.label}`,
        description:
          'A B-curve breaker may trip on startup depending on current and duration. The component name alone cannot determine the required curve.',
        recommendation:
          'Check manufacturer inrush data, cable protection and disconnection conditions before selecting a curve.',
        componentId: breaker.id,
        category: 'protection',
      });
    }
  }
  return {
    standard: standardId,
    status:
      standardId === 'us' || !Number.isFinite(voltage) || voltage <= 0
        ? 'not-assessed'
        : 'limited-model',
    coverageNotes,
    issues,
    errorCount: issues.filter((i) => i.severity === 'error').length,
    warningCount: issues.filter((i) => i.severity === 'warning').length,
  };
}

export function hasBlockingViolations(report: ComplianceReport): boolean {
  return report.issues.some((i) => i.blocking && i.severity === 'error');
}
