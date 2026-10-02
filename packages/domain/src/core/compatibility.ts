import type { TerminalCapability } from './capabilities';
import type { SupplyModel } from './contracts';
import { LINEAR_SYSTEM_LIMITS } from './linearSystem';

export type CompatibilityReasonCode =
  | 'supply-kind-mismatch'
  | 'phase-mismatch'
  | 'frequency-mismatch'
  | 'underpowered'
  | 'undervoltage'
  | 'overvoltage'
  | 'unknown-rating'
  | 'unsupported-model'
  | 'missing-supply'
  | 'multiple-sources'
  | 'invalid-measurement';

export interface CompatibilityReason {
  code: CompatibilityReasonCode;
  severity: 'error' | 'warning' | 'info';
  message: string;
  basis: 'declared-model' | 'nominal-supply' | 'solved-terminal';
}

export interface CompatibilityResult {
  status: 'compatible' | 'incompatible' | 'unassessed';
  reasons: CompatibilityReason[];
}

export interface CompatibilityContext {
  supply?: SupplyModel;
  /** Magnitude across THIS group's specified terminals, never conductor potential. */
  terminalVoltage?: number;
  /** False for unsolved series/mixed paths where source voltage is not load voltage. */
  compareNominalVoltage?: boolean;
}

/** Shared candidate/operating-point check. Does not simulate, destroy or re-rate devices.
 * Nominal checks are explicitly provisional; actual measurements must be supplied
 * by the versioned solver for the same document and terminal group.
 */
export function assessTerminalCompatibility(
  group: TerminalCapability,
  context: CompatibilityContext,
): CompatibilityResult {
  const reasons: CompatibilityReason[] = [];
  let incompatible = false;
  let unassessed = false;
  const add = (
    code: CompatibilityReasonCode,
    message: string,
    basis: CompatibilityReason['basis'] = 'declared-model',
    severity: CompatibilityReason['severity'] = 'warning',
  ) => reasons.push({ code, message, basis, severity });
  if (group.role === 'reference' || group.role === 'source')
    return { status: 'compatible', reasons };
  if (!context.supply) {
    add('missing-supply', 'No unique supply is established for this terminal group.');
    return { status: 'unassessed', reasons };
  }
  const supply = context.supply;
  if (group.supplyKinds.status === 'known') {
    if (!group.supplyKinds.value.includes(supply.kind)) {
      incompatible = true;
      const phaseMismatch =
        supply.kind !== 'dc' && group.supplyKinds.value.some((kind) => kind !== 'dc');
      add(
        phaseMismatch ? 'phase-mismatch' : 'supply-kind-mismatch',
        `This terminal group does not support ${supply.kind} under its declared model.`,
        'declared-model',
        'error',
      );
    }
  } else if (group.role !== 'connection') {
    unassessed = true;
    add('unknown-rating', group.supplyKinds.reason);
  }
  if (
    supply.kind !== 'dc' &&
    group.frequencyHz.status === 'known' &&
    !group.frequencyHz.value.includes(supply.frequencyHz)
  ) {
    incompatible = true;
    add(
      'frequency-mismatch',
      `${supply.frequencyHz} Hz is outside the declared operating frequencies.`,
      'declared-model',
      'error',
    );
  }
  if (group.loadLaw.kind === 'not-assessed') {
    unassessed = true;
    add('unsupported-model', group.loadLaw.reason);
  }
  const consumes =
    group.role === 'load' ||
    group.role === 'coil' ||
    group.role === 'primary' ||
    group.role === 'secondary';
  if (consumes) {
    if (
      group.maximumVoltage.status === 'unknown' &&
      group.operatingVoltageRange.status === 'unknown'
    ) {
      unassessed = true;
      add('unknown-rating', group.maximumVoltage.reason);
    }
    if (group.nominalVoltage.status === 'unknown') {
      unassessed = true;
      add('unknown-rating', group.nominalVoltage.reason);
    }
    if (
      group.loadLaw.kind !== 'fixed-resistance' &&
      group.operatingVoltageRange.status === 'unknown'
    ) {
      unassessed = true;
      add('unknown-rating', group.operatingVoltageRange.reason);
    }
    if (supply.kind !== 'dc' && group.frequencyHz.status === 'unknown') {
      unassessed = true;
      add('unknown-rating', group.frequencyHz.reason);
    }
  }
  const measured = context.terminalVoltage !== undefined;
  if (
    measured &&
    (!Number.isFinite(context.terminalVoltage) || (context.terminalVoltage as number) < 0)
  ) {
    add(
      'invalid-measurement',
      'Terminal voltage must be a finite nonnegative magnitude.',
      'solved-terminal',
      'error',
    );
    return { status: 'unassessed', reasons };
  }
  // Contact voltage-drop and insulation/withstand voltage are different quantities.
  // This helper compares load/winding operating voltage only; contact capacity is
  // retained for the separate, as-yet-unassessed interruption/insulation model.
  const voltage = measured
    ? context.terminalVoltage
    : context.compareNominalVoltage === false
      ? undefined
      : supply.voltage *
        (group.voltageConvention === 'line-to-line' && supply.kind === 'ac-three-phase'
          ? Math.sqrt(3)
          : 1);
  const basis = measured ? 'solved-terminal' : 'nominal-supply';
  if (consumes && voltage !== undefined) {
    // An accepted solution at a range boundary must not fail on floating-point
    // roundoff. This is the solver's numerical tolerance, not an operating band.
    const tolerance = (boundary: number) =>
      measured
        ? LINEAR_SYSTEM_LIMITS.absoluteTolerance +
          Math.max(voltage, boundary) * LINEAR_SYSTEM_LIMITS.relativeTolerance
        : 0;
    if (group.operatingVoltageRange.status === 'known') {
      const range = group.operatingVoltageRange.value;
      if (
        voltage < range.min - tolerance(range.min) ||
        voltage > range.max + tolerance(range.max)
      ) {
        if (measured) incompatible = true;
        else unassessed = true;
        add(
          voltage < range.min ? 'undervoltage' : 'overvoltage',
          `${measured ? 'Terminal' : 'Nominal supply'} voltage ${voltage} V is outside the declared ${range.min}–${range.max} V range.`,
          basis,
          measured ? 'error' : 'warning',
        );
      }
    }
    if (
      group.maximumVoltage.status === 'known' &&
      voltage > group.maximumVoltage.value + tolerance(group.maximumVoltage.value)
    ) {
      if (measured) incompatible = true;
      else unassessed = true;
      add(
        'overvoltage',
        `${measured ? 'Terminal' : 'Nominal supply'} voltage exceeds the declared ${group.maximumVoltage.value} V maximum. Damage is not assessed.`,
        basis,
        measured ? 'error' : 'warning',
      );
    }
    if (
      group.loadLaw.kind === 'fixed-resistance' &&
      group.nominalVoltage.status === 'known' &&
      voltage < group.nominalVoltage.value - tolerance(group.nominalVoltage.value)
    ) {
      add(
        'underpowered',
        measured
          ? 'The fixed-resistance element operates below its nominal power at this terminal voltage.'
          : 'The source is below the element design voltage; actual terminal power requires a circuit solve.',
        basis,
        'info',
      );
    }
  }
  return {
    status: incompatible ? 'incompatible' : unassessed ? 'unassessed' : 'compatible',
    reasons,
  };
}
