---
title: "Getting Started with ElectraSim: Build and Simulate Your First Circuit in 5 Minutes"
description: "New to ElectraSim? This step-by-step guide shows you how to place components, draw wires, run a simulation, and read the fault log — all in your browser, for free."
pubDate: 2026-05-09
author: ElectraSim
category: How-to Guide
tags: [getting started, tutorial, beginner, circuit simulator, how-to, ElectraSim, wiring, simulation]
---

ElectraSim is a free, browser-based electrical circuit simulator — no installation, no account, no cost. You open it, place components on a canvas, connect them with wires, press **Run**, and watch the simulation execute in real time. This guide walks you through every step, from opening the app to building a complete, protected lighting circuit.

Ready? [Open ElectraSim now →](/app/)

---

## Step 1 — Open the App

Navigate to [electrasim.com/app/](/app/). The app loads entirely in your browser — nothing is installed on your machine. It works on Chrome, Firefox, Edge, and Safari on both desktop and mobile.

You'll see:

- A **canvas** — the large grid area where you build circuits
- A **component palette** on the left — every component available to place
- A **toolbar** at the top — Run, Stop, Clear, Zoom controls
- A **properties panel** on the right — appears when you select a component
- A **fault log** at the bottom — shows simulation results and detected issues

The canvas uses a snap-to-grid system, so components and wires always align cleanly.

---

## Step 2 — Place a Power Supply

Every circuit needs a source of power. In ElectraSim, you use two supply terminals:

1. In the palette, find the **Live (L)** terminal under the *Supply* category and click it — or drag it — onto the canvas.
2. Find the **Neutral (N)** terminal and place it below the Live terminal, leaving some space between them.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Tip:** Live and Neutral terminals represent the mains supply. Live carries current to your circuit; Neutral returns it. Together they form the complete loop every circuit needs.

---

## Step 3 — Place an MCB (Circuit Breaker)

An MCB protects the circuit. Always wire one in series before any loads.

1. Find **MCB** in the *Protection* category in the palette.
2. Place it to the right of the Live terminal.

---

## Step 4 — Place a Switch and a Bulb

1. Place a **Single-way Switch** to the right of the MCB.
2. Place a **Bulb (E27)** to the right of the Switch.

Your canvas should now have five components: **Live → MCB → Switch → Bulb → Neutral** (from left to right, roughly).

---

## Step 5 — Connect the Wires

This is where circuits come to life. To draw a wire:

1. **Hover** over a port (the small dot on the edge of a component) — it will highlight.
2. **Click and drag** from the port to start drawing.
3. **Release** on the destination port to complete the connection.

Wire up your circuit in this order:

1. **Live terminal** (L-out port) → **MCB** (L-in port)
2. **MCB** (L-out port) → **Switch** (L-in port)
3. **Switch** (L-out port) → **Bulb** (L port)
4. **Bulb** (N port) → **Neutral terminal** (N-out port)

ElectraSim uses intelligent wire routing — wires travel in clean horizontal and vertical lines and avoid overlapping other components wherever possible.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Wire colours:** Live wires are drawn in **red/orange**, Neutral wires in **blue**, and Earth wires in **green/yellow** — following standard electrical colour conventions.

---

## Step 6 — Run the Simulation

Click the **▶ Run** button in the toolbar.

If everything is wired correctly and the MCB and Switch are both closed (on), you'll see:

- The **Bulb glows** — indicating it's receiving power
- Wire segments **animate** with a flowing current effect
- The **fault log** shows "No faults detected"

Now click the **Switch** component on the canvas. It toggles off — the bulb goes dark, the current animation stops. Click again to turn it back on. This is a live, interactive simulation.

---

## Step 7 — Toggle and Test

Try these experiments with the simulation running:

**Test 1 — Open circuit:**
Click the MCB to trip it. The bulb goes off even though the switch is still closed. Reset the MCB by clicking it again.

**Test 2 — Short circuit:**
Stop the simulation, draw a wire directly from the Live side of the Bulb back to Neutral (bypassing the bulb completely). Run again — the simulation will flag a **short circuit** in the fault log and highlight the fault path.

**Test 3 — Disconnected wire:**
Delete any single wire. Run — the fault log will show an **open circuit** warning, indicating the loop is broken.

---

## Your First Complete Circuit — Summary

Here's what you just built:

```
Live (L) → MCB → Single-way Switch → Bulb (E27) → Neutral (N)
```

This is a textbook single-lamp switched circuit — the exact wiring behind every ceiling light in a home. The MCB protects the circuit from faults. The Switch gives you control. The Bulb is the load.

---

## What to Try Next

Now that you know the basics, here are five circuits worth building to deepen your understanding:

### 1. Two-Bulb Parallel Circuit
Add a second Bulb in parallel with the first (both connected between the live side of the Switch and Neutral). Notice that both bulbs glow at full brightness, and disconnecting one doesn't affect the other. This is how real household lighting is wired.

### 2. Two-Way Switching
Replace the single-way Switch with two **Two-way Switches** wired to control one Bulb from two locations. This is the classic staircase lighting circuit.

### 3. Socket Circuit
Add a **3-Pin Socket** instead of the Bulb. Wire Live, Neutral, and Earth to their respective terminals. Use a **Junction Box** to feed multiple sockets from one supply.

### 4. RCD-Protected Circuit
Add an **RCD** between the MCB and the Switch. The RCD adds earth fault protection — essential in bathrooms, kitchens, and outdoor circuits. [See our guide on the new components →](/updates/electrasim-new-components-rcd-contactor-timer-dimmer-distribution-board-bell/)

### 5. Full Consumer Unit
Use the **Distribution Board** component to distribute supply to multiple separate circuits — each with its own MCB. This models a complete home breaker panel.

---

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Delete selected | `Delete` or `Backspace` |
| Undo | `Ctrl + Z` |
| Redo | `Ctrl + Shift + Z` |
| Select all | `Ctrl + A` |
| Copy / Paste | `Ctrl + C` / `Ctrl + V` |
| Zoom in / out | `Ctrl + scroll` or pinch |
| Pan canvas | `Space + drag` or middle-click drag |

---

## Saving and Exporting

ElectraSim saves your circuit **automatically** in your browser's local storage — so if you close the tab and come back, your circuit is still there.

You can also **export** your circuit to a JSON file (File → Export) and share it with others, or re-import it later on any device.

---

## Common Questions

**Q: Do I need to sign up?**
No. ElectraSim is completely free and requires no account. Open the app and start building immediately.

**Q: Does it work offline?**
Yes — ElectraSim is a Progressive Web App (PWA). After your first visit, it works offline. You can also install it to your home screen on mobile.

**Q: What does the fault log show?**
The fault log (bottom panel) reports simulation results after you press Run. It will flag open circuits, short circuits, unconnected ports, and overloaded connections. Each fault is linked to the specific component or wire that caused it.

**Q: How do I reset the canvas?**
Use **Edit → Clear Canvas** from the toolbar menu, or the keyboard shortcut. This removes all components and wires, giving you a blank slate.

**Q: Can I simulate real voltages and currents?**
ElectraSim models circuit topology and fault behaviour — it detects open circuits, short circuits, earth faults, and overloads. It is not a full SPICE-level numerical simulator with voltage/current readouts. It's designed for learning wiring logic, fault diagnosis, and circuit design.

---

## Key Takeaways

- **Open** ElectraSim at [electrasim.com/app/](/app/) — no install, no sign-up
- **Place** components from the palette, **connect** ports with wires, **press Run**
- Start with: **Live → MCB → Switch → Bulb → Neutral**
- The **fault log** tells you exactly what's wrong if the simulation detects an issue
- Toggle switches, trip MCBs, and rewire — all live, with instant feedback
- Your circuit is **auto-saved** in your browser; export to JSON to share or back up

[Build your first circuit now →](/app/)
