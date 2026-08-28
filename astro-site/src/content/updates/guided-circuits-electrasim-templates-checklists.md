---
title: "Guided Circuits in ElectraSim: Learn Wiring by Loading Real Circuit Templates"
description: "ElectraSim now includes Guided Circuits: ready-made circuit templates with in-app checklists for lamps, switches, RCD fault checks, contactors, timer bells, and more."
pubDate: 2026-07-02
updatedDate: 2026-08-22
author: ElectraSim
category: App Update
tags: [guided circuits, circuit templates, wiring simulator, electrical simulator, electrical training, RCD, two-way switch, contactor, timer switch]
---

ElectraSim now has **Guided Circuits**, a new learning mode that lets you load a complete circuit and follow a focused checklist directly inside the simulator.

Instead of starting with a blank canvas every time, you can now open a ready-made wiring example, trace the live and neutral paths, run the simulation, toggle the devices, and understand why the circuit behaves the way it does.

[Open Guided Circuits in ElectraSim ->](/app/)

---

## Why We Built Guided Circuits

Circuit simulators are most useful when they help you connect theory to a working diagram. A blank canvas is powerful, but it can also be intimidating if you are learning electrical wiring, teaching a class, or trying to understand why a circuit does not energise.

Guided Circuits are designed to solve that first-step problem.

Each guide gives you:

- A pre-built circuit on the canvas
- A short explanation of the topic
- A practical checklist to follow
- Clear expected behaviour when the simulation runs
- Safe prompts for fault-focused examples

The goal is not to hide the wiring. The goal is to give you a working circuit you can inspect, modify, break, repair, and learn from.

---

## What Is Included in This Release

The first Guided Circuits release includes six templates, covering beginner and intermediate wiring concepts.

> **Update (v1.6.1):** two more guided circuits have since been added — a **Push-Button Doorbell** that demonstrates momentary press-and-hold control, and an **RCBO-Protected Socket** with switched Live and Neutral paths, a protective-earth connection, and a test load. That brings the current total to **eight templates**.

### 1. Simple Protected Lamp

This is the cleanest starting point: a live terminal, neutral terminal, MCB, and lamp.

It teaches one of the most important ideas in electrical wiring: a load only energises when it has both a live feed and a neutral return. Run the simulation, then toggle the MCB off to see how protection interrupts the live path.

### 2. One-Way Light Switch

This guide shows a common lighting circuit where the switch opens and closes the live conductor.

You can trace the supply from Live through the MCB, into the switch, and then out to the bulb. Neutral returns directly to the load. It is a useful template for learning why switches should interrupt live rather than neutral.

### 3. Two-Way Staircase Light

Two-way switching can be confusing until you can see both traveller conductors laid out clearly.

This template shows two switches controlling one lamp from different positions, like a staircase or hallway. Toggle either switch and inspect which traveller path is active.

### 4. RCD and Earth Fault Check

This intermediate guide combines protection, earthing, and fault feedback.

The circuit includes a protected socket branch, earth conductor, test load, and a deliberate earth-fault warning. It is built for learning how protective devices and earth wiring fit into the safety story, not just whether a lamp turns on.

### 5. Contactor Motor Starter

This guide introduces switching heavier loads through a contactor.

You can trace live through the MCB, follow live and neutral through the contactor, and then observe the motor energise while both the MCB and contactor are closed. It is a compact way to learn why contactors are used for motor and equipment control.

### 6. Timer-Controlled Bell

This template shows a timer switch feeding a bell or buzzer load.

It is a simple circuit, but a useful one: the timer behaves like a controlled switch in the live path, while neutral returns directly to the bell. Toggle the timer to simulate the contact opening and closing.

---

## How to Use Guided Circuits

Open ElectraSim and choose **Guides** from the toolbar, menu, or welcome screen. Pick a guide, then load it onto the canvas.

After loading, a checklist panel appears inside the simulator. It stays with the circuit while you inspect the wiring and run the simulation.

You can:

- Follow each numbered checklist step
- Run the simulation to check the expected behaviour
- Toggle MCBs, switches, timers, and contactors
- Edit the circuit after loading it
- Open another template when you want a new example

If your canvas already has a circuit, ElectraSim asks before replacing it, so you do not accidentally lose your current work.

[Try a guided circuit now ->](/app/?template=simple-lamp)

---

## Built for Learning, Teaching, and Fast Experiments

Guided Circuits are useful for several workflows:

**Students** can start from a correct circuit, then trace current paths step by step.

**Teachers and trainers** can use templates as lesson starters without rebuilding the same examples repeatedly.

**Electricians and hobbyists** can quickly test wiring concepts, compare switch states, or demonstrate protection behaviour.

**Self-learners** can load a circuit, run it, change one thing, and immediately see what changed.

That last workflow matters. Learning improves when the feedback loop is short. Guided Circuits make it faster to move from "what does this diagram mean?" to "what happens if I change this connection?"

---

## What Comes Next

This is the first version of Guided Circuits. The foundation is now in place for more practical learning paths, such as:

- Room-by-room lighting examples
- Ring and radial socket practice circuits
- Consumer unit and RCD/RCBO layouts
- Fault-finding challenges
- Step-by-step build mode
- Saved custom templates

For now, the feature is intentionally focused: load a real circuit, follow the checklist, run the simulation, and learn by changing it.

---

## Start With a Template

If you are new to ElectraSim, start with **Simple Protected Lamp** or **One-Way Light Switch**.

If you already understand basic live and neutral paths, try **Two-Way Staircase Light** or **RCD and Earth Fault Check**.

If you want a controls-focused example, load **Contactor Motor Starter** or **Timer-Controlled Bell**.

[Open ElectraSim and load a Guided Circuit ->](/app/)
