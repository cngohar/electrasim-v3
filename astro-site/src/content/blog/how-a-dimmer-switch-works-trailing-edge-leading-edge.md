---
title: "How a Dimmer Switch Works: Trailing Edge vs Leading Edge and Why It Matters for LEDs"
description: "Why do some dimmers flicker with LED bulbs? Why do others hum? This guide explains exactly how dimmer switches work, the difference between trailing edge and leading edge types, and how to choose the right dimmer for LED lighting."
pubDate: 2026-05-20
author: ElectraSim
category: Beginner Guide
tags: [dimmer switch, trailing edge dimmer, leading edge dimmer, LED dimmer, TRIAC dimmer, phase cut dimming, LED flickering, dimmer switch wiring, smart dimmer, lighting control, 1.5mm cable]
---

You fit a brand-new LED bulb, wire up a dimmer switch, and the bulb flickers at low levels, buzzes audibly, or refuses to dim below 30%. Meanwhile, the same bulb works perfectly on a standard switch. The dimmer is not faulty — but it is the wrong type for an LED load.

This guide explains exactly how dimmer switches work electronically, what trailing edge and leading edge mean, why the distinction matters enormously for modern LED lighting, and how to choose and wire the correct dimmer for any situation. You can explore switching and dimming circuit behaviour in **[ElectraSim](/app/)** — a free browser-based circuit simulator.

---

## How a Dimmer Switch Works: The Basics

A light dimmer does not reduce voltage like a variable resistor (rheostat) would — that would waste enormous amounts of energy as heat. Instead, a modern dimmer uses **phase-cut control**: it rapidly switches the mains supply on and off, slicing out a portion of each AC cycle.

The UK mains supply is 230 V AC at 50 Hz — it completes 50 full cycles every second. Each cycle is a smooth sine wave that rises from 0 V to +325 V (peak), falls back through 0 V, drops to −325 V (peak), and returns to 0 V again.

A dimmer interrupts this cycle by **blocking current flow for part of each half-cycle**. The more of each cycle is blocked, the less power reaches the lamp, and the dimmer it appears.

There are two ways to cut the cycle: at the **leading edge** (the start) or the **trailing edge** (the end).

---

## Leading Edge Dimming (Forward Phase Cut)

**Leading edge** dimmers — also called forward phase cut — fire at the **start** of each half-cycle. Current is blocked at the beginning of the waveform and released partway through.

```
Full wave:     ╭───╮     ╭───╮
               │   │     │   │
───────────────╯   ╰─────╯   ╰────

Dimmed (LE):       ╮     ╭───╮
                   │     │   │
───────────────────╯─────╯   ╰────
(front portion cut)
```

The switching device used in leading edge dimmers is a **TRIAC** — a bidirectional thyristor that can be triggered at any point in the AC waveform. TRIACs are cheap, robust, and have been used in dimmers since the 1970s.

### Why leading edge works poorly with LEDs

The TRIAC fires with a sudden hard turn-on — a fast rising edge that creates a voltage spike. Incandescent and halogen lamps are purely resistive; they absorb this spike without complaint. LED drivers, however, contain capacitors and inductors (switch-mode power supplies) that respond badly to sudden voltage edges:

- **Flicker** — the LED driver cannot track the rapidly changing input voltage smoothly
- **Buzzing** — the magnetic components in the driver vibrate at audible frequencies driven by the sharp switching transients
- **Incompatibility** — many LED drivers simply do not turn on reliably below a certain conduction angle

Leading edge dimmers are designed for **resistive and inductive loads** — incandescent bulbs, halogen transformers (magnetic), and wire-wound low-voltage transformers. They are the older standard and are still widely installed.

---

## Trailing Edge Dimming (Reverse Phase Cut)

**Trailing edge** dimmers — also called reverse phase cut — fire at the **end** of each half-cycle. Current flows from the start of the waveform and is cut off partway through.

```
Full wave:     ╭───╮     ╭───╮
               │   │     │   │
───────────────╯   ╰─────╯   ╰────

Dimmed (TE):   ╭─╮         ╭─╮
               │ │         │ │
───────────────╯ ╰─────────╯ ╰────
(trailing portion cut)
```

The switching device in trailing edge dimmers is a **MOSFET** or **IGBT** — transistors that switch off cleanly with a smooth falling edge rather than a sharp spike. The turn-off is controlled rather than abrupt.

### Why trailing edge is better for LEDs

The smooth turn-off matches how LED drivers prefer to receive power:

- **No voltage spike** on turn-on — the driver powers up cleanly from the beginning of the cycle
- **Smoother dimming curve** — LEDs dim more linearly with no dead zones
- **Less audible noise** — soft switching reduces vibration in magnetic components
- **Wider compatibility** — most LED lamps and fittings specify trailing edge dimmers in their installation instructions

Trailing edge dimmers are the correct choice for **capacitive loads** — electronic transformers, LED drivers, and most modern lighting equipment.

---

## Comparison: Leading Edge vs Trailing Edge

| Feature | Leading Edge (TRIAC) | Trailing Edge (MOSFET) |
|---|---|---|
| **Switching device** | TRIAC | MOSFET / IGBT |
| **Phase cut** | Start of cycle | End of cycle |
| **Turn-on edge** | Hard (fast spike) | Smooth |
| **Turn-off edge** | Abrupt | Controlled |
| **Works with incandescent** | <span class="em em-check" role="img" aria-label="do"></span> Excellent | <span class="em em-check" role="img" aria-label="do"></span> Good |
| **Works with halogen** | <span class="em em-check" role="img" aria-label="do"></span> Excellent | <span class="em em-check" role="img" aria-label="do"></span> Good |
| **Works with LED** | <span class="em em-warning" role="img" aria-label="warning"></span> Often poor | <span class="em em-check" role="img" aria-label="do"></span> Good |
| **Works with electronic transformer** | <span class="em em-warning" role="img" aria-label="warning"></span> Variable | <span class="em em-check" role="img" aria-label="do"></span> Good |
| **Works with magnetic transformer** | <span class="em em-check" role="img" aria-label="do"></span> Good | <span class="em em-warning" role="img" aria-label="warning"></span> Variable |
| **Cost** | Lower | Higher |
| **Heat generated** | More | Less |

---

## Minimum Load Requirements

Every dimmer has a **minimum load** rating — the smallest wattage it can dim reliably. This exists because the TRIAC (or MOSFET) needs a certain minimum current to trigger and remain conducting.

A typical leading edge TRIAC dimmer has a minimum load of **40–60 W**. With incandescent bulbs, this was easy to meet. With LEDs — a 40 W equivalent LED bulb might consume only 5–8 W — a single LED bulb falls well below the dimmer's minimum.

The result: the dimmer does not fire properly, causing the bulb to flash on and off at mains frequency (50 Hz), producing visible flicker.

**Solutions:**
- Use a trailing edge dimmer with a lower minimum load (many rate down to 5–10 W)
- Use a dimmer specifically rated for LED loads with electronic minimum load correction
- Check the dimmer manufacturer's approved lamp list — most publish lists of tested compatible LED products

> If a new compatible bulb does not solve the problem, or several lights are affected, use the [flickering-lights safety guide](/blog/why-do-my-lights-flicker-common-causes-safe-checks/) to decide when to stop checking and call an electrician.

---

## Neutral vs No-Neutral Dimmers

Traditional dimmers use a **two-wire** connection — they replace a standard switch and use the live and switched-live terminals only. No neutral is required.

But a dimmer's electronics need a small continuous power supply to run their control circuitry. In a two-wire dimmer, this power is drawn through the lamp load — a tiny trickle of current flows through the bulb even when fully dimmed to "off". With incandescent bulbs this was invisible. With LEDs, that trickle current can:

- Keep the LED faintly glowing at the "off" position (ghosting)
- Damage sensitive LED driver components over time
- Cause the bulb to flash briefly when switched off

**Three-wire (neutral) dimmers** solve this by using a dedicated neutral conductor to power the dimmer's electronics — no current flows through the lamp when off. These require a neutral conductor at the switch position, which is not present in all older wiring installations.

> Related: [Live, Neutral and Earth Wires Explained](/blog/live-neutral-and-earth-wires-explained/)

---

## Smart Dimmers

Smart dimmers — from brands like Lutron, Philips Hue, and others — use trailing edge or fully digital PWM control and typically require a neutral wire. They communicate via Wi-Fi, Zigbee, Z-Wave, or a proprietary protocol and are controlled via an app or voice assistant.

Key points:
- Almost all smart dimmers specify **trailing edge** operation or work only with compatible smart LED bulbs
- Most require a **neutral** at the switch — check whether your ceiling rose or switch back box has one before purchasing
- Many smart bulb systems (Hue, LIFX) are designed to be controlled by the smart bulb itself, not a wall dimmer — combining a smart bulb with a wall dimmer can conflict or damage the bulb

---

## Wiring a Dimmer Switch

A standard replacement dimmer (replacing a single one-way switch) connects identically to the switch it replaces:

- **L** terminal — incoming permanent live (brown)
- **L1** (or COM) terminal — switched live to the fitting (brown)
- **Earth** — green and yellow to the earth terminal on the dimmer and back box

The dimmer's electronics sit between these two terminals and control how much of each cycle passes through.

Cable used: **1.0 mm² or 1.5 mm² twin and earth**, the same as standard lighting circuits. The dimmer itself imposes no additional cable requirement — it is the load (total wattage of all lamps on the circuit) that determines the cable and MCB rating.

> Related: [Electrical Cable Sizes Explained](/blog/electrical-cable-sizes-explained/)

> Related: [How to Wire a Two-Way Switch: Complete Guide with Diagrams](/blog/how-to-wire-a-two-way-switch-complete-guide/)

---

## Maximum Load and Derating

Every dimmer has a **maximum load** rating — typically 250 W, 400 W, or 1000 W. This is the total wattage of all lamps connected to that dimmer.

When multiple dimmers are installed side by side in a multi-gang back box, heat from each dimmer reduces the maximum load of adjacent dimmers — this is called **derating**. Most manufacturers specify that in a 2-gang plate, each dimmer should be derated to 75% of its maximum; in a 3-gang, to 50%. Always check the manufacturer's installation data sheet.

---

## Diagnosing Dimmer Problems

| Symptom | Most Likely Cause | Fix |
|---|---|---|
| Flickering at low levels | Leading edge dimmer with LED | Replace with trailing edge dimmer |
| Won't dim below ~30% | Minimum load not met | Add dummy load or upgrade dimmer |
| Faint glow when off | No neutral — current through lamp | Use three-wire dimmer or add neutral |
| Buzzing/humming | TRIAC noise with LED driver | Replace with trailing edge dimmer |
| Dimmer gets very hot | Overloaded — exceeds max rating | Reduce load or upgrade dimmer |
| Bulb flashes on/off | Minimum load not met | Add compatible LED bulbs or dummy load |

---

## Simulating Dimming in ElectraSim

[ElectraSim](/app/) includes a **Dimmer** component that you can place in any lighting circuit. To explore dimmer behaviour:

1. Place a **Power Supply**, a **Dimmer**, and a **Bulb**
2. Wire them in series: Supply → Dimmer → Bulb → back to Supply
3. Run the simulation — the bulb lights at full brightness
4. Adjust the dimmer level to see the bulb's brightness respond
5. Compare the behaviour when the dimmer is in the live path vs the neutral path (the latter is incorrect wiring — the switch/dimmer must always interrupt the live)

For fault simulation: [Fault Simulation Mode — Open Circuit, Reverse Polarity and Earth Faults](/updates/fault-simulation-mode-open-circuit-reverse-polarity-earth-fault/)

> [Open ElectraSim — free, no sign-up →](/app/)

---

## Key Points

- Dimmers work by **phase-cut control** — slicing out part of each AC mains cycle
- **Leading edge (TRIAC)** cuts the start of the cycle — good for incandescent/halogen, often incompatible with LED
- **Trailing edge (MOSFET)** cuts the end of the cycle — smooth switching, compatible with LED drivers
- **Minimum load** is critical — most TRIAC dimmers need 40–60 W minimum, which a single LED bulb rarely meets
- **Ghosting** (faint glow when off) is caused by trickle current through the LED — use a three-wire (neutral) dimmer to eliminate it
- Always check the dimmer manufacturer's **compatible lamp list** before purchasing
- Smart dimmers almost always require a **trailing edge** dimmer and a **neutral** wire
