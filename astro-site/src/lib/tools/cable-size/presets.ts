/**
 * presets.ts — load presets for the Cable Size Calculator (§3, §31).
 *
 * These are configuration, not component literals: the selector, the scene
 * mapper, the results copy and the tests all read the same array, so adding a
 * load is a one-line change here plus a scene group in the artwork.
 */

import type { LoadPreset, LoadType, SystemType } from './types';

/**
 * The six loads the tool offers. Wattages are typical single-item figures, not
 * design maxima — they exist so the run has a believable demand attached to it
 * the moment the page loads.
 */
export const LOAD_PRESETS: readonly LoadPreset[] = [
  {
    id: 'lighting',
    name: 'Lighting',
    summary: '100 W',
    note: 'A lighting point or a small run of fittings — the classic tight-budget circuit.',
    noteDc:
      'An LED fitting or a short LED strip run on DC. The demand is small, but at extra-low voltage the current is not — which is exactly what makes DC runs bite.',
    powerWatts: 100,
    powerFactor: 1,
    scene: 'lighting',
  },
  {
    id: 'fan',
    name: 'Fan',
    summary: '80 W',
    note: 'A ceiling or extractor fan: a small motor load, so it draws a little reactive current.',
    noteDc:
      'A brushless DC fan — the kind in a cabinet, a caravan or an off-grid fridge. No reactive current, so the whole demand arrives as real current.',
    powerWatts: 80,
    powerFactor: 0.85,
    scene: 'fan',
  },
  {
    id: 'motor',
    name: 'Motor',
    summary: '2.2 kW',
    note: 'A 2.2 kW single-phase motor — the load that notices volt drop most, because torque falls with voltage.',
    noteDc:
      'A 2.2 kW DC motor — a traction or pump drive. Torque still falls with voltage, and the starting current is still several times the running figure.',
    powerWatts: 2200,
    powerFactor: 0.8,
    scene: 'motor',
  },
  {
    id: 'heater',
    name: 'Heater',
    summary: '3 kW',
    note: 'A 3 kW resistive heater: pure kW, no power factor, and the load that forces the cable up a size.',
    noteDc:
      'A 3 kW DC heating element on a battery bank. Resistance is resistance either way — but at battery voltage the current is what sizes the cable.',
    powerWatts: 3000,
    powerFactor: 1,
    scene: 'heater',
  },
  {
    id: 'appliance',
    name: 'Appliance',
    summary: '500 W',
    note: 'A generic socket-outlet load — a fridge, a washing machine, a bench tool.',
    noteDc:
      'A generic DC load on a distribution board — a pump, a compressor, a bench tool fed from a battery bank rather than a socket.',
    powerWatts: 500,
    powerFactor: 1,
    scene: 'appliance',
  },
  {
    id: 'custom',
    name: 'Custom',
    summary: 'Set values',
    note: 'Enter your own demand and power factor and the run is evaluated on your numbers.',
    noteDc:
      'Enter your own demand and the run is evaluated on your numbers — DC needs no power factor.',
    powerWatts: 500,
    powerFactor: 1,
    scene: 'custom',
  },
];

const PRESET_BY_ID: Record<LoadType, LoadPreset> = LOAD_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  },
  {} as Record<LoadType, LoadPreset>,
);

/**
 * The teaching line for a load *on the system that is selected*. Switching
 * AC → DC changes what the load is: "a 2.2 kW single-phase motor" is the wrong
 * sentence on a battery bank, so each preset carries its own DC wording.
 */
export function loadNote(preset: LoadPreset, systemType: SystemType): string {
  return systemType === 'dc' && preset.noteDc ? preset.noteDc : preset.note;
}

/** Look up a preset; unknown ids fall back to Lighting. */
export function getLoadPreset(id: LoadType | string | undefined | null): LoadPreset {
  if (id && id in PRESET_BY_ID) return PRESET_BY_ID[id as LoadType];
  return PRESET_BY_ID.lighting;
}

export function isLoadPresetId(id: unknown): id is LoadType {
  return typeof id === 'string' && id in PRESET_BY_ID;
}
