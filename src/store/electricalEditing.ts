import type { Circuit } from '@electrasim/domain';
import type { SupplyProfile } from '@electrasim/domain/core/supplies';
import type { SupplyTarget } from '@electrasim/domain/core/supplyEditing';
import { create } from 'zustand';
import { useSimulatorAccess } from './simulatorAccess';
import { useUiStore } from './uiStore';

export type ElectricalEdit =
  | { kind: 'supply'; target: SupplyTarget; profile: SupplyProfile }
  | { kind: 'variant'; componentId: string; toType: string };

type EditRequest =
  | { id: number; kind: 'supply'; target: SupplyTarget; profile?: SupplyProfile }
  | { id: number; kind: 'variant'; componentId: string; toType: string };

interface EditingState {
  request: EditRequest | null;
  notice: { message: string; after: Circuit; historyEntry: unknown } | null;
  reviewOpen: boolean;
  inspectComponentId: string | null;
  activeSupply: SupplyTarget;
  showAll: boolean;
}

export const useElectricalEditing = create<EditingState>(() => ({
  request: null,
  notice: null,
  reviewOpen: false,
  inspectComponentId: null,
  activeSupply: { kind: 'document' },
  showAll: false,
}));
let nextRequest = 0;

export function configurationLockReason(): string | null {
  const ui = useUiStore.getState();
  if (ui.simRunning) return 'Stop the simulation to change electrical configuration.';
  if (ui.challengeAttemptId || ui.diagnosisActive || useSimulatorAccess.getState().exercise)
    return 'Supply and device configuration are locked during this exercise. End the attempt to edit in the sandbox.';
  return null;
}

export function useConfigurationLockReason(): string | null {
  useUiStore((s) => s.simRunning);
  useUiStore((s) => s.challengeAttemptId);
  useUiStore((s) => s.diagnosisActive);
  useSimulatorAccess((s) => s.exercise);
  return configurationLockReason();
}

export function editingAllowed(): boolean {
  const reason = configurationLockReason();
  if (reason) useUiStore.getState().showNoticeToast(reason);
  return !reason;
}

export function requestSupplyEdit(
  target: SupplyTarget = { kind: 'document' },
  profile?: SupplyProfile,
): void {
  if (!editingAllowed()) return;
  useElectricalEditing.setState({
    request: { id: ++nextRequest, kind: 'supply', target, profile },
  });
}

export function requestVariantEdit(componentId: string, toType: string): void {
  if (!editingAllowed()) return;
  useElectricalEditing.setState({
    request: { id: ++nextRequest, kind: 'variant', componentId, toType },
  });
}

export function closeElectricalEdit(): void {
  useElectricalEditing.setState({ request: null });
}

export function sameCircuitRevision(a: Circuit, b: Circuit): boolean {
  return (
    a.components === b.components &&
    a.wires === b.wires &&
    a.faults === b.faults &&
    a.supply === b.supply &&
    a.globalVoltage === b.globalVoltage
  );
}
