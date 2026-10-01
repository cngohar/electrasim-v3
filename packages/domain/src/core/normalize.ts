import { COMPONENT_DEFS } from '../components';
import { type StandardId, getStandard } from '../standards';
import type { Circuit, ComponentDef, ComponentState, InjectedFault } from '../types';

/** Schema 1 omitted supply settings mean the historical 230 V / 50 Hz assumption.
 * Standards selection is a view, not permission to change a saved supply. */
export const LEGACY_SUPPLY_DEFAULTS = { voltage: 230, frequencyHz: 50 } as const;

export function createEmptyCircuit(standard: StandardId = 'uk'): Circuit {
  return { components: [], wires: [], globalVoltage: getStandard(standard).nominalVoltage };
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
    components: circuit.components.map((component) => ({
      ...component,
      state: resolveComponentState(component.state, defs[component.type], releaseMomentary),
    })),
    wires: circuit.wires.map((wire) => ({
      ...wire,
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
  };
}
