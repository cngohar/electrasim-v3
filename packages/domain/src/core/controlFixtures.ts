import { component as C, wire as W } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import type { CoilModel } from './coilModel';
import { explicitSupplyProfile } from './supplies';

export function controlCircuit(overrides: Partial<CoilModel> = {}): Circuit {
  return {
    globalVoltage: 12,
    supply: explicitSupplyProfile({ kind: 'dc', voltage: 12 }),
    components: [
      C('dc', 'live-terminal'),
      C('dc-return', 'neutral-terminal'),
      C('ac', 'ac-mains-supply', {
        sourceProfile: explicitSupplyProfile({
          kind: 'ac-single-phase',
          voltage: 230,
          frequencyHz: 50,
        }),
      }),
      C('switch', 'single-way-switch', { on: true }),
      C('relay', 'relay-spdt', {
        on: false,
        coilModel: {
          version: 1,
          supply: { kind: 'dc', voltage: 12 },
          nominalPowerWatts: 1,
          pickupRatio: 0.8,
          dropoutRatio: 0.2,
          onDelaySeconds: 1,
          offDelaySeconds: 0.25,
          ...overrides,
        },
      }),
      C('no', 'space-heater', { customVoltage: 230, customPowerWatts: 230 }),
      C('nc', 'space-heater', { customVoltage: 230, customPowerWatts: 230 }),
    ].map((component, i) => ({
      ...component,
      x: 200 + (i % 3) * 270,
      y: 200 + Math.floor(i / 3) * 300,
    })),
    wires: [
      W('coil-feed', 'dc', 0, 'switch', 0),
      W('coil-switch', 'switch', 1, 'relay', 0),
      W('coil-return', 'relay', 1, 'dc-return', 0),
      W('contact-feed', 'ac', 0, 'relay', 2),
      W('no-feed', 'relay', 3, 'no', 0),
      W('nc-feed', 'relay', 4, 'nc', 0),
      W('no-return', 'no', 1, 'ac', 1),
      W('nc-return', 'nc', 1, 'ac', 1),
    ].map((wire) => ({ ...wire, lengthMeters: 1, customCableMm2: 1, material: 'copper' as const })),
  };
}

export function setControlSupply(circuit: Circuit, voltage: number): Circuit {
  return {
    ...circuit,
    globalVoltage: voltage,
    supply: explicitSupplyProfile({ kind: 'dc', voltage }),
  };
}

export function setControlSwitch(circuit: Circuit, on: boolean): Circuit {
  return {
    ...circuit,
    components: circuit.components.map((component) =>
      component.id === 'switch' ? { ...component, state: { ...component.state, on } } : component,
    ),
  };
}
