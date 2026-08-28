---
title: "Distribution Board Explained: How a Consumer Unit is Wired"
description: "The distribution board is the heart of every electrical installation. This guide explains what's inside a consumer unit, how it distributes power to every circuit in a building, and how to simulate a multi-circuit distribution board using a free electrical circuit simulator."
pubDate: 2026-05-12
author: ElectraSim
category: Beginner Guide
tags: [distribution board, consumer unit, fuse box, how consumer unit works, MCB wiring, RCD consumer unit, RCBO, electrical panel, circuit breaker panel, split load consumer unit, home wiring, electrician training]
---

Every wire in your home — every socket, every light, every appliance circuit — traces back to a single grey box on the wall: the **distribution board**, also called a **consumer unit** or, in older installations, a **fuse box**. It is the most critical component in any electrical installation, and understanding it unlocks everything about how buildings are wired.

This guide covers what a distribution board is, exactly what lives inside it, how it distributes power to each circuit, the different types of protection available, and how to safely simulate a multi-circuit distribution board using **[ElectraSim](/app/)** — free, browser-based, no installation required.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Simulate it now:** ElectraSim includes a Distribution Board component with multiple live and neutral outputs. Build a full consumer unit layout — supply in, multiple circuits out — and see how MCBs, RCDs, and loads interact in real time. [Open ElectraSim →](/app/)

## What is a Distribution Board?

A **distribution board** (DB) is the central point where incoming electrical supply from the utility meter is split into multiple individual circuits, each protected by its own **MCB** (Miniature Circuit Breaker) or **RCBO** (Residual Current Breaker with Overload).

It serves three core functions simultaneously:

1. **Distribution** — splits one incoming supply into many outgoing circuits
2. **Protection** — each circuit has a breaker that trips on overload or short circuit
3. **Isolation** — the main switch allows the entire installation to be safely isolated for maintenance

In the UK and many other countries, the terms **distribution board** and **consumer unit** are used interchangeably for domestic installations. In commercial and industrial settings, the same device may be called a **DB**, **panel board**, or **breaker panel**.

## What's Inside a Consumer Unit?

Open the cover of a modern consumer unit and you'll find the following components, all mounted on a DIN rail inside a moulded plastic or metal enclosure:

### Main Switch (Isolator)
A double-pole switch that disconnects both Live and Neutral from the entire installation. Rated typically at 80A, 100A, or 125A for domestic use. Always turn this off before working on any circuit. It does **not** protect against faults — it only provides safe isolation.

### Busbars
Two copper bars running the length of the consumer unit:
- **Live busbar** — all MCBs and RCBOs connect their live input to this bar, which is fed from the main switch
- **Neutral busbar** — all circuit neutrals return here; in a split-load unit, there may be two neutral bars (protected and unprotected)

Busbars are what make a consumer unit a *distribution* device — one supply in, many circuits out, all sharing the same source.

### RCD (Residual Current Device)
In a split-load consumer unit, one or two RCDs sit on the DIN rail and protect groups of circuits. In a fully RCD-protected unit, a single RCD covers everything downstream of the main switch.

For modern best-practice installations, individual **RCBOs** replace the shared RCD — each circuit gets its own combined MCB + RCD protection, so a fault on one circuit never affects any other.

### MCBs (Miniature Circuit Breakers)
One MCB per circuit. Each is rated for the maximum current that circuit should carry:

| Circuit | Typical MCB Rating |
|---|---|
| Lighting | 6A |
| Ring main (sockets) | 32A |
| Kitchen sockets | 32A |
| Cooker / oven | 32A or 40A |
| Shower | 40A or 45A |
| EV charger | 32A or 40A |
| Immersion heater | 16A |
| Outdoor sockets | 16A or 32A |

### Earth Terminal Block
A separate bar where all circuit earth wires connect, along with the incoming earth from the meter/supply. The earth bar is bonded to the metal enclosure of the consumer unit itself.

### Surge Protection Device (SPD) — Modern Installations
Increasingly fitted in new consumer units, an SPD clamps voltage spikes caused by lightning or switching transients to protect sensitive electronics downstream.

## How a Distribution Board Distributes Power

The flow through a consumer unit is straightforward once you understand the busbar principle:

```
Utility Meter
      ↓
Main Switch (Double-pole isolator)
      ↓
Live Busbar ————————————————————————
   ├── MCB / RCBO → Circuit 1 (Lighting)      → L1-out
   ├── MCB / RCBO → Circuit 2 (Ring Main)     → L2-out
   ├── MCB / RCBO → Circuit 3 (Kitchen)       → L3-out
   └── MCB / RCBO → Circuit 4 (Shower)        → L4-out

Neutral Busbar ——————————————————————
   ├── Circuit 1 Neutral return               ← N1
   ├── Circuit 2 Neutral return               ← N2
   ├── Circuit 3 Neutral return               ← N3
   └── Circuit 4 Neutral return               ← N4

Earth Busbar ————————————————————————
   └── All circuit earths + incoming earth
```

Every circuit is electrically independent from its neighbours on the Live side — each has its own MCB that can trip without affecting any other circuit. On the Neutral side, all circuits share the common neutral bar, which is connected back to the supply neutral at the meter.

## Types of Consumer Unit Protection Layout

### 1. All-Protected (Single RCD — Older Standard)
One 30mA RCD covers all circuits. Simple and inexpensive, but one earth fault on any circuit kills power to everything on that RCD — including the fridge, freezer, and alarm system.

**Problem:** A nuisance trip (e.g. a faulty garden appliance at midnight) de-energises everything simultaneously.

### 2. Split-Load Consumer Unit (Common in UK Domestic)
The consumer unit is divided into two halves by the main switch and two separate RCDs:
- **RCD-1** protects high-risk circuits: bathrooms, kitchens, outdoors
- **RCD-2** protects remaining circuits — or some circuits are left unprotected on purpose (fridge, freezer, alarm)

A fault on the bathroom circuit trips RCD-1 only — the fridge on the unprotected side stays live.

**Limitation:** circuits on the unprotected side have no earth fault / electrocution protection.

### 3. Fully RCBO-Protected (Modern Best Practice)
Every circuit has its own **RCBO** — a single device combining an MCB (overload + short circuit protection) and an RCD (earth fault + electrocution protection). No shared RCDs.

A fault on any one circuit trips only that RCBO. Every other circuit remains live and protected.

This is now the recommended standard for all new domestic installations in the UK and is increasingly common globally.

| Layout | Earth Fault Protection | Nuisance Trip Risk | Cost |
|---|---|---|---|
| Single RCD | Shared across all circuits | High — one fault kills everything | Low |
| Split-load | Partial — high-risk circuits only | Medium | Medium |
| Full RCBO | Individual per circuit | Low — one circuit trips in isolation | Highest |

## Reading a Consumer Unit: What the Labels Mean

A properly labelled consumer unit should have every circuit identified. Common labelling:

| Label | Meaning |
|---|---|
| **Main Switch** | Double-pole isolator — shuts off everything |
| **RCD 1 / RCD 2** | Residual current device protecting circuit groups |
| **B6 Lighting** | Type B, 6A MCB — upstairs or downstairs lighting circuit |
| **B32 Ring** | Type B, 32A MCB — ring main sockets |
| **B32 Kitchen** | Type B, 32A MCB — kitchen socket ring |
| **B40 Shower** | Type B, 40A MCB — electric shower (dedicated radial) |
| **B32 Cooker** | Type B, 32A MCB — electric cooker/hob |
| **B16 Immersion** | Type B, 16A MCB — hot water immersion heater |
| **B16 Garden** | Type B, 16A MCB — outdoor socket (must be RCD protected) |

The letter (B, C, D) is the **trip curve** — how quickly the MCB trips under fault conditions. Type B is standard for all domestic circuits. Type C is used for circuits with higher startup currents (motors, some HVAC equipment). Type D is for very high startup loads (large motors, transformers).

## Distribution Board Sizing: How Many Circuits?

A domestic consumer unit is sized by the number of **ways** — the number of MCB/RCBO slots available:

| Consumer Unit Size | Typical Application |
|---|---|
| 8-way | Small flat or apartment |
| 12-way | Average 3-bedroom home |
| 16-way | Large home or extended property |
| 18–24 way | Large home with EV charger, solar, home office circuits |

Modern advice: **always install one size larger than you currently need**. Adding circuits later (EV charger, hot tub, home office) to a full consumer unit means replacing the entire unit — far more expensive than buying a larger one initially.

## Earthing and Bonding at the Distribution Board

The **earth terminal block** inside the consumer unit is the central earthing point for the installation:

- Every circuit's earth wire runs back to this bar
- The **main protective bonding conductors** connect here — green/yellow cables that bond the incoming gas and water pipes to earth, preventing them becoming live if a fault occurs elsewhere
- The earth bar is connected to the **supply earth** (via the meter tails) and to the **consumer unit enclosure** itself

Without proper earthing and bonding, the RCD and MCB protection cannot work correctly — the fault path must exist for protective devices to detect and interrupt faults.

## How to Simulate a Distribution Board in ElectraSim

[ElectraSim](/app/) includes a **Distribution Board** component with a live input, neutral input, and multiple live and neutral output ports — exactly mirroring the busbar structure of a real consumer unit.

**Building a 3-circuit distribution board:**

1. Open [ElectraSim](/app/)
2. Place a **Live (L)** and **Neutral (N)** terminal
3. Place a **Distribution Board** — wire Live → DB **L-in**, wire Neutral → DB **N-in**
4. **Circuit 1 — Lighting:**
   - Place an **MCB** → wire DB **L1** → MCB input
   - Place a **Switch** and **Bulb** — wire MCB output → Switch → Bulb → DB **N1**
5. **Circuit 2 — Sockets:**
   - Place an **MCB** → wire DB **L2** → MCB input
   - Place a **Socket** — wire MCB output → Socket L, Socket N → DB **N2**
6. **Circuit 3 — RCD Protected:**
   - Place an **MCB** and **RCD** in series → wire DB **L3** → MCB → RCD L-in → RCD L-out → load
   - Wire Neutral through RCD N-in → N-out → DB **N2** (or add a third neutral output)
7. Press **Run** — all circuits energise from the same DB supply
8. Toggle the lighting switch — only Circuit 1 responds. Other circuits stay live.
9. Trip or disconnect Circuit 2's MCB — Circuits 1 and 3 are unaffected

This directly demonstrates the core principle of the distribution board: **independent circuit protection from a common supply**.

## Common Distribution Board Problems and Causes

### MCB Keeps Tripping
- **Overload:** too many high-power appliances on one circuit — check total wattage against MCB rating
- **Short circuit:** damaged cable or faulty appliance — unplug all loads, reset MCB, reconnect one at a time to find the culprit
- **Undersized MCB:** MCB rating is too low for the circuit's legitimate load — needs assessment by a qualified electrician

### RCD Keeps Tripping
- **Earth fault on a connected appliance** — most common cause; unplug everything on the affected circuits, reset the RCD, reconnect one by one
- **Damp in an outdoor socket or fitting** — moisture creates a leakage path to earth
- **Ageing cable insulation** — older cables can develop insulation breakdown, creating intermittent earth faults

### Buzzing or Humming from Consumer Unit
- Loose connection on a terminal — must be investigated immediately, loose connections cause arcing and fires
- Failing MCB or RCD — the internal mechanism is wearing or damaged
- Overloaded circuit causing sustained high current

> <span class="em em-warning" role="img" aria-label="warning"></span> **Safety:** Never work inside a consumer unit unless you are a qualified electrician. Even with the main switch off, the **meter tails** (the cables from the meter to the main switch) remain live at all times. Only the utility company can isolate these.

## Key Takeaways

- A **distribution board / consumer unit** splits incoming supply into individual circuits, each protected by an MCB or RCBO
- It contains a **main switch** (isolation), **busbars** (distribution), **MCBs/RCBOs** (protection), and an **earth terminal block** (safety earthing)
- Modern best practice is **individual RCBOs per circuit** — a fault on one circuit trips only that RCBO, leaving everything else live
- Consumer unit size should be planned one size larger than current need to allow for future circuits
- Proper **earthing and bonding** is essential — without a fault path, protective devices cannot operate correctly
- You can simulate a full multi-circuit distribution board for free in **[ElectraSim](/app/)** — build, run, and test fault conditions safely before working on real installations

**Ready to wire your own consumer unit?** [Open ElectraSim now →](/app/) and build a 3-circuit distribution board — lighting, sockets, and a protected outdoor circuit — all from a single supply.
