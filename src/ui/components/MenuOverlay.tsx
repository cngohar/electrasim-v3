/**
 * MenuOverlay — the app menu (MCB breaker trigger in the Toolbar).
 *
 * Redesigned from scratch as a wide, low "command hub" instead of a tall
 * vertical list:
 *
 *   ┌─ brand header (version + mode chip) ──────────────────────────┐
 *   │  LEARN & PRACTICE                                             │
 *   │  [Guided Circuits] [Challenge Mode]                           │
 *   │  [Diagnosis Lab]   [Interactive Tutorial]                     │
 *   │  TOOLS & INFO                                                 │
 *   │  [Documentation] [Keyboard Shortcuts] [Import / Export]       │
 *   │  [Settings]      [Contact]            [About ElectraSim]      │
 *   │  v1.6.1 · local-first        ⌘K palette   ·   Esc to close   │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * Canvas/wiring actions (Clear All Wires, Clear All Components, Reset to
 * Default Circuit, wire mode…) deliberately do NOT live here — they are
 * target-aware on the right-click context menu, where they belong.
 */

import {
  BookOpen,
  Command,
  Download,
  Info,
  Keyboard,
  type LucideIcon,
  Mail,
  Settings,
  Sparkles,
  Stethoscope,
  Target,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { isMacPlatform, modShortcut } from '../../lib/platform';
import { useSettingsStore, useUiStore } from '../../store';
import { APP_VERSION } from '../../version';
import { preloadChallengeMode, preloadSettings } from '../deferredSurfacePreloads';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { EmojiGlyph } from './EmojiGlyph';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FeatureTile {
  icon: LucideIcon;
  label: string;
  description: string;
  accent: string;
  action: () => void;
}

const FEATURE_TILES: FeatureTile[] = [
  {
    icon: BookOpen,
    label: 'Guided Circuits',
    description: 'Load ready-made circuits with checklists',
    accent:
      'bg-blue-50 text-blue-600 ring-blue-100 group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-900/60',
    action: () => useUiStore.getState().setTemplatesOpen(true),
  },
  {
    icon: Target,
    label: 'Challenge Mode',
    description: 'Build circuits from structured challenges',
    accent:
      'bg-amber-50 text-amber-600 ring-amber-100 group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900/60',
    action: () => useUiStore.getState().openChallengeMode(),
  },
  {
    icon: Stethoscope,
    label: 'Diagnosis Lab',
    description: 'Find and clear the fault on a generated circuit',
    accent:
      'bg-amber-50 text-amber-600 ring-amber-100 group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900/60',
    action: () => useUiStore.getState().setDiagnosisOpen(true),
  },
  {
    icon: Sparkles,
    label: 'Interactive Tutorial',
    description: 'Student basics or Pro standards',
    accent:
      'bg-sky-50 text-sky-600 ring-sky-100 group-hover:bg-sky-600 group-hover:text-white dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-900/60',
    action: () => useUiStore.getState().startTour('student'),
  },
];

const UTILITY_TILES: FeatureTile[] = [
  {
    icon: BookOpen,
    label: 'Documentation',
    description: 'In-app reference manual',
    accent:
      'bg-cyan-50 text-cyan-600 ring-cyan-100 group-hover:bg-cyan-600 group-hover:text-white dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-900/60',
    action: () => useUiStore.getState().setDocsOpen(true),
  },
  {
    icon: Keyboard,
    label: 'Keyboard Shortcuts',
    description: 'All hotkeys at a glance',
    accent:
      'bg-indigo-50 text-indigo-600 ring-indigo-100 group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-900/60',
    action: () => useUiStore.getState().toggleShortcuts(),
  },
  {
    icon: Download,
    label: 'Import / Export',
    description: 'JSON, SVG, PNG, share link',
    accent:
      'bg-emerald-50 text-emerald-600 ring-emerald-100 group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900/60',
    action: () => useUiStore.getState().setImportExportOpen(true),
  },
  {
    icon: Settings,
    label: 'Settings',
    description: 'Preferences & display options',
    accent:
      'bg-slate-100 text-slate-600 ring-slate-200 group-hover:bg-slate-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    action: () => useUiStore.getState().setSettingsOpen(true),
  },
  {
    icon: Mail,
    label: 'Contact',
    description: 'Report bugs or send feedback',
    accent:
      'bg-cyan-50 text-cyan-600 ring-cyan-100 group-hover:bg-cyan-600 group-hover:text-white dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-900/60',
    action: () => useUiStore.getState().setContactOpen(true),
  },
  {
    icon: Info,
    label: 'About ElectraSim',
    description: 'Version info, stack & roadmap',
    accent:
      'bg-purple-50 text-purple-600 ring-purple-100 group-hover:bg-purple-600 group-hover:text-white dark:bg-purple-950/60 dark:text-purple-300 dark:ring-purple-900/60',
    action: () => useUiStore.getState().setSettingsOpen(true, 'about'),
  },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {children}
      </span>
      <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}

export function MenuOverlay({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(open, onClose, panelRef);

  const appMode = useSettingsStore((s) => s.appMode);

  // Fetch the two most likely deferred surfaces while the menu is visible so
  // selecting them feels immediate. The click path still has a visible
  // fallback if the network is slow or the prefetch has not finished.
  useEffect(() => {
    if (!open) return;
    preloadChallengeMode();
    preloadSettings();
  }, [open]);

  const run = (tile: FeatureTile) => {
    tile.action();
    onClose();
  };

  return (
    <>
      {/* Blurred backdrop */}
      <div
        className={[
          'fixed inset-0 z-[60] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          open
            ? 'bg-slate-900/20 opacity-100 backdrop-blur-sm'
            : 'pointer-events-none bg-transparent opacity-0 backdrop-blur-0',
        ].join(' ')}
        onClick={onClose}
      />

      {/* Command-hub panel */}
      <div
        // biome-ignore lint/a11y/useSemanticElements: custom always-mounted scale/fade overlay pattern; a native <dialog> would change dismissal semantics
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="ElectraSim menu"
        aria-hidden={!open}
        tabIndex={-1}
        className={[
          'fixed left-1/2 top-1/2 z-[70] w-[min(560px,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5 backdrop-blur-xl backdrop-saturate-150 dark:border-slate-700/80 dark:bg-slate-900/95 dark:ring-slate-700/50',
          'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          open ? 'scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-slate-100 px-5 py-3.5 dark:border-slate-700/60">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-500 via-blue-400 to-transparent" />
          <div className="flex items-center gap-3 pl-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/30">
              <EmojiGlyph emoji="bolt" size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  ElectraSim
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[9px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  v{APP_VERSION}
                </span>
              </div>
              <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                The interactive circuit workbench
              </div>
            </div>
            <span
              className={[
                'shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                appMode === 'pro'
                  ? 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
              ].join(' ')}
            >
              {appMode === 'pro' ? 'Pro' : 'Student'}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3.5 p-4">
          <div className="space-y-2">
            <SectionLabel>Learn &amp; practice</SectionLabel>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FEATURE_TILES.map((tile) => (
                <button
                  key={tile.label}
                  type="button"
                  onClick={() => run(tile)}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-left transition-all duration-150 hover:-translate-y-px hover:border-blue-300 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900/70 dark:hover:border-blue-600"
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg ring-1 transition-colors duration-150 ${tile.accent}`}
                  >
                    <tile.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {tile.label}
                    </span>
                    <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {tile.description}
                    </span>
                  </span>
                  <span className="size-1.5 shrink-0 rounded-full bg-slate-200 transition-colors group-hover:bg-blue-400 dark:bg-slate-700" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel>Tools &amp; info</SectionLabel>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {UTILITY_TILES.map((tile) => (
                <button
                  key={tile.label}
                  type="button"
                  onClick={() => run(tile)}
                  className="group flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 text-left transition-all duration-150 hover:border-blue-300 hover:shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70 dark:hover:border-blue-600"
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-lg ring-1 transition-colors duration-150 ${tile.accent}`}
                  >
                    <tile.icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      {tile.label}
                    </span>
                    <span className="block truncate text-[9px] text-slate-400 dark:text-slate-500">
                      {tile.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-700/60 dark:bg-slate-800/60">
          <span className="truncate text-[10px] text-slate-400 dark:text-slate-500">
            Local-first simulator · Esc to close
          </span>
          <button
            type="button"
            onClick={() => {
              useUiStore.getState().toggleCommandPalette();
              onClose();
            }}
            title={`Command palette (${modShortcut('K')})`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-500"
          >
            {isMacPlatform() ? <Command className="size-3" /> : <Keyboard className="size-3" />}
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[9px] text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {modShortcut('K')}
            </kbd>
            Command palette
          </button>
        </div>
      </div>
    </>
  );
}
