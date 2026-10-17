/**
 * Component help & learning content registry — merged zone modules plus the
 * `getComponentHelp` fallback resolver.
 *
 * Split verbatim from the former monolithic `componentHelp.ts`; behaviour
 * and registry ordering are unchanged.
 */

import { COMPONENT_DEFS } from '../components';
import { DEVICE_CAPABILITY_FAMILIES } from '../core/capabilityCatalogue';
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

/** Reviewed catalogue-family guidance; missing product ratings are explicit. */
export function getComponentHelp(type: string, category?: string): ComponentHelpData {
  if (COMPONENT_HELP_REGISTRY[type]) return COMPONENT_HELP_REGISTRY[type];
  const def = COMPONENT_DEFS[type];
  const family = DEVICE_CAPABILITY_FAMILIES[type];
  return {
    title: def?.label ?? type,
    category: def?.category ?? category,
    standards: 'No product certification or standard clause is declared for this entry.',
    overview: def?.description || 'No authored product description is available for this entry.',
    circuitBehavior: family
      ? `This entry uses the declared ${family} teaching model. See Declared model specifications for terminal-group ratings and approximation limits; Readings requires a fresh calculation.`
      : 'No reviewed model family is available. Electrical behavior remains unassessed.',
    keySpecs: [
      `Canonical terminals: ${def?.ports.map((port) => `${port.label} (${port.type})`).join(', ') || 'not declared'}`,
      'Manufacturer ratings and installation suitability are not inferred from the component name or category.',
    ],
    quickTips: [
      'Use the terminal labels shown on this catalogue entry.',
      'Review supply and rating findings in the Inspector. Unknown ratings require declared data, not a compatibility assumption.',
    ],
  };
}
