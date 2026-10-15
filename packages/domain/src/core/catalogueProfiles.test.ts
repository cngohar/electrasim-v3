import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from '../circuitFormat';
import { COMPONENT_DEFS } from '../components';
import { simulate } from '../simulation/simulate';
import { circuitRevision, isCurrentSimulation } from '../simulationEvidence';
import {
  autoProfileFixture,
  autoTransformerFixture,
  catalogueProfileAcceptanceCircuits,
  ntcDividerFixture,
  profileLoadFixture,
  pvFixture,
  spdFixture,
  threePhaseProfileFixture,
} from './catalogueProfileFixtures';
import {
  LAMP_TYPES,
  catalogueProfileKind,
  copyProfile,
  defaultLampProfile,
  isElectronicLoadProfile,
  ntcResistance,
} from './catalogueProfiles';
import { compileCircuit } from './compile';
import { damageCircuit } from './damageFixtures';
import { terminalId } from './faultTopology';
import { leadFixture, sourceFixture } from './mnaFixtures';
import { normalizeCircuitDocument } from './normalize';
import { rcdBalancedCircuit, rcdLeakingCircuit } from './protectionFixtures';
import { dimmingCircuit } from './timerDimmingFixtures';

describe('Phase 1.12 profile numerical laws', () => {
  for (const [type, circuit] of Object.entries(catalogueProfileAcceptanceCircuits()).filter(
    ([n]) => !n.startsWith('lamp-207'),
  ))
    it(`${type} has a declared accepted outcome`, () => {
      const result = simulate(circuit);
      expect(result.electricalContract?.status).toBe('converged');
      expect((result.electrical ?? result.phasor)?.checks?.maximumKclResidualAmps).toBeLessThan(
        1e-7,
      );
      expect((result.electrical ?? result.phasor)?.checks?.maximumPowerResidualWatts).toBeLessThan(
        1e-5,
      );
      expect(
        result.electricalContract?.coverage.some(
          (c) => c.aspect === 'load' && c.status === 'not-assessed',
        ),
      ).toBe(false);
    });
  for (const type of LAMP_TYPES)
    it(`${type} follows independent regulated power and feeder roots`, () => {
      const watts = COMPONENT_DEFS[type]!.powerWatts!;
      const point = simulate(profileLoadFixture(type)).componentCalculations!.load!;
      const expectedV = (230 + Math.sqrt(230 ** 2 - 4 * 0.14 * watts)) / 2;
      expect(point.voltage).toBeCloseTo(expectedV, 9);
      expect(point.currentAmps).toBeCloseTo(watts / expectedV, 10);
      expect(point.powerWatts).toBeCloseTo(watts, 9);
      for (const voltage of [12, 280]) {
        const r = simulate(profileLoadFixture(type, voltage));
        expect(r.componentCalculations!.load!.voltage).toBeCloseTo(voltage, 9);
        expect(r.componentCalculations!.load!.currentAmps).toBe(0);
        expect(r.componentCalculations!.load!.powerWatts).toBe(0);
        expect(r.energizedComponents.has('load')).toBe(false);
      }
    });
  it('motor current and reactive power come from its independent complex impedance', () => {
    const r = simulate(profileLoadFixture('ceiling-fan'));
    const g = 65 / 230 ** 2;
    const b = -48.75 / 230 ** 2;
    const denominator = (1 + 0.14 * g) ** 2 + (0.14 * b) ** 2;
    const expectedV = 230 / Math.sqrt(denominator);
    expect(r.componentCalculations!.load!.voltage).toBeCloseTo(expectedV, 9);
    expect(r.componentCalculations!.load!.currentAmps).toBeCloseTo(
      expectedV * Math.sqrt(g * g + b * b),
      10,
    );
    expect(r.electrical!.loads[0]!.reactivePowerVars).toBeCloseTo(-b * expectedV ** 2, 8);
  });
  for (const type of Object.keys(COMPONENT_DEFS).filter(
    (t) => catalogueProfileKind(t) === 'appliance',
  ))
    it(`${type} matches its independent complex-admittance or regulated-power equation`, () => {
      const circuit = normalizeCircuitDocument(profileLoadFixture(type));
      const p = circuit.components[1]!.state.catalogueProfile!;
      if (p.kind !== 'appliance') throw new Error('Expected appliance');
      const result = simulate(circuit);
      const point = result.componentCalculations!.load!;
      const regulated = ['standby', 'alarm'].includes(p.mode) || p.law === 'regulated-power';
      const watts =
        p.mode === 'standby'
          ? p.standbyPowerWatts
          : p.mode === 'alarm'
            ? p.alarmPowerWatts
            : p.inputPowerWatts;
      if (regulated) {
        const v = (230 + Math.sqrt(230 ** 2 - 4 * 0.14 * watts)) / 2;
        expect(point.voltage).toBeCloseTo(v, 8);
        expect(point.currentAmps).toBeCloseTo(watts / v, 9);
        expect(point.powerWatts).toBeCloseTo(watts, 7);
      } else {
        const q =
          ((p.inputPowerWatts * Math.sqrt(1 - p.displacementPowerFactor ** 2)) /
            p.displacementPowerFactor) *
          (p.law === 'composite' ? 1 - p.heatingFraction : 1);
        const g = p.inputPowerWatts / p.nominalVoltage ** 2;
        const b = -q / p.nominalVoltage ** 2;
        const v = 230 / Math.hypot(1 + 0.14 * g, 0.14 * b);
        expect(point.voltage).toBeCloseTo(v, 8);
        expect(point.currentAmps).toBeCloseTo(v * Math.hypot(g, b), 9);
        expect(point.powerWatts).toBeCloseTo(g * v * v, 7);
        expect(result.electrical!.loads[0]!.reactivePowerVars).toBeCloseTo(-b * v * v, 7);
      }
    });
  it('balanced three-phase lamps and reactive fans cancel neutral current as vectors', () => {
    for (const type of ['bulb', 'ceiling-fan']) {
      const r = simulate(threePhaseProfileFixture(type));
      expect(r.electricalContract?.status).toBe('converged');
      expect(
        Math.hypot(
          r.phasor!.branchCurrents[JSON.stringify(['wire', 'neutral'])]!.real,
          r.phasor!.branchCurrents[JSON.stringify(['wire', 'neutral'])]!.imaginary,
        ),
      ).toBeCloseTo(0, 8);
      const single = simulate(profileLoadFixture(type)).componentCalculations!.load!;
      for (const i of [0, 1, 2]) {
        const branch = r.phasorComponents![`load${i}`]!.branches[0]!;
        expect(branch.activePowerWatts).toBeCloseTo(single.powerWatts!, 7);
        expect(Math.hypot(branch.current!.real, branch.current!.imaginary)).toBeCloseTo(
          single.currentAmps!,
          8,
        );
      }
    }
  });
  it('shared-common transformer with a nonlinear lamp retains actual winding power checks', () => {
    const r = simulate(autoProfileFixture());
    expect(r.electrical!.status).toBe('converged');
    expect(r.electrical!.transformers[0]!.connection).toBe('shared-common');
    expect(r.componentCalculations!.load!.powerWatts).toBeCloseTo(9, 8);
    expect(r.electrical!.checks!.maximumTransformerPowerResidualWatts).toBeLessThan(1e-7);
  });
  it('a reactive load does not falsely trip a balanced RCD, while a bypassed return does trip', () => {
    for (const [c, trip] of [
      [rcdBalancedCircuit(), false],
      [rcdLeakingCircuit(), true],
    ] as const) {
      c.components[2]!.type = 'ceiling-fan';
      c.components[2]!.state = {};
      const r = simulate(c, { deltaSeconds: 1 });
      expect(r.electricalContract?.status).toBe('converged');
      expect(r.simulationState?.protection?.control?.tripped ?? false).toBe(trip);
    }
  });
  it('PV output is the independent curve/load intersection and decreases in darkness', () => {
    const circuit = pvFixture();
    const r = simulate(circuit);
    const expectedV = (40 * (2.56 + 0.14)) / (2.56 + 0.14 + 8 / 12.5);
    expect(r.componentCalculations!.pv!.voltage).toBeCloseTo(expectedV, 8);
    expect(r.componentCalculations!.pv!.powerWatts).toBeCloseTo(-(expectedV ** 2) / 2.7, 7);
    const open = pvFixture();
    open.wires.pop();
    const openPoint = simulate(open).componentCalculations!.pv!;
    expect(openPoint.voltage).toBeCloseTo(40, 9);
    expect(openPoint.currentAmps).toBeCloseTo(0, 9);
    const short = pvFixture();
    short.components = short.components.slice(0, 1);
    short.wires = [leadFixture('short', 'pv', 0, 'pv', 1)];
    const shortPoint = simulate(short).componentCalculations!.pv!;
    const shortCurrent = 14 / (1 + (0.07 * (14 - 12.5)) / 32);
    expect(shortPoint.currentAmps).toBeCloseTo(-shortCurrent, 9);
    expect(shortPoint.voltage).toBeCloseTo(0.07 * shortCurrent, 9);
    const normalized = normalizeCircuitDocument(circuit);
    const p = normalized.components[0]!.state.catalogueProfile!;
    if (p.kind !== 'photovoltaic') throw new Error('Expected PV');
    p.irradianceWattsPerM2 = 0;
    expect(simulate(normalized).componentCalculations!.load!.currentAmps).toBe(0);
  });
  for (const temperature of [0, 25, 50])
    it(`NTC ${temperature} C uses beta resistance and actual divider current`, () => {
      const circuit = ntcDividerFixture(temperature);
      const profile = circuit.components[2]!.state.catalogueProfile!;
      if (profile.kind !== 'ntc') throw new Error('Expected NTC');
      const resistance = 10000 * Math.exp(3950 * (1 / (temperature + 273.15) - 1 / 298.15));
      expect(ntcResistance(profile)).toBeCloseTo(resistance, 8);
      const r = simulate(circuit);
      const expectedI = 12 / (10000 + resistance + 0.21);
      expect(r.componentCalculations!.load!.currentAmps).toBeCloseTo(expectedI, 11);
      expect(r.componentCalculations!.load!.voltage).toBeCloseTo(expectedI * resistance, 8);
    });
  it('portable NTC exponential matches independent Math.exp throughout the declared parameter bounds', () => {
    for (const resistanceAt25Ohms of [0.001, 10000, 1e9])
      for (const betaKelvin of [1, 3950, 10000])
        for (const temperatureC of [-40, 0, 25, 50, 125]) {
          const expected =
            resistanceAt25Ohms * Math.exp(betaKelvin * (1 / (temperatureC + 273.15) - 1 / 298.15));
          expect(
            Math.abs(
              ntcResistance({
                version: 1,
                kind: 'ntc',
                provenance: 'editable-teaching-assumption',
                resistanceAt25Ohms,
                betaKelvin,
                temperatureC,
              }) /
                expected -
                1,
            ),
          ).toBeLessThan(2e-14);
        }
  });
  it('SPD leakage and clamp are calculated through the declared finite PE return', () => {
    const normal = simulate(spdFixture());
    expect(
      normal.electrical!.branchCurrents[JSON.stringify(['device', 'load', 'profile:0'])],
    ).toBeCloseTo(230 / (1e6 + 0.14), 10);
    const clamped = simulate(spdFixture(330));
    expect(
      clamped.electrical!.branchCurrents[JSON.stringify(['device', 'load', 'profile:0'])],
    ).toBeGreaterThan(2);
    expect(
      clamped.electrical!.protectiveCurrents.some((p) => Math.abs(p.currentAmps ?? 0) > 2),
    ).toBe(true);
  });
  for (const reverse of [false, true])
    it(`autotransformer ${reverse ? 'up' : 'down'} shares common and conserves power`, () => {
      const r = simulate(autoTransformerFixture(reverse));
      const t = r.electrical!.transformers[0]!;
      expect(t.connection).toBe('shared-common');
      expect(t.model).toBe('ideal-shared-common-ac');
      expect(t.primaryVoltageVolts / t.secondaryVoltageVolts).toBeCloseTo(110 / 230, 9);
      expect(t.primaryPowerWatts + t.secondaryPowerWatts).toBeCloseTo(0, 8);
      expect(r.electrical!.terminalDomains[terminalId('auto', 1)]).toBe(
        r.electrical!.terminalDomains[terminalId('auto', 3)],
      );
    });
  it('a boundary contradiction and a power collapse never report successful numeric output', () => {
    expect(simulate(profileLoadFixture('bulb', 207)).electrical!.status).toBe('nonconverged');
    const c = normalizeCircuitDocument(profileLoadFixture('bulb', 20));
    const p = c.components[1]!.state.electronicLoadProfile!;
    p.nominalVoltage = 20;
    p.inputPowerWatts = 11;
    p.operatingVoltageRange = { min: 5, max: 25 };
    p.operatingRangeOrigin = 'instance';
    p.provenance.overrides = ['nominalVoltage', 'inputPowerWatts', 'operatingVoltageRange'];
    for (const w of c.wires) w.lengthMeters = (10 / 0.14) * 10;
    const r = simulate(c);
    expect(r.electrical!.status).toBe('nonconverged');
    expect(r.electrical!.checks).toBeNull();
    expect(r.energizedComponents.size).toBe(0);
  });
  it('running equivalents retain their declared current outside the running band and expose no running claim', () => {
    for (const type of ['ceiling-fan', 'washing-machine']) {
      const r = simulate(profileLoadFixture(type, 12));
      expect(r.electrical!.status).toBe('converged');
      expect(r.componentCalculations!.load!.powerWatts).toBeGreaterThan(0);
      expect(r.electrical!.profileStates!.load).toBe('outside-running-band');
      expect(r.energizedComponents.has('load')).toBe(false);
    }
  });
  it('series and parallel lamp branches satisfy independent feeder and power sums', () => {
    for (const series of [true, false]) {
      const c = profileLoadFixture('bulb', series ? 460 : 230);
      c.components.push({ ...c.components[1]!, id: 'second', state: {} });
      c.wires = series
        ? [
            leadFixture('feed', 's', 0, 'load', 0),
            leadFixture('mid', 'load', 1, 'second', 0),
            leadFixture('return', 'second', 1, 's', 1),
          ]
        : [
            ...c.wires,
            leadFixture('second-feed', 's', 0, 'second', 0),
            leadFixture('second-return', 'second', 1, 's', 1),
          ];
      const r = simulate(c);
      expect(r.electrical!.status).toBe('converged');
      const current = series
        ? (460 - Math.sqrt(460 ** 2 - 4 * 0.21 * 18)) / (2 * 0.21)
        : (230 - Math.sqrt(230 ** 2 - 4 * 0.14 * 9)) / (2 * 0.14);
      for (const id of ['load', 'second']) {
        expect(r.componentCalculations![id]!.currentAmps).toBeCloseTo(current, 9);
        expect(r.componentCalculations![id]!.powerWatts).toBeCloseTo(9, 8);
      }
    }
  });
  it('electronic phase-cut dimming and an undeclared frequency produce no numeric fallback', () => {
    const c = dimmingCircuit();
    const lamp = c.components.find((x) => x.type === 'bulb-incandescent')!;
    lamp.type = 'bulb';
    lamp.state = {};
    expect(simulate(c).electricalContract!.status).toBe('unsupported');
    const f = profileLoadFixture('bulb');
    f.components[0]!.state.sourceProfile!.model = {
      kind: 'ac-single-phase',
      voltage: 230,
      frequencyHz: 400,
    };
    const r = simulate(f);
    expect(r.electricalContract!.status).toBe('unsupported');
    expect(r.componentCalculations).toBeUndefined();
  });
  it('a declared voltage damage event opens the lamp; clearing a fault never replaces damage', () => {
    const c = damageCircuit('device-voltage');
    c.components[2]!.type = 'bulb';
    c.components[2]!.state.customPowerWatts = 9;
    const r = simulate(c, { deltaSeconds: 10 });
    expect(r.simulationEvents!.some((e) => e.type === 'damage')).toBe(true);
    const damaged = structuredClone(c);
    damaged.components[2]!.state.isBlown = true;
    damaged.faults = [];
    const still = simulate(damaged);
    expect(still.energizedComponents.has('lamp')).toBe(false);
    expect(still.componentCalculations!.lamp!.powerWatts).toBe(0);
    damaged.components[2]!.state.isBlown = undefined;
    expect(simulate(damaged).componentCalculations!.lamp!.powerWatts).toBeCloseTo(9, 8);
  });
  it('DC cannot power an undeclared AC driver; reversed AC terminals retain positive consumed power', () => {
    const c = profileLoadFixture();
    c.components[0] = sourceFixture('s', { kind: 'dc', voltage: 230 });
    expect(simulate(c).electrical!.status).toBe('unsupported');
    const reverse = profileLoadFixture();
    reverse.wires[0]!.toPortIndex = 1;
    reverse.wires[1]!.fromPortIndex = 0;
    expect(simulate(reverse).componentCalculations!.load!.powerWatts).toBeCloseTo(9, 9);
  });
});

describe('versioned profile persistence and identity', () => {
  it('migrates old names without changing IDs, routes, sources, faults or ratings and writes schema 3', () => {
    const raw = profileLoadFixture('bulb', 230, {
      customVoltage: 12,
      customPowerWatts: 5,
      customMaxAmps: 3,
    });
    raw.wires[0]!.controlPoints = [{ x: 5, y: 7 }];
    const imported = importJSON(JSON.stringify({ version: 1, circuit: raw }));
    expect(imported.components[1]!.state.electronicLoadProfile!.nominalVoltage).toBe(12);
    expect(imported.components[1]!.state.customMaxAmps).toBe(3);
    expect(imported.wires).toEqual(raw.wires);
    const exported = JSON.parse(exportJSON(imported));
    expect(exported.version).toBe(3);
    expect(importJSON(JSON.stringify(exported))).toEqual(imported);
    expect(raw.components[1]!.state.electronicLoadProfile).toBeUndefined();
  });
  it('rejects malformed, mismatched and future profile versions without overwriting them', () => {
    const c = normalizeCircuitDocument(profileLoadFixture());
    const p = c.components[1]!.state.electronicLoadProfile!;
    expect(isElectronicLoadProfile({ ...p, version: 2 })).toBe(false);
    expect(isElectronicLoadProfile({ ...p, inputPowerWatts: Number.POSITIVE_INFINITY })).toBe(
      false,
    );
    expect(isElectronicLoadProfile({ ...p, extra: 1 })).toBe(false);
    c.components[1]!.state.customVoltage = 12;
    expect(compileCircuit(c).status).toBe('invalid');
    expect(c.components[1]!.state.customVoltage).toBe(12);
  });
  it('profile edits invalidate accepted evidence and normalization deep copies profiles', () => {
    const c = normalizeCircuitDocument(profileLoadFixture());
    const result = simulate(c);
    const before = circuitRevision(c);
    const copy = normalizeCircuitDocument(c);
    copy.components[1]!.state.electronicLoadProfile!.inputPowerWatts = 12;
    expect(c.components[1]!.state.electronicLoadProfile!.inputPowerWatts).toBe(9);
    expect(circuitRevision(copy)).not.toBe(before);
    expect(isCurrentSimulation(copy, result)).toBe(false);
    expect(copyProfile(defaultLampProfile(COMPONENT_DEFS.bulb!, {}))).toEqual(
      c.components[1]!.state.electronicLoadProfile,
    );
  });
});
