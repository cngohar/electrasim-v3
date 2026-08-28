---
title: "6 New Components in ElectraSim: RCD, Contactor, Timer Switch, Dimmer Switch, Distribution Board & Bell"
description: "ElectraSim just added 6 new electrical components — RCD, Contactor, Timer Switch, Dimmer Switch, Distribution Board, and Bell/Buzzer. Here's what each one does and how to use them in your circuits."
pubDate: 2026-05-09
updatedDate: 2026-08-22
author: ElectraSim
category: App Update
tags: [RCD, contactor, timer switch, dimmer switch, distribution board, bell buzzer, new features, electrical components, circuit simulator]
---

ElectraSim's component library just got a major upgrade. Six new electrical components are now available on the canvas — covering protection, automation, control, and signalling. Whether you're a student learning circuit design, an electrician practising wiring layouts, or a hobbyist building virtual panels, these additions let you model significantly more realistic electrical systems.

Here's a complete guide to each new component, what it does in the real world, and how to use it in ElectraSim.

[Try all of them now in ElectraSim →](/app/)

---

## 1. RCD / RCCB — Residual Current Device

**Category:** Protection

An RCD (Residual Current Device) — also called an RCCB (Residual Current Circuit Breaker) — is one of the most important safety devices in modern electrical installations. It detects leakage current: a tiny imbalance between the current flowing out on the Live wire and returning on the Neutral wire. Even a few milliamps of leakage can indicate that current is taking an unintended path — through a person, for example.

**How it works:**
The RCD continuously compares current on Live and Neutral. Under normal conditions they're equal. If Live current exceeds Neutral current by around **30mA** on a personal-protection device, the RCD disconnects quickly enough to reduce the risk of fatal electric shock. The exact trip time depends on the residual current and device type.

**Where RCDs are used:**
- Bathroom and kitchen circuits (high shock risk zones)
- Outdoor and garden circuits
- Socket outlets accessible to the public
- Any circuit where earth fault protection is required beyond what an MCB provides

**In ElectraSim:**
The RCD has four ports — Live-in, Neutral-in, Live-out, and Neutral-out. Wire it **in series** between the supply and the loads it protects. It monitors both the Live and Neutral paths simultaneously.

```
Live (L) → RCD (L-in → L-out) → Load
Neutral (N) → RCD (N-in → N-out) → Load
```

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Key difference from MCB:** An MCB protects against overload and short circuit. An RCD protects against earth faults and electrocution risk. In modern installations they're often combined into a single device called an **RCBO**. ElectraSim now includes a dedicated [RCBO component](/blog/what-is-an-rcbo-difference-between-rcd-mcb-rcbo/) (added in v1.6), so you can place one directly — or still model the same protection the classic way with an MCB and an RCD in series.

---

## 2. Contactor — High-Power Electrically-Controlled Switch

**Category:** Switch / Control

A contactor is an electrically operated switch designed for switching high-power loads — motors, HVAC compressors, industrial machinery, and large lighting banks. Unlike a standard light switch (which you operate manually), a contactor is controlled by a separate low-voltage coil circuit. When the coil is energised, it closes the main contacts, allowing high current to flow through the load circuit.

**Why use a contactor instead of a switch?**
A standard switch is designed for the current it directly carries. A contactor separates the control circuit (low current, safe to touch) from the power circuit (potentially hundreds of amps). This allows remote control, automated switching via timers or sensors, and safe operation of loads that would destroy a standard switch.

**Typical applications:**
- Motor starters (direct-on-line starting of pumps, fans, compressors)
- Central HVAC systems
- Large outdoor lighting (car parks, stadiums, street lighting)
- Industrial automation and PLC-controlled systems

**In ElectraSim:**
The Contactor has four ports — Live-in/out and Neutral-in/out. Wire it in the same way as an RCD. It behaves as a manually toggled switch in the simulator (representing coil energised / de-energised). Use it to model any circuit where you need a high-power switching point that's separate from the control logic.

> **Simulator note:** ElectraSim's current Contactor is a manual stand-in for the coil's energised or de-energised state; it does not expose separate coil or auxiliary-contact terminals. For the real START, STOP, and holding-contact principle, read [How Does a Push Button Switch Work?](/blog/how-does-a-push-button-switch-work/).

---

## 3. Timer Switch — Automatic Time-Based Control

**Category:** Timer / Automation

A timer switch automatically opens or closes the circuit at pre-programmed times — no human intervention needed once it's set. It's one of the simplest forms of electrical automation and is used everywhere from staircase lighting to garden irrigation.

**Types of timer switches in real installations:**
- **Mechanical 24-hour timers** — a rotating disc with push-in pins that set ON/OFF periods in 15-minute increments
- **Digital programmable timers** — can store multiple on/off events per day, per week, or per season
- **Countdown timers** — turn off after a set duration (common in bathroom fans and staircase lights)
- **Astronomical timers** — turn on/off at sunrise/sunset based on GPS location

**Typical uses:**
- Staircase, corridor, and garage lighting (timed cut-off after a few minutes)
- Outdoor security and decorative lighting (dusk-to-dawn or scheduled windows)
- Hot water immersion heaters (run during off-peak tariff hours)
- Garden irrigation pumps

**In ElectraSim:**
The Timer Switch has two ports — Live-in and Live-out — and behaves like a single-way switch that you can toggle to represent the timer triggering. Wire it in series before the loads it controls. Use it with a Bulb or Socket to model timed lighting circuits.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Circuit idea:** Wire a Timer Switch in series with an outdoor Bulb. Toggle the switch to simulate the timer reaching its ON time. Add an MCB upstream for a realistic outdoor lighting circuit.

---

## 4. Dimmer Switch — Variable Brightness Control

**Category:** Control

A dimmer switch reduces the voltage delivered to a lighting load, allowing you to adjust brightness from 0–100%. Modern dimmers use **phase-cut technology** (either leading-edge or trailing-edge) to rapidly switch the AC cycle on and off, effectively reducing the average power delivered to the bulb.

**Leading-edge vs trailing-edge:**
- **Leading-edge dimmers** are older technology, designed for resistive and inductive loads (incandescent bulbs, halogen). They chop the beginning of each AC half-cycle.
- **Trailing-edge dimmers** are modern, designed for capacitive and electronic loads (LED drivers, CFLs). They chop the end of each AC half-cycle and are much quieter and smoother.

Always match the dimmer type to your bulb type — using a leading-edge dimmer with LED lamps causes flickering, buzzing, and reduced lifespan.

**Typical uses:**
- Living room and bedroom ambient lighting
- Dining room and feature lighting
- Stage and hospitality lighting rigs
- Any circuit where you want user control over brightness rather than on/off only

**In ElectraSim:**
The Dimmer Switch has two ports — Live-in and Live-out — and connects in series between the MCB and the Bulb. The simulator models it as a controlled pass-through: it can be toggled to represent full-on vs dimmed state. Wire it the same way as a single-way switch, but note it is for **lighting loads only** — connecting a Dimmer to a motor or fan is incorrect wiring (use the Fan Dimmer component for fans instead).

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Note:** ElectraSim also has a **Fan Dimmer** component, which is the rotary speed controller used specifically with ceiling fans. The Dimmer Switch is specifically for lighting circuits.

---

## 5. Distribution Board — Consumer Unit / Fuse Box

**Category:** Protection / Distribution

The Distribution Board (also called a consumer unit, fuse box, or breaker panel) is the central hub of any electrical installation. It takes a single incoming supply and distributes it to multiple independent circuits, each protected by its own MCB.

**What's inside a real distribution board:**
- **Main isolator switch** — disconnects the entire installation
- **Busbars** — conductive bars that all MCBs connect to
- **Individual MCBs** — one per circuit (lighting, sockets, kitchen, shower, etc.)
- **RCDs or RCBOs** — for earth fault protection

**In ElectraSim:**
The Distribution Board has seven ports:
- **L-in** and **N-in** — the incoming supply from your Live and Neutral terminals
- **L1, L2, L3** — three separate Live outputs, each representing a different circuit
- **N1, N2** — two Neutral return paths

Connect an MCB to each Live output to model individual circuit protection. This lets you build a complete representation of a home's electrical panel.

**Example panel layout:**
```
Live (L) → Distribution Board (L-in)
Neutral (N) → Distribution Board (N-in)

L1 → MCB1 → Lighting circuit
L2 → MCB2 → Ring main (sockets)
L3 → MCB3 → Kitchen circuit

N1 → Neutral return for lighting + ring main
N2 → Neutral return for kitchen
```

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Circuit challenge:** Build a three-circuit panel: one for lighting (Bulb + Switch), one for sockets (3-Pin Socket), and one for a motor. Wire all three through the Distribution Board and add individual MCBs on each output.

---

## 6. Bell / Buzzer — Signalling Load

**Category:** Load

The Bell / Buzzer component represents an electromechanical bell (ding-dong style), a continuous buzzer, or any electronic sounder used for signalling or alerting. It is a **load** — it consumes power to make sound. Unlike a switch or protection device, it does not control or protect the circuit; it simply responds to being energised.

**Types of real-world signalling devices this represents:**
- **Doorbell** — typically 12V or 24V AC, triggered by a push button at the door
- **Alarm buzzer** — continuous tone for security or industrial alarm systems
- **School bell / break bell** — timed bell on a distribution circuit
- **Access control sounder** — brief tone on entry systems

**In ElectraSim:**
The Bell / Buzzer has two ports — Live and Neutral — wired exactly like a Bulb. It is treated as a load and activates when both Live and Neutral are connected and the simulation is running.

**Classic doorbell circuit:**
```
Live (L) → Push Button → Bell → Neutral (N)
```
The Push Button is momentary (closes only while held), so the Bell energises only while the button is pressed, mirroring the control path of a simple real doorbell. This is one of the simplest circuits to build in ElectraSim.

The dedicated [Push Button guide](/blog/how-does-a-push-button-switch-work/) explains the spring-return mechanism, NO and NC contacts, and how this simple bell circuit differs from industrial holding logic.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Circuit idea:** Build a doorbell with two buttons — one at the front door and one at the back — wired in parallel, both feeding the same Bell. Either button triggers the bell independently.

---

## Putting It All Together — A Complete Modern Panel Circuit

With all six new components available, here's a realistic full-installation layout you can build in ElectraSim:

```
Live (L) → Distribution Board
Neutral (N) → Distribution Board

DB L1 → RCD → MCB → Lighting circuit (Switch + Bulb)
DB L2 → MCB → Timer Switch → Outdoor Bulb (automated lighting)
DB L3 → MCB → Dimmer Switch → Ceiling Bulb (dimmable mood lighting)
DB L4 (future) → Contactor → Motor (pump or HVAC)
DB L5 (future) → MCB → 3-Pin Socket → Bell (doorbell circuit via Push Button)
```

This gives you:
- **RCD-protected** indoor lighting
- **Timer-automated** outdoor lights
- **Dimmable** feature lighting
- **Contactor-switched** motor load
- **Doorbell** on its own circuit

[Build this in ElectraSim →](/app/)

---

## Component Summary

| Component | Category | Key Use |
|---|---|---|
| **RCD / RCCB** | Protection | Earth fault + electrocution protection |
| **Contactor** | Switch | High-power load switching via coil |
| **Timer Switch** | Automation | Scheduled on/off without manual intervention |
| **Dimmer Switch** | Control | Variable brightness for lighting loads |
| **Distribution Board** | Distribution | Distribute supply to multiple circuits |
| **Bell / Buzzer** | Load | Doorbell, alarm, and signalling circuits |

---

## Key Takeaways

- **RCD** adds the earth fault and shock protection that an MCB alone cannot provide — use it on bathroom, kitchen, and outdoor circuits
- **Contactor** enables high-power and remotely controlled switching — essential for motors and HVAC
- **Timer Switch** is the simplest form of electrical automation — great for staircase and outdoor lighting
- **Dimmer Switch** controls lighting brightness — use trailing-edge type with LEDs
- **Distribution Board** is the heart of any multi-circuit installation — model a complete consumer unit
- **Bell / Buzzer** completes basic signalling circuits — build a doorbell in under a minute

All six components are available now — free, no sign-up needed.

[Open ElectraSim and start building →](/app/)
