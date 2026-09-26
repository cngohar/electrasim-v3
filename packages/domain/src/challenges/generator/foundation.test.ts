/**
 * foundation.test.ts — the Phase B foundation lock (plan §56, §57).
 *
 * `generator.test.ts` proves the generator produces *valid* circuits. This
 * file proves those circuits are *usable by the rest of the game*: that the
 * full challenge loop closes on them, that they render, and that they survive
 * persistence.
 *
 *   generate → inject fault → verify symptom → repair → verify recovery
 *
 * These invariants were discovered by `scripts/stress-challenge-generator.ts`,
 * which fuzzes ~3,700 challenges and ~220,000 fault injections. This file is
 * the cheap CI mirror of that sweep: same assertions, small fixed sample, so a
 * regression fails `npm test` rather than waiting for the nightly stress run.
 *
 * Fault injection lives here — in the *harness* — and never in
 * `src/domain/challenges/generator/**`. The §57 gate requires the generator to
 * emit clean, fault-free circuits; anything else is a later phase's job.
 */

import { describe, expect, it } from 'vitest';
import { validateCircuit } from '../../circuitValidation';
import { COMPONENT_DEFS } from '../../components';
import {
  createInjectedFault,
  isFaultResolved,
  normalizeCircuitFaults,
  validateFaultCoexistence,
} from '../../faults';
import { collectObstacles, computeOrthogonalPath, getPortPos } from '../../geometry';
import { simulate } from '../../simulation';
import type {
  Circuit,
  ComponentInstance,
  FaultTarget,
  FaultType,
  InjectedFault,
  Point2D,
  SimulationResult,
} from '../../types';
import { CHALLENGE_DIFFICULTIES, type ChallengeDifficulty } from '../types';
import { generateChallenge } from './generator';
import { CHALLENGE_RECIPES } from './recipes';

/** Seeds per difficulty. Kept small — the deep sweep lives in the script. */
const SAMPLE = 12;

/**
 * Fault kinds every generated circuit must react to, and the target family
 * each one is applied to.
 */
const FAULT_MATRIX: { type: FaultType; targets: 'wires' | 'ports' | 'protection' }[] = [
  { type: 'open-circuit', targets: 'wires' },
  { type: 'open-live', targets: 'wires' },
  { type: 'open-neutral', targets: 'wires' },
  { type: 'short-circuit', targets: 'wires' },
  { type: 'earth-fault', targets: 'wires' },
  { type: 'live-to-earth', targets: 'wires' },
  { type: 'reverse-polarity', targets: 'wires' },
  { type: 'terminal-disconnect', targets: 'ports' },
  { type: 'protection-forced-open', targets: 'protection' },
];

function sample(difficulty: ChallengeDifficulty) {
  return Array.from({ length: SAMPLE }, (_, index) =>
    generateChallenge({ seed: index + 1, difficulty }),
  );
}

function withFaults(circuit: Circuit, faults: InjectedFault[]): Circuit {
  return { ...circuit, faults };
}

function targetsFor(
  challenge: ReturnType<typeof generateChallenge>,
  family: 'wires' | 'ports' | 'protection',
): FaultTarget[] {
  const { circuit, scenario } = challenge;
  if (family === 'wires') return circuit.wires.map((w) => ({ type: 'wire', id: w.id }));
  if (family === 'ports')
    return circuit.wires.map((w) => ({
      type: 'port',
      componentId: w.toComponentId,
      portIndex: w.toPortIndex,
    }));
  return scenario.protectionComponentIds.map((id) => ({ type: 'component', id }));
}

function describeTarget(target: FaultTarget): string {
  return target.type === 'port'
    ? `port ${target.componentId}:${target.portIndex}`
    : `${target.type} ${target.id}`;
}

/** Purely electrical consequences of a fault — never diagnostic prose. */
function isObservable(
  base: SimulationResult,
  faulted: SimulationResult,
  loadIds: string[],
): boolean {
  const deEnergised = loadIds.some(
    (id) => base.energizedComponents.has(id) && !faulted.energizedComponents.has(id),
  );
  return (
    deEnergised ||
    (faulted.trippedComponents?.length ?? 0) > (base.trippedComponents?.length ?? 0) ||
    (faulted.blownComponents?.length ?? 0) > (base.blownComponents?.length ?? 0) ||
    faulted.errorComponents.size > base.errorComponents.size ||
    faulted.errorWires.size > base.errorWires.size ||
    faulted.errors.length > base.errors.length
  );
}

function isAxisAligned(points: Point2D[]): boolean {
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (a.x !== b.x && a.y !== b.y) return false;
  }
  return true;
}

// ───────────────────────────────────────────────────────────────────────────
// §56 — The challenge loop closes
// ───────────────────────────────────────────────────────────────────────────

describe.each(CHALLENGE_DIFFICULTIES)(
  'challenge loop closes — %s (plan §56)',
  (difficulty: ChallengeDifficulty) => {
    const challenges = sample(difficulty);

    it('every injected fault produces an observable electrical symptom', () => {
      for (const challenge of challenges) {
        const { circuit, scenario, metadata } = challenge;
        const base = simulate(circuit, { appMode: 'pro' });

        for (const { type, targets } of FAULT_MATRIX) {
          for (const target of targetsFor(challenge, targets)) {
            const fault = createInjectedFault(type, target);
            const faulted = simulate(withFaults(circuit, [fault]), { appMode: 'pro' });
            expect(
              isObservable(base, faulted, scenario.loadComponentIds),
              `seed ${metadata.seed} (${metadata.recipeId}): ${type} on ${describeTarget(target)} was silent`,
            ).toBe(true);
          }
        }
      }
    });

    it('clearing the fault restores the pre-fault electrical state exactly', () => {
      for (const challenge of challenges) {
        const { circuit, metadata } = challenge;
        const base = simulate(circuit, { appMode: 'pro' });

        for (const { type, targets } of FAULT_MATRIX) {
          for (const target of targetsFor(challenge, targets)) {
            const fault = createInjectedFault(type, target);
            const faultedCircuit = withFaults(circuit, [fault]);
            const repaired = withFaults(faultedCircuit, []);
            const result = simulate(repaired, { appMode: 'pro' });
            const label = `seed ${metadata.seed}: ${type} on ${describeTarget(target)}`;

            expect(isFaultResolved(fault, repaired, result), label).toBe(true);
            expect(result.errors, label).toEqual([]);
            expect(result.errorComponents.size, label).toBe(0);
            expect(result.errorWires.size, label).toBe(0);
            expect(result.trippedComponents ?? [], label).toEqual([]);
            expect(result.energizedComponents.size, label).toBe(base.energizedComponents.size);
            expect(result.energizedWires.size, label).toBe(base.energizedWires.size);
          }
        }
      }
    });

    it('a fault is never reported resolved while it is still injected', () => {
      for (const challenge of challenges) {
        const { circuit, metadata } = challenge;
        for (const { type, targets } of FAULT_MATRIX) {
          for (const target of targetsFor(challenge, targets)) {
            const fault = createInjectedFault(type, target);
            const faultedCircuit = withFaults(circuit, [fault]);
            const result = simulate(faultedCircuit, { appMode: 'pro' });
            expect(
              isFaultResolved(fault, faultedCircuit, result),
              `seed ${metadata.seed}: ${type} on ${describeTarget(target)}`,
            ).toBe(false);
          }
        }
      }
    });

    it('deleting a faulted wire also resolves the fault', () => {
      for (const challenge of challenges) {
        const { circuit, metadata } = challenge;
        for (const wire of circuit.wires) {
          const fault = createInjectedFault('open-circuit', { type: 'wire', id: wire.id });
          const faultedCircuit = withFaults(circuit, [fault]);
          const rewired: Circuit = {
            ...faultedCircuit,
            wires: faultedCircuit.wires.filter((w) => w.id !== wire.id),
          };
          const result = simulate(rewired, { appMode: 'pro' });
          expect(
            isFaultResolved(fault, rewired, result),
            `seed ${metadata.seed}: deleting ${wire.id}`,
          ).toBe(true);
        }
      }
    });

    it('accepts a single fault on a clean circuit and surfaces it through normalisation', () => {
      for (const challenge of challenges) {
        const { circuit, metadata } = challenge;
        for (const { type, targets } of FAULT_MATRIX) {
          for (const target of targetsFor(challenge, targets)) {
            const fault = createInjectedFault(type, target);
            const coexistence = validateFaultCoexistence([], fault);
            expect(coexistence.valid, `seed ${metadata.seed}: ${type}`).toBe(true);

            const normalised = normalizeCircuitFaults(withFaults(circuit, [fault]));
            expect(
              normalised.some((f) => f.type === type && f.target.type === target.type),
              `seed ${metadata.seed}: ${type} vanished from normalizeCircuitFaults`,
            ).toBe(true);
          }
        }
      }
    });
  },
);

// ───────────────────────────────────────────────────────────────────────────
// §57 — The artefact is usable: it renders and it persists
// ───────────────────────────────────────────────────────────────────────────

describe.each(CHALLENGE_DIFFICULTIES)(
  'generated circuits are presentable — %s (plan §57)',
  (difficulty: ChallengeDifficulty) => {
    const challenges = sample(difficulty);

    it('every wire routes orthogonally without hitting the diagonal fallback', () => {
      for (const { circuit, metadata } of challenges) {
        const byId = new Map<string, ComponentInstance>(circuit.components.map((c) => [c.id, c]));
        for (const wire of circuit.wires) {
          const from = byId.get(wire.fromComponentId)!;
          const to = byId.get(wire.toComponentId)!;
          const path = computeOrthogonalPath(
            getPortPos(from, wire.fromPortIndex, COMPONENT_DEFS),
            getPortPos(to, wire.toPortIndex, COMPONENT_DEFS),
            collectObstacles(byId, COMPONENT_DEFS, wire.fromComponentId, wire.toComponentId),
          );
          expect(path.length, `seed ${metadata.seed}: ${wire.id}`).toBeGreaterThanOrEqual(2);
          expect(
            isAxisAligned(path),
            `seed ${metadata.seed}: ${wire.id} (${from.type} → ${to.type}) fell back to a diagonal route`,
          ).toBe(true);
        }
      }
    });

    it('survives a JSON round trip unchanged and simulates identically', () => {
      for (const { circuit, metadata } of challenges) {
        const before = simulate(circuit, { appMode: 'pro' });
        const round = JSON.parse(JSON.stringify(circuit)) as Circuit;

        expect(round.components, `seed ${metadata.seed}`).toEqual(circuit.components);
        expect(round.wires, `seed ${metadata.seed}`).toEqual(circuit.wires);
        expect(round.globalVoltage).toBe(circuit.globalVoltage);

        const after = simulate(round, { appMode: 'pro' });
        expect(after.energizedComponents.size).toBe(before.energizedComponents.size);
        expect(after.energizedWires.size).toBe(before.energizedWires.size);
        expect(after.errors).toEqual(before.errors);
      }
    });

    it('scores a clean BS 7671 pass with no blocking issues', () => {
      for (const { circuit, metadata } of challenges) {
        const result = simulate(circuit, { appMode: 'pro' });
        const report = validateCircuit(circuit, result, 'uk');
        expect(
          report.issues.filter((i) => i.severity === 'error').map((i) => i.id),
          `seed ${metadata.seed} (${metadata.recipeId})`,
        ).toEqual([]);
        expect(report.status, `seed ${metadata.seed}`).toBe('pass');
      }
    });

    it('declares scenario metadata that matches the circuit it describes', () => {
      for (const { circuit, scenario, metadata } of challenges) {
        const ids = new Set(circuit.components.map((c) => c.id));
        const wireIds = new Set(circuit.wires.map((w) => w.id));
        const label = `seed ${metadata.seed} (${metadata.recipeId})`;

        for (const group of [
          scenario.loadComponentIds,
          scenario.protectionComponentIds,
          scenario.switchComponentIds,
          scenario.supplyComponentIds,
        ]) {
          for (const id of group)
            expect(ids.has(id), `${label}: unknown component ${id}`).toBe(true);
        }
        for (const id of scenario.faultCandidateWireIds)
          expect(wireIds.has(id), `${label}: unknown wire ${id}`).toBe(true);

        expect(scenario.loadComponentIds.length, label).toBeGreaterThan(0);
        expect(scenario.faultCandidateWireIds.length, label).toBeGreaterThan(0);
        expect(metadata.componentCount).toBe(circuit.components.length);
        expect(metadata.wireCount).toBe(circuit.wires.length);
      }
    });
  },
);

// ───────────────────────────────────────────────────────────────────────────
// Regression seeds — every recipe, pinned, exercised end to end
// ───────────────────────────────────────────────────────────────────────────

describe.each(CHALLENGE_RECIPES.map((recipe) => recipe.id))(
  'recipe regression — %s',
  (recipeId: string) => {
    const recipe = CHALLENGE_RECIPES.find((r) => r.id === recipeId)!;
    const challenges = Array.from({ length: 5 }, (_, index) =>
      generateChallenge({ seed: index * 7919 + 13, difficulty: recipe.difficulty, recipeId }),
    );

    it('builds the pinned recipe on every seed', () => {
      for (const challenge of challenges) {
        expect(challenge.metadata.recipeId).toBe(recipeId);
        expect(challenge.metadata.difficulty).toBe(recipe.difficulty);
      }
    });

    it('baseline-simulates cleanly and energises its promised loads', () => {
      for (const { circuit, metadata } of challenges) {
        const result = simulate(circuit, { appMode: 'pro' });
        expect(result.errors, `seed ${metadata.seed}`).toEqual([]);
        for (const id of metadata.baseline.expectedEnergisedLoadIds)
          expect(result.energizedComponents.has(id), `seed ${metadata.seed}: ${id}`).toBe(true);
      }
    });

    it('reacts to an open circuit on every one of its wires', () => {
      for (const { circuit, scenario, metadata } of challenges) {
        const base = simulate(circuit, { appMode: 'pro' });
        for (const wire of circuit.wires) {
          const fault = createInjectedFault('open-circuit', { type: 'wire', id: wire.id });
          const faulted = simulate(withFaults(circuit, [fault]), { appMode: 'pro' });
          expect(
            isObservable(base, faulted, scenario.loadComponentIds),
            `seed ${metadata.seed}: open circuit on ${wire.id} was silent`,
          ).toBe(true);
        }
      }
    });
  },
);
