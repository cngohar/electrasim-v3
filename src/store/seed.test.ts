import { simulate } from '@electrasim/domain/simulation';
import { expect, it } from 'vitest';
import { buildProSeedCircuit, buildStudentSeedCircuit } from './seed';

it('energises every branch of both shipped demo benches', () => {
  // Student bench: lighting + RCBO socket.
  const student = buildStudentSeedCircuit();
  const studentLoads = [
    student.components.find((component) => component.type === 'bulb'),
    student.components.find((component) => component.type === 'socket-3pin'),
  ];
  expect(studentLoads.every(Boolean)).toBe(true);
  const studentResult = simulate(student);
  for (const load of studentLoads) {
    expect(studentResult.energizedComponents.has(load!.id)).toBe(true);
  }

  // Pro bench: staircase lighting + RCBO socket + contactor motor.
  const seed = buildProSeedCircuit();
  const secondaryLoads = [
    seed.components.find((component) => component.type === 'bulb'),
    seed.components.find((component) => component.type === 'socket-3pin'),
    seed.components.find((component) => component.type === 'motor'),
  ];
  expect(secondaryLoads.every(Boolean)).toBe(true);

  const r = simulate(seed);

  for (const load of secondaryLoads) {
    expect(r.energizedComponents.has(load!.id)).toBe(true);
  }
});
