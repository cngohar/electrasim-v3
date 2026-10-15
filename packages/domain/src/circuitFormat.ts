import { validateCircuitInput } from './core/input';
import { normalizeCircuitDocument } from './core/normalize';
import type { Circuit } from './types';

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const CIRCUIT_SCHEMA_VERSION = 3 as const;
export interface ElectraSimFile {
  version: typeof CIRCUIT_SCHEMA_VERSION;
  exportedAt: number;
  circuit: Circuit;
}

/** Read schemas 1/2 without losing IDs/overrides; write source/load profiles in schema 3. */
export function validateCircuitJSON(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'Not a valid JSON object.';
  const payload = raw as Record<string, unknown>;
  if (
    payload.version !== 1 &&
    payload.version !== 2 &&
    payload.version !== CIRCUIT_SCHEMA_VERSION
  ) {
    const version =
      typeof payload.version === 'number' || typeof payload.version === 'string'
        ? payload.version
        : 'invalid';
    return `Unsupported schema version: ${version} (expected 1, 2 or ${CIRCUIT_SCHEMA_VERSION}).`;
  }
  const result = validateCircuitInput(payload.circuit);
  if (result.valid && payload.version !== 1 && !result.circuit.supply)
    return `Schema ${payload.version} requires a versioned document supply profile.`;
  if (
    result.valid &&
    payload.version !== CIRCUIT_SCHEMA_VERSION &&
    result.circuit.components.some((c) => c.state.electronicLoadProfile || c.state.catalogueProfile)
  )
    return 'Catalogue profiles require file schema 3; correct the file version without discarding its profile.';
  return result.valid ? null : (result.diagnostics[0]?.message ?? 'Invalid circuit.');
}

export const normalizeCircuit = normalizeCircuitDocument;

export function exportJSON(circuit: Circuit): string {
  const payload: ElectraSimFile = {
    version: CIRCUIT_SCHEMA_VERSION,
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
