import { describe, expect, it } from 'vitest';
import { validateCircuit } from '../circuitValidation';
import { compileCircuit } from '../core/compile';
import { ELECTRICAL_MODEL_VERSION } from '../core/contracts';
import { solveCircuit } from '../core/mna';
import { mnaAcceptanceCircuits, parallelFixture, seriesFixture } from '../core/mnaFixtures';
import { heaterFixture, protectedBranchesFixture } from '../core/operatingPointFixtures';
import { solvePhasorCircuit } from '../core/phasor';
import { advancePhasorControlStep } from '../core/phasorControlStep';
import { transformerFixture } from '../core/transformerFixtures';
import { component as C, wire as W } from './auditFixtures';
import { portableResult, runtimeAcceptanceCircuits } from './runtimeFixtures';
import { simulate } from './simulate';

describe('1.5C.5 application MNA adapter', () => {
  it('solves series loads with lead resistance through the public entry', () => {
    const circuit = seriesFixture();
    const before = structuredClone(circuit);
    const result = simulate(circuit);
    const current = 12 / (12 + 0.21);
    expect(result.electricalContract).toMatchObject({
      engineVersion: 'mna-linear-2',
      modelVersion: ELECTRICAL_MODEL_VERSION,
      status: 'converged',
    });
    expect(result.legacyObservation).toBeUndefined();
    expect(result.componentCalculations?.r0.voltage).toBeCloseTo(current * 6, 9);
    expect(result.componentCalculations?.r1.currentAmps).toBeCloseTo(current, 9);
    expect(result.wireCalculations?.feed.currentAmps).toBeCloseTo(current, 9);
    expect(result.electrical?.wireLosses.feed).toBeCloseTo(current ** 2 * 0.07, 9);
    expect(result.energizedComponents).toEqual(new Set(['r0', 'r1']));
    expect(result.supplyVoltage).toBeUndefined();
    expect(circuit).toEqual(before);
  });

  it('uses independent branch currents and a shared feeder satisfying KCL', () => {
    const result = simulate(parallelFixture(true));
    const downstreamResistance = 1 / (1 / 6.14 + 1 / 12.14);
    const total = 12 / (0.07 + downstreamResistance);
    const busVoltage = total * downstreamResistance;
    expect(result.wireCalculations?.feed0.currentAmps).toBeCloseTo(busVoltage / 6.14, 9);
    expect(result.wireCalculations?.feed1.currentAmps).toBeCloseTo(busVoltage / 12.14, 9);
    expect(result.wireCalculations?.feeder.currentAmps).toBeCloseTo(total, 9);
    expect(result.electrical?.checks?.maximumResidualRatio).toBeLessThanOrEqual(1);
  });

  it.each([230, 120, 48, 24, 12])('keeps the heater nameplate fixed at %i V supply', (voltage) => {
    const result = simulate(heaterFixture(voltage));
    const current = voltage / (26.45 + 0.14);
    expect(result.componentCalculations?.heater.currentAmps).toBeCloseTo(current, 9);
    expect(result.componentCalculations?.heater.powerWatts).toBeCloseTo(current ** 2 * 26.45, 8);
    expect(result.blownComponents).toBeUndefined();
    expect(result.electrical?.loads[0]?.nominalPowerWatts).toMatchObject({ value: 2000 });
  });

  it('keeps independent mains and battery voltages separate', () => {
    const result = simulate(mnaAcceptanceCircuits().independent!);
    expect(result.componentCalculations?.['dc-load'].currentAmps).toBeCloseTo(12 / 6.14, 9);
    expect(result.componentCalculations?.['ac-load'].currentAmps).toBeCloseTo(230 / 100.14, 9);
    expect(result.electrical?.references.map((reference) => reference.voltageConvention)).toEqual(
      expect.arrayContaining(['dc', 'signed-rms']),
    );
  });

  it('shows a live open return with zero current without inventing cross-domain voltage', () => {
    const circuit = seriesFixture();
    circuit.wires.pop();
    const result = simulate(circuit);
    expect(result.readiness?.topology).toBe('open');
    expect(result.wireCalculations?.feed.currentAmps).toBeCloseTo(0, 10);
    expect(result.wireStates?.feed).toMatchObject({
      fromPotentialVolts: 12,
      carryingCurrent: false,
    });
    expect(result.wireStates?.feed.toPotentialVolts).toBeCloseTo(12, 10);
    expect(result.energizedWires.has('feed')).toBe(true);
    expect(result.energizedComponents.size).toBe(0);
  });

  it('transfers power through isolated windings without copying primary voltage to the load', () => {
    const result = simulate(transformerFixture());
    const ratio = 230 / 12;
    const secondaryCurrent = 230 / ratio / (6.14 + 0.14 / ratio ** 2);
    expect(result.componentCalculations?.r.voltage).toBeCloseTo(secondaryCurrent * 6, 9);
    expect(result.electrical?.transformers[0]?.connection).toBe('galvanically-isolated');
    expect(result.electrical?.transformers[0]?.secondaryCurrentAmps).toBeCloseTo(
      -secondaryCurrent,
      9,
    );
    expect(result.electrical?.transformers[0]?.primaryPowerWatts).toBeCloseTo(
      -result.electrical!.transformers[0]!.secondaryPowerWatts,
      8,
    );
  });

  it('reports real pole currents without tripping the unrelated low-current branch', () => {
    const result = simulate(protectedBranchesFixture());
    const lamp = result.electrical?.deviceCurrents.find(
      (item) => item.componentId === 'lamp-breaker',
    );
    const heater = result.electrical?.deviceCurrents.find(
      (item) => item.componentId === 'heater-breaker',
    );
    expect(lamp?.currentAmps).toBeGreaterThan(0);
    expect(lamp?.currentAmps).toBeLessThan(1);
    expect(heater?.currentAmps).toBeGreaterThan(8);
    expect(lamp?.trip).toBe('not-assessed');
    expect(result.trippedComponents).toBeUndefined();
    expect(result.blownComponents).toBeUndefined();
  });

  it('withholds operation and numeric readings for an unknown LED', () => {
    const circuit = heaterFixture();
    circuit.components[1] = C('heater', 'bulb');
    const result = simulate(circuit);
    expect(result.legacyObservation).toBeUndefined();
    expect(result.electrical?.status).toBe('unsupported');
    expect(result.energizedComponents.has('heater')).toBe(false);
    expect(result.componentCalculations).toBeUndefined();
    expect(result.wireCalculations).toBeUndefined();
    expect(result.thermalData).toBeUndefined();
    expect(validateCircuit(circuit, result).status).not.toBe('pass');
  });

  it.each([
    'numerical-range',
    'source-short',
    'mixed-kinds',
    'mixed-frequency',
    'undeclared-phase',
  ])('never falls back on %s numerical/source failure', (name) => {
    const result = simulate(mnaAcceptanceCircuits()[name]!);
    expect(result.electrical?.status).not.toBe('converged');
    expect(result.legacyObservation).toBeUndefined();
    expect(result.componentCalculations).toBeUndefined();
    expect(result.wireCalculations).toBeUndefined();
    expect(result.faultsCleared).toBe(false);
  });

  it('keeps a missing model from yielding computed readings for other loads on the same circuit', () => {
    const circuit = heaterFixture();
    circuit.components.push(C('unknown', 'bulb'));
    circuit.wires.push(W('led-feed', 's', 0, 'unknown', 0), W('led-return', 'unknown', 1, 's', 1));
    const result = simulate(circuit);
    expect(result.electrical?.operation).toBe('not-assessed');
    expect(result.componentCalculations).toBeUndefined();
  });

  it.each(Object.entries(runtimeAcceptanceCircuits()))(
    'keeps %s electrical output equal to the numerical API and clone-safe',
    (_name, circuit) => {
      const result = simulate(circuit);
      if (result.phasor) {
        const compiled = compileCircuit(circuit);
        if (result.simulationState && compiled.status === 'compiled')
          expect(result.phasor).toEqual(advancePhasorControlStep(compiled).phasor);
        else expect(result.phasor).toEqual(solvePhasorCircuit(circuit));
        expect(result.electrical).toBeUndefined();
      } else expect(result.electrical).toEqual(solveCircuit(circuit));
      expect(simulate(circuit, { appMode: 'basic' })).toEqual(
        simulate(circuit, { appMode: 'pro' }),
      );
      expect(structuredClone(result)).toEqual(result);
      expect(portableResult(result)).not.toBeNull();
    },
  );
});
