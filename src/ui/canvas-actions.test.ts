import type { ComponentInstance } from '@electrasim/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCircuitStore, useUiStore } from '../store';
import { dropComponentAt, validateWire } from './canvas-actions';

function component(id: string, type: string): ComponentInstance {
  return { id, type, x: 0, y: 0, state: {} };
}

describe('validateWire', () => {
  it('rejects direct short between Live and Neutral supply terminals with safety warning', () => {
    const live = component('live', 'live-terminal');
    const neutral = component('neutral', 'neutral-terminal');
    const byId = new Map([
      [live.id, live],
      [neutral.id, neutral],
    ]);

    const result = validateWire(
      { componentId: live.id, portIndex: 0 },
      { componentId: neutral.id, portIndex: 0 },
      byId,
    );
    expect(result).toContain('Direct Live to Neutral connection causes a dead short circuit');
  });

  it('rejects cross-typed connections with conductor mismatch diagnostics', () => {
    const live = component('live', 'live-terminal');
    const bulb = component('bulb', 'bulb');
    const byId = new Map([
      [live.id, live],
      [bulb.id, bulb],
    ]);

    const result = validateWire(
      { componentId: live.id, portIndex: 0 },
      { componentId: bulb.id, portIndex: 1 },
      byId,
    );
    expect(result).toContain('Port mismatch: live cannot connect to neutral');
  });
});

describe('dropComponentAt', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      components: [],
      wires: [],
      selectedComponentId: null,
      selectedComponentIds: [],
      selectedWireIds: [],
    });
    useUiStore.setState({ placingType: null, mode: 'idle' });
  });

  it('honours defaultOn for newly placed protection devices', () => {
    useUiStore.getState().setPlacingType('rcbo');

    expect(dropComponentAt(53, 62, 24)).toBe(true);
    expect(useCircuitStore.getState().components[0]).toMatchObject({
      type: 'rcbo',
      x: 48,
      y: 72,
      state: { on: true },
    });
  });

  it('places momentary switches released', () => {
    useUiStore.getState().setPlacingType('push-button');

    expect(dropComponentAt(48, 48, 24)).toBe(true);
    expect(useCircuitStore.getState().components[0]?.state.on).not.toBe(true);
  });
});
