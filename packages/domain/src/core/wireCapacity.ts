import { getStandardCableAmpacity } from '../electricalCalculations';
import type { ResolvedWireProperties } from './contracts';

export type CapacityComparison = 'within-estimate' | 'exceeded' | 'not-assessed';

export interface WireCapacity {
  status: 'estimated' | 'not-assessed';
  baseAmps: number | null;
  deratedAmps: number | null;
  comparison: CapacityComparison;
  basis: string;
  assumedProperties: (keyof ResolvedWireProperties['provenance'])[];
  assessment: 'not-assessed';
  damage: 'not-assessed';
}

/** Supported table sizes only: rounding an AWG/nonstandard area UP to the next
 * table row can overstate capacity. Resistance is still calculable at those sizes.
 * The 70 C insulation rating here is distinct from the 20 C resistance model.
 */
export function assessWireCapacity(
  properties: ResolvedWireProperties,
  currentAmps?: number | null,
): WireCapacity {
  const assumedProperties = (
    Object.keys(properties.provenance) as (keyof ResolvedWireProperties['provenance'])[]
  ).filter((key) => properties.provenance[key] === 'default');
  const supported =
    [1, 1.5, 2.5, 4, 6, 10, 16].includes(properties.cableMm2) &&
    ['C', 'B1', 'A'].includes(properties.installationMethod) &&
    ['copper', 'aluminum'].includes(properties.material) &&
    Number.isFinite(properties.deratingFactor) &&
    properties.deratingFactor > 0 &&
    properties.deratingFactor <= 1;
  const baseAmps = supported
    ? getStandardCableAmpacity(
        properties.cableMm2,
        properties.material,
        properties.installationMethod,
      )
    : null;
  const deratedAmps = baseAmps === null ? null : baseAmps * properties.deratingFactor;
  return {
    status: supported ? 'estimated' : 'not-assessed',
    baseAmps,
    deratedAmps,
    comparison: compareCurrentCapacity(currentAmps, deratedAmps),
    basis: supported
      ? `BS 7671 teaching table, Method ${properties.installationMethod}, 70 C PVC insulation and 30 C ambient, multiplied by the configured derating factor.${properties.material === 'aluminum' ? ' Aluminum uses the existing 0.78 copper-table approximation, not an aluminum table.' : ''} Installation suitability and protective coordination are not assessed.`
      : 'No capacity table is declared for this conductor area/material/installation. No next-size capacity is substituted.',
    assumedProperties,
    assessment: 'not-assessed',
    damage: 'not-assessed',
  };
}

export function compareCurrentCapacity(
  currentAmps: number | null | undefined,
  capacityAmps: number | null | undefined,
): CapacityComparison {
  if (
    currentAmps == null ||
    capacityAmps == null ||
    !Number.isFinite(currentAmps) ||
    !Number.isFinite(capacityAmps) ||
    capacityAmps <= 0
  )
    return 'not-assessed';
  return Math.abs(currentAmps) > capacityAmps ? 'exceeded' : 'within-estimate';
}
