import assert from 'node:assert/strict';
import { MATTER_EFFECT_LIMIT, MATTER_SETTLE_FRAMES } from '../src/ui/canvas/matterEffects';
import { createMatterScene } from '../src/ui/canvas/matterScene';

const anchors = Array.from({ length: MATTER_EFFECT_LIMIT }, (_, index) => ({
  key: `wire-${index}`,
  kind: 'damage' as const,
  x: 80 + index * 35,
  y: 200,
  tangent: { x: 1, y: 0 },
}));
const samples: number[] = [];
for (let run = 0; run < 25; run++) {
  const scene = createMatterScene(anchors);
  assert.equal(scene.bodyCount, 48);
  for (let frame = 0; frame < MATTER_SETTLE_FRAMES; frame++) {
    const start = performance.now();
    const paths = scene.step();
    const duration = performance.now() - start;
    assert.equal(paths.length, 24);
    assert(paths.every((path) => !/NaN|Infinity/.test(path.d)));
    if (run >= 5) samples.push(duration);
  }
  scene.dispose();
}
samples.sort((a, b) => a - b);
const p95Ms = samples[Math.ceil(samples.length * 0.95) - 1];
console.log(
  JSON.stringify(
    {
      targets: 24,
      bodies: 48,
      samples: samples.length,
      medianMs: samples[Math.floor(samples.length / 2)],
      p95Ms,
      budgetMs: 4,
      scope: 'Matter fixed substeps and SVG path generation; browser paint measured separately',
    },
    null,
    2,
  ),
);
assert(p95Ms < 4, `Effects update p95 ${p95Ms} ms exceeds 4 ms`);
