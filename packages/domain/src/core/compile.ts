import { COMPONENT_DEFS } from '../components';
import { normalizeCircuitFaults } from '../faults';
import type { ComponentDef } from '../types';
import { COIL_APPROXIMATION, isCoilModel } from './coilModel';
import {
  type CompileOptions,
  type CompileResult,
  ELECTRICAL_CONTRACT_VERSION,
  ELECTRICAL_MODEL_VERSION,
  type ElectricalBranch,
  type ElectricalDeviceModel,
  type ElectricalDiagnostic,
  type ModelCoverage,
  type TerminalGraph,
} from './contracts';
import { DIMMER_APPROXIMATION } from './dimmerModel';
import { applyGraphFaults, compareIds, terminalId } from './faultTopology';
import { validateCircuitInput } from './input';
import { modelPairs, modelPortIndices, resolveDeviceModel } from './models';
import { normalizeCircuitDocument } from './normalize';
import { PROTECTION_APPROXIMATION, isProtectionModel } from './protectionModel';
import { isSupplyModel, sameSupplyModel } from './supplies';
import { TIMER_APPROXIMATION, isTimerModel } from './timerModel';
import { resolveWireProperties } from './wireProperties';

class TerminalGroups {
  private readonly parent = new Map<string, string>();
  constructor(ids: string[]) {
    for (const id of ids) this.parent.set(id, id);
  }
  root(id: string): string {
    let current = id;
    while (this.parent.get(current) !== current) {
      const next = this.parent.get(current);
      if (next === undefined) throw new Error('Compiler attempted to connect an unknown terminal.');
      current = next;
    }
    let previous = id;
    while (previous !== current) {
      const next = this.parent.get(previous);
      this.parent.set(previous, current);
      if (next === undefined) break;
      previous = next;
    }
    return current;
  }
  join(a: string, b: string): void {
    const left = this.root(a);
    const right = this.root(b);
    if (left !== right)
      this.parent.set(
        compareIds(left, right) < 0 ? right : left,
        compareIds(left, right) < 0 ? left : right,
      );
  }
  groups(): { id: string; terminals: string[] }[] {
    const groups = new Map<string, string[]>();
    for (const id of this.parent.keys()) {
      const root = this.root(id);
      const group = groups.get(root) ?? [];
      group.push(id);
      groups.set(root, group);
    }
    return [...groups]
      .sort(([a], [b]) => compareIds(a, b))
      .map(([id, terminals]) => ({ id, terminals: terminals.sort(compareIds) }));
  }
}

/** Compile topology only. The original drawing is never modified or silently repaired. */
export function compileCircuit(raw: unknown, options: CompileOptions = {}): CompileResult {
  const version = {
    contractVersion: ELECTRICAL_CONTRACT_VERSION,
    modelVersion: ELECTRICAL_MODEL_VERSION,
  };
  const defs = options.defs ?? COMPONENT_DEFS;
  const input = validateCircuitInput(raw, defs);
  if (!input.valid) return { status: 'invalid', ...version, diagnostics: input.diagnostics };
  const circuit = normalizeCircuitDocument(input.circuit, false, defs);
  const diagnostics: ElectricalDiagnostic[] = [];
  const coverage: ModelCoverage[] = [];
  const graph: TerminalGraph = {
    terminals: [],
    branches: [],
    nets: [],
    domains: [],
    devices: [],
    sources: [],
    transformers: [],
    references: [],
    faults: [],
  };
  const definitions = new Map<string, ComponentDef>();
  const byId = new Map(circuit.components.map((component) => [component.id, component]));
  const aliases = new Map<
    string,
    { componentId: string; model: Extract<ElectricalDeviceModel, { kind: 'source-alias' }> }[]
  >();
  const branch = (value: ElectricalBranch) => graph.branches.push(value);

  for (const component of [...circuit.components].sort((a, b) => compareIds(a.id, b.id))) {
    const def = defs[component.type];
    if (!def) continue; // guarded by input validation
    definitions.set(component.id, def);
    const model = resolveDeviceModel(component, def, circuit);
    const indices = modelPortIndices(model);
    const invalidModel =
      indices.some((i) => !Number.isInteger(i) || !def.ports[i]) ||
      ((model.kind === 'source' || model.kind === 'source-alias') &&
        !isSupplyModel(model.supply)) ||
      (model.kind === 'source' && model.ports[0] === model.ports[1]) ||
      (model.kind === 'resistive-load' &&
        (!Number.isFinite(model.resistanceOhms) ||
          model.resistanceOhms <= 0 ||
          !Number.isFinite(model.nominalVoltage) ||
          model.nominalVoltage <= 0 ||
          !Number.isFinite(model.nominalPowerWatts) ||
          model.nominalPowerWatts <= 0 ||
          model.ports[0] === model.ports[1])) ||
      ((model.kind === 'resistive-load' || model.kind === 'unassessed-load') &&
        ((model.maximumVoltage !== undefined &&
          (!Number.isFinite(model.maximumVoltage) || model.maximumVoltage <= 0)) ||
          (model.nominalVoltage !== undefined &&
            (!Number.isFinite(model.nominalVoltage) || model.nominalVoltage <= 0)) ||
          (model.nominalPowerWatts !== undefined &&
            (!Number.isFinite(model.nominalPowerWatts) || model.nominalPowerWatts <= 0)) ||
          (model.supplyKinds !== undefined &&
            (!model.supplyKinds.length ||
              model.supplyKinds.some(
                (kind) => !['dc', 'ac-single-phase', 'ac-three-phase'].includes(kind),
              ))) ||
          (model.operatingVoltageRange !== undefined &&
            (!Number.isFinite(model.operatingVoltageRange.min) ||
              !Number.isFinite(model.operatingVoltageRange.max) ||
              model.operatingVoltageRange.min < 0 ||
              model.operatingVoltageRange.max < model.operatingVoltageRange.min)) ||
          (model.frequencyHz !== undefined &&
            (!model.frequencyHz.length ||
              model.frequencyHz.some(
                (frequency) => !Number.isFinite(frequency) || frequency <= 0,
              ))))) ||
      (model.kind === 'contacts' &&
        ((model.coilModel !== undefined && (!model.coil || !isCoilModel(model.coilModel))) ||
          (model.timerModel !== undefined &&
            (!isTimerModel(model.timerModel) ||
              !!model.coilModel ||
              !!model.dimmer ||
              (model.timerModel.kind === 'interval' &&
                !!model.timerModel.controlSupply !== !!model.timerSupplyPorts))) ||
          (model.protectionModel !== undefined &&
            (!isProtectionModel(model.protectionModel) ||
              !!model.coilModel ||
              !!model.timerModel ||
              !!model.dimmer)) ||
          (model.timerSupplyPorts !== undefined &&
            model.timerSupplyPorts[0] === model.timerSupplyPorts[1]) ||
          model.poles.some(
            (pole) => pole.common === pole.no || pole.nc === pole.common || pole.nc === pole.no,
          ) ||
          (model.coil !== undefined &&
            (model.coil[0] === model.coil[1] ||
              [
                ...model.poles.flatMap((pole) => [pole.common, pole.no, pole.nc]),
                ...(model.fixedGroups ?? []).flat(),
              ].some((port) => port !== undefined && model.coil?.includes(port)))))) ||
      (model.kind === 'transformer' &&
        (!Number.isFinite(model.primaryVoltage) ||
          !Number.isFinite(model.secondaryVoltage) ||
          !Number.isFinite(model.primaryVoltage / model.secondaryVoltage) ||
          model.primaryVoltage / model.secondaryVoltage <= 0 ||
          model.primaryVoltage <= 0 ||
          model.secondaryVoltage <= 0 ||
          model.isolation !== 'isolated' ||
          new Set(indices).size !== 4));
    if (invalidModel) {
      diagnostics.push({
        code: 'invalid-device-model',
        severity: 'error',
        message: 'Device model has invalid terminals or electrical parameters.',
        componentId: component.id,
      });
      continue;
    }
    graph.devices.push({ componentId: component.id, model });
    const t = (port: number) => terminalId(component.id, port);
    for (const [index, port] of def.ports.entries()) {
      let role: TerminalGraph['terminals'][number]['role'] =
        port.type === 'earth' ? 'pe' : port.type === 'live' ? 'line' : 'neutral';
      if (model.kind === 'source' && model.supply.kind === 'dc')
        role = index === model.ports[0] ? 'positive' : index === model.ports[1] ? 'negative' : role;
      if (model.kind === 'source-alias' && model.supply.kind === 'dc')
        role = model.role === 'line' ? 'positive' : 'negative';
      if (component.type === 'distribution-board-3phase')
        role =
          index === 0 || index === 4
            ? 'l1'
            : index === 1 || index === 5
              ? 'l2'
              : index === 2 || index === 6
                ? 'l3'
                : role;
      graph.terminals.push({
        id: t(index),
        port: { componentId: component.id, portIndex: index },
        role,
        label: port.label,
      });
      if (role === 'pe')
        graph.references.push({
          terminal: t(index),
          kind: component.type === 'earth-rod' ? 'electrode' : 'protective-bus',
        });
    }
    const internal = (
      kind: ElectricalBranch['kind'],
      a: number,
      b: number,
      closed: boolean,
      suffix: string,
      ideal = true,
      resistanceOhms?: number,
    ) =>
      branch({
        id: JSON.stringify(['device', component.id, suffix]),
        kind,
        from: t(a),
        to: t(b),
        closed,
        idealConductor: ideal,
        componentId: component.id,
        ...(resistanceOhms === undefined ? {} : { resistanceOhms }),
      });
    const groups = (values: readonly (readonly number[])[]) =>
      values.forEach(([first, ...rest], index) => {
        if (first !== undefined)
          for (const next of rest)
            internal(
              'link',
              first,
              next,
              def.ports[first]?.type === 'earth' || !component.state.isBlown,
              `link:${index}:${next}`,
            );
      });
    const on = options.contactStates?.get(component.id) ?? component.state.on === true;
    const operable =
      !component.state.isBlown &&
      !component.state.isTripped &&
      !options.trippedComponents?.has(component.id);
    const needsPhaseTerminals =
      (model.kind === 'source' || model.kind === 'source-alias') &&
      model.supply.kind === 'ac-three-phase';
    const topologyUnknown =
      model.kind === 'unassessed' ||
      (model.kind === 'unassessed-load' && model.ports.length !== 2) ||
      needsPhaseTerminals;
    coverage.push({
      subjectId: component.id,
      aspect: 'topology',
      status: topologyUnknown ? 'not-assessed' : 'supported',
      reason:
        model.kind === 'unassessed'
          ? model.reason
          : topologyUnknown
            ? 'Multi-terminal electrical incidence is not declared; terminal roles alone cannot supply a device model.'
            : 'Canonical terminals and device branches compiled; no electrical solve performed.',
    });
    if (needsPhaseTerminals) {
      coverage.push({
        subjectId: component.id,
        aspect: 'source',
        status: 'not-assessed',
        reason:
          'Three-phase source stamping requires explicit L1/L2/L3 terminals in 1.5E; a two-terminal or legacy alias source cannot represent it.',
      });
      continue;
    }
    switch (model.kind) {
      case 'source': {
        const sourceId = JSON.stringify(['source', component.id]);
        graph.sources.push({
          id: sourceId,
          componentIds: [component.id],
          positive: t(model.ports[0]),
          negative: t(model.ports[1]),
          model: model.supply,
          reference: model.supply.kind === 'dc' ? 'floating' : 'neutral',
        });
        internal('source', model.ports[0], model.ports[1], operable, 'source', false);
        graph.references.push({
          terminal: t(model.ports[1]),
          kind: model.supply.kind === 'dc' ? 'dc-negative' : 'neutral',
        });
        coverage.push({
          subjectId: component.id,
          aspect: 'source',
          status: 'estimated',
          reason: model.frequencyAssumed
            ? 'Schema 1 AC frequency defaults to an explicit 50 Hz assumption; standards selection never changes this saved source.'
            : 'Nominal source model declared; source impedance and numerical measurements are not yet assessed.',
        });
        break;
      }
      case 'source-alias': {
        const group = aliases.get(model.group) ?? [];
        group.push({ componentId: component.id, model });
        aliases.set(model.group, group);
        break;
      }
      case 'resistive-load':
        internal(
          'load',
          model.ports[0],
          model.ports[1],
          operable,
          'load',
          false,
          model.resistanceOhms,
        );
        coverage.push({
          subjectId: component.id,
          aspect: 'load',
          status: 'estimated',
          reason: model.approximation,
        });
        break;
      case 'unassessed-load':
        coverage.push({
          subjectId: component.id,
          aspect: 'load',
          status: 'not-assessed',
          reason: model.reason,
        });
        // Keep branch incidence when known; never turn it into an ideal conductor.
        if (
          model.ports.length === 2 &&
          model.ports[0] !== undefined &&
          model.ports[1] !== undefined
        )
          internal('load', model.ports[0], model.ports[1], operable, 'unassessed-load', false);
        break;
      case 'contacts':
        for (const [index, pole] of model.poles.entries()) {
          internal('contact', pole.common, pole.no, on && operable, `contact:${index}:no`);
          if (pole.nc !== undefined)
            internal('contact', pole.common, pole.nc, !on && operable, `contact:${index}:nc`);
        }
        groups(model.fixedGroups ?? []);
        if (model.coil)
          internal(
            'coil',
            model.coil[0],
            model.coil[1],
            operable,
            'coil',
            false,
            model.coilModel
              ? model.coilModel.supply.voltage ** 2 / model.coilModel.nominalPowerWatts
              : undefined,
          );
        if (model.coilModel)
          coverage.push({
            subjectId: component.id,
            aspect: 'controls',
            status: options.contactStates?.has(component.id) ? 'estimated' : 'not-assessed',
            reason: options.contactStates?.has(component.id)
              ? COIL_APPROXIMATION
              : 'Declared coil controls require the deterministic simulation step; a static contact snapshot cannot operate them.',
          });
        if (model.timerModel) {
          const supply =
            model.timerModel.kind === 'interval' ? model.timerModel.controlSupply : undefined;
          if (supply && model.timerSupplyPorts)
            internal(
              'control-supply',
              model.timerSupplyPorts[0],
              model.timerSupplyPorts[1],
              operable,
              'control-supply',
              false,
              supply.supply.voltage ** 2 / supply.nominalPowerWatts,
            );
          coverage.push({
            subjectId: component.id,
            aspect: 'controls',
            status: options.contactStates?.has(component.id) ? 'estimated' : 'not-assessed',
            reason: options.contactStates?.has(component.id)
              ? TIMER_APPROXIMATION
              : 'Declared timer programs require a deterministic simulation step.',
          });
        }
        if (model.dimmer)
          coverage.push({
            subjectId: component.id,
            aspect: 'controls',
            status: options.dimmerSampling ? 'estimated' : 'not-assessed',
            reason: options.dimmerSampling
              ? DIMMER_APPROXIMATION
              : 'Dimming requires the RMS simulation model; a static closed contact is not a dimmer result.',
          });
        if (model.limitation)
          coverage.push({
            subjectId: component.id,
            aspect: 'controls',
            status: 'not-assessed',
            reason: model.limitation,
          });
        break;
      case 'selector':
        for (const [index, pair] of modelPairs(model, on).entries())
          internal('contact', pair[0], pair[1], operable, `selector:${index}`);
        break;
      case 'connections':
        groups(model.groups);
        break;
      case 'transformer':
        internal('winding', model.primary[0], model.primary[1], operable, 'primary', false);
        internal('winding', model.secondary[0], model.secondary[1], operable, 'secondary', false);
        graph.transformers.push({
          componentId: component.id,
          primary: [t(model.primary[0]), t(model.primary[1])],
          secondary: [t(model.secondary[0]), t(model.secondary[1])],
          primaryBranchId: JSON.stringify(['device', component.id, 'primary']),
          secondaryBranchId: JSON.stringify(['device', component.id, 'secondary']),
          turnsRatio: model.primaryVoltage / model.secondaryVoltage,
        });
        coverage.push({
          subjectId: component.id,
          aspect: 'load',
          status: 'estimated',
          reason: model.approximation,
        });
        break;
      case 'outlet':
        coverage.push({
          subjectId: component.id,
          aspect: 'load',
          status: 'supported',
          reason: 'Outlet capacity is not a connected load; no consumption is stamped.',
        });
        break;
      case 'earth-reference':
        if (model.reference === 'protective-bus') {
          const pe = JSON.stringify(['reference', 'legacy-pe']);
          if (!graph.terminals.some((terminal) => terminal.id === pe))
            graph.terminals.push({ id: pe, role: 'pe', label: 'Legacy protective earth bus' });
          branch({
            id: JSON.stringify(['pe-alias', component.id]),
            kind: 'link',
            from: t(model.port),
            to: pe,
            closed: true,
            idealConductor: true,
            componentId: component.id,
          });
        }
        break;
      case 'unassessed':
        break;
    }
    if (def.isProtection)
      coverage.push({
        subjectId: component.id,
        aspect: 'protection',
        status: 'not-assessed',
        reason:
          'Contact topology only. Operation, coordination, prospective current and time are separate device/solver models.',
      });
    if (def.isProtection && model.kind === 'contacts' && model.protectionModel)
      coverage[coverage.length - 1] =
        options.trippedComponents !== undefined
          ? {
              subjectId: component.id,
              aspect: 'protection',
              status: 'estimated',
              reason: PROTECTION_APPROXIMATION,
            }
          : {
              subjectId: component.id,
              aspect: 'protection',
              status: 'not-assessed',
              reason:
                'Declared protection ratings require the deterministic simulation step; a static contact snapshot cannot operate them.',
            };
    if (component.type === 'distribution-board-3phase')
      coverage.push({
        subjectId: component.id,
        aspect: 'source',
        status: 'not-assessed',
        reason:
          'Three-phase identity and source equations are not assessed until the three-phase model is available.',
      });
  }
  if (diagnostics.some((d) => d.severity === 'error'))
    return { status: 'invalid', ...version, diagnostics };

  for (const [group, entries] of [...aliases].sort(([a], [b]) => compareIds(a, b))) {
    const liveEntries = entries.filter((entry) => entry.model.role === 'line');
    const explicit = liveEntries.filter(
      (entry) =>
        entry.model.voltageOrigin === undefined || entry.model.voltageOrigin === 'instance',
    );
    const candidates = explicit.length ? explicit : liveEntries;
    const selected = candidates[0]?.model.supply;
    if (selected && candidates.some((entry) => !sameSupplyModel(entry.model.supply, selected))) {
      diagnostics.push({
        code: 'conflicting-source-alias',
        severity: 'error',
        message: `Supply aliases in ${group} declare incompatible voltages/frequencies; no source is selected by array order.`,
      });
      continue;
    }
    const positive = JSON.stringify(['alias', group, 'line']);
    const negative = JSON.stringify(['alias', group, 'neutral']);
    graph.terminals.push(
      {
        id: positive,
        role: selected?.kind === 'dc' ? 'positive' : 'line',
        label: `${group} ${selected?.kind === 'dc' ? '+' : 'L'}`,
      },
      {
        id: negative,
        role: selected?.kind === 'dc' ? 'negative' : 'neutral',
        label: `${group} ${selected?.kind === 'dc' ? '-' : 'N'}`,
      },
    );
    for (const { componentId, model } of entries)
      branch({
        id: JSON.stringify(['alias-link', componentId]),
        kind: 'link',
        from: terminalId(componentId, model.port),
        to: model.role === 'line' ? positive : negative,
        closed: !byId.get(componentId)?.state.isBlown,
        idealConductor: true,
        componentId,
      });
    if (selected) {
      const id = JSON.stringify(['alias-source', group]);
      graph.sources.push({
        id,
        componentIds: entries.map((entry) => entry.componentId),
        positive,
        negative,
        model: selected,
        reference: selected.kind === 'dc' ? 'floating' : 'neutral',
      });
      branch({
        id,
        kind: 'source',
        from: positive,
        to: negative,
        closed: true,
        idealConductor: false,
      });
      graph.references.push({
        terminal: negative,
        kind: selected.kind === 'dc' ? 'dc-negative' : 'neutral',
      });
    }
    coverage.push({
      subjectId: group,
      aspect: 'source',
      status: 'estimated',
      reason:
        'Named rail terminals alias one document supply. Independent source blocks retain their own profiles; no neutral-to-PE bond is assumed.',
    });
  }
  if (diagnostics.some((d) => d.severity === 'error'))
    return { status: 'invalid', ...version, diagnostics };
  for (const wire of circuit.wires)
    branch({
      id: JSON.stringify(['wire', wire.id]),
      kind: 'wire',
      from: terminalId(wire.fromComponentId, wire.fromPortIndex),
      to: terminalId(wire.toComponentId, wire.toPortIndex),
      closed: !wire.isBusted,
      idealConductor: false,
      wireId: wire.id,
      wire: resolveWireProperties(wire, byId),
    });
  const activeFaults = normalizeCircuitFaults(circuit)
    .filter((fault) => !fault.resolved)
    .sort((a, b) => compareIds(a.id, b.id));
  applyGraphFaults(graph, activeFaults, definitions, diagnostics);
  for (const fault of graph.faults)
    coverage.push({
      subjectId: fault.id,
      aspect: 'fault',
      status: fault.coverage,
      reason: fault.effect,
    });
  graph.terminals.sort((a, b) => compareIds(a.id, b.id));
  graph.branches.sort((a, b) => compareIds(a.id, b.id));
  graph.sources.sort((a, b) => compareIds(a.id, b.id));
  graph.references.sort((a, b) => compareIds(a.terminal, b.terminal));
  const ids = graph.terminals.map((t) => t.id);
  const nets = new TerminalGroups(ids);
  const domains = new TerminalGroups(ids);
  for (const edge of graph.branches)
    if (edge.closed) {
      domains.join(edge.from, edge.to);
      if (edge.idealConductor) nets.join(edge.from, edge.to);
    }
  graph.nets = nets.groups();
  graph.domains = domains.groups().map((domain) => ({
    ...domain,
    sourceIds: graph.sources
      .filter((source) => domains.root(source.positive) === domain.id)
      .map((source) => source.id),
  }));
  coverage.push({
    subjectId: 'circuit',
    aspect: 'measurements',
    status: 'not-assessed',
    reason:
      'Compilation and readiness checks do not solve voltage or branch current. Numerical equations start in 1.5C.1.',
  });
  return { status: 'compiled', ...version, circuit, graph, diagnostics, coverage };
}
