---
title: "What is an RCD and Why Do You Need One?"
description: "An RCD can disconnect a dangerous earth fault fast enough to save your life. This guide explains exactly how Residual Current Devices work, why they're mandatory in modern wiring, and how to test RCD protection safely using a free electrical circuit simulator."
pubDate: 2026-05-10
author: ElectraSim
category: Beginner Guide
tags: [RCD, residual current device, electrical safety, earth fault, electrocution protection, circuit protection, consumer unit, RCBO, wiring safety]
---

An MCB will save your house from a fire. An RCD will save *you* from electrocution. They protect against completely different dangers — and every modern electrical installation needs both.

Yet the RCD is the less understood of the two. Most people know their circuit breaker trips when they overload a socket. Far fewer understand why that small button labelled **TEST** on their consumer unit is one of the most important safety features in their home.

This guide explains what an RCD is, how it works, why a regular MCB can't do its job, and how you can safely simulate RCD behaviour using **[ElectraSim](/app/)** — a free, browser-based electrical circuit simulator.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Try it now:** ElectraSim includes a fully functional RCD component. Build a protected circuit, simulate an earth fault, and watch the RCD trip — all in your browser, no sign-up required. [Open ElectraSim →](/app/)

## What Does RCD Stand For?

**RCD** stands for **Residual Current Device**. It's a fast-acting safety switch that monitors the current flowing into a circuit and the current flowing back out. In a healthy circuit these two values are equal. When they differ beyond the device threshold, the RCD trips and cuts power.

That difference in current is called **residual current**. It means current has found an unintended path to earth — for example, through a person who has touched a live wire, through a damaged cable insulation leaking to a metal casing, or through water that has entered an outdoor socket.

RCDs are also sold and labelled as:
- **RCCB** — Residual Current Circuit Breaker (same device, European terminology)
- **GFCI** — Ground Fault Circuit Interrupter (North American equivalent)
- **RCBO** — Residual Current Breaker with Overload (RCD + MCB combined in one unit)

## Why an MCB Cannot Protect Against Electrocution

This is the most important distinction in electrical protection — and the one most people misunderstand.

An **MCB trips on overcurrent**: it only activates when far more current flows than the circuit is designed for (typically 3–20× the rated current, depending on trip curve). A potentially lethal shock through a human body draws around **30–100 milliamps** — a fraction of what even the smallest 6A MCB needs to trip. The MCB will not even notice.

An **RCD trips on imbalance**: it monitors the difference between Live and Neutral current with extreme sensitivity — typically **30mA** for personal protection. A 30mA RCD is designed to disconnect quickly enough to reduce the risk of fatal electric shock; the exact trip time depends on the test current and device type.

| Device | Minimum Trip Current | Trip Time | Protects Against |
|---|---|---|---|
| **6A MCB** | ~18–30A (3–5×) | 0.1–5 seconds | Overload, short circuit |
| **30mA RCD** | 0.030A (30mA) | Time depends on test current; commonly tested at 1× and 5× IΔn | Earth faults, electric shock risk |
| **RCBO** | Both (combined) | Both | Everything |

**The brutal truth:** without an RCD, you could receive a potentially fatal shock and the MCB would never trip. The circuit would remain live the entire time.

## How an RCD Works: The Core Principle

Inside every RCD is a **toroidal transformer** — a ring-shaped core with two windings:

1. The **Live wire** passes through the ring in one direction
2. The **Neutral wire** passes through the ring in the opposite direction

In a healthy circuit, the current in Live equals the current in Neutral. Their magnetic fields cancel each other out exactly, and the transformer core sees zero net flux.

When a fault occurs — say, 30mA leaks to earth through a person — the Live current is now 30mA higher than the Neutral current returning. This imbalance creates a small net magnetic flux in the toroidal core. This induces a voltage in a third sensing winding, which triggers the trip solenoid, snapping the switch contacts open.

The entire process — from fault to contacts opening — is very fast, but the permitted trip time depends on the residual current. A standard 30mA RCD is commonly checked at rated residual current and at five times rated residual current; the 5× test is the one associated with the familiar 40 ms maximum.

## RCD Types and Sensitivity Ratings

Not all RCDs are the same. They differ by **trip current sensitivity** and **application**:

### By Sensitivity

| Rating | Use Case |
|---|---|
| **10mA** | Medical equipment, operating theatres, areas where even 30mA is too risky |
| **30mA** | Standard personal protection — domestic sockets, bathrooms, kitchens, outdoors |
| **100mA** | Fire protection only — not for personal protection (too slow to prevent electrocution) |
| **300mA / 500mA** | Main incoming protection for industrial installations |

For home wiring, **30mA is the standard** for any circuit where a person could come into contact with a live conductor.

### By Type

- **Type AC** — responds to sinusoidal AC fault currents only. The older standard, still common.
- **Type A** — responds to AC and pulsating DC faults. Required for circuits supplying modern electronics, EV chargers, and inverter-driven appliances.
- **Type F** — Type A plus protection against high-frequency fault currents from variable-speed drives.
- **Type B** — Responds to all fault current types including smooth DC. Required for EV charge points with 3-phase supply.

Most domestic wiring uses **Type A** in modern installations. If you have an EV charger or solar inverter, verify the RCD type with a qualified electrician.

## Where RCDs Are Required

Building regulations vary by country, but the general principle is consistent: **any circuit where electrocution risk is elevated must have RCD protection**. This typically includes:

- **Bathroom circuits** — water and electricity in the same room
- **Kitchen socket circuits** — high moisture, frequent appliance use
- **Outdoor circuits** — garden sockets, outdoor lighting, EV chargers
- **Garage and shed circuits** — tools, moisture, unknown equipment
- **Socket circuits throughout the home** — required in most modern wiring regulations
- **Any circuit supplying portable equipment** that could be used outdoors

In modern consumer units, **every circuit typically has individual RCD protection** via RCBOs. Older installations may have a single RCD covering multiple circuits — which means a single fault on one circuit kills power to all of them simultaneously (known as "nuisance tripping").

## The Difference Between RCD, RCBO, and Split-Load Consumer Units

### Single RCD (Older Installations)
One 30mA RCD covers half or all of the consumer unit. Simple and cheap, but one fault on any circuit trips everything on that RCD — including the fridge and any medical equipment.

### Split-Load Consumer Unit
The consumer unit is divided: one half is protected by an RCD, the other is not. Critical circuits (fridge, freezer, alarm) go on the unprotected side. Other circuits go on the RCD side. A compromise — but circuits on the unprotected side have no personal protection.

### Individual RCBOs (Modern Best Practice)
Every circuit has its own RCBO — a combined RCD + MCB. A fault on the kitchen sockets trips only that RCBO. Every other circuit stays live. This is the current best practice for new domestic installations.

## What RCDs Cannot Protect Against

RCDs are specifically designed for **earth fault and electrocution protection**. They do not protect against:

- **Overload** — too much current on one circuit (that's the MCB's job)
- **Short circuit between Live and Neutral** (the MCB handles this)
- **Live-to-Neutral shock** — if you touch both Live and Neutral simultaneously, current flows between them, not to earth. The RCD sees no imbalance and does not trip. This is why safe working practice still matters even with RCDs installed.

## Testing Your RCD: The TEST Button

Every RCD and RCBO has a **TEST button**. Pressing it creates an internal fault current that bypasses the toroidal transformer, simulating a real earth leakage. The RCD should trip immediately — the button press should feel firm and the device should click off.

**How often to test:** At least every 6 months for domestic installations. Monthly for high-risk environments (workshops, outdoor circuits used regularly).

**What to do if it doesn't trip:** The RCD is faulty and must be replaced immediately. An RCD that doesn't trip on test provides no protection.

> <span class="em em-warning" role="img" aria-label="warning"></span> **Important:** A TEST button failure means the RCD is defective — not that the circuit is fine. Replace it before using any circuits it protects.

## How to Simulate RCD Protection in ElectraSim

[ElectraSim](/app/) includes a full RCD component so you can understand and verify RCD behaviour before working on real circuits. Here's how to build and test an RCD-protected socket circuit:

**Building the circuit:**
1. Open [ElectraSim](/app/)
2. Place a **Live (L)** terminal and a **Neutral (N)** terminal
3. Place an **MCB** — wire Live → MCB
4. Place an **RCD** — wire MCB output → RCD L-in, wire Neutral → RCD N-in
5. Place a **3-Pin Socket** — wire RCD L-out → Socket L, RCD N-out → Socket N
6. Wire an **Earth (E)** terminal directly to Socket E
7. Press **Run** — the socket is live and fully protected

**What this demonstrates:**
- The circuit has two layers of protection: the MCB handles overloads and short circuits; the RCD handles earth faults
- The Live and Neutral both pass through the RCD, so any imbalance is detected
- The Earth wire bypasses the RCD entirely — it provides a low-resistance fault path back to the source, which is exactly what triggers the RCD to trip

This is the fundamental wiring pattern behind every protected socket outlet, bathroom circuit, and outdoor power point in a modern home.

## RCD vs MCB: Which Do You Need?

The answer is **both** — they protect against entirely different hazards and are not interchangeable.

| | MCB | RCD | RCBO |
|---|---|---|---|
| **Overload protection** | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> |
| **Short circuit protection** | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> |
| **Earth fault protection** | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> |
| **Electrocution protection** | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> |
| **Resettable** | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-check" role="img" aria-label="do"></span> |
| **Individual circuit isolation** | <span class="em em-check" role="img" aria-label="do"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> (shared) | <span class="em em-check" role="img" aria-label="do"></span> |

For any new installation or rewire, **RCBOs on every circuit** is the current best practice and what most modern wiring standards mandate.

## Key Takeaways

- An **RCD monitors the balance** between Live and Neutral current and disconnects quickly when it detects leakage — fast enough to reduce the risk of fatal electric shock
- A **30mA RCD** trips on a current too small for any MCB to notice — this is by design, because 30mA can kill
- MCBs and RCDs protect against **different things** — every circuit needs both, ideally as a combined **RCBO**
- Press the **TEST button** every 6 months to verify your RCD is functional
- Use **Type A or higher** for circuits supplying modern electronics, inverters, or EV chargers
- You can safely simulate and explore RCD-protected circuits for free in **[ElectraSim](/app/)** — no installation, no sign-up

**Ready to build your first RCD-protected circuit?** [Open ElectraSim now →](/app/) and wire up a protected socket outlet in under two minutes.
