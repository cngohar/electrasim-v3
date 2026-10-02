import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON, normalizeCircuit, validateCircuitJSON } from '../circuitFormat';
import { validateCircuit } from '../circuitValidation';
import { COMPONENT_DEFS } from '../components';
import { FAULT_REGISTRY, createInjectedFault } from '../faults';
import { component as C, wire as W, protectedLoad } from '../simulation/auditFixtures';
import { simulate } from '../simulation/simulate';
import type { Circuit, ComponentDef, FaultType } from '../types';
import { compileCircuit } from './compile';
import { terminalId } from './faultTopology';
import { validateCircuitInput } from './input';
import { createEmptyCircuit } from './normalize';
import { resolveWireProperties } from './wireProperties';

function compiled(circuit: Circuit, defs?: Record<string, ComponentDef>) {
  const result = compileCircuit(circuit, { defs });
  expect(result.status, JSON.stringify(result.diagnostics)).toBe('compiled');
  if (result.status !== 'compiled') throw new Error('Invalid fixture');
  return result;
}
function sameNet(
  graph: ReturnType<typeof compiled>['graph'],
  componentId: string,
  a: number,
  b: number,
): boolean {
  return graph.nets.some(
    (net) =>
      net.terminals.includes(terminalId(componentId, a)) &&
      net.terminals.includes(terminalId(componentId, b)),
  );
}

describe('1.5B input and saved document contracts', () => {
  it.each([
    [
      'unknown type',
      (c: Circuit) => {
        c.components[0].type = 'not-a-device';
      },
    ],
    [
      'duplicate component',
      (c: Circuit) => {
        c.components[1].id = c.components[0].id;
      },
    ],
    [
      'duplicate wire',
      (c: Circuit) => {
        c.wires[1].id = c.wires[0].id;
      },
    ],
    [
      'missing component',
      (c: Circuit) => {
        c.wires[0].fromComponentId = 'gone';
      },
    ],
    [
      'invalid port',
      (c: Circuit) => {
        c.wires[0].fromPortIndex = 99;
      },
    ],
    [
      'fractional port',
      (c: Circuit) => {
        c.wires[0].fromPortIndex = 0.5;
      },
    ],
    [
      'invalid voltage',
      (c: Circuit) => {
        c.globalVoltage = Number.NaN;
      },
    ],
    [
      'invalid cable',
      (c: Circuit) => {
        c.wires[0].customCableMm2 = -1;
      },
    ],
    [
      'invalid AWG',
      (c: Circuit) => {
        c.wires[0].gauge = 13;
      },
    ],
    [
      'invalid material',
      (c: Circuit) => {
        Object.assign(c.wires[0], { material: 'plastic' });
      },
    ],
    [
      'invalid method',
      (c: Circuit) => {
        Object.assign(c.wires[0], { installationMethod: 'unknown' });
      },
    ],
    [
      'invalid state',
      (c: Circuit) => {
        Object.assign(c.components[0].state, { on: 'yes' });
      },
    ],
    [
      'reserved ID',
      (c: Circuit) => {
        c.components[0].id = '__proto__';
      },
    ],
  ])('rejects %s at compiler, simulation, validation and file boundaries', (_name, change) => {
    const circuit = protectedLoad('mcb', 9);
    change(circuit);
    expect(validateCircuitInput(circuit).valid).toBe(false);
    expect(compileCircuit(circuit).status).toBe('invalid');
    const result = simulate(circuit);
    expect(result.electricalContract?.status).toBe('invalid');
    expect(result.energizedWires.size).toBe(0);
    expect(result.componentCalculations).toBeUndefined();
    expect(result.faultsCleared).toBe(false);
    expect(validateCircuit(circuit, result).status).toBe('fail');
    expect(() => importJSON(exportJSON(circuit))).toThrow();
  });

  it.each([
    null,
    [],
    {},
    { components: [], wires: [{ id: 'orphan' }] },
    { components: Array(5001).fill(null), wires: [] },
  ])('bounds malformed direct input without throwing', (value) => {
    expect(compileCircuit(value).status).toBe('invalid');
    expect(simulate(value as Circuit).electricalContract?.status).toBe('invalid');
    expect(validateCircuit(value as Circuit).status).toBe('fail');
  });

  it('validates fault target kinds, dangling ports, duplicate IDs and bounded parameters', () => {
    const circuit = protectedLoad('mcb', 9);
    circuit.faults = [
      createInjectedFault('terminal-disconnect', { type: 'component', id: 'load' }),
    ];
    expect(validateCircuitInput(circuit).valid).toBe(false);
    circuit.faults = [
      createInjectedFault('terminal-disconnect', {
        type: 'port',
        componentId: 'load',
        portIndex: 999,
      }),
    ];
    expect(validateCircuitInput(circuit).valid).toBe(false);
    circuit.faults = [createInjectedFault('open-circuit', { type: 'wire', id: 'branch' })];
    circuit.faults.push({ ...circuit.faults[0] });
    expect(validateCircuitInput(circuit).valid).toBe(false);
    circuit.faults = [
      createInjectedFault(
        'open-circuit',
        { type: 'wire', id: 'branch' },
        { value: Number.POSITIVE_INFINITY },
      ),
    ];
    expect(validateCircuitInput(circuit).valid).toBe(false);
  });

  it('rejects object-valued enums without invoking string coercion at any input boundary', () => {
    // These values can arrive in JSON, where toString is data rather than a method.
    const invalidEnum = { toString: null, valueOf: null };
    for (const field of ['rcdType', 'batteryChemistry']) {
      const circuit = protectedLoad('mcb', 9);
      Object.assign(circuit.components[0].state, { [field]: invalidEnum });
      expect(validateCircuitInput(circuit).valid).toBe(false);
      expect(simulate(circuit).electricalContract?.status).toBe('invalid');
    }
    const circuit = protectedLoad('mcb', 9);
    Object.assign(circuit.wires[0], { installationMethod: invalidEnum });
    expect(compileCircuit(circuit).status).toBe('invalid');
    circuit.wires[0].installationMethod = undefined;
    circuit.faults = [createInjectedFault('open-circuit', { type: 'wire', id: 'branch' })];
    Object.assign(circuit.faults[0], { type: invalidEnum });
    expect(compileCircuit(circuit).status).toBe('invalid');
    expect(validateCircuit(circuit).status).toBe('fail');
    expect(validateCircuitJSON({ version: invalidEnum, circuit })).toContain(
      'Unsupported schema version',
    );
    expect(() => importJSON(JSON.stringify({ version: 1, circuit }))).toThrow('fault');
  });

  it('rejects unencodable legacy fault IDs while preserving valid Unicode document IDs', () => {
    const circuit: Circuit = {
      components: [C('\ud800', 'bulb', { fault: 'open-circuit' })],
      wires: [],
    };
    expect(compileCircuit(circuit).status).toBe('invalid');
    expect(simulate(circuit).electricalContract?.status).toBe('invalid');
    circuit.components[0].id = 'lamp-💡:0';
    expect(compiled(circuit).graph.faults).toHaveLength(1);
    expect(importJSON(exportJSON(circuit)).components[0].id).toBe('lamp-💡:0');
  });

  it('N13: fills catalogue defaults, preserves explicit off/trip/damage, and never changes the input', () => {
    const circuit = protectedLoad('mcb', 9);
    circuit.components[2].state = {};
    const snapshot = JSON.stringify(circuit);
    expect(normalizeCircuit(circuit).components[2].state.on).toBe(true);
    expect(simulate(circuit).energizedComponents.has('load')).toBe(true);
    expect(JSON.stringify(circuit)).toBe(snapshot);
    for (const state of [{ on: false }, { isTripped: true }, { isBlown: true }]) {
      circuit.components[2].state = state;
      expect(simulate(circuit).energizedComponents.has('load')).toBe(false);
      expect(normalizeCircuit(circuit).components[2].state).toMatchObject(state);
    }
  });

  it('is idempotent and releases momentary state only at the persistence boundary', () => {
    const circuit: Circuit = {
      components: [C('button', 'push-button', { on: true }), C('mcb', 'mcb')],
      wires: [],
    };
    expect(normalizeCircuit(normalizeCircuit(circuit))).toEqual(normalizeCircuit(circuit));
    expect(compiled(circuit).circuit.components[0].state.on).toBe(true);
    expect(importJSON(exportJSON(circuit)).components[0].state.on).toBe(false);
  });

  it('N20: preserves all saved wire fields, legacy faults and canonical DPDT port IDs', () => {
    const circuit: Circuit = {
      components: [C('relay', 'relay-dpdt', { on: false }), C('l', 'live-terminal')],
      wires: [
        {
          ...W('w', 'relay', 6, 'l', 0),
          fault: 'open-neutral',
          material: 'aluminum',
          gauge: 12,
          customCableMm2: 10,
          lengthMeters: 21,
          installationMethod: 'A',
          deratingFactor: 0.5,
          pathKind: 'orthogonal',
          controlPoints: [{ x: 1, y: 2 }],
        },
      ],
    };
    expect(importJSON(exportJSON(circuit))).toEqual({
      ...circuit,
      supply: expect.objectContaining({
        model: { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
      }),
    });
    circuit.wires[0].fault = 'live-to-earth';
    expect(importJSON(exportJSON(circuit))).toEqual({
      ...circuit,
      supply: expect.objectContaining({
        model: { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
      }),
    });
  });

  it('preserves cross-role and same-device bridges as physical wiring, without silently fixing them', () => {
    const circuit = protectedLoad('rcbo', 9);
    circuit.wires.push(W('physical-short', 'device', 2, 'device', 3));
    circuit.wires[1].toPortIndex = 1;
    const restored = importJSON(exportJSON(circuit));
    expect(restored).toEqual({
      ...circuit,
      supply: expect.objectContaining({
        model: { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
      }),
    });
    expect(
      compiled(circuit).graph.branches.find((b) => b.wireId === 'physical-short'),
    ).toMatchObject({ from: terminalId('device', 2), to: terminalId('device', 3) });
  });

  it('N28: new documents take a profile voltage; changing the assessment profile never rewrites a saved supply', () => {
    expect(createEmptyCircuit('us').globalVoltage).toBe(120);
    expect(createEmptyCircuit('uk').globalVoltage).toBe(230);
    const circuit = { ...protectedLoad('mcb', 9), globalVoltage: 120 };
    expect(simulate(circuit, { standard: 'uk' }).supplyVoltage).toBe(120);
    expect(simulate(circuit, { standard: 'us' }).supplyVoltage).toBe(120);
  });
});

describe('1.5B shared wire properties', () => {
  it('uses explicit wire, AWG, explicit endpoint, then default size; never a catalogue tail recommendation', () => {
    const circuit = protectedLoad('mcb', 9);
    const index = new Map(circuit.components.map((c) => [c.id, c]));
    const wire = circuit.wires[0];
    expect(resolveWireProperties(wire, index)).toMatchObject({
      cableMm2: 2.5,
      lengthMeters: 10,
      provenance: { cableMm2: 'default' },
    });
    circuit.components[0].state.customCableMm2 = 6;
    expect(resolveWireProperties(wire, index)).toMatchObject({
      cableMm2: 6,
      provenance: { cableMm2: 'endpoint' },
    });
    circuit.components[2].state.customCableMm2 = 4;
    expect(resolveWireProperties(wire, index).cableMm2).toBe(4);
    wire.gauge = 12;
    expect(resolveWireProperties(wire, index)).toMatchObject({
      cableMm2: 3.31,
      provenance: { cableMm2: 'wire-awg' },
    });
    wire.customCableMm2 = 10;
    expect(resolveWireProperties(wire, index)).toMatchObject({
      cableMm2: 10,
      provenance: { cableMm2: 'wire' },
    });
  });

  it('declares one-conductor resistance and uses the same saved sizes in simulation telemetry and heating', () => {
    const circuit = protectedLoad('mcb', 7400, 100);
    for (const wire of circuit.wires)
      Object.assign(wire, {
        customCableMm2: 10,
        lengthMeters: 20,
        material: 'copper',
        deratingFactor: 1,
      });
    const result = simulate(circuit);
    expect(result.wireCalculations?.branch.cableMm2).toBe(10);
    expect(result.overloadedWires?.size ?? 0).toBe(0);
    expect(result.wireHeatRatios?.branch).toBeCloseTo(7400 / 230 / 64, 8);
    const graph = compiled(circuit).graph;
    expect(graph.branches.find((b) => b.wireId === 'branch')?.wire?.resistanceOhms).toBeCloseTo(
      (0.0175 * 20) / 10,
      12,
    );
  });
});

describe('1.5B sources, loads and graph isolation', () => {
  it('keeps AC/DC blocks independent, groups only declared aliases, and never treats PE as a power source', () => {
    const circuit: Circuit = {
      components: [
        C('l1', 'live-terminal'),
        C('l2', 'live-terminal'),
        C('n', 'neutral-terminal'),
        C('ac', 'ac-mains-supply'),
        C('dc', 'dc-battery-12v'),
        C('pe', 'earth-terminal'),
        C('rod', 'earth-rod'),
      ],
      wires: [],
      globalVoltage: 120,
    };
    const { graph } = compiled(circuit);
    expect(graph.sources).toHaveLength(3);
    expect(graph.sources.find((s) => s.componentIds.includes('dc'))?.model).toEqual({
      kind: 'dc',
      voltage: 12,
    });
    expect(graph.sources.find((s) => s.componentIds.includes('ac'))?.model).toMatchObject({
      kind: 'ac-single-phase',
      voltage: 120,
    });
    expect(graph.sources.find((s) => s.componentIds.includes('l1'))?.componentIds).toEqual([
      'l1',
      'l2',
      'n',
    ]);
    expect(graph.domains.find((d) => d.terminals.includes(terminalId('pe', 0)))?.sourceIds).toEqual(
      [],
    );
    expect(graph.domains.find((d) => d.terminals.includes(terminalId('ac', 2)))?.sourceIds).toEqual(
      [],
    );
    const dcDomain = graph.domains.find((d) => d.terminals.includes(terminalId('dc', 0)));
    expect(dcDomain?.terminals).not.toContain(terminalId('ac', 0));
    expect(dcDomain?.terminals).not.toContain(terminalId('n', 0));
  });

  it('N19: permits aliases with one explicit voltage and rejects conflicting explicit values in either order', () => {
    const circuit: Circuit = {
      components: [
        C('a', 'live-terminal', { customVoltage: 12 }),
        C('b', 'live-terminal'),
        C('n', 'neutral-terminal'),
      ],
      wires: [],
    };
    expect(compiled(circuit).graph.sources[0].model.voltage).toBe(12);
    circuit.components[1].state.customVoltage = 24;
    for (let i = 0; i < 2; i++) {
      const result = compileCircuit(circuit);
      expect(result.status).toBe('invalid');
      expect(result.diagnostics[0].code).toBe('conflicting-source-alias');
      circuit.components.reverse();
    }
  });

  it('compares source constraints by electrical values, independent of object property order', () => {
    const base = COMPONENT_DEFS['live-terminal'];
    const defs: Record<string, ComponentDef> = {
      first: {
        ...base,
        electricalModel: {
          kind: 'source-alias',
          group: 'mains',
          role: 'line',
          port: 0,
          supply: { kind: 'ac-single-phase', voltage: 120, frequencyHz: 60 },
        },
      },
      second: {
        ...base,
        electricalModel: {
          kind: 'source-alias',
          group: 'mains',
          role: 'line',
          port: 0,
          supply: { frequencyHz: 60, voltage: 120, kind: 'ac-single-phase' },
        },
      },
    };
    const { graph } = compiled(
      { components: [C('a', 'first'), C('b', 'second')], wires: [] },
      defs,
    );
    expect(graph.sources).toHaveLength(1);
    expect(graph.sources[0].model).toMatchObject({ voltage: 120, frequencyHz: 60 });
  });

  it('does not stamp a declared three-phase supply as a two-terminal single-phase source', () => {
    const def: ComponentDef = {
      ...COMPONENT_DEFS['ac-mains-supply'],
      electricalModel: {
        kind: 'source',
        ports: [0, 1],
        voltageOrigin: 'catalogue',
        supply: { kind: 'ac-three-phase', voltage: 230, frequencyHz: 50, sequence: 'abc' },
      },
    };
    const result = compiled(
      { components: [C('source', 'ac-mains-supply')], wires: [] },
      { 'ac-mains-supply': def },
    );
    expect(result.graph.sources).toEqual([]);
    expect(result.coverage).toContainEqual(
      expect.objectContaining({ subjectId: 'source', aspect: 'source', status: 'not-assessed' }),
    );
  });

  it('compiles a true series branch without using port labels to block connectivity', () => {
    const circuit: Circuit = {
      components: [
        C('battery', 'dc-battery-12v'),
        C('r1', 'space-heater', { customVoltage: 12, customPowerWatts: 24 }),
        C('r2', 'space-heater', { customVoltage: 12, customPowerWatts: 24 }),
      ],
      wires: [
        W('a', 'battery', 0, 'r1', 0),
        W('b', 'r1', 1, 'r2', 0),
        W('c', 'r2', 1, 'battery', 1),
      ],
    };
    const result = compiled(circuit);
    expect(
      result.graph.branches.filter((b) => b.kind === 'load').map((b) => b.resistanceOhms),
    ).toEqual([6, 6]);
    expect(result.graph.domains).toHaveLength(1);
    expect(result.graph.nets).toHaveLength(6); // finite wires and loads do not collapse nodes
    expect(result.coverage.at(-1)).toMatchObject({
      aspect: 'measurements',
      status: 'not-assessed',
    });
    expect(
      compiled({
        ...circuit,
        components: [...circuit.components].reverse(),
        wires: [...circuit.wires].reverse(),
      }).graph,
    ).toEqual(result.graph);
  });

  it.each(['relay-dpdt', 'contactor-3p', 'contactor-4p'])(
    '%s keeps each pole and coil isolated',
    (type) => {
      const { graph } = compiled({ components: [C('device', type, { on: true })], wires: [] });
      const def = COMPONENT_DEFS[type];
      for (const pole of def.switchContacts ?? [])
        expect(sameNet(graph, 'device', pole.common, pole.no)).toBe(true);
      const poles = def.switchContacts!;
      expect(sameNet(graph, 'device', poles[0].common, poles[1].common)).toBe(false);
      if (def.coilPorts)
        expect(sameNet(graph, 'device', def.coilPorts[0], poles[0].common)).toBe(false);
    },
  );

  it('keeps NC/NO exclusive with appended saved NC indices and transient contact state', () => {
    const circuit: Circuit = { components: [C('relay', 'relay-dpdt', { on: false })], wires: [] };
    const { graph } = compiled(circuit);
    expect(sameNet(graph, 'relay', 2, 6)).toBe(true);
    expect(sameNet(graph, 'relay', 4, 7)).toBe(true);
    expect(sameNet(graph, 'relay', 2, 3)).toBe(false);
    expect(sameNet(graph, 'relay', 2, 4)).toBe(false);
    const operated = compileCircuit(circuit, { contactStates: new Map([['relay', true]]) });
    expect(operated.status === 'compiled' && sameNet(operated.graph, 'relay', 2, 3)).toBe(true);
    expect(circuit.components[0].state.on).toBe(false);
  });

  it('keeps terminal-strip ways, intermediate travellers and three-phase distribution poles separate', () => {
    let graph = compiled({ components: [C('d', 'terminal-strip')], wires: [] }).graph;
    expect(sameNet(graph, 'd', 0, 2)).toBe(true);
    expect(sameNet(graph, 'd', 0, 1)).toBe(false);
    graph = compiled({
      components: [C('d', 'intermediate-switch', { on: false })],
      wires: [],
    }).graph;
    expect(sameNet(graph, 'd', 0, 3)).toBe(true);
    expect(sameNet(graph, 'd', 0, 1)).toBe(false);
    graph = compiled({ components: [C('d', 'distribution-board-3phase')], wires: [] }).graph;
    expect(sameNet(graph, 'd', 0, 4)).toBe(true);
    expect(sameNet(graph, 'd', 0, 1)).toBe(false);
  });

  it('N12: preserves galvanic winding isolation without claiming a solved transformer voltage', () => {
    const circuit: Circuit = {
      components: [C('ac', 'ac-mains-supply'), C('tx', 'transformer-12v'), C('lamp', 'bulb')],
      wires: [
        W('a', 'ac', 0, 'tx', 0),
        W('b', 'ac', 1, 'tx', 1),
        W('c', 'tx', 2, 'lamp', 0),
        W('d', 'tx', 3, 'lamp', 1),
      ],
    };
    const { graph } = compiled(circuit);
    const primary = graph.domains.find((d) => d.terminals.includes(terminalId('tx', 0)));
    expect(primary?.terminals).not.toContain(terminalId('tx', 2));
    expect(graph.transformers[0].turnsRatio).toBeCloseTo(230 / 12, 12);
    expect(simulate(circuit).supplyVoltage).toBeUndefined(); // guard remains until 1.5C
  });

  it('does not turn an LED, outlet rating, PV array or autotransformer into a resistor/ideal supply', () => {
    const result = compiled({
      components: [
        C('led', 'bulb'),
        C('socket', 'socket-3pin'),
        C('pv', 'solar-pv-panel'),
        C('auto', 'step-up-down-transformer'),
      ],
      wires: [],
    });
    expect(result.graph.devices.map((d) => [d.componentId, d.model.kind])).toEqual([
      ['auto', 'unassessed'],
      ['led', 'unassessed-load'],
      ['pv', 'unassessed'],
      ['socket', 'outlet'],
    ]);
    expect(result.graph.branches.some((b) => b.componentId === 'socket')).toBe(false);
    expect(result.graph.sources).toEqual([]);
  });

  it('rejects model overrides with unknown terminals or nonfinite electrical values', () => {
    const circuit = { components: [C('r', 'space-heater')], wires: [] };
    const def = COMPONENT_DEFS['space-heater'];
    const invalid: ComponentDef = {
      ...def,
      electricalModel: {
        kind: 'resistive-load',
        ports: [0, 99],
        resistanceOhms: 6,
        nominalVoltage: 12,
        nominalPowerWatts: 24,
        supplyKinds: ['dc'],
        approximation: 'fixture',
      },
    };
    expect(compileCircuit(circuit, { defs: { 'space-heater': invalid } }).status).toBe('invalid');
    invalid.electricalModel = {
      kind: 'source',
      ports: [0, 1],
      supply: { kind: 'dc', voltage: Number.NaN },
      voltageOrigin: 'catalogue',
    };
    expect(compileCircuit(circuit, { defs: { 'space-heater': invalid } }).status).toBe('invalid');
  });

  it('rejects contact models that short their own pole or connect a coil to the switched circuit', () => {
    const circuit: Circuit = { components: [C('relay', 'relay-spst')], wires: [] };
    const def = COMPONENT_DEFS['relay-spst'];
    for (const poles of [[{ common: 2, no: 2 }], [{ common: 0, no: 3 }]]) {
      const invalid: ComponentDef = {
        ...def,
        electricalModel: { kind: 'contacts', coil: [0, 1], poles },
      };
      expect(compileCircuit(circuit, { defs: { 'relay-spst': invalid } }).status).toBe('invalid');
    }
  });
});

describe('1.5B graph fault semantics', () => {
  it.each(Object.keys(FAULT_REGISTRY) as FaultType[])(
    'retains %s with explicit assessed or unassessed topology',
    (type) => {
      const circuit = protectedLoad('rcbo', 9);
      circuit.components.push(C('earthed', 'socket-3pin'));
      const target =
        type === 'terminal-disconnect'
          ? { type: 'port' as const, componentId: 'device', portIndex: 0 }
          : {
              type: 'component' as const,
              id:
                type === 'earth-fault' || type === 'open-earth' || type === 'live-to-earth'
                  ? 'earthed'
                  : 'device',
            };
      circuit.faults = [createInjectedFault(type, target)];
      const { graph, coverage } = compiled(circuit);
      expect(graph.faults).toHaveLength(1);
      expect(graph.faults[0].type).toBe(type);
      expect(
        coverage.some(
          (item) => item.subjectId === circuit.faults![0].id && item.aspect === 'fault',
        ),
      ).toBe(true);
    },
  );

  it.each(['open-circuit', 'open-live', 'open-neutral', 'open-earth'] as const)(
    'a targeted %s wire is physically broken regardless of its terminal labels',
    (type) => {
      const circuit = protectedLoad('mcb', 9);
      circuit.faults = [createInjectedFault(type, { type: 'wire', id: 'branch' })];
      expect(compiled(circuit).graph.branches.find((b) => b.wireId === 'branch')?.closed).toBe(
        false,
      );
    },
  );

  it('resolved modern faults suppress their legacy mirror without deleting either saved record', () => {
    const circuit = protectedLoad('mcb', 9);
    circuit.wires[1].fault = 'open-circuit';
    circuit.faults = [
      { ...createInjectedFault('open-circuit', { type: 'wire', id: 'branch' }), resolved: true },
    ];
    const before = JSON.stringify(circuit);
    const { graph } = compiled(circuit);
    expect(graph.faults).toEqual([]);
    expect(graph.branches.find((b) => b.wireId === 'branch')?.closed).toBe(true);
    expect(JSON.stringify(circuit)).toBe(before);
  });

  it('forces contacts open and compiles bypasses as isolated shunts even when a breaker is open/tripped', () => {
    const circuit = protectedLoad('rcbo', 9);
    circuit.components[2].state = { on: false, isTripped: true };
    circuit.faults = [
      createInjectedFault('protection-bypass', { type: 'component', id: 'device' }),
    ];
    const { graph } = compiled(circuit);
    expect(sameNet(graph, 'device', 0, 2)).toBe(true);
    expect(sameNet(graph, 'device', 1, 3)).toBe(true);
    expect(sameNet(graph, 'device', 0, 1)).toBe(false);
    circuit.components[2].state = { on: true };
    circuit.faults = [
      createInjectedFault('protection-forced-open', { type: 'component', id: 'device' }),
    ];
    expect(sameNet(compiled(circuit).graph, 'device', 0, 2)).toBe(false);
  });

  it('shorts only a named pair and refuses to invent a remote return for a one-wire short', () => {
    const circuit: Circuit = { components: [C('socket', 'socket-3pin')], wires: [] };
    circuit.faults = [createInjectedFault('short-circuit', { type: 'component', id: 'socket' })];
    const { graph } = compiled(circuit);
    expect(sameNet(graph, 'socket', 0, 1)).toBe(true);
    expect(sameNet(graph, 'socket', 0, 2)).toBe(false);
    const wired = protectedLoad('mcb', 9);
    wired.faults = [createInjectedFault('short-circuit', { type: 'wire', id: 'branch' })];
    const result = compiled(wired);
    expect(result.graph.faults[0].coverage).toBe('not-assessed');
    expect(result.diagnostics.some((d) => d.code === 'fault-model-unassessed')).toBe(true);
  });

  it('distinguishes an earth short, a broken CPC and leakage with unspecified impedance', () => {
    const circuit: Circuit = {
      components: [C('supply', 'ac-mains-supply'), C('socket', 'socket-3pin')],
      wires: [
        W('line', 'supply', 0, 'socket', 0),
        W('neutral', 'supply', 1, 'socket', 1),
        W('cpc', 'supply', 2, 'socket', 2),
      ],
    };
    circuit.faults = [createInjectedFault('earth-fault', { type: 'component', id: 'socket' })];
    const short = compiled(circuit).graph;
    expect(sameNet(short, 'socket', 0, 2)).toBe(true);
    expect(short.branches.find((b) => b.wireId === 'cpc')?.closed).toBe(true);
    expect(sameNet(short, 'socket', 0, 1)).toBe(false);

    circuit.faults = [createInjectedFault('open-earth', { type: 'component', id: 'socket' })];
    const open = compiled(circuit).graph;
    expect(sameNet(open, 'socket', 0, 2)).toBe(false);
    expect(open.branches.find((b) => b.wireId === 'cpc')?.closed).toBe(false);

    circuit.faults = [createInjectedFault('live-to-earth', { type: 'component', id: 'socket' })];
    const leakage = compiled(circuit).graph;
    expect(leakage.branches.find((b) => b.kind === 'fault')).toMatchObject({
      from: terminalId('socket', 0),
      to: terminalId('socket', 2),
      idealConductor: false,
    });
    expect(sameNet(leakage, 'socket', 0, 2)).toBe(false);
    expect(leakage.faults[0].coverage).toBe('not-assessed');
    expect(leakage.branches.find((b) => b.wireId === 'cpc')?.closed).toBe(true);
  });

  it('disconnects the named terminal after polarity swaps regardless of fault IDs or input order', () => {
    const circuit: Circuit = {
      components: [C('supply', 'ac-mains-supply'), C('lamp', 'bulb')],
      wires: [W('line', 'supply', 0, 'lamp', 0), W('neutral', 'supply', 1, 'lamp', 1)],
    };
    const reverse = createInjectedFault('reverse-polarity', { type: 'component', id: 'lamp' });
    const disconnect = createInjectedFault('terminal-disconnect', {
      type: 'port',
      componentId: 'lamp',
      portIndex: 0,
    });
    for (const [reverseId, disconnectId] of [
      ['a', 'z'],
      ['z', 'a'],
    ]) {
      circuit.faults = [
        { ...disconnect, id: disconnectId },
        { ...reverse, id: reverseId },
      ];
      const { graph } = compiled(circuit);
      expect(graph.branches.find((b) => b.wireId === 'line')).toMatchObject({
        to: terminalId('lamp', 1),
        closed: true,
      });
      expect(graph.branches.find((b) => b.wireId === 'neutral')).toMatchObject({
        to: terminalId('lamp', 0),
        closed: false,
      });
      circuit.faults.reverse();
      expect(compiled(circuit).graph).toEqual(graph);
    }
    circuit.faults = [
      { ...reverse, id: 'first' },
      { ...reverse, id: 'duplicate' },
    ];
    expect(compiled(circuit).graph.branches.find((b) => b.wireId === 'line')?.to).toBe(
      terminalId('lamp', 1),
    );
  });

  it('disconnects external terminal wires without erasing the voltage-source branch', () => {
    const circuit: Circuit = {
      components: [C('supply', 'ac-mains-supply'), C('lamp', 'bulb')],
      wires: [W('line', 'supply', 0, 'lamp', 0)],
      faults: [
        createInjectedFault('terminal-disconnect', {
          type: 'port',
          componentId: 'supply',
          portIndex: 0,
        }),
      ],
    };
    const { graph } = compiled(circuit);
    expect(graph.branches.find((b) => b.wireId === 'line')?.closed).toBe(false);
    expect(graph.branches.find((b) => b.kind === 'source')?.closed).toBe(true);
  });

  it('does not choose a shorted pole or winding when the fault record cannot identify the pair', () => {
    const circuit = protectedLoad('rcbo', 9);
    circuit.faults = [createInjectedFault('short-circuit', { type: 'component', id: 'device' })];
    const { graph } = compiled(circuit);
    expect(graph.branches.filter((b) => b.kind === 'fault')).toEqual([]);
    expect(graph.faults[0].coverage).toBe('not-assessed');
  });
});
