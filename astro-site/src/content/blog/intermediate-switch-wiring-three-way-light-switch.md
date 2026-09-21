---
title: "Intermediate Switch Wiring Diagram: 3-Way Switching Guide"
description: "Clear intermediate switch wiring diagrams and guide. Control a light from 3 or more locations using two-way and intermediate switches in UK installations."
pubDate: 2026-05-18
author: ElectraSim
category: Beginner Guide
tags: [intermediate switch, two-way switch, three-way light switch, intermediate switching, wiring diagram, staircase lighting, landing light, 4-way switch, lighting circuit, 1.5mm cable, BS 7671]
---

If you want to control a single light from two locations — top and bottom of a staircase, both ends of a hallway — you need a **two-way switch** arrangement. But if you want to control that same light from **three or more** locations, you need an **intermediate switch** inserted between the two-way switches.

It is one of the most satisfying wiring problems to understand because once you see the logic, the pattern is completely repeatable for any number of switch positions.

This guide builds on the two-way switching guide already on this site. If you are not yet comfortable with how a two-way switch works, read that first.

> Related: [How to Wire a Two-Way Switch: Complete Guide with Diagrams](/blog/how-to-wire-a-two-way-switch-complete-guide/)

You can simulate switch behaviour and trace which conductors are live at any point using **[ElectraSim](/app/)** — free, in-browser, no installation.

---

## Recap: How Two-Way Switching Works

A two-way switch has **three terminals**: Common (C), L1, and L2. The switch connects Common to either L1 or L2, never both.

In a two-switch arrangement:
- **Switch 1** receives the permanent live on its Common terminal
- **Switch 2** feeds the light on its Common terminal
- **Two strappers** (called travellers) connect L1-to-L1 and L2-to-L2 between the switches

The light turns on when current can complete a path from Switch 1's Common → through one strapper → to Switch 2's Common. Moving either switch changes which strapper is connected, toggling the light on or off.

When both switches are on L1, current flows. When one is on L1 and the other on L2, current cannot flow. This XOR-like behaviour is what makes both switches independent.

---

## The Problem: Why Two-Way Is Not Enough for Three Locations

Imagine a staircase with a light at the landing. You want switches at:
- **Ground floor** (bottom of stairs)
- **First floor landing** (top of stairs)
- **Second floor** (e.g. loft conversion or long hallway)

With only two-way switches, you can handle the ground floor and first floor. Adding a third switch at the second floor is not possible with standard two-way switches alone — you would need to break into the strapper wires and insert a different type of switch.

That different type is the **intermediate switch**.

---

## What Is an Intermediate Switch?

An intermediate switch has **four terminals** instead of three. Internally, it contains two contacts that can switch in one of two configurations:

**Position 1 — Straight through:**
- Terminal 1 connects to Terminal 3
- Terminal 2 connects to Terminal 4

**Position 2 — Crossed:**
- Terminal 1 connects to Terminal 4
- Terminal 2 connects to Terminal 3

The intermediate switch is inserted into the **strapper cables** between two two-way switches. It effectively swaps — or doesn't swap — the two strappers, maintaining or inverting the state of the circuit.

---

## Intermediate Switch Wiring Diagram: Three-Location Switching

The complete circuit for three-location control uses:
- **1 × two-way switch** at each end (2 switches total)
- **1 × intermediate switch** in the middle

### Cable runs required

| Section | Cable | Conductors Used |
|---|---|---|
| Consumer unit → Switch 1 | 1.5 mm² T&E | Brown (live), Blue (used as neutral for return) |
| Switch 1 → Intermediate Switch | 1.0 or 1.5 mm² 3-core and earth | Brown + Blue + Grey as two strappers + earth |
| Intermediate Switch → Switch 2 | 1.0 or 1.5 mm² 3-core and earth | Brown + Blue + Grey as two strappers + earth |
| Switch 2 → Light fitting | 1.0 or 1.5 mm² T&E | Brown (switched live), Blue (neutral) |

**Note:** the blue conductor used as a switched live must be **sleeved or marked brown** at both ends to indicate it is not a neutral. This is a BS 7671 requirement.

### Terminal connections

**Switch 1 (two-way, at the start):**
- **C** — permanent live (incoming brown)
- **L1** — Strapper 1 to intermediate switch (e.g. brown core of 3-core)
- **L2** — Strapper 2 to intermediate switch (e.g. grey core of 3-core)

**Intermediate switch:**
- **1** — Strapper 1 from Switch 1 (brown)
- **2** — Strapper 2 from Switch 1 (grey)
- **3** — Strapper 1 onward to Switch 2 (brown of second 3-core)
- **4** — Strapper 2 onward to Switch 2 (grey of second 3-core)

**Switch 2 (two-way, at the end):**
- **L1** — Strapper 1 from intermediate switch
- **L2** — Strapper 2 from intermediate switch
- **C** — Switched live to light

**Light fitting:**
- Switched live from Switch 2's Common terminal
- Neutral from supply

---

## Why This Works: The Logic

Think of the two strappers as carrying two possible states of a single bit of information — "which way is the current able to flow?"

- **Switch 1** sets the initial state of the two strappers
- **Intermediate switch** either passes that state through unchanged (straight) or inverts it (crossed)
- **Switch 2** either completes the circuit or not, based on the final state of the strappers

Every time **any** switch is operated, it toggles the circuit. The light changes state regardless of which of the three switches you use. This is because:

- Pressing Switch 1 or Switch 2 swaps which strapper carries the live
- Pressing the Intermediate switch swaps the strappers between the two sections

In every case, the total connectivity of the chain either opens or closes.

---

## Extending to Four or More Locations

The pattern extends indefinitely. For a fourth switch position, add a **second intermediate switch** between the existing intermediate switch and Switch 2:

```
Switch 1 (2-way) → Intermediate 1 → Intermediate 2 → Switch 2 (2-way)
```

Each additional intermediate switch adds one more switch location. The two end switches are always two-way; every switch in between is intermediate.

For **N** switch locations:
- 2 × two-way switches (always, at each end)
- (N - 2) × intermediate switches

| Locations | Two-way | Intermediate |
|---|---|---|
| 2 | 2 | 0 |
| 3 | 2 | 1 |
| 4 | 2 | 2 |
| 5 | 2 | 3 |

Long hotel corridors, stairwells in multi-storey buildings, and large open-plan spaces with multiple entry points all use this topology.

---

## What Cable Is Used?

**3-core and earth** is required for the strapper sections (Switch 1 to Intermediate, Intermediate to Switch 2). Standard twin and earth has only two insulated conductors — you need three for the two strappers plus a common.

3-core and earth cable has conductors coloured **brown, black, and grey**, plus a bare earth. (Pre-2004 cable used red, yellow, and blue — if you encounter this in existing work, do not assume the yellow is an earth.)

| Core | New colours | Old colours (pre-2004) | Function |
|---|---|---|---|
| Brown | Brown | Red | Strapper 1 |
| Black (or grey) | Grey | Yellow | Strapper 2 |
| Third core | Black | Blue | (sometimes used as second strapper) |
| Earth | Bare copper | Bare copper | Earth continuity |

> Related: [Live, Neutral and Earth Wires Explained](/blog/live-neutral-and-earth-wires-explained/)

---

## Common Mistakes in Intermediate Switch Wiring

### 1. Using twin and earth for the strapper run

Twin and earth has only two insulated conductors. You need three for the intermediate switching arrangement. Using twin and earth means one strapper will be uninsulated (bare earth wire) — dangerous and non-compliant. Always use 3-core and earth between switches.

### 2. Connecting the intermediate switch in the wrong terminals

Intermediate switches from different manufacturers label terminals differently. Some use 1/2/3/4, others use A/B/C/D, others use a diagram. Confirm which terminals are the "in" pair and which are the "out" pair, and which position crosses the connections. Check the manufacturer's wiring diagram.

### 3. Not sleeving blue conductors used as live

Any conductor that is not its designated function must be sleeved at both ends. Blue used as a switched live gets a brown sleeve; grey used as a switched live also gets a brown sleeve. An inspector will fail an installation that has unmarked repurposed conductors.

### 4. Not providing earth continuity at each switch

Every metal switch plate, back box, and intermediate switch must have an earth connection. Intermediate switches in plastic boxes may not require an earth at the switch plate itself, but the circuit earth must still be present and terminated in the back box.

---

## Simulating Switching in ElectraSim

[ElectraSim](/app/) includes switch components that you can wire into circuits to simulate exactly the behaviour described in this article.

To explore two-way switching:

1. Place a **Power Supply**, an **MCB**, and a **Lamp**
2. Place two switches between the MCB and the Lamp
3. Wire the switches in a two-way arrangement (Common out of first, Common into Lamp on second, strappers cross-connected)
4. Run the simulation — toggle either switch to control the lamp from either position

For the full logic of how switches and circuit protection interact:

> [Getting Started with ElectraSim — full walkthrough](/blog/getting-started-with-electrasim/)

> [How to Wire a Two-Way Switch: Complete Guide with Diagrams](/blog/how-to-wire-a-two-way-switch-complete-guide/)

---

## Frequently Asked Questions

### Is an intermediate switch the same as a two-way switch?

No. A two-way switch has three terminals (C, L1, L2) and connects Common to one of two outputs. An intermediate switch has four terminals and swaps two conductors — it cannot replace a two-way switch at the end of a chain without modification.

### Can I use smart switches for intermediate switching?

Yes — most smart switch systems replace the physical strapper arrangement with a wireless or bus-based protocol. One physical switch controls the light directly; the others send wireless commands to that switch. The physical wiring is simplified (often to a single cable per switch position) at the cost of power supply requirements for each smart switch.

### Why does my intermediate switch not have a Common terminal?

Because it does not need one — an intermediate switch does not break a single circuit. It swaps two conductors. All four terminals are equal; there is no "Common" in the single-terminal sense.

### Does intermediate switching require extra circuit protection?

No — the circuit protection is the same as for any lighting circuit: a 6 A MCB and, under BS 7671, 30 mA RCD protection. The number of switch positions does not affect the circuit's protection requirements.

---

## Summary

- Controlling a light from **2 locations** needs 2 × two-way switches
- Controlling it from **3 or more locations** adds 1 intermediate switch per extra location
- The intermediate switch is inserted into the **strapper cables** between the two end two-way switches
- **3-core and earth** cable is required between switches
- All blue/grey conductors used as live must be **sleeved brown** at both ends
- The pattern extends indefinitely: always 2 two-way switches at the ends + (N-2) intermediate switches in between

**Try simulating a switching circuit right now in [ElectraSim →](/app/)** — free, browser-based, no account required.
