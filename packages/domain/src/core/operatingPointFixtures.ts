/** Fixed-rating 1.5C.2 fixtures shared with localhost runtime parity. */
import { component as C } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import { leadFixture as W, sourceFixture } from './mnaFixtures';

export function heaterFixture(voltage = 230, lengthMeters = 10): Circuit {
  return {
    components: [
      sourceFixture('s', { kind: 'ac-single-phase', voltage, frequencyHz: 50 }),
      C('heater', 'space-heater', { customVoltage: 230, customPowerWatts: 2000 }),
    ],
    wires: [W('feed', 's', 0, 'heater', 0), W('return', 'heater', 1, 's', 1)].map((wire) => ({
      ...wire,
      lengthMeters,
    })),
  };
}

export function protectedBranchesFixture(): Circuit {
  return {
    components: [
      sourceFixture('s', { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 }),
      C('joint', 'terminal-strip'),
      C('lamp-breaker', 'mcb', { on: true, customMaxAmps: 1 }),
      C('heater-breaker', 'mcb', { on: true, customMaxAmps: 16 }),
      C('lamp', 'bulb-incandescent'),
      C('heater', 'space-heater'),
    ],
    wires: [
      W('feeder', 's', 0, 'joint', 0),
      ...['lamp', 'heater'].flatMap((id) => [
        W(`${id}-feed`, 'joint', 2, `${id}-breaker`, 0),
        W(`${id}-switched`, `${id}-breaker`, 1, id, 0),
        W(`${id}-return`, id, 1, 's', 1),
      ]),
    ],
  };
}

export function operatingPointAcceptanceCircuits(): Record<string, Circuit> {
  const cases: Record<string, Circuit> = {};
  for (const voltage of [230, 120, 48, 24, 12]) cases[`heater-${voltage}`] = heaterFixture(voltage);
  for (const length of [100, 1000]) cases[`long-cable-${length}`] = heaterFixture(230, length);
  const aluminum = heaterFixture();
  for (const wire of aluminum.wires) wire.material = 'aluminum';
  cases.aluminum = aluminum;
  const awg = heaterFixture();
  for (const wire of awg.wires) {
    wire.customCableMm2 = undefined;
    wire.gauge = 16;
  }
  cases.awg = awg;
  const open = heaterFixture();
  open.wires[1]!.fault = 'open-circuit';
  cases.open = open;
  const led = heaterFixture(12);
  led.components[1] = C('heater', 'bulb');
  cases['unknown-led'] = led;
  const overvoltage = heaterFixture(400);
  overvoltage.components[1]!.state.customMaxVolts = 250;
  cases.overvoltage = overvoltage;
  cases['protected-branches'] = protectedBranchesFixture();
  const independent = heaterFixture();
  independent.components.push(
    sourceFixture('dc', { kind: 'dc', voltage: 12 }),
    C('dc-load', 'heating-element', { customVoltage: 12, customPowerWatts: 24 }),
  );
  independent.wires.push(
    W('dc-feed', 'dc', 0, 'dc-load', 0),
    W('dc-return', 'dc-load', 1, 'dc', 1),
  );
  cases.independent = independent;
  return cases;
}
