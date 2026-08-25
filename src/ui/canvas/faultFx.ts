/**
 * faultFx — pure model for the canvas fault-effects system.
 *
 * The Fault Lab (and every auto-injector: Diagnosis Lab, challenges, the
 * context menu) writes faults into the circuit store. This module maps that
 * *model* state to renderable effect descriptors consumed by
 * `FaultFxLayer.tsx`. It is deliberately free of React and DOM APIs so it
 * can be unit-tested cheaply.
 *
 * Design notes
 * ────────────
 * • Nothing here mutates the circuit: an "open" conductor is a *visual*
 *   sever (fade-out gap + sparking ends) — the wire object stays intact so
 *   clearing the fault restores it perfectly.
 * • 'switched-neutral' / 'reverse-polarity' are conductor-*identity* swaps,
 *   not re-wiring. Ports never change mates (the connection solver still
 *   forbids live→neutral); only the rendered colour of the attached runs
 *   swaps, which is exactly what the physical mis-wiring looks like.
 */

import { COMPONENT_DEFS } from '../../domain';
import type { Circuit, ComponentInstance, FaultType, PortType, WireInstance } from '../../domain';

/** Which persistent canvas indicator a fault kind uses. */
export type FaultFxIndicator =
  | 'sever' // conductor fade-out gap + sparking exposed ends
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
  'short-circuit': { color: '#ef4444', code: 'SC', label: 'Short circuit', indicator: 'flame' },
  'open-circuit': { color: '#dc2626', code: 'OC', label: 'Open circuit', indicator: 'sever' },
  'open-neutral': { color: '#2563eb', code: 'ON', label: 'Open neutral', indicator: 'sever' },
  'open-live': { color: '#b91c1c', code: 'OL', label: 'Open live', indicator: 'sever' },
  'open-earth': { color: '#ca8a04', code: 'OE', label: 'Open earth', indicator: 'badge' },
  'terminal-disconnect': {
    color: '#b91c1c',
    code: 'TD',
    label: 'Terminal disconnect',
    indicator: 'badge',
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
    indicator: 'swap',
  },
  'earth-fault': { color: '#eab308', code: 'EF', label: 'Earth fault', indicator: 'earth' },
  'live-to-earth': { color: '#ca8a04', code: 'LE', label: 'Live to earth', indicator: 'earth' },
  'smooth-dc-residual': {
    color: '#8b5cf6',
    code: 'DC',
    label: 'Smooth DC residual',
    indicator: 'wave',
  },
  'arc-fault': { color: '#dc2626', code: 'AF', label: 'Arc fault', indicator: 'arc' },
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
}

export interface FaultFxItem {
  /** Stable identity: `comp:<id>:<fault>` or `wire:<id>:<fault>`. */
  key: string;
  fault: FaultType;
  config: FaultFxConfig;
  indicator: FaultFxIndicator;
  /** Anchor component (component-level faults). */
  componentId?: string;
  /** Anchor wire (wire-level faults). */
  wireId?: string;
  /** Wires to visually sever (open faults). */
  severWireIds: string[];
  /** Wires whose rendered conductor identity swaps (reverse-polarity / switched-neutral). */
  swapWires: { id: string; as: PortType }[];
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
      });
    } else if (wire.toComponentId === componentId) {
      touches.push({
        id: wire.id,
        end: 'to',
        portType: def?.ports[wire.toPortIndex]?.type ?? null,
      });
    }
  }
  return touches;
}

/** Which wires an "open …" fault on a component visually severs. */
function severWiresFor(fault: FaultType, touches: FaultFxWireTouch[]): string[] {
  if (touches.length === 0) return [];
  if (fault === 'open-neutral') {
    const neutral = touches.filter((t) => t.portType === 'neutral').map((t) => t.id);
    if (neutral.length > 0) return neutral;
  }
  if (fault === 'open-live') {
    const live = touches.filter((t) => t.portType === 'live').map((t) => t.id);
    if (live.length > 0) return live;
  }
  return touches.map((t) => t.id);
}

/**
 * Which identity each attached wire should render after an L↔N swap.
 *
 * When the device's ports carry explicit roles (a load with L/N terminals)
 * the swap is literal: live-coloured runs render neutral and vice-versa.
 * When the device is a series switch (both ports live-typed, so no legal
 * neutral mate exists — this is exactly why a switched-neutral install is
 * wrong) the two runs exchange identities between themselves instead of
 * re-mating ports: the supply-side run renders neutral and the load-side
 * run renders live. Deterministic by wire id so the swap never flickers
 * between renders.
 */
function swapWiresFor(
  touches: FaultFxWireTouch[],
  wiresById: ReadonlyMap<string, WireInstance>,
): { id: string; as: PortType }[] {
  const typed = touches.filter((t) => t.portType === 'live' || t.portType === 'neutral');
  const hasMixedRoles =
    typed.some((t) => t.portType === 'live') && typed.some((t) => t.portType === 'neutral');
  if (hasMixedRoles) {
    return typed.map((t) => ({ id: t.id, as: t.portType === 'live' ? 'neutral' : 'live' }));
  }
  const series = [...touches].sort((a, b) => a.id.localeCompare(b.id)).slice(0, 2);
  if (series.length < 2) return [];
  const asRoles: PortType[] = ['neutral', 'live'];
  return series
    .map((t, i) => (wiresById.has(t.id) ? { id: t.id, as: asRoles[i] ?? 'neutral' } : null))
    .filter((x): x is { id: string; as: PortType } => x !== null);
}

/**
 * Translate the circuit's fault state into canvas effect descriptors.
 * Geometry (midpoints, angles, paths) is resolved by the layer at render
 * time so item identity stays stable across pan/drag.
 */
export function collectFaultFx(
  circuit: Pick<Circuit, 'components' | 'wires'>,
  componentsById: ReadonlyMap<string, ComponentInstance>,
): FaultFxItem[] {
  const items: FaultFxItem[] = [];
  const wiresById = new Map(circuit.wires.map((w) => [w.id, w]));

  for (const comp of circuit.components) {
    const fault = comp.state?.fault;
    if (!fault) continue;
    const config = faultFxConfig(fault);
    const touches = wiresAttachedTo(circuit.wires, componentsById, comp.id);
    const item: FaultFxItem = {
      key: `comp:${comp.id}:${fault}`,
      fault,
      config,
      indicator: config.indicator,
      componentId: comp.id,
      severWireIds: [],
      swapWires: [],
    };
    if (config.indicator === 'sever') {
      item.severWireIds = severWiresFor(fault, touches);
    } else if (config.indicator === 'swap') {
      item.swapWires = swapWiresFor(touches, wiresById);
    }
    items.push(item);
  }

  for (const wire of circuit.wires) {
    if (!wire.fault) continue;
    const config = faultFxConfig(wire.fault);
    items.push({
      key: `wire:${wire.id}:${wire.fault}`,
      fault: wire.fault,
      config,
      indicator: config.indicator,
      wireId: wire.id,
      severWireIds: [],
      swapWires: [],
    });
  }

  return items;
}

/** Wire ids whose rendered stroke should be dimmed (component-level severs). */
export function severedWireIdSet(items: readonly FaultFxItem[]): Set<string> {
  const set = new Set<string>();
  for (const item of items) {
    for (const id of item.severWireIds) set.add(id);
  }
  return set;
}

/**
 * Signature of the circuit's fault state — memo key so per-frame sim ticks
 * don't recompute descriptors.
 */
export function faultFxSignature(circuit: Pick<Circuit, 'components' | 'wires'>): string {
  const compPart = circuit.components
    .map((c) => (c.state?.fault ? `${c.id}:${c.state.fault}` : ''))
    .join(',');
  const wirePart = circuit.wires
    .map((w) => `${w.id}:${w.fault ?? ''}:${w.fromPortIndex}:${w.toPortIndex}`)
    .join(',');
  return `${compPart}|${wirePart}`;
}
