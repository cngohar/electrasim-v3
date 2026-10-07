import { seriesFixture } from '@electrasim/domain/core/mnaFixtures';
import { simulate } from '@electrasim/domain/simulation';
import { getGuidedCircuitTemplate } from '@electrasim/domain/templates';
import { beforeEach, expect, it } from 'vitest';
import {
  clearGuideProgress,
  getCompletedGuideIds,
  isGuideCompleted,
  markGuideCompleted,
  wasGuideCompletedEarlier,
} from './guideProgressPersistence';
beforeEach(() => window.localStorage.clear());
const key = 'electrasim:guide-progress:v2';
it('records only current finding-free checklists with versions and stable timestamps', () => {
  const circuit = seriesFixture([6]);
  const template = { ...getGuidedCircuitTemplate('simple-lamp')!, circuit };
  const result = simulate(circuit);
  expect(markGuideCompleted(template, circuit, result)).toBe(true);
  const first = JSON.parse(localStorage.getItem(key)!);
  expect(first['simple-lamp']).toMatchObject({ version: 2, inputRevision: result.inputRevision });
  expect(markGuideCompleted(template, circuit, result)).toBe(true);
  expect(JSON.parse(localStorage.getItem(key)!)['simple-lamp'].completedAt).toBe(
    first['simple-lamp'].completedAt,
  );
  expect(getCompletedGuideIds()).toEqual(['simple-lamp']);
});
it('retains historical completions without granting current-model completion', () => {
  localStorage.setItem('electrasim:guide-progress:v1', JSON.stringify({ 'simple-lamp': 123 }));
  expect(wasGuideCompletedEarlier('simple-lamp')).toBe(true);
  expect(isGuideCompleted('simple-lamp')).toBe(false);
  expect(getCompletedGuideIds()).toEqual([]);
  expect(localStorage.getItem('electrasim:guide-progress:v1')).not.toBeNull();
});
it('rejects unsupported, missing, stale and obsolete evidence without changing history', () => {
  const template = getGuidedCircuitTemplate('simple-lamp')!;
  expect(markGuideCompleted(template, template.circuit, simulate(template.circuit))).toBe(false);
  const circuit = seriesFixture([6]);
  const supported = { ...template, circuit };
  const result = simulate(circuit);
  expect(markGuideCompleted(supported, circuit, null)).toBe(false);
  expect(markGuideCompleted(supported, circuit, { ...result, inputRevision: 'stale' })).toBe(false);
  expect(
    markGuideCompleted(supported, circuit, {
      ...result,
      electricalContract: { ...result.electricalContract!, modelVersion: 'obsolete' },
    }),
  ).toBe(false);
  expect(getCompletedGuideIds()).toEqual([]);
});
it('tolerates corrupt storage and clears all generations on explicit reset', () => {
  for (const item of [key, 'electrasim:guide-progress:v1', 'electrasim:challenge-progress:v1'])
    localStorage.setItem(item, 'invalid');
  expect(getCompletedGuideIds()).toEqual([]);
  clearGuideProgress();
  expect(localStorage.length).toBe(0);
});
