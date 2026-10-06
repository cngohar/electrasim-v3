/** Portable E.1 drawings use only real catalogue types and canonical saved ports. */
import { component as C } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import { leadFixture } from './mnaFixtures';
import { explicitSupplyProfile } from './supplies';

export function threePhaseStarFixture(resistances = [23, 23, 23], neutral = true): Circuit {
  return {
    components: [
      C('s', 'ac-three-phase-supply'),
      C('star', 'wago-connector'),
      ...resistances.map((r, i) =>
        C(`r${i}`, 'space-heater', {
          customVoltage: 230,
          customPowerWatts: 230 ** 2 / r,
          customMaxVolts: 500,
        }),
      ),
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

export function threePhaseAcceptanceCircuits(): Record<string, Circuit> {
  const reverse = threePhaseStarFixture();
  reverse.components[0]!.state.sourceProfile = explicitSupplyProfile({
    kind: 'ac-three-phase',
    voltage: 400 / Math.sqrt(3),
    frequencyHz: 60,
    sequence: 'acb',
  });
  const open = threePhaseStarFixture();
  open.wires[0]!.fault = 'open-circuit';
  const short = threePhaseStarFixture();
  short.wires.push(leadFixture('interphase', 's', 0, 's', 1));
  const independent = threePhaseStarFixture();
  independent.components.push(
    C('other', 'ac-mains-supply', {
      sourceProfile: explicitSupplyProfile({
        kind: 'ac-single-phase',
        voltage: 120,
        frequencyHz: 60,
      }),
    }),
    C('other-load', 'space-heater', { customVoltage: 120, customPowerWatts: 1200 }),
  );
  independent.wires.push(
    leadFixture('other-feed', 'other', 0, 'other-load', 0),
    leadFixture('other-return', 'other-load', 1, 'other', 1),
  );
  const joined: Circuit = JSON.parse(JSON.stringify(independent));
  joined.wires.push(leadFixture('join', 's', 3, 'other', 1));
  const motor: Circuit = {
    components: [C('s', 'ac-three-phase-supply'), C('motor', 'motor-3phase')],
    wires: [leadFixture('only-live', 's', 0, 'motor', 0)],
  };
  const delta: Circuit = {
    components: [
      C('s', 'ac-three-phase-supply'),
      ...[0, 1, 2].map((i) =>
        C(`r${i}`, 'space-heater', {
          customVoltage: 400,
          customPowerWatts: 4000,
          customMaxVolts: 500,
        }),
      ),
    ],
    wires: [0, 1, 2].flatMap((i) => [
      leadFixture(`feed${i}`, 's', i, `r${i}`, 0),
      leadFixture(`return${i}`, `r${i}`, 1, 's', (i + 1) % 3),
    ]),
  };
  return {
    balanced: threePhaseStarFixture(),
    unbalanced: threePhaseStarFixture([23, 46, 92]),
    'floating-star': threePhaseStarFixture([23, 46, 92], false),
    delta,
    'reverse-400v': reverse,
    'open-phase': open,
    interphase: short,
    independent,
    'joined-frequency': joined,
    'single-live-motor': motor,
  };
}
