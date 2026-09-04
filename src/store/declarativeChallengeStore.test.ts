/**
 * declarativeChallengeStore.test.ts — the safe practice workspace (plan §11).
 *
 * The non-negotiable invariants:
 *   - starting snapshots the normal circuit, never destroys it
 *   - challenge edits autosave to the challenge workspace, not the normal one
 *   - the explicit safe-exit path restores the snapshot EXACTLY
 *   - End Challenge keeps the learner's built circuit
 *   - reset restores THIS challenge's starter, never the global default
 *   - completion marks progress without touching the normal circuit
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = new Map<IDBValidKey, unknown>();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => mem.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    if (value === undefined) mem.delete(key);
    else mem.set(key, value);
  }),
}));

import type { Circuit } from '../domain';
import { useCircuitStore } from './circuitStore';
import {
  __CHALLENGE2_ACTIVE_KEY,
  __CHALLENGE2_PROGRESS_KEY,
  __CHALLENGE2_RETURN_KEY,
} from './declarativeChallengePersistence';
import { useDeclarativeChallengeStore } from './declarativeChallengeStore';
import { startAutosave } from './persistence';
import { useUiStore } from './uiStore';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Start the real autosave subscription for the routing test. */
function withAutosave() {
  return startAutosave();
}

/** A learner's own circuit — must survive the whole challenge lifecycle. */
function myCircuit(): Circuit {
  return {
    components: [
      { id: 'my-live', type: 'live-terminal', x: 100, y: 100, state: {} },
      { id: 'my-bulb', type: 'bulb', x: 300, y: 100, state: {} },
    ],
    wires: [
      {
        id: 'my-w1',
        fromComponentId: 'my-live',
        fromPortIndex: 0,
        toComponentId: 'my-bulb',
        toPortIndex: 0,
        controlPoints: [],
        pathKind: 'orthogonal',
      },
    ],
    globalVoltage: 230,
  };
}

beforeEach(async () => {
  mem.clear();
  useDeclarativeChallengeStore.setState({
    status: 'idle',
    definition: null,
    verdict: null,
    returnCircuit: null,
    progress: {},
    attemptId: null,
    attempts: 0,
    hintsUsed: 0,
    startedAt: null,
    elapsedMs: 0,
    confirmingExit: false,
    paused: false,
    resumePrompt: null,
    visualHintVisible: false,
    visualHintLevel: null,
  });
  useUiStore.setState({
    challengeOpen: false,
    challengeIntroOpen: false,
    challengeModeActive: false,
    challengePaused: false,
    challengeAllowedComponents: null,
    challengeAttemptId: null,
  });
  useCircuitStore.getState().setCircuit(myCircuit());
  useCircuitStore.temporal.getState().clear();
  await flush();
});

describe('start — safe snapshot (plan §11, §12)', () => {
  it('snapshots the normal circuit and loads the starter', async () => {
    await useDeclarativeChallengeStore.getState().start('protected-lamp');

    const state = useDeclarativeChallengeStore.getState();
    expect(state.status).toBe('active');
    expect(state.definition?.id).toBe('protected-lamp');
    expect(state.returnCircuit?.components.length).toBe(2);

    // The editor now holds the starter (blank canvas for protected-lamp).
    expect(useCircuitStore.getState().components.length).toBe(0);

    // The return snapshot is persisted separately.
    const persisted = mem.get(__CHALLENGE2_RETURN_KEY) as { circuit: Circuit } | undefined;
    expect(persisted?.circuit.components.length).toBe(2);
    expect(persisted?.circuit.components[0]!.id).toBe('my-live');
  });
});

describe('autosave routing (plan §12)', () => {
  it('writes challenge edits to the challenge workspace, not the normal circuit', async () => {
    const stopAutosave = withAutosave();
    try {
      await useDeclarativeChallengeStore.getState().start('protected-lamp');
      const attemptId = useDeclarativeChallengeStore.getState().attemptId!;

      // The learner adds a component inside the challenge.
      useCircuitStore.getState().addComponent({
        id: 'chal-bulb',
        type: 'bulb',
        x: 400,
        y: 200,
        state: {},
      });

      // Let the debounced autosave flush.
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Normal autosave key (used by the existing persistence) is untouched.
      const normal = mem.get('electrasim:circuit:v1') as { circuit: Circuit } | undefined;
      const challengeSaved = mem.get(`electrasim:challenge2:circuit:${attemptId}`) as
        | { circuit: Circuit }
        | undefined;
      expect(normal).toBeUndefined();
      expect(challengeSaved?.circuit.components.some((c) => c.id === 'chal-bulb')).toBe(true);
    } finally {
      stopAutosave();
    }
  });
});

describe('exit — exact restoration (plan §13)', () => {
  it('restores the snapshot byte-for-byte', async () => {
    await useDeclarativeChallengeStore.getState().start('protected-lamp');
    // Wreck the challenge canvas.
    useCircuitStore.getState().clearAllComponents();
    useCircuitStore.getState().addComponent({
      id: 'junk',
      type: 'bell',
      x: 0,
      y: 0,
      state: {},
    });

    await useDeclarativeChallengeStore.getState().exitToMyCircuit();

    const circuit = useCircuitStore.getState();
    expect(circuit.components.map((c) => c.id)).toEqual(['my-live', 'my-bulb']);
    expect(circuit.wires[0]?.id).toBe('my-w1');
    expect(useDeclarativeChallengeStore.getState().status).toBe('exited');
    expect(useDeclarativeChallengeStore.getState().definition).toBeNull();
    expect(mem.get(__CHALLENGE2_RETURN_KEY)).toBeUndefined();
    expect(mem.get(__CHALLENGE2_ACTIVE_KEY)).toBeUndefined();
  });
});

describe('end challenge — keep the built circuit', () => {
  it('lifts challenge conditions without restoring the saved circuit', async () => {
    await useDeclarativeChallengeStore.getState().start('protected-lamp');
    useCircuitStore.getState().addComponent({
      id: 'kept-bulb',
      type: 'bulb',
      x: 450,
      y: 220,
      state: {},
    });

    await useDeclarativeChallengeStore.getState().endChallenge();

    expect(useCircuitStore.getState().components.map((component) => component.id)).toEqual([
      'kept-bulb',
    ]);
    expect(useDeclarativeChallengeStore.getState().status).toBe('exited');
    expect(useDeclarativeChallengeStore.getState().definition).toBeNull();
    expect(useUiStore.getState().challengeModeActive).toBe(false);
  });
});

describe('pause and resume', () => {
  it('freezes elapsed time and keeps the session resumable', async () => {
    await useDeclarativeChallengeStore.getState().start('first-lamp-tutorial');
    useDeclarativeChallengeStore.setState({ startedAt: Date.now() - 1_000 });

    useDeclarativeChallengeStore.getState().pauseChallenge();
    const paused = useDeclarativeChallengeStore.getState();
    const elapsedWhilePaused = paused.totalElapsedMs();

    expect(paused.paused).toBe(true);
    expect(elapsedWhilePaused).toBe(paused.elapsedMs);
    expect(useUiStore.getState().challengePaused).toBe(true);
    expect(paused.check()).toBeNull();

    useDeclarativeChallengeStore.getState().resumeChallenge();
    expect(useDeclarativeChallengeStore.getState().paused).toBe(false);
    expect(useUiStore.getState().challengePaused).toBe(false);
  });
});

describe('reset (plan §15)', () => {
  it('restores the starter and keeps the learner inside', async () => {
    await useDeclarativeChallengeStore.getState().start('push-button-doorbell');
    useCircuitStore.getState().addComponent({
      id: 'x',
      type: 'bulb',
      x: 0,
      y: 0,
      state: {},
    });
    useDeclarativeChallengeStore.getState().revealHint();

    useDeclarativeChallengeStore.getState().resetChallenge();

    expect(useCircuitStore.getState().components.length).toBe(0);
    expect(useDeclarativeChallengeStore.getState().status).toBe('active');
    expect(useDeclarativeChallengeStore.getState().hintsUsed).toBe(0);
    // The snapshot is untouched.
    expect(useDeclarativeChallengeStore.getState().returnCircuit?.components.length).toBe(2);
  });
});

describe('completion (plan §33, §34)', () => {
  it('records progress and keeps the normal circuit intact', async () => {
    await useDeclarativeChallengeStore.getState().start('protected-lamp');
    // Build the correct answer directly into the challenge canvas.
    const answer = correctProtectedLamp();
    useCircuitStore.getState().setCircuit(answer);

    const verdict = useDeclarativeChallengeStore.getState().check();
    expect(verdict?.state).toBe('complete');
    await flush();

    const progress = mem.get(__CHALLENGE2_PROGRESS_KEY) as Record<string, unknown>;
    expect(progress['protected-lamp']).toBeDefined();
    // The learner's normal circuit is still the snapshot.
    expect(useDeclarativeChallengeStore.getState().returnCircuit?.components[0]?.id).toBe(
      'my-live',
    );
  });
});

describe('reload resume (plan §14)', () => {
  it('rebuilds the active challenge and restores the in-progress build', async () => {
    const stopAutosave = withAutosave();
    try {
      await useDeclarativeChallengeStore.getState().start('protected-lamp');
      const attemptId = useDeclarativeChallengeStore.getState().attemptId!;
      useCircuitStore.getState().addComponent({
        id: 'resume-bulb',
        type: 'bulb',
        x: 10,
        y: 10,
        state: {},
      });
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Simulate reload: fresh store state, then resume.
      useDeclarativeChallengeStore.setState({
        status: 'idle',
        definition: null,
        verdict: null,
        attemptId: null,
        startedAt: null,
      });
      const resumed = await useDeclarativeChallengeStore.getState().resumeActive();

      expect(resumed).toBe(true);
      expect(useDeclarativeChallengeStore.getState().definition?.id).toBe('protected-lamp');
      expect(useCircuitStore.getState().components.some((c) => c.id === 'resume-bulb')).toBe(true);
      expect(useDeclarativeChallengeStore.getState().attemptId).toBe(attemptId);
    } finally {
      stopAutosave();
    }
  });

  it('return-from-reload restores the snapshot', async () => {
    await useDeclarativeChallengeStore.getState().start('protected-lamp');
    await useDeclarativeChallengeStore.getState().returnFromReload();
    expect(useCircuitStore.getState().components[0]?.id).toBe('my-live');
  });
});

/** The correct Protected Lamp answer, under learner ids. */
function correctProtectedLamp(): Circuit {
  let seq = 0;
  const comp = (type: string, x: number, y: number, state: Record<string, unknown> = {}) => ({
    id: `u${++seq}`,
    type,
    x,
    y,
    state,
  });
  const live = comp('live-terminal', 120, 150);
  const neutral = comp('neutral-terminal', 120, 300);
  const mcb = comp('mcb', 300, 150, { on: true });
  const sw = comp('single-way-switch', 480, 150, { on: true });
  const bulb = comp('bulb', 660, 150);
  const wire = (id: string, from: string, fromPort: number, to: string, toPort: number) => ({
    id,
    fromComponentId: from,
    fromPortIndex: fromPort,
    toComponentId: to,
    toPortIndex: toPort,
    controlPoints: [],
    pathKind: 'orthogonal' as const,
  });
  return {
    components: [live, neutral, mcb, sw, bulb],
    wires: [
      wire('uw1', live.id, 0, mcb.id, 0),
      wire('uw2', mcb.id, 1, sw.id, 0),
      wire('uw3', sw.id, 1, bulb.id, 0),
      wire('uw4', neutral.id, 0, bulb.id, 1),
    ],
    globalVoltage: 230,
  };
}
