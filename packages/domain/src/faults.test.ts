import { expect, it, vi } from 'vitest';
import { normalizeCircuitFaults } from './faults';
import { simulate } from './simulation';
import type { Circuit } from './types';

const legacy: Circuit = {
  components: [
    { id: 'supply', type: 'ac-mains-supply', x: 0, y: 0, state: {} },
    { id: 'load', type: 'bulb', x: 100, y: 0, state: {} },
  ],
  wires: [
    {
      id: 'line',
      fromComponentId: 'supply',
      fromPortIndex: 0,
      toComponentId: 'load',
      toPortIndex: 0,
      controlPoints: [],
      fault: 'open-circuit',
    },
    {
      id: 'neutral',
      fromComponentId: 'supply',
      fromPortIndex: 1,
      toComponentId: 'load',
      toPortIndex: 1,
      controlPoints: [],
    },
  ],
};

it('normalizes legacy faults and simulates without reading time or randomness', () => {
  const before = structuredClone(legacy);
  const clock = vi.spyOn(Date, 'now').mockImplementation(() => {
    throw new Error('Clock read by solver');
  });
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    throw new Error('Randomness read by solver');
  });
  try {
    const first = simulate(legacy);
    expect(simulate(structuredClone(legacy))).toEqual(first);
    expect(normalizeCircuitFaults(legacy)[0]).toMatchObject({
      id: 'legacy_wire_line_open-circuit',
      createdAt: 0,
    });
    expect(legacy).toEqual(before);
  } finally {
    clock.mockRestore();
    random.mockRestore();
  }
});

it('keeps explicit fault identity and avoids a duplicate legacy mirror', () => {
  const record = { ...normalizeCircuitFaults(legacy)[0], id: 'saved-fault', createdAt: 42 };
  expect(normalizeCircuitFaults({ ...legacy, faults: [record] })).toEqual([record]);
});
