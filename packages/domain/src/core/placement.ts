import { COMPONENT_DEFS } from '../components';
import type { Circuit } from '../types';
import { resolveDeviceCapabilities } from './capabilities';
import { type CompatibilityResult, assessTerminalCompatibility } from './compatibility';
import type { SupplyModel } from './contracts';
import { resolveComponentState } from './normalize';

/** Nominal guidance only. Actual placed parts are assessed by terminal domain;
 * supply sources and converters remain discoverable for independent circuits.
 */
export function assessPlacement(
  type: string,
  circuit: Circuit,
  supply: SupplyModel,
): CompatibilityResult & { independent: boolean } {
  const def = COMPONENT_DEFS[type];
  const capability = resolveDeviceCapabilities(
    { id: 'candidate', type, x: 0, y: 0, state: resolveComponentState({}, def) },
    circuit,
  );
  const independent =
    capability.sourceControl === 'independent' || capability.family === 'transformer';
  const groups = capability.groups.map((g) => assessTerminalCompatibility(g, { supply }));
  return {
    independent,
    status: groups.some((g) => g.status === 'incompatible')
      ? 'incompatible'
      : !groups.length || groups.some((g) => g.status === 'unassessed')
        ? 'unassessed'
        : 'compatible',
    reasons: groups.flatMap((g) => g.reasons),
  };
}

export function placementVisible(
  result: ReturnType<typeof assessPlacement>,
  showAll: boolean,
): boolean {
  return showAll || result.independent || result.status === 'compatible';
}
