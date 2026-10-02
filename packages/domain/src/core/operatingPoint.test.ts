import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from '../circuitFormat';
import { COMPONENT_DEFS } from '../components';
import { getMillivoltAmpMeter } from '../electricalCalculations';
import { component as C } from '../simulation/auditFixtures';
import type { ComponentDef } from '../types';
import { compileCircuit } from './compile';
import type { ElectricalDeviceModel } from './contracts';
import { terminalId } from './faultTopology';
import { solveCircuit, voltageBetween } from './mna';
import { leadFixture as W, seriesFixture } from './mnaFixtures';
import {
  heaterFixture,
  operatingPointAcceptanceCircuits,
  protectedBranchesFixture,
} from './operatingPointFixtures';
import { assessCompiledCircuitReadiness } from './readiness';
import { explicitSupplyProfile } from './supplies';
import { assessWireCapacity } from './wireCapacity';
import { resolveWireProperties } from './wireProperties';

function near(actual: number | null | undefined, expected: number) {
  expect(actual).toBeTypeOf('number');
  expect(Math.abs(actual! - expected)).toBeLessThanOrEqual(1e-9 + Math.abs(expected) * 1e-6);
}
const heaterModel: ElectricalDeviceModel = {
  kind: 'resistive-load',
  ports: [0, 1],
  resistanceOhms: 26.45,
  nominalVoltage: 230,
  nominalPowerWatts: 2000,
  supplyKinds: ['ac-single-phase', 'dc'],
  operatingVoltageRange: { min: 200, max: 250 },
  frequencyHz: [50],
  approximation: 'Fixed-resistance acceptance element, not a commercial appliance.',
};
const defsWith = (
  model: ElectricalDeviceModel,
  type = 'space-heater',
): Record<string, ComponentDef> => ({
  ...COMPONENT_DEFS,
  [type]: { ...COMPONENT_DEFS[type]!, electricalModel: model },
});

describe('1.5C.2 fixed-rating operating response', () => {
  it.each([230, 120, 48, 24, 12])(
    'keeps the 230 V / 2 kW element fixed at a %s V source',
    (voltage) => {
      const circuit = heaterFixture(voltage);
      const before = JSON.stringify(circuit);
      const result = solveCircuit(circuit);
      expect(result.status).toBe('converged');
      const load = result.loads[0]!;
      const current = voltage / (26.45 + 2 * 0.07);
      near(load.currentAmps, current);
      near(load.terminalVoltageVolts, current * 26.45);
      near(load.powerWatts, current ** 2 * 26.45);
      near(load.powerRatio, (current ** 2 * 26.45) / 2000);
      expect(load.response).toBe('below-nominal');
      expect(load.nominalVoltage).toMatchObject({ status: 'known', value: 230 });
      expect(load.nominalPowerWatts).toMatchObject({ status: 'known', value: 2000 });
      expect(load.damage).toBe('not-assessed');
      expect(result.checks!.maximumResidualRatio).toBeLessThanOrEqual(1);
      expect(result.assessment).toBe('not-assessed');
      expect(JSON.stringify(circuit)).toBe(before);
    },
  );

  it.each([
    [230, 8.695652173913043, 2000],
    [120, 4.536862003780718, 544.4234404536862],
    [48, 1.8147448015122873, 87.1077504725898],
    [24, 0.9073724007561437, 21.77693761814745],
    [12, 0.45368620037807184, 5.444234404536862],
  ])(
    'matches the independent %s V terminal reference including declared finite leads',
    (voltage, current, power) => {
      // Raise the source by I*R_leads so this test's stated voltage is AT THE LOAD.
      const result = solveCircuit(heaterFixture(voltage + current * 0.14));
      near(result.loads[0]?.terminalVoltageVolts, voltage);
      near(result.loads[0]?.currentAmps, current);
      near(result.loads[0]?.powerWatts, power);
    },
  );

  it('reduces actual load voltage and power on the 1000 m-per-conductor fixture', () => {
    const result = solveCircuit(heaterFixture(230, 1000));
    near(result.loads[0]?.currentAmps, 5.686032138442522);
    near(result.loads[0]?.terminalVoltageVolts, 150.3955500618047);
    near(result.loads[0]?.powerWatts, 855.153930882944);
    for (const wire of result.wires) {
      expect(wire.properties.resistanceOhms).toBe(7);
      near(wire.conductorDropVolts, 5.686032138442522 * 7);
      near(wire.lossWatts, 5.686032138442522 ** 2 * 7);
      expect(wire.resistanceBasis).toBe('one-conductor');
      expect(wire.resistanceTemperatureC).toBe(20);
    }
    near(
      result.loads[0]!.powerWatts! + result.wires.reduce((sum, wire) => sum + wire.lossWatts!, 0),
      230 * 5.686032138442522,
    );
    // The existing design table remains a TWO-conductor 70 C estimate, not a stamp.
    expect(getMillivoltAmpMeter(2.5, 'copper')).toBe(18);
  });

  it.each([
    ['copper', 1, 100, 0.0175],
    ['copper', 6, 10, 0.0175],
    ['aluminum', 2.5, 100, 0.0282],
    ['aluminum', 6, 1000, 0.0282],
  ] as const)(
    'solves %s %s mm2, %s m using its actual resistance',
    (material, area, length, rho) => {
      const circuit = heaterFixture(230, length);
      for (const wire of circuit.wires) Object.assign(wire, { material, customCableMm2: area });
      const result = solveCircuit(circuit);
      const resistance = (rho * length) / area;
      const current = 230 / (26.45 + 2 * resistance);
      near(result.loads[0]?.currentAmps, current);
      for (const wire of result.wires) {
        near(wire.properties.resistanceOhms, resistance);
        near(wire.lossWatts, current ** 2 * resistance);
        near(wire.conductorDropVolts, wire.terminalVoltageVolts!);
      }
    },
  );

  it('checks operating ranges against actual load voltage after cable drop', () => {
    const result = solveCircuit(heaterFixture(230, 1000), { defs: defsWith(heaterModel) });
    expect(result.status).toBe('converged');
    expect(
      result.readiness.groups.find((group) => group.componentId === 'heater')?.result.status,
    ).toBe('compatible');
    expect(result.loads[0]?.compatibility).toMatchObject({
      status: 'incompatible',
      reasons: expect.arrayContaining([
        expect.objectContaining({ code: 'undervoltage', basis: 'solved-terminal' }),
      ]),
    });
    expect(result.operation).toBe('incompatible');
    expect(result.diagnostics.some((d) => d.code === 'load-undervoltage')).toBe(true);
  });

  it.each([200, 250])(
    'accepts a solved %s V range boundary within the numerical tolerance',
    (voltage) => {
      const result = solveCircuit(heaterFixture(voltage * (1 + 0.14 / 26.45)), {
        defs: defsWith(heaterModel),
      });
      near(result.loads[0]!.terminalVoltageVolts, voltage);
      expect(result.loads[0]!.compatibility.status).toBe('compatible');
      expect(
        result.loads[0]!.compatibility.reasons.some(
          (r) => r.code === 'overvoltage' || r.code === 'undervoltage',
        ),
      ).toBe(false);
    },
  );

  it('does not invent 110 V dropout or 250 V damage limits for an unrated element', () => {
    for (const voltage of [12, 110, 400]) {
      const result = solveCircuit(heaterFixture(voltage));
      expect(result.status).toBe('converged');
      expect(result.loads[0]!.powerWatts).toBeGreaterThan(0);
      expect(
        result.loads[0]!.compatibility.reasons.some(
          (r) => r.code === 'overvoltage' || r.code === 'undervoltage',
        ),
      ).toBe(false);
      expect(result.loads[0]!.compatibility.status).toBe('unassessed');
      expect(result.operation).toBe('not-assessed');
      expect(result.loads[0]!.damage).toBe('not-assessed');
    }
    const circuit = heaterFixture(400);
    circuit.components[1]!.state.customMaxVolts = 250;
    const before = JSON.stringify(circuit);
    const result = solveCircuit(circuit);
    expect(result.loads[0]!.compatibility.status).toBe('incompatible');
    expect(result.loads[0]!.powerWatts).toBeGreaterThan(2000);
    expect(JSON.stringify(circuit)).toBe(before);
  });

  it('uses declared frequencies without turning an incompatible resistor into an unknown driver', () => {
    const circuit = heaterFixture();
    circuit.components[0]!.state.sourceProfile = explicitSupplyProfile({
      kind: 'ac-single-phase',
      voltage: 230,
      frequencyHz: 60,
    });
    const result = solveCircuit(circuit, { defs: defsWith(heaterModel) });
    expect(result.status).toBe('converged');
    expect(
      result.loads[0]!.compatibility.reasons.some((r) => r.code === 'frequency-mismatch'),
    ).toBe(true);
    expect(result.operation).toBe('incompatible');
  });

  it('keeps a mains LED at 12 V unassessed without inventing 0.75 A or a driver range', () => {
    const result = solveCircuit(operatingPointAcceptanceCircuits()['unknown-led']);
    expect(result.status).toBe('unsupported');
    expect(result.loads[0]).toMatchObject({
      response: 'not-assessed',
      currentAmps: null,
      powerWatts: null,
      terminalVoltageVolts: null,
      nominalPowerWatts: { status: 'known', value: 9 },
      compatibility: { status: 'unassessed' },
    });
    expect(result.loads[0]!.compatibility.reasons.map((r) => r.code)).toContain(
      'unsupported-model',
    );
    expect(result.loads[0]!.compatibility.reasons.map((r) => r.code)).toContain('unknown-rating');
    expect(result.wires.every((wire) => wire.currentAmps === null && wire.lossWatts === null)).toBe(
      true,
    );
  });

  it('reports a declared LED range provisionally while its driver law is unavailable', () => {
    const model: ElectricalDeviceModel = {
      kind: 'unassessed-load',
      ports: [0, 1],
      nominalPowerWatts: 9,
      nominalVoltage: 230,
      supplyKinds: ['ac-single-phase'],
      operatingVoltageRange: { min: 180, max: 250 },
      frequencyHz: [50, 60],
      reason: 'No driver law is declared.',
    };
    const result = solveCircuit(operatingPointAcceptanceCircuits()['unknown-led'], {
      defs: defsWith(model, 'bulb'),
    });
    expect(result.status).toBe('unsupported');
    expect(result.loads[0]!.compatibility.reasons).toContainEqual(
      expect.objectContaining({ code: 'undervoltage', basis: 'nominal-supply' }),
    );
    expect(result.loads[0]!.currentAmps).toBeNull();
  });

  it('retains a live open return with zero current and loss, distinct from conductor drop', () => {
    const result = solveCircuit(operatingPointAcceptanceCircuits().open);
    const wire = result.wires.find((item) => item.wireId === 'return')!;
    near(wire.currentAmps, 0);
    near(wire.lossWatts, 0);
    near(wire.terminalVoltageVolts, 230);
    expect(wire.conductorDropVolts).toBeNull();
    near(voltageBetween(result, terminalId('heater', 1), terminalId('s', 1)), 230);
    expect(result.loads[0]!.response).toBe('idle');
    expect(result.readiness.topology).toBe('open');
    expect(result.operation).toBe('idle');
  });

  it('keeps independent AC and DC load readings stable when the other supply changes', () => {
    const circuit = operatingPointAcceptanceCircuits().independent!;
    const before = solveCircuit(circuit);
    near(before.loads.find((item) => item.componentId === 'dc-load')!.currentAmps, 12 / 6.14);
    circuit.components[0]!.state.sourceProfile = explicitSupplyProfile({
      kind: 'ac-single-phase',
      voltage: 120,
      frequencyHz: 60,
    });
    const after = solveCircuit(circuit);
    expect(after.loads.find((item) => item.componentId === 'dc-load')).toEqual(
      before.loads.find((item) => item.componentId === 'dc-load'),
    );
    expect(after.loads.find((item) => item.componentId === 'heater')!.powerWatts).toBeLessThan(
      before.loads.find((item) => item.componentId === 'heater')!.powerWatts!,
    );
  });

  it('reports modeled underpower, partial and no-load operation separately from readiness', () => {
    const circuit = heaterFixture();
    expect(solveCircuit(circuit, { defs: defsWith(heaterModel) }).operation).toBe('underpowered');
    circuit.components.push(C('open-load', 'space-heater'));
    const result = solveCircuit(circuit, { defs: defsWith(heaterModel) });
    expect(result.operation).toBe('partial');
    expect(result.readiness.topology).toBe('partial');
    expect(result.readiness.operation).toBe('not-assessed');
    expect(solveCircuit({ components: [circuit.components[0]!], wires: [] }).operation).toBe(
      'no-load',
    );
  });

  it('keeps the same output across input order and save/load without mutating preflight diagnostics', () => {
    const circuit = operatingPointAcceptanceCircuits().independent!;
    const original = solveCircuit(circuit);
    circuit.components.reverse();
    circuit.wires.reverse();
    expect(solveCircuit(circuit)).toEqual(original);
    expect(solveCircuit(importJSON(exportJSON(circuit)))).toEqual(original);
    const compiled = compileCircuit({ components: [], wires: [] });
    const before = JSON.stringify(compiled);
    assessCompiledCircuitReadiness(compiled);
    expect(JSON.stringify(compiled)).toBe(before);
  });
});

describe('1.5C.2 current, capacity and units', () => {
  it('gives each breaker its actual branch current and a shared feeder their sum', () => {
    const result = solveCircuit(protectedBranchesFixture());
    expect(result.status).toBe('converged');
    const lampResistance = 230 ** 2 / 60 + 3 * 0.07;
    const heaterResistance = 26.45 + 3 * 0.07;
    const parallel = 1 / (1 / lampResistance + 1 / heaterResistance);
    const total = 230 / (0.07 + parallel);
    const bus = 230 - total * 0.07;
    for (const [id, amps] of [
      ['lamp', bus / lampResistance],
      ['heater', bus / heaterResistance],
    ] as const) {
      const pole = result.deviceCurrents.find((item) => item.componentId === `${id}-breaker`)!;
      near(pole.currentAmps, amps);
      expect(pole.capacityComparison).toBe('within-estimate');
      expect(pole.trip).toBe('not-assessed');
    }
    near(result.wires.find((item) => item.wireId === 'feeder')!.currentAmps, total);
    expect(result.diagnostics.some((d) => d.code === 'device-current-rating-exceeded')).toBe(false);
  });

  it.each(['rcd', 'rcbo', 'isolator-switch'])(
    'keeps %s carrying capacity, In and residual mA separate',
    (type) => {
      const circuit = heaterFixture();
      const residual = type !== 'isolator-switch';
      circuit.components.push(C('device', type, { on: true, customMaxAmps: 1 }));
      circuit.wires = [
        W('feed', 's', 0, 'device', 0),
        W('switched', 'device', 2, 'heater', 0),
        W('return', 'heater', 1, 'device', 3),
        W('neutral', 'device', 1, 's', 1),
      ];
      const result = solveCircuit(circuit);
      expect(result.status, JSON.stringify(result.diagnostics)).toBe('converged');
      const poles = result.deviceCurrents.filter((item) => item.componentId === 'device');
      expect(poles.length).toBeGreaterThan(0);
      for (const pole of poles) {
        expect(Math.abs(pole.currentAmps!)).toBeGreaterThan(8);
        expect(pole.capacityComparison).toBe('exceeded');
        expect(pole.ratedResidualMilliAmps).toBe(residual ? 30 : null);
        expect(pole.overcurrentRatingAmps).toEqual(
          type === 'rcbo' ? expect.objectContaining({ value: 1 }) : null,
        );
        expect(pole.residualCurrentMilliAmps).toBeNull();
        expect(pole.trip).toBe('not-assessed');
      }
      expect(circuit.components.at(-1)!.state.isTripped).toBeUndefined();
      expect(circuit.components.at(-1)!.state.isBlown).toBeUndefined();
    },
  );

  it('uses declared installation and derating for Iz without turning an exceedance into damage', () => {
    const circuit = heaterFixture();
    for (const wire of circuit.wires)
      Object.assign(wire, { customCableMm2: 1, installationMethod: 'A', deratingFactor: 0.5 });
    const result = solveCircuit(circuit);
    for (const wire of result.wires)
      expect(wire.capacity).toMatchObject({
        baseAmps: 11,
        deratedAmps: 5.5,
        comparison: 'exceeded',
        damage: 'not-assessed',
        assessment: 'not-assessed',
      });
    expect(result.diagnostics.filter((d) => d.code === 'wire-capacity-exceeded')).toHaveLength(2);
    expect(circuit.wires.every((wire) => !wire.isBusted)).toBe(true);
  });

  it('preserves AWG and endpoint provenance without rounding unsupported capacity up', () => {
    const circuit = heaterFixture();
    circuit.components[1]!.state.customCableMm2 = 1;
    circuit.wires[0]!.customCableMm2 = 6;
    circuit.wires[0]!.gauge = 16; // stale saved label must lose to an explicit area
    circuit.wires[1]!.customCableMm2 = undefined;
    circuit.wires[1]!.gauge = 16;
    const result = solveCircuit(circuit);
    expect(result.wires[0]!.properties).toMatchObject({
      cableMm2: 6,
      provenance: { cableMm2: 'wire' },
    });
    expect(result.wires[1]!.properties).toMatchObject({
      cableMm2: 1.31,
      provenance: { cableMm2: 'wire-awg' },
    });
    expect(result.wires[1]!.capacity).toMatchObject({
      status: 'not-assessed',
      baseAmps: null,
      deratedAmps: null,
      comparison: 'not-assessed',
    });
    near(result.loads[0]!.currentAmps, 230 / (26.45 + 0.175 / 6 + 0.175 / 1.31));
    circuit.wires[1]!.gauge = undefined;
    expect(solveCircuit(circuit).wires[1]!.properties.provenance.cableMm2).toBe('endpoint');
  });

  it('labels default capacity assumptions and keeps an unknown current unavailable', () => {
    const properties = resolveWireProperties(
      {
        ...W('w', 'a', 0, 'b', 0),
        customCableMm2: undefined,
        lengthMeters: undefined,
        material: undefined,
      },
      new Map(),
    );
    expect(assessWireCapacity(properties)).toMatchObject({
      baseAmps: 27,
      comparison: 'not-assessed',
      assessment: 'not-assessed',
    });
    expect(assessWireCapacity(properties).assumedProperties).toContain('cableMm2');
    expect(assessWireCapacity(properties, 0).comparison).toBe('within-estimate');
    expect(assessWireCapacity({ ...properties, material: 'aluminum' }, -22)).toMatchObject({
      baseAmps: 21,
      comparison: 'exceeded',
    });
  });

  it('does not invent a current rating for an ordinary unrated switch', () => {
    const circuit = seriesFixture();
    circuit.components.push(C('switch', 'single-way-switch', { on: true }));
    circuit.wires[0] = W('feed', 's', 0, 'switch', 0);
    circuit.wires.push(W('out', 'switch', 1, 'r0', 0));
    const result = solveCircuit(circuit);
    const pole = result.deviceCurrents.find((item) => item.componentId === 'switch')!;
    expect(pole.currentCapacityAmps.status).toBe('unknown');
    expect(pole.capacityComparison).toBe('not-assessed');
    expect(pole.overcurrentRatingAmps).toBeNull();
  });
});

describe('1.5C.2 invalid or unavailable results', () => {
  it.each([
    { operatingVoltageRange: { min: -1, max: 250 } },
    { operatingVoltageRange: { min: 250, max: 200 } },
    { operatingVoltageRange: { min: 0, max: Number.NaN } },
    { frequencyHz: [] },
    { frequencyHz: [0] },
    { frequencyHz: [Number.POSITIVE_INFINITY] },
    { maximumVoltage: Number.NaN },
    { nominalVoltage: 0 },
    { nominalPowerWatts: Number.NaN },
    { supplyKinds: [] },
  ])('rejects malformed catalogue ratings %j', (patch) => {
    const result = solveCircuit(heaterFixture(), { defs: defsWith({ ...heaterModel, ...patch }) });
    expect(result.status).toBe('invalid');
    expect(result.loads).toEqual([]);
    expect(result.wires).toEqual([]);
    expect(result.terminalVoltages).toEqual({});
  });

  it.each([
    {},
    { components: [], wires: [] },
    { components: [C('heater', 'space-heater')], wires: [] },
  ])('does not equate an empty error list with operation', (circuit) => {
    const result = solveCircuit(circuit);
    expect(result.operation).toBe('not-assessed');
    expect(result.assessment).toBe('not-assessed');
    expect(result.loads.every((load) => load.powerWatts === null)).toBe(true);
  });
});
