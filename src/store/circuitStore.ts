/**
 * circuitStore — the single source of truth for the live circuit graph and
 * selection state. Everything else (renderer, inspector, console) reads from
 * this store via narrow selectors so unrelated changes don't trigger
 * re-renders (PLAN.md §5).
 *
 * Undo/redo: wrapped in `zundo`'s `temporal` middleware. History is limited to
 * 100 partial graph states; Immer structurally shares unchanged objects across
 * those states instead of deep-cloning the whole store.
 *
 * NOT undoable (kept out of `partialize`): selection, transient drag offsets.
 * Undoing a selection click would be confusing UX.
 */

import { COMPONENT_DEFS, type ComponentInstance, type WireInstance } from '@electrasim/domain';
import { coilPortsFor, isCoilModel } from '@electrasim/domain/core/coilModel';
import { normalizeCircuitDocument, resolveComponentState } from '@electrasim/domain/core/normalize';
import {
  isSupplyProfile,
  resolveDocumentSupply,
  resolveSourceProfile,
  sameSupplyModel,
  sourceInterface,
  sourceProfileFitsInterface,
  withSupplyVoltage,
} from '@electrasim/domain/core/supplies';
import {
  previewSupplyChange,
  supplyTargetForComponent,
} from '@electrasim/domain/core/supplyEditing';
import { previewVariantChange } from '@electrasim/domain/core/variantEditing';
import { WIRE_AWG_MM2 } from '@electrasim/domain/core/wireProperties';
import { temporal } from 'zundo';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { guardedCircuitSet } from './circuitAccess';
import { createFaultActions } from './circuitStore.faultActions';
import { componentsForHistory } from './circuitStore.history';
import type { CircuitState } from './circuitStore.types';
import {
  configurationLockReason,
  editingAllowed,
  requestSupplyEdit,
  requestVariantEdit,
  sameCircuitRevision,
  useElectricalEditing,
} from './electricalEditing';
import { buildProSeedCircuit, buildSeedCircuit, buildStudentSeedCircuit } from './seed';
import { useUiStore } from './uiStore';

const seed = buildSeedCircuit();

/** Regional socket component types that the demo seed may use. */
const REGIONAL_SOCKET_TYPES = new Set([
  'socket-3pin',
  'socket-2pin',
  'socket-us',
  'socket-schuko',
  'socket-as3112',
  'socket-bs546',
]);

/** Compare the full drawing, including ratings, faults and wire properties,
 * before allowing display preferences to replace an untouched demo. */
function sameCircuitShape(
  a: { components: readonly ComponentInstance[]; wires: readonly WireInstance[] },
  b: { components: readonly ComponentInstance[]; wires: readonly WireInstance[] },
): boolean {
  if (a.components.length !== b.components.length || a.wires.length !== b.wires.length) {
    return false;
  }
  const stableKey = (value: unknown) =>
    JSON.stringify(value, (_key, item) =>
      item && typeof item === 'object' && !Array.isArray(item)
        ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
        : item,
    );
  const key = (c: ComponentInstance) =>
    stableKey({ ...c, state: resolveComponentState(c.state, COMPONENT_DEFS[c.type]) });
  const aComps = a.components.map(key).sort();
  const bComps = b.components.map(key).sort();
  for (let i = 0; i < aComps.length; i++) {
    if (aComps[i] !== bComps[i]) return false;
  }
  const wireKey = (w: WireInstance) => stableKey(w);
  const aWires = a.wires.map(wireKey).sort();
  const bWires = b.wires.map(wireKey).sort();
  for (let i = 0; i < aWires.length; i++) {
    if (aWires[i] !== bWires[i]) return false;
  }
  return true;
}

/** True while the canvas still holds one of the untouched demo seed circuits
 *  (default, Student or Pro variant) — used by flows like the tutorial that
 *  only want to protect a circuit the user actually built. */
export function isDemoSeedCircuit(state: {
  components: readonly ComponentInstance[];
  wires: readonly WireInstance[];
}): boolean {
  const currentSocket =
    state.components.find((c) => REGIONAL_SOCKET_TYPES.has(c.type))?.type ?? 'socket-3pin';
  const current = { components: state.components, wires: state.wires };
  return (
    sameCircuitShape(current, buildSeedCircuit(currentSocket)) ||
    sameCircuitShape(current, buildStudentSeedCircuit(currentSocket)) ||
    sameCircuitShape(current, buildProSeedCircuit(currentSocket))
  );
}

export const useCircuitStore = create<CircuitState>()(
  temporal(
    immer<CircuitState>((commit, get) => {
      const set = guardedCircuitSet(get, (state) => commit(state));
      return {
        components: seed.components,
        wires: seed.wires,
        globalVoltage: 230,
        supply: resolveDocumentSupply({ globalVoltage: 230 }),
        faults: [],
        selectedComponentId: null,
        selectedWireIds: [],
        selectedComponentIds: [],
        componentGroups: [],

        setCircuit: (circuit) =>
          commit((s) => {
            // Authored exercises may intentionally supply a held contact. File/backup
            // adapters release momentary inputs before calling this in-memory boundary.
            const normalized = normalizeCircuitDocument(circuit, false);
            s.componentGroups = [];
            s.components = normalized.components;
            s.wires = normalized.wires;
            s.faults = normalized.faults ? [...normalized.faults] : [];
            s.supply = normalized.supply;
            const nextVoltage = normalized.supply?.model.voltage ?? circuit.globalVoltage ?? 230;
            s.globalVoltage = Number.isFinite(nextVoltage) && nextVoltage > 0 ? nextVoltage : 230;
            s.selectedComponentId = null;
            s.selectedComponentIds = [];
            s.selectedWireIds = [];
          }),

        swapDemoSocketForPlug: (socketType) =>
          set(
            (s) => {
              if (
                s.faults.length ||
                !sameSupplyModel(resolveDocumentSupply(s).model, resolveDocumentSupply({}).model)
              )
                return;
              // Only swap when the circuit is still an untouched demo seed
              // (either the Student or the Pro variant), so a user who has
              // built their own circuit is never silently rewritten. The
              // reference is built with the circuit's current socket so that
              // repeated plug changes keep working.
              const currentSocket =
                s.components.find((c) => REGIONAL_SOCKET_TYPES.has(c.type))?.type ?? 'socket-3pin';
              const current = { components: s.components, wires: s.wires };
              const builder = sameCircuitShape(current, buildStudentSeedCircuit(currentSocket))
                ? buildStudentSeedCircuit
                : sameCircuitShape(current, buildProSeedCircuit(currentSocket))
                  ? buildProSeedCircuit
                  : null;
              if (!builder) return;
              const next = builder(socketType);
              s.components = next.components;
              s.wires = next.wires;
            },
            () => !configurationLockReason(),
          ),

        swapDemoForMode: (mode) =>
          set(
            (s) => {
              if (
                s.faults.length ||
                !sameSupplyModel(resolveDocumentSupply(s).model, resolveDocumentSupply({}).model)
              )
                return;
              // Mode switch keeps each audience on its own demo bench — but only
              // while the canvas is still an untouched demo seed. A user's own
              // circuit is never rewritten.
              const currentSocket =
                s.components.find((c) => REGIONAL_SOCKET_TYPES.has(c.type))?.type ?? 'socket-3pin';
              const current = { components: s.components, wires: s.wires };
              const isStudentDemo = sameCircuitShape(
                current,
                buildStudentSeedCircuit(currentSocket),
              );
              const isProDemo =
                !isStudentDemo && sameCircuitShape(current, buildProSeedCircuit(currentSocket));
              if (!isStudentDemo && !isProDemo) return;
              const next =
                mode === 'pro'
                  ? buildProSeedCircuit(currentSocket)
                  : buildStudentSeedCircuit(currentSocket);
              s.components = next.components;
              s.wires = next.wires;
              s.faults = [];
              s.selectedComponentId = null;
              s.selectedComponentIds = [];
              s.selectedWireIds = [];
            },
            () => !configurationLockReason(),
          ),

        setGlobalSupplyVoltage: (voltage) => {
          if (!Number.isFinite(voltage) || voltage < 0.001 || voltage > 100_000) return;
          const profile = withSupplyVoltage(resolveDocumentSupply(get()), voltage);
          if (previewSupplyChange(get(), { kind: 'document' }, profile).status === 'unchanged')
            return;
          requestSupplyEdit({ kind: 'document' }, profile);
        },

        applyElectricalEdit: (edit, expected, requestId) => {
          if (!sameCircuitRevision(expected, get()) || !editingAllowed()) return false;
          const preview =
            edit.kind === 'supply'
              ? previewSupplyChange(get(), edit.target, edit.profile)
              : previewVariantChange(get(), edit.componentId, edit.toType);
          if (preview.status !== 'ready') return false;
          return set(
            (s) => {
              s.components = preview.circuit.components;
              s.wires = preview.circuit.wires;
              s.faults = preview.circuit.faults ?? [];
              s.supply = preview.circuit.supply;
              s.globalVoltage = preview.circuit.globalVoltage ?? s.globalVoltage;
            },
            () =>
              sameCircuitRevision(expected, get()) &&
              editingAllowed() &&
              (requestId === undefined ||
                useElectricalEditing.getState().request?.id === requestId),
          );
        },

        addComponent: (comp) =>
          set((s) => {
            s.components.push(comp);
          }),

        removeComponent: (id) =>
          set((s) => {
            if (useUiStore.getState().simRunning) return;
            s.components = s.components.filter((c) => c.id !== id);
            const removedWireIds = new Set<string>();
            s.wires = s.wires.filter((w) => {
              if (w.fromComponentId === id || w.toComponentId === id) {
                removedWireIds.add(w.id);
                return false;
              }
              return true;
            });
            s.faults = s.faults.filter(
              (f) =>
                !(f.target.type === 'component' && f.target.id === id) &&
                !(f.target.type === 'port' && f.target.componentId === id) &&
                !(f.target.type === 'wire' && removedWireIds.has(f.target.id)),
            );
            s.selectedComponentIds = s.selectedComponentIds.filter(
              (selectedId) => selectedId !== id,
            );
            if (s.selectedComponentId === id) {
              s.selectedComponentId = s.selectedComponentIds[0] ?? null;
            }
          }),

        moveComponent: (id, x, y) =>
          set((s) => {
            const c = s.components.find((c) => c.id === id);
            if (c) {
              c.x = x;
              c.y = y;
            }
          }),

        toggleSwitch: (id) =>
          set((s) => {
            const c = s.components.find((c) => c.id === id);
            if (!c) return;
            const def = COMPONENT_DEFS[c.type];
            if (!def?.isSwitch || def.isMomentary) return;
            c.state.on = !c.state.on;
          }),

        setSwitchState: (id, on) =>
          set((s) => {
            const c = s.components.find((component) => component.id === id);
            if (!c || !COMPONENT_DEFS[c.type]?.isSwitch || c.state.on === on) return;
            c.state.on = on;
          }),

        addWire: (wire) =>
          set((s) => {
            s.wires.push(wire);
          }),

        applyGraphChanges: ({ addComponents = [], addWires = [], removeWireIds = [] }) =>
          set((s) => {
            const removedWireIds = new Set(removeWireIds);
            if (removedWireIds.size > 0) {
              s.wires = s.wires.filter((wire) => !removedWireIds.has(wire.id));
              s.selectedWireIds = s.selectedWireIds.filter((id) => !removedWireIds.has(id));
            }

            const componentIds = new Set(s.components.map((component) => component.id));
            for (const component of addComponents) {
              if (componentIds.has(component.id) || !COMPONENT_DEFS[component.type]) continue;
              s.components.push(component);
              componentIds.add(component.id);
            }

            const wireIds = new Set(s.wires.map((wire) => wire.id));
            for (const wire of addWires) {
              if (wireIds.has(wire.id)) continue;
              const fromComponent = s.components.find(
                (component) => component.id === wire.fromComponentId,
              );
              const toComponent = s.components.find(
                (component) => component.id === wire.toComponentId,
              );
              const fromPort = fromComponent
                ? COMPONENT_DEFS[fromComponent.type]?.ports[wire.fromPortIndex]
                : undefined;
              const toPort = toComponent
                ? COMPONENT_DEFS[toComponent.type]?.ports[wire.toPortIndex]
                : undefined;
              if (!fromPort || !toPort || fromPort.type !== toPort.type) continue;
              s.wires.push(wire);
              wireIds.add(wire.id);
            }
          }),

        removeWire: (id) =>
          set((s) => {
            if (useUiStore.getState().simRunning) return;
            s.wires = s.wires.filter((w) => w.id !== id);
            s.faults = s.faults.filter((f) => !(f.target.type === 'wire' && f.target.id === id));
            s.selectedWireIds = s.selectedWireIds.filter((wid) => wid !== id);
          }),

        clearAllWires: () =>
          set((s) => {
            if (useUiStore.getState().simRunning) return;
            s.wires = [];
            s.faults = s.faults.filter((f) => f.target.type !== 'wire');
            s.selectedWireIds = [];
          }),

        clearAllComponents: () =>
          set((s) => {
            if (useUiStore.getState().simRunning) return;
            s.components = [];
            s.wires = [];
            s.faults = [];
            s.selectedComponentId = null;
            s.selectedWireIds = [];
            s.selectedComponentIds = [];
          }),

        setComponentPositions: (updates) =>
          set((s) => {
            for (const { id, x, y } of updates) {
              const c = s.components.find((c) => c.id === id);
              if (c) {
                c.x = x;
                c.y = y;
              }
            }
          }),

        moveComponents: (ids, dx, dy) =>
          set((s) => {
            for (const id of ids) {
              const c = s.components.find((c) => c.id === id);
              if (c) {
                c.x += dx;
                c.y += dy;
              }
            }
          }),

        removeComponents: (componentIds) =>
          set((s) => {
            if (useUiStore.getState().simRunning) return;
            const ids = new Set(componentIds);
            if (ids.size === 0) return;
            s.components = s.components.filter((component) => !ids.has(component.id));
            const removedWireIds = new Set<string>();
            s.wires = s.wires.filter((wire) => {
              if (ids.has(wire.fromComponentId) || ids.has(wire.toComponentId)) {
                removedWireIds.add(wire.id);
                return false;
              }
              return true;
            });
            s.faults = s.faults.filter(
              (f) =>
                !(f.target.type === 'component' && ids.has(f.target.id)) &&
                !(f.target.type === 'port' && ids.has(f.target.componentId)) &&
                !(f.target.type === 'wire' && removedWireIds.has(f.target.id)),
            );
            const remainingWireIds = new Set(s.wires.map((wire) => wire.id));
            s.selectedWireIds = s.selectedWireIds.filter((id) => remainingWireIds.has(id));
            s.selectedComponentIds = s.selectedComponentIds.filter((id) => !ids.has(id));
            if (s.selectedComponentId && ids.has(s.selectedComponentId)) {
              s.selectedComponentId = s.selectedComponentIds[0] ?? null;
            }
          }),

        removeSelectedComponents: () =>
          set((s) => {
            if (useUiStore.getState().simRunning) return;
            const ids = new Set(s.selectedComponentIds);
            if (s.selectedComponentId) ids.add(s.selectedComponentId);
            if (ids.size === 0) return;
            s.components = s.components.filter((c) => !ids.has(c.id));
            const removedWireIds = new Set<string>();
            s.wires = s.wires.filter((w) => {
              if (ids.has(w.fromComponentId) || ids.has(w.toComponentId)) {
                removedWireIds.add(w.id);
                return false;
              }
              return true;
            });
            s.faults = s.faults.filter(
              (f) =>
                !(f.target.type === 'component' && ids.has(f.target.id)) &&
                !(f.target.type === 'port' && ids.has(f.target.componentId)) &&
                !(f.target.type === 'wire' && removedWireIds.has(f.target.id)),
            );
            s.selectedComponentId = null;
            s.selectedComponentIds = [];
            s.selectedWireIds = [];
          }),

        removeSelected: () =>
          set((s) => {
            if (useUiStore.getState().simRunning) return;
            const compIds = new Set(s.selectedComponentIds);
            if (s.selectedComponentId) compIds.add(s.selectedComponentId);
            const wireIds = new Set(s.selectedWireIds);

            if (compIds.size === 0 && wireIds.size === 0) return;

            s.components = s.components.filter((c) => !compIds.has(c.id));
            const removedWireIds = new Set<string>(wireIds);
            s.wires = s.wires.filter((w) => {
              if (
                wireIds.has(w.id) ||
                compIds.has(w.fromComponentId) ||
                compIds.has(w.toComponentId)
              ) {
                removedWireIds.add(w.id);
                return false;
              }
              return true;
            });
            s.faults = s.faults.filter(
              (f) =>
                !(f.target.type === 'component' && compIds.has(f.target.id)) &&
                !(f.target.type === 'port' && compIds.has(f.target.componentId)) &&
                !(f.target.type === 'wire' && removedWireIds.has(f.target.id)),
            );
            s.selectedComponentId = null;
            s.selectedComponentIds = [];
            s.selectedWireIds = [];
          }),

        rotateComponent: (id, deltaDegrees = 90) =>
          set((s) => {
            const comp = s.components.find((c) => c.id === id);
            if (comp) {
              comp.rotation = ((comp.rotation ?? 0) + deltaDegrees + 360) % 360;
            }
          }),

        rotateSelected: (deltaDegrees = 90) =>
          set((s) => {
            const targetIds =
              s.selectedComponentIds.length > 0
                ? s.selectedComponentIds
                : s.selectedComponentId
                  ? [s.selectedComponentId]
                  : [];
            for (const id of targetIds) {
              const comp = s.components.find((c) => c.id === id);
              if (comp) {
                comp.rotation = ((comp.rotation ?? 0) + deltaDegrees + 360) % 360;
              }
            }
          }),

        autoLabelAllComponents: () =>
          set((s) => {
            const prefixCounts: Record<string, number> = {};
            const getPrefix = (type: string): string => {
              if (type.includes('switch') || type.includes('button')) return 'S';
              if (
                type.includes('bulb') ||
                type.includes('light') ||
                type.includes('lamp') ||
                type.includes('led') ||
                type.includes('cfl') ||
                type.includes('halogen')
              )
                return 'L';
              if (
                type.includes('mcb') ||
                type.includes('breaker') ||
                type.includes('fuse') ||
                type.includes('rcbo') ||
                type.includes('rcd')
              )
                return 'CB';
              if (type.includes('socket')) return 'SK';
              if (type.includes('motor') || type.includes('fan')) return 'M';
              if (type.includes('battery') || type.includes('source') || type.includes('terminal'))
                return 'PWR';
              if (type.includes('junction') || type.includes('wago') || type.includes('strip'))
                return 'J';
              if (type.includes('meter') || type.includes('gauge')) return 'MTR';
              return 'U';
            };

            for (const comp of s.components) {
              const prefix = getPrefix(comp.type);
              prefixCounts[prefix] = (prefixCounts[prefix] ?? 0) + 1;
              comp.state.autoLabel = `${prefix}${prefixCounts[prefix]}`;
            }
          }),

        // Reroute returns false when validation fails (unknown wire, unknown
        // component/port, or a port-type mismatch). The store only mutates on
        // success so the UI can keep the in-progress drag visually intact and
        // surface a log entry from the caller.
        rerouteWire: (id, end, target) => {
          let ok = false;
          const applied = set((s) => {
            const wire = s.wires.find((w) => w.id === id);
            if (!wire) return;
            const otherEnd = end === 'from' ? wire.toComponentId : wire.fromComponentId;
            const otherPortIdx = end === 'from' ? wire.toPortIndex : wire.fromPortIndex;
            if (target.componentId === otherEnd && target.portIndex === otherPortIdx) {
              return; // would create a zero-length wire
            }
            if (target.componentId === otherEnd) {
              return; // self-loop; both ends on the same component
            }
            const targetComp = s.components.find((c) => c.id === target.componentId);
            if (!targetComp) return;
            const targetDef = COMPONENT_DEFS[targetComp.type];
            const targetPort = targetDef?.ports[target.portIndex];
            const otherComp = s.components.find((c) => c.id === otherEnd);
            const otherDef = otherComp ? COMPONENT_DEFS[otherComp.type] : undefined;
            const otherPort = otherDef?.ports[otherPortIdx];
            if (!targetPort || !otherPort) return;
            if (targetPort.type !== otherPort.type) return;

            if (end === 'from') {
              wire.fromComponentId = target.componentId;
              wire.fromPortIndex = target.portIndex;
            } else {
              wire.toComponentId = target.componentId;
              wire.toPortIndex = target.portIndex;
            }
            // Clear any stale control points; reroute invalidates the curve.
            wire.controlPoints = [];
            ok = true;
          });
          return applied instanceof Promise
            ? applied.then((committed) => committed && ok)
            : applied && ok;
        },

        selectComponent: (id) =>
          set((s) => {
            s.selectedComponentId = id;
            s.selectedComponentIds = id ? [id] : [];
            s.selectedWireIds = [];
          }),

        selectWire: (id) =>
          set((s) => {
            s.selectedWireIds = id ? [id] : [];
            s.selectedComponentId = null;
            s.selectedComponentIds = [];
          }),

        toggleWireSelection: (id) =>
          set((s) => {
            const i = s.selectedWireIds.indexOf(id);
            if (i >= 0) s.selectedWireIds.splice(i, 1);
            else s.selectedWireIds.push(id);
            s.selectedComponentId = null;
            s.selectedComponentIds = [];
          }),

        clearSelection: () =>
          set((s) => {
            s.selectedComponentId = null;
            s.selectedComponentIds = [];
            s.selectedWireIds = [];
          }),

        toggleComponentSelection: (id) =>
          set((s) => {
            const i = s.selectedComponentIds.indexOf(id);
            if (i >= 0) {
              s.selectedComponentIds.splice(i, 1);
              if (s.selectedComponentId === id) {
                s.selectedComponentId = s.selectedComponentIds[0] ?? null;
              }
            } else {
              s.selectedComponentIds.push(id);
              s.selectedComponentId = id; // last clicked = primary
            }
            s.selectedWireIds = [];
          }),

        setMultiSelection: (ids) =>
          set((s) => {
            s.selectedComponentIds = ids;
            s.selectedComponentId = ids[ids.length - 1] ?? null;
            s.selectedWireIds = [];
          }),

        ...createFaultActions(set),

        updateComponentState: (id, updates) => {
          const component = get().components.find((c) => c.id === id);
          if (!component) return;
          const source = sourceInterface(component.type);
          if (
            Object.hasOwn(updates, 'sourceProfile') ||
            (source && Object.hasOwn(updates, 'customVoltage'))
          ) {
            if (!editingAllowed()) return;
            const previous = resolveSourceProfile(component.type, component.state, get());
            const profile =
              updates.sourceProfile ??
              (previous && updates.customVoltage !== undefined
                ? withSupplyVoltage(previous, updates.customVoltage)
                : previous);
            const target = supplyTargetForComponent(get(), id);
            if (
              !profile ||
              !target ||
              !isSupplyProfile(profile) ||
              !sourceProfileFitsInterface(component.type, profile) ||
              (updates.sourceProfile &&
                updates.customVoltage !== undefined &&
                updates.customVoltage !== profile.model.voltage)
            )
              return;
            if (previous && sameSupplyModel(previous.model, profile.model)) return;
            requestSupplyEdit(target, profile);
            return;
          }
          const runtimeOnly = Object.keys(updates).every(
            (key) =>
              (key === 'on' && COMPONENT_DEFS[component.type]?.isSwitch) ||
              (key === 'speed' && COMPONENT_DEFS[component.type]?.isDimmer),
          );
          if (!runtimeOnly && !editingAllowed()) return;
          if (
            updates.coilModel !== undefined &&
            (!isCoilModel(updates.coilModel) ||
              !coilPortsFor(component.type, COMPONENT_DEFS[component.type]))
          )
            return;
          for (const key of [
            'customVoltage',
            'customPowerWatts',
            'customMaxAmps',
            'customMaxVolts',
            'customCableMm2',
          ] as const) {
            const value = updates[key];
            if (value !== undefined && (!Number.isFinite(value) || value <= 0 || value > 100_000))
              return;
          }
          return set(
            (s) => {
              const c = s.components.find((comp) => comp.id === id);
              if (c) c.state = { ...c.state, ...updates };
            },
            () => runtimeOnly || editingAllowed(),
          );
        },

        updateComponentType: (id, newType) => {
          if (
            get().components.find((c) => c.id === id)?.type === newType ||
            !COMPONENT_DEFS[newType]
          )
            return;
          requestVariantEdit(id, newType);
        },

        repairBlownComponent: (id) =>
          set((s) => {
            const c = s.components.find((comp) => comp.id === id);
            if (c) {
              c.state.isBlown = false;
              c.state.blownReason = undefined;
            }
          }),

        repairAllBlownComponents: () =>
          set((s) => {
            for (const c of s.components) {
              c.state.isBlown = false;
              c.state.blownReason = undefined;
            }
          }),

        repairAllFaults: () =>
          set((s) => {
            for (const c of s.components) {
              c.state.isBlown = false;
              c.state.blownReason = undefined;
            }
            for (const w of s.wires) {
              w.isBusted = false;
              w.bustedReason = undefined;
              if (w.fault === 'open-circuit') w.fault = undefined;
            }
          }),

        setWireBusted: (id, isBusted, reason) =>
          set((s) => {
            const w = s.wires.find((item) => item.id === id);
            if (w) {
              w.isBusted = isBusted;
              w.bustedReason = reason;
            }
          }),

        updateWireProperties: (id, updates) =>
          set((s) => {
            const w = s.wires.find((item) => item.id === id);
            if (!w) return;

            if ('controlPoints' in updates && Array.isArray(updates.controlPoints)) {
              const validPoints = updates.controlPoints.filter(
                (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
              );
              if (validPoints.length === updates.controlPoints.length) {
                w.controlPoints = validPoints.map((point) => ({ ...point }));
              }
            }
            if (updates.pathKind === 'bezier' || updates.pathKind === 'orthogonal') {
              w.pathKind = updates.pathKind;
            }
            if (
              'lengthMeters' in updates &&
              (updates.lengthMeters === undefined ||
                (Number.isFinite(updates.lengthMeters) && updates.lengthMeters > 0))
            ) {
              w.lengthMeters = updates.lengthMeters;
            }
            if (
              'deratingFactor' in updates &&
              (updates.deratingFactor === undefined ||
                (Number.isFinite(updates.deratingFactor) &&
                  updates.deratingFactor >= 0.1 &&
                  updates.deratingFactor <= 1))
            ) {
              w.deratingFactor = updates.deratingFactor;
            }
            if (
              'customCableMm2' in updates &&
              (updates.customCableMm2 === undefined ||
                (Number.isFinite(updates.customCableMm2) && updates.customCableMm2 > 0))
            ) {
              w.customCableMm2 = updates.customCableMm2;
              // A metric edit replaces the physical area; never retain a stale AWG label.
              if (w.gauge !== undefined && WIRE_AWG_MM2[w.gauge] !== updates.customCableMm2)
                w.gauge = undefined;
            }
            if (
              'installationMethod' in updates &&
              (updates.installationMethod === undefined ||
                updates.installationMethod === 'C' ||
                updates.installationMethod === 'B1' ||
                updates.installationMethod === 'A')
            ) {
              w.installationMethod = updates.installationMethod;
            }
            if (updates.material === 'copper' || updates.material === 'aluminum') {
              w.material = updates.material;
            }
            if (
              'gauge' in updates &&
              (updates.gauge === undefined || Object.hasOwn(WIRE_AWG_MM2, updates.gauge))
            ) {
              if (updates.gauge === undefined) {
                w.gauge = undefined;
              } else {
                const area = WIRE_AWG_MM2[updates.gauge]!;
                // Explicit metric size has the same priority as the domain resolver.
                if (updates.customCableMm2 !== undefined && w.customCableMm2 !== area) {
                  w.gauge = undefined;
                } else {
                  w.gauge = updates.gauge;
                  w.customCableMm2 = area;
                }
              }
            }
          }),

        swapWireEndpoints: (id) =>
          set((s) => {
            const w = s.wires.find((item) => item.id === id);
            if (w) {
              const tempComp = w.fromComponentId;
              const tempPort = w.fromPortIndex;
              w.fromComponentId = w.toComponentId;
              w.fromPortIndex = w.toPortIndex;
              w.toComponentId = tempComp;
              w.toPortIndex = tempPort;
              if (w.controlPoints && w.controlPoints.length > 0) {
                w.controlPoints = [...w.controlPoints].reverse();
              }
            }
          }),

        resetTrippedComponent: (id) =>
          set((s) => {
            const c = s.components.find((comp) => comp.id === id);
            if (c) {
              c.state.isTripped = false;
              c.state.tripReason = undefined;
            }
          }),

        resetAllTrippedComponents: () =>
          set((s) => {
            for (const c of s.components) {
              c.state.isTripped = false;
              c.state.tripReason = undefined;
            }
          }),

        pasteComponents: (items, offset) =>
          set((s) => {
            const newIds: string[] = [];
            for (const src of items) {
              const newId = `${src.type.split('-')[0]}-paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              s.components.push({
                ...src,
                id: newId,
                x: src.x + offset.x,
                y: src.y + offset.y,
                state: COMPONENT_DEFS[src.type]?.isMomentary
                  ? { ...src.state, on: false }
                  : { ...src.state },
              });
              newIds.push(newId);
            }
            // Select pasted group so the user can immediately drag/delete them.
            s.selectedComponentIds = newIds;
            s.selectedComponentId = newIds[newIds.length - 1] ?? null;
            s.selectedWireIds = [];
          }),

        // Component Grouping Implementation
        createGroup: (name, componentIds) =>
          set((s) => {
            if (componentIds.length === 0) return;
            const components = s.components.filter((c) => componentIds.includes(c.id));
            if (components.length === 0) return;

            const avgX = components.reduce((sum, c) => sum + c.x, 0) / components.length;
            const avgY = components.reduce((sum, c) => sum + c.y, 0) / components.length;

            const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            s.componentGroups.push({
              id: groupId,
              name: name || `Group ${s.componentGroups.length + 1}`,
              componentIds: [...componentIds],
              position: { x: avgX, y: avgY },
            });
          }),

        ungroup: (groupId) =>
          set((s) => {
            const index = s.componentGroups.findIndex((g) => g.id === groupId);
            if (index >= 0) {
              s.componentGroups.splice(index, 1);
            }
          }),

        moveGroup: (groupId, dx, dy) =>
          set((s) => {
            const group = s.componentGroups.find((g) => g.id === groupId);
            if (!group) return;

            group.position.x += dx;
            group.position.y += dy;

            for (const compId of group.componentIds) {
              const comp = s.components.find((c) => c.id === compId);
              if (comp) {
                comp.x += dx;
                comp.y += dy;
              }
            }
          }),

        deleteGroup: (groupId, deleteComponents) =>
          set((s) => {
            const groupIndex = s.componentGroups.findIndex((g) => g.id === groupId);
            if (groupIndex < 0) return;

            const group = s.componentGroups[groupIndex];
            s.componentGroups.splice(groupIndex, 1);

            if (deleteComponents) {
              const idsToDelete = new Set(group.componentIds);
              s.components = s.components.filter((c) => !idsToDelete.has(c.id));
              s.wires = s.wires.filter(
                (w) => !idsToDelete.has(w.fromComponentId) && !idsToDelete.has(w.toComponentId),
              );
              s.selectedComponentIds = s.selectedComponentIds.filter((id) => !idsToDelete.has(id));
              s.selectedComponentId =
                s.selectedComponentId && idsToDelete.has(s.selectedComponentId)
                  ? (s.selectedComponentIds[0] ?? null)
                  : s.selectedComponentId;
            }
          }),
      };
    }),
    {
      // Only the *graph + fault scenario* is undoable. Selection clicks are
      // not. `faults` must be tracked: injectFault also stamps a mirrored
      // `state.fault` marker on the target component (which IS in history),
      // so without this slice an undo would restore the marker while the
      // stale fault kept affecting the sim — an invisible ghost fault.
      partialize: (state) => ({
        components: componentsForHistory(state.components),
        wires: state.wires,
        globalVoltage: state.globalVoltage,
        supply: state.supply,
        faults: state.faults,
      }),
      // Immer preserves array identity when no element changed, so a simple
      // reference equality on the tracked slices is enough to skip the entry
      // — selection-only updates won't grow the history.
      equality: (a, b) =>
        a.components === b.components &&
        a.wires === b.wires &&
        a.globalVoltage === b.globalVoltage &&
        a.supply === b.supply &&
        a.faults === b.faults,
      limit: 100,
    },
  ),
);

// ── Imperative undo/redo helpers (wired to toolbar buttons) ────────────────
// ─── Standalone helpers (moved to ./circuitActions, re-exported for API parity) ──
export {
  clearHistory,
  redo,
  releaseMomentarySwitches,
  selectCircuit,
  setMomentarySwitchState,
  undo,
} from './circuitActions';
