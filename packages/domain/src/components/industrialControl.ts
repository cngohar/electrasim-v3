/**
 * Component definitions — Extra wiring accessories plus transformers, relays and contactors.
 *
 * Split verbatim from the former monolithic `components.ts`.
 * Entries are byte-identical; merge order in `./index.ts` preserves the
 * original registry ordering exactly.
 */

import type { ComponentDef } from '../types';

export const INDUSTRIAL_CONTROL_DEFS: Record<string, ComponentDef> = {
  'double-gang-switch': {
    label: '2-Gang 1-Way Switch',
    description: 'Dual independent rocker switch controlling two separate lighting circuits.',
    category: 'switch',
    isSwitch: true,
    isPassThrough: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L1-out' },
      { type: 'live', relX: 1, relY: 0.65, label: 'L2-out' },
    ],
    icon: 'radio-button',
  },

  'switched-socket': {
    label: 'Single Switched Socket (13A)',
    description: 'Standard 13A wall socket with integrated ON/OFF rocker switch.',
    category: 'socket',
    isSocket: true,
    isSwitch: true,
    defaultOn: true,
    powerWatts: 2990,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'plug',
  },

  'isolator-switch': {
    label: 'Rotary Isolator Switch (100A)',
    description:
      'High-current double-pole rotary main isolation switch for safely disconnecting mains power.',
    category: 'protection',
    isSwitch: true,
    isPassThrough: true,
    isProtection: true,
    defaultOn: true,
    tier: 'pro',
    maxAmps: 100,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L-out' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'N-out' },
    ],
    icon: 'shield',
  },

  'transformer-8v': {
    label: 'Doorbell Transformer (230V -> 8V AC)',
    description: 'Step-down safety isolating transformer for doorbells and low-voltage chimes.',
    category: 'transformer',
    isPassThrough: true,
    powerWatts: 15,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-230V' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-230V' },
      { type: 'live', relX: 1, relY: 0.35, label: '8V-A' },
      { type: 'neutral', relX: 1, relY: 0.65, label: '8V-B' },
    ],
    icon: 'bolt',
  },

  'transformer-12v': {
    label: 'Low Voltage Transformer (230V -> 12V)',
    description:
      'Step-down power transformer for 12V halogen/LED lighting and electronic controls.',
    category: 'transformer',
    isPassThrough: true,
    powerWatts: 60,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-230V' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-230V' },
      { type: 'live', relX: 1, relY: 0.35, label: '12V+' },
      { type: 'neutral', relX: 1, relY: 0.65, label: '12V-' },
    ],
    icon: 'bolt',
  },

  'transformer-24v': {
    label: 'Industrial Control Transformer (230V -> 24V)',
    description:
      'Heavy-duty 24V AC/DC control circuit transformer for relays, contactors, and automation.',
    category: 'transformer',
    isPassThrough: true,
    tier: 'pro',
    powerWatts: 100,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-230V' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-230V' },
      { type: 'live', relX: 1, relY: 0.35, label: '24V+' },
      { type: 'neutral', relX: 1, relY: 0.65, label: '24V-' },
    ],
    icon: 'bolt',
  },

  'step-up-down-transformer': {
    label: 'Step-Up / Step-Down Transformer (110V <-> 230V)',
    description:
      'Bi-directional auto-transformer converting between 110V US and 230V UK/EU voltage levels.',
    category: 'transformer',
    isPassThrough: true,
    tier: 'pro',
    powerWatts: 1500,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'In-L' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'In-N' },
      { type: 'live', relX: 1, relY: 0.35, label: 'Out-L' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'Out-N' },
    ],
    icon: 'bolt',
  },

  'relay-spst': {
    switchContacts: [{ common: 2, no: 3 }],
    coilPorts: [0, 1],
    label: 'SPST Power Relay',
    description: 'Single Pole Single Throw electromechanical relay with coil drive and NO contact.',
    category: 'relay',
    isSwitch: true,
    isPassThrough: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'Coil+' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'Coil-' },
      { type: 'live', relX: 1, relY: 0.35, label: 'COM' },
      { type: 'live', relX: 1, relY: 0.65, label: 'NO' },
    ],
    icon: 'wrench',
  },

  'relay-spdt': {
    switchContacts: [{ common: 2, no: 3, nc: 4 }],
    coilPorts: [0, 1],
    label: 'SPDT Changeover Relay',
    description: 'Single Pole Double Throw relay switching COM terminal between NO and NC outputs.',
    category: 'relay',
    isSwitch: true,
    isPassThrough: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'Coil+' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'Coil-' },
      { type: 'live', relX: 1, relY: 0.25, label: 'COM' },
      { type: 'live', relX: 1, relY: 0.5, label: 'NO' },
      { type: 'live', relX: 1, relY: 0.75, label: 'NC' },
    ],
    icon: 'wrench',
  },

  'relay-dpdt': {
    switchContacts: [
      { common: 2, no: 3, nc: 6 },
      { common: 4, no: 5, nc: 7 },
    ],
    coilPorts: [0, 1],
    label: 'DPDT Power Relay',
    description:
      'Double Pole Double Throw relay simultaneously controlling two isolated changeover circuits.',
    category: 'relay',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'Coil+' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'Coil-' },
      { type: 'live', relX: 1, relY: 0.2, label: 'C1' },
      { type: 'live', relX: 1, relY: 0.4, label: 'NO1' },
      { type: 'live', relX: 1, relY: 0.6, label: 'C2' },
      { type: 'live', relX: 1, relY: 0.8, label: 'NO2' },
      // Append NC terminals to preserve existing saved port indices 0 through 5.
      { type: 'live', relX: 0.35, relY: 1, label: 'NC1' },
      { type: 'live', relX: 0.7, relY: 1, label: 'NC2' },
    ],
    icon: 'wrench',
  },

  'control-relay': {
    switchContacts: [{ common: 2, no: 3, nc: 4 }],
    coilPorts: [0, 1],
    label: 'Industrial 8-Pin Control Relay',
    description:
      'Octal 8-pin plug-in control relay with LED status indicator for panel automation.',
    category: 'relay',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'A1' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'A2' },
      { type: 'live', relX: 1, relY: 0.25, label: '11-COM' },
      { type: 'live', relX: 1, relY: 0.5, label: '14-NO' },
      { type: 'live', relX: 1, relY: 0.75, label: '12-NC' },
    ],
    icon: 'wrench',
  },

  'contactor-1p': {
    switchContacts: [{ common: 0, no: 1 }],
    coilPorts: [2, 3],
    label: 'Single-Pole Contactor (1P 25A)',
    description: '1-Pole AC contactor for switching single-phase heating or lighting loads.',
    category: 'contactor',
    isSwitch: true,
    isPassThrough: true,
    maxAmps: 25,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L-out' },
      { type: 'live', relX: 0.5, relY: 0, label: 'A1' },
      { type: 'neutral', relX: 0.5, relY: 1, label: 'A2' },
    ],
    icon: 'nut-bolt',
  },

  'contactor-2p': {
    switchContacts: [
      { common: 0, no: 2 },
      { common: 1, no: 3 },
    ],
    label: 'Double-Pole Contactor (2P 25A)',
    description: '2-Pole AC power contactor switching both Live and Neutral simultaneously.',
    category: 'contactor',
    isSwitch: true,
    isPassThrough: true,
    maxAmps: 25,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L-out' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'N-out' },
    ],
    icon: 'nut-bolt',
  },

  'contactor-3p': {
    switchContacts: [
      { common: 0, no: 3 },
      { common: 1, no: 4 },
      { common: 2, no: 5 },
    ],
    coilPorts: [6, 7],
    label: 'Three-Pole Contactor (3P 40A)',
    description:
      'Heavy-duty 3-pole contactor for 3-phase motor starters and heavy inductive loads.',
    category: 'contactor',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    maxAmps: 40,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L1' },
      { type: 'live', relX: 0, relY: 0.5, label: 'L2' },
      { type: 'live', relX: 0, relY: 0.75, label: 'L3' },
      { type: 'live', relX: 1, relY: 0.25, label: 'T1' },
      { type: 'live', relX: 1, relY: 0.5, label: 'T2' },
      { type: 'live', relX: 1, relY: 0.75, label: 'T3' },
      { type: 'live', relX: 0.5, relY: 0, label: 'A1' },
      { type: 'neutral', relX: 0.5, relY: 1, label: 'A2' },
    ],
    icon: 'nut-bolt',
  },

  'contactor-4p': {
    switchContacts: [
      { common: 0, no: 4 },
      { common: 1, no: 5 },
      { common: 2, no: 6 },
      { common: 3, no: 7 },
    ],
    label: 'Four-Pole Contactor (4P 63A)',
    description:
      '4-Pole power contactor for 3-phase + neutral mains changeover and generator transfer.',
    category: 'contactor',
    isSwitch: true,
    isPassThrough: true,
    tier: 'pro',
    maxAmps: 63,
    ports: [
      { type: 'live', relX: 0, relY: 0.2, label: 'L1' },
      { type: 'live', relX: 0, relY: 0.4, label: 'L2' },
      { type: 'live', relX: 0, relY: 0.6, label: 'L3' },
      { type: 'neutral', relX: 0, relY: 0.8, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.2, label: 'T1' },
      { type: 'live', relX: 1, relY: 0.4, label: 'T2' },
      { type: 'live', relX: 1, relY: 0.6, label: 'T3' },
      { type: 'neutral', relX: 1, relY: 0.8, label: 'N-out' },
    ],
    icon: 'nut-bolt',
  },
};
