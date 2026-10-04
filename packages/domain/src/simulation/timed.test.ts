import { describe, expect, it } from 'vitest';
import type { Circuit } from '../types';
import { component, protectedLoad, wire } from './auditFixtures';
import { replaySimulation, resetSimulationState, stepSimulation } from './timed';

function timedLoad(
  protection: 'mcb' | 'rcd' | 'rcbo' | 'fuse' = 'mcb',
  watts = 60,
  rating = 16,
): Circuit {
  const circuit = protectedLoad(protection, watts, rating);
  // Keep these cases about the device under test rather than an undersized
  // default tail. The cable model is still exercised in its own test below.
  for (const item of circuit.wires) item.customCableMm2 = 10;
  return circuit;
}

describe('Phase 1.5D explicit time state', () => {
  it('does not infer history from a timestamp and replay is deterministic', () => {
    const circuit = timedLoad('mcb', 60);
    const first = replaySimulation(circuit, [0, 0.25, 1, 2], {
      controls: {
        switch: { kind: 'schedule', transitions: [] },
      },
    });
    const second = replaySimulation(circuit, [0, 0.25, 1, 2], {
      controls: {
        switch: { kind: 'schedule', transitions: [] },
      },
    });
    expect(second).toEqual(first);
    expect(first.states.at(-1)?.elapsedSeconds).toBe(3.25);
    expect(first.events).toEqual([]);
  });

  it('operates a scheduled contact once and solves the post-event circuit', () => {
    const circuit = timedLoad('mcb', 60);
    circuit.components.push({
      id: 'timer',
      type: 'timer-switch',
      x: 0,
      y: 0,
      state: { on: false },
    });
    circuit.wires.push(
      wire('timer-feed', 'l', 0, 'timer', 0),
      wire('timer-out', 'timer', 1, 'load', 0),
    );
    const result = stepSimulation(circuit, resetSimulationState(circuit), 10, {
      controls: {
        timer: { kind: 'schedule', transitions: [{ timeSeconds: 5, closed: true }] },
      },
    });
    expect(result.events).toHaveLength(1);
    expect(result.events?.[0]).toMatchObject({
      kind: 'contact-changed',
      componentId: 'timer',
      timeSeconds: 5,
      from: false,
      to: true,
    });
    expect(result.simulationState?.contactStates.timer).toBe(true);
    expect(result.energizedComponents.has('load')).toBe(true);
  });

  it('holds a countdown only for its declared interval', () => {
    const circuit = timedLoad('mcb', 60);
    circuit.components.push({
      id: 'timer',
      type: 'countdown-timer',
      x: 0,
      y: 0,
      state: { on: false },
    });
    circuit.wires.push(
      wire('timer-live', 'l', 0, 'timer', 0),
      wire('timer-neutral', 'n', 0, 'timer', 1),
      wire('timer-out', 'timer', 2, 'load', 0),
    );
    const initial = resetSimulationState(circuit);
    const on = stepSimulation(circuit, initial, 1, {
      controls: { timer: { kind: 'countdown', durationSeconds: 5, triggerAtSeconds: 0 } },
    });
    expect(on.simulationState?.contactStates.timer).toBe(true);
    const off = stepSimulation(circuit, on.simulationState!, 5, {
      controls: { timer: { kind: 'countdown', durationSeconds: 5 } },
    });
    expect(off.simulationState?.contactStates.timer).toBe(false);
  });

  it('uses actual pole current and trips a resettable MCB without blowing it', () => {
    const circuit = timedLoad('mcb', 6000, 16);
    const result = stepSimulation(circuit, resetSimulationState(circuit), 1600);
    expect(result.simulationState?.protectionStates.device).toBe('tripped');
    expect(result.events?.some((event) => event.kind === 'protection-trip')).toBe(true);
    expect(result.trippedComponents?.[0]).toMatchObject({
      id: 'device',
      cause: 'overload',
      mechanism: 'thermal',
      currentAmps: expect.any(Number),
    });
    expect(result.electrical?.loads[0]?.currentAmps).toBeCloseTo(0);
    expect(result.blownComponents ?? []).toEqual([]);
  });

  it('does not let a plain RCCB trip on balanced overcurrent', () => {
    const circuit = timedLoad('rcd', 6000, 16);
    const result = stepSimulation(circuit, resetSimulationState(circuit), 1600);
    expect(result.simulationState?.protectionStates.device).toBe('closed');
    expect(result.events?.filter((event) => event.kind === 'protection-trip')).toEqual([]);
  });

  it('permits reset only after the circuit fault is no longer active', () => {
    const circuit = timedLoad('mcb', 6000, 16);
    const tripped = stepSimulation(circuit, resetSimulationState(circuit), 1600);
    const repaired = stepSimulation(circuit, tripped.simulationState!, 0, {
      inputEvents: [
        {
          type: 'repair',
          componentId: 'device',
          authorization: { surface: 'fault-lab', operation: 'reset-protection' },
        },
      ],
    });
    expect(repaired.simulationState?.protectionStates.device).toBe('closed');
    expect(repaired.events?.some((event) => event.kind === 'control-reset')).toBe(true);

    circuit.faults = [
      {
        id: 'short',
        type: 'short-circuit',
        category: 'component',
        target: { type: 'component', id: 'load' },
        createdAt: 0,
      },
    ];
    const blocked = stepSimulation(circuit, tripped.simulationState!, 0, {
      inputEvents: [
        {
          type: 'repair',
          componentId: 'device',
          authorization: { surface: 'fault-lab', operation: 'reset-protection' },
        },
      ],
    });
    expect(blocked.simulationState?.protectionStates.device).toBe('tripped');
    expect(blocked.warnings.some((message) => message.startsWith('Repair blocked:'))).toBe(true);
  });

  it('operates residual protection on a declared leakage fault and only in its network', () => {
    const circuit = timedLoad('rcd', 60, 80);
    circuit.faults = [
      {
        id: 'leak',
        type: 'live-to-earth',
        category: 'earth',
        target: { type: 'component', id: 'load' },
        parameters: { leakage_mA: 45 },
        createdAt: 0,
      },
    ];
    const result = stepSimulation(circuit, resetSimulationState(circuit), 1);
    expect(result.simulationState?.protectionStates.device).toBe('tripped');
    expect(result.trippedComponents?.[0]).toMatchObject({
      cause: 'ground-fault',
      mechanism: 'residual',
      clearingTimeSeconds: 0.3,
    });
    expect(result.electrical?.loads[0]?.currentAmps).toBeNull();
  });

  it('leaves a blown fuse open and distinguishes it from a resettable trip', () => {
    const circuit = timedLoad('fuse', 6000, 13);
    const result = stepSimulation(circuit, resetSimulationState(circuit), 20);
    expect(result.simulationState?.protectionStates.device).toBe('blown');
    expect(result.events?.some((event) => event.kind === 'device-blown')).toBe(true);
    expect(result.blownComponents).toEqual([{ id: 'device', reason: 'overload' }]);
    expect(result.electrical?.loads[0]?.currentAmps).toBeCloseTo(0);
  });

  it('changes fixed-resistance response with an explicit dimmer command', () => {
    const circuit = timedLoad('mcb', 60, 16);
    circuit.components.push({
      id: 'dimmer',
      type: 'dimmer-switch',
      x: 0,
      y: 0,
      state: { on: true },
    });
    circuit.wires[1] = wire('branch', 'device', 1, 'dimmer', 0);
    circuit.wires.push(wire('dimmer-out', 'dimmer', 1, 'load', 0));
    const full = stepSimulation(circuit, resetSimulationState(circuit), 0, {
      controls: { dimmer: { kind: 'dimmer', level: 1 } },
    });
    const half = stepSimulation(circuit, resetSimulationState(circuit), 0, {
      controls: { dimmer: { kind: 'dimmer', level: 0.5 } },
    });
    expect(full.electrical?.loads[0]?.currentAmps).toBeGreaterThan(
      half.electrical?.loads[0]?.currentAmps ?? 0,
    );
    expect(half.simulationState?.dimmerLevels.dimmer).toBe(0.5);
  });

  it('opens a cable only after accumulated severe exposure and re-solves it', () => {
    const circuit = timedLoad('mcb', 7400, 100);
    circuit.wires[1]!.customCableMm2 = 1;
    const result = stepSimulation(circuit, resetSimulationState(circuit), 20);
    expect(result.simulationState?.openWires).toContain('branch');
    expect(result.events?.some((event) => event.kind === 'cable-damaged')).toBe(true);
    expect(result.electrical?.loads[0]?.currentAmps).toBe(0);
  });

  it('requires Fault Lab authorization and distinguishes a fuse replacement from a breaker reset', () => {
    const circuit = timedLoad('fuse', 6000, 13);
    const blown = stepSimulation(circuit, resetSimulationState(circuit), 20);
    const unauthorized = stepSimulation(circuit, blown.simulationState!, 0, {
      inputEvents: [{ type: 'repair', componentId: 'device' }],
    });
    expect(unauthorized.simulationState?.protectionStates.device).toBe('blown');
    expect(unauthorized.warnings.some((message) => message.includes('authorization'))).toBe(true);

    circuit.components.find((item) => item.id === 'load')!.state.customPowerWatts = 60;
    const replaced = stepSimulation(circuit, blown.simulationState!, 0, {
      inputEvents: [
        {
          type: 'repair',
          componentId: 'device',
          authorization: { surface: 'fault-lab', operation: 'replace-fuse-link' },
        },
      ],
    });
    expect(replaced.simulationState?.protectionStates.device).toBe('closed');
    expect(replaced.events?.some((event) => event.message.includes('fuse link was replaced'))).toBe(
      true,
    );
  });

  it('applies declared coil pickup and dropout delays without mutating the saved relay', () => {
    const circuit: Circuit = {
      components: [
        component('l', 'live-terminal'),
        component('n', 'neutral-terminal'),
        component('relay', 'relay-spdt'),
        component('lamp', 'bulb'),
      ],
      wires: [
        wire('coil-live', 'l', 0, 'relay', 0),
        wire('coil-neutral', 'n', 0, 'relay', 1),
        wire('contact-feed', 'l', 0, 'relay', 2),
        wire('contact-out', 'relay', 3, 'lamp', 0),
        wire('lamp-return', 'lamp', 1, 'n', 0),
      ],
    };
    const saved = JSON.stringify(circuit);
    const timing = { relay: { pickupSeconds: 2, dropoutSeconds: 1 } };
    const first = stepSimulation(circuit, resetSimulationState(circuit), 1, {
      coilTimings: timing,
    });
    expect(first.simulationState?.coilStates.relay).toBe(false);
    expect(first.simulationState?.coilElapsedSeconds.relay).toBe(1);

    const pickedUp = stepSimulation(circuit, first.simulationState!, 1, {
      coilTimings: timing,
    });
    expect(pickedUp.simulationState?.coilStates.relay).toBe(true);
    expect(pickedUp.energizedComponents.has('lamp')).toBe(true);
    expect(JSON.stringify(circuit)).toBe(saved);

    circuit.wires = circuit.wires.filter((item) => item.id !== 'coil-live');
    const held = stepSimulation(circuit, pickedUp.simulationState!, 0, { coilTimings: timing });
    expect(held.simulationState?.coilStates.relay).toBe(true);
    const dropped = stepSimulation(circuit, held.simulationState!, 1, { coilTimings: timing });
    expect(dropped.simulationState?.coilStates.relay).toBe(false);
    expect(circuit.components.find((item) => item.id === 'relay')?.state.on).toBeUndefined();
  });

  it('operates the fastest protective curve first and re-solves the upstream current', () => {
    const circuit = timedLoad('mcb', 6000, 16);
    circuit.components.push(component('main', 'mcb', { on: true, customMaxAmps: 17 }));
    circuit.wires[0] = wire('feed', 'l', 0, 'main', 0);
    circuit.wires.push(wire('main-to-device', 'main', 1, 'device', 0));
    for (const item of circuit.wires) item.customCableMm2 = 10;

    const result = stepSimulation(circuit, resetSimulationState(circuit), 4000);
    expect(result.simulationState?.protectionStates.device).toBe('tripped');
    expect(result.simulationState?.protectionStates.main).toBe('closed');
    expect(result.warnings).toContain(
      'Protection selectivity is a modeled timing comparison; manufacturer coordination is not assessed.',
    );
    expect(result.electrical?.loads[0]?.currentAmps).toBeCloseTo(0);
  });
});
