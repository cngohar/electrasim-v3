/**
 * Component definitions — Socket outlets (2-pin, 3-pin, double, USB, GFCI, industrial).
 *
 * Split verbatim from the former monolithic `components.ts`.
 * Entries are byte-identical; merge order in `./index.ts` preserves the
 * original registry ordering exactly.
 */

import type { ComponentDef } from '../types';

export const SOCKET_DEFS: Record<string, ComponentDef> = {
  'socket-2pin': {
    label: '2-Pin Un-earthed Socket',
    description: 'Basic 2-pole power outlet without protective earth connection.',
    category: 'socket',
    isSocket: true,
    ports: [
      { type: 'live', relX: 0, relY: 0.35, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.65, label: 'N' },
    ],
    icon: '⑊',
  },

  'socket-3pin': {
    label: 'Single 3-Pin Socket (13A)',
    description: 'Standard grounded BS 1363 single power socket with safety shutter.',
    category: 'socket',
    isSocket: true,
    powerWatts: 2990,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'ground',
  },

  'double-socket': {
    label: 'Double 3-Pin Socket (13A Twin)',
    description: 'Twin 13A grounded socket outlet for domestic ring main or radial circuits.',
    category: 'socket',
    isSocket: true,
    powerWatts: 3120,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'plug',
  },

  'socket-usb': {
    label: '3-Pin Socket + Dual USB',
    description: 'Grounded 13A wall socket with integrated 5V USB-A & USB-C fast charging ports.',
    category: 'socket',
    isSocket: true,
    tier: 'pro',
    powerWatts: 3000,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'plug',
  },

  'socket-gfci': {
    label: 'GFCI / RCD Safety Outlet (20A)',
    description:
      'Ground Fault Circuit Interrupter outlet providing localized shock hazard protection.',
    category: 'socket',
    isSocket: true,
    tier: 'pro',
    powerWatts: 2400,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'shield',
  },

  'socket-industrial': {
    label: 'Industrial CEE Socket (32A)',
    description: 'Heavy-duty IP67 weather-proof industrial socket for high-power site equipment.',
    category: 'socket',
    isSocket: true,
    tier: 'pro',
    powerWatts: 7360,
    recommendedCableMm2: 6.0,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'plug',
  },

  // ─── US / NEMA 5-15 ─────────────────────────────────────────────────────
  'socket-us': {
    label: 'NEMA 5-15R Receptacle (15A)',
    description: 'Standard North American 120V grounded duplex-style single receptacle.',
    category: 'socket',
    isSocket: true,
    powerWatts: 1800,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'ground',
  },
  'double-socket-us': {
    label: 'NEMA 5-15R Duplex (15A)',
    description: 'Twin North American 120V grounded receptacle on a shared yoke.',
    category: 'socket',
    isSocket: true,
    powerWatts: 3600,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'plug',
  },

  // ─── EU / Schuko (CEE 7/3) ─────────────────────────────────────────────
  'socket-schuko': {
    label: 'Schuko Socket (CEE 7/3) 16A',
    description: 'Standard continental European 230V grounded socket with earth clips.',
    category: 'socket',
    isSocket: true,
    powerWatts: 3680,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'ground',
  },
  'socket-schuko-double': {
    label: 'Schuko Double Socket (CEE 7/3) 16A',
    description: 'Twin continental European 230V grounded Schuko outlets.',
    category: 'socket',
    isSocket: true,
    powerWatts: 7360,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'plug',
  },

  // ─── Australia / NZ (AS/NZS 3112) ──────────────────────────────────────
  'socket-as3112': {
    label: 'AS/NZS 3112 Socket (10A)',
    description: 'Standard Australian / NZ 230V flat-pin grounded socket.',
    category: 'socket',
    isSocket: true,
    powerWatts: 2400,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'ground',
  },
  'socket-as3112-double': {
    label: 'AS/NZS 3112 Twin Socket',
    description: 'Twin Australian / NZ flat-pin grounded outlets.',
    category: 'socket',
    isSocket: true,
    powerWatts: 4800,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'plug',
  },

  // ─── India / BS 546 ────────────────────────────────────────────────────
  'socket-bs546': {
    label: 'BS 546 Socket (15A / 5A)',
    description: 'Classic round-pin 3-pin socket common in India and South Africa.',
    category: 'socket',
    isSocket: true,
    powerWatts: 3450,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'ground',
  },
  'shaver-socket': {
    label: 'Shaver Socket (Bathroom)',
    description: 'Bathroom shaver outlet with isolating transformer and earth socket (Reg 701).',
    category: 'socket',
    isSocket: true,
    powerWatts: 20,
    recommendedCableMm2: 1.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'razor',
  },

  'socket-bs546-double': {
    label: 'BS 546 Twin Socket',
    description: 'Twin round-pin 3-pin sockets for India / South Africa.',
    category: 'socket',
    isSocket: true,
    powerWatts: 6900,
    recommendedCableMm2: 2.5,
    ports: [
      { type: 'live', relX: 0, relY: 0.25, label: 'L' },
      { type: 'neutral', relX: 0, relY: 0.5, label: 'N' },
      { type: 'earth', relX: 0, relY: 0.75, label: 'E' },
    ],
    icon: 'plug',
  },
};
