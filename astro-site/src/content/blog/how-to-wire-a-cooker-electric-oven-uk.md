---
title: "How to Wire a Cooker or Electric Oven: UK Circuit Guide"
description: "Wiring a cooker or electric oven requires a dedicated high-current circuit, a cooker control unit, and the right cable size. This UK guide covers everything — cable sizing, cooker switch, consumer unit connection, diversity, and Part P."
pubDate: 2026-05-24
author: ElectraSim
category: Wiring Guide
tags: [cooker wiring, electric oven wiring, cooker circuit, cooker control unit, 45 amp switch, 6mm cable, 10mm cable, kitchen wiring, electric hob wiring, diversity calculation, Part P, BS 7671, dedicated circuit]
---

A new electric cooker or range requires its own dedicated circuit — it cannot share a standard ring main socket. With power ratings ranging from 7 kW for a single oven up to 14 kW or more for a range cooker with hob, the current demand is far too high for a standard 13 A socket and is usually too high for a standard 32 A ring circuit as well.

This guide covers how to design and wire a cooker circuit correctly — cable selection, cooker control unit, consumer unit connection, the diversity rule, and what work requires Part P notification.

---

## Why Cookers Need a Dedicated Circuit

A 10 kW electric range draws approximately:

```
I = P / V = 10,000 / 230 = 43.5 A
```

A 13 A socket is rated for 3 kW. A standard 32 A socket circuit ring is rated for 32 A per circuit. Neither can safely supply a full-size electric range.

A dedicated cooker circuit is wired directly from the consumer unit with its own MCB or RCBO, sized for the cooker's maximum current demand. It serves only the cooker — no other outlets are on the same circuit (with one exception covered below).

---

## The Diversity Rule for Cookers

In practice, not every element of a cooker operates at full power simultaneously. You rarely run the oven at maximum, all four hob rings on full, the grill, and the warming drawer all at once.

BS 7671 and the IET On-Site Guide allow a **diversity calculation** for cooker circuits, which results in a lower design current than the nameplate maximum:

**For a cooker rated up to 15 kW:**

```
Diversity-adjusted current = 10 A + 30% of the remaining current
```

**Example: 12 kW cooker**

Full-load current: 12,000 / 230 = 52.2 A

```
Diversity current = 10 + (0.30 × (52.2 − 10))
                  = 10 + (0.30 × 42.2)
                  = 10 + 12.66
                  = 22.66 A
```

With diversity, a 12 kW cooker requires a design current of approximately **23 A** — well within what a 32 A circuit can handle.

**If the cooker circuit also includes a 13 A socket outlet** (many cooker control units have an integral socket), add 5 A to the diversity calculation:

```
Diversity current with socket = 22.66 + 5 = 27.66 A → use 32 A MCB
```

---

## Cable Sizing

The cable must carry the design current after applying any derating factors (thermal insulation, conduit grouping, etc.). For most domestic cooker circuits in open air or clipped to a surface:

| Cooker rating | Full-load current | Diversity current | Cable size | MCB |
|---|---|---|---|---|
| Up to 7 kW (single oven) | 30 A | 16 A | **6 mm² twin and earth** | 32 A |
| 8–12 kW (cooker or range) | 35–52 A | 20–28 A | **6 mm² twin and earth** | 32 A |
| 13–15 kW (large range) | 57–65 A | 24–29 A | **6 mm² twin and earth** | 32 A |
| Over 15 kW (commercial-style range) | 65+ A | 30+ A | **10 mm² twin and earth** | 40 A |

**6 mm² twin and earth** is the standard cable for the vast majority of domestic electric cookers and range cookers. Its current-carrying capacity (clipped direct) is 47 A — sufficient for any cooker using the diversity calculation.

**10 mm² twin and earth** is only needed for very large range cookers or where the cable runs through thermal insulation that significantly dereates its capacity.

> Related: [Electrical Cable Sizes Explained: 1mm², 1.5mm², 2.5mm² and Beyond](/blog/electrical-cable-sizes-explained/)

---

## Cooker Control Unit (Cooker Switch)

The cooker must be supplied via a **cooker control unit** — a double-pole switch rated at 45 A, mounted on the wall near the cooker (typically 30–60 cm to the side, not directly above). The double-pole switch disconnects both live and neutral, allowing the cooker to be fully isolated for servicing.

### With integral socket outlet

Many cooker control units include a standard 13 A socket outlet on the faceplate. This is convenient for a kettle or toaster but electrically it is simply a fused 13 A outlet — the supply comes from the same circuit as the cooker. The circuit must be designed to accommodate this additional 5 A (using the diversity calculation above).

### Without socket outlet

A plain double-pole 45 A switch without a socket is used where no additional outlet is needed near the cooker, or where a separate ring main socket is already within reach.

### Positioning requirements

- The cooker control unit must be **accessible** — able to be reached and operated quickly in an emergency without moving the cooker
- It should not be **directly above** the cooker — heat and steam from cooking damages the switch over time; mount to the side
- Standard mounting height: **1,400–1,600 mm** from the finished floor (same as a standard light switch)

---

## Connection at the Consumer Unit

The cooker circuit connects to a **dedicated MCB or RCBO** in the consumer unit:

| Circuit configuration | Recommended protection |
|---|---|
| 6 mm² cable, 32 A MCB | **32 A Type B RCBO** (30 mA) — preferred |
| 6 mm² cable | 32 A Type B MCB (if protected by main RCD) |
| 10 mm² cable, 40 A | **40 A Type B RCBO** (30 mA) |

RCD protection for a cooker circuit is not strictly mandatory under BS 7671 (a cooker is a fixed appliance, not a socket), but an RCBO provides comprehensive protection and is strongly recommended in modern installations — particularly since the cooker is in a kitchen where water is present.

> Related: [Distribution Board Explained: How a Consumer Unit Is Wired](/blog/distribution-board-explained-how-a-consumer-unit-is-wired/)

> Related: [What Is an RCBO? The Difference Between RCD, MCB and RCBO Explained](/blog/what-is-an-rcbo-difference-between-rcd-mcb-rcbo/)

---

## Wiring the Circuit: Step by Step

### 1. From the consumer unit to the cooker control unit

Run **6 mm² twin and earth** from the MCB/RCBO output terminal in the consumer unit to the supply terminals of the cooker control unit. This cable carries the full circuit current.

- Brown → L (line) terminal of MCB, then to L input terminal of cooker control unit
- Blue → N (neutral) bar, then to N input terminal of cooker control unit
- Green/yellow (6 mm² bare CPC, sleeved) → Earth bar, then to earth terminal of cooker control unit

### 2. From the cooker control unit to the cooker

Run a **second length of 6 mm² twin and earth** from the output terminals of the cooker control unit to the cooker's terminal block or connection unit.

- Brown → L output of switch → cooker L terminal
- Blue → N output of switch → cooker N terminal
- Green/yellow → Earth terminal of switch → cooker earth terminal

### 3. At the cooker

Electric cookers connect via a **cooker connection unit** (a surface-mounted terminal block in a metal box, typically 20 A rated) or directly to a terminal block inside the cooker itself (for built-in ovens with a short tail). Follow the cooker manufacturer's instructions for the final connection.

> Related: [Live, Neutral and Earth Wires Explained](/blog/live-neutral-and-earth-wires-explained/)

---

## Built-in Ovens and Separate Hobs

A common modern kitchen arrangement is a **separate built-in oven** and an **induction or ceramic hob** in the worktop. These can be wired in two ways:

### Option A: Single circuit for both (with diversity)

If the combined rating of the oven + hob is within the diversity-calculated current for a 32 A circuit, both can be supplied from one cooker circuit via a junction box or a dual cooker control unit (which has two output sets of terminals).

**Example:** 3 kW oven + 7 kW hob = 10 kW total  
Diversity current = 10 + 0.30 × (43.5 − 10) = 10 + 10.05 = **20 A** → 32 A circuit, 6 mm² cable <span class="em em-check" role="img" aria-label="do"></span>

### Option B: Separate circuit for each

A high-power induction hob (9–11 kW) and a double oven (4–5 kW) may exceed what a single 32 A circuit can comfortably handle even with diversity. Separate circuits are cleaner and allow independent isolation.

---

## Voltage Drop Check

For a kitchen cooker circuit, the cable run is typically short (3–10 m from consumer unit to cooker control unit). Voltage drop is rarely an issue, but worth confirming for longer runs:

Using 6 mm² twin and earth, mV/A/m = 7.3:

```
V_drop = (7.3 × 23 × 8) / 1000 = 1,343 / 1,000 = 1.34 V
```

1.34 V against the 5% limit of 11.5 V — well within limits for a typical kitchen run.

> Related: [Voltage Drop Explained: How to Calculate It and Why It Matters](/blog/voltage-drop-explained-how-to-calculate-it/)

---

## Part P Notification

Installing a new cooker circuit is **notifiable work under Part P** of the Building Regulations. This applies whether it is:
- A brand-new circuit for a first-time electric cooker
- Replacing an existing circuit with upgraded cable
- Moving the cooker control unit position

Simply connecting an existing cooker to an existing compliant circuit via a proper connection unit is **not** notifiable — it is a like-for-like connection.

For notifiable work: use a **Part P-registered electrician** who self-certifies, or notify **Building Control** and arrange an inspection before starting.

---

## Common Mistakes

| Mistake | Risk | Correct approach |
|---|---|---|
| Using a 13 A socket for a cooker | Overload, fire | Dedicated circuit with cooker control unit |
| 2.5 mm² cable for a full-size range | Cable overheats | 6 mm² minimum for cookers above ~5 kW |
| Fitting the control unit directly above the hob | Heat damage to switch | Mount to the side at 1.4–1.6 m height |
| No double-pole isolation | Cannot isolate safely for servicing | Cooker control unit is mandatory |
| Not applying diversity | Unnecessarily oversizing circuit | Apply diversity for correct design current |
| Single-pole switch only | Neutral stays live when switched off | Double-pole switch — disconnects both L and N |

---

## Key Points

- Cookers need a **dedicated circuit** — no shared ring mains or 13 A sockets
- Apply **diversity calculation**: 10 A + 30% of remaining current — most domestic cookers need a 32 A circuit on 6 mm² cable
- A **cooker control unit** (45 A double-pole switch) is mandatory — mounted to the side, not above, the cooker
- **6 mm² twin and earth** is standard; 10 mm² only for very large ranges or derated runs
- Use a **32 A RCBO** at the consumer unit for best protection
- New cooker circuit = **Part P notifiable work**
