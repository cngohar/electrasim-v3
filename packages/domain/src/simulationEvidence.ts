import { ELECTRICAL_MODEL_VERSION } from './core/contracts';
import { normalizeCircuitDocument } from './core/normalize';
import type { Circuit, SimulationResult } from './types';

/** Exact, portable identity of the electrical inputs. Geometry and editor state
 * do not change a calculation. This is freshness metadata, never authorization. */
export function circuitRevision(circuit: Circuit): string {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
      // Keep exact sorted-key JSON identity without allocating an entry pair
      // for every property. A null prototype preserves literal special keys.
      const result: Record<string, unknown> = Object.create(null);
      for (const key of Object.keys(value).sort())
        result[key] = canonical((value as Record<string, unknown>)[key]);
      return result;
    }
    return value;
  };
  if (!circuit || !Array.isArray(circuit.components) || !Array.isArray(circuit.wires))
    return JSON.stringify(canonical(circuit)) ?? 'invalid';
  const normalized = normalizeCircuitDocument(circuit, false);
  const byId = <T extends { id: string }>(items: T[]) =>
    [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return JSON.stringify(
    canonical({
      components: byId(normalized.components).map(({ id, type, state }) => ({ id, type, state })),
      wires: byId(normalized.wires).map(
        ({ controlPoints: _points, pathKind: _path, ...wire }) => wire,
      ),
      supply: normalized.supply,
      globalVoltage: normalized.globalVoltage,
      faults: byId(normalized.faults ?? []),
    }),
  );
}

export function isCurrentSimulation(
  circuit: Circuit,
  result: SimulationResult | null | undefined,
): result is SimulationResult {
  return (
    !!result &&
    !result.legacyObservation &&
    result.electricalContract?.engineVersion !== 'legacy-rail-1.5b' &&
    typeof result.inputRevision === 'string' &&
    result.inputRevision === circuitRevision(circuit) &&
    result.electricalContract?.version === 1 &&
    result.electricalContract.modelVersion === ELECTRICAL_MODEL_VERSION
  );
}

/** Bounded operation evidence, not a safety or protection certificate. */
export function hasOperationEvidence(
  circuit: Circuit,
  result: SimulationResult | null | undefined,
): result is SimulationResult {
  return (
    isCurrentSimulation(circuit, result) &&
    !result.legacyObservation &&
    (result.electrical?.status ?? result.phasor?.status) === 'converged' &&
    !result.electricalContract?.coverage.some(
      (item) =>
        ['source', 'load', 'controls', 'fault', 'measurements'].includes(item.aspect) &&
        item.status === 'not-assessed',
    ) &&
    result.readiness?.topology !== 'empty' &&
    result.readiness?.topology !== 'no-source'
  );
}

export function hasFindingFreeEvidence(
  circuit: Circuit,
  result: SimulationResult | null | undefined,
): result is SimulationResult {
  return (
    hasOperationEvidence(circuit, result) &&
    !result.phasor &&
    result.errors.length === 0 &&
    result.warnings.length === 0 &&
    result.faultsCleared === true &&
    (result.activeInjectedFaults?.length ?? 0) === 0 &&
    (result.trippedComponents?.length ?? 0) === 0 &&
    (result.blownComponents?.length ?? 0) === 0 &&
    (result.bustedWires?.size ?? 0) === 0
  );
}
