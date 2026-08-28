---
title: "AFDDs Explained: Arc Fault Detection Devices and BS 7671 Requirements"
description: "Arc Fault Detection Devices (AFDDs) are required by BS 7671 in specific higher-risk residential locations and recommended more widely. This guide explains what AFDDs are, how they detect dangerous arcing faults that MCBs and RCDs miss, where they are required, and whether you need one."
pubDate: 2026-06-20
author: ElectraSim
category: Intermediate Guide
tags: [AFDD, arc fault detection device, BS 7671 amendment 2, electrical fire prevention, arc fault, 18th edition wiring regulations, consumer unit, circuit protection, electrical safety, wiring regulations UK, arc fault circuit interrupter, AFCI]
---

Your MCB protects against overloads and short circuits. Your RCD protects against earth leakage and electric shock. Neither of them can detect the one fault type responsible for a significant proportion of electrical fires in UK homes: **a sustained arcing fault inside wiring or connections**.

That is the job of an **AFDD** — Arc Fault Detection Device. Strengthened in BS 7671 by Amendment 2 (2022), AFDDs are now required in specific higher-risk residential locations and recommended more widely. Yet most homeowners have never heard of them, and many electricians are still unfamiliar with exactly what the regulations say.

This guide explains what AFDDs do, how they work, where BS 7671 requires or recommends them, how they compare to MCBs and RCDs, and what you should realistically expect when one is quoted on a new consumer unit.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Simulate electrical faults safely:** ElectraSim lets you build protected circuits and explore fault behaviour — including series and parallel fault scenarios — entirely in your browser. [Open ElectraSim →](/app/)

---

## What is an Arc Fault?

An **arc fault** is an unintended electrical discharge that jumps across a gap between conductors or through degraded insulation. Unlike a short circuit — which creates a massive current surge that immediately trips an MCB — an arc fault often draws only a modest amount of current. The MCB sees nothing unusual. The RCD sees no imbalance (no current is going to earth). Nothing trips.

But the arc itself generates temperatures exceeding **3,000°C** at the point of discharge — hot enough to ignite surrounding insulation, timber framing, or accumulated dust instantly.

### Two types of arc fault

**Series arc fault:**
The arc occurs in a break along a single conductor — a damaged cable, a loose terminal connection, a staple driven through a cable. Current still flows, but through the arc gap. The circuit appears to work normally; the load still operates. The MCB has no reason to trip because the current draw is within normal limits.

**Parallel arc fault:**
The arc occurs between two conductors at different potentials — Live to Neutral, Live to Earth, or Neutral to Earth. This resembles a short circuit, but if the arc impedance is high enough, the current drawn may still be below the MCB's trip threshold. The arc can sustain itself for seconds or minutes before the MCB trips — long enough to start a fire.

### Why ordinary protection misses arc faults

| Fault Type | MCB Detects | RCD Detects | AFDD Detects |
|---|---|---|---|
| Overload (excess current) | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> (as supplementary) |
| Short circuit (bolted fault) | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> |
| Earth leakage (shock risk) | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> (RCD still needed) |
| **Series arc fault** | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> |
| **Parallel arc fault (low impedance)** | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> |
| **Parallel arc fault (high impedance)** | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> |

The gap in the middle of that table — series arcs and high-impedance parallel arcs — is precisely where electrical fires start and why AFDDs exist.

---

## How an AFDD Works

An AFDD continuously monitors the electrical waveform on the circuit it protects. It uses a combination of techniques:

### High-frequency current analysis
An arc produces a characteristic signature in the current waveform: rapid, irregular high-frequency spikes superimposed on the normal 50 Hz sine wave. These spikes are caused by the plasma of the arc repeatedly ionising and de-ionising as the AC cycle crosses zero. The AFDD's internal processor samples the current waveform at very high frequency and applies algorithms to distinguish arc signatures from normal high-frequency noise produced by dimmer switches, motor brushes, and switch-mode power supplies.

### Impedance monitoring
As a connection loosens or insulation degrades, the impedance of the circuit changes in a characteristic way. The AFDD tracks these changes over time and can flag degradation before it becomes a full arc fault.

### Thermal monitoring
Some AFDD designs also monitor for sustained power dissipation at sub-trip current levels — another indicator of a resistive fault developing.

### What AFDDs do not do
An AFDD does not replace an MCB or an RCD. It adds a third layer of protection specifically for arc faults. In practice, AFDDs are available as:

- **AFDD + MCB combined** — replaces a standard MCB, adds arc detection
- **AFDD + RCBO combined** — the full protection stack: overload, short circuit, earth leakage, and arc fault in one device
- **Standalone AFDD module** — fitted in series with an existing MCB

For new installations, the combined **AFDD + RCBO** is the cleanest solution: one device per circuit, all four protection functions covered.

---

## What BS 7671 Amendment 2 Actually Says

The 18th Edition of the IET Wiring Regulations (BS 7671:2018) introduced AFDDs in Section 421.1.7. **Amendment 2 (2022)** strengthened and clarified the requirement. The scope is often misquoted, so the practical meaning is:

### Regulation 421.1.7 (as amended)

AFDDs **shall be provided** for single-phase AC final circuits supplying socket outlets with a rated current not exceeding 32 A in the following locations:

- **Higher Risk Residential Buildings** (as defined in the relevant building safety legislation)
- **Houses in Multiple Occupation (HMOs)**
- **Purpose-built student accommodation**
- **Care homes**

The regulation uses **"shall"** — which in BS 7671 language means mandatory, not advisory.

However, there is an important qualification: the regulation applies to **new installations and new circuits** in these locations. It does not retroactively require AFDDs in existing installations. An existing consumer unit without AFDDs does not automatically become non-compliant.

### Where AFDDs are "recommended" (not mandatory)

Regulation 421.1.7 also notes that AFDDs are **recommended** (not mandatory) for other single-phase AC final circuits supplying socket outlets not exceeding 32 A. In normal domestic work, that includes:

- Owner-occupied single dwellings
- Ordinary single-let houses and flats that are not HMOs
- Locations where fire risk is elevated (old buildings with original wiring, timber-framed construction)
- Circuits supplying areas with sleeping accommodation above

This distinction matters: an electrician installing a new consumer unit in an owner-occupied house is not **required** by regulation to fit AFDDs — but doing so is considered good practice and is increasingly standard in quality installations.

### Amendment 2 and the practical impact

Before Amendment 2, some installers interpreted the original regulation as advisory even for higher-risk premises. Amendment 2 removed that ambiguity. For new work in an HMO, purpose-built student accommodation, care home, or Higher Risk Residential Building, AFDDs on in-scope socket circuits are a regulatory requirement, not an optional upgrade.

---

## Which Circuits Require AFDDs?

The regulation targets **socket outlet circuits up to 32 A**. This means:

| Circuit | AFDD Required (mandatory locations) |
|---|---|
| Ring main — sockets | <span class="em em-check" role="img" aria-label="do"></span> |
| Kitchen socket circuit | <span class="em em-check" role="img" aria-label="do"></span> |
| Outdoor socket circuit | <span class="em em-check" role="img" aria-label="do"></span> |
| Garage / shed socket circuit | <span class="em em-check" role="img" aria-label="do"></span> |
| Lighting circuits | <span class="em em-cross" role="img" aria-label="don't"></span> (not socket circuits) |
| Shower circuit (dedicated) | <span class="em em-cross" role="img" aria-label="don't"></span> (dedicated appliance, no socket) |
| Cooker circuit (dedicated) | <span class="em em-cross" role="img" aria-label="don't"></span> |
| EV charger circuit (no socket) | <span class="em em-cross" role="img" aria-label="don't"></span> |
| Immersion heater circuit | <span class="em em-cross" role="img" aria-label="don't"></span> |

**Important nuance:** a circuit that supplies a fused connection unit (FCU) with no accessible socket is not a socket circuit for the purposes of this regulation. A circuit ending in a 13 A socket — even if only one socket is on the circuit — is a socket circuit and falls within scope.

---

## AFDD vs MCB vs RCBO: The Full Protection Stack

| Device | Overload | Short Circuit | Earth Leakage | Series Arc | Parallel Arc |
|---|---|---|---|---|---|
| MCB | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | Partial |
| RCD / RCBO | Partial | Partial | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> |
| AFDD + MCB | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> |
| **AFDD + RCBO** | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> |

The **AFDD + RCBO** combination is the gold standard for socket circuits in new installations. It is the only single-device solution that covers all four major fault types.

---

## How Much Does an AFDD Cost?

This is usually the first question after an electrician quotes for one.

| Device | Approximate Cost (2024–2025) |
|---|---|
| Standard MCB | £5–10 |
| RCBO | £15–30 |
| AFDD + MCB combined | £40–70 |
| AFDD + RCBO combined | £55–90 |

A full 10-circuit consumer unit with AFDD + RCBOs on all socket circuits (say, 6 socket circuits) adds approximately **£200–400** to device cost compared to standard RCBOs alone. For a complete consumer unit replacement including labour, a fully AFDD-protected board typically costs £800–1,500 depending on location and number of circuits, vs £600–1,100 for an RCBO-only board.

The price premium is real but not extreme — particularly for landlords of HMOs and care homes where the regulation mandates it, and where the cost of an electrical fire (insurance, liability, tenant safety) vastly exceeds the cost of the protection.

---

## Nuisance Tripping: The Main AFDD Complaint

The most common complaint about early-generation AFDDs was nuisance tripping — the device interpreting normal equipment as an arc fault and cutting power unnecessarily.

Sources of false arc signatures include:

- **Dimmer switches** — leading-edge phase-cut dimmers produce high-frequency current spikes that can resemble arc signatures
- **Motor brushes** — universal motors in vacuum cleaners, power tools, and older appliances produce brush sparking during commutation
- **Switch-mode power supplies** — computers, phone chargers, and LED drivers produce complex waveforms
- **Older appliances with worn components** — degraded motor brushes or failing capacitors in ageing equipment

Modern AFDDs (from established manufacturers such as Hager, Schneider Electric, Eaton, and ABB) use more sophisticated algorithms that better distinguish genuine arc faults from normal equipment noise. Second and third-generation devices are significantly more reliable than early models.

**Practical advice:**
- Fit AFDDs from established, reputable manufacturers — not the cheapest available
- If a new AFDD trips repeatedly with no fault condition, test appliances on the circuit individually to identify the source of interference
- Some AFDD models have an indicator or logging function that shows the reason for tripping — use this for diagnostics before condemning the device

---

## Do You Need an AFDD? Decision Guide

Work through these questions:

**1. Is this a new consumer unit installation or a new circuit?**
If yes, proceed to question 2. If no (existing installation, no new circuits being added), AFDDs are not required by current regulations.

**2. Is the property an HMO, purpose-built student accommodation, care home, or Higher Risk Residential Building?**
If yes, AFDDs are **mandatory** on all new socket circuits up to 32 A under Regulation 421.1.7.

**3. Is the property an owner-occupied dwelling?**
If yes, AFDDs are **recommended** but not mandatory. Consider fitting them if:
- The property has old wiring that will not be fully replaced
- The building is timber-framed or has elevated fire risk
- There are sleeping areas above the main wiring routes
- You want the highest available level of fire protection

**4. Are you a landlord of a single let property (not HMO)?**
Not currently mandatory under BS 7671 for socket circuits, but recommended. Note that EICR requirements and local authority licensing conditions may impose additional requirements — always check the current EICR guidance and any specific licensing conditions for your property.

---

## Identifying an AFDD in a Consumer Unit

AFDDs look similar to RCBOs — they are typically single-width devices with a test button. Key identifiers:

- **Labelling:** "AFDD", "Arc Fault", or the arc symbol (a stylised arc between two points) on the face
- **Standards marking:** BS EN 62606 (the AFDD standard, distinct from BS EN 61009 for RCBOs)
- **Two trip indicators:** most AFDD+RCBO devices have separate indicators for the RCD trip and the arc fault trip, so you can see which mechanism operated
- **Test button:** like an RCBO, has a test button — pressing it simulates an arc fault signature to verify the arc detection circuitry is functional

If a consumer unit has standard MCBs or RCBOs with no test button other than the RCD test, it does not have AFDD protection.

---

## AFDD Testing: What to Check and How Often

### Press the test button
Like an RCD test button, pressing the AFDD test button should cause the device to trip immediately. This confirms the arc detection circuitry is functional. Test frequency: at least annually, or whenever an EICR is carried out.

### What happens if it doesn't trip on test?
The arc detection element is faulty. The device should be replaced. The overcurrent and earth leakage protection (if it's an AFDD + RCBO) may still function, but the arc fault protection cannot be relied upon.

### AFDD and EICRs
From Amendment 2, inspectors carrying out EICRs on properties where AFDDs are required (HMOs, care homes, purpose-built student accommodation, etc.) may note their absence as a departure if the inspected work should have complied with the current requirement. For older existing installations, absence of AFDDs is not automatically a dangerous defect; coding depends on the age of the installation, the premises type, observed risk, and inspector judgement.

---

## Common Questions About AFDDs

### Can I retrofit AFDDs to an existing consumer unit?

Yes, if the consumer unit has available space and the AFDD is compatible with the board manufacturer's equipment. Most major manufacturers (Hager, Schneider, Eaton) produce AFDDs designed to fit their own consumer unit ranges. Cross-brand fitting is not recommended and may not be certified.

If the existing board is full or uses obsolete equipment, retrofitting AFDDs may not be practical without replacing the consumer unit — at which point a full AFDD + RCBO installation makes more sense.

### Do AFDDs work on older wiring?

Yes — in fact, this is where they provide the most benefit. Older wiring with degraded insulation, loose connections, and ageing terminations is exactly the environment where arc faults develop. An AFDD on a circuit with 40-year-old cable provides protection that no other device can offer.

However, older wiring is also more likely to cause nuisance tripping due to its condition. If an AFDD is tripping repeatedly on an old circuit, this may be genuine arc fault detection — the wiring should be inspected, not the AFDD condemned.

### Are AFDDs the same as AFCIs?

Essentially yes. **AFCI (Arc Fault Circuit Interrupter)** is the North American (NEC) terminology for the same type of device. The standards differ (BS EN 62606 in the UK/Europe vs UL 1699 in North America) but the underlying principle — detecting arc signatures in the current waveform — is identical. US building codes have required AFCIs in bedrooms since 1999 and expanded requirements significantly since; the UK is following a similar trajectory with BS 7671 Amendment 2.

### Will all new consumer units need AFDDs?

The trend is clearly in that direction. The current regulations mandate them for higher-risk tenancies. As prices fall and reliability improves, it is reasonable to expect future amendments to BS 7671 to extend the mandatory requirement to all new domestic socket circuits — as has happened progressively with RCD requirements since the 16th Edition.

---

## Key Takeaways

- **Arc faults** — arcing inside damaged cables, loose connections, or degraded insulation — generate temperatures above 3,000°C and are a leading cause of electrical fires. MCBs and RCDs cannot detect them.
- **AFDDs** detect arc fault signatures by analysing the high-frequency content of the current waveform, and trip the circuit before the arc can ignite surrounding materials.
- **BS 7671 Regulation 421.1.7 (Amendment 2, 2022)** mandates AFDDs on in-scope socket circuits up to 32 A in HMOs, purpose-built student accommodation, care homes, and Higher Risk Residential Buildings.
- For **owner-occupied homes**, AFDDs are recommended but not currently mandatory — though this is likely to change in future amendments.
- The best solution for new installations is an **AFDD + RCBO per circuit** — one device covering overload, short circuit, earth leakage, and arc fault protection.
- **Nuisance tripping** affected early AFDDs; modern devices from established manufacturers are significantly more reliable. Always fit quality devices.
- AFDD + RCBO devices cost approximately **£55–90 per circuit** — a meaningful but not prohibitive premium over standard RCBOs.
- Test the AFDD test button at least **annually** to confirm arc detection circuitry is functional.

**Explore circuit protection in ElectraSim:** [Open ElectraSim →](/app/) — build and test MCB, RCD, and RCBO-protected circuits in your browser, free, no account required.
