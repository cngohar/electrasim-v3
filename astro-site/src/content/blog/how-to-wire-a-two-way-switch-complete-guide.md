---
title: "How to Wire a Two-Way Switch: Complete Guide with Diagrams"
description: "Two-way switching lets you control one light from two locations — the classic staircase circuit. This guide explains exactly how two-way switch wiring works, the role of COM, L1, and L2 terminals, strapping wires, and how to simulate the full circuit in a free electrical circuit simulator."
pubDate: 2026-05-13
author: ElectraSim
category: Wiring Guide
tags: [two-way switch, two-way switch wiring, staircase wiring, how to wire a two-way switch, COM L1 L2 switch, strapping wires, intermediate switch, three-way switch, hallway lighting, wiring diagram, electrician training, electrical simulator]
---

Switch the light on at the bottom of the stairs. Walk up. Switch it off at the top. That is two-way switching — one light controlled from two separate locations. It is one of the most common wiring tasks in any home, and one of the most misunderstood.

Most people understand a standard on/off switch: break the circuit, bulb goes off. Two-way switching is different. Both switches are always "doing something" — they are not simply open or closed, they are routing current down one of two possible paths. When either switch is toggled, it changes which path is active, turning the circuit on or off regardless of the other switch's position.

This guide explains exactly how two-way switch wiring works — the terminals, the strapping wires, the wiring diagram — and how to safely build and test the circuit in **[ElectraSim](/app/)** before touching real wire.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Simulate it first:** ElectraSim includes a Two-way Switch component with COM, L1, and L2 terminals. Build the staircase circuit, press Run, and toggle either switch to confirm it works from both ends. [Open ElectraSim →](/app/)

## What is a Two-Way Switch?

A **two-way switch** has **three terminals** instead of the two you find on a standard switch:

- **COM (Common)** — the terminal that is always connected to one of the other two terminals, regardless of switch position
- **L1** — the terminal COM connects to when the switch is in the "up" position
- **L2** — the terminal COM connects to when the switch is in the "down" position

At any given moment, the switch connects COM → L1 *or* COM → L2. It never connects L1 to L2 directly, and it never disconnects completely — COM is always connected to something.

This is why two-way switches cannot be used as simple on/off switches in the conventional sense — they are **changeover switches**, not on/off switches.

## The Two-Way Switching Circuit: How it Works

To control a light from two locations you need:
- **Two two-way switches** (one at each location)
- **Two strapping wires** running between the switches (connecting L1 to L1 and L2 to L2)
- Standard Live, Neutral, MCB, and bulb

Here is the complete circuit:

```
Live → MCB → SW1 (COM)
              SW1 L1 ————— Strapping wire 1 ————— SW2 L1
              SW1 L2 ————— Strapping wire 2 ————— SW2 L2
                                                   SW2 (COM) → Bulb → Neutral
```

The two strapping wires form two parallel paths between the switches. At any moment, exactly one complete path exists from MCB through SW1 → strapping wire → SW2 to the bulb.

**Tracing the four possible switch states:**

| SW1 position | SW2 position | Current path | Bulb |
|---|---|---|---|
| COM → L1 | COM → L1 | L → SW1 COM→L1 → strap 1 → SW2 L1→COM → Bulb | **ON** |
| COM → L1 | COM → L2 | L → SW1 COM→L1 → strap 1 → SW2 L1 (dead end) | **OFF** |
| COM → L2 | COM → L1 | L → SW1 COM→L2 → strap 2 → SW2 L2 (dead end) | **OFF** |
| COM → L2 | COM → L2 | L → SW1 COM→L2 → strap 2 → SW2 L2→COM → Bulb | **ON** |

**The key insight:** the bulb is ON whenever both switches are set to the *same* strapping wire (both L1 or both L2). Toggling either switch always moves from one row to the next in the table above — always switching between ON and OFF.

This is why you can switch the light from either end regardless of the other switch's current position.

## Wiring the Circuit Step by Step

### Components you need
- Live (L) terminal
- Neutral (N) terminal
- MCB (6A for lighting)
- Two-way Switch × 2
- Cable for strapping wires (2-core, typically brown and grey/blue for strapping)
- Bulb / light fitting

### Wiring sequence

**Step 1 — Supply to Switch 1:**
Run Live → MCB → **SW1 COM**. The MCB protects the entire circuit. Never wire a switch before the MCB.

**Step 2 — Strapping wires between the two switches:**
- Connect **SW1 L1 → SW2 L1** (strapping wire 1 — typically brown cable)
- Connect **SW1 L2 → SW2 L2** (strapping wire 2 — typically grey or blue cable, *not* the neutral blue)

These two wires are the heart of the circuit — they carry Live potential and must be correctly identified. In practice they run inside a 3-core + earth cable between the switch positions.

**Step 3 — Switch 2 to load:**
Connect **SW2 COM → Bulb Live terminal**.

**Step 4 — Neutral return:**
Connect **Bulb Neutral terminal → Neutral (N)**.

**Step 5 — Earth:**
Connect earth wires to the earth terminal of each switch back box and the light fitting.

**Step 6 — Test:**
With power applied, toggle SW1 — bulb should respond. Toggle SW2 — bulb should respond again. Each switch independently controls the bulb from either position.

## Cable Colours for Two-Way Switching

### Modern (post-2004 UK harmonised colours)
| Wire | Colour | Terminal |
|---|---|---|
| Supply Live | Brown | SW1 COM |
| Strapping wire 1 | Brown | SW1 L1 → SW2 L1 |
| Strapping wire 2 | Grey | SW1 L2 → SW2 L2 |
| Switch wire (switched live) | Blue (marked brown) | SW2 COM → light |
| Neutral | Blue | Neutral bar → light |
| Earth | Green/Yellow | Earth terminal |

> <span class="em em-warning" role="img" aria-label="warning"></span> The grey strapping wire carries **Live potential** even though grey is sometimes associated with neutral in old wiring. Always test before assuming any wire is safe to touch.

### Old (pre-2004 UK colours)
Old wiring used red (live), yellow (L1 strap), blue (L2 strap), and black (neutral). If you find an existing two-way circuit with red/yellow/blue wires, it follows the old colour code — do not assume yellow or blue is neutral without testing.

## Three-Location Switching: Adding an Intermediate Switch

What if you need to control a light from **three locations** — both ends of a corridor plus a midpoint? A standard two-way circuit only works for two locations.

The solution is an **intermediate switch** (also called a three-way switch in North America) inserted between the two two-way switches:

```
Live → MCB → SW1 (COM)
              SW1 L1 ——→ INT L1-in
              SW1 L2 ——→ INT L2-in
                         INT L1-out ——→ SW2 L1
                         INT L2-out ——→ SW2 L2
                                        SW2 (COM) → Bulb → Neutral
```

An intermediate switch has **four terminals** and is internally wired as a crossover switch — it either connects L1-in to L1-out and L2-in to L2-out (straight), or crosses them (L1-in to L2-out and L2-in to L1-out).

Toggling the intermediate switch swaps the strapping wire connections, adding a third control point to the circuit. You can add multiple intermediate switches in series to control one light from any number of locations.

## Two-Way Switch vs Single-Way Switch

| Feature | Single-way Switch | Two-way Switch |
|---|---|---|
| Terminals | 2 (L-in, L-out) | 3 (COM, L1, L2) |
| Function | Simple on/off | Changeover (COM to L1 or L2) |
| Use in single-switch circuit | Yes | Yes — use COM and L1 only |
| Use in two-location circuit | No | Yes (pair required) |
| Cost | Lower | Slightly higher |

A two-way switch **can replace a single-way switch** in a one-location circuit — simply wire COM and L1, leave L2 unused. Many electricians fit two-way switches throughout as standard to allow easy future upgrades.

## How to Simulate Two-Way Switching in ElectraSim

[ElectraSim](/app/) includes a Two-way Switch component with the correct COM, L1, and L2 terminals. This lets you verify the circuit logic before any real wiring:

**Building the circuit:**

1. Open [ElectraSim](/app/)
2. Place **Live (L)** and **Neutral (N)** terminals
3. Place an **MCB** — wire Live → MCB
4. Place **Two-way Switch 1 (SW1)** — wire MCB output → SW1 **COM**
5. Place **Two-way Switch 2 (SW2)**
6. Wire **SW1 L1 → SW2 L1** (strapping wire 1)
7. Wire **SW1 L2 → SW2 L2** (strapping wire 2)
8. Place a **Bulb** — wire SW2 **COM** → Bulb → Neutral
9. Press **Run**

**Testing:**
- Toggle SW1 → bulb changes state ✓
- Toggle SW2 → bulb changes state again ✓
- Toggle SW1 again → bulb changes state ✓
- Every single toggle of either switch changes the bulb — from any starting state

This confirms the circuit is wired correctly. If the bulb only responds to one switch, check the strapping wire connections — L1 must connect to L1, and L2 must connect to L2.

## Common Two-Way Switch Wiring Mistakes

### Mistake 1: Wiring L1 and L2 in Parallel Instead of Crossing
Connecting SW1 L1 → SW2 L2 and SW1 L2 → SW2 L1 (crossed strapping) will cause the light to be permanently on or permanently off depending on switch positions, but not controllable from both ends.

**Fix:** L1 always connects to L1, L2 always connects to L2.

### Mistake 2: Using COM and L1 on One Switch, COM and L2 on the Other
Both switches must connect to their COM terminal. If you wire one switch using L1 and L2 instead of COM and L1, the circuit will not work correctly.

**Fix:** Always identify and use the COM terminal on both switches. COM is usually the darkest-coloured screw or the centre terminal.

### Mistake 3: Wiring the Neutral Through the Switch
Neutral should run directly to the light fitting — it never passes through a switch. Only the Live wire is interrupted by switching.

**Fix:** Neutral → directly to light fitting neutral terminal. The switch only breaks the Live conductor.

### Mistake 4: No MCB Before the First Switch
The MCB must protect the entire circuit. If placed after SW1, a fault in the cable between the Live terminal and SW1 has no protection.

**Fix:** Always: Live → MCB → SW1 COM.

### Mistake 5: Confusing Strapping Wires with Neutral
In a 3-core cable, the blue core may be used as a strapping wire — not as a neutral. It carries Live potential. Always mark any such wire with brown sleeving or tape at the termination points.

## Key Takeaways

- A **two-way switch** has three terminals: **COM, L1, L2** — COM is always connected to either L1 or L2
- Two-way switching uses **two strapping wires** between the switches (L1→L1 and L2→L2) to create two parallel current paths
- The bulb is ON when both switches select the **same strapping wire** — toggling either switch always changes the state
- **Intermediate switches** add a third (or more) control location — one intermediate switch per additional location
- Always wire: **Live → MCB → SW1 COM** — the MCB must protect the entire circuit
- Test the logic first by simulating in **[ElectraSim](/app/)** — toggle each switch and verify the bulb responds from both ends before wiring on a real installation

**Build it now:** [Open ElectraSim →](/app/) and wire up the staircase circuit in under three minutes — no tools, no risk, full confidence before the real job.
