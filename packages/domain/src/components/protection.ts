/**
 * Component definitions — Protective devices (MCBs, MCCB, RCD, RCBO, fuse, SPD, boards, fused spur).
 *
 * Split verbatim from the former monolithic `components.ts`.
 * Entries are byte-identical; merge order in `./index.ts` preserves the
 * original registry ordering exactly.
 */

import type { ComponentDef } from '../types';

export const PROTECTION_DEFS: Record<string, ComponentDef> = {
  mcb: {
    label: 'MCB Type B (16A)',
    description:
      'Miniature Circuit Breaker Type B for domestic lighting and sockets. All modes provide educational overcurrent estimates; device-specific certification and installation compliance are not assessed.',
    category: 'protection',
    isSwitch: true,
    isPassThrough: true,
    isProtection: true,
    defaultOn: true,
    maxAmps: 16,
    mcbType: 'B',
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'gear',
  },

  'mcb-type-c': {
    label: 'MCB Type C (32A)',
    description:
      'Type C breaker for motors, transformers, and inductive loads. All modes provide educational overcurrent estimates; device-specific certification and installation compliance are not assessed.',
    category: 'protection',
    isSwitch: true,
    isPassThrough: true,
    isProtection: true,
    defaultOn: true,
    tier: 'pro',
    maxAmps: 32,
    mcbType: 'C',
    proNotes: 'BS 7671 Reg 433.1 — Type C curve accommodates motor inrush currents.',
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'gear',
  },

  'mcb-type-d': {
    label: 'MCB Type D (63A)',
    description:
      'Type D breaker for heavy industrial loads with high inrush current. All modes provide educational overcurrent estimates; device-specific certification and installation compliance are not assessed.',
    category: 'protection',
    isSwitch: true,
    isPassThrough: true,
    isProtection: true,
    defaultOn: true,
    tier: 'pro',
    maxAmps: 63,
    mcbType: 'D',
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'gear',
  },

  mccb: {
    label: 'MCCB Breaker (100A)',
    description:
      'Molded Case Circuit Breaker for high-current main distribution and heavy industrial sub-mains.',
    category: 'protection',
    isSwitch: true,
    isPassThrough: true,
    isProtection: true,
    defaultOn: true,
    tier: 'pro',
    maxAmps: 100,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'gear',
  },

  rcd: {
    label: 'RCD / RCCB (80A 30mA)',
    description:
      'Residual Current Device (two-pole). Trips on >30 mA earth leakage and on smooth DC residual faults only when set to Type B; select the residual type in the Inspector.',
    category: 'protection',
    isSwitch: true,
    isPassThrough: true,
    isProtection: true,
    defaultOn: true,
    maxAmps: 80,
    ratedLeakage_mA: 30,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L-out' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'N-out' },
    ],
    icon: 'shield',
  },

  rcbo: {
    label: 'RCBO (32A 30mA)',
    description:
      'Combined overcurrent and residual-current device (Type B MCB curve, 32 A). Trips on bolted short and 30 mA+ earth leakage; RCD type AC/A/F/B selectable — only Type B sees smooth DC.',
    category: 'protection',
    isSwitch: true,
    isPassThrough: true,
    isProtection: true,
    defaultOn: true,
    maxAmps: 32,
    mcbType: 'B',
    ratedLeakage_mA: 30,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L-out' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'N-out' },
    ],
    icon: 'shield',
  },

  afdd: {
    label: 'AFDD-RCBO (32A 30mA Type A)',
    description:
      'Combined arc-fault, overcurrent and residual-current device (BS EN 62606 / BS EN 61009-1, B curve, 32 A, Type A). The only protective device that detects series/parallel arcing — the fire risk that MCBs and RCDs stay blind to; also trips on bolted short, overload and 30 mA+ earth leakage. BS 7671 Reg 421.1.7 requires AFDDs on single-phase socket-outlet final circuits up to 32 A in higher-risk residential buildings, HMOs, student accommodation and care homes (recommended elsewhere).',
    category: 'protection',
    isSwitch: true,
    isPassThrough: true,
    isProtection: true,
    defaultOn: true,
    tier: 'pro',
    maxAmps: 32,
    mcbType: 'B',
    ratedLeakage_mA: 30,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L-out' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'N-out' },
    ],
    icon: 'flame',
  },

  fuse: {
    label: 'Cartridge Fuse (13A)',
    description:
      'BS 1362 ceramic cartridge fuse that melts and opens circuit upon severe overcurrent.',
    category: 'protection',
    isSwitch: true,
    isPassThrough: true,
    isProtection: true,
    defaultOn: true,
    maxAmps: 13,
    ports: [
      { type: 'live', relX: 0, relY: 0.5, label: 'L-in' },
      { type: 'live', relX: 1, relY: 0.5, label: 'L-out' },
    ],
    icon: 'dynamite',
  },

  spd: {
    label: 'Surge Protector (SPD Type 2)',
    description:
      'Surge Protection Device safeguarding electronic equipment from lightning and switching transients.',
    category: 'protection',
    isPassThrough: true,
    isProtection: true,
    tier: 'pro',
    proNotes: 'BS 7671 Section 443 — Mandatory SPD installation for risk assessment protection.',
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'earth', relX: 0.5, relY: 1.0, label: 'PE' },
    ],
    icon: 'shield',
  },

  'distribution-board': {
    label: 'Distribution Board (Consumer Unit)',
    description:
      'Main consumer unit panel distributing incoming supply to multiple individual sub-circuits.',
    category: 'protection',
    isPassThrough: true,
    isJunction: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.75, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.17, label: 'L1' },
      { type: 'live', relX: 1, relY: 0.34, label: 'L2' },
      { type: 'live', relX: 1, relY: 0.51, label: 'L3' },
      { type: 'neutral', relX: 1, relY: 0.68, label: 'N1' },
      { type: 'neutral', relX: 1, relY: 0.83, label: 'N2' },
    ],
    icon: 'cabinet',
  },

  'main-switch': {
    label: 'Main Switch (100A)',
    description:
      'Standalone double-pole main switch for isolating the whole installation at the consumer unit.',
    category: 'protection',
    isSwitch: true,
    isPassThrough: true,
    isProtection: true,
    defaultOn: true,
    maxAmps: 100,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L-out' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'N-out' },
    ],
    icon: 'shield',
  },

  'fused-spur': {
    label: 'Fused Connection Unit (FCU 13A)',
    description: 'Switched FCU with BS 1362 fuse for local protection of fixed appliances.',
    category: 'protection',
    isSwitch: true,
    isPassThrough: true,
    isProtection: true,
    tier: 'pro',
    powerWatts: 3000,
    recommendedCableMm2: 2.5,
    defaultOn: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L-in' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N-in' },
      { type: 'live', relX: 1, relY: 0.35, label: 'L-out' },
      { type: 'neutral', relX: 1, relY: 0.65, label: 'N-out' },
    ],
    icon: 'knobs',
  },
};
