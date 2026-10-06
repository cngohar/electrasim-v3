import { describe, expect, it } from 'vitest';
import { COMPONENT_DEFS } from '../components';
import { component as C, wire as W } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import { DEVICE_CAPABILITY_FAMILIES, resolveDeviceCapabilities } from './capabilities';
import { assessTerminalCompatibility } from './compatibility';
import { assessCircuitReadiness } from './readiness';
import { explicitSupplyProfile } from './supplies';

function resistive(): Circuit {
  return {
    components: [C('l', 'live-terminal'), C('n', 'neutral-terminal'), C('load', 'space-heater')],
    wires: [W('feed', 'l', 0, 'load', 0), W('return', 'load', 1, 'n', 0)],
  };
}

describe('1.5C.0 explicit capability inventory', () => {
  it('classifies all 116 catalogue variants, with valid group ports and explicit unknowns', () => {
    expect(Object.keys(DEVICE_CAPABILITY_FAMILIES).sort()).toEqual(
      Object.keys(COMPONENT_DEFS).sort(),
    );
    expect(Object.keys(COMPONENT_DEFS)).toHaveLength(116);
    for (const type of Object.keys(COMPONENT_DEFS)) {
      const c = C('device', type);
      const capability = resolveDeviceCapabilities(c, { components: [c], wires: [] });
      expect(capability.groups.length, type).toBeGreaterThan(0);
      expect(new Set(capability.groups.map((g) => g.id)).size).toBe(capability.groups.length);
      for (const g of capability.groups) {
        expect(
          g.ports.every((port) => !!COMPONENT_DEFS[type].ports[port]),
          type,
        ).toBe(true);
        expect(g.maximumVoltage.status, type).toBe(type === 'motor-3phase' ? 'known' : 'unknown');
      }
      expect(capability.damageModel.status).toBe('not-assessed');
    }
  });

  it('does not infer a battery or supply control from labels, isSource or substrings', () => {
    for (const type of [
      'earth-terminal',
      'earth-rod',
      'photocell-sensor',
      'space-heater',
      'solar-pv-panel',
    ]) {
      const c = C('x', type);
      const capability = resolveDeviceCapabilities(c, { components: [c], wires: [] });
      expect(capability.sourceControl).toBe('none');
      expect(capability.battery).toBe(false);
    }
    const battery = C('x', 'dc-battery-12v');
    expect(resolveDeviceCapabilities(battery, { components: [battery], wires: [] }).battery).toBe(
      true,
    );
  });

  it('keeps fixed resistance, unknown LED law, and outlet capacity separate', () => {
    const heater = C('heater', 'space-heater', { customVoltage: 230, customPowerWatts: 2000 });
    const circuit = { components: [heater], wires: [], globalVoltage: 12 };
    const g = resolveDeviceCapabilities(heater, circuit).groups[0];
    expect(g.nominalVoltage).toMatchObject({ value: 230, provenance: 'instance' });
    expect(g.loadLaw).toMatchObject({ kind: 'fixed-resistance', resistanceOhms: 26.45 });
    expect(g.maximumVoltage.status).toBe('unknown');
    const led = resolveDeviceCapabilities(C('led', 'bulb'), circuit).groups[0];
    expect(led.loadLaw.kind).toBe('not-assessed');
    expect(led.operatingVoltageRange.status).toBe('unknown');
    const outlet = resolveDeviceCapabilities(C('socket', 'socket-3pin'), circuit).groups[0];
    expect(outlet.loadLaw.kind).toBe('none');
    expect(outlet.nominalPowerWatts.status).toBe('unknown');
    expect(outlet.currentCapacityAmps.status).toBe('unknown');
  });

  it('separates coil and contact ratings and never treats a maximum as nominal voltage', () => {
    const relay = C('relay', 'relay-spdt', { customMaxVolts: 400, customMaxAmps: 10 });
    const capability = resolveDeviceCapabilities(relay, { components: [relay], wires: [] });
    const contact = capability.groups.find((g) => g.role === 'contact')!;
    const coil = capability.groups.find((g) => g.role === 'coil')!;
    expect(contact.maximumVoltage).toMatchObject({ value: 400 });
    expect(coil.maximumVoltage.status).toBe('unknown');
    expect(coil.nominalVoltage.status).toBe('unknown');
    const result = assessTerminalCompatibility(contact, {
      supply: { kind: 'ac-single-phase', voltage: 12, frequencyHz: 50 },
    });
    expect(result.reasons.some((r) => r.code === 'undervoltage' || r.code === 'underpowered')).toBe(
      false,
    );
  });

  it('checks supply kind, phase, frequency and voltage at the specified terminal group', () => {
    const c = C('lamp', 'bulb');
    const group = resolveDeviceCapabilities(c, { components: [c], wires: [] }).groups[0];
    expect(
      assessTerminalCompatibility(group, { supply: { kind: 'dc', voltage: 12 } }).reasons.map(
        (r) => r.code,
      ),
    ).toContain('supply-kind-mismatch');
    expect(
      assessTerminalCompatibility(group, {
        supply: { kind: 'ac-three-phase', voltage: 230, frequencyHz: 50, sequence: 'abc' },
      }).reasons.map((r) => r.code),
    ).toContain('phase-mismatch');
    const rated = {
      ...group,
      frequencyHz: {
        status: 'known' as const,
        value: [50],
        provenance: 'catalogue' as const,
        basis: 'Fixture rating',
      },
      operatingVoltageRange: {
        status: 'known' as const,
        value: { min: 200, max: 250 },
        provenance: 'catalogue' as const,
        basis: 'Fixture range',
      },
    };
    const result = assessTerminalCompatibility(rated, {
      supply: { kind: 'ac-single-phase', voltage: 230, frequencyHz: 60 },
      terminalVoltage: 12,
    });
    expect(result.status).toBe('incompatible');
    expect(result.reasons.map((r) => r.code)).toEqual(
      expect.arrayContaining(['frequency-mismatch', 'undervoltage', 'unsupported-model']),
    );
    expect(result.reasons.find((r) => r.code === 'undervoltage')?.basis).toBe('solved-terminal');
  });

  it('describes underpowered resistance provisionally without inventing measurements or damage', () => {
    const c = C('heater', 'space-heater');
    const group = resolveDeviceCapabilities(c, { components: [c], wires: [] }).groups[0];
    const result = assessTerminalCompatibility(group, { supply: { kind: 'dc', voltage: 12 } });
    expect(result.status).toBe('unassessed');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'underpowered', basis: 'nominal-supply' }),
        expect.objectContaining({ code: 'unknown-rating' }),
      ]),
    );
    expect(
      assessTerminalCompatibility(group, {
        supply: { kind: 'dc', voltage: 12 },
        compareNominalVoltage: false,
      }).reasons.some((r) => r.code === 'underpowered'),
    ).toBe(false);
    expect(
      assessTerminalCompatibility(group, {
        supply: { kind: 'dc', voltage: 12 },
        terminalVoltage: Number.NaN,
      }).status,
    ).toBe('unassessed');
  });
});

describe('1.5C.0 deterministic readiness without a solve or safety verdict', () => {
  it('distinguishes empty, missing source and no load', () => {
    expect(assessCircuitReadiness({ components: [], wires: [] })).toMatchObject({
      topology: 'empty',
      diagnosticRunAvailable: false,
      calculation: 'not-performed',
      operation: 'not-assessed',
      assessment: 'not-assessed',
    });
    expect(
      assessCircuitReadiness({ components: [C('heater', 'space-heater')], wires: [] }).topology,
    ).toBe('no-source');
    expect(
      assessCircuitReadiness({
        components: [C('l', 'live-terminal'), C('n', 'neutral-terminal')],
        wires: [],
      }),
    ).toMatchObject({ topology: 'no-load', diagnosticRunAvailable: true });
  });

  it('recognizes complete series paths, open returns, and partial branches', () => {
    const closed = resistive();
    expect(assessCircuitReadiness(closed).topology).toBe('connected');
    const open = { ...closed, wires: closed.wires.slice(0, 1) };
    expect(assessCircuitReadiness(open)).toMatchObject({
      topology: 'open',
      loadPaths: [expect.objectContaining({ state: 'open' })],
    });
    const series: Circuit = {
      ...closed,
      components: [...closed.components, C('second', 'space-heater')],
      wires: [
        closed.wires[0],
        W('series', 'load', 1, 'second', 0),
        W('return', 'second', 1, 'n', 0),
      ],
    };
    expect(assessCircuitReadiness(series).loadPaths.every((p) => p.state === 'closed-path')).toBe(
      true,
    );
    const partial: Circuit = {
      ...closed,
      components: [...closed.components, C('spur', 'space-heater')],
      wires: [...closed.wires, W('spur-feed', 'l', 0, 'spur', 0)],
    };
    expect(assessCircuitReadiness(partial)).toMatchObject({ topology: 'partial' });
    expect(
      assessCircuitReadiness(partial).loadPaths.find((p) => p.componentId === 'spur')?.state,
    ).toBe('open');
  });

  it('does not count a floating resistor loop attached at one terminal as a powered branch', () => {
    const circuit = resistive();
    circuit.components.push(C('a', 'space-heater'), C('b', 'space-heater'));
    circuit.wires.push(
      W('a-in', 'l', 0, 'a', 0),
      W('a-b', 'a', 1, 'b', 0),
      W('b-out', 'b', 1, 'l', 0),
    );
    const result = assessCircuitReadiness(circuit);
    expect(result.topology).toBe('partial');
    expect(
      result.loadPaths.filter((p) => p.componentId !== 'load').every((p) => p.state === 'open'),
    ).toBe(true);
  });

  it('does not hide a pure source short behind no-load readiness', () => {
    const circuit: Circuit = {
      components: [C('l', 'live-terminal'), C('n', 'neutral-terminal')],
      wires: [W('short', 'l', 0, 'n', 0)],
    };
    const result = assessCircuitReadiness(circuit);
    expect(result.topology).toBe('short');
    expect(result.shortedSourceIds).toHaveLength(1);
    expect(result.calculation).toBe('not-performed');
    expect(result.diagnostics.some((d) => d.code === 'readiness-short')).toBe(true);
  });

  it('allows diagnostic open-switch cases without declaring the off state a wiring mistake', () => {
    const circuit = resistive();
    circuit.components.push(C('switch', 'single-way-switch', { on: false }));
    circuit.wires[0] = W('feed', 'l', 0, 'switch', 0);
    circuit.wires.push(W('sw-load', 'switch', 1, 'load', 0));
    const result = assessCircuitReadiness(circuit);
    expect(result).toMatchObject({ topology: 'open', diagnosticRunAvailable: true });
    expect(result.diagnostics.every((d) => d.severity !== 'error')).toBe(true);
  });

  it('assigns isolated relay coils and contacts to their relevant independent supplies', () => {
    const circuit: Circuit = {
      components: [
        C('ac', 'ac-mains-supply'),
        C('dc', 'dc-battery-12v'),
        C('relay', 'relay-spst', { on: true }),
        C('load', 'space-heater'),
      ],
      wires: [
        W('coil+', 'dc', 0, 'relay', 0),
        W('coil-', 'dc', 1, 'relay', 1),
        W('contact', 'ac', 0, 'relay', 2),
        W('feed', 'relay', 3, 'load', 0),
        W('return', 'load', 1, 'ac', 1),
      ],
    };
    const result = assessCircuitReadiness(circuit);
    const coil = result.groups.find((g) => g.componentId === 'relay' && g.groupId === 'coil')!;
    const contact = result.groups.find(
      (g) => g.componentId === 'relay' && g.groupId === 'contact:0',
    )!;
    expect(coil.sourceIds).toEqual([JSON.stringify(['source', 'dc'])]);
    expect(contact.sourceIds).toEqual([JSON.stringify(['source', 'ac'])]);
    expect(coil.domainIds).not.toEqual(contact.domainIds);
    expect(coil.result.status).toBe('unassessed');
  });

  it('keeps independent sources with a shared neutral distinct when a load has direct supply paths', () => {
    const circuit: Circuit = {
      components: [
        C('a', 'ac-mains-supply'),
        C('b', 'ac-mains-supply', {
          sourceProfile: explicitSupplyProfile({
            kind: 'ac-single-phase',
            voltage: 120,
            frequencyHz: 60,
          }),
        }),
        C('load', 'space-heater'),
      ],
      wires: [
        W('common', 'a', 1, 'b', 1),
        W('feed', 'b', 0, 'load', 0),
        W('return', 'load', 1, 'b', 1),
      ],
    };
    const group = assessCircuitReadiness(circuit).groups.find((g) => g.componentId === 'load')!;
    expect(group.sourceIds).toEqual([JSON.stringify(['source', 'b'])]);
    expect(group.result.reasons.some((r) => r.code === 'underpowered')).toBe(true);
  });

  it('traces transformer excitation without pretending the preflight solved secondary voltage', () => {
    const circuit: Circuit = {
      components: [
        C('ac', 'ac-mains-supply'),
        C('tx', 'transformer-12v'),
        C('load', 'space-heater'),
      ],
      wires: [
        W('l', 'ac', 0, 'tx', 0),
        W('n', 'tx', 1, 'ac', 1),
        W('out', 'tx', 2, 'load', 0),
        W('back', 'load', 1, 'tx', 3),
      ],
    };
    const result = assessCircuitReadiness(circuit);
    expect(result.groups.find((g) => g.componentId === 'load')?.sourceIds).toEqual([
      JSON.stringify(['source', 'ac']),
    ]);
    expect(result.topology).toBe('connected');
    expect(result.calculation).toBe('not-performed');
    expect(
      result.groups
        .find((g) => g.componentId === 'load')
        ?.result.reasons.some((reason) => reason.basis === 'nominal-supply'),
    ).toBe(false);
    expect(
      result.capabilities.find((c) => c.componentId === 'tx')?.groups.map((g) => g.nominalVoltage),
    ).toEqual([expect.objectContaining({ value: 230 }), expect.objectContaining({ value: 12 })]);
    expect(
      result.coverage.some(
        (c) => c.subjectId === 'tx' && c.aspect === 'load' && c.status === 'estimated',
      ),
    ).toBe(true);
  });

  it('is stable under input-order changes and cannot pass malformed documents', () => {
    const circuit = resistive();
    const before = JSON.stringify(circuit);
    const result = assessCircuitReadiness(circuit);
    expect(
      assessCircuitReadiness({
        ...circuit,
        components: [...circuit.components].reverse(),
        wires: [...circuit.wires].reverse(),
      }),
    ).toEqual(result);
    expect(JSON.stringify(circuit)).toBe(before);
    expect(
      assessCircuitReadiness({
        components: circuit.components,
        wires: [W('invalid', 'l', 99, 'load', 0)],
      }),
    ).toMatchObject({
      topology: 'invalid',
      diagnosticRunAvailable: false,
      compatibility: 'unassessed',
    });
  });
});
