import { damageCircuit, protectedDamageCircuit } from '@electrasim/domain/core/damageFixtures';
import { simulate } from '@electrasim/domain/simulation';
import { describe, expect, it } from 'vitest';
import { MATTER_EFFECT_LIMIT, collectMatterEffects } from './matterEffects';
import { createMatterScene } from './matterScene';

describe('electrical consequence visuals', () => {
  it('shows explicit stress before damage and snaps only after the declared budget opens', () => {
    const circuit = damageCircuit();
    const before = simulate(circuit);
    expect(collectMatterEffects(circuit, before)).toContainEqual({
      key: 'wire:load-feed',
      id: 'load-feed',
      target: 'wire',
      kind: 'overload',
    });
    const after = simulate(circuit, { deltaSeconds: 2 });
    expect(collectMatterEffects(circuit, after)).toEqual([
      { key: 'wire:load-feed', id: 'load-feed', target: 'wire', kind: 'damage' },
    ]);
  });
  it('does not turn normal protective clearing into destruction', () => {
    const circuit = protectedDamageCircuit();
    const result = simulate(circuit, { deltaSeconds: 2 });
    expect(result.simulationEvents?.map((event) => event.type)).toEqual(['protection-trip']);
    expect(collectMatterEffects(circuit, result)).toEqual([]);
  });
  it('rejects stale, missing and legacy consequence evidence', () => {
    const circuit = damageCircuit();
    const result = simulate(circuit, { deltaSeconds: 2 });
    expect(collectMatterEffects(circuit, null)).toEqual([]);
    expect(collectMatterEffects(circuit, { ...result, inputRevision: 'old' })).toEqual([]);
    expect(
      collectMatterEffects(circuit, {
        ...result,
        legacyObservation: { engineVersion: 'legacy-rail-1.5b', reason: 'historical' },
      }),
    ).toEqual([]);
    circuit.components[1].state.on = false;
    expect(collectMatterEffects(circuit, result)).toEqual([]);
  });
  it('preserves saved damage without a run and removes it on replacement', () => {
    const circuit = damageCircuit();
    circuit.wires[1].isBusted = true;
    circuit.components[2].state.isBlown = true;
    expect(collectMatterEffects(circuit, null).map((item) => item.kind)).toEqual([
      'damage',
      'damage',
    ]);
    circuit.wires[1].isBusted = false;
    circuit.components[2].state.isBlown = false;
    expect(collectMatterEffects(circuit, null)).toEqual([]);
  });
  it('keeps electrical results, replay and circuit bytes identical after physics', () => {
    const circuit = damageCircuit();
    const bytes = JSON.stringify(circuit);
    const result = simulate(circuit, { deltaSeconds: 2 });
    const baseline = structuredClone(result);
    const scene = createMatterScene(
      collectMatterEffects(circuit, result).map((effect) => ({
        key: effect.key,
        kind: effect.kind,
        x: 100,
        y: 100,
        tangent: { x: 1, y: 0 },
      })),
    );
    for (let i = 0; i < 60; i++) scene.step();
    scene.dispose();
    expect(result).toEqual(baseline);
    expect(JSON.stringify(circuit)).toBe(bytes);
    expect(simulate(circuit, { deltaSeconds: 2 })).toEqual(baseline);
  });
  it('caps bodies, produces finite bounded geometry and replays deterministically', () => {
    const anchors = Array.from({ length: 100 }, (_, index) => ({
      key: String(index),
      kind: 'damage' as const,
      x: 100,
      y: 100,
      tangent: { x: 1, y: 0 },
    }));
    const a = createMatterScene(anchors);
    const b = createMatterScene(anchors);
    expect(a.bodyCount).toBe(MATTER_EFFECT_LIMIT * 2);
    for (let i = 0; i < 45; i++) {
      const paths = a.step();
      expect(paths).toEqual(b.step());
      expect(paths).toHaveLength(MATTER_EFFECT_LIMIT);
      expect(paths.every((p) => !/NaN|Infinity/.test(p.d))).toBe(true);
    }
    a.dispose();
    b.dispose();
  });
});
