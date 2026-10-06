import { COMPONENT_DEFS } from '../components';
import { type StandardId, getStandard } from '../standards';
import type { Circuit, ComponentDef, ComponentState, InjectedFault } from '../types';
import { copyCoilModel } from './coilModel';
import { copyDamageModel } from './damageModel';
import { copyMotorModel } from './motorModel';
import { copyProtectionModel } from './protectionModel';
import {
  copySupplyProfile,
  explicitSupplyProfile,
  resolveDocumentSupply,
  resolveSourceProfile,
  sourceInterface,
} from './supplies';
import { copyTimerModel } from './timerModel';
export { LEGACY_SUPPLY_DEFAULTS } from './supplies';

export function createEmptyCircuit(standard: StandardId = 'uk'): Circuit {
  const preset = getStandard(standard);
  return {
    components: [],
    wires: [],
    globalVoltage: preset.nominalVoltage,
    supply: explicitSupplyProfile({
      kind: 'ac-single-phase',
      voltage: preset.nominalVoltage,
      frequencyHz: preset.frequencyHz,
    }),
  };
}

/** Copy plain validated metadata without retaining prototype-mutating keys. */
export function copySafeRecord<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => key !== '__proto__' && key !== 'constructor' && key !== 'prototype',
    ),
  ) as T;
}

export function resolveComponentState(
  state: ComponentState,
  definition: ComponentDef | undefined,
  releaseMomentary = false,
): ComponentState {
  const result = copySafeRecord(state);
  if (result.motorModel) result.motorModel = copyMotorModel(result.motorModel);
  if (result.coilModel) result.coilModel = copyCoilModel(result.coilModel);
  if (result.damageModel) result.damageModel = copyDamageModel(result.damageModel);
  if (result.protectionModel) result.protectionModel = copyProtectionModel(result.protectionModel);
  if (result.timerModel) result.timerModel = copyTimerModel(result.timerModel);
  if (result.sourceProfile) result.sourceProfile = copySupplyProfile(result.sourceProfile);
  if (definition?.isSwitch && result.on === undefined) result.on = definition.defaultOn ?? false;
  if (definition?.isMomentary && releaseMomentary) result.on = false;
  return result;
}

/** Non-mutating and order preserving; canonical IDs, explicit false and saved sizes survive. */
export function normalizeCircuitDocument(
  circuit: Circuit,
  releaseMomentary = true,
  defs: Record<string, ComponentDef> = COMPONENT_DEFS,
): Circuit {
  return {
    components: circuit.components.map((component) => {
      const state = resolveComponentState(component.state, defs[component.type], releaseMomentary);
      const kind = sourceInterface(component.type);
      // Aliases without an override continue to use the document profile. Independent
      // blocks capture it once, so a later global edit cannot rewrite another source.
      if (
        kind &&
        (kind === 'ac-source' ||
          kind === 'dc-source' ||
          state.customVoltage !== undefined ||
          state.sourceProfile)
      ) {
        state.sourceProfile = resolveSourceProfile(component.type, state, circuit);
      }
      return { ...component, state };
    }),
    wires: circuit.wires.map((wire) => ({
      ...wire,
      ...(wire.damageModel ? { damageModel: { ...wire.damageModel } } : {}),
      controlPoints: (wire.controlPoints ?? []).map((point) => ({ ...point })),
    })),
    ...(circuit.faults
      ? {
          faults: circuit.faults.map(
            (fault): InjectedFault => ({
              ...copySafeRecord(fault),
              target: { ...fault.target },
              ...(fault.parameters ? { parameters: copySafeRecord(fault.parameters) } : {}),
            }),
          ),
        }
      : {}),
    ...(circuit.globalVoltage !== undefined ? { globalVoltage: circuit.globalVoltage } : {}),
    supply: resolveDocumentSupply(circuit),
  };
}
