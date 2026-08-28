---
title: "Types of Earthing Systems Explained: TN-S, TN-C-S (PME) and TT"
description: "TN-S, TN-C-S (PME) and TT are the three earthing systems used in UK domestic installations. This guide explains exactly how each one works, how to identify yours, and why earthing is the foundation of electrical safety."
pubDate: 2026-05-19
author: ElectraSim
category: Beginner Guide
tags: [earthing systems, TN-S, TN-C-S, PME, TT earthing, earth electrode, BS 7671, electrical safety, neutral earth bond, MET, main earth terminal, fault current, wiring regulations]
---

Every electrical installation needs a path back to earth so that fault current can flow safely and protective devices can operate. How that earth path is provided depends on the **earthing system** of the installation — and in the UK, three types dominate: **TN-S**, **TN-C-S (PME)**, and **TT**.

Understanding which system you have changes everything from how RCDs are sized to how you bond water and gas pipes, and even where you can run cables. This guide explains all three, how to identify them, and why each exists. You can simulate the consequences of broken earths and faulty bonding in **[ElectraSim](/app/)** — a free in-browser circuit simulator.

---

## Why Earthing Exists

Earthing has two distinct purposes that often get confused:

1. **Fault clearance** — providing a low-impedance path for fault current to flow back to the supply, so that an MCB or RCBO trips fast enough to disconnect the circuit before anyone is harmed
2. **Protection from touch voltage** — ensuring that exposed metal parts of equipment never sit at a dangerous voltage relative to earth, even when something goes wrong

Both depend on a continuous, low-resistance connection from every metal enclosure back to the earth reference point of the supply. The three earthing systems differ in **how that reference point is provided** and **where the earth path actually goes**.

> Related: [Live, Neutral and Earth Wires Explained](/blog/live-neutral-and-earth-wires-explained/)

---

## Decoding the Letters

The names look cryptic but follow a strict logic. Each system is described by two or three letters:

**First letter — supply earth arrangement:**
- **T** = directly connected to earth (Latin: *terra*)
- **I** = isolated from earth

**Second letter — installation earth arrangement:**
- **T** = exposed metal parts connected directly to earth via a local electrode
- **N** = exposed metal parts connected to the supply's earth (the neutral or a separate conductor)

**Third letter (optional) — neutral and earth conductor arrangement:**
- **S** = neutral and earth are **separate** all the way back to the source
- **C** = neutral and earth are **combined** in a single conductor
- **C-S** = combined in the supply, separated at the installation

---

## TN-S: Separate Earth Conductor from the Supply

In a **TN-S** system, the supply provides a dedicated earth conductor that runs all the way back to the transformer. The neutral and earth are physically separate conductors throughout the entire path from the consumer unit to the source.

```
Transformer ── Neutral ──────────────── Consumer unit (N)
            ── Live ──────────────────── Consumer unit (L)
            ── Earth (sheath) ────────── Consumer unit (MET)
```

In practice, the earth conductor is usually the **metal sheath of the supply cable** — typically a lead or steel sheath on older underground cables. The cable is brought into the cut-out and an earth tail is connected from the sheath to the **Main Earth Terminal (MET)** in the consumer unit.

### Identifying TN-S

- A separate, dedicated earth tail emerges from the supply cable head
- The earth conductor is connected to the cable's lead/steel sheath, not to the neutral
- Common in older installations supplied by metal-sheathed cables (pre-1970s suburbs, urban areas with cast-iron mains)

### Advantages

- Clean separation of neutral and earth — no risk of neutral-to-earth voltage rise
- Reliable earth fault path under normal conditions
- Simple to design and protect

### Limitations

- Depends on the integrity of the supply cable sheath — corrosion or breakage can lose the earth
- Increasingly rare in new supplies as DNOs (Distribution Network Operators) standardise on PME

---

## TN-C-S (PME): Combined Earth and Neutral in the Supply

**TN-C-S** is the modern UK standard for new connections. It is also called **PME** — **Protective Multiple Earthing**. The supply uses a **combined neutral and earth conductor (CNE or PEN)** from the transformer to the cut-out. At the cut-out, the conductor is split — neutral goes to the meter, earth goes to the consumer unit's MET.

```
Transformer ─ Live ────────────────── Consumer unit (L)
            ─ PEN (neutral + earth) ─ Cut-out
                                       ├── N to meter
                                       └── Earth to MET
```

The same physical conductor in the supply cable serves as both the neutral return path and the earth reference. At the cut-out, an internal link (the "neutral-earth link" or N-E bond) connects the two and provides a separate earth tail to the installation.

The "Multiple Earthing" part refers to the fact that the PEN conductor is **earthed at multiple points along its length** — at the transformer, at distribution pillars, and sometimes at consumer cut-outs. This redundancy keeps the earth reference low even if one earth electrode fails.

### Identifying TN-C-S

- The supply cable arrives with no separate earth conductor
- Inside the cut-out, a link visibly connects the neutral block to the earth tail
- Standard for almost all new domestic connections in the UK since the 1980s
- The DNO confirms PME on the connection paperwork or supply records

### Advantages

- Lower earth fault loop impedance (Zs) — fast disconnection under fault
- No reliance on a separate earth conductor
- Multiple earth electrodes provide redundancy

### Limitations and the "Open PEN" Risk

The major risk of TN-C-S is **PEN conductor failure**. If the combined neutral-earth conductor breaks somewhere upstream of the cut-out — a corroded joint, a damaged underground cable — the installation's earth reference is lost. Worse, the neutral current of the property (and possibly other properties on the same supply) has nowhere to go except via the customer's earthing system, including any bonded metalwork.

This is why **main protective bonding** of incoming gas, water, and (where present) oil pipes is mandatory in TN-C-S installations — the bonding ensures all extraneous metal parts stay at the same potential as the earth conductor, even if that potential rises during a PEN failure.

It is also why TN-C-S is **prohibited or restricted in certain locations**:
- **EV charge points** outdoors — recent BS 7671 amendments require additional protective measures, often involving a TT system or a PEN fault detector
- **Caravan parks, boat moorings, agricultural buildings** — the touch-voltage risk during a PEN fault is too high
- **Petrol stations and explosive atmospheres**

> Related: [What Is an RCBO? The Difference Between RCD, MCB and RCBO Explained](/blog/what-is-an-rcbo-difference-between-rcd-mcb-rcbo/)

---

## TT: Local Earth Electrode

A **TT** system has no earth connection from the supply. The installation provides its own earth reference via a **local earth electrode** — typically one or more copper-clad rods driven into the ground near the consumer unit.

```
Transformer ─ Live ──────────── Consumer unit (L)
            ─ Neutral ────────── Consumer unit (N)

Earth rod ───────────── Consumer unit (MET)
   |
   ▼
 Soil
```

The neutral comes directly from the supply transformer; earth is purely a property-side concept generated by ground contact at the rod. Fault current must return to the supply transformer via the soil itself — a much higher-impedance path than a metallic conductor.

### Identifying TT

- A visible earth rod outside the property, with an earth tail running into the consumer unit
- Often older rural installations, properties supplied by overhead lines, and any installation where the DNO does not provide an earth connection
- Modern caravan/marina pitches, certain agricultural buildings, and some EV charger installations are deliberately TT-isolated

### Why TT Needs RCDs

The earth fault loop impedance of a TT system is high — often 20–200 ohms via the soil. At 230 V, that produces fault current of just 1–10 A, which is **far below the magnetic trip threshold of an MCB**. A 32 A Type B MCB needs 96–160 A to trip instantaneously; a TT earth fault might produce 5 A.

The MCB will not trip on an earth fault. This is why TT installations **require RCD protection on every circuit** — only the residual current detection of an RCD or RCBO will respond to the small fault currents that a high-impedance earth path generates.

### Advantages

- Independent of supply earthing failures (no PEN risk)
- Required where supply earthing is unavailable
- Good for installations where exposed conductive parts are at risk of foreign earth contact (caravans, boats)

### Limitations

- High earth fault loop impedance — relies entirely on RCDs for fault clearance
- Earth electrode resistance varies with soil moisture, season, and corrosion
- Typically requires periodic testing of the earth electrode resistance

---

## Comparison Summary

| Feature | TN-S | TN-C-S (PME) | TT |
|---|---|---|---|
| **Earth source** | Supply cable sheath | Supply PEN conductor | Local earth rod |
| **Typical Zs** | 0.3–0.8 Ω | 0.2–0.35 Ω | 5–200 Ω |
| **Relies on RCDs?** | Optional but required for sockets per BS 7671 | Optional but required for sockets per BS 7671 | **Mandatory for all circuits** |
| **PEN failure risk?** | No | Yes | No |
| **Common in new builds?** | No | Yes (standard) | Where DNO earth unavailable |
| **Bonding required?** | Yes | Yes (extensive) | Yes |

---

## How to Identify Your Earthing System

You can usually tell from a quick inspection of the cut-out and consumer unit:

1. **Look at the supply cable head** (cut-out / Henley block):
   - **Separate earth tail emerging from the cable sheath** → TN-S
   - **Earth tail emerging from a link at the neutral block** → TN-C-S (PME)
   - **No earth tail from supply, but a cable going outside to a rod** → TT

2. **Check the installation paperwork:**
   - The Electrical Installation Certificate (EIC) or EICR records the earthing arrangement on the front page
   - DNOs will confirm the supply earthing system on request

3. **Measure the earth fault loop impedance (Ze):**
   - TN-S: typically 0.3–0.8 Ω at the origin
   - TN-C-S: typically 0.2–0.35 Ω
   - TT: typically several ohms to several hundred ohms

This is a job for a qualified electrician with a calibrated loop tester. Do not attempt to measure Ze on a live installation without proper training.

---

## Main Protective Bonding

Regardless of the earthing system, BS 7671 requires **main protective bonding** of any extraneous-conductive-parts entering the building — typically the incoming gas service, water service, and any structural metalwork that could introduce a foreign earth potential.

Main bonding ensures that all metal parts within the building remain at the same potential during a fault. Without it, a fault on the installation's earthing could leave the gas pipe at 230 V relative to the house's earth — a serious touch-voltage hazard.

The bonding conductor sizes are specified in BS 7671 Table 54.7:

| Earthing system | Main bonding conductor (typical) |
|---|---|
| TN-S | 6 mm² minimum, 10 mm² for larger services |
| TN-C-S (PME) | **10 mm² minimum** (because PEN failure consequences are higher) |
| TT | 6 mm² minimum |

> Related: [Distribution Board Explained: How a Consumer Unit Is Wired](/blog/distribution-board-explained-how-a-consumer-unit-is-wired/)

---

## Why This Matters for Modern Installations

The earthing system has become more important in recent years, not less. Three factors have driven the change:

### 1. EV charging

A standard PME (TN-C-S) earth is not always considered safe for outdoor EV charge points because of the open-PEN risk — if the supply PEN fails while a person is touching the car and standing on the ground, they become part of the fault current path. BS 7671 Amendment 2 introduced specific requirements for EV charge points, including options for:

- Open PEN protection devices that disconnect on PEN failure
- TT-isolated charge points with their own earth electrode
- Protective earthed neutral arrangements with very low Zs

### 2. Solar PV and battery storage

Microgeneration and battery systems can inject current back into the supply, which alters the dynamics of the neutral and earth conductors. Earthing system design needs to account for both directions of energy flow.

### 3. Smart meters and load monitoring

Smart meters draw a small but constant current from the live and return through the neutral. Subtle issues with neutral integrity that would have gone unnoticed in older installations can now be detected and reported by the DNO — sometimes before the customer is aware of any problem.

---

## Simulating Earth Faults in ElectraSim

[ElectraSim](/app/) lets you visualise what happens when an earth fault develops on a circuit. Using **Fault Simulation Mode**, you can:

- Inject an **earth fault** on any component and watch the fault path light up
- Combine an earth fault with an RCD upstream to see the RCD trip
- Compare the behaviour of a circuit with and without RCD protection — exactly the difference between a TN system relying on MCB clearance and a TT system that needs RCDs to function safely

> [Open ElectraSim — free, no sign-up →](/app/)

> Related: [Fault Simulation Mode: Open Circuit, Reverse Polarity and Earth Faults](/updates/fault-simulation-mode-open-circuit-reverse-polarity-earth-fault/)

---

## Frequently Asked Questions

### Can I change my earthing system?

Sometimes. If your supply is TN-S but the metal sheath has degraded, the DNO may upgrade you to TN-C-S during a service replacement. Going from TN-C-S to TT is a customer decision (typically driven by EV charging requirements) and involves installing an earth electrode and isolating the supply earth at the consumer unit. The reverse — TT to TN-C-S — requires the DNO to provide an earth.

### Is TT system more dangerous than TN-C-S?

Not inherently — but it depends entirely on RCDs working correctly. TN systems can clear earth faults with MCBs alone (although BS 7671 still requires RCDs for socket circuits and certain locations). TT cannot. A TT installation with a failed or removed RCD has no functional earth fault protection.

### What is "PEN" and why does it matter?

PEN stands for **Protective Earth Neutral** — the combined conductor in a TN-C-S supply that carries both neutral current and earth reference. The "open PEN" condition is when this conductor breaks somewhere in the supply, which can leave the installation's earth potential floating up to mains voltage. This is the principal residual risk of TN-C-S systems and the reason for extensive bonding requirements.

### Do I need an earth electrode in a TN-C-S installation?

Generally no — the supply provides the earth reference. However, some installations add a supplementary earth electrode for resilience, and EV charge points with open-PEN protection devices may require one. Always follow BS 7671 and the manufacturer's installation instructions.

### Can a single property have a mix of earthing systems?

Yes — for example, the main installation might be TN-C-S, while a detached EV charge point or outbuilding is wired as a TT-isolated system with its own earth electrode and dedicated RCD protection. This is increasingly common for EV charge points to manage open-PEN risk.

---

## Key Points

- **TN-S** — separate earth conductor from supply (older installations, becoming rare)
- **TN-C-S / PME** — combined neutral and earth in supply, split at cut-out (modern UK standard)
- **TT** — local earth electrode, no earth from supply (rural, EV-isolated, off-grid)
- TT installations **must** use RCDs for fault clearance — MCBs alone cannot detect TT earth faults
- **Main bonding** of incoming services is mandatory in all systems, with extra emphasis in TN-C-S
- **Open-PEN risk** is the principal limitation of TN-C-S and drives modern EV charging earthing requirements

**Build, simulate, and trace fault paths in [ElectraSim →](/app/)** — free, no installation required.
