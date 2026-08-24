/**
 * The declarative challenge registry (plan §5).
 *
 * Each entry is pure data: starter circuit, allowed parts, ordered rules,
 * hints and the completion message. The validator (validator.ts) judges the
 * learner's circuit against these rules using the real circuit model and
 * simulation engine — no generator, no randomness (plan §44: "Do not turn
 * Challenge Mode into a second random generator").
 *
 * Every component type and port referenced here is verified against
 * `COMPONENT_DEFS` at module load, so a registry typo fails loudly at boot
 * instead of producing a confusing challenge (plan §4: "Do not assume
 * component IDs or port IDs").
 */

import { COMPONENT_DEFS } from '../../components';
import type { Circuit } from '../../types';
import { PRO_CHALLENGES } from './challenges/pro';
import { FIRST_LAMP_TUTORIAL } from './challenges/tutorial';
import { WAVE_TWO_CHALLENGES } from './challenges/waveTwo';
import type { ChallengeDefinition, ChallengeId, ChallengeVisualTarget } from './types';

/**
 * Every shipped challenge, in recommended order (plan §17/§18).
 *
 * The first three entries are the Student Mode foundation. Pro Mode adds a
 * separate, explicitly gated set of commissioning exercises.
 */
export const CHALLENGE_DEFINITIONS: readonly ChallengeDefinition[] = [
  FIRST_LAMP_TUTORIAL,
  ...WAVE_TWO_CHALLENGES,
  ...PRO_CHALLENGES,
];

/** Look up a definition by id. */
export function getChallengeDefinition(id: ChallengeId): ChallengeDefinition | undefined {
  return CHALLENGE_DEFINITIONS.find((definition) => definition.id === id);
}

/** Recommended next challenge after `id`, or `null` when none follows. */
export function nextChallengeAfter(id: ChallengeId): ChallengeDefinition | null {
  const index = CHALLENGE_DEFINITIONS.findIndex((definition) => definition.id === id);
  if (index < 0 || index + 1 >= CHALLENGE_DEFINITIONS.length) return null;
  return CHALLENGE_DEFINITIONS[index + 1]!;
}

/** Deep-copy a starter circuit so every attempt starts pristine. */
export function cloneStarter(circuit: Circuit): Circuit {
  return JSON.parse(JSON.stringify(circuit)) as Circuit;
}

/** Check visual guidance references as strictly as electrical references. */
function collectVisualTargetProblems(
  challengeId: ChallengeId,
  location: string,
  target: ChallengeVisualTarget,
): string[] {
  const problems: string[] = [];
  const checkPort = (componentType: string, portIndex: number, label: string) => {
    const definition = COMPONENT_DEFS[componentType];
    if (!definition) {
      problems.push(`${challengeId}: ${location} references unknown component "${componentType}"`);
      return;
    }
    if (!definition.ports[portIndex]) {
      problems.push(`${challengeId}: ${location} references unknown ${label} port ${portIndex}`);
    }
  };

  if (target.kind === 'component') {
    if (!COMPONENT_DEFS[target.componentType]) {
      problems.push(
        `${challengeId}: ${location} references unknown component "${target.componentType}"`,
      );
    }
  } else if (target.kind === 'port') {
    checkPort(target.componentType, target.portIndex, 'visual');
  } else {
    checkPort(target.from.componentType, target.from.portIndex, 'source visual');
    checkPort(target.to.componentType, target.to.portIndex, 'destination visual');
  }
  return problems;
}

/** Boot-time registry guard: every referenced type, port, and visual target must exist. */
export function assertRegistryCoherent(): string[] {
  const problems: string[] = [];
  for (const definition of CHALLENGE_DEFINITIONS) {
    for (const type of definition.allowedComponents ?? []) {
      if (!COMPONENT_DEFS[type])
        problems.push(`${definition.id}: unknown allowed component "${type}"`);
    }
    for (const component of definition.starter.components) {
      if (!COMPONENT_DEFS[component.type]) {
        problems.push(`${definition.id}: starter uses unknown component "${component.type}"`);
      }
    }
    for (const wire of definition.starter.wires) {
      const from = definition.starter.components.find((c) => c.id === wire.fromComponentId);
      const to = definition.starter.components.find((c) => c.id === wire.toComponentId);
      if (!from || !to) {
        problems.push(`${definition.id}: starter wire ${wire.id} dangles`);
        continue;
      }
      const fromPort = COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex];
      const toPort = COMPONENT_DEFS[to.type]?.ports[wire.toPortIndex];
      if (!fromPort || !toPort) {
        problems.push(`${definition.id}: starter wire ${wire.id} uses an unknown port`);
      }
    }
    for (const step of definition.steps) {
      if (step.visualTarget) {
        problems.push(
          ...collectVisualTargetProblems(
            definition.id,
            `step ${step.id ?? step.no} visual target`,
            step.visualTarget,
          ),
        );
      }
    }
    const ruleIds = new Set(definition.rules.map((rule) => rule.id));
    for (const requirement of definition.requirements ?? []) {
      for (const ruleId of requirement.ruleIds) {
        if (!ruleIds.has(ruleId)) {
          problems.push(
            `${definition.id}: requirement "${requirement.id}" maps to unknown rule "${ruleId}"`,
          );
        }
      }
    }
    for (const hint of definition.hints) {
      if (hint.visual) {
        problems.push(
          ...collectVisualTargetProblems(
            definition.id,
            `hint ${hint.level} visual target`,
            hint.visual.target,
          ),
        );
      }
    }
  }
  return problems;
}
