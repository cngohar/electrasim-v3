/**
 * zsCheck.ts — Earth-fault loop impedance (Zs) & disconnection-time checker.
 *
 * Standards basis (web-verified 2026-08):
 *  - BS 7671:2018+A4:2026 Tables 41.2–41.4 maximum Zs values are now Cmin-
 *    corrected: Zs_max = (Uo × 0.95) / Ia where Ia = upper magnetic
 *    threshold × In for BS EN 60898 curves (B 5×In, C 10×In, D 20×In)
 *    → B32 = 218.5/160 = 1.37 Ω, C32 = 0.68 Ω, D32 = 0.34 Ω.
 *  - Reg 411.3.1.2 / 411.3.2.2: 0.4 s disconnection for final circuits ≤32 A
 *    (socket-outlets ≤63 A); 5 s for distribution circuits. The magnetic
 *    element clears deep in its instantaneous zone, so meeting the 0.4 s Zs
 *    figure also covers 5 s cases for canvas-scale final circuits.
 *  - IET Guidance Note 3 / On-Site Guide Table I1: R1+R2 at 20 °C for
 *    BS 6004 T&E (e.g. 2.5/1.5 mm² = 19.51 mΩ/m). Tabulated Zs maxima are
 *    70 °C figures, so a cold (20 °C) measured/designed Zs should sit below
 *    0.8 × Zs_max to leave headroom for conductor heating (the "80% rule").
 *  - Zs = Ze + (R1 + R2); Ze default 0.35 Ω (TN-C-S typical design max),
 *    0.8 Ω (TN-S). TT relies on RCD disconnection (50 V / 30 mA → 1667 Ω,
 *    Table 41.5) and is out of scope for this panel.
 *
 * Teaching simplifications (documented here and in the UI):
 *  - The one-way run length to the furthest point is the weighted longest
 *    shortest-path over the device's connected wire network (lengthMeters,
 *    10 m assumed and flagged when a wire has none). On ElectraSim's radial
 *    canvas circuits this equals the live-rail run; exotic looped topologies
 *    read as an estimate.
 *  - R1+R2 uses the SMALLEST cable on the run (conservative) at 20 °C.
 */

import { COMPONENT_DEFS } from './components';
import { isResidualDevice } from './protectionRoles';
import { connectedNetworkComponents } from './simulation/faultPropagation';
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

/** Maximum earth-fault loop impedance for a 0.4 s disconnection (Cmin-corrected). */
export function getMaxZsOhms(curve: 'B' | 'C' | 'D', ratingAmps: number): number {
  return (ZS_NOMINAL_VOLTAGE * ZS_CMIN) / (ZS_MAGNETIC_UPPER[curve] * ratingAmps);
}

export type ZsEarthArrangement = 'TN-C-S' | 'TN-S';
export const ZE_DEFAULT_OHMS: Record<ZsEarthArrangement, number> = {
  'TN-C-S': 0.35,
  'TN-S': 0.8,
};

export interface ZsCheckResult {
  deviceId: string;
  deviceLabel: string;
  curve: 'B' | 'C' | 'D';
  ratingAmps: number;
  /** Current that guarantees operation inside 0.4 s (upper magnetic band). */
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

const DEFAULT_RUN_METERS = 10;

function wireMm2(wire: WireInstance, byId: Map<string, ComponentInstance>): number {
  if (wire.customCableMm2) return wire.customCableMm2;
  // Endpoint *recommendedCableMm2* is deliberately NOT consulted: many small
  // components (terminals, switches) recommend 1.0 mm² for their own tails,
  // which would incorrectly drag a whole run to the worst OSG figure. The
  // run size comes from the wire itself or explicit endpoint custom sizes,
  // else the domestic-default 2.5 mm².
  const sizes = [wire.fromComponentId, wire.toComponentId]
    .map((id) => byId.get(id))
    .filter((c): c is ComponentInstance => Boolean(c))
    .map((c) => c.state.customCableMm2)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  return sizes.length ? Math.min(...sizes) : 2.5;
}

/**
 * Disconnection check for one protective device: Dijkstra over the device's
 * connected network for the furthest point, then Zs = Ze + R1R2(run).
 * Returns null when the device guards nothing (isolated on the canvas).
 */
export function checkDeviceDisconnection(
  device: ComponentInstance,
  circuit: Circuit,
  zeOhms: number = ZE_DEFAULT_OHMS['TN-C-S'],
): ZsCheckResult | null {
  const def = COMPONENT_DEFS[device.type];
  const curve = def?.mcbType as 'B' | 'C' | 'D' | undefined;
  if (!def?.isProtection || !curve) return null;

  const network = connectedNetworkComponents(device.id, circuit);
  const networkWires = circuit.wires.filter(
    (w) => network.has(w.fromComponentId) && network.has(w.toComponentId),
  );
  if (networkWires.length === 0) return null;

  const byId = new Map(circuit.components.map((c) => [c.id, c]));

  // Adjacency with run-length weights (10 m assumed when a wire has none).
  const adjacency = new Map<string, { to: string; meters: number; estimated: boolean }[]>();
  for (const w of networkWires) {
    const hasLength = typeof w.lengthMeters === 'number' && w.lengthMeters > 0;
    const meters = hasLength ? (w.lengthMeters as number) : DEFAULT_RUN_METERS;
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
  if (!furthestId || runLength === 0) return null;

  const smallestMm2 = Math.min(...networkWires.map((w) => wireMm2(w, byId)));
  const loop = getR1R2MilliOhmPerMetre(smallestMm2);
  const r1r2Ohms = (loop.sum * runLength) / 1000;

  const rating = device.state.customMaxAmps ?? def.maxAmps ?? 32;
  const maxZs = getMaxZsOhms(curve, rating);
  const zs = zeOhms + r1r2Ohms;
  const pfc = (ZS_NOMINAL_VOLTAGE * ZS_CMIN) / zs;

  const furthestComp = byId.get(furthestId);
  const furthestLabel = furthestComp
    ? (furthestComp.state.autoLabel ??
      COMPONENT_DEFS[furthestComp.type]?.label ??
      furthestComp.type)
    : null;

  return {
    deviceId: device.id,
    deviceLabel: device.state.autoLabel ?? def.label ?? device.type,
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

/** All protective devices on the canvas that carry an overcurrent curve. */
export function runZsChecks(
  circuit: Circuit,
  zeOhms: number = ZE_DEFAULT_OHMS['TN-C-S'],
): ZsCheckResult[] {
  return circuit.components
    .map((c) => checkDeviceDisconnection(c, circuit, zeOhms))
    .filter((r): r is ZsCheckResult => r !== null);
}
