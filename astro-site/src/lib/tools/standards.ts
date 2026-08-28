/**
 * standards.ts — Electrical Standards Profiles
 *
 * Single source of truth for the regional wiring standards supported by the
 * ElectraSim toolbox. Metric engines (BS 7671 / IEC 60364) share physical
 * conductor data — BS 7671 Appendix 4 tables are harmonized with
 * IEC 60364-5-52 — but differ in published limits and citations.
 * The US NEC profile uses AWG/kcmil conductors, feet, and NEC Chapter 9 data.
 */

export type StandardId = 'uk-bs7671' | 'iec-60364' | 'us-nec';

/** Standards usable by the shared metric engines. */
export type MetricStandardId = Extract<StandardId, 'uk-bs7671' | 'iec-60364'>;

export interface VoltageDropLimitProfile {
  /** "Good" ceiling — lighting / branch-circuit guidance (%) */
  lightingPct: number;
  /** Hard ceiling — power/other circuits (%) */
  powerPct: number;
  /** Short citation for where the limits come from */
  basis: string;
}

export interface StandardProfile {
  id: StandardId;
  /** Full designation, e.g. "BS 7671:2018+A4:2026" */
  label: string;
  /** Region this standard applies to */
  regionLabel: string;
  /** Compact chip label used on tool cards/badges */
  badge: string;
  /** Full citation rendered next to calculation results (trust/E-E-A-T) */
  citation: string;
  /** Typical nominal voltages for single-phase and three-phase LV supplies */
  defaultVoltages: { single: number; three: number };
  vdrop: VoltageDropLimitProfile;
  conductorUnit: 'mm²' | 'AWG/kcmil';
  lengthUnit: 'm' | 'ft';
}

export const STANDARD_PROFILES: Record<StandardId, StandardProfile> = {
  'uk-bs7671': {
    id: 'uk-bs7671',
    label: 'BS 7671:2018+A4:2026',
    regionLabel: 'United Kingdom',
    badge: 'BS 7671 · UK',
    citation:
      'BS 7671:2018+A4:2026 (IET Wiring Regulations, 18th Edition) — Appendix 4 current-carrying capacities and voltage drop limits: 3% lighting / 5% other circuits from the origin of a public LV supply.',
    defaultVoltages: { single: 230, three: 400 },
    vdrop: {
      lightingPct: 3,
      powerPct: 5,
      basis: 'BS 7671 Appendix 4, Table 4Ab (3% lighting / 5% other circuits)',
    },
    conductorUnit: 'mm²',
    lengthUnit: 'm',
  },
  'iec-60364': {
    id: 'iec-60364',
    label: 'IEC 60364',
    regionLabel: 'International (IEC)',
    badge: 'IEC 60364 · Intl',
    citation:
      'IEC 60364 (international metric) — IEC 60364-5-52 Annex G voltage drop guidance: 4% lighting / 5% other circuits on public LV supplies (6% / 8% on private supplies). Ampacity data harmonized with IEC 60364-5-52 Table B.52.4.',
    defaultVoltages: { single: 230, three: 400 },
    vdrop: {
      lightingPct: 4,
      powerPct: 5,
      basis: 'IEC 60364-5-52 Annex G, Table G.52.1 (4% lighting / 5% other circuits)',
    },
    conductorUnit: 'mm²',
    lengthUnit: 'm',
  },
  'us-nec': {
    id: 'us-nec',
    label: 'US NEC (NFPA 70)',
    regionLabel: 'United States',
    badge: 'NEC · US',
    citation:
      'US NEC (NFPA 70) — NEC 210.19(A) Informational Note No. 4 & 215.2(A)(1) Informational Note No. 2 recommend max 3% drop on any branch circuit or feeder and 5% total. Conductor DC resistance from NEC Chapter 9, Table 8 (stranded, 75 °C). Advisory guidance only — not an enforceable NEC requirement.',
    defaultVoltages: { single: 120, three: 208 },
    vdrop: {
      lightingPct: 3,
      powerPct: 5,
      basis: 'NEC 210.19(A) IN No. 4 & 215.2(A)(1) IN No. 2 (3% advisory / 5% total)',
    },
    conductorUnit: 'AWG/kcmil',
    lengthUnit: 'ft',
  },
};

export function getStandardProfile(id: StandardId | undefined): StandardProfile {
  if (id && id in STANDARD_PROFILES) return STANDARD_PROFILES[id];
  return STANDARD_PROFILES['uk-bs7671'];
}

export function isMetricStandard(id: StandardId | undefined): id is MetricStandardId {
  return id === undefined || id === 'uk-bs7671' || id === 'iec-60364';
}

/** Options for the metrics <select> — UK first, then IEC. NEC is a dedicated page. */
export const METRIC_STANDARD_OPTIONS: MetricStandardId[] = ['uk-bs7671', 'iec-60364'];
