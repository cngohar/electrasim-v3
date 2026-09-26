/**
 * guideProgress — checklist tracking for Guided Circuits.
 *
 * Guided Circuits are learning walkthroughs, not Challenge Mode: the
 * objectives below are a gentle checklist (identify → inspect → run →
 * read the result) that tracks what the learner has done, with no score,
 * timer, or fail state. Challenge Mode lives in `./challenges/` and keeps
 * its own progress model entirely separate from this module.
 */
import type { GuidedCircuitObjective, GuidedCircuitTemplate } from './templates';
import type { Circuit, SimulationResult } from './types';

export interface GuideProgress {
  objectives: GuidedCircuitObjective[];
  completedIds: string[];
  percent: number;
  completed: boolean;
  currentObjectiveId: string | null;
}

function objectivesFor(template: GuidedCircuitTemplate): GuidedCircuitObjective[] {
  if (template.objectives?.length) return template.objectives;
  const types = [...new Set(template.circuit.components.map((component) => component.type))];
  return [
    {
      id: 'components',
      label: 'Identify the components',
      description: `Use the ${template.topic.toLowerCase()} components in this guide.`,
      kind: 'component-types',
      componentTypes: types,
    },
    {
      id: 'wiring',
      label: 'Check the wiring paths',
      description: 'Confirm the supplied circuit has all of its intended connections.',
      kind: 'wire-count',
      minimum: template.circuit.wires.length,
    },
    {
      id: 'simulation',
      label: 'Run the simulation',
      description: template.expected,
      kind: 'run-simulation',
    },
    {
      id: 'safe-result',
      label: 'Review the results',
      description: 'Finish with no error-level findings on the canvas.',
      kind: 'fault-free',
    },
  ];
}

export function getGuideProgress(
  template: GuidedCircuitTemplate,
  circuit: Circuit,
  simRunning: boolean,
  simResult: SimulationResult | null,
): GuideProgress {
  const objectives = objectivesFor(template);
  const completedIds = objectives
    .filter((objective) => {
      if (objective.kind === 'component-types') {
        return (objective.componentTypes ?? []).every((type) =>
          circuit.components.some((component) => component.type === type),
        );
      }
      if (objective.kind === 'wire-count') return circuit.wires.length >= (objective.minimum ?? 1);
      if (objective.kind === 'run-simulation') return simRunning || simResult !== null;
      return Boolean(simResult && simResult.errors.length === 0 && simResult.warnings.length === 0);
    })
    .map((objective) => objective.id);
  const completed = completedIds.length === objectives.length;
  return {
    objectives,
    completedIds,
    percent: Math.round((completedIds.length / objectives.length) * 100),
    completed,
    currentObjectiveId:
      objectives.find((objective) => !completedIds.includes(objective.id))?.id ?? null,
  };
}

export function getGuideObjectiveList(template: GuidedCircuitTemplate): GuidedCircuitObjective[] {
  return objectivesFor(template);
}
