---
title: "How a Timer Switch Works and How to Wire One: Mechanical, Digital and Astronomical"
description: "Timer switches automate lighting, heating, and appliances by switching circuits on and off at set times. This guide explains how mechanical, digital, and astronomical timers work, how to wire each type, and which to use for different applications."
pubDate: 2026-05-22
author: ElectraSim
category: Beginner Guide
tags: [timer switch, how timer switch works, wiring timer switch, mechanical timer, digital timer, astronomical timer, immersion heater timer, outdoor lighting timer, 24-hour timer, 7-day timer, BS 7671, smart timer]
---

A timer switch is one of the simplest and most useful automation devices in domestic electrical installations. Set it once and lights come on at dusk, the immersion heater heats water before you wake up, and the garden lights turn off at midnight — without touching a switch.

But there are three fundamentally different types of timer switch (mechanical, digital, and astronomical), and each works in a completely different way, requires different wiring, and suits different applications. This guide explains all three, how to wire each one, and how the timer component in **[ElectraSim](/app/)** models the switching logic.

---

## What a Timer Switch Does Electrically

A timer switch is simply an **automatically controlled switch** — it connects or disconnects the live conductor to the load at programmed times. The load (a light fitting, immersion heater, pump, or any other appliance) is wired through the timer's output terminals. At the set on-time, the timer closes the internal switch contact and current flows. At the set off-time, the contact opens and current stops.

The timer itself needs a small power supply to run its clock and control circuitry. This comes either from the mains live and neutral connected to its input terminals, or in some designs from a small internal battery (used as backup to preserve the programme during a power cut).

From a circuit perspective, a timer is equivalent to a switch with an internal clock controlling its open/closed state.

> Related: [Electrical Circuit Symbols: Complete Reference Guide](/blog/electrical-circuit-symbols-complete-reference/)

---

## Type 1: Mechanical (Analogue) Timer Switch

### How it works

A mechanical timer uses a **rotating disc or drum** driven by a small synchronous motor that runs in time with the 50 Hz mains frequency. The disc rotates once every 24 hours (for a 24-hour timer).

Around the edge of the disc are **removable tripping pins** (or a slideable ring). When a pin passes the switch actuator, it flips the contact from open to closed — or closed to open. To set an on/off programme, you push pins in (to activate) or pull them out (to deactivate) around the disc.

The typical mechanical timer has a resolution of **15 minutes per pin segment** — so you can programme on and off events to the nearest quarter-hour.

### Advantages
- No programming complexity — physical pins are immediately visual
- Extremely reliable — no software to corrupt or reset
- No battery needed for time-keeping (driven by mains frequency)
- Cheap (£5–£15)

### Disadvantages
- 15-minute minimum resolution
- No automatic adjustment for sunrise/sunset or daylight saving time
- Only 24-hour programmes (no 7-day patterns on basic models)
- Power cut resets to current mains phase — if mains drops briefly, the disc position is maintained (motor stops) but the time may drift

### Typical applications
- Immersion heater (heat water in off-peak economy 7 period)
- Garden water pump
- Fish tank lighting
- Simple indoor lamp timing

---

## Type 2: Digital (Electronic) Timer Switch

### How it works

A digital timer uses a **microcontroller** (a small computer chip) to track time and control a relay or triac output. The time is kept by an internal crystal oscillator — much more accurate than a mains-frequency motor.

Programming is done via **buttons and a digital display** (LCD or LED). You set the current time and date, then programme on/off events with times, days of the week, and repeat patterns. Most digital timers offer:

- 1-minute (or better) resolution
- **7-day programming** — different programmes for weekdays and weekends
- Multiple on/off events per day (typically 8–16 event pairs)
- Memory backup via a small lithium coin cell battery (preserves programme through a power cut)

### Advantages
- Fine time resolution (1 minute)
- 7-day programming — weekday/weekend or individual days
- Programme memory survives power cuts (battery backup)
- More events per day than mechanical timers

### Disadvantages
- More complex to programme than mechanical pins
- Battery backup cell eventually needs replacing (typically every 3–5 years)
- Still manual adjustment needed for daylight saving time (on most models)

### Typical applications
- Outdoor security lighting (7-day patterns, different for winter/summer)
- Commercial signage lighting
- Heating programmer (simple)
- Irrigation pump control

---

## Type 3: Astronomical (Sunrise/Sunset) Timer Switch

### How it works

An astronomical timer contains the same microcontroller as a digital timer, but adds a **GPS-based or pre-programmed astronomical database** of sunrise and sunset times for any location on earth, for every day of the year.

You configure the timer with your **latitude and longitude** (or select from a list of cities). The timer then automatically calculates local sunrise and sunset for the current date and adjusts the on/off times accordingly — every day, without user input.

An astronomical timer can be set to:
- Switch on at **sunset** (or sunset ± an offset, e.g. 30 minutes before)
- Switch off at **sunrise** (or at a fixed time, e.g. 11 pm)
- Adjust automatically for **daylight saving time** (on most models with a BST/GMT flag)

### Advantages
- Completely automatic seasonal adjustment — lights come on at the right time every day of the year
- No manual reprogramming at clocks-change
- Offset function (e.g. "30 minutes before sunset") handles twilight
- Most also offer fixed-time override events

### Disadvantages
- More expensive (£25–£80)
- Requires initial location setup
- More complex to configure than digital models

### Typical applications
- Outdoor security lights — always on at dusk, off at dawn
- Street lighting simulation for security (makes the property look occupied)
- Garden lighting
- Commercial exterior signage

---

## How to Wire a Timer Switch

### 1. DIN-rail timer (consumer unit / fused spur installation)

A DIN-rail timer mounts inside or alongside a consumer unit on a 35 mm DIN rail. It is the correct type for controlling a fixed circuit — immersion heater, outbuilding light, pump.

**Connections:**

```
L (live in) ──── Timer ──── L out ──── Load
N (neutral) ─────────────────────────────── (bypasses timer)
E (earth) ───────────────────────────────── (bypasses timer)
```

The timer switches only the **live conductor**. Neutral and earth connect directly to the load — the timer does not interrupt them.

At the consumer unit, the DIN-rail timer is wired between the MCB output (switched live) and the circuit cable going to the load. The neutral of the circuit bypasses the timer directly.

For an immersion heater, the sequence is:

```
MCB (20 A) → Timer → Immersion heater switch (double pole, 20 A) → Immersion heater element
```

The double-pole switch allows manual override — you can bypass the timer and heat water immediately when needed.

### 2. Plug-in timer (13 A socket)

A plug-in timer inserts directly into a standard 13 A socket. The appliance plugs into the timer's output socket. No wiring required.

Plug-in timers are suitable for any load up to 13 A (2,990 W at 230 V). They are not suitable for fixed wiring, high-current loads (cooker, immersion heater, shower), or outdoor use unless the timer is itself IP-rated for outdoor use.

### 3. Inline timer (replacing a light switch)

Some timer switches are designed as **light switch replacements** — they fit in a standard single-gang back box and replace a normal light switch. The wiring is identical to a standard light switch:

```
Permanent live → Timer L terminal
Switched live (to fitting) → Timer L1 terminal
Earth → Earth terminal
```

Most switch-replacement timers require a **neutral** at the switch position to power their electronics. Many older wiring installations do not have a neutral at the switch (the ceiling rose method routes the neutral via the rose, not the switch back box). Check before purchasing.

> Related: [How to Wire a Ceiling Rose and Light Fitting](/blog/how-to-wire-a-ceiling-rose-and-light-fitting/)

> Related: [Live, Neutral and Earth Wires Explained](/blog/live-neutral-and-earth-wires-explained/)

---

## The Timer Component in ElectraSim

[ElectraSim](/app/) includes a **Timer** component that simulates the switching behaviour of a timer switch in a circuit. To use it:

1. Place a **Power Supply**, a **Timer**, and a **Bulb** (or any load)
2. Wire: Supply → Timer (in the live path) → Bulb → return to Supply
3. Run the simulation
4. The Timer component toggles the internal contact on and off on its programmed cycle
5. Observe the Bulb switching on and off as the timer operates

Combine the Timer with other protection devices — an MCB upstream, an RCD for earthed loads — to simulate a complete protected and timed circuit.

For more on how different ElectraSim components interact:

> [Getting Started with ElectraSim](/blog/getting-started-with-electrasim/)

> [6 New Components: RCD, Contactor, Timer, Dimmer, Distribution Board, Bell](/updates/electrasim-new-components-rcd-contactor-timer-dimmer-distribution-board-bell/)

---

## Timer Switches and Contactors

For large loads — a bank of outdoor lights, a large pump, a heating circuit — a timer switch does not switch the load directly. Instead, it controls the coil of a **contactor**: the timer's output switches the low-current coil circuit, and the contactor's high-current contacts switch the actual load.

```
Timer output (low current) → Contactor coil
Contactor contacts (high current) → Load
```

This separates the timer's control current from the load current entirely. The timer switches at milliamps; the contactor handles tens of amps.

> Related: [What is a Contactor and How Does It Work?](/blog/what-is-a-contactor-and-how-does-it-work/)

---

## Choosing the Right Timer

| Requirement | Choose |
|---|---|
| Simple 24-hr immersion heater programme | Mechanical DIN-rail timer |
| Weekday/weekend heating schedule | Digital 7-day DIN-rail timer |
| Outdoor lights that always come on at dusk | Astronomical timer |
| Small lamp or appliance, no wiring changes | Plug-in mechanical or digital timer |
| Smart phone control + scheduling | Smart plug or smart switch (Wi-Fi) |
| High-current load (>16 A) | Timer + contactor |

---

## Key Points

- A timer switch is an **automatically controlled switch** — it interrupts only the live conductor
- **Mechanical timers:** rotating disc with pins, 15-min resolution, no battery needed
- **Digital timers:** microcontroller, 1-min resolution, 7-day programming, battery backup
- **Astronomical timers:** calculate sunrise/sunset automatically for your location — no seasonal reprogramming
- **DIN-rail timers** live in or near the consumer unit; **plug-in timers** need no wiring
- **Switch-replacement timers** usually need a neutral at the switch — check your installation first
- **Large loads** need a timer + contactor combination — the timer controls the coil, the contactor controls the load

**Try the Timer component in [ElectraSim →](/app/)** — free, no account required.
