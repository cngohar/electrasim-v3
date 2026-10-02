import { COMPONENT_DEFS } from '../components';
import { FAULT_REGISTRY } from '../faults';
import type {
  Circuit,
  ComponentDef,
  ComponentInstance,
  InjectedFault,
  WireInstance,
} from '../types';
import type { ElectricalDiagnostic } from './contracts';
import { isSupplyProfile, sourceInterface, sourceProfileFitsInterface } from './supplies';
import { WIRE_AWG_MM2 } from './wireProperties';

const MAX_COMPONENTS = 5_000;
const MAX_WIRES = 10_000;
const MAX_STRING_LEN = 256;
const MAX_COORD = 100_000;
const MAX_CONTROL_POINTS = 50;

function isFiniteInRange(value: unknown, max = MAX_COORD): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max;
}

function isBoundedString(value: unknown, max = MAX_STRING_LEN): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function isPositiveFinite(value: unknown): value is number {
  return isFiniteInRange(value) && value >= 0.001;
}

function isComponentState(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  for (const [key, field] of Object.entries(state)) {
    // IndexedDB can preserve explicitly undefined optional fields.
    if (field === undefined) continue;
    // These keys are discarded during normalization before hydration.
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (key === 'sourceProfile') {
      if (!isSupplyProfile(field)) return false;
    } else if (key === 'on' || key === 'energized' || key === 'isBlown' || key === 'isTripped') {
      if (typeof field !== 'boolean') return false;
    } else if (key === 'speed') {
      if (!isFiniteInRange(field) || field < 0) return false;
    } else if (key === 'animAngle') {
      if (!isFiniteInRange(field)) return false;
    } else if (key === 'fault') {
      if (typeof field !== 'string' || !Object.hasOwn(FAULT_REGISTRY, field)) {
        return false;
      }
    } else if (key === 'rcdType') {
      if (typeof field !== 'string' || !['AC', 'A', 'F', 'B'].includes(field)) return false;
    } else if (key === 'batteryChemistry') {
      if (typeof field !== 'string' || !['alkaline', 'li-ion', 'lead-acid'].includes(field))
        return false;
    } else if (key === 'groupId' || key === 'autoLabel') {
      if (!isBoundedString(field)) return false;
    } else if (key === 'customPowerWatts') {
      if (!isFiniteInRange(field) || field < 0) return false;
    } else if (
      key === 'customVoltage' ||
      key === 'customMaxAmps' ||
      key === 'customMaxVolts' ||
      key === 'customCableMm2'
    ) {
      if (!isPositiveFinite(field)) return false;
    } else if (key === 'blownReason') {
      if (field !== 'overvoltage' && field !== 'overcurrent' && field !== 'overload') return false;
    } else if (key === 'tripReason') {
      if (
        field !== 'overload' &&
        field !== 'short-circuit' &&
        field !== 'ground-fault' &&
        field !== 'arc-fault' &&
        field !== 'manual-fault'
      ) {
        return false;
      }
    } else {
      return false;
    }
  }
  return true;
}

function isComponent(value: unknown): value is ComponentInstance {
  if (!value || typeof value !== 'object') return false;
  const component = value as Record<string, unknown>;
  return (
    isIdentifier(component.id) &&
    isBoundedString(component.type) &&
    isFiniteInRange(component.x) &&
    isFiniteInRange(component.y) &&
    (component.rotation === undefined || isFiniteInRange(component.rotation)) &&
    isComponentState(component.state)
  );
}

function isControlPoint(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const point = value as Record<string, unknown>;
  return isFiniteInRange(point.x) && isFiniteInRange(point.y);
}

function isWire(value: unknown): value is WireInstance {
  if (!value || typeof value !== 'object') return false;
  const wire = value as Record<string, unknown>;
  if (
    !isIdentifier(wire.id) ||
    !isBoundedString(wire.fromComponentId) ||
    !isBoundedString(wire.toComponentId) ||
    !isFiniteInRange(wire.fromPortIndex, 100) ||
    !isFiniteInRange(wire.toPortIndex, 100)
  ) {
    return false;
  }
  if (!Number.isInteger(wire.fromPortIndex) || (wire.fromPortIndex as number) < 0) return false;
  if (!Number.isInteger(wire.toPortIndex) || (wire.toPortIndex as number) < 0) return false;
  if (wire.controlPoints !== undefined) {
    if (!Array.isArray(wire.controlPoints)) return false;
    if (wire.controlPoints.length > MAX_CONTROL_POINTS) return false;
    if (!wire.controlPoints.every(isControlPoint)) return false;
  }
  if (wire.pathKind !== undefined && wire.pathKind !== 'bezier' && wire.pathKind !== 'orthogonal') {
    return false;
  }
  if (
    wire.fault !== undefined &&
    wire.fault !== 'open-circuit' &&
    wire.fault !== 'short-circuit' &&
    wire.fault !== 'open-neutral' &&
    wire.fault !== 'live-to-earth'
  ) {
    return false;
  }
  if (wire.lengthMeters !== undefined && !isPositiveFinite(wire.lengthMeters)) return false;
  if (
    wire.deratingFactor !== undefined &&
    (!isFiniteInRange(wire.deratingFactor) || wire.deratingFactor < 0.1 || wire.deratingFactor > 1)
  ) {
    return false;
  }
  if (wire.customCableMm2 !== undefined && !isPositiveFinite(wire.customCableMm2)) return false;
  if (wire.material !== undefined && wire.material !== 'copper' && wire.material !== 'aluminum')
    return false;
  if (
    wire.installationMethod !== undefined &&
    (typeof wire.installationMethod !== 'string' ||
      !['C', 'B1', 'A'].includes(wire.installationMethod))
  )
    return false;
  if (
    wire.gauge !== undefined &&
    (typeof wire.gauge !== 'number' || !Object.hasOwn(WIRE_AWG_MM2, wire.gauge))
  )
    return false;
  if (wire.isBusted !== undefined && typeof wire.isBusted !== 'boolean') return false;
  if (wire.bustedReason !== undefined && !isBoundedString(wire.bustedReason)) return false;
  return true;
}

function isIdentifier(value: unknown): value is string {
  if (!isBoundedString(value) || ['__proto__', 'constructor', 'prototype'].includes(value))
    return false;
  // Legacy fault IDs percent-encode document IDs. Lone UTF-16 surrogates are
  // legal JSON strings but cannot be encoded; reject them before normalization.
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

export type CircuitInputValidation =
  | { valid: true; circuit: Circuit; diagnostics: [] }
  | { valid: false; diagnostics: ElectricalDiagnostic[] };

/** One bounded boundary for files, direct simulation, graph compilation and validation.
 * Reject malformed data; physical cross-role wiring remains available for diagnosis. */
export function validateCircuitInput(
  raw: unknown,
  defs: Record<string, ComponentDef> = COMPONENT_DEFS,
): CircuitInputValidation {
  const invalid = (
    code: string,
    message: string,
    path: string,
    references: Pick<ElectricalDiagnostic, 'componentId' | 'wireId' | 'faultId'> = {},
  ): CircuitInputValidation => ({
    valid: false,
    diagnostics: [{ code, severity: 'error', message, path, ...references }],
  });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return invalid('invalid-circuit', 'Missing "circuit" field.', 'circuit');
  const circuit = raw as Record<string, unknown>;
  if (!Array.isArray(circuit.components))
    return invalid('invalid-components', 'Missing "circuit.components" array.', 'components');
  if (!Array.isArray(circuit.wires))
    return invalid('invalid-wires', 'Missing "circuit.wires" array.', 'wires');
  if (circuit.globalVoltage !== undefined && !isPositiveFinite(circuit.globalVoltage))
    return invalid('invalid-voltage', 'Invalid "circuit.globalVoltage" value.', 'globalVoltage');
  if (circuit.supply !== undefined && !isSupplyProfile(circuit.supply))
    return invalid(
      'invalid-supply-profile',
      'Invalid versioned document supply profile.',
      'supply',
    );
  if (
    isSupplyProfile(circuit.supply) &&
    circuit.globalVoltage !== undefined &&
    circuit.globalVoltage !== circuit.supply.model.voltage
  )
    return invalid(
      'conflicting-supply-voltage',
      'The legacy voltage and document supply profile disagree.',
      'globalVoltage',
    );
  if (circuit.components.length > MAX_COMPONENTS)
    return invalid(
      'component-limit',
      `Too many components (${circuit.components.length}, max ${MAX_COMPONENTS}).`,
      'components',
    );
  if (circuit.wires.length > MAX_WIRES)
    return invalid(
      'wire-limit',
      `Too many wires (${circuit.wires.length}, max ${MAX_WIRES}).`,
      'wires',
    );

  const componentsById = new Map<string, ComponentInstance>();
  for (const [index, value] of circuit.components.entries()) {
    if (!isComponent(value))
      return invalid(
        'invalid-component',
        `Invalid component at index ${index}.`,
        `components[${index}]`,
      );
    if (!Object.hasOwn(defs, value.type))
      return invalid(
        'unknown-component',
        `Unknown component type "${value.type}" at index ${index}.`,
        `components[${index}].type`,
        { componentId: value.id },
      );
    if (componentsById.has(value.id))
      return invalid(
        'duplicate-component',
        `Duplicate component id "${value.id}" at index ${index}.`,
        `components[${index}].id`,
        { componentId: value.id },
      );
    if (value.state.sourceProfile && !sourceInterface(value.type))
      return invalid(
        'invalid-source-target',
        'Source settings require a declared supply interface; loads and PE are not sources.',
        `components[${index}].state.sourceProfile`,
        { componentId: value.id },
      );
    if (
      value.state.sourceProfile &&
      !sourceProfileFitsInterface(value.type, value.state.sourceProfile)
    )
      return invalid(
        'source-interface-mismatch',
        'The configured AC/DC kind does not match this source interface; replace the source explicitly.',
        `components[${index}].state.sourceProfile`,
        { componentId: value.id },
      );
    if (
      value.state.sourceProfile &&
      value.state.customVoltage !== undefined &&
      value.state.customVoltage !== value.state.sourceProfile.model.voltage
    )
      return invalid(
        'conflicting-source-voltage',
        'The legacy voltage and source profile disagree.',
        `components[${index}].state.customVoltage`,
        { componentId: value.id },
      );
    componentsById.set(value.id, value);
  }
  const wireIds = new Set<string>();
  for (const [index, value] of circuit.wires.entries()) {
    if (!isWire(value))
      return invalid('invalid-wire', `Invalid wire at index ${index}.`, `wires[${index}]`);
    if (wireIds.has(value.id))
      return invalid(
        'duplicate-wire',
        `Duplicate wire id "${value.id}" at index ${index}.`,
        `wires[${index}].id`,
        { wireId: value.id },
      );
    wireIds.add(value.id);
    for (const [end, componentId, portIndex] of [
      ['from', value.fromComponentId, value.fromPortIndex],
      ['to', value.toComponentId, value.toPortIndex],
    ] as const) {
      const component = componentsById.get(componentId);
      if (!component)
        return invalid(
          'missing-component',
          `Wire ${value.id} references missing component "${componentId}".`,
          `wires[${index}].${end}ComponentId`,
          { wireId: value.id },
        );
      const definition = defs[component.type];
      if (!definition?.ports[portIndex])
        return invalid(
          'invalid-port',
          `Wire ${value.id} ${end}PortIndex ${portIndex} out of range for "${component.type}" (${definition?.ports.length ?? 0} ports).`,
          `wires[${index}].${end}PortIndex`,
          { wireId: value.id },
        );
    }
    if (value.fromComponentId === value.toComponentId && value.fromPortIndex === value.toPortIndex)
      return invalid(
        'same-terminal',
        `Wire ${value.id} cannot connect a terminal to itself.`,
        `wires[${index}]`,
        { wireId: value.id },
      );
  }

  if (circuit.faults !== undefined) {
    if (!Array.isArray(circuit.faults) || circuit.faults.length > 1000)
      return invalid('fault-limit', 'Invalid circuit faults.', 'faults');
    const ids = new Set<string>();
    for (const [index, value] of circuit.faults.entries()) {
      const path = `faults[${index}]`;
      if (!value || typeof value !== 'object' || Array.isArray(value))
        return invalid('invalid-fault', 'Invalid injected fault.', path);
      const f = value as InjectedFault;
      if (
        !isIdentifier(f.id) ||
        ids.has(f.id) ||
        typeof f.type !== 'string' ||
        !Object.hasOwn(FAULT_REGISTRY, f.type)
      )
        return invalid('invalid-fault', 'Invalid or duplicate injected fault.', path);
      ids.add(f.id);
      const definition = FAULT_REGISTRY[f.type];
      if (
        f.category !== definition.category ||
        !Number.isFinite(f.createdAt) ||
        f.createdAt < 0 ||
        (f.resolved !== undefined && typeof f.resolved !== 'boolean')
      )
        return invalid('invalid-fault-metadata', 'Invalid fault metadata.', path, {
          faultId: f.id,
        });
      if (f.resolvedReason !== undefined && !isBoundedString(f.resolvedReason))
        return invalid('invalid-fault-metadata', 'Invalid resolution reason.', path, {
          faultId: f.id,
        });
      const target = f.target;
      if (!target || typeof target !== 'object' || Array.isArray(target))
        return invalid('invalid-fault-target', 'Missing fault target.', path, { faultId: f.id });
      if (target.type === 'component') {
        if (!componentsById.has(target.id))
          return invalid('invalid-fault-target', 'Missing fault component.', path, {
            faultId: f.id,
          });
      } else if (target.type === 'wire') {
        if (!wireIds.has(target.id))
          return invalid('invalid-fault-target', 'Missing fault wire.', path, { faultId: f.id });
      } else if (target.type === 'port') {
        const component = componentsById.get(target.componentId);
        if (
          !component ||
          !Number.isInteger(target.portIndex) ||
          target.portIndex < 0 ||
          !defs[component.type]?.ports[target.portIndex]
        )
          return invalid('invalid-fault-target', 'Invalid fault port.', path, { faultId: f.id });
      } else
        return invalid('invalid-fault-target', 'Unknown fault target.', path, { faultId: f.id });
      if (definition.targetType !== 'any' && definition.targetType !== target.type)
        return invalid(
          'incompatible-fault-target',
          `Fault ${f.type} requires a ${definition.targetType} target.`,
          path,
          { faultId: f.id },
        );
      if (
        f.parameters !== undefined &&
        (!f.parameters ||
          typeof f.parameters !== 'object' ||
          Array.isArray(f.parameters) ||
          Object.keys(f.parameters).length > 32 ||
          Object.entries(f.parameters).some(
            ([key, v]) =>
              !isIdentifier(key) ||
              !['string', 'number', 'boolean'].includes(typeof v) ||
              (typeof v === 'number' && !Number.isFinite(v)) ||
              (typeof v === 'string' && v.length > 256),
          ))
      )
        return invalid('invalid-fault-parameters', 'Invalid fault parameters.', path, {
          faultId: f.id,
        });
    }
  }
  return { valid: true, circuit: raw as Circuit, diagnostics: [] };
}
