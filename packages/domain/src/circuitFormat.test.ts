import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON, normalizeCircuit } from './circuitFormat';
import { createInjectedFault } from './faults';
import type { Circuit } from './types';
const circuit: Circuit = {
  components: [
    {
      id: 'rcd',
      type: 'rcd',
      x: 10,
      y: 20,
      rotation: 90,
      state: { rcdType: 'B', autoLabel: 'Q1', fault: 'smooth-dc-residual' },
    },
  ],
  wires: [],
  globalVoltage: 120,
  faults: [
    createInjectedFault(
      'smooth-dc-residual',
      { type: 'component', id: 'rcd' },
      { residualMa: 100 },
    ),
  ],
};
describe('shared circuit format', () => {
  it('preserves held contacts only for immediate simulation, never for saved documents', () => {
    const held: Circuit = {
      components: [{ id: 'push', type: 'push-button', x: 0, y: 0, state: { on: true } }],
      wires: [],
    };
    expect(normalizeCircuit(held).components[0].state.on).toBe(false);
    expect(normalizeCircuit(held, false).components[0].state.on).toBe(true);
  });

  it('round trips modern faults, legacy mirrors, settings and rotation', () => {
    expect(importJSON(exportJSON(circuit))).toEqual({
      ...circuit,
      components: [
        { ...circuit.components[0], state: { ...circuit.components[0].state, on: true } },
      ],
    });
  });
  it('rejects unknown faults and orphaned targets instead of silently dropping them', () => {
    const payload = JSON.parse(exportJSON(circuit));
    payload.circuit.faults[0].type = 'invented';
    expect(() => importJSON(JSON.stringify(payload))).toThrow('fault');
    payload.circuit.faults = [
      { ...circuit.faults![0], target: { type: 'component', id: 'missing' } },
    ];
    expect(() => importJSON(JSON.stringify(payload))).toThrow('component');
  });
});
