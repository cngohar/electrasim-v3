import { component as C } from '../simulation/auditFixtures';
import type { Circuit, InjectedFault } from '../types';
import {
  leadFixture as lead,
  resistorFixture as resistor,
  sourceFixture as source,
} from './mnaFixtures';
import { transformerFixture } from './transformerFixtures';

export function earthFaultFixture(bonded = true): Circuit {
  return {
    components: [
      source('s', { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 }),
      C('socket', 'socket-3pin'),
    ],
    wires: [
      lead('feed', 's', 0, 'socket', 0),
      lead('return', 'socket', 1, 's', 1),
      lead('cpc', 'socket', 2, 's', 2),
      ...(bonded ? [lead('bond', 's', 2, 's', 1)] : []),
    ],
    faults: [
      {
        id: 'fault',
        type: 'earth-fault',
        category: 'earth',
        target: { type: 'component', id: 'socket' },
        createdAt: 0,
      },
    ],
  };
}

export function peReturnFixture(bonded = true): Circuit {
  const circuit = earthFaultFixture(bonded);
  circuit.components.push(resistor('r', 6));
  circuit.faults = [];
  circuit.wires.push(
    lead('load-feed', 'socket', 0, 'r', 0),
    lead('pe-return', 'r', 1, 'socket', 2),
  );
  return circuit;
}

export function earthingAcceptanceCircuits(): Record<string, Circuit> {
  const broken = earthFaultFixture();
  broken.faults!.push({
    id: 'broken-cpc',
    type: 'open-earth',
    category: 'conductor',
    target: { type: 'wire', id: 'cpc' },
    createdAt: 0,
  });
  const normal = peReturnFixture();
  normal.wires[normal.wires.length - 1]!.toPortIndex = 1;
  const reverse = peReturnFixture();
  reverse.wires[reverse.wires.length - 2]!.toPortIndex = 1;
  reverse.wires[reverse.wires.length - 1]!.fromPortIndex = 0;
  reverse.wires[reverse.wires.length - 1]!.toPortIndex = 1;
  const switchedNeutral = peReturnFixture();
  switchedNeutral.wires[switchedNeutral.wires.length - 1]!.toPortIndex = 1;
  switchedNeutral.components.push(C('switch', 'single-way-switch', { on: false }));
  switchedNeutral.wires[1] = lead('return', 'socket', 1, 'switch', 0);
  switchedNeutral.wires.push(lead('switched-return', 'switch', 1, 's', 1));
  const electrode = earthFaultFixture(false);
  electrode.components.push(C('rod-a', 'earth-rod'), C('rod-b', 'earth-rod'));
  electrode.wires.push(
    lead('rod-cpc', 's', 2, 'rod-a', 0),
    lead('rod-neutral', 's', 1, 'rod-b', 0),
  );
  const leakage = earthFaultFixture();
  leakage.faults![0]!.type = 'live-to-earth';
  const secondary = transformerFixture();
  secondary.components.push(C('socket', 'socket-3pin'));
  secondary.wires.push(
    lead('fault-feed', 'tx', 2, 'socket', 0),
    lead('secondary-cpc', 'socket', 2, 's', 2),
  );
  secondary.faults = [
    {
      id: 'secondary-fault',
      type: 'earth-fault',
      category: 'earth',
      target: { type: 'component', id: 'socket' },
      createdAt: 0,
    },
  ];
  const short = earthFaultFixture();
  short.faults![0]!.type = 'short-circuit';
  short.faults![0]!.category = 'protection';
  const unassessed: InjectedFault = {
    id: 'ambiguous-short',
    type: 'short-circuit',
    category: 'protection',
    target: { type: 'component', id: 'tx' },
    createdAt: 0,
  };
  const ambiguous = transformerFixture();
  ambiguous.faults = [unassessed];
  return {
    'bonded-earth-fault': earthFaultFixture(),
    'floating-earth-fault': earthFaultFixture(false),
    'broken-cpc': broken,
    'normal-pe-connection': normal,
    'bonded-pe-return': peReturnFixture(),
    'floating-pe-return': peReturnFixture(false),
    'reversed-polarity': reverse,
    'switched-neutral': switchedNeutral,
    'independent-electrodes': electrode,
    'unknown-leakage': leakage,
    'isolated-secondary-earth-fault': secondary,
    'line-neutral-short': short,
    'ambiguous-winding-short': ambiguous,
    'pe-only': {
      components: [C('pe-a', 'earth-terminal'), C('pe-b', 'earth-terminal'), resistor('r', 6)],
      wires: [lead('feed', 'pe-a', 0, 'r', 0), lead('return', 'r', 1, 'pe-b', 0)],
    },
  };
}
