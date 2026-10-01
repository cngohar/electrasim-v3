import type { ComponentInstance, WireInstance } from '../types';
import type { ResolvedWireProperties } from './contracts';

export const WIRE_DEFAULTS = { cableMm2: 2.5, lengthMeters: 10, deratingFactor: 1 } as const;
/** These are the saved AWG choices supported by the existing editor. */
export const WIRE_AWG_MM2: Readonly<Record<number, number>> = {
  10: 5.26,
  12: 3.31,
  14: 2.08,
  16: 1.31,
  18: 0.82,
  20: 0.52,
  22: 0.33,
};

/** Call after input validation. Explicit wire values win; catalogue tail advice is not cable data. */
export function resolveWireProperties(
  wire: WireInstance,
  byId: ReadonlyMap<string, ComponentInstance>,
): ResolvedWireProperties {
  let cableMm2 = wire.customCableMm2;
  let sizeOrigin: ResolvedWireProperties['provenance']['cableMm2'] = 'wire';
  if (cableMm2 === undefined && wire.gauge !== undefined) {
    cableMm2 = WIRE_AWG_MM2[wire.gauge];
    sizeOrigin = 'wire-awg';
  }
  if (cableMm2 === undefined) {
    const sizes = [
      byId.get(wire.fromComponentId)?.state.customCableMm2,
      byId.get(wire.toComponentId)?.state.customCableMm2,
    ].filter((value): value is number => value !== undefined);
    cableMm2 = sizes.length ? Math.min(...sizes) : WIRE_DEFAULTS.cableMm2;
    sizeOrigin = sizes.length ? 'endpoint' : 'default';
  }
  const lengthMeters = wire.lengthMeters ?? WIRE_DEFAULTS.lengthMeters;
  const material = wire.material ?? 'copper';
  return {
    cableMm2,
    lengthMeters,
    material,
    installationMethod: wire.installationMethod ?? 'C',
    deratingFactor: wire.deratingFactor ?? WIRE_DEFAULTS.deratingFactor,
    resistanceOhms: ((material === 'copper' ? 0.0175 : 0.0282) * lengthMeters) / cableMm2,
    provenance: {
      cableMm2: sizeOrigin,
      lengthMeters: wire.lengthMeters === undefined ? 'default' : 'wire',
      material: wire.material === undefined ? 'default' : 'wire',
      installationMethod: wire.installationMethod === undefined ? 'default' : 'wire',
      deratingFactor: wire.deratingFactor === undefined ? 'default' : 'wire',
    },
  };
}
