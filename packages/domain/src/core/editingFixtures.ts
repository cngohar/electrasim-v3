import { component as C, wire as W } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import { normalizeCircuitDocument } from './normalize';
import { explicitSupplyProfile } from './supplies';

export function editingCircuit(): Circuit {
  return normalizeCircuitDocument({
    supply: explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 }),
    globalVoltage: 230,
    components: [
      { ...C('l', 'live-terminal'), x: 120, y: 120 },
      { ...C('n', 'neutral-terminal'), x: 120, y: 310 },
      { ...C('pe', 'earth-terminal'), x: 120, y: 480 },
      {
        ...C('heater', 'space-heater', { customVoltage: 230, customPowerWatts: 2000 }),
        x: 460,
        y: 180,
      },
      { ...C('switch', 'single-way-switch', { on: true }), x: 420, y: 430 },
      {
        ...C('independent', 'ac-mains-supply', {
          sourceProfile: explicitSupplyProfile({
            kind: 'ac-single-phase',
            voltage: 12,
            frequencyHz: 60,
          }),
        }),
        x: 760,
        y: 120,
      },
      {
        ...C('other-load', 'space-heater', { customVoltage: 12, customPowerWatts: 10 }),
        x: 1040,
        y: 120,
      },
    ],
    wires: [
      W('feed', 'l', 0, 'heater', 0),
      W('return', 'heater', 1, 'n', 0),
      W('other-feed', 'independent', 0, 'other-load', 0),
      W('other-return', 'other-load', 1, 'independent', 1),
    ],
    faults: [],
  });
}

export function variantCircuit(): Circuit {
  const circuit = editingCircuit();
  circuit.components.push(
    C('breaker', 'mcb', {
      on: false,
      customMaxAmps: 7,
      customMaxVolts: 440,
      customVoltage: 110,
      autoLabel: 'CB7',
      fault: 'protection-bypass',
    }),
  );
  circuit.wires[0] = W('feed', 'l', 0, 'breaker', 0);
  circuit.wires.push(W('breaker-out', 'breaker', 1, 'heater', 0));
  circuit.faults = [
    {
      id: 'port-fault',
      type: 'terminal-disconnect',
      category: 'conductor',
      target: { type: 'port', componentId: 'breaker', portIndex: 1 },
      createdAt: 0,
    },
  ];
  return circuit;
}
