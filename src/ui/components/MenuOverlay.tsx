/**
 * MenuOverlay — Phase 6.5 centered modal menu.
 *
 * Full-screen blurred backdrop with a centered panel. The trigger (MCB breaker
 * button) lives in the Toolbar; this component owns only the overlay + panel.
 *
 * Design: approved mockup — centered modal, backdrop-blur, ease-in-out
 * scale animation, wire-terminal styled items, circuit-trace accents.
 */

import {
  BookOpen,
  Download,
  Info,
  Keyboard,
  Mail,
  RefreshCcw,
  Settings,
  Sparkles,
  Stethoscope,
  Target,
  Trash2,
  Unlink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUiStore } from '../../store';
import { APP_VERSION } from '../../version';
import { requestClearAll, requestClearWires, requestReset } from '../canvas-actions';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  description: string;
  portColor: string;
  shortcut?: string;
  action: () => void;
  hoverClass?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MenuOverlay({ open, onClose }: Props) {
  const items: MenuItem[] = [
    {
      icon: Target,
      label: 'Challenge Mode',
      description: 'Build circuits from structured challenges',
      portColor: 'bg-amber-500',
      action: () => {
        useUiStore.getState().setChallengeOpen(true);
      },
    },
    {
      icon: Stethoscope,
      label: 'Diagnosis Lab',
      description: 'Find and clear the fault on a generated circuit',
      portColor: 'bg-amber-500',
      action: () => {
        useUiStore.getState().setDiagnosisOpen(true);
      },
    },
    {
      icon: BookOpen,
      label: 'Guided Circuits',
      description: 'Load templates with checklists',
      portColor: 'bg-blue-500',
      action: () => {
        useUiStore.getState().setTemplatesOpen(true);
      },
    },
    {
      icon: Sparkles,
      label: 'Interactive Tutorial',
      description: 'Guided tour: Student basics or Pro standards',
      portColor: 'bg-sky-500',
      action: () => {
        useUiStore.getState().startTour('student');
      },
    },
    {
      icon: BookOpen,
      label: 'Documentation',
      description: 'Learn how to wire circuits',
      portColor: 'bg-cyan-500',
      action: () => {
        useUiStore.getState().setDocsOpen(true);
      },
    },
    {
      icon: Keyboard,
      label: 'Keyboard Shortcuts',
      description: 'All hotkeys at a glance',
      portColor: 'bg-indigo-500',
      action: () => {
        useUiStore.getState().setDocsOpen(true, 'shortcuts');
      },
    },
    {
      icon: Download,
      label: 'Import / Export',
      description: 'JSON, SVG, PNG, share link',
      portColor: 'bg-emerald-500',
      shortcut: 'Ctrl+E',
      action: () => {
        useUiStore.getState().setImportExportOpen(true);
      },
    },
    {
      icon: Settings,
      label: 'Settings',
      description: 'Preferences & display options',
      portColor: 'bg-slate-500',
      action: () => {
        useUiStore.getState().setSettingsOpen(true);
      },
    },
    // ── separator index 4 ──
    {
      icon: Unlink,
      label: 'Clear All Wires',
      description: 'Remove every wire, keep components',
      portColor: 'bg-orange-400',
      action: requestClearWires,
      hoverClass: 'hover:bg-orange-50',
    },
    {
      icon: Trash2,
      label: 'Clear All Components',
      description: 'Remove every component and wire',
      portColor: 'bg-red-400',
      action: requestClearAll,
      hoverClass: 'hover:bg-red-50 hover:text-red-700',
    },
    {
      icon: RefreshCcw,
      label: 'Reset to Defaults',
      description: 'Restore the demo circuit',
      portColor: 'bg-amber-500',
      action: requestReset,
      hoverClass: 'hover:bg-amber-50 hover:text-amber-700',
    },
    // ── separator index 7 ──
    {
      icon: Mail,
      label: 'Contact',
      description: 'Report bugs or send feedback',
      portColor: 'bg-cyan-500',
      action: () => {
        useUiStore.getState().setContactOpen(true);
      },
    },
    {
      icon: Info,
      label: 'About ElectraSim',
      description: 'Version info, stack & roadmap',
      portColor: 'bg-purple-500',
      action: () => {
        useUiStore.getState().setSettingsOpen(true, 'about');
      },
    },
  ];

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

      {/* Centered panel */}
      <div
        aria-hidden={!open}
        className={[
          'fixed left-1/2 top-1/2 z-[70] w-80 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5 backdrop-blur-xl backdrop-saturate-150 dark:border-slate-700/80 dark:bg-slate-900/95 dark:ring-slate-700/50',
          'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          open ? 'scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-500 via-blue-400 to-transparent" />
          <div className="flex items-center gap-3 pl-3">
            <div className="grid size-8 place-items-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/30">
              <span className="text-sm font-bold">⚡</span>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">ElectraSim</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Interactive Wiring Lab
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="p-2">
          {items.map((item, i) => (
            <div key={item.label}>
              {/* Wire-separator between groups */}
              {(i === 5 || i === 8) && (
                <div className="mx-3 my-1 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700" />
                  <div className="size-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent dark:from-slate-700" />
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  item.action();
                  onClose();
                }}
                tabIndex={open ? 0 : -1}
                className={[
                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150',
                  item.hoverClass
                    ? `${item.hoverClass} dark:hover:bg-slate-800`
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                {/* Port pip */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`size-2.5 rounded-full ${item.portColor} shadow-sm transition-shadow group-hover:shadow-md`}
                  />
                  <div
                    className={`absolute left-1/2 top-full h-1.5 w-px -translate-x-1/2 ${item.portColor} opacity-0 transition-opacity group-hover:opacity-40`}
                  />
                </div>
                <item.icon className="size-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {item.label}
                  </div>
                  <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                    {item.description}
                  </div>
                </div>
                {item.shortcut ? (
                  <kbd className="flex-shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    {item.shortcut}
                  </kbd>
                ) : (
                  <div className="size-1.5 flex-shrink-0 rounded-full bg-slate-200 transition-colors group-hover:bg-emerald-400 group-hover:shadow-sm group-hover:shadow-emerald-400/40 dark:bg-slate-700" />
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-2.5 dark:border-slate-700/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              v{APP_VERSION} · Local-first simulator
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Esc to close</span>
          </div>
        </div>
      </div>
    </>
  );
}
