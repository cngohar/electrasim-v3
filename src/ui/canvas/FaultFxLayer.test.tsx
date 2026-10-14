/**
 * Render tests for the canvas FaultFxLayer — the visible half of the Fault
 * Lab work. E2E coverage lives in e2e/workbench-ui.spec.ts; these lock the
 * SVG structure per fault kind (indicator group, sever cuts, identity-swap
 * strokes, badge chips) and the pre-commit arming effect.
 */

import {
  COMPONENT_DEFS,
  type ComponentInstance,
  FAULT_REGISTRY,
  type InjectedFault,
  type WireInstance,
  getPortPos,
} from '@electrasim/domain';
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
  faults?: InjectedFault[],
) {
  const items = collectFaultFx({ components, wires, faults }, byId);
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
  it('short-circuit identifies the cause without predicting sparks or fire', () => {
    const f = fixture();
    f.components[2].state.fault = 'short-circuit';
    const { container } = renderLayer(f.components, f.wires, f.byId);
    expect(container.querySelector('[data-fault-fx="short-circuit"]')).toBeTruthy();
    expect(container.querySelector('.electrasim-fx-sparkburst')).toBeNull();
    expect(container.querySelector('.electrasim-flame-flicker')).toBeNull();
    expect(container.querySelector('[data-fault-chip="short-circuit"]')).toBeTruthy();
    const chip = container.querySelector('[data-fault-chip="short-circuit"]');
    expect(chip?.getAttribute('transform')).toContain('translate(100');
    expect(chip?.classList.contains('electrasim-fx-pop-in')).toBe(false);
    expect(chip?.querySelector('.electrasim-fx-pop-in')).toBeTruthy();
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

  it('shows an unassessed switched-neutral badge without recoloring actual conductors', () => {
    const f = fixture();
    f.components[1].state.fault = 'switched-neutral';
    const { container } = renderLayer(f.components, f.wires, f.byId);
    expect(container.querySelectorAll('[data-fault-swap-wire]')).toHaveLength(0);
    expect(container.querySelector('[data-fault-chip="switched-neutral"]')).toBeTruthy();
    expect(container.querySelector('.electrasim-fx-xover-spin')).toBeNull();
  });

  it('anchors a canonical port fault on the real pin and its cut beside that pin', () => {
    const f = fixture();
    f.components[2]!.x = 450;
    const faults: InjectedFault[] = [
      {
        id: 'terminal',
        type: 'terminal-disconnect',
        category: FAULT_REGISTRY['terminal-disconnect'].category,
        target: { type: 'port', componentId: 'b1', portIndex: 1 },
        createdAt: 0,
      },
    ];
    const { container } = renderLayer(f.components, f.wires, f.byId, faults);
    const position = getPortPos(f.components[2]!, 1, COMPONENT_DEFS);
    expect(container.querySelector('[data-fault-terminal-marker]')?.getAttribute('transform')).toBe(
      `translate(${position.x} ${position.y})`,
    );
    expect(container.querySelectorAll('[data-fault-sever-cut]')).toHaveLength(1);
    const cutTransform =
      container.querySelector('[data-fault-sever-cut]')?.getAttribute('transform') ?? '';
    const numbers = cutTransform.match(/translate\(([-\d.]+) ([-\d.]+)\)/);
    expect(numbers).toBeTruthy();
    expect(
      Math.hypot(Number(numbers![1]) - position.x, Number(numbers![2]) - position.y),
    ).toBeCloseTo(18);
  });

  it('each remaining fault kind renders its own indicator class', () => {
    const cases = [['earth-fault', '.electrasim-fx-earth-ring']] as const;
    for (const [fault, cls] of cases) {
      const f = fixture();
      f.components[0].state.fault = fault;
      const { container, unmount } = renderLayer(f.components, f.wires, f.byId);
      expect(container.querySelector(cls), fault).toBeTruthy();
      expect(container.querySelector(`[data-fault-chip="${fault}"]`)).toBeTruthy();
      unmount();
    }
  });

  it('draws bypass routes between the actual modeled protective poles', () => {
    const f = fixture();
    f.components[1]!.type = 'rcd';
    f.components[1]!.state.fault = 'protection-bypass';
    const { container } = renderLayer(f.components, f.wires, f.byId);
    const routes = container.querySelectorAll('[data-fault-bypass-pole]');
    expect(routes).toHaveLength(2);
    for (const route of routes) {
      const [fromIndex, toIndex] = route
        .getAttribute('data-fault-bypass-pole')!
        .split(':')
        .map(Number);
      const from = getPortPos(f.components[1]!, fromIndex!, COMPONENT_DEFS);
      const to = getPortPos(f.components[1]!, toIndex!, COMPONENT_DEFS);
      expect(route.getAttribute('d')).toContain(`M ${from.x} ${from.y}`);
      expect(route.getAttribute('d')).toContain(`V ${to.y} H ${to.x}`);
    }
  });

  it('unassessed arc and DC markers cannot assert a waveform or material consequence', () => {
    for (const fault of ['arc-fault', 'smooth-dc-residual'] as const) {
      const f = fixture();
      f.components[2].state.fault = fault;
      const { container, unmount } = renderLayer(f.components, f.wires, f.byId);
      expect(container.querySelector(`[data-fault-chip="${fault}"]`)).toBeTruthy();
      expect(container.querySelector('.electrasim-fx-arc-strobe')).toBeNull();
      expect(container.querySelector('.electrasim-fx-dc-drift')).toBeNull();
      expect(container.querySelector('.electrasim-flame-flicker')).toBeNull();
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
    // A pending edit is marked without asserting a material or thermal outcome.
    expect(container.querySelectorAll('.electrasim-fx-spark-flicker')).toHaveLength(0);
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
