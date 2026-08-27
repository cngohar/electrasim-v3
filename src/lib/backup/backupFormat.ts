/**
 * backupFormat — portable ElectraSim profile backup files.
 *
 * A single JSON file that carries everything the user needs to move to
 * another computer: their preferences and (optionally) their current
 * circuit. The format is deliberately hostile-input-hardened:
 *
 *   1. Size-capped (10 MB, same as circuit imports).
 *   2. A `format` magic string + numeric schema version gate the parser.
 *   3. `__proto__` / `constructor` / `prototype` keys are rejected outright.
 *   4. The settings section is rebuilt field-by-field through the same
 *      whitelist sanitizer used for IndexedDB hydration — unknown keys are
 *      dropped and wrong types fall back to defaults.
 *   5. The circuit section passes through the existing circuit-file
 *      validator (type, range, count and string-length limits) and is then
 *      re-normalised before it can reach the store.
 *   6. Nothing is applied automatically — the importer shows a preview and
 *      waits for explicit confirmation.
 */

import type { Circuit } from '../../domain';
import { type UserSettings, sanitizeSettingsPayload } from '../../store/settingsStore';
import { normalizeCircuit, validateCircuitJSON } from '../export/circuitFormat';

export const BACKUP_FORMAT = 'electrasim-backup' as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

/** Keys that JSON can carry as own properties and that must never reach
 *  our object spread / merge paths. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const MAX_APP_VERSION_LEN = 64;

export interface BackupExportOptions {
  settings: UserSettings;
  /** Omit (or pass null) for a preferences-only backup. */
  circuit?: Circuit | null;
  appVersion?: string;
}

export interface ParsedBackup {
  /** Whitelist-sanitised settings, or null when the section was missing/invalid. */
  settings: UserSettings | null;
  /** Validated + normalised circuit, or null when the backup omitted it. */
  circuit: Circuit | null;
  exportedAt: number | null;
  appVersion: string | null;
}

export type BackupParseResult =
  | { ok: true; backup: ParsedBackup; warnings: string[] }
  | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasForbiddenKey(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => FORBIDDEN_KEYS.has(key));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Serialises a complete, portable backup file. */
export function exportBackupJSON(options: BackupExportOptions): string {
  const payload: Record<string, unknown> = {
    format: BACKUP_FORMAT,
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: Date.now(),
    appVersion: options.appVersion ?? null,
    settings: options.settings,
  };
  if (options.circuit) {
    payload.circuit = normalizeCircuit(options.circuit);
  }
  return JSON.stringify(payload, null, 2);
}

/**
 * Parses and validates an untrusted backup file. Throws nothing — every
 * failure returns `{ ok: false, error }` with a human-readable reason, and
 * every success returns the sanitised contents plus any warnings worth
 * showing before the user confirms the restore.
 */
export function parseBackupFile(text: string): BackupParseResult {
  if (text.length > MAX_BACKUP_BYTES) {
    return {
      ok: false,
      error: `File too large (${(text.length / 1024 / 1024).toFixed(1)} MB, max ${MAX_BACKUP_BYTES / 1024 / 1024} MB).`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Invalid JSON — the file could not be parsed.' };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, error: 'This is not an ElectraSim backup file.' };
  }
  if (hasForbiddenKey(parsed)) {
    return { ok: false, error: 'The file contains unsafe keys and was rejected.' };
  }

  const payload = parsed;
  const warnings: string[] = [];

  if (payload.format !== BACKUP_FORMAT) {
    return {
      ok: false,
      error: `Unrecognised file format (expected "${BACKUP_FORMAT}"). This does not look like an ElectraSim backup.`,
    };
  }
  if (payload.version !== BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported backup version (${String(payload.version)}). Update ElectraSim and try again.`,
    };
  }

  // Settings — field-by-field whitelist rebuild. Invalid sections fall back
  // to defaults with an explicit warning rather than failing the whole file,
  // because a settings-only backup is still valuable without them.
  let settings: UserSettings | null = null;
  if (payload.settings !== undefined) {
    settings = sanitizeSettingsPayload(payload.settings);
    if (!settings) {
      warnings.push(
        'The settings section was missing or invalid — current preferences will be kept.',
      );
    }
  }

  // Circuit — strict validation; an invalid circuit rejects the whole file.
  // A corrupt circuit must never half-restore onto the canvas.
  let circuit: Circuit | null = null;
  if (payload.circuit !== undefined) {
    const circuitError = validateCircuitJSON({
      version: 1,
      exportedAt: 0,
      circuit: payload.circuit,
    });
    if (circuitError) {
      return { ok: false, error: `The circuit section is invalid: ${circuitError}` };
    }
    circuit = normalizeCircuit((payload as { circuit: Circuit }).circuit);
  }

  const exportedAt = isFiniteNumber(payload.exportedAt) ? (payload.exportedAt as number) : null;
  const appVersion =
    typeof payload.appVersion === 'string' && payload.appVersion.length <= MAX_APP_VERSION_LEN
      ? payload.appVersion
      : null;

  const knownKeys = new Set([
    'format',
    'version',
    'exportedAt',
    'appVersion',
    'settings',
    'circuit',
  ]);
  const unknownKeys = Object.keys(payload).filter((key) => !knownKeys.has(key));
  if (unknownKeys.length > 0) {
    warnings.push(
      `Ignored ${unknownKeys.length} unrecognised section${unknownKeys.length === 1 ? '' : 's'} (${unknownKeys.join(', ')}).`,
    );
  }

  return { ok: true, backup: { settings, circuit, exportedAt, appVersion }, warnings };
}

/** Default filename for a freshly exported backup. */
export function backupFilename(now = new Date()): string {
  const iso = now.toISOString().slice(0, 10);
  return `electrasim-backup-${iso}.json`;
}
