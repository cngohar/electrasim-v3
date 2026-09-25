# Circuit document schema v2 and import migration

**Implemented:** 2026-09-25

## Why v2 exists

Schema v1 predated explicit product-standard protection, complex fault-loop impedance, earthing topology, and rule-pack identity. Persisting those additions under the same version would make old and new JSON indistinguishable. Schema v2 is now the only format created by the simulator.

## Boundary behavior

All untrusted JSON crosses `migrateCircuitDocument` before simulation or persistence:

- valid v2 documents are validated and returned unchanged;
- valid v1 documents are converted deterministically to v2;
- missing, malformed, or unknown future versions fail closed;
- document/component/fault limits and impedance/protection validation run after migration;
- imports never infer a product standard or legal compliance from voltage, frequency, or country.

The simulation API accepts either a bounded built-in scenario or an imported `circuit`. Imported v1/v2 circuits are migrated, validated, and solved by the same kernel. Browser JSON import now retains the actual imported circuit rather than reducing it to a built-in scenario. Save/export subsequently uses v2.

## v1 breaker handling

A v1 breaker containing `tripSecondsAt200Percent` cannot safely be called IEC 60898, IEC 60947-2, UL 489, or any national product. Migration therefore maps it to:

```json
{
  "family": "legacy_educational_inverse_time",
  "referenceId": "legacy:v1-generic-inverse-time-not-a-standard",
  "claim": "educational"
}
```

The old deterministic behavior remains available for compatibility, but migration emits a warning requiring selection of a reviewed product model before standards evaluation. It is never silently relabeled as IEC B/C/D or UL 489.

## Rule-pack handling

When a v1 document has no rule-pack identifier, migration assigns only an educational context:

- `us_110_120` → `us_nec_2026_educational`
- `international_230_240` → `iec_international_educational_2025`

This is not a compliance verdict. Earthing arrangement is not guessed.

## Immutable persistence

Database migration `0010_simulator_schema_v2.sql` permits immutable historical v1 revisions and new v2 revisions. Repository reads migrate v1 at the domain boundary; new project saves always persist validated v2. Historical JSON is not rewritten in place.

## Compatibility contract

| Input | Result |
| --- | --- |
| Valid schema v2 | Validate and use unchanged |
| Valid schema v1 with explicit modern protection | Promote to v2 |
| Valid schema v1 with generic breaker timing | Preserve as warned legacy educational behavior |
| Missing or malformed version | `invalid_circuit` |
| Future/unknown version | `unsupported_schema` |
| Invalid protection points or impedance | `invalid_circuit` |

## Verification

Golden coverage proves:

- v1 generic breaker migration without invented product standards;
- rejection of future schema versions;
- imported v1 execution through `/api/simulator/run`;
- project-service migration before persistence;
- PostgreSQL acceptance of immutable v1 and new v2 revisions;
- continued full simulator-domain and HTTP validation.
