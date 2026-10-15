import type { ComponentDef, ComponentState } from '../types';

export const LAMP_TYPES = [
  'bulb',
  'bulb-cfl',
  'bulb-smart-rgb',
  'led-downlight',
  'tube-light',
] as const;
const MOTOR_TYPES = [
  'ceiling-fan',
  'extractor-fan',
  'industrial-exhaust-fan',
  'table-fan',
  'motor',
  'water-pump',
  'extractor-hood',
  'fridge-freezer',
];
const ELECTRONIC_TYPES = ['air-conditioner', 'induction-hob', 'ev-charger', 'heat-pump'];
const COMPOSITE_TYPES = ['dishwasher', 'washing-machine', 'tumble-dryer'];
const SOUNDER_TYPES = ['bell', 'electric-buzzer', 'wireless-doorbell', 'alarm-siren'];
const ALARM_TYPES = ['smoke-alarm', 'burglar-alarm'];
const APPLIANCE_TYPES = new Set([
  ...MOTOR_TYPES,
  ...ELECTRONIC_TYPES,
  ...COMPOSITE_TYPES,
  ...SOUNDER_TYPES,
  ...ALARM_TYPES,
]);
const nominalBand = (v: number) => ({
  min: Number((0.9 * v).toPrecision(12)),
  max: Number((1.1 * v).toPrecision(12)),
});

export interface ProfileProvenance {
  kind: 'teaching-assumption';
  profileId: string;
  revision: 1;
  overrides: ('nominalVoltage' | 'inputPowerWatts' | 'operatingVoltageRange')[];
}
export interface ElectronicLoadProfile {
  version: 1;
  kind: 'regulated-input-power';
  provenance: ProfileProvenance;
  nominalVoltage: number;
  inputPowerWatts: number;
  operatingVoltageRange: { min: number; max: number };
  operatingRangeOrigin: 'nominal-ratio' | 'instance';
  supply: { kind: 'ac-single-phase'; frequencyHz: number[] };
  powerFactorModel: 'ideal-unity';
  offPowerWatts: 0;
  dimming: 'unassessed';
}
interface GenericProfile {
  version: 1;
  provenance: 'editable-teaching-assumption';
}
export type ApplianceMode =
  | 'off'
  | 'standby'
  | 'active'
  | 'heating'
  | 'motor'
  | 'combined'
  | 'alarm';
export interface ApplianceProfile extends GenericProfile {
  kind: 'appliance';
  law: 'running-impedance' | 'regulated-power' | 'composite';
  nominalVoltage: number;
  inputPowerWatts: number;
  displacementPowerFactor: number;
  operatingVoltageRange: { min: number; max: number };
  frequencyHz: number[];
  mode: ApplianceMode;
  standbyPowerWatts: number;
  alarmPowerWatts: number;
  heatingFraction: number;
}
export interface PvProfile extends GenericProfile {
  kind: 'photovoltaic';
  openCircuitVoltage: number;
  shortCircuitAmps: number;
  maximumPowerVoltage: number;
  maximumPowerAmps: number;
  irradianceWattsPerM2: number;
  temperatureC: number;
  currentTemperatureCoefficient: number;
  voltageTemperatureCoefficient: number;
}
export interface NtcProfile extends GenericProfile {
  kind: 'ntc';
  resistanceAt25Ohms: number;
  betaKelvin: number;
  temperatureC: number;
}
export interface SpdProfile extends GenericProfile {
  kind: 'spd';
  leakageResistanceOhms: number;
  dynamicResistanceOhms: number;
  rmsClampVoltage: number;
  dcClampVoltage: number;
}
export interface AutoTransformerProfile extends GenericProfile {
  kind: 'autotransformer';
  lowTapVoltage: number;
  highTapVoltage: number;
}
export type CatalogueProfile =
  | ApplianceProfile
  | PvProfile
  | NtcProfile
  | SpdProfile
  | AutoTransformerProfile;
export type DeviceProfile = ElectronicLoadProfile | CatalogueProfile;

export const PROFILE_LIMITATION =
  'Editable steady-state teaching profile. No measured product identity, harmonic/inrush waveform, shaft output, thermal dynamics, protocol, certification or implicit damage threshold.';

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown, min = 0.001, max = 100_000): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const keys = (r: Record<string, unknown>, names: string[]) =>
  Object.keys(r).length === names.length && Object.keys(r).every((k) => names.includes(k));
const range = (value: unknown, nominal: number) =>
  record(value) &&
  keys(value, ['min', 'max']) &&
  finite(value.min) &&
  finite(value.max) &&
  value.min <= nominal &&
  nominal <= value.max;
const frequencies = (v: unknown) =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= 2 &&
  new Set(v).size === v.length &&
  v.every((n) => n === 50 || n === 60);

export const isLampType = (type: string) => (LAMP_TYPES as readonly string[]).includes(type);
export function catalogueProfileKind(type: string): CatalogueProfile['kind'] | null {
  if (APPLIANCE_TYPES.has(type)) return 'appliance';
  const special: Record<string, CatalogueProfile['kind']> = {
    'solar-pv-panel': 'photovoltaic',
    'temperature-sensor': 'ntc',
    spd: 'spd',
    'step-up-down-transformer': 'autotransformer',
  };
  return special[type] ?? null;
}
export function isElectronicLoadProfile(value: unknown): value is ElectronicLoadProfile {
  if (
    !record(value) ||
    !keys(value, [
      'version',
      'kind',
      'provenance',
      'nominalVoltage',
      'inputPowerWatts',
      'operatingVoltageRange',
      'operatingRangeOrigin',
      'supply',
      'powerFactorModel',
      'offPowerWatts',
      'dimming',
    ])
  )
    return false;
  const p = value.provenance;
  const s = value.supply;
  if (
    !record(p) ||
    !keys(p, ['kind', 'profileId', 'revision', 'overrides']) ||
    p.kind !== 'teaching-assumption' ||
    p.profileId !== 'generic-mains-lamp' ||
    p.revision !== 1 ||
    !Array.isArray(p.overrides) ||
    new Set(p.overrides).size !== p.overrides.length ||
    !p.overrides.every((x) =>
      ['nominalVoltage', 'inputPowerWatts', 'operatingVoltageRange'].includes(x),
    )
  )
    return false;
  if (
    !(
      value.version === 1 &&
      value.kind === 'regulated-input-power' &&
      finite(value.nominalVoltage) &&
      finite(value.inputPowerWatts) &&
      range(value.operatingVoltageRange, value.nominalVoltage) &&
      record(s) &&
      keys(s, ['kind', 'frequencyHz']) &&
      s.kind === 'ac-single-phase' &&
      frequencies(s.frequencyHz) &&
      value.powerFactorModel === 'ideal-unity' &&
      value.offPowerWatts === 0 &&
      value.dimming === 'unassessed'
    )
  )
    return false;
  if (value.operatingRangeOrigin === 'instance')
    return p.overrides.includes('operatingVoltageRange');
  const r = value.operatingVoltageRange as { min: number; max: number };
  return (
    value.operatingRangeOrigin === 'nominal-ratio' &&
    Math.abs(r.min - 0.9 * value.nominalVoltage) <= 1e-9 * value.nominalVoltage &&
    Math.abs(r.max - 1.1 * value.nominalVoltage) <= 1e-9 * value.nominalVoltage
  );
}
export function isCatalogueProfile(value: unknown): value is CatalogueProfile {
  if (!record(value) || value.version !== 1 || value.provenance !== 'editable-teaching-assumption')
    return false;
  const base = ['version', 'provenance', 'kind'];
  switch (value.kind) {
    case 'appliance':
      return (
        keys(value, [
          ...base,
          'law',
          'nominalVoltage',
          'inputPowerWatts',
          'displacementPowerFactor',
          'operatingVoltageRange',
          'frequencyHz',
          'mode',
          'standbyPowerWatts',
          'alarmPowerWatts',
          'heatingFraction',
        ]) &&
        ['running-impedance', 'regulated-power', 'composite'].includes(value.law as string) &&
        finite(value.nominalVoltage) &&
        finite(value.inputPowerWatts) &&
        finite(value.displacementPowerFactor, 0.1, 1) &&
        range(value.operatingVoltageRange, value.nominalVoltage) &&
        frequencies(value.frequencyHz) &&
        ['off', 'standby', 'active', 'heating', 'motor', 'combined', 'alarm'].includes(
          value.mode as string,
        ) &&
        finite(value.standbyPowerWatts, 0) &&
        finite(value.alarmPowerWatts, 0) &&
        finite(value.heatingFraction, 0, 1)
      );
    case 'photovoltaic': {
      if (
        !keys(value, [
          ...base,
          'openCircuitVoltage',
          'shortCircuitAmps',
          'maximumPowerVoltage',
          'maximumPowerAmps',
          'irradianceWattsPerM2',
          'temperatureC',
          'currentTemperatureCoefficient',
          'voltageTemperatureCoefficient',
        ]) ||
        !finite(value.openCircuitVoltage) ||
        !finite(value.shortCircuitAmps) ||
        !finite(value.maximumPowerVoltage) ||
        !finite(value.maximumPowerAmps) ||
        value.maximumPowerVoltage >= value.openCircuitVoltage ||
        value.maximumPowerAmps >= value.shortCircuitAmps ||
        !finite(value.irradianceWattsPerM2, 0, 2000) ||
        !finite(value.temperatureC, -40, 125) ||
        !finite(value.currentTemperatureCoefficient, -0.01, 0.01) ||
        !finite(value.voltageTemperatureCoefficient, -0.01, 0.01)
      )
        return false;
      return (
        1 + value.currentTemperatureCoefficient * (value.temperatureC - 25) > 0 &&
        1 + value.voltageTemperatureCoefficient * (value.temperatureC - 25) > 0
      );
    }
    case 'ntc':
      return (
        keys(value, [...base, 'resistanceAt25Ohms', 'betaKelvin', 'temperatureC']) &&
        finite(value.resistanceAt25Ohms, 0.001, 1e9) &&
        finite(value.betaKelvin, 1, 10_000) &&
        finite(value.temperatureC, -40, 125)
      );
    case 'spd':
      return (
        keys(value, [
          ...base,
          'leakageResistanceOhms',
          'dynamicResistanceOhms',
          'rmsClampVoltage',
          'dcClampVoltage',
        ]) &&
        finite(value.leakageResistanceOhms, 1, 1e12) &&
        finite(value.dynamicResistanceOhms, 0.001, 1e6) &&
        finite(value.rmsClampVoltage) &&
        finite(value.dcClampVoltage)
      );
    case 'autotransformer':
      return (
        keys(value, [...base, 'lowTapVoltage', 'highTapVoltage']) &&
        finite(value.lowTapVoltage) &&
        finite(value.highTapVoltage) &&
        value.lowTapVoltage < value.highTapVoltage
      );
    default:
      return false;
  }
}
export function profileFitsType(type: string, profile: CatalogueProfile) {
  if (catalogueProfileKind(type) !== profile.kind) return false;
  if (profile.kind !== 'appliance') return true;
  return (
    profile.law ===
    (MOTOR_TYPES.includes(type)
      ? 'running-impedance'
      : COMPOSITE_TYPES.includes(type)
        ? 'composite'
        : 'regulated-power')
  );
}
export function copyProfile<T extends DeviceProfile>(profile: T): T {
  return JSON.parse(JSON.stringify(profile)) as T;
}
export function defaultLampProfile(
  def: ComponentDef,
  state: ComponentState,
): ElectronicLoadProfile {
  const nominalVoltage = state.customVoltage ?? 230;
  return {
    version: 1,
    kind: 'regulated-input-power',
    provenance: {
      kind: 'teaching-assumption',
      profileId: 'generic-mains-lamp',
      revision: 1,
      overrides: [
        ...(state.customVoltage !== undefined ? ['nominalVoltage' as const] : []),
        ...(state.customPowerWatts !== undefined ? ['inputPowerWatts' as const] : []),
      ],
    },
    nominalVoltage,
    inputPowerWatts: state.customPowerWatts ?? def.powerWatts ?? 9,
    operatingVoltageRange: nominalBand(nominalVoltage),
    operatingRangeOrigin: 'nominal-ratio',
    supply: { kind: 'ac-single-phase', frequencyHz: [50, 60] },
    powerFactorModel: 'ideal-unity',
    offPowerWatts: 0,
    dimming: 'unassessed',
  };
}
export function defaultCatalogueProfile(
  type: string,
  def: ComponentDef,
  state: ComponentState,
): CatalogueProfile | undefined {
  const base = { version: 1 as const, provenance: 'editable-teaching-assumption' as const };
  switch (catalogueProfileKind(type)) {
    case 'appliance': {
      const nominalVoltage = state.customVoltage ?? 230;
      const inputPowerWatts = state.customPowerWatts ?? def.powerWatts ?? 1;
      return {
        ...base,
        kind: 'appliance',
        law: MOTOR_TYPES.includes(type)
          ? 'running-impedance'
          : COMPOSITE_TYPES.includes(type)
            ? 'composite'
            : 'regulated-power',
        nominalVoltage,
        inputPowerWatts,
        displacementPowerFactor:
          MOTOR_TYPES.includes(type) || COMPOSITE_TYPES.includes(type) ? 0.8 : 1,
        operatingVoltageRange: nominalBand(nominalVoltage),
        frequencyHz: MOTOR_TYPES.includes(type) || COMPOSITE_TYPES.includes(type) ? [50] : [50, 60],
        mode:
          ALARM_TYPES.includes(type) || type === 'wireless-doorbell'
            ? 'standby'
            : COMPOSITE_TYPES.includes(type)
              ? 'combined'
              : 'active',
        standbyPowerWatts: ALARM_TYPES.includes(type) ? inputPowerWatts : 1,
        alarmPowerWatts: 2 * inputPowerWatts,
        heatingFraction: 0.8,
      };
    }
    case 'photovoltaic':
      return {
        ...base,
        kind: 'photovoltaic',
        openCircuitVoltage: 40,
        shortCircuitAmps: 14,
        maximumPowerVoltage: 32,
        maximumPowerAmps: 12.5,
        irradianceWattsPerM2: 1000,
        temperatureC: 25,
        currentTemperatureCoefficient: 0,
        voltageTemperatureCoefficient: 0,
      };
    case 'ntc':
      return {
        ...base,
        kind: 'ntc',
        resistanceAt25Ohms: 10_000,
        betaKelvin: 3950,
        temperatureC: 25,
      };
    case 'spd':
      return {
        ...base,
        kind: 'spd',
        leakageResistanceOhms: 1_000_000,
        dynamicResistanceOhms: 10,
        rmsClampVoltage: 300,
        dcClampVoltage: 300,
      };
    case 'autotransformer':
      return { ...base, kind: 'autotransformer', lowTapVoltage: 110, highTapVoltage: 230 };
    default:
      return undefined;
  }
}

/** One coherent edit used by the Inspector and store; never rewrites the supply. */
export function editProfileNameplate(
  state: ComponentState,
  updates: Partial<ComponentState>,
): Partial<ComponentState> {
  const result = { ...updates };
  if (state.electronicLoadProfile && !Object.hasOwn(updates, 'electronicLoadProfile')) {
    const profile = copyProfile(state.electronicLoadProfile);
    const changed = new Set(profile.provenance.overrides);
    if (updates.customVoltage !== undefined) {
      profile.nominalVoltage = updates.customVoltage;
      changed.add('nominalVoltage');
      if (profile.operatingRangeOrigin === 'nominal-ratio')
        profile.operatingVoltageRange = nominalBand(updates.customVoltage);
    }
    if (updates.customPowerWatts !== undefined) {
      profile.inputPowerWatts = updates.customPowerWatts;
      changed.add('inputPowerWatts');
    }
    profile.provenance.overrides = [...changed].sort();
    result.electronicLoadProfile = profile;
  }
  if (state.catalogueProfile?.kind === 'appliance' && !Object.hasOwn(updates, 'catalogueProfile')) {
    const profile = copyProfile(state.catalogueProfile);
    if (updates.customVoltage !== undefined) {
      const ratio = updates.customVoltage / profile.nominalVoltage;
      profile.nominalVoltage = updates.customVoltage;
      profile.operatingVoltageRange = {
        min: profile.operatingVoltageRange.min * ratio,
        max: profile.operatingVoltageRange.max * ratio,
      };
    }
    if (updates.customPowerWatts !== undefined) profile.inputPowerWatts = updates.customPowerWatts;
    result.catalogueProfile = profile;
  }
  const profile =
    result.electronicLoadProfile ??
    (result.catalogueProfile?.kind === 'appliance' ? result.catalogueProfile : undefined);
  if (profile) {
    if (state.customVoltage !== undefined || updates.customVoltage !== undefined)
      result.customVoltage = profile.nominalVoltage;
    if (state.customPowerWatts !== undefined || updates.customPowerWatts !== undefined)
      result.customPowerWatts = profile.inputPowerWatts;
  }
  return result;
}

export interface DemandLaw {
  kind: 'demand';
  constantPowerWatts: number;
  conductance: number;
  susceptance: number;
  nominalVoltage: number;
  nominalPowerWatts: number;
  operatingVoltageRange: { min: number; max: number };
  frequencyHz: number[];
  mode: string;
}
export type ProfileBranchLaw =
  | DemandLaw
  | { kind: 'pv'; profile: PvProfile }
  | { kind: 'spd'; profile: SpdProfile }
  | { kind: 'ntc'; profile: NtcProfile };
export function profileBranchLaw(profile: DeviceProfile): ProfileBranchLaw | null {
  if (profile.kind === 'autotransformer') return null;
  if (profile.kind === 'photovoltaic') return { kind: 'pv', profile };
  if (profile.kind === 'spd' || profile.kind === 'ntc')
    return { kind: profile.kind, profile } as ProfileBranchLaw;
  if (profile.kind === 'regulated-input-power')
    return {
      kind: 'demand',
      constantPowerWatts: profile.inputPowerWatts,
      conductance: 0,
      susceptance: 0,
      nominalVoltage: profile.nominalVoltage,
      nominalPowerWatts: profile.inputPowerWatts,
      operatingVoltageRange: profile.operatingVoltageRange,
      frequencyHz: profile.supply.frequencyHz,
      mode: 'active',
    };
  let constantPowerWatts = 0;
  let realEquivalent = 0;
  let reactiveEquivalent = 0;
  const p = profile.inputPowerWatts;
  const q =
    (p * Math.sqrt(1 - profile.displacementPowerFactor ** 2)) / profile.displacementPowerFactor;
  if (profile.mode === 'standby') constantPowerWatts = profile.standbyPowerWatts;
  else if (profile.mode === 'alarm') constantPowerWatts = profile.alarmPowerWatts;
  else if (profile.mode !== 'off') {
    if (profile.law === 'regulated-power') constantPowerWatts = p;
    else if (profile.law === 'running-impedance') {
      realEquivalent = p;
      reactiveEquivalent = q;
    } else if (profile.mode === 'heating') realEquivalent = p;
    else if (profile.mode === 'motor') {
      realEquivalent = p;
      reactiveEquivalent = q;
    } else {
      realEquivalent = p;
      reactiveEquivalent = (1 - profile.heatingFraction) * q;
    }
  }
  return {
    kind: 'demand',
    constantPowerWatts,
    conductance: realEquivalent / profile.nominalVoltage ** 2,
    susceptance: -reactiveEquivalent / profile.nominalVoltage ** 2,
    nominalVoltage: profile.nominalVoltage,
    nominalPowerWatts: p,
    operatingVoltageRange: profile.operatingVoltageRange,
    frequencyHz: profile.frequencyHz,
    mode: profile.mode,
  };
}

export function ntcResistance(profile: NtcProfile) {
  const exponent = profile.betaKelvin * (1 / (profile.temperatureC + 273.15) - 1 / 298.15);
  // The validated beta/temperature domain bounds this exponent to [-8.5, 9.4].
  // Math.exp differs by a last bit between deployed V8/JSC versions. Fixed
  // range reduction and 20 Taylor terms agree across runtimes without rounding
  // measurements or altering the law; reference tests bound relative error.
  const binaryExponent = Math.round(exponent / Math.LN2);
  const remainder = exponent - binaryExponent * Math.LN2;
  let term = 1;
  let sum = 1;
  for (let n = 1; n <= 20; n++) {
    term *= remainder / n;
    sum += term;
  }
  return profile.resistanceAt25Ohms * sum * 2 ** binaryExponent;
}
