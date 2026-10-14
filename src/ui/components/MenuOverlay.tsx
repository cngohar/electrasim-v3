/**
 * MenuOverlay — the app menu (MCB breaker trigger in the Toolbar).
 *
 * Redesigned from scratch as a wide, low "command hub" instead of a tall
 * vertical list:
 *
 *   ┌─ brand header (version + mode chip) ──────────────────────────┐
 *   │  LEARN & PRACTICE                                             │
 *   │  [Guided Circuits] [Diagnosis Lab]                           │
 *   │  [Interactive Tutorial]                     │
 *   │  TOOLS & INFO                                                 │
 *   │  [Documentation] [Keyboard Shortcuts] [Import / Export]       │
 *   │  [Settings]      [Contact]            [About ElectraSim]      │
 *   │  v2.0.0 · local-first        ⌘K palette   ·   Esc to close   │
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
} from 'lucide-react';
import { useEffect } from 'react';
import { isMacPlatform, modShortcut } from '../../lib/platform';
import { useSettingsStore, useUiStore } from '../../store';
import { APP_VERSION } from '../../version';
import { preloadSettings } from '../deferredSurfacePreloads';
import { Modal } from './Modal';

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
  const appMode = useSettingsStore((s) => s.appMode);

  // Fetch the two most likely deferred surfaces while the menu is visible so
  // selecting them feels immediate. The click path still has a visible
  // fallback if the network is slow or the prefetch has not finished.
  useEffect(() => {
    if (!open) return;
    preloadSettings();
  }, [open]);

  const run = (tile: FeatureTile) => {
    tile.action();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ElectraSim menu"
      description="Build a circuit, follow a guide, or investigate a fault."
      widthClass="max-w-3xl"
    >
      <div className="table-menu-content">
        <SectionLabel>Learn and practice</SectionLabel>
        <div className="table-menu-grid">
          {FEATURE_TILES.map((tile) => (
            <button type="button" key={tile.label} onClick={() => run(tile)}>
              <tile.icon size={19} />
              <span>
                <b>{tile.label}</b>
                <small>{tile.description}</small>
              </span>
            </button>
          ))}
        </div>
        <SectionLabel>Tools and information</SectionLabel>
        <div className="table-menu-grid table-menu-utilities">
          {UTILITY_TILES.map((tile) => (
            <button type="button" key={tile.label} onClick={() => run(tile)}>
              <span>
                <b>{tile.label}</b>
                <small>{tile.description}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="table-menu-footer">
          <span>
            Local-first simulator · {APP_VERSION} ·{' '}
            {appMode === 'pro' ? 'Pro interface' : 'Basic interface'}
          </span>
          <button
            type="button"
            onClick={() => {
              useUiStore.getState().toggleCommandPalette();
              onClose();
            }}
          >
            <Command size={14} />
            Command palette <kbd>{modShortcut('K')}</kbd>
          </button>
          <span>{isMacPlatform() ? '⌘' : 'Ctrl'} shortcuts</span>
        </div>
      </div>
    </Modal>
  );
}
