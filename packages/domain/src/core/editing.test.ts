import { describe, expect, it } from 'vitest';
import { COMPONENT_DEFS } from '../components';
import { simulate } from '../simulation';
import { component as C, wire as W } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import { editingCircuit, variantCircuit } from './editingFixtures';
import { exerciseSupplyIssue } from './exerciseSupply';
import { assessPlacement, placementVisible } from './placement';
import { assessCircuitReadiness } from './readiness';
import { explicitSupplyProfile } from './supplies';
import { previewSupplyChange, supplyTargetForComponent } from './supplyEditing';
import { previewVariantChange } from './variantEditing';

describe('confirmed supply transaction primitives', () => {
  it.each([12, 24, 48, 110, 120, 230, 240])(
    'preserves nameplates, faults, routes and independent AC/DC sources at %s V',
    (voltage) => {
      const circuit = editingCircuit();
      circuit.components.push(
        C('battery', 'dc-battery-12v', {
          sourceProfile: explicitSupplyProfile({ kind: 'dc', voltage: 24 }),
          isBlown: true,
          blownReason: 'overvoltage',
        }),
      );
      circuit.faults = [
        {
          id: 'open',
          type: 'open-circuit',
          category: 'conductor',
          target: { type: 'wire', id: 'return' },
          createdAt: 0,
        },
      ];
      const copy = structuredClone(circuit);
      const preview = previewSupplyChange(
        circuit,
        { kind: 'document' },
        explicitSupplyProfile({ kind: 'dc', voltage }),
      );
      expect(preview.status).toBe('ready');
      expect(circuit).toEqual(copy);
      expect(preview.circuit.supply?.model).toEqual({ kind: 'dc', voltage });
      expect(preview.circuit.wires).toBe(circuit.wires);
      expect(preview.circuit.faults).toBe(circuit.faults);
      for (const id of ['heater', 'battery', 'independent', 'other-load', 'pe'])
        expect(preview.circuit.components.find((c) => c.id === id)).toEqual(
          circuit.components.find((c) => c.id === id),
        );
      expect(preview.independentSourceIds).toEqual(['independent', 'battery']);
      expect(preview.affectedComponentIds).not.toContain('other-load');
      expect(preview.terminalChanges.join(' ')).toContain('PE remains protective earth');
    },
  );

  it('edits only a named independent source and reports its own affected domain', () => {
    const circuit = editingCircuit();
    const preview = previewSupplyChange(
      circuit,
      { kind: 'component', componentId: 'independent' },
      explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 48, frequencyHz: 60 }),
    );
    expect(preview.circuit.supply).toBe(circuit.supply);
    expect(preview.affectedComponentIds).toContain('other-load');
    expect(preview.affectedComponentIds).not.toContain('heater');
    expect(preview.circuit.components.find((c) => c.id === 'l')).toEqual(
      circuit.components.find((c) => c.id === 'l'),
    );
    expect(preview.circuit.components.find((c) => c.id === 'other-load')?.state.customVoltage).toBe(
      12,
    );
  });

  it('routes both L and N controls to the document and never grants PE/load source controls', () => {
    const c = editingCircuit();
    expect(supplyTargetForComponent(c, 'l')).toEqual({ kind: 'document' });
    expect(supplyTargetForComponent(c, 'n')).toEqual({ kind: 'document' });
    expect(supplyTargetForComponent(c, 'pe')).toBeNull();
    expect(supplyTargetForComponent(c, 'heater')).toBeNull();
  });

  it('rejects physical AC/DC source replacement and undeclared phase terminals', () => {
    const c = editingCircuit();
    expect(
      previewSupplyChange(
        c,
        { kind: 'component', componentId: 'independent' },
        explicitSupplyProfile({ kind: 'dc', voltage: 12 }),
      ).status,
    ).toBe('blocked');
    expect(
      previewSupplyChange(
        c,
        { kind: 'document' },
        explicitSupplyProfile({
          kind: 'ac-three-phase',
          voltage: 230,
          frequencyHz: 50,
          sequence: 'abc',
        }),
      ).status,
    ).toBe('blocked');
    expect(previewSupplyChange(c, { kind: 'document' }, c.supply!).status).toBe('unchanged');
  });
});

describe('electrical variant replacement', () => {
  it('maps MCB output to RCCB L-out, including port faults, instead of reusing the old index', () => {
    const c = variantCircuit();
    const snapshot = structuredClone(c);
    const result = previewVariantChange(c, 'breaker', 'rcd');
    expect(result.status).toBe('ready');
    expect(result.ports).toEqual([
      { from: 0, to: 0, label: 'L-in' },
      { from: 1, to: 2, label: 'L-out' },
    ]);
    expect(result.addedPorts).toEqual(['N-in', 'N-out']);
    expect(result.circuit.wires.find((w) => w.id === 'breaker-out')?.fromPortIndex).toBe(2);
    expect(result.circuit.faults?.[0]?.target).toEqual({
      type: 'port',
      componentId: 'breaker',
      portIndex: 2,
    });
    expect(
      result.circuit.components.find((component) => component.id === 'breaker')?.state,
    ).toEqual({ on: true, autoLabel: 'CB7', fault: 'protection-bypass' });
    expect(c).toEqual(snapshot);
    expect(result.circuit.wires.find((w) => w.id === 'return')).toBe(
      c.wires.find((w) => w.id === 'return'),
    );
  });

  it('rejects disappearing or ambiguous terminals and never maps earth into neutral', () => {
    const c = variantCircuit();
    c.components.push(C('socket', 'socket-3pin'));
    expect(previewVariantChange(c, 'socket', 'socket-2pin').status).toBe('blocked');
    const duplicate = {
      ...COMPONENT_DEFS.mcb!,
      ports: [
        COMPONENT_DEFS.mcb!.ports[0]!,
        COMPONENT_DEFS.mcb!.ports[0]!,
        COMPONENT_DEFS.mcb!.ports[1]!,
      ],
    };
    expect(
      previewVariantChange(c, 'breaker', 'duplicate', { ...COMPONENT_DEFS, duplicate }).status,
    ).toBe('blocked');
    expect(previewVariantChange(c, 'breaker', 'space-heater').status).toBe('blocked');
  });

  it('retains identity and changes real wattage rather than carrying the previous overrides', () => {
    const c = editingCircuit();
    c.components.push(C('bulb', 'bulb-incandescent', { customVoltage: 12, customPowerWatts: 99 }));
    const result = previewVariantChange(c, 'bulb', 'bulb-halogen');
    expect(result.status).toBe('ready');
    expect(result.circuit.components.at(-1)).toEqual(C('bulb', 'bulb-halogen'));
    expect(COMPONENT_DEFS['bulb-halogen']?.powerWatts).not.toBe(99);
  });

  it.each([{ isTripped: true }, { isBlown: true }])('cannot repair by replacement: %j', (state) => {
    const c = variantCircuit();
    Object.assign(c.components.at(-1)!.state, state);
    const result = previewVariantChange(c, 'breaker', 'mcb-type-c');
    expect(result.status).toBe('blocked');
    expect(result.circuit).toBe(c);
  });
});

describe('one placement and runtime readiness contract', () => {
  it('keeps graded supply profiles fixed across imports and independent source edits', () => {
    const c = editingCircuit();
    expect(exerciseSupplyIssue(c, structuredClone(c))).toBeNull();
    const changed = previewSupplyChange(
      c,
      { kind: 'component', componentId: 'independent' },
      explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 24, frequencyHz: 60 }),
    );
    expect(exerciseSupplyIssue(c, changed.circuit)).toContain('authored supply');
    const newSource = { ...c, components: [...c.components, C('new', 'live-terminal')] };
    expect(exerciseSupplyIssue(c, newSource)).toContain('authored supply');
    expect(
      exerciseSupplyIssue(
        { components: [], wires: [] },
        { components: [C('l', 'live-terminal')], wires: [] },
        true,
      ),
    ).toBeNull();
    expect(
      exerciseSupplyIssue(
        { components: [], wires: [] },
        { components: [C('l', 'live-terminal', { customVoltage: 12 })], wires: [] },
        true,
      ),
    ).toContain('authored supply');
  });
  it('labels unknown ratings explicitly and keeps sources/converters discoverable', () => {
    const c = editingCircuit();
    const dc = { kind: 'dc', voltage: 12 } as const;
    const led = assessPlacement('bulb', c, dc);
    expect(led.status).toBe('incompatible');
    expect(placementVisible(led, false)).toBe(false);
    expect(placementVisible(led, true)).toBe(true);
    expect(placementVisible(assessPlacement('dc-battery-12v', c, c.supply!.model), false)).toBe(
      true,
    );
    expect(placementVisible(assessPlacement('transformer-12v', c, dc), false)).toBe(true);
    expect(assessPlacement('space-heater', c, dc).reasons.map((r) => r.code)).toContain(
      'underpowered',
    );
    expect(assessPlacement('mcb', c, dc).status).toBe('unassessed');
  });

  it('detects contradictory ideal constraints but allows finite-impedance fault experiments', () => {
    const c = editingCircuit();
    c.components.push(C('other', 'ac-mains-supply', { customVoltage: 12 }));
    c.wires.push(
      { ...W('conflict-l', 'other', 0, 'l', 0), lengthMeters: 0 },
      { ...W('conflict-n', 'other', 1, 'n', 0), lengthMeters: 0 },
    );
    const readiness = assessCircuitReadiness(c);
    expect(readiness.topology).toBe('invalid');
    expect(readiness.diagnosticRunAvailable).toBe(false);
    expect(simulate(c).electricalContract?.status).toBe('invalid');
    const short = {
      components: [C('l', 'live-terminal'), C('n', 'neutral-terminal')],
      wires: [W('short', 'l', 0, 'n', 0)],
    };
    expect(assessCircuitReadiness(short).topology).toBe('short');
  });

  it.each([
    ['empty', { components: [], wires: [] }],
    ['no-source', { components: [C('load', 'space-heater')], wires: [] }],
  ] satisfies [string, Circuit][])(
    'returns %s through the real domain simulation boundary without a clearing success',
    (topology, circuit) => {
      const result = simulate(structuredClone(circuit));
      expect(result.readiness?.topology).toBe(topology);
      expect(result.readiness).toEqual(assessCircuitReadiness(circuit));
      expect(result.faultsCleared).toBe(false);
    },
  );

  it('keeps no-load readiness separate from fault clearing and successful operation', () => {
    const circuit = {
      components: [C('l', 'live-terminal'), C('n', 'neutral-terminal')],
      wires: [],
    };
    const result = simulate(circuit);
    expect(result.readiness).toEqual(assessCircuitReadiness(circuit));
    expect(result.readiness?.topology).toBe('no-load');
    expect(result.readiness?.operation).toBe('not-assessed');
    expect(result.readiness?.assessment).toBe('not-assessed');
  });
});
