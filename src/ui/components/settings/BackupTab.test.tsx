import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKUP_FORMAT, exportBackupJSON } from '../../../lib/backup/backupFormat';
import { useCircuitStore, useSettingsStore } from '../../../store';
import { getSettingsSnapshot } from '../../../store/settingsStore';
import { BackupTab } from './BackupTab';

vi.mock('../../../lib/exportImport', () => ({
  downloadText: vi.fn(),
}));

import { downloadText } from '../../../lib/exportImport';

const downloadTextMock = vi.mocked(downloadText);

beforeEach(() => {
  downloadTextMock.mockClear();
  act(() => {
    useSettingsStore.setState({
      colorScheme: 'light',
      canvasPreset: 'default',
      showGrid: true,
    });
  });
});

afterEach(() => {
  act(() => {
    useSettingsStore.setState({ canvasPreset: 'default', showGrid: true });
  });
});

function pickFile(content: string, name = 'backup.json') {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([content], name, { type: 'application/json' });
  fireEvent.change(input, { target: { files: [file] } });
}

describe('BackupTab — export', () => {
  it('downloads a backup file containing preferences and the circuit', () => {
    render(<BackupTab />);
    fireEvent.click(screen.getByRole('button', { name: /Download backup/ }));

    expect(downloadTextMock).toHaveBeenCalledTimes(1);
    const [json, filename] = downloadTextMock.mock.calls[0] as [string, string];
    expect(filename).toMatch(/^electrasim-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.settings).toBeTruthy();
    expect(parsed.circuit).toBeTruthy();
  });

  it('omits the circuit when the toggle is off', () => {
    render(<BackupTab />);
    fireEvent.click(screen.getByRole('switch', { name: /Include current circuit/ }));
    fireEvent.click(screen.getByRole('button', { name: /Download backup/ }));

    const [json] = downloadTextMock.mock.calls[0] as [string, string];
    expect(JSON.parse(json).circuit).toBeUndefined();
  });
});

describe('BackupTab — restore', () => {
  it('rejects a malicious file outright', async () => {
    render(<BackupTab />);
    pickFile(`{"__proto__":{"polluted":true},"format":"${BACKUP_FORMAT}","version":1}`);

    await screen.findByText(/unsafe keys/i);
    expect(screen.queryByRole('button', { name: /Restore backup/ })).not.toBeInTheDocument();
  });

  it('validates, previews, then restores settings on confirmation', async () => {
    const snapshot = {
      ...getSettingsSnapshot(),
      canvasPreset: 'deuteranopia' as const,
      showGrid: false,
    };
    const json = exportBackupJSON({ settings: snapshot, circuit: null, appVersion: '1.6.1' });

    render(<BackupTab />);
    pickFile(json);

    // Preview appears and nothing has been applied yet.
    await screen.findByText(/File validated — preview/i);
    expect(useSettingsStore.getState().canvasPreset).toBe('default');

    fireEvent.click(screen.getByRole('button', { name: /Restore backup/ }));

    await waitFor(() => {
      expect(useSettingsStore.getState().canvasPreset).toBe('deuteranopia');
      expect(useSettingsStore.getState().showGrid).toBe(false);
    });
  });

  it('restores the bundled circuit onto the canvas', async () => {
    const snapshot = getSettingsSnapshot();
    const circuit = {
      components: useCircuitStore.getState().components,
      wires: useCircuitStore.getState().wires,
      globalVoltage: 240,
    };
    const json = exportBackupJSON({ settings: snapshot, circuit });

    // Change live state so the restore is observable.
    act(() => useCircuitStore.getState().setCircuit({ components: [], wires: [] }));

    render(<BackupTab />);
    pickFile(json);
    await screen.findByText(/File validated — preview/i);
    fireEvent.click(screen.getByRole('button', { name: /Restore backup/ }));

    await waitFor(() => {
      expect(useCircuitStore.getState().components.length).toBe(circuit.components.length);
      expect(useCircuitStore.getState().globalVoltage).toBe(240);
    });
  });
});
