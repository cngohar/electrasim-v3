/**
 * Component definitions — Thermostats, sensors, sounders, 3-phase motor, water-pump, heating element, distribution gear.
 *
 * Split verbatim from the former monolithic `components.ts`.
 * Entries are byte-identical; merge order in `./index.ts` preserves the
 * original registry ordering exactly.
 */

import type { ComponentDef } from '../types';

export const HVAC_SOUNDER_AND_DISTRIBUTION_DEFS: Record<string, ComponentDef> = {
  'room-thermostat': {
    label: 'Mechanical Room Thermostat',
    description: 'Bimetallic dial room thermostat for simple ambient heating control.',
    category: 'thermostat',
    isSwitch: true,
    isPassThrough: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'thermometer',
  },

  'heating-thermostat': {
    label: 'Underfloor Heating Thermostat',
    description: 'Programmable floor temperature sensor thermostat for radiant heating mats.',
    category: 'thermostat',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    powerWatts: 3000,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'Load-L' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'Load-N' },
    ],
    icon: 'thermometer',
  },

  'temperature-sensor': {
    label: 'NTC Temperature Sensor Probe',
    description: 'Precision temperature sensor transmitting analog thermal resistance signals.',
    category: 'sensor',
    isPassThrough: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'T1' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'T2' },
    ],
    icon: 'eye',
  },

  'door-sensor': {
    label: 'Magnetic Door / Window Contact',
    description: 'Reed switch contact sensor detecting door opening for security and lighting.',
    category: 'sensor',
    isSwitch: true,
    isPassThrough: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'C1' },
      { type: 'live', relX: 1, relY: 0.5, label: 'C2' },
    ],
    icon: 'eye',
  },

  'electric-buzzer': {
    label: 'Panel Electric Buzzer (90dB)',
    description: 'High-pitch continuous acoustic warning buzzer for control panels.',
    category: 'sounder',
    isLoad: true,
    powerWatts: 5,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'bell',
  },

  'wireless-doorbell': {
    label: 'Wireless Doorbell Chime Receiver',
    description: 'Mains plug-in wireless doorbell chime unit with selectable ringtones.',
    category: 'sounder',
    isLoad: true,
    powerWatts: 8,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'bell',
  },

  'alarm-siren': {
    label: 'High-Output Security Alarm Siren',
    description: 'Dual-tone 110dB emergency acoustic alarm siren.',
    category: 'sounder',
    isLoad: true,
    powerWatts: 25,
    tier: 'pro',
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'bell',
  },

  // ─── Fire / safety detection (audit-report additions) ─────────────────
  'smoke-alarm': {
    label: 'Smoke / Heat / CO Alarm',
    description:
      'Interlinked mains smoke, heat and carbon-monoxide detector on a dedicated safety circuit (BS 5839-6 Grade D).',
    category: 'sounder',
    isLoad: true,
    powerWatts: 2,
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'siren',
  },

  'burglar-alarm': {
    label: 'Burglar Alarm Panel',
    description: 'Intruder alarm control panel with perimeter detectors on a dedicated circuit.',
    category: 'sounder',
    isLoad: true,
    powerWatts: 20,
    tier: 'pro',
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'siren',
  },

  'motor-3phase': {
    label: '3-Phase AC Induction Motor (3kW / 4HP)',
    maxVolts: 400, // This catalog model is rated for the 400 V line-to-line training supply.
    description: 'Heavy industrial 3-phase asynchronous squirrel-cage motor for machinery.',
    category: 'motor',
    isLoad: true,
    powerWatts: 3000,
    tier: 'pro',
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'U' },
      { type: 'live', relX: 0, relY: 0.5, label: 'V' },
      { type: 'live', relX: 0, relY: 0.75, label: 'W' },
      { type: 'earth', relX: 1, relY: 0.5, label: 'PE' },
    ],
    icon: 'fan',
  },

  'water-pump': {
    label: 'Electric Water Pump (1.1kW / 1.5HP)',
    description: 'Centrifugal motor pump for domestic water supply and drainage.',
    category: 'motor',
    isLoad: true,
    powerWatts: 1100,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N' },
      { type: 'earth', relX: 1, relY: 0.5, label: 'PE' },
    ],
    icon: 'fan',
  },

  'heating-element': {
    label: 'Tubular Resistance Heating Element (1.5kW)',
    description: 'Direct heating element for industrial ovens and water heating.',
    category: 'heater',
    isLoad: true,
    powerWatts: 1500,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'flame',
  },

  'distribution-box': {
    label: '1-Phase Sub-Distribution Box (8-Way)',
    description: 'Compact single-phase 8-way consumer unit enclosure for room sub-circuits.',
    category: 'distribution',
    isPassThrough: true,
    isJunction: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.25, label: 'L1' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L2' },
      { type: 'neutral', relX: 1, relY: 0.75, label: 'N1' },
    ],
    icon: 'box',
  },

  'distribution-board-3phase': {
    label: '3-Phase TPN Distribution Board',
    description: 'Industrial 3-Phase, Neutral and Earth (TP&N) main distribution unit.',
    category: 'distribution',
    isPassThrough: true,
    isJunction: true,
    tier: 'pro',
    ports: [
      { type: 'live', relX: 0, relY: 0.2, label: 'L1-in' },
      { type: 'live', relX: 0, relY: 0.4, label: 'L2-in' },
      { type: 'live', relX: 0, relY: 0.6, label: 'L3-in' },
      { type: 'neutral', relX: 0, relY: 0.8, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.25, label: 'L1-out' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L2-out' },
      { type: 'live', relX: 1, relY: 0.75, label: 'L3-out' },
    ],
    icon: 'box',
  },
};
