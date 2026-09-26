import { describe, expect, it } from 'vitest';
import type { Circuit, ComponentInstance } from '../types';
import { checkFastCompatibility } from './compatibility';
import { DIAGNOSTIC_CODES } from './diagnostics';
import { validateCircuitRules, validateConnection } from './validation';

function makeComp(id: string, type: string, x = 0, y = 0): ComponentInstance {
  return {
    id,
    type,
    x,
    y,
    state: {},
  };
}

describe('ElectraSim v2 — Electrical Rules & Conditional Wiring System', () => {
  describe('Layer 1: Terminal Rules', () => {
    it('allows valid Live to Live connections', () => {
      const c1 = makeComp('sw1', 'single-way-switch');
      const c2 = makeComp('b1', 'bulb');
      const byId = new Map([
        ['sw1', c1],
        ['b1', c2],
      ]);

      // Switch output Live (port 1) -> Bulb Live (port 0)
      const res = validateConnection({
        source: { componentId: 'sw1', portIndex: 1 },
        target: { componentId: 'b1', portIndex: 0 },
        componentsById: byId,
      });

      expect(res.allowed).toBe(true);
      expect(res.severity).toBe('valid');
    });

    it('allows valid Neutral to Neutral connections', () => {
      const c1 = makeComp('b1', 'bulb');
      const c2 = makeComp('nt1', 'neutral-terminal');
      const byId = new Map([
        ['b1', c1],
        ['nt1', c2],
      ]);

      // Bulb Neutral (port 1) -> Supply Neutral (port 0)
      const res = validateConnection({
        source: { componentId: 'b1', portIndex: 1 },
        target: { componentId: 'nt1', portIndex: 0 },
        componentsById: byId,
      });

      expect(res.allowed).toBe(true);
    });

    it('allows valid Earth to Earth connections', () => {
      const c1 = makeComp('sock1', 'socket-3pin');
      const c2 = makeComp('et1', 'earth-terminal');
      const byId = new Map([
        ['sock1', c1],
        ['et1', c2],
      ]);

      // Socket Earth (port 2) -> Earth Terminal (port 0)
      const res = validateConnection({
        source: { componentId: 'sock1', portIndex: 2 },
        target: { componentId: 'et1', portIndex: 0 },
        componentsById: byId,
      });

      expect(res.allowed).toBe(true);
    });

    it('blocks dangerous Live to Earth connections (TERM_LIVE_EARTH)', () => {
      const c1 = makeComp('lt1', 'live-terminal');
      const c2 = makeComp('et1', 'earth-terminal');
      const byId = new Map([
        ['lt1', c1],
        ['et1', c2],
      ]);

      const res = validateConnection({
        source: { componentId: 'lt1', portIndex: 0 },
        target: { componentId: 'et1', portIndex: 0 },
        componentsById: byId,
      });

      expect(res.allowed).toBe(false);
      expect(res.code).toBe(DIAGNOSTIC_CODES.TERM_LIVE_EARTH);
      expect(res.canOverride).toBe(false);
    });

    it('blocks direct Live-to-Neutral supply rail dead shorts (TERM_LIVE_NEUTRAL_SHORT)', () => {
      const c1 = makeComp('lt1', 'live-terminal');
      const c2 = makeComp('nt1', 'neutral-terminal');
      const byId = new Map([
        ['lt1', c1],
        ['nt1', c2],
      ]);

      const res = validateConnection({
        source: { componentId: 'lt1', portIndex: 0 },
        target: { componentId: 'nt1', portIndex: 0 },
        componentsById: byId,
      });

      expect(res.allowed).toBe(false);
      expect(res.code).toBe(DIAGNOSTIC_CODES.TERM_LIVE_NEUTRAL_SHORT);
    });
  });

  describe('Layer 2: Component Rules & Load Compatibility', () => {
    it('allows Switch to Bulb connection', () => {
      const c1 = makeComp('sw1', 'single-way-switch');
      const c2 = makeComp('b1', 'bulb');
      const byId = new Map([
        ['sw1', c1],
        ['b1', c2],
      ]);

      const res = validateConnection({
        source: { componentId: 'sw1', portIndex: 1 },
        target: { componentId: 'b1', portIndex: 0 },
        componentsById: byId,
      });

      expect(res.allowed).toBe(true);
    });

    it('allows Switch to Fan connection', () => {
      const c1 = makeComp('sw1', 'single-way-switch');
      const c2 = makeComp('fan1', 'ceiling-fan');
      const byId = new Map([
        ['sw1', c1],
        ['fan1', c2],
      ]);

      const res = validateConnection({
        source: { componentId: 'sw1', portIndex: 1 },
        target: { componentId: 'fan1', portIndex: 0 },
        componentsById: byId,
      });

      expect(res.allowed).toBe(true);
    });

    it('allows Fan Regulator to Fan connection', () => {
      const c1 = makeComp('reg1', 'fan-dimmer');
      const c2 = makeComp('fan1', 'ceiling-fan');
      const byId = new Map([
        ['reg1', c1],
        ['fan1', c2],
      ]);

      // Fan regulator output (port 1) -> Ceiling fan Live (port 0)
      const res = validateConnection({
        source: { componentId: 'reg1', portIndex: 1 },
        target: { componentId: 'fan1', portIndex: 0 },
        componentsById: byId,
      });

      expect(res.allowed).toBe(true);
    });

    it('allows Light Dimmer to Bulb connection', () => {
      const c1 = makeComp('dim1', 'dimmer-switch');
      const c2 = makeComp('b1', 'bulb');
      const byId = new Map([
        ['dim1', c1],
        ['b1', c2],
      ]);

      // Light dimmer output (port 1) -> Bulb Live (port 0)
      const res = validateConnection({
        source: { componentId: 'dim1', portIndex: 1 },
        target: { componentId: 'b1', portIndex: 0 },
        componentsById: byId,
      });

      expect(res.allowed).toBe(true);
    });

    it('blocks Fan Regulator to Bulb connection in Basic Mode with clear educational feedback', () => {
      const c1 = makeComp('reg1', 'fan-dimmer');
      const c2 = makeComp('b1', 'bulb');
      const byId = new Map([
        ['reg1', c1],
        ['b1', c2],
      ]);

      const res = validateConnection({
        source: { componentId: 'reg1', portIndex: 1 },
        target: { componentId: 'b1', portIndex: 0 },
        componentsById: byId,
        mode: 'basic',
      });

      expect(res.allowed).toBe(false);
      expect(res.code).toBe(DIAGNOSTIC_CODES.COMPAT_REGULATOR_BULB);
      expect(res.message).toContain('fan regulator is designed to control a compatible fan load');
      expect(res.explanation).toBeTruthy();
      expect(res.suggestedFix).toBeTruthy();
      expect(res.canOverride).toBe(true);
    });

    it('blocks Fan Regulator to Socket connection in Basic Mode', () => {
      const c1 = makeComp('reg1', 'fan-dimmer');
      const c2 = makeComp('sock1', 'socket-3pin');
      const byId = new Map([
        ['reg1', c1],
        ['sock1', c2],
      ]);

      const res = validateConnection({
        source: { componentId: 'reg1', portIndex: 1 },
        target: { componentId: 'sock1', portIndex: 0 },
        componentsById: byId,
        mode: 'basic',
      });

      expect(res.allowed).toBe(false);
      expect(res.code).toBe(DIAGNOSTIC_CODES.COMPAT_REGULATOR_SOCKET);
    });

    it('blocks Light Dimmer to Fan connection in Basic Mode', () => {
      const c1 = makeComp('dim1', 'dimmer-switch');
      const c2 = makeComp('fan1', 'ceiling-fan');
      const byId = new Map([
        ['dim1', c1],
        ['fan1', c2],
      ]);

      const res = validateConnection({
        source: { componentId: 'dim1', portIndex: 1 },
        target: { componentId: 'fan1', portIndex: 0 },
        componentsById: byId,
        mode: 'basic',
      });

      expect(res.allowed).toBe(false);
      expect(res.code).toBe(DIAGNOSTIC_CODES.COMPAT_DIMMER_FAN);
    });

    it('allows experimental override for Fan Regulator to Bulb in Pro Mode when requested', () => {
      const c1 = makeComp('reg1', 'fan-dimmer');
      const c2 = makeComp('b1', 'bulb');
      const byId = new Map([
        ['reg1', c1],
        ['b1', c2],
      ]);

      const res = validateConnection({
        source: { componentId: 'reg1', portIndex: 1 },
        target: { componentId: 'b1', portIndex: 0 },
        componentsById: byId,
        mode: 'pro',
        allowOverride: true,
      });

      expect(res.allowed).toBe(true);
      expect(res.severity).toBe('warning');
      expect(res.code).toBe(DIAGNOSTIC_CODES.COMPAT_REGULATOR_BULB);
    });
  });

  describe('Layer 3: Topology Rules', () => {
    it('blocks self loop connection on same component', () => {
      const c1 = makeComp('sw1', 'single-way-switch');
      const byId = new Map([['sw1', c1]]);

      const res = validateConnection({
        source: { componentId: 'sw1', portIndex: 0 },
        target: { componentId: 'sw1', portIndex: 1 },
        componentsById: byId,
      });

      expect(res.allowed).toBe(false);
      expect(res.code).toBe(DIAGNOSTIC_CODES.TOPOLOGY_SELF_LOOP);
    });

    it('blocks duplicate wire connecting existing identical ports', () => {
      const c1 = makeComp('sw1', 'single-way-switch');
      const c2 = makeComp('b1', 'bulb');
      const circuit: Circuit = {
        components: [c1, c2],
        wires: [
          {
            id: 'w1',
            fromComponentId: 'sw1',
            fromPortIndex: 1,
            toComponentId: 'b1',
            toPortIndex: 0,
            controlPoints: [],
          },
        ],
      };

      const res = validateConnection({
        source: { componentId: 'sw1', portIndex: 1 },
        target: { componentId: 'b1', portIndex: 0 },
        circuit,
      });

      expect(res.allowed).toBe(false);
      expect(res.code).toBe(DIAGNOSTIC_CODES.TOPOLOGY_DUPLICATE_WIRE);
    });
  });

  describe('Fast Compatibility Preview', () => {
    it('returns valid status for standard compatible ports', () => {
      const c1 = makeComp('sw1', 'single-way-switch');
      const c2 = makeComp('b1', 'bulb');
      const byId = new Map([
        ['sw1', c1],
        ['b1', c2],
      ]);

      const preview = checkFastCompatibility(
        { componentId: 'sw1', portIndex: 1 },
        { componentId: 'b1', portIndex: 0 },
        byId,
      );

      expect(preview.status).toBe('valid');
    });

    it('returns invalid status for Live to Earth preview', () => {
      const c1 = makeComp('lt1', 'live-terminal');
      const c2 = makeComp('et1', 'earth-terminal');
      const byId = new Map([
        ['lt1', c1],
        ['et1', c2],
      ]);

      const preview = checkFastCompatibility(
        { componentId: 'lt1', portIndex: 0 },
        { componentId: 'et1', portIndex: 0 },
        byId,
      );

      expect(preview.status).toBe('invalid');
      expect(preview.code).toBe(DIAGNOSTIC_CODES.TERM_LIVE_EARTH);
    });

    it('returns invalid status for Regulator to Bulb preview in Basic Mode', () => {
      const c1 = makeComp('reg1', 'fan-dimmer');
      const c2 = makeComp('b1', 'bulb');
      const byId = new Map([
        ['reg1', c1],
        ['b1', c2],
      ]);

      const preview = checkFastCompatibility(
        { componentId: 'reg1', portIndex: 1 },
        { componentId: 'b1', portIndex: 0 },
        byId,
        'basic',
      );

      expect(preview.status).toBe('invalid');
      expect(preview.code).toBe(DIAGNOSTIC_CODES.COMPAT_REGULATOR_BULB);
    });
  });

  describe('validateCircuitRules for entire circuits', () => {
    it('collects diagnostics on circuits with incompatible wiring without throwing', () => {
      const c1 = makeComp('reg1', 'fan-dimmer');
      const c2 = makeComp('b1', 'bulb');
      const circuit: Circuit = {
        components: [c1, c2],
        wires: [
          {
            id: 'w1',
            fromComponentId: 'reg1',
            fromPortIndex: 1,
            toComponentId: 'b1',
            toPortIndex: 0,
            controlPoints: [],
          },
        ],
      };

      const diagnostics = validateCircuitRules(circuit, 'basic');
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe(DIAGNOSTIC_CODES.COMPAT_REGULATOR_BULB);
    });
  });
});
