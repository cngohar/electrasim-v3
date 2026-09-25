import { validateCircuitDocument } from "./circuit.ts";
import { type CircuitDocument, SimulatorError } from "./model.ts";

export interface CircuitMigrationResult {
  readonly document: CircuitDocument;
  readonly migratedFrom: 1 | null;
  readonly warnings: readonly string[];
}

/**
 * Converts untrusted persisted/imported documents at the domain boundary. Schema v1's generic
 * inverse-time breaker is retained only as an explicitly non-standard legacy model; migration
 * never guesses IEC, UL, NEC, or national compliance from voltage or geography.
 */
export function migrateCircuitDocument(input: unknown): CircuitMigrationResult {
  if (!isRecord(input) || !Number.isSafeInteger(input.schemaVersion))
    throw new SimulatorError("invalid_circuit", "Circuit schema version is missing.");
  if (input.schemaVersion === 2) {
    validateCircuitDocument(input);
    return { document: input, migratedFrom: null, warnings: [] };
  }
  if (input.schemaVersion !== 1)
    throw new SimulatorError(
      "unsupported_schema",
      `Circuit schema ${String(input.schemaVersion)} is not supported.`,
    );
  if (!Array.isArray(input.components))
    throw new SimulatorError("invalid_circuit", "Legacy circuit components are missing.");

  const warnings: string[] = [];
  const components = input.components.map((component) => {
    if (
      !isRecord(component) ||
      component.kind !== "breaker" ||
      component.protectionModel !== undefined
    )
      return component;
    if (!isPositive(component.tripSecondsAt200Percent))
      throw new SimulatorError(
        "invalid_circuit",
        "Legacy breaker requires a positive tripSecondsAt200Percent value.",
      );
    const { tripSecondsAt200Percent, ...rest } = component;
    warnings.push(
      `Breaker ${typeof component.id === "string" ? component.id : "(unknown)"} retained as a non-standard legacy educational curve. Select a reviewed product model before standards evaluation.`,
    );
    return {
      ...rest,
      protectionModel: {
        family: "legacy_educational_inverse_time",
        tripSecondsAt200Percent,
        referenceId: "legacy:v1-generic-inverse-time-not-a-standard",
        claim: "educational",
      },
    };
  });
  const supplyFamily = input.supplyFamily;
  const migrated = {
    ...input,
    schemaVersion: 2,
    rulePackId:
      input.rulePackId ??
      (supplyFamily === "us_110_120"
        ? "us_nec_2026_educational"
        : "iec_international_educational_2025"),
    components,
  };
  validateCircuitDocument(migrated);
  return { document: migrated, migratedFrom: 1, warnings };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
