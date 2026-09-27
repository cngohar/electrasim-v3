import type { ComponentInstance, WireInstance } from '@electrasim/domain';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { labGlassLight } from '../theme';
import { WireLayer } from './WireLayer';

const components: ComponentInstance[] = [
  { id: 'l', type: 'live-terminal', x: 100, y: 100, state: {} },
  { id: 's', type: 'single-way-switch', x: 300, y: 100, state: {} },
];
const wires: WireInstance[] = ['plain', 'flagged', 'traced', 'severed', 'short', 'busted'].map(
  (id) => ({
    id,
    fromComponentId: 'l',
    fromPortIndex: 0,
    toComponentId: 's',
    toPortIndex: 0,
    fault: id === 'short' ? 'short-circuit' : undefined,
    isBusted: id === 'busted',
    controlPoints: [],
  }),
);

describe('dense wire parity', () => {
  it('preserves diagnostic, trace, cut, short and melted-wire evidence and keyboard controls', () => {
    const onSelect = vi.fn();
    const onReroute = vi.fn();
    const props = {
      wires,
      componentsById: new Map(components.map((c) => [c.id, c])),
      theme: labGlassLight,
      wireWidth: 2,
      selectedWireId: null,
      currentFlowOn: false,
      wireGlowOn: false,
      orthogonalPaths: new Map<string, string>(),
      flaggedWireIds: new Set(['flagged']),
      traceWireIds: new Set(['traced']),
      severedWireIds: new Set(['severed']),
      onSelectWire: onSelect,
      onArmReroute: onReroute,
      onContextMenu: vi.fn(),
    };
    const { container, rerender } = render(
      <svg role="img" aria-label="Test circuit">
        <WireLayer {...props} reducedDetails={false} />
      </svg>,
    );
    const detailed = new Map(
      wires
        .slice(1)
        .map((w) => [w.id, container.querySelector(`[data-wire-id="${w.id}"]`)?.outerHTML]),
    );
    rerender(
      <svg role="img" aria-label="Test circuit">
        <WireLayer {...props} reducedDetails />
      </svg>,
    );
    expect(container.querySelectorAll('[data-wire-id]')).toHaveLength(6);
    for (const [id, html] of detailed)
      expect(container.querySelector(`[data-wire-id="${id}"]`)?.outerHTML).toBe(html);
    expect(container.querySelector('[data-short-wire-indicator]')).not.toBeNull();
    expect(container.querySelector('[data-busted-wire-indicator]')).not.toBeNull();
    const plain = container.querySelector('[data-wire-id="plain"]')!;
    expect(plain.closest('[data-dense-wire-layer]')?.parentElement).toHaveAttribute(
      'opacity',
      '0.15',
    );
    fireEvent.keyDown(plain, { key: 'Enter' });
    rerender(
      <svg role="img" aria-label="Test circuit">
        <WireLayer {...props} selectedWireId="plain" reducedDetails />
      </svg>,
    );
    expect(container.querySelector('[data-wire-id="plain"]')).toBe(plain);
    fireEvent.keyDown(plain, { key: 'r' });
    expect(onSelect).toHaveBeenCalledWith('plain');
    expect(onReroute).toHaveBeenCalledWith('plain');
  });
});
