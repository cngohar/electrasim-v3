/** Toolbox models have richer cable/temperature inputs than the simulator.
 * They share reference metadata, not a claim of identical numerical coverage.
 */
import {
  STANDARD_METADATA,
  type StandardMetadata,
} from '../../../../src/domain/standardsReferences';

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
  /** Ceilings permitted on a private LV supply (IEC 60364 / BS 7671: 6% / 8%) */
  privateLightingPct?: number;
  privatePowerPct?: number;
  /**
   * IEC 60364-5-52 Annex G: main wiring runs longer than 100 m may raise the
   * ceiling by `longRunAllowancePerMetrePct` per metre beyond
   * `longRunAllowanceStartM`, up to `longRunAllowanceCapPct`.
   */
  longRunAllowancePerMetrePct?: number;
  longRunAllowanceStartM?: number;
  longRunAllowanceCapPct?: number;
}

export interface StandardProfile {
  id: StandardId;
  metadata: StandardMetadata;
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
    metadata: STANDARD_METADATA.uk,
    label: 'BS 7671:2018+A4:2026',
    regionLabel: 'United Kingdom',
    badge: 'BS 7671 · UK',
    citation:
      'BS 7671:2018+A4:2026 (IET Wiring Regulations, 18th Edition) — Regulation 525.1 and Appendix 4 Table 4Ab: 3% lighting / 5% other uses, measured from the origin of the installation for a public LV supply (6% / 8% from a private LV supply). Existing Appendix 4 teaching tables; full A4 numerical verification remains pending. A2:2022 with A3:2024 remains valid until 15 October 2026.',
    defaultVoltages: { single: 230, three: 400 },
    vdrop: {
      lightingPct: 3,
      powerPct: 5,
      basis:
        'BS 7671 Reg 525.1 / Appendix 4 Table 4Ab (3% lighting, 5% other uses; 6% / 8% private LV supply)',
    },
    conductorUnit: 'mm²',
    lengthUnit: 'm',
  },
  'iec-60364': {
    id: 'iec-60364',
    metadata: STANDARD_METADATA.int,
    label: 'IEC 60364',
    regionLabel: 'International (IEC)',
    badge: 'IEC 60364 · Intl',
    citation:
      'IEC 60364 (international metric) — IEC 60364-5-52 Annex G, Table G.52.1 voltage-drop guidance: 3% lighting / 5% other uses from a public LV supply, 6% / 8% from a private LV supply, with up to +0.5% allowed on runs over 100 m (0.005% per metre). Informative only — national annexes vary. Uses an existing metric cable model; national table equivalence is not verified.',
    defaultVoltages: { single: 230, three: 400 },
    vdrop: {
      // Table G.52.1 (Annex G) — 3 % lighting / 5 % other uses on a public LV
      // supply. The long-standing "4 %" figure quoted by some vendor guides is
      // not the table value: it mixes the Annex G allowance for runs over 100 m
      // (0.005 % per metre, capped at +0.5 %) into the lighting ceiling.
      lightingPct: 3,
      powerPct: 5,
      privateLightingPct: 6,
      privatePowerPct: 8,
      longRunAllowancePerMetrePct: 0.005,
      longRunAllowanceStartM: 100,
      longRunAllowanceCapPct: 0.5,
      basis:
        'IEC 60364-5-52 Annex G, Table G.52.1 (3% lighting / 5% other uses on public LV supplies; 6% / 8% private, +0.005%/m over 100 m up to +0.5%)',
    },
    conductorUnit: 'mm²',
    lengthUnit: 'm',
  },
  'us-nec': {
    id: 'us-nec',
    metadata: STANDARD_METADATA.us,
    label: 'NFPA 70-2026 (NEC) teaching profile',
    regionLabel: 'United States',
    badge: 'NEC · US',
    citation:
      'US NEC (NFPA 70) — NEC 210.19(A) Informational Note No. 4 & 215.2(A)(1) Informational Note No. 2 recommend max 3% drop on any branch circuit or feeder and 5% total. Conductor DC resistance from NEC Chapter 9, Table 8 (stranded, 75 °C). Advisory guidance only — general advisory guidance; specific applications and local adoption may impose requirements. Numerical tables and clause numbering have not been fully reverified for NEC 2026.',
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
