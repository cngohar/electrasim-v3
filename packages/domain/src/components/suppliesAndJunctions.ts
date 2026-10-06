/**
 * Component definitions — Supply terminals & sources, plus junction accessories.
 *
 * Split verbatim from the former monolithic `components.ts`.
 * Entries are byte-identical; merge order in `./index.ts` preserves the
 * original registry ordering exactly.
 */

import type { ComponentDef } from '../types';

export const SUPPLY_AND_JUNCTION_DEFS: Record<string, ComponentDef> = {
  'live-terminal': {
    label: 'Live Terminal (L)',
    description: 'Single-phase live supply terminal rail.',
    category: 'supply',
    isSource: true,
    sourceType: 'live',
    ports: [{ type: 'live', relX: 1, relY: 0.5, label: 'L-out' }],
    icon: 'red-circle',
  },

  'neutral-terminal': {
    label: 'Neutral Terminal (N)',
    description: 'Single-phase neutral return terminal rail.',
    category: 'supply',
    isSource: true,
    sourceType: 'neutral',
    ports: [{ type: 'neutral', relX: 1, relY: 0.5, label: 'N-out' }],
    icon: 'blue-circle',
  },

  'earth-terminal': {
    label: 'Earth Ground (PE)',
    description: 'Safety protective earth ground terminal rail.',
    category: 'supply',
    isSource: true,
    sourceType: 'earth',
    ports: [{ type: 'earth', relX: 1, relY: 0.5, label: 'PE-out' }],
    icon: 'green-circle',
  },

  'ac-mains-supply': {
    label: '230V AC Mains Supply Block',
    description:
      'Combined 230V AC single-phase supply block featuring Live, Neutral, and Earth terminals.',
    category: 'supply',
    isSource: true,
    sourceType: 'live',
    ports: [
      { type: 'live', relX: 1, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 1, relY: 0.75, label: 'PE' },
    ],
    icon: 'bolt',
  },

  'ac-three-phase-supply': {
    label: 'Three-phase AC Supply (L1/L2/L3/N/PE)',
    description:
      'Independent three-phase RMS source with explicit L1, L2, L3 and neutral. Voltage is configured L-N; L-L is √3 times L-N. PE is separate until explicitly bonded. Resistive phasor readings are supported; motor operation and automatic protective clearing remain unassessed.',
    category: 'supply',
    isSource: true,
    sourceType: 'live',
    ports: [
      { type: 'live', relX: 1, relY: 0.1, label: 'L1' },
      { type: 'live', relX: 1, relY: 0.3, label: 'L2' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L3' },
      { type: 'neutral', relX: 1, relY: 0.7, label: 'N' },
      { type: 'earth', relX: 1, relY: 0.9, label: 'PE' },
    ],
    icon: 'bolt',
  },

  'dc-battery-12v': {
    label: '12V DC Deep Cycle Battery',
    description: '12 Volt Direct Current battery storage unit for solar or marine DC circuits.',
    category: 'supply',
    isSource: true,
    sourceType: 'live',
    tier: 'pro',
    ports: [
      { type: 'live', relX: 1, relY: 0.35, label: '+12V' },
      { type: 'neutral', relX: 1, relY: 0.65, label: '0V' },
    ],
    icon: 'battery',
  },

  'solar-pv-panel': {
    label: 'Solar PV Array (400W DC)',
    description: 'Photovoltaic solar array generating DC current under ambient sunlight.',
    category: 'supply',
    isSource: true,
    sourceType: 'live',
    tier: 'pro',
    ports: [
      { type: 'live', relX: 1, relY: 0.35, label: 'DC+' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'DC-' },
    ],
    icon: 'sun',
  },

  'diesel-generator': {
    label: 'Standby Diesel Generator (5kVA)',
    description: 'Backup diesel generator supply delivering 230V AC emergency power.',
    category: 'supply',
    isSource: true,
    sourceType: 'live',
    tier: 'pro',
    ports: [
      { type: 'live', relX: 1, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 1, relY: 0.75, label: 'PE' },
    ],
    icon: 'factory',
  },

  'kwh-meter': {
    label: 'Electricity Meter (kWh)',
    description:
      'The incoming electricity meter between the utility supply and the consumer unit. A pass-through measuring point on the supply entry.',
    category: 'supply',
    isPassThrough: true,
    isJunction: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.3, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.7, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.3, label: 'L-out' },
      { type: 'neutral', relX: 1, relY: 0.7, label: 'N-out' },
    ],
    icon: 'numbers',
  },

  'earth-rod': {
    label: 'Earth Rod / Electrode',
    description:
      'A ground electrode used for TT earthing arrangements — connects the installation earth to the ground.',
    category: 'supply',
    isSource: true,
    sourceType: 'earth',
    ports: [{ type: 'earth', relX: 1, relY: 0.5, label: 'PE' }],
    icon: 'ground',
  },

  'junction-box': {
    label: 'Junction Box (4-Way)',
    description: 'Circular junction box splitting live wiring into multiple branch outputs.',
    category: 'junction',
    isPassThrough: true,
    isJunction: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.25, label: 'L-out1' },
      { type: 'live', relX: 1, relY: 0.75, label: 'L-out2' },
      { type: 'live', relX: 0.5, relY: 1, label: 'L-out3' },
    ],
    icon: 'grid-square',
  },

  'terminal-strip': {
    label: 'Terminal Strip Block',
    description: 'Barrier screw terminal connector strip for neat multi-wire distribution.',
    category: 'junction',
    isPassThrough: true,
    isJunction: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'In1' },
      { type: 'live', relX: 0, relY: 0.65, label: 'In2' },
      { type: 'live', relX: 1, relY: 0.35, label: 'Out1' },
      { type: 'live', relX: 1, relY: 0.65, label: 'Out2' },
    ],
    icon: 'grid-square',
  },

  'wago-connector': {
    label: 'Wago 221 Lever Connector (3-Way)',
    description: 'Compact 3-conductor quick lever-nut wire connector.',
    category: 'junction',
    isPassThrough: true,
    isJunction: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'In' },
      { type: 'live', relX: 1, relY: 0.35, label: 'Out1' },
      { type: 'live', relX: 1, relY: 0.65, label: 'Out2' },
    ],
    icon: 'grid-square',
  },
};
