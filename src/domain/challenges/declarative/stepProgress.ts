import type { ChallengeDefinition } from './types';
import type { ChallengeVerdict } from './validator';

export interface ChallengeStepProgress {
  completed: boolean[];
  currentIndex: number;
  completedCount: number;
}

/**
 * Derive guided-step progress from the same rule verdict used for completion.
 * Tutorial definitions opt into this by listing `completionRuleIds` on each
 * step; ordinary challenges continue to use their checklist unchanged.
 */
export function getChallengeStepProgress(
  definition: ChallengeDefinition,
  verdict: ChallengeVerdict | null,
): ChallengeStepProgress {
  const passed = new Set(
    verdict?.rules.filter((rule) => rule.verdict === 'pass').map((rule) => rule.id) ?? [],
  );
  const completed = definition.steps.map((step) => {
    const required = step.completionRuleIds ?? [];
    return required.length > 0 && required.every((ruleId) => passed.has(ruleId));
  });
  const currentIndex = completed.findIndex((isComplete) => !isComplete);
  return {
    completed,
    currentIndex: currentIndex < 0 ? Math.max(0, completed.length - 1) : currentIndex,
    completedCount: completed.filter(Boolean).length,
  };
}
