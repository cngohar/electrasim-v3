/**
 * Component definitions — Fans and general-purpose loads (motor, bell, heaters, AC, hob, EV charger).
 *
 * Split verbatim from the former monolithic `components.ts`.
 * Entries are byte-identical; merge order in `./index.ts` preserves the
 * original registry ordering exactly.
 */

import type { ComponentDef } from '../types';

export const FAN_AND_LOAD_DEFS: Record<string, ComponentDef> = {
  'ceiling-fan': {
    label: 'Ceiling Fan (65W)',
    description: 'Multi-speed ceiling fan motor for ambient air circulation.',
    category: 'fan',
    isLoad: true,
    powerWatts: 65,
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'fan',
  },

  'extractor-fan': {
    label: 'Bathroom Extractor Fan (25W)',
    description: 'Wall/ceiling extraction fan with timer overrun for bathroom moisture control.',
    category: 'fan',
    isLoad: true,
    powerWatts: 25,
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'fan',
  },

  'industrial-exhaust-fan': {
    label: 'Industrial Exhaust Fan (250W)',
    description: 'High CFM commercial exhaust fan for kitchens and workshop ventilation.',
    category: 'fan',
    isLoad: true,
    tier: 'pro',
    powerWatts: 250,
    recommendedCableMm2: 1.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'fan',
  },

  'table-fan': {
    label: 'Portable Desk Fan (45W)',
    description: 'Small portable oscillating table fan.',
    category: 'fan',
    isLoad: true,
    powerWatts: 45,
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'fan',
  },

  motor: {
    label: 'Electric Motor (750W / 1HP)',
    description: 'Single-phase AC induction motor driving mechanical pumps and machinery.',
    category: 'load',
    isLoad: true,
    powerWatts: 750,
    recommendedCableMm2: 1.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'wheel',
  },

  bell: {
    label: 'Doorbell / Buzzer (15W)',
    description:
      'Electromechanical chime signaling unit. Shows a visual pulse when energised (does not play audio).',
    category: 'load',
    isLoad: true,
    powerWatts: 15,
    recommendedCableMm2: 1.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'bell',
  },

  'water-heater': {
    label: 'Electric Water Heater (2.0kW)',
    description: 'Immersion water heater geyser element.',
    category: 'load',
    isLoad: true,
    powerWatts: 2000,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'shower',
  },

  'space-heater': {
    label: 'Convector Space Heater (2.0kW)',
    description: 'High-power resistive heating element for room heating.',
    category: 'load',
    isLoad: true,
    powerWatts: 2000,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'flame',
  },

  'air-conditioner': {
    label: 'Inverter Air Conditioner (1.5kW)',
    description: 'Split-system AC inverter compressor load.',
    category: 'load',
    isLoad: true,
    tier: 'pro',
    powerWatts: 1500,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'snow',
  },

  'induction-hob': {
    label: 'Induction Cooktop (3.5kW)',
    description:
      'Magnetic induction heating cooktop requiring dedicated heavy-gauge radial wiring.',
    category: 'load',
    isLoad: true,
    tier: 'pro',
    powerWatts: 3500,
    recommendedCableMm2: 4.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'cooker',
  },

  'ev-charger': {
    label: 'EV Charger Point (7.4kW)',
    description: 'Single-phase 32A Type 2 Smart Electric Vehicle charging station.',
    category: 'load',
    isLoad: true,
    tier: 'pro',
    powerWatts: 7400,
    recommendedCableMm2: 10.0,
    proNotes:
      'BS 7671 Section 722 — Dedicated 32A/40A Type B or A RCBO with PEN fault protection required.',
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'car',
  },

  // ─── Fixed permanent domestic circuits (audit-report additions) ──────
  'electric-shower': {
    label: 'Electric Shower Unit (8.5kW)',
    description:
      'Instantaneous electric shower. A dedicated high-current (32–40 A / 10 mm²) RCD-protected circuit with a pull-cord isolation switch is required.',
    category: 'load',
    isLoad: true,
    powerWatts: 8500,
    recommendedCableMm2: 10.0,
    proNotes: 'BS 7671 — dedicated high-current circuit, 30 mA RCD + double-pole isolation.',
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'shower',
  },

  'immersion-heater': {
    label: 'Immersion Heater (3.0kW)',
    description:
      'Hot-water immersion heating element on a dedicated 16 A circuit with double-pole isolation.',
    category: 'load',
    isLoad: true,
    powerWatts: 3000,
    recommendedCableMm2: 2.5,
    proNotes: 'Dedicated 16 A circuit, double-pole isolation switch.',
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'hot-springs',
  },

  'extractor-hood': {
    label: 'Kitchen Extractor Hood (300W)',
    description: 'Range hood with extraction fan and integrated lighting for the kitchen.',
    category: 'load',
    isLoad: true,
    powerWatts: 300,
    recommendedCableMm2: 1.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'wind',
  },

  'underfloor-heating': {
    label: 'Underfloor Heating (2.0kW)',
    description:
      'Electric underfloor heating mat or cable on a dedicated thermostat-controlled circuit.',
    category: 'load',
    isLoad: true,
    powerWatts: 2000,
    recommendedCableMm2: 2.5,
    proNotes: 'Dedicated thermostat-controlled circuit, RCD protected.',
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'thermometer',
  },

  'storage-heater': {
    label: 'Storage Heater (2.5kW)',
    description:
      'Off-peak storage heater with dual supply — an unfused off-peak radial and a fused boost/fan supply.',
    category: 'load',
    isLoad: true,
    powerWatts: 2500,
    recommendedCableMm2: 4.0,
    proNotes: 'Off-peak dual-supply: unfused radial + fused boost/fan circuit.',
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'flame',
  },

  'heat-pump': {
    label: 'Air-Source Heat Pump (3.0kW)',
    description:
      'Modern air-source heat pump — a high-inrush compressor load for heating and hot water.',
    category: 'load',
    isLoad: true,
    tier: 'pro',
    powerWatts: 3000,
    recommendedCableMm2: 2.5,
    proNotes: 'C-curve breaker for compressor inrush; dedicated circuit.',
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'wind-face',
  },

  dishwasher: {
    label: 'Dishwasher (2.2kW)',
    description: 'Dishwasher on a dedicated kitchen small-appliance circuit.',
    category: 'load',
    isLoad: true,
    powerWatts: 2200,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'plate',
  },

  'washing-machine': {
    label: 'Washing Machine (2.2kW)',
    description: 'Washing machine on a dedicated appliance circuit.',
    category: 'load',
    isLoad: true,
    powerWatts: 2200,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'basket',
  },

  'tumble-dryer': {
    label: 'Tumble Dryer (2.5kW)',
    description: 'Vented or condenser tumble dryer on a dedicated appliance circuit.',
    category: 'load',
    isLoad: true,
    powerWatts: 2500,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'fan',
  },

  'fridge-freezer': {
    label: 'Fridge Freezer (200W)',
    description:
      'Fridge/freezer — a small appliance circuit often left on its own to avoid disturbance.',
    category: 'load',
    isLoad: true,
    powerWatts: 200,
    recommendedCableMm2: 1.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L' },
      { type: 'neutral', relX: 1, relY: 0.5, label: 'N' },
    ],
    icon: 'ice',
  },
};
