/**
 * BackupTab — Settings → Backup.
 *
 * Portable profile backups: download one JSON file carrying every preference
 * and (optionally) the current circuit, then restore it on another computer.
 * Every file is treated as hostile input — size-capped, format-gated, and
 * rebuilt field-by-field through the settings whitelist and the circuit
 * validator before anything touches the stores, and the user must confirm a
 * preview before the restore is applied.
 */

import {
  CalendarClock,
  Check,
  CircuitBoard,
  Download,
  FileCheck2,
  FileWarning,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
  type ParsedBackup,
  backupFilename,
  exportBackupJSON,
  parseBackupFile,
} from '../../../lib/backup/backupFormat';
import { downloadText } from '../../../lib/exportImport';
import { useCircuitStore, useSettingsStore, useUiStore } from '../../../store';
import { getSettingsSnapshot } from '../../../store/settingsStore';
import { APP_VERSION } from '../../../version';
import { ElectricToggle } from './SettingsControls';

type Status = { kind: 'error' | 'success'; message: string } | null;

export function BackupTab() {
  const [includeCircuit, setIncludeCircuit] = useState(true);
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState<ParsedBackup | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const clearPreview = () => {
    setPending(null);
    setWarnings([]);
  };

  const handleExport = () => {
    try {
      const circuit = includeCircuit
        ? {
            components: useCircuitStore.getState().components,
            wires: useCircuitStore.getState().wires,
            globalVoltage: useCircuitStore.getState().globalVoltage,
            supply: useCircuitStore.getState().supply,
          }
        : null;
      const json = exportBackupJSON({
        settings: getSettingsSnapshot(),
        circuit,
        appVersion: APP_VERSION,
      });
      const filename = backupFilename();
      downloadText(json, filename, 'application/json');
      setStatus({
        kind: 'success',
        message: `Backup saved as "${filename}" — preferences${circuit ? ` and circuit (${circuit.components.length} components)` : ''} included.`,
      });
      useUiStore.getState().addLog(`Settings backup exported: ${filename}`, 'success');
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Export failed.',
      });
    }
  };

  const handleFile = (file: File) => {
    setStatus(null);
    clearPreview();
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseBackupFile(String(reader.result ?? ''));
      if (!result.ok) {
        setStatus({ kind: 'error', message: result.error });
        return;
      }
      setPending(result.backup);
      setWarnings(result.warnings);
      if (result.warnings.length > 0) {
        setStatus({
          kind: 'success',
          message: 'Backup file validated — review the preview below before restoring.',
        });
      }
    };
    reader.onerror = () => setStatus({ kind: 'error', message: 'Could not read the file.' });
    reader.readAsText(file);
  };

  const handleRestore = () => {
    if (!pending) return;
    const restored: string[] = [];

    if (pending.settings) {
      useSettingsStore.getState().applySettings(pending.settings);
      restored.push('preferences');
    }
    if (pending.circuit) {
      useCircuitStore.getState().setCircuit(pending.circuit);
      useCircuitStore.getState().clearSelection();
      restored.push(
        `circuit (${pending.circuit.components.length} components, ${pending.circuit.wires.length} wires)`,
      );
    }

    if (restored.length === 0) {
      setStatus({ kind: 'error', message: 'This backup contains nothing to restore.' });
      return;
    }

    setStatus({
      kind: 'success',
      message: `Restore complete: ${restored.join(' and ')} applied.`,
    });
    useUiStore.getState().addLog(`Settings backup restored: ${restored.join(', ')}.`, 'success');
    clearPreview();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const settingsSummary = pending?.settings
    ? 'All preferences (theme, mode, standards, layout, recents and more)'
    : pending
      ? 'No valid settings section — current preferences will be kept'
      : 'All preferences (theme, mode, standards, layout, recents and more)';

  const exportedAt =
    pending?.exportedAt != null
      ? new Date(pending.exportedAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Unknown';

  return (
    <div className="space-y-3">
      {/* Intro */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-3 dark:border-blue-900/50 dark:bg-blue-950/40">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white">
          <Download className="size-4" />
        </span>
        <div>
          <div className="text-xs font-bold text-blue-800 dark:text-blue-300">Backup & Restore</div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-blue-600/80 dark:text-blue-400/80">
            Download your profile as one JSON file and load it on another computer — preferences
            and, if you choose, your current circuit.
          </div>
        </div>
      </div>

      {/* Export card */}
      <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <Download className="size-3" /> Save a backup
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Everything below goes into the file: preferences, panel layout, region and standard
          choices, recent components — and optionally the circuit on the canvas.
        </p>
        <ElectricToggle
          label="Include current circuit"
          description="Bundle the canvas circuit (components, wires, supply voltage) into the backup so a restore recreates your work in progress on any device."
          preview={
            includeCircuit
              ? 'The backup carries your circuit alongside the preferences.'
              : 'Preferences only — the file stays small and never touches your canvas.'
          }
          checked={includeCircuit}
          onChange={setIncludeCircuit}
        />
        <button
          type="button"
          onClick={handleExport}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <Download className="size-3.5" />
          Download backup (.json)
        </button>
      </div>

      {/* Import card */}
      <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <Upload className="size-3" /> Restore a backup
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Pick a backup file. It is validated first and you review a preview — nothing is applied
          until you confirm.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          aria-label="Choose a backup file"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={[
            'flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-3 py-5 text-center transition',
            dragOver
              ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40'
              : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/20',
          ].join(' ')}
        >
          <Upload className="size-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Click to choose a file, or drop it here
          </span>
          <span className="text-[10px] text-slate-400">electrasim-backup-*.json · max 10 MB</span>
        </button>

        {/* Validation preview */}
        {pending && (
          <div className="mt-2 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <FileCheck2 className="size-3.5" /> File validated — preview
            </div>
            <dl className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-slate-400 dark:text-slate-500">Exported</dt>
                <dd className="flex items-center gap-1">
                  <CalendarClock className="size-3" />
                  {exportedAt}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-slate-400 dark:text-slate-500">App version</dt>
                <dd>{pending.appVersion ?? 'Unknown'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-slate-400 dark:text-slate-500">Settings</dt>
                <dd>{settingsSummary}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-slate-400 dark:text-slate-500">Circuit</dt>
                <dd>
                  {pending.circuit ? (
                    <span className="flex items-center gap-1">
                      <CircuitBoard className="size-3" />
                      {pending.circuit.components.length} components ·{' '}
                      {pending.circuit.wires.length} wires · {pending.circuit.globalVoltage ?? 230}{' '}
                      V
                    </span>
                  ) : (
                    'Not included — the current canvas stays untouched'
                  )}
                </dd>
              </div>
            </dl>
            {warnings.map((warning) => (
              <div
                key={warning}
                className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] leading-snug text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <FileWarning className="mt-px size-3 shrink-0" />
                {warning}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleRestore}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <Check className="size-3.5" />
                Restore backup
              </button>
              <button
                type="button"
                onClick={clearPreview}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <X className="size-3.5" />
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      {status && (
        <div
          className={[
            'flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] leading-snug',
            status.kind === 'error'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
          ].join(' ')}
        >
          {status.kind === 'error' ? (
            <FileWarning className="mt-px size-3.5 shrink-0" />
          ) : (
            <Check className="mt-px size-3.5 shrink-0" />
          )}
          {status.message}
        </div>
      )}

      {/* Security note */}
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
        <span>
          Every imported file is treated as untrusted: it is size-capped, format-checked, and
          rebuilt field-by-field against the app&apos;s allowed values. Unknown keys are dropped,
          invalid values fall back to defaults, unsafe keys are rejected, and a broken circuit
          section refuses the whole file — nothing runs automatically.
        </span>
      </div>
    </div>
  );
}
