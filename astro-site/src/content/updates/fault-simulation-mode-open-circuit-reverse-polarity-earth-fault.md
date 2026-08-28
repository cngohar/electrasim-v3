---
title: "Fault Simulation Mode in ElectraSim: Diagnose Open Circuits, Reverse Polarity and Earth Faults"
description: "ElectraSim now lets you inject real electrical faults into any circuit — wire breaks, reverse polarity, and missing earths — and watch how each one affects simulation results."
pubDate: 2026-05-16
author: ElectraSim
category: App Update
tags: [fault simulation, electrical faults, open circuit, reverse polarity, earth fault, missing earth, fault diagnosis, electrical troubleshooting, circuit simulator, wiring faults, app update]
---

Knowing how a circuit behaves when it is healthy is useful. Knowing how it behaves when something is wrong is what separates a competent electrician from a dangerous one.

Most circuit simulators only show the happy path — components energised, current flowing, lights on. Real fault-finding is different. You arrive at a job where a circuit is dead, intermittent, or tripping, and you have to work backwards from symptoms to cause without touching anything live until you understand exactly what has happened.

**ElectraSim v1.4.0 adds Fault Simulation Mode** — a set of tools that let you deliberately inject electrical faults into any circuit you build and observe their effects in real time. This update is aimed at electrical students learning fault diagnosis, apprentices practising for their AM2 assessment, and anyone who wants to understand why electrical safety rules exist, not just what they are.

[Try Fault Simulation Mode now — free, no account needed →](/app/)

---

## What Is Fault Simulation Mode?

Fault Simulation Mode is a new overlay accessible from the **⚠ button** in the bottom-right tool dock. Pressing it opens the Fault Panel at the top of the canvas.

From the panel you choose one of three fault types:

| Fault | Apply to | Visual |
|---|---|---|
| **Wire Break** | Any wire | Red dashed line + ✕ marker at midpoint |
| **Reverse Polarity** | Any component | Orange dashed ring + ↔ badge |
| **Missing Earth** | Any component | Yellow dashed ring + ⚡ badge |

Click the target element to inject the fault. Click again to remove it. The simulation re-runs automatically after every change — you see the effect immediately in the canvas, the log panel, and the status bar.

When you exit fault mode (press ⚠ again), all injected faults are automatically cleared and the circuit returns to its normal state.

---

## Fault Type 1: Wire Break (Open Circuit)

### What It Is

An open circuit is any break in the current path. Current is like water — it cannot flow across a gap. The moment continuity is broken anywhere in a series path, the entire downstream section goes dead.

### Real-World Causes

- **Rodent damage** — rats chew through cable insulation and conductors
- **Nail or screw through a cable** — one of the most common DIY accidents; the nail can create an immediate short, or a partial fault that only manifests under load
- **Loose termination** — a wire not pushed fully into a terminal block; vibration works it free over time
- **Conductor fatigue** — repeated mechanical flexing (e.g. inside a skirting board that gets kicked) can break individual strands until the cable fails
- **Corroded connection** — particularly in outdoor or damp locations

### In ElectraSim

Select **Wire Break** in the fault panel and click any wire. The wire renders as a **dashed red line** with an **✕ circle** at its midpoint. The simulation's BFS traversal treats the broken wire as absent — it is simply removed from the circuit graph. Downstream loads go dark immediately.

**Try this:** build a simple supply → switch → bulb circuit with three wires. Break the wire between the switch and the bulb. The bulb goes dark. Now restore that wire and break the wire between the supply and the switch. The bulb is still dark, but toggling the switch now has no visual effect either — because the entire live path from supply to bulb is interrupted.

This demonstrates the fundamental rule of fault-finding: **start at the supply and work towards the load**, testing continuity at each joint until you find where continuity is lost.

### Fault-Finding Method It Models

The open-circuit fault is found with a **continuity test** (Ω range on a multimeter with the supply isolated) or a **voltage test** (measuring for 230 V along the live path while live, to find the last point where voltage is present before the break).

> Related: [5 Common Electrical Wiring Mistakes — and How to Avoid Them](/blog/5-common-electrical-wiring-mistakes/)

---

## Fault Type 2: Reverse Polarity

### What It Is

Reverse polarity means the live and neutral conductors are swapped at a connection point. The appliance may still work — AC current flows either way — but the installation is dangerous.

### Why It Is Dangerous

When polarity is reversed at a socket or light fitting:

- The **switch** (if wired in the live) now breaks the neutral instead of the live — the appliance is off but the live terminal inside it is still energised
- **Edison screw lamp holders (E27/B22):** the outer metal shell, which you touch when changing a bulb, is connected to live instead of neutral
- **RCDs** detect differential current — reversed polarity does not inherently trigger an RCD, so a polarity fault can exist for years on a circuit protected by an RCD without being detected
- Any metalwork connected to what the installer believed was neutral is actually live

The standard **polarity test** is a mandatory part of initial verification under BS 7671. It is one of the tests specifically required before a new installation is energised for the first time.

### Real-World Causes

- Connecting brown and blue wires to the wrong terminals (easy when tired or in poor light)
- Using old pre-2004 cabling where red was live — a red wire sleeved black in a switch drop can look like neutral
- Incorrectly re-using old wiring in an extension

> For a detailed explanation of why live and neutral must never be swapped, see: [Live, Neutral and Earth Wires Explained](/blog/live-neutral-and-earth-wires-explained/)

### In ElectraSim

Select **Reverse Polarity** and click a component. The component receives an **orange dashed ring** with a **↔ badge** and is immediately added to the error list in the log panel:

```
⚠ Reverse polarity at [component] — live and neutral are swapped.
```

The adjacent wires are also marked as error wires in the current simulation result. The component may remain energised (because both live and neutral still reach it), but the error flag communicates the safety risk clearly — distinguishing between "this circuit works" and "this circuit is safe".

---

## Fault Type 3: Missing Earth (Earth Fault)

### What It Is

A missing earth means a Class I appliance — one with a conductive metal casing — has no earth connection. Under normal operation the appliance works perfectly. The fault is completely invisible during routine use.

### Why It Is Dangerous

Under normal operation: nothing happens. The earth conductor carries no current, so its absence causes no effect on circuit behaviour.

Under a fault condition (live conductor touches the metal casing):

- The casing becomes live at **230 V**
- No fault current flows — because there is no earth path for it to flow through
- The MCB does **not trip** — the MCB trips on overcurrent; without an earth path there is no overcurrent
- The RCD will trip only if a person touches the casing and current flows through them to earth — *after* the shock has already occurred
- Every person who touches the appliance, or any metal bonded to it, is at risk

This is why earth continuity testing is a mandatory part of every EICR (Electrical Installation Condition Report). A broken or disconnected earth is one of the most dangerous hidden defects in an installation.

> Related: [What Is an RCD and Why Do You Need One?](/blog/what-is-an-rcd-and-why-do-you-need-one/) — and why an RCD without a working earth is still not sufficient protection.

### Real-World Causes

- Earth wire not terminated during DIY work
- Cable insulation stripped too far back, earth conductor broken during installation
- Corrosion at the earth terminal in a damp location
- Old installations with no earth conductor in the cable at all (pre-1950s rubber-sheathed wiring)

### In ElectraSim

Select **Missing Earth** and click a component. The component receives a **yellow dashed ring** with a **⚡ badge** and a warning appears in the log:

```
⚠ Earth fault at [component] — no earth connection, safety risk.
```

The visual distinction from the wire break (red) and reverse polarity (orange) helps build the intuition that these are three distinct fault categories with different detection methods, different consequences, and different remediation steps.

---

## How to Use Fault Simulation Mode: Step-by-Step

1. **Open ElectraSim** at [/app/](/app/) — no account required
2. **Build a circuit** — or use the default demo. A basic supply → MCB → switch → bulb setup works well for learning
3. **Start the simulation** — press **Run** so you can see live energisation states
4. **Activate Fault Mode** — press the **⚠ button** in the bottom-right tool dock
5. **Choose a fault type** from the panel (Wire Break / Reverse Polarity / Missing Earth)
6. **Click a wire or component** to inject the fault — the simulation updates immediately
7. **Read the log panel** — every fault injection produces a log entry describing the fault in plain English
8. **Click the faulted element again** to remove the fault, or use the active fault list in the panel to remove faults individually
9. **Exit fault mode** — press ⚠ again; all faults clear automatically

> 💡 **Tip:** run multiple fault types simultaneously to see how compound faults interact. A reverse polarity fault combined with a missing earth is particularly illustrative — both faults can coexist silently in a real installation.

---

## Who This Is For

### Electrical Students and Apprentices

Fault diagnosis is tested in the AM2 practical assessment and forms a significant part of City & Guilds 2365 and 2357 courses. ElectraSim gives you a consequence-free environment to practise building circuits with deliberate faults, identifying what each symptom looks like, and working through the logical steps to isolate the cause — before you ever have to do it on a live installation.

### Qualified Electricians

Use it to explain faults to clients. "Your circuit has a broken earth — it still works, but here's what happens if a fault develops" is much easier to communicate with an interactive visual than with a verbal description.

### Teachers and Lecturers

Build circuits with hidden faults and have students diagnose them. The fault panel's explicit active-fault list makes it easy to set up and reset scenarios without the class seeing what fault has been injected.

### Hobbyists and DIYers

If you are planning any domestic wiring work, understanding these three fault types — and crucially, why they are dangerous even when the circuit appears to work — is fundamental safety knowledge. The best investment you can make before touching a wire is understanding what the wire is supposed to do, and what happens when it does not.

> New to ElectraSim? Start here: [Getting Started with ElectraSim: Build Your First Circuit in 5 Minutes](/blog/getting-started-with-electrasim/)

---

## Frequently Asked Questions

### Does injecting a fault affect my saved circuit?

No. Faults are ephemeral — they exist only in the running session and are never saved to your circuit file. When you export your circuit (JSON or SVG), all faults are absent from the export. Exiting fault mode also clears all faults immediately.

### Can I inject more than one fault at a time?

Yes. You can stack multiple faults of different types across different components and wires simultaneously. The simulation handles all of them in a single pass — each fault-annotated component is added to the error set and each broken wire is removed from the BFS graph before traversal begins.

### Why does a reverse-polarity component sometimes still show as energised?

Because in a simple circuit, reversing polarity does not break the current path — it just makes the installation unsafe. The load (a bulb, for example) still receives live and neutral; they are simply on the wrong terminals. In DC simulation, this would make a motor run backwards; in AC, most resistive loads are unaffected electrically. The danger is in the physical wiring, not the flow of current — which is exactly why polarity faults are so insidious.

### How does this relate to the MCB?

The [MCB (Miniature Circuit Breaker)](/blog/what-is-an-mcb-breaker/) only trips on overcurrent. A wire break causes undercurrent (zero current), so the MCB is unaffected. A reverse polarity fault causes no change in current magnitude, so the MCB is unaffected. A missing earth causes no fault current to flow (until someone receives a shock), so the MCB is unaffected. None of these three faults are MCB-detectable — which is exactly why they require separate testing procedures.

### Is this available on mobile?

Yes. ElectraSim runs in any modern mobile browser. The fault panel is responsive and the touch targets for fault injection are sized appropriately for touch screens.

---

## Summary

| Fault | Visible in normal use? | Detected by MCB? | Detected by RCD? | Test method |
|---|---|---|---|---|
| **Wire Break** | Yes — downstream dead | No | No | Continuity test (Ω) |
| **Reverse Polarity** | No — circuit works | No | No | Polarity test |
| **Missing Earth** | No — circuit works | No | Only after shock | Earth continuity test |

Three faults. Three different symptom profiles. Three different detection methods. All of them potentially present in the same installation simultaneously, with no obvious signs during normal operation.

That is what makes fault diagnosis a skill worth practising — and what makes a safe tool to practise it in genuinely useful.

**Ready to try it?** [Open ElectraSim and inject your first fault →](/app/)
