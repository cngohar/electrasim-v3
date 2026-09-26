/**
 * Terminal types and metadata resolver for ElectraSim v2.
 *
 * Provides granular electrical roles, conductor classifications, directionality,
 * and voltage domain definitions for all component terminals.
 */

import { COMPONENT_DEFS } from '../components';
import type { PortDef } from '../types';

export type ConductorKind = 'live' | 'neutral' | 'earth';

export type TerminalDirection = 'in' | 'out' | 'bidirectional' | 'pass';

export type TerminalRole =
  | 'SUPPLY_L'
  | 'SUPPLY_N'
  | 'SUPPLY_PE'
  | 'LINE_IN_L'
  | 'LINE_IN_N'
  | 'LINE_IN_PE'
  | 'SWITCHED_L'
  | 'SWITCHED_N'
  | 'CONTROL_L' // Regulated / dimmed live conductor (e.g. from fan regulator or dimmer)
  | 'LOAD_L'
  | 'LOAD_N'
  | 'LOAD_PE'
  | 'OUTPUT_L'
  | 'OUTPUT_N'
  | 'OUTPUT_PE'
  | 'JUNCTION_L'
  | 'JUNCTION_N'
  | 'JUNCTION_PE'
  | 'COIL_POS'
  | 'COIL_NEG'
  | 'LV_AC_L'
  | 'LV_AC_N'
  | 'LV_DC_POS'
  | 'LV_DC_NEG'
  | 'PASS_THROUGH';

export type VoltageDomain =
  | 'mains_ac_230v'
  | 'mains_ac_110v'
  | 'dc_12v'
  | 'lv_ac_8v'
  | 'lv_ac_12v'
  | 'lv_ac_24v'
  | '3phase_400v'
  | 'universal';

export interface TerminalDef {
  conductor: ConductorKind;
  direction: TerminalDirection;
  role: TerminalRole;
  voltageDomain: VoltageDomain;
  label: string;
  capabilities?: string[];
}

/**
 * Resolves explicit terminal metadata for a given component type and port index.
 */
export function resolveTerminal(componentType: string, portIndex: number): TerminalDef {
  const compDef = COMPONENT_DEFS[componentType];
  const port: PortDef | undefined = compDef?.ports[portIndex];

  if (!port) {
    return {
      conductor: 'live',
      direction: 'bidirectional',
      role: 'PASS_THROUGH',
      voltageDomain: 'mains_ac_230v',
      label: 'Unknown',
    };
  }

  const conductor: ConductorKind = port.type;
  const label = port.label || `${conductor}-${portIndex}`;

  // 1. Power Supply Sources
  if (compDef?.isSource) {
    if (componentType === 'live-terminal') {
      return {
        conductor: 'live',
        direction: 'out',
        role: 'SUPPLY_L',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    if (componentType === 'neutral-terminal') {
      return {
        conductor: 'neutral',
        direction: 'out',
        role: 'SUPPLY_N',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    if (componentType === 'earth-terminal') {
      return {
        conductor: 'earth',
        direction: 'out',
        role: 'SUPPLY_PE',
        voltageDomain: 'universal',
        label,
      };
    }
    if (componentType === 'dc-battery-12v') {
      return {
        conductor,
        direction: 'out',
        role: conductor === 'live' ? 'LV_DC_POS' : 'LV_DC_NEG',
        voltageDomain: 'dc_12v',
        label,
      };
    }
    if (componentType === 'solar-pv-panel') {
      return {
        conductor,
        direction: 'out',
        role: conductor === 'live' ? 'LV_DC_POS' : 'LV_DC_NEG',
        voltageDomain: 'dc_12v',
        label,
      };
    }
    if (conductor === 'live') {
      return {
        conductor: 'live',
        direction: 'out',
        role: 'SUPPLY_L',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    if (conductor === 'neutral') {
      return {
        conductor: 'neutral',
        direction: 'out',
        role: 'SUPPLY_N',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    return {
      conductor: 'earth',
      direction: 'out',
      role: 'SUPPLY_PE',
      voltageDomain: 'universal',
      label,
    };
  }

  // 2. Fan Regulator & Light Dimmer Controllers
  if (componentType === 'fan-dimmer') {
    if (portIndex === 0) {
      return {
        conductor: 'live',
        direction: 'in',
        role: 'LINE_IN_L',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    return {
      conductor: 'live',
      direction: 'out',
      role: 'CONTROL_L',
      voltageDomain: 'mains_ac_230v',
      label,
      capabilities: ['fan-speed-control'],
    };
  }

  if (componentType === 'dimmer-switch') {
    if (portIndex === 0) {
      return {
        conductor: 'live',
        direction: 'in',
        role: 'LINE_IN_L',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    return {
      conductor: 'live',
      direction: 'out',
      role: 'CONTROL_L',
      voltageDomain: 'mains_ac_230v',
      label,
      capabilities: ['lighting-dimming'],
    };
  }

  // 3. Protection Devices (MCBs, Fuses, RCDs, RCBOs)
  if (compDef?.isProtection) {
    if (port.relX === 0) {
      return {
        conductor,
        direction: 'in',
        role: conductor === 'live' ? 'LINE_IN_L' : 'LINE_IN_N',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    return {
      conductor,
      direction: 'out',
      role: conductor === 'live' ? 'OUTPUT_L' : 'OUTPUT_N',
      voltageDomain: 'mains_ac_230v',
      label,
    };
  }

  // 4. Standard Switches
  if (compDef?.isSwitch && !compDef.isSocket) {
    if (port.relX === 0) {
      return {
        conductor,
        direction: 'in',
        role: conductor === 'live' ? 'LINE_IN_L' : 'LINE_IN_N',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    return {
      conductor,
      direction: 'out',
      role: conductor === 'live' ? 'SWITCHED_L' : 'SWITCHED_N',
      voltageDomain: 'mains_ac_230v',
      label,
    };
  }

  // 5. Electrical Loads (Bulbs, Fans, Motors, Heaters, Bells)
  if (compDef?.isLoad) {
    if (conductor === 'live') {
      return {
        conductor: 'live',
        direction: 'in',
        role: 'LOAD_L',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    if (conductor === 'neutral') {
      return {
        conductor: 'neutral',
        direction: 'out',
        role: 'LOAD_N',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    return {
      conductor: 'earth',
      direction: 'in',
      role: 'LOAD_PE',
      voltageDomain: 'universal',
      label,
    };
  }

  // 6. Sockets / Convenience Outlets
  if (compDef?.isSocket) {
    if (conductor === 'live') {
      return {
        conductor: 'live',
        direction: 'in',
        role: 'LOAD_L',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    if (conductor === 'neutral') {
      return {
        conductor: 'neutral',
        direction: 'in',
        role: 'LOAD_N',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    return {
      conductor: 'earth',
      direction: 'in',
      role: 'LOAD_PE',
      voltageDomain: 'universal',
      label,
    };
  }

  // 7. Junctions / Distribution
  if (compDef?.isJunction) {
    return {
      conductor,
      direction: 'bidirectional',
      role:
        conductor === 'live'
          ? 'JUNCTION_L'
          : conductor === 'neutral'
            ? 'JUNCTION_N'
            : 'JUNCTION_PE',
      voltageDomain: 'mains_ac_230v',
      label,
    };
  }

  // 8. Step-down Transformers
  if (componentType === 'transformer-8v') {
    if (portIndex < 2) {
      return {
        conductor,
        direction: 'in',
        role: conductor === 'live' ? 'LINE_IN_L' : 'LINE_IN_N',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    return {
      conductor,
      direction: 'out',
      role: conductor === 'live' ? 'LV_AC_L' : 'LV_AC_N',
      voltageDomain: 'lv_ac_8v',
      label,
    };
  }
  if (componentType === 'transformer-12v') {
    if (portIndex < 2) {
      return {
        conductor,
        direction: 'in',
        role: conductor === 'live' ? 'LINE_IN_L' : 'LINE_IN_N',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    return {
      conductor,
      direction: 'out',
      role: conductor === 'live' ? 'LV_AC_L' : 'LV_AC_N',
      voltageDomain: 'lv_ac_12v',
      label,
    };
  }
  if (componentType === 'transformer-24v') {
    if (portIndex < 2) {
      return {
        conductor,
        direction: 'in',
        role: conductor === 'live' ? 'LINE_IN_L' : 'LINE_IN_N',
        voltageDomain: 'mains_ac_230v',
        label,
      };
    }
    return {
      conductor,
      direction: 'out',
      role: conductor === 'live' ? 'LV_AC_L' : 'LV_AC_N',
      voltageDomain: 'lv_ac_24v',
      label,
    };
  }

  // Default fallback
  return {
    conductor,
    direction: 'bidirectional',
    role:
      conductor === 'live' ? 'PASS_THROUGH' : conductor === 'neutral' ? 'PASS_THROUGH' : 'LOAD_PE',
    voltageDomain: 'mains_ac_230v',
    label,
  };
}
