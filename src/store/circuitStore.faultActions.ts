/**
 * Fault & protection domain actions for the circuit store.
 *
 * Split verbatim from the former monolithic `circuitStore.ts` — these are
 * the same immer recipes, destructured into a mixin factory so the store
 * definition stays readable. No behaviour change: `set` is the identical
 * zustand+immer setter passed through from `create()`.
 */

import { createInjectedFault, isWireFaultType, validateFaultCoexistence } from '@electrasim/domain';
import type { CircuitState } from './circuitStore.types';
import { useUiStore } from './uiStore';

type CircuitSetState = (recipe: (state: CircuitState) => void) => void;

export const createFaultActions = (
  set: CircuitSetState,
): Pick<
  CircuitState,
  | 'injectFault'
  | 'removeFault'
  | 'toggleFault'
  | 'setComponentFault'
  | 'setWireFault'
  | 'clearAllFaults'
> => ({
  injectFault: (faultOrParams) => {
    let faultId = '';
    set((s) => {
      const fault =
        'category' in faultOrParams
          ? faultOrParams
          : createInjectedFault(faultOrParams.type, faultOrParams.target, faultOrParams.parameters);

      // Check coexistence
      const validation = validateFaultCoexistence(s.faults, fault);
      if (!validation.valid) {
        console.warn(`Cannot inject fault: ${validation.reason}`);
        return;
      }
      s.faults.push(fault);
      faultId = fault.id;

      // Sync legacy properties for backwards compatibility.
      // NOTE: TypeScript does not preserve property-access narrowing
      // inside `.find` closures — hoist the narrowed id into a local.
      if (fault.target.type === 'component') {
        const targetId = fault.target.id;
        const c = s.components.find((comp) => comp.id === targetId);
        if (c && !c.state.fault) c.state.fault = fault.type;
      } else if (fault.target.type === 'wire') {
        const targetId = fault.target.id;
        const w = s.wires.find((wire) => wire.id === targetId);
        if (w && !w.fault && isWireFaultType(fault.type)) {
          w.fault = fault.type;
        }
      }
      useUiStore.getState().setSimRunning(false);
    });
    return faultId;
  },

  removeFault: (faultId) =>
    set((s) => {
      const faultToRemove = s.faults.find((f) => f.id === faultId);
      s.faults = s.faults.filter((f) => f.id !== faultId);
      if (faultToRemove) {
        const target = faultToRemove.target;
        if (target.type === 'component') {
          const targetId = target.id;
          const c = s.components.find((comp) => comp.id === targetId);
          if (c && c.state.fault === faultToRemove.type) {
            c.state.fault = undefined;
          }
        } else if (target.type === 'wire') {
          const targetId = target.id;
          const w = s.wires.find((wire) => wire.id === targetId);
          if (w && w.fault === faultToRemove.type) {
            w.fault = undefined;
          }
        }
      }
    }),

  toggleFault: (type, target) =>
    set((s) => {
      const existingIndex = s.faults.findIndex(
        (f) =>
          f.type === type &&
          f.target.type === target.type &&
          ((f.target.type === 'component' &&
            target.type === 'component' &&
            f.target.id === target.id) ||
            (f.target.type === 'wire' && target.type === 'wire' && f.target.id === target.id) ||
            (f.target.type === 'port' &&
              target.type === 'port' &&
              f.target.componentId === target.componentId &&
              f.target.portIndex === target.portIndex)),
      );

      if (existingIndex >= 0) {
        const removed = s.faults[existingIndex];
        s.faults.splice(existingIndex, 1);
        const removedTarget = removed.target;
        if (removedTarget.type === 'component') {
          const targetId = removedTarget.id;
          const c = s.components.find((comp) => comp.id === targetId);
          if (c && c.state.fault === removed.type) c.state.fault = undefined;
        } else if (removedTarget.type === 'wire') {
          const targetId = removedTarget.id;
          const w = s.wires.find((wire) => wire.id === targetId);
          if (w && w.fault === removed.type) w.fault = undefined;
        }
      } else {
        const fault = createInjectedFault(type, target);
        const validation = validateFaultCoexistence(s.faults, fault);
        if (validation.valid) {
          s.faults.push(fault);
          if (target.type === 'component') {
            const targetId = target.id;
            const c = s.components.find((comp) => comp.id === targetId);
            if (c) c.state.fault = type;
          } else if (target.type === 'wire') {
            const targetId = target.id;
            const w = s.wires.find((wire) => wire.id === targetId);
            if (w && isWireFaultType(type)) {
              w.fault = type;
            }
          }
          useUiStore.getState().setSimRunning(false);
        }
      }
    }),

  setComponentFault: (id, fault) =>
    set((s) => {
      const c = s.components.find((c) => c.id === id);
      if (c) {
        c.state.fault = fault;
        s.faults = s.faults.filter((f) => !(f.target.type === 'component' && f.target.id === id));
        if (fault) {
          s.faults.push(createInjectedFault(fault, { type: 'component', id }));
          useUiStore.getState().setSimRunning(false);
        }
      }
    }),

  setWireFault: (id, fault) =>
    set((s) => {
      const w = s.wires.find((w) => w.id === id);
      if (w) {
        w.fault = fault;
        s.faults = s.faults.filter((f) => !(f.target.type === 'wire' && f.target.id === id));
        if (fault) {
          s.faults.push(createInjectedFault(fault, { type: 'wire', id }));
          useUiStore.getState().setSimRunning(false);
        }
      }
    }),

  clearAllFaults: () =>
    set((s) => {
      s.faults = [];
      for (const c of s.components) c.state.fault = undefined;
      for (const w of s.wires) w.fault = undefined;
    }),
});
