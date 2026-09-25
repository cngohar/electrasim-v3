# Earthing fixtures and installation-rule evidence v0.2

**Implemented:** 2026-09-25

## Scope and safety boundary

This slice completes distinct physical fixtures for TN-S, TN-C-S, TT, impedance-earthed IT, and a North American grounded branch. It does not make those systems interchangeable and does not issue a complete compliance verdict. Every run ends with `jurisdiction.complete_compliance = not_evaluated` because adopted codes, site conditions, product listings, inspection, testing, and authority requirements are outside the modeled evidence.

## Added physical fixtures

### TN-C-S

The fixture has an upstream PEN, a service N/PE split, a downstream neutral, a downstream CPC/enclosure, and a separate source-earth reference. An open-PEN fault interrupts both upstream neutral and protective functions. The load/enclosure can float near line voltage while fault current is approximately zero, so overcurrent protection cannot be interpreted as safety.

The bounded rule evaluator reports PEN continuity separately. Public IEC-derived guidance states that a PEN must not be interrupted and that an upstream neutral interruption can also interrupt downstream protective function.

### IT

The fixture has a 3,500 Ω source-to-earth impedance, equipotential PE/electrode path, first line-earth fault, and a high-impedance permanent insulation monitor that does not create a protective-current shortcut.

- First fault: approximately 65 mA, monitor alarm, no automatic opening, continued energized status, and a low modeled local touch-potential difference.
- Second fault: a second active-conductor-to-PE bridge forms a high-current loop and overcurrent protection opens.

Continued service after a first fault is never presented as “repaired” or generally safe. The UI and timeline retain an active-fault warning and instruct location/clearance. The evaluator checks that monitoring evidence exists and, for the represented first-fault arrangement, reports the public `Id × RA ≤ 50 V` relationship.

### North American grounded system

The 120 V / 60 Hz fixture has a grounded source, service neutral-ground bond, separate downstream equipment grounding conductor, UL 489 manufacturer-curve boundary, and separate Class A GFCI behavior.

An open equipment grounding conductor remains a failed grounding-path check even if a GFCI is present. This follows OSHA's distinction: GFCI personnel protection does not restore equipment-grounding continuity or replace grounding where grounding is required.

## Installation-rule evidence layer

`evaluateInstallationRules` is separate from the network solver and product behavior. Results identify:

- check ID and subject;
- status: pass, fail, warning, or not evaluated;
- confidence: physical, educational approximation, reviewed rule, manufacturer-specific, or not evaluated;
- standard/profile and reviewed version;
- evidence values where supported.

Implemented bounded checks:

- declared physical earthing topology;
- conductor adiabatic withstand using `I²t ≤ k²S²` when cross-section and `k` are supplied;
- TT `RA × IΔn ≤ 50 V` relationship;
- TN solved automatic-disconnection evidence without claiming a jurisdictional time limit;
- TN-C-S PEN continuity;
- IT insulation-monitor alarm and second-fault clearing;
- North American equipment-grounding-path continuity;
- mandatory final “complete compliance not evaluated” result.

A pass applies only to that one modeled check.

## Manufacturer let-through boundary

Breakers can now carry optional manufacturer-specific maximum I²t points with manufacturer, curve ID, and source URL. Interpolation occurs only inside the supplied current range. The kernel returns `null` outside the published range and when data is absent; it does not extrapolate, derive let-through from an IEC B/C/D category, or fabricate UL 489 data.

No production manufacturer dataset is bundled yet because chart digitization and exact catalogue/product identity require manufacturer confirmation and electrical-SME review. The data contract and fail-closed behavior are implemented and tested.

## Fifty-case golden matrix

`goldenFixtureCases` contains exactly 50 deterministic regression fixtures spanning:

- TT with and without RCD across fault resistance;
- TN-S earth faults;
- line-neutral faults;
- high-impedance TT faults;
- IEC B/C/D device distinction;
- intact/open-PEN TN-C-S;
- IT first and second faults;
- North American GFCI, overcurrent, and open-EGC cases.

Each case runs twice and must produce byte-equivalent domain output, its expected cleared/persistent state, required event, and a final `not_evaluated` complete-compliance result. These are reviewed-in-code regression fixtures, **not** independent electrical-engineer approval. Independent SME review remains a release gate.

## Sources

- [IEC-derived TN system principle](https://www.electrical-installation.org/enwiki/TN_system_-_Principle) — source/phase/protective-conductor loop impedance and automatic disconnection.
- [Definition of standardized earthing schemes](https://www.electrical-installation.org/enwiki/Definition_of_standardised_earthing_schemes) — TN-C-S split and upstream neutral/PEN interruption danger.
- [TN preliminary conditions](https://www.electrical-installation.org/enwiki/TN_system_-_Preliminary_conditions) — PEN must not be interrupted.
- [IT system principle](https://www.electrical-installation.org/enwiki/IT_system_-_Principle) — isolated/high-impedance source, first-fault continuity, monitoring, `Id × RA ≤ 50 V`, and second-fault opening.
- [IT fault protection](https://www.electrical-installation.org/enwiki/IT_system_-_Fault_protection) — mA first fault, monitor alarm, and second-fault short-circuit behavior.
- [IT practical aspects](https://www.electrical-installation.org/enwiki/IT_system_-_Practical_aspects) — permanent insulation monitoring and fault-location functions.
- [Cable short-circuit withstand](https://www.electrical-installation.org/enwiki/Verification_of_the_withstand_capabilities_of_cables_under_short-circuit_conditions) — `I²t = k²S²` and manufacturer let-through comparison for brief faults.
- [OSHA 29 CFR 1910.304](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.304) — permanent, continuous, effective grounding path and GFCI/no-equipment-ground provisions.
- [OSHA grounding interpretation](https://www.osha.gov/laws-regs/standardinterpretations/1999-12-21) — GFCI protection is distinct from equipment-grounding requirements.
- [OSHA electrical training library](https://obis.osha.gov/dte/library/electrical/electrical.html) — EGC return-to-source path, resistance/reactance, service bonding, and Class A GFCI operation.
