import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from '../circuitFormat';
import { simulate } from '../simulation';
import type { Circuit, SimulationResult } from '../types';
import { damageCircuit, protectedDamageCircuit } from './damageFixtures';
import { damageTargetKey } from './damageModel';
import { solveCircuit } from './mna';
import { protectionCircuit } from './protectionFixtures';
import { explicitSupplyProfile } from './supplies';
import { dimmingCircuit } from './timerDimmingFixtures';

const current = 230 / (52.9 + 3 * 0.0175);
const currentRate = current ** 2 - 2 ** 2;
const wireKey = damageTargetKey({ type: 'wire', id: 'load-feed' });
const firstMicrosecond = (seconds: number) => Math.ceil(seconds * 1e6) / 1e6;
const switchOff = (circuit: Circuit): Circuit => ({
  ...circuit,
  components: circuit.components.map((c) =>
    c.id === 'control' ? { ...c, state: { ...c.state, on: false } } : c,
  ),
});
const projectDamage = (circuit: Circuit, result: SimulationResult): Circuit => ({
  ...circuit,
  components: circuit.components.map((c) => {
    const failed = result.blownComponents?.find((item) => item.id === c.id);
    return failed ? { ...c, state: { ...c.state, isBlown: true, blownReason: failed.reason } } : c;
  }),
  wires: circuit.wires.map((w) => (result.bustedWires?.has(w.id) ? { ...w, isBusted: true } : w)),
});

describe('declared cumulative damage and repair', () => {
  it('integrates actual cable current, opens once, and retains pre-event / post-event values', () => {
    const circuit = damageCircuit();
    const before = structuredClone(circuit);
    const result = simulate(circuit, { deltaSeconds: 2 });
    expect(result.electrical?.status).toBe('converged');
    expect(result.simulationEvents).toHaveLength(1);
    expect(result.simulationEvents?.[0]).toMatchObject({
      type: 'damage',
      target: { type: 'wire', id: 'load-feed' },
      reason: 'overcurrent',
      unit: 'A²s',
      exposure: 10,
    });
    const event = result.simulationEvents![0]!;
    expect(event.atSeconds).toBe(firstMicrosecond(10 / currentRate));
    if (event.type === 'damage') expect(event.currentAmps).toBeCloseTo(current, 9);
    expect(result.electrical?.damage?.[0]?.currentAmps).toBe(0);
    expect(result.componentCalculations?.lamp?.powerWatts).toBe(0);
    expect(result.bustedWires).toEqual(new Set(['load-feed']));
    expect(result.faultsCleared).toBe(false);
    expect(circuit).toEqual(before);
    const continued = simulate(circuit, {
      simulationState: result.simulationState,
      deltaSeconds: 2,
    });
    expect(continued.simulationEvents).toEqual([]);
    expect(continued.bustedWires).toEqual(result.bustedWires);
  });

  it('uses a device terminal pair and squared-voltage stress, never source/nameplate substitution', () => {
    const circuit = damageCircuit('device-voltage');
    const voltage = current * 52.9;
    const result = simulate(circuit, { deltaSeconds: 2 });
    const event = result.simulationEvents![0]!;
    expect(event.type).toBe('damage');
    expect(event.atSeconds).toBe(firstMicrosecond(6000 / (voltage ** 2 - 200 ** 2)));
    if (event.type === 'damage') expect(event.voltageVolts).toBeCloseTo(voltage, 9);
    expect(result.blownComponents).toEqual([{ id: 'lamp', reason: 'overvoltage' }]);
    expect(result.energizedComponents.has('lamp')).toBe(false);
  });

  it('supports device current stress without duplicate damage entries', () => {
    const result = simulate(damageCircuit('device-current'), { deltaSeconds: 2 });
    expect(result.blownComponents).toEqual([{ id: 'lamp', reason: 'overcurrent' }]);
    expect(result.simulationEvents).toHaveLength(1);
    expect(result.simulationEvents?.[0]?.atSeconds).toBe(firstMicrosecond(10 / currentRate));
  });

  it('finishes exposure at each step boundary and preserves it across off intervals', () => {
    const circuit = damageCircuit();
    const first = simulate(circuit, { deltaSeconds: 0.2 });
    expect(first.simulationState?.damage[wireKey]?.exposure).toBeCloseTo(currentRate * 0.2, 10);
    const oldState = structuredClone(first.simulationState);
    const off = simulate(switchOff(circuit), {
      simulationState: first.simulationState,
      deltaSeconds: 100,
    });
    expect(off.simulationState?.damage[wireKey]?.exposure).toBeCloseTo(currentRate * 0.2, 10);
    expect(off.simulationEvents).toEqual([]);
    expect(first.simulationState).toEqual(oldState);
    const on = simulate(circuit, { simulationState: off.simulationState, deltaSeconds: 0.2 });
    expect(on.simulationState?.damage[wireKey]?.exposure).toBeCloseTo(currentRate * 0.4, 10);
  });

  it('replays identical event times with coarse and partitioned steps and reversed input arrays', () => {
    const circuit = damageCircuit();
    const whole = simulate(circuit, { deltaSeconds: 2 });
    let part = simulate(circuit);
    const events = [...part.simulationEvents!];
    for (let i = 0; i < 20; i++) {
      part = simulate(circuit, { simulationState: part.simulationState, deltaSeconds: 0.1 });
      events.push(...part.simulationEvents!);
    }
    expect(events).toEqual(whole.simulationEvents);
    expect(part.simulationState).toEqual(whole.simulationState);
    const reordered = simulate(
      {
        ...circuit,
        components: [...circuit.components].reverse(),
        wires: [...circuit.wires].reverse(),
      },
      { deltaSeconds: 2 },
    );
    expect(reordered.simulationState).toEqual(whole.simulationState);
    expect(reordered.simulationEvents).toEqual(whole.simulationEvents);
  });

  it('lets actual protection clear before damage, while a bypassed pole leaves cable stress', () => {
    const protectedResult = simulate(protectedDamageCircuit(), { deltaSeconds: 2 });
    expect(protectedResult.simulationEvents?.map((e) => e.type)).toEqual(['protection-trip']);
    expect(protectedResult.blownComponents).toEqual([]);
    expect(protectedResult.bustedWires?.size).toBe(0);
    expect(protectedResult.electrical?.damage?.[0]?.exposure).toBe(0);
    const bypassed = simulate(protectedDamageCircuit(true), { deltaSeconds: 2 });
    expect(bypassed.simulationEvents?.map((e) => e.type)).toEqual(['damage']);
    expect(bypassed.simulationState?.protection.control?.tripped).toBe(false);
    expect(bypassed.bustedWires?.has('load-feed')).toBe(true);
  });

  it('does not infer damage from an exceeded current/voltage/cable rating', () => {
    const circuit = damageCircuit();
    circuit.wires[1]!.damageModel = undefined;
    circuit.wires[1]!.customCableMm2 = 0.1;
    circuit.components[2]!.state.customMaxVolts = 100;
    const result = simulate(circuit, { deltaSeconds: 3600 });
    expect(result.simulationEvents).toEqual([]);
    expect(result.blownComponents).toEqual([]);
    expect(result.bustedWires?.size).toBe(0);
    expect(
      result.electrical?.coverage
        .filter((c) => c.aspect === 'damage')
        .every((c) => c.status === 'not-assessed'),
    ).toBe(true);
  });

  it('marks damage unassessed in static solves even with a declaration', () => {
    const result = solveCircuit(damageCircuit());
    expect(result.status).toBe('converged');
    expect(result.damage).toBeUndefined();
    expect(
      result.coverage.find((c) => c.subjectId === 'load-feed' && c.aspect === 'damage')?.status,
    ).toBe('not-assessed');
  });

  it('keeps a fuse open through OFF/ON and distinguishes replacement from resetting a breaker', () => {
    const fuse = protectionCircuit('fuse', 1);
    const operated = simulate(fuse, { deltaSeconds: 2 });
    expect(operated.simulationEvents?.map((e) => e.type)).toEqual(['fuse-operated']);
    expect(operated.blownComponents).toEqual([{ id: 'control', reason: 'overload' }]);
    const off = simulate(switchOff(fuse), {
      simulationState: operated.simulationState,
      deltaSeconds: 1,
    });
    const on = simulate(fuse, { simulationState: off.simulationState, deltaSeconds: 1 });
    expect(on.protectionContactStates?.control).toBe(false);
    expect(on.simulationEvents).toEqual([]);
    const restored = importJSON(exportJSON(projectDamage(fuse, operated)))!;
    const restarted = simulate(restored, { deltaSeconds: 1 });
    expect(restarted.protectionContactStates?.control).toBe(false);
    expect(restarted.simulationEvents).toEqual([]);
    const replacement = structuredClone(restored);
    replacement.components[1]!.state.isBlown = false;
    expect(simulate(replacement, { deltaSeconds: 2 }).simulationEvents?.map((e) => e.type)).toEqual(
      ['fuse-operated'],
    );
  });

  it('preserves persisted damage and declaration through import; a fresh experiment resets exposure', () => {
    for (const kind of ['wire', 'device-current', 'device-voltage'] as const) {
      const circuit = damageCircuit(kind);
      const failed = simulate(circuit, { deltaSeconds: 2 });
      const restored = importJSON(exportJSON(projectDamage(circuit, failed)))!;
      const resumed = simulate(restored, { deltaSeconds: 2 });
      expect(resumed.simulationEvents).toEqual([]);
      expect(resumed.faultsCleared).toBe(false);
      expect(resumed.componentCalculations?.lamp?.powerWatts).toBe(0);
      expect(simulate(circuit).simulationState?.elapsedSeconds).toBe(0);
      expect(simulate(circuit).simulationEvents).toEqual([]);
    }
  });

  it('does not accept corrupt, obsolete or foreign damage state', () => {
    const circuit = damageCircuit();
    const initial = simulate(circuit, { deltaSeconds: 0.1 });
    for (const mutate of [
      (s: NonNullable<SimulationResult['simulationState']>) => {
        s.damage[wireKey]!.exposure = Number.NaN;
      },
      (s: NonNullable<SimulationResult['simulationState']>) => {
        s.damage[wireKey]!.rate = -1;
      },
      (s: NonNullable<SimulationResult['simulationState']>) => {
        s.damage[wireKey]!.damagedAtSeconds = 100;
      },
      (s: NonNullable<SimulationResult['simulationState']>) => {
        s.modelVersion = '1.5d.2.1';
      },
    ]) {
      const state = structuredClone(initial.simulationState!);
      mutate(state);
      expect(simulate(circuit, { simulationState: state }).electrical?.status).toBe('invalid');
    }
    const changed = structuredClone(circuit);
    changed.wires[1]!.damageModel!.withstandAmpSquaredSeconds = 11;
    expect(simulate(changed, { simulationState: initial.simulationState }).electrical?.status).toBe(
      'invalid',
    );
  });

  it('rejects malformed or unsupported damage declarations on direct and imported input', () => {
    for (const type of ['mcb', 'bulb', 'ac-mains-supply']) {
      const circuit = damageCircuit('device-current');
      circuit.components[2]!.type = type;
      expect(simulate(circuit).electrical?.status).toBe('invalid');
      expect(() => importJSON(exportJSON(circuit))).toThrow();
    }
    const circuit = damageCircuit();
    circuit.wires[1]!.damageModel!.withstandAmpSquaredSeconds = -1;
    expect(simulate(circuit).electrical?.status).toBe('invalid');
    expect(() => importJSON(exportJSON(circuit))).toThrow();
  });

  it('produces the same electrical damage for basic and Pro access', () => {
    const circuit = damageCircuit('device-voltage');
    expect(simulate(circuit, { appMode: 'basic', deltaSeconds: 2 })).toEqual(
      simulate(circuit, { appMode: 'pro', deltaSeconds: 2 }),
    );
  });

  it('uses RMS squared current for dimming and DC current for an independent battery', () => {
    const dimmed = dimmingCircuit(1.5);
    dimmed.wires[0]!.damageModel = {
      version: 1,
      kind: 'overcurrent',
      continuousCurrentAmps: 0.001,
      withstandAmpSquaredSeconds: 1000,
    };
    const initial = simulate(dimmed);
    const measured = initial.electrical!.wires.find((w) => w.wireId === dimmed.wires[0]!.id)!
      .currentAmps!;
    const step = simulate(dimmed, { simulationState: initial.simulationState, deltaSeconds: 1 });
    expect(step.electrical?.damage?.[0]?.exposure).toBeCloseTo(measured ** 2 - 0.001 ** 2, 8);
    const dc = damageCircuit('device-current');
    dc.supply = explicitSupplyProfile({ kind: 'dc', voltage: 12 });
    dc.globalVoltage = 12;
    dc.components[0]!.type = 'dc-battery-12v';
    dc.components[2]!.state = {
      customVoltage: 12,
      customPowerWatts: 24,
      damageModel: {
        version: 1,
        kind: 'overcurrent',
        continuousCurrentAmps: 1,
        withstandAmpSquaredSeconds: 3,
      },
    };
    const result = simulate(dc, { deltaSeconds: 2 });
    expect(result.simulationEvents?.[0]?.atSeconds).toBe(
      firstMicrosecond(3 / ((12 / (6 + 0.0525)) ** 2 - 1)),
    );
  });

  it('keeps component and wire damage with identical IDs independent at simultaneous events', () => {
    const circuit = damageCircuit('device-current');
    circuit.wires[1]!.id = 'lamp';
    circuit.wires[1]!.damageModel = damageCircuit().wires[1]!.damageModel;
    const result = simulate(circuit, { deltaSeconds: 2 });
    expect(Object.keys(result.simulationState!.damage)).toHaveLength(2);
    expect(result.simulationEvents?.map((e) => (e.type === 'damage' ? e.target : null))).toEqual([
      { type: 'component', id: 'lamp' },
      { type: 'wire', id: 'lamp' },
    ]);
    expect(result.blownComponents).toHaveLength(1);
    expect(result.bustedWires?.size).toBe(1);
  });

  it('does not let protection in another branch prevent cable damage', () => {
    const circuit = protectedDamageCircuit();
    circuit.components.push({ ...circuit.components[2]!, id: 'other-load' });
    circuit.wires.push(
      {
        ...circuit.wires[0]!,
        id: 'other-feed',
        toComponentId: 'other-load',
        damageModel: damageCircuit().wires[1]!.damageModel,
      },
      { ...circuit.wires[2]!, id: 'other-return', fromComponentId: 'other-load' },
    );
    const result = simulate(circuit, { deltaSeconds: 2 });
    expect(result.simulationEvents?.map((e) => e.type)).toEqual(['protection-trip', 'damage']);
    expect(result.bustedWires).toEqual(new Set(['other-feed']));
    expect(result.blownComponents).toEqual([]);
  });
});
