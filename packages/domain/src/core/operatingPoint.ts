import { COMPONENT_DEFS } from '../components';
import { type ProtectionRole, getProtectionRole } from '../protectionRoles';
import type { ElectricalRating, TerminalCapability } from './capabilities';
import { type CompatibilityResult, assessTerminalCompatibility } from './compatibility';
import type {
  CompileOptions,
  CompileResult,
  ElectricalSimulationResult,
  ResolvedWireProperties,
} from './contracts';
import { terminalId } from './faultTopology';
import { LINEAR_SYSTEM_LIMITS } from './linearSystem';
import {
  type CapacityComparison,
  type WireCapacity,
  assessWireCapacity,
  compareCurrentCapacity,
} from './wireCapacity';

export type CircuitOperatingState =
  | 'not-assessed'
  | 'no-load'
  | 'idle'
  | 'partial'
  | 'operating'
  | 'underpowered'
  | 'incompatible';

export interface LoadOperatingPoint {
  componentId: string;
  branchId: string;
  sourceIds: string[];
  model: 'fixed-resistance' | 'declared-profile' | 'not-assessed';
  apparentPowerVoltAmps?: number | null;
  reactivePowerVars?: number | null;
  profileState?: NonNullable<ElectricalSimulationResult['profileStates']>[string];
  /** Physical element response, separate from suitability and damage. */
  response: 'not-assessed' | 'idle' | 'below-nominal' | 'nominal' | 'above-nominal';
  compatibility: CompatibilityResult;
  /** Signed branch.from -> branch.to, DC or signed RMS as in result.references. */
  terminalVoltageVolts: number | null;
  currentAmps: number | null;
  powerWatts: number | null;
  nominalVoltage: ElectricalRating<number>;
  nominalPowerWatts: ElectricalRating<number>;
  powerRatio: number | null;
  damage: 'not-assessed';
}

export interface WireOperatingPoint {
  wireId: string;
  branchId: string;
  closed: boolean;
  properties: ResolvedWireProperties;
  resistanceBasis: 'one-conductor';
  resistanceTemperatureC: 20;
  /** Signed branch.from -> branch.to; a live open branch can have zero current. */
  currentAmps: number | null;
  /** Across the branch, including a break when open; null across independent references. */
  terminalVoltageVolts: number | null;
  /** Signed I*R in an intact conductor; never the voltage across an open break. */
  conductorDropVolts: number | null;
  lossWatts: number | null;
  capacity: WireCapacity;
}

export interface DeviceCurrentMeasurement {
  componentId: string;
  groupId: string;
  branchId: string;
  currentAmps: number | null;
  currentCapacityAmps: ElectricalRating<number>;
  capacityComparison: CapacityComparison;
  protection: ProtectionRole;
  /** In applies only to overcurrent devices. RCCB carrying capacity is not In. */
  overcurrentRatingAmps: ElectricalRating<number> | null;
  ratedResidualMilliAmps: number | null;
  residualCurrentMilliAmps: null;
  trip: 'not-assessed';
}

type Compiled = Extract<CompileResult, { status: 'compiled' }>;

function measurement(
  result: ElectricalSimulationResult,
  values: Record<string, number>,
  id: string,
): number | null {
  const value = values[id];
  return result.status === 'converged' && value !== undefined && Number.isFinite(value)
    ? value
    : null;
}

function loadResponse(power: number | null, ratio: number | null): LoadOperatingPoint['response'] {
  if (power === null || ratio === null) return 'not-assessed';
  if (Math.abs(power) <= LINEAR_SYSTEM_LIMITS.absoluteTolerance) return 'idle';
  if (ratio < 1 - LINEAR_SYSTEM_LIMITS.relativeTolerance) return 'below-nominal';
  return ratio > 1 + LINEAR_SYSTEM_LIMITS.relativeTolerance ? 'above-nominal' : 'nominal';
}

function circuitOperation(result: ElectricalSimulationResult): CircuitOperatingState {
  if (result.status !== 'converged') return 'not-assessed';
  if (!result.loads.length) return 'no-load';
  const active: LoadOperatingPoint[] = [];
  for (const load of result.loads) if (load.response !== 'idle') active.push(load);
  if (!active.length) return 'idle';
  if (active.some((load) => load.compatibility.status === 'incompatible')) return 'incompatible';
  if (result.readiness.earthing.diagnostics.some((diagnostic) => diagnostic.severity === 'error'))
    return 'not-assessed';
  if (active.some((load) => load.compatibility.status !== 'compatible')) return 'not-assessed';
  if (active.length !== result.loads.length) return 'partial';
  return active.some((load) => load.response === 'below-nominal') ? 'underpowered' : 'operating';
}

/** Derive consumer-facing values from accepted MNA measurements only. This never
 * re-solves, substitutes nameplate P/V, advances protection, or edits the circuit.
 */
export function deriveOperatingPoints(
  compiled: Compiled,
  result: ElectricalSimulationResult,
  options: CompileOptions,
): ElectricalSimulationResult {
  const { graph, circuit } = compiled;
  const defs = options.defs ?? COMPONENT_DEFS;
  const components = new Map(circuit.components.map((component) => [component.id, component]));
  const capabilities = new Map(
    result.readiness.capabilities.map((item) => [item.componentId, item]),
  );
  const groupsByComponent = new Map<
    string,
    Map<string, (typeof result.readiness.groups)[number]>
  >();
  for (const group of result.readiness.groups) {
    const byGroup = groupsByComponent.get(group.componentId) ?? new Map();
    byGroup.set(group.groupId, group);
    groupsByComponent.set(group.componentId, byGroup);
  }
  const loadGroupByComponent = new Map<string, TerminalCapability>();
  const contactGroupsByComponent = new Map<
    string,
    { group: TerminalCapability; terminals: Set<string> }[]
  >();
  for (const [componentId, capability] of capabilities) {
    for (const group of capability.groups) {
      if (group.role === 'load' && !loadGroupByComponent.has(componentId))
        loadGroupByComponent.set(componentId, group);
      else if (group.role === 'contact' || group.role === 'connection') {
        const entries = contactGroupsByComponent.get(componentId) ?? [];
        entries.push({
          group,
          terminals: new Set(group.ports.map((port) => terminalId(componentId, port))),
        });
        contactGroupsByComponent.set(componentId, entries);
      }
    }
  }
  const sources = new Map(graph.sources.map((source) => [source.id, source]));
  const referenceSources = new Map(result.references.map((ref) => [ref.domainId, ref.sourceIds]));
  const read = (values: Record<string, number>, id: string) => measurement(result, values, id);
  for (const branch of graph.branches) {
    const current = read(result.branchCurrents, branch.id);
    const voltage = read(result.branchVoltages, branch.id);
    if (branch.wireId && branch.wire) {
      const capacity = assessWireCapacity(branch.wire, current);
      result.wires.push({
        wireId: branch.wireId,
        branchId: branch.id,
        closed: branch.closed,
        properties: branch.wire,
        resistanceBasis: 'one-conductor',
        resistanceTemperatureC: 20,
        currentAmps: current,
        terminalVoltageVolts: voltage,
        conductorDropVolts:
          branch.closed && current !== null ? current * branch.wire.resistanceOhms : null,
        lossWatts: read(result.wireLosses, branch.wireId),
        capacity,
      });
      if (capacity.comparison === 'exceeded')
        result.diagnostics.push({
          code: 'wire-capacity-exceeded',
          severity: 'warning',
          wireId: branch.wireId,
          branchId: branch.id,
          message: `Current magnitude ${Math.abs(current!)} A exceeds the modeled derated capacity ${capacity.deratedAmps} A. Cable damage and protective clearing are not assessed.`,
        });
    }
    const component = branch.componentId ? components.get(branch.componentId) : undefined;
    if (!component) continue;
    if (branch.kind === 'load') {
      const group = loadGroupByComponent.get(component.id);
      if (!group) continue;
      const preflight = groupsByComponent.get(component.id)?.get(group.id);
      const sourceIds =
        result.status === 'converged'
          ? (referenceSources.get(result.terminalDomains[branch.from]!) ?? [])
          : (preflight?.sourceIds ?? []);
      // Accepted joined DC sources share a waveform kind; only the solved voltage
      // is compared. No first/last-source voltage is assigned to this load.
      const compatibility =
        result.status === 'converged'
          ? assessTerminalCompatibility(group, {
              supply: sources.get(sourceIds[0] ?? '')?.model,
              ...(voltage === null ? {} : { terminalVoltage: Math.abs(voltage) }),
              compareNominalVoltage: false,
            })
          : (preflight?.result ?? { status: 'unassessed' as const, reasons: [] });
      const power = read(result.branchPowers, branch.id);
      const ratio =
        power !== null && group.nominalPowerWatts.status === 'known'
          ? power / group.nominalPowerWatts.value
          : null;
      result.loads.push({
        componentId: component.id,
        branchId: branch.id,
        sourceIds,
        model:
          group.loadLaw.kind === 'fixed-resistance'
            ? 'fixed-resistance'
            : group.loadLaw.kind === 'profile'
              ? 'declared-profile'
              : 'not-assessed',
        ...(result.phasors
          ? {
              apparentPowerVoltAmps:
                voltage !== null && current !== null ? Math.abs(voltage * current) : null,
              reactivePowerVars:
                result.phasors.branchVoltages[branch.id] && result.phasors.branchCurrents[branch.id]
                  ? result.phasors.branchVoltages[branch.id]!.imaginary *
                      result.phasors.branchCurrents[branch.id]!.real -
                    result.phasors.branchVoltages[branch.id]!.real *
                      result.phasors.branchCurrents[branch.id]!.imaginary
                  : null,
              profileState: result.profileStates?.[component.id],
            }
          : {}),
        response: loadResponse(power, ratio),
        compatibility,
        terminalVoltageVolts: voltage,
        currentAmps: current,
        powerWatts: power,
        nominalVoltage: group.nominalVoltage,
        nominalPowerWatts: group.nominalPowerWatts,
        powerRatio: ratio,
        damage: 'not-assessed',
      });
      for (const reason of compatibility.reasons)
        if (reason.basis === 'solved-terminal')
          result.diagnostics.push({
            code: `load-${reason.code}`,
            severity: reason.severity,
            message: reason.message,
            componentId: component.id,
            branchId: branch.id,
          });
    } else if (branch.kind === 'contact' || branch.kind === 'link') {
      const matches = contactGroupsByComponent.get(component.id);
      const match = matches?.find(
        (entry) => entry.terminals.has(branch.from) && entry.terminals.has(branch.to),
      );
      if (!match) continue;
      const group = match.group;
      const protection = getProtectionRole(component.type, defs);
      const capacityComparison = compareCurrentCapacity(
        current,
        group.currentCapacityAmps.status === 'known' ? group.currentCapacityAmps.value : null,
      );
      result.deviceCurrents.push({
        componentId: component.id,
        groupId: group.id,
        branchId: branch.id,
        currentAmps: current,
        currentCapacityAmps: group.currentCapacityAmps,
        capacityComparison,
        protection,
        overcurrentRatingAmps: protection.overcurrent ? group.currentCapacityAmps : null,
        ratedResidualMilliAmps: protection.residual
          ? (defs[component.type]?.ratedLeakage_mA ?? null)
          : null,
        residualCurrentMilliAmps: null,
        trip: 'not-assessed',
      });
      if (capacityComparison === 'exceeded')
        result.diagnostics.push({
          code: 'device-current-rating-exceeded',
          severity: 'warning',
          componentId: component.id,
          branchId: branch.id,
          message:
            'The actual pole current exceeds its declared current rating. This is not an instantaneous trip or damage result.',
        });
    }
  }
  result.operation = circuitOperation(result);
  return result;
}
