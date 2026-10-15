import { simulate } from '@electrasim/domain/simulation';
import { expect, it } from 'vitest';
import { buildProSeedCircuit, buildStudentSeedCircuit } from './seed';

it('solves the Student incandescent branch and the unloaded outlet without invented demand', () => {
  const student = buildStudentSeedCircuit();
  const lamp = student.components.find((c) => c.type === 'bulb-incandescent')!;
  const socket = student.components.find((c) => c.type === 'socket-3pin')!;
  const result = simulate(student);
  expect(result.electrical?.status).toBe('converged');
  expect(result.energizedComponents.has(lamp.id)).toBe(true);
  expect(result.componentCalculations?.[lamp.id].powerWatts).toBeGreaterThan(0);
  expect(result.energizedComponents.has(socket.id)).toBe(true);
  expect(result.componentCalculations?.[socket.id].currentAmps).toBeUndefined();
});

it('calculates the Pro motor drawing with the declared electrical equivalent', () => {
  const seed = buildProSeedCircuit();
  expect(seed.components.some((c) => c.type === 'motor')).toBe(true);
  const result = simulate(seed);
  expect(result.electrical?.status).toBe('converged');
  expect(result.legacyObservation).toBeUndefined();
  const motor = seed.components.find((c) => c.type === 'motor')!;
  expect(result.componentCalculations?.[motor.id].currentAmps).toBeGreaterThan(0);
  expect(
    result.electrical?.loads.find((l) => l.componentId === motor.id)?.reactivePowerVars,
  ).toBeGreaterThan(0);
});
