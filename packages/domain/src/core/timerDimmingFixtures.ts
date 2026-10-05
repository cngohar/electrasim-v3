import { component as C, wire as W } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import { explicitSupplyProfile } from './supplies';
import type { TimerModel } from './timerModel';

export function dimmingCircuit(speed = 0.75): Circuit {
  return {
    supply: explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 }),
    globalVoltage: 230,
    components: [
      C('source', 'ac-mains-supply'),
      C('control', 'dimmer-switch', { on: true, speed }),
      C('lamp', 'bulb-incandescent', { customVoltage: 230, customPowerWatts: 230 }),
    ].map((component, index) => ({ ...component, x: 160 + index * 300, y: 300 })),
    wires: [
      W('feed', 'source', 0, 'control', 0),
      W('output', 'control', 1, 'lamp', 0),
      W('return', 'lamp', 1, 'source', 1),
    ].map((wire) => ({ ...wire, lengthMeters: 1, customCableMm2: 1, material: 'copper' as const })),
  };
}

export function timerCircuit(type = 'timer-switch', program?: TimerModel): Circuit {
  const circuit = dimmingCircuit();
  const timer = circuit.components.find((c) => c.id === 'control')!;
  timer.type = type;
  const weekly = type === 'digital-weekly-timer';
  timer.state = {
    on: true,
    timerModel:
      program ??
      (type === 'staircase-timer' || type === 'countdown-timer'
        ? {
            version: 1,
            kind: 'interval',
            durationSeconds: 2,
            retrigger: 'restart',
            ...(type === 'countdown-timer'
              ? {
                  controlSupply: {
                    supply: { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
                    nominalPowerWatts: 1,
                    minimumVoltageRatio: 0.8,
                  } as const,
                }
              : {}),
          }
        : {
            version: 1,
            kind: 'schedule',
            periodSeconds: weekly ? 604_800 : 86_400,
            offsetSeconds: 0,
            windows: [
              { startSeconds: 1, endSeconds: 2 },
              { startSeconds: 3, endSeconds: 4 },
            ],
          }),
  };
  if (type === 'countdown-timer') {
    circuit.wires.find((w) => w.id === 'output')!.fromPortIndex = 2;
    circuit.wires.push({
      ...W('electronics-return', 'control', 1, 'source', 1),
      lengthMeters: 1,
      customCableMm2: 1,
      material: 'copper',
    });
  }
  return circuit;
}

export function setTimerInput(circuit: Circuit, on: boolean): Circuit {
  return {
    ...circuit,
    components: circuit.components.map((c) =>
      c.id === 'control' ? { ...c, state: { ...c.state, on } } : c,
    ),
  };
}

export function timerDimmingAcceptanceCircuits(): Record<string, Circuit> {
  return {
    'dimmer-off': dimmingCircuit(0),
    'dimmer-quarter': dimmingCircuit(0.75),
    'dimmer-full': dimmingCircuit(3),
    daily: timerCircuit(),
    weekly: timerCircuit('digital-weekly-timer'),
    staircase: timerCircuit('staircase-timer'),
    countdown: timerCircuit('countdown-timer'),
  };
}
