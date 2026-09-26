# Phase 1.1 — Standards implementation

Source register: [electrical standards audit](electrical-standards-gap.md), checked 2026-09-26. This implementation separates publication metadata, local adoption and the checks actually performed.

## Implemented boundaries

- `standardsReferences.ts` owns publisher/document/edition/URL/check date, adoption and coverage. The simulator and Astro toolbox share this metadata; D1 is a read-only version-2 projection. The seed resolves the configured local DB binding instead of guessing a SQLite filename.
- UK references identify A4:2026 and the A2+A3 transition ending 15 October 2026. NEC 2026 publication does not establish local adoption. IEC parts are independently versioned, including 8-81:2026 and 8-82:2022+AMD1:2026. The generic IEC and European profiles make no country-equivalence claim.
- The P/V rating suggestion uses the next available illustrative IEC size without a universal 125% multiplier. Invalid, oversized and US-model cases return no rating. This is not complete cable/protection sizing. EVSE and induction electronics require equipment-specific curve data; motor advice is a warning to review inrush, not a mandated C/D swap.
- Voltage-drop advice uses selected supply voltage rather than equipment maximum voltage. A bounded line-only traversal avoids counting the neutral return again when using two-conductor mV/A/m values. It remains a per-load radial estimate, with shared-current, switching and ring-current division explicitly unmodelled. Generic US metric voltage-drop assessment is unavailable; the separate Astro NEC calculator retains its branch/total advisory model.
- Missing residual protection remains visible as a safety warning. An approximate network scan does not prove required placement, timing, waveform response or national compliance, and does not block a teaching run as a regulatory violation. Existing physical-fault run guards remain enforced. The validator never adds the former blanket “Regulation Compliance” pass.
- Zs exposes an `estimated` / `not-assessed` union. The existing arithmetic is limited to UK TN final-circuit teaching cases up to 32 A, the listed copper T&E sizes and U0 = 230 V. Unsupported profiles, TT, distribution circuits, unknown devices, invalid/missing connections, faults, aluminum/AWG inputs and unsupported supplies do not produce a pass. Explicit 230 V U0 is required for a 400 V line-to-line context; 400 V is never silently used as U0.
- Inspector and printable EIC-style output show those boundaries. Exports carry selected voltage, profile frequency/reference and device residual rating. Failed estimates never claim a proven disconnection time. Plain RCDs are described as having an unassessed residual trip model, not as requiring overcurrent operation to clear an earth fault.
- Simulator trip reports retain each device’s actual residual-current rating when profiles change; selecting US never turns a 30 mA RCD into a 6 mA GFCI. US clearing times are omitted as unassessed, and the IEC teaching curve is not labelled UL 489.
- Regional fault prose no longer promises fixed 230 V readings or universal trip times. UK teaching references are labelled; EV template prose separates residual waveform/DC detection from MCB curves.

## Numerical scope

Existing B/C/D magnetic thresholds, 0.95/0.8 Zs factors, copper/CPC tables, installation-method ampacity tables and aluminum derating approximation are retained as teaching models. Their full applicability is not verified by publisher abstracts. No claim is made to implement all A4/NEC/IEC clauses.

One arithmetic defect was corrected: a non-tabulated conductor size no longer borrows the lower resistance of the next larger cable. Exact tabulated sizes retain their existing results; other sizes use the documented resistivity/temperature fallback. Independent fixture: 2 mm² copper gives 21 mV/A/m from `2 × 0.0175 × 1.2 × 1000 / 2`, while tabulated 2.5 mm² remains 18 mV/A/m.

The Astro voltage-drop/cable-size engines use explicit temperature, power-factor and reactance inputs. Those calculations must not be replaced with the simulator's smaller T&E table merely to claim one implementation. Shared reference metadata is in place; a broader numerical consolidation needs equivalent model inputs and verified fixtures first.

## Local verification

- Targeted numerical, applicability, validator and export fixtures, including B32 = 1.365625 Ω; 10 m of 2.5/1.5 T&E contributes 0.1951 Ω; TN-C-S total 0.5451 Ω; deliberate long-run violations and unsupported cases.
- Migration `0003_standards_coverage.sql` applied locally and four profiles reseeded. Live local Worker `/api/standards` returns version 2 and the expected per-part metadata.
- Full lint, typecheck, unit and browser results are recorded in `progress.md` once the gate finishes.
- All credentials and remote-operation restrictions from root `AGENTS.md` remain in force. No live account, deployment or remote database was used.
