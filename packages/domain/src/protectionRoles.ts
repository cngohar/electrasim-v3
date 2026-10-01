/**
 * Protective-device classification — one answer to "what does this device
 * actually protect against?".
 *
 * Ten separate modules were each deciding this by sniffing substrings of the
 * component type (`type.includes('mcb') || type.includes('rcd') || ...`). That
 * is drift-prone in both directions:
 *
 *   - **False negatives.** The list is hand-maintained per call site, so they
 *     disagreed: `circuitValidation` looked for mcb/fuse/rcd/rcbo, `faults`
 *     added fused-spur, `simulate` added mccb. `afdd` matched none of the
 *     RCD-flavoured checks despite being an RCBO with arc detection, and
 *     `socket-gfci` matched only the ones that special-cased it by name.
 *   - **False positives.** `type.includes('rcd')` is a substring test, so any
 *     future type whose name happens to contain those letters silently becomes
 *     a residual-current device.
 *
 * The classification here is derived from the *typed* fields the registry
 * already carries — `mcbType` implies a published overcurrent curve,
 * `ratedLeakage_mA` implies residual sensing — with an explicit table for the
 * devices those fields cannot describe. Adding a protective device means
 * setting its rating fields (or adding one table row), not editing ten
 * substring lists.
 */

import { COMPONENT_DEFS } from './components';
import type { ComponentDef } from './types';

/** What a protective device is capable of interrupting. */
export interface ProtectionRole {
  /** Interrupts overcurrent — overload and/or short circuit (MCB, MCCB, fuse). */
  overcurrent: boolean;
  /** Senses residual (earth-leakage) current (RCD, RCBO, AFDD, GFCI outlet). */
  residual: boolean;
  /** Detects arcing signatures (AFDD only). */
  arcFault: boolean;
  /** Diverts transient overvoltage rather than interrupting current (SPD). */
  surge: boolean;
  /**
   * Provides isolation only — a main switch or rotary isolator disconnects on
   * demand but has no automatic protective function. Flagged `isProtection` in
   * the registry because it belongs to the protection palette, which is exactly
   * why "is it flagged isProtection?" is not the same question as "will it trip".
   */
  isolationOnly: boolean;
}

const NONE: ProtectionRole = {
  overcurrent: false,
  residual: false,
  arcFault: false,
  surge: false,
  isolationOnly: false,
};

/**
 * Devices whose role cannot be inferred from the rating fields.
 *
 * A fuse and an MCCB have no `mcbType` (no IEC 60898-1 curve — BS 1362 and
 * IEC 60947-2 respectively); a GFCI outlet is a socket, not a protection-flagged
 * device; a main switch and an isolator carry `isProtection` but interrupt
 * nothing automatically.
 */
const EXPLICIT_ROLES: Record<string, Partial<ProtectionRole>> = {
  fuse: { overcurrent: true },
  'fused-spur': { overcurrent: true },
  mccb: { overcurrent: true },
  spd: { surge: true },
  'socket-gfci': { residual: true },
  'main-switch': { isolationOnly: true },
  'isolator-switch': { isolationOnly: true },
};

/**
 * Classify a component type. Returns an all-false role for anything that is not
 * a protective device, so callers can read the flag they care about without a
 * null check.
 */
export function getProtectionRole(
  type: string,
  defs: Record<string, ComponentDef> = COMPONENT_DEFS,
): ProtectionRole {
  const def = defs[type];
  if (!def) return NONE;

  const explicit = EXPLICIT_ROLES[type];
  const role: ProtectionRole = {
    // A published trip curve means it interrupts overcurrent.
    overcurrent: def.mcbType !== undefined,
    // A rated residual current means it senses earth leakage.
    residual: def.ratedLeakage_mA !== undefined,
    // Only the AFDD analyses waveforms for arcing.
    arcFault: type === 'afdd',
    surge: false,
    isolationOnly: false,
    ...explicit,
  };

  // Nothing claimed, but the registry says it is protection: treat it as
  // isolation rather than silently reporting "no protective function".
  if (
    def.isProtection &&
    !role.overcurrent &&
    !role.residual &&
    !role.arcFault &&
    !role.surge &&
    !role.isolationOnly
  ) {
    role.isolationOnly = true;
  }

  return role;
}

/** Does this device automatically interrupt a fault (as opposed to isolating)? */
export function isAutomaticProtection(
  type: string,
  defs: Record<string, ComponentDef> = COMPONENT_DEFS,
): boolean {
  const role = getProtectionRole(type, defs);
  return role.overcurrent || role.residual || role.arcFault;
}

/** Overcurrent protective device — MCB, MCCB, RCBO, AFDD, fuse, FCU. */
export function isOvercurrentDevice(
  type: string,
  defs: Record<string, ComponentDef> = COMPONENT_DEFS,
): boolean {
  return getProtectionRole(type, defs).overcurrent;
}

/** Fuse links require replacement after operation; circuit breakers reset. */
export function isFuseDevice(
  type: string,
  defs: Record<string, ComponentDef> = COMPONENT_DEFS,
): boolean {
  return isOvercurrentDevice(type, defs) && (type === 'fuse' || type === 'fused-spur');
}

/** Residual-current device — RCD, RCBO, AFDD, GFCI outlet. */
export function isResidualDevice(
  type: string,
  defs: Record<string, ComponentDef> = COMPONENT_DEFS,
): boolean {
  return getProtectionRole(type, defs).residual;
}

/** Arc-fault detection device (BS EN 62606). */
export function isArcFaultDevice(
  type: string,
  defs: Record<string, ComponentDef> = COMPONENT_DEFS,
): boolean {
  return getProtectionRole(type, defs).arcFault;
}
