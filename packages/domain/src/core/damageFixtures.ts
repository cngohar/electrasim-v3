import type { Circuit } from '../types';
import { protectionCircuit } from './protectionFixtures';

/** Three 1 m / 1 mm² copper wires, 52.9 Ω load. I = 230 / (52.9 + 0.0525). */
export function damageCircuit(
  kind: 'wire' | 'device-current' | 'device-voltage' = 'wire',
): Circuit {
  const circuit = protectionCircuit('mcb', 32);
  circuit.components[1] = {
    ...circuit.components[1]!,
    type: 'single-way-switch',
    state: { on: true },
  };
  const currentModel = {
    version: 1,
    kind: 'overcurrent',
    continuousCurrentAmps: 2,
    withstandAmpSquaredSeconds: 10,
  } as const;
  if (kind === 'wire') circuit.wires[1]!.damageModel = currentModel;
  else
    circuit.components[2]!.state.damageModel =
      kind === 'device-current'
        ? currentModel
        : {
            version: 1,
            kind: 'overvoltage',
            maximumVoltageVolts: 200,
            withstandVoltSquaredSeconds: 6000,
          };
  return circuit;
}

export function protectedDamageCircuit(bypassed = false): Circuit {
  const circuit = protectionCircuit('mcb', 0.5);
  circuit.wires[1]!.damageModel = damageCircuit().wires[1]!.damageModel;
  if (bypassed) circuit.components[1]!.state.fault = 'protection-bypass';
  return circuit;
}

export function damageAcceptanceCircuits(): Record<string, Circuit> {
  return {
    cable: damageCircuit(),
    'device-current': damageCircuit('device-current'),
    'device-voltage': damageCircuit('device-voltage'),
    'protection-clears-first': protectedDamageCircuit(),
    'bypass-leaves-stress': protectedDamageCircuit(true),
    'sacrificial-fuse': protectionCircuit('fuse', 1),
  };
}
