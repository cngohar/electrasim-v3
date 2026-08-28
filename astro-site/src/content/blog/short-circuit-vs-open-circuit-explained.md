---
title: "Short Circuit vs Open Circuit: What's the Difference?"
description: "A short circuit and an open circuit are opposite faults — one causes too much current, the other causes none. This guide explains both, their real-world causes, and how to identify each."
pubDate: 2026-05-17
author: ElectraSim
category: Beginner Guide
tags: [short circuit, open circuit, electrical faults, circuit breaker trip, fault diagnosis, electrical troubleshooting, overcurrent, continuity test, circuit fundamentals]
---

Two of the most fundamental concepts in electrical fault diagnosis are also two of the most frequently confused. A **short circuit** and an **open circuit** are not variations of the same fault — they are opposite conditions, with opposite symptoms, opposite detection methods, and different levels of danger.

Understanding both is essential for anyone working with electrical circuits, whether you are studying for your City & Guilds qualification, troubleshooting a domestic installation, or learning the theory behind circuit design.

This guide explains exactly what each fault is, why it happens, what it looks like in practice, and how to find it. You can also simulate both fault types hands-on using **[ElectraSim](/app/)** — a free browser-based circuit simulator with a dedicated Fault Simulation Mode.

---

## At a Glance

| | Short Circuit | Open Circuit |
|---|---|---|
| **Current flow** | Extremely high | Zero |
| **Downstream loads** | May be energised briefly before protection trips | Dark — no power |
| **MCB response** | Trips almost instantly | No response — there is no overcurrent |
| **Visible symptom** | Burning smell, tripped breaker, possible flash | Circuit dead, no obvious sign |
| **Common cause** | Insulation failure, wiring error, water ingress | Broken cable, loose terminal, blown fuse |
| **Detection method** | Insulation resistance test (MΩ) | Continuity test (Ω) |

---

## What Is a Short Circuit?

A **short circuit** is an unintended low-resistance path between two conductors that should not be in direct contact. The most common form is a **line-to-line short**: the live conductor touches the neutral conductor.

In a correctly designed circuit, current flows from the live supply, through a load (a lamp, a motor, a heater), and back through the neutral. The load provides resistance, which controls how much current flows. Remove that resistance — by connecting live directly to neutral without a load in between — and Ohm's Law dictates the result:

**I = V / R**

With R approaching zero, current approaches infinity. In practice, the cable's own resistance limits the fault current to a finite (but enormous) value — typically hundreds to thousands of amperes in a domestic installation.

### Why a Short Circuit Is Dangerous

The MCB protecting the circuit is designed to trip when current exceeds its rated value. A 16 A MCB trips at around 16–20 A under sustained overload, but under a true short-circuit current of several hundred amperes, it trips almost instantaneously (within milliseconds under BS EN 60898 Type B characteristics).

The danger window is that brief interval before the MCB clears the fault. During that time:

- Cable insulation can begin to melt
- Connection terminals can arc and carbonise
- In worst cases, an arc flash can ignite surrounding materials

A short circuit involving the earth conductor (live-to-earth) is equally dangerous. The fault current path is through the earth wire, and the earth must have sufficiently low resistance for the fault current to be high enough to trip the MCB quickly. This is why earth continuity testing is mandatory — a high-resistance earth path means a live-to-earth short circuit may not trip the MCB at all.

### Common Causes of Short Circuits

- **Insulation degradation** — old rubber-sheathed wiring loses elasticity and cracks; rodent damage to PVC insulation
- **Water ingress** — a leaking pipe dripping onto a junction box can bridge live and neutral conductors through water contamination
- **Wiring errors** — live and neutral terminated in the same terminal during installation
- **Mechanical damage** — a screw or nail driven through a cable buried in a wall
- **Component failure** — a faulty appliance with an internal live-to-neutral fault plugged into a socket

### How to Detect a Short Circuit

The primary tool is an **insulation resistance (IR) test**, performed with the circuit de-energised and the supply isolated. A megohmmeter applies a test voltage (typically 500 V DC for domestic circuits) between conductors and measures the resistance of the insulation between them. Healthy insulation reads in the hundreds of megaohms; a short circuit reads close to zero.

Under BS 7671, the minimum acceptable insulation resistance between live conductors and earth is **1 MΩ**. A reading significantly below this indicates compromised insulation and a potential short-circuit fault.

> Related: [5 Common Electrical Wiring Mistakes — and How to Avoid Them](/blog/5-common-electrical-wiring-mistakes/)

---

## What Is an Open Circuit?

An **open circuit** is the exact opposite: a break in the current path. Current cannot flow because the circuit is not complete. The break may be a physical severing of the conductor, a disconnected terminal, a blown fuse, or any other interruption in continuity.

Unlike a short circuit, an open circuit causes **no overcurrent**. The MCB sees nothing unusual because no current is flowing. The fault is completely silent from the MCB's perspective.

### Why Open Circuits Are Deceptively Tricky

The absence of current is the symptom — which means the only tool that tells you anything is one that can measure resistance or send its own test current through the circuit. A voltage tester shows no voltage at the load, but that just confirms the circuit is dead; it does not tell you *where* the break is.

Open circuits are significantly more common than short circuits in established installations. They are also more likely to be intermittent — a loose terminal that makes contact when cold but expands and loses contact under operating temperature can produce a fault that appears and disappears without any obvious pattern.

### Common Causes of Open Circuits

- **Loose termination** — the most common cause in domestic installations; a wire not pushed fully into a connector or not tightened sufficiently at a terminal
- **Blown fuse** — a fuse element that has failed under sustained overload (note: a blown fuse is a protective open circuit, not a fault in the wiring itself)
- **Broken cable** — physical severance; this can be invisible inside conduit or buried under plaster
- **Conductor fatigue** — fine-stranded flex conductors break individual strands over time under repeated flexing, eventually reducing to zero continuity
- **Corroded terminal** — particularly in outdoor enclosures, corroded contacts can have high enough resistance to appear as an open circuit under load even if they show continuity under the low-current of a meter test

### How to Detect an Open Circuit

An open circuit is found with a **continuity test**: with the circuit isolated, a multimeter set to resistance (Ω) or continuity mode sends a small test current through the circuit. A healthy conductor reads near zero ohms. An open circuit reads infinite resistance (OL on a multimeter display).

The method is to work systematically from one end of the circuit to the other, testing each section in turn, until you find the segment where continuity is absent. The break is between the last point that shows continuity and the first point that does not.

> Related: [Fault Simulation Mode in ElectraSim: Diagnose Open Circuits, Reverse Polarity and Earth Faults](/updates/fault-simulation-mode-open-circuit-reverse-polarity-earth-fault/)

---

## The Third Fault Type: High-Resistance Connection

There is a fault that sits between a short circuit and a true open circuit that is worth knowing about: the **high-resistance connection**. A corroded terminal, a loose connection under a screw, or a partially broken conductor can have enough resistance to pass some current — but far more resistance than a healthy conductor should.

The symptoms are inconsistent with the other two fault types:

- The circuit works — but loads run dim or underperform
- Cables and terminals run hot under load, even at normal current levels (power dissipated = I² × R; a high-resistance joint dissipates far more power as heat than a low-resistance one)
- Voltage at the load is lower than expected (voltage drop across the high-resistance joint)

High-resistance connections are a significant fire risk. They may not trip the MCB (because the current drawn is within rating), but the heat generated at the joint can char insulation and surrounding materials over months or years. This is one of the faults that EICR periodic inspection is specifically designed to catch.

---

## Simulating Both Faults in ElectraSim

[ElectraSim's](/app/) Fault Simulation Mode gives you a direct, interactive way to see both fault types in action.

### Simulating an Open Circuit

1. Build a simple circuit: **Live (L) → Switch → Bulb → Neutral (N)**
2. Run the simulation — the bulb illuminates
3. Activate Fault Mode (⚠ button, bottom-right)
4. Select **Wire Break**
5. Click the wire between the Switch and the Bulb

The BFS (breadth-first search) traversal that drives the simulation immediately removes the broken wire from the circuit graph. The bulb goes dark. Toggle the switch — it has no effect, because the fault is downstream of the switch. Now move the wire break to the wire between the Live terminal and the Switch — the bulb is still dark, and the switch is now completely isolated from the supply.

This directly models how a continuity test would work: starting at the supply, testing each wire in turn until the break is found.

### Simulating a Short Circuit

ElectraSim's simulation engine already detects short circuits in normal mode — no fault injection needed. If you connect the separate **Live (L)** and **Neutral (N)** supply terminals directly, bypassing all loads, the simulation flags a short-circuit fault in the log panel and marks the involved terminals and wire as error elements. This deliberate supply-terminal connection is the one cross-type wire the editor permits for fault demonstrations.

> Try it: [open ElectraSim →](/app/), place one Live (L) terminal and one Neutral (N) terminal, then connect them with a single wire. Press Run. The short circuit is detected immediately.

For a deeper exploration of fault injection: [Fault Simulation Mode — detailed guide](/updates/fault-simulation-mode-open-circuit-reverse-polarity-earth-fault/)

---

## Frequently Asked Questions

### Can a short circuit cause a fire?

Yes. The arc energy during a short circuit, the heat generated in cables carrying fault current, and the thermal effect on terminations can all ignite surrounding materials. This is why cable sizing, MCB rating, and earth fault loop impedance testing exist — to ensure the MCB clears any fault current quickly enough that cables do not reach their limiting temperature.

### Why doesn't the MCB trip during an open circuit?

Because there is no current flowing. The MCB is a current-operated device — it trips when current exceeds its threshold. An open circuit produces zero current, which is well within any MCB's rating. The circuit is simply dead from the load's perspective, while the MCB sees a normal (if quiet) circuit.

### Is a blown fuse an open circuit?

Yes. When a fuse element melts and breaks, it creates an open circuit in the protected path. This is by design — a fuse is a deliberately weak link that creates a controlled open circuit in response to overcurrent. Replacing a fuse with one of a higher rating to "fix" repeated blowing is dangerous: it defeats the protection and allows the overcurrent that was causing the blowing to continue, potentially causing cable overheating or fire.

### What is a ground fault?

A **ground fault** (US terminology) or **earth fault** (UK terminology) is a specific type of short circuit: an unintended connection between the live conductor and earth. It is detected by an RCD, which measures the imbalance between live and neutral current. Any current flowing to earth rather than returning through the neutral registers as a differential — trip thresholds are typically 30 mA for personal protection.

> Related: [What Is an RCD and Why Do You Need One?](/blog/what-is-an-rcd-and-why-do-you-need-one/)

### How do I tell which fault type I have before testing?

Symptom analysis narrows it down quickly:

- **MCB has tripped** → overcurrent event — investigate short circuit or overload
- **MCB has not tripped, circuit is dead** → open circuit — test continuity from supply towards load
- **Circuit works but runs hot / loads underperform** → high-resistance connection — test voltage drop under load

---

## Summary

A short circuit and an open circuit are fundamentally opposite faults. The short circuit overwhelms the circuit with current; the MCB responds. The open circuit silences the circuit entirely; the MCB does not respond because it has nothing to respond to. Both require systematic testing with the right instruments — an IR tester for short circuits, a continuity tester for open circuits.

Understanding which fault type you are dealing with before you start testing is the difference between a five-minute diagnosis and an hour of searching in the wrong place.

**Explore both fault types interactively:** [Open ElectraSim →](/app/) — free, no account required.
