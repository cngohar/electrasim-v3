import type { RCDType } from '../types';

/**
 * Explicit, opt-in declared protection teaching law; never inferred from
 * contact ratings, labels or legacy state. Transient heat, trip latches and
 * deadlines live in simulation state, never in the saved document.
 */
export type ProtectionCurve = 'B' | 'C' | 'D';

export type ProtectionModel =
  | {
      version: 1;
      kind: 'mcb';
      ratedCurrentAmps: number;
      curve: ProtectionCurve;
    }
  | {
      version: 1;
      kind: 'fuse';
      ratedCurrentAmps: number;
      /** Teaching I²t anchor: pre-arcing integral of (I/In)² in seconds. */
      meltingIntegralSeconds: number;
    }
  | {
      version: 1;
      kind: 'rcd';
      ratedResidualMilliamps: number;
      residualType: RCDType;
    }
  | {
      version: 1;
      kind: 'rcbo';
      ratedCurrentAmps: number;
      curve: ProtectionCurve;
      ratedResidualMilliamps: number;
      residualType: RCDType;
    };

export const PROTECTION_APPROXIMATION =
  'Declared ideal teaching laws driven by measured pole currents: IEC 60898-1 thermal/instantaneous zones for MCB/RCBO curves, a fixed I²t melting integral for fuses, and IEC 61008-1 general-type break times for residual devices. Pole bypasses carry current around the device. Arc detection, coordination, selectivity, prospective-fault energy, manufacturer tolerances and damage are not assessed.';

export const MCB_THERMAL_K = 4615.65876415;
export const MCB_THERMAL_ALPHA = 2.5468325498;
export const MCB_MAGNETIC_UPPER: Readonly<Record<ProtectionCurve, number>> = {
  B: 5,
  C: 10,
  D: 20,
};
export const FUSE_INSTANT_MULTIPLE = 10;

const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const bounded = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const keys = (v: Record<string, unknown>, allowed: string[]) =>
  Object.keys(v).every((key) => allowed.includes(key));

export function isProtectionModel(value: unknown): value is ProtectionModel {
  if (!record(value) || value.version !== 1 || typeof value.kind !== 'string') return false;
  if (value.kind === 'mcb')
    return (
      keys(value, ['version', 'kind', 'ratedCurrentAmps', 'curve']) &&
      bounded(value.ratedCurrentAmps, 0.001, 100_000) &&
      ['B', 'C', 'D'].includes(value.curve as string)
    );
  if (value.kind === 'fuse')
    return (
      keys(value, ['version', 'kind', 'ratedCurrentAmps', 'meltingIntegralSeconds']) &&
      bounded(value.ratedCurrentAmps, 0.001, 100_000) &&
      bounded(value.meltingIntegralSeconds, 0.001, 1e6)
    );
  if (value.kind === 'rcd')
    return (
      keys(value, ['version', 'kind', 'ratedResidualMilliamps', 'residualType']) &&
      bounded(value.ratedResidualMilliamps, 1, 1_000_000) &&
      ['AC', 'A', 'F', 'B'].includes(value.residualType as string)
    );
  if (value.kind === 'rcbo')
    return (
      keys(value, [
        'version',
        'kind',
        'ratedCurrentAmps',
        'curve',
        'ratedResidualMilliamps',
        'residualType',
      ]) &&
      bounded(value.ratedCurrentAmps, 0.001, 100_000) &&
      ['B', 'C', 'D'].includes(value.curve as string) &&
      bounded(value.ratedResidualMilliamps, 1, 1_000_000) &&
      ['AC', 'A', 'F', 'B'].includes(value.residualType as string)
    );
  return false;
}

export function copyProtectionModel(model: ProtectionModel): ProtectionModel {
  switch (model.kind) {
    case 'mcb':
      return {
        version: 1,
        kind: 'mcb',
        ratedCurrentAmps: model.ratedCurrentAmps,
        curve: model.curve,
      };
    case 'fuse':
      return {
        version: 1,
        kind: 'fuse',
        ratedCurrentAmps: model.ratedCurrentAmps,
        meltingIntegralSeconds: model.meltingIntegralSeconds,
      };
    case 'rcd':
      return {
        version: 1,
        kind: 'rcd',
        ratedResidualMilliamps: model.ratedResidualMilliamps,
        residualType: model.residualType,
      };
    case 'rcbo':
      return {
        version: 1,
        kind: 'rcbo',
        ratedCurrentAmps: model.ratedCurrentAmps,
        curve: model.curve,
        ratedResidualMilliamps: model.ratedResidualMilliamps,
        residualType: model.residualType,
      };
  }
}

/** Automatic MCB/fuse/RCD/RCBO families accept a declared timed protection model. */
export function hasProtectionSettings(type: string): boolean {
  return [
    'mcb',
    'mcb-type-c',
    'mcb-type-d',
    'mccb',
    'fuse',
    'fused-spur',
    'rcd',
    'rcbo',
    'afdd',
  ].includes(type);
}

/** MCB/RCBO/AFDD by curve, fuses, RCDs and RCBOs; isolators/SPD/main switches never trip. */
export function protectionModelFitsType(type: string, model: ProtectionModel): boolean {
  if (model.kind === 'mcb') return ['mcb', 'mcb-type-c', 'mcb-type-d', 'mccb'].includes(type);
  if (model.kind === 'fuse') return ['fuse', 'fused-spur'].includes(type);
  if (model.kind === 'rcd') return type === 'rcd';
  return model.kind === 'rcbo' && ['rcbo', 'afdd'].includes(type);
}

/** General-type RCD/RCBO break times per IEC 61008-1 (see tripCurves header). */
export function residualTripDelaySeconds(
  leakageMilliamps: number,
  ratedMilliamps: number,
): number | null {
  const multiple = leakageMilliamps / ratedMilliamps;
  if (multiple < 0.5) return null;
  if (multiple >= 5) return 0.04;
  if (multiple >= 2) return 0.15;
  if (multiple >= 1) return 0.3;
  return 0.6;
}
