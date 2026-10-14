/**
 * SettingsModal — preferences shell.
 *
 * Redesigned as a two-column workbench dialog: a vertical section sidebar
 * (Editing / Display / Simulation / Backup / About) and a scrollable content
 * area. The Backup tab hosts the portable profile save/load feature.
 */

import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../store';
import { Modal } from './Modal';
import { SettingsTabContent } from './settings/SettingsTabContent';
import { SETTINGS_TABS, type SettingsTab, isSettingsTab } from './settings/types';

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
      <div className="table-settings">
        <nav aria-label="Settings sections" className="table-settings-tabs">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="table-settings-content">
          <SettingsTabContent activeTab={activeTab} />
        </div>
      </div>
    </Modal>
  );
}
