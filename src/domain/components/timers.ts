/**
 * Component definitions — Timer switches (24h/weekly/staircase/countdown/delay).
 *
 * Split verbatim from the former monolithic `components.ts`.
 * Entries are byte-identical; merge order in `./index.ts` preserves the
 * original registry ordering exactly.
 */

import type { ComponentDef } from '../types';

export const TIMER_DEFS: Record<string, ComponentDef> = {
  'timer-switch': {
    label: 'Mechanical 24h Pin Timer',
    description: '24-hour dial time switch for automatic scheduled switching.',
    category: 'timer',
    isSwitch: true,
    isPassThrough: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'timer',
  },

  'digital-weekly-timer': {
    label: 'Digital 7-Day Programmable Timer',
    description: 'LCD weekly programmable timer with multiple daily ON/OFF schedule settings.',
    category: 'timer',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'stopwatch',
  },

  'staircase-timer': {
    label: 'Staircase Delay Timer (30s-10m)',
    description:
      'DIN-rail mounted delay timer automatically turning off stairwell or hallway lights after a set interval.',
    category: 'timer',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'hourglass',
  },

  'countdown-timer': {
    label: 'Digital Countdown Timer Switch',
    description: 'Preset interval timer switch (5m, 15m, 30m, 60m) for ventilation and heaters.',
    category: 'timer',
    isSwitch: true,
    isPassThrough: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'stopwatch',
  },

  'delay-timer': {
    label: 'Time Delay Relay (On/Off Delay)',
    description:
      'DIN-rail mounted electronic time delay relay for staggered motor startup and control.',
    category: 'timer',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'A1' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'A2' },
      { type: 'live', relX: 1, relY: 0.35, label: '15-COM' },
      { type: 'live', relX: 1, relY: 0.65, label: '18-NO' },
    ],
    icon: 'hourglass',
  },
};
