import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON, normalizeCircuit, validateCircuitJSON } from '../circuitFormat';
import { component as C, wire as W } from '../simulation/auditFixtures';
import { simulate } from '../simulation/simulate';
import type { Circuit } from '../types';
import { compileCircuit } from './compile';
import type { SupplyModel } from './contracts';
import { validateCircuitInput } from './input';
import { createEmptyCircuit } from './normalize';
import {
  configuredSupplySources,
  explicitSupplyProfile,
  isSupplyProfile,
  withDocumentSupply,
} from './supplies';

const mixed: Circuit = {
  globalVoltage: 230,
  components: [
    C('line', 'live-terminal'),
    C('neutral', 'neutral-terminal'),
    C('earth', 'earth-terminal'),
    C('battery', 'dc-battery-12v'),
    C('generator', 'diesel-generator', { customVoltage: 240 }),
    C('heater', 'space-heater', {
      customVoltage: 230,
      customPowerWatts: 2000,
      isBlown: true,
      blownReason: 'overvoltage',
    }),
  ],
  wires: [W('wire', 'line', 0, 'heater', 0)],
  faults: [
    {
      id: 'fault',
      type: 'open-circuit',
      category: 'conductor',
      target: { type: 'wire', id: 'wire' },
      createdAt: 10,
    },
  ],
};

describe('1.5C.0 persisted supply migration', () => {
  it('reads schema 1, writes schema 2, and preserves IDs, wires, design ratings and faults', () => {
    const old = JSON.stringify({ version: 1, circuit: mixed });
    const migrated = importJSON(old);
    expect(migrated.components.map((c) => c.id)).toEqual(mixed.components.map((c) => c.id));
    expect(migrated.wires).toEqual(mixed.wires);
    expect(migrated.faults).toEqual(mixed.faults);
    expect(migrated.components.at(-1)).toEqual(mixed.components.at(-1));
    expect(migrated.supply).toEqual({
      version: 1,
      model: { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
      provenance: { voltage: 'legacy-document', frequency: 'legacy-assumption' },
    });
    expect(migrated.components.find((c) => c.id === 'battery')?.state.sourceProfile?.model).toEqual(
      { kind: 'dc', voltage: 12 },
    );
    expect(
      migrated.components.find((c) => c.id === 'generator')?.state.sourceProfile?.model,
    ).toEqual({ kind: 'ac-single-phase', voltage: 240, frequencyHz: 50 });
    const exported = exportJSON(migrated);
    expect(JSON.parse(exported).version).toBe(2);
    expect(importJSON(exported)).toEqual(migrated);
    expect(normalizeCircuit(migrated)).toEqual(migrated);
    expect(JSON.stringify({ version: 1, circuit: mixed })).toBe(old);
  });

  it('distinguishes old 120 V / assumed 50 Hz saves from new US 120 V / 60 Hz documents', () => {
    const legacy = importJSON(
      JSON.stringify({ version: 1, circuit: { components: [], wires: [], globalVoltage: 120 } }),
    );
    expect(legacy.supply?.model).toEqual({
      kind: 'ac-single-phase',
      voltage: 120,
      frequencyHz: 50,
    });
    expect(createEmptyCircuit('us').supply?.model).toEqual({
      kind: 'ac-single-phase',
      voltage: 120,
      frequencyHz: 60,
    });
    const omitted = importJSON(
      JSON.stringify({ version: 1, circuit: { components: [], wires: [] } }),
    );
    expect(omitted.supply?.model).toEqual({
      kind: 'ac-single-phase',
      voltage: 230,
      frequencyHz: 50,
    });
  });

  it.each<SupplyModel>([
    { kind: 'dc', voltage: 12 },
    { kind: 'dc', voltage: 24 },
    { kind: 'dc', voltage: 48 },
    { kind: 'ac-single-phase', voltage: 12, frequencyHz: 50 },
    { kind: 'ac-single-phase', voltage: 110, frequencyHz: 60 },
    { kind: 'ac-single-phase', voltage: 120, frequencyHz: 60 },
    { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
    { kind: 'ac-single-phase', voltage: 240, frequencyHz: 60 },
    { kind: 'ac-three-phase', voltage: 400 / Math.sqrt(3), frequencyHz: 50, sequence: 'acb' },
  ])('retains exact kind, frequency and voltage convention for %j', (model) => {
    const circuit: Circuit = {
      components: [C('line', 'live-terminal'), C('neutral', 'neutral-terminal')],
      wires: [],
      supply: explicitSupplyProfile(model),
    };
    const restored = importJSON(exportJSON(circuit));
    expect(restored.supply?.model).toEqual(model);
    expect(isSupplyProfile(restored.supply)).toBe(true);
    const compiled = compileCircuit(restored);
    expect(compiled.status).toBe('compiled');
    if (compiled.status !== 'compiled') return;
    if (model.kind === 'ac-three-phase') {
      expect(compiled.graph.sources).toHaveLength(0);
      expect(
        compiled.coverage.some((c) => c.aspect === 'source' && c.status === 'not-assessed'),
      ).toBe(true);
    } else expect(compiled.graph.sources[0]?.model).toEqual(model);
  });

  it('changes only the named supply, without re-rating a load, independent source or PE', () => {
    const previous = normalizeCircuit(mixed);
    const before = JSON.stringify(previous);
    const next = withDocumentSupply(previous, explicitSupplyProfile({ kind: 'dc', voltage: 24 }));
    expect(previous.supply?.model.voltage).toBe(230);
    expect(next.supply?.model).toEqual({ kind: 'dc', voltage: 24 });
    for (const id of ['heater', 'earth', 'generator', 'battery'])
      expect(next.components.find((c) => c.id === id)).toEqual(
        previous.components.find((c) => c.id === id),
      );
    expect(next.wires).toBe(previous.wires);
    expect(next.faults).toBe(previous.faults);
    expect(next.components.find((c) => c.id === 'line')?.state.sourceProfile?.model).toEqual({
      kind: 'dc',
      voltage: 24,
    });
    expect(JSON.stringify(previous)).toBe(before);
    expect(withDocumentSupply(next, explicitSupplyProfile({ kind: 'dc', voltage: 24 }))).toBe(next);
  });

  it('freezes independent legacy AC sources before changing the document default', () => {
    const old: Circuit = {
      globalVoltage: 120,
      components: [C('ac', 'ac-mains-supply'), C('heater', 'space-heater')],
      wires: [],
    };
    const next = withDocumentSupply(
      old,
      explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 240, frequencyHz: 60 }),
    );
    expect(next.components[0].state.sourceProfile?.model).toEqual({
      kind: 'ac-single-phase',
      voltage: 120,
      frequencyHz: 50,
    });
    expect(next.components[1]).toBe(old.components[1]);
    expect(next.components[1].state.customVoltage).toBeUndefined();
  });

  it('copies nested profiles rather than retaining mutable input references', () => {
    const circuit = normalizeCircuit(mixed);
    const cloned = normalizeCircuit(circuit);
    cloned.supply!.model.voltage = 12;
    cloned.components.find((c) => c.id === 'battery')!.state.sourceProfile!.model.voltage = 48;
    expect(circuit.supply!.model.voltage).toBe(230);
    expect(
      circuit.components.find((c) => c.id === 'battery')!.state.sourceProfile!.model.voltage,
    ).toBe(12);
  });

  it.each([
    null,
    [],
    {},
    { version: 2, model: { kind: 'dc', voltage: 12 }, provenance: { voltage: 'explicit' } },
    {
      version: 1,
      model: { kind: 'dc', voltage: 12, frequencyHz: 50 },
      provenance: { voltage: 'explicit' },
    },
    { version: 1, model: { kind: 'dc', voltage: 0 }, provenance: { voltage: 'explicit' } },
    {
      version: 1,
      model: { kind: 'ac-single-phase', voltage: 230 },
      provenance: { voltage: 'explicit', frequency: 'explicit' },
    },
    {
      version: 1,
      model: { kind: 'ac-single-phase', voltage: 230, frequencyHz: -50 },
      provenance: { voltage: 'explicit', frequency: 'explicit' },
    },
    { version: 1, model: { kind: 'dc', voltage: Number.NaN }, provenance: { voltage: 'explicit' } },
    {
      version: 1,
      model: { kind: { toString: null }, voltage: 12 },
      provenance: { voltage: 'explicit' },
    },
    { version: 1, model: { kind: 'dc', voltage: 12 }, provenance: { voltage: { toString: null } } },
    {
      version: 1,
      model: { kind: 'ac-three-phase', voltage: 230, frequencyHz: 50, sequence: 'bac' },
      provenance: { voltage: 'explicit', frequency: 'explicit' },
    },
  ])('rejects malformed profile %j at direct and file boundaries', (supply) => {
    const circuit = { components: [], wires: [], supply };
    expect(validateCircuitInput(circuit).valid).toBe(false);
    expect(compileCircuit(circuit).status).toBe('invalid');
    expect(validateCircuitJSON({ version: 2, circuit })).not.toBeNull();
  });

  it('rejects conflicting mirrors, source settings on loads/PE, and battery waveform changes', () => {
    const dc = explicitSupplyProfile({ kind: 'dc', voltage: 12 });
    expect(
      validateCircuitInput({ components: [], wires: [], globalVoltage: 230, supply: dc }).valid,
    ).toBe(false);
    for (const type of [
      'earth-terminal',
      'earth-rod',
      'space-heater',
      'photocell-sensor',
      'solar-pv-panel',
      'ac-mains-supply',
    ]) {
      expect(
        validateCircuitInput({ components: [C('x', type, { sourceProfile: dc })], wires: [] })
          .valid,
      ).toBe(false);
    }
    expect(
      validateCircuitInput({
        components: [
          C('x', 'dc-battery-12v', {
            sourceProfile: explicitSupplyProfile({
              kind: 'ac-single-phase',
              voltage: 12,
              frequencyHz: 50,
            }),
          }),
        ],
        wires: [],
      }).valid,
    ).toBe(false);
    expect(validateCircuitJSON({ version: 2, circuit: { components: [], wires: [] } })).toContain(
      'requires',
    );
  });

  it('retains contradictory legacy aliases for compiler rejection, independent of order', () => {
    const circuit: Circuit = {
      components: [
        C('a', 'live-terminal', { customVoltage: 12 }),
        C('b', 'live-terminal', { customVoltage: 24 }),
      ],
      wires: [],
    };
    const a = compileCircuit(importJSON(exportJSON(circuit)));
    const b = compileCircuit({ ...circuit, components: [...circuit.components].reverse() });
    expect(a.status).toBe('invalid');
    expect(b).toEqual(a);
    expect(a.diagnostics[0].code).toBe('conflicting-source-alias');
  });

  it('solves supported persisted DC and independent profiles in both modes', () => {
    const circuit = withDocumentSupply(
      {
        components: [
          C('l', 'live-terminal'),
          C('n', 'neutral-terminal'),
          C('heater', 'space-heater'),
        ],
        wires: [W('l', 'l', 0, 'heater', 0), W('n', 'heater', 1, 'n', 0)],
      },
      explicitSupplyProfile({ kind: 'dc', voltage: 12 }),
    );
    const basic = simulate(circuit, { appMode: 'basic' });
    expect(simulate(circuit, { appMode: 'pro' })).toEqual(basic);
    expect(basic.electricalContract?.status).toBe('converged');
    expect(basic.componentCalculations?.heater.currentAmps).toBeCloseTo(12 / (26.45 + 0.14), 9);
    expect(basic.blownComponents).toBeUndefined();
    const mixedResult = simulate(normalizeCircuit(mixed));
    expect(mixedResult.modelLimitations?.some((l) => l.code === 'independent-source-model')).toBe(
      false,
    );
    expect(mixedResult.electricalContract?.status).toBe('converged');
    expect(
      configuredSupplySources(mixed).every(
        (s) => s.componentId !== 'earth' && s.componentId !== 'neutral',
      ),
    ).toBe(true);
  });
});
