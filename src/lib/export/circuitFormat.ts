import {
  COMPONENT_DEFS,
  type Circuit,
  type ComponentInstance,
  type WireInstance,
} from '@electrasim/domain';

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const MAX_COMPONENTS = 5_000;
const MAX_WIRES = 10_000;
const MAX_STRING_LEN = 256;
const MAX_COORD = 100_000;
const MAX_CONTROL_POINTS = 50;
const SCHEMA_VERSION = 1 as const;

export interface ElectraSimFile {
  version: typeof SCHEMA_VERSION;
  exportedAt: number;
  circuit: Circuit;
}

function isFiniteInRange(value: unknown, max = MAX_COORD): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max;
}

function isBoundedString(value: unknown, max = MAX_STRING_LEN): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function isPositiveFinite(value: unknown): value is number {
  return isFiniteInRange(value) && value > 0;
}

function isComponentState(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Record<string, unknown>;
  for (const [key, field] of Object.entries(state)) {
    // IndexedDB can preserve explicitly undefined optional fields.
    if (field === undefined) continue;
    // These keys are discarded during normalization before hydration.
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (key === 'on' || key === 'energized' || key === 'isBlown' || key === 'isTripped') {
      if (typeof field !== 'boolean') return false;
    } else if (key === 'speed') {
      if (!isFiniteInRange(field) || field < 0) return false;
    } else if (key === 'animAngle') {
      if (!isFiniteInRange(field)) return false;
    } else if (key === 'fault') {
      if (
        field !== 'open-circuit' &&
        field !== 'short-circuit' &&
        field !== 'reverse-polarity' &&
        field !== 'earth-fault'
      ) {
        return false;
      }
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

/** Removes keys that could mutate object prototypes after untrusted JSON is hydrated. */
function sanitiseState(value: unknown, depth = 0): unknown {
  if (depth > 8) return undefined;
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitiseState(item, depth + 1));
  }

  const output: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    output[key] = sanitiseState((value as Record<string, unknown>)[key], depth + 1);
  }
  return output;
}

function isComponent(value: unknown): value is ComponentInstance {
  if (!value || typeof value !== 'object') return false;
  const component = value as Record<string, unknown>;
  return (
    isBoundedString(component.id) &&
    isBoundedString(component.type) &&
    isFiniteInRange(component.x) &&
    isFiniteInRange(component.y) &&
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
    !isBoundedString(wire.id) ||
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
  if (wire.fault !== undefined && wire.fault !== 'open-circuit' && wire.fault !== 'short-circuit') {
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
  if (wire.isBusted !== undefined && typeof wire.isBusted !== 'boolean') return false;
  if (wire.bustedReason !== undefined && !isBoundedString(wire.bustedReason)) return false;
  return true;
}

/** Returns a descriptive error for untrusted file data, or null when it is safe to hydrate. */
export function validateCircuitJSON(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return 'Not a valid JSON object.';
  const payload = raw as Record<string, unknown>;
  if (payload.version !== SCHEMA_VERSION) {
    return `Unsupported schema version: ${String(payload.version)} (expected ${SCHEMA_VERSION}).`;
  }

  const circuit = payload.circuit as Record<string, unknown> | undefined;
  if (!circuit || typeof circuit !== 'object') return 'Missing "circuit" field.';
  if (!Array.isArray(circuit.components)) return 'Missing "circuit.components" array.';
  if (!Array.isArray(circuit.wires)) return 'Missing "circuit.wires" array.';
  if (
    circuit.globalVoltage !== undefined &&
    (!isFiniteInRange(circuit.globalVoltage) || circuit.globalVoltage <= 0)
  ) {
    return 'Invalid "circuit.globalVoltage" value.';
  }
  if (circuit.components.length > MAX_COMPONENTS) {
    return `Too many components (${circuit.components.length}, max ${MAX_COMPONENTS}).`;
  }
  if (circuit.wires.length > MAX_WIRES) {
    return `Too many wires (${circuit.wires.length}, max ${MAX_WIRES}).`;
  }

  const componentsById = new Map<string, ComponentInstance>();
  for (let index = 0; index < circuit.components.length; index++) {
    if (!isComponent(circuit.components[index])) {
      return `Invalid component at index ${index}.`;
    }
    const component = circuit.components[index] as ComponentInstance;
    if (!COMPONENT_DEFS[component.type]) {
      return `Unknown component type "${component.type}" at index ${index}.`;
    }
    if (componentsById.has(component.id)) {
      return `Duplicate component id "${component.id}" at index ${index}.`;
    }
    componentsById.set(component.id, component);
  }

  const wireIds = new Set<string>();
  for (let index = 0; index < circuit.wires.length; index++) {
    if (!isWire(circuit.wires[index])) {
      return `Invalid wire at index ${index}.`;
    }
    const wire = circuit.wires[index] as WireInstance;
    if (wireIds.has(wire.id)) {
      return `Duplicate wire id "${wire.id}" at index ${index}.`;
    }
    wireIds.add(wire.id);
  }

  for (const wire of circuit.wires as WireInstance[]) {
    const fromComponent = componentsById.get(wire.fromComponentId);
    if (!fromComponent) {
      return `Wire ${wire.id} references missing component "${wire.fromComponentId}".`;
    }
    const toComponent = componentsById.get(wire.toComponentId);
    if (!toComponent) {
      return `Wire ${wire.id} references missing component "${wire.toComponentId}".`;
    }

    const fromDefinition = COMPONENT_DEFS[fromComponent.type];
    const toDefinition = COMPONENT_DEFS[toComponent.type];
    if (fromDefinition && wire.fromPortIndex >= fromDefinition.ports.length) {
      return `Wire ${wire.id} fromPortIndex ${wire.fromPortIndex} out of range for "${fromComponent.type}" (${fromDefinition.ports.length} ports).`;
    }
    if (toDefinition && wire.toPortIndex >= toDefinition.ports.length) {
      return `Wire ${wire.id} toPortIndex ${wire.toPortIndex} out of range for "${toComponent.type}" (${toDefinition.ports.length} ports).`;
    }
    if (wire.fromComponentId === wire.toComponentId) {
      return `Wire ${wire.id} cannot connect a component to itself.`;
    }
    const fromPort = fromDefinition?.ports[wire.fromPortIndex];
    const toPort = toDefinition?.ports[wire.toPortIndex];
    const deliberateSourceShort =
      fromDefinition?.isSource === true && toDefinition?.isSource === true;
    if (fromPort && toPort && fromPort.type !== toPort.type && !deliberateSourceShort) {
      return `Wire ${wire.id} connects incompatible ${fromPort.type} and ${toPort.type} ports.`;
    }
  }

  return null;
}

export function exportJSON(circuit: Circuit): string {
  const payload: ElectraSimFile = {
    version: SCHEMA_VERSION,
    exportedAt: Date.now(),
    circuit: normalizeCircuit(circuit),
  };
  return JSON.stringify(payload, null, 2);
}

export function importJSON(jsonString: string): Circuit {
  if (jsonString.length > MAX_IMPORT_BYTES) {
    throw new Error(
      `File too large (${(jsonString.length / 1024 / 1024).toFixed(1)} MB, max ${MAX_IMPORT_BYTES / 1024 / 1024} MB).`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON — the file could not be parsed.');
  }

  const error = validateCircuitJSON(parsed);
  if (error) throw new Error(error);
  return normalizeCircuit((parsed as ElectraSimFile).circuit);
}

/** Gives legacy and untrusted circuits the runtime shape expected by both renderers. */
export function normalizeCircuit(circuit: Circuit): Circuit {
  return {
    components: circuit.components.map((component) => {
      const state = sanitiseState(component.state) as ComponentInstance['state'];
      return {
        ...component,
        // A held contact is interaction state. It must never survive a reload,
        // import, share link, or copy made while the pointer is down.
        state: COMPONENT_DEFS[component.type]?.isMomentary ? { ...state, on: false } : state,
      };
    }),
    wires: circuit.wires.map((wire) => ({
      ...wire,
      controlPoints: Array.isArray(wire.controlPoints) ? wire.controlPoints : [],
    })),
    ...(circuit.globalVoltage !== undefined &&
    Number.isFinite(circuit.globalVoltage) &&
    circuit.globalVoltage > 0
      ? { globalVoltage: circuit.globalVoltage }
      : {}),
  };
}
