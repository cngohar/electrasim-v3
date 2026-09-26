/**
 * Component definitions — Lamps & luminaires (bulb technologies, LED downlight, tube light).
 *
 * Split verbatim from the former monolithic `components.ts`.
 * Entries are byte-identical; merge order in `./index.ts` preserves the
 * original registry ordering exactly.
 */

import type { ComponentDef } from '../types';

export const LIGHTING_DEFS: Record<string, ComponentDef> = {
  bulb: {
    label: 'LED Bulb (9W)',
    description: 'Energy-efficient LED light bulb with standard E27 screw base.',
    category: 'lighting',
    isLoad: true,
    powerWatts: 9,
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'bulb',
  },

  'bulb-incandescent': {
    label: 'Incandescent Bulb (60W)',
    description:
      'Traditional tungsten filament lamp with warm light and high resistive thermal load.',
    category: 'lighting',
    isLoad: true,
    powerWatts: 60,
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'bulb',
  },

  'bulb-halogen': {
    label: 'Halogen Lamp (42W)',
    description: 'High-brightness halogen lamp providing bright white illumination.',
    category: 'lighting',
    isLoad: true,
    powerWatts: 42,
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'bulb',
  },

  'bulb-cfl': {
    label: 'CFL Lamp (15W)',
    description: 'Compact Fluorescent Light lamp for commercial and residential lighting.',
    category: 'lighting',
    isLoad: true,
    powerWatts: 15,
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'bulb',
    bulbAnimationType: 'cfl', // Slow warm-up flicker
  },

  'bulb-smart-rgb': {
    label: 'Smart RGB LED Bulb (10W)',
    description: 'Color-tunable smart LED lamp for modern home automation.',
    category: 'lighting',
    isLoad: true,
    tier: 'pro',
    powerWatts: 10,
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'bulb',
    bulbAnimationType: 'led', // Instant on with soft fade
  },

  'led-downlight': {
    label: 'LED Downlight (12W)',
    description: 'Ceiling recessed LED spotlight fixture.',
    category: 'lighting',
    isLoad: true,
    powerWatts: 12,
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'bulb',
    bulbAnimationType: 'led', // Instant on with soft fade
  },

  'tube-light': {
    label: 'Fluorescent Tube (36W)',
    description: 'Linear T8 fluorescent tube batten light with electronic ballast.',
    category: 'lighting',
    isLoad: true,
    powerWatts: 36,
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'bulb',
    bulbAnimationType: 'fluorescent', // Flickering start-up
  },
};
