/**
 * Challenge rules (plan §6, §8).
 *
 * Each rule answers ONE concrete question about the learner's circuit, in
 * plain English, judged against the real circuit model. Connection rules use
 * the wiring graph; functional rules run the REAL simulator with evidence
 * states (plan §8 "Interaction Evidence": static topology alone is not
 * sufficient to prove momentary behaviour).
 *
 * Verdicts: pass / incomplete (build it) / fail (contradictory or unsafe).
 */

import { COMPONENT_DEFS } from '../../components';
import { simulate } from '../../simulation';
import type { Circuit, FaultType } from '../../types';
import {
  type CircuitGraph,
  componentsOfType,
  hasDirectConnection,
  hasRailPath,
  hasRailPathExclusivelyThrough,
} from './graph';

export type RuleVerdict = 'pass' | 'incomplete' | 'fail';

/** A concrete canvas target attached to a validation result. */
export interface RuleTarget {
  kind: 'component' | 'wire';
  id: string;
  /** Optional terminal on a component target. */
  portIndex?: number;
}

export interface RuleEvaluation {
  verdict: RuleVerdict;
  /** Human reason when not passing. */
  reason?: string;
  /** Components/wires the UI can focus when this rule is selected. */
  targets?: RuleTarget[];
  /** Component types the learner should pick from the palette when missing. */
  paletteTypes?: string[];
}

export interface RuleResult extends RuleEvaluation {
  /** Stable rule key — never a raw component id (plan §9). */
  id: string;
  /** The concrete question, answered in plain English. */
  label: string;
}

export interface RuleContext {
  graph: CircuitGraph;
  circuit: Circuit;
  starter: Circuit;
}

export interface Rule {
  id: string;
  label: string;
  evaluate: (ctx: RuleContext) => RuleResult;
}

function rule(id: string, label: string, evaluate: (ctx: RuleContext) => RuleEvaluation): Rule {
  return { id, label, evaluate: (ctx) => ({ id, label, ...evaluate(ctx) }) };
}

/** Build a circuit variant with the given momentary presses applied. */
function withPresses(circuit: Circuit, pressedTypes: ReadonlySet<string>): Circuit {
  return {
    ...circuit,
    components: circuit.components.map((component) => {
      if (!pressedTypes.has(component.type)) return component;
      if (!COMPONENT_DEFS[component.type]?.isMomentary) return component;
      return { ...component, state: { ...component.state, on: true } };
    }),
  };
}

/** Energised count of `loadType` under the given presses, via the real engine. */
function energisedCount(
  circuit: Circuit,
  loadType: string,
  pressedTypes: ReadonlySet<string>,
): number {
  const evidence = withPresses(circuit, pressedTypes);
  const result = simulate(evidence, { appMode: 'pro' });
  const energised = result.energizedComponents;
  return circuit.components.filter(
    (component) => component.type === loadType && energised.has(component.id),
  ).length;
}

function componentTargets(ctx: RuleContext, type: string): RuleTarget[] {
  return componentsOfType(ctx.graph, type).map((component) => ({
    kind: 'component',
    id: component.id,
  }));
}

function portIndexForRail(
  type: string,
  rail: ConnectionRuleOptions['rail'],
  side: 'from' | 'to',
): number | undefined {
  const ports = COMPONENT_DEFS[type]?.ports ?? [];
  const matches = ports
    .map((port, index) => (port.type === rail ? index : -1))
    .filter((index) => index >= 0);
  if (matches.length === 0) return undefined;
  return side === 'from' ? matches[matches.length - 1] : matches[0];
}

function connectionTargets(ctx: RuleContext, options: ConnectionRuleOptions): RuleTarget[] {
  const targets: RuleTarget[] = [];
  const fromPort = portIndexForRail(options.fromType, options.rail, 'from');
  const toPort = portIndexForRail(options.toType, options.rail, 'to');
  for (const component of componentsOfType(ctx.graph, options.fromType)) {
    targets.push({ kind: 'component', id: component.id, portIndex: fromPort });
  }
  for (const component of componentsOfType(ctx.graph, options.toType)) {
    targets.push({ kind: 'component', id: component.id, portIndex: toPort });
  }
  return targets;
}

// ── Component rules ────────────────────────────────────────────────────────

/** `count` instances of a type must exist (plan §8 requiredComponent). */
export function requiredComponent(type: string, name: string, count = 1): Rule {
  return rule(
    `required-${type}`,
    `Place ${count === 1 ? 'a' : count} ${name}${count === 1 ? '' : 's'}`,
    (ctx) => {
      const present = componentsOfType(ctx.graph, type).length;
      const targets = componentTargets(ctx, type);
      if (present >= count) return { verdict: 'pass', targets };
      return {
        verdict: 'incomplete',
        reason:
          present === 0
            ? `No ${name} on the canvas yet.`
            : `Need ${count} ${name}s — you have ${present}.`,
        targets,
        paletteTypes: [type],
      };
    },
  );
}

/** A component type that must NOT appear (plan §20 extra components). */
export function forbiddenComponent(type: string, name: string): Rule {
  return rule(`forbidden-${type}`, `No ${name} in the circuit`, (ctx) => {
    const targets = componentTargets(ctx, type);
    const present = targets.length;
    if (present === 0) return { verdict: 'pass' };
    return {
      verdict: 'fail',
      reason: `Remove ${present} ${name}${present === 1 ? '' : 's'} — they are not part of this circuit.`,
      targets,
    };
  });
}

/** Every instance of a type must carry the given state (plan §8 componentState). */
export function componentState(
  type: string,
  state: Record<string, unknown>,
  name: string,
  stateDescription: string,
): Rule {
  const key = Object.entries(state)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join('&');
  return rule(`state-${type}-${key}`, `${name} is ${stateDescription}`, (ctx) => {
    const instances = componentsOfType(ctx.graph, type);
    const targets = componentTargets(ctx, type);
    if (instances.length === 0) {
      return {
        verdict: 'incomplete',
        reason: `No ${name} on the canvas yet.`,
        targets,
        paletteTypes: [type],
      };
    }
    const ok = instances.every((instance) =>
      Object.entries(state).every(
        ([stateKey, value]) => instance.state[stateKey as keyof typeof instance.state] === value,
      ),
    );
    if (ok) return { verdict: 'pass', targets };
    return {
      verdict: 'incomplete',
      reason: `Set the ${name} to ${stateDescription}.`,
      targets,
    };
  });
}

// ── Connection rules ───────────────────────────────────────────────────────

export interface ConnectionRuleOptions {
  fromType: string;
  toType: string;
  rail: 'live' | 'neutral' | 'earth';
  /** Plain description of the join, e.g. "Live reaches the switch". */
  label: string;
  /** Direct wire (plan §8 directConnection) instead of a rail path. */
  direct?: boolean;
}

/** A rail must connect two component types (plan §8 conductorPath / directConnection). */
export function connectionRule(options: ConnectionRuleOptions): Rule {
  const id = `${options.direct ? 'direct' : 'path'}-${options.rail}-${options.fromType}-${options.toType}`;
  return rule(id, options.label, (ctx) => {
    const found = options.direct
      ? hasDirectConnection(ctx.graph, options.rail, options.fromType, options.toType)
      : hasRailPath(ctx.graph, options.rail, options.fromType, options.toType);
    const targets = connectionTargets(ctx, options);
    if (found) return { verdict: 'pass', targets };
    return {
      verdict: 'incomplete',
      reason: `No ${options.rail} path from ${options.fromType} to ${options.toType} yet.`,
      targets,
      paletteTypes: [options.fromType, options.toType].filter(
        (type, index, all) =>
          !componentsOfType(ctx.graph, type).length && all.indexOf(type) === index,
      ),
    };
  });
}

/** Every path from `fromType` to `toType` must run through `throughType`. */
export function pathExclusivelyThrough(
  rail: 'live' | 'neutral' | 'earth',
  fromType: string,
  toType: string,
  throughType: string,
  label: string,
): Rule {
  const id = `exclusive-${rail}-${fromType}-${throughType}-${toType}`;
  return rule(id, label, (ctx) => {
    const targets = [
      ...componentTargets(ctx, fromType),
      ...componentTargets(ctx, throughType),
      ...componentTargets(ctx, toType),
    ];
    if (hasRailPathExclusivelyThrough(ctx.graph, rail, fromType, toType, throughType)) {
      return { verdict: 'pass', targets };
    }
    return {
      verdict: 'fail',
      reason: `The ${rail} path to the ${toType} must run through the ${throughType} — a bypass exists.`,
      targets,
      paletteTypes: [fromType, throughType, toType].filter(
        (type, index, all) =>
          !componentsOfType(ctx.graph, type).length && all.indexOf(type) === index,
      ),
    };
  });
}

// ── Functional rules ───────────────────────────────────────────────────────

/**
 * Behaviour topology cannot prove (plan §8 "Interaction Evidence"). Runs the
 * real simulator with the given momentary types pressed and asserts how many
 * of `loadType` are energised. `count: 0` asserts de-energisation.
 */
export function energisedWhile(
  loadType: string,
  loadName: string,
  options: {
    /** Momentary types held pressed during the evidence simulation. */
    pressedTypes?: readonly string[];
    /** Expected energised count (default: all instances). */
    count?: number;
  } = {},
): Rule {
  const pressed = new Set(options.pressedTypes ?? []);
  const suffix = pressed.size > 0 ? `-${[...pressed].sort().join('+')}` : '-rest';
  const expected = options.count ?? 'all';
  const label =
    options.count === 0
      ? `${loadName} stays off when nothing is pressed`
      : `${loadName} energises while ${[...pressed].join(' + ') || 'the circuit is closed'}`;
  return rule(`energised-${loadType}${suffix}`, label, (ctx) => {
    const targets = componentTargets(ctx, loadType);
    const total = targets.length;
    if (total === 0) {
      return {
        verdict: 'incomplete',
        reason: `No ${loadName} on the canvas yet.`,
        targets,
        paletteTypes: [loadType],
      };
    }
    const live = energisedCount(ctx.circuit, loadType, pressed);
    const needed = expected === 'all' ? total : Math.min(expected, total);
    if (options.count === 0) {
      if (live === 0) return { verdict: 'pass', targets };
      return {
        verdict: 'fail',
        reason: `${loadName} stays on when nothing is pressed — the live path must run through a momentary switch.`,
        targets,
      };
    }
    if (live >= needed) return { verdict: 'pass', targets };
    return {
      verdict: 'incomplete',
      reason: `${loadName} is not energised — check the live and neutral paths.`,
      targets,
    };
  });
}

// ── Fault rules ────────────────────────────────────────────────────────────

/** A specific fault kind must be absent everywhere (plan §8 faultAbsent). */
export function faultAbsent(kind: FaultType, description: string): Rule {
  return rule(`fault-absent-${kind}`, description, (ctx) => {
    if (!activeFaultKinds(ctx.circuit).has(kind)) return { verdict: 'pass' };
    const targets: RuleTarget[] = [];
    for (const component of ctx.circuit.components) {
      if (component.state.fault === kind) {
        targets.push({ kind: 'component', id: component.id });
      }
    }
    for (const wire of ctx.circuit.wires) {
      if (wire.fault === kind) targets.push({ kind: 'wire', id: wire.id });
    }
    for (const fault of ctx.circuit.faults ?? []) {
      if (fault.type !== kind) continue;
      if (fault.target.type === 'wire') targets.push({ kind: 'wire', id: fault.target.id });
      else if (fault.target.type === 'component') {
        targets.push({ kind: 'component', id: fault.target.id });
      } else {
        targets.push({
          kind: 'component',
          id: fault.target.componentId,
          portIndex: fault.target.portIndex,
        });
      }
    }
    return {
      verdict: 'fail',
      reason: 'The fault is still present — clear it and check again.',
      targets,
    };
  });
}

function activeFaultKinds(circuit: Circuit): Set<FaultType> {
  const kinds = new Set<FaultType>();
  for (const fault of circuit.faults ?? []) kinds.add(fault.type);
  for (const component of circuit.components) {
    const fault = component.state?.fault as FaultType | undefined;
    if (fault) kinds.add(fault);
  }
  for (const wire of circuit.wires) {
    if (wire.fault) kinds.add(wire.fault as FaultType);
  }
  return kinds;
}
