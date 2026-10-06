import type { Circuit, ComponentDef, ComponentInstance } from '../types';
import { DEVICE_CAPABILITY_FAMILIES, RESISTIVE_NOMINAL_VOLTS } from './capabilityCatalogue';
import { copyCoilModel } from './coilModel';
import type { ElectricalDeviceModel, PortPair } from './contracts';
import { copyProtectionModel, protectionModelFitsType } from './protectionModel';
import { DOCUMENT_SUPPLY_ID, resolveSourceProfile } from './supplies';
import { copyTimerModel } from './timerModel';

/** No inference of a resistor from an arbitrary LED/driver/motor's power label. */
export function resolveDeviceModel(
  component: ComponentInstance,
  def: ComponentDef,
  circuit: Circuit,
): ElectricalDeviceModel {
  if (def.electricalModel) return def.electricalModel;
  const { type, state } = component;
  const source = resolveSourceProfile(type, state, circuit);
  const voltageOrigin =
    source?.provenance.voltage === 'explicit' || source?.provenance.voltage === 'legacy-instance'
      ? 'instance'
      : source?.provenance.voltage === 'legacy-document'
        ? 'document'
        : 'catalogue';
  const maximumVoltage = state.customMaxVolts ?? def.maxVolts;
  if ((type === 'live-terminal' || type === 'neutral-terminal') && source) {
    return {
      kind: 'source-alias',
      group: DOCUMENT_SUPPLY_ID,
      role: type === 'live-terminal' ? 'line' : 'neutral',
      port: 0,
      supply: source.model,
      voltageOrigin:
        state.sourceProfile || state.customVoltage !== undefined
          ? 'instance'
          : circuit.supply || circuit.globalVoltage !== undefined
            ? 'document'
            : 'catalogue',
    };
  }
  if (type === 'earth-terminal' || type === 'earth-rod')
    return {
      kind: 'earth-reference',
      port: 0,
      reference: type === 'earth-rod' ? 'electrode' : 'protective-bus',
    };
  if (
    (type === 'ac-mains-supply' || type === 'diesel-generator' || type === 'dc-battery-12v') &&
    source
  ) {
    return {
      kind: 'source',
      ports: [0, 1],
      supply: source.model,
      voltageOrigin,
      ...(source.model.kind === 'dc'
        ? {}
        : { frequencyAssumed: source.provenance.frequency === 'legacy-assumption' }),
    };
  }
  if (def.isSource)
    return {
      kind: 'unassessed',
      reason:
        type === 'solar-pv-panel'
          ? 'PV voltage/current and irradiance are unspecified; a power label is not a voltage source.'
          : 'This source has no declared electrical model.',
    };
  if (type === 'transformer-8v' || type === 'transformer-12v' || type === 'transformer-24v') {
    return {
      kind: 'transformer',
      primary: [0, 1],
      secondary: [2, 3],
      primaryVoltage: 230,
      secondaryVoltage: type === 'transformer-8v' ? 8 : type === 'transformer-12v' ? 12 : 24,
      isolation: 'isolated',
      approximation:
        'Ideal isolated AC windings with fixed turns ratio and lossless power transfer. No rectifier, magnetizing current, winding impedance, saturation or thermal model is declared.',
    };
  }
  if (def.category === 'transformer')
    return {
      kind: 'unassessed',
      reason:
        'The autotransformer has shared windings; an isolated-transformer approximation is not applicable.',
    };
  if (def.isSocket) return { kind: 'outlet', capacityWatts: def.powerWatts, maximumVoltage };
  if (def.isLoad) {
    const ports = def.ports.flatMap((port, i) => (port.type === 'earth' ? [] : [i]));
    const [first, second] = ports;
    const nominalPowerWatts = state.customPowerWatts ?? def.powerWatts;
    if (
      DEVICE_CAPABILITY_FAMILIES[type] === 'resistive-load' &&
      first !== undefined &&
      second !== undefined &&
      ports.length === 2 &&
      nominalPowerWatts !== undefined &&
      nominalPowerWatts > 0
    ) {
      const nominalVoltage = state.customVoltage ?? RESISTIVE_NOMINAL_VOLTS;
      return {
        kind: 'resistive-load',
        ports: [first, second],
        nominalVoltage,
        nominalPowerWatts,
        resistanceOhms: nominalVoltage ** 2 / nominalPowerWatts,
        supplyKinds: ['dc', 'ac-single-phase'],
        maximumVoltage,
        approximation:
          'Fixed resistance at nominal operating temperature; thermostat cycling, cold inrush and temperature dependence are not modeled.',
      };
    }
    return {
      kind: 'unassessed-load',
      ports,
      nominalPowerWatts,
      maximumVoltage,
      reason:
        'No supported voltage/current law is declared for this load; nameplate power is not resistance.',
    };
  }
  if (def.switchContacts)
    return {
      kind: 'contacts',
      poles: def.switchContacts.map((pole) => ({ ...pole })),
      coil: def.coilPorts,
      ...(def.coilPorts && state.coilModel ? { coilModel: copyCoilModel(state.coilModel) } : {}),
      ...(def.coilPorts && !state.coilModel
        ? {
            limitation:
              'Coil voltage, consumption and timing await the device model; only supplied contact state is compiled.',
          }
        : {}),
    };
  if (def.changeover)
    return {
      kind: 'contacts',
      poles: [
        {
          common: def.changeover.commonPortIndex,
          no: def.changeover.onPortIndex,
          nc: def.changeover.offPortIndex,
        },
      ],
    };
  if (type === 'delay-timer')
    return {
      kind: 'contacts',
      poles: [{ common: 2, no: 3 }],
      coil: [0, 1],
      ...(state.coilModel
        ? { coilModel: copyCoilModel(state.coilModel) }
        : { limitation: 'Delay timing and coil consumption are not assessed.' }),
    };
  if (state.timerModel)
    return {
      kind: 'contacts',
      poles: [{ common: 0, no: type === 'countdown-timer' ? 2 : 1 }],
      timerModel: copyTimerModel(state.timerModel),
      ...(type === 'countdown-timer' ? { timerSupplyPorts: [0, 1] as const } : {}),
    };
  if (def.isDimmer)
    return { kind: 'contacts', poles: [{ common: 0, no: 1 }], dimmer: 'synchronous-resistive' };

  if (type === 'intermediate-switch')
    return {
      kind: 'selector',
      on: [
        [0, 2],
        [1, 3],
      ],
      off: [
        [0, 3],
        [1, 2],
      ],
    };
  if (type === 'rotary-selector-switch')
    return {
      kind: 'contacts',
      poles: [{ common: 0, no: 1, nc: 2 }],
      limitation:
        'The saved boolean selects AUTO or MAN; separate automatic control is not modeled.',
    };
  if (type === 'terminal-strip')
    return {
      kind: 'connections',
      groups: [
        [0, 2],
        [1, 3],
      ],
    };
  if (type === 'distribution-board-3phase')
    return {
      kind: 'connections',
      groups: [
        [0, 4],
        [1, 5],
        [2, 6],
      ],
    };
  const groups = (['live', 'neutral', 'earth'] as const).map((role) =>
    def.ports.flatMap((port, index) => (port.type === role ? [index] : [])),
  );
  if (def.isSwitch) {
    const poles = groups
      .filter((group) => def.ports[group[0] ?? -1]?.type !== 'earth')
      .flatMap(([common, ...outputs]) =>
        common === undefined ? [] : outputs.map((no) => ({ common, no })),
      );
    return {
      kind: 'contacts',
      poles,
      fixedGroups: groups.filter((group) => def.ports[group[0] ?? -1]?.type === 'earth'),
      ...(def.isProtection &&
      state.protectionModel &&
      protectionModelFitsType(type, state.protectionModel)
        ? { protectionModel: copyProtectionModel(state.protectionModel) }
        : {}),
      ...(def.isDimmer || def.category === 'timer' || type === 'double-gang-switch'
        ? {
            limitation:
              'Only the saved shared manual contact state is represented; independent controls, dimming and time behavior are not assessed.',
          }
        : {}),
    };
  }
  if (def.isJunction) return { kind: 'connections', groups };
  return { kind: 'unassessed', reason: 'This device has no declared conduction/control model.' };
}

/** Catalogue mistakes and test overrides must not compile dangling graph terminals. */
export function modelPortIndices(model: ElectricalDeviceModel): readonly number[] {
  switch (model.kind) {
    case 'source':
      return [...model.ports, ...(model.phasePorts ?? [])];
    case 'resistive-load':
    case 'unassessed-load':
      return model.ports;
    case 'source-alias':
    case 'earth-reference':
      return [model.port];
    case 'transformer':
      return [...model.primary, ...model.secondary];
    case 'contacts':
      return [
        ...model.poles.flatMap((p) =>
          p.nc === undefined ? [p.common, p.no] : [p.common, p.no, p.nc],
        ),
        ...(model.coil ?? []),
        ...(model.timerSupplyPorts ?? []),
        ...(model.fixedGroups ?? []).flat(),
      ];
    case 'connections':
      return model.groups.flat();
    case 'selector':
      return [...model.on, ...model.off].flat();
    default:
      return [];
  }
}

export function modelPairs(
  model: Extract<ElectricalDeviceModel, { kind: 'selector' }>,
  on: boolean,
): readonly PortPair[] {
  return on ? model.on : model.off;
}
