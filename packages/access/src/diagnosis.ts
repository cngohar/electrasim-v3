import {
  type BuildDiagnosisScenarioRequest,
  type DiagnosisScenario,
  buildDiagnosisScenario,
} from '@electrasim/domain/challenges';
import type { FaultType } from '@electrasim/domain/types';
import { circuitRequirements } from './circuit';
import { FAULT_ACCESS } from './index';

export const DIAGNOSIS_VERSION = 2;
const basicFaults = (Object.keys(FAULT_ACCESS) as FaultType[]).filter(
  (type) => FAULT_ACCESS[type] === 'basic',
);
// Select eligible templates before generating. Keep legacy v1 seed semantics intact.
const basicRecipes = {
  beginner: [
    'beginner-protected-load',
    'beginner-switched-light',
    'beginner-protected-socket',
    'beginner-bell-push',
  ],
  intermediate: [
    'intermediate-two-way-lighting',
    'intermediate-branched-lighting',
    'intermediate-socket-and-light',
    'intermediate-fan-regulator',
    'intermediate-timed-lighting',
  ],
} as const;
export function buildAccessibleDiagnosis(
  request: BuildDiagnosisScenarioRequest,
): DiagnosisScenario {
  const version = request.generatorVersion ?? DIAGNOSIS_VERSION;
  if (version === 1) return buildDiagnosisScenario(request);
  if (version !== DIAGNOSIS_VERSION)
    throw new Error('Unsupported diagnosis version; saved work is preserved.');
  const basic = request.difficulty !== 'advanced' && !request.rageTier;
  const recipes = basic ? basicRecipes[request.difficulty as keyof typeof basicRecipes] : null;
  const scenario = buildDiagnosisScenario({
    ...request,
    generatorVersion: version,
    ...(recipes
      ? {
          recipeId: recipes[Math.abs(Math.trunc(request.seed)) % recipes.length],
          allowedFaultTypes: basicFaults,
        }
      : {}),
  });
  if (basic && scenarioRequirements(scenario).length)
    throw new Error('This recipe is not eligible for basic diagnosis.');
  return scenario;
}
export function scenarioRequirements(scenario: DiagnosisScenario) {
  return circuitRequirements(
    scenario.faultedCircuit,
    scenario.rage ? 'ohmageddon' : scenario.difficulty === 'advanced' ? 'advanced' : 'basic',
  );
}
