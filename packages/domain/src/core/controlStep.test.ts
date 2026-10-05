import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from '../circuitFormat';
import { COMPONENT_DEFS } from '../components';
import { simulate } from '../simulation';
import type { Circuit } from '../types';
import { compileCircuit } from './compile';
import { controlCircuit, setControlSupply, setControlSwitch } from './controlFixtures';
import { CONTROL_ENGINE_VERSION } from './controlStep';
import { validateCircuitInput } from './input';
import { solveCircuit } from './mna';
import { explicitSupplyProfile } from './supplies';

const coilCurrent = 12 / (144 + 3 * 0.0175);
const loadCurrent = 230 / (230 + 3 * 0.0175);

describe('declared coil steps', () => {
  it.each(['relay-spst', 'relay-dpdt', 'control-relay', 'delay-timer', 'contactor-1p'])(
    'operates the declared %s coil without changing canonical pole terminals',
    (type) => {
      const circuit = controlCircuit({ onDelaySeconds: 0.25 });
      const relay = circuit.components.find((c) => c.id === 'relay')!;
      relay.type = type;
      circuit.components = circuit.components.filter((c) => c.id !== 'nc');
      circuit.wires = circuit.wires.filter((w) => !w.id.startsWith('nc-'));
      if (type === 'contactor-1p') {
        const port = [2, 3, 0, 1];
        circuit.wires = circuit.wires.map((w) => ({
          ...w,
          fromPortIndex: w.fromComponentId === 'relay' ? port[w.fromPortIndex]! : w.fromPortIndex,
          toPortIndex: w.toComponentId === 'relay' ? port[w.toPortIndex]! : w.toPortIndex,
        }));
      }
      expect(simulate(circuit, { deltaSeconds: 0.249 }).energizedComponents.has('no')).toBe(false);
      const result = simulate(circuit, { deltaSeconds: 0.25 });
      expect(result.electrical?.status).toBe('converged');
      expect(result.coilStates?.relay).toBe(true);
      expect(result.energizedComponents.has('no')).toBe(true);
      expect(result.componentCalculations?.no.currentAmps).toBeCloseTo(loadCurrent, 9);
    },
  );

  it('supports declared single-phase AC coils and rejects a different frequency', () => {
    const supply = { kind: 'ac-single-phase' as const, voltage: 12, frequencyHz: 50 };
    const circuit = {
      ...controlCircuit({ supply, onDelaySeconds: 0 }),
      supply: explicitSupplyProfile(supply),
    };
    const result = simulate(circuit);
    expect(result.coilStates?.relay).toBe(true);
    expect(result.componentCalculations?.relay.currentAmps).toBeCloseTo(coilCurrent, 9);
    const mismatch = { ...circuit, supply: explicitSupplyProfile({ ...supply, frequencyHz: 60 }) };
    expect(simulate(mismatch).electrical?.status).toBe('unsupported');
  });

  it('orders simultaneous coil events by component ID and preserves state on a zero step', () => {
    const circuit = controlCircuit();
    const relay = structuredClone(circuit.components.find((c) => c.id === 'relay')!);
    relay.id = 'a-relay';
    circuit.components.push(relay);
    circuit.wires.push(
      {
        ...circuit.wires[0]!,
        id: 'other-feed',
        fromComponentId: 'dc',
        fromPortIndex: 0,
        toComponentId: relay.id,
        toPortIndex: 0,
      },
      { ...circuit.wires[2]!, id: 'other-return', fromComponentId: relay.id },
    );
    const result = simulate(circuit, { deltaSeconds: 1 });
    expect(result.simulationEvents?.map((e) => [e.componentId, e.atSeconds, e.sequence])).toEqual([
      ['a-relay', 1, 1],
      ['relay', 1, 2],
    ]);
    const unchanged = simulate(circuit, {
      simulationState: result.simulationState,
      deltaSeconds: 0,
    });
    expect(unchanged.simulationState).toEqual(result.simulationState);
    expect(unchanged.simulationEvents).toEqual([]);
  });

  it('solves a 12 V coil independently of the switched 230 V circuit, then reports post-event values', () => {
    const circuit = controlCircuit();
    const original = structuredClone(circuit);
    const initial = simulate(circuit);
    expect(initial.electrical?.status).toBe('converged');
    expect(initial.electrical?.engineVersion).toBe(CONTROL_ENGINE_VERSION);
    expect(initial.legacyObservation).toBeUndefined();
    expect(initial.coilStates).toEqual({ relay: false });
    expect(initial.energizedComponents).toEqual(new Set(['nc']));
    expect(initial.componentCalculations?.relay.currentAmps).toBeCloseTo(coilCurrent, 9);
    expect(initial.componentCalculations?.relay.powerWatts).toBeCloseTo(coilCurrent ** 2 * 144, 9);
    expect(initial.simulationState?.pending.relay).toEqual({ closed: true, atSeconds: 1 });
    const before = simulate(circuit, {
      simulationState: initial.simulationState,
      deltaSeconds: 0.999,
    });
    expect(before.coilStates?.relay).toBe(false);
    expect(before.simulationEvents).toEqual([]);
    const after = simulate(circuit, {
      simulationState: before.simulationState,
      deltaSeconds: 0.001,
    });
    expect(after.coilStates).toEqual({ relay: true });
    expect(after.energizedComponents).toEqual(new Set(['no']));
    expect(after.componentCalculations?.no.currentAmps).toBeCloseTo(loadCurrent, 9);
    expect(after.componentCalculations?.nc.currentAmps).toBeCloseTo(0, 10);
    expect(after.simulationEvents).toEqual([
      {
        sequence: 1,
        atSeconds: 1,
        componentId: 'relay',
        type: 'coil-pickup',
        coilVoltageVolts: expect.closeTo(coilCurrent * 144, 9),
        coilCurrentAmps: expect.closeTo(coilCurrent, 9),
        coilPowerWatts: expect.closeTo(coilCurrent ** 2 * 144, 9),
      },
    ]);
    expect(after.electrical?.checks?.maximumPowerResidualWatts).toBeCloseTo(0, 8);
    expect(after.electrical?.checks?.maximumKclResidualAmps).toBeCloseTo(0, 8);
    expect(circuit).toEqual(original);
    expect(initial.simulationState?.elapsedSeconds).toBe(0);
    expect(initial.simulationState?.contactStates.relay).toBe(false);
  });

  it('does not operate from the saved manual state when the explicit coil is unpowered', () => {
    const circuit = setControlSwitch(controlCircuit({ onDelaySeconds: 0 }), false);
    circuit.components.find((c) => c.id === 'relay')!.state.on = true;
    expect(simulate(circuit).coilStates?.relay).toBe(false);
  });

  it('cancels pickup when power is removed, restarts its full delay, and applies off delay', () => {
    const circuit = controlCircuit();
    const first = simulate(circuit, { deltaSeconds: 0.5 });
    const off = setControlSwitch(circuit, false);
    const canceled = simulate(off, { simulationState: first.simulationState, deltaSeconds: 2 });
    expect(canceled.simulationState?.pending).toEqual({});
    expect(canceled.coilStates?.relay).toBe(false);
    const restarted = simulate(circuit, {
      simulationState: canceled.simulationState,
      deltaSeconds: 0.999,
    });
    expect(restarted.coilStates?.relay).toBe(false);
    const pickedUp = simulate(circuit, {
      simulationState: restarted.simulationState,
      deltaSeconds: 0.001,
    });
    expect(pickedUp.simulationEvents?.[0]?.atSeconds).toBe(3.5);
    const dropping = simulate(off, {
      simulationState: pickedUp.simulationState,
      deltaSeconds: 0.249,
    });
    expect(dropping.coilStates?.relay).toBe(true);
    const dropped = simulate(off, {
      simulationState: dropping.simulationState,
      deltaSeconds: 0.001,
    });
    expect(dropped.coilStates?.relay).toBe(false);
    expect(dropped.energizedComponents).toEqual(new Set(['nc']));
    expect(dropped.simulationEvents?.[0]).toMatchObject({
      atSeconds: 3.75,
      type: 'coil-dropout',
      coilCurrentAmps: 0,
    });
  });

  it('uses pickup/dropout hysteresis from actual coil voltage including lead resistance', () => {
    const circuit = controlCircuit({ onDelaySeconds: 0, offDelaySeconds: 0 });
    // A switched parallel feed changes actual coil voltage without changing ratings.
    circuit.wires.find((w) => w.id === 'coil-feed')!.lengthMeters = 4000;
    expect(simulate(circuit).coilStates?.relay).toBe(false); // 8.07 V < 9.6 V pickup.
    circuit.components.push({
      id: 'boost',
      type: 'single-way-switch',
      x: 0,
      y: 0,
      state: { on: true },
    });
    circuit.wires.push(
      {
        ...circuit.wires[0]!,
        id: 'boost-feed',
        fromComponentId: 'dc',
        fromPortIndex: 0,
        toComponentId: 'boost',
        toPortIndex: 0,
        lengthMeters: 1,
      },
      {
        ...circuit.wires[0]!,
        id: 'boost-output',
        fromComponentId: 'boost',
        fromPortIndex: 1,
        toComponentId: 'relay',
        toPortIndex: 0,
        lengthMeters: 1,
      },
    );
    const active = simulate(circuit);
    expect(active.coilStates?.relay).toBe(true);
    circuit.components.find((c) => c.id === 'boost')!.state.on = false;
    const held = simulate(circuit, { simulationState: active.simulationState });
    expect(held.componentCalculations?.relay.voltage).toBeLessThan(9.6);
    expect(held.componentCalculations?.relay.voltage).toBeGreaterThan(2.4);
    expect(held.coilStates?.relay).toBe(true);
    expect(simulate(circuit).coilStates?.relay).toBe(false);
    expect(
      simulate(setControlSwitch(circuit, false), { simulationState: held.simulationState })
        .coilStates?.relay,
    ).toBe(false);
  });

  it('keeps fractional steps, input order, reset and replay deterministic', () => {
    const circuit = controlCircuit();
    const single = simulate(circuit, { deltaSeconds: 1 });
    let split = simulate(circuit);
    const events = [...split.simulationEvents!];
    for (let i = 0; i < 10; i++) {
      split = simulate(circuit, {
        simulationState: structuredClone(split.simulationState),
        deltaSeconds: 0.1,
      });
      events.push(...split.simulationEvents!);
    }
    expect(split.simulationState).toEqual(single.simulationState);
    expect(split.electrical).toEqual(single.electrical);
    expect(events).toEqual(single.simulationEvents);
    const reordered = {
      ...circuit,
      components: [...circuit.components].reverse(),
      wires: [...circuit.wires].reverse(),
    };
    expect(simulate(reordered, { deltaSeconds: 1 })).toEqual(single);
    expect(simulate(circuit)).toEqual(simulate(circuit, { deltaSeconds: 0 }));
    expect(simulate(circuit, { deltaSeconds: 1 })).toEqual(single);
  });

  it('rejects stale, foreign, malformed or unbounded state without measurements or legacy fallback', () => {
    const circuit = controlCircuit();
    const valid = simulate(circuit).simulationState!;
    for (const state of [
      null,
      {},
      { ...valid, elapsedSeconds: -1 },
      { ...valid, modelVersion: 'old' },
      { ...valid, contactStates: { relay: 'yes' } },
      { ...valid, pending: { relay: { closed: true, atSeconds: Number.POSITIVE_INFINITY } } },
    ]) {
      const result = simulate(circuit, { simulationState: state as typeof valid });
      expect(result.electrical?.status).toBe('invalid');
      expect(result.simulationState).toBeUndefined();
      expect(result.componentCalculations).toBeUndefined();
      expect(result.legacyObservation).toBeUndefined();
    }
    expect(
      simulate(setControlSupply(circuit, 24), { simulationState: valid }).electrical?.status,
    ).toBe('invalid');
    for (const delta of [-1, Number.POSITIVE_INFINITY, Number.NaN, 3601, null, '1'])
      expect(simulate(circuit, { deltaSeconds: delta as number }).electrical?.status).toBe(
        'invalid',
      );
  });

  it('retains settings through file migration and omits transient timer state', () => {
    const circuit = controlCircuit();
    const restored = importJSON(exportJSON(circuit));
    expect(restored.components.find((c) => c.id === 'relay')?.state.coilModel).toEqual(
      circuit.components.find((c) => c.id === 'relay')?.state.coilModel,
    );
    expect(simulate(restored, { deltaSeconds: 1 })).toEqual(simulate(circuit, { deltaSeconds: 1 }));
    expect(exportJSON(circuit)).not.toContain('contactStates');
    expect(exportJSON(circuit)).not.toContain('elapsedSeconds');
    const legacy = structuredClone(circuit);
    legacy.components.find((c) => c.id === 'relay')!.state.coilModel = undefined;
    expect(
      importJSON(JSON.stringify({ version: 1, circuit: legacy })).components.find(
        (c) => c.id === 'relay',
      )?.state.coilModel,
    ).toBeUndefined();
  });

  it('keeps basic/Pro equations equal and leaves static/unconfigured control coverage explicit', () => {
    const circuit = controlCircuit();
    expect(simulate(circuit, { appMode: 'basic', deltaSeconds: 1 })).toEqual(
      simulate(circuit, { appMode: 'pro', deltaSeconds: 1 }),
    );
    expect(solveCircuit(circuit).status).toBe('unsupported');
    const unconfigured = structuredClone(circuit);
    unconfigured.components.find((c) => c.id === 'relay')!.state.coilModel = undefined;
    expect(simulate(unconfigured).electrical?.status).toBe('unsupported');
  });

  it('rejects invalid coil settings and coil fields on components without coil terminals', () => {
    for (const change of [
      { nominalPowerWatts: 0 },
      { pickupRatio: 0.2, dropoutRatio: 0.3 },
      { onDelaySeconds: -1 },
      { offDelaySeconds: 3601 },
    ]) {
      expect(validateCircuitInput(controlCircuit(change)).valid).toBe(false);
    }
    const circuit = controlCircuit();
    const coil = circuit.components.find((c) => c.id === 'relay')!.state.coilModel!;
    circuit.components.find((c) => c.id === 'no')!.state.coilModel = coil;
    expect(validateCircuitInput(circuit).valid).toBe(false);
    expect(
      compileCircuit(controlCircuit(), {
        defs: {
          ...COMPONENT_DEFS,
          'relay-spdt': {
            ...COMPONENT_DEFS['relay-spdt'],
            electricalModel: {
              kind: 'contacts',
              poles: [{ common: 2, no: 3 }],
              coil: [0, 1],
              coilModel: { ...coil, nominalPowerWatts: -1 },
            },
          },
        },
      }).status,
    ).toBe('invalid');
  });

  it('rejects a mismatched coil waveform instead of falling back to rail switching', () => {
    const result = simulate(
      controlCircuit({ supply: { kind: 'ac-single-phase', voltage: 12, frequencyHz: 50 } }),
    );
    expect(result.electrical?.status).toBe('unsupported');
    expect(
      result.electrical?.diagnostics.some((d) => d.code === 'control-supply-unsupported'),
    ).toBe(true);
    expect(result.componentCalculations).toBeUndefined();
    expect(result.legacyObservation).toBeUndefined();
  });

  it('bounds zero-delay self-interrupting feedback without publishing an unstable result', () => {
    const circuit: Circuit = controlCircuit({ onDelaySeconds: 0, offDelaySeconds: 0 });
    circuit.components = circuit.components.filter((c) =>
      ['dc', 'dc-return', 'relay'].includes(c.id),
    );
    circuit.wires = [
      {
        ...circuit.wires[0]!,
        fromComponentId: 'dc',
        fromPortIndex: 0,
        toComponentId: 'relay',
        toPortIndex: 2,
      },
      {
        ...circuit.wires[1]!,
        fromComponentId: 'relay',
        fromPortIndex: 4,
        toComponentId: 'relay',
        toPortIndex: 0,
      },
      circuit.wires[2]!,
    ];
    const result = simulate(circuit, { deltaSeconds: 1 });
    expect(result.electrical?.status).toBe('nonconverged');
    expect(result.electrical?.diagnostics[0]?.code).toBe('control-feedback-unstable');
    expect(result.componentCalculations).toBeUndefined();
    expect(result.simulationState).toBeUndefined();
    expect(result.simulationEvents).toEqual([]);
  });
});
