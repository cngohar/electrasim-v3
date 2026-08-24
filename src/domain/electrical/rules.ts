/**
 * Declarative Electrical Rule Registry for ElectraSim v2.
 *
 * Implements clean, composable rules across Terminal, Component, Topology,
 * Safety, and Educational layers.
 */

import { COMPONENT_DEFS } from '../components';
import type { Circuit, ComponentInstance } from '../types';
import { getComponentCapability } from './components';
import {
  DIAGNOSTIC_CODES,
  DIAGNOSTIC_TEMPLATES,
  type DiagnosticSeverity,
  type ElectricalDiagnostic,
} from './diagnostics';
import type { TerminalDef } from './terminals';

export interface ElectricalRuleContext {
  sourceComponent: ComponentInstance;
  sourceTerminal: TerminalDef;
  sourceIndex: number;
  targetComponent: ComponentInstance;
  targetTerminal: TerminalDef;
  targetIndex: number;
  circuit?: Circuit;
  mode: 'basic' | 'pro';
}

export interface ElectricalRule {
  id: string;
  category: 'terminal' | 'component' | 'topology' | 'safety' | 'educational';
  severity: DiagnosticSeverity;
  appliesTo: (context: ElectricalRuleContext) => boolean;
  validate: (context: ElectricalRuleContext) => ElectricalDiagnostic | null;
}

// ─── 1. TERMINAL LAYER RULES ──────────────────────────────────────────────────

export const SelfLoopRule: ElectricalRule = {
  id: 'RULE_SELF_LOOP',
  category: 'topology',
  severity: 'error',
  appliesTo: ({ sourceComponent, targetComponent }) => sourceComponent.id === targetComponent.id,
  validate: ({ sourceComponent, targetComponent, sourceIndex, targetIndex }) => ({
    code: DIAGNOSTIC_CODES.TOPOLOGY_SELF_LOOP,
    severity: 'error',
    sourceComponentId: sourceComponent.id,
    sourceTerminalIndex: sourceIndex,
    targetComponentId: targetComponent.id,
    targetTerminalIndex: targetIndex,
    message: DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.TOPOLOGY_SELF_LOOP].message,
    explanation: DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.TOPOLOGY_SELF_LOOP].explanation,
    suggestedFix: DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.TOPOLOGY_SELF_LOOP].suggestedFix,
    canOverride: false,
  }),
};

export const LiveEarthRule: ElectricalRule = {
  id: 'RULE_LIVE_EARTH',
  category: 'safety',
  severity: 'error',
  appliesTo: ({ sourceTerminal, targetTerminal }) =>
    (sourceTerminal.conductor === 'live' && targetTerminal.conductor === 'earth') ||
    (sourceTerminal.conductor === 'earth' && targetTerminal.conductor === 'live'),
  validate: ({ sourceComponent, targetComponent, sourceIndex, targetIndex }) => ({
    code: DIAGNOSTIC_CODES.TERM_LIVE_EARTH,
    severity: 'error',
    sourceComponentId: sourceComponent.id,
    sourceTerminalIndex: sourceIndex,
    targetComponentId: targetComponent.id,
    targetTerminalIndex: targetIndex,
    message: DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.TERM_LIVE_EARTH].message,
    explanation: DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.TERM_LIVE_EARTH].explanation,
    suggestedFix: DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.TERM_LIVE_EARTH].suggestedFix,
    canOverride: false,
  }),
};

export const NeutralEarthRule: ElectricalRule = {
  id: 'RULE_NEUTRAL_EARTH',
  category: 'terminal',
  severity: 'error',
  appliesTo: ({ sourceTerminal, targetTerminal }) =>
    (sourceTerminal.conductor === 'neutral' && targetTerminal.conductor === 'earth') ||
    (sourceTerminal.conductor === 'earth' && targetTerminal.conductor === 'neutral'),
  validate: ({ sourceComponent, targetComponent, sourceIndex, targetIndex, mode }) => ({
    code: DIAGNOSTIC_CODES.TERM_NEUTRAL_EARTH,
    severity: mode === 'basic' ? 'error' : 'warning',
    sourceComponentId: sourceComponent.id,
    sourceTerminalIndex: sourceIndex,
    targetComponentId: targetComponent.id,
    targetTerminalIndex: targetIndex,
    message: 'Neutral and Protective Earth must not be joined in domestic subcircuits.',
    explanation:
      'Neutral and Earth are separate conductors downstream of the consumer unit. Joining them creates circulating return currents in the earthing system and trips RCD protection.',
    suggestedFix:
      'Connect Neutral to the designated Neutral return rail, and Earth to the grounding terminal.',
    canOverride: true,
  }),
};

export const LiveNeutralDirectShortRule: ElectricalRule = {
  id: 'RULE_LIVE_NEUTRAL_SHORT',
  category: 'safety',
  severity: 'error',
  appliesTo: ({ sourceComponent, targetComponent, sourceTerminal, targetTerminal }) => {
    const isLiveNeutral =
      (sourceTerminal.conductor === 'live' && targetTerminal.conductor === 'neutral') ||
      (sourceTerminal.conductor === 'neutral' && targetTerminal.conductor === 'live');
    if (!isLiveNeutral) return false;

    const sourceDef = COMPONENT_DEFS[sourceComponent.type];
    const targetDef = COMPONENT_DEFS[targetComponent.type];

    // Direct connection between supply rails (e.g. Live terminal to Neutral terminal)
    const isSourceToSource = sourceDef?.isSource && targetDef?.isSource;
    // Or direct connection across supply rail to pass-through switch/junction neutral without load
    const isDirectSupplyDeadShort =
      (sourceDef?.isSource && (targetDef?.isSwitch || targetDef?.isJunction)) ||
      (targetDef?.isSource && (sourceDef?.isSwitch || sourceDef?.isJunction));

    return Boolean(isSourceToSource || isDirectSupplyDeadShort);
  },
  validate: ({ sourceComponent, targetComponent, sourceIndex, targetIndex }) => ({
    code: DIAGNOSTIC_CODES.TERM_LIVE_NEUTRAL_SHORT,
    severity: 'error',
    sourceComponentId: sourceComponent.id,
    sourceTerminalIndex: sourceIndex,
    targetComponentId: targetComponent.id,
    targetTerminalIndex: targetIndex,
    message: DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.TERM_LIVE_NEUTRAL_SHORT].message,
    explanation: DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.TERM_LIVE_NEUTRAL_SHORT].explanation,
    suggestedFix: DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.TERM_LIVE_NEUTRAL_SHORT].suggestedFix,
    canOverride: false,
  }),
};

export const VoltageDomainMismatchRule: ElectricalRule = {
  id: 'RULE_VOLTAGE_DOMAIN_MISMATCH',
  category: 'terminal',
  severity: 'error',
  appliesTo: ({ sourceTerminal, targetTerminal }) => {
    if (
      sourceTerminal.voltageDomain === 'universal' ||
      targetTerminal.voltageDomain === 'universal'
    ) {
      return false;
    }
    return sourceTerminal.voltageDomain !== targetTerminal.voltageDomain;
  },
  validate: ({ sourceComponent, targetComponent, sourceIndex, targetIndex, mode }) => ({
    code: DIAGNOSTIC_CODES.TERM_VOLTAGE_DOMAIN_MISMATCH,
    severity: mode === 'basic' ? 'error' : 'warning',
    sourceComponentId: sourceComponent.id,
    sourceTerminalIndex: sourceIndex,
    targetComponentId: targetComponent.id,
    targetTerminalIndex: targetIndex,
    message: DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.TERM_VOLTAGE_DOMAIN_MISMATCH].message,
    explanation: DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.TERM_VOLTAGE_DOMAIN_MISMATCH].explanation,
    suggestedFix: DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.TERM_VOLTAGE_DOMAIN_MISMATCH].suggestedFix,
    canOverride: true,
  }),
};

// ─── 2. COMPONENT LAYER RULES ─────────────────────────────────────────────────

export const FanRegulatorBulbRule: ElectricalRule = {
  id: 'RULE_REGULATOR_BULB',
  category: 'component',
  severity: 'error',
  appliesTo: ({ sourceComponent, targetComponent, sourceTerminal, targetTerminal }) => {
    const isRegulatorSource =
      sourceComponent.type === 'fan-dimmer' && sourceTerminal.role === 'CONTROL_L';
    const isBulbTarget =
      getComponentCapability(targetComponent.type).category === 'LightingLoad' &&
      targetTerminal.conductor === 'live';

    const isRegulatorTarget =
      targetComponent.type === 'fan-dimmer' && targetTerminal.role === 'CONTROL_L';
    const isBulbSource =
      getComponentCapability(sourceComponent.type).category === 'LightingLoad' &&
      sourceTerminal.conductor === 'live';

    return (isRegulatorSource && isBulbTarget) || (isRegulatorTarget && isBulbSource);
  },
  validate: ({ sourceComponent, targetComponent, sourceIndex, targetIndex, mode }) => {
    const template = DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.COMPAT_REGULATOR_BULB];
    return {
      code: DIAGNOSTIC_CODES.COMPAT_REGULATOR_BULB,
      severity: mode === 'basic' ? 'error' : 'warning',
      sourceComponentId: sourceComponent.id,
      sourceTerminalIndex: sourceIndex,
      targetComponentId: targetComponent.id,
      targetTerminalIndex: targetIndex,
      message: template.message,
      explanation: template.explanation,
      suggestedFix: template.suggestedFix,
      canOverride: true,
    };
  },
};

export const FanRegulatorSocketRule: ElectricalRule = {
  id: 'RULE_REGULATOR_SOCKET',
  category: 'component',
  severity: 'error',
  appliesTo: ({ sourceComponent, targetComponent, sourceTerminal, targetTerminal }) => {
    const isRegulatorSource =
      sourceComponent.type === 'fan-dimmer' && sourceTerminal.role === 'CONTROL_L';
    const isSocketTarget =
      getComponentCapability(targetComponent.type).category === 'SocketLoad' &&
      targetTerminal.conductor === 'live';

    const isRegulatorTarget =
      targetComponent.type === 'fan-dimmer' && targetTerminal.role === 'CONTROL_L';
    const isSocketSource =
      getComponentCapability(sourceComponent.type).category === 'SocketLoad' &&
      sourceTerminal.conductor === 'live';

    return (isRegulatorSource && isSocketTarget) || (isRegulatorTarget && isSocketSource);
  },
  validate: ({ sourceComponent, targetComponent, sourceIndex, targetIndex, mode }) => {
    const template = DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.COMPAT_REGULATOR_SOCKET];
    return {
      code: DIAGNOSTIC_CODES.COMPAT_REGULATOR_SOCKET,
      severity: mode === 'basic' ? 'error' : 'warning',
      sourceComponentId: sourceComponent.id,
      sourceTerminalIndex: sourceIndex,
      targetComponentId: targetComponent.id,
      targetTerminalIndex: targetIndex,
      message: template.message,
      explanation: template.explanation,
      suggestedFix: template.suggestedFix,
      canOverride: true,
    };
  },
};

export const FanRegulatorApplianceRule: ElectricalRule = {
  id: 'RULE_REGULATOR_APPLIANCE',
  category: 'component',
  severity: 'error',
  appliesTo: ({ sourceComponent, targetComponent, sourceTerminal, targetTerminal }) => {
    const isRegulatorSource =
      sourceComponent.type === 'fan-dimmer' && sourceTerminal.role === 'CONTROL_L';
    const isApplianceTarget =
      getComponentCapability(targetComponent.type).category === 'ApplianceLoad' &&
      targetTerminal.conductor === 'live';

    const isRegulatorTarget =
      targetComponent.type === 'fan-dimmer' && targetTerminal.role === 'CONTROL_L';
    const isApplianceSource =
      getComponentCapability(sourceComponent.type).category === 'ApplianceLoad' &&
      sourceTerminal.conductor === 'live';

    return (isRegulatorSource && isApplianceTarget) || (isRegulatorTarget && isApplianceSource);
  },
  validate: ({ sourceComponent, targetComponent, sourceIndex, targetIndex, mode }) => {
    const template = DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.COMPAT_REGULATOR_APPLIANCE];
    return {
      code: DIAGNOSTIC_CODES.COMPAT_REGULATOR_APPLIANCE,
      severity: mode === 'basic' ? 'error' : 'warning',
      sourceComponentId: sourceComponent.id,
      sourceTerminalIndex: sourceIndex,
      targetComponentId: targetComponent.id,
      targetTerminalIndex: targetIndex,
      message: template.message,
      explanation: template.explanation,
      suggestedFix: template.suggestedFix,
      canOverride: true,
    };
  },
};

export const DimmerFanRule: ElectricalRule = {
  id: 'RULE_DIMMER_FAN',
  category: 'component',
  severity: 'error',
  appliesTo: ({ sourceComponent, targetComponent, sourceTerminal, targetTerminal }) => {
    const isDimmerSource =
      sourceComponent.type === 'dimmer-switch' && sourceTerminal.role === 'CONTROL_L';
    const targetCat = getComponentCapability(targetComponent.type).category;
    const isFanOrMotorTarget =
      (targetCat === 'FanLoad' || targetCat === 'MotorLoad') && targetTerminal.conductor === 'live';

    const isDimmerTarget =
      targetComponent.type === 'dimmer-switch' && targetTerminal.role === 'CONTROL_L';
    const sourceCat = getComponentCapability(sourceComponent.type).category;
    const isFanOrMotorSource =
      (sourceCat === 'FanLoad' || sourceCat === 'MotorLoad') && sourceTerminal.conductor === 'live';

    return (isDimmerSource && isFanOrMotorTarget) || (isDimmerTarget && isFanOrMotorSource);
  },
  validate: ({ sourceComponent, targetComponent, sourceIndex, targetIndex, mode }) => {
    const template = DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.COMPAT_DIMMER_FAN];
    return {
      code: DIAGNOSTIC_CODES.COMPAT_DIMMER_FAN,
      severity: mode === 'basic' ? 'error' : 'warning',
      sourceComponentId: sourceComponent.id,
      sourceTerminalIndex: sourceIndex,
      targetComponentId: targetComponent.id,
      targetTerminalIndex: targetIndex,
      message: template.message,
      explanation: template.explanation,
      suggestedFix: template.suggestedFix,
      canOverride: true,
    };
  },
};

export const DimmerSocketRule: ElectricalRule = {
  id: 'RULE_DIMMER_SOCKET',
  category: 'component',
  severity: 'error',
  appliesTo: ({ sourceComponent, targetComponent, sourceTerminal, targetTerminal }) => {
    const isDimmerSource =
      sourceComponent.type === 'dimmer-switch' && sourceTerminal.role === 'CONTROL_L';
    const isSocketTarget =
      getComponentCapability(targetComponent.type).category === 'SocketLoad' &&
      targetTerminal.conductor === 'live';

    const isDimmerTarget =
      targetComponent.type === 'dimmer-switch' && targetTerminal.role === 'CONTROL_L';
    const isSocketSource =
      getComponentCapability(sourceComponent.type).category === 'SocketLoad' &&
      sourceTerminal.conductor === 'live';

    return (isDimmerSource && isSocketTarget) || (isDimmerTarget && isSocketSource);
  },
  validate: ({ sourceComponent, targetComponent, sourceIndex, targetIndex, mode }) => {
    const template = DIAGNOSTIC_TEMPLATES[DIAGNOSTIC_CODES.COMPAT_DIMMER_SOCKET];
    return {
      code: DIAGNOSTIC_CODES.COMPAT_DIMMER_SOCKET,
      severity: mode === 'basic' ? 'error' : 'warning',
      sourceComponentId: sourceComponent.id,
      sourceTerminalIndex: sourceIndex,
      targetComponentId: targetComponent.id,
      targetTerminalIndex: targetIndex,
      message: template.message,
      explanation: template.explanation,
      suggestedFix: template.suggestedFix,
      canOverride: true,
    };
  },
};

export const ControlLoadCompatibilityRule: ElectricalRule = {
  id: 'RULE_CONTROL_LOAD_COMPATIBILITY',
  category: 'component',
  severity: 'error',
  appliesTo: ({ sourceComponent, targetComponent, sourceTerminal, targetTerminal }) => {
    if (sourceTerminal.role === 'CONTROL_L' && targetTerminal.conductor === 'live') {
      const srcCap = getComponentCapability(sourceComponent.type);
      const tgtCap = getComponentCapability(targetComponent.type);
      if (
        srcCap.allowedControlledLoads &&
        !srcCap.allowedControlledLoads.includes(tgtCap.category)
      ) {
        return true;
      }
    }
    if (targetTerminal.role === 'CONTROL_L' && sourceTerminal.conductor === 'live') {
      const tgtCap = getComponentCapability(targetComponent.type);
      const srcCap = getComponentCapability(sourceComponent.type);
      if (
        tgtCap.allowedControlledLoads &&
        !tgtCap.allowedControlledLoads.includes(srcCap.category)
      ) {
        return true;
      }
    }
    return false;
  },
  validate: ({ sourceComponent, targetComponent, sourceIndex, targetIndex, mode }) => ({
    code: DIAGNOSTIC_CODES.COMPAT_INCOMPATIBLE_CONTROL_LOAD,
    severity: mode === 'basic' ? 'error' : 'warning',
    sourceComponentId: sourceComponent.id,
    sourceTerminalIndex: sourceIndex,
    targetComponentId: targetComponent.id,
    targetTerminalIndex: targetIndex,
    message: 'Incompatible controller and load pairing.',
    explanation:
      'The selected control device is not designed to control this category of electrical load.',
    suggestedFix: 'Use a compatible controller suited for this specific load.',
    canOverride: true,
  }),
};

// ─── RULE REGISTRY ────────────────────────────────────────────────────────────

export const ConductorMismatchRule: ElectricalRule = {
  id: 'RULE_CONDUCTOR_MISMATCH',
  category: 'terminal',
  severity: 'error',
  appliesTo: ({ sourceTerminal, targetTerminal }) => {
    if (sourceTerminal.conductor === targetTerminal.conductor) return false;
    // Live + Earth handled by LiveEarthRule
    if (
      (sourceTerminal.conductor === 'live' && targetTerminal.conductor === 'earth') ||
      (sourceTerminal.conductor === 'earth' && targetTerminal.conductor === 'live')
    ) {
      return false;
    }
    // Neutral + Earth handled by NeutralEarthRule
    if (
      (sourceTerminal.conductor === 'neutral' && targetTerminal.conductor === 'earth') ||
      (sourceTerminal.conductor === 'earth' && targetTerminal.conductor === 'neutral')
    ) {
      return false;
    }
    // Direct source Live + Neutral short handled by LiveNeutralDirectShortRule
    return true;
  },
  validate: ({
    sourceComponent,
    targetComponent,
    sourceIndex,
    targetIndex,
    sourceTerminal,
    targetTerminal,
  }) => ({
    code: DIAGNOSTIC_CODES.TERM_VOLTAGE_DOMAIN_MISMATCH,
    severity: 'error',
    sourceComponentId: sourceComponent.id,
    sourceTerminalIndex: sourceIndex,
    targetComponentId: targetComponent.id,
    targetTerminalIndex: targetIndex,
    message: `Port mismatch: ${sourceTerminal.conductor} cannot connect to ${targetTerminal.conductor}.`,
    explanation: `Connecting a ${sourceTerminal.conductor} conductor to a ${targetTerminal.conductor} terminal violates circuit polarity and wiring standards.`,
    suggestedFix: `Connect ${sourceTerminal.conductor} terminals only to matching ${sourceTerminal.conductor} ports.`,
    canOverride: false,
  }),
};

export const ELECTRICAL_RULES: ElectricalRule[] = [
  // Safety & Topology
  SelfLoopRule,
  LiveEarthRule,
  LiveNeutralDirectShortRule,
  NeutralEarthRule,
  ConductorMismatchRule,
  VoltageDomainMismatchRule,

  // Component Specific
  FanRegulatorBulbRule,
  FanRegulatorSocketRule,
  FanRegulatorApplianceRule,
  DimmerFanRule,
  DimmerSocketRule,
  ControlLoadCompatibilityRule,
];
