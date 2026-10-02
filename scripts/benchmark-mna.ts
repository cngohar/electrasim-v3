/** Local numerical-slice evidence. This measures validation, compilation, MNA,
 * measurement recovery and conservation checks, not rendering or the legacy adapter.
 */
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { MNA_LIMITS, solveCircuit } from '@electrasim/domain/core';
import type { Circuit } from '@electrasim/domain/types';
import {
  leadFixture,
  resistorFixture,
  seriesFixture,
  sourceFixture,
} from '../packages/domain/src/core/mnaFixtures';
import {
  transformerAcceptanceCircuits,
  transformerFixture,
} from '../packages/domain/src/core/transformerFixtures';

const WARMUP_RUNS = 20;
const SAMPLE_RUNS = 100;
const FALLBACK_TARGET_MS = 8;

function parallelCircuit(loads: number): Circuit {
  return {
    components: [
      sourceFixture('s', { kind: 'dc', voltage: 12 }),
      ...Array.from({ length: loads }, (_, index) => resistorFixture(`r${index}`, 24)),
    ],
    wires: Array.from({ length: loads }, (_, index) => [
      leadFixture(`feed${index}`, 's', 0, `r${index}`, 0),
      leadFixture(`return${index}`, `r${index}`, 1, 's', 1),
    ]).flat(),
  };
}

const scenarios = [
  {
    name: 'two series loads',
    circuit: seriesFixture(),
    sourceCurrent: 12 / (12 + 3 * 0.07),
  },
  {
    name: '199 parallel loads',
    circuit: parallelCircuit(199),
    sourceCurrent: (199 * 12) / (24 + 2 * 0.07),
  },
  {
    name: '255 series loads',
    circuit: seriesFixture(Array(255).fill(6)),
    sourceCurrent: 12 / (255 * 6 + 256 * 0.07),
  },
  {
    name: '255 parallel loads',
    circuit: parallelCircuit(255),
    sourceCurrent: (255 * 12) / (24 + 2 * 0.07),
  },
  {
    name: 'isolated 230:12 V transformer',
    circuit: transformerFixture(),
    sourceCurrent: 230 / (0.14 + (230 / 12) ** 2 * 6.14),
  },
  {
    name: 'two cascaded transformers',
    circuit: transformerAcceptanceCircuits().cascade!,
    sourceCurrent: 230 / (0.14 + (230 / 24) ** 2 * (0.14 + (230 / 12) ** 2 * 6.14)),
  },
];

console.log(
  `MNA benchmark: ${WARMUP_RUNS} warmups, ${SAMPLE_RUNS} samples per drawing; limits ${JSON.stringify(MNA_LIMITS)}`,
);
for (const { name, circuit, sourceCurrent } of scenarios) {
  const samples: number[] = [];
  let unknowns = 0;
  for (let index = -WARMUP_RUNS; index < SAMPLE_RUNS; index++) {
    const start = performance.now();
    const result = solveCircuit(circuit);
    const elapsed = performance.now() - start;
    // Assert outside the timed interval. Correctness is required even at the size limit.
    assert.equal(result.status, 'converged', JSON.stringify(result.diagnostics));
    assert(result.checks && result.checks.maximumResidualRatio <= 1);
    const branch = result.sourceBranches[JSON.stringify(['source', 's'])];
    assert(branch);
    const current = result.branchCurrents[branch];
    assert(current !== undefined);
    assert(Math.abs(current + sourceCurrent) <= 1e-9 + Math.abs(sourceCurrent) * 1e-6);
    unknowns = Math.max(...result.checks.couplingGroups.map((group) => group.unknowns));
    if (index >= 0) samples.push(elapsed);
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)]!;
  const p95 = samples[Math.ceil(samples.length * 0.95) - 1]!;
  const fallback =
    circuit.components.length === 200
      ? `; existing ${FALLBACK_TARGET_MS} ms fallback target ${p95 < FALLBACK_TARGET_MS ? 'met' : 'not met'}`
      : '';
  console.log(
    `${name}: ${circuit.components.length} components, ${circuit.wires.length} wires, ${unknowns} driven unknowns, median ${median.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms${fallback}`,
  );
}
console.log(
  'Numerical-slice timings are evidence for later integration. The legacy simulation budget is unchanged; this command does not certify browser frame rate or production throughput.',
);
