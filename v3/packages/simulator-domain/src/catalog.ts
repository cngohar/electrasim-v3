import type { ComponentKind, SupplyFamily } from "./model.ts";

export interface SupplyProfile {
  readonly id: SupplyFamily;
  readonly label: string;
  readonly shortLabel: string;
  readonly nominalVoltage: number;
  readonly voltageRange: readonly [number, number];
  readonly frequenciesHz: readonly number[];
  readonly defaultFrequencyHz: number;
  readonly regions: readonly string[];
  readonly context: string;
}

/**
 * Supply profiles describe nominal electrical service only. They deliberately do not claim
 * that countries sharing voltage and frequency also share installation or compliance rules.
 */
export const supplyProfiles = {
  us_110_120: {
    id: "us_110_120",
    label: "US / North America · 110–120 V · 60 Hz",
    shortLabel: "US / North America",
    nominalVoltage: 120,
    voltageRange: [110, 120],
    frequenciesHz: [60],
    defaultFrequencyHz: 60,
    regions: ["United States", "North America"],
    context: "North American 110–120 V supply family; split-phase modeling follows after v0.",
  },
  international_230_240: {
    id: "international_230_240",
    label: "International (including Pakistan) · 220–240 V · 50/60 Hz",
    shortLabel: "International / Pakistan",
    nominalVoltage: 230,
    voltageRange: [220, 240],
    frequenciesHz: [50, 60],
    defaultFrequencyHz: 50,
    regions: ["Pakistan", "IEC-derived international regions"],
    context:
      "Includes Pakistan at 230 V / 50 Hz. Installation rules remain separate jurisdictional data.",
  },
} as const satisfies Record<SupplyFamily, SupplyProfile>;

export const simulatorProductPolicy = {
  freeSavedProjectLimit: 5,
  proSavedProjectLimit: null,
  basicFeaturesRemainFree: true,
} as const;

export interface ComponentCatalogEntry {
  readonly kind: ComponentKind;
  readonly label: string;
  readonly form: string;
  readonly free: boolean;
}

export const componentCatalog = {
  supply: { kind: "supply", label: "AC supply", form: "distribution source", free: true },
  breaker: {
    kind: "breaker",
    label: "Protective breaker",
    form: "protective module",
    free: true,
  },
  residual_device: {
    kind: "residual_device",
    label: "RCD / GFCI",
    form: "residual protective module",
    free: true,
  },
  insulation_monitor: {
    kind: "insulation_monitor",
    label: "Insulation monitor",
    form: "IT-system monitoring relay",
    free: true,
  },
  conductor: { kind: "conductor", label: "Branch conductor", form: "insulated cable", free: true },
  resistive_load: {
    kind: "resistive_load",
    label: "Resistive load",
    form: "lamp/load enclosure",
    free: true,
  },
  reactive_load: {
    kind: "reactive_load",
    label: "Reactive load",
    form: "inductive / capacitive load",
    free: true,
  },
  coil: { kind: "coil", label: "Control coil", form: "relay / contactor coil", free: true },
  motor: { kind: "motor", label: "AC motor", form: "rotating machine", free: true },
  switch: { kind: "switch", label: "Switch", form: "rocker control", free: true },
  relay_contact: {
    kind: "relay_contact",
    label: "Relay contact",
    form: "control contact",
    free: true,
  },
  contactor: { kind: "contactor", label: "Contactor", form: "power contactor", free: true },
  socket_outlet: {
    kind: "socket_outlet",
    label: "Socket / outlet",
    form: "regional outlet assembly",
    free: true,
  },
  junction: { kind: "junction", label: "Junction", form: "connection node", free: true },
  busbar: { kind: "busbar", label: "Neutral / earth bar", form: "distribution bar", free: true },
  voltmeter: { kind: "voltmeter", label: "Digital voltmeter", form: "two-lead meter", free: true },
  ammeter: { kind: "ammeter", label: "Series ammeter", form: "low-burden meter", free: true },
  clamp_meter: {
    kind: "clamp_meter",
    label: "Clamp meter",
    form: "non-invasive current meter",
    free: true,
  },
  enclosure: {
    kind: "enclosure",
    label: "Distribution enclosure",
    form: "consumer unit / service panel",
    free: true,
  },
} as const satisfies Record<ComponentKind, ComponentCatalogEntry>;

export function getSupplyProfile(family: SupplyFamily): SupplyProfile {
  return supplyProfiles[family];
}
