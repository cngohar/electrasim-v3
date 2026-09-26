/**
 * Fault injection for scenarios (plan §11, §13, Phase D step 4).
 *
 * Injection is *placement*, not simulation: this module decides which
 * candidate the seed selects and returns a new circuit carrying that fault.
 * The fault object itself is built by the existing `createInjectedFault()`,
 * and the fault is carried in the existing `Circuit.faults` field — §13's
 * rule is explicit:
 *
 *     The implementation must not invent a parallel fault representation if
 *     an existing one already exists.
 *
 * So there is no `DiagnosisFault` type here. A scenario's fault IS an
 * `InjectedFault`, and the learner repairs it with the same store actions the
 * editor's own context menu uses.
 *
 * ── Determinism note ────────────────────────────────────────────────────────
 * `createInjectedFault()` mints its id with `Math.random()`. That is correct
 * for interactive use but fatal for a seeded scenario: the same seed would
 * produce a different `fault.id` on every generation, so a persisted run
 * could not be replayed and the stress harness could not diff two runs. We
 * therefore keep the registry call (it supplies `category` and validates the
 * type) and overwrite only the two non-deterministic fields, `id` and
 * `createdAt`. No fault *behaviour* is duplicated or altered.
 */

import { createInjectedFault } from '../../faults';
import type { Circuit, FaultTarget, InjectedFault } from '../../types';
import type { Rng } from '../generator/seed';
import { fnv1a32 } from '../generator/seed';
import type { FaultCandidate } from './eligibility';
import { labelById } from './labels';

/**
 * Deterministic stand-in for `Date.now()` on a generated fault.
 *
 * A scenario fault is not a real-world event, so it has no meaningful
 * timestamp; using 0 keeps the circuit fingerprint stable across runs. The
 * learner-visible clock is the challenge timer, which lives in the store.
 */
export const SCENARIO_FAULT_CREATED_AT = 0;

/** Build the deterministic id for a scenario fault. */
export function scenarioFaultId(challengeId: string, candidate: FaultCandidate): string {
  const hash = fnv1a32(`${challengeId}|${candidate.key}`).toString(36);
  return `fault_scenario_${hash}`;
}

/**
 * Create the scenario's fault: the existing registry object with its two
 * non-deterministic fields pinned.
 */
export function createScenarioFault(challengeId: string, candidate: FaultCandidate): InjectedFault {
  const base = createInjectedFault(candidate.type, candidate.target);
  return {
    ...base,
    id: scenarioFaultId(challengeId, candidate),
    createdAt: SCENARIO_FAULT_CREATED_AT,
  };
}

/**
 * Return a copy of `circuit` carrying exactly `faults`.
 *
 * Only the modern `Circuit.faults` array is written. The legacy per-wire
 * `wire.fault` / per-component `state.fault` mirrors are deliberately left
 * alone: `normalizeCircuitFaults()` already folds all three into one list for
 * the simulator, and writing two representations would create exactly the
 * duplicate-state problem §13 warns about (and would let a learner "repair"
 * one copy while the other stayed live).
 */
export function withScenarioFaults(circuit: Circuit, faults: InjectedFault[]): Circuit {
  return { ...circuit, faults };
}

/** Remove one fault by id, leaving any others untouched. */
export function withoutFault(circuit: Circuit, faultId: string): Circuit {
  return { ...circuit, faults: (circuit.faults ?? []).filter((f) => f.id !== faultId) };
}

/**
 * Pick one candidate using the scenario RNG.
 *
 * Selection is weighted so a run feels varied rather than uniformly random
 * across a lopsided candidate list. Wire faults dominate the raw list simply
 * because circuits have many wires; without weighting, terminal and
 * protection faults would almost never appear on a large circuit.
 */
export function selectFaultCandidate(
  candidates: readonly FaultCandidate[],
  rng: Rng,
): FaultCandidate | null {
  if (candidates.length === 0) return null;

  // Choose the *kind of place* first, then a specific target within it, so
  // the odds of seeing a terminal fault don't shrink as the circuit grows.
  const byPlacement = new Map<string, FaultCandidate[]>();
  for (const c of candidates) {
    const list = byPlacement.get(c.placement);
    if (list) list.push(c);
    else byPlacement.set(c.placement, [c]);
  }

  const placements = [...byPlacement.keys()].sort();
  const weights = placements.map((p) => PLACEMENT_WEIGHTS[p as FaultCandidate['placement']] ?? 1);
  const placement = rng.pickWeighted(placements, weights);
  const pool = byPlacement.get(placement);
  if (!pool || pool.length === 0) return null;
  return rng.pick(pool);
}

const PLACEMENT_WEIGHTS: Record<FaultCandidate['placement'], number> = {
  wire: 6,
  'load-port': 3,
  'protection-component': 2,
};

/** Human-readable description of where a fault sits — for logs and hints. */
export function describeFaultTarget(circuit: Circuit, target: FaultTarget): string {
  if (target.type === 'wire') {
    const wire = circuit.wires.find((w) => w.id === target.id);
    if (!wire) return 'an unknown wire';
    const from = labelById(circuit, wire.fromComponentId, 'unknown');
    const to = labelById(circuit, wire.toComponentId, 'unknown');
    return `the wire between ${from} and ${to}`;
  }
  if (target.type === 'component') {
    return `the ${labelById(circuit, target.id, 'unknown component')}`;
  }
  return `terminal ${target.portIndex + 1} of the ${labelById(circuit, target.componentId, 'unknown component')}`;
}
