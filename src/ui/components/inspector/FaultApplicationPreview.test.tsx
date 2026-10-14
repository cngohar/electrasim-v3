import {
  COMPONENT_DEFS,
  type Circuit,
  FAULT_REGISTRY,
  type FaultTarget,
  assessFaultTarget,
} from '@electrasim/domain';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { seriesFixture } from '../../../../packages/domain/src/core/mnaFixtures';
import { protectionCircuit } from '../../../../packages/domain/src/core/protectionFixtures';
import { FaultApplicationPreview } from './FaultApplicationPreview';

function applicableTarget(type: keyof typeof FAULT_REGISTRY): [Circuit, FaultTarget] {
  for (const circuit of [protectionCircuit('mcb', 16), seriesFixture()]) {
    for (const component of circuit.components) {
      const componentTarget: FaultTarget = { type: 'component', id: component.id };
      if (assessFaultTarget(circuit, type, componentTarget).applicable)
        return [circuit, componentTarget];
      for (const [index] of Object.entries(COMPONENT_DEFS[component.type]?.ports ?? {})) {
        const portTarget: FaultTarget = {
          type: 'port',
          componentId: component.id,
          portIndex: Number(index),
        };
        if (assessFaultTarget(circuit, type, portTarget).applicable) return [circuit, portTarget];
      }
    }
    for (const wire of circuit.wires) {
      const wireTarget: FaultTarget = { type: 'wire', id: wire.id };
      if (assessFaultTarget(circuit, type, wireTarget).applicable) return [circuit, wireTarget];
    }
  }
  throw new Error(`No real review target for ${type}`);
}

describe('fault application review', () => {
  it.each(Object.values(FAULT_REGISTRY))(
    'previews %s against an applicable real target',
    (fault) => {
      const [circuit, target] = applicableTarget(fault.id);
      const before = structuredClone(circuit);
      const { container } = render(
        <FaultApplicationPreview circuit={circuit} target={target} type={fault.id} />,
      );
      expect(screen.getByRole('region', { name: `${fault.label} review` })).toBeVisible();
      expect(screen.getByText(fault.label, { selector: 'strong' })).toBeVisible();
      expect(screen.getByText(/Review only/)).toBeVisible();
      const diagram = container.querySelector('[data-fault-target-diagram]');
      expect(diagram).toHaveAttribute(
        'data-fault-target-diagram',
        target.type === 'wire' ? 'wire' : 'component',
      );
      expect(diagram).toHaveAttribute(
        'data-fault-target-id',
        target.type === 'port' ? target.componentId : target.id,
      );
      expect(diagram?.querySelector('[data-component-symbol]')).not.toBeNull();
      if (target.type === 'port') {
        const component = circuit.components.find((item) => item.id === target.componentId)!;
        const terminal = COMPONENT_DEFS[component.type]?.ports[target.portIndex]?.label;
        expect(diagram).toHaveTextContent(terminal ?? String(target.portIndex));
      }
      if (fault.id === 'live-to-earth')
        expect(screen.getByText('Leakage impedance unspecified')).toBeVisible();
      if (fault.id === 'switched-neutral')
        expect(screen.getByText('Neutral mapping unavailable')).toBeVisible();
      if (fault.id === 'protection-forced-open' || fault.id === 'protection-bypass')
        expect(diagram?.querySelector('[data-forced-open-contacts="true"]')).not.toBeNull();
      if (fault.id === 'protection-bypass')
        expect(diagram?.querySelector('[data-fault-path="protection-bypass"]')).not.toBeNull();
      expect(circuit).toEqual(before);
    },
  );
});
