import type { ComponentDef } from '../types';
import { DEVICE_CAPABILITY_FAMILIES } from './capabilityCatalogue';

/** Explicit cumulative stress budgets, not inferred temperatures or fire predictions. */
export type DamageModel =
  | {
      version: 1;
      kind: 'overcurrent';
      continuousCurrentAmps: number;
      withstandAmpSquaredSeconds: number;
    }
  | {
      version: 1;
      kind: 'overvoltage';
      maximumVoltageVolts: number;
      withstandVoltSquaredSeconds: number;
    };

export type DamageTarget = { type: 'component' | 'wire'; id: string };
export const damageTargetKey = (target: DamageTarget): string =>
  JSON.stringify([target.type, target.id]);

export const DAMAGE_APPROXIMATION =
  'Declared cumulative stress integrates max(measured² − limit², 0) per simulated second until the budget opens the element. Uses actual DC/RMS branch current or load terminal-pair voltage. Cooling, temperature, fire, arcing, insulation and manufacturer lifetime remain unassessed. Clearing faults does not repair damage.';

const bounded = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

export function isDamageModel(value: unknown): value is DamageModel {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const model = value as Record<string, unknown>;
  if (model.version !== 1) return false;
  const current = model.kind === 'overcurrent';
  if (!current && model.kind !== 'overvoltage') return false;
  const threshold = current ? 'continuousCurrentAmps' : 'maximumVoltageVolts';
  const budget = current ? 'withstandAmpSquaredSeconds' : 'withstandVoltSquaredSeconds';
  return (
    Object.keys(model).every((key) => ['version', 'kind', threshold, budget].includes(key)) &&
    bounded(model[threshold], 0.001, 100_000) &&
    bounded(model[budget], 0.000001, 1e12)
  );
}

export function hasDamageSettings(type: string, def?: ComponentDef): boolean {
  return def?.electricalModel
    ? def.electricalModel.kind === 'resistive-load'
    : DEVICE_CAPABILITY_FAMILIES[type] === 'resistive-load';
}

export function copyDamageModel(model: DamageModel): DamageModel {
  return model.kind === 'overcurrent'
    ? {
        version: 1,
        kind: 'overcurrent',
        continuousCurrentAmps: model.continuousCurrentAmps,
        withstandAmpSquaredSeconds: model.withstandAmpSquaredSeconds,
      }
    : {
        version: 1,
        kind: 'overvoltage',
        maximumVoltageVolts: model.maximumVoltageVolts,
        withstandVoltSquaredSeconds: model.withstandVoltSquaredSeconds,
      };
}

export const damageBudget = (model: DamageModel): number =>
  model.kind === 'overcurrent'
    ? model.withstandAmpSquaredSeconds
    : model.withstandVoltSquaredSeconds;

export const damageThreshold = (model: DamageModel): number =>
  model.kind === 'overcurrent' ? model.continuousCurrentAmps : model.maximumVoltageVolts;
