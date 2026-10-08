import { describe, expect, it } from 'vitest';
import { COMPONENT_DEFS } from '../components';
import { compileCircuit } from '../core/compile';
import { terminalId } from '../core/faultTopology';
import { createInjectedFault } from '../faults';
import type { Circuit, ComponentInstance, WireInstance } from '../types';
import { simulate } from './simulate';
const C = (id: string, type: string, on = false): ComponentInstance => ({
  id,
  type,
  x: 0,
  y: 0,
  state: { on },
});
const W = (id: string, a: string, p: number, b: string, q: number): WireInstance => ({
  id,
  fromComponentId: a,
  fromPortIndex: p,
  toComponentId: b,
  toPortIndex: q,
  controlPoints: [],
});
function bench(type = 'relay-spdt'): Circuit {
  return {
    components: [
      C('l', 'live-terminal'),
      C('n', 'neutral-terminal'),
      C('relay', type),
      C('no', 'bulb-incandescent'),
      C('nc', 'bulb-incandescent'),
    ],
    wires: [
      W('supply', 'l', 0, 'relay', 2),
      W('normally-open', 'relay', 3, 'no', 0),
      W('normally-closed', 'relay', 4, 'nc', 0),
      W('no-return', 'no', 1, 'n', 0),
      W('nc-return', 'nc', 1, 'n', 0),
    ],
  };
}
function declareCoil(circuit: Circuit) {
  circuit.components[2]!.state.coilModel = {
    version: 1,
    supply: { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
    nominalPowerWatts: 2,
    pickupRatio: 0.8,
    dropoutRatio: 0.2,
    onDelaySeconds: 0,
    offDelaySeconds: 0,
  };
}
function connectedPortIndices(_def: unknown, component: ComponentInstance, port: number) {
  const compiled = compileCircuit({ components: [component], wires: [] });
  if (compiled.status !== 'compiled') throw new Error('Invalid contact fixture');
  const terminal = terminalId(component.id, port);
  return compiled.graph.branches
    .filter((b) => b.kind === 'contact' && b.closed && (b.from === terminal || b.to === terminal))
    .map((b) => JSON.parse(b.from === terminal ? b.to : b.from)[2]);
}
describe('reported relay coil and NO/NC regression', () => {
  it.each(['relay-spdt', 'control-relay'])(
    'withholds undeclared coil operation on %s while preserving the selected contact topology',
    (type) => {
      const circuit = bench(type);
      for (const on of [false, true]) {
        circuit.components[2]!.state.on = on;
        const result = simulate(circuit);
        expect(result.electrical?.status).toBe('unsupported');
        expect(result.energizedComponents.size).toBe(0);
        expect(connectedPortIndices(COMPONENT_DEFS[type], circuit.components[2]!, 2)).toEqual([
          on ? 3 : 4,
        ]);
      }
    },
  );
  it('operates from both coil rails, drops out on a broken return, and never mutates saved manual state', () => {
    const circuit = bench();
    declareCoil(circuit);
    circuit.wires.push(W('coil-live', 'l', 0, 'relay', 0), W('coil-neutral', 'n', 0, 'relay', 1));
    const snapshot = JSON.stringify(circuit);
    const result = simulate(circuit);
    expect(result.coilStates).toEqual({ relay: true });
    expect(result.energizedComponents.has('no')).toBe(true);
    expect(result.energizedComponents.has('nc')).toBe(false);
    expect(JSON.stringify(circuit)).toBe(snapshot);
    circuit.faults = [createInjectedFault('open-circuit', { type: 'wire', id: 'coil-neutral' })];
    const dropped = simulate(circuit);
    expect(dropped.coilStates).toEqual({ relay: false });
    expect(dropped.energizedComponents.has('no')).toBe(false);
    expect(dropped.energizedComponents.has('nc')).toBe(true);
  });
  it('never feeds the contacts from the coil, or the coil from COM', () => {
    const circuit = bench();
    circuit.wires = circuit.wires.filter((w) => w.id !== 'supply');
    declareCoil(circuit);
    circuit.wires.push(W('coil-live', 'l', 0, 'relay', 0), W('coil-neutral', 'n', 0, 'relay', 1));
    const result = simulate(circuit);
    expect(result.coilStates?.relay).toBe(true);
    expect(result.energizedComponents.has('no')).toBe(false);
    expect(result.energizedComponents.has('nc')).toBe(false);
    circuit.wires = circuit.wires.filter((w) => w.id !== 'coil-live');
    declareCoil(circuit);
    circuit.wires.push(W('supply', 'l', 0, 'relay', 2));
    expect(simulate(circuit).coilStates?.relay).toBe(false);
  });
  it('isolates both DPDT poles and preserves the original terminal indices', () => {
    const def = COMPONENT_DEFS['relay-dpdt'];
    const relay = C('relay', 'relay-dpdt');
    expect(def.ports.map((p) => p.label)).toEqual([
      'Coil+',
      'Coil-',
      'C1',
      'NO1',
      'C2',
      'NO2',
      'NC1',
      'NC2',
    ]);
    expect(connectedPortIndices(def, relay, 2)).toEqual([6]);
    expect(connectedPortIndices(def, relay, 4)).toEqual([7]);
    relay.state.on = true;
    expect(connectedPortIndices(def, relay, 2)).toEqual([3]);
    expect(connectedPortIndices(def, relay, 4)).toEqual([5]);
    expect(connectedPortIndices(def, relay, 0)).toEqual([]);
  });
  it('does not bridge the phases of a multi-pole contactor', () => {
    const relay = C('contactor', 'contactor-3p', true);
    const def = COMPONENT_DEFS[relay.type];
    expect(connectedPortIndices(def, relay, 0)).toEqual([3]);
    expect(connectedPortIndices(def, relay, 1)).toEqual([4]);
  });
  it('detects oscillating NC feedback rather than reporting a stable circuit', () => {
    const circuit = bench();
    declareCoil(circuit);
    circuit.wires.push(
      W('feedback', 'relay', 4, 'relay', 0),
      W('coil-neutral', 'n', 0, 'relay', 1),
    );
    expect(simulate(circuit).electrical?.status).toBe('nonconverged');
    expect(
      simulate(circuit).electrical?.diagnostics.some((d) => d.code === 'control-feedback-unstable'),
    ).toBe(true);
  });
  it('keeps component membership separate from identical electrical behavior', () => {
    expect(COMPONENT_DEFS['relay-spdt'].tier ?? 'basic').toBe('basic');
    expect(COMPONENT_DEFS['relay-spst'].tier ?? 'basic').toBe('basic');
    expect(COMPONENT_DEFS['relay-dpdt'].tier).toBe('pro');
    expect(COMPONENT_DEFS['control-relay'].tier).toBe('pro');
    const circuit = bench();
    expect(simulate(circuit, { appMode: 'basic' })).toEqual(simulate(circuit, { appMode: 'pro' }));
  });
});
