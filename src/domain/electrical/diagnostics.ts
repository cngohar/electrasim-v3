/**
 * Diagnostic model and stable rule identifiers for ElectraSim v2.
 *
 * Exposes plain-language educational feedback, suggested fixes, and
 * structured rule codes for terminal, component, topology, and safety rules.
 */

export type DiagnosticSeverity = 'valid' | 'info' | 'warning' | 'error';

export const DIAGNOSTIC_CODES = {
  // Terminal Layer
  TERM_LIVE_EARTH: 'TERM_LIVE_EARTH',
  TERM_NEUTRAL_EARTH: 'TERM_NEUTRAL_EARTH',
  TERM_LIVE_NEUTRAL_SHORT: 'TERM_LIVE_NEUTRAL_SHORT',
  TERM_VOLTAGE_DOMAIN_MISMATCH: 'TERM_VOLTAGE_DOMAIN_MISMATCH',
  TERM_DIRECTION_CONFLICT: 'TERM_DIRECTION_CONFLICT',

  // Component Layer
  COMPAT_REGULATOR_BULB: 'COMPAT_REGULATOR_BULB',
  COMPAT_REGULATOR_SOCKET: 'COMPAT_REGULATOR_SOCKET',
  COMPAT_REGULATOR_APPLIANCE: 'COMPAT_REGULATOR_APPLIANCE',
  COMPAT_DIMMER_FAN: 'COMPAT_DIMMER_FAN',
  COMPAT_DIMMER_SOCKET: 'COMPAT_DIMMER_SOCKET',
  COMPAT_INCOMPATIBLE_CONTROL_LOAD: 'COMPAT_INCOMPATIBLE_CONTROL_LOAD',
  COMPAT_MISSING_GROUND: 'COMPAT_MISSING_GROUND',

  // Topology Layer
  TOPOLOGY_SELF_LOOP: 'TOPOLOGY_SELF_LOOP',
  TOPOLOGY_DUPLICATE_WIRE: 'TOPOLOGY_DUPLICATE_WIRE',
  TOPOLOGY_PROTECTION_BYPASS: 'TOPOLOGY_PROTECTION_BYPASS',
  TOPOLOGY_MISSING_RETURN: 'TOPOLOGY_MISSING_RETURN',

  // Safety Layer
  SAFETY_LIVE_EARTH: 'SAFETY_LIVE_EARTH',
  SAFETY_LIVE_NEUTRAL_SHORT: 'SAFETY_LIVE_NEUTRAL_SHORT',
} as const;

export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[keyof typeof DIAGNOSTIC_CODES];

export interface ElectricalDiagnostic {
  code: DiagnosticCode | string;
  severity: DiagnosticSeverity;
  sourceComponentId: string;
  sourceTerminalIndex: number;
  targetComponentId: string;
  targetTerminalIndex: number;
  message: string;
  explanation?: string;
  suggestedFix?: string;
  /** In Advanced/Pro simulation mode, whether this rule permits experimental override */
  canOverride?: boolean;
}

export interface DiagnosticTemplate {
  code: DiagnosticCode | string;
  severity: DiagnosticSeverity;
  message: string;
  explanation?: string;
  suggestedFix?: string;
  canOverride?: boolean;
}

export const DIAGNOSTIC_TEMPLATES: Record<string, DiagnosticTemplate> = {
  [DIAGNOSTIC_CODES.TERM_LIVE_EARTH]: {
    code: DIAGNOSTIC_CODES.TERM_LIVE_EARTH,
    severity: 'error',
    message: 'Direct Live to Earth connection is a dangerous short-circuit fault.',
    explanation:
      'The Protective Earth (PE) conductor is designed exclusively for fault current protection and casing bonding. Connecting Live directly to Earth causes an immediate dead short or trip.',
    suggestedFix:
      'Connect the Live conductor to a load input or switch terminal instead of the Earth terminal.',
    canOverride: false,
  },
  [DIAGNOSTIC_CODES.TERM_LIVE_NEUTRAL_SHORT]: {
    code: DIAGNOSTIC_CODES.TERM_LIVE_NEUTRAL_SHORT,
    severity: 'error',
    message: 'Direct Live to Neutral connection causes a dead short circuit.',
    explanation:
      'Connecting Live directly to Neutral with zero load impedance creates high fault current that blows fuses or trips circuit breakers immediately.',
    suggestedFix:
      'Insert an electrical load (such as a lamp, fan, or motor) or a switch between the Live supply and Neutral return.',
    canOverride: false,
  },
  [DIAGNOSTIC_CODES.COMPAT_REGULATOR_BULB]: {
    code: DIAGNOSTIC_CODES.COMPAT_REGULATOR_BULB,
    severity: 'error',
    message:
      'A fan regulator is designed to control a compatible fan load; a bulb cannot be used as its controlled load.',
    explanation:
      'Fan speed regulators use capacitive or inductive phase control tailored to single-phase AC induction fan motors. Connecting a lighting bulb can cause flickering, triac overheating, or bulb damage.',
    suggestedFix:
      'Use a standard Single-Way Switch or a dedicated Light Dimmer Switch to control lighting loads.',
    canOverride: true,
  },
  [DIAGNOSTIC_CODES.COMPAT_REGULATOR_SOCKET]: {
    code: DIAGNOSTIC_CODES.COMPAT_REGULATOR_SOCKET,
    severity: 'error',
    message: 'A fan regulator must not be connected to supply a general-purpose socket outlet.',
    explanation:
      'Wall sockets and convenience outlets must provide full unfiltered nominal mains voltage (230V). Powering a socket through a fan regulator can damage connected appliances.',
    suggestedFix:
      'Feed the socket directly from an MCB or standard switch with appropriate 2.5mm² wiring.',
    canOverride: true,
  },
  [DIAGNOSTIC_CODES.COMPAT_REGULATOR_APPLIANCE]: {
    code: DIAGNOSTIC_CODES.COMPAT_REGULATOR_APPLIANCE,
    severity: 'error',
    message: 'A fan regulator cannot be used to power heavy heating or compressor appliances.',
    explanation:
      'Fan regulators have a low current rating (~1A-2A) and cannot withstand the high starting or resistive currents of space heaters, water heaters, or air conditioners.',
    suggestedFix: 'Use a suitably rated Double-Pole Switch or MCB to control heavy appliances.',
    canOverride: true,
  },
  [DIAGNOSTIC_CODES.COMPAT_DIMMER_FAN]: {
    code: DIAGNOSTIC_CODES.COMPAT_DIMMER_FAN,
    severity: 'error',
    message: 'A standard light dimmer switch is not rated to control inductive fan motors.',
    explanation:
      'Light dimmers are designed for resistive or leading/trailing edge LED lighting. Driving inductive motor loads with a light dimmer produces high voltage spikes that destroy the dimmer circuitry.',
    suggestedFix:
      'Use a Rotary Fan Speed Regulator designed specifically for ceiling and ventilation fans.',
    canOverride: true,
  },
  [DIAGNOSTIC_CODES.COMPAT_DIMMER_SOCKET]: {
    code: DIAGNOSTIC_CODES.COMPAT_DIMMER_SOCKET,
    severity: 'error',
    message: 'A light dimmer switch must not be wired to supply a general socket outlet.',
    explanation:
      'General-purpose socket outlets require un-chopped standard sinusoidal mains supply. Dimming socket outlets violates electrical safety regulations.',
    suggestedFix: 'Wire the socket directly from an MCB or standard switch.',
    canOverride: true,
  },
  [DIAGNOSTIC_CODES.TERM_VOLTAGE_DOMAIN_MISMATCH]: {
    code: DIAGNOSTIC_CODES.TERM_VOLTAGE_DOMAIN_MISMATCH,
    severity: 'error',
    message: 'Voltage domain mismatch: cannot connect different voltage/current systems together.',
    explanation:
      'Interconnecting incompatible voltage rails (e.g. 230V AC mains to low-voltage 8V/12V DC systems) risks severe component burnout.',
    suggestedFix: 'Use a step-down transformer or keep distinct voltage systems isolated.',
    canOverride: false,
  },
  [DIAGNOSTIC_CODES.TOPOLOGY_SELF_LOOP]: {
    code: DIAGNOSTIC_CODES.TOPOLOGY_SELF_LOOP,
    severity: 'error',
    message: 'Cannot wire a component directly to itself.',
    explanation: 'Both ends of a wire must connect to distinct component instances on the canvas.',
    suggestedFix: 'Connect the wire to a terminal on a different component.',
    canOverride: false,
  },
  [DIAGNOSTIC_CODES.TOPOLOGY_DUPLICATE_WIRE]: {
    code: DIAGNOSTIC_CODES.TOPOLOGY_DUPLICATE_WIRE,
    severity: 'info',
    message: 'A wire already exists between these exact terminals.',
    explanation: 'Duplicate parallel wires between the same pair of ports are redundant.',
    suggestedFix: 'No additional wire is needed between these terminals.',
    canOverride: false,
  },
};
