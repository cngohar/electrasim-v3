/**
 * SettingsModal — preferences shell.
 *
 * Redesigned as a two-column workbench dialog: a vertical section sidebar
 * (Editing / Display / Simulation / Backup / About) and a scrollable content
 * area. The Backup tab hosts the portable profile save/load feature.
 */

import { Activity, Download, Info, type LucideIcon, Monitor, PenLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../store';
import { Modal } from './Modal';
import { SettingsTabContent } from './settings/SettingsTabContent';
import { SETTINGS_TABS, type SettingsTab, isSettingsTab } from './settings/types';

const TAB_ICONS: Record<SettingsTab, LucideIcon> = {
  editing: PenLine,
  display: Monitor,
  simulation: Activity,
  backup: Download,
  about: Info,
};

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab?: string | null;
}

export function SettingsModal({ open, onClose, initialTab }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('editing');
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  useEffect(() => {
    if (open && initialTab && isSettingsTab(initialTab)) setActiveTab(initialTab);
  }, [open, initialTab]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      description="Preferences are stored locally on this device. Use the Backup tab to take them — and your circuit — to another computer."
      widthClass="max-w-3xl"
      footer={
        <>
          <button
            type="button"
            onClick={resetSettings}
            className="mr-auto flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <span className="text-[10px]">↺</span> Reset to defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-blue-600 px-5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Done
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Section sidebar — vertical on desktop, horizontal strip on narrow screens */}
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto pb-1 sm:w-48 sm:flex-col sm:overflow-visible sm:pb-0"
        >
          {SETTINGS_TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.id];
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-150 sm:w-full',
                  active
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid size-7 shrink-0 place-items-center rounded-lg transition',
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                  ].join(' ')}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold leading-tight">{tab.label}</span>
                  <span
                    className={[
                      'hidden text-[10px] leading-tight sm:block',
                      active
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-slate-400 dark:text-slate-500',
                    ].join(' ')}
                  >
                    {tab.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            <SettingsTabContent activeTab={activeTab} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
