import {
  type BreakerComponent,
  type CircuitComponent,
  type CircuitDocument,
  type ConductorComponent,
  SimulatorError,
  type SupplyComponent,
  type SupplyWinding,
  type TerminalReference,
  terminalKey,
} from "./model.ts";

const ZERO_EPSILON = 1e-10;

interface Complex {
  readonly re: number;
  readonly im: number;
}

const ZERO: Complex = { re: 0, im: 0 };

export interface SolverRuntimeState {
  readonly openComponentIds?: ReadonlySet<string>;
  readonly closedComponentIds?: ReadonlySet<string>;
  /** Runtime impedance scaling supports bounded transient approximations such as motor inrush. */
  readonly impedanceScaleByComponentId?: ReadonlyMap<string, number>;
}

export interface ComponentElectricalResult {
  readonly componentId: string;
  readonly voltage: number;
  readonly voltagePhaseDegrees: number;
  readonly currentAmps: number;
  readonly currentPhaseDegrees: number;
  readonly powerWatts: number;
}

export interface FaultElectricalResult {
  readonly faultId: string;
  readonly voltage: number;
  readonly currentAmps: number;
  readonly powerWatts: number;
}

export interface SupplyWindingElectricalResult {
  readonly supplyId: string;
  readonly windingId: string;
  readonly voltage: number;
  readonly voltagePhaseDegrees: number;
  readonly currentAmps: number;
  readonly currentPhaseDegrees: number;
  readonly powerWatts: number;
}

export interface SteadyStateSolution {
  readonly nodeVoltages: Readonly<Record<string, number>>;
  readonly nodePhasesDegrees: Readonly<Record<string, number>>;
  readonly components: Readonly<Record<string, ComponentElectricalResult>>;
  readonly supplyWindings: Readonly<Record<string, SupplyWindingElectricalResult>>;
  readonly faults: Readonly<Record<string, FaultElectricalResult>>;
}

type BranchComponent = Extract<
  CircuitComponent,
  {
    kind:
      | "breaker"
      | "residual_device"
      | "insulation_monitor"
      | "conductor"
      | "resistive_load"
      | "reactive_load"
      | "coil"
      | "motor"
      | "switch"
      | "relay_contact"
      | "contactor"
      | "socket_outlet"
      | "voltmeter"
      | "ammeter";
  }
>;

interface Branch {
  readonly id: string;
  readonly component?: BranchComponent;
  readonly faultId?: string;
  readonly fromNode: string;
  readonly toNode: string;
  readonly resistanceOhms: number;
  readonly reactanceOhms: number;
}

interface SourceBranch {
  readonly component: SupplyComponent;
  readonly winding: SupplyWinding;
  readonly positiveNode: string;
  readonly referenceNode: string;
}

class DisjointSet {
  private readonly parents = new Map<string, string>();

  add(value: string): void {
    if (!this.parents.has(value)) this.parents.set(value, value);
  }

  find(value: string): string {
    const parent = this.parents.get(value);
    if (!parent) throw new SimulatorError("terminal_not_found", value);
    if (parent === value) return value;
    const root = this.find(parent);
    this.parents.set(value, root);
    return root;
  }

  union(left: string, right: string): void {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) this.parents.set(rightRoot, leftRoot);
  }
}

/**
 * Modified nodal analysis for linear resistive networks. AC values are complex RMS phasors;
 * DC uses the same matrix with a zero phase. Open, impedance-bridge and terminal-swap faults
 * alter the network before it is solved rather than adding diagnostic-only messages.
 */
export function solveSteadyState(
  circuit: CircuitDocument,
  runtime: SolverRuntimeState = {},
): SteadyStateSolution {
  const nodes = new DisjointSet();
  for (const component of circuit.components) {
    for (const terminal of component.terminals)
      nodes.add(terminalKey({ componentId: component.id, terminalId: terminal.id }));
  }

  const activeFaults = circuit.faults.filter((fault) => fault.active);
  const openComponents = new Set(runtime.openComponentIds ?? []);
  for (const fault of activeFaults) {
    if (fault.type === "open_component") openComponents.add(fault.componentId);
  }
  for (const component of circuit.components) {
    if (
      (component.kind !== "junction" && component.kind !== "busbar") ||
      openComponents.has(component.id)
    )
      continue;
    const first = component.terminals[0];
    if (!first) continue;
    const firstKey = terminalKey({ componentId: component.id, terminalId: first.id });
    for (const terminal of component.terminals.slice(1))
      nodes.union(firstKey, terminalKey({ componentId: component.id, terminalId: terminal.id }));
  }
  const openTerminals = new Set(
    activeFaults
      .filter((fault) => fault.type === "open_terminal")
      .map((fault) => terminalKey(fault.terminal)),
  );
  const swappedTerminal = new Map<string, string>();
  for (const fault of activeFaults) {
    if (fault.type !== "terminal_swap") continue;
    const first = terminalKey({
      componentId: fault.componentId,
      terminalId: fault.firstTerminalId,
    });
    const second = terminalKey({
      componentId: fault.componentId,
      terminalId: fault.secondTerminalId,
    });
    swappedTerminal.set(first, second);
    swappedTerminal.set(second, first);
  }
  const externalKey = (reference: TerminalReference): string => {
    const key = terminalKey(reference);
    return swappedTerminal.get(key) ?? key;
  };
  for (const connection of circuit.connections) {
    if (
      openTerminals.has(terminalKey(connection.from)) ||
      openTerminals.has(terminalKey(connection.to))
    )
      continue;
    nodes.union(externalKey(connection.from), externalKey(connection.to));
  }

  const supplies = circuit.components.filter(
    (component): component is SupplyComponent => component.kind === "supply",
  );
  if (supplies.length === 0) throw new SimulatorError("invalid_circuit", "A supply is required.");
  const sourceBranches: SourceBranch[] = supplies.flatMap((component) =>
    component.windings.map((winding) => ({
      component,
      winding,
      positiveNode: nodes.find(
        terminalKey({ componentId: component.id, terminalId: winding.positiveTerminalId }),
      ),
      referenceNode: nodes.find(
        terminalKey({ componentId: component.id, terminalId: winding.referenceTerminalId }),
      ),
    })),
  );
  const references = new Set(sourceBranches.map((source) => source.referenceNode));

  const componentBranches: Branch[] = circuit.components
    .filter((component): component is BranchComponent =>
      [
        "breaker",
        "residual_device",
        "insulation_monitor",
        "conductor",
        "resistive_load",
        "reactive_load",
        "coil",
        "motor",
        "switch",
        "relay_contact",
        "contactor",
        "socket_outlet",
        "voltmeter",
        "ammeter",
      ].includes(component.kind),
    )
    .map((component) => ({
      id: component.id,
      component,
      fromNode: nodes.find(
        terminalKey({ componentId: component.id, terminalId: component.fromTerminalId }),
      ),
      toNode: nodes.find(
        terminalKey({ componentId: component.id, terminalId: component.toTerminalId }),
      ),
      resistanceOhms:
        component.resistanceOhms * (runtime.impedanceScaleByComponentId?.get(component.id) ?? 1),
      reactanceOhms:
        ("reactanceOhms" in component ? (component.reactanceOhms ?? 0) : 0) *
        (runtime.impedanceScaleByComponentId?.get(component.id) ?? 1),
    }));
  const faultBranches: Branch[] = activeFaults
    .filter((fault) => fault.type === "impedance_bridge")
    .map((fault) => ({
      id: `fault:${fault.id}`,
      faultId: fault.id,
      fromNode: nodes.find(externalKey(fault.from)),
      toNode: nodes.find(externalKey(fault.to)),
      resistanceOhms: fault.resistanceOhms,
      reactanceOhms: fault.reactanceOhms ?? 0,
    }));
  const branches = [...componentBranches, ...faultBranches];
  const conductiveBranches = branches.filter((branch) => {
    if (!branch.component) return true;
    if (openComponents.has(branch.component.id)) return false;
    return !(
      ["switch", "relay_contact", "contactor", "socket_outlet"].includes(branch.component.kind) &&
      "closed" in branch.component &&
      !branch.component.closed &&
      !runtime.closedComponentIds?.has(branch.component.id)
    );
  });

  const sourceRoots = sourceBranches.flatMap((source) => [
    source.positiveNode,
    source.referenceNode,
  ]);
  const activeRoots = reachableRoots(sourceRoots, conductiveBranches);
  const variableNodes = [...activeRoots].filter((node) => !references.has(node)).sort();
  const nodeIndex = new Map(variableNodes.map((node, index) => [node, index]));
  const sourceOffset = variableNodes.length;
  const dimension = variableNodes.length + sourceBranches.length;
  const matrix = Array.from({ length: dimension }, () =>
    Array.from({ length: dimension }, () => ({ ...ZERO })),
  );
  const vector = Array.from({ length: dimension }, () => ({ ...ZERO }));

  for (const branch of conductiveBranches) {
    if (!activeRoots.has(branch.fromNode) || !activeRoots.has(branch.toNode)) continue;
    stampAdmittance(
      matrix,
      nodeIndex,
      branch.fromNode,
      branch.toNode,
      branch.resistanceOhms,
      branch.reactanceOhms,
    );
  }
  for (let sourceIndex = 0; sourceIndex < sourceBranches.length; sourceIndex += 1) {
    const source = sourceBranches[sourceIndex];
    if (!source) continue;
    stampIdealVoltageSource(
      matrix,
      vector,
      nodeIndex,
      source.positiveNode,
      source.referenceNode,
      sourceOffset + sourceIndex,
      polar(source.winding.voltage, source.winding.phaseDegrees),
      source.winding.sourceImpedance,
    );
  }

  const values = solveLinearSystem(matrix, vector);
  const voltageAt = (node: string): Complex => {
    if (references.has(node)) return ZERO;
    const index = nodeIndex.get(node);
    return index === undefined ? ZERO : (values[index] ?? ZERO);
  };
  const nodeVoltages: Record<string, number> = {};
  const nodePhasesDegrees: Record<string, number> = {};
  for (const component of circuit.components) {
    for (const terminal of component.terminals) {
      const key = terminalKey({ componentId: component.id, terminalId: terminal.id });
      const value = voltageAt(nodes.find(key));
      nodeVoltages[key] = clean(magnitude(value));
      nodePhasesDegrees[key] = clean(phaseDegrees(value));
    }
  }

  const electrical: Record<string, ComponentElectricalResult> = {};
  const faultElectrical: Record<string, FaultElectricalResult> = {};
  for (const branch of branches) {
    const voltage = subtract(voltageAt(branch.fromNode), voltageAt(branch.toNode));
    const isOpen =
      Boolean(branch.component && openComponents.has(branch.component.id)) ||
      Boolean(
        branch.component &&
          ["switch", "relay_contact", "contactor", "socket_outlet"].includes(
            branch.component.kind,
          ) &&
          "closed" in branch.component &&
          !branch.component.closed &&
          !runtime.closedComponentIds?.has(branch.component.id),
      );
    const current = isOpen
      ? ZERO
      : divide(voltage, { re: branch.resistanceOhms, im: branch.reactanceOhms });
    const voltageMagnitude = magnitude(voltage);
    const currentMagnitude = magnitude(current);
    const powerWatts = currentMagnitude * currentMagnitude * branch.resistanceOhms;
    if (branch.component) {
      electrical[branch.component.id] = {
        componentId: branch.component.id,
        voltage: clean(voltageMagnitude),
        voltagePhaseDegrees: clean(phaseDegrees(voltage)),
        currentAmps: clean(currentMagnitude),
        currentPhaseDegrees: clean(phaseDegrees(current)),
        powerWatts: clean(powerWatts),
      };
    } else if (branch.faultId) {
      faultElectrical[branch.faultId] = {
        faultId: branch.faultId,
        voltage: clean(voltageMagnitude),
        currentAmps: clean(currentMagnitude),
        powerWatts: clean(powerWatts),
      };
    }
  }
  const supplyWindings: Record<string, SupplyWindingElectricalResult> = {};
  for (const supply of supplies) {
    const windingResults = sourceBranches
      .map((source, index) => ({ source, index }))
      .filter((entry) => entry.source.component.id === supply.id)
      .map((entry) => {
        const current = scale(values[sourceOffset + entry.index] ?? ZERO, -1);
        const voltage = polar(entry.source.winding.voltage, entry.source.winding.phaseDegrees);
        const result: SupplyWindingElectricalResult = {
          supplyId: supply.id,
          windingId: entry.source.winding.id,
          voltage: entry.source.winding.voltage,
          voltagePhaseDegrees: entry.source.winding.phaseDegrees,
          currentAmps: clean(magnitude(current)),
          currentPhaseDegrees: clean(phaseDegrees(current)),
          powerWatts: clean(multiply(voltage, conjugate(current)).re),
        };
        supplyWindings[`${supply.id}:${entry.source.winding.id}`] = result;
        return result;
      });
    const representative = windingResults[0];
    electrical[supply.id] = {
      componentId: supply.id,
      voltage: representative?.voltage ?? 0,
      voltagePhaseDegrees: representative?.voltagePhaseDegrees ?? 0,
      currentAmps: clean(windingResults.reduce((total, winding) => total + winding.currentAmps, 0)),
      currentPhaseDegrees: representative?.currentPhaseDegrees ?? 0,
      powerWatts: clean(windingResults.reduce((total, winding) => total + winding.powerWatts, 0)),
    };
  }
  for (const component of circuit.components) {
    if (!["junction", "busbar", "clamp_meter", "enclosure"].includes(component.kind)) continue;
    const target =
      component.kind === "clamp_meter" && component.targetComponentId
        ? electrical[component.targetComponentId]
        : undefined;
    const firstTerminal = component.terminals[0];
    electrical[component.id] = {
      componentId: component.id,
      voltage:
        component.kind === "clamp_meter" || component.kind === "enclosure"
          ? 0
          : firstTerminal
            ? (nodeVoltages[
                terminalKey({ componentId: component.id, terminalId: firstTerminal.id })
              ] ?? 0)
            : 0,
      voltagePhaseDegrees: 0,
      currentAmps: component.kind === "clamp_meter" ? (target?.currentAmps ?? 0) : 0,
      currentPhaseDegrees:
        component.kind === "clamp_meter" ? (target?.currentPhaseDegrees ?? 0) : 0,
      powerWatts: 0,
    };
  }
  return {
    nodeVoltages,
    nodePhasesDegrees,
    components: electrical,
    supplyWindings,
    faults: faultElectrical,
  };
}

function reachableRoots(sourceRoots: readonly string[], branches: readonly Branch[]): Set<string> {
  const adjacency = new Map<string, Set<string>>();
  for (const branch of branches) {
    const from = adjacency.get(branch.fromNode) ?? new Set<string>();
    const to = adjacency.get(branch.toNode) ?? new Set<string>();
    from.add(branch.toNode);
    to.add(branch.fromNode);
    adjacency.set(branch.fromNode, from);
    adjacency.set(branch.toNode, to);
  }
  const reached = new Set(sourceRoots);
  const queue = [...sourceRoots];
  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index];
    if (!node) continue;
    for (const neighbor of adjacency.get(node) ?? []) {
      if (reached.has(neighbor)) continue;
      reached.add(neighbor);
      queue.push(neighbor);
    }
  }
  return reached;
}

function stampAdmittance(
  matrix: Complex[][],
  nodeIndex: ReadonlyMap<string, number>,
  fromNode: string,
  toNode: string,
  resistanceOhms: number,
  reactanceOhms: number,
): void {
  if (!Number.isFinite(resistanceOhms) || !Number.isFinite(reactanceOhms) || resistanceOhms <= 0)
    throw new SimulatorError(
      "invalid_circuit",
      "Branch impedance must be finite with positive resistance.",
    );
  const conductance = divide({ re: 1, im: 0 }, { re: resistanceOhms, im: reactanceOhms });
  const from = nodeIndex.get(fromNode);
  const to = nodeIndex.get(toNode);
  if (from !== undefined) addMatrixValue(matrix, from, from, conductance);
  if (to !== undefined) addMatrixValue(matrix, to, to, conductance);
  if (from !== undefined && to !== undefined) {
    addMatrixValue(matrix, from, to, scale(conductance, -1));
    addMatrixValue(matrix, to, from, scale(conductance, -1));
  }
}

function stampIdealVoltageSource(
  matrix: Complex[][],
  vector: Complex[],
  nodeIndex: ReadonlyMap<string, number>,
  positiveNode: string,
  referenceNode: string,
  row: number,
  voltage: Complex,
  sourceImpedance?: { readonly resistanceOhms: number; readonly reactanceOhms: number },
): void {
  const positive = nodeIndex.get(positiveNode);
  const reference = nodeIndex.get(referenceNode);
  if (positive !== undefined) {
    addMatrixValue(matrix, positive, row, { re: 1, im: 0 });
    addMatrixValue(matrix, row, positive, { re: 1, im: 0 });
  }
  if (reference !== undefined) {
    addMatrixValue(matrix, reference, row, { re: -1, im: 0 });
    addMatrixValue(matrix, row, reference, { re: -1, im: 0 });
  }
  if (sourceImpedance) {
    if (
      !Number.isFinite(sourceImpedance.resistanceOhms) ||
      !Number.isFinite(sourceImpedance.reactanceOhms) ||
      sourceImpedance.resistanceOhms <= 0
    )
      throw new SimulatorError(
        "invalid_circuit",
        "Source impedance must be finite with positive resistance.",
      );
    addMatrixValue(matrix, row, row, {
      re: -sourceImpedance.resistanceOhms,
      im: -sourceImpedance.reactanceOhms,
    });
  }
  vector[row] = voltage;
}

function addMatrixValue(matrix: Complex[][], row: number, column: number, value: Complex): void {
  const targetRow = matrix[row];
  const current = targetRow?.[column];
  if (!targetRow || !current)
    throw new SimulatorError("invalid_circuit", "Internal matrix index is out of range.");
  targetRow[column] = add(current, value);
}

function solveLinearSystem(matrix: Complex[][], vector: Complex[]): Complex[] {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index] ?? ZERO]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (
        magnitude(augmented[row]?.[column] ?? ZERO) > magnitude(augmented[pivot]?.[column] ?? ZERO)
      )
        pivot = row;
    }
    if (magnitude(augmented[pivot]?.[column] ?? ZERO) < ZERO_EPSILON)
      throw new SimulatorError(
        "singular_circuit",
        "The network contains a floating or unsolved node.",
      );
    const columnRow = augmented[column];
    const pivotRow = augmented[pivot];
    if (!columnRow || !pivotRow)
      throw new SimulatorError("invalid_circuit", "Internal matrix row is out of range.");
    augmented[column] = pivotRow;
    augmented[pivot] = columnRow;
    const normalizedRow = augmented[column];
    const pivotValue = normalizedRow?.[column];
    if (!normalizedRow || !pivotValue)
      throw new SimulatorError("invalid_circuit", "Internal matrix pivot is missing.");
    for (let entry = column; entry <= size; entry += 1) {
      const value = normalizedRow[entry];
      if (!value) throw new SimulatorError("invalid_circuit", "Internal matrix entry is missing.");
      normalizedRow[entry] = divide(value, pivotValue);
    }
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const targetRow = augmented[row];
      const factor = targetRow?.[column] ?? ZERO;
      if (!targetRow || magnitude(factor) < ZERO_EPSILON) continue;
      for (let entry = column; entry <= size; entry += 1) {
        const target = targetRow[entry];
        if (!target)
          throw new SimulatorError("invalid_circuit", "Internal matrix entry is missing.");
        targetRow[entry] = subtract(target, multiply(factor, normalizedRow[entry] ?? ZERO));
      }
    }
  }
  return augmented.map((row) => row[size] ?? ZERO);
}

function add(left: Complex, right: Complex): Complex {
  return { re: left.re + right.re, im: left.im + right.im };
}

function subtract(left: Complex, right: Complex): Complex {
  return { re: left.re - right.re, im: left.im - right.im };
}

function multiply(left: Complex, right: Complex): Complex {
  return {
    re: left.re * right.re - left.im * right.im,
    im: left.re * right.im + left.im * right.re,
  };
}

function conjugate(value: Complex): Complex {
  return { re: value.re, im: -value.im };
}

function divide(left: Complex, right: Complex): Complex {
  const denominator = right.re * right.re + right.im * right.im;
  if (denominator < ZERO_EPSILON)
    throw new SimulatorError("singular_circuit", "Complex matrix division by zero.");
  return {
    re: (left.re * right.re + left.im * right.im) / denominator,
    im: (left.im * right.re - left.re * right.im) / denominator,
  };
}

function scale(value: Complex, factor: number): Complex {
  return { re: value.re * factor, im: value.im * factor };
}

function magnitude(value: Complex): number {
  return Math.hypot(value.re, value.im);
}

function phaseDegrees(value: Complex): number {
  return magnitude(value) < ZERO_EPSILON ? 0 : (Math.atan2(value.im, value.re) * 180) / Math.PI;
}

function polar(magnitudeValue: number, degrees: number): Complex {
  const radians = (degrees * Math.PI) / 180;
  return { re: magnitudeValue * Math.cos(radians), im: magnitudeValue * Math.sin(radians) };
}

function clean(value: number): number {
  return Math.abs(value) < ZERO_EPSILON ? 0 : value;
}

export function componentCurrent(
  solution: SteadyStateSolution,
  component: BreakerComponent | ConductorComponent,
): number {
  return solution.components[component.id]?.currentAmps ?? 0;
}

export function reference(componentId: string, terminalId: string): TerminalReference {
  return { componentId, terminalId };
}
