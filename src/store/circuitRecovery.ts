import { circuitRequirements } from '@electrasim/access/circuit';
import { COMPONENT_DEFS, type Circuit, normalizeCircuitFaults } from '@electrasim/domain';
import { exportJSON, importJSON } from '@electrasim/domain/circuitFormat';
import { entries, set } from 'idb-keyval';

const PREFIX = 'electrasim:recovery:';
export function basicCopy(
  original: Circuit,
  removeComponentIds: readonly string[],
  removeFaultIds: readonly string[],
): Circuit {
  const source = importJSON(exportJSON(original));
  const removed = new Set(removeComponentIds);
  const removedFaults = new Set(removeFaultIds);
  const components = source.components
    .filter((c) => !removed.has(c.id))
    .map((c) => ({ ...c, state: { ...c.state, fault: undefined } }));
  const wires = source.wires
    .filter((w) => !removed.has(w.fromComponentId) && !removed.has(w.toComponentId))
    .map((w) => ({ ...w, fault: undefined }));
  const wireIds = new Set(wires.map((w) => w.id));
  const faults = normalizeCircuitFaults(source).filter(
    (f) =>
      !removedFaults.has(f.id) &&
      (f.target.type === 'wire'
        ? wireIds.has(f.target.id)
        : !removed.has(f.target.type === 'component' ? f.target.id : f.target.componentId)),
  );
  const result = { components, wires, globalVoltage: source.globalVoltage, faults };
  if (circuitRequirements(result).length)
    throw new Error(
      'Choose all Pro components and advanced faults for removal, leaving at most one active basic fault.',
    );
  return result;
}
export function premiumComponents(circuit: Circuit) {
  return circuit.components.filter((c) => COMPONENT_DEFS[c.type]?.tier === 'pro');
}
export async function saveRecovery(circuit: Circuit) {
  const key = `${PREFIX}${Date.now()}:${crypto.randomUUID()}`;
  await set(key, exportJSON(circuit)); // Abort replacement if the backup cannot be written.
  return key;
}
export async function recoveryCopies(): Promise<{ key: string; json: string }[]> {
  return (await entries<string, unknown>())
    .filter(
      ([key, value]) =>
        typeof key === 'string' && key.startsWith(PREFIX) && typeof value === 'string',
    )
    .map(([key, value]) => ({ key, json: value as string }))
    .reverse();
}
