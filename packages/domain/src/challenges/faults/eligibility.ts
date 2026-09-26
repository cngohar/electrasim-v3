/**
 * Fault eligibility (plan §11, Phase D step 3).
 *
 * "The generator chooses a fault that is valid for the selected circuit." —
 * but per §57 the *generator* must stay fault-free, so eligibility lives in
 * the scenario layer, exactly where §1.3 puts it:
 *
 *     Fault injection belongs to the scenario layer, not the generator core.
 *
 * This module answers one question: **which (fault type, target) pairs are
 * even worth trying on this circuit?** It does not inject anything and it does
 * not decide observability — that is `injection.ts` and `verification.ts`.
 *
 * Nothing here re-implements the fault model. The candidate set is filtered
 * through the existing `getAvailableFaultsForTarget()` registry rules, so a
 * fault kind added to `FAULT_REGISTRY` tomorrow is picked up automatically and
 * a rule tightened there tightens here too.
 */

import { getAvailableFaultsForTarget } from '../../faults';
import type { Circuit, FaultTarget, FaultType } from '../../types';
import type { GeneratedScenario } from '../types';

/**
 * The fault kinds the Diagnosis Lab is allowed to teach, and where each one
 * may be placed.
 *
 * This list is intentionally a *subset* of `FAULT_REGISTRY`. Every entry was
 * driven through the full inject → observe → repair → recover loop by the
 * Phase B stress harness (223,656 injections) and shown to be observable and
 * fully recoverable on generated circuits. Kinds outside this list are not
 * "unsupported" — they are simply not yet proven safe to auto-generate, and
 * §12 forbids shipping a challenge whose fault might not show up.
 */
export const DIAGNOSABLE_FAULTS: readonly { type: FaultType; placement: FaultPlacement }[] = [
  { type: 'open-circuit', placement: 'wire' },
  { type: 'open-live', placement: 'wire' },
  { type: 'open-neutral', placement: 'wire' },
  { type: 'short-circuit', placement: 'wire' },
  { type: 'earth-fault', placement: 'wire' },
  { type: 'live-to-earth', placement: 'wire' },
  { type: 'reverse-polarity', placement: 'wire' },
  { type: 'terminal-disconnect', placement: 'load-port' },
  { type: 'protection-forced-open', placement: 'protection-component' },
] as const;

export type FaultPlacement = 'wire' | 'load-port' | 'protection-component';

/**
 * `open-earth` breaks only the CPC. On a TN circuit with no earth-referenced
 * measurement it changes nothing a learner can *see* — it is a safety defect,
 * not a functional one (Phase B finding, ADR 0002). Diagnosing an invisible
 * fault is guesswork, so it is excluded from the Diagnosis Lab rather than
 * shipped as a challenge that fails §12.
 */
export const NON_DIAGNOSABLE_FAULTS: ReadonlySet<FaultType> = new Set<FaultType>(['open-earth']);

/** One concrete, placeable fault: a kind plus the exact thing it sits on. */
export interface FaultCandidate {
  type: FaultType;
  target: FaultTarget;
  placement: FaultPlacement;
  /** Stable, human-readable key — used for logging and deterministic sorting. */
  key: string;
}

/** Stable key for a candidate, independent of object identity or array order. */
export function candidateKey(type: FaultType, target: FaultTarget): string {
  const where =
    target.type === 'port'
      ? `port:${target.componentId}:${target.portIndex}`
      : `${target.type}:${target.id}`;
  return `${type}@${where}`;
}

/**
 * Every fault that could legitimately be injected into this circuit.
 *
 * Returns candidates in a deterministic order (sorted by `key`) so that a
 * given seed always sees the same list regardless of how the circuit's arrays
 * happened to be built. Seeded selection happens in `injection.ts`.
 *
 * Only targets the recipe itself nominated are used:
 *   - `faultCandidateWireIds` — wires the recipe considers meaningful, so we
 *     never break, say, a decorative stub.
 *   - `loadComponentIds` — terminal faults sit on a load's own terminals,
 *     which is where a loose screw actually happens.
 *   - `protectionComponentIds` — only real protective devices can jam open.
 */
export function collectFaultCandidates(
  circuit: Circuit,
  // Only the three nomination lists are read. Taking the narrow shape rather
  // than a whole `GeneratedScenario` lets callers that legitimately have just
  // these lists — the rage candidate stage, tests assembling a fixture — pass
  // them without inventing prose fields that would never be used.
  scenario: Pick<
    GeneratedScenario,
    'faultCandidateWireIds' | 'loadComponentIds' | 'protectionComponentIds'
  >,
): FaultCandidate[] {
  const wireIds = new Set(scenario.faultCandidateWireIds);
  const wires = circuit.wires.filter((w) => wireIds.has(w.id));
  const candidates: FaultCandidate[] = [];

  for (const { type, placement } of DIAGNOSABLE_FAULTS) {
    if (NON_DIAGNOSABLE_FAULTS.has(type)) continue;

    if (placement === 'wire') {
      for (const wire of wires) {
        const target: FaultTarget = { type: 'wire', id: wire.id };
        if (isAllowedByRegistry(circuit, target, type)) {
          candidates.push({ type, target, placement, key: candidateKey(type, target) });
        }
      }
      continue;
    }

    if (placement === 'load-port') {
      // A terminal fault is only meaningful on a terminal that is actually
      // wired to something — an unused port is not "disconnected", it is idle.
      for (const wire of wires) {
        for (const end of [
          { componentId: wire.toComponentId, portIndex: wire.toPortIndex },
          { componentId: wire.fromComponentId, portIndex: wire.fromPortIndex },
        ]) {
          if (!scenario.loadComponentIds.includes(end.componentId)) continue;
          const target: FaultTarget = {
            type: 'port',
            componentId: end.componentId,
            portIndex: end.portIndex,
          };
          const key = candidateKey(type, target);
          if (candidates.some((c) => c.key === key)) continue;
          if (isAllowedByRegistry(circuit, target, type)) {
            candidates.push({ type, target, placement, key });
          }
        }
      }
      continue;
    }

    for (const id of scenario.protectionComponentIds) {
      const target: FaultTarget = { type: 'component', id };
      if (isAllowedByRegistry(circuit, target, type)) {
        candidates.push({ type, target, placement, key: candidateKey(type, target) });
      }
    }
  }

  candidates.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return candidates;
}

/** Does the *existing* fault registry permit this kind on this target? */
function isAllowedByRegistry(circuit: Circuit, target: FaultTarget, type: FaultType): boolean {
  return getAvailableFaultsForTarget(circuit, target).some((d) => d.id === type);
}

/**
 * The distinct fault *kinds* present in a candidate list — the pool the
 * multiple-choice question in §15A draws its distractors from.
 */
export function eligibleFaultTypes(candidates: readonly FaultCandidate[]): FaultType[] {
  const seen = new Set<FaultType>();
  const out: FaultType[] = [];
  for (const c of candidates) {
    if (seen.has(c.type)) continue;
    seen.add(c.type);
    out.push(c.type);
  }
  return out;
}
