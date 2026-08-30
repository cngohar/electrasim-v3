/**
 * Component definitions — Switches & manual switching devices (1-way, 2-way, intermediate, DP, push-button, rotary, contactor-inline, cooker unit).
 *
 * Split verbatim from the former monolithic `components.ts`.
 * Entries are byte-identical; merge order in `./index.ts` preserves the
 * original registry ordering exactly.
 */

import type { ComponentDef } from '../types';

export const SWITCH_DEFS: Record<string, ComponentDef> = {
  'single-way-switch': {
    label: 'Single-way Switch',
    description: 'A standard on/off switch for controlling a single circuit or light.',
    category: 'switch',
    isSwitch: true,
    isPassThrough: true,
    powerWatts: 0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'plug',
  },

  'two-way-switch': {
    label: 'Two-way Switch',
    description: 'Allows controlling a load from two different locations (SPDT switch).',
    category: 'switch',
    isSwitch: true,
    isPassThrough: true,
    changeover: {
      commonPortIndex: 0,
      onPortIndex: 1,
      offPortIndex: 2,
    },
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'COM' },
      { type: 'live', relX: 1, relY: 0.25, label: 'L1' },
      { type: 'live', relX: 1, relY: 0.75, label: 'L2' },
    ],
    icon: 'shuffle',
  },

  'intermediate-switch': {
    label: 'Intermediate Switch',
    description:
      '4-terminal switch used between two 2-way switches to control lights from 3+ locations.',
    category: 'switch',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    proNotes: 'BS 7671 — Crossover topology for multi-point corridor and stairwell lighting.',
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L1-in' },
      { type: 'live', relX: 0, relY: 0.65, label: 'L2-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L1-out' },
      { type: 'live', relX: 1, relY: 0.65, label: 'L2-out' },
    ],
    icon: 'shuffle',
  },

  'double-pole-switch': {
    label: 'Double-Pole Switch (20A)',
    description:
      'Switches both Live and Neutral simultaneously for isolation of high-power appliances.',
    category: 'switch',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    powerWatts: 4600,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L-out' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'N-out' },
    ],
    icon: 'plug',
  },

  'push-button': {
    label: 'Push Button',
    description:
      'Normally-open momentary switch (can be configured as normally-closed or latching). Closes contact only while held.',
    category: 'switch',
    isSwitch: true,
    isMomentary: true,
    isPassThrough: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'radio-button',
  },

  'rotary-selector-switch': {
    label: 'Rotary Selector Switch',
    description: '3-position selector switch (OFF / AUTO / MANUAL) for industrial panels.',
    category: 'switch',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'COM' },
      { type: 'live', relX: 1, relY: 0.35, label: 'AUTO' },
      { type: 'live', relX: 1, relY: 0.65, label: 'MAN' },
    ],
    icon: 'knobs',
  },

  contactor: {
    label: 'Power Contactor (25A)',
    description:
      'Heavy-duty electromechanical switching relay for motors and heavy loads. Modeled without coil terminals, control coil logic, or auxiliary contacts.',
    category: 'switch',
    isSwitch: true,
    isPassThrough: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L-out' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'N-out' },
    ],
    icon: 'bolt',
  },

  'cooker-unit': {
    label: 'Cooker Control Unit (45A)',
    description:
      'High-power double-pole isolator switch with auxiliary socket for kitchen appliances.',
    category: 'switch',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    powerWatts: 7200,
    recommendedCableMm2: 6.0,
    proNotes: 'BS 7671 Reg 537.2 — Cooker switch must be located within 2 metres of appliance.',
    defaultOn: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L-out' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'N-out' },
    ],
    icon: 'cooker',
  },
};
