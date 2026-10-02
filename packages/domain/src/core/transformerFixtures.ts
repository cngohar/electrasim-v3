/** Independent transformer/earth drawings shared with the local Worker parity gate. */
import { component as C } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import type { SupplyModel } from './contracts';
import {
  leadFixture as lead,
  resistorFixture as resistor,
  sourceFixture as source,
} from './mnaFixtures';

export function transformerFixture(
  output: 8 | 12 | 24 = 12,
  resistance = 6,
  supply: SupplyModel = { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
): Circuit {
  return {
    components: [source('s', supply), C('tx', `transformer-${output}v`), resistor('r', resistance)],
    wires: [
      lead('primary-feed', 's', 0, 'tx', 0),
      lead('primary-return', 'tx', 1, 's', 1),
      lead('secondary-feed', 'tx', 2, 'r', 0),
      lead('secondary-return', 'r', 1, 'tx', 3),
    ],
  };
}

export function transformerAcceptanceCircuits(): Record<string, Circuit> {
  const open = transformerFixture();
  open.wires[3]!.fault = 'open-circuit';
  const noLoad = transformerFixture();
  noLoad.components.pop();
  noLoad.wires.splice(2);
  const short = transformerFixture();
  short.components.pop();
  short.wires.splice(2);
  short.wires.push(lead('secondary-short', 'tx', 2, 'tx', 3));
  const reversed = transformerFixture();
  reversed.wires[2]!.fromPortIndex = 3;
  reversed.wires[3]!.toPortIndex = 2;
  const backfeed = transformerFixture(12, 100, {
    kind: 'ac-single-phase',
    voltage: 12,
    frequencyHz: 60,
  });
  backfeed.wires[0]!.toPortIndex = 2;
  backfeed.wires[1]!.fromPortIndex = 3;
  backfeed.wires[2]!.fromPortIndex = 0;
  backfeed.wires[3]!.toPortIndex = 1;
  const bonded = transformerFixture();
  bonded.wires.push(lead('external-bond', 'tx', 1, 'tx', 3));
  const cascade = transformerFixture(24);
  cascade.components.push(C('tx2', 'transformer-12v'));
  cascade.wires[2]!.toComponentId = 'tx2';
  cascade.wires[3]!.fromComponentId = 'tx2';
  cascade.wires.push(lead('load-feed', 'tx2', 2, 'r', 0), lead('load-return', 'r', 1, 'tx2', 3));
  const mixed = transformerFixture();
  mixed.components.push(source('other', { kind: 'ac-single-phase', voltage: 12, frequencyHz: 60 }));
  mixed.wires.push(
    lead('other-feed', 'other', 0, 'tx', 2),
    lead('other-return', 'tx', 3, 'other', 1),
  );
  const broken = transformerFixture();
  broken.faults = [
    {
      id: 'broken',
      type: 'open-circuit',
      category: 'conductor',
      target: { type: 'port', componentId: 'tx', portIndex: 0 },
      createdAt: 0,
    },
  ];
  return {
    '8v': transformerFixture(8),
    '12v': transformerFixture(),
    '24v': transformerFixture(24),
    'open-return': open,
    'no-load': noLoad,
    'secondary-short': short,
    reversed,
    backfeed,
    'externally-bonded': bonded,
    cascade,
    dc: transformerFixture(12, 6, { kind: 'dc', voltage: 12 }),
    'mixed-frequency': mixed,
    'broken-winding': broken,
  };
}
