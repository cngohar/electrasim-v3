import { fitCanvasView } from '../canvas/fitView';
import { usePlacementGuidance } from '../hooks/usePlacementGuidance';
import { PlacementSupplyFilter } from './PlacementSupplyFilter';
/**
 * CommandPalette — Workbench experiment (Ctrl+K).
 *
 * A searchable command palette that dispatches the same actions the toolbar /
 * panels already use. It covers the full component registry (every "Add
 * <component>" entry) plus the common actions, with arrow-key navigation and
 * Enter-to-run. No new state — every command calls an existing store action.
 */

import { COMPONENT_DEFS } from '@electrasim/domain';
import {
  BookOpen,
  Copy,
  Download,
  FlaskConical,
  Grid,
  Layers,
  Maximize2,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { modShortcut } from '../../lib/platform';
import { useCircuitStore, useClipboardStore, useUiStore } from '../../store';
import { useSettingsStore } from '../../store/settingsStore';
import { requestDeleteSelection } from '../canvas-actions';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
  keywords?: string;
}

export function CommandPalette() {
  const guidance = usePlacementGuidance();
  const allowedComponents = useUiStore((s) => s.challengeAllowedComponents);
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [scope, setScope] = useState<'all' | 'actions' | 'components'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setScope('all');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const commands = useMemo<{ actions: Command[]; components: Command[] }>(() => {
    const ui = useUiStore.getState;
    const setPlace = (type: string) => {
      ui().setPlacingType(useUiStore.getState().placingType === type ? null : type);
      setOpen(false);
    };

    const actionCommands: Command[] = [
      {
        id: 'run-sim',
        label: 'Run Simulation',
        hint: 'Start live circuit simulation',
        icon: Play,
        keywords: 'start play live energize run',
        run: () => {
          ui().toggleSim();
          setOpen(false);
        },
      },
      {
        id: 'fault-lab',
        label: 'Open Fault Lab',
        hint: 'Manual fault injection — Inspector tab with canvas animations (Pro)',
        icon: FlaskConical,
        keywords: 'fault short open circuit injection sparks',
        run: () => {
          const s = useUiStore.getState();
          s.setFaultLabOpen(true);
          s.addLog('Fault Lab opened in the Inspector — manual fault controls armed.', 'info');
          setOpen(false);
        },
      },
      {
        id: 'validate',
        label: 'Run Circuit Validation',
        hint: 'BS 7671 safety & compliance check',
        icon: ShieldCheck,
        keywords: 'safety check compliance bs7671 validate',
        run: () => {
          ui().runCircuitValidation();
          setOpen(false);
        },
      },
      {
        id: 'tour-student',
        label: 'Start Interactive Tutorial',
        hint: 'Guided walkthrough: place, wire, run',
        icon: Sparkles,
        keywords: 'tour tutorial onboarding walkthrough help learn guide',
        run: () => {
          ui().startTour('student');
          setOpen(false);
        },
      },
      {
        id: 'tour-pro',
        label: 'Standards & Compliance Tour',
        hint: 'Pro walkthrough: regions, validation, diagnostics',
        icon: Sparkles,
        keywords: 'tour tutorial pro standards compliance region country bs7671 nec',
        run: () => {
          ui().startTour('pro');
          setOpen(false);
        },
      },
      {
        id: 'zoom-fit',
        label: 'Zoom to Fit',
        hint: 'Frame all components (F)',
        icon: Maximize2,
        keywords: 'fit frame center view',
        run: () => {
          fitCanvasView();
          setOpen(false);
        },
      },
      {
        id: 'toggle-grid',
        label: 'Toggle Grid',
        hint: 'Show / hide the canvas dot grid',
        icon: Grid,
        keywords: 'grid dots canvas show hide',
        run: () => {
          useSettingsStore.getState().setSetting('showGrid', !useSettingsStore.getState().showGrid);
          setOpen(false);
        },
      },
      {
        id: 'copy',
        label: 'Copy Selection',
        hint: 'Copy selected components (Ctrl+C)',
        icon: Copy,
        keywords: 'duplicate clipboard copy',
        run: () => {
          const ids = useCircuitStore.getState().selectedComponentIds;
          if (ids.length === 0) return;
          const allComps = useCircuitStore.getState().components;
          useClipboardStore.getState().copy(allComps.filter((c) => ids.includes(c.id)));
          setOpen(false);
        },
      },
      {
        id: 'delete',
        label: 'Delete Selection',
        hint: 'Remove selected component(s) / wire(s)',
        icon: Copy,
        keywords: 'remove clear delete',
        run: () => {
          requestDeleteSelection();
          setOpen(false);
        },
      },
      {
        id: 'export',
        label: 'Import / Export',
        hint: 'JSON, SVG, PNG & share URL',
        icon: Download,
        keywords: 'json svg png save load import export',
        run: () => {
          ui().setImportExportOpen(true);
          setOpen(false);
        },
      },
      {
        id: 'docs',
        label: 'Documentation',
        hint: 'Open in-app guide',
        icon: BookOpen,
        keywords: 'help guide docs manual',
        run: () => {
          ui().setDocsOpen(true);
          setOpen(false);
        },
      },
      {
        id: 'settings',
        label: 'Settings',
        hint: 'Open preferences',
        icon: Settings,
        keywords: 'preferences options settings',
        run: () => {
          ui().setSettingsOpen(true);
          setOpen(false);
        },
      },
    ];

    // Every component in the registry is addable — this gives full coverage
    // (not just a hardcoded subset) and makes the palette a real search tool.
    const addCommands: Command[] = Object.entries(COMPONENT_DEFS)
      .filter(
        ([type]) =>
          guidance.visible(type) && (!allowedComponents || allowedComponents.includes(type)),
      )
      .map(([type, def]) => ({
        id: `add-${type}`,
        label: `Add ${def.label}`,
        hint: `${guidance.hint(type)}${def.tier === 'pro' ? ' · Membership required' : ''}`,
        icon: Layers,
        keywords: `add place ${def.label} ${type} ${def.category}`,
        run: () => setPlace(type),
      }));

    return { actions: actionCommands, components: addCommands };
  }, [setOpen, guidance, allowedComponents]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const scopeList =
    scope === 'actions'
      ? commands.actions
      : scope === 'components'
        ? commands.components
        : [...commands.actions, ...commands.components];

  const filtered = q
    ? scopeList.filter((c) => {
        const tokens = q.split(/\s+/);
        const haystack = `${c.label} ${c.keywords ?? ''}`.toLowerCase();
        return tokens.every((t) => haystack.includes(t));
      })
    : scopeList;

  const safeActive = filtered.length === 0 ? 0 : Math.min(activeIndex, filtered.length - 1);

  const runIndex = (i: number) => {
    const cmd = filtered[i];
    if (cmd) cmd.run();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] bg-slate-900/30 backdrop-blur-sm"
      onMouseDown={() => setOpen(false)}
    >
      <dialog
        open
        className="m-0 w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-700/50"
        style={{ marginInline: 'auto' }}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <Search className="size-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="What do you want to do?"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => (filtered.length === 0 ? 0 : (i + 1) % filtered.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) =>
                  filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length,
                );
              } else if (e.key === 'Enter') {
                e.preventDefault();
                runIndex(safeActive);
              }
            }}
          />
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800">
            Esc
          </kbd>
        </div>
        <PlacementSupplyFilter />
        {/* Scope tabs — filter the command list to Actions vs Components */}
        <div className="flex items-center gap-1 border-b border-slate-100 px-3 py-1.5 dark:border-slate-800">
          {(
            [
              ['all', `All (${commands.actions.length + commands.components.length})`],
              ['actions', `Actions (${commands.actions.length})`],
              ['components', `Components (${commands.components.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setScope(key);
                setActiveIndex(0);
              }}
              className={[
                'rounded-full px-2.5 py-1 text-[10px] font-semibold transition',
                scope === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-slate-400">
              No commands match &ldquo;{query}&rdquo;
            </div>
          )}
          {filtered.map((c, i) => {
            const active = i === safeActive;
            return (
              <button
                key={c.id}
                type="button"
                onClick={c.run}
                onMouseEnter={() => setActiveIndex(i)}
                className={[
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition',
                  active
                    ? 'bg-blue-50 dark:bg-slate-800'
                    : 'hover:bg-blue-50/60 dark:hover:bg-slate-800/60',
                ].join(' ')}
              >
                <c.icon
                  className={['size-4 shrink-0', active ? 'text-blue-600' : 'text-slate-400'].join(
                    ' ',
                  )}
                />
                <span
                  className={[
                    'flex-1 text-sm font-medium',
                    active
                      ? 'text-blue-800 dark:text-blue-200'
                      : 'text-slate-800 dark:text-slate-100',
                  ].join(' ')}
                >
                  {c.label}
                </span>
                {c.hint && <span className="text-[11px] text-slate-400">{c.hint}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-800">
          <span>
            <Zap className="mr-1 inline size-3 text-amber-400" />
            ↑↓ to navigate · Enter to run · Esc to close
          </span>
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800">
            {modShortcut('K')}
          </kbd>
        </div>
      </dialog>
    </div>
  );
}
