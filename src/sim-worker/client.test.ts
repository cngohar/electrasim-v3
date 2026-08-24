/**
 * sim-worker client tests.
 *
 * Vitest uses jsdom by default, which does not implement the `Worker`
 * constructor. That makes this an excellent environment to verify the
 * **fallback path** — the client should run `simulate()` on the main
 * thread and produce a result identical to the synchronous engine.
 */

import { describe, expect, it } from 'vitest';
import { simulate } from '../domain/simulation/simulate';
import { buildSeedCircuit } from '../store/seed';
import { simWorkerActive, simulateAsync, terminateSimWorker } from './client';

describe('simulateAsync (fallback path under jsdom)', () => {
  it('falls back to main-thread simulate when Worker is unavailable', async () => {
    const circuit = buildSeedCircuit();
    const expected = simulate(circuit);
    const got = await simulateAsync(circuit);

    expect(got.energizedComponents).toEqual(expected.energizedComponents);
    expect(got.energizedWires).toEqual(expected.energizedWires);
    expect(got.errorComponents).toEqual(expected.errorComponents);
    expect(got.errorWires).toEqual(expected.errorWires);
    expect(got.errors).toEqual(expected.errors);
    expect(got.warnings).toEqual(expected.warnings);
  });

  it('reports the worker as inactive in the fallback path', () => {
    expect(simWorkerActive()).toBe(false);
  });

  it('terminate is a safe no-op when no worker exists', () => {
    expect(() => terminateSimWorker()).not.toThrow();
  });
});
