/**
 * Functional component classification and capability model for ElectraSim v2.
 *
 * Maps every known component from the registry to an explicit functional category,
 * electrical role, and compatibility constraints without duplicating component definitions.
 */

import { COMPONENT_DEFS } from '../components';

export type FunctionalCategory =
  | 'Supply'
  | 'Protection'
  | 'Switching'
  | 'Control'
  | 'LightingLoad'
  | 'MotorLoad'
  | 'FanLoad'
  | 'SocketLoad'
  | 'ApplianceLoad'
  | 'SounderLoad'
  | 'Connection'
  | 'Transformer'
  | 'Relay'
  | 'Contactor'
  | 'Sensor'
  | 'Other';

export type ComponentFunctionalRole =
  | 'supply-source'
  | 'protective-device'
  | 'isolation-device'
  | 'switching-device'
  | 'fan-speed-controller'
  | 'lighting-dimmer'
  | 'sensor-controller'
  | 'timer-controller'
  | 'lighting-load'
  | 'fan-load'
  | 'motor-load'
  | 'socket-outlet'
  | 'appliance-load'
  | 'sounder-load'
  | 'junction-distributor'
  | 'step-transformer'
  | 'relay-switch'
  | 'other';

export interface ComponentCapability {
  category: FunctionalCategory;
  role: ComponentFunctionalRole;
  /** Allowed functional load categories when this device acts as a controller / feeder. */
  allowedControlledLoads?: FunctionalCategory[];
  /** Allowed controller roles that can safely feed or switch this load. */
  compatibleControllers?: ComponentFunctionalRole[];
  requiresGround?: boolean;
  isInductive?: boolean;
  isResistive?: boolean;
  description?: string;
}

const CAPABILITY_OVERRIDES: Record<string, Partial<ComponentCapability>> = {
  // Speed controllers / Dimmers
  'fan-dimmer': {
    category: 'Control',
    role: 'fan-speed-controller',
    allowedControlledLoads: ['FanLoad', 'MotorLoad'],
    description: 'Capacitive/triac fan regulator designed specifically for inductive fan loads.',
  },
  'dimmer-switch': {
    category: 'Control',
    role: 'lighting-dimmer',
    allowedControlledLoads: ['LightingLoad'],
    description: 'Phase-cut light dimmer switch designed strictly for compatible lighting loads.',
  },

  // Sensors & Timers
  'pir-sensor': {
    category: 'Control',
    role: 'sensor-controller',
    allowedControlledLoads: ['LightingLoad', 'SounderLoad', 'FanLoad'],
  },
  'photocell-sensor': {
    category: 'Control',
    role: 'sensor-controller',
    allowedControlledLoads: ['LightingLoad'],
  },
  'smart-relay': {
    category: 'Control',
    role: 'sensor-controller',
    allowedControlledLoads: ['LightingLoad', 'FanLoad', 'SocketLoad', 'ApplianceLoad'],
  },
  'timer-switch': {
    category: 'Control',
    role: 'timer-controller',
    allowedControlledLoads: [
      'LightingLoad',
      'FanLoad',
      'SocketLoad',
      'ApplianceLoad',
      'SounderLoad',
    ],
  },
  'digital-weekly-timer': {
    category: 'Control',
    role: 'timer-controller',
    allowedControlledLoads: [
      'LightingLoad',
      'FanLoad',
      'SocketLoad',
      'ApplianceLoad',
      'SounderLoad',
    ],
  },
  'staircase-timer': {
    category: 'Control',
    role: 'timer-controller',
    allowedControlledLoads: ['LightingLoad', 'SounderLoad'],
  },
  'countdown-timer': {
    category: 'Control',
    role: 'timer-controller',
    allowedControlledLoads: ['LightingLoad', 'FanLoad', 'ApplianceLoad'],
  },
  'delay-timer': {
    category: 'Control',
    role: 'timer-controller',
    allowedControlledLoads: ['LightingLoad', 'FanLoad', 'MotorLoad', 'ApplianceLoad'],
  },
  thermostat: {
    category: 'Control',
    role: 'sensor-controller',
    allowedControlledLoads: ['ApplianceLoad', 'MotorLoad', 'FanLoad'],
  },
  'room-thermostat': {
    category: 'Control',
    role: 'sensor-controller',
    allowedControlledLoads: ['ApplianceLoad', 'MotorLoad', 'FanLoad'],
  },
  'heating-thermostat': {
    category: 'Control',
    role: 'sensor-controller',
    allowedControlledLoads: ['ApplianceLoad'],
  },

  // Lighting Loads
  bulb: {
    category: 'LightingLoad',
    role: 'lighting-load',
    compatibleControllers: [
      'switching-device',
      'lighting-dimmer',
      'sensor-controller',
      'timer-controller',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'bulb-incandescent': {
    category: 'LightingLoad',
    role: 'lighting-load',
    isResistive: true,
    compatibleControllers: [
      'switching-device',
      'lighting-dimmer',
      'sensor-controller',
      'timer-controller',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'bulb-halogen': {
    category: 'LightingLoad',
    role: 'lighting-load',
    isResistive: true,
    compatibleControllers: [
      'switching-device',
      'lighting-dimmer',
      'sensor-controller',
      'timer-controller',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'bulb-cfl': {
    category: 'LightingLoad',
    role: 'lighting-load',
    compatibleControllers: [
      'switching-device',
      'lighting-dimmer',
      'sensor-controller',
      'timer-controller',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'bulb-smart-rgb': {
    category: 'LightingLoad',
    role: 'lighting-load',
    compatibleControllers: [
      'switching-device',
      'sensor-controller',
      'timer-controller',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'led-downlight': {
    category: 'LightingLoad',
    role: 'lighting-load',
    compatibleControllers: [
      'switching-device',
      'lighting-dimmer',
      'sensor-controller',
      'timer-controller',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'tube-light': {
    category: 'LightingLoad',
    role: 'lighting-load',
    isInductive: true,
    compatibleControllers: [
      'switching-device',
      'sensor-controller',
      'timer-controller',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },

  // Fan Loads
  'ceiling-fan': {
    category: 'FanLoad',
    role: 'fan-load',
    isInductive: true,
    compatibleControllers: [
      'switching-device',
      'fan-speed-controller',
      'sensor-controller',
      'timer-controller',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'extractor-fan': {
    category: 'FanLoad',
    role: 'fan-load',
    isInductive: true,
    compatibleControllers: [
      'switching-device',
      'fan-speed-controller',
      'sensor-controller',
      'timer-controller',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'industrial-exhaust-fan': {
    category: 'FanLoad',
    role: 'fan-load',
    isInductive: true,
    compatibleControllers: [
      'switching-device',
      'fan-speed-controller',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'table-fan': {
    category: 'FanLoad',
    role: 'fan-load',
    isInductive: true,
    compatibleControllers: [
      'switching-device',
      'fan-speed-controller',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },

  // Motor Loads
  motor: {
    category: 'MotorLoad',
    role: 'motor-load',
    isInductive: true,
    compatibleControllers: [
      'switching-device',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'motor-3phase': {
    category: 'MotorLoad',
    role: 'motor-load',
    isInductive: true,
    requiresGround: true,
  },
  'water-pump': {
    category: 'MotorLoad',
    role: 'motor-load',
    isInductive: true,
    requiresGround: true,
  },

  // Sockets
  'socket-2pin': {
    category: 'SocketLoad',
    role: 'socket-outlet',
    compatibleControllers: [
      'switching-device',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'socket-3pin': {
    category: 'SocketLoad',
    role: 'socket-outlet',
    requiresGround: true,
    compatibleControllers: [
      'switching-device',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'double-socket': {
    category: 'SocketLoad',
    role: 'socket-outlet',
    requiresGround: true,
    compatibleControllers: [
      'switching-device',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'socket-usb': {
    category: 'SocketLoad',
    role: 'socket-outlet',
    requiresGround: true,
    compatibleControllers: [
      'switching-device',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'socket-gfci': {
    category: 'SocketLoad',
    role: 'socket-outlet',
    requiresGround: true,
    compatibleControllers: [
      'switching-device',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'socket-industrial': {
    category: 'SocketLoad',
    role: 'socket-outlet',
    requiresGround: true,
    compatibleControllers: [
      'switching-device',
      'protective-device',
      'supply-source',
      'junction-distributor',
    ],
  },
  'switched-socket': {
    category: 'SocketLoad',
    role: 'socket-outlet',
    requiresGround: true,
    compatibleControllers: ['protective-device', 'supply-source', 'junction-distributor'],
  },

  // Appliance / Heating Loads
  'water-heater': {
    category: 'ApplianceLoad',
    role: 'appliance-load',
    isResistive: true,
    requiresGround: true,
  },
  'space-heater': { category: 'ApplianceLoad', role: 'appliance-load', isResistive: true },
  'air-conditioner': {
    category: 'ApplianceLoad',
    role: 'appliance-load',
    isInductive: true,
    requiresGround: true,
  },
  'induction-hob': { category: 'ApplianceLoad', role: 'appliance-load', requiresGround: true },
  'ev-charger': { category: 'ApplianceLoad', role: 'appliance-load', requiresGround: true },
  'heating-element': { category: 'ApplianceLoad', role: 'appliance-load', isResistive: true },

  // Sounders
  bell: { category: 'SounderLoad', role: 'sounder-load' },
  'electric-buzzer': { category: 'SounderLoad', role: 'sounder-load' },
  'wireless-doorbell': { category: 'SounderLoad', role: 'sounder-load' },
  'alarm-siren': { category: 'SounderLoad', role: 'sounder-load' },

  // Protection
  mcb: { category: 'Protection', role: 'protective-device' },
  'mcb-type-c': { category: 'Protection', role: 'protective-device' },
  'mcb-type-d': { category: 'Protection', role: 'protective-device' },
  mccb: { category: 'Protection', role: 'protective-device' },
  rcd: { category: 'Protection', role: 'protective-device' },
  rcbo: { category: 'Protection', role: 'protective-device' },
  fuse: { category: 'Protection', role: 'protective-device' },
  spd: { category: 'Protection', role: 'protective-device' },
  'fused-spur': { category: 'Protection', role: 'protective-device' },
  'distribution-board': { category: 'Protection', role: 'protective-device' },
  'isolator-switch': { category: 'Protection', role: 'isolation-device' },

  // Supply
  'live-terminal': { category: 'Supply', role: 'supply-source' },
  'neutral-terminal': { category: 'Supply', role: 'supply-source' },
  'earth-terminal': { category: 'Supply', role: 'supply-source' },
  'ac-mains-supply': { category: 'Supply', role: 'supply-source' },
  'dc-battery-12v': { category: 'Supply', role: 'supply-source' },
  'solar-pv-panel': { category: 'Supply', role: 'supply-source' },
  'diesel-generator': { category: 'Supply', role: 'supply-source' },
};

/**
 * Resolves the functional capability and category for any component type.
 */
export function getComponentCapability(componentType: string): ComponentCapability {
  const override = CAPABILITY_OVERRIDES[componentType];
  if (override?.category && override.role) {
    return override as ComponentCapability;
  }

  const def = COMPONENT_DEFS[componentType];
  if (!def) {
    return {
      category: 'Other',
      role: 'other',
    };
  }

  if (def.isSource) {
    return {
      category: 'Supply',
      role: 'supply-source',
    };
  }

  if (def.isProtection) {
    return {
      category: 'Protection',
      role: 'protective-device',
      allowedControlledLoads: [
        'LightingLoad',
        'FanLoad',
        'MotorLoad',
        'SocketLoad',
        'ApplianceLoad',
        'SounderLoad',
        'Connection',
        'Switching',
        'Control',
      ],
    };
  }

  if (def.isSwitch) {
    return {
      category: 'Switching',
      role: 'switching-device',
      allowedControlledLoads: [
        'LightingLoad',
        'FanLoad',
        'MotorLoad',
        'SocketLoad',
        'ApplianceLoad',
        'SounderLoad',
        'Connection',
      ],
    };
  }

  if (def.isSocket) {
    return {
      category: 'SocketLoad',
      role: 'socket-outlet',
      requiresGround: def.ports.some((p) => p.type === 'earth'),
    };
  }

  if (def.isLoad) {
    if (def.category === 'lighting') {
      return { category: 'LightingLoad', role: 'lighting-load' };
    }
    if (def.category === 'fan') {
      return { category: 'FanLoad', role: 'fan-load', isInductive: true };
    }
    if (def.category === 'motor') {
      return { category: 'MotorLoad', role: 'motor-load', isInductive: true };
    }
    if (def.category === 'sounder') {
      return { category: 'SounderLoad', role: 'sounder-load' };
    }
    return { category: 'ApplianceLoad', role: 'appliance-load' };
  }

  if (def.isJunction) {
    return {
      category: 'Connection',
      role: 'junction-distributor',
    };
  }

  return {
    category: 'Other',
    role: 'other',
  };
}
