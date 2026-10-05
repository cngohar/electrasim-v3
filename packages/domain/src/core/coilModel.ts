import type { ComponentDef } from '../types';
import type { SupplyModel } from './contracts';
import { isSupplyModel } from './supplies';

/** Explicit, opt-in teaching law; never inferred from contact or supply ratings. */
export interface CoilModel {
  version: 1;
  supply: Exclude<SupplyModel, { kind: 'ac-three-phase' }>;
  nominalPowerWatts: number;
  pickupRatio: number;
  dropoutRatio: number;
  onDelaySeconds: number;
  offDelaySeconds: number;
}

export const COIL_APPROXIMATION =
  'Declared resistive coil equivalent with voltage hysteresis and on/off delays. Inductance, inrush, rectification, bounce and damage are not modeled.';

export function coilPortsFor(
  type: string,
  def: ComponentDef,
): readonly [number, number] | undefined {
  return def.coilPorts ?? (type === 'delay-timer' ? [0, 1] : undefined);
}

export function isCoilModel(value: unknown): value is CoilModel {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const model = value as Record<string, unknown>;
  const finite = (key: string, min: number, max: number) =>
    typeof model[key] === 'number' &&
    Number.isFinite(model[key]) &&
    model[key] >= min &&
    model[key] <= max;
  return (
    Object.keys(model).every((key) =>
      [
        'version',
        'supply',
        'nominalPowerWatts',
        'pickupRatio',
        'dropoutRatio',
        'onDelaySeconds',
        'offDelaySeconds',
      ].includes(key),
    ) &&
    model.version === 1 &&
    isSupplyModel(model.supply) &&
    model.supply.kind !== 'ac-three-phase' &&
    model.supply.voltage >= 0.001 &&
    model.supply.voltage <= 100_000 &&
    finite('nominalPowerWatts', 0.001, 100_000) &&
    finite('pickupRatio', 0.001, 1) &&
    finite('dropoutRatio', 0, 1) &&
    (model.dropoutRatio as number) < (model.pickupRatio as number) &&
    finite('onDelaySeconds', 0, 3600) &&
    finite('offDelaySeconds', 0, 3600)
  );
}

export function copyCoilModel(model: CoilModel): CoilModel {
  return {
    version: 1,
    supply:
      model.supply.kind === 'dc'
        ? { kind: 'dc', voltage: model.supply.voltage }
        : {
            kind: 'ac-single-phase',
            voltage: model.supply.voltage,
            frequencyHz: model.supply.frequencyHz,
          },
    nominalPowerWatts: model.nominalPowerWatts,
    pickupRatio: model.pickupRatio,
    dropoutRatio: model.dropoutRatio,
    onDelaySeconds: model.onDelaySeconds,
    offDelaySeconds: model.offDelaySeconds,
  };
}
