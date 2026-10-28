import { circuitRequirements } from '@electrasim/access/circuit';
import type { Circuit } from '@electrasim/domain/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizationFixture, policyFixture } from '../test/componentAccess';
import { clearHistory, useCircuitStore } from './circuitStore';
import {
  COMPONENT_POLICY_TTL_MS,
  authorizeCircuit,
  currentComponentPolicy,
  invalidateAccess,
  isCircuitReadOnly,
  receiptIsCurrent,
  refreshAccess,
  refreshComponentPolicy,
  requiredForEditor,
  startAccessLifecycle,
  useSimulatorAccess,
} from './simulatorAccess';

const basic: Circuit = {
  components: [{ id: 'lamp', type: 'bulb', x: 0, y: 0, state: {} }],
  wires: [],
};
const premium: Circuit = {
  ...basic,
  components: [...basic.components, { id: 'premium', type: 'afdd', x: 200, y: 0, state: {} }],
};
let revision = 0;
let policy = policyFixture();
let isOnline = true;
let visibility = 'visible';
let userId: string | undefined;
let capabilities: string[] = [];
let stop: (() => void) | undefined;
const fetcher = vi.fn();
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const flush = () => vi.advanceTimersByTimeAsync(0);
function deferred() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}
async function route(input: RequestInfo | URL, init?: RequestInit) {
  if (String(input).endsWith('/catalog/component-access')) return json(policy);
  if (String(input).endsWith('/me/membership'))
    return userId
      ? json({ userId, capabilities, nextChangeAt: null })
      : json({ error: 'Authentication required' }, 401);
  const { circuit } = JSON.parse(String(init?.body)) as { circuit: Circuit };
  const required = circuitRequirements(circuit, policy);
  return required.some((cap) => !capabilities.includes(cap))
    ? json({ error: 'Membership required' }, 403)
    : json(authorizationFixture(circuit, capabilities, policy, userId ?? null));
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-25T04:00:00Z'));
  revision += 10;
  policy = policyFixture(revision, ['afdd']);
  isOnline = true;
  visibility = 'visible';
  userId = undefined;
  capabilities = [];
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => isOnline);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
    () => visibility as DocumentVisibilityState,
  );
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockReset().mockImplementation(route);
  invalidateAccess();
  useSimulatorAccess.setState({ userId: null, message: null, pending: 0 });
  useCircuitStore.getState().setCircuit(basic);
  clearHistory();
});
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('component policy display lifecycle', () => {
  it('uses a complete fresh policy only for display and falls back exactly at 30 seconds', async () => {
    await refreshComponentPolicy();
    expect(requiredForEditor(premium)).toEqual([]);
    expect(isCircuitReadOnly(premium)).toBe(false);
    vi.advanceTimersByTime(COMPONENT_POLICY_TTL_MS - 1);
    expect(currentComponentPolicy()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(currentComponentPolicy()).toBeNull();
    expect(requiredForEditor(premium)).toEqual(['pro_components']);
    expect(requiredForEditor(basic)).toEqual([]);
  });
  it('fails closed when the local clock moves behind the receipt time', async () => {
    await refreshComponentPolicy();
    vi.setSystemTime(Date.now() - 1);
    expect(currentComponentPolicy()).toBeNull();
  });
  it.each(['schema', 'classification', 'basic-paywall', 'missing', 'duplicate', 'unknown'])(
    'rejects %s policy without changing the drawing',
    async (kind) => {
      await refreshComponentPolicy();
      const before = useCircuitStore.getState().components;
      const bad = JSON.parse(JSON.stringify(policy));
      if (kind === 'schema') bad.schemaVersion = 2;
      if (kind === 'classification') bad.classificationVersion = 2;
      if (kind === 'basic-paywall')
        bad.components.find((item: { id: string }) => item.id === 'bulb').access = 'pro';
      if (kind === 'missing') bad.components.pop();
      if (kind === 'duplicate') bad.components[0] = bad.components[1];
      if (kind === 'unknown') bad.components[0].id = 'unknown';
      fetcher.mockResolvedValue(json(bad));
      await refreshComponentPolicy();
      expect(currentComponentPolicy()).toBeNull();
      expect(requiredForEditor(premium)).toEqual(['pro_components']);
      expect(useCircuitStore.getState().components).toBe(before);
    },
  );
  it('does not accept a lower revision or different content under the same revision', async () => {
    await refreshComponentPolicy();
    fetcher.mockResolvedValue(json(policyFixture(revision - 1)));
    await refreshComponentPolicy();
    expect(currentComponentPolicy()).toBeNull();
    fetcher.mockResolvedValue(json(policyFixture(revision)));
    await refreshComponentPolicy();
    expect(currentComponentPolicy()).toBeNull();
  });
  it('drops an older public response after a newer revision has arrived', async () => {
    const old = deferred();
    const previous = policy;
    fetcher.mockReturnValueOnce(old.promise);
    const pending = refreshComponentPolicy();
    policy = policyFixture(++revision);
    await refreshComponentPolicy();
    old.resolve(json(previous));
    await pending;
    expect(currentComponentPolicy()?.revision).toBe(revision);
    expect(requiredForEditor(premium)).toEqual(['pro_components']);
  });
  it('does not restore an old public response after a newer read failed', async () => {
    const old = deferred();
    fetcher.mockReturnValueOnce(old.promise);
    const pending = refreshComponentPolicy();
    fetcher.mockRejectedValueOnce(new Error('unavailable'));
    await refreshComponentPolicy();
    old.resolve(json(policy));
    await pending;
    expect(currentComponentPolicy()).toBeNull();
  });
  it('keeps policy invalid after membership refresh when its own read fails', async () => {
    await refreshComponentPolicy();
    invalidateAccess();
    userId = 'ordinary';
    fetcher.mockImplementation((input, init) =>
      String(input).includes('/catalog/')
        ? Promise.resolve(json({ error: 'Storage unavailable' }, 503))
        : route(input, init),
    );
    await refreshAccess();
    expect(useSimulatorAccess.getState().userId).toBe('ordinary');
    expect(requiredForEditor(premium)).toEqual(['pro_components']);
  });
  it('discards policy reads from the previous account generation', async () => {
    const old = deferred();
    fetcher.mockReturnValueOnce(old.promise);
    const pending = refreshComponentPolicy();
    userId = 'new-account';
    policy = policyFixture(++revision);
    await refreshAccess();
    old.resolve(json(policyFixture(revision - 1, ['afdd'])));
    await pending;
    expect(useSimulatorAccess.getState().userId).toBe('new-account');
    expect(currentComponentPolicy()?.revision).toBe(revision);
  });
  it.each(['focus', 'visibilitychange', 'offline'])(
    'invalidates on %s and preserves the exact drawing',
    async (event) => {
      stop = startAccessLifecycle();
      await flush();
      useCircuitStore.getState().setCircuit(premium);
      const before = useCircuitStore.getState();
      expect(isCircuitReadOnly(before)).toBe(false);
      fetcher.mockImplementation(() => new Promise(() => {}));
      if (event === 'offline') isOnline = false;
      (event === 'visibilitychange' ? document : window).dispatchEvent(new Event(event));
      expect(isCircuitReadOnly(before)).toBe(true);
      expect(useCircuitStore.getState().components).toBe(before.components);
      expect(useCircuitStore.getState().wires).toBe(before.wires);
    },
  );
  it('expires while hidden without background revalidation and refreshes on visibility return', async () => {
    stop = startAccessLifecycle();
    await flush();
    visibility = 'hidden';
    fetcher.mockClear();
    await vi.advanceTimersByTimeAsync(COMPONENT_POLICY_TTL_MS);
    expect(fetcher).not.toHaveBeenCalled();
    expect(currentComponentPolicy()).toBeNull();
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(currentComponentPolicy()?.revision).toBe(revision);
  });
  it('revalidates while visible and restores editing without rewriting an original', async () => {
    stop = startAccessLifecycle();
    await flush();
    useCircuitStore.getState().setCircuit(premium);
    const before = useCircuitStore.getState().components;
    policy = policyFixture(++revision);
    await vi.advanceTimersByTimeAsync(COMPONENT_POLICY_TTL_MS);
    expect(isCircuitReadOnly(premium)).toBe(true);
    policy = policyFixture(++revision, ['afdd']);
    window.dispatchEvent(new Event('focus'));
    await flush();
    expect(isCircuitReadOnly(premium)).toBe(false);
    expect(useCircuitStore.getState().components).toBe(before);
  });
  it('restores originally-Pro requirements offline while Basic edits stay synchronous', async () => {
    await refreshComponentPolicy();
    isOnline = false;
    window.dispatchEvent(new Event('offline'));
    expect(isCircuitReadOnly(premium)).toBe(true);
    fetcher.mockClear();
    useCircuitStore.getState().moveComponent('lamp', 12, 34);
    expect(useCircuitStore.getState().components[0]!.x).toBe(12);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
describe('fresh originally-Pro actions', () => {
  it('contacts the server despite an empty displayed requirement and denies placement without consuming history', async () => {
    await refreshComponentPolicy();
    expect(requiredForEditor(premium)).toEqual([]);
    fetcher.mockResolvedValueOnce(json({ error: 'Changed to Pro' }, 403));
    useCircuitStore.getState().addComponent(premium.components[1]!);
    await flush();
    expect(
      fetcher.mock.calls.some(([input]) => String(input).endsWith('/simulator/authorize')),
    ).toBe(true);
    expect(useCircuitStore.getState().components).toHaveLength(1);
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(0);
  });
  it('authorizes both old Free and replacement Pro content even when the old requirements were empty', async () => {
    await refreshComponentPolicy();
    useCircuitStore.getState().setCircuit(premium);
    fetcher.mockClear();
    useCircuitStore
      .getState()
      .addComponent({ id: 'other', type: 'air-conditioner', x: 400, y: 0, state: {} });
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(useCircuitStore.getState().components).toHaveLength(2);
  });
  it('does not restore Free access from a delayed action after logout', async () => {
    const reply = deferred();
    fetcher.mockReturnValueOnce(reply.promise);
    const pending = authorizeCircuit(premium);
    invalidateAccess();
    useSimulatorAccess.setState({ userId: null });
    reply.resolve(json(authorizationFixture(premium, [], policy, null)));
    await expect(pending).rejects.toThrow('Session or access changed');
    expect(currentComponentPolicy()).toBeNull();
    expect(useSimulatorAccess.getState().capabilities).toEqual([]);
  });
  it('drops an older action when a policy downgrade arrives before its response', async () => {
    await refreshComponentPolicy();
    const reply = deferred();
    const old = policy;
    fetcher.mockReturnValueOnce(reply.promise);
    const pending = authorizeCircuit(premium);
    policy = policyFixture(++revision);
    await refreshComponentPolicy();
    reply.resolve(json(authorizationFixture(premium, [], old, null)));
    await expect(pending).rejects.toThrow('Session or access changed');
    expect(currentComponentPolicy()?.revision).toBe(revision);
    expect(isCircuitReadOnly(premium)).toBe(true);
  });
  it('rejects forged required/capability metadata and leaves policy unavailable', async () => {
    fetcher.mockResolvedValueOnce(
      json({
        ...authorizationFixture(premium, [], policy, null),
        required: ['advanced_faults'],
      }),
    );
    await expect(authorizeCircuit(premium)).rejects.toThrow('Invalid circuit authorization');
    expect(currentComponentPolicy()).toBeNull();
  });
  it('bounds a successful action receipt by policy freshness and invalidation', async () => {
    const receipt = await authorizeCircuit(premium);
    expect(useSimulatorAccess.getState().userId).toBeNull();
    expect(receiptIsCurrent(receipt)).toBe(true);
    vi.advanceTimersByTime(COMPONENT_POLICY_TTL_MS);
    expect(receiptIsCurrent(receipt)).toBe(false);
    const fresh = await authorizeCircuit(premium);
    invalidateAccess();
    expect(receiptIsCurrent(fresh)).toBe(false);
  });
});

it('rejects an edit when fresh authorization discovers a different signed-in account', async () => {
  useSimulatorAccess.setState({ userId: 'previous-account' });
  userId = 'new-account';
  await expect(authorizeCircuit(premium)).rejects.toThrow('Session or access changed');
  expect(useSimulatorAccess.getState().userId).toBe('new-account');
  expect(useSimulatorAccess.getState().capabilities).toEqual([]);
});
