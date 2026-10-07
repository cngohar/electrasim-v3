import {
  type BuildDiagnosisScenarioRequest,
  type DiagnosisScenario,
  GENERATOR_VERSION,
  buildDiagnosisScenario,
} from '@electrasim/domain/challenges';
import type { FaultType } from '@electrasim/domain/types';
import { circuitRequirements } from './circuit';
import { FAULT_ACCESS } from './index';

export const DIAGNOSIS_VERSION = GENERATOR_VERSION;
const basicFaults = (Object.keys(FAULT_ACCESS) as FaultType[]).filter(
  (type) => FAULT_ACCESS[type] === 'basic',
);
// Select modeled free recipes before generating. Earlier snapshots stay readable.
const basicRecipes = {
  beginner: ['beginner-protected-load', 'beginner-switched-light'],
  intermediate: ['intermediate-two-way-lighting', 'intermediate-branched-lighting'],
} as const;
export function buildAccessibleDiagnosis(
  request: BuildDiagnosisScenarioRequest,
): DiagnosisScenario {
  const version = request.generatorVersion ?? DIAGNOSIS_VERSION;
  if (version !== DIAGNOSIS_VERSION)
    throw new Error(
      'Unsupported diagnosis version; saved work is preserved. Start a current exercise to earn a result.',
    );
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
