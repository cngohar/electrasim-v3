import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { ELECTRICAL_MODEL_VERSION } from '@electrasim/domain/core/contracts';
import { simulate } from '@electrasim/domain/simulation';
import type { Circuit } from '@electrasim/domain/types';

const rows = [];
for (const count of [1, 10, 25]) {
  const types = ['bulb', 'ceiling-fan', 'washing-machine'];
  const circuit: Circuit = {
    globalVoltage: 230,
    components: [
      { id: 'live', type: 'live-terminal', x: 0, y: 0, state: {} },
      { id: 'neutral', type: 'neutral-terminal', x: 0, y: 100, state: {} },
      ...Array.from({ length: count }, (_, i) => ({
        id: `load${i}`,
        type: types[i % 3]!,
        x: i * 100,
        y: 50,
        state: {},
      })),
    ],
    wires: Array.from({ length: count }, (_, i) => [
      {
        id: `feed${i}`,
        fromComponentId: 'live',
        fromPortIndex: 0,
        toComponentId: `load${i}`,
        toPortIndex: 0,
        controlPoints: [],
      },
      {
        id: `return${i}`,
        fromComponentId: `load${i}`,
        fromPortIndex: 1,
        toComponentId: 'neutral',
        toPortIndex: 0,
        controlPoints: [],
      },
    ]).flat(),
  };
  const check = (r: ReturnType<typeof simulate>) => {
    assert.equal(r.electrical?.status, 'converged');
    assert(Math.abs(r.componentCalculations!.load0!.powerWatts! - 9) < 1e-7);
    assert(r.electrical!.checks!.maximumKclResidualAmps < 1e-7);
  };
  for (let i = 0; i < 10; i++) check(simulate(circuit));
  const samples = [];
  for (let i = 0; i < 50; i++) {
    const start = performance.now();
    const r = simulate(circuit);
    samples.push(performance.now() - start);
    check(r);
  }
  samples.sort((a, b) => a - b);
  rows.push({
    loads: count,
    components: circuit.components.length,
    wires: circuit.wires.length,
    medianMs: samples[25],
    p95Ms: samples[47],
    samples: 50,
  });
}
const result = {
  modelVersion: ELECTRICAL_MODEL_VERSION,
  scope:
    'Current accepted nonlinear/reactive workloads; pre-implementation profiles were unsupported, so these are new workload measurements, not a like-for-like delta. Existing 200-component 8 ms gate is measured separately unchanged.',
  rows,
};
writeFileSync('.wrangler/phase112-profile-benchmark.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
