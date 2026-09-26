/**
 * Comprehensive multi-layer connection validation pipeline for ElectraSim v2.
 *
 * Implements Terminal Validation (Layer 1), Component Validation (Layer 2),
 * and Topology / Safety Validation (Layer 3) with Basic vs Advanced mode awareness.
 */

import { COMPONENT_DEFS } from '../components';
import type { Circuit, ComponentInstance, PortRef } from '../types';
import type { DiagnosticSeverity, ElectricalDiagnostic } from './diagnostics';
import { ELECTRICAL_RULES, type ElectricalRuleContext } from './rules';
import { resolveTerminal } from './terminals';

export interface ValidateConnectionOptions {
  source: PortRef;
  target: PortRef;
  circuit?: Circuit;
  componentsById?: ReadonlyMap<string, ComponentInstance>;
  mode?: 'basic' | 'pro';
  allowOverride?: boolean;
}

export interface ConnectionValidationResult {
  allowed: boolean;
  severity: DiagnosticSeverity;
  diagnostic: ElectricalDiagnostic | null;
  code?: string;
  message: string;
  explanation?: string;
  suggestedFix?: string;
  canOverride?: boolean;
  /**
   * Non-blocking diagnostics that callers may surface to the user when the
   * connection was allowed. Populated whenever `severity === 'warning'`.
   */
  warnings?: ElectricalDiagnostic[];
}

/**
 * Validates a candidate wire connection against the full suite of electrical rules.
 */
export function validateConnection(options: ValidateConnectionOptions): ConnectionValidationResult {
  const { source, target, circuit, mode = 'basic', allowOverride = false } = options;

  let componentsById = options.componentsById;
  if (!componentsById && circuit) {
    componentsById = new Map(circuit.components.map((c) => [c.id, c]));
  }

  // 1. Basic structural checks
  if (source.componentId === target.componentId) {
    return {
      allowed: false,
      severity: 'error',
      code: 'TOPOLOGY_SELF_LOOP',
      message: 'Cannot connect a component to itself.',
      explanation: 'A wire must bridge two different components.',
      suggestedFix: 'Connect to a terminal on another component.',
      diagnostic: null,
      canOverride: false,
    };
  }

  const sourceComp = componentsById?.get(source.componentId);
  const targetComp = componentsById?.get(target.componentId);

  if (!sourceComp || !targetComp) {
    return {
      allowed: false,
      severity: 'error',
      message: 'One or both components were not found on canvas.',
      diagnostic: null,
      canOverride: false,
    };
  }

  const sourceDef = COMPONENT_DEFS[sourceComp.type];
  const targetDef = COMPONENT_DEFS[targetComp.type];

  if (!sourceDef || !targetDef) {
    return {
      allowed: false,
      severity: 'error',
      message: 'Unknown component definition.',
      diagnostic: null,
      canOverride: false,
    };
  }

  if (source.portIndex >= sourceDef.ports.length || target.portIndex >= targetDef.ports.length) {
    return {
      allowed: false,
      severity: 'error',
      message: 'Port index out of range.',
      diagnostic: null,
      canOverride: false,
    };
  }

  // Check duplicate wires if circuit provided
  if (circuit) {
    const isDuplicate = circuit.wires.some(
      (w) =>
        (w.fromComponentId === source.componentId &&
          w.fromPortIndex === source.portIndex &&
          w.toComponentId === target.componentId &&
          w.toPortIndex === target.portIndex) ||
        (w.fromComponentId === target.componentId &&
          w.fromPortIndex === target.portIndex &&
          w.toComponentId === source.componentId &&
          w.toPortIndex === source.portIndex),
    );
    if (isDuplicate) {
      return {
        allowed: false,
        severity: 'info',
        code: 'TOPOLOGY_DUPLICATE_WIRE',
        message: 'A wire already connects these two ports.',
        explanation: 'Redundant duplicate wires are not permitted.',
        diagnostic: null,
        canOverride: false,
      };
    }
  }

  // Resolve terminal metadata
  const sourceTerminal = resolveTerminal(sourceComp.type, source.portIndex);
  const targetTerminal = resolveTerminal(targetComp.type, target.portIndex);

  const context: ElectricalRuleContext = {
    sourceComponent: sourceComp,
    sourceTerminal,
    sourceIndex: source.portIndex,
    targetComponent: targetComp,
    targetTerminal,
    targetIndex: target.portIndex,
    circuit,
    mode,
  };

  // Run all active rules
  for (const rule of ELECTRICAL_RULES) {
    if (rule.appliesTo(context)) {
      const diagnostic = rule.validate(context);
      if (diagnostic) {
        if (diagnostic.severity === 'error') {
          // Hard error in current mode
          // If in pro/advanced mode and canOverride is true and caller provided allowOverride
          if (mode === 'pro' && diagnostic.canOverride && allowOverride) {
            return {
              allowed: true,
              severity: 'warning',
              code: diagnostic.code,
              message: diagnostic.message,
              explanation: diagnostic.explanation,
              suggestedFix: diagnostic.suggestedFix,
              diagnostic,
              canOverride: true,
              warnings: [diagnostic],
            };
          }

          return {
            allowed: false,
            severity: 'error',
            code: diagnostic.code,
            message: diagnostic.message,
            explanation: diagnostic.explanation,
            suggestedFix: diagnostic.suggestedFix,
            diagnostic,
            canOverride: diagnostic.canOverride ?? false,
          };
        }

        if (diagnostic.severity === 'warning') {
          return {
            allowed: true,
            severity: 'warning',
            code: diagnostic.code,
            message: diagnostic.message,
            explanation: diagnostic.explanation,
            suggestedFix: diagnostic.suggestedFix,
            diagnostic,
            canOverride: true,
            warnings: [diagnostic],
          };
        }
      }
    }
  }

  // Default: connection is valid
  return {
    allowed: true,
    severity: 'valid',
    message: 'Valid connection.',
    diagnostic: null,
  };
}

/**
 * Validates all wires in an existing or imported circuit, returning all detected diagnostics.
 */
export function validateCircuitRules(
  circuit: Circuit,
  mode: 'basic' | 'pro' = 'basic',
): ElectricalDiagnostic[] {
  const componentsById = new Map<string, ComponentInstance>(
    circuit.components.map((c) => [c.id, c]),
  );
  const diagnostics: ElectricalDiagnostic[] = [];

  for (const wire of circuit.wires) {
    const sourceComp = componentsById.get(wire.fromComponentId);
    const targetComp = componentsById.get(wire.toComponentId);
    if (!sourceComp || !targetComp) continue;

    const sourceTerminal = resolveTerminal(sourceComp.type, wire.fromPortIndex);
    const targetTerminal = resolveTerminal(targetComp.type, wire.toPortIndex);

    const context: ElectricalRuleContext = {
      sourceComponent: sourceComp,
      sourceTerminal,
      sourceIndex: wire.fromPortIndex,
      targetComponent: targetComp,
      targetTerminal,
      targetIndex: wire.toPortIndex,
      circuit,
      mode,
    };

    for (const rule of ELECTRICAL_RULES) {
      if (rule.appliesTo(context)) {
        const diag = rule.validate(context);
        if (diag) {
          diagnostics.push(diag);
          break;
        }
      }
    }
  }

  return diagnostics;
}
