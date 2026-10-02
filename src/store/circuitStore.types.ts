/**
 * Circuit store type definitions.
 *
 * Split verbatim from the former monolithic `circuitStore.ts` — the
 * `CircuitState` contract, graph-change envelope, and editable-wire field
 * list, so the store definition and its standalone helpers can share them
 * without circular imports.
 */

import type {
  Circuit,
  ComponentGroup,
  ComponentInstance,
  FaultType,
  InjectedFault,
  WireFaultType,
  WireInstance,
} from '@electrasim/domain';

export type EditableWireProperties = Pick<
  WireInstance,
  | 'controlPoints'
  | 'pathKind'
  | 'lengthMeters'
  | 'deratingFactor'
  | 'customCableMm2'
  | 'installationMethod'
  | 'material'
  | 'gauge'
>;

export interface GraphChanges {
  addComponents?: ComponentInstance[];
  addWires?: WireInstance[];
  removeWireIds?: string[];
}

export interface CircuitState {
  components: ComponentInstance[];
  wires: WireInstance[];
  globalVoltage: number;
  supply?: Circuit['supply'];
  /** Active user-injected faults */
  faults: InjectedFault[];

  selectedComponentId: string | null;
  selectedWireIds: string[];
  /** Phase 6.2.3 multi-select: all selected component IDs (includes `selectedComponentId`). */
  selectedComponentIds: string[];
  /** Component groups for complex circuit management. */
  componentGroups: ComponentGroup[];

  // Mutators ──────────────────────────────────────────────────────────────
  setCircuit: (circuit: Circuit) => void;
  /** Swap the untouched demo bench to the given app mode's variant. */
  swapDemoForMode: (mode: 'basic' | 'pro') => void;
  /** If the current circuit is still the unmodified demo seed, rebuild it with
   *  the given regional socket type so the demo reflects the selected plug. */
  swapDemoSocketForPlug: (socketType: string) => void;
  setGlobalSupplyVoltage: (voltage: number) => void;
  addComponent: (comp: ComponentInstance) => void;
  removeComponent: (id: string) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  toggleSwitch: (id: string) => void;
  setSwitchState: (id: string, on: boolean) => void;

  addWire: (wire: WireInstance) => void;
  /** Apply related component/wire additions and removals as one undoable graph edit. */
  applyGraphChanges: (changes: GraphChanges) => void;
  removeWire: (id: string) => void;
  /** Phase 6.9: remove every wire, keep components. Single undo step. */
  clearAllWires: () => void;
  /** Phase 6.9: remove every component AND every wire. Single undo step. */
  clearAllComponents: () => void;
  /**
   * Reroute one end of an existing wire to a different component+port.
   * `end` selects which side. Returns true if the reroute was applied.
   */
  rerouteWire: (
    id: string,
    end: 'from' | 'to',
    target: { componentId: string; portIndex: number },
  ) => boolean | Promise<boolean>;

  /** Phase 6.2.3: move multiple components by the same delta (no snap — snap on drag-end). */
  moveComponents: (ids: string[], dx: number, dy: number) => void;
  /** Phase 6.3-slim: set absolute positions for multiple components in one undo entry (alignment). */
  setComponentPositions: (updates: { id: string; x: number; y: number }[]) => void;
  /** Remove the specified components and their connected wires in one undo step. */
  removeComponents: (ids: string[]) => void;
  /** Phase 6.2.3: remove all currently selected components + their wires in one undo step. */
  removeSelectedComponents: () => void;
  /**
   * Phase 6.2.4: paste an array of clipboard components onto the canvas.
   * Fresh IDs are generated for each pasted component; the pasted group
   * becomes the new selection. `offset` is applied to every position so
   * repeated pastes stack visually instead of landing on top.
   */
  pasteComponents: (items: ComponentInstance[], offset: { x: number; y: number }) => void;

  /** Rotate a component by delta degrees (defaults to 90 degrees). */
  rotateComponent: (id: string, deltaDegrees?: number) => void;
  /** Rotate all currently selected components by delta degrees (defaults to 90 degrees). */
  rotateSelected: (deltaDegrees?: number) => void;
  /** Remove all currently selected components and wires in one single transaction. */
  removeSelected: () => void;
  /** Auto-assign standard engineering labels (e.g. S1, L1, CB1, etc.) to components. */
  autoLabelAllComponents: () => void;
  /** Fault simulation: inject a structured fault into the circuit. */
  injectFault: (
    faultOrParams:
      | import('@electrasim/domain').InjectedFault
      | {
          type: FaultType;
          target: import('@electrasim/domain').FaultTarget;
          parameters?: Record<string, unknown>;
        },
  ) => string | Promise<string>;
  /** Fault simulation: remove a specific injected fault by ID. */
  removeFault: (faultId: string) => void;
  /** Fault simulation: toggle a specific fault type on a target. */
  toggleFault: (type: FaultType, target: import('@electrasim/domain').FaultTarget) => void;
  /** Fault simulation: inject or clear a fault on one wire. */
  setWireFault: (id: string, fault: WireFaultType | undefined) => void;
  /** Fault simulation: inject or clear a fault on one component. */
  setComponentFault: (id: string, fault: FaultType | undefined) => void;
  /** Fault simulation: remove all faults from every component, wire, and port. */
  clearAllFaults: () => void;

  /** Pro Mode Customizations: update custom voltage, power, cable size or threshold parameters. */
  updateComponentState: (
    id: string,
    updates: Partial<import('@electrasim/domain').ComponentState>,
  ) => void;
  /** Change component variant type and reset/sync relevant component parameters. */
  updateComponentType: (id: string, newType: string) => void;
  /** Repair a blown component after overvoltage/overcurrent overload. */
  repairBlownComponent: (id: string) => void;
  /** Repair all blown components across the circuit. */
  repairAllBlownComponents: () => void;
  /** Repair all blown components and melted/busted wires across the circuit. */
  repairAllFaults: () => void;
  /** Mark a wire as melted/busted or restored. */
  setWireBusted: (id: string, isBusted: boolean, reason?: string) => void;
  /** Update editable wire metadata without exposing identity or endpoint mutation. */
  updateWireProperties: (id: string, updates: Partial<EditableWireProperties>) => void;
  /** Swap origin and destination terminals of a wire. */
  swapWireEndpoints: (id: string) => void;
  /** Reset a tripped breaker/fuse after fault is cleared. */
  resetTrippedComponent: (id: string) => void;
  /** Reset all tripped protection devices across the circuit. */
  resetAllTrippedComponents: () => void;

  // Selection (transient — excluded from undo history) ────────────────────
  selectComponent: (id: string | null) => void;
  selectWire: (id: string | null) => void;
  toggleWireSelection: (id: string) => void;
  clearSelection: () => void;
  /** Phase 6.2.3: Shift-click — toggle a single component in/out of multi-selection. */
  toggleComponentSelection: (id: string) => void;
  /** Phase 6.2.3: set exact multi-selection (used by drag-rect commit). */
  setMultiSelection: (ids: string[]) => void;

  // Component Grouping ──────────────────────────────────────────────────────
  /** Create a group from selected components. */
  createGroup: (name: string, componentIds: string[]) => void;
  /** Ungroup a specific group, releasing its components. */
  ungroup: (groupId: string) => void;
  /** Move all components in a group by delta. */
  moveGroup: (groupId: string, dx: number, dy: number) => void;
  /** Delete a group and optionally its components. */
  deleteGroup: (groupId: string, deleteComponents: boolean) => void;
}
