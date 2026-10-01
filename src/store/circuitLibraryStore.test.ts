import type { Circuit } from '@electrasim/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  type CircuitLibraryDocument,
  DEFAULT_CIRCUIT_NAME,
  useCircuitLibraryStore,
} from './circuitLibraryStore';

const circuit: Circuit = {
  components: [{ id: 'lamp', type: 'bulb', x: 0, y: 0, state: {} }],
  wires: [],
};
const document: CircuitLibraryDocument = {
  id: 'saved-1',
  name: 'Saved circuit',
  version: 2,
  circuit,
  readOnly: false,
};

beforeEach(() => {
  useCircuitLibraryStore.setState({
    ownerId: null,
    name: DEFAULT_CIRCUIT_NAME,
    current: null,
  });
});

describe('saved circuit panel session state', () => {
  it('retains the selected document and name when the same owner remounts the panel', () => {
    const state = useCircuitLibraryStore.getState();
    state.setOwner('user-1');
    state.setName(document.name);
    state.setCurrent(document);

    state.setOwner('user-1');

    expect(useCircuitLibraryStore.getState()).toMatchObject({
      ownerId: 'user-1',
      name: 'Saved circuit',
      current: document,
    });
  });

  it('clears the selection when the account changes', () => {
    const state = useCircuitLibraryStore.getState();
    state.setOwner('user-1');
    state.setName(document.name);
    state.setCurrent(document);

    state.setOwner('user-2');

    expect(useCircuitLibraryStore.getState()).toMatchObject({
      ownerId: 'user-2',
      name: DEFAULT_CIRCUIT_NAME,
      current: null,
    });
  });
});
