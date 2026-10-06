/** E.0 fixtures declare explicit five-terminal source artwork/model contracts.
 * Catalogue placement/persistence/UI ship in E.1; these overrides are test-only.
 */
import { COMPONENT_DEFS } from '../components';
import { component as C } from '../simulation/auditFixtures';
import type { Circuit, ComponentDef } from '../types';
import { leadFixture, resistorFixture } from './mnaFixtures';

export function phasorFixtureDefs(
  sequence: 'abc' | 'acb' = 'abc',
  voltage = 230,
): Record<string, ComponentDef> {
  const ac = COMPONENT_DEFS['ac-mains-supply']!;
  return {
    ...COMPONENT_DEFS,
    'ac-mains-supply': {
      ...ac,
      ports: [
        ...['L1', 'L2', 'L3'].map((label, i) => ({
          ...ac.ports[0]!,
          label,
          relY: 0.15 + i * 0.15,
        })),
        { ...ac.ports[1]!, label: 'N' },
        { ...ac.ports[2]!, label: 'PE' },
      ],
      electricalModel: {
        kind: 'source',
        ports: [0, 3],
        phasePorts: [0, 1, 2],
        supply: { kind: 'ac-three-phase', voltage, frequencyHz: 50, sequence },
        voltageOrigin: 'catalogue',
      },
    },
  };
}

/** All explicitly declared leads are 0.07 ohm. */
export function starPhasorFixture(resistances = [23, 23, 23], neutral = true): Circuit {
  return {
    components: [
      C('s', 'ac-mains-supply'),
      C('star', 'wago-connector'),
      ...resistances.map((r, i) => resistorFixture(`r${i}`, r)),
    ],
    wires: [
      ...resistances.flatMap((_r, i) => [
        leadFixture(`feed${i}`, 's', i, `r${i}`, 0),
        leadFixture(`return${i}`, `r${i}`, 1, 'star', 0),
      ]),
      ...(neutral ? [leadFixture('neutral', 'star', 0, 's', 3)] : []),
    ],
  };
}

export function deltaPhasorFixture(): Circuit {
  return {
    components: [C('s', 'ac-mains-supply'), ...[0, 1, 2].map((i) => resistorFixture(`r${i}`, 40))],
    wires: [0, 1, 2].flatMap((i) => [
      leadFixture(`feed${i}`, 's', i, `r${i}`, 0),
      leadFixture(`return${i}`, `r${i}`, 1, 's', (i + 1) % 3),
    ]),
  };
}

export function phasorAcceptanceCircuits(): Record<
  string,
  { circuit: Circuit; defs: Record<string, ComponentDef> }
> {
  const defs = phasorFixtureDefs();
  const open = starPhasorFixture();
  open.wires[0]!.fault = 'open-circuit';
  const interphase = starPhasorFixture();
  interphase.wires.push(leadFixture('interphase', 's', 0, 's', 1));
  const independent = starPhasorFixture();
  independent.components.push(C('other', 'ac-mains-supply'), resistorFixture('other-load', 23));
  independent.wires.push(
    leadFixture('other-feed', 'other', 0, 'other-load', 0),
    leadFixture('other-return', 'other-load', 1, 'other', 3),
  );
  const joined: Circuit = JSON.parse(JSON.stringify(independent));
  joined.wires.push(leadFixture('joined-neutral', 'other', 3, 's', 3));
  const motor = starPhasorFixture();
  motor.components.push(C('motor', 'motor-3phase'));
  return {
    balanced: { circuit: starPhasorFixture(), defs },
    unbalanced: { circuit: starPhasorFixture([23, 46, 92]), defs },
    'floating-balanced-star': { circuit: starPhasorFixture([23, 23, 23], false), defs },
    'floating-unbalanced-star': { circuit: starPhasorFixture([23, 46, 92], false), defs },
    delta: { circuit: deltaPhasorFixture(), defs },
    'reverse-sequence': { circuit: starPhasorFixture(), defs: phasorFixtureDefs('acb') },
    'open-phase': { circuit: open, defs },
    interphase: { circuit: interphase, defs },
    independent: { circuit: independent, defs },
    'unsynchronized-join': { circuit: joined, defs },
    'unknown-motor': { circuit: motor, defs },
  };
}
