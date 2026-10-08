/** Bounded dense factorization for the first linear MNA slice. No matrix inverse,
 * hidden grounding or substitute conductance is used to regularize a circuit.
 */
export const LINEAR_SYSTEM_LIMITS = {
  maxUnknowns: 512,
  minimumScaledPivot: 1e-12,
  relativeTolerance: 1e-6,
  absoluteTolerance: 1e-9,
} as const;

export type LinearSystemResult =
  | {
      status: 'solved';
      values: Float64Array;
      minimumScaledPivot: number;
      /** Each row is divided by its absolute + relative residual allowance. */
      maximumResidualRatio: number;
    }
  | {
      status: 'invalid' | 'too-large' | 'singular' | 'ill-conditioned' | 'residual-failed';
    };

/** Compensated summation keeps conservation checks useful under cancellation. */
export function compensatedSum(values: Iterable<number>): number {
  let sum = 0;
  let correction = 0;
  for (const value of values) {
    const next = sum + value;
    correction += Math.abs(sum) >= Math.abs(value) ? sum - next + value : value - next + sum;
    sum = next;
  }
  return sum + correction;
}

export function residualRatio(residual: number, scale: number): number {
  return (
    Math.abs(residual) /
    (LINEAR_SYSTEM_LIMITS.absoluteTolerance +
      LINEAR_SYSTEM_LIMITS.relativeTolerance * Math.abs(scale))
  );
}

/** Scaled partial pivoting followed by back substitution and verification against
 * the original equations. The caller assigns units to rows (KCL amps / source volts).
 * The pivot guard is a conditioning screen, not a claimed condition-number estimate.
 */
export function solveLinearSystem(
  matrix: readonly Float64Array[],
  rhs: Float64Array,
): LinearSystemResult {
  const size = matrix.length;
  if (size > LINEAR_SYSTEM_LIMITS.maxUnknowns) return { status: 'too-large' };
  if (rhs.length !== size) return { status: 'invalid' };
  const rows: Float64Array[] = [];
  const values = rhs.slice();
  const scales = new Float64Array(size);
  for (let row = 0; row < size; row++) {
    const original = matrix[row]!;
    if (original.length !== size || !Number.isFinite(rhs[row])) return { status: 'invalid' };
    let largest = 0;
    for (let column = 0; column < size; column++) {
      const value = original[column]!;
      if (!Number.isFinite(value)) return { status: 'invalid' };
      largest = Math.max(largest, Math.abs(value));
    }
    rows.push(original.slice());
    scales[row] = largest;
  }
  let minimumScaledPivot = 1;
  for (let column = 0; column < size; column++) {
    let pivotRow = column;
    let pivotRatio = 0;
    for (let row = column; row < size; row++) {
      const scale = scales[row]!;
      const ratio = scale === 0 ? 0 : Math.abs(rows[row]![column]!) / scale;
      if (ratio > pivotRatio) {
        pivotRatio = ratio;
        pivotRow = row;
      }
    }
    if (pivotRatio === 0) return { status: 'singular' };
    if (!Number.isFinite(pivotRatio)) return { status: 'ill-conditioned' };
    minimumScaledPivot = Math.min(minimumScaledPivot, pivotRatio);
    if (minimumScaledPivot < LINEAR_SYSTEM_LIMITS.minimumScaledPivot)
      return { status: 'ill-conditioned' };
    if (pivotRow !== column) {
      [rows[column], rows[pivotRow]] = [rows[pivotRow]!, rows[column]!];
      [values[column], values[pivotRow]] = [values[pivotRow]!, values[column]!];
      [scales[column], scales[pivotRow]] = [scales[pivotRow]!, scales[column]!];
    }
    const pivot = rows[column]!;
    for (let row = column + 1; row < size; row++) {
      const target = rows[row]!;
      // Exact structural zeros require no row operation. Keep dense storage and
      // the same pivot/residual checks; never drop small nonzero conductances.
      if (target[column] === 0) continue;
      const factor = target[column]! / pivot[column]!;
      if (!Number.isFinite(factor)) return { status: 'ill-conditioned' };
      target[column] = 0;
      for (let next = column + 1; next < size; next++)
        target[next] = target[next]! - factor * pivot[next]!;
      values[row] = values[row]! - factor * values[column]!;
    }
  }
  for (let row = size - 1; row >= 0; row--) {
    const coefficients = rows[row]!;
    let value = values[row]!;
    for (let column = row + 1; column < size; column++)
      value -= coefficients[column]! * values[column]!;
    values[row] = value / coefficients[row]!;
    if (!Number.isFinite(values[row])) return { status: 'ill-conditioned' };
    // Signed zero has no directional information and must survive JSON replay.
    if (values[row] === 0) values[row] = 0;
  }
  let maximumResidualRatio = 0;
  for (let row = 0; row < size; row++) {
    // Accumulate the original equations directly, with the same Neumaier
    // compensation and coefficient order, without allocating two dense arrays.
    let sum = 0;
    let correction = 0;
    let magnitude = 0;
    let magnitudeCorrection = 0;
    const original = matrix[row]!;
    for (let column = 0; column <= size; column++) {
      const value = column === size ? -rhs[row]! : original[column]! * values[column]!;
      const next = sum + value;
      correction += Math.abs(sum) >= Math.abs(value) ? sum - next + value : value - next + sum;
      sum = next;
      if (column < size) {
        const absolute = Math.abs(value);
        const nextMagnitude = magnitude + absolute;
        magnitudeCorrection +=
          magnitude >= absolute
            ? magnitude - nextMagnitude + absolute
            : absolute - nextMagnitude + magnitude;
        magnitude = nextMagnitude;
      }
    }
    const residual = sum + correction;
    const scale = magnitude + magnitudeCorrection + Math.abs(rhs[row]!);
    const ratio = residualRatio(residual, scale);
    if (!Number.isFinite(ratio) || ratio > 1) return { status: 'residual-failed' };
    maximumResidualRatio = Math.max(maximumResidualRatio, ratio);
  }
  return { status: 'solved', values, minimumScaledPivot, maximumResidualRatio };
}
