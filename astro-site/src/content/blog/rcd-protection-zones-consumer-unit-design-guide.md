---
title: "RCD Protection Zones Explained: How to Design a Modern Consumer Unit"
description: "Split-load, fully RCBO, whole-board RCD — which layout gives the best protection without constant nuisance trips? This guide explains how RCD protection zones work, how to plan circuit allocation, and what BS 7671 actually requires for new and upgraded consumer units."
pubDate: 2026-06-19
updatedDate: 2026-08-22
author: ElectraSim
category: Intermediate Guide
tags: [RCD protection zones, consumer unit design, split-load consumer unit, RCBO, RCD discrimination, BS 7671, 18th edition wiring regulations, nuisance tripping, electrical installation, circuit protection planning, consumer unit layout, RCD selectivity]
---

Fitting an RCD to a consumer unit sounds straightforward. In practice, **how** you zone that protection — which circuits share an RCD, which have individual RCBOs, and how the devices coordinate under fault conditions — determines whether an installation is merely compliant or genuinely well-designed.

Get the zoning wrong and a faulty garden lamp trips the fridge at 2 am. Get it right and a fault on any single circuit trips only that circuit, leaving every other load unaffected.

This guide explains the four main protection architectures used in UK domestic consumer units, how to assign circuits to zones, how RCD discrimination works, and what the current wiring regulations (BS 7671 18th Edition, Amendment 2) actually mandate.

> 💡 **Simulate it:** ElectraSim includes Distribution Board, MCB, RCD, and RCBO components. Build a split-load or fully-RCBO consumer unit layout and test fault isolation before touching any real wiring. [Open ElectraSim →](/app/)

---

## Why Protection Zoning Matters

An RCD does not care which circuit caused the fault. If circuits A, B, C, and D all share one 30 mA RCD, a fault on circuit D trips the RCD — and circuits A, B, and C lose power simultaneously.

In most homes this is an inconvenience. In some situations it is a safety hazard:

- The fridge and freezer lose power overnight, spoiling food
- Medical equipment (stairlifts, CPAP machines, home oxygen) de-energises
- Smoke detectors powered from a protected circuit go offline
- Security lighting and alarms lose power

Protection zoning is the discipline of deciding which circuits share which protective device, so that a fault causes the **minimum necessary interruption** while still meeting all regulatory requirements.

---

## The Four Consumer Unit Architectures

### 1. Single Whole-Board RCD (Largely Obsolete)

```
Main Switch
    ↓
RCD (30 mA) — covers ALL circuits
    ├── MCB → Lighting 1
    ├── MCB → Lighting 2
    ├── MCB → Ring Main
    ├── MCB → Kitchen
    ├── MCB → Shower
    └── MCB → Outdoor
```

One RCD protects every circuit in the installation. A fault anywhere trips everything.

**Advantages:** cheap, simple, maximum coverage.

**Disadvantages:**
- Any earth fault on any circuit disconnects the entire installation
- High nuisance-trip risk — outdoor circuits, appliances with imperfect insulation, ageing cable all contribute
- Not compliant with BS 7671 for new installations (no discrimination, critical circuits unprotected during a trip)

**Status:** found in older installations. Acceptable as existing, but should not be specified for new work.

---

### 2. Split-Load Consumer Unit (Common in UK Domestic, 2000s–2020s)

```
Main Switch
    ├── RCD-1 (30 mA)              ├── No RCD (unprotected side)
    │     ├── MCB → Lighting 1     │     ├── MCB → Fridge/Freezer
    │     ├── MCB → Ring Main      │     ├── MCB → Alarm / Smoke detectors
    │     ├── MCB → Kitchen        │     └── MCB → (any circuit where loss
    │     ├── MCB → Bathroom            of power during a trip is critical)
    │     └── MCB → Outdoor
```

The consumer unit is divided into two sections by the main switch. One section is behind an RCD; the other is not.

**The logic:** circuits on the unprotected side are ones where:
1. The appliance is unlikely to cause an earth fault (static appliances with fixed wiring), or
2. Losing power during a fault elsewhere would be unacceptable

**Advantages:** preserves power to critical loads during a fault trip; reduces the scope of a nuisance trip.

**Disadvantages:**
- Circuits on the unprotected side have **no earth leakage / electrocution protection** — this is a regulatory compromise, not a safety feature
- BS 7671 18th Edition Regulation 411.3.3 requires 30 mA RCD protection for most socket outlets up to 32 A; placing an ordinary domestic socket ring on the unprotected side is no longer compliant for new work
- A fault on RCD-1's circuits still kills everything behind RCD-1

**Status:** still widely found and fully functional as existing. Not recommended for new domestic installations where individual RCBO protection is practical.

---

### 3. Dual-RCD Split-Load (Two Protected Zones)

```
Main Switch
    ├── RCD-1 (30 mA)              ├── RCD-2 (30 mA)
    │     ├── MCB → Lighting 1     │     ├── MCB → Lighting 2
    │     ├── MCB → Ring Main      │     ├── MCB → Kitchen
    │     └── MCB → Shower         │     ├── MCB → Outdoor
    │                              │     └── MCB → Garage
```

Two RCDs divide the circuits into two zones. A fault on any circuit in Zone 1 affects only Zone 1; Zone 2 remains live.

**Advantages:** better resilience than single-RCD — a nuisance trip affects half the circuits, not all of them.

**Disadvantages:**
- Still suffers group tripping within each zone
- Requires careful assignment of circuits to zones to ensure critical loads are split across both RCDs (not concentrated on one)
- Fridge on Zone 1 and freezer on Zone 2 is sensible; fridge and freezer both on Zone 1 is poor design

**Circuit allocation best practice for dual-RCD:**
- **Do not** put all high-risk circuits (bathroom, outdoor, kitchen) on one RCD — spread them
- **Do not** put all critical loads (fridge, freezer, medical equipment) on one RCD
- **Do** ensure at least one lighting circuit is on each RCD so the whole building is never in darkness

---

### 4. Fully RCBO-Protected (Current Best Practice)

```
Main Switch
    ├── RCBO → Lighting 1      (6 A / 30 mA Type A)
    ├── RCBO → Lighting 2      (6 A / 30 mA Type A)
    ├── RCBO → Ring Main       (32 A / 30 mA Type A)
    ├── RCBO → Kitchen         (32 A / 30 mA Type A)
    ├── RCBO → Shower          (40 A / 30 mA Type A)
    ├── RCBO → Immersion       (16 A / 30 mA Type A)
    ├── RCBO → Outdoor         (16 A / 30 mA Type A)
    ├── RCBO → Garage/Shed     (16 A / 30 mA Type A)
    ├── RCBO → EV Charger      (32 A / 30 mA Type B)
    └── RCBO → Cooker          (32 A / 30 mA Type A)
```

Every circuit has its own RCBO — a combined MCB + RCD. A fault on any single circuit trips **only that RCBO**. Every other circuit is unaffected and independently protected.

**Advantages:**
- Maximum selectivity — fault isolation to a single circuit
- No circuit is unprotected
- No shared RCD to nuisance-trip
- Compliant with BS 7671 18th Edition for all new work

**Disadvantages:**
- Higher component cost (~£15–30 per RCBO vs ~£5–8 per MCB)
- Requires careful RCBO type selection (Type A vs Type B — see below)

**Status:** the current recommended standard for all new domestic installations in the UK. Most competent electricians now default to this layout.

---

## RCD Type Selection: AC, A, F, and B

Selecting the wrong RCD type is a common and consequential mistake. The type defines which waveforms of fault current the device can detect:

| Type | Detects | Required For |
|---|---|---|
| **Type AC** | Sinusoidal AC earth faults only | Traditional resistive loads (heating elements, incandescent lamps) |
| **Type A** | AC + pulsating DC earth faults | Washing machines, dishwashers, modern switch-mode PSUs, single-phase EV chargers without internal DC fault detection |
| **Type F** | Type A + high-frequency fault currents | Variable-speed drives, inverter-driven heat pumps |
| **Type B** | All of the above + smooth DC | Three-phase EV chargers, some solar inverters, certain medical equipment |

**The practical rule for domestic installations:**
- Default to **Type A** for all standard circuits — covers the vast majority of domestic appliances
- Use **Type B** for any circuit supplying a three-phase EV charger or a solar inverter without its own internal DC fault protection
- Check the equipment manufacturer's installation manual — some EV chargers include internal protection that satisfies BS 7671 without a Type B RCBO

A **Type AC** RCBO will not detect DC earth fault currents. As virtually every modern appliance contains switched-mode power electronics that can produce pulsating DC fault currents, fitting Type AC RCDs in new domestic installations is no longer best practice — even if technically permitted in some legacy guidance.

---

## RCD Discrimination: Upstream vs Downstream

When an installation has more than one level of RCD protection — for example, a 100 mA RCD at the origin feeding circuits with 30 mA RCDs or RCBOs downstream — the devices must **discriminate**: a fault downstream should trip the downstream RCD, not the upstream one.

### Why Discrimination Matters

If a 30 mA earth fault on a socket outlet trips the main incoming 100 mA RCD instead of the socket circuit's RCBO, you have no selectivity — the entire installation loses power for a fault on one socket.

### How to Achieve Discrimination

Discrimination between two RCDs in series is achieved by:

1. **Current ratio:** the upstream RCD must have a higher rated residual operating current than the downstream RCD. A 100 mA upstream device discriminates with 30 mA downstream devices. A 30 mA upstream device cannot discriminate with another 30 mA downstream device.

2. **Time delay:** the upstream device is a **time-delayed (S-type) RCD** — it deliberately delays tripping by 60–200 ms, allowing downstream instantaneous devices to clear the fault first. S-type RCDs are used at the origin of commercial and industrial installations.

3. **Both:** using both current ratio and time delay gives the highest reliability.

**For domestic split-load and RCBO installations:**
- The main switch is not an RCD — it provides no discrimination challenge
- With individual RCBOs, there is only one level of RCD protection per circuit — discrimination is not an issue
- The split-load design with two 30 mA RCDs in parallel (not in series) also has no discrimination issue — each RCD independently protects its group

Discrimination becomes critical when a **TT earthing system** is used (common for rural properties, outbuildings, and agricultural premises), where a high-current RCD at the origin is typically fitted alongside 30 mA RCDs at individual circuits.

---

## BS 7671 18th Edition: What the Regulations Actually Require

The 18th Edition of the IET Wiring Regulations (BS 7671:2018, including Amendment 2:2022) significantly expanded RCD requirements compared to the 17th Edition. Key mandatory requirements for new domestic installations:

### Regulation 411.3.3 — Socket Outlets

Most socket outlets rated up to 32 A in domestic premises must have **30 mA RCD protection**. In practical domestic design, this means ordinary socket circuits should be RCD-protected rather than placed on an unprotected side of the board.

### Regulation 411.3.4 — Domestic Lighting Circuits

In domestic premises, AC final circuits supplying luminaires must also have **30 mA RCD protection**. This is one reason modern boards usually use an RCBO for each lighting circuit.

### Regulation 522.6.7 — Cables in Walls

Any cable buried in a wall or partition at less than 50 mm depth that is not enclosed in earthed metallic conduit must have **30 mA RCD protection**. This catches the vast majority of domestic cable runs — most cables are within 50 mm of the surface.

### Section 701 — Bathroom Zones

All low-voltage circuits serving a room containing a bath or shower must have **30 mA RCD protection**. There are no routine exceptions for fixed heating or lighting in a modern domestic bathroom design.

### Outdoor Socket and Garden Circuits

Socket outlets that may supply outdoor equipment require 30 mA RCD protection, and garden/outbuilding circuits are normally designed with 30 mA RCD or RCBO protection because of moisture, mechanical damage and touch-voltage risk.

### Amendment 2 — SPD Requirement

Amendment 2 (2022) introduced a requirement to consider **Surge Protection Devices (SPDs)** for all new domestic installations. Where the installation is supplied via overhead cables (exposed to lightning) or the risk of surge damage is significant, an SPD at the origin is now expected. This does not change RCD zoning but is increasingly seen alongside it in new consumer units.

**In practice:** for any new consumer unit installation or rewire in the UK, fitting individual RCBOs on every circuit is the most straightforward way to satisfy the socket, lighting, concealed-cable and bathroom RCD requirements without relying on awkward exceptions.

---

## Planning a Consumer Unit Layout: Step-by-Step

Here is a practical approach to allocating circuits to protection zones for a typical 3-bedroom UK home:

### Step 1: List All Circuits

Start by listing every circuit the installation needs:

| Circuit | Load | Typical MCB | Notes |
|---|---|---|---|
| Upstairs lighting | 0.5–1 kW | 6 A | |
| Downstairs lighting | 0.5–1 kW | 6 A | |
| Ring main — upstairs | Up to 7.2 kW | 32 A | |
| Ring main — downstairs | Up to 7.2 kW | 32 A | |
| Kitchen sockets | Up to 7.2 kW | 32 A | High use |
| Cooker / hob | 5–12 kW | 32–45 A | Dedicated radial |
| Shower | 7–10.5 kW | 40–45 A | Dedicated radial |
| Immersion heater | 3 kW | 16 A | Dedicated radial |
| Bathroom shaver socket | <0.1 kW | 6 A | Zone 2, shaver transformer |
| Outdoor sockets | Up to 3.5 kW | 16–32 A | Must be RCD protected |
| Garage / shed | Up to 3.5 kW | 16–32 A | Sub-board optional |
| EV charger | 3.7–7.4 kW | 32–40 A | Type B RCBO |
| Smoke detectors | <0.1 kW | 6 A | Consider uninterruptible supply |

### Step 2: Identify Critical Circuits

Circuits where power loss is unacceptable or safety-critical:
- Smoke alarms and CO detectors
- Stairlift or medical equipment
- Security system
- Fridge/freezer (food safety)

For these circuits in a split-load design, place them on a separate zone or the unprotected side.
In a fully RCBO design, each is independently protected — no special allocation needed.

### Step 3: Identify High-Risk Circuits

Circuits with higher earth fault probability:
- Outdoor sockets (moisture, cable damage)
- Bathroom circuits (water)
- Kitchen (moisture, heavy appliance use)
- Garage/shed (tools, unknown equipment)

Ensure these are behind a 30 mA RCD (RCBO or shared RCD).

### Step 4: Match RCBO Types to Circuits

| Circuit | RCBO Type |
|---|---|
| Lighting, immersion, cooker | Type A |
| All socket circuits | Type A |
| EV charger (single-phase, no internal DC protection) | Type A or B — check charger manual |
| EV charger (three-phase) | Type B |
| Solar inverter circuit | Check inverter documentation — may need Type B |
| Heat pump (inverter-driven) | Type F or Type A — check equipment manual |

### Step 5: Choose Consumer Unit Size

Always fit one size larger than current need. A 3-bedroom house with the circuits above needs approximately 12–14 ways. Fit an 18-way board to allow for future EV charger, solar, or additional circuits without replacing the consumer unit.

---

## Common Mistakes in RCD Protection Zoning

### Putting the Fridge and Freezer on the Same RCD Zone

If both are behind RCD-1 and a fault trips RCD-1, all cold food storage is lost. Split the fridge and freezer across different zones — or use individual RCBOs.

### Using Type AC RCDs in Modern Installations

Type AC does not detect pulsating DC fault currents, which modern electronics routinely produce. Fitting Type AC in a new installation is increasingly poor practice even where it remains technically permissible.

### Concentrating All High-Risk Circuits on One RCD

If bathroom, kitchen, outdoor, and garage circuits are all behind RCD-1, a single fault in any of them trips all of them. Spread high-risk circuits across zones — or use individual RCBOs.

### Ignoring Discrimination in TT Installations

In a TT system (earth electrode, common in rural properties), a main incoming RCD combined with 30 mA downstream RCDs needs proper discrimination. If the main RCD is also 30 mA with no time delay, both may attempt to trip simultaneously. The main RCD should be 100 mA time-delayed (S-type), or the downstream devices should be 30 mA instantaneous.

### Overloading One RCD Zone

If every high-consumption circuit (shower, cooker, EV charger, immersion) sits behind the same RCD, cumulative cable leakage from many long circuits may cause nuisance tripping even without a real fault. In older cable with slightly degraded insulation, the combined leakage current across five large circuits can approach the 30 mA trip threshold. Distribution across two zones or individual RCBOs eliminates this.

---

## How to Simulate RCD Zones in ElectraSim

[ElectraSim](/app/) lets you build and test consumer unit protection layouts directly in the browser — no installation or sign-up required.

### Building a Split-Load Layout

1. Open [ElectraSim](/app/)
2. Place a **Distribution Board** — this represents your consumer unit busbars
3. Add two **RCD** components downstream of the DB output — one for each zone
4. Add **MCB** components downstream of each RCD, one per circuit
5. Attach loads (bulbs, sockets, fan) to each MCB output
6. Press **Run** — all circuits energise from the common DB supply
7. Enable **Fault Simulation** (⚠ button) and apply an Earth Fault to a load on Zone 1
8. Zone 1's RCD trips; Zone 2 circuits remain live — exactly what a correctly zoned split-load installation should do

### Building a Fully RCBO Layout

1. Place a **Distribution Board**
2. Place an individual **RCBO** component for each circuit — ElectraSim's RCBO is a two-pole device that switches Live and Neutral together, exactly like the single-module devices in a real all-RCBO board
3. Apply an earth fault to any single circuit
4. Only that circuit's RCBO trips — all others remain live

You can also load the **RCBO-Protected Socket** guided circuit from the Guided Circuits menu to inspect a ready-made example with protective earth and a test load.

This makes the fault isolation advantage of the RCBO layout immediately visible without touching any live equipment.

---

## Key Takeaways

- **RCD protection zoning** determines which circuits lose power when a fault trips a protective device — poor zoning causes unnecessary, wide-scale power loss
- **Split-load** with two RCDs is a practical compromise; individual RCBOs per circuit are the current best practice
- **BS 7671 18th Edition** requires 30 mA RCD protection on most domestic socket outlets up to 32 A, domestic lighting circuits, most concealed cables in walls under 50 mm without suitable mechanical protection, and circuits serving rooms containing a bath or shower — in a modern installation this means virtually every circuit
- Use **Type A RCBOs** as standard; use **Type B** for three-phase EV chargers and solar inverters without built-in DC fault protection
- **RCD discrimination** matters in TT systems — use a 100 mA time-delayed (S-type) RCD at the origin with 30 mA instantaneous devices downstream
- Plan consumer unit circuit allocation before purchasing equipment — size the board one way larger than current need
- You can model, test, and verify any protection zone layout in **[ElectraSim](/app/)** — free, browser-based, no account required

**Build your consumer unit layout before you wire it:** [Open ElectraSim →](/app/) and test every fault scenario safely.
