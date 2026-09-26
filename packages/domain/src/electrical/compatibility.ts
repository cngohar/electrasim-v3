/**
 * Lightweight compatibility preview checks for ElectraSim v2.
 *
 * Designed to execute in <0.1ms per port hover to provide instant visual feedback
 * (valid, warning, invalid) on candidate destination ports during wiring.
 */

import type { ComponentInstance, PortRef } from '../types';
import { getComponentCapability } from './components';
import { resolveTerminal } from './terminals';

export type CompatibilityStatus = 'valid' | 'warning' | 'invalid';

export interface CompatibilityPreviewResult {
  status: CompatibilityStatus;
  message: string;
  code?: string;
  canOverride?: boolean;
}

/**
 * Fast check for port-to-port compatibility during hover / rubber-band drag.
 */
export function checkFastCompatibility(
  source: PortRef,
  target: PortRef,
  componentsById: ReadonlyMap<string, ComponentInstance>,
  mode: 'basic' | 'pro' = 'basic',
): CompatibilityPreviewResult {
  if (source.componentId === target.componentId) {
    return {
      status: 'invalid',
      message: 'Cannot connect a component to itself.',
      code: 'TOPOLOGY_SELF_LOOP',
      canOverride: false,
    };
  }

  const sourceComp = componentsById.get(source.componentId);
  const targetComp = componentsById.get(target.componentId);

  if (!sourceComp || !targetComp) {
    return { status: 'invalid', message: 'Target component not found.' };
  }

  const sourceTerm = resolveTerminal(sourceComp.type, source.portIndex);
  const targetTerm = resolveTerminal(targetComp.type, target.portIndex);

  // 1. Live <-> Earth: Hard safety block
  if (
    (sourceTerm.conductor === 'live' && targetTerm.conductor === 'earth') ||
    (sourceTerm.conductor === 'earth' && targetTerm.conductor === 'live')
  ) {
    return {
      status: 'invalid',
      message: 'Danger: Live cannot connect to Protective Earth.',
      code: 'TERM_LIVE_EARTH',
      canOverride: false,
    };
  }

  // 2. Neutral <-> Earth
  if (
    (sourceTerm.conductor === 'neutral' && targetTerm.conductor === 'earth') ||
    (sourceTerm.conductor === 'earth' && targetTerm.conductor === 'neutral')
  ) {
    return {
      status: mode === 'basic' ? 'invalid' : 'warning',
      message: 'Neutral and Earth must remain separate in subcircuits.',
      code: 'TERM_NEUTRAL_EARTH',
      canOverride: true,
    };
  }

  // 3. Live <-> Neutral between supply sources
  if (
    (sourceTerm.conductor === 'live' && targetTerm.conductor === 'neutral') ||
    (sourceTerm.conductor === 'neutral' && targetTerm.conductor === 'live')
  ) {
    const isSourceToSource =
      sourceTerm.role.startsWith('SUPPLY') && targetTerm.role.startsWith('SUPPLY');
    if (isSourceToSource) {
      return {
        status: 'invalid',
        message: 'Short Circuit: Direct connection between Live and Neutral supplies.',
        code: 'TERM_LIVE_NEUTRAL_SHORT',
        canOverride: false,
      };
    }
  }

  // 4. Fan regulator <-> Lighting Load / Socket
  const isRegulator =
    (sourceComp.type === 'fan-dimmer' && sourceTerm.role === 'CONTROL_L') ||
    (targetComp.type === 'fan-dimmer' && targetTerm.role === 'CONTROL_L');

  if (isRegulator) {
    const otherComp = sourceComp.type === 'fan-dimmer' ? targetComp : sourceComp;
    const otherCap = getComponentCapability(otherComp.type);

    if (otherCap.category === 'LightingLoad') {
      return {
        status: mode === 'basic' ? 'invalid' : 'warning',
        message: 'Fan regulator is not designed to control light bulbs.',
        code: 'COMPAT_REGULATOR_BULB',
        canOverride: true,
      };
    }
    if (otherCap.category === 'SocketLoad') {
      return {
        status: mode === 'basic' ? 'invalid' : 'warning',
        message: 'Fan regulator must not be connected to a socket outlet.',
        code: 'COMPAT_REGULATOR_SOCKET',
        canOverride: true,
      };
    }
  }

  // 5. Light Dimmer <-> Fan Load / Socket
  const isDimmer =
    (sourceComp.type === 'dimmer-switch' && sourceTerm.role === 'CONTROL_L') ||
    (targetComp.type === 'dimmer-switch' && targetTerm.role === 'CONTROL_L');

  if (isDimmer) {
    const otherComp = sourceComp.type === 'dimmer-switch' ? targetComp : sourceComp;
    const otherCap = getComponentCapability(otherComp.type);

    if (otherCap.category === 'FanLoad' || otherCap.category === 'MotorLoad') {
      return {
        status: mode === 'basic' ? 'invalid' : 'warning',
        message: 'Light dimmer switch cannot control inductive fan/motor loads.',
        code: 'COMPAT_DIMMER_FAN',
        canOverride: true,
      };
    }
    if (otherCap.category === 'SocketLoad') {
      return {
        status: mode === 'basic' ? 'invalid' : 'warning',
        message: 'Light dimmer switch must not be connected to a socket outlet.',
        code: 'COMPAT_DIMMER_SOCKET',
        canOverride: true,
      };
    }
  }

  // 6. Voltage domain
  if (
    sourceTerm.voltageDomain !== 'universal' &&
    targetTerm.voltageDomain !== 'universal' &&
    sourceTerm.voltageDomain !== targetTerm.voltageDomain
  ) {
    return {
      status: mode === 'basic' ? 'invalid' : 'warning',
      message: `Voltage domain mismatch (${sourceTerm.voltageDomain} vs ${targetTerm.voltageDomain}).`,
      code: 'TERM_VOLTAGE_DOMAIN_MISMATCH',
      canOverride: true,
    };
  }

  return {
    status: 'valid',
    message: 'Valid connection.',
  };
}
