import { compareIds } from './faultTopology';

export interface VoltageConstraint {
  id: string;
  positive: string;
  negative: string;
  voltage: number;
}

/** Detect dependent ideal-source equations before factorization. A consistent
 * loop still has indeterminate source currents; it cannot acquire an equal split.
 */
export function inspectVoltageConstraints(constraints: readonly VoltageConstraint[]): {
  conflicting: string[];
  redundant: string[];
} {
  const parent = new Map<string, string>();
  // potential(node) - potential(parent)
  const offset = new Map<string, number>();
  const find = (id: string): { root: string; potential: number } => {
    if (!parent.has(id)) {
      parent.set(id, id);
      offset.set(id, 0);
    }
    let root = id;
    let potential = 0;
    for (;;) {
      const next = parent.get(root)!;
      if (next === root) return { root, potential };
      potential += offset.get(root)!;
      root = next;
    }
  };
  const conflicting: string[] = [];
  const redundant: string[] = [];
  for (const constraint of [...constraints].sort((a, b) => compareIds(a.id, b.id))) {
    const positive = find(constraint.positive);
    const negative = find(constraint.negative);
    const difference = constraint.voltage - positive.potential + negative.potential;
    if (positive.root === negative.root) {
      // Only arithmetic roundoff is allowed here, not the looser measurement
      // tolerance: two declared 12 V and 12.000001 V ideal sources do conflict.
      const roundoff =
        Number.EPSILON *
        32 *
        Math.max(
          Math.abs(constraint.voltage),
          Math.abs(positive.potential),
          Math.abs(negative.potential),
          Number.MIN_VALUE,
        ) *
        Math.max(1, constraints.length);
      (Math.abs(difference) > roundoff ? conflicting : redundant).push(constraint.id);
    } else if (compareIds(positive.root, negative.root) < 0) {
      parent.set(negative.root, positive.root);
      offset.set(negative.root, -difference);
    } else {
      parent.set(positive.root, negative.root);
      offset.set(positive.root, difference);
    }
  }
  return { conflicting, redundant };
}
