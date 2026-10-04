import { describe, expect, it } from 'vitest';
import { getGuideObjectiveList, getGuideProgress } from './guideProgress';
import { simulate } from './simulation';
import { cloneTemplateCircuit, getGuidedCircuitTemplate } from './templates';

function requireTemplate(id: string) {
  const template = getGuidedCircuitTemplate(id);
  if (!template) throw new Error(`Missing guided circuit template: ${id}`);
  return template;
}

describe('guide progress (guided circuits, not challenges)', () => {
  it('derives a four-step learning checklist for templates without custom objectives', () => {
    const objectives = getGuideObjectiveList(requireTemplate('simple-lamp'));
    expect(objectives.map((objective) => objective.id)).toEqual([
      'components',
      'wiring',
      'simulation',
      'safe-result',
    ]);
    expect(objectives.map((objective) => objective.label)).toEqual([
      'Identify the components',
      'Check the wiring paths',
      'Run the simulation',
      'Review the results',
    ]);
  });

  it('tracks inspection and wiring before the simulation has run', () => {
    const template = requireTemplate('simple-lamp');
    const circuit = cloneTemplateCircuit(template);
    const progress = getGuideProgress(template, circuit, false, null);

    expect(progress.completed).toBe(false);
    expect(progress.completedIds).toEqual(['components', 'wiring']);
    expect(progress.percent).toBe(50);
    expect(progress.currentObjectiveId).toBe('simulation');
  });

  it('withholds completion when the legacy LED model remains unassessed', () => {
    const template = requireTemplate('simple-lamp');
    const circuit = cloneTemplateCircuit(template);
    const result = simulate(circuit);

    const progress = getGuideProgress(template, circuit, false, result);
    expect(progress.completed).toBe(false);
    expect(progress.percent).toBe(75);
    expect(progress.currentObjectiveId).toBe('safe-result');
    expect(result.electrical?.status).toBe('unsupported');
  });
});
