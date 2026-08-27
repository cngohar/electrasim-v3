import { describe, expect, it } from 'vitest';
import { COMPONENT_DEFS } from './components';
import { GUIDED_CIRCUIT_IDS } from './guidedCircuitIds';
import { simulate } from './simulation';
import {
  GUIDED_CIRCUIT_TEMPLATES,
  cloneTemplateCircuit,
  getGuidedCircuitTemplate,
} from './templates';
import type { Circuit, ComponentInstance } from './types';

function requireTemplate(id: string) {
  const template = getGuidedCircuitTemplate(id);
  if (!template) throw new Error(`Missing guided circuit template: ${id}`);
  return template;
}

function requireComponent(circuit: Circuit, id: string): ComponentInstance {
  const component = circuit.components.find((item) => item.id === id);
  if (!component) throw new Error(`Missing guided circuit component: ${id}`);
  return component;
}

function connections(circuit: Circuit): string[] {
  return circuit.wires.map(
    (wire) =>
      `${wire.fromComponentId}[${wire.fromPortIndex}]->${wire.toComponentId}[${wire.toPortIndex}]`,
  );
}

describe('guided circuit templates', () => {
  it('uses unique IDs and valid, rail-compatible component ports', () => {
    const templateIds = GUIDED_CIRCUIT_TEMPLATES.map((template) => template.id);
    expect(new Set(templateIds).size).toBe(templateIds.length);
    expect(templateIds).toEqual(GUIDED_CIRCUIT_IDS);

    for (const template of GUIDED_CIRCUIT_TEMPLATES) {
      const componentsById = new Map(
        template.circuit.components.map((component) => [component.id, component]),
      );
      const componentIds = [...componentsById.keys()];
      const wireIds = template.circuit.wires.map((wire) => wire.id);
      expect(componentsById.size).toBe(template.circuit.components.length);
      expect(new Set(wireIds).size).toBe(wireIds.length);

      for (const component of template.circuit.components) {
        expect(COMPONENT_DEFS[component.type], `${template.id}: ${component.type}`).toBeDefined();
      }

      for (const wire of template.circuit.wires) {
        const from = componentsById.get(wire.fromComponentId);
        const to = componentsById.get(wire.toComponentId);
        expect(from, `${template.id}: ${wire.id} source`).toBeDefined();
        expect(to, `${template.id}: ${wire.id} target`).toBeDefined();

        const fromPort = from ? COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex] : undefined;
        const toPort = to ? COMPONENT_DEFS[to.type]?.ports[wire.toPortIndex] : undefined;
        expect(fromPort, `${template.id}: ${wire.id} source port`).toBeDefined();
        expect(toPort, `${template.id}: ${wire.id} target port`).toBeDefined();
        expect(fromPort?.type).toBe(toPort?.type);
        expect(wire.pathKind).toBe('orthogonal');
      }

      expect(componentIds.every((id) => id.startsWith(`${template.id}-`))).toBe(true);
      expect(wireIds.every((id) => id.startsWith(`${template.id}-w-`))).toBe(true);
    }
  });

  it('defines the protected momentary doorbell topology and learning checklist', () => {
    const template = requireTemplate('push-button-doorbell');

    expect(template).toMatchObject({
      title: 'Push-Button Doorbell',
      difficulty: 'Beginner',
      topic: 'Momentary switching',
    });
    expect(template.steps).toHaveLength(3);
    expect(template.faultPrompt).toContain('open circuit');
    expect(template.circuit.components).toHaveLength(5);
    expect(template.circuit.wires).toHaveLength(4);
    expect(connections(template.circuit)).toEqual([
      'push-button-doorbell-live[0]->push-button-doorbell-mcb[0]',
      'push-button-doorbell-mcb[1]->push-button-doorbell-button[0]',
      'push-button-doorbell-button[1]->push-button-doorbell-bell[0]',
      'push-button-doorbell-neutral[0]->push-button-doorbell-bell[1]',
    ]);
  });

  it('energises the doorbell only while its push button is held', () => {
    const circuit = cloneTemplateCircuit(requireTemplate('push-button-doorbell'));
    const button = requireComponent(circuit, 'push-button-doorbell-button');
    const bellId = 'push-button-doorbell-bell';

    expect(simulate(circuit).energizedComponents.has(bellId)).toBe(false);
    button.state.on = true;
    expect(simulate(circuit).energizedComponents.has(bellId)).toBe(true);
    button.state.on = false;
    expect(simulate(circuit).energizedComponents.has(bellId)).toBe(false);
  });

  it('defines the RCBO socket topology and states the simulation limits', () => {
    const template = requireTemplate('rcbo-protected-socket');

    expect(template).toMatchObject({
      title: 'RCBO-Protected Socket',
      difficulty: 'Intermediate',
      topic: 'Combined circuit protection',
    });
    expect(template.teaches).toContain('Earth-leakage and bolted-short faults trip it');
    expect(template.teaches).toContain('residual type (AC/A/F/B)');
    expect(template.steps).toHaveLength(3);
    expect(template.faultPrompt).toContain('outgoing RCBO conductor');
    expect(template.circuit.components).toHaveLength(6);
    expect(template.circuit.wires).toHaveLength(7);
    expect(connections(template.circuit)).toEqual([
      'rcbo-protected-socket-live[0]->rcbo-protected-socket-rcbo[0]',
      'rcbo-protected-socket-neutral[0]->rcbo-protected-socket-rcbo[1]',
      'rcbo-protected-socket-rcbo[2]->rcbo-protected-socket-socket[0]',
      'rcbo-protected-socket-rcbo[3]->rcbo-protected-socket-socket[1]',
      'rcbo-protected-socket-earth[0]->rcbo-protected-socket-socket[2]',
      'rcbo-protected-socket-socket[0]->rcbo-protected-socket-test-lamp[0]',
      'rcbo-protected-socket-socket[1]->rcbo-protected-socket-test-lamp[1]',
    ]);
  });

  it('opens both outgoing RCBO rails and de-energises the test lamp', () => {
    const circuit = cloneTemplateCircuit(requireTemplate('rcbo-protected-socket'));
    const rcbo = requireComponent(circuit, 'rcbo-protected-socket-rcbo');
    const lampId = 'rcbo-protected-socket-test-lamp';
    const outgoingWireIds = [
      'rcbo-protected-socket-w-rcbo-socket-live',
      'rcbo-protected-socket-w-rcbo-socket-neutral',
    ];

    const closedResult = simulate(circuit);
    expect(closedResult.energizedComponents.has(lampId)).toBe(true);
    expect(closedResult.errors).toEqual([]);

    rcbo.state.on = false;
    const openResult = simulate(circuit);
    expect(openResult.energizedComponents.has(lampId)).toBe(false);
    expect(openResult.errors).toEqual([]);
    for (const wireId of outgoingWireIds) {
      expect(openResult.energizedWires.has(wireId)).toBe(false);
    }
  });

  it('deep-clones template state and wire control points', () => {
    const template = requireTemplate('push-button-doorbell');
    const clone = cloneTemplateCircuit(template);

    clone.components[0]!.state.on = true;
    clone.wires[0]!.controlPoints.push({ x: 10, y: 20 });

    expect(template.circuit.components[0]!.state.on).toBeUndefined();
    expect(template.circuit.wires[0]!.controlPoints).toEqual([]);
  });

  it('ships at least 8 Pro-tier guides alongside the basic set', () => {
    const basic = GUIDED_CIRCUIT_TEMPLATES.filter((template) => template.tier === 'basic');
    const pro = GUIDED_CIRCUIT_TEMPLATES.filter((template) => template.tier === 'pro');

    expect(basic.length).toBe(8);
    expect(pro.length).toBeGreaterThanOrEqual(8);
    for (const template of basic) {
      expect(template.difficulty).not.toBe('Advanced');
      expect(template.circuit.globalVoltage).toBe(230);
    }
    for (const template of pro) {
      expect(template.difficulty).toBe('Advanced');
      expect(template.steps).toHaveLength(3);
      // Every Pro guide uses at least one Pro-tier component.
      const usesProComponent = template.circuit.components.some(
        (component) => COMPONENT_DEFS[component.type]?.tier === 'pro',
      );
      expect(usesProComponent, `${template.id} should use Pro components`).toBe(true);
    }
  });

  it('energises the three-phase motor from the live rails alone', () => {
    const circuit = cloneTemplateCircuit(requireTemplate('pro-3phase-dol-starter'));
    const motorId = 'pro-3phase-dol-starter-motor';
    const contactor = requireComponent(circuit, 'pro-3phase-dol-starter-contactor');

    const result = simulate(circuit);
    expect(result.energizedComponents.has(motorId)).toBe(true);
    expect(result.errors).toEqual([]);

    // Opening the contactor interrupts all three phases.
    contactor.state.on = false;
    expect(simulate(circuit).energizedComponents.has(motorId)).toBe(false);
  });

  it('runs the solar DC system without voltage-mismatch errors', () => {
    const circuit = cloneTemplateCircuit(requireTemplate('pro-solar-dc-system'));
    const result = simulate(circuit);

    expect(result.energizedComponents.has('pro-solar-dc-system-led')).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.supplyVoltage).toBe(12);
  });

  it('energises the generator backup loads through the generator earth path', () => {
    const circuit = cloneTemplateCircuit(requireTemplate('pro-generator-backup'));
    const result = simulate(circuit);

    expect(result.energizedComponents.has('pro-generator-backup-light')).toBe(true);
    expect(result.energizedComponents.has('pro-generator-backup-siren')).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('keeps every Pro circuit fault-free at rest (except the deliberate RCD demo fault)', () => {
    for (const template of GUIDED_CIRCUIT_TEMPLATES) {
      if (template.tier !== 'pro') continue;
      const result = simulate(cloneTemplateCircuit(template));
      expect(result.errors, `${template.id} should simulate without errors`).toEqual([]);
    }
  });
});
