/** Independent numerical acceptance drawings, shared by unit and localhost
 * runtime parity checks. These are test fixtures, not an application endpoint.
 */
import { component as C, wire as W } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import type { SupplyModel } from './contracts';
import { explicitSupplyProfile } from './supplies';

export const sourceFixture = (id: string, model: SupplyModel) =>
  C(id, model.kind === 'dc' ? 'dc-battery-12v' : 'ac-mains-supply', {
    sourceProfile: explicitSupplyProfile(model),
  });

export const resistorFixture = (id: string, resistanceOhms: number) =>
  C(id, 'space-heater', { customVoltage: 12, customPowerWatts: 144 / resistanceOhms });

/** Each explicitly specified copper lead is 0.07 ohm at the declared 20 C. */
export const leadFixture = (
  id: string,
  from: string,
  fromPort: number,
  to: string,
  toPort: number,
) => ({
  ...W(id, from, fromPort, to, toPort),
  material: 'copper' as const,
  lengthMeters: 10,
  customCableMm2: 2.5,
});

export function seriesFixture(
  resistances = [6, 6],
  model: SupplyModel = { kind: 'dc', voltage: 12 },
): Circuit {
  return {
    components: [
      sourceFixture('s', model),
      ...resistances.map((r, i) => resistorFixture(`r${i}`, r)),
    ],
    wires: [
      leadFixture('feed', 's', 0, 'r0', 0),
      ...resistances.slice(1).map((_r, i) => leadFixture(`join${i}`, `r${i}`, 1, `r${i + 1}`, 0)),
      leadFixture('return', `r${resistances.length - 1}`, 1, 's', 1),
    ],
  };
}

export function parallelFixture(sharedFeeder = false): Circuit {
  return {
    components: [
      sourceFixture('s', { kind: 'dc', voltage: 12 }),
      resistorFixture('r0', 6),
      resistorFixture('r1', 12),
      ...(sharedFeeder ? [C('joint', 'terminal-strip')] : []),
    ],
    wires: [
      ...(sharedFeeder ? [leadFixture('feeder', 's', 0, 'joint', 0)] : []),
      ...[0, 1].flatMap((i) => [
        leadFixture(`feed${i}`, sharedFeeder ? 'joint' : 's', sharedFeeder ? 2 : 0, `r${i}`, 0),
        leadFixture(`return${i}`, `r${i}`, 1, 's', 1),
      ]),
    ],
  };
}

export function opposedSourceFixture(
  a: SupplyModel = { kind: 'dc', voltage: 12 },
  b: SupplyModel = { kind: 'dc', voltage: 6 },
): Circuit {
  return {
    components: [sourceFixture('a', a), sourceFixture('b', b)],
    wires: [leadFixture('positive', 'a', 0, 'b', 0), leadFixture('return', 'b', 1, 'a', 1)],
  };
}

export function balancedBridgeFixture(): Circuit {
  return {
    components: [
      sourceFixture('s', { kind: 'dc', voltage: 12 }),
      ...['a0', 'a1', 'b0', 'b1', 'bridge'].map((id) => resistorFixture(id, 6)),
    ],
    wires: [
      ...['a', 'b'].flatMap((arm) => [
        leadFixture(`${arm}-feed`, 's', 0, `${arm}0`, 0),
        leadFixture(`${arm}-mid`, `${arm}0`, 1, `${arm}1`, 0),
        leadFixture(`${arm}-return`, `${arm}1`, 1, 's', 1),
      ]),
      leadFixture('bridge-a', 'a0', 1, 'bridge', 0),
      leadFixture('bridge-b', 'bridge', 1, 'b0', 1),
    ],
  };
}

export function unbalancedBridgeFixture(): Circuit {
  const circuit = balancedBridgeFixture();
  circuit.components = circuit.components.map((component) =>
    component.id === 'b1' ? resistorFixture('b1', 12) : component,
  );
  return circuit;
}

export function mnaAcceptanceCircuits(): Record<string, Circuit> {
  const open = seriesFixture();
  open.wires[open.wires.length - 1]!.fault = 'open-circuit';
  const independent: Circuit = {
    components: [
      sourceFixture('dc', { kind: 'dc', voltage: 12 }),
      sourceFixture('ac', { kind: 'ac-single-phase', voltage: 230, frequencyHz: 60 }),
      resistorFixture('dc-load', 6),
      resistorFixture('ac-load', 100),
    ],
    wires: ['dc', 'ac'].flatMap((id) => [
      leadFixture(`${id}-feed`, id, 0, `${id}-load`, 0),
      leadFixture(`${id}-return`, `${id}-load`, 1, id, 1),
    ]),
  };
  const short: Circuit = {
    components: [sourceFixture('s', { kind: 'dc', voltage: 12 })],
    wires: [],
    faults: [
      {
        id: 'short',
        type: 'short-circuit',
        category: 'protection',
        target: { type: 'component', id: 's' },
        createdAt: 0,
      },
    ],
  };
  const unsupported = seriesFixture();
  unsupported.components[1]!.type = 'bulb';
  const numericalRange = seriesFixture();
  // Valid saved ratings, but an extreme 1e-11-ohm element beside finite leads.
  // Recovering its tiny voltage drop must meet the same conservation tolerance.
  numericalRange.components[1]!.state.customVoltage = 0.001;
  numericalRange.components[1]!.state.customPowerWatts = 100_000;
  return {
    series: seriesFixture(),
    parallel: parallelFixture(),
    'shared-feeder': parallelFixture(true),
    'open-return': open,
    independent,
    'opposed-sources': opposedSourceFixture(),
    'balanced-bridge': balancedBridgeFixture(),
    'unbalanced-bridge': unbalancedBridgeFixture(),
    'source-short': short,
    'unknown-load': unsupported,
    'numerical-range': numericalRange,
    'mixed-kinds': opposedSourceFixture(
      { kind: 'dc', voltage: 12 },
      { kind: 'ac-single-phase', voltage: 12, frequencyHz: 50 },
    ),
    'mixed-frequency': opposedSourceFixture(
      { kind: 'ac-single-phase', voltage: 12, frequencyHz: 50 },
      { kind: 'ac-single-phase', voltage: 12, frequencyHz: 60 },
    ),
    'undeclared-phase': opposedSourceFixture(
      { kind: 'ac-single-phase', voltage: 12, frequencyHz: 50 },
      { kind: 'ac-single-phase', voltage: 12, frequencyHz: 50 },
    ),
    empty: { components: [], wires: [] },
    'no-source': { components: [resistorFixture('r', 6)], wires: [] },
  };
}
