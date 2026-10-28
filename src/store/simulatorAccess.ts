import {
  type Capability,
  type ValidatedComponentPolicy,
  componentAccess,
  hasOriginallyProComponents,
  isCapability,
  validateComponentPolicy,
} from '@electrasim/access';
import { circuitRequirements } from '@electrasim/access/circuit';
import type { Circuit } from '@electrasim/domain/types';
import { create } from 'zustand';

export class AccessError extends Error {}
export const COMPONENT_POLICY_TTL_MS = 30_000;
interface AccessState {
  userId: string | null;
  capabilities: Capability[];
  nextChangeAt: number | null;
  // Display policy has its own receipt time and is never an action credential.
  policy: ValidatedComponentPolicy | null;
  policyReceivedAt: number | null;
  revision: number;
  pending: number;
  message: string | null;
}
export const useSimulatorAccess = create<AccessState>(() => ({
  userId: null,
  capabilities: [],
  nextChangeAt: null,
  policy: null,
  policyReceivedAt: null,
  revision: 0,
  pending: 0,
  message: null,
}));
let sessionGeneration = 0;
let authorityGeneration = 0;
let membershipRequest = 0;
let policyRequest = 0;
// Retain the high-water mark across invalidation; an old response cannot restore a Free override.
let highestPolicyRevision = -1;
let highestPolicyContent = '';
export const accessGeneration = () => authorityGeneration;
const online = () => typeof navigator === 'undefined' || navigator.onLine;
export function invalidateAccess() {
  sessionGeneration++;
  authorityGeneration++;
  membershipRequest++;
  policyRequest++;
  useSimulatorAccess.setState((s) => ({
    capabilities: [],
    nextChangeAt: null,
    policy: null,
    policyReceivedAt: null,
    revision: s.revision + 1,
  }));
}
function invalidatePolicy() {
  authorityGeneration++;
  policyRequest++;
  useSimulatorAccess.setState((s) => ({
    policy: null,
    policyReceivedAt: null,
    revision: s.revision + 1,
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
  if (!response.ok)
    throw new AccessError(
      typeof data?.error === 'string' ? data.error : `Request failed (${response.status})`,
    );
  return data as T;
}
type MembershipSnapshot = { userId?: unknown; capabilities?: unknown; nextChangeAt?: unknown };
function membershipSnapshot(data: MembershipSnapshot) {
  if (
    !data ||
    !Array.isArray(data.capabilities) ||
    !data.capabilities.every((cap) => typeof cap === 'string' && isCapability(cap)) ||
    new Set(data.capabilities).size !== data.capabilities.length ||
    (data.userId !== undefined && (typeof data.userId !== 'string' || !data.userId)) ||
    (data.nextChangeAt !== null &&
      (!Number.isSafeInteger(data.nextChangeAt) || Number(data.nextChangeAt) < 0))
  )
    throw new AccessError('Invalid membership response');
  return {
    userId: (data.userId as string | undefined) ?? null,
    capabilities: data.capabilities as Capability[],
    nextChangeAt: data.nextChangeAt as number | null,
  };
}
function checkedPolicy(input: unknown) {
  const policy = validateComponentPolicy(input);
  const content = JSON.stringify(policy.components);
  if (
    policy.revision < 1 ||
    policy.revision < highestPolicyRevision ||
    (policy.revision === highestPolicyRevision && content !== highestPolicyContent)
  )
    throw new AccessError('Component policy changed; refresh access before retrying.');
  return { policy, content };
}
function applySnapshot(
  member?: ReturnType<typeof membershipSnapshot>,
  incoming?: ReturnType<typeof checkedPolicy>,
) {
  const prev = useSimulatorAccess.getState();
  const changedUser = member !== undefined && member.userId !== prev.userId;
  if (changedUser) {
    sessionGeneration++;
    membershipRequest++;
    policyRequest++;
  }
  const policy = incoming?.policy ?? (changedUser ? null : prev.policy);
  const changedPolicy = prev.policy
    ? policy?.revision !== prev.policy.revision
    : (policy?.components.some((item) => item.access !== componentAccess(item.id)) ?? false);
  const changed =
    changedUser ||
    changedPolicy ||
    (member !== undefined &&
      (JSON.stringify(member.capabilities) !== JSON.stringify(prev.capabilities) ||
        member.nextChangeAt !== prev.nextChangeAt));
  if (incoming) {
    highestPolicyRevision = incoming.policy.revision;
    highestPolicyContent = incoming.content;
  }
  if (changed) authorityGeneration++;
  useSimulatorAccess.setState({
    ...member,
    policy,
    policyReceivedAt: incoming ? Date.now() : changedUser ? null : prev.policyReceivedAt,
    revision: prev.revision + Number(changed),
  });
}
export function currentComponentPolicy(): ValidatedComponentPolicy | null {
  const { policy, policyReceivedAt } = useSimulatorAccess.getState();
  const age = policyReceivedAt === null ? Number.POSITIVE_INFINITY : Date.now() - policyReceivedAt;
  return online() && age >= 0 && age < COMPONENT_POLICY_TTL_MS ? policy : null;
}
export function componentAccessForEditor(id: string) {
  return componentAccess(id, currentComponentPolicy());
}
export async function refreshComponentPolicy() {
  const generation = sessionGeneration;
  const request = ++policyRequest;
  if (!online()) {
    invalidatePolicy();
    return;
  }
  try {
    const data = await apiJSON<unknown>('/catalog/component-access');
    if (generation !== sessionGeneration || request !== policyRequest) return;
    applySnapshot(undefined, checkedPolicy(data));
    accessMessage(null);
  } catch {
    if (generation === sessionGeneration && request === policyRequest) invalidatePolicy();
  }
}
/** Membership alone never reinstates a policy override; refresh both independent projections. */
export async function refreshAccess() {
  const generation = sessionGeneration;
  const request = ++membershipRequest;
  if (!online()) {
    invalidateAccess();
    return;
  }
  try {
    const data = await apiJSON<MembershipSnapshot>('/me/membership');
    if (generation !== sessionGeneration || request !== membershipRequest) return;
    if (typeof data.userId !== 'string') throw new AccessError('Invalid account response');
    applySnapshot(membershipSnapshot(data));
  } catch {
    if (generation !== sessionGeneration || request !== membershipRequest) return;
    applySnapshot({ userId: null, capabilities: [], nextChangeAt: null });
  }
  await refreshComponentPolicy();
}
export function canUseRequirements(required: readonly Capability[]): boolean {
  if (!required.length) return true;
  const access = useSimulatorAccess.getState();
  return (
    (access.nextChangeAt === null || Date.now() < access.nextChangeAt) &&
    required.every((key) => access.capabilities.includes(key)) &&
    online()
  );
}
/** Display only. Actual edits, saves and runs repeat server authorization. */
export function isCircuitReadOnly(circuit: Circuit) {
  try {
    return !canUseRequirements(requiredForEditor(circuit));
  } catch {
    return true;
  }
}
export function requiredForEditor(circuit: Circuit) {
  return circuitRequirements(circuit, currentComponentPolicy());
}
export function requiresServerAuthorization(circuit: Circuit) {
  // Original classification controls whether a fresh action check is needed, even while Free.
  return (
    hasOriginallyProComponents(circuit.components.map((item) => item.type)) ||
    circuitRequirements(circuit).length > 0
  );
}
export type AccessReceipt = {
  generation: number;
  policyRevision: number | null;
  expiresAt: number;
};
export function receiptIsCurrent(receipt: AccessReceipt) {
  return (
    receipt.generation === accessGeneration() &&
    Date.now() < receipt.expiresAt &&
    (receipt.policyRevision === null ||
      (online() && currentComponentPolicy()?.revision === receipt.policyRevision))
  );
}
export async function authorizeCircuit(circuit: Circuit): Promise<AccessReceipt> {
  if (!requiresServerAuthorization(circuit))
    return {
      generation: accessGeneration(),
      policyRevision: null,
      expiresAt: Number.POSITIVE_INFINITY,
    };
  const generation = sessionGeneration;
  const authority = authorityGeneration;
  // A new action supersedes older public display reads, which must not later restore a stale policy.
  policyRequest++;
  membershipRequest++;
  useSimulatorAccess.setState((s) => ({ pending: s.pending + 1 }));
  try {
    if (!online())
      throw new AccessError(
        'Access could not be verified offline. Basic offline use remains available.',
      );
    const data = await apiJSON<
      MembershipSnapshot & { policy: unknown; required: unknown; asOf: unknown }
    >('/simulator/authorize', 'POST', { circuit });
    if (generation !== sessionGeneration || authority !== authorityGeneration)
      throw new AccessError('Session or access changed; retry the action.');
    const incoming = checkedPolicy(data.policy);
    const member = membershipSnapshot(data);
    const required = circuitRequirements(circuit, incoming.policy);
    if (
      !Number.isSafeInteger(data.asOf) ||
      !Array.isArray(data.required) ||
      JSON.stringify([...data.required].sort()) !== JSON.stringify([...required].sort()) ||
      required.some((cap) => !member.capabilities.includes(cap)) ||
      (member.nextChangeAt !== null && member.nextChangeAt <= Date.now())
    )
      throw new AccessError('Invalid circuit authorization response');
    const previousUser = useSimulatorAccess.getState().userId;
    applySnapshot(member, incoming);
    if (previousUser !== null && previousUser !== member.userId)
      throw new AccessError('Session or access changed; retry the action.');
    accessMessage(null);
    return {
      generation: accessGeneration(),
      policyRevision: incoming.policy.revision,
      expiresAt: Math.min(
        Date.now() + COMPONENT_POLICY_TTL_MS,
        member.nextChangeAt ?? Number.POSITIVE_INFINITY,
      ),
    };
  } catch (error) {
    const message =
      error instanceof AccessError
        ? error.message
        : 'Access could not be verified. Basic offline use remains available.';
    if (generation === sessionGeneration) {
      if (authority === authorityGeneration) invalidateAccess();
      accessMessage(message);
    }
    throw new AccessError(message);
  } finally {
    useSimulatorAccess.setState((s) => ({ pending: Math.max(0, s.pending - 1) }));
  }
}
/** Both original and replacement content must be authorized at the same policy revision. */
export async function authorizeCircuitChange(
  before: Circuit,
  after: Circuit,
  canContinue: () => boolean = () => true,
): Promise<AccessReceipt> {
  const first = requiresServerAuthorization(before) ? await authorizeCircuit(before) : null;
  if (!canContinue()) {
    accessMessage('The circuit changed while checking access. Please retry the edit.');
    throw new AccessError('The circuit changed while checking access. Please retry the edit.');
  }
  const second = requiresServerAuthorization(after) ? await authorizeCircuit(after) : null;
  if (
    (first !== null && !receiptIsCurrent(first)) ||
    (second !== null && !receiptIsCurrent(second)) ||
    !canUseRequirements([...requiredForEditor(before), ...requiredForEditor(after)]) ||
    (first !== null &&
      second !== null &&
      first.policyRevision !== null &&
      second.policyRevision !== null &&
      first.policyRevision !== second.policyRevision)
  )
    throw new AccessError('Access changed while reviewing this edit. Please retry.');
  return (
    second ??
    first ?? {
      generation: accessGeneration(),
      policyRevision: null,
      expiresAt: Number.POSITIVE_INFINITY,
    }
  );
}
export function startAccessLifecycle() {
  const visible = () => document.visibilityState !== 'hidden';
  const refresh = () => {
    invalidateAccess();
    if (visible() && online()) void refreshAccess();
  };
  const visibility = () => {
    if (visible()) refresh();
  };
  window.addEventListener('focus', refresh);
  window.addEventListener('online', refresh);
  window.addEventListener('offline', invalidateAccess);
  document.addEventListener('visibilitychange', visibility);
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(expiry);
    const state = useSimulatorAccess.getState();
    const deadline = Math.min(
      state.nextChangeAt ?? Number.POSITIVE_INFINITY,
      state.policyReceivedAt === null
        ? Number.POSITIVE_INFINITY
        : state.policyReceivedAt + COMPONENT_POLICY_TTL_MS,
    );
    if (Number.isFinite(deadline))
      expiry = setTimeout(refresh, Math.min(2_147_483_647, Math.max(1, deadline - Date.now())));
  };
  const unsubscribe = useSimulatorAccess.subscribe(schedule);
  const timer = setInterval(() => {
    if (visible() && online()) refresh();
  }, COMPONENT_POLICY_TTL_MS);
  schedule();
  void refreshAccess();
  return () => {
    clearTimeout(expiry);
    clearInterval(timer);
    unsubscribe();
    window.removeEventListener('focus', refresh);
    window.removeEventListener('online', refresh);
    window.removeEventListener('offline', invalidateAccess);
    document.removeEventListener('visibilitychange', visibility);
  };
}
