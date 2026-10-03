import { COMPONENT_DEFS } from '../components';
import type { Circuit, ComponentDef, ComponentState } from '../types';
import { resolveDeviceCapabilities } from './capabilities';
import { resolveComponentState } from './normalize';
import { resolveSourceProfile, sourceInterface } from './supplies';

export interface VariantChangePreview {
  status: 'ready' | 'unchanged' | 'blocked';
  reason?: string;
  componentId: string;
  fromType: string;
  toType: string;
  circuit: Circuit;
  ports: { from: number; to: number; label: string }[];
  addedPorts: string[];
  wireIds: string[];
  resetFields: string[];
}

/** Electrical replacement, not a cosmetic swap. Terminal labels, conductor roles
 * and winding/coil/contact roles must agree uniquely. No port-index fallback.
 * New nameplate/control defaults replace old overrides; labels/grouping and
 * injected faults survive. Trips/damage require the separate repair action first.
 */
export function previewVariantChange(
  circuit: Circuit,
  componentId: string,
  toType: string,
  defs: Record<string, ComponentDef> = COMPONENT_DEFS,
): VariantChangePreview {
  const component = circuit.components.find((c) => c.id === componentId);
  const oldDef = component && defs[component.type];
  const newDef = defs[toType];
  const result: VariantChangePreview = {
    status: 'blocked',
    componentId,
    fromType: component?.type ?? '',
    toType,
    circuit,
    ports: [],
    addedPorts: [],
    wireIds: [],
    resetFields: [],
  };
  if (!component || !oldDef || !newDef)
    return { ...result, reason: 'The selected component or variant is unavailable.' };
  if (component.type === toType) return { ...result, status: 'unchanged' };
  if (component.state.isBlown || component.state.isTripped)
    return {
      ...result,
      reason:
        'Repair or reset this component before replacing its variant. A variant change cannot clear a trip or damage.',
    };
  if (sourceInterface(component.type) !== sourceInterface(toType))
    return {
      ...result,
      reason: 'Source interfaces differ. Add and wire the replacement explicitly.',
    };
  const state: ComponentState = resolveComponentState({}, newDef);
  for (const key of ['autoLabel', 'groupId', 'fault'] as const)
    if (component.state[key] !== undefined) Object.assign(state, { [key]: component.state[key] });
  if (sourceInterface(toType)) {
    state.sourceProfile = resolveSourceProfile(component.type, component.state, circuit);
    if (state.sourceProfile) state.customVoltage = state.sourceProfile.model.voltage;
  }
  const replacement = { ...component, type: toType, state };
  const oldCaps = resolveDeviceCapabilities(component, circuit, oldDef);
  const newCaps = resolveDeviceCapabilities(replacement, circuit, newDef);
  const roleAt = (caps: typeof oldCaps, index: number) =>
    caps.groups
      .filter((g) => g.ports.includes(index))
      .map((g) => g.role)
      .sort()
      .join('|');
  for (const [index, port] of oldDef.ports.entries()) {
    const matches = newDef.ports.flatMap((p, i) =>
      p.label === port.label && p.type === port.type ? [i] : [],
    );
    if (
      matches.length !== 1 ||
      roleAt(oldCaps, index) !== roleAt(newCaps, matches[0]!) ||
      result.ports.some((p) => p.to === matches[0])
    )
      return {
        ...result,
        reason: `No unique compatible mapping for terminal ${port.label}. Add and wire this device explicitly.`,
      };
    result.ports.push({ from: index, to: matches[0]!, label: port.label });
  }
  const mapped = new Map(result.ports.map((p) => [p.from, p.to]));
  if (
    circuit.wires.some(
      (w) =>
        (w.fromComponentId === componentId && !mapped.has(w.fromPortIndex)) ||
        (w.toComponentId === componentId && !mapped.has(w.toPortIndex)),
    ) ||
    circuit.faults?.some(
      (f) =>
        f.target.type === 'port' &&
        f.target.componentId === componentId &&
        !mapped.has(f.target.portIndex),
    )
  )
    return {
      ...result,
      reason: 'Repair invalid terminal references before replacing this device.',
    };
  result.addedPorts = newDef.ports
    .filter((_, i) => !result.ports.some((p) => p.to === i))
    .map((p) => p.label);
  result.wireIds = circuit.wires
    .filter((w) => w.fromComponentId === componentId || w.toComponentId === componentId)
    .map((w) => w.id);
  result.resetFields = Object.keys(component.state).filter((key) => !Object.hasOwn(state, key));
  result.status = 'ready';
  result.circuit = {
    ...circuit,
    components: circuit.components.map((c) => (c.id === componentId ? replacement : c)),
    wires: circuit.wires.map((w) => {
      if (!result.wireIds.includes(w.id)) return w;
      return {
        ...w,
        fromPortIndex:
          w.fromComponentId === componentId ? mapped.get(w.fromPortIndex)! : w.fromPortIndex,
        toPortIndex: w.toComponentId === componentId ? mapped.get(w.toPortIndex)! : w.toPortIndex,
      };
    }),
    ...(circuit.faults
      ? {
          faults: circuit.faults.map((f) =>
            f.target.type === 'port' && f.target.componentId === componentId
              ? { ...f, target: { ...f.target, portIndex: mapped.get(f.target.portIndex)! } }
              : f,
          ),
        }
      : {}),
  };
  return result;
}
