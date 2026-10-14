# Catalogue simulation coverage and Run feedback audit

Date: 2026-10-14. Local investigation of the reported 12 V L/N → 230 V, 9 W LED drawing. This audit separates missing calculation code from unknown ratings and from Fault Lab presentation.

## Reproduction

The reported drawing has a live terminal, a neutral terminal, a connected LED bulb and a 12 V AC document supply. Direct simulation returns `unsupported`, an empty error list, warnings about the missing load model, no load measurements and no energized lamp. At 230 V the same LED still returns `unsupported`. The source magnitude is applied correctly; the missing LED calculation is the cause of the unavailable response.

`models.ts`, `capabilityCatalogue.ts`, `capabilities.ts` and the numerical solver were unchanged by the Fault Lab visual repairs. The missing LED/fan models are existing catalogue coverage gaps. The old UI hid the warnings in a closed Console and labeled the attempted run Running, which made the unavailable calculation appear silent.

## Default catalogue inventory

**116 entries reviewed. 31 resolve to an unassessed model in the state created by ordinary placement**: 27 loads and 4 other devices. Of these, the three-phase motor already has a supported teaching model after explicit motor settings are supplied. The other 30 need implementation of their electrical behaviour; editing a power or voltage label alone does not add that behaviour.

The other 85 entries have source, connection, outlet, contact, reference, transformer or resistive models. This is not a claim that all 85 have complete appliance behaviour: automatic sensors, several timers, relay coils, protection timing and damage may require declared settings or remain limited. Incandescent/halogen lamps and seven heating elements use the existing fixed-resistance teaching model; a missing maximum-voltage rating does not prevent their current/power calculation.

| Default unassessed entry | Type | Coverage gap |
| --- | --- | --- |
| LED Bulb (9W) | `bulb` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| CFL Lamp (15W) | `bulb-cfl` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Smart RGB LED Bulb (10W) | `bulb-smart-rgb` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| LED Downlight (12W) | `led-downlight` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Fluorescent Tube (36W) | `tube-light` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Surge Protector (SPD Type 2) | `spd` | This device has no declared conduction/control model. |
| Ceiling Fan (65W) | `ceiling-fan` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Bathroom Extractor Fan (25W) | `extractor-fan` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Industrial Exhaust Fan (250W) | `industrial-exhaust-fan` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Portable Desk Fan (45W) | `table-fan` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Electric Motor (750W / 1HP) | `motor` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Doorbell / Buzzer (15W) | `bell` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Inverter Air Conditioner (1.5kW) | `air-conditioner` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Induction Cooktop (3.5kW) | `induction-hob` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| EV Charger Point (7.4kW) | `ev-charger` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Kitchen Extractor Hood (300W) | `extractor-hood` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Air-Source Heat Pump (3.0kW) | `heat-pump` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Dishwasher (2.2kW) | `dishwasher` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Washing Machine (2.2kW) | `washing-machine` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Tumble Dryer (2.5kW) | `tumble-dryer` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Fridge Freezer (200W) | `fridge-freezer` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Solar PV Array (400W DC) | `solar-pv-panel` | PV voltage/current and irradiance are unspecified; a power label is not a voltage source. |
| Step-Up / Step-Down Transformer (110V <-> 230V) | `step-up-down-transformer` | The autotransformer has shared windings; an isolated-transformer approximation is not applicable. |
| NTC Temperature Sensor Probe | `temperature-sensor` | This device has no declared conduction/control model. |
| Panel Electric Buzzer (90dB) | `electric-buzzer` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Wireless Doorbell Chime Receiver | `wireless-doorbell` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| High-Output Security Alarm Siren | `alarm-siren` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Smoke / Heat / CO Alarm | `smoke-alarm` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| Burglar Alarm Panel | `burglar-alarm` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |
| 3-Phase AC Induction Motor (3kW / 4HP) | `motor-3phase` | Supported three-phase teaching model after explicit motor settings are configured. |
| Electric Water Pump (1.1kW / 1.5HP) | `water-pump` | No supported voltage/current law is declared for this load; nameplate power is not resistance. |

The reproducible inventory and 12/230 V LED, incandescent, halogen and ceiling-fan probes are in `.wrangler/catalogue-model-audit.json` and `.log`. Inventory is a code/model review of placement defaults, not exhaustive runtime validation of 116 circuits.

## Feedback correction

- A missing calculation now shows a visible Simulation unavailable message with its component, even with the Console closed. The context status says Unavailable instead of Running.
- Model unavailable and Ratings unknown are separate canvas labels. The badge description contains the actual compatibility reasons.
- A directly connected supply different from a known device design voltage now has a shared nominal-voltage-mismatch warning. With no declared operating range, this remains unassessed and does not fabricate a trip, damage threshold or driver response. Series paths are not compared against global source voltage.
- Stale results cannot keep the visible message after electrical inputs change. Stop clears it; View findings opens the existing readiness/result details.

This repair improves reporting and diagnostics. It does not implement the missing LED/fan/appliance calculations. A scoped completion proposal is in [the catalogue model plan](../plans/CATALOGUE_MODEL_COMPLETION_PLAN.md).

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Placement-default inventory and representative direct probes | 116 reviewed; 31 default unassessed, including one configurable motor | `.wrangler/catalogue-model-audit.json`, `.log` |
| Affected core, supply/store, canvas and feedback units | **465 passed**, 23 files | `.wrangler/simulation-model-feedback-units-final.log` |
| Actual isolated Bun/workerd parity | **842 passed**, exact result equality | `.wrangler/simulation-model-feedback-parity.log`, `.wrangler/domain-tests-RqBMMu/` |
| Native placement/wiring/supply/Run/fresh-result workflow | **3 source cases**: desktop Chrome, phone Chrome, tablet Safari | `.wrangler/simulation-model-feedback-source.log`, `-source-responsive.log`, `-source-phone-recovery.log` |
| Existing actual-Comlink numerical/LED regression | **3 passed**: series values, confirmed 12 V heater supply edit, unsupported LED readings | `.wrangler/simulation-model-feedback-runtime-regression.log` |
| Rebuilt native workflow | **2 passed**, 1280/390 px | `.wrangler/simulation-model-feedback-built.log` |
| Types and repository lint | Passed full types, final UI/E2E types and repository lint | `.wrangler/simulation-model-feedback-types.log`, `-ui-types-final.log`, `-e2e-types.log`, `-lint.log` |
| Complete build and delivery budgets | Passed; initial JS **256,162 B gzip**, CSS **28,085 B gzip** | `.wrangler/simulation-model-feedback-build-final.log`, `-budget.log` |

Source and built screenshots `.wrangler/simulation-feedback-{chromium,mobile-chrome,tablet-safari,built-1280,built-390}-{12v,230v}-led.png` show actual created terminals/wires and visible unavailable feedback. The desktop and built phone captures were visually reviewed. Numeric regression retains actual terminal-voltage/current/power assertions and the real Comlink transport, not just a status string.

The initial feedback unit fixture simulated the raw drawing rather than the normalized stored document, so the required input-revision freshness guard correctly rejected it. The fixture now solves `selectCircuit` after loading and includes stale-input rejection; the final 465-case affected run is green. The initial phone browser selector matched both the supply editor and the shelf Supply category. It now scopes the editor to the context bar; the recovered phone and both built workflows passed with the same substantive assertions.

The earlier **2,004-case** Phase 1.11 closure suite was not rerun here and does not establish whole-catalogue simulation support. This scope changes diagnostic metadata and reporting, not source magnitude, branch laws or missing-load physics. Historical numerical/frame performance exceptions remain. All work remains local and uncommitted; no remote operation.
