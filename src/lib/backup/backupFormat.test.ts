import { describe, expect, it } from 'vitest';
import { buildSeedCircuit } from '../../store/seed';
import { __SETTINGS_DEFAULTS } from '../../store/settingsStore';
import {
  BACKUP_FORMAT,
  MAX_BACKUP_BYTES,
  backupFilename,
  exportBackupJSON,
  parseBackupFile,
} from './backupFormat';

const settings = { ...__SETTINGS_DEFAULTS, colorScheme: 'dark' as const, showGrid: false };

describe('exportBackupJSON', () => {
  it('serialises a portable profile with the magic format and version', () => {
    const json = exportBackupJSON({ settings, circuit: null, appVersion: '1.6.1' });
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.version).toBe(1);
    expect(parsed.settings.colorScheme).toBe('dark');
    expect(parsed.circuit).toBeUndefined();
    expect(parsed.appVersion).toBe('1.6.1');
  });

  it('embeds the circuit when provided', () => {
    const circuit = buildSeedCircuit();
    const json = exportBackupJSON({ settings, circuit });
    const parsed = JSON.parse(json);
    expect(parsed.circuit.components.length).toBe(circuit.components.length);
    expect(parsed.circuit.wires.length).toBe(circuit.wires.length);
  });
});

describe('parseBackupFile — round trip', () => {
  it('restores settings and circuit from a valid file', () => {
    const circuit = buildSeedCircuit();
    const json = exportBackupJSON({ settings, circuit, appVersion: '1.6.1' });
    const result = parseBackupFile(json);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.settings).toEqual(settings);
    expect(result.backup.circuit?.components.length).toBe(circuit.components.length);
    expect(result.backup.circuit?.wires.length).toBe(circuit.wires.length);
    expect(result.backup.appVersion).toBe('1.6.1');
    expect(result.backup.exportedAt).toEqual(expect.any(Number));
    expect(result.warnings).toEqual([]);
  });

  it('keeps settings null when the section is missing, with a warning', () => {
    const json = exportBackupJSON({ settings });
    const result = parseBackupFile(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.circuit).toBeNull();
    expect(result.backup.settings).not.toBeNull();
  });
});

describe('parseBackupFile — malicious and malformed input', () => {
  it('rejects files over the size cap', () => {
    const result = parseBackupFile(
      `{"format":"${BACKUP_FORMAT}"}`.padEnd(MAX_BACKUP_BYTES + 10, ' '),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/too large/i);
  });

  it('rejects invalid JSON', () => {
    const result = parseBackupFile('{not json');
    expect(result.ok).toBe(false);
  });

  it('rejects non-object payloads', () => {
    expect(parseBackupFile('"just a string"').ok).toBe(false);
    expect(parseBackupFile('[1,2,3]').ok).toBe(false);
  });

  it('rejects files with the wrong magic format', () => {
    const result = parseBackupFile(JSON.stringify({ format: 'evil', version: 1, settings }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/unrecognised file format/i);
  });

  it('rejects unsupported schema versions', () => {
    const result = parseBackupFile(
      JSON.stringify({ format: BACKUP_FORMAT, version: 999, settings }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/unsupported backup version/i);
  });

  it('rejects payloads carrying __proto__ / constructor / prototype keys', () => {
    // JSON.parse materialises "__proto__" as an own property — the parser must
    // refuse to touch it so nothing can pollute prototypes downstream.
    const withProto = `{"__proto__":{"polluted":true},"format":"${BACKUP_FORMAT}","version":1}`;
    expect(parseBackupFile(withProto).ok).toBe(false);

    const withConstructor = `{"constructor":{"prototype":{"polluted":true}},"format":"${BACKUP_FORMAT}","version":1}`;
    expect(parseBackupFile(withConstructor).ok).toBe(false);
  });

  it('rebuilds settings through the whitelist — unknown keys dropped, bad types defaulted', () => {
    const json = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 1,
      settings: {
        colorScheme: 'neon',
        showGrid: 'yes',
        confirmDelete: 42,
        evilExtraKey: { nested: true },
        recentComponents: ['bulb', 123, { bad: true }],
      },
    });
    const result = parseBackupFile(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const restored = result.backup.settings;
    expect(restored).not.toBeNull();
    if (!restored) return;
    expect(restored.colorScheme).toBe(__SETTINGS_DEFAULTS.colorScheme);
    expect(restored.showGrid).toBe(__SETTINGS_DEFAULTS.showGrid);
    expect(restored.confirmDelete).toBe(__SETTINGS_DEFAULTS.confirmDelete);
    expect(restored.recentComponents).toEqual(['bulb']);
    expect('evilExtraKey' in restored).toBe(false);
  });

  it('falls back to null settings with a warning when the section is garbage', () => {
    const json = JSON.stringify({ format: BACKUP_FORMAT, version: 1, settings: 42 });
    const result = parseBackupFile(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.settings).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('rejects the whole file when the circuit section fails validation', () => {
    const json = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 1,
      settings,
      circuit: { components: [{ type: 'not-a-real-type', x: 'far', y: {} }], wires: [] },
    });
    const result = parseBackupFile(json);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/circuit section is invalid/i);
  });

  it('treats an absent circuit as circuit: null (no canvas change on restore)', () => {
    const json = JSON.stringify({ format: BACKUP_FORMAT, version: 1, settings });
    const result = parseBackupFile(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.circuit).toBeNull();
  });

  it('collects warnings for unknown top-level sections', () => {
    const json = JSON.stringify({ format: BACKUP_FORMAT, version: 1, settings, surprise: {} });
    const result = parseBackupFile(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.join(' ')).toMatch(/surprise/);
  });
});

describe('backupFilename', () => {
  it('produces a dated default filename', () => {
    expect(backupFilename(new Date('2026-08-26T10:00:00Z'))).toBe(
      'electrasim-backup-2026-08-26.json',
    );
  });
});
