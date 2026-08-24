/**
 * Component help & learning content registry — merged zone modules plus the
 * `getComponentHelp` fallback resolver.
 *
 * Split verbatim from the former monolithic `componentHelp.ts`; behaviour
 * and registry ordering are unchanged.
 */

import type { ComponentHelpData } from './types';

import { LIGHTING_HELP } from './lighting';
import { LOAD_AND_SUPPLY_HELP } from './loadsAndSupply';
import { PROTECTION_HELP } from './protection';
import { SOCKET_HELP } from './sockets';
import { SWITCH_AND_CONTROL_HELP } from './switchesAndControls';

export const COMPONENT_HELP_REGISTRY: Record<string, ComponentHelpData> = {
  ...PROTECTION_HELP,
  ...SWITCH_AND_CONTROL_HELP,
  ...SOCKET_HELP,
  ...LIGHTING_HELP,
  ...LOAD_AND_SUPPLY_HELP,
};

/** Get context-specific learning & tips data with rich defaults */
export function getComponentHelp(type: string, category?: string): ComponentHelpData {
  if (COMPONENT_HELP_REGISTRY[type]) {
    return COMPONENT_HELP_REGISTRY[type];
  }

  // Fallbacks by category
  if (category === 'protection') {
    return {
      title: 'Circuit Protection Device',
      category: 'protection',
      voltage: '230V / 400V AC',
      amperage: '6A – 63A',
      breakingCapacity: '6kA / 10kA',
      tripCurve: 'Type B / C / D or 30mA RCD',
      frequency: '50Hz',
      ipRating: 'IP20',
      cableSize: '1.5mm² – 25mm²',
      poles: '1P, 2P, 3P, 4P',
      standards: 'BS EN 60898 / BS EN 61008 / BS 7671 Regulations',
      overview:
        'Protects conductors and equipment against electrical overloads, short circuits, or earth leakage faults.',
      circuitBehavior:
        'Automatically interrupts current flow when safety parameters or thermal thresholds are exceeded.',
      keySpecs: [
        'Sized according to cable carrying capacity (In ≤ Iz)',
        'Automatic disconnection of supply (ADS) within required time limits (0.4s TN / 0.2s TT)',
      ],
      quickTips: [
        'Always ensure protective device rating (In) matches cable capacity (It).',
        'Check insulation resistance before energizing new circuits.',
      ],
    };
  }

  if (category === 'lighting') {
    return {
      title: 'Lighting Load Component',
      category: 'lighting',
      voltage: '230V AC (50Hz)',
      amperage: '0.02A – 0.5A',
      powerWatts: 10,
      frequency: '50Hz',
      ipRating: 'IP20 – IP65',
      cableSize: '1.0mm² – 1.5mm²',
      poles: 'Live + Neutral',
      standards: 'BS EN 60598 / Energy Rating A+',
      overview:
        'Converts electrical energy into lumen illumination for interior or outdoor lighting.',
      circuitBehavior:
        'Draws active power from Live and Neutral supply rails. May exhibit inrush or dimming characteristics.',
      keySpecs: [
        'Efficiency: LED high efficacy (> 80 lm/W)',
        'Power Factor: 0.50–0.98 depending on driver',
      ],
      quickTips: [
        'Connect Live from switch output and Neutral from supply Neutral bar.',
        'Always bond earth to metallic fitting enclosures.',
      ],
    };
  }

  if (category === 'socket') {
    return {
      title: 'Power Socket Outlet',
      category: 'socket',
      voltage: '230V AC (50Hz)',
      amperage: '13A / 16A / 32A',
      powerWatts: 3000,
      frequency: '50Hz',
      ipRating: 'IP20 (Indoor) / IP66 (Outdoor)',
      cableSize: '2.5mm² – 4.0mm²',
      poles: 'Live, Neutral, Earth',
      standards: 'BS 1363 / IEC 60309 / BS 7671',
      overview: 'Provides an accessible connection point for portable appliances and tools.',
      circuitBehavior:
        'Delivers 230V AC up to rated amperage. Requires continuous Live, Neutral, and Earth connections.',
      keySpecs: ['Max Current: 13A / 16A / 32A', 'RCD Protection Mandatory (30mA)'],
      quickTips: [
        'Connect all three rails: Live (Brown), Neutral (Blue), Earth (Green/Yellow).',
        'Verify ring circuit continuity or radial cable sizing.',
      ],
    };
  }

  if (category === 'switch') {
    return {
      title: 'Switching Control Device',
      category: 'switch',
      voltage: '230V AC (50Hz)',
      amperage: '10AX / 20A / 45A',
      frequency: '50Hz',
      ipRating: 'IP20 – IP66',
      cableSize: '1.0mm² – 4.0mm²',
      poles: '1 Pole / 2 Pole',
      standards: 'BS EN 60669 / BS 7671',
      overview: 'Manually or automatically opens and closes electrical paths in live circuits.',
      circuitBehavior:
        'Toggles continuity along the Live line to energize or isolate connected loads.',
      keySpecs: ['Switch Live path only', 'Rated for specific voltage & amperage'],
      quickTips: [
        'Never wire Live and Neutral directly across switch terminals (causes short circuit).',
        'Switch the Live conductor to safely isolate equipment.',
      ],
    };
  }

  return {
    title: 'Electrical Circuit Component',
    category: 'component',
    voltage: '230V AC / 12V DC',
    amperage: 'Standard load rating',
    frequency: '50Hz / 60Hz',
    ipRating: 'IP20',
    cableSize: '1.5mm² – 2.5mm²',
    poles: 'Live, Neutral, Earth',
    standards: 'BS 7671 / IEC International Electrical Standards',
    overview:
      'A standard electrical component used for power distribution, switching, or load consumption.',
    circuitBehavior:
      'Operates in accordance with Ohm’s Law (V = I × R) and Kirchhoff’s Circuit Laws.',
    keySpecs: ['Standard 230V AC / 12V DC operating range'],
    quickTips: [
      'Ensure complete circuit loop from Source Live to Source Neutral.',
      'Check all terminal screw connections before starting simulation.',
    ],
  };
}
