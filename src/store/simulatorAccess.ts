import { type Capability, isCapability } from '@electrasim/access';
import { circuitRequirements } from '@electrasim/access/circuit';
import type { Circuit } from '@electrasim/domain/types';
import { create } from 'zustand';

export class AccessError extends Error {}
interface AccessState {
  exercise: { circuit: Circuit; mode: 'basic' | 'advanced' | 'ohmageddon' } | null;
  userId: string | null;
  capabilities: Capability[];
  nextChangeAt: number | null;
  revision: number;
  pending: number;
  message: string | null;
}
export const useSimulatorAccess = create<AccessState>(() => ({
  exercise: null,
  userId: null,
  capabilities: [],
  nextChangeAt: null,
  revision: 0,
  pending: 0,
  message: null,
}));
let sessionGeneration = 0;
export const accessGeneration = () => sessionGeneration;
export function invalidateAccess() {
  sessionGeneration++;
  useSimulatorAccess.setState((s) => ({
    capabilities: [],
    nextChangeAt: null,
    revision: s.revision + Number(s.capabilities.length > 0),
  }));
}
export function accessMessage(message: string | null) {
  useSimulatorAccess.setState({ message });
}
export async function apiJSON<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json();
  if (!response.ok) throw new AccessError(data.error || `Request failed (${response.status})`);
  return data as T;
}
function applySnapshot(data: {
  userId?: string;
  capabilities: unknown;
  nextChangeAt?: number | null;
}) {
  if (
    !Array.isArray(data.capabilities) ||
    !data.capabilities.every((c) => typeof c === 'string' && isCapability(c))
  )
    throw new AccessError('Invalid membership response');
  const prev = useSimulatorAccess.getState();
  const capabilities = data.capabilities as Capability[];
  const userId = data.userId ?? prev.userId;
  const changed =
    prev.userId !== userId ||
    JSON.stringify(prev.capabilities) !== JSON.stringify(capabilities) ||
    prev.nextChangeAt !== (data.nextChangeAt ?? null);
  useSimulatorAccess.setState({
    userId,
    capabilities,
    nextChangeAt: data.nextChangeAt ?? null,
    revision: prev.revision + Number(changed),
  });
}
export async function refreshAccess() {
  const generation = sessionGeneration;
  try {
    const data = await apiJSON<{
      userId: string;
      capabilities: Capability[];
      nextChangeAt: number | null;
    }>('/me/membership');
    if (generation === sessionGeneration) applySnapshot(data);
  } catch {
    if (generation === sessionGeneration)
      useSimulatorAccess.setState((s) => ({
        userId: null,
        capabilities: [],
        nextChangeAt: null,
        revision: s.revision + 1,
      }));
  }
}
export function canUseRequirements(required: readonly Capability[]): boolean {
  if (!required.length) return true;
  const access = useSimulatorAccess.getState();
  return (
    (access.nextChangeAt === null || Date.now() < access.nextChangeAt) &&
    required.every((key) => access.capabilities.includes(key)) &&
    (typeof navigator === 'undefined' || navigator.onLine)
  );
}
/** This snapshot is for UI state only. Every protected action still makes a fresh request. */
export function isCircuitReadOnly(circuit: Circuit) {
  try {
    return !canUseRequirements(requiredForEditor(circuit));
  } catch {
    return true;
  }
}
export function requiredForEditor(circuit: Circuit) {
  const exercise = useSimulatorAccess.getState().exercise;
  return [
    ...new Set([
      ...circuitRequirements(circuit),
      ...(exercise ? circuitRequirements(exercise.circuit, exercise.mode) : []),
    ]),
  ];
}
export async function authorizeCircuit(circuit: Circuit): Promise<void> {
  const exercise = useSimulatorAccess.getState().exercise;
  if (!requiredForEditor(circuit).length) return;
  const generation = sessionGeneration;
  useSimulatorAccess.setState((s) => ({ pending: s.pending + 1 }));
  try {
    let data = await apiJSON<{
      userId: string;
      capabilities: Capability[];
      nextChangeAt: number | null;
    }>('/simulator/authorize', 'POST', { circuit });
    if (generation !== sessionGeneration)
      throw new AccessError('Session changed; retry the action.');
    if (exercise && circuitRequirements(exercise.circuit, exercise.mode).length)
      data = await apiJSON('/simulator/authorize', 'POST', {
        circuit: exercise.circuit,
        diagnosis: exercise.mode,
      });
    if (generation !== sessionGeneration || exercise !== useSimulatorAccess.getState().exercise)
      throw new AccessError('Session changed; retry the action.');
    applySnapshot(data);
    accessMessage(null);
  } catch (error) {
    if (generation === sessionGeneration) invalidateAccess();
    const message =
      error instanceof AccessError
        ? error.message
        : 'Membership could not be verified. Basic offline use remains available.';
    accessMessage(message);
    throw new AccessError(message);
  } finally {
    useSimulatorAccess.setState((s) => ({ pending: Math.max(0, s.pending - 1) }));
  }
}
export function startAccessLifecycle() {
  const refresh = () => {
    invalidateAccess();
    void refreshAccess();
  };
  window.addEventListener('focus', refresh);
  window.addEventListener('online', refresh);
  window.addEventListener('offline', invalidateAccess);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = useSimulatorAccess.subscribe((state) => {
    clearTimeout(timer);
    if (state.nextChangeAt !== null)
      timer = setTimeout(
        refresh,
        Math.min(2_147_483_647, Math.max(1, state.nextChangeAt - Date.now())),
      );
  });
  void refreshAccess();
  return () => {
    clearTimeout(timer);
    unsubscribe();
    window.removeEventListener('focus', refresh);
    window.removeEventListener('online', refresh);
    window.removeEventListener('offline', invalidateAccess);
  };
}
