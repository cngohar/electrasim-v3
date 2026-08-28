---
title: "What Is an RCBO? The Difference Between RCD, MCB and RCBO Explained"
description: "An RCBO combines overcurrent protection with earth leakage detection in one device. This guide explains how it works, how it compares to MCBs and RCDs, and when you should use one."
pubDate: 2026-05-17
updatedDate: 2026-08-22
author: ElectraSim
category: Beginner Guide
tags: [RCBO, RCD, MCB, circuit breaker, earth leakage, overcurrent protection, consumer unit, electrical protection, BS 7671, wiring regulations, residual current]
---

Walk into a modern consumer unit and you will likely see a mixture of devices: some slim single-width breakers, possibly a wider double-width device near the top, and in newer installations, a row of slightly chunkier breakers — one for every circuit. Those chunkier devices are **RCBOs**, and understanding why they are increasingly replacing traditional MCB-plus-RCD arrangements will give you a much clearer picture of how domestic protection works.

This guide explains what an RCBO is, how it differs from an MCB and an RCD, the practical advantages it offers, and how to identify which protection device a circuit actually needs. You can explore protected circuit behaviour hands-on in **[ElectraSim](/app/)** — a free browser-based circuit simulator.

---

## The Three Devices at a Glance

| Device | Protects Against | Does Not Protect Against |
|---|---|---|
| **MCB** | Overcurrent (overload + short circuit) | Earth leakage / electric shock |
| **RCD** | Earth leakage (shock + fire) | Overcurrent / cable overload |
| **RCBO** | **Both** overcurrent and earth leakage | Nothing — it covers both |

An RCBO is not a third, separate category. It is a single device that integrates the functions of the other two.

---

## What Does an MCB Do?

A **Miniature Circuit Breaker (MCB)** protects a circuit's wiring against too much current. It has two trip mechanisms:

- **Thermal element** — a bimetal strip that bends under sustained overload current and trips the breaker after a time delay proportional to the overload magnitude
- **Magnetic element** — a solenoid that responds to the very high instantaneous current of a short circuit, tripping in milliseconds

An MCB is rated by current (6 A, 10 A, 16 A, 32 A, etc.) and by tripping characteristic (Type B, C, or D), which defines how quickly it trips at a given multiple of its rated current. A Type B 16 A MCB, for example, trips instantaneously at 3–5 × 16 A, which covers most domestic short circuits.

**What an MCB cannot do:** detect earth leakage. If someone receives an electric shock and 30 mA flows through their body to earth, the MCB sees only 30 mA on the live conductor — a tiny fraction of its rated current. It will not trip. The person receives the full shock.

> Related: [What Is an MCB Breaker? How Miniature Circuit Breakers Work](/blog/what-is-an-mcb-breaker/)

---

## What Does an RCD Do?

A **Residual Current Device (RCD)** protects against earth leakage — current that leaves on the live conductor but does not return on the neutral. Any imbalance indicates current is flowing via an unintended path, typically through a person or through damaged insulation to earth.

The RCD continuously compares live and neutral current through a differential current transformer (toroid). The difference between the two is the residual current. When this exceeds the trip threshold — typically **30 mA** for personal protection — the RCD disconnects quickly. The exact trip time depends on the residual current and device type; the familiar 40 ms maximum applies to the higher-current 5× IΔn test.

**What an RCD cannot do:** protect against overcurrent. A circuit on an RCD with no MCB in series could carry dangerous overload current indefinitely. The RCD only monitors the balance between live and neutral; it is entirely indifferent to how much current is flowing as long as live and neutral carry equal amounts.

> Related: [What Is an RCD and Why Do You Need One?](/blog/what-is-an-rcd-and-why-do-you-need-one/)

---

## What Does an RCBO Do?

An **RCBO (Residual Current Circuit Breaker with Overcurrent protection)** combines both mechanisms in a single device. It protects against:

- **Overload** — sustained current above the device's rating (thermal trip)
- **Short circuit** — sudden very high fault current (magnetic trip)
- **Earth leakage** — current imbalance above the residual current threshold (differential toroid trip)

One RCBO replaces what used to require both an MCB and a separate RCD protecting the same circuit.

---

## RCBO vs MCB + RCD: What Changes in Practice?

### Traditional arrangement — RCD protecting a group of circuits

In many older consumer units and some current budget installations, a single RCD protects several circuits at once. The layout looks like this:

```
Incoming supply
  → Main switch
    → RCD (30 mA) — protects circuits A, B, C, D
      → MCB A (ring main)
      → MCB B (lighting)
      → MCB C (kitchen)
      → MCB D (garage)
```

**The problem:** if any one of circuits A–D develops an earth fault, the RCD trips — cutting power to all four circuits simultaneously. A single faulty lamp on the lighting circuit can plunge the entire house into darkness.

### Modern arrangement — individual RCBO per circuit

With RCBOs, each circuit has its own combined device:

```
Incoming supply
  → Main switch
    → RCBO A (ring main — 32 A / 30 mA)
    → RCBO B (lighting — 6 A / 30 mA)
    → RCBO C (kitchen — 32 A / 30 mA)
    → RCBO D (garage — 16 A / 30 mA)
```

**The advantage:** a fault on circuit B trips only RCBO B. Circuits A, C, and D remain live. The fault is isolated to the single affected circuit.

---

## RCBO Types: Type A vs Type B

Not all RCBOs detect the same type of residual current. This matters more than most people realise.

| Type | Detects | Typical Use |
|---|---|---|
| **Type AC** | Sinusoidal AC residual current only | Traditional resistive loads |
| **Type A** | AC + pulsating DC residual current | Most modern electronics, washing machines, EV chargers (single phase) |
| **Type B** | AC + pulsating DC + smooth DC | Three-phase equipment, some EV chargers, solar inverters |

Most domestic RCBOs fitted today are **Type A**, which covers the majority of household equipment including modern switch-mode power supplies, variable-speed motor drives in washing machines and dishwashers, and single-phase EV chargers.

**Type B RCBOs** are required where equipment produces smooth DC fault currents — some three-phase EV chargers and certain solar PV inverters. A Type A device will not respond to smooth DC residual current and would fail to provide protection. This is a frequently misunderstood requirement when installing home EV charging equipment.

---

## How to Identify What You Have

### In a consumer unit

- **MCB** — single-width device, no test button, rated current marked on front
- **RCD** — typically double-width, has a **Test** button, rated in mA (30 mA), may show a tripping current but not a circuit current rating
- **RCBO** — single or one-and-a-quarter-width device, has a **Test** button, shows both a current rating (e.g. 16 A) and a residual current rating (e.g. 30 mA)

### On the label

An RCBO will always display both values:
- **16 A / 30 mA** — 16 A overcurrent rating, 30 mA residual current sensitivity
- **Type B** or **Type A** marking (often on the front label or side)
- **BS EN 61009** — the standard for RCBOs (distinct from BS EN 60898 for MCBs and BS EN 61008 for RCDs)

---

## When BS 7671 Requires RCD Protection

The 18th Edition of the Wiring Regulations (BS 7671) significantly extended the requirement for RCD protection. Key requirements include:

- **All socket outlets** up to 32 A in most locations must have 30 mA RCD protection
- **All circuits in bathrooms** must have 30 mA RCD protection
- **All cables buried in walls** at less than 50 mm depth without mechanical protection must have 30 mA RCD protection
- **Outdoor circuits** must have 30 mA RCD protection

In practice, this means most circuits in a modern domestic installation require RCD protection. An RCBO per circuit is often the cleanest way to provide this whilst avoiding the nuisance-tripping problem of a shared RCD.

---

## Do RCBOs Have Any Disadvantages?

### Cost

An RCBO costs significantly more than a single MCB. In a 10-circuit consumer unit, replacing all MCBs with RCBOs increases the device cost materially. However, the labour saving (no separate RCD required) and the improved discrimination (only the faulted circuit trips) often offset this.

### Space

Most RCBOs occupy one consumer unit pole position per circuit — the same as an MCB. Some older or lower-cost RCBO designs occupy one-and-a-quarter positions, which can reduce total circuit capacity in a standard board. Always check the manufacturer's specification before specifying.

### Nuisance tripping on individual circuits

While individual RCBO tripping is better than a shared RCD tripping (because only one circuit is lost), a sensitive or ageing appliance that repeatedly trips its RCBO can still be inconvenient. The root cause is always either a faulty appliance or genuine wiring insulation degradation — not the RCBO itself.

---

## Simulating Protection in ElectraSim

[ElectraSim](/app/) includes **MCB**, **RCD**, and **RCBO** components that you can wire into circuits to explore how protection devices interact with faults. The RCBO component (added in v1.6) is a two-pole device that switches Live and Neutral together, just like the single-module RCBOs in a modern consumer unit.

The fastest way to see an RCBO in context is the **RCBO-Protected Socket** guided circuit: open ElectraSim, choose Guided Circuits, and load it to inspect a socket outlet supplied through an RCBO with a protective-earth connection and a plugged-in test load.

To compare overcurrent protection with earth leakage protection yourself:

1. Build a circuit: **Power Supply → RCBO → Socket → Load**
2. Run the simulation — the load energises normally
3. Add a **short circuit** fault (wire the load's output directly back to the supply's neutral port) — the overcurrent side of the protection detects the fault and the circuit is flagged as a short circuit error
4. Now enable **Fault Simulation Mode** (<span class="em em-warning" role="img" aria-label="warning"></span> button) and apply an **Earth Fault** to the load component
5. The residual side of the protection responds, representing what the earth-leakage detection in an RCBO or RCD picks up in a real installation
6. Rebuild the same circuit with a separate **MCB + RCD in series** to see how the older two-device layout provides the same two protections in two enclosures

> Try it now: [Open ElectraSim →](/app/)

For more on fault simulation: [Fault Simulation Mode — complete guide](/updates/fault-simulation-mode-open-circuit-reverse-polarity-earth-fault/)

---

## Frequently Asked Questions

### Can I replace an MCB with an RCBO in any consumer unit?

RCBOs are generally available for all major consumer unit brands (Hager, Schneider, Wylex, MK, etc.), but they must be the correct type for the board. RCBOs are not universally interchangeable — always check the consumer unit manufacturer's approved device list.

### Does an RCBO need to be tested?

Yes. The **Test button** on an RCBO should be pressed periodically (quarterly is a common recommendation) to verify the RCD element operates. Pressing the test button deliberately creates a small internal imbalance to simulate a fault — if the device trips, the mechanism is functioning.

### What is the difference between 30 mA and 100 mA RCD protection?

- **30 mA** — personal protection (shock, fire). Required for most domestic circuits.
- **100 mA** — fire protection only, not personal protection. Used for time-delayed RCDs at the origin of an installation, where discrimination with downstream 30 mA devices is needed.

An RCBO for a domestic socket or lighting circuit will almost always be 30 mA.

### Is a 30 mA RCBO enough for an EV charger?

It depends on the charger type and the earth fault current waveform it can produce. Dedicated EV charger circuits typically require a **Type A** or **Type B** RCBO. Many modern EV charger units have built-in protection that satisfies BS 7671 requirements without a separate Type B RCBO — always consult the charger manufacturer's installation manual and the relevant part of BS 7671 Amendment 2.

---

## Summary

| | MCB | RCD | RCBO |
|---|---|---|---|
| **Overcurrent protection** | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> |
| **Earth leakage protection** | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> |
| **Individual circuit isolation** | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> (shared) | <span class="em em-check" role="img" aria-label="do"></span> |
| **Test button required** | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> |
| **Standard** | BS EN 60898 | BS EN 61008 | BS EN 61009 |

An RCBO is simply the correct device when a circuit needs both types of protection and you want a fault on that circuit to trip only that circuit — which in a modern BS 7671-compliant installation is nearly every circuit in the building.

**Explore circuit protection in action:** [Open ElectraSim →](/app/) — free, no account required.
