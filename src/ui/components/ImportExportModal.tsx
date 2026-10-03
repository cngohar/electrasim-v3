import { CircuitLibrary } from './CircuitLibrary';
/** Coordinates circuit file, image, print, and share-link workflows. */

import type { Circuit } from '@electrasim/domain';
import {
  Check,
  ClipboardCopy,
  Download,
  FileImage,
  FileJson,
  FileText,
  FileType,
  Link,
  Printer,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { buildEicReportData, renderEicHtml } from '../../lib/export/eicReport';
import {
  downloadBlob,
  downloadText,
  encodeShareURL,
  exportJSON,
  exportPDF,
  exportPNG,
  exportSVG,
  importJSON,
} from '../../lib/exportImport';
import { useCircuitStore, useSettingsStore, useUiStore } from '../../store';
import { EmojiGlyph } from './EmojiGlyph';
import { Modal } from './Modal';

type Tab = 'export' | 'import' | 'account';

interface FilenamePromptState {
  show: boolean;
  defaultName: string;
  ext: string;
  onConfirm: (name: string) => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export function ImportExportModal({ open, onClose, svgRef }: Props) {
  const [tab, setTab] = useState<Tab>('export');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filenamePrompt, setFilenamePrompt] = useState<FilenamePromptState | null>(null);
  const [customName, setCustomName] = useState('');

  const promptFilename = useCallback(
    (defaultName: string, ext: string, onConfirm: (name: string) => void) => {
      setCustomName(defaultName);
      setFilenamePrompt({ show: true, defaultName, ext, onConfirm });
    },
    [],
  );

  const confirmFilename = () => {
    if (!filenamePrompt) return;
    const raw = customName.trim() || filenamePrompt.defaultName;
    const name = raw.endsWith(filenamePrompt.ext) ? raw : `${raw}${filenamePrompt.ext}`;
    filenamePrompt.onConfirm(name);
    setFilenamePrompt(null);
  };

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    clearMessages();
  };

  // ── Export handlers ─────────────────────────────────────────────────────

  const handleExportJSON = useCallback(() => {
    clearMessages();
    promptFilename('circuit', '.electrasim.json', (filename) => {
      const { components, wires, globalVoltage, supply, faults } = useCircuitStore.getState();
      const json = exportJSON({ components, wires, globalVoltage, supply, faults });
      downloadText(json, filename, 'application/json');
      setSuccess(`JSON exported as "${filename}".`);
      useUiStore.getState().addLog(`Circuit exported as JSON: ${filename}`, 'success');
    });
  }, [clearMessages, promptFilename]);

  const handleExportSVG = useCallback(() => {
    clearMessages();
    if (!svgRef.current) {
      setError('SVG canvas is not available right now.');
      return;
    }
    promptFilename('circuit', '.svg', (filename) => {
      const svgString = exportSVG(svgRef.current as SVGSVGElement);
      downloadText(svgString, filename, 'image/svg+xml');
      setSuccess(`SVG exported as "${filename}".`);
      useUiStore.getState().addLog(`Circuit exported as SVG: ${filename}`, 'success');
    });
  }, [clearMessages, promptFilename, svgRef]);

  const handleExportPNG = useCallback(() => {
    clearMessages();
    if (!svgRef.current) {
      setError('SVG canvas is not available right now.');
      return;
    }
    promptFilename('circuit', '.png', async (filename) => {
      setBusy(true);
      try {
        const blob = await exportPNG(svgRef.current as SVGSVGElement);
        downloadBlob(blob, filename);
        setSuccess(`PNG exported as "${filename}".`);
        useUiStore.getState().addLog(`Circuit exported as PNG: ${filename}`, 'success');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'PNG export failed.');
      } finally {
        setBusy(false);
      }
    });
  }, [clearMessages, promptFilename, svgRef]);

  const handleExportEic = useCallback(() => {
    clearMessages();
    promptFilename('mini-eic', '.eic.html', (filename) => {
      const { components, wires, globalVoltage, supply, faults } = useCircuitStore.getState();
      const standard = useSettingsStore.getState().regulationStandard;
      const html = renderEicHtml(
        buildEicReportData(
          { components, wires, globalVoltage, supply, faults },
          { standard, earthing: 'TN-C-S' },
        ),
      );
      downloadText(html, filename, 'text/html');
      setSuccess(`Mini EIC exported as "${filename}" — open it, then Print / Save as PDF.`);
      useUiStore.getState().addLog(`Mini EIC report exported: ${filename}`, 'success');
    });
  }, [clearMessages, promptFilename]);

  const handleExportPDF = useCallback(() => {
    clearMessages();
    if (!svgRef.current) {
      setError('SVG canvas is not available right now.');
      return;
    }
    exportPDF(svgRef.current);
    setSuccess('Print dialog opened.');
    useUiStore.getState().addLog('Circuit PDF / print dialog opened.', 'success');
  }, [clearMessages, svgRef]);

  const handleCopyShareLink = useCallback(async () => {
    clearMessages();
    setBusy(true);
    try {
      const { components, wires, globalVoltage, supply, faults } = useCircuitStore.getState();
      const url = await encodeShareURL({ components, wires, globalVoltage, supply, faults });
      await navigator.clipboard.writeText(url);
      setSuccess('Share link copied to clipboard!');
      useUiStore.getState().addLog('Share link copied.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share link generation failed.');
    } finally {
      setBusy(false);
    }
  }, [clearMessages]);

  // ── Import handlers ─────────────────────────────────────────────────────

  const loadCircuit = useCallback((circuit: Circuit) => {
    useUiStore.getState().setSimRunning(false);
    useCircuitStore.getState().setCircuit(circuit);
    useCircuitStore.getState().clearSelection();
    useUiStore
      .getState()
      .addLog(
        `Imported circuit: ${circuit.components.length} components, ${circuit.wires.length} wires.`,
        'success',
      );
    setSuccess(`Loaded ${circuit.components.length} components, ${circuit.wires.length} wires.`);
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      clearMessages();
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const circuit = importJSON(reader.result as string);
          loadCircuit(circuit);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Import failed.');
        }
      };
      reader.onerror = () => setError('Could not read file.');
      reader.readAsText(file);
    },
    [clearMessages, loadCircuit],
  );

  const handlePasteImport = useCallback(() => {
    clearMessages();
    const text = textRef.current?.value?.trim();
    if (!text) {
      setError('Paste JSON content first.');
      return;
    }
    try {
      const circuit = importJSON(text);
      loadCircuit(circuit);
      if (textRef.current) textRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    }
  }, [clearMessages, loadCircuit]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <Modal open={open} onClose={onClose} ariaLabel="Import and export circuit">
      <div className="min-w-0 w-full">
        {/* Filename prompt overlay */}
        {filenamePrompt?.show && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/95 px-6 backdrop-blur-sm dark:bg-slate-900/95">
            <div className="w-full space-y-3">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                <EmojiGlyph emoji="bolt" size={14} className="mr-1.5" /> Save Circuit As
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Enter a filename for your circuit export.
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmFilename();
                    if (e.key === 'Escape') setFilenamePrompt(null);
                  }}
                  placeholder={filenamePrompt.defaultName}
                  className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-300 dark:text-slate-200 dark:placeholder:text-slate-600"
                />
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  {filenamePrompt.ext}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFilenamePrompt(null)}
                  className="flex-1 rounded-full border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmFilename}
                  className="flex-1 rounded-full bg-blue-600 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
                >
                  <span className="inline-flex items-center gap-1">
                    <EmojiGlyph emoji="down-arrow" size={12} /> Download
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-700/60">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Import / Export
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => switchTab('export')}
            className={[
              'flex-1 py-2.5 text-xs font-semibold transition',
              tab === 'export'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            ].join(' ')}
          >
            <Download className="mr-1.5 inline size-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={() => switchTab('import')}
            className={[
              'flex-1 py-2.5 text-xs font-semibold transition',
              tab === 'import'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            ].join(' ')}
          >
            <Upload className="mr-1.5 inline size-3.5" />
            Import
          </button>
          <button
            type="button"
            className="flex-1 py-2.5 text-xs font-semibold"
            onClick={() => switchTab('account')}
          >
            Saved circuits
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 px-5 py-4">
          {/* Status messages */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-400">
              <Check className="size-3.5 shrink-0" />
              {success}
            </div>
          )}

          {tab === 'account' ? (
            <CircuitLibrary />
          ) : tab === 'export' ? (
            <>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Download your circuit or share it with a link. JSON round-trips perfectly; SVG and
                PNG are snapshots.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <ExportButton
                  icon={FileJson}
                  label="JSON"
                  desc=".electrasim.json"
                  onClick={handleExportJSON}
                  disabled={busy}
                />
                <ExportButton
                  icon={FileType}
                  label="SVG"
                  desc="Vector snapshot"
                  onClick={handleExportSVG}
                  disabled={busy}
                />
                <ExportButton
                  icon={FileImage}
                  label="PNG"
                  desc="2× raster image"
                  onClick={handleExportPNG}
                  disabled={busy}
                />
                <ExportButton
                  icon={Printer}
                  label="PDF / Print"
                  desc="Browser print dialog"
                  onClick={handleExportPDF}
                  disabled={busy}
                />
                <ExportButton
                  icon={FileText}
                  label="Mini EIC"
                  desc="BS 7671 App 6 style"
                  onClick={handleExportEic}
                  disabled={busy}
                />
                <ExportButton
                  icon={Link}
                  label="Share Link"
                  desc="Copy to clipboard"
                  onClick={handleCopyShareLink}
                  disabled={busy}
                  accent
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Load a{' '}
                <code className="rounded bg-slate-100 px-1 font-mono text-[10px] dark:bg-slate-800 dark:text-slate-300">
                  .electrasim.json
                </code>{' '}
                file or paste JSON below. This will <strong>replace</strong> your current circuit
                (undo with Ctrl+Z).
              </p>

              {/* Drop zone */}
              <button
                type="button"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileRef.current?.click()}
                className={[
                  'flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed py-6 text-xs transition',
                  dragOver
                    ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-600 dark:hover:bg-slate-800/60',
                ].join(' ')}
              >
                <Upload className="size-5" />
                <span>
                  Drop <code className="font-mono">.electrasim.json</code> here or click to browse
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.electrasim.json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  e.target.value = '';
                }}
              />

              {/* Paste JSON */}
              <div>
                <label
                  htmlFor="import-json"
                  className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                >
                  Or paste JSON
                </label>
                <textarea
                  id="import-json"
                  ref={textRef}
                  rows={4}
                  placeholder='{"version":1,"circuit":{...}}'
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white/80 p-2.5 font-mono text-[11px] text-slate-700 outline-none placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:placeholder:text-slate-600 dark:focus:border-blue-500 dark:focus:ring-blue-900/50"
                />
                <button
                  type="button"
                  onClick={handlePasteImport}
                  disabled={busy}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <ClipboardCopy className="size-3.5" />
                  Import from paste
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Shared button card for the export grid ────────────────────────────────

interface ExportButtonProps {
  icon: typeof FileJson;
  label: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}

function ExportButton({ icon: Icon, label, desc, onClick, disabled, accent }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3.5 text-xs font-medium shadow-sm transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100',
        accent
          ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-900/60'
          : 'border-slate-200/80 bg-white/80 text-slate-700 hover:border-blue-300 hover:bg-white hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:bg-slate-700/80 dark:hover:text-blue-400',
      ].join(' ')}
    >
      <Icon className="size-5" />
      <span className="font-semibold">{label}</span>
      <span className="text-[10px] text-slate-400 dark:text-slate-500">{desc}</span>
    </button>
  );
}
