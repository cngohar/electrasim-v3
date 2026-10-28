import {
  COMPONENT_DEFS,
  type Circuit,
  type ComponentInstance,
  getPortPos,
} from '@electrasim/domain';
import { CIRCUIT_SCHEMA_VERSION } from '@electrasim/domain/circuitFormat';
import { ELECTRICAL_MODEL_VERSION } from '@electrasim/domain/core/contracts';
import { CONTROL_ENGINE_VERSION } from '@electrasim/domain/core/controlStep';
import { MNA_ENGINE_VERSION } from '@electrasim/domain/core/mna';
import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../../store';
import { ComponentNode } from '../../ui/canvas/ComponentNode';
import { buildWirePath } from '../../ui/canvas/geometry';
import { labGlassLight } from '../../ui/theme';
import { earlierModel, previewSwitches } from './policy';
import { renderCircuitSvg, sceneGeometry } from './render';
const noop = () => {};
const parse = (text: string) => new DOMParser().parseFromString(text, 'image/svg+xml');
afterEach(() => vi.restoreAllMocks());

it('uses the same device frames, drawings, symbols, labels and rotated ports as the real editor for the complete catalogue', () => {
  useSettingsStore.setState({
    componentAppearance: 'both',
    automaticComponentLabels: true,
    diagnosticOverlayMode: 'off',
  });
  for (const type of Object.keys(COMPONENT_DEFS)) {
    for (const rotation of [0, 90, 180, 270]) {
      const component: ComponentInstance = {
        id: 'device',
        type,
        x: 150,
        y: 150,
        rotation,
        state: { on: true, autoLabel: 'K1' },
      };
      const circuit: Circuit = { components: [component], wires: [] };
      const preview = parse(renderCircuitSvg(circuit, 'Catalogue preview'));
      expect(preview.querySelector('parsererror')).toBeNull();
      const editor = render(
        <svg role="img" aria-label="Editor parity fixture">
          <ComponentNode
            component={component}
            componentsById={new Map([[component.id, component]])}
            theme={labGlassLight}
            selected={false}
            energized={false}
            error={false}
            wireMode={false}
            pendingFrom={null}
            customPathFrom={null}
            activeLoadEffects={false}
            reducedDetails={false}
            onPointerDown={noop}
            onPortClick={noop}
            onHoverChange={noop}
            onContextMenu={noop}
          />
        </svg>,
      );
      const device = preview.querySelector('[data-component-id]')!;
      expect(device.getAttribute('transform')).toBe(
        editor.container.querySelector('[data-component-id]')!.getAttribute('transform'),
      );
      const coordinates = (root: ParentNode) =>
        [...root.querySelectorAll('[data-port-index]')].map((port) => [
          port.getAttribute('cx'),
          port.getAttribute('cy'),
          port.getAttribute('r'),
          port.getAttribute('stroke'),
        ]);
      expect(coordinates(device)).toEqual(coordinates(editor.container));
      expect(device.querySelectorAll('[data-port-index]').length).toBe(
        COMPONENT_DEFS[type].ports.length,
      );
      const frame = (root: ParentNode) =>
        root
          .querySelector('[data-device-frame]')!
          .getAttributeNames()
          .map((k) => [k, root.querySelector('[data-device-frame]')!.getAttribute(k)]);
      expect(frame(device)).toEqual(frame(editor.container));
      expect(device.querySelectorAll('[data-device-art]').length).toBe(
        editor.container.querySelectorAll('[data-device-art]').length,
      );
      expect(device.querySelector('[data-device-art] image')?.getAttribute('href')).toBe(
        editor.container.querySelector('[data-device-art] image')?.getAttribute('href'),
      );
      expect([...device.querySelectorAll('[data-port-label]')].map((p) => p.textContent)).toEqual(
        [...editor.container.querySelectorAll('[data-port-label]')].map((p) => p.textContent),
      );
      expect(
        device.querySelectorAll(
          '[data-port-touch-target], [data-momentary-control], [role="button"]',
        ).length,
      ).toBe(0);
      expect(getPortPos(component, 0, COMPONENT_DEFS)).toBeDefined();
      editor.unmount();
    }
  }
}, 30000);

it('preserves both shared wire route styles and includes outside authored corners in the thumbnail bounds', () => {
  const circuit: Circuit = {
    components: [
      { id: 'a', type: 'bulb', x: -100, y: 120, rotation: 90, state: {} },
      { id: 'b', type: 'single-way-switch', x: 300, y: 200, rotation: 270, state: { on: true } },
    ],
    wires: ['orthogonal', 'bezier'].map((kind, index) => ({
      id: `wire${index}`,
      fromComponentId: 'a',
      fromPortIndex: 0,
      toComponentId: 'b',
      toPortIndex: 0,
      pathKind: kind as 'orthogonal' | 'bezier',
      controlPoints: [
        { x: -800, y: -500 },
        { x: 1200, y: 900 },
      ],
    })),
  };
  const geometry = sceneGeometry(circuit);
  const svg = parse(renderCircuitSvg(circuit, 'Outside corners'));
  for (const wire of circuit.wires)
    expect(
      [...svg.querySelectorAll('path')].some(
        (p) => p.getAttribute('d') === buildWirePath(wire, geometry.byId),
      ),
    ).toBe(true);
  expect(geometry.viewBox[0]).toBeLessThan(-800);
  expect(geometry.viewBox[1]).toBeLessThan(-500);
  expect(geometry.viewBox[0] + geometry.viewBox[2]).toBeGreaterThan(1200);
  expect(geometry.viewBox[1] + geometry.viewBox[3]).toBeGreaterThan(900);
});
it('is deterministic, escapes content, obeys strict style CSP and never writes or mutates its snapshot', () => {
  const circuit: Circuit = {
    components: [
      {
        id: '<script>alert(1)</script>',
        type: 'bulb',
        x: 100,
        y: 120,
        rotation: 0,
        state: { autoLabel: '<img src=x onerror=alert(1)>' },
      },
    ],
    wires: [],
  };
  const before = structuredClone(circuit);
  const local = vi.spyOn(Storage.prototype, 'setItem');
  const svg = renderCircuitSvg(circuit, '</title><script>alert(1)</script>');
  expect(renderCircuitSvg(circuit, '</title><script>alert(1)</script>')).toBe(svg);
  expect(parse(svg).querySelector('script')).toBeNull();
  expect(svg).not.toMatch(/ style=|tabindex=|<script|role="button"/i);
  expect(local).not.toHaveBeenCalled();
  expect(circuit).toEqual(before);
  expect(parse(svg).documentElement.getAttribute('viewBox')).toBeTruthy();
});
it('preserves user text that resembles a theme expression', () => {
  const title = 'var(--canvas-text)';
  const svg = parse(renderCircuitSvg({ components: [], wires: [] }, title));
  expect(svg.querySelector('title')?.textContent).toBe(title);
});
it('keeps injected fault causes visible in a static reduced-motion scene', () => {
  const circuit: Circuit = {
    components: [
      { id: 'load', type: 'bulb', x: 100, y: 100, rotation: 0, state: { fault: 'open-circuit' } },
    ],
    wires: [],
  };
  const svg = parse(renderCircuitSvg(circuit, 'Fault cause'));
  expect(svg.querySelector('[data-fault-cause] title')?.textContent).toContain('Open circuit');
  expect(svg.documentElement.getAttribute('data-reduced-effects')).toBe('true');
});
it('allows only manual contacts and marks earlier provenance without claiming certification', () => {
  const components = [
    'single-way-switch',
    'push-button',
    'mcb',
    'afdd',
    'bulb',
    'relay-dpdt',
    'delay-timer',
  ].map((type) => ({ id: type, type, x: 0, y: 0, rotation: 0, state: {} }));
  expect(previewSwitches({ components, wires: [] }).map((c) => c.type)).toEqual([
    'single-way-switch',
    'push-button',
  ]);
  const current = {
    circuitSchemaVersion: CIRCUIT_SCHEMA_VERSION,
    modelVersion: ELECTRICAL_MODEL_VERSION,
    engineVersion: MNA_ENGINE_VERSION,
    controlEngineVersion: CONTROL_ENGINE_VERSION,
  };
  expect(earlierModel(current)).toBe(false);
  for (const key of ['modelVersion', 'engineVersion', 'controlEngineVersion'] as const)
    expect(earlierModel({ ...current, [key]: 'earlier' })).toBe(true);
});
