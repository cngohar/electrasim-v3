# Safe diagnostic test modes v0.6

**Status:** implemented and locally validated on 2026-09-25.

## Purpose and boundary

This is a deterministic educational workflow. It does not authorize live work, replace supervised practical training, certify an instrument, or establish legal compliance. Until the full modeled sequence succeeds, the interface requires the circuit to be treated as energized.

## Workflow

The persisted schema-v2 diagnostic session enforces this order:

1. Identify an isolation component and point of work.
2. Prove the two-pole indicator against the regional educational known source.
3. Open and lock the identified isolation point.
4. Test available conductor combinations at the point of work.
5. Re-prove the indicator.
6. Attach both diagnostic probes.
7. Perform bounded dead testing.
8. Discharge stored insulation-test voltage before another operation.

Normal energization is disabled while the diagnostic lock is active. Out-of-order actions fail closed at the domain/API boundary rather than merely displaying a warning.

## Continuity model

Continuity uses a deterministic minimum-resistance graph across explicit connections and component resistance. It:

- excludes the identified open isolation component and supply source;
- unifies explicit junction and busbar terminals;
- respects open switches;
- includes test-lead resistance;
- supports lead nulling;
- reports an open path without serializing an invented resistance; and
- flags equal-cost parallel paths where detected.

The result is educational resistance evidence, not a jurisdictional pass/fail verdict.

## Insulation-resistance model

The test offers educational 50, 100, 250, 500, and 1000 V selections. Before applying a test source it verifies the established isolation workflow, attached probes, and a maximum 30 V pre-test inhibition boundary. An explicit impedance-bridge fault between the probe nodes supplies modeled insulation resistance; without one, the bounded educational display uses the model's upper resistance.

Optional fault capacitance produces deterministic stored test voltage and an automatic-discharge interval. No further dead test is permitted until discharge reaches zero.

These values reflect publicly documented instrument behavior boundaries, not copied proprietary curves or universal installation rules.

## Public technical basis reviewed

- OSHA explains that effective isolation/de-energization must be verified before servicing and that test instruments may be used for that verification: <https://www.osha.gov/laws-regs/standardinterpretations/1999-11-16>
- OSHA's lockout/tagout eTool requires verification of isolation and de-energization before work: <https://www.osha.gov/etools/lockout-tagout/hot-topics/energy-control-program/energy-control-circuitry-prohibition>
- Fluke's public 1507 specifications document 50/100/250/500/1000 V insulation-test selections, inhibition above 30 V, lead/earth-bond resistance measurement, and automatic capacitive discharge: <https://www.fluke.com/en-us/product/electrical-testing/insulation-testers/fluke-1507>

Product-specific accuracy, CAT markings, calibration, and pass/fail comparison are not inferred.

## Validation

- Domain tests reject continuity before safe-isolation completion.
- Prove → isolate/lock → dead-check → re-prove reaches ready state.
- Lead nulling and a known 0.08 Ω conductor produce deterministic continuity evidence.
- A 2 MΩ, 1 µF modeled insulation defect charges at 500 V and blocks further work until deterministic discharge completes.
- The HTTP endpoint validates and persists workflow transitions.
- npm-Chromium completes safe isolation and continuity in the desktop workbench while retaining mobile, overload, wire-authoring, and reduced-motion fault gates.

## Remaining external gate

Independent electrical-SME review is still required. Jurisdiction-specific safe-isolation sequences and legal acceptance thresholds remain outside this generic educational workflow.
