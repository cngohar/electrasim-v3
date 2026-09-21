---
title: "What is an MCB Breaker? Types B, C, D & How MCBs Work"
description: "What is an MCB and how does it protect circuits? Learn how miniature circuit breakers trip on overloads and short circuits, plus Type B, C, and D ratings."
pubDate: 2026-05-05
author: ElectraSim
category: Beginner Guide
tags: [MCB, circuit breaker, overload protection, short circuit, electrical safety, beginner, electrical troubleshooting]
---

Every time you overload an extension lead and hear a satisfying *click* from the fuse box, you have an MCB to thank. Without it, that overloaded wire would get hot enough to start a fire. The Miniature Circuit Breaker is one of the most important safety inventions in modern electrical engineering — and most people have no idea how it actually works.

This guide explains MCBs from the ground up: what they are, what's inside them, why they trip, and how you can test MCB behaviour safely using a **free electrical fault detection simulator** — right in your browser, with no installation and no risk of real-world shocks.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Learn by doing:** You can simulate MCB trips, overloads and short circuits for free in [ElectraSim](/app/) — a virtual electrical lab for students, electricians, and curious learners alike.

## What Does MCB Stand For?

**MCB** stands for **Miniature Circuit Breaker**. It's a compact, resettable switch that automatically disconnects a circuit when it detects a fault — either too much current (overload) or a sudden spike caused by a short circuit.

Before MCBs were widespread, homes used **fuse wire** — a thin strip of metal designed to melt when overloaded, breaking the circuit. The problem: once a fuse blew, you had to replace it. MCBs are resettable — fix the fault, flip the switch back up, and power is restored. That's why they replaced fuses in virtually every modern consumer unit (breaker panel) worldwide.

## What's Inside an MCB?

An MCB contains two separate trip mechanisms — one for each type of fault it protects against:

### 1. Thermal Trip (for Overloads)

Inside the MCB is a **bimetallic strip** — two different metals bonded together. These metals expand at different rates when heated. When too much current flows through the circuit for too long, the wire feeding the bimetallic strip heats up, the strip bends, and eventually trips a lever that opens the switch contacts.

This is a **slow trip** — it responds to sustained overloads (like running too many devices on one circuit for several minutes). The delay is intentional: it ignores brief, harmless current spikes like the startup surge from a motor.

### 2. Magnetic Trip (for Short Circuits)

The MCB also contains an **electromagnetic coil** (solenoid). When a short circuit occurs, current spikes to thousands of amps almost instantaneously. This creates a powerful magnetic field in the coil, which pulls a plunger that trips the switch contacts — in as little as **1–2 milliseconds**.

This near-instant response is critical: a short circuit that lasted even a full second could vaporise wiring and cause a fire.

## MCB Trip Curves: B, C and D Types

Not all MCBs trip at the same speed. They're rated by **trip curve** — how quickly they disconnect in relation to overload current:

| Type | Instant Trip Threshold | Typical Use |
|---|---|---|
| **B** | 3–5× rated current | Domestic lighting, general wiring |
| **C** | 5–10× rated current | Appliances with moderate startup surges (e.g. AC units) |
| **D** | 10–20× rated current | Motors, transformers — very high startup current |

A Type B MCB rated at 16A will trip instantly if the current exceeds ~80A (5× rating). A Type C 16A MCB requires ~160A before it trips instantly, making it suitable for equipment with higher startup spikes.

For **beginner electrical wiring simulator** practice and learning, Type B is the default for most household circuits — and the one you'll find in ElectraSim.

## Why Do MCBs Trip? The Four Main Causes

Understanding why your MCB trips is the first step in **electrical troubleshooting** — a core skill for any electrician or student using electrician training software or real tools.

### Cause 1: Overload
Too many devices drawing current on one circuit. Classic example: a kitchen ring main with a kettle (2.5kW), microwave (1.2kW), toaster (1kW), and air fryer (2kW) all running simultaneously — nearly 7kW on a circuit rated for 3.68kW (32A × 115V / 32A × 230V). The MCB trips after the bimetallic strip heats up.

**Fix:** Spread high-power appliances across different circuits. Never use multi-way extension leads for high-power devices.

### Cause 2: Short Circuit
A live wire touches a neutral wire directly, bypassing all resistance. Current spikes to thousands of amps. The MCB's magnetic trip fires in milliseconds.

**Fix:** Find and repair the damaged cable or appliance before resetting the MCB. Never reset a repeatedly tripping MCB without investigating the cause.

### Cause 3: Earth Fault
A live wire touches an earthed metal part (a casing, pipe, or the earth wire itself). Current flows to earth. A **Residual Current Device (RCD)** is actually better at catching earth faults than an MCB — modern consumer units include both.

### Cause 4: Faulty Appliance
An internal fault in a connected appliance causes a brief short or overload. Unplug all appliances on the tripped circuit, reset the MCB, then plug them back in one at a time to identify the culprit.

> <span class="em em-warning" role="img" aria-label="warning"></span> **Safety rule:** If an MCB trips repeatedly after reset with nothing connected, the wiring itself has a fault. Stop resetting it and call a qualified electrician.

## How to Simulate MCB Behaviour Safely

One of the best ways to **learn electrician skills without risk** is to use an **electrical troubleshooting simulator** before working with real circuits. This is exactly what [ElectraSim](/app/) is built for — a free, browser-based **virtual electrical lab for students** and professionals.

Here's how to explore MCB behaviour in ElectraSim:

**Simulating a normal protected circuit:**
1. Open [ElectraSim](/app/)
2. Place a **Battery** (power source) on the canvas
3. Add an **MCB** — wire it in series after the battery
4. Add a **Switch** → **Light Bulb** in series after the MCB
5. Press **Run** — the bulb lights, current flows through the MCB normally
6. Toggle the switch — the circuit opens and closes cleanly

**Simulating an overload trip:**
1. Build the above circuit
2. Add several more bulbs in parallel after the MCB
3. Press Run — with enough load, the simulation will flag the MCB as overloaded
4. Watch the fault highlighted in the log panel

**Simulating a short circuit:**
1. Build a simple battery → MCB → bulb circuit
2. Wire a direct connection from one side of the bulb to the other (bypassing the bulb)
3. Press Run — the simulation detects the short and flags the fault instantly

This kind of **simulate wiring circuits online free** practice builds genuine intuition before you ever touch real wire.

## MCB Ratings: What the Numbers Mean

Every MCB has three key ratings printed on it:

- **Current rating (e.g. 6A, 10A, 16A, 32A):** The maximum continuous current before the thermal trip activates over time
- **Breaking capacity (e.g. 6kA, 10kA):** The maximum fault current the MCB can safely interrupt without being destroyed
- **Voltage rating (e.g. 230V, 415V):** The maximum circuit voltage the MCB is designed for

**Never replace an MCB with a higher-rated one** unless the wiring has been assessed by a qualified electrician. The MCB must be rated *lower* than the maximum current the cable can carry — the cable is what you're protecting.

## MCB vs Fuse vs RCD: What's the Difference?

| Device | Protects Against | Resettable? | Typical Location |
|---|---|---|---|
| **MCB** | Overload, short circuit | Yes — flip switch | Consumer unit |
| **Fuse** | Overload, short circuit | No — must replace | Old consumer units, plug tops |
| **RCD** | Earth faults, electrocution risk | Yes — press button | Consumer unit, socket outlets |
| **RCBO** | All of the above (combined) | Yes | Modern consumer units |

Modern homes increasingly use **RCBOs** (Residual Current Breaker with Overload) — a single device combining an MCB and RCD. Every circuit gets individual earth fault protection, not just shared protection from one RCD covering multiple circuits.

## Key Takeaways

- An **MCB** protects circuits against **overloads** (thermal trip, slow) and **short circuits** (magnetic trip, near-instant)
- MCBs are rated by current (6A–63A), breaking capacity (6kA–10kA), and trip curve (B, C, D)
- They replaced fuses because they're **resettable** — fix the fault, flip the switch
- Never reset a repeatedly tripping MCB without identifying the root cause
- You can **practice house wiring online** and safely test overload and short-circuit scenarios using [ElectraSim's free electrical fault detection simulator](/app/) — no sign-up, no download, works in any browser

**Ready to test it yourself?** [Open ElectraSim now →](/app/) and build your first MCB-protected circuit in under two minutes.
