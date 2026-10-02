/** Circuit file-format validation and round-trip regression tests. */

import type { Circuit } from '@electrasim/domain';
import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON, validateCircuitJSON } from './exportImport';

const SEED: Circuit = {
  components: [
    { id: 'lt1', type: 'live-terminal', x: 100, y: 200, state: {} },
    { id: 'sw1', type: 'single-way-switch', x: 250, y: 200, state: { on: true } },
    { id: 'b1', type: 'bulb', x: 400, y: 200, state: {} },
    { id: 'nt1', type: 'neutral-terminal', x: 550, y: 200, state: {} },
  ],
  wires: [
    {
      id: 'w1',
      fromComponentId: 'lt1',
      fromPortIndex: 0,
      toComponentId: 'sw1',
      toPortIndex: 0,
      controlPoints: [],
    },
    {
      id: 'w2',
      fromComponentId: 'sw1',
      fromPortIndex: 1,
      toComponentId: 'b1',
      toPortIndex: 0,
      controlPoints: [],
    },
    {
      id: 'w3',
      fromComponentId: 'b1',
      fromPortIndex: 1,
      toComponentId: 'nt1',
      toPortIndex: 0,
      controlPoints: [],
    },
  ],
};

describe('circuit import and export', () => {
  // ── exportJSON ──────────────────────────────────────────────────────────

  it('produces valid JSON with schema version 2 and a migrated supply profile', () => {
    const json = exportJSON(SEED);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(2);
    expect(parsed.circuit.supply.model).toEqual({
      kind: 'ac-single-phase',
      voltage: 230,
      frequencyHz: 50,
    });
    expect(parsed.circuit.components).toHaveLength(4);
    expect(parsed.circuit.wires).toHaveLength(3);
    expect(typeof parsed.exportedAt).toBe('number');
  });

  it('pretty-prints with 2-space indentation', () => {
    const json = exportJSON(SEED);
    // Pretty-printed JSON starts each key on a new line with leading spaces.
    expect(json).toContain('\n  ');
  });

  // ── importJSON / round-trip ─────────────────────────────────────────────

  it('round-trips the circuit identically', () => {
    const json = exportJSON(SEED);
    const imported = importJSON(json);
    expect(imported.components).toEqual(SEED.components);
    expect(imported.wires).toEqual(SEED.wires);
  });

  it('preserves component state through a round-trip', () => {
    const json = exportJSON(SEED);
    const imported = importJSON(json);
    const sw = imported.components.find((c) => c.id === 'sw1');
    expect(sw?.state.on).toBe(true);
  });

  it('preserves global supply voltage through a round-trip', () => {
    const imported = importJSON(exportJSON({ ...SEED, globalVoltage: 120 }));
    expect(imported.globalVoltage).toBe(120);
  });

  it('never persists a held momentary contact as latched on', () => {
    const withPressedButton: Circuit = {
      components: [
        { id: 'pb1', type: 'push-button', x: 100, y: 100, state: { on: true } },
        { id: 'rcbo1', type: 'rcbo', x: 200, y: 100, state: { on: true } },
      ],
      wires: [],
    };

    const imported = importJSON(exportJSON(withPressedButton));
    expect(imported.components.find((component) => component.id === 'pb1')?.state.on).toBe(false);
    expect(imported.components.find((component) => component.id === 'rcbo1')?.state.on).toBe(true);
  });

  it('normalizes legacy wires without control points', () => {
    const legacy = JSON.stringify({
      version: 1,
      circuit: {
        components: SEED.components,
        wires: SEED.wires.map(({ controlPoints: _controlPoints, ...wire }) => wire),
      },
    });

    const imported = importJSON(legacy);

    expect(imported.wires.every((wire) => Array.isArray(wire.controlPoints))).toBe(true);
  });

  // ── importJSON — rejection cases ────────────────────────────────────────

  it('rejects malformed JSON', () => {
    expect(() => importJSON('not json')).toThrow('Invalid JSON');
  });

  it('rejects wrong schema version', () => {
    const bad = JSON.stringify({ version: 99, circuit: { components: [], wires: [] } });
    expect(() => importJSON(bad)).toThrow('Unsupported schema version');
  });

  it('rejects invalid global supply voltage', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: { ...SEED, globalVoltage: Number.NaN },
    });
    expect(() => importJSON(bad)).toThrow('Invalid "circuit.globalVoltage" value');
  });

  it('rejects unknown component type', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [{ id: 'x', type: 'flying-car', x: 0, y: 0, state: {} }],
        wires: [],
      },
    });
    expect(() => importJSON(bad)).toThrow('Unknown component type');
  });

  it('rejects malformed component electrical state', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [
          {
            id: 'lt1',
            type: 'live-terminal',
            x: 0,
            y: 0,
            state: { customVoltage: '230', unknownField: true },
          },
        ],
        wires: [],
      },
    });
    expect(() => importJSON(bad)).toThrow('Invalid component');
  });

  it('rejects wire referencing missing component', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [{ id: 'lt1', type: 'live-terminal', x: 0, y: 0, state: {} }],
        wires: [
          {
            id: 'w1',
            fromComponentId: 'lt1',
            fromPortIndex: 0,
            toComponentId: 'missing',
            toPortIndex: 0,
          },
        ],
      },
    });
    expect(() => importJSON(bad)).toThrow('references missing component');
  });

  it('rejects missing circuit field', () => {
    const bad = JSON.stringify({ version: 1 });
    expect(() => importJSON(bad)).toThrow('Missing "circuit" field');
  });

  it('rejects missing components array', () => {
    const bad = JSON.stringify({ version: 1, circuit: { wires: [] } });
    expect(() => importJSON(bad)).toThrow('Missing "circuit.components" array');
  });

  it('rejects missing wires array', () => {
    const bad = JSON.stringify({ version: 1, circuit: { components: [] } });
    expect(() => importJSON(bad)).toThrow('Missing "circuit.wires" array');
  });

  it('rejects invalid component (missing id)', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [{ type: 'bulb', x: 0, y: 0, state: {} }],
        wires: [],
      },
    });
    expect(() => importJSON(bad)).toThrow('Invalid component at index 0');
  });

  it('rejects invalid wire (missing fromComponentId)', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [{ id: 'lt1', type: 'live-terminal', x: 0, y: 0, state: {} }],
        wires: [{ id: 'w1', fromPortIndex: 0, toComponentId: 'lt1', toPortIndex: 0 }],
      },
    });
    expect(() => importJSON(bad)).toThrow('Invalid wire at index 0');
  });

  // ── validateCircuitJSON direct ──────────────────────────────────────────

  it('returns null for valid payload', () => {
    const parsed = JSON.parse(exportJSON(SEED));
    expect(validateCircuitJSON(parsed)).toBeNull();
  });

  it('returns error string for non-object', () => {
    expect(validateCircuitJSON(null)).toBe('Not a valid JSON object.');
    expect(validateCircuitJSON(42)).toBe('Not a valid JSON object.');
  });

  // ── Empty circuit ───────────────────────────────────────────────────────

  it('accepts an empty circuit (0 components, 0 wires)', () => {
    const empty: Circuit = { components: [], wires: [] };
    const json = exportJSON(empty);
    const imported = importJSON(json);
    expect(imported.components).toHaveLength(0);
    expect(imported.wires).toHaveLength(0);
  });

  // ── Security / sanitisation ─────────────────────────────────────────────

  it('rejects oversized payloads before parsing', () => {
    // Craft a string > 10 MB
    const huge = 'x'.repeat(10 * 1024 * 1024 + 1);
    expect(() => importJSON(huge)).toThrow('File too large');
  });

  it('rejects too many components', () => {
    const comps = Array.from({ length: 5001 }, (_, i) => ({
      id: `c${i}`,
      type: 'bulb',
      x: 0,
      y: 0,
      state: {},
    }));
    const bad = JSON.stringify({ version: 1, circuit: { components: comps, wires: [] } });
    expect(() => importJSON(bad)).toThrow('Too many components');
  });

  it('rejects too many wires', () => {
    const wires = Array.from({ length: 10001 }, (_, i) => ({
      id: `w${i}`,
      fromComponentId: 'lt1',
      fromPortIndex: 0,
      toComponentId: 'lt1',
      toPortIndex: 0,
    }));
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [{ id: 'lt1', type: 'live-terminal', x: 0, y: 0, state: {} }],
        wires,
      },
    });
    expect(() => importJSON(bad)).toThrow('Too many wires');
  });

  it('rejects NaN coordinates', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [{ id: 'lt1', type: 'live-terminal', x: Number.NaN, y: 0, state: {} }],
        wires: [],
      },
    });
    // NaN serialises to null in JSON, so it will fail the shape check
    expect(() => importJSON(bad)).toThrow('Invalid component at index 0');
  });

  it('rejects Infinity coordinates', () => {
    // JSON.stringify turns Infinity to null, which fails isFiniteInRange
    const raw =
      '{"version":1,"circuit":{"components":[{"id":"a","type":"bulb","x":1e309,"y":0,"state":{}}],"wires":[]}}';
    // 1e309 parses as Infinity in JS
    expect(() => importJSON(raw)).toThrow('Invalid component at index 0');
  });

  it('strips __proto__ keys from component state', () => {
    // Manually craft JSON with __proto__ inside state
    const raw =
      '{"version":1,"circuit":{"components":[{"id":"lt1","type":"live-terminal","x":0,"y":0,"state":{"__proto__":{"polluted":true},"on":false}}],"wires":[]}}';
    const circuit = importJSON(raw);
    const state = circuit.components[0].state as Record<string, unknown>;
    expect(state.on).toBe(false);
    // The dangerous own-property key was stripped; the inherited __proto__ is fine.
    expect(Object.hasOwn(state, '__proto__')).toBe(false);
    // Verify the global Object prototype was not polluted.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('strips constructor keys from component state', () => {
    const raw =
      '{"version":1,"circuit":{"components":[{"id":"lt1","type":"live-terminal","x":0,"y":0,"state":{"constructor":{"name":"evil"},"on":true}}],"wires":[]}}';
    const circuit = importJSON(raw);
    const state = circuit.components[0].state as Record<string, unknown>;
    expect(state.on).toBe(true);
    // The dangerous own-property "constructor" was stripped.
    expect(Object.hasOwn(state, 'constructor')).toBe(false);
  });

  it('rejects duplicate component IDs', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [
          { id: 'dup', type: 'bulb', x: 0, y: 0, state: {} },
          { id: 'dup', type: 'bulb', x: 100, y: 0, state: {} },
        ],
        wires: [],
      },
    });
    expect(() => importJSON(bad)).toThrow('Duplicate component id');
  });

  it('rejects duplicate wire IDs', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [
          { id: 'lt1', type: 'live-terminal', x: 0, y: 0, state: {} },
          { id: 'nt1', type: 'neutral-terminal', x: 100, y: 0, state: {} },
        ],
        wires: [
          {
            id: 'dup',
            fromComponentId: 'lt1',
            fromPortIndex: 0,
            toComponentId: 'nt1',
            toPortIndex: 0,
          },
          {
            id: 'dup',
            fromComponentId: 'nt1',
            fromPortIndex: 0,
            toComponentId: 'lt1',
            toPortIndex: 0,
          },
        ],
      },
    });
    expect(() => importJSON(bad)).toThrow('Duplicate wire id');
  });

  it('preserves cross-role wiring so electrical assessment can diagnose physical miswires', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [
          { id: 'live', type: 'live-terminal', x: 0, y: 0, state: {} },
          { id: 'bulb', type: 'bulb', x: 100, y: 0, state: {} },
        ],
        wires: [
          {
            id: 'cross-rail',
            fromComponentId: 'live',
            fromPortIndex: 0,
            toComponentId: 'bulb',
            toPortIndex: 1,
            controlPoints: [],
          },
        ],
      },
    });
    expect(importJSON(bad).wires[0]).toMatchObject(JSON.parse(bad).circuit.wires[0]);
  });

  it('rejects port index out of range', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [
          { id: 'lt1', type: 'live-terminal', x: 0, y: 0, state: {} },
          { id: 'nt1', type: 'neutral-terminal', x: 100, y: 0, state: {} },
        ],
        wires: [
          {
            id: 'w1',
            fromComponentId: 'lt1',
            fromPortIndex: 99,
            toComponentId: 'nt1',
            toPortIndex: 0,
          },
        ],
      },
    });
    expect(() => importJSON(bad)).toThrow('out of range');
  });

  it('rejects empty string component id', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [{ id: '', type: 'bulb', x: 0, y: 0, state: {} }],
        wires: [],
      },
    });
    expect(() => importJSON(bad)).toThrow('Invalid component at index 0');
  });

  it('rejects negative port index', () => {
    const bad = JSON.stringify({
      version: 1,
      circuit: {
        components: [
          { id: 'lt1', type: 'live-terminal', x: 0, y: 0, state: {} },
          { id: 'nt1', type: 'neutral-terminal', x: 100, y: 0, state: {} },
        ],
        wires: [
          {
            id: 'w1',
            fromComponentId: 'lt1',
            fromPortIndex: -1,
            toComponentId: 'nt1',
            toPortIndex: 0,
          },
        ],
      },
    });
    expect(() => importJSON(bad)).toThrow('Invalid wire at index 0');
  });
});
