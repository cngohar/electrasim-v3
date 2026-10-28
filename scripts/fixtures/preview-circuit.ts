import type { Circuit } from '@electrasim/domain';
/** Connected, declared-source fixture: the switch controls a real modeled load. */
export function previewCircuit(premium = false): Circuit {
  return {
    components: [
      { id: 'light', type: 'bulb', x: 430, y: 150, rotation: 90, state: {} },
      {
        id: 'switch',
        type: 'single-way-switch',
        x: 220,
        y: 150,
        rotation: 0,
        state: { on: false },
      },
      { id: 'source', type: 'ac-mains-supply', x: 40, y: 150, rotation: 0, state: { on: true } },
      ...(premium ? [{ id: 'premium', type: 'afdd', x: 650, y: 150, rotation: 0, state: {} }] : []),
    ],
    wires: [
      {
        id: 'line',
        fromComponentId: 'switch',
        fromPortIndex: 1,
        toComponentId: 'light',
        toPortIndex: 0,
        pathKind: 'orthogonal',
        controlPoints: [],
      },
      {
        id: 'feed',
        fromComponentId: 'source',
        fromPortIndex: 0,
        toComponentId: 'switch',
        toPortIndex: 0,
        pathKind: 'orthogonal',
        controlPoints: [],
      },
      {
        id: 'neutral',
        fromComponentId: 'light',
        fromPortIndex: 1,
        toComponentId: 'source',
        toPortIndex: 1,
        pathKind: 'bezier',
        controlPoints: [{ x: 230, y: 300 }],
      },
    ],
  };
}
