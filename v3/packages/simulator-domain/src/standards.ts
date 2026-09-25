export type StandardsClaim = "shared_physics" | "standards_envelope" | "educational";

export interface StandardReference {
  readonly id: string;
  readonly title: string;
  readonly edition: string;
  readonly publisher: string;
  readonly url: string;
  readonly claim: StandardsClaim;
  readonly reviewedAt: string;
}

/** Public source metadata. Licensed standard text is not copied into the application. */
export const standardReferences = {
  iec60364: {
    id: "IEC 60364-1:2025",
    title: "Low-voltage electrical installations — fundamental principles",
    edition: "6.0",
    publisher: "IEC",
    url: "https://webstore.iec.ch/en/publication/63699",
    claim: "standards_envelope",
    reviewedAt: "2026-09-25",
  },
  iec60898: {
    id: "IEC 60898-1:2015+A1:2019",
    title: "Circuit-breakers for overcurrent protection for household and similar installations",
    edition: "2.0 consolidated amendment context",
    publisher: "IEC",
    url: "https://webstore.iec.ch/en/publication/62129",
    claim: "standards_envelope",
    reviewedAt: "2026-09-25",
  },
  iec61008: {
    id: "IEC 61008-2-1:2024",
    title: "RCCBs for household and similar uses",
    edition: "2.0",
    publisher: "IEC",
    url: "https://webstore.iec.ch/en/publication/67976",
    claim: "standards_envelope",
    reviewedAt: "2026-09-25",
  },
  ul489: {
    id: "UL 489",
    title: "Molded-case circuit breakers, switches and enclosures",
    edition: "manufacturer-listed device curve required",
    publisher: "UL Solutions",
    url: "https://www.shopulstandards.com/ProductDetail.aspx?productId=UL489",
    claim: "educational",
    reviewedAt: "2026-09-25",
  },
  ul943ClassA: {
    id: "UL 943 Class A",
    title: "Ground-fault circuit interrupters",
    edition: "5 mA ± 1 mA public OSHA description",
    publisher: "UL / OSHA public guidance",
    url: "https://www.osha.gov/sites/default/files/ElectrHaz_ActivityOptAB.pdf",
    claim: "standards_envelope",
    reviewedAt: "2026-09-25",
  },
} as const satisfies Record<string, StandardReference>;

export interface EarthingProfile {
  readonly id: "TN-S" | "TN-C-S" | "TT" | "IT" | "north_american_grounded";
  readonly neutralEarthRelationship: string;
  readonly faultReturnPath: string;
  readonly kernelSupport: "fault_loop_supported" | "topology_only_not_evaluated";
  readonly installationCompliance: "not_evaluated";
}

/** Profiles stay distinct even where v0.1 intentionally declines an installation-rule verdict. */
export const earthingProfiles = {
  "TN-S": {
    id: "TN-S",
    neutralEarthRelationship: "source bond with separate neutral and protective conductors",
    faultReturnPath: "metallic protective conductor to source",
    kernelSupport: "fault_loop_supported",
    installationCompliance: "not_evaluated",
  },
  "TN-C-S": {
    id: "TN-C-S",
    neutralEarthRelationship: "combined PEN upstream, separate N and PE downstream",
    faultReturnPath: "downstream PE through PEN to source bond",
    kernelSupport: "fault_loop_supported",
    installationCompliance: "not_evaluated",
  },
  TT: {
    id: "TT",
    neutralEarthRelationship: "source electrode and independent installation electrode",
    faultReturnPath: "installation electrode and earth to source electrode",
    kernelSupport: "fault_loop_supported",
    installationCompliance: "not_evaluated",
  },
  IT: {
    id: "IT",
    neutralEarthRelationship: "source isolated from earth or connected through impedance",
    faultReturnPath: "first-fault leakage/impedance path; second fault is separately modeled",
    kernelSupport: "fault_loop_supported",
    installationCompliance: "not_evaluated",
  },
  north_american_grounded: {
    id: "north_american_grounded",
    neutralEarthRelationship:
      "grounded conductor bonded at service/source; equipment grounding conductor downstream",
    faultReturnPath: "equipment grounding/bonding path to source",
    kernelSupport: "fault_loop_supported",
    installationCompliance: "not_evaluated",
  },
} as const satisfies Record<EarthingProfile["id"], EarthingProfile>;

export type RulePackId =
  | "iec_international_educational_2025"
  | "uk_bs7671_separate_review_required"
  | "us_nec_2026_educational";

export interface RulePack {
  readonly id: RulePackId;
  readonly label: string;
  readonly supplyFamily: "us_110_120" | "international_230_240";
  readonly regions: readonly string[];
  readonly references: readonly string[];
  readonly complianceStatus: "educational_not_certified";
}

export const rulePacks = {
  iec_international_educational_2025: {
    id: "iec_international_educational_2025",
    label: "IEC-derived international educational rules (includes Pakistan supply context)",
    supplyFamily: "international_230_240",
    regions: ["Pakistan", "international IEC-derived contexts"],
    references: [
      standardReferences.iec60364.id,
      standardReferences.iec60898.id,
      standardReferences.iec61008.id,
    ],
    complianceStatus: "educational_not_certified",
  },
  uk_bs7671_separate_review_required: {
    id: "uk_bs7671_separate_review_required",
    label: "United Kingdom rules — separate BS 7671 review required",
    supplyFamily: "international_230_240",
    regions: ["United Kingdom"],
    references: [standardReferences.iec60364.id],
    complianceStatus: "educational_not_certified",
  },
  us_nec_2026_educational: {
    id: "us_nec_2026_educational",
    label: "United States NEC/UL educational rules",
    supplyFamily: "us_110_120",
    regions: ["United States"],
    references: [standardReferences.ul489.id, standardReferences.ul943ClassA.id],
    complianceStatus: "educational_not_certified",
  },
} as const satisfies Record<RulePackId, RulePack>;

export type BreakerProtectionModel =
  | {
      readonly family: "iec_60898_1";
      readonly curve: "B" | "C" | "D";
      readonly referenceId: typeof standardReferences.iec60898.id;
      readonly claim: "standards_envelope";
    }
  | {
      /** Import-only compatibility model. It carries no product-standard or compliance claim. */
      readonly family: "legacy_educational_inverse_time";
      readonly tripSecondsAt200Percent: number;
      readonly referenceId: "legacy:v1-generic-inverse-time-not-a-standard";
      readonly claim: "educational";
    }
  | {
      readonly family: "manufacturer_curve";
      readonly productStandard: "UL 489" | "IEC 60947-2";
      readonly manufacturer: string;
      readonly curveId: string;
      readonly points: readonly {
        readonly currentMultiple: number;
        readonly maxTripSeconds: number;
      }[];
      readonly referenceId: string;
      readonly claim: "educational";
    };

export interface TripEvaluation {
  readonly shouldTrip: boolean;
  readonly maximumTripSeconds: number | null;
  readonly mechanism: "none" | "thermal" | "magnetic" | "manufacturer_curve";
  readonly claim: StandardsClaim;
  readonly referenceId: string;
}

/**
 * Conservative upper-envelope evaluation. IEC points use public manufacturer guidance for
 * IEC 60898-1: 1.13 In no-trip conventional point, 1.45 In within 1 h, 2.55 In within
 * 60 s for In <= 32 A, and the upper edge of B/C/D magnetic bands for <= 0.1 s.
 */
export function evaluateBreakerTrip(
  model: BreakerProtectionModel,
  ratingAmps: number,
  currentAmps: number,
): TripEvaluation {
  const multiple = Math.abs(currentAmps) / ratingAmps;
  if (!Number.isFinite(multiple) || multiple < 0) throw new Error("invalid breaker current");
  if (model.family === "legacy_educational_inverse_time") {
    const maximumTripSeconds =
      multiple > 1 ? (model.tripSecondsAt200Percent * 4) / (multiple * multiple) : null;
    return {
      shouldTrip: maximumTripSeconds !== null,
      maximumTripSeconds,
      mechanism: maximumTripSeconds === null ? "none" : "thermal",
      claim: model.claim,
      referenceId: model.referenceId,
    };
  }
  if (model.family === "manufacturer_curve") {
    const points = [...model.points].sort(
      (left, right) => left.currentMultiple - right.currentMultiple,
    );
    const maximumTripSeconds = interpolateTripEnvelope(points, multiple);
    return {
      shouldTrip: maximumTripSeconds !== null,
      maximumTripSeconds,
      mechanism: maximumTripSeconds === null ? "none" : "manufacturer_curve",
      claim: model.claim,
      referenceId: model.referenceId,
    };
  }
  if (multiple < 1.45)
    return {
      shouldTrip: false,
      maximumTripSeconds: null,
      mechanism: "none",
      claim: model.claim,
      referenceId: model.referenceId,
    };
  const magneticUpper = model.curve === "B" ? 5 : model.curve === "C" ? 10 : 20;
  const points = [
    { currentMultiple: 1.45, maxTripSeconds: 3_600 },
    { currentMultiple: 2.55, maxTripSeconds: 60 },
    { currentMultiple: magneticUpper, maxTripSeconds: 0.1 },
  ];
  const maximumTripSeconds = interpolateTripEnvelope(points, multiple) ?? 0.1;
  return {
    shouldTrip: true,
    maximumTripSeconds,
    mechanism: multiple >= magneticUpper ? "magnetic" : "thermal",
    claim: model.claim,
    referenceId: model.referenceId,
  };
}

function interpolateTripEnvelope(
  points: readonly { readonly currentMultiple: number; readonly maxTripSeconds: number }[],
  multiple: number,
): number | null {
  if (points.length === 0 || multiple < (points[0]?.currentMultiple ?? Number.POSITIVE_INFINITY))
    return null;
  for (let index = 1; index < points.length; index += 1) {
    const lower = points[index - 1];
    const upper = points[index];
    if (!lower || !upper || multiple > upper.currentMultiple) continue;
    const position =
      (Math.log(multiple) - Math.log(lower.currentMultiple)) /
      (Math.log(upper.currentMultiple) - Math.log(lower.currentMultiple));
    return Math.exp(
      Math.log(lower.maxTripSeconds) +
        position * (Math.log(upper.maxTripSeconds) - Math.log(lower.maxTripSeconds)),
    );
  }
  return points.at(-1)?.maxTripSeconds ?? null;
}

export interface ResidualProtectionModel {
  readonly family: "iec_61008_instantaneous" | "ul_943_class_a";
  readonly ratedResidualMilliamps: number;
  readonly referenceId: string;
  readonly claim: "standards_envelope";
}

export function evaluateResidualTrip(
  model: ResidualProtectionModel,
  residualMilliamps: number,
): TripEvaluation {
  const multiple = Math.abs(residualMilliamps) / model.ratedResidualMilliamps;
  if (multiple < 1)
    return {
      shouldTrip: false,
      maximumTripSeconds: null,
      mechanism: "none",
      claim: model.claim,
      referenceId: model.referenceId,
    };
  if (model.family === "ul_943_class_a") {
    return {
      shouldTrip: true,
      maximumTripSeconds: 1.5,
      mechanism: "manufacturer_curve",
      claim: model.claim,
      referenceId: model.referenceId,
    };
  }
  const maximumTripSeconds = multiple >= 5 ? 0.04 : multiple >= 2 ? 0.15 : 0.3;
  return {
    shouldTrip: true,
    maximumTripSeconds,
    mechanism: "thermal",
    claim: model.claim,
    referenceId: model.referenceId,
  };
}
