import { describe, expect, it } from 'vitest';
import { validateCircuitJSON } from '../circuitFormat';
import { validateCircuit } from '../circuitValidation';
import { createInjectedFault } from '../faults';
import { isFuseDevice } from '../protectionRoles';
import type { Circuit } from '../types';
import { component as C, wire as W, parallelLoads, protectedLoad } from './auditFixtures';
import { simulate } from './simulate';

describe('Phase 1.5A independent audit regressions', () => {
  it('N8/N23: basic and Pro report the same solved overload with timed clearing unassessed', () => {
    const circuit = protectedLoad();
    const basic = simulate(circuit, { appMode: 'basic' });
    expect(basic).toEqual(simulate(circuit, { appMode: 'pro' }));
    expect(basic.trippedComponents).toBeUndefined();
    const pole = basic.electrical?.deviceCurrents.find((item) => item.componentId === 'device');
    expect(pole).toMatchObject({ capacityComparison: 'exceeded', trip: 'not-assessed' });
    expect(pole?.currentAmps).toBeCloseTo(230 / (230 ** 2 / 7400 + 0.21), 9);
    expect(basic.blownComponents ?? []).toEqual([]);
    expect(circuit.components[2].state).toEqual({ on: true, customMaxAmps: 16 });
    expect(basic.electrical?.diagnostics.some((d) => d.code === 'wire-capacity-exceeded')).toBe(
      true,
    );
  });

  it('N9: an isolator never auto-trips, and cable ampacity never replaces the B32 nameplate', () => {
    const circuit = protectedLoad('mcb', 7400, 32);
    circuit.components.push(C('isolator', 'main-switch', { on: true, customMaxAmps: 100 }));
    circuit.wires[0] = W('feed', 'isolator', 2, 'device', 0);
    circuit.wires.push(
      W('isolator-in', 'l', 0, 'isolator', 0),
      W('isolator-neutral', 'n', 0, 'isolator', 1),
    );
    const result = simulate(circuit);
    // 32.174 A is below 1.13 x 32 A; undersized cable is still reported separately.
    expect(result.trippedComponents ?? []).toEqual([]);
    expect(result.blownComponents ?? []).toEqual([]);
    expect(result.overloadedWires?.size).toBeGreaterThan(0);
  });

  it('N23: a fuse overload has no invented clearing time or instantaneous link damage', () => {
    const result = simulate(protectedLoad('fuse', 7400, 13));
    expect(isFuseDevice('fuse')).toBe(true);
    expect(isFuseDevice('mcb')).toBe(false);
    expect(result.blownComponents).toBeUndefined();
    expect(result.electrical?.deviceCurrents[0]).toMatchObject({
      capacityComparison: 'exceeded',
      trip: 'not-assessed',
    });
    expect(result.trippedComponents?.[0].clearingTimeSeconds).toBeUndefined();
    expect(result.trippedComponents?.[0].mechanism).toBeUndefined();
  });

  it.each(['rcd', 'main-switch'])(
    'N9/N24: %s reports overload without inventing an overcurrent trip',
    (type) => {
      const result = simulate(protectedLoad(type, 7400, 16));
      expect(result.trippedComponents ?? []).toEqual([]);
      expect(result.blownComponents ?? []).toEqual([]);
      expect(
        result.electrical?.deviceCurrents
          .filter((p) => p.componentId === 'device')
          .every((p) => !p.protection.overcurrent && p.trip === 'not-assessed'),
      ).toBe(true);
    },
  );

  it.each(['rcd', 'rcbo', 'main-switch'])(
    'N24: physical balanced L-N short respects %s capabilities',
    (type) => {
      const circuit = protectedLoad(type, 9, 32);
      circuit.wires.push(W('short', 'device', 2, 'device', 3));
      const result = simulate(circuit);
      expect(result.errors.some((e) => e.includes('Short circuit'))).toBe(true);
      const trips = result.trippedComponents ?? [];
      expect(trips).toEqual([]);
      expect(
        result.electrical?.deviceCurrents.find((p) => p.componentId === 'device')?.protection
          .overcurrent,
      ).toBe(type === 'rcbo');
    },
  );

  it.each(['wire', 'component', 'port'] as const)(
    'N24: injected %s short never operates a plain RCCB',
    (targetType) => {
      const circuit = protectedLoad('rcd', 9, 80);
      const target =
        targetType === 'wire'
          ? { type: targetType, id: 'branch' }
          : targetType === 'component'
            ? { type: targetType, id: 'load' }
            : { type: targetType, componentId: 'load', portIndex: 0 };
      circuit.faults = [createInjectedFault('short-circuit', target)];
      expect(simulate(circuit).trippedComponents ?? []).toEqual([]);
    },
  );

  it('N24: residual leakage still operates the RCCB when the injected wire begins at the RCCB', () => {
    const circuit = protectedLoad('rcd', 9, 80);
    circuit.faults = [createInjectedFault('live-to-earth', { type: 'wire', id: 'branch' })];
    const result = simulate(circuit);
    expect(result.trippedComponents).toEqual([
      expect.objectContaining({
        id: 'device',
        cause: 'ground-fault',
        mechanism: 'residual',
        ratingAmps: 0.03,
      }),
    ]);
  });

  it('N22: forced-open interrupts supply and bypass prevents overload and injected-short trips', () => {
    const circuit = protectedLoad();
    circuit.faults = [
      createInjectedFault('protection-forced-open', { type: 'component', id: 'device' }),
    ];
    expect(simulate(circuit).energizedComponents.has('load')).toBe(false);
    circuit.faults = [
      createInjectedFault('protection-bypass', { type: 'component', id: 'device' }),
    ];
    expect(simulate(circuit).trippedComponents ?? []).toEqual([]);
    circuit.faults.push(createInjectedFault('short-circuit', { type: 'component', id: 'load' }));
    const bypassed = simulate(circuit);
    expect(bypassed.trippedComponents ?? []).toEqual([]);
    expect(bypassed.blownComponents ?? []).toEqual([]);
    expect(bypassed.errors.length).toBeGreaterThan(0);
  });

  it('N25: overvoltage reports incompatibility without inventing a damage transition', () => {
    const circuit = protectedLoad('mcb', 9);
    circuit.components[3].state.customMaxVolts = 110;
    const result = simulate(circuit);
    expect(result.blownComponents).toBeUndefined();
    expect(result.electrical?.loads[0]).toMatchObject({
      compatibility: { status: 'incompatible' },
      damage: 'not-assessed',
    });
  });

  it.each([
    'transformer-8v',
    'transformer-12v',
    'transformer-24v',
    'step-up-down-transformer',
    'solar-pv-panel',
    'motor-3phase',
    'distribution-board-3phase',
  ])('2.4/N11/N12/N27: %s cannot produce false measurements or destructive effects', (type) => {
    const circuit = protectedLoad('mcb', 9);
    circuit.components.push(C('unsupported', type));
    const snapshot = JSON.stringify(circuit);
    const result = simulate(circuit);
    expect(result.modelLimitations?.some((item) => item.blocking)).toBe(true);
    expect(result.electrical?.status).not.toBe('converged');
    expect(result.energizedComponents.size).toBe(0);
    expect(result.componentCalculations).toBeUndefined();
    expect(result.wireCalculations).toBeUndefined();
    expect(result.trippedComponents).toBeUndefined();
    expect(result.blownComponents).toBeUndefined();
    expect(result.bustedWires).toBeUndefined();
    expect(result.faultsCleared).toBe(false);
    expect(JSON.stringify(circuit)).toBe(snapshot);
    const validation = validateCircuit(circuit, result);
    expect(validation.status).toBe('fail');
    expect(validation.issues.some((i) => i.category === 'configuration' && i.blocking)).toBe(true);
    expect(validation.issues.some((i) => i.id === 'sim_active_fault')).toBe(false);
  });

  it.each(['timer-switch', 'dimmer-switch'])(
    '2.7/N15: %s exposes its manual-only model in simulation and validation',
    (type) => {
      const circuit = protectedLoad('mcb', 9);
      circuit.components.push(C('limited', type, { on: true }));
      const result = simulate(circuit);
      expect(result.modelLimitations?.[0].blocking).toBe(false);
      expect(result.warnings.some((w) => w.includes('not assessed'))).toBe(true);
      expect(validateCircuit(circuit).status).not.toBe('pass');
    },
  );

  it('N17: file validation still rejects unknown types and bad port indices', () => {
    const circuit = protectedLoad('mcb', 9);
    circuit.wires[0].fromPortIndex = 99;
    expect(validateCircuitJSON({ version: 1, circuit })).toContain('out of range');
    circuit.components[0].type = 'unknown';
    expect(validateCircuitJSON({ version: 1, circuit })).toContain('Unknown component');
  });
});

/** Independent expectations promoted as the application adopts accepted models.
 * Static bypass/polarity coverage does not claim timed devices or complete lab migration.
 */
describe('Audit acceptance promoted through 1.5C.5', () => {
  it('2.1 / 1.5C.5: series heaters include the declared lead resistance', () => {
    const circuit: Circuit = {
      globalVoltage: 12,
      components: [
        C('l', 'live-terminal'),
        C('n', 'neutral-terminal'),
        C('r1', 'space-heater', { customPowerWatts: 24, customVoltage: 12 }),
        C('r2', 'space-heater', { customPowerWatts: 24, customVoltage: 12 }),
      ],
      wires: [
        W('feed', 'l', 0, 'r1', 0),
        W('series', 'r1', 1, 'r2', 0),
        W('return', 'r2', 1, 'n', 0),
      ],
    };
    const result = simulate(circuit);
    const current = 12 / (12 + 3 * 0.07);
    expect(result.wireCalculations?.feed.currentAmps).toBeCloseTo(current, 9);
    expect(result.componentCalculations?.r1.voltage).toBeCloseTo(6 * current, 9);
  });

  it('2.2 / 1.5C.5: independent resistive heater/lamp branches use their own impedance', () => {
    const circuit = parallelLoads();
    circuit.components[3] = C('lamp', 'bulb-incandescent', { customPowerWatts: 9 });
    const result = simulate(circuit);
    expect(result.wireCalculations?.['heater-feed'].currentAmps).toBeCloseTo(
      230 / (230 ** 2 / 2000 + 0.14),
      9,
    );
    expect(result.wireCalculations?.['lamp-feed'].currentAmps).toBeCloseTo(
      230 / (230 ** 2 / 9 + 0.14),
      9,
    );
  });

  it('N13 / 1.5B: omitted on uses the MCB catalogue default; explicit off remains off', () => {
    const circuit = protectedLoad('mcb', 9);
    circuit.components[2].state = { customMaxAmps: 16 };
    expect(simulate(circuit).energizedComponents.has('load')).toBe(true);
    circuit.components[2].state.on = false;
    expect(simulate(circuit).energizedComponents.has('load')).toBe(false);
  });

  it('N10 / 1.5C.5: 12 V does not become a spurious 110 V equipment error', () => {
    const circuit = protectedLoad('mcb', 9);
    circuit.globalVoltage = 12;
    expect(simulate(circuit).errors.some((e) => e.includes('110V rated equipment'))).toBe(false);
  });

  it('N22 / 1.5C.5 static topology: bypass also shunts a manually opened breaker', () => {
    const circuit = protectedLoad('mcb', 9);
    circuit.components[2].state.on = false;
    circuit.faults = [
      createInjectedFault('protection-bypass', { type: 'component', id: 'device' }),
    ];
    expect(simulate(circuit).energizedComponents.has('load')).toBe(true);
  });

  it('N26 / 1.5B: direct validation cannot pass invalid port indices', () => {
    const circuit = parallelLoads();
    circuit.wires[0].fromPortIndex = 99;
    expect(validateCircuit(circuit).status).toBe('fail');
  });

  it('N26 / 1.5C.5 shared polarity finding: a physically reversed load connection is reported without an injected fault', () => {
    const circuit = protectedLoad('mcb', 9);
    circuit.wires[1].toPortIndex = 1;
    circuit.wires[2].fromPortIndex = 0;
    expect(validateCircuit(circuit).issues.some((i) => i.category === 'polarity')).toBe(true);
  });
});
