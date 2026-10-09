import { damageCircuit } from '@electrasim/domain/core/damageFixtures';
import { simulate } from '@electrasim/domain/simulation';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MatterLayer } from './MatterLayer';

const physics = vi.hoisted(() => ({ dispose: vi.fn(), create: vi.fn() }));
vi.mock('./matterScene', () => ({
  createMatterScene: () => {
    physics.create();
    return { bodyCount: 1, step: () => [], dispose: physics.dispose };
  },
}));
afterEach(() => {
  vi.restoreAllMocks();
  physics.create.mockClear();
  physics.dispose.mockClear();
});

function props() {
  const circuit = damageCircuit('device-current');
  const simulation = simulate(circuit, { deltaSeconds: 2 });
  return {
    circuit,
    simulation,
    paths: new Map<string, string>(),
    pan: { x: 0, y: 0 },
    zoom: 1,
    enabled: true,
    animate: true,
  };
}

it('disposes on stop and unmount, and leaves a static damage marker', async () => {
  const p = props();
  const view = render(
    <svg role="img" aria-label="Effects test">
      <MatterLayer {...p} />
    </svg>,
  );
  await waitFor(() => expect(physics.create).toHaveBeenCalledOnce());
  view.rerender(
    <svg role="img" aria-label="Effects test">
      <MatterLayer {...p} animate={false} />
    </svg>,
  );
  expect(physics.dispose).toHaveBeenCalledOnce();
  expect(view.container.querySelector('[data-matter-layer]')).toHaveAttribute(
    'data-matter-status',
    'static',
  );
  expect(view.container.querySelector('[data-matter-effect="damage"]')).toBeTruthy();
  view.rerender(
    <svg role="img" aria-label="Effects test">
      <MatterLayer {...p} />
    </svg>,
  );
  await waitFor(() => expect(physics.create).toHaveBeenCalledTimes(2));
  view.unmount();
  expect(physics.dispose).toHaveBeenCalledTimes(2);
});

it('removes markers and physics when disabled or the device is replaced', async () => {
  const p = props();
  const view = render(
    <svg role="img" aria-label="Effects test">
      <MatterLayer {...p} />
    </svg>,
  );
  await waitFor(() => expect(physics.create).toHaveBeenCalledOnce());
  view.rerender(
    <svg role="img" aria-label="Effects test">
      <MatterLayer {...p} enabled={false} />
    </svg>,
  );
  expect(view.container.querySelector('[data-matter-effect]')).toBeNull();
  expect(physics.dispose).toHaveBeenCalledOnce();
  view.rerender(
    <svg role="img" aria-label="Effects test">
      <MatterLayer {...p} simulation={null} />
    </svg>,
  );
  expect(view.container.querySelector('[data-matter-effect]')).toBeNull();
});

it('suppresses stale evidence and sleeps when panned offscreen', async () => {
  const p = props();
  const view = render(
    <svg role="img" aria-label="Effects test">
      <MatterLayer {...p} simulation={{ ...p.simulation, inputRevision: 'stale' }} />
    </svg>,
  );
  expect(view.container.querySelector('[data-matter-effect]')).toBeNull();
  expect(physics.create).not.toHaveBeenCalled();
  view.rerender(
    <svg role="img" aria-label="Effects test">
      <MatterLayer {...p} />
    </svg>,
  );
  await waitFor(() => expect(physics.create).toHaveBeenCalledOnce());
  view.rerender(
    <svg role="img" aria-label="Effects test">
      <MatterLayer {...p} pan={{ x: -100000, y: 0 }} />
    </svg>,
  );
  expect(physics.dispose).toHaveBeenCalledOnce();
  expect(view.container.querySelector('[data-matter-effect]')).not.toBeVisible();
});

it('responds to an operating-system reduced-motion change without remounting', async () => {
  let listener: (() => void) | undefined;
  const media = {
    matches: false,
    addEventListener: (_event: string, callback: () => void) => {
      listener = callback;
    },
    removeEventListener: vi.fn(),
  };
  vi.spyOn(window, 'matchMedia').mockReturnValue(media as unknown as MediaQueryList);
  const p = props();
  const view = render(
    <svg role="img" aria-label="Effects test">
      <MatterLayer {...p} />
    </svg>,
  );
  await waitFor(() => expect(physics.create).toHaveBeenCalledOnce());
  act(() => {
    media.matches = true;
    listener?.();
  });
  expect(physics.dispose).toHaveBeenCalledOnce();
  expect(view.container.querySelector('[data-matter-layer]')).toHaveAttribute(
    'data-matter-status',
    'static',
  );
  expect(view.container.querySelector('[data-matter-effect="damage"]')).toBeTruthy();
});

it('disposes when the document becomes hidden', async () => {
  const p = props();
  const view = render(
    <svg role="img" aria-label="Effects test">
      <MatterLayer {...p} />
    </svg>,
  );
  await waitFor(() => expect(physics.create).toHaveBeenCalledOnce());
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(physics.dispose).toHaveBeenCalledOnce();
  expect(view.container.querySelector('[data-matter-layer]')).toHaveAttribute(
    'data-matter-bodies',
    '0',
  );
});
