/**
 * Component definitions — Control gear (dimmers, sensors, thermostat, smart relay).
 *
 * Split verbatim from the former monolithic `components.ts`.
 * Entries are byte-identical; merge order in `./index.ts` preserves the
 * original registry ordering exactly.
 */

import type { ComponentDef } from '../types';

export const CONTROL_DEFS: Record<string, ComponentDef> = {
  'fan-dimmer': {
    label: 'Rotary Fan Speed Regulator',
    description: 'Capacitive / triac speed controller for ceiling and exhaust fans.',
    category: 'control',
    isSwitch: true,
    isPassThrough: true,
    isDimmer: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'knobs',
  },

  'dimmer-switch': {
    label: 'Light Dimmer Switch (400W)',
    description: 'Trailing-edge digital light dimmer for dimmable LED and incandescent lamps.',
    category: 'control',
    isSwitch: true,
    isPassThrough: true,
    isDimmer: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'bright',
  },

  'pir-sensor': {
    label: 'PIR Motion Sensor',
    description: 'Infrared motion sensor switch for security lighting and common areas.',
    category: 'control',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    powerWatts: 5,
    recommendedCableMm2: 1.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'eye',
  },

  thermostat: {
    label: 'Digital Room Thermostat',
    description:
      'Temperature-sensitive relay contact for controlling heating boilers and AC pumps.',
    category: 'control',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'thermometer',
  },

  'photocell-sensor': {
    label: 'Dusk-to-Dawn Photocell',
    description: 'Light sensor that switches outdoor lighting automatically at sunset.',
    category: 'control',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'sunrise',
  },

  'smart-relay': {
    label: 'Smart WiFi Relay Module',
    description: 'Micro smart relay module compatible with app and voice assistant control.',
    category: 'control',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'radio',
  },
};
