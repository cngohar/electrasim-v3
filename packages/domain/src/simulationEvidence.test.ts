import { describe, expect, it } from 'vitest';
import { validateCircuit } from './circuitValidation';
import { seriesFixture } from './core/mnaFixtures';
import { normalizeCircuitDocument } from './core/normalize';
import { explicitSupplyProfile } from './core/supplies';
import { threePhaseStarFixture } from './core/threePhaseFixtures';
import { assessFaultTarget } from './faultApplicability';
import { FAULT_REGISTRY, createInjectedFault, isFaultRemoved, isFaultResolved } from './faults';
import { getGuideProgress } from './guideProgress';
import { simulate } from './simulation';
import {
  circuitRevision,
  hasFindingFreeEvidence,
  hasOperationEvidence,
  isCurrentSimulation,
} from './simulationEvidence';
import { readVoltage } from './simulationReadings';
import { GUIDED_CIRCUIT_TEMPLATES, cloneTemplateCircuit } from './templates';

describe('current versioned consumer evidence', () => {
  it('survives serialization, normalization and layout changes, but rejects electrical edits', () => {
    const circuit = seriesFixture();
    const result = simulate(circuit);
    expect(
      isCurrentSimulation(normalizeCircuitDocument(circuit, false), structuredClone(result)),
    ).toBe(true);
    const moved = structuredClone(circuit);
    moved.components.reverse();
    moved.wires.reverse();
    moved.components[0]!.x = 700;
    moved.wires[0]!.controlPoints.push({ x: 1, y: 2 });
    expect(circuitRevision(moved)).toBe(result.inputRevision);
    for (const edit of [
      (c: typeof circuit) => {
        c.components[0]!.state.sourceProfile = explicitSupplyProfile({ kind: 'dc', voltage: 24 });
      },
      (c: typeof circuit) => {
        c.components[1]!.state.customPowerWatts = 10;
      },
      (c: typeof circuit) => {
        c.components[1]!.type = 'bulb';
      },
      (c: typeof circuit) => {
        c.wires[0]!.lengthMeters = 20;
      },
      (c: typeof circuit) => {
        c.wires.pop();
      },
      (c: typeof circuit) => {
        c.components.pop();
      },
      (c: typeof circuit) => {
        c.faults = [createInjectedFault('open-circuit', { type: 'wire', id: 'feed' })];
      },
    ]) {
      const changed = structuredClone(circuit);
      edit(changed);
      expect(isCurrentSimulation(changed, result)).toBe(false);
      expect(validateCircuit(changed, result).status).not.toBe('pass');
      expect(
        readVoltage(
          changed,
          result,
          { componentId: 'r0', portIndex: 0 },
          { componentId: 'r0', portIndex: 1 },
        ).volts,
      ).toBeNull();
    }
    expect(isCurrentSimulation(circuit, { ...result, inputRevision: undefined })).toBe(false);
    expect(
      isCurrentSimulation(circuit, {
        ...result,
        electricalContract: { ...result.electricalContract!, modelVersion: 'obsolete' },
      }),
    ).toBe(false);
  });

  it('measures the named terminal pair and refuses independent references', () => {
    const circuit = seriesFixture();
    const result = simulate(circuit);
    expect(
      readVoltage(
        circuit,
        result,
        { componentId: 'r0', portIndex: 0 },
        { componentId: 'r0', portIndex: 1 },
      ).volts,
    ).toBeCloseTo((12 * 6) / 12.21, 9);
    const independent = structuredClone(circuit);
    const other = seriesFixture([12]);
    other.components.forEach((c) => {
      c.id = `other-${c.id}`;
    });
    other.wires.forEach((w) => {
      w.id = `other-${w.id}`;
      w.fromComponentId = `other-${w.fromComponentId}`;
      w.toComponentId = `other-${w.toComponentId}`;
    });
    independent.components.push(...other.components);
    independent.wires.push(...other.wires);
    expect(
      readVoltage(
        independent,
        simulate(independent),
        { componentId: 's', portIndex: 0 },
        { componentId: 'other-s', portIndex: 0 },
      ).volts,
    ).toBeNull();
    const phasor = threePhaseStarFixture();
    expect(
      readVoltage(
        phasor,
        simulate(phasor),
        { componentId: 's', portIndex: 0 },
        { componentId: 's', portIndex: 1 },
      ),
    ).toMatchObject({ convention: 'complex-rms' });
  });

  it('separates clearing a record from supported recovery and target deletion', () => {
    const circuit = seriesFixture();
    const fault = createInjectedFault('open-circuit', { type: 'wire', id: 'feed' });
    expect(isFaultResolved(fault, circuit, simulate(circuit))).toBe(true);
    const deleted = { ...circuit, wires: circuit.wires.slice(1) };
    expect(isFaultRemoved(fault, deleted, simulate(deleted))).toBe(true);
    expect(isFaultResolved(fault, deleted, simulate(deleted))).toBe(false);
    expect(isFaultResolved(fault, circuit, simulate(deleted))).toBe(false);
    const unassessed = structuredClone(circuit);
    unassessed.components[1]!.type = 'bulb';
    expect(hasOperationEvidence(unassessed, simulate(unassessed))).toBe(false);
    expect(isFaultResolved(fault, unassessed, simulate(unassessed))).toBe(false);
  });

  it('runs every shipped guide and never completes an unassessed or cached result', () => {
    for (const template of GUIDED_CIRCUIT_TEMPLATES) {
      const circuit = cloneTemplateCircuit(template);
      const result = simulate(circuit);
      expect(isCurrentSimulation(circuit, result), template.id).toBe(true);
      expect(getGuideProgress(template, circuit, true, result).completed, template.id).toBe(
        hasFindingFreeEvidence(circuit, result),
      );
      const stale = { ...result, inputRevision: 'old' };
      expect(
        getGuideProgress(template, circuit, true, stale).completedIds,
        template.id,
      ).not.toContain('simulation');
      expect(getGuideProgress(template, circuit, true, stale).completed, template.id).toBe(false);
    }
  });

  it('withholds a checklist after authored supply, load ratings or component identity changes', () => {
    const circuit = seriesFixture([6]);
    const template = { ...GUIDED_CIRCUIT_TEMPLATES[0]!, circuit };
    expect(getGuideProgress(template, circuit, true, simulate(circuit)).completed).toBe(true);
    for (const change of [
      (c: typeof circuit) => {
        c.components[0]!.state.sourceProfile = explicitSupplyProfile({ kind: 'dc', voltage: 24 });
      },
      (c: typeof circuit) => {
        c.components[1]!.state.customPowerWatts = 10;
      },
      (c: typeof circuit) => {
        c.components[1]!.id = 'replacement';
        c.wires[0]!.toComponentId = 'replacement';
        c.wires[1]!.fromComponentId = 'replacement';
      },
    ]) {
      const edited = structuredClone(circuit);
      change(edited);
      expect(getGuideProgress(template, edited, true, simulate(edited)).completed).toBe(false);
    }
  });

  it('gives every current fault an explicit physical applicability and coverage decision', () => {
    const circuit = seriesFixture();
    const targets = [
      { type: 'component' as const, id: 'r0' },
      { type: 'wire' as const, id: 'feed' },
      { type: 'port' as const, componentId: 'r0', portIndex: 0 },
    ];
    expect(Object.keys(FAULT_REGISTRY)).toHaveLength(14);
    for (const type of Object.keys(FAULT_REGISTRY) as (keyof typeof FAULT_REGISTRY)[]) {
      for (const target of targets) {
        const coverage = assessFaultTarget(circuit, type, target);
        expect(coverage.reason.length, `${type}/${target.type}`).toBeGreaterThan(10);
        expect(['supported', 'not-assessed']).toContain(coverage.coverage);
      }
    }
    expect(assessFaultTarget(circuit, 'open-neutral', targets[1]!)).toMatchObject({
      applicable: false,
    });
    expect(assessFaultTarget(circuit, 'short-circuit', targets[1]!)).toMatchObject({
      coverage: 'not-assessed',
    });
    expect(assessFaultTarget(circuit, 'terminal-disconnect', targets[2]!)).toMatchObject({
      applicable: true,
      coverage: 'supported',
    });
  });
});
