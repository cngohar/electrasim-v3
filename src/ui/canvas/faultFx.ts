/**
 * faultFx — pure model for the canvas fault-effects system.
 *
 * The Fault Lab (and other injectors: challenges and the
 * context menu) writes faults into the circuit store. This module maps that
 * *model* state to renderable effect descriptors consumed by
 * `FaultFxLayer.tsx`. It is deliberately free of React and DOM APIs so it
 * can be unit-tested cheaply.
 *
 * Design notes
 * ────────────
 * • Nothing here mutates the circuit: an "open" conductor is a *visual*
 *   sever (marked conductor gap) — the wire object stays intact so
 *   clearing the fault restores it perfectly.
 * • Read canonical injected faults as well as legacy mirrors. A terminal
 *   fault anchors on its actual pin; unassessed mappings use cause badges.
 */

import { COMPONENT_DEFS, assessFaultTarget, normalizeCircuitFaults } from '@electrasim/domain';
import type {
  Circuit,
  ComponentInstance,
  FaultType,
  PortType,
  WireInstance,
} from '@electrasim/domain';
import { resolveDeviceModel } from '@electrasim/domain/core/models';

/** Which persistent canvas indicator a fault kind uses. */
export type FaultFxIndicator =
  | 'sever' // marked gap in the conductor
  | 'flame' // fire + red pulsing halo (short circuit)
  | 'swap' // conductor identity swap recolour + crossover arc
  | 'earth' // leakage bolt + expanding earth pulse rings
  | 'wave' // drifting smooth-DC waveform
  | 'arc' // white-hot stuttering series arc
  | 'bridge' // bypass bridge drawn across a protective device
  | 'jam' // shaking jammed lever + padlock (protection stuck open)
  | 'badge'; // generic fallback chip

export interface FaultFxConfig {
  /** Accent colour for chips, glows and overlay strokes. */
  color: string;
  /** Short badge code drawn on the canvas chip (e.g. 'SC'). */
  code: string;
  /** Accessible label. */
  label: string;
  indicator: FaultFxIndicator;
}

const DEFAULT_FX: FaultFxConfig = {
  color: '#ef4444',
  code: 'FX',
  label: 'Fault',
  indicator: 'badge',
};

/**
 * Look-and-feel per fault kind. Colours stay in sync with the component-node
 * fault ring palette so the canvas reads as one system.
 */
export const FAULT_FX: Record<string, FaultFxConfig> = {
  'short-circuit': { color: '#ef4444', code: 'SC', label: 'Short circuit', indicator: 'badge' },
  'open-circuit': { color: '#dc2626', code: 'OC', label: 'Open circuit', indicator: 'sever' },
  'open-neutral': { color: '#2563eb', code: 'ON', label: 'Open neutral', indicator: 'sever' },
  'open-live': { color: '#b91c1c', code: 'OL', label: 'Open live', indicator: 'sever' },
  'open-earth': { color: '#ca8a04', code: 'OE', label: 'Open earth', indicator: 'sever' },
  'terminal-disconnect': {
    color: '#b91c1c',
    code: 'TD',
    label: 'Terminal disconnect',
    indicator: 'sever',
  },
  'reverse-polarity': {
    color: '#f97316',
    code: 'RP',
    label: 'Reverse polarity',
    indicator: 'swap',
  },
  'switched-neutral': {
    color: '#f59e0b',
    code: 'SN',
    label: 'Switched neutral',
    indicator: 'badge',
  },
  'earth-fault': { color: '#eab308', code: 'EF', label: 'Earth fault', indicator: 'earth' },
  'live-to-earth': { color: '#ca8a04', code: 'LE', label: 'Live to earth', indicator: 'earth' },
  'smooth-dc-residual': {
    color: '#8b5cf6',
    code: 'DC',
    label: 'Smooth DC residual',
    indicator: 'badge',
  },
  'arc-fault': { color: '#dc2626', code: 'AF', label: 'Arc fault', indicator: 'badge' },
  'protection-bypass': {
    color: '#f97316',
    code: 'BYP',
    label: 'Protection bypass',
    indicator: 'bridge',
  },
  'protection-forced-open': {
    color: '#a16207',
    code: 'JAM',
    label: 'Protection jammed open',
    indicator: 'jam',
  },
};

export function faultFxConfig(fault: FaultType | string): FaultFxConfig {
  return FAULT_FX[fault] ?? DEFAULT_FX;
}

/** A wire touching the faulted component, with the conductor role at that end. */
export interface FaultFxWireTouch {
  id: string;
  end: 'from' | 'to';
  portType: PortType | null;
  portIndex: number;
}

export interface FaultFxItem {
  /** Stable identity includes the exact component, wire or terminal target. */
  key: string;
  fault: FaultType;
  config: FaultFxConfig;
  indicator: FaultFxIndicator;
  /** Anchor component (component-level faults). */
  componentId?: string;
  /** Exact terminal on the anchor component, when the cause targets a port. */
  portIndex?: number;
  /** Anchor wire (wire-level faults). */
  wireId?: string;
  /** Wires to visually sever (open faults). */
  severWireIds: string[];
  /** Component open disables internal branches, not its attached cables. */
  internalOpen?: boolean;
  /** Wires whose rendered conductor identity swaps for a declared L/N pair. */
  swapWires: { id: string; as: PortType }[];
  /** Declared protective contact poles; never guessed from pin placement. */
  bridgePortPairs?: { from: number; to: number }[];
}

/**
 * Every wire attached to `componentId`, annotated with which end of the wire
 * the component sits on and the port role at that end.
 */
export function wiresAttachedTo(
  wires: readonly WireInstance[],
  componentsById: ReadonlyMap<string, ComponentInstance>,
  componentId: string,
): FaultFxWireTouch[] {
  const comp = componentsById.get(componentId);
  const def = comp ? COMPONENT_DEFS[comp.type] : undefined;
  const touches: FaultFxWireTouch[] = [];
  for (const wire of wires) {
    if (wire.fromComponentId === componentId) {
      touches.push({
        id: wire.id,
        end: 'from',
        portType: def?.ports[wire.fromPortIndex]?.type ?? null,
        portIndex: wire.fromPortIndex,
      });
    } else if (wire.toComponentId === componentId) {
      touches.push({
        id: wire.id,
        end: 'to',
        portType: def?.ports[wire.toPortIndex]?.type ?? null,
        portIndex: wire.toPortIndex,
      });
    }
  }
  return touches;
}

/** Which wires an "open …" fault on a component visually severs. */
function severWiresFor(fault: FaultType, touches: FaultFxWireTouch[]): string[] {
  if (touches.length === 0) return [];
  const role =
    fault === 'open-live'
      ? 'live'
      : fault === 'open-neutral'
        ? 'neutral'
        : fault === 'open-earth'
          ? 'earth'
          : null;
  if (role) return touches.filter((touch) => touch.portType === role).map((touch) => touch.id);
  return touches.map((t) => t.id);
}

/**
 * Which identity each attached wire should render after an L↔N swap.
 *
 * Only a declared live/neutral mapping may recolor attached runs.
 */
function swapWiresFor(touches: FaultFxWireTouch[]): { id: string; as: PortType }[] {
  const typed = touches.filter((t) => t.portType === 'live' || t.portType === 'neutral');
  const hasMixedRoles =
    typed.some((t) => t.portType === 'live') && typed.some((t) => t.portType === 'neutral');
  if (hasMixedRoles) {
    return typed.map((t) => ({ id: t.id, as: t.portType === 'live' ? 'neutral' : 'live' }));
  }
  return [];
}

/**
 * Translate the circuit's fault state into canvas effect descriptors.
 * Geometry (midpoints, angles, paths) is resolved by the layer at render
 * time so item identity stays stable across pan/drag.
 */
export function collectFaultFx(
  circuit: Circuit,
  componentsById: ReadonlyMap<string, ComponentInstance>,
): FaultFxItem[] {
  const items: FaultFxItem[] = [];
  for (const cause of normalizeCircuitFaults(circuit)) {
    if (cause.resolved) continue;
    const { type: fault, target } = cause;
    const config = faultFxConfig(fault);
    const coverage = assessFaultTarget(circuit, fault, target).coverage;
    const componentId =
      target.type === 'port'
        ? target.componentId
        : target.type === 'component'
          ? target.id
          : undefined;
    const component = componentId ? componentsById.get(componentId) : undefined;
    if (componentId && !component) continue;
    if (target.type === 'wire' && !circuit.wires.some((wire) => wire.id === target.id)) continue;
    if (
      target.type === 'port' &&
      (!component || !COMPONENT_DEFS[component.type]?.ports[target.portIndex])
    )
      continue;
    const touches = componentId ? wiresAttachedTo(circuit.wires, componentsById, componentId) : [];
    const targetedTouches =
      target.type === 'port'
        ? touches.filter((touch) => touch.portIndex === target.portIndex)
        : touches;
    const item: FaultFxItem = {
      key:
        target.type === 'port'
          ? `port:${target.componentId}:${target.portIndex}:${fault}`
          : `${target.type === 'component' ? 'comp' : 'wire'}:${target.id}:${fault}`,
      fault,
      config,
      indicator: coverage === 'supported' ? config.indicator : 'badge',
      componentId,
      portIndex: target.type === 'port' ? target.portIndex : undefined,
      wireId: target.type === 'wire' ? target.id : undefined,
      severWireIds: [],
      swapWires: [],
    };
    if (item.indicator === 'sever') {
      item.internalOpen = target.type === 'component' && fault === 'open-circuit';
      item.severWireIds = item.internalOpen
        ? []
        : target.type === 'port'
          ? targetedTouches.map((touch) => touch.id)
          : severWiresFor(fault, touches);
    } else if (item.indicator === 'swap') {
      item.swapWires = swapWiresFor(touches);
    }
    if (item.indicator === 'bridge' && component) {
      const model = resolveDeviceModel(component, COMPONENT_DEFS[component.type]!, circuit);
      if (model.kind === 'contacts')
        item.bridgePortPairs = model.poles.map((pole) => ({ from: pole.common, to: pole.no }));
    }
    items.push(item);
  }

  return items;
}

/** Wire ids whose rendered stroke should be dimmed (component-level severs). */
export function severedWireIdSet(items: readonly FaultFxItem[]): Set<string> {
  const set = new Set<string>();
  for (const item of items) {
    if (item.portIndex !== undefined) continue;
    for (const id of item.severWireIds) set.add(id);
  }
  return set;
}

/**
 * Signature of the circuit's fault state — memo key so per-frame sim ticks
 * don't recompute descriptors.
 */
export function faultFxSignature(circuit: Circuit): string {
  const compPart = circuit.components
    .map((c) => (c.state?.fault ? `${c.id}:${c.state.fault}` : ''))
    .join(',');
  const wirePart = circuit.wires
    .map((w) => `${w.id}:${w.fault ?? ''}:${w.fromPortIndex}:${w.toPortIndex}`)
    .join(',');
  const explicit = (circuit.faults ?? [])
    .map(
      (fault) =>
        `${fault.id}:${fault.type}:${JSON.stringify(fault.target)}:${Boolean(fault.resolved)}`,
    )
    .join(',');
  return `${compPart}|${wirePart}|${explicit}`;
}
