/**
 * Baseline validation for generated circuits (plan §10).
 *
 * "Every generated circuit must pass validation before a fault is injected."
 *
 * Four gates run in order, cheapest first. Each composes an EXISTING engine —
 * this module adds no parallel rule set (plan §58):
 *
 *   1. Structure   — ids, ports, layout, required recipe components.
 *   2. Rules       — `validateCircuitRules()` from `domain/electrical`.
 *   3. Validation  — `validateCircuit()` (BS 7671 + compliance), zero errors.
 *   4. Simulation  — `simulate()` in BOTH `basic` and `pro` app modes, with
 *                    the recipe's expected loads actually energised.
 *
 * A candidate is rejected as soon as a gate fails, and the reasons are
 * returned so `generator.ts` can report *why* a seed was hard to satisfy.
 */

import { validateCircuit } from '../../circuitValidation';
import { COMPONENT_DEFS } from '../../components';
import { validateCircuitRules } from '../../electrical/validation';
import { simulate } from '../../simulation';
import type { Circuit, SimulationResult } from '../../types';
import type { CandidateValidationResult, GenerationRejection } from '../types';
import { hasOverlappingComponents, isGridAligned } from './layout';

type Rejection = Omit<GenerationRejection, 'attempt' | 'recipeId'>;

export interface ValidateCandidateOptions {
  circuit: Circuit;
  /** Loads the recipe expects to be energised with the generated states. */
  expectedEnergisedLoadIds: readonly string[];
  /** Minimum / maximum component count from the difficulty profile. */
  componentBudget?: { min: number; max: number };
}

/**
 * Gate 1 — structural soundness.
 *
 * Catches recipe bugs (dangling wire endpoints, unknown ports, stacked
 * components) that the electrical engines would either ignore or report in a
 * confusing way.
 */
function validateStructure(circuit: Circuit, budget?: { min: number; max: number }): string[] {
  const reasons: string[] = [];
  const { components, wires } = circuit;

  if (components.length === 0) {
    reasons.push('circuit has no components');
    return reasons;
  }
  if (wires.length === 0) {
    reasons.push('circuit has no wires');
    return reasons;
  }

  const byId = new Map(components.map((component) => [component.id, component]));
  if (byId.size !== components.length) {
    reasons.push('duplicate component ids');
  }
  if (new Set(wires.map((wire) => wire.id)).size !== wires.length) {
    reasons.push('duplicate wire ids');
  }

  for (const component of components) {
    if (!COMPONENT_DEFS[component.type]) {
      reasons.push(`unknown component type "${component.type}"`);
    }
  }

  const wiredComponents = new Set<string>();
  for (const wire of wires) {
    const from = byId.get(wire.fromComponentId);
    const to = byId.get(wire.toComponentId);
    if (!from || !to) {
      reasons.push(`wire ${wire.id} references a missing component`);
      continue;
    }
    if (from.id === to.id) {
      reasons.push(`wire ${wire.id} is a self-loop`);
    }
    const fromPort = COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex];
    const toPort = COMPONENT_DEFS[to.type]?.ports[wire.toPortIndex];
    if (!fromPort || !toPort) {
      reasons.push(`wire ${wire.id} references a port that does not exist`);
      continue;
    }
    if (fromPort.type !== toPort.type) {
      reasons.push(`wire ${wire.id} joins ${fromPort.type} to ${toPort.type}`);
    }
    if (!(wire.lengthMeters && wire.lengthMeters > 0)) {
      reasons.push(`wire ${wire.id} has no run length`);
    }
    if (!(wire.customCableMm2 && wire.customCableMm2 > 0)) {
      reasons.push(`wire ${wire.id} has no cable cross-section`);
    }
    wiredComponents.add(from.id);
    wiredComponents.add(to.id);
  }

  for (const component of components) {
    if (!wiredComponents.has(component.id)) {
      reasons.push(`component ${component.id} is unwired`);
    }
  }

  // A generated circuit must have at least one live and one neutral source,
  // otherwise `simulate()` short-circuits into a "no supply" warning.
  const hasLiveSource = components.some((component) => {
    const def = COMPONENT_DEFS[component.type];
    return def?.isSource && def.ports.some((port) => port.type === 'live');
  });
  const hasNeutralSource = components.some((component) => {
    const def = COMPONENT_DEFS[component.type];
    return def?.isSource && def.ports.some((port) => port.type === 'neutral');
  });
  if (!hasLiveSource) reasons.push('no live supply source');
  if (!hasNeutralSource) reasons.push('no neutral supply source');

  if (!isGridAligned(components)) {
    reasons.push('components are not grid aligned');
  }
  if (hasOverlappingComponents(components)) {
    reasons.push('components overlap on the canvas');
  }

  if (budget) {
    if (components.length < budget.min) {
      reasons.push(`component count ${components.length} below budget minimum ${budget.min}`);
    }
    if (components.length > budget.max) {
      reasons.push(`component count ${components.length} above budget maximum ${budget.max}`);
    }
  }

  return reasons;
}

/** Gate 4 helper — did the circuit behave the way the recipe promised? */
function validateBehaviour(
  result: SimulationResult,
  expectedEnergisedLoadIds: readonly string[],
  label: string,
): string[] {
  const reasons: string[] = [];

  for (const loadId of expectedEnergisedLoadIds) {
    if (!result.energizedComponents.has(loadId)) {
      reasons.push(`${label}: expected load ${loadId} is not energised`);
    }
  }
  if (result.errorComponents.size > 0) {
    reasons.push(`${label}: ${result.errorComponents.size} component(s) flagged in error`);
  }
  if (result.errorWires.size > 0) {
    reasons.push(`${label}: ${result.errorWires.size} wire(s) flagged in error`);
  }
  if (result.blownComponents && result.blownComponents.length > 0) {
    reasons.push(
      `${label}: components blew (${result.blownComponents.map((c) => c.reason).join(', ')})`,
    );
  }
  if (result.trippedComponents && result.trippedComponents.length > 0) {
    reasons.push(`${label}: protection tripped at baseline`);
  }
  if (result.bustedWires && result.bustedWires.size > 0) {
    reasons.push(`${label}: cable melted at baseline`);
  }
  if (result.overloadedWires && result.overloadedWires.size > 0) {
    reasons.push(`${label}: cable overloaded at baseline`);
  }
  if (result.faultsCleared === false) {
    reasons.push(`${label}: baseline simulation reports unresolved faults`);
  }

  return reasons;
}

/**
 * Run every baseline gate against one candidate circuit.
 *
 * Pure: no clock, no storage, no mutation of the input circuit.
 */
export function validateCandidate(options: ValidateCandidateOptions): CandidateValidationResult {
  const { circuit, expectedEnergisedLoadIds, componentBudget } = options;
  const rejections: Rejection[] = [];

  // ── Gate 1: structure ───────────────────────────────────────────────
  const structureReasons = validateStructure(circuit, componentBudget);
  if (structureReasons.length > 0) {
    return { ok: false, rejections: [{ stage: 'structure', reasons: structureReasons }] };
  }

  // ── Gate 2: connection rule engine ──────────────────────────────────
  // `basic` is the strictest mode (several rules downgrade to warnings in
  // `pro`), so a circuit that is clean here is clean everywhere.
  const ruleDiagnostics = validateCircuitRules(circuit, 'basic').filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
  if (ruleDiagnostics.length > 0) {
    rejections.push({
      stage: 'rules',
      reasons: ruleDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    });
    return { ok: false, rejections };
  }

  // ── Gate 3+4 interleaved: simulate, then validate with that result ───
  // `validateCircuit()` folds simulation errors into `sim_active_fault`, so
  // the simulation has to run first for the report to be meaningful.
  const basicResult = simulate(circuit, { appMode: 'basic' });
  const proResult = simulate(circuit, { appMode: 'pro' });

  const simulationReasons: string[] = [];
  for (const [label, result] of [
    ['basic', basicResult],
    ['pro', proResult],
  ] as const) {
    for (const error of result.errors) {
      simulationReasons.push(`${label}: ${error}`);
    }
  }
  if (simulationReasons.length > 0) {
    rejections.push({ stage: 'simulation', reasons: simulationReasons });
    return { ok: false, rejections, basicResult, proResult };
  }

  const report = validateCircuit(circuit, proResult, 'uk');
  const errorIssues = report.issues.filter((issue) => issue.severity === 'error');
  if (errorIssues.length > 0) {
    rejections.push({
      stage: 'validation',
      reasons: errorIssues.map((issue) => `${issue.id}: ${issue.title}`),
    });
    return { ok: false, rejections, basicResult, proResult };
  }
  if (report.status === 'empty' || report.status === 'incomplete') {
    rejections.push({
      stage: 'validation',
      reasons: [`validation report status is "${report.status}"`],
    });
    return { ok: false, rejections, basicResult, proResult };
  }

  // ── Gate 4: expected behaviour ──────────────────────────────────────
  const behaviourReasons = [
    ...validateBehaviour(basicResult, expectedEnergisedLoadIds, 'basic'),
    ...validateBehaviour(proResult, expectedEnergisedLoadIds, 'pro'),
  ];
  if (behaviourReasons.length > 0) {
    rejections.push({ stage: 'behaviour', reasons: behaviourReasons });
    return { ok: false, rejections, basicResult, proResult };
  }

  return { ok: true, rejections: [], basicResult, proResult };
}
