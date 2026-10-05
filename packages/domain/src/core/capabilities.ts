import { COMPONENT_DEFS } from '../components';
import type { Circuit, ComponentDef, ComponentInstance } from '../types';
import {
  CAPABILITY_CATALOGUE_VERSION,
  type CapabilityFamily,
  DEVICE_CAPABILITY_FAMILIES,
} from './capabilityCatalogue';
import { COIL_APPROXIMATION } from './coilModel';
import type { ElectricalDeviceModel, SupplyModel } from './contracts';
import { DIMMER_APPROXIMATION } from './dimmerModel';
import { resolveDeviceModel } from './models';
import { sourceInterface } from './supplies';
import { TIMER_APPROXIMATION } from './timerModel';

export type ElectricalRating<T> =
  | {
      status: 'known';
      value: T;
      provenance: 'instance' | 'catalogue' | 'teaching-assumption';
      basis: string;
    }
  | { status: 'unknown'; reason: string };

export interface TerminalCapability {
  id: string;
  role:
    | 'source'
    | 'reference'
    | 'load'
    | 'coil'
    | 'control-supply'
    | 'contact'
    | 'connection'
    | 'outlet'
    | 'primary'
    | 'secondary'
    | 'unassessed';
  ports: readonly number[];
  /** Each group has its own ratings. A coil never inherits contact voltage/current ratings. */
  supplyKinds: ElectricalRating<readonly SupplyModel['kind'][]>;
  nominalVoltage: ElectricalRating<number>;
  voltageConvention: 'terminal-pair' | 'line-to-line';
  nominalPowerWatts: ElectricalRating<number>;
  maximumVoltage: ElectricalRating<number>;
  currentCapacityAmps: ElectricalRating<number>;
  operatingVoltageRange: ElectricalRating<{ min: number; max: number }>;
  frequencyHz: ElectricalRating<readonly number[]> | { status: 'independent'; basis: string };
  loadLaw:
    | { kind: 'fixed-resistance'; resistanceOhms: number; approximation: string }
    | { kind: 'ideal-transformer'; turnsRatio: number; approximation: string }
    | { kind: 'none' }
    | { kind: 'not-assessed'; reason: string };
}

export interface DeviceCapabilities {
  version: typeof CAPABILITY_CATALOGUE_VERSION;
  componentId: string;
  type: string;
  family: CapabilityFamily;
  sourceControl: 'document-alias' | 'independent' | 'none';
  battery: boolean;
  groups: TerminalCapability[];
  damageModel: { status: 'not-assessed'; reason: string };
}

const unknown = <T>(reason: string): ElectricalRating<T> => ({ status: 'unknown', reason });
const known = <T>(
  value: T,
  provenance: 'instance' | 'catalogue' | 'teaching-assumption',
  basis: string,
): ElectricalRating<T> => ({ status: 'known', value, provenance, basis });

function optionalRating(
  value: number | undefined,
  instance: boolean,
  name: string,
): ElectricalRating<number> {
  return value === undefined || !Number.isFinite(value) || value <= 0
    ? unknown(`No valid ${name} is declared.`)
    : known(
        value,
        instance ? 'instance' : 'catalogue',
        `Declared ${name}; not a thermal or destruction law.`,
      );
}

/** Explicit roles/models feed both candidate placement and compiled-circuit preflight.
 * Missing catalogue data stays unknown; no label parsing or universal voltage buckets.
 */
export function resolveDeviceCapabilities(
  component: ComponentInstance,
  circuit: Circuit,
  def: ComponentDef = COMPONENT_DEFS[component.type] as ComponentDef,
  model?: ElectricalDeviceModel,
): DeviceCapabilities {
  const family = DEVICE_CAPABILITY_FAMILIES[component.type] ?? 'unassessed';
  const source = sourceInterface(component.type);
  const groups: TerminalCapability[] = [];
  const result: DeviceCapabilities = {
    version: CAPABILITY_CATALOGUE_VERSION,
    componentId: component.id,
    type: component.type,
    family,
    sourceControl:
      source === 'line-alias' || source === 'neutral-alias'
        ? 'document-alias'
        : source
          ? 'independent'
          : 'none',
    battery: component.type === 'dc-battery-12v',
    groups,
    damageModel: {
      status: 'not-assessed',
      reason: 'Timing, temperature, interruption and damage laws require the 1.5D device models.',
    },
  };
  if (!def) return result;
  const electrical = model ?? resolveDeviceModel(component, def, circuit);
  const make = (
    id: string,
    role: TerminalCapability['role'],
    ports: readonly number[],
  ): TerminalCapability => {
    const group: TerminalCapability = {
      id,
      role,
      ports: [...ports],
      supplyKinds: unknown('AC/DC and phase suitability are not declared for this terminal group.'),
      nominalVoltage: unknown('No nominal operating voltage is declared for this terminal group.'),
      voltageConvention: 'terminal-pair',
      nominalPowerWatts: unknown('No power consumption is declared for this terminal group.'),
      maximumVoltage: unknown('No maximum voltage is declared for this terminal group.'),
      currentCapacityAmps: unknown('No current capacity is declared for this terminal group.'),
      operatingVoltageRange: unknown('No operating voltage range is declared.'),
      frequencyHz: unknown('No operating frequency range is declared.'),
      loadLaw: { kind: 'none' },
    };
    // Coil/winding ratings cannot be inferred from whole-device contact settings.
    if (role === 'load' || role === 'contact' || role === 'outlet' || role === 'connection') {
      group.maximumVoltage = optionalRating(
        component.state.customMaxVolts ?? def.maxVolts,
        component.state.customMaxVolts !== undefined,
        'maximum voltage',
      );
      group.currentCapacityAmps = optionalRating(
        component.state.customMaxAmps ?? def.maxAmps,
        component.state.customMaxAmps !== undefined,
        'current capacity in amperes',
      );
    }
    groups.push(group);
    return group;
  };
  switch (electrical.kind) {
    case 'source':
    case 'source-alias': {
      const g = make(
        'output',
        'source',
        electrical.kind === 'source' ? electrical.ports : [electrical.port],
      );
      g.supplyKinds = known(
        [electrical.supply.kind],
        'instance',
        'Configured source waveform; source impedance is not yet modeled.',
      );
      break;
    }
    case 'earth-reference':
      make('reference', 'reference', [electrical.port]);
      break;
    case 'resistive-load': {
      const g = make('load', 'load', electrical.ports);
      g.supplyKinds = known(
        electrical.supplyKinds,
        def.electricalModel ? 'catalogue' : 'teaching-assumption',
        electrical.approximation,
      );
      g.nominalVoltage = known(
        electrical.nominalVoltage,
        def.electricalModel
          ? 'catalogue'
          : component.state.customVoltage !== undefined
            ? 'instance'
            : 'teaching-assumption',
        'Fixed element/hot-filament design voltage, independent of the source.',
      );
      g.nominalPowerWatts = known(
        electrical.nominalPowerWatts,
        !def.electricalModel && component.state.customPowerWatts !== undefined
          ? 'instance'
          : 'catalogue',
        'Power at the nominal design voltage, not constant power at arbitrary voltage.',
      );
      g.maximumVoltage = optionalRating(
        electrical.maximumVoltage,
        component.state.customMaxVolts !== undefined,
        'maximum voltage',
      );
      g.frequencyHz = {
        status: 'independent',
        basis: 'Ideal fixed-resistance teaching model; no reactance or temperature variation.',
      };
      if (electrical.frequencyHz)
        g.frequencyHz = known(electrical.frequencyHz, 'catalogue', 'Declared model frequencies.');
      if (electrical.operatingVoltageRange)
        g.operatingVoltageRange = known(
          electrical.operatingVoltageRange,
          'catalogue',
          'Declared model operating range; not a damage threshold.',
        );
      g.loadLaw = {
        kind: 'fixed-resistance',
        resistanceOhms: electrical.resistanceOhms,
        approximation: electrical.approximation,
      };
      break;
    }
    case 'unassessed-load': {
      const g = make('load', 'load', electrical.ports);
      g.maximumVoltage = optionalRating(
        electrical.maximumVoltage,
        component.state.customMaxVolts !== undefined,
        'maximum voltage',
      );
      g.nominalPowerWatts = optionalRating(
        electrical.nominalPowerWatts,
        component.state.customPowerWatts !== undefined,
        'nameplate power',
      );
      g.loadLaw = { kind: 'not-assessed', reason: electrical.reason };
      if (component.state.customVoltage !== undefined)
        g.nominalVoltage = known(
          component.state.customVoltage,
          'instance',
          'Explicit device design voltage; it does not define a load law.',
        );
      if (family === 'mains-electronic-load') {
        g.supplyKinds = known(
          ['ac-single-phase'],
          'teaching-assumption',
          'Existing mains lamp family; DC driver suitability is not declared.',
        );
        if (g.nominalVoltage.status === 'unknown')
          g.nominalVoltage = known(
            230,
            'teaching-assumption',
            'Versioned mains-lamp assumption; driver operating range remains unknown.',
          );
      } else if (family === 'three-phase-load') {
        g.supplyKinds = known(
          ['ac-three-phase'],
          'catalogue',
          'Three-phase motor terminals U/V/W.',
        );
        g.voltageConvention = 'line-to-line';
      }
      if (electrical.nominalVoltage !== undefined)
        g.nominalVoltage = known(
          electrical.nominalVoltage,
          'catalogue',
          'Declared design voltage.',
        );
      if (electrical.supplyKinds)
        g.supplyKinds = known(electrical.supplyKinds, 'catalogue', 'Declared supply suitability.');
      if (electrical.operatingVoltageRange)
        g.operatingVoltageRange = known(
          electrical.operatingVoltageRange,
          'catalogue',
          'Declared operating range; no driver load law is implied.',
        );
      if (electrical.frequencyHz)
        g.frequencyHz = known(electrical.frequencyHz, 'catalogue', 'Declared model frequencies.');
      break;
    }
    case 'contacts':
      electrical.poles.forEach((pole, index) =>
        make(
          `contact:${index}`,
          'contact',
          pole.nc === undefined ? [pole.common, pole.no] : [pole.common, pole.no, pole.nc],
        ),
      );
      if (electrical.coil) {
        const g = make('coil', 'coil', electrical.coil);
        const coil = electrical.coilModel;
        if (coil) {
          g.nominalVoltage = known(
            coil.supply.voltage,
            'instance',
            'Explicit coil nominal voltage, independent of contact ratings.',
          );
          g.nominalPowerWatts = known(
            coil.nominalPowerWatts,
            'instance',
            'Explicit real power at nominal coil voltage.',
          );
          g.supplyKinds = known([coil.supply.kind], 'instance', 'Declared coil waveform.');
          g.frequencyHz =
            coil.supply.kind === 'dc'
              ? { status: 'independent', basis: 'Declared DC resistive coil.' }
              : known([coil.supply.frequencyHz], 'instance', 'Declared AC coil frequency.');
          g.loadLaw = {
            kind: 'fixed-resistance',
            resistanceOhms: coil.supply.voltage ** 2 / coil.nominalPowerWatts,
            approximation: COIL_APPROXIMATION,
          };
        } else
          g.loadLaw = {
            kind: 'not-assessed',
            reason:
              'Coil consumption, pickup/dropout, waveform and nominal voltage are not declared.',
          };
      }
      if (
        electrical.timerModel?.kind === 'interval' &&
        electrical.timerModel.controlSupply &&
        electrical.timerSupplyPorts
      ) {
        const timer = electrical.timerModel.controlSupply;
        const g = make('control-supply', 'control-supply', electrical.timerSupplyPorts);
        g.nominalVoltage = known(
          timer.supply.voltage,
          'instance',
          'Declared timer electronics supply.',
        );
        g.nominalPowerWatts = known(
          timer.nominalPowerWatts,
          'instance',
          'Timer electronics consumption at nominal voltage.',
        );
        g.supplyKinds = known([timer.supply.kind], 'instance', 'Declared timer waveform.');
        g.frequencyHz =
          timer.supply.kind === 'dc'
            ? { status: 'independent', basis: 'Resistive DC control supply.' }
            : known([timer.supply.frequencyHz], 'instance', 'Declared AC timer frequency.');
        g.loadLaw = {
          kind: 'fixed-resistance',
          resistanceOhms: timer.supply.voltage ** 2 / timer.nominalPowerWatts,
          approximation: TIMER_APPROXIMATION,
        };
      }
      if (electrical.dimmer) {
        for (const g of groups) {
          g.supplyKinds = known(['ac-single-phase'], 'teaching-assumption', DIMMER_APPROXIMATION);
          g.frequencyHz = {
            status: 'independent',
            basis:
              'Ideal synchronous switching; frequency-dependent switching behavior is unassessed.',
          };
        }
      }
      if (family === 'controlled-contact' && !electrical.timerModel && !electrical.dimmer) {
        const g = make(
          'control',
          'unassessed',
          def.ports.flatMap((p, i) => (p.type === 'earth' ? [] : [i])),
        );
        g.loadLaw = {
          kind: 'not-assessed',
          reason:
            electrical.limitation ??
            'Control supply consumption and operating behavior are not declared.',
        };
      }
      break;
    case 'selector':
      make('selector', 'contact', [...new Set([...electrical.on, ...electrical.off].flat())]);
      break;
    case 'connections':
      electrical.groups.forEach((ports, index) =>
        make(
          `connection:${index}`,
          def.ports[ports[0] ?? -1]?.type === 'earth' ? 'reference' : 'connection',
          ports,
        ),
      );
      break;
    case 'transformer':
      for (const [role, ports, volts] of [
        ['primary', electrical.primary, electrical.primaryVoltage],
        ['secondary', electrical.secondary, electrical.secondaryVoltage],
      ] as const) {
        const g = make(role, role, ports);
        g.nominalVoltage = known(
          volts,
          'catalogue',
          'Separate isolated winding rating; secondary remains AC without a rectifier.',
        );
        g.supplyKinds = known(['ac-single-phase'], 'catalogue', 'Isolated AC winding.');
        g.loadLaw = {
          kind: 'ideal-transformer',
          turnsRatio: electrical.primaryVoltage / electrical.secondaryVoltage,
          approximation: electrical.approximation,
        };
      }
      break;
    case 'outlet':
      make(
        'outlet',
        'outlet',
        def.ports.flatMap((p, i) => (p.type === 'earth' ? [] : [i])),
      );
      break;
    case 'unassessed': {
      const g = make(
        'unassessed',
        'unassessed',
        def.ports.flatMap((p, i) => (p.type === 'earth' ? [] : [i])),
      );
      g.loadLaw = { kind: 'not-assessed', reason: electrical.reason };
      break;
    }
  }
  return result;
}

export { CAPABILITY_CATALOGUE_VERSION, DEVICE_CAPABILITY_FAMILIES } from './capabilityCatalogue';
