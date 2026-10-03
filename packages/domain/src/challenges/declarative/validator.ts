/**
 * Challenge validator (plan §6, §9).
 *
 * Judges the learner's circuit against a declarative definition:
 *
 *   1. structure       — dangling wires are hard failures (can't judge them)
 *   2. rules           — the ordered checklist, evaluated top-to-bottom
 *   3. simulation      — the REAL simulator runs the functional evidence
 *   4. verdict         — not-started / in-progress / has-errors / complete
 *
 * Feedback is plain English, actionable, stable-ordered and free of raw
 * internal ids (plan §9). Extra components produce a warning, never a
 * rejection (plan §20) — unless a rule explicitly forbids them.
 *
 * Pure: no store, no clock, no persistence. The circuit is never mutated.
 */

import { COMPONENT_DEFS } from '../../components';
import { exerciseSupplyIssue } from '../../core/exerciseSupply';
import { validateCircuitRules } from '../../electrical/validation';
import { simulate } from '../../simulation';
import type { Circuit } from '../../types';
import { getChallengeDefinition } from './definitions';
import { indexGraph, structuralIssues } from './graph';
import type { RuleResult, RuleVerdict } from './rules';
import type {
  ChallengeDefinition,
  ChallengeId,
  ChallengeRequirement,
  ChallengeState,
} from './types';

export interface ChallengeIssue {
  /** Plain-English message (plan §9). */
  message: string;
  /** Component ids the UI may highlight, when meaningful. */
  targetIds?: string[];
}

/**
 * Outcome-based status for a learner-facing requirement (UX correction plan
 * §6). Kept separate from the internal `rules` so the panel never has to
 * expose the construction recipe to report progress or next action.
 */
export interface RequirementStatus {
  id: string;
  /** Short outcome name, e.g. "Protected by an MCB". */
  label: string;
  /** Problem sentence shown when not met. */
  check: string;
  /** True when every mapped internal rule passes. */
  met: boolean;
  /** First non-passing mapped rule — drives "Focus this step" + palette. */
  firstRule: RuleResult | null;
}

/**
 * Derive learner-facing requirement statuses from the internal rule results.
 * A requirement is met only when ALL of its mapped rules pass, so hiding the
 * rules never weakens validation — it only hides *why* from the learner.
 */
function evaluateRequirements(
  definition: ChallengeDefinition,
  rules: RuleResult[],
): RequirementStatus[] {
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  return (definition.requirements ?? []).map((requirement: ChallengeRequirement) => {
    const matching = requirement.ruleIds
      .map((id) => byId.get(id))
      .filter((rule): rule is RuleResult => Boolean(rule));
    const firstRule = matching.find((rule) => rule.verdict !== 'pass') ?? null;
    return {
      id: requirement.id,
      label: requirement.label,
      check: requirement.check,
      met: firstRule === null && matching.length > 0,
      firstRule,
    };
  });
}

export interface ChallengeVerdict {
  state: ChallengeState;
  /** 0..1. */
  completion: number;
  completedRules: number;
  totalRules: number;
  /** Stable definition order (plan §6). */
  rules: RuleResult[];
  /** First non-passing rule — the recommended next step (plan §6). */
  nextRule: RuleResult | null;
  /**
   * Learner-facing outcome statuses (UX correction plan §6). This is what the
   * panel renders; `rules` stays internal to the validator.
   */
  requirements: RequirementStatus[];
  /** True when the circuit simulates cleanly with the real engine. */
  electricallySound: boolean;
  /** Extra component types outside `allowedComponents` (plan §20: warn only). */
  extraComponents: string[];
  /** Simulation errors, when the functional gate ran and failed. */
  simulationErrors: string[];
  /** Human summary for the status line (plan §9). */
  summary: string;
}

export interface ValidateOptions {
  /**
   * Circuit state to evaluate (defaults to the learner's live canvas state).
   * Used by the functional rules to prove behaviour under presses.
   */
  pressedTypes?: readonly string[];
}

/** Aggregate verdicts into the plan's four overall states (§6). */
function overallState(ruleVerdicts: RuleVerdict[]): ChallengeState {
  if (ruleVerdicts.length === 0) return 'in-progress';
  if (ruleVerdicts.every((verdict) => verdict === 'pass')) return 'complete';
  if (ruleVerdicts.some((verdict) => verdict === 'fail')) return 'has-errors';
  return 'in-progress';
}

/** Validate a learner's circuit against a challenge definition. */
export function validateChallenge(
  definition: ChallengeDefinition,
  circuit: Circuit,
  options: ValidateOptions = {},
): ChallengeVerdict {
  const graph = indexGraph(circuit);
  const extraComponents = (
    definition.allowedComponents
      ? circuit.components
          .map((component) => component.type)
          .filter((type) => !definition.allowedComponents!.includes(type))
      : []
  ).filter((type, index, all) => all.indexOf(type) === index);

  const rules = definition.rules.map((rule) =>
    rule.evaluate({ graph, circuit, starter: definition.starter }),
  );

  const supplyIssue = exerciseSupplyIssue(definition.starter, circuit, true);
  if (supplyIssue) {
    return {
      state: 'has-errors',
      completion: 0,
      completedRules: 0,
      totalRules: rules.length,
      rules,
      requirements: evaluateRequirements(definition, rules),
      nextRule: {
        id: 'authored-supply',
        label: 'Keep the authored supply',
        verdict: 'fail',
        reason: supplyIssue,
        targets: [],
      },
      electricallySound: false,
      extraComponents,
      simulationErrors: [],
      summary: supplyIssue,
    };
  }

  const structural = structuralIssues(graph);
  if (structural.length > 0) {
    return {
      state: 'has-errors',
      completion: 0,
      completedRules: 0,
      totalRules: rules.length,
      rules,
      requirements: evaluateRequirements(definition, rules),
      nextRule: {
        id: 'structure',
        label: 'Every wire is properly connected',
        verdict: 'fail',
        reason: structural[0],
        targets: graph.wires
          .filter((wire) => {
            const from = graph.byId.get(wire.fromComponentId);
            const to = graph.byId.get(wire.toComponentId);
            return (
              !from ||
              !to ||
              !COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex] ||
              !COMPONENT_DEFS[to.type]?.ports[wire.toPortIndex]
            );
          })
          .map((wire) => ({ kind: 'wire' as const, id: wire.id })),
      },
      electricallySound: false,
      extraComponents,
      simulationErrors: [],
      summary: 'Some wires are not properly connected.',
    };
  }

  // Existing electrical rule engine (plan §2: never a second architecture).
  // Errors here are hard failures — a challenge must not be completable with
  // a circuit the editor itself would reject (reverse polarity, rail shorts).
  const ruleDiagnostics = validateCircuitRules(circuit, 'basic').filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
  if (ruleDiagnostics.length > 0) {
    return {
      state: 'has-errors',
      completion: 0,
      completedRules: 0,
      totalRules: rules.length,
      rules,
      requirements: evaluateRequirements(definition, rules),
      nextRule: {
        id: 'electrical-rules',
        label: 'The wiring breaks an electrical rule',
        verdict: 'fail',
        reason: ruleDiagnostics[0]!.message,
        targets: [
          {
            kind: 'component',
            id: ruleDiagnostics[0]!.sourceComponentId,
            portIndex: ruleDiagnostics[0]!.sourceTerminalIndex,
          },
          {
            kind: 'component',
            id: ruleDiagnostics[0]!.targetComponentId,
            portIndex: ruleDiagnostics[0]!.targetTerminalIndex,
          },
        ],
      },
      electricallySound: false,
      extraComponents,
      simulationErrors: [],
      summary: 'The wiring breaks an electrical rule.',
    };
  }

  // Functional evidence: run the REAL simulator under the requested presses.
  let electricallySound = false;
  const simulationErrors: string[] = [];
  try {
    const pressed = new Set(options.pressedTypes ?? []);
    const evidenceCircuit: Circuit = {
      ...circuit,
      components: circuit.components.map((component) => {
        if (!pressed.has(component.type)) return component;
        if (!COMPONENT_DEFS[component.type]?.isMomentary) return component;
        return { ...component, state: { ...component.state, on: true } };
      }),
    };
    const result = simulate(evidenceCircuit, { appMode: 'pro' });
    electricallySound =
      result.errors.length === 0 &&
      (result.trippedComponents?.length ?? 0) === 0 &&
      (result.blownComponents?.length ?? 0) === 0 &&
      (result.bustedWires?.size ?? 0) === 0;
    simulationErrors.push(...result.errors);
  } catch (error) {
    simulationErrors.push(error instanceof Error ? error.message : String(error));
  }

  const completedRules = rules.filter((result) => result.verdict === 'pass').length;
  const nextRule = rules.find((result) => result.verdict !== 'pass') ?? null;
  const state = overallState(rules.map((result) => result.verdict));
  const completion = rules.length === 0 ? 1 : completedRules / rules.length;

  let summary: string;
  if (state === 'complete') summary = 'Circuit complete and working correctly.';
  else if (state === 'has-errors') summary = nextRule?.reason ?? 'Something is not right yet.';
  else summary = nextRule?.reason ?? 'Keep building.';

  return {
    state,
    completion,
    completedRules,
    totalRules: rules.length,
    rules,
    nextRule,
    requirements: evaluateRequirements(definition, rules),
    electricallySound,
    extraComponents,
    simulationErrors,
    summary,
  };
}

/** Convenience: validate by challenge id. */
export function validateChallengeById(
  id: ChallengeId,
  circuit: Circuit,
  options: ValidateOptions = {},
): ChallengeVerdict | null {
  const definition = getChallengeDefinition(id);
  if (!definition) return null;
  return validateChallenge(definition, circuit, options);
}

/** Extra-component warning for the panel (plan §20). */
export function describeExtraComponents(extraComponents: readonly string[]): string | null {
  if (extraComponents.length === 0) return null;
  const labels = extraComponents.map((type) => COMPONENT_DEFS[type]?.label ?? type);
  return `Not part of this circuit (kept as-is): ${labels.join(', ')}.`;
}
