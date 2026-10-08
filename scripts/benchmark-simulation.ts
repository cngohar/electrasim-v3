import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { simulate } from '@electrasim/domain/simulation';
import type { Circuit, ComponentInstance, WireInstance } from '@electrasim/domain/types';

const LOADS = 198;
const WARMUP_RUNS = 20;
const SAMPLE_RUNS = 100;
const P95_BUDGET_MS = 8;

function denseCircuit(): Circuit {
  const live: ComponentInstance = {
    id: 'live',
    type: 'live-terminal',
    x: 0,
    y: 0,
    state: {},
  };
  const neutral: ComponentInstance = {
    id: 'neutral',
    type: 'neutral-terminal',
    x: 0,
    y: 100,
    state: {},
  };
  const components: ComponentInstance[] = [live, neutral];
  const wires: WireInstance[] = [];

  for (let index = 0; index < LOADS; index += 1) {
    const bulb: ComponentInstance = {
      id: `bulb-${index}`,
      type: 'bulb-incandescent',
      x: index * 10,
      y: 50,
      state: {},
    };
    components.push(bulb);
    wires.push(
      {
        id: `live-${index}`,
        fromComponentId: live.id,
        fromPortIndex: 0,
        toComponentId: bulb.id,
        toPortIndex: 0,
        controlPoints: [],
      },
      {
        id: `neutral-${index}`,
        fromComponentId: neutral.id,
        fromPortIndex: 0,
        toComponentId: bulb.id,
        toPortIndex: 1,
        controlPoints: [],
      },
    );
  }

  return { components, wires };
}

const circuit = denseCircuit();
const verifyResult = (result: ReturnType<typeof simulate>) => {
  assert.equal(result.electrical?.status, 'converged');
  assert.equal(result.legacyObservation, undefined);
  assert.equal(result.energizedComponents.size, LOADS);
  const current = 230 / (230 ** 2 / 60 + 2 * 0.07);
  assert(Math.abs(result.componentCalculations!['bulb-0']!.currentAmps! - current) < 1e-9);
};
for (let index = 0; index < WARMUP_RUNS; index += 1) verifyResult(simulate(circuit));

const samples: number[] = [];
const serializationSamples: number[] = [];
let serializedBytes = 0;
for (let index = 0; index < SAMPLE_RUNS; index += 1) {
  const start = performance.now();
  const result = simulate(circuit);
  samples.push(performance.now() - start);
  verifyResult(result);
}

// Measure transport separately: interleaving multi-megabyte JSON allocations
// with solves makes its garbage collection part of the next solver sample.
const serializationResult = simulate(circuit);
for (let index = 0; index < SAMPLE_RUNS; index += 1) {
  const serializationStart = performance.now();
  const payload = JSON.stringify(serializationResult, (_key, item) =>
    item instanceof Set ? [...item] : item,
  );
  serializationSamples.push(performance.now() - serializationStart);
  serializedBytes = new TextEncoder().encode(payload).length;
}

samples.sort((a, b) => a - b);
const median = samples[Math.floor(samples.length / 2)] ?? Number.POSITIVE_INFINITY;
const p95 = samples[Math.floor(samples.length * 0.95)] ?? Number.POSITIVE_INFINITY;

console.log(
  `Simulation benchmark: ${circuit.components.length} components, ${circuit.wires.length} wires, ` +
    `median ${median.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms`,
);

serializationSamples.sort((a, b) => a - b);
console.log(
  `Result JSON serialization: ${serializedBytes} B, median ${serializationSamples[Math.floor(SAMPLE_RUNS / 2)]!.toFixed(2)} ms, p95 ${serializationSamples[Math.floor(SAMPLE_RUNS * 0.95)]!.toFixed(2)} ms. Renderer measured separately by benchmark:browser.`,
);

if (p95 > P95_BUDGET_MS) {
  console.error(`Simulation p95 exceeds the ${P95_BUDGET_MS} ms budget.`);
  process.exitCode = 1;
}
