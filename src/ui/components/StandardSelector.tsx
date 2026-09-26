/** Independent teaching profile and plug-family selector. */

import {
  PLUG_SYSTEMS,
  PLUG_SYSTEM_LIST,
  type PlugSystemId,
  STANDARD_LIST,
  type StandardId,
  getStandard,
  primarySocketForPlug,
} from '@electrasim/domain/standards';
import { ChevronDown, Globe, Lock, Plug, ShieldCheck, Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCircuitStore, useSettingsStore, useUiStore } from '../../store';
import { EmojiGlyph } from './EmojiGlyph';

interface Props {
  /** Compact variant drops the citation text (used on narrow widths). */
  compact?: boolean;
}

export function StandardSelector({ compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const regulationStandard = useSettingsStore((s) => s.regulationStandard);
  const plugSystem = useSettingsStore((s) => s.plugSystem);
  const appMode = useSettingsStore((s) => s.appMode);
  const setSetting = useSettingsStore((s) => s.setSetting);
  const setGlobalSupplyVoltage = useCircuitStore((s) => s.setGlobalSupplyVoltage);
  const runCircuitValidation = useUiStore((s) => s.runCircuitValidation);
  const addLog = useUiStore((s) => s.addLog);

  const current = getStandard(regulationStandard);

  // Close the popover on outside-click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const applyStandard = (id: StandardId) => {
    const preset = getStandard(id);
    setSetting('regulationStandard', id);
    setGlobalSupplyVoltage(preset.nominalVoltage);

    // Regulation and physical plug/socket selection are intentionally
    // independent. Changing standards must not overwrite a user's regional
    // hardware choice; the plug controls below remain the sole owner of it.
    setOpen(false);
    addLog(
      `Standard set to ${preset.label} (${preset.citation}) — ${preset.nominalVoltage} V / ${preset.frequencyHz} Hz.`,
      'info',
    );
    // Re-validate so newly applicable rules (drop %, RCD, MCB curve) flag up.
    setTimeout(() => runCircuitValidation(), 0);
  };

  const applyPlugSystem = (id: PlugSystemId) => {
    setSetting('plugSystem', id);
    setOpen(false);
    // If the user is still on the untouched demo, rebuild its socket so the
    // demo reflects the new region's plug type.
    useCircuitStore.getState().swapDemoSocketForPlug(primarySocketForPlug(id));
    addLog(`Plug type set to ${PLUG_SYSTEMS[id].label}.`, 'info');
  };

  if (appMode === 'basic') {
    return (
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          data-standard-selector
          data-standard-readonly
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Active standard: ${current.shortLabel}, ${current.citation} (read-only in Student mode)`}
          title={`${current.label} · ${current.citation}. Locked in Student mode — click to learn why.`}
          className="flex max-w-52 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Globe className="size-3.5 shrink-0 text-indigo-500" />
          <EmojiGlyph emoji={current.flag} size={13} />
          <span className="shrink-0 font-bold">{current.shortLabel}</span>
          <span className="truncate text-slate-500 dark:text-slate-400" data-standard-citation>
            {current.citation}
          </span>
          <Lock aria-hidden="true" className="size-3 shrink-0 text-slate-400" />
        </button>

        {open && (
          <div
            // biome-ignore lint/a11y/useSemanticElements: matches the existing non-modal popover pattern; native <dialog> would change dismissal semantics
            role="dialog"
            aria-label="Standards are locked in Student mode"
            className="absolute left-0 top-9 z-50 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-100">
              <Lock className="size-3.5 text-slate-400" />
              Locked in Student mode
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Student mode keeps every learner on one consistent rule set ({current.label},{' '}
              {current.nominalVoltage} V / {current.frequencyHz} Hz). Pro mode unlocks the full
              country / standard and plug-type selector. {current.metadata.coverage}
            </p>
            <button
              type="button"
              onClick={() => {
                setSetting('appMode', 'pro');
                useCircuitStore.getState().swapDemoForMode('pro');
                setOpen(false);
                addLog('Switched to Pro Electrician Mode — standard selector unlocked.', 'info');
              }}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Wrench className="size-3.5" />
              Switch to Pro mode
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        data-standard-selector
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/70"
        title={`${current.citation} · ${PLUG_SYSTEMS[plugSystem].label}. Click to change country/standard or plug type.`}
        aria-label={`Standard: ${current.shortLabel} · Plug: ${PLUG_SYSTEMS[plugSystem].shortLabel}. Click to change.`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="size-3.5" />
        <EmojiGlyph emoji={current.flag} size={14} />
        {!compact && (
          <span className="hidden md:inline">
            {current.shortLabel} · {PLUG_SYSTEMS[plugSystem].shortLabel}
          </span>
        )}
        <ChevronDown
          className={`size-3 text-indigo-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          tabIndex={-1}
          data-tour="standard-popover"
          className="absolute left-0 top-9 z-50 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          {/* ── Electrical standard ── */}
          <div className="mb-1 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            Electrical Standard
          </div>
          {STANDARD_LIST.map((s) => {
            const selected = s.id === regulationStandard;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={selected}
                onClick={() => applyStandard(s.id)}
                className={`mb-1 flex w-full items-start gap-2.5 rounded-lg border p-2 text-left transition last:mb-0 ${
                  selected
                    ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/50'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <EmojiGlyph emoji={s.flag} size={16} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {s.label}
                    </span>
                    {selected && (
                      <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
                        Active
                      </span>
                    )}
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                    {s.citation}
                  </span>
                  <span className="block text-[9px] text-slate-500">{s.metadata.adoption}</span>
                  <span className="mt-1 flex flex-wrap gap-1 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                    <span className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
                      {s.nominalVoltage}V
                    </span>
                    <span className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
                      {s.frequencyHz}Hz
                    </span>
                    <span className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
                      {s.voltageDrop.lightingPercent === null
                        ? 'ΔU not assessed'
                        : `ΔU guide ${s.voltageDrop.lightingPercent}/${s.voltageDrop.powerPercent}%`}
                    </span>
                    <span className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
                      {s.id === 'us' ? 'GFCI model limited' : `${s.rcdThresholdMa}mA RCD guide`}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}

          {/* ── Plug / socket type ── */}
          <div className="mb-1 mt-2 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <Plug className="size-3.5 text-indigo-500" />
            Plug Type
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PLUG_SYSTEM_LIST.map((p) => {
              const selected = p.id === plugSystem;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => applyPlugSystem(p.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[10px] font-semibold transition ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <EmojiGlyph emoji={p.flag} size={14} />
                  <span className="truncate">{p.shortLabel}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-2 border-t border-slate-200 pt-1.5 text-[9px] leading-snug text-slate-400 dark:border-slate-800">
            {current.metadata.coverage} Plug type only changes the palette; it does not establish
            national compliance. Display theme colours are not conductor identification.
          </p>
        </div>
      )}
    </div>
  );
}
