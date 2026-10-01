import { WIRE_DEFAULTS, resolveWireProperties } from './core/wireProperties';
/** Limited UK TN copper T&E teaching estimate, not a compliance assessment.
 * Existing 0.95/0.8 factors and resistance tables are retained as model
 * assumptions; publisher edition summaries do not verify their full applicability.
 * The component-network path estimate does not prove CPC continuity or selectivity.
 */

import { instanceLabel } from './componentLabel';
import { COMPONENT_DEFS } from './components';
import { isResidualDevice } from './protectionRoles';
import { connectedNetworkComponents } from './simulation/faultPropagation';
import type { StandardId } from './standards';
import type { Circuit, ComponentInstance, WireInstance } from './types';

export const ZS_CMIN = 0.95;
export const ZS_NOMINAL_VOLTAGE = 230;
/** Upper magnetic (instantaneous) threshold per IEC 60898-1 curve letter. */
export const ZS_MAGNETIC_UPPER: Record<'B' | 'C' | 'D', number> = { B: 5, C: 10, D: 20 };
/** GN3 cold-measurement design factor against the 70 °C tabulated maxima. */
export const ZS_COLD_RULE = 0.8;

/** Copper conductor resistance at 20 °C (mΩ/m), OSG/GN3 Table B1 & I1. */
const CU_MOHM_PER_M: Record<number, number> = {
  1: 18.1,
  1.5: 12.1,
  2.5: 7.41,
  4: 4.61,
  6: 3.08,
  10: 1.83,
  16: 1.15,
};

/** Standard BS 6004 T&E line/CPC pairings. */
const CPC_MM2: Record<number, number> = {
  1: 1,
  1.5: 1,
  2.5: 1.5,
  4: 1.5,
  6: 2.5,
  10: 4,
  16: 6,
};

/** 20 °C copper fallback for sizes outside the tables (ρ = 0.0172 Ω·mm²/m). */
const cuMOhmPerM = (mm2: number) =>
  CU_MOHM_PER_M[mm2] ?? (mm2 > 0 ? 17.2 / mm2 : Number.POSITIVE_INFINITY);

export function getR1R2MilliOhmPerMetre(lineMm2: number): {
  r1: number;
  r2: number;
  sum: number;
  cpcMm2: number;
} {
  const cpcMm2 = CPC_MM2[lineMm2] ?? lineMm2;
  const r1 = cuMOhmPerM(lineMm2);
  const r2 = cuMOhmPerM(cpcMm2);
  return { r1, r2, sum: r1 + r2, cpcMm2 };
}

/** Arithmetic ceiling for the assumed IEC magnetic threshold using U0. */
export function getMaxZsOhms(
  curve: 'B' | 'C' | 'D',
  ratingAmps: number,
  lineToEarthVoltage = ZS_NOMINAL_VOLTAGE,
): number {
  return (lineToEarthVoltage * ZS_CMIN) / (ZS_MAGNETIC_UPPER[curve] * ratingAmps);
}

export type ZsEarthArrangement = 'TN-C-S' | 'TN-S' | 'TT';
export const ZE_DEFAULT_OHMS: Record<Exclude<ZsEarthArrangement, 'TT'>, number> = {
  'TN-C-S': 0.35,
  'TN-S': 0.8,
};

export interface ZsContext {
  standard: StandardId;
  earthing: ZsEarthArrangement;
  /** Explicit U0, never an inferred line-to-line voltage. */
  lineToEarthVoltage?: number;
  zeOhms?: number;
  circuitKind?: 'final' | 'distribution';
}

export interface ZsNotAssessed {
  status: 'not-assessed';
  deviceId: string;
  deviceLabel: string;
  reason: string;
}
export type ZsAssessment = ZsCheckResult | ZsNotAssessed;

export interface ZsCheckResult {
  status: 'estimated';
  lineToEarthVoltage: number;
  assumptions: string;
  residualMilliAmps?: number;
  deviceId: string;
  deviceLabel: string;
  curve: 'B' | 'C' | 'D';
  ratingAmps: number;
  /** Upper magnetic threshold in this simplified model. */
  assuredFaultCurrentAmps: number;
  maxZsOhms: number;
  /** Cold (20 °C) design/test ceiling = 0.8 × max. */
  coldLimitOhms: number;
  zeOhms: number;
  runLengthMeters: number;
  runLengthEstimated: boolean;
  smallestCableMm2: number;
  cpcMm2: number;
  r1r2Ohms: number;
  zsOhms: number;
  prospectiveFaultCurrentAmps: number;
  passHot: boolean;
  passCold: boolean;
  disconnectionSeconds: number;
  furthestComponentLabel: string | null;
  /** Residual type when the device is residual-current operated. */
  rcdType?: 'AC' | 'A' | 'F' | 'B';
}

function wireMm2(wire: WireInstance, byId: Map<string, ComponentInstance>): number {
  return resolveWireProperties(wire, byId).cableMm2;
}

/**
 * Disconnection check for one protective device: Dijkstra over the device's
 * connected network for the furthest point, then Zs = Ze + R1R2(run).
 * Non-protective components return null; unsupported devices return not-assessed.
 */
export function checkDeviceDisconnection(
  device: ComponentInstance,
  circuit: Circuit,
  context: ZsContext,
): ZsAssessment | null {
  const def = COMPONENT_DEFS[device.type];
  const curve = def?.mcbType as 'B' | 'C' | 'D' | undefined;
  if (!def?.isProtection) return null;
  const unassessed = (reason: string): ZsNotAssessed => ({
    status: 'not-assessed',
    deviceId: device.id,
    deviceLabel: device.state.autoLabel ?? instanceLabel(device),
    reason,
  });
  if (context.standard !== 'uk')
    return unassessed(
      'Only the UK TN teaching model is supported; this is not a national compliance check.',
    );
  if (context.earthing !== 'TN-S' && context.earthing !== 'TN-C-S')
    return unassessed(
      'TT needs electrode resistance, residual-device characteristics and disconnection criteria. RCD presence alone cannot establish a pass.',
    );
  if (!curve)
    return unassessed(
      'Device trip model not assessed. An RCD can provide earth-fault disconnection; this overcurrent-curve model does not assess residual operation.',
    );
  if (context.circuitKind === 'distribution')
    return unassessed('Distribution-circuit disconnection is not assessed.');
  const supplyVoltage = circuit.globalVoltage ?? 230;
  const u0 = context.lineToEarthVoltage ?? (supplyVoltage === 230 ? 230 : undefined);
  if (u0 !== 230 || (supplyVoltage !== 230 && supplyVoltage !== 400))
    return unassessed(
      'This model supports U0 = 230 V only. Supply voltage is not automatically line-to-earth voltage; 400 V line-to-line requires explicit U0.',
    );
  const zeOhms = context.zeOhms ?? ZE_DEFAULT_OHMS[context.earthing];
  if (!Number.isFinite(zeOhms) || zeOhms < 0)
    return unassessed('Ze must be a finite non-negative value.');
  const rating = device.state.customMaxAmps ?? def.maxAmps;
  if (!rating || !Number.isFinite(rating) || rating <= 0 || rating > 32)
    return unassessed('Only final-circuit teaching ratings up to 32 A are assessed.');
  const network = connectedNetworkComponents(device.id, circuit);
  const networkWires = circuit.wires.filter(
    (w) => network.has(w.fromComponentId) && network.has(w.toComponentId),
  );
  if (!networkWires.length) return unassessed('No connected circuit to assess.');
  const byId = new Map(circuit.components.map((c) => [c.id, c]));
  const connected = circuit.components.filter((c) => network.has(c.id));
  if (!connected.some((c) => COMPONENT_DEFS[c.type]?.sourceType === 'live')) {
    return unassessed('No supported supply is connected to this circuit.');
  }
  if (
    networkWires.some((w) => {
      const from = byId.get(w.fromComponentId);
      const to = byId.get(w.toComponentId);
      return (
        !from ||
        !to ||
        !COMPONENT_DEFS[from.type]?.ports[w.fromPortIndex] ||
        !COMPONENT_DEFS[to.type]?.ports[w.toPortIndex]
      );
    }) ||
    connected.some(
      (c) =>
        c.state.customCableMm2 !== undefined &&
        (!Number.isFinite(c.state.customCableMm2) || c.state.customCableMm2 <= 0),
    )
  ) {
    return unassessed('Invalid conductor size or terminal connection.');
  }

  if (
    connected.some(
      (c) =>
        c.state.fault ||
        (COMPONENT_DEFS[c.type]?.isSource &&
          (!['live-terminal', 'neutral-terminal', 'earth-terminal', 'ac-mains-supply'].includes(
            c.type,
          ) ||
            (c.state.customVoltage !== undefined && c.state.customVoltage !== u0))),
    ) ||
    circuit.faults?.length ||
    networkWires.some((w) => w.fault || w.isBusted)
  ) {
    return unassessed(
      'Faulted circuits or unsupported source models require a separate assessment.',
    );
  }
  if (
    networkWires.some(
      (w) =>
        (w.material && w.material !== 'copper') ||
        w.gauge !== undefined ||
        (w.lengthMeters !== undefined &&
          (!Number.isFinite(w.lengthMeters) || w.lengthMeters <= 0)) ||
        !CPC_MM2[wireMm2(w, byId)],
    )
  )
    return unassessed(
      'Only the listed copper T&E sizes with positive run lengths are supported; other cable models are not assessed.',
    );

  // Adjacency with run-length weights (10 m assumed when a wire has none).
  const adjacency = new Map<string, { to: string; meters: number; estimated: boolean }[]>();
  for (const w of networkWires) {
    const hasLength = typeof w.lengthMeters === 'number' && w.lengthMeters > 0;
    const meters = hasLength ? (w.lengthMeters as number) : WIRE_DEFAULTS.lengthMeters;
    const estimated = !hasLength;
    for (const [a, b] of [
      [w.fromComponentId, w.toComponentId],
      [w.toComponentId, w.fromComponentId],
    ] as const) {
      if (!adjacency.has(a)) adjacency.set(a, []);
      adjacency.get(a)!.push({ to: b, meters, estimated });
    }
  }

  // Dijkstra from the device; then take the furthest reachable component.
  const dist = new Map<string, number>([[device.id, 0]]);
  const estFlags = new Map<string, boolean>([[device.id, false]]);
  const visited = new Set<string>();
  for (;;) {
    let current: string | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < best) {
        best = d;
        current = id;
      }
    }
    if (current === null) break;
    visited.add(current);
    for (const edge of adjacency.get(current) ?? []) {
      const via = best + edge.meters;
      if (via < (dist.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        dist.set(edge.to, via);
        estFlags.set(edge.to, (estFlags.get(current) ?? false) || edge.estimated);
      }
    }
  }

  let furthestId: string | null = null;
  let runLength = 0;
  for (const [id, d] of dist) {
    if (id !== device.id && d > runLength) {
      runLength = d;
      furthestId = id;
    }
  }
  if (!furthestId || runLength === 0) return unassessed('No usable run length to assess.');

  const smallestMm2 = Math.min(...networkWires.map((w) => wireMm2(w, byId)));
  const loop = getR1R2MilliOhmPerMetre(smallestMm2);
  const r1r2Ohms = (loop.sum * runLength) / 1000;

  const maxZs = getMaxZsOhms(curve, rating, u0);
  const zs = zeOhms + r1r2Ohms;
  const pfc = (u0 * ZS_CMIN) / zs;

  const furthestComp = byId.get(furthestId);
  const furthestLabel = furthestComp
    ? (furthestComp.state.autoLabel ??
      COMPONENT_DEFS[furthestComp.type]?.label ??
      furthestComp.type)
    : null;

  return {
    status: 'estimated',
    lineToEarthVoltage: u0,
    assumptions:
      'UK TN final-circuit model, copper T&E at 20 °C, assumed CPC pairing and component-network path. Ze is a design input, not a measurement; CPC continuity, full topology and device coordination are not verified.',
    residualMilliAmps: def.ratedLeakage_mA,
    deviceId: device.id,
    // `instanceLabel` attaches the rating the check actually used: the
    // catalogue label embeds the *default* rating ("RCBO (32A 30mA)"), so a
    // derated instance used to be described as the device it is not.
    deviceLabel: device.state.autoLabel ?? instanceLabel(device),
    curve,
    ratingAmps: rating,
    assuredFaultCurrentAmps: ZS_MAGNETIC_UPPER[curve] * rating,
    maxZsOhms: maxZs,
    coldLimitOhms: maxZs * ZS_COLD_RULE,
    zeOhms,
    runLengthMeters: runLength,
    runLengthEstimated: estFlags.get(furthestId) ?? true,
    smallestCableMm2: smallestMm2,
    cpcMm2: loop.cpcMm2,
    r1r2Ohms,
    zsOhms: zs,
    prospectiveFaultCurrentAmps: pfc,
    passHot: zs <= maxZs,
    passCold: zs <= maxZs * ZS_COLD_RULE,
    disconnectionSeconds: 0.4,
    furthestComponentLabel: furthestLabel,
    // Residual sensing is a rating-field fact (`ratedLeakage_mA`), not a name.
    rcdType: isResidualDevice(device.type) ? (device.state.rcdType ?? 'A') : undefined,
  };
}

/** All protective devices; unsupported or isolated devices have explicit reasons. */
export function runZsChecks(circuit: Circuit, context: ZsContext): ZsAssessment[] {
  return circuit.components
    .map((c) => checkDeviceDisconnection(c, circuit, context))
    .filter((r): r is ZsAssessment => r !== null);
}
