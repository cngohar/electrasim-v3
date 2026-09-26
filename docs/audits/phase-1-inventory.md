# Phase 1.0 — Implementation Inventory

Verified 2026-09-26. This closes the inventory/decision gate; numerical standards corrections start in 1.1. Counts are a point-in-time baseline, not permanent test assertions.

## Census

| Scope | Files from `rg --files` |
|-------|-----------------------:|
| `src` | 372 |
| `src/domain` | 112 |
| `src/store` | 31 |
| `src/ui` | 133 |
| `src/ui/canvas` | 21 |
| `src/lib` | 30 |
| `astro-site/src` | 250 |
| `packages` | 5 |
| `scripts` | 30 |

The runtime registry contains **115 components: 74 basic and 41 Pro**. Previous references to 90 components are historical. Component IDs, not labels/client tier fields, will drive access checks.

## Existing Pro component IDs

| ID | Label |
|----|-------|
| `intermediate-switch` | Intermediate Switch |
| `double-pole-switch` | Double-Pole Switch (20A) |
| `rotary-selector-switch` | Rotary Selector Switch |
| `cooker-unit` | Cooker Control Unit (45A) |
| `bulb-smart-rgb` | Smart RGB LED Bulb (10W) |
| `mcb-type-c` | MCB Type C (32A) |
| `mcb-type-d` | MCB Type D (63A) |
| `mccb` | MCCB Breaker (100A) |
| `afdd` | AFDD-RCBO (32A 30mA Type A) |
| `spd` | Surge Protector (SPD Type 2) |
| `fused-spur` | Fused Connection Unit (FCU 13A) |
| `socket-usb` | 3-Pin Socket + Dual USB |
| `socket-gfci` | GFCI / RCD Safety Outlet (20A) |
| `socket-industrial` | Industrial CEE Socket (32A) |
| `industrial-exhaust-fan` | Industrial Exhaust Fan (250W) |
| `air-conditioner` | Inverter Air Conditioner (1.5kW) |
| `induction-hob` | Induction Cooktop (3.5kW) |
| `ev-charger` | EV Charger Point (7.4kW) |
| `heat-pump` | Air-Source Heat Pump (3.0kW) |
| `pir-sensor` | PIR Motion Sensor |
| `thermostat` | Digital Room Thermostat |
| `photocell-sensor` | Dusk-to-Dawn Photocell |
| `smart-relay` | Smart WiFi Relay Module |
| `dc-battery-12v` | 12V DC Deep Cycle Battery |
| `solar-pv-panel` | Solar PV Array (400W DC) |
| `diesel-generator` | Standby Diesel Generator (5kVA) |
| `digital-weekly-timer` | Digital 7-Day Programmable Timer |
| `staircase-timer` | Staircase Delay Timer (30s-10m) |
| `delay-timer` | Time Delay Relay (On/Off Delay) |
| `isolator-switch` | Rotary Isolator Switch (100A) |
| `transformer-24v` | Industrial Control Transformer (230V -> 24V) |
| `step-up-down-transformer` | Step-Up / Step-Down Transformer (110V <-> 230V) |
| `relay-dpdt` | DPDT Power Relay |
| `control-relay` | Industrial 8-Pin Control Relay |
| `contactor-3p` | Three-Pole Contactor (3P 40A) |
| `contactor-4p` | Four-Pole Contactor (4P 63A) |
| `heating-thermostat` | Underfloor Heating Thermostat |
| `alarm-siren` | High-Output Security Alarm Siren |
| `burglar-alarm` | Burglar Alarm Panel |
| `motor-3phase` | 3-Phase AC Induction Motor (3kW / 4HP) |
| `distribution-board-3phase` | 3-Phase TPN Distribution Board |

## Implementation and acceptance map

| Requirement | Current seam | Implementation / gate |
|-------------|--------------|-----------------------|
| Basic vs Pro components | `components/*`, `Palette`, `Toolbar`, `circuitStore.pasteComponents`, imports/templates | 1.3 resolver + 1.5 actions/API + 1.7 UI; canonical IDs and import/paste/restore tests |
| Basic vs advanced faults | 14 `FaultType` values, `faults.ts`, `circuitStore.faultActions.ts`, Fault Lab | All IDs classified in the membership plan; normalize legacy and modern fields; test single/basic, multi/advanced and natural safety findings |
| Diagnosis / Ohmageddon | `diagnosisStore.start/resume`, `challenges/diagnosis/scenario.ts`, `challenges/rage/{tiers,modifiers}` | 1.5/1.7 gate difficulty, actual components/faults and all four rage tiers; preserve versioned seeds |
| Manual memberships | `packages/db/{auth,auth-schema,schema}.ts`, `src/worker.ts` | 1.3 trusted global role + D1 resolver/API; 1.8 super-admin CRUD; local cookie/D1/browser tests |
| Circuit persistence/imports | `store/persistence.ts`, `ImportExportModal.loadCircuit`, `lib/export/circuitFormat.ts`, store setters | 1.5 normalize and authorize; preserve premium documents read-only on expiry; raw backup and explicit basic copy |
| Standards | `standards.ts`, `compliance.ts`, `zsCheck.ts`, Inspector, EIC export, Astro calculators | 1.1 reviewed metadata, honest applicability, independent fixtures and local projection migration |
| Renderer | Existing SVG component/wire/dense-wire/overlay/fault layers, routing and fitRegion | ADR 0007; 1.4 measurements before optimizations; 1.6 visual-only Matter |
| Local-only work | `AGENTS.md`, Wrangler placeholders/local bindings, package scripts, Playwright URL guards | Old local OAuth/refresh credentials removed; deployment/remote seed rejected; actual local Worker `/api/health` returns 200 |

## Electrical evidence and scope

The [standards audit](electrical-standards-gap.md) contains 11 publisher/guidance sources verified this session. Full current normative tables and manufacturer-specific EV/device rules remain explicitly unverified. Do not treat an internal score as evidence for an electrical rule. Use supported/estimated/not-assessed results in 1.1 instead of inventing compliance coverage.

## Dependencies and local baseline

No dependency upgrade was needed for inventory or isolation. Existing SVG and Comlink remain; Matter is a later sub-phase. Domain imports inspected here are internal domain dependencies; extraction still needs compilation and worker parity verification in 1.2.

The local-only gate passed: project typecheck, changed-file Biome lint, prohibited-command/URL checks and a live Wrangler Worker with D1/R2/KV/DO/Queues all marked local. The shared Wrangler credential file is absent. No Cloudflare account or remote resource was modified.
