import { component as C } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import { leadFixture } from './mnaFixtures';
import type { MotorModel } from './motorModel';
import { explicitSupplyProfile } from './supplies';

export const motorFixtureModel = (): MotorModel => ({
  version: 1,
  kind: 'balanced-resistive',
  nominalLineVoltage: 400,
  inputPowerWatts: 3000,
  frequencyHz: 50,
  operatingLineVoltageRange: { min: 360, max: 440 },
  maximumUnbalanceRatio: 0.02,
  requiredSequence: 'abc',
});

/** Motor terminal indices and existing contactor power ports are portable. */
export function motorCircuit(controlled = false): Circuit {
  return {
    components: [
      C('s', 'ac-three-phase-supply', {
        sourceProfile: explicitSupplyProfile({
          kind: 'ac-three-phase',
          voltage: 400 / Math.sqrt(3),
          frequencyHz: 50,
          sequence: 'abc',
        }),
      }),
      C('motor', 'motor-3phase', { motorModel: motorFixtureModel() }),
      ...(controlled
        ? [
            C('k', 'contactor-3p', {
              on: true,
              coilModel: {
                version: 1 as const,
                supply: { kind: 'ac-single-phase' as const, voltage: 230, frequencyHz: 50 },
                nominalPowerWatts: 8,
                pickupRatio: 0.8,
                dropoutRatio: 0.2,
                onDelaySeconds: 1,
                offDelaySeconds: 0.25,
              },
            }),
            C('control', 'single-way-switch', { on: true }),
          ]
        : []),
    ],
    wires: [
      ...[0, 1, 2].flatMap((i) =>
        controlled
          ? [
              leadFixture(`feed${i}`, 's', i, 'k', i),
              leadFixture(`out${i}`, 'k', i + 3, 'motor', i),
            ]
          : [leadFixture(`feed${i}`, 's', i, 'motor', i)],
      ),
      ...(controlled
        ? [
            leadFixture('control-feed', 's', 0, 'control', 0),
            leadFixture('coil-feed', 'control', 1, 'k', 6),
            leadFixture('coil-return', 'k', 7, 's', 3),
          ]
        : []),
    ],
  };
}

export function motorAcceptanceCircuits(): Record<string, Circuit> {
  const reverse = motorCircuit();
  reverse.wires[1]!.toPortIndex = 2;
  reverse.wires[2]!.toPortIndex = 1;
  const loss = motorCircuit();
  loss.wires[1]!.fault = 'open-circuit';
  const single = motorCircuit();
  single.wires = single.wires.slice(0, 1);
  const unbalanced = motorCircuit();
  unbalanced.wires[0]!.lengthMeters = 2000;
  const frequency = motorCircuit();
  frequency.components[0]!.state.sourceProfile!.model = {
    kind: 'ac-three-phase',
    voltage: 400 / Math.sqrt(3),
    frequencyHz: 60,
    sequence: 'abc',
  };
  const stopped = motorCircuit(true);
  stopped.components.find((c) => c.id === 'control')!.state.on = false;
  const residual = motorCircuit(true);
  residual.components.push(
    C('extra', 'space-heater', { customVoltage: 230, customPowerWatts: 2300 }),
  );
  residual.wires.push(
    leadFixture('extra-feed', 'k', 3, 'extra', 0),
    leadFixture('extra-return', 'extra', 1, 's', 3),
  );
  const independent = motorCircuit();
  independent.components.push(
    C('p', 'contactor-4p', { on: true }),
    C('other', 'ac-mains-supply', {
      sourceProfile: explicitSupplyProfile({
        kind: 'ac-single-phase',
        voltage: 120,
        frequencyHz: 60,
      }),
    }),
    C('other-load', 'space-heater', { customVoltage: 120, customPowerWatts: 120 }),
  );
  independent.wires[0]!.toComponentId = 'p';
  independent.wires.push(
    leadFixture('p-out', 'p', 4, 'motor', 0),
    leadFixture('p-other', 'other', 0, 'p', 1),
    leadFixture('p-load', 'p', 5, 'other-load', 0),
    leadFixture('other-return', 'other-load', 1, 'other', 1),
  );
  return {
    balanced: motorCircuit(),
    'lost-phase': loss,
    'single-live': single,
    'reversed-leads': reverse,
    unbalanced,
    'wrong-frequency': frequency,
    contactor: motorCircuit(true),
    stopped,
    'sensed-residual': residual,
    'independent-poles': independent,
  };
}
