/**
 * Fault observability verification (plan §12, Phase D step 5).
 *
 * This is the gate the plan calls **mandatory**:
 *
 *     Never ship a generated challenge where the intentional fault has no
 *     meaningful observable effect.
 *
 * A scenario that fails this check is rejected and the generator is asked for
 * another candidate — the learner never sees it. That is what stops the
 * failure mode the plan names directly: *"the generator says there is a
 * fault, but nothing actually appears wrong."*
 *
 * Observability is measured **only from simulator output**, never from the
 * fault's own declaration. Asking the fault whether it did something would be
 * circular; we diff two `SimulationResult`s instead. This is the same symptom
 * model the Phase B stress harness locked in (`diffSymptom` /
 * `isFullRecovery`), promoted from the harness into the domain now that the
 * product depends on it.
 */

import { COMPONENT_DEFS } from '../../components';
import type { Circuit, FaultTarget, SimulationResult } from '../../types';

/** The observable, electrical consequences of a fault. Never diagnostic prose. */
export interface FaultSymptom {
  /** Declared loads that were live at baseline and are dead now. */
  deEnergisedLoadIds: string[];
  /** A protective device operated that had not operated at baseline. */
  tripped: boolean;
  /** Something failed destructively that had not failed at baseline. */
  blown: boolean;
  /** New components flagged in error by the simulator. */
  newErrorComponents: boolean;
  /** New wires flagged in error by the simulator. */
  newErrorWires: boolean;
  /** New simulator-level errors. */
  newErrors: boolean;
  /** True when at least one of the above fired — the §12 gate. */
  observable: boolean;
  /** Which signal to lead with when writing the learner's first hint. */
  primary: SymptomKind | null;
}

export type SymptomKind = 'load-dead' | 'tripped' | 'blown' | 'error';

/**
 * Diff a faulted simulation against its clean baseline.
 *
 * `loadIds` are the scenario's declared loads — the things whose behaviour a
 * learner is actually watching. A fault that only perturbs internal state
 * without touching a load, a protective device or an error list is, for
 * teaching purposes, invisible.
 */
export function diffSymptom(
  baseline: SimulationResult,
  faulted: SimulationResult,
  loadIds: readonly string[],
): FaultSymptom {
  const deEnergisedLoadIds = loadIds.filter(
    (id) => baseline.energizedComponents.has(id) && !faulted.energizedComponents.has(id),
  );
  const tripped =
    (faulted.trippedComponents?.length ?? 0) > (baseline.trippedComponents?.length ?? 0);
  const blown = (faulted.blownComponents?.length ?? 0) > (baseline.blownComponents?.length ?? 0);
  const newErrorComponents = faulted.errorComponents.size > baseline.errorComponents.size;
  const newErrorWires = faulted.errorWires.size > baseline.errorWires.size;
  const newErrors = faulted.errors.length > baseline.errors.length;

  const observable =
    deEnergisedLoadIds.length > 0 ||
    tripped ||
    blown ||
    newErrorComponents ||
    newErrorWires ||
    newErrors;

  // Ordered by how a learner would actually notice it: a dead load is the
  // most legible symptom, an abstract simulator error the least.
  const primary: SymptomKind | null = deEnergisedLoadIds.length
    ? 'load-dead'
    : tripped
      ? 'tripped'
      : blown
        ? 'blown'
        : newErrorComponents || newErrorWires || newErrors
          ? 'error'
          : null;

  return {
    deEnergisedLoadIds,
    tripped,
    blown,
    newErrorComponents,
    newErrorWires,
    newErrors,
    observable,
    primary,
  };
}

/**
 * Did the circuit return *exactly* to its pre-fault electrical state?
 *
 * Returns `null` on full recovery, or a short reason describing the first
 * discrepancy. Plan §16: "Do not mark a challenge complete merely because the
 * user guessed the correct fault name. The circuit must actually recover."
 *
 * The comparison is deliberately strict — equal counts, zero residual errors,
 * nothing still tripped. A "mostly working" circuit is not a repaired one.
 */
export function describeRecoveryGap(
  baseline: SimulationResult,
  repaired: SimulationResult,
): string | null {
  if (repaired.errors.length !== baseline.errors.length)
    return `simulator errors changed (${baseline.errors.length} → ${repaired.errors.length})`;
  if (repaired.energizedComponents.size !== baseline.energizedComponents.size)
    return `energised components changed (${baseline.energizedComponents.size} → ${repaired.energizedComponents.size})`;
  if (repaired.energizedWires.size !== baseline.energizedWires.size)
    return `energised wires changed (${baseline.energizedWires.size} → ${repaired.energizedWires.size})`;
  if (repaired.errorComponents.size !== 0)
    return `${repaired.errorComponents.size} component(s) still in error`;
  if (repaired.errorWires.size !== 0) return `${repaired.errorWires.size} wire(s) still in error`;
  if ((repaired.trippedComponents?.length ?? 0) !== 0) return 'a protective device is still open';
  if (repaired.faultsCleared === false) return 'the simulator still reports active faults';
  return null;
}

/**
 * Structural integrity of a repair: is any connection from the healthy
 * installation now **missing**?
 *
 * The behavioural diff in {@link describeRecoveryGap} is necessary but not
 * sufficient. Some conductors carry no load current in normal service, so
 * removing them changes nothing the energisation counts can see:
 *
 *   - the **CPC** (earth) to a socket — a safety conductor, dead by design;
 *   - a redundant **strapper** between two-way switches — only one of the two
 *     travellers carries current in any given switch position.
 *
 * Deleting either is a *defect*, not a repair, but both leave the simulated
 * energisation identical. Without this check a learner could "fix" a faulty
 * earth by cutting it off, which is precisely the habit the app exists to
 * prevent. Measured on 120 intermediate scenarios, cutting the faulted wire
 * scored a false `success` 5 times before this gate existed and 0 after.
 *
 * Connections are compared as a multiset of **type:port ↔ type:port**
 * signatures rather than by wire id, so a learner who deletes the damaged
 * cable and runs a fresh one between the same terminals still passes.
 * Only a *deficit* fails; extra wires are left to the behavioural diff to
 * judge, since a harmless addition should not be called a broken repair.
 */
export function describeStructuralGap(healthy: Circuit, repaired: Circuit): string | null {
  const wanted = signatureCounts(healthy);
  const have = signatureCounts(repaired);
  for (const [signature, count] of wanted) {
    const present = have.get(signature) ?? 0;
    if (present < count) {
      return `a connection from the original installation is missing (${describeSignature(signature)})`;
    }
  }
  return null;
}

function signatureCounts(circuit: Circuit): Map<string, number> {
  const typeById = new Map(circuit.components.map((c) => [c.id, c.type]));
  const counts = new Map<string, number>();
  for (const wire of circuit.wires) {
    const fromType = typeById.get(wire.fromComponentId);
    const toType = typeById.get(wire.toComponentId);
    if (!fromType || !toType) continue; // dangling — reported by other gates
    const a = `${fromType}:${wire.fromPortIndex}`;
    const b = `${toType}:${wire.toPortIndex}`;
    const key = a <= b ? `${a}|${b}` : `${b}|${a}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function describeSignature(signature: string): string {
  return signature
    .split('|')
    .map((end) => {
      const [type, port] = end.split(':');
      return `${type} terminal ${Number(port) + 1}`;
    })
    .join(' ↔ ');
}

/** Convenience predicate over {@link describeRecoveryGap}. */
export function isFullRecovery(baseline: SimulationResult, repaired: SimulationResult): boolean {
  return describeRecoveryGap(baseline, repaired) === null;
}

/**
 * Do two symptoms look the same *to a person standing in front of the board*?
 *
 * Compares only the three signals a human can actually observe:
 *
 *   - which declared loads are dead,
 *   - whether a protective device operated,
 *   - whether something failed destructively.
 *
 * It deliberately ignores `newErrorWires`, `newErrorComponents` and
 * `newErrors`. Those are *simulator* signals, and the simulator flags a faulted
 * wire as being in error simply because it carries a fault
 * (`simulate.ts:464` — measured at 1,176 of 1,176 wire faults). Including them
 * turns any comparison of "does adding this fault change anything?" into "is
 * this fault present?", to which the answer is trivially yes.
 *
 * That distinction is what makes {@link FaultSymptom.observable} the wrong
 * predicate for masking questions and this the right one. Used by the §26
 * compound-fault proof, which needs "the world with A and B present looks
 * exactly like the world with only A".
 */
export function sameObservableWorld(a: FaultSymptom, b: FaultSymptom): boolean {
  if (a.tripped !== b.tripped) return false;
  if (a.blown !== b.blown) return false;
  if (a.deEnergisedLoadIds.length !== b.deEnergisedLoadIds.length) return false;
  const left = [...a.deEnergisedLoadIds].sort();
  const right = [...b.deEnergisedLoadIds].sort();
  return left.every((id, index) => id === right[index]);
}

/**
 * The location keys a learner would naturally look at, given this symptom.
 *
 * Used by `misleadingSymptom` (plan §26 / §53): a fault is only "misleading"
 * when it does **not** sit in this set. Derived from the measured symptom,
 * never from the answer.
 *
 *   - A dead load → the load itself, its terminals, and every wire that
 *     lands on it. That is the "the lamp is out, check the lamp" reflex.
 *   - A trip with no dead declared load → the protective devices.
 */
export function obviousLocationKeys(circuit: Circuit, symptom: FaultSymptom): Set<string> {
  const keys = new Set<string>();

  const addComponentAndIncident = (id: string) => {
    keys.add(`component:${id}`);
    const component = circuit.components.find((c) => c.id === id);
    const ports = component ? (COMPONENT_DEFS[component.type]?.ports.length ?? 0) : 0;
    for (let i = 0; i < ports; i++) keys.add(`port:${id}:${i}`);
    for (const wire of circuit.wires) {
      if (wire.fromComponentId === id || wire.toComponentId === id) keys.add(`wire:${wire.id}`);
    }
  };

  for (const id of symptom.deEnergisedLoadIds) addComponentAndIncident(id);

  if (symptom.primary === 'tripped' && symptom.deEnergisedLoadIds.length === 0) {
    for (const component of circuit.components) {
      if (COMPONENT_DEFS[component.type]?.isProtection) keys.add(`component:${component.id}`);
    }
  }

  return keys;
}

/** Stable location key matching the grader / location-choice keys. */
export function locationKeyOfTarget(target: FaultTarget): string {
  if (target.type === 'port') return `port:${target.componentId}:${target.portIndex}`;
  return `${target.type}:${target.id}`;
}

/**
 * Does this fault sit somewhere *other* than where the symptom points?
 *
 * False when the symptom is not observable — an invisible fault cannot
 * mislead, it can only fail §12.
 */
export function isMisleadingPlacement(
  circuit: Circuit,
  target: FaultTarget,
  symptom: FaultSymptom,
): boolean {
  if (!symptom.observable) return false;
  return !obviousLocationKeys(circuit, symptom).has(locationKeyOfTarget(target));
}

/**
 * The learner-facing opening line for a symptom (plan §14).
 *
 * Deliberately vague: §14 requires that "the learner should NOT immediately
 * be told the fault". These strings describe what is *seen*, never why.
 */
export function describeSymptom(symptom: FaultSymptom, loadLabels: readonly string[]): string {
  switch (symptom.primary) {
    case 'load-dead': {
      if (loadLabels.length === 0) return 'A load that should be running is dead.';
      if (loadLabels.length === 1) return `The ${loadLabels[0]} is dead.`;
      return `${loadLabels.length} loads are dead: ${loadLabels.join(', ')}.`;
    }
    case 'tripped':
      return 'A protective device has operated and will not stay closed.';
    case 'blown':
      return 'Something in the circuit has failed destructively.';
    case 'error':
      return 'The installation is reporting a fault condition.';
    default:
      return 'Something is not working correctly.';
  }
}
