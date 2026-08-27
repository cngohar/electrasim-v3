import { describe, expect, it } from 'vitest';
import { SETTINGS_TABS, isSettingsTab } from './types';

describe('settings tabs', () => {
  it('keeps the accepted deep-link tabs aligned with the rendered tabs', () => {
    expect(SETTINGS_TABS.map((tab) => tab.id)).toEqual([
      'editing',
      'display',
      'simulation',
      'backup',
      'about',
    ]);
    expect(SETTINGS_TABS.every((tab) => isSettingsTab(tab.id))).toBe(true);
    expect(isSettingsTab('unknown')).toBe(false);
  });
});
