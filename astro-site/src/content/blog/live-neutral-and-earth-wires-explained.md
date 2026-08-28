---
title: "Live, Neutral and Earth Wires Explained"
description: "What do the brown, blue and green-yellow wires actually do? This complete guide explains the roles of live, neutral and earth in UK wiring, what happens when they're mixed up, and how to safely explore all three conductors in a free circuit simulator."
pubDate: 2026-05-14
author: ElectraSim
category: Beginner Guide
tags: [live wire, neutral wire, earth wire, UK wiring colours, brown blue green yellow, electrical safety, earthing, bonding, wiring basics, circuit fundamentals]
---

Every cable in your home carries three conductors. Each one has a different job — and confusing them is one of the most dangerous mistakes in electrical work.

The **live** wire carries current to your appliance. The **neutral** wire returns it. The **earth** wire is invisible during normal operation, but it's the one that could save your life if something goes wrong.

This guide explains exactly what each wire does, why all three are necessary, what the UK colour codes mean, and what happens when they're connected incorrectly — with practical circuit diagrams throughout. You can also explore every concept hands-on using **[ElectraSim](/app/)**, a free browser-based electrical circuit simulator.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Try it now:** Build a live–neutral–earth circuit in ElectraSim, simulate a fault, and see how the earth and RCD interact — no sign-up, no download. [Open ElectraSim →](/app/)

---

## The Three Conductors at a Glance

| Conductor | UK Colour (post-2004) | Old UK Colour | Normal Voltage to Earth |
|---|---|---|---|
| **Live (L)** | Brown | Red | ~230 V AC |
| **Neutral (N)** | Blue | Black | ~0 V (close to earth potential) |
| **Earth (E)** | Green & Yellow | Green | 0 V |

These three conductors run together in every **twin-and-earth cable** — the flat grey cable used for most domestic fixed wiring in the UK. The earth conductor inside T&E cable is bare copper; it must be sleeved in green-and-yellow at every termination point.

---

## What Does the Live Wire Do?

The **live wire** is the conductor that carries current from the supply to your appliance. It is energised at approximately **230 V AC** relative to earth (in the UK and most of Europe). A voltage of 230 V on the live wire means there is enough electrical pressure to push current through any resistance — including the human body.

**Key facts about the live wire:**
- Always brown (post-2004 harmonised colours) or red (pre-2004)
- Connected to the phase output of the transformer at the substation
- Interrupted by switches — a light switch opens and closes the live conductor
- Protected by the MCB or fuse: if too much current flows, the MCB trips the live
- **Dangerous to touch even when the circuit appears off** — the live remains energised up to the switch, even when the switch is open

### Why Switches Must Always Break the Live

A switch must interrupt the **live** conductor, not the neutral. If you wire a switch into the neutral side, the appliance is still connected to live when the switch is open. The lamp may be off, but touching the lamp's live terminal would still give you a shock. This is why switched-live wiring is fundamental to safe installation — every switch disconnects the 230 V pressure before it reaches the load.

---

## What Does the Neutral Wire Do?

The **neutral wire** completes the circuit by providing a return path for current back to the transformer. Without a return path, current cannot flow — the circuit is open and nothing works.

**Key facts about the neutral wire:**
- Always blue (post-2004) or black (pre-2004)
- Bonded to earth at the **point of supply** — typically at the street-level transformer neutral star point and again at the consumer unit earth bar
- Normally carries the same current as the live wire
- Normally sits very close to 0 V potential relative to earth
- **Still dangerous to work on live** — even though the neutral is near 0 V, a broken neutral upstream can push it to 230 V under fault conditions

### The Neutral Is Not the Same as Earth

This is the most common beginner confusion. Both the neutral and the earth are at (or near) 0 V under normal conditions. But they serve fundamentally different purposes:

- **Neutral is the current return path** — it carries operating current continuously
- **Earth is a fault protection path** — it carries current only during a fault

Connecting them together downstream of the consumer unit (called a **lost neutral**) creates dangerous voltage differences and is the cause of many house fires. The two conductors share a common point only at the supply transformer and at the consumer unit main earth terminal — never anywhere else in the installation.

---

## What Does the Earth Wire Do?

The **earth wire** is the most misunderstood of the three. Under normal operation it carries **no current at all** — it just sits there, connected between the metal casing of appliances and the earth bar in the consumer unit.

Its job is **fault protection**.

Consider a washing machine with a metal drum. If the live wire inside the motor insulation degrades and makes contact with the metal casing, the casing becomes live at 230 V. Anyone touching the drum and standing on a conductive floor completes a circuit through their body to earth — a potentially fatal shock.

**With proper earthing:** the fault current flows through the low-resistance earth wire instead of through a person. The surge of fault current is large enough to trip the MCB almost instantly, cutting power before injury can occur.

**Key facts about the earth wire:**
- Always green and yellow (post-1977) or plain green (pre-1977)
- Bare copper inside twin-and-earth cable — must be sleeved green-and-yellow at terminations
- Connected to the metal casing of every Class I appliance (washing machines, cookers, boilers, metal-cased light fittings)
- **Not required on Class II (double-insulated) appliances** — these have two layers of insulation so the casing can never become live; indicated by the double-square symbol ⧈
- Connects back to the earth bar in the consumer unit, which connects to the **main earthing terminal (MET)**, then to the earth electrode (TT systems) or the supply cable's protective earth (TN systems)

### How Earthing Works With an MCB

For earthing to trip the MCB, the fault-current path must have **low enough resistance** to push current above the MCB's trip threshold. This is why earth continuity testing (a measured resistance between earth terminals) is a mandatory part of electrical inspection. A broken or high-resistance earth is invisible in normal operation but fails to trip the MCB during a fault.

For this reason, **RCDs are used alongside earthing** — an RCD detects leakage current at personal-protection levels (commonly 30 mA) and disconnects quickly, even where the earth-MCB path alone would not respond fast enough.

---

## UK Wiring Colour Codes: Old vs New

The UK changed its wiring colour code in **March 2004** to align with the IEC 60446 harmonised European standard. All new installations use the new colours, but millions of homes still contain old-colour wiring.

### Single-Phase (domestic) Wiring

| Conductor | New Colour (2004–present) | Old Colour (pre-2004) |
|---|---|---|
| Live | Brown | Red |
| Neutral | Blue | Black |
| Earth | Green & Yellow | Green (or bare) |

### Three-Phase (commercial/industrial) Wiring

| Conductor | New Colour | Old Colour |
|---|---|---|
| Phase L1 | Brown | Red |
| Phase L2 | Black | Yellow |
| Phase L3 | Grey | Blue |
| Neutral | Blue | Black |
| Earth | Green & Yellow | Green |

### Working on Mixed Old and New Wiring

When extending an old installation you may encounter red and black cables. **Never assume** a black wire is neutral simply because it's black — in three-phase old wiring, black was used for L2 phase. Always test with a voltage indicator before touching any conductor.

**The single most dangerous assumption in electrical work is assuming a wire colour tells you the full story without testing.**

---

## What Happens When Wires Are Connected Incorrectly?

### Live and Neutral Reversed (Polarity Reversal)

If you swap live (brown) and neutral (blue):
- The appliance may still appear to work — current flows, the lamp lights
- But the switch now breaks the neutral instead of the live
- The lamp is off but still live — touching the lamp holder can cause electrocution
- Light fittings with Edison screw (E27) caps: the outer shell (which you touch when changing the bulb) is connected to live instead of neutral

**Detected by:** polarity test with a voltage indicator or continuity tester.

### Live Connected to Earth

This is a direct short-circuit from 230 V to earth potential. The MCB should trip immediately if it is correctly rated. If the MCB fails to trip (wrong rating, deteriorated contacts), the earth conductor and anything connected to it becomes live — including metal water pipes, gas pipes, metal window frames, and all Class I appliance casings simultaneously.

**Why this is catastrophic:** every metal object in the building could become 230 V simultaneously.

### Neutral Connected to Earth (Downstream)

- Creates a "lost neutral" type condition on downstream circuits
- Neutral voltage rises, potentially putting 115–230 V on circuits that should be at 0 V
- Appliances may be damaged by overvoltage
- RCD protection is degraded because leakage current now has a parallel return path

### No Earth Connected (Missing Earth)

- Under normal operation: nothing happens — the appliance works normally
- Under fault (live touches casing): the casing becomes and remains live at 230 V
- No fault current flows through the MCB, so the MCB does **not** trip
- The RCD will trip only if current leaks through a person (after they receive a shock)

**This is why earth continuity is tested during every periodic inspection report (EICR).**

---

## Cable Types and What's Inside

### Twin-and-Earth (T&E) — Most Common Domestic Cable

The flat grey cable used for lighting circuits, ring mains, and radial circuits contains:
- **Brown** (post-2004) or red (pre-2004) insulated core — live
- **Blue** (post-2004) or black (pre-2004) insulated core — neutral
- **Bare copper** core — earth (must be sleeved green-and-yellow at every termination)

Common sizes:
| Cable Size | Typical Use |
|---|---|
| 1.0 mm² T&E | Lighting circuits (up to 6 A) |
| 1.5 mm² T&E | Lighting circuits (up to 10 A) |
| 2.5 mm² T&E | Ring mains (up to 20 A per leg), radial socket circuits |
| 4.0 mm² T&E | Cooker circuits, shower radials |
| 6.0 mm² T&E | Large cookers, large shower units |
| 10.0 mm² T&E | Large shower units, heat pumps |

### Three-Core-and-Earth — Two-Way Switching

When wiring two-way switches, a **three-core-and-earth** cable is used between the two switch positions (the strapping wire). It contains:
- Brown — live or strapping wire 1
- Black — strapping wire 2 (must be sleeved brown at both ends — it carries live potential)
- Grey — neutral or switched live (must also be sleeved brown if carrying live)
- Bare copper — earth

---

## Earthing Systems: TN-S, TN-C-S and TT

The way the earth is connected back to the supply varies by installation type. Understanding this matters for anyone installing RCDs or checking earth resistance.

| System | Description | How to Identify |
|---|---|---|
| **TN-S** | Separate earth and neutral conductors all the way from transformer to meter | Two separate conductors from the service head: neutral and earth are separate |
| **TN-C-S** (PME) | Earth and neutral combined in the supply, separated at the consumer unit | Single PEN conductor from service head; DNO provides earth at meter tail |
| **TT** | Earth via local earth electrode only (no metallic earth return in supply cable) | Earth rod driven into ground at property |

Most modern UK properties use **TN-C-S (PME)**. Rural properties and older urban installations often use **TT**. TT systems require RCD protection on all circuits because the earth electrode resistance is higher than a metallic cable path.

---

## Protective Equipotential Bonding

Earthing alone protects individual appliances. **Bonding** is the additional requirement to connect all exposed metalwork *within the building* together so they all sit at the same potential — preventing a voltage difference between, say, a metal bath and a metal radiator.

**Main protective bonding:** connects the main water pipe, main gas pipe, and oil pipe to the MET within 600 mm of their entry point to the building.

**Supplementary bonding:** connects metal parts within a zone (e.g. within a bathroom: bath taps, towel rail, waste pipe) where two conductive parts could be simultaneously touched.

Both are mandatory under BS 7671 (the IET Wiring Regulations).

---

## Simulate Live, Neutral and Earth in ElectraSim

ElectraSim lets you build and test circuits that demonstrate all three conductors:

**Basic complete circuit:**
1. Open [ElectraSim →](/app/)
2. Place a **Power Supply** component — this provides the live and neutral rails
3. Place a **Bulb** and connect its Live port to the supply Live, its Neutral port to the supply Neutral
4. Click **Run** — current flows live → bulb → neutral, bulb illuminates
5. Add an **MCB** in the live path — toggle it off and the circuit breaks, confirming the live is the controlled conductor

**Earthed fault simulation:**
1. Add an **RCD** between the power supply and the bulb
2. The RCD monitors that current in = current out on the live and neutral
3. In a fault scenario (current leaking to earth), the RCD detects the imbalance and trips
4. This demonstrates why earthing + RCD provides dual-layer protection

**Switch polarity test:**
1. Wire a switch into the **neutral** path instead of the live
2. Toggle the switch — the bulb turns off, but the live connection to the bulb remains
3. This interactive demonstration makes the polarity rule immediately obvious — the bulb terminal is still live even with the switch open

> <span class="em em-search" role="img" aria-label="check this"></span> ElectraSim's simulation engine runs a full BFS through the circuit graph on every change, so you see correct on/off states and fault detection in real time — the same logic a trained electrician applies mentally.

---

## Common Questions

### Is the neutral wire safe to touch?

Never touch any wire without confirming it is isolated and has been locked off. While the neutral is normally close to 0 V, it carries full operating current — and a broken neutral upstream can raise the neutral to dangerous voltages. Always treat all conductors as live until proven otherwise with a calibrated voltage indicator.

### Why does my bathroom have no earth on the light switch?

Plastic-cased light switches and lamp holders in dry locations are Class II — they have no metal parts that could become live. No earth connection is required. However, metal-clad switches and metal light fittings always require an earth.

### Can I use the earth wire to complete a circuit?

No. The earth conductor must never carry operating current. Using the earth as a neutral return (bootlegging) raises the earth potential, puts voltage on all bonded metalwork in the property, and creates a genuine electrocution hazard. It also corrupts RCD protection.

### Why is the neutral bonded to earth at the transformer?

To define a stable voltage reference. Without this bond, the neutral could float at any voltage — static charge, capacitive coupling, and stray currents could push it to dangerous potentials. The transformer neutral-star bond fixes neutral at 0 V (earth potential), which is why the neutral is "safe" under normal conditions and why live is 230 V *above* neutral.

---

## Summary

| | Live | Neutral | Earth |
|---|---|---|---|
| **UK colour (new)** | Brown | Blue | Green & Yellow |
| **UK colour (old)** | Red | Black | Green (or bare) |
| **Normal voltage** | ~230 V AC | ~0 V | 0 V |
| **Carries current normally?** | Yes | Yes | No |
| **Purpose** | Delivers energy | Returns current | Fault protection |
| **Switched by light switch?** | Yes | Never | Never |
| **Protected by MCB?** | Yes | No | No |
| **Connected to MCB?** | Yes | No | No |
| **Connected to RCD?** | Yes (monitored) | Yes (monitored) | No (reference) |

Understanding these three conductors is the foundation of everything else in electrical work. Every circuit you build, every fault you diagnose, and every safety check you perform depends on knowing exactly what each wire does and why.

**Ready to build your first circuit?** [Open ElectraSim →](/app/) — free, no sign-up, works in any browser.
