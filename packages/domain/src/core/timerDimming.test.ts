import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from '../circuitFormat';
import { simulate } from '../simulation';
import { component as C, wire as W } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import { compileCircuit } from './compile';
import { controlCircuit } from './controlFixtures';
import { CONTROL_STEP_LIMITS } from './controlStep';
import { terminalId } from './faultTopology';
import { validateCircuitInput } from './input';
import { voltageBetween } from './linearMeasurements';
import { solveCircuit } from './mna';
import { explicitSupplyProfile } from './supplies';
import {
  dimmingCircuit,
  setTimerInput,
  timerCircuit,
  timerDimmingAcceptanceCircuits,
} from './timerDimmingFixtures';
import { isTimerModel, scheduleAt } from './timerModel';

const rWire = 0.0175;
const iOn = 230 / (230 + 3 * rWire);

describe('resistive RMS dimming', () => {
  it.each([0, 0.75, 1.5, 3])(
    'uses setting %s in RMS current, voltage, real power and wire heating',
    (speed) => {
      const circuit = dimmingCircuit(speed);
      const original = structuredClone(circuit);
      const result = simulate(circuit);
      const duty = speed / 3;
      expect(result.electrical?.status).toBe('converged');
      expect(result.legacyObservation).toBeUndefined();
      expect(result.componentCalculations?.lamp.currentAmps).toBeCloseTo(iOn * Math.sqrt(duty), 9);
      expect(result.componentCalculations?.lamp.voltage).toBeCloseTo(
        iOn * 230 * Math.sqrt(duty),
        9,
      );
      expect(result.componentCalculations?.lamp.powerWatts).toBeCloseTo(iOn ** 2 * 230 * duty, 9);
      expect(result.electrical?.wireLosses.feed).toBeCloseTo(iOn ** 2 * rWire * duty, 9);
      expect(result.componentCalculations?.source.powerWatts).toBeCloseTo(-230 * iOn * duty, 8);
      expect(Object.values(result.electrical!.branchPowers).reduce((a, b) => a + b, 0)).toBeCloseTo(
        0,
        8,
      );
      expect(result.electrical?.checks?.maximumKclResidualAmps).toBeLessThan(1e-8);
      expect(result.electrical?.checks?.checkedSwitchingSamples).toBe(
        duty === 0 || duty === 1 ? 1 : 2,
      );
      expect(result.energizedComponents.has('lamp')).toBe(duty > 0);
      expect(circuit).toEqual(original);
    },
  );

  it('keeps zero real switch loss and computes pair RMS before aggregation', () => {
    const result = simulate(dimmingCircuit()).electrical!;
    const branch = JSON.stringify(['device', 'control', 'contact:0:no']);
    expect(result.branchPowers[branch]).toBe(0);
    const measured = voltageBetween(result, terminalId('control', 0), terminalId('control', 1));
    expect(measured).toBeCloseTo(230 * Math.sqrt(0.75), 8);
    expect(result.branchVoltages[branch]).toBeCloseTo(measured!, 8);
    expect(
      Math.abs(
        measured! -
          (result.terminalVoltages[terminalId('control', 0)]! -
            result.terminalVoltages[terminalId('control', 1)]!),
      ),
    ).toBeGreaterThan(80);
  });

  it('solves both shared-feeder states instead of scaling or adding branch RMS currents', () => {
    const circuit = dimmingCircuit();
    circuit.components.push(
      C('junction', 'wago-connector'),
      C('parallel', 'space-heater', { customVoltage: 230, customPowerWatts: 460 }),
    );
    circuit.wires[0]!.fromComponentId = 'junction';
    for (const wire of [
      W('shared', 'source', 0, 'junction', 0),
      W('parallel-feed', 'junction', 1, 'parallel', 0),
      W('parallel-return', 'parallel', 1, 'source', 1),
    ])
      circuit.wires.push({ ...wire, lengthMeters: 1, customCableMm2: 1, material: 'copper' });
    const a = 230 + 3 * rWire;
    const b = 115 + 2 * rWire;
    const onTotal = 230 / (rWire + (a * b) / (a + b));
    const offTotal = 230 / (rWire + b);
    const expected = Math.sqrt(0.25 * onTotal ** 2 + 0.75 * offTotal ** 2);
    const result = simulate(circuit);
    expect(result.electrical?.status).toBe('converged');
    expect(result.wireCalculations?.shared.currentAmps).toBeCloseTo(expected, 9);
    expect(result.electrical?.wireLosses.shared).toBeCloseTo(expected ** 2 * rWire, 9);
    expect(Object.values(result.electrical!.branchPowers).reduce((a, b) => a + b, 0)).toBeCloseTo(
      0,
      8,
    );
    expect(
      result.componentCalculations!.lamp.currentAmps! +
        result.componentCalculations!.parallel.currentAmps!,
    ).not.toBeCloseTo(expected, 2);
  });

  it('uses synchronous conduction windows for cascaded dimmers and is order independent', () => {
    const circuit = dimmingCircuit(1.5);
    circuit.components.push(C('second', 'dimmer-switch', { on: true, speed: 0.75 }));
    circuit.wires.find((w) => w.id === 'output')!.fromComponentId = 'second';
    circuit.wires.push({
      ...W('between', 'control', 1, 'second', 0),
      lengthMeters: 1,
      customCableMm2: 1,
      material: 'copper',
    });
    const result = simulate(circuit);
    expect(result.electrical?.status).toBe('converged');
    expect(result.componentCalculations?.lamp.currentAmps).toBeCloseTo(
      (230 / (230 + 4 * rWire)) * Math.sqrt(0.25),
      9,
    );
    expect(
      simulate({
        ...circuit,
        components: [...circuit.components].reverse(),
        wires: [...circuit.wires].reverse(),
      }),
    ).toEqual(result);
  });

  it('preserves model guards for unsupported loads, DC, reactive excitation and unsafe on-state voltage', () => {
    for (const type of ['bulb', 'ceiling-fan']) {
      const circuit = dimmingCircuit();
      circuit.components.find((c) => c.id === 'lamp')!.type = type;
      const result = simulate(circuit);
      expect(result.electrical?.status).toBe('unsupported');
      expect(result.legacyObservation?.reason).toContain(
        'dimming and motor speed are not assessed',
      );
      expect(result.componentCalculations).toBeUndefined();
      expect(result.electrical?.assessment).toBe('not-assessed');
      // Explicit time requests cannot substitute qualitative legacy observations.
      expect(simulate(circuit, { deltaSeconds: 1 }).legacyObservation).toBeUndefined();
    }
    const dc = dimmingCircuit(0);
    dc.components[0]!.type = 'dc-battery-12v';
    expect(
      simulate(dc).electrical?.diagnostics.some((d) => d.code === 'dimmer-supply-unsupported'),
    ).toBe(true);
    const incompatible = dimmingCircuit(0.3);
    incompatible.components.find((c) => c.id === 'lamp')!.state.customMaxVolts = 110;
    const result = simulate(incompatible);
    expect(result.componentCalculations!.lamp.voltage).toBeLessThan(110);
    expect(result.electrical?.loads[0]?.compatibility.status).toBe('incompatible');
    expect(result.electrical?.operation).toBe('incompatible');
    expect(solveCircuit(dimmingCircuit()).status).toBe('unsupported');
    expect(validateCircuitInput(dimmingCircuit(3.01)).valid).toBe(false);
  });

  it('treats dimmer settings as step inputs, and defaults an omitted setting to full output', () => {
    const circuit = dimmingCircuit();
    const start = simulate(circuit, { deltaSeconds: 0.5 });
    const next = dimmingCircuit(3);
    const changed = simulate(next, { simulationState: start.simulationState, deltaSeconds: 0.5 });
    expect(changed.electrical?.status).toBe('converged');
    expect(changed.simulationState?.elapsedSeconds).toBe(1);
    expect(changed.componentCalculations?.lamp.currentAmps).toBeCloseTo(iOn, 9);
    next.components.find((c) => c.id === 'control')!.state.speed = undefined;
    expect(simulate(next).componentCalculations?.lamp.currentAmps).toBeCloseTo(iOn, 9);
  });

  it('preserves legacy five-position fan inputs with unassessed measurements and zero-level continuity', () => {
    const circuit = dimmingCircuit(5);
    circuit.components[1]!.type = 'fan-dimmer';
    circuit.components[2]!.type = 'ceiling-fan';
    expect(validateCircuitInput(circuit).valid).toBe(true);
    const full = simulate(circuit);
    expect(full.legacyObservation).toBeDefined();
    expect(full.energizedComponents.has('lamp')).toBe(true);
    expect(full.componentCalculations).toBeUndefined();
    expect(full.electrical?.operation).toBe('not-assessed');
    circuit.components[1]!.state.speed = 0;
    expect(simulate(circuit).energizedComponents.has('lamp')).toBe(false);
    expect(importJSON(exportJSON(circuit)).components[1]!.state.speed).toBe(0);
  });
});

describe('timer programs and deterministic events', () => {
  it.each(['timer-switch', 'digital-weekly-timer', 'staircase-timer', 'countdown-timer'])(
    'continues %s after equivalent program JSON fields are reordered',
    (type) => {
      const circuit = timerCircuit(type);
      const reordered = structuredClone(circuit);
      reordered.components[1]!.state.timerModel = JSON.parse(
        JSON.stringify(reordered.components[1]!.state.timerModel, (_key, value) =>
          value && typeof value === 'object' && !Array.isArray(value)
            ? Object.fromEntries(Object.entries(value).reverse())
            : value,
        ),
      );
      const first = simulate(circuit, { deltaSeconds: 0.5 });
      expect(simulate(reordered, { deltaSeconds: 0.5 })).toEqual(first);
      const options = { simulationState: first.simulationState, deltaSeconds: 1 };
      const continued = simulate(reordered, options);
      expect(continued.electrical?.status).toBe('converged');
      expect(continued.simulationState?.elapsedSeconds).toBe(1.5);
      expect(continued).toEqual(simulate(circuit, options));
    },
  );

  it('re-solves a timer-fed coil at each event and preserves delayed relay operation', () => {
    const circuit = controlCircuit({ onDelaySeconds: 0.25, offDelaySeconds: 0.25 });
    const contact = circuit.components.find((c) => c.id === 'switch')!;
    contact.type = 'timer-switch';
    contact.state.timerModel = {
      version: 1,
      kind: 'schedule',
      periodSeconds: 86_400,
      offsetSeconds: 0,
      windows: [{ startSeconds: 1, endSeconds: 2 }],
    };
    const result = simulate(circuit, { deltaSeconds: 2.5 });
    expect(result.electrical?.status).toBe('converged');
    expect(result.simulationEvents?.map((event) => [event.type, event.atSeconds])).toEqual([
      ['timer-on', 1],
      ['coil-pickup', 1.25],
      ['timer-off', 2],
      ['coil-dropout', 2.25],
    ]);
    expect(result.coilStates?.relay).toBe(false);
    expect(result.timerContactStates?.switch).toBe(false);
    expect(result.energizedComponents).toEqual(new Set(['nc']));
  });
  it.each(['timer-switch', 'digital-weekly-timer'])(
    'operates %s at exact boundaries and matches partitioned replay',
    (type) => {
      const circuit = timerCircuit(type);
      const first = simulate(circuit, { deltaSeconds: 0.999999 });
      expect(first.timerContactStates?.control).toBe(false);
      const on = simulate(circuit, {
        simulationState: first.simulationState,
        deltaSeconds: 0.000001,
      });
      expect(on.timerContactStates?.control).toBe(true);
      expect(on.simulationEvents).toMatchObject([
        { type: 'timer-on', atSeconds: 1, contactCurrentAmps: 0 },
      ]);
      const end = simulate(circuit, { deltaSeconds: 4 });
      expect(end.timerContactStates?.control).toBe(false);
      expect(end.simulationEvents?.map((e) => [e.type, e.atSeconds])).toEqual([
        ['timer-on', 1],
        ['timer-off', 2],
        ['timer-on', 3],
        ['timer-off', 4],
      ]);
      expect(end.simulationEvents?.[1]).toMatchObject({
        contactCurrentAmps: expect.closeTo(iOn, 9),
      });
      expect(end.componentCalculations?.lamp.currentAmps).toBeCloseTo(0, 12);
      let split = simulate(circuit);
      const events = [...split.simulationEvents!];
      for (let i = 0; i < 40; i++) {
        split = simulate(circuit, { simulationState: split.simulationState, deltaSeconds: 0.1 });
        events.push(...split.simulationEvents!);
      }
      expect(split.simulationState).toEqual(end.simulationState);
      expect(split.electrical).toEqual(end.electrical);
      expect(events).toEqual(end.simulationEvents);
      expect(simulate(circuit)).toEqual(simulate(circuit, { deltaSeconds: 0 }));
    },
  );

  it('handles cycle wrap, full-cycle/empty programs, and disabling without a wall clock', () => {
    const program = {
      version: 1 as const,
      kind: 'schedule' as const,
      periodSeconds: 604_800,
      offsetSeconds: 604_799,
      windows: [{ startSeconds: 0, endSeconds: 2 }],
    };
    expect(scheduleAt(program, 1)).toEqual({ closed: true, nextSeconds: 3 });
    expect(scheduleAt({ ...program, windows: [] }, 1).nextSeconds).toBeNull();
    expect(
      scheduleAt({ ...program, windows: [{ startSeconds: 0, endSeconds: 604_800 }] }, 1),
    ).toEqual({ closed: true, nextSeconds: null });
    const circuit = timerCircuit('digital-weekly-timer', program);
    const on = simulate(circuit, { deltaSeconds: 1 });
    expect(on.timerContactStates?.control).toBe(true);
    const off = simulate(setTimerInput(circuit, false), { simulationState: on.simulationState });
    expect(off.timerContactStates?.control).toBe(false);
    expect(off.simulationState?.pending).toEqual({});
    expect(off.simulationEvents?.[0]).toMatchObject({
      type: 'timer-off',
      reason: 'disabled',
      atSeconds: 1,
    });
  });

  it.each(['restart', 'ignore'] as const)(
    'keeps released interval inputs running and implements %s retrigger',
    (retrigger) => {
      const circuit = timerCircuit('staircase-timer', {
        version: 1,
        kind: 'interval',
        durationSeconds: 2,
        retrigger,
      });
      const on = simulate(circuit);
      expect(on.timerContactStates?.control).toBe(true);
      const released = simulate(setTimerInput(circuit, false), {
        simulationState: on.simulationState,
        deltaSeconds: 1,
      });
      expect(released.timerContactStates?.control).toBe(true);
      const retriggered = simulate(circuit, { simulationState: released.simulationState });
      expect(retriggered.simulationState?.pending.control?.atSeconds).toBe(
        retrigger === 'restart' ? 3 : 2,
      );
      expect(retriggered.simulationEvents?.length).toBe(retrigger === 'restart' ? 1 : 0);
      const end = simulate(circuit, {
        simulationState: retriggered.simulationState,
        deltaSeconds: 3,
      });
      expect(end.timerContactStates?.control).toBe(false);
      expect(end.simulationState?.timers.control?.deadlineSeconds).toBeNull();
      expect(
        simulate(circuit, { simulationState: end.simulationState, deltaSeconds: 1 })
          .timerContactStates?.control,
      ).toBe(false);
    },
  );

  it('requires a complete declared countdown supply, resets on loss, and needs a fresh trigger after restore', () => {
    const circuit = timerCircuit('countdown-timer');
    const on = simulate(circuit);
    expect(on.electrical?.status).toBe('converged');
    expect(on.timerContactStates?.control).toBe(true);
    expect(on.electrical?.timers?.[0]?.controlPowerWatts).toBeCloseTo(1, 3);
    expect(on.electrical?.checks?.maximumPowerResidualWatts).toBeLessThan(1e-8);
    const missingNeutral = structuredClone(circuit);
    missingNeutral.wires.find((w) => w.id === 'electronics-return')!.fault = 'open-circuit';
    const lost = simulate(missingNeutral, {
      simulationState: on.simulationState,
      deltaSeconds: 0.5,
    });
    expect(lost.timerContactStates?.control).toBe(false);
    expect(lost.simulationEvents?.[0]).toMatchObject({
      type: 'timer-off',
      reason: 'power-loss',
      atSeconds: 0,
    });
    expect(
      simulate(circuit, { simulationState: lost.simulationState }).timerContactStates?.control,
    ).toBe(false);
    const released = simulate(setTimerInput(circuit, false), {
      simulationState: lost.simulationState,
    });
    expect(
      simulate(circuit, { simulationState: released.simulationState }).timerContactStates?.control,
    ).toBe(true);
    expect(simulate(missingNeutral).timerContactStates?.control).toBe(false);
    const wrongFrequency = structuredClone(circuit);
    wrongFrequency.supply = explicitSupplyProfile({
      kind: 'ac-single-phase',
      voltage: 230,
      frequencyHz: 60,
    });
    expect(simulate(wrongFrequency).electrical?.status).toBe('unsupported');
  });

  it('validates programs, family mapping, foreign state and bounded events', () => {
    const circuit = timerCircuit();
    const model = circuit.components[1]!.state.timerModel!;
    expect(isTimerModel({ ...model, windows: [{ startSeconds: 2, endSeconds: 1 }] })).toBe(false);
    expect(
      isTimerModel({
        ...model,
        windows: [
          { startSeconds: 1, endSeconds: 3 },
          { startSeconds: 2, endSeconds: 4 },
        ],
      }),
    ).toBe(false);
    expect(isTimerModel({ ...model, offsetSeconds: 86_400 })).toBe(false);
    expect(isTimerModel({ ...model, timezone: 'UTC' })).toBe(false);
    const misplaced = structuredClone(circuit);
    misplaced.components[1]!.type = 'dimmer-switch';
    expect(validateCircuitInput(misplaced).valid).toBe(false);
    const interval = timerCircuit('staircase-timer');
    const state = simulate(interval).simulationState!;
    expect(
      simulate(interval, { simulationState: { ...state, timers: {} } }).electrical?.status,
    ).toBe('invalid');
    expect(
      simulate(timerCircuit('countdown-timer'), { simulationState: state }).electrical?.status,
    ).toBe('invalid');
    const changed = structuredClone(interval);
    if (changed.components[1]!.state.timerModel?.kind === 'interval')
      changed.components[1]!.state.timerModel.durationSeconds = 3;
    expect(simulate(changed, { simulationState: state }).electrical?.status).toBe('invalid');
    expect(
      simulate(circuit, { deltaSeconds: CONTROL_STEP_LIMITS.maxDeltaSeconds + 1 }).electrical
        ?.status,
    ).toBe('invalid');
    expect(solveCircuit(circuit).status).toBe('unsupported');
    const unconfigured = structuredClone(circuit);
    unconfigured.components[1]!.state.timerModel = undefined;
    expect(simulate(unconfigured).electrical?.status).toBe('unsupported');
  });

  it('keeps settings, saved terminals, import/restore, input order and basic/Pro output consistent', () => {
    for (const circuit of Object.values(timerDimmingAcceptanceCircuits())) {
      const original = structuredClone(circuit);
      const result = simulate(circuit, { deltaSeconds: 3 });
      expect(simulate(circuit, { appMode: 'basic', deltaSeconds: 3 })).toEqual(
        simulate(circuit, { appMode: 'pro', deltaSeconds: 3 }),
      );
      expect(simulate(importJSON(exportJSON(circuit)), { deltaSeconds: 3 })).toEqual(result);
      expect(exportJSON(circuit)).not.toMatch(/deadlineSeconds|elapsedSeconds|contactStates/);
      const reordered: Circuit = {
        ...circuit,
        components: [...circuit.components].reverse(),
        wires: [...circuit.wires].reverse(),
      };
      expect(simulate(reordered, { deltaSeconds: 3 })).toEqual(result);
      expect(compileCircuit(circuit).status).toBe('compiled');
      expect(circuit).toEqual(original);
    }
  });
});
