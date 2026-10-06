import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from '../circuitFormat';
import { COMPONENT_DEFS } from '../components';
import { component as C } from '../simulation/auditFixtures';
import { simulate } from '../simulation/simulate';
import { compileCircuit } from './compile';
import { validateCircuitInput } from './input';
import { solveCircuit } from './mna';
import { leadFixture } from './mnaFixtures';
import { motorAcceptanceCircuits, motorCircuit, motorFixtureModel } from './motorFixtures';
import { isMotorModel } from './motorModel';
import { normalizeCircuitDocument } from './normalize';
import { phasorMagnitude, solvePhasorCircuit } from './phasor';
import { rcdBalancedCircuit, rcdLeakingCircuit } from './protectionFixtures';

const wire = (id: string) => JSON.stringify(['wire', id]);

describe('declared balanced motor teaching operation', () => {
  it('matches independent delta-to-star current, voltage, power and wire-loss equations', () => {
    const circuit = motorCircuit();
    const result = simulate(circuit);
    const motor = result.phasor!.motors[0]!;
    // Rdelta = 160 Ω, equivalent Rstar = 160/3 Ω; one 0.07 Ω line lead.
    const star = 160 / 3;
    const current = 400 / Math.sqrt(3) / (star + 0.07);
    expect(result.phasor!.status).toBe('converged');
    expect(motor.state).toBe('running');
    expect(motor.connectedPhases).toEqual(['l1', 'l2', 'l3']);
    expect(motor.sequence).toBe('abc');
    for (const i of motor.lineCurrents) expect(phasorMagnitude(i)).toBeCloseTo(current, 9);
    for (const v of motor.lineVoltages)
      expect(phasorMagnitude(v!)).toBeCloseTo((400 * star) / (star + 0.07), 8);
    expect(motor.equivalentInputPowerWatts).toBeCloseTo(3 * current ** 2 * star, 8);
    expect(Object.values(result.phasor!.wireLossesWatts).reduce((a, b) => a + b)).toBeCloseTo(
      3 * current ** 2 * 0.07,
      9,
    );
    expect(result.phasor!.checks!.maximumResidualRatio).toBeLessThan(1);
    expect(result.energizedComponents.has('motor')).toBe(true);
    expect(result.faultsCleared).toBe(false);
    expect(result.electrical).toBeUndefined();
    expect(motor.mechanicalOperation).toBe('not-assessed');
  });

  it.each(['lost-phase', 'single-live', 'reversed-leads', 'wrong-frequency', 'unbalanced'])(
    '%s cannot obtain motor success',
    (name) => {
      const result = simulate(motorAcceptanceCircuits()[name]!);
      expect(result.phasor!.status).toBe('converged');
      expect(result.phasor!.motors[0]!.state).toBe('blocked');
      expect(result.energizedComponents.has('motor')).toBe(false);
      expect(result.faultsCleared).toBe(false);
      expect(result.phasor!.motors[0]!.reasons.length).toBeGreaterThan(0);
    },
  );

  it('lost phase stays missing despite winding-backfed voltage', () => {
    const result = simulate(motorAcceptanceCircuits()['lost-phase']!);
    const motor = result.phasor!.motors[0]!;
    expect(motor.connectedPhases).toEqual(['l1', null, 'l3']);
    expect(phasorMagnitude(motor.lineVoltages[0]!)).toBeGreaterThan(100);
    expect(motor.reasons).toContain('motor-phase-loss');
  });

  it('cyclic lead permutations preserve sequence, swapping two reverses it, and ACB can be declared', () => {
    const circuit = motorCircuit();
    for (const lead of circuit.wires) lead.toPortIndex = (lead.toPortIndex + 1) % 3;
    expect(simulate(circuit).phasor!.motors[0]!.state).toBe('running');
    const reverse = motorAcceptanceCircuits()['reversed-leads']!;
    expect(simulate(reverse).phasor!.motors[0]!.sequence).toBe('acb');
    reverse.components[1]!.state.motorModel!.requiredSequence = 'acb';
    expect(simulate(reverse).phasor!.motors[0]!.state).toBe('running');
  });

  it('no conductive phases is stopped and repeated phases are blocked', () => {
    const circuit = motorCircuit();
    circuit.wires = [];
    expect(simulate(circuit).phasor!.motors[0]!.state).toBe('stopped');
    const repeated = motorCircuit();
    repeated.wires[1]!.fromPortIndex = 0;
    expect(simulate(repeated).phasor!.motors[0]!.state).toBe('blocked');
  });

  it('guards undeclared/reactive models and scalar-only entry points', () => {
    const circuit = motorCircuit();
    expect(solveCircuit(circuit).status).toBe('unsupported');
    circuit.components[1]!.state.motorModel = undefined;
    expect(simulate(circuit).phasor!.status).toBe('unsupported');
    expect(isMotorModel({ ...motorFixtureModel(), powerFactor: 0.8 })).toBe(false);
  });

  it('keeps the equipment voltage rating separate from the teaching operating range', () => {
    const circuit = motorCircuit();
    circuit.components[1]!.state.customMaxVolts = 380;
    const result = simulate(circuit);
    expect(result.phasor!.motors[0]!.state).toBe('blocked');
    expect(result.phasor!.motors[0]!.reasons).toContain('motor-rating-incompatible');
    expect(result.blownComponents).toBeUndefined();
  });

  it('validates targets and numerical bounds and deep-copies/persists explicit settings', () => {
    const circuit = motorCircuit();
    const restored = importJSON(exportJSON(circuit));
    expect(restored.components[1]!.state.motorModel).toEqual(motorFixtureModel());
    const copy = normalizeCircuitDocument(circuit);
    copy.components[1]!.state.motorModel!.operatingLineVoltageRange.min = 370;
    expect(circuit.components[1]!.state.motorModel!.operatingLineVoltageRange.min).toBe(360);
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1, 0])
      expect(isMotorModel({ ...motorFixtureModel(), inputPowerWatts: value })).toBe(false);
    expect(isMotorModel({ ...motorFixtureModel(), maximumUnbalanceRatio: 0.2 })).toBe(false);
    circuit.components[0]!.state.motorModel = motorFixtureModel();
    expect(validateCircuitInput(circuit).valid).toBe(false);
  });
});

describe('phasor coils, actual contact poles and residual vectors', () => {
  it('retains independent pole RMS readings while withholding an unsynchronized residual', () => {
    const result = simulate(motorAcceptanceCircuits()['independent-poles']!);
    expect(result.phasor!.status).toBe('converged');
    const poles = result.phasor!.deviceCurrents.find((p) => p.componentId === 'p')!;
    expect(poles.poles[0]!.rmsAmps).toBeGreaterThan(4);
    expect(poles.poles[1]!.rmsAmps).toBeGreaterThan(0.9);
    expect(poles.maximumPoleCurrentAmps).toBeGreaterThan(4);
    expect(poles.residual).toBeNull();
    expect(poles.residualMilliamps).toBeNull();
    expect(poles.residualUnavailableReason).toBe('independent-references');
  });
  it('L-L coils use their actual terminal voltage and do not inherit the source L-N rating', () => {
    const circuit = motorCircuit(true);
    const coil = circuit.components.find((c) => c.id === 'k')!.state.coilModel!;
    coil.supply = { kind: 'ac-single-phase', voltage: 400, frequencyHz: 50 };
    circuit.wires.find((w) => w.id === 'coil-return')!.toPortIndex = 1;
    const result = simulate(circuit, { deltaSeconds: 1 });
    expect(result.coilStates).toEqual({ k: true });
    expect(phasorMagnitude(result.phasor!.controls[0]!.coilVoltage!)).toBeCloseTo(
      (400 * 20_000) / (20_000 + 0.21),
      8,
    );
  });

  it('RCCB signed live/neutral vectors cancel on L2; an external return and bypass are measured separately', () => {
    for (const leaking of [false, true]) {
      const circuit = leaking ? rcdLeakingCircuit() : rcdBalancedCircuit();
      const source = circuit.components[0]!;
      source.type = 'ac-three-phase-supply';
      source.state.sourceProfile = undefined;
      for (const w of circuit.wires) {
        if (w.fromComponentId === 'source') w.fromPortIndex = 1;
        if (w.toComponentId === 'source') w.toPortIndex = 3;
      }
      const result = simulate(circuit);
      const sensed = result.phasor!.deviceCurrents.find((d) => d.componentId === 'control')!;
      expect(sensed.poles[0]!.rmsAmps).toBeGreaterThan(4);
      if (leaking)
        expect(sensed.residualMilliamps).toBeCloseTo(sensed.poles[0]!.rmsAmps! * 1000, 8);
      else expect(sensed.residualMilliamps).toBeLessThan(1e-8);
      expect(result.trippedComponents).toBeUndefined();
      circuit.components[1]!.state.fault = 'protection-bypass';
      const bypass = simulate(circuit);
      const poles = bypass.phasor!.deviceCurrents.find((d) => d.componentId === 'control')!;
      expect(poles.maximumPoleCurrentAmps).toBe(0);
      expect(poles.residualMilliamps).toBe(0);
      expect(bypass.energizedComponents.has('lamp')).toBe(true);
    }
  });

  it('rejects unsettled zero-delay feedback and bounded cycling without publishing stale readings', () => {
    for (const delay of [0, 0.001]) {
      const circuit = motorCircuit();
      circuit.components.push(
        C('r', 'relay-spdt', {
          coilModel: {
            version: 1,
            supply: { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
            nominalPowerWatts: 8,
            pickupRatio: 0.8,
            dropoutRatio: 0.2,
            onDelaySeconds: delay,
            offDelaySeconds: delay,
          },
        }),
      );
      circuit.wires.push(
        leadFixture('r-feed', 's', 0, 'r', 2),
        leadFixture('r-nc', 'r', 4, 'r', 0),
        leadFixture('r-return', 'r', 1, 's', 3),
      );
      const result = simulate(circuit, { deltaSeconds: 1 });
      expect(result.phasor!.status).toBe('nonconverged');
      expect(result.simulationState).toBeUndefined();
      expect(result.phasor!.branchCurrents).toEqual({});
      expect(result.energizedComponents.size).toBe(0);
    }
  });
  it('appends A1/A2 without changing the saved power-port anchors', () => {
    const def = COMPONENT_DEFS['contactor-3p']!;
    expect(def.coilPorts).toEqual([6, 7]);
    expect(def.ports.slice(0, 6).map((p) => [p.label, p.relX, p.relY])).toEqual([
      ['L1', 0, 0.25],
      ['L2', 0, 0.5],
      ['L3', 0, 0.75],
      ['T1', 1, 0.25],
      ['T2', 1, 0.5],
      ['T3', 1, 0.75],
    ]);
    const compiled = compileCircuit(motorCircuit(true));
    expect(compiled.status).toBe('compiled');
    if (compiled.status !== 'compiled') throw new Error('fixture invalid');
    const net = compiled.graph.nets.find((n) =>
      n.terminals.includes(JSON.stringify(['terminal', 'k', 6])),
    );
    expect(net?.terminals).not.toContain(JSON.stringify(['terminal', 'k', 0]));
  });

  it('picks up at the exact delay with consumed coil power and returns final motor/pole readings', () => {
    const circuit = motorCircuit(true);
    const start = simulate(circuit);
    expect(start.coilStates).toEqual({ k: false });
    expect(start.phasor!.motors[0]!.state).toBe('stopped');
    const before = simulate(circuit, {
      simulationState: start.simulationState,
      deltaSeconds: 0.999999,
    });
    expect(before.coilStates).toEqual({ k: false });
    const picked = simulate(circuit, {
      simulationState: before.simulationState,
      deltaSeconds: 0.000001,
    });
    expect(picked.coilStates).toEqual({ k: true });
    expect(picked.simulationEvents).toMatchObject([{ type: 'coil-pickup', atSeconds: 1 }]);
    const coilR = 230 ** 2 / 8;
    const coilI = 400 / Math.sqrt(3) / (coilR + 0.21);
    expect(picked.phasor!.controls[0]!.coilPowerWatts).toBeCloseTo(coilI ** 2 * coilR, 9);
    expect(picked.phasor!.motors[0]!.state).toBe('running');
    const poles = picked.phasor!.deviceCurrents.find((p) => p.componentId === 'k')!;
    const motorI = 400 / Math.sqrt(3) / (160 / 3 + 0.14);
    for (const pole of poles.poles) expect(pole.rmsAmps).toBeCloseTo(motorI, 8);
    expect(poles.residualMilliamps).toBeLessThan(1e-8);
    expect(poles.maximumPoleCurrentAmps).toBeCloseTo(motorI, 8);
    expect(poles.clearing).toBe('not-assessed');
    expect(picked.trippedComponents).toBeUndefined();
    expect(picked.componentCalculations).toBeUndefined();
    expect(circuit.components.find((c) => c.id === 'k')!.state.on).toBe(true);
  });

  it('drops out after the declared delay, replay is partition-independent and state is immutable', () => {
    const circuit = motorCircuit(true);
    const first = simulate(circuit, { deltaSeconds: 1 });
    const saved = structuredClone(first.simulationState);
    const other = simulate(circuit, {
      simulationState: simulate(circuit, { deltaSeconds: 0.4 }).simulationState,
      deltaSeconds: 0.6,
    });
    expect(other.simulationState).toEqual(first.simulationState);
    expect(other.phasor).toEqual(first.phasor);
    circuit.components.find((c) => c.id === 'control')!.state.on = false;
    const changed = simulate(circuit, { simulationState: first.simulationState });
    expect(changed.coilStates).toEqual({ k: true });
    const before = simulate(circuit, {
      simulationState: changed.simulationState,
      deltaSeconds: 0.249999,
    });
    expect(before.coilStates).toEqual({ k: true });
    const dropped = simulate(circuit, {
      simulationState: before.simulationState,
      deltaSeconds: 0.000001,
    });
    expect(dropped.coilStates).toEqual({ k: false });
    expect(dropped.simulationEvents).toMatchObject([{ type: 'coil-dropout', atSeconds: 1.25 }]);
    expect(dropped.phasor!.motors[0]!.state).toBe('stopped');
    expect(first.simulationState).toEqual(saved);
    expect(simulate(circuit).simulationState!.elapsedSeconds).toBe(0);
  });

  it('residual is a vector sum of sensed poles, never their RMS sum or the coil current', () => {
    const circuit = motorAcceptanceCircuits()['sensed-residual']!;
    const result = simulate(circuit, { deltaSeconds: 1 });
    const sensed = result.phasor!.deviceCurrents.find((p) => p.componentId === 'k')!;
    const extra = result.phasor!.branchCurrents[wire('extra-return')]!;
    expect(sensed.residualMilliamps).toBeCloseTo(phasorMagnitude(extra) * 1000, 7);
    const coil = result.phasor!.branchCurrents[wire('coil-return')]!;
    expect(sensed.residualMilliamps).not.toBeCloseTo(
      phasorMagnitude(extra) * 1000 + phasorMagnitude(coil) * 1000,
      3,
    );
  });

  it('rejects obsolete/forged state, changed ratings, wrong coil frequency and invalid steps', () => {
    const circuit = motorCircuit(true);
    const initial = simulate(circuit);
    for (const deltaSeconds of [Number.NaN, Number.POSITIVE_INFINITY, -1, 3601])
      expect(simulate(circuit, { deltaSeconds }).phasor!.status).toBe('invalid');
    const forged = { ...initial.simulationState!, modelVersion: 'old' };
    expect(simulate(circuit, { simulationState: forged }).phasor!.status).toBe('invalid');
    circuit.components[1]!.state.motorModel!.inputPowerWatts = 3100;
    expect(simulate(circuit, { simulationState: initial.simulationState }).phasor!.status).toBe(
      'invalid',
    );
    circuit.components.find((c) => c.id === 'k')!.state.coilModel!.supply = {
      kind: 'ac-single-phase',
      voltage: 230,
      frequencyHz: 60,
    };
    expect(simulate(circuit).phasor!.status).toBe('unsupported');
    expect(solvePhasorCircuit(motorCircuit(true)).status).toBe('unsupported');
  });
});
