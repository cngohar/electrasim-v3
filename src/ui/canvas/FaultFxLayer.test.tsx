/**
 * Render tests for the canvas FaultFxLayer — the visible half of the Fault
 * Lab work. E2E coverage lives in e2e/workbench-ui.spec.ts; these lock the
 * SVG structure per fault kind (indicator group, sever cuts, identity-swap
 * strokes, badge chips) and the pre-commit arming effect.
 */

import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ComponentInstance, WireInstance } from '../../domain';
import { useUiStore } from '../../store';
import { FaultFxLayer } from './FaultFxLayer';
import { collectFaultFx } from './faultFx';
import type { CanvasTheme } from './types';

const theme: CanvasTheme = {
  bg: '#ffffff',
  gridDot: '#e2e8f0',
  isDark: false,
  wire: { live: '#ef4444', neutral: '#3b82f6', earth: '#10b981' },
  component: {
    bg: '#fff',
    border: '#334155',
    text: '#0f172a',
    subtext: '#64748b',
    rounded: 8,
    accent: '#0ea5e9',
    selectedRing: '#f59e0b',
  },
  port: { border: '#64748b', bgIdle: '#fff' },
  font: 'system-ui',
};

function comp(id: string, type: string, fault?: ComponentInstance['state']['fault']) {
  return { id, type, x: 100, y: 100, state: fault ? { fault } : {} } as ComponentInstance;
}

function wire(
  id: string,
  fromComponentId: string,
  fromPortIndex: number,
  toComponentId: string,
  toPortIndex: number,
) {
  return {
    id,
    fromComponentId,
    fromPortIndex,
    toComponentId,
    toPortIndex,
    controlPoints: [],
  } as WireInstance;
}

function fixture() {
  const supply = comp('s1', 'ac-mains-supply');
  const sw = comp('sw1', 'single-way-switch');
  const bulb = comp('b1', 'bulb');
  const wires = [
    wire('w1', 's1', 0, 'sw1', 0),
    wire('w2', 'sw1', 1, 'b1', 0),
    wire('w3', 's1', 1, 'b1', 1),
  ];
  const components = [supply, sw, bulb];
  return { wires, components, byId: new Map(components.map((c) => [c.id, c])) };
}

function renderLayer(
  components: ComponentInstance[],
  wires: WireInstance[],
  byId: Map<string, ComponentInstance>,
) {
  const items = collectFaultFx({ components, wires }, byId);
  return render(
    <svg role="img" aria-label="test canvas">
      <title>test canvas</title>
      <FaultFxLayer
        items={items}
        wires={wires}
        componentsById={byId}
        theme={theme}
        wireWidth={2.25}
        orthogonalPaths={new Map()}
      />
    </svg>,
  );
}

describe('FaultFxLayer', () => {
  it('short-circuit renders the fire indicator with spark burst and badge', () => {
    const f = fixture();
    f.components[2].state.fault = 'short-circuit';
    const { container } = renderLayer(f.components, f.wires, f.byId);
    expect(container.querySelector('[data-fault-fx="short-circuit"]')).toBeTruthy();
    expect(container.querySelector('.electrasim-fx-sparkburst')).toBeTruthy();
    expect(container.querySelector('[data-fault-chip="short-circuit"]')).toBeTruthy();
  });

  it('open-circuit fades + cuts every attached conductor', () => {
    const f = fixture();
    f.components[2].state.fault = 'open-circuit';
    const { container } = renderLayer(f.components, f.wires, f.byId);
    expect(container.querySelectorAll('[data-fault-sever-cut]')).toHaveLength(2);
    expect(container.querySelector('.electrasim-fx-gap-in')).toBeTruthy();
  });

  it('open-neutral cuts only the neutral run', () => {
    const f = fixture();
    f.components[2].state.fault = 'open-neutral';
    const { container } = renderLayer(f.components, f.wires, f.byId);
    expect(container.querySelectorAll('[data-fault-sever-cut]')).toHaveLength(1);
  });

  it('switched-neutral recolours the two runs through the switch with opposite identities', () => {
    const f = fixture();
    f.components[1].state.fault = 'switched-neutral';
    const { container } = renderLayer(f.components, f.wires, f.byId);
    const swaps = [...container.querySelectorAll('[data-fault-swap-wire]')];
    expect(swaps).toHaveLength(2);
    const roles = swaps.map((el) => el.getAttribute('data-fault-swap-as'));
    expect(new Set(roles)).toEqual(new Set(['live', 'neutral']));
    // Distinct per-fault crossover glyph.
    expect(container.querySelector('.electrasim-fx-xover-spin')).toBeTruthy();
  });

  it('each remaining fault kind renders its own indicator class', () => {
    const cases = [
      ['earth-fault', '.electrasim-fx-earth-ring'],
      ['smooth-dc-residual', '.electrasim-fx-dc-drift'],
      ['arc-fault', '.electrasim-fx-arc-strobe'],
    ] as const;
    for (const [fault, cls] of cases) {
      const f = fixture();
      f.components[2].state.fault = fault;
      const { container, unmount } = renderLayer(f.components, f.wires, f.byId);
      expect(container.querySelector(cls), fault).toBeTruthy();
      expect(container.querySelector(`[data-fault-chip="${fault}"]`)).toBeTruthy();
      unmount();
    }
  });

  it('arming pendingFx shows the pre-commit choreography at the target', () => {
    const f = fixture();
    let container!: HTMLElement;
    act(() => {
      useUiStore.setState({
        pendingFaultFx: { target: { componentId: 'b1' }, type: 'short-circuit', nonce: 7 },
      });
      container = renderLayer(f.components, f.wires, f.byId).container;
    });
    expect(container.querySelector('[data-fault-arming="short-circuit"]')).toBeTruthy();
    // fire sparks first
    expect(container.querySelectorAll('.electrasim-fx-spark-flicker').length).toBeGreaterThan(0);
    act(() => {
      useUiStore.setState({ pendingFaultFx: null });
    });
  });

  it('arming pendingFx anchors on wire targets at the wire midpoint', () => {
    const f = fixture();
    let container!: HTMLElement;
    act(() => {
      useUiStore.setState({
        pendingFaultFx: { target: { wireId: 'w2' }, type: 'open-circuit', nonce: 9 },
      });
      container = renderLayer(f.components, f.wires, f.byId).container;
    });
    const arming = container.querySelector('[data-fault-arming="open-circuit"]');
    expect(arming).toBeTruthy();
    // All components sit at (100,100) in this fixture, so the wire midpoint
    // coincides with the component position — assert the anchor transform.
    expect(arming?.getAttribute('transform')).toContain('translate(100 100)');
    act(() => {
      useUiStore.setState({ pendingFaultFx: null });
    });
  });
});
