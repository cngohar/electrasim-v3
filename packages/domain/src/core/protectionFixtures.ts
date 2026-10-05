import { component as C, wire as W } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import { explicitSupplyProfile } from './supplies';

const WIRES = (ids: [string, string, number, string, number][]) =>
  ids.map(([id, a, ai, b, bi]) => ({
    ...W(id, a, ai, b, bi),
    lengthMeters: 1,
    customCableMm2: 1,
    material: 'copper' as const,
  }));

/** Source → protected device → resistive load; returns explicit model per kind. */
export function protectionCircuit(kind: 'mcb' | 'fuse', ratedCurrentAmps: number): Circuit {
  return {
    supply: explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 }),
    globalVoltage: 230,
    components: [
      C('source', 'ac-mains-supply'),
      C('control', kind, {
        on: true,
        protectionModel:
          kind === 'mcb'
            ? { version: 1 as const, kind: 'mcb' as const, ratedCurrentAmps, curve: 'B' as const }
            : {
                version: 1 as const,
                kind: 'fuse' as const,
                ratedCurrentAmps,
                meltingIntegralSeconds: 10,
              },
      }),
      C('lamp', 'space-heater', { customVoltage: 230, customPowerWatts: 1000 }),
    ].map((component, i) => ({ ...component, x: 160 + i * 300, y: 300 })),
    wires: WIRES([
      ['feed', 'source', 0, 'control', 0],
      ['load-feed', 'control', 1, 'lamp', 0],
      ['return', 'lamp', 1, 'source', 1],
    ]),
  };
}

/** Two-pole RCD; the load returns straight to the source so the N pole sees
 * no load current — the difference across poles is the teaching residual. */
export function rcdLeakingCircuit(ratedResidualMilliamps = 30): Circuit {
  return {
    supply: explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 }),
    globalVoltage: 230,
    components: [
      C('source', 'ac-mains-supply'),
      C('control', 'rcd', {
        on: true,
        protectionModel: {
          version: 1,
          kind: 'rcd',
          ratedResidualMilliamps,
          residualType: 'A',
        },
      }),
      C('lamp', 'space-heater', { customVoltage: 230, customPowerWatts: 1000 }),
    ].map((component, i) => ({ ...component, x: 160 + i * 300, y: 300 })),
    wires: WIRES([
      ['feed', 'source', 0, 'control', 0],
      ['load-feed', 'control', 2, 'lamp', 0],
      ['neutral-direct', 'lamp', 1, 'source', 1],
    ]),
  };
}

/** Both RCD poles carry the same load current; the residual cancels. */
export function rcdBalancedCircuit(ratedResidualMilliamps = 30): Circuit {
  const circuit = rcdLeakingCircuit(ratedResidualMilliamps);
  circuit.wires = [
    ...WIRES([
      ['feed', 'source', 0, 'control', 0],
      ['load-feed', 'control', 2, 'lamp', 0],
      ['load-n', 'lamp', 1, 'control', 3],
    ]),
    ...WIRES([['n', 'control', 1, 'source', 1]]),
  ];
  return circuit;
}

/** RCBO with both poles passing the load; overcurrent through the declared curve. */
export function rcboCircuit(ratedCurrentAmps = 32, ratedResidualMilliamps = 30): Circuit {
  return {
    supply: explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 }),
    globalVoltage: 230,
    components: [
      C('source', 'ac-mains-supply'),
      C('control', 'rcbo', {
        on: true,
        protectionModel: {
          version: 1,
          kind: 'rcbo',
          ratedCurrentAmps,
          curve: 'B',
          ratedResidualMilliamps,
          residualType: 'A',
        },
      }),
      C('lamp', 'space-heater', { customVoltage: 230, customPowerWatts: 1000 }),
    ].map((component, i) => ({ ...component, x: 160 + i * 300, y: 300 })),
    wires: WIRES([
      ['feed', 'source', 0, 'control', 0],
      ['load-feed', 'control', 2, 'lamp', 0],
      ['load-n', 'lamp', 1, 'control', 3],
      ['n', 'control', 1, 'source', 1],
    ]),
  };
}
