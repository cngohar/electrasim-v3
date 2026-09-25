import {
  createItFixture,
  createNorthAmericanGroundedFixture,
  createTncsFixture,
} from "./earthing-fixtures.ts";
import { createFaultLoopFixture } from "./fault-fixtures.ts";
import type { CircuitDocument } from "./model.ts";
import type { SimulationEventType } from "./simulation.ts";

export interface GoldenFixtureCase {
  readonly id: string;
  readonly create: () => CircuitDocument;
  readonly expectedFaultStatus: "cleared" | "persistent_danger";
  readonly expectedEvent?: SimulationEventType;
}

const values = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10] as const;
const highImpedanceValues = [100, 150, 220, 330, 470, 680, 820, 1_000] as const;

/**
 * Fifty deterministic reviewed-in-code fixtures. They are regression evidence, not independent
 * electrical-SME approval; external review remains a release gate.
 */
export const goldenFixtureCases: readonly GoldenFixtureCase[] = [
  ...values.map(
    (resistance): GoldenFixtureCase => ({
      id: `tt-rcd-r${resistance}`,
      create: () =>
        createFaultLoopFixture({
          arrangement: "TT",
          residualProtection: true,
          faultResistanceOhms: resistance,
        }),
      expectedFaultStatus: "cleared",
      expectedEvent: "protection.tripped",
    }),
  ),
  ...values.map(
    (resistance): GoldenFixtureCase => ({
      id: `tt-no-rcd-r${resistance}`,
      create: () =>
        createFaultLoopFixture({
          arrangement: "TT",
          residualProtection: false,
          faultResistanceOhms: resistance,
        }),
      expectedFaultStatus: "persistent_danger",
      expectedEvent: "fault.persistent_danger",
    }),
  ),
  ...values.map(
    (resistance): GoldenFixtureCase => ({
      id: `tns-earth-r${resistance}`,
      create: () =>
        createFaultLoopFixture({
          arrangement: "TN-S",
          residualProtection: false,
          faultResistanceOhms: resistance,
        }),
      expectedFaultStatus: resistance <= 2 ? "cleared" : "persistent_danger",
      expectedEvent: resistance <= 2 ? "protection.tripped" : "fault.persistent_danger",
    }),
  ),
  ...values.map(
    (resistance): GoldenFixtureCase => ({
      id: `line-neutral-r${resistance}`,
      create: () =>
        createFaultLoopFixture({
          arrangement: "TN-S",
          fault: "line_neutral",
          residualProtection: false,
          faultResistanceOhms: resistance,
        }),
      expectedFaultStatus: resistance <= 2 ? "cleared" : "persistent_danger",
      expectedEvent: resistance <= 2 ? "protection.tripped" : "fault.persistent_danger",
    }),
  ),
  ...highImpedanceValues.map(
    (resistance): GoldenFixtureCase => ({
      id: `tt-high-z-r${resistance}`,
      create: () =>
        createFaultLoopFixture({
          arrangement: "TT",
          fault: "high_impedance_earth",
          residualProtection: true,
          faultResistanceOhms: resistance,
        }),
      expectedFaultStatus: "cleared",
      expectedEvent: "protection.tripped",
    }),
  ),
  ...(["B", "C", "D"] as const).map(
    (curve): GoldenFixtureCase => ({
      id: `tns-curve-${curve.toLowerCase()}`,
      create: () =>
        createFaultLoopFixture({
          arrangement: "TN-S",
          residualProtection: false,
          breakerCurve: curve,
          faultResistanceOhms: 0.1,
        }),
      expectedFaultStatus: "cleared",
      expectedEvent: "protection.tripped",
    }),
  ),
  {
    id: "tncs-intact-pen",
    create: () => createTncsFixture(),
    expectedFaultStatus: "cleared",
    expectedEvent: "protection.tripped",
  },
  {
    id: "tncs-open-pen",
    create: () => createTncsFixture({ openPen: true }),
    expectedFaultStatus: "persistent_danger",
    expectedEvent: "fault.persistent_danger",
  },
  {
    id: "it-first-fault",
    create: () => createItFixture(),
    expectedFaultStatus: "persistent_danger",
    expectedEvent: "monitor.insulation_alarm",
  },
  {
    id: "it-second-fault",
    create: () => createItFixture({ secondFault: true }),
    expectedFaultStatus: "cleared",
    expectedEvent: "protection.tripped",
  },
  {
    id: "na-grounded-gfci",
    create: () => createNorthAmericanGroundedFixture(),
    expectedFaultStatus: "cleared",
    expectedEvent: "protection.tripped",
  },
  {
    id: "na-open-egc",
    create: () => createNorthAmericanGroundedFixture({ openEquipmentGround: true }),
    expectedFaultStatus: "persistent_danger",
    expectedEvent: "fault.persistent_danger",
  },
  {
    id: "na-grounded-overcurrent",
    create: () => createNorthAmericanGroundedFixture({ gfci: false }),
    expectedFaultStatus: "cleared",
    expectedEvent: "protection.tripped",
  },
];
