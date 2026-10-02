import { validateCircuitInput } from './core/input';
import { normalizeCircuitDocument } from './core/normalize';
import type { Circuit } from './types';

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const CIRCUIT_SCHEMA_VERSION = 2 as const;
export interface ElectraSimFile {
  version: typeof CIRCUIT_SCHEMA_VERSION;
  exportedAt: number;
  circuit: Circuit;
}

/** Read schema 1 without losing IDs/overrides; write versioned source profiles in schema 2. */
export function validateCircuitJSON(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'Not a valid JSON object.';
  const payload = raw as Record<string, unknown>;
  if (payload.version !== 1 && payload.version !== CIRCUIT_SCHEMA_VERSION) {
    const version =
      typeof payload.version === 'number' || typeof payload.version === 'string'
        ? payload.version
        : 'invalid';
    return `Unsupported schema version: ${version} (expected 1 or ${CIRCUIT_SCHEMA_VERSION}).`;
  }
  const result = validateCircuitInput(payload.circuit);
  if (result.valid && payload.version === CIRCUIT_SCHEMA_VERSION && !result.circuit.supply)
    return 'Schema 2 requires a versioned document supply profile.';
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
