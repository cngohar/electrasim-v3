import { describe, expect, it } from 'vitest';
import { getGuideObjectiveList, getGuideProgress } from './guideProgress';
import { simulate } from './simulation';
import { dolAcceptanceCircuits } from './simulation/dolFixtures';
import { cloneTemplateCircuit, getGuidedCircuitTemplate } from './templates';

function requireTemplate(id: string) {
  const template = getGuidedCircuitTemplate(id);
  if (!template) throw new Error(`Missing guided circuit template: ${id}`);
  return template;
}

describe('guide progress (guided circuits, not challenges)', () => {
  it('keeps DOL operation distinct from unassessed safety and guide completion', () => {
    const template = requireTemplate('pro-3phase-dol-starter');
    for (const [name, circuit] of Object.entries(dolAcceptanceCircuits())) {
      const result = simulate(circuit);
      expect(result.faultsCleared, name).toBe(false);
      expect(getGuideProgress(template, circuit, true, result).completed, name).toBe(false);
      if (name === 'dol-running') expect(result.phasor?.motors[0]?.state).toBe('running');
      if (name === 'dol-stopped' || name === 'dol-coil-loss')
        expect(result.phasor?.motors[0]?.state, name).toBe('stopped');
      if (name === 'dol-phase-loss' || name === 'dol-reversed')
        expect(result.phasor?.motors[0]?.state, name).toBe('blocked');
      if (name === 'dol-undeclared')
        expect(result.energizedComponents.has(`${template.id}-motor`)).toBe(false);
    }
  });

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
    const template = structuredClone(requireTemplate('simple-lamp'));
    template.circuit.components.find((c) => c.type === 'bulb-incandescent')!.type = 'bulb';
    const circuit = cloneTemplateCircuit(template);
    const result = simulate(circuit);

    const progress = getGuideProgress(template, circuit, false, result);
    expect(progress.completed).toBe(false);
    expect(progress.percent).toBe(75);
    expect(progress.currentObjectiveId).toBe('safe-result');
    expect(result.electrical?.status).toBe('unsupported');
  });
});
