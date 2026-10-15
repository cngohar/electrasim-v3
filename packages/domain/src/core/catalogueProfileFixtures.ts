import { COMPONENT_DEFS } from '../components';
import { component as C } from '../simulation/auditFixtures';
import type { Circuit, ComponentState } from '../types';
import { catalogueProfileKind, isLampType } from './catalogueProfiles';
import { leadFixture as W, resistorFixture, sourceFixture } from './mnaFixtures';
import { normalizeCircuitDocument } from './normalize';
import { explicitSupplyProfile } from './supplies';

export function profileLoadFixture(
  type = 'bulb',
  voltage = 230,
  state: ComponentState = {},
): Circuit {
  return {
    components: [
      sourceFixture('s', { kind: 'ac-single-phase', voltage, frequencyHz: 50 }),
      C('load', type, state),
    ],
    wires: [W('feed', 's', 0, 'load', 0), W('return', 'load', 1, 's', 1)],
  };
}
export function pvFixture(resistance = 2.56): Circuit {
  return {
    components: [C('pv', 'solar-pv-panel'), resistorFixture('load', resistance)],
    wires: [W('feed', 'pv', 0, 'load', 0), W('return', 'load', 1, 'pv', 1)],
  };
}
export function autoTransformerFixture(reverse = false): Circuit {
  return {
    components: [
      sourceFixture('s', {
        kind: 'ac-single-phase',
        voltage: reverse ? 110 : 230,
        frequencyHz: 50,
      }),
      C('auto', 'step-up-down-transformer'),
      resistorFixture('load', 121),
    ],
    wires: [
      W('feed', 's', 0, 'auto', reverse ? 0 : 2),
      W('return', 'auto', reverse ? 1 : 3, 's', 1),
      W('out', 'auto', reverse ? 2 : 0, 'load', 0),
      W('out-return', 'load', 1, 'auto', reverse ? 3 : 1),
    ],
  };
}
export function spdFixture(voltage = 230): Circuit {
  const circuit = profileLoadFixture('spd', voltage);
  circuit.wires.push(W('pe-bond', 's', 1, 'load', 2));
  return circuit;
}
export function ntcDividerFixture(temperatureC = 25): Circuit {
  return {
    components: [
      sourceFixture('s', { kind: 'dc', voltage: 12 }),
      resistorFixture('fixed', 10000),
      C('load', 'temperature-sensor', {
        catalogueProfile: {
          version: 1,
          provenance: 'editable-teaching-assumption',
          kind: 'ntc',
          resistanceAt25Ohms: 10000,
          betaKelvin: 3950,
          temperatureC,
        },
      }),
    ],
    wires: [
      W('feed', 's', 0, 'fixed', 0),
      W('mid', 'fixed', 1, 'load', 0),
      W('return', 'load', 1, 's', 1),
    ],
  };
}
export function threePhaseProfileFixture(type = 'ceiling-fan'): Circuit {
  return {
    supply: explicitSupplyProfile({
      kind: 'ac-three-phase',
      voltage: 230,
      frequencyHz: 50,
      sequence: 'abc',
    }),
    components: [
      C('s', 'ac-three-phase-supply'),
      C('star', 'wago-connector'),
      ...[0, 1, 2].map((i) => C(`load${i}`, type)),
    ],
    wires: [0, 1, 2]
      .flatMap((i) => [
        W(`feed${i}`, 's', i, `load${i}`, 0),
        W(`return${i}`, `load${i}`, 1, 'star', 0),
      ])
      .concat(W('neutral', 'star', 0, 's', 3)),
  };
}
export function autoProfileFixture(): Circuit {
  const circuit = autoTransformerFixture();
  circuit.components[2] = C('load', 'bulb', { customVoltage: 110, customPowerWatts: 9 });
  return circuit;
}
export function catalogueProfileAcceptanceCircuits(): Record<string, Circuit> {
  const fixtures: Record<string, Circuit> = {};
  for (const type of Object.keys(COMPONENT_DEFS)) {
    if (isLampType(type) || catalogueProfileKind(type) === 'appliance')
      fixtures[type] = profileLoadFixture(type);
  }
  for (const v of [12, 207, 230, 280]) fixtures[`lamp-${v}v`] = profileLoadFixture('bulb', v);
  fixtures.pv = pvFixture();
  fixtures['auto-step-down'] = autoTransformerFixture();
  fixtures['auto-step-up'] = autoTransformerFixture(true);
  fixtures['spd-normal'] = spdFixture();
  fixtures['spd-clamp'] = spdFixture(330);
  for (const t of [0, 25, 50]) fixtures[`ntc-${t}c`] = ntcDividerFixture(t);
  const open = profileLoadFixture();
  open.wires.pop();
  fixtures['lamp-open-return'] = open;
  fixtures['three-phase-fans'] = threePhaseProfileFixture();
  fixtures['three-phase-lamps'] = threePhaseProfileFixture('bulb');
  fixtures['auto-lamp'] = autoProfileFixture();
  for (const [type, modes] of [
    ['washing-machine', ['off', 'standby', 'heating', 'motor', 'combined']],
    ['smoke-alarm', ['standby', 'alarm', 'off']],
    ['air-conditioner', ['active', 'standby', 'off']],
  ] as const) {
    for (const mode of modes) {
      const c = normalizeCircuitDocument(profileLoadFixture(type));
      const p = c.components[1]!.state.catalogueProfile!;
      if (p.kind === 'appliance') p.mode = mode;
      fixtures[`${type}-${mode}`] = c;
    }
  }
  return fixtures;
}
