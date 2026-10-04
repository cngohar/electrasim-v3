/**
 * Explicit time, control and protection layer for Phase 1.5D.
 *
 * The MNA solver remains a pure steady-state solve. This module owns the
 * state machine around it: controls are advanced from declared inputs, the
 * accepted branch/pole currents are passed through bounded device curves, and
 * an event causes a second solve so post-trip values cannot describe the
 * pre-trip circuit. Nothing in this module mutates a saved Circuit.
 */

import { instanceLabel } from '../componentLabel';
import { COMPONENT_DEFS } from '../components';
import type {
  ElectricalEventKind,
  ElectricalSimulationEvent,
  ElectricalSimulationState,
  TransientProtectionState,
} from '../core/contracts';
import {
  isArcFaultDevice,
  isFuseDevice,
  isOvercurrentDevice,
  isResidualDevice,
} from '../protectionRoles';
import type { Circuit, ComponentDef, ComponentInstance, SimulationResult } from '../types';
import { resolveCoils } from './coils';
import { connectedNetworkComponents, findProtectionDevicesInNetwork } from './faultPropagation';
import { indexCircuit } from './indexing';
import { type SimulateOptions, simulate } from './simulate';
import { calculateFuseTrip, calculateMCBTrip, calculateRCDTrip } from './tripCurves';

export const TIMED_MODEL_VERSION = '1.5d.1.0' as const;

export interface TimedTransition {
  timeSeconds: number;
  closed: boolean;
}

export type TimedControl =
  | { kind: 'schedule'; transitions: readonly TimedTransition[] }
  | {
      kind: 'countdown';
      durationSeconds: number;
      triggerAtSeconds?: number;
      initiallyClosed?: boolean;
    }
  | {
      kind: 'staircase';
      durationSeconds: number;
      triggerAtSeconds?: readonly number[];
      initiallyClosed?: boolean;
    }
  | {
      kind: 'delay';
      onDelaySeconds: number;
      offDelaySeconds?: number;
      triggerAtSeconds?: readonly number[];
      initiallyClosed?: boolean;
    }
  | { kind: 'manual'; closed: boolean }
  | {
      kind: 'dimmer';
      level: number;
      transitions?: readonly { timeSeconds: number; level: number }[];
    };

export type TimedInputEvent =
  | { type: 'trigger'; componentId: string; timeSeconds?: number }
  | { type: 'set-contact'; componentId: string; closed: boolean; timeSeconds?: number }
  | { type: 'set-dimmer'; componentId: string; level: number; timeSeconds?: number }
  | { type: 'reset-control'; componentId: string; timeSeconds?: number }
  | { type: 'repair'; componentId?: string; wireId?: string; timeSeconds?: number };

export interface TimedSimulationOptions extends SimulateOptions {
  state?: ElectricalSimulationState;
  /** Seconds to advance. Zero performs a deterministic solve without advancing. */
  deltaSeconds?: number;
  controls?: Readonly<Record<string, TimedControl>>;
  /** External button presses, contact commands and repair actions. */
  inputEvents?: readonly TimedInputEvent[];
  /** Alias accepted by callers that already use `events` for input commands. */
  controlEvents?: readonly TimedInputEvent[];
}

export interface TimedReplay {
  states: ElectricalSimulationState[];
  results: SimulationResult[];
  events: ElectricalSimulationEvent[];
}

const EPSILON = 1e-9;
const CABLE_DAMAGE_THRESHOLD = 10;
const MAX_STEP_SECONDS = 86_400;

function finiteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > MAX_STEP_SECONDS)
    throw new Error(`${label} must be finite and between 0 and ${MAX_STEP_SECONDS} seconds.`);
  return value;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function defaultContact(component: ComponentInstance, defs: Record<string, ComponentDef>): boolean {
  return component.state.on ?? defs[component.type]?.defaultOn ?? false;
}

function initialProtection(component: ComponentInstance): TransientProtectionState {
  if (component.state.isBlown) return 'blown';
  if (component.state.isTripped) return 'tripped';
  return 'closed';
}

/** Create a fresh, serialisable state without deriving history from a clock. */
export function createSimulationState(
  circuit: Circuit,
  options: Pick<TimedSimulationOptions, 'defs'> = {},
): ElectricalSimulationState {
  const defs = options.defs ?? COMPONENT_DEFS;
  const contactStates: Record<string, boolean> = {};
  const protectionStates: Record<string, TransientProtectionState> = {};
  const dimmerLevels: Record<string, number> = {};
  for (const component of circuit.components) {
    contactStates[component.id] = defaultContact(component, defs);
    if (defs[component.type]?.isProtection)
      protectionStates[component.id] = initialProtection(component);
    if (defs[component.type]?.isDimmer)
      dimmerLevels[component.id] = clamp01(
        component.state.speed === undefined
          ? 1
          : component.state.speed > 1
            ? component.state.speed / 10
            : component.state.speed,
      );
  }
  return {
    modelVersion: TIMED_MODEL_VERSION,
    elapsedSeconds: 0,
    contactStates,
    protectionStates,
    protectionElapsedSeconds: {},
    cableDamageProgress: {},
    openWires: [],
    controlTriggers: {},
    dimmerLevels,
    coilStates: {},
  };
}

function copyState(state: ElectricalSimulationState): ElectricalSimulationState {
  return {
    modelVersion: TIMED_MODEL_VERSION,
    elapsedSeconds: state.elapsedSeconds,
    contactStates: { ...state.contactStates },
    protectionStates: { ...state.protectionStates },
    protectionElapsedSeconds: { ...state.protectionElapsedSeconds },
    cableDamageProgress: { ...state.cableDamageProgress },
    openWires: [...new Set(state.openWires)].sort(),
    controlTriggers: { ...state.controlTriggers },
    dimmerLevels: { ...state.dimmerLevels },
    coilStates: { ...state.coilStates },
  };
}

function eventId(
  timeSeconds: number,
  sequence: number,
  kind: ElectricalEventKind,
  subject: string,
): string {
  return `${TIMED_MODEL_VERSION}:${timeSeconds.toFixed(6)}:${sequence}:${kind}:${subject}`;
}

function sortedInputs(
  events: readonly TimedInputEvent[],
  start: number,
  end: number,
): TimedInputEvent[] {
  return events
    .filter((event) => {
      const time = event.timeSeconds ?? end;
      return time >= start - EPSILON && time <= end + EPSILON;
    })
    .slice()
    .sort((a, b) => {
      const time = (a.timeSeconds ?? end) - (b.timeSeconds ?? end);
      if (Math.abs(time) > EPSILON) return time;
      return `${a.type}:${'componentId' in a ? a.componentId : ''}`.localeCompare(
        `${b.type}:${'componentId' in b ? b.componentId : ''}`,
      );
    });
}

function componentEventTime(event: TimedInputEvent, end: number): number {
  return Math.max(0, event.timeSeconds ?? end);
}

function transitionEvents(control: TimedControl, start: number, end: number): TimedTransition[] {
  if (control.kind === 'schedule')
    return control.transitions
      .filter((item) => item.timeSeconds >= start - EPSILON && item.timeSeconds <= end + EPSILON)
      .slice()
      .sort((a, b) => a.timeSeconds - b.timeSeconds);
  return [];
}

function addContactEvent(
  events: ElectricalSimulationEvent[],
  componentId: string,
  timeSeconds: number,
  before: boolean,
  after: boolean,
  cause: ElectricalSimulationEvent['cause'],
  sequence: { value: number },
): void {
  if (before === after) return;
  events.push({
    id: eventId(timeSeconds, sequence.value++, 'contact-changed', componentId),
    timeSeconds,
    kind: 'contact-changed',
    componentId,
    from: before,
    to: after,
    cause,
    message: `${componentId} contact ${after ? 'closed' : 'opened'}.`,
  });
}

function addControlTrigger(
  events: ElectricalSimulationEvent[],
  componentId: string,
  timeSeconds: number,
  sequence: { value: number },
): void {
  events.push({
    id: eventId(timeSeconds, sequence.value++, 'control-triggered', componentId),
    timeSeconds,
    kind: 'control-triggered',
    componentId,
    cause: 'manual',
    message: `${componentId} control trigger accepted.`,
  });
}

function updateControls(
  circuit: Circuit,
  state: ElectricalSimulationState,
  start: number,
  end: number,
  controls: Readonly<Record<string, TimedControl>>,
  inputs: readonly TimedInputEvent[],
  defs: Record<string, ComponentDef>,
): { events: ElectricalSimulationEvent[]; input: ElectricalSimulationState } {
  const input = copyState(state);
  const events: ElectricalSimulationEvent[] = [];
  const sequence = { value: 0 };
  const timedInputs = sortedInputs(inputs, start, end);
  const inputTriggers = new Map<string, number[]>();
  for (const event of timedInputs) {
    if (event.type === 'trigger') {
      const time = componentEventTime(event, end);
      const list = inputTriggers.get(event.componentId) ?? [];
      list.push(time);
      inputTriggers.set(event.componentId, list);
      addControlTrigger(events, event.componentId, time, sequence);
    } else if (event.type === 'set-contact') {
      const time = componentEventTime(event, end);
      const before = input.contactStates[event.componentId] ?? false;
      input.contactStates[event.componentId] = event.closed;
      addContactEvent(events, event.componentId, time, before, event.closed, 'manual', sequence);
    } else if (event.type === 'set-dimmer') {
      const time = componentEventTime(event, end);
      const level = clamp01(event.level);
      const before = input.dimmerLevels[event.componentId] ?? 1;
      input.dimmerLevels[event.componentId] = level;
      if (Math.abs(before - level) > EPSILON)
        events.push({
          id: eventId(time, sequence.value++, 'dimmer-changed', event.componentId),
          timeSeconds: time,
          kind: 'dimmer-changed',
          componentId: event.componentId,
          value: level,
          cause: 'manual',
          message: `${event.componentId} dimmer level set to ${Math.round(level * 100)}%.`,
        });
    } else if (event.type === 'reset-control') {
      delete input.controlTriggers[event.componentId];
      const before = input.contactStates[event.componentId] ?? false;
      input.contactStates[event.componentId] = false;
      const time = componentEventTime(event, end);
      addContactEvent(events, event.componentId, time, before, false, 'manual', sequence);
    }
  }

  for (const component of circuit.components) {
    const control = controls[component.id];
    if (!control) continue;
    const before = input.contactStates[component.id] ?? defaultContact(component, defs);
    let after = before;
    const transitions = transitionEvents(control, start, end);
    for (const transition of transitions) {
      addContactEvent(
        events,
        component.id,
        transition.timeSeconds,
        after,
        transition.closed,
        'schedule',
        sequence,
      );
      after = transition.closed;
    }

    if (control.kind === 'manual') {
      after = control.closed;
    } else if (
      control.kind === 'countdown' ||
      control.kind === 'staircase' ||
      control.kind === 'delay'
    ) {
      const configured =
        control.kind === 'countdown'
          ? control.triggerAtSeconds === undefined
            ? []
            : [control.triggerAtSeconds]
          : control.kind === 'staircase' || control.kind === 'delay'
            ? [...(control.triggerAtSeconds ?? [])]
            : [];
      const triggers = [...configured, ...(inputTriggers.get(component.id) ?? [])]
        .filter((time) => time >= start - EPSILON && time <= end + EPSILON)
        .sort((a, b) => a - b);
      for (const trigger of triggers) {
        input.controlTriggers[component.id] = trigger;
        if (control.kind !== 'delay') addControlTrigger(events, component.id, trigger, sequence);
      }
      const trigger = input.controlTriggers[component.id];
      const initiallyClosed = control.initiallyClosed ?? false;
      if (trigger === undefined) after = initiallyClosed;
      else if (control.kind === 'delay') {
        const pickup = Math.max(0, control.onDelaySeconds);
        const hold = control.offDelaySeconds;
        after = end >= trigger + pickup && (hold === undefined || end < trigger + pickup + hold);
      } else {
        after = end < trigger + Math.max(0, control.durationSeconds);
      }
    } else if (control.kind === 'dimmer') {
      const levelTransitions = (control.transitions ?? [])
        .filter((item) => item.timeSeconds >= start - EPSILON && item.timeSeconds <= end + EPSILON)
        .slice()
        .sort((a, b) => a.timeSeconds - b.timeSeconds);
      for (const transition of levelTransitions) {
        const level = clamp01(transition.level);
        input.dimmerLevels[component.id] = level;
        events.push({
          id: eventId(transition.timeSeconds, sequence.value++, 'dimmer-changed', component.id),
          timeSeconds: transition.timeSeconds,
          kind: 'dimmer-changed',
          componentId: component.id,
          value: level,
          cause: 'schedule',
          message: `${component.id} dimmer level changed to ${Math.round(level * 100)}%.`,
        });
      }
      if (!levelTransitions.length) input.dimmerLevels[component.id] = clamp01(control.level);
      after = (input.dimmerLevels[component.id] ?? 0) > 0;
    }
    const finalBefore = transitions.length ? after : before;
    addContactEvent(events, component.id, end, finalBefore, after, 'schedule', sequence);
    input.contactStates[component.id] = after;
  }
  events.sort((a, b) => a.timeSeconds - b.timeSeconds || a.id.localeCompare(b.id));
  return { events, input };
}

function resolveTimedCoils(
  circuit: Circuit,
  state: ElectricalSimulationState,
  defs: Record<string, ComponentDef>,
): { states: Record<string, boolean>; unstable: boolean } {
  const transientCircuit: Circuit = {
    ...circuit,
    components: circuit.components.map((component) => ({
      ...component,
      state: {
        ...component.state,
        ...(state.contactStates[component.id] === undefined
          ? {}
          : { on: state.contactStates[component.id] }),
        ...(state.protectionStates[component.id] !== undefined &&
        state.protectionStates[component.id] !== 'closed'
          ? { isTripped: true }
          : {}),
      },
    })),
  };
  const index = indexCircuit(transientCircuit);
  const liveSources = transientCircuit.components.filter((component) => {
    const def = defs[component.type];
    return def?.isSource === true && def.ports.some((port) => port.type === 'live');
  });
  const neutralSources = transientCircuit.components.filter((component) => {
    const def = defs[component.type];
    return def?.isSource === true && def.ports.some((port) => port.type === 'neutral');
  });
  const resolved = resolveCoils(transientCircuit, index, defs, liveSources, neutralSources);
  return { states: Object.fromEntries(resolved.coilStates), unstable: resolved.unstable };
}

function protectionNetwork(
  circuit: Circuit,
  componentId: string,
  defs: Record<string, ComponentDef>,
): Set<string> {
  return new Set(findProtectionDevicesInNetwork(componentId, circuit, defs).map((item) => item.id));
}

function faultAnchors(circuit: Circuit): string[] {
  const anchors = new Set<string>();
  for (const fault of circuit.faults ?? []) {
    if (fault.resolved) continue;
    if (fault.target.type === 'component') anchors.add(fault.target.id);
    else if (fault.target.type === 'port') anchors.add(fault.target.componentId);
    else {
      const wire = circuit.wires.find(
        (item) => fault.target.type === 'wire' && item.id === fault.target.id,
      );
      if (wire) {
        anchors.add(wire.fromComponentId);
        anchors.add(wire.toComponentId);
      }
    }
  }
  return [...anchors];
}

function maxDeviceCurrent(result: SimulationResult, componentId: string): number | null {
  const currents = result.electrical?.deviceCurrents
    .filter((item) => item.componentId === componentId)
    .map((item) => item.currentAmps)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (!currents?.length) return null;
  return Math.max(...currents.map((value) => Math.abs(value)));
}

function activeFault(circuit: Circuit, types: readonly string[]): boolean {
  return (circuit.faults ?? []).some((fault) => !fault.resolved && types.includes(fault.type));
}

function residualFor(circuit: Circuit): number | null {
  const fault = (circuit.faults ?? []).find(
    (item) =>
      !item.resolved && ['live-to-earth', 'earth-fault', 'smooth-dc-residual'].includes(item.type),
  );
  if (!fault) return null;
  const value = fault.parameters?.leakage_mA;
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 30;
}

function recordTrip(
  result: SimulationResult,
  component: ComponentInstance,
  currentAmps: number,
  ratingAmps: number,
  cause: 'overload' | 'short-circuit' | 'ground-fault' | 'arc-fault',
  mechanism: 'thermal' | 'magnetic' | 'residual' | 'arc',
  clearingTimeSeconds: number | undefined,
): void {
  const trips = result.trippedComponents ?? [];
  result.trippedComponents = trips;
  if (trips.some((trip) => trip.id === component.id)) return;
  trips.push({
    id: component.id,
    label: instanceLabel(component),
    cause,
    reason: `${instanceLabel(component)} operated on ${cause.replace('-', ' ')}.`,
    currentAmps,
    ratingAmps,
    ...(clearingTimeSeconds === undefined ? {} : { clearingTimeSeconds }),
    mechanism,
    currentMultiple: ratingAmps > 0 ? currentAmps / ratingAmps : undefined,
  });
}

function event(
  events: ElectricalSimulationEvent[],
  sequence: { value: number },
  timeSeconds: number,
  kind: ElectricalEventKind,
  subject: string,
  values: Omit<ElectricalSimulationEvent, 'id' | 'timeSeconds' | 'kind' | 'message'>,
  message: string,
): void {
  events.push({
    id: eventId(timeSeconds, sequence.value++, kind, subject),
    timeSeconds,
    kind,
    message,
    ...values,
  });
}

function repairBlocked(circuit: Circuit, componentId: string, wireId?: string): boolean {
  if (
    wireId &&
    (circuit.faults ?? []).some(
      (fault) => !fault.resolved && fault.target.type === 'wire' && fault.target.id === wireId,
    )
  )
    return true;
  const anchors = faultAnchors(circuit);
  return anchors.some((anchor) => connectedNetworkComponents(anchor, circuit).has(componentId));
}

function applyRepairs(
  circuit: Circuit,
  state: ElectricalSimulationState,
  result: SimulationResult,
  inputs: readonly TimedInputEvent[],
  end: number,
  events: ElectricalSimulationEvent[],
): { state: ElectricalSimulationState; needsResolve: boolean } {
  const next = copyState(state);
  const sequence = { value: events.length };
  let needsResolve = false;
  for (const request of inputs.filter(
    (item): item is Extract<TimedInputEvent, { type: 'repair' }> => item.type === 'repair',
  )) {
    const time = request.timeSeconds ?? end;
    if (request.wireId) {
      if (!next.openWires.includes(request.wireId)) continue;
      if (repairBlocked(circuit, '', request.wireId)) {
        result.warnings.push(`Repair blocked: active fault still targets cable ${request.wireId}.`);
        continue;
      }
      next.openWires = next.openWires.filter((id) => id !== request.wireId);
      delete next.cableDamageProgress[request.wireId];
      needsResolve = true;
      event(
        events,
        sequence,
        time,
        'control-reset',
        request.wireId,
        { wireId: request.wireId, cause: 'manual' },
        `Cable ${request.wireId} was repaired and returned to service.`,
      );
    }
    if (request.componentId) {
      const status = next.protectionStates[request.componentId];
      if (status !== 'tripped' && status !== 'blown') continue;
      if (repairBlocked(circuit, request.componentId)) {
        result.warnings.push(
          `Repair blocked: the faulted network containing ${request.componentId} is still active.`,
        );
        continue;
      }
      next.protectionStates[request.componentId] = 'closed';
      delete next.protectionElapsedSeconds[request.componentId];
      needsResolve = true;
      event(
        events,
        sequence,
        time,
        'control-reset',
        request.componentId,
        { componentId: request.componentId, cause: 'manual' },
        `${request.componentId} was reset after the active fault was cleared.`,
      );
    }
  }
  return { state: next, needsResolve };
}

function applyProtection(
  circuit: Circuit,
  state: ElectricalSimulationState,
  result: SimulationResult,
  deltaSeconds: number,
  end: number,
  defs: Record<string, ComponentDef>,
  events: ElectricalSimulationEvent[],
): { state: ElectricalSimulationState; needsResolve: boolean } {
  const next = copyState(state);
  const sequence = { value: events.length };
  const anchorIds = faultAnchors(circuit);
  const faultDevices = new Set<string>();
  for (const anchor of anchorIds) {
    for (const id of protectionNetwork(circuit, anchor, defs)) faultDevices.add(id);
  }
  const leakage = residualFor(circuit);
  const short =
    activeFault(circuit, ['short-circuit']) || result.electrical?.readiness.topology === 'short';
  const arc = activeFault(circuit, ['arc-fault']);
  let needsResolve = false;

  for (const component of circuit.components) {
    const role = {
      overcurrent: isOvercurrentDevice(component.type, defs),
      residual: isResidualDevice(component.type, defs),
      arc: isArcFaultDevice(component.type, defs),
    };
    if (!role.overcurrent && !role.residual && !role.arc) continue;
    if (next.protectionStates[component.id] !== 'closed') continue;
    if (component.state.fault === 'protection-bypass') continue;
    if (faultDevices.size > 0 && !faultDevices.has(component.id)) continue;

    const current = maxDeviceCurrent(result, component.id) ?? 0;
    const rating = component.state.customMaxAmps ?? defs[component.type]?.maxAmps ?? 0;
    let trip:
      | {
          cause: 'overload' | 'short-circuit' | 'ground-fault' | 'arc-fault';
          mechanism: 'thermal' | 'magnetic' | 'residual' | 'arc';
          time?: number;
        }
      | undefined;

    if (role.arc && arc) trip = { cause: 'arc-fault', mechanism: 'arc', time: 0.1 };
    if (!trip && role.residual && leakage !== null) {
      const rcdType = component.state.rcdType ?? 'A';
      const detectsSmoothDc = rcdType === 'B';
      const smoothDc = activeFault(circuit, ['smooth-dc-residual']);
      if (!smoothDc || detectsSmoothDc) {
        const curve = calculateRCDTrip(
          leakage,
          defs[component.type]?.ratedLeakage_mA ?? 30,
          next.protectionElapsedSeconds[component.id] ?? 0,
        );
        if (curve.timeToTrip !== undefined) {
          const elapsed = (next.protectionElapsedSeconds[component.id] ?? 0) + deltaSeconds;
          next.protectionElapsedSeconds[component.id] = elapsed;
          if (curve.shouldTrip || elapsed >= curve.timeToTrip)
            trip = { cause: 'ground-fault', mechanism: 'residual', time: curve.timeToTrip };
        }
      }
    }
    if (!trip && role.overcurrent && rating > 0 && current > 0) {
      const bypass = (circuit.faults ?? []).some(
        (fault) =>
          !fault.resolved &&
          fault.type === 'protection-bypass' &&
          fault.target.type === 'component' &&
          fault.target.id === component.id,
      );
      if (!bypass) {
        const elapsed = next.protectionElapsedSeconds[component.id] ?? 0;
        const curve = isFuseDevice(component.type, defs)
          ? calculateFuseTrip(current, rating, elapsed + deltaSeconds)
          : calculateMCBTrip(
              current,
              rating,
              defs[component.type]?.mcbType ?? 'B',
              elapsed + deltaSeconds,
            );
        if (current > rating * 1.13)
          next.protectionElapsedSeconds[component.id] = elapsed + deltaSeconds;
        else
          next.protectionElapsedSeconds[component.id] = Math.max(0, elapsed - deltaSeconds * 0.1);
        if (short && curve.timeToTrip !== undefined && curve.timeToTrip <= 0.1)
          trip = { cause: 'short-circuit', mechanism: 'magnetic', time: curve.timeToTrip };
        else if (curve.shouldTrip)
          trip = {
            cause: 'overload',
            mechanism: isFuseDevice(component.type, defs)
              ? 'thermal'
              : 'tripReason' in curve && curve.tripReason === 'magnetic'
                ? 'magnetic'
                : 'thermal',
            time: curve.timeToTrip,
          };
      }
    }
    if (!trip) continue;
    const blown = isFuseDevice(component.type, defs);
    next.protectionStates[component.id] = blown ? 'blown' : 'tripped';
    needsResolve = true;
    if (blown) {
      const blownComponents = result.blownComponents ?? [];
      result.blownComponents = blownComponents;
      blownComponents.push({
        id: component.id,
        reason: trip.cause === 'overload' ? 'overload' : 'overcurrent',
      });
    }
    const eventCurrent =
      trip.cause === 'ground-fault'
        ? (leakage ?? (defs[component.type]?.ratedLeakage_mA ?? 30) / 1000)
        : current;
    recordTrip(
      result,
      component,
      eventCurrent,
      trip.cause === 'ground-fault' ? (defs[component.type]?.ratedLeakage_mA ?? 30) / 1000 : rating,
      trip.cause,
      trip.mechanism,
      trip.time,
    );
    event(
      events,
      sequence,
      end,
      blown ? 'device-blown' : 'protection-trip',
      component.id,
      {
        componentId: component.id,
        cause: trip.cause,
        currentAmps: eventCurrent,
        ...(trip.time === undefined ? {} : { clearingTimeSeconds: trip.time }),
      },
      `${instanceLabel(component)} ${blown ? 'fuse link opened' : 'tripped'} on ${trip.cause.replace('-', ' ')}.`,
    );
  }
  return { state: next, needsResolve };
}

function applyCableDamage(
  state: ElectricalSimulationState,
  result: SimulationResult,
  deltaSeconds: number,
  end: number,
  events: ElectricalSimulationEvent[],
): { state: ElectricalSimulationState; needsResolve: boolean } {
  const next = copyState(state);
  const sequence = { value: events.length };
  let needsResolve = false;
  for (const wire of result.electrical?.wires ?? []) {
    const current = wire.currentAmps;
    const capacity = wire.capacity.deratedAmps;
    if (current === null || capacity === null || capacity <= 0) continue;
    const ratio = Math.abs(current) / capacity;
    const previous = next.cableDamageProgress[wire.wireId] ?? 0;
    // A modest capacity warning is not a melt event. The damage slice starts
    // at 1.4 Iz, matching the documented In > Iz mis-coordination boundary;
    // ordinary breaker clearing must remain resettable and non-destructive.
    const progress =
      ratio > 1.4
        ? previous + deltaSeconds * (ratio * ratio - 1)
        : Math.max(0, previous - deltaSeconds * 0.05);
    next.cableDamageProgress[wire.wireId] = progress;
    if (progress < CABLE_DAMAGE_THRESHOLD || next.openWires.includes(wire.wireId)) continue;
    next.openWires.push(wire.wireId);
    next.openWires.sort();
    needsResolve = true;
    result.bustedWires = result.bustedWires ?? new Set();
    result.bustedWires.add(wire.wireId);
    result.wireMeltEvents = result.wireMeltEvents ?? [];
    result.wireMeltEvents.push({
      wireId: wire.wireId,
      currentAmps: Math.abs(current),
      capacityAmps: capacity,
      cableMm2: wire.properties.cableMm2,
    });
    event(
      events,
      sequence,
      end,
      'cable-damaged',
      wire.wireId,
      { wireId: wire.wireId, currentAmps: Math.abs(current) },
      `Cable ${wire.wireId} exceeded its modeled thermal exposure and opened.`,
    );
  }
  return { state: next, needsResolve };
}

function stripHandledLimitations(
  result: SimulationResult,
  timedIds: ReadonlySet<string>,
  protectionIds: ReadonlySet<string>,
): void {
  if (!result.modelLimitations) return;
  const handled = new Set(
    result.modelLimitations
      .filter(
        (item) =>
          (timedIds.has(item.componentId) &&
            (item.code === 'timing-model' ||
              item.code === 'dimming-model' ||
              item.code === 'control-model')) ||
          (protectionIds.has(item.componentId) && item.code === 'protection-model'),
      )
      .map((item) => item.message),
  );
  result.modelLimitations = result.modelLimitations.filter((item) => !handled.has(item.message));
  result.warnings = result.warnings.filter((message) => !handled.has(message));
}

function runStep(
  circuit: Circuit,
  previous: ElectricalSimulationState,
  deltaSeconds: number,
  options: TimedSimulationOptions,
): SimulationResult {
  const delta = finiteNonNegative(deltaSeconds, 'deltaSeconds');
  const start = finiteNonNegative(previous.elapsedSeconds, 'state.elapsedSeconds');
  const end = start + delta;
  if (end > MAX_STEP_SECONDS * 365) throw new Error('simulation state exceeds one simulated year.');
  const defs = options.defs ?? COMPONENT_DEFS;
  const controls = options.controls ?? {};
  const inputs = [...(options.inputEvents ?? []), ...(options.controlEvents ?? [])];
  const controlled = updateControls(circuit, previous, start, end, controls, inputs, defs);
  let state = controlled.input;
  state.elapsedSeconds = end;
  const coilResolution = resolveTimedCoils(circuit, state, defs);
  state.coilStates = coilResolution.states;
  for (const [componentId, closed] of Object.entries(coilResolution.states)) {
    if (controls[componentId]) continue;
    const before = state.contactStates[componentId] ?? false;
    state.contactStates[componentId] = closed;
    if (before !== closed) {
      controlled.events.push({
        id: eventId(end, controlled.events.length, 'contact-changed', componentId),
        timeSeconds: end,
        kind: 'contact-changed',
        componentId,
        from: before,
        to: closed,
        cause: 'manual',
        message: `${componentId} coil ${closed ? 'picked up' : 'dropped out'}.`,
      });
    }
  }
  const events = controlled.events;
  const timedIds = new Set([...Object.keys(controls), ...Object.keys(coilResolution.states)]);
  const baseOptions: SimulateOptions = {
    defs,
    appMode: options.appMode,
    standard: options.standard,
    contactStates: new Map(Object.entries(state.contactStates)),
    protectionStates: new Map(Object.entries(state.protectionStates)),
    dimmerLevels: new Map(Object.entries(state.dimmerLevels)),
    openWires: new Set(state.openWires),
    timedControls: timedIds,
  };
  let result = simulate(circuit, baseOptions);
  if (coilResolution.unstable) {
    result.errors.push(
      'Relay feedback does not settle in the timed model. Controlled contacts remain open until the feedback loop is repaired.',
    );
  }
  result.coilStates = state.coilStates;
  stripHandledLimitations(result, timedIds, new Set(Object.keys(state.protectionStates)));
  const repairs = applyRepairs(circuit, state, result, inputs, end, events);
  state = repairs.state;
  const repairWarnings = result.warnings.filter((message) => message.startsWith('Repair blocked:'));
  if (repairs.needsResolve) {
    result = simulate(circuit, {
      ...baseOptions,
      protectionStates: new Map(Object.entries(state.protectionStates)),
      openWires: new Set(state.openWires),
    });
    result.warnings.push(...repairWarnings);
    stripHandledLimitations(result, timedIds, new Set(Object.keys(state.protectionStates)));
  }
  const protection = applyProtection(circuit, state, result, delta, end, defs, events);
  state = protection.state;
  const cable = applyCableDamage(state, result, delta, end, events);
  state = cable.state;
  const needsResolve = protection.needsResolve || cable.needsResolve;
  if (needsResolve) {
    const wireMeltEvents = result.wireMeltEvents?.slice();
    const bustedWires = result.bustedWires ? new Set(result.bustedWires) : undefined;
    const blownComponents = result.blownComponents?.slice();
    result = simulate(circuit, {
      ...baseOptions,
      protectionStates: new Map(Object.entries(state.protectionStates)),
      openWires: new Set(state.openWires),
    });
    stripHandledLimitations(result, timedIds, new Set(Object.keys(state.protectionStates)));
    // Preserve the event report and the operated-device records from the first
    // solve while replacing all electrical readings with post-event readings.
    if (events.some((item) => item.kind === 'protection-trip' || item.kind === 'device-blown')) {
      const beforeTrips = result.trippedComponents ?? [];
      const trips = beforeTrips.slice();
      // applyProtection wrote records to the previous result, so recover them
      // from the event stream when the post-trip solve discarded that object.
      for (const item of events.filter(
        (entry) => entry.kind === 'protection-trip' || entry.kind === 'device-blown',
      )) {
        if (!item.componentId || trips.some((trip) => trip.id === item.componentId)) continue;
        const component = circuit.components.find((candidate) => candidate.id === item.componentId);
        if (!component) continue;
        const cause =
          item.cause === 'short-circuit' ||
          item.cause === 'arc-fault' ||
          item.cause === 'ground-fault' ||
          item.cause === 'overload'
            ? item.cause
            : 'overload';
        trips.push({
          id: component.id,
          label: instanceLabel(component),
          cause,
          reason: item.message,
          currentAmps: item.currentAmps ?? 0,
          ratingAmps:
            cause === 'ground-fault'
              ? (defs[component.type]?.ratedLeakage_mA ?? 30) / 1000
              : (component.state.customMaxAmps ?? defs[component.type]?.maxAmps ?? 0),
          ...(item.clearingTimeSeconds === undefined
            ? {}
            : { clearingTimeSeconds: item.clearingTimeSeconds }),
          mechanism:
            cause === 'ground-fault' ? 'residual' : cause === 'arc-fault' ? 'arc' : 'thermal',
        });
      }
      result.trippedComponents = trips;
    }
    if (wireMeltEvents?.length) result.wireMeltEvents = wireMeltEvents;
    if (bustedWires?.size) result.bustedWires = bustedWires;
    if (blownComponents?.length) result.blownComponents = blownComponents;
    if (state.openWires.length) result.bustedWires = new Set(state.openWires);
  }
  result.simulationState = state;
  result.events = events;
  return result;
}

export function stepSimulation(
  circuit: Circuit,
  state: ElectricalSimulationState,
  deltaSeconds: number,
  options: Omit<TimedSimulationOptions, 'state' | 'deltaSeconds'> = {},
): SimulationResult {
  return runStep(circuit, state, deltaSeconds, options);
}

export function simulateTimed(
  circuit: Circuit,
  options: TimedSimulationOptions = {},
): SimulationResult {
  const state = options.state ?? createSimulationState(circuit, options);
  return runStep(circuit, state, options.deltaSeconds ?? 0, options);
}

/** Reset clears transient trips, thermal exposure and cable openings only. */
export function resetSimulationState(
  circuit: Circuit,
  options: Pick<TimedSimulationOptions, 'defs'> = {},
): ElectricalSimulationState {
  const state = createSimulationState(circuit, options);
  for (const id of Object.keys(state.protectionStates)) state.protectionStates[id] = 'closed';
  return state;
}

export function replaySimulation(
  circuit: Circuit,
  steps: readonly number[],
  options: Omit<TimedSimulationOptions, 'state' | 'deltaSeconds'> = {},
): TimedReplay {
  let state = resetSimulationState(circuit, options);
  const states: ElectricalSimulationState[] = [];
  const results: SimulationResult[] = [];
  const events: ElectricalSimulationEvent[] = [];
  for (const delta of steps) {
    const result = stepSimulation(circuit, state, delta, options);
    if (!result.simulationState) throw new Error('Timed simulation did not return state.');
    state = result.simulationState;
    states.push(copyState(state));
    results.push(result);
    events.push(...(result.events ?? []));
  }
  return { states, results, events };
}

/** Re-exported for consumers that need to type event streams without importing contracts. */
export type { ElectricalSimulationEvent, ElectricalSimulationState } from '../core/contracts';
