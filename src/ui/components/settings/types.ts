export type SettingsTab = 'editing' | 'display' | 'simulation' | 'backup' | 'about';

export const SETTINGS_TABS: ReadonlyArray<{
  id: SettingsTab;
  label: string;
  /** Short subtitle shown under the label in the settings sidebar. */
  desc: string;
}> = [
  { id: 'editing', label: 'Editing', desc: 'Canvas behaviour' },
  { id: 'display', label: 'Display', desc: 'Look & feel' },
  { id: 'simulation', label: 'Simulation', desc: 'Live visuals' },
  { id: 'backup', label: 'Backup', desc: 'Save & restore' },
  { id: 'about', label: 'About', desc: 'App info' },
];

export function isSettingsTab(value: string): value is SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.id === value);
}
