---
title: "How to Wire a Lighting Circuit: Loop-In & Junction Box Guide"
description: "Complete UK guide to wiring lighting circuits: loop-in ceiling rose method, junction box wiring, 1mm² and 1.5mm² cable sizes, and switch connections."
pubDate: 2026-06-15
author: ElectraSim
category: Wiring Guide
tags: [lighting circuit, how to wire a lighting circuit, loop-in method, junction box method, switch drop, lighting circuit wiring, 1mm cable, 1.5mm cable, 6A MCB, lighting circuit UK, radial lighting circuit, two-way lighting circuit, ceiling rose wiring, lighting RCBO, BS 7671, Part P, domestic lighting]
---

Every light fitting in your home is part of a lighting circuit. That circuit starts at a dedicated MCB or RCBO in the consumer unit, runs through cable in the ceiling void, visits each light position in turn, and ends at the last fitting. Along the way, a switch drop branches off at each position to serve the wall switch for that light.

The ceiling rose wiring article covers how to connect conductors at the fitting itself. This article covers the bigger picture: how the circuit is designed, how cable is sized, how the circuit is laid out from the consumer unit, and the two main methods — **loop-in** and **junction box** — used to connect lights and switches along the same radial circuit.

You can build and simulate complete lighting circuit layouts in **[ElectraSim](/app/)** before any installation work begins.

> Troubleshooting an existing light? Start with [Why Do My Lights Flicker? Common Causes and Safe Checks](/blog/why-do-my-lights-flicker-common-causes-safe-checks/) before considering any work on the circuit.

---

## What a Lighting Circuit Is

A domestic lighting circuit is wired as a **radial** — a single cable leaves the consumer unit and visits each light position in sequence. Unlike a ring main, the circuit does not loop back to the consumer unit. It simply ends at the last light position.

The key rule is that the **switch must always break the live conductor**, never the neutral. A switch in the neutral side would leave the fitting live even when switched off — a shock hazard when changing a bulb.

This means every switch position requires two conductors in addition to the earth:
- **Permanent live** — always energised, feeds out to the switch
- **Switched live** — returns from the switch to the light only when the switch is closed

Both conductors travel together in a **switch drop** cable from the light position to the switch.

---

## Cable Sizing

Domestic lighting circuits use **1.0 mm² or 1.5 mm² twin and earth** cable throughout.

| Cable size | Current-carrying capacity (clipped direct) | Typical use |
|---|---|---|
| 1.0 mm² T&E | 16 A | Lighting circuits up to 6 A MCB |
| 1.5 mm² T&E | 20 A | Lighting circuits up to 10 A MCB, preferred for all new work |

**1.5 mm² is now the preferred choice** for all new domestic lighting circuits — it costs only marginally more than 1.0 mm², is easier to work with (less fragile at terminations), and provides better voltage drop performance over long cable runs.

1.0 mm² is still found throughout older properties and is fully compliant with a 6 A MCB.

> Related: [Electrical Cable Sizes Explained: 1mm², 1.5mm², 2.5mm² and Beyond](/blog/electrical-cable-sizes-explained/)

---

## MCB and RCBO Sizing

A standard domestic lighting circuit is protected by a **6 A Type B MCB** (or RCBO). The 6 A rating is sufficient for the typical load on a domestic lighting circuit — see below — and provides fast disconnection under fault conditions.

| Protection | Rating | When to use |
|---|---|---|
| 6 A Type B MCB | Standard | Most domestic lighting circuits |
| 10 A Type B MCB | Higher load | Large circuits with many fittings or high-wattage loads |
| 6 A Type B RCBO (30 mA) | Preferred | New installations under 18th Edition BS 7671 |

Under the **18th Edition of BS 7671**, lighting circuits that include or could include socket outlets (e.g. shaver sockets in bathrooms) require 30 mA RCD protection. In practice, most modern installations use an **RCBO per lighting circuit** — this provides both overcurrent and RCD protection for that circuit alone, so a fault on one circuit does not kill all the lights in the property.

> Related: [What Is an RCBO? The Difference Between RCD, MCB and RCBO Explained](/blog/what-is-an-rcbo-difference-between-rcd-mcb-rcbo/)

> Related: [Distribution Board Explained: How a Consumer Unit Is Wired](/blog/distribution-board-explained-how-a-consumer-unit-is-wired/)

---

## How Many Lights Can One Circuit Supply?

BS 7671 does not set a maximum number of light fittings per circuit. The limit is the **total connected load** relative to the MCB rating and cable capacity.

### Calculating maximum load

With a 6 A MCB and 1.0 mm² cable, the maximum continuous load is approximately:

```
P = V × I = 230 × 6 = 1,380 W
```

In practice, a diversity factor is applied — not all lights are on simultaneously at full power. The IET On-Site Guide suggests designing to no more than **66% of the MCB rating** for continuous load:

```
Design load = 0.66 × 6 × 230 = 909 W
```

**With modern LED lighting** (typically 5–10 W per fitting), a single 6 A circuit can comfortably supply 50–100 fittings within the design load limit. In practice, the practical limit is determined by the number of fittings a single circuit can reasonably serve without complex cable routing — typically **8–12 fittings per circuit** in a domestic property, with one circuit per floor as a common arrangement.

### Common circuit arrangements

| Property type | Typical lighting circuit arrangement |
|---|---|
| Small house (2–3 bed) | 1 circuit per floor (2–3 circuits total) |
| Larger house (4+ bed) | 1 circuit per floor + separate circuit for loft/external |
| Bungalow | 1–2 circuits depending on size |
| New build | 1 circuit per floor minimum; kitchen and bathroom sometimes separate |

---

## The Two Wiring Methods

There are two established methods for wiring a domestic lighting circuit. Both are compliant with BS 7671. The choice depends on the property, the ceiling construction, and installer preference.

### Method 1: Loop-In (at the ceiling rose)

The circuit cable loops from ceiling rose to ceiling rose — in at the loop-in terminal, out to the next rose. The switch is connected via a switch drop cable from the same rose.

**All connections are made at the ceiling rose** — there are no additional junction boxes. This is the dominant method in UK domestic wiring because it minimises junction points and keeps all connections accessible (at the ceiling rose, which is a visible, accessible fitting).

### Method 2: Junction Box

The main circuit cable runs through junction boxes positioned in the ceiling void. From each junction box, a separate cable runs to the light fitting and another to the switch.

**Connections are made in junction boxes**, not at the ceiling rose. This method is used when ceiling roses are not being used (e.g. pendant-less light fittings, recessed downlights, or surface-mounted battens), or when the ceiling construction makes cable looping difficult.

---

## Method 1: Loop-In Circuit — How It Works

### Circuit flow

```
Consumer unit (6A MCB/RCBO)
    │
    └── Cable to first ceiling rose
            │  (loop-in terminal receives permanent live)
            │  (neutral terminal receives neutral)
            │  (switch drop goes to switch)
            │
            └── Cable loops to second ceiling rose
                    │
                    └── Cable loops to third ceiling rose
                            │
                            └── (last rose — circuit ends here)
```

At every ceiling rose, the main circuit cable arrives and departs (except the last one). The switch drop is a separate cable running from the rose down to the wall switch.

### Cables at each ceiling rose

A loop-in ceiling rose (not the last one on the circuit) typically has **three cables** entering it:

1. **Main circuit cable in** — from the previous rose or consumer unit
2. **Main circuit cable out** — looping on to the next rose
3. **Switch drop cable** — going down to the wall switch

The last rose on the circuit has only two cables: the circuit cable in and the switch drop.

### Terminal connections (loop-in method)

| Terminal | Conductors connected |
|---|---|
| **Loop-in (Live)** | Brown from circuit cable in + Brown from circuit cable out |
| **Neutral** | Blue from circuit cable in + Blue from circuit cable out + Blue from lamp flex |
| **Switched live** | Blue (sleeved brown) from switch drop + Brown from lamp flex |
| **Earth** | All bare CPCs (sleeved green/yellow) |

**At the switch** (single gang, 1-way):
- Brown from switch drop → switch terminal 1
- Blue (sleeved brown) from switch drop → switch terminal 2
- Green/yellow CPC → earth terminal

> Related: [How to Wire a Ceiling Rose and Light Fitting: Loop-In, Junction Box and 3-Plate Methods](/blog/how-to-wire-a-ceiling-rose-and-light-fitting/)

---

## Method 2: Junction Box Circuit — How It Works

### Circuit flow

```
Consumer unit (6A MCB/RCBO)
    │
    └── Cable to first junction box (in ceiling void)
            ├── Cable to light fitting
            ├── Cable to wall switch
            └── Cable loops to second junction box
                    ├── Cable to light fitting
                    ├── Cable to wall switch
                    └── (continues to next junction box)
```

Each junction box distributes the circuit supply to a fitting and a switch. The main circuit cable loops from box to box.

### Junction box specification

Use **30 A four-terminal junction boxes** (also called 30 A round junction boxes) for lighting circuits. These have four separate terminals:

| Terminal | Connection |
|---|---|
| 1 | All permanent live (brown) conductors |
| 2 | All neutral (blue) conductors |
| 3 | Switched live — blue (sleeved brown) from switch drop out + brown from fitting cable |
| 4 | All earth (green/yellow) conductors |

Junction boxes must be:
- Accessible — not permanently buried in plaster or enclosed in a ceiling with no access hatch
- Rated for the circuit — 30 A rating for a 6 A lighting circuit is standard
- Enclosed — no open wiring connections outside a suitable enclosure

### Cables at each junction box

1. **Main circuit cable in** (from consumer unit or previous junction box)
2. **Main circuit cable out** (looping to next junction box — except the last box)
3. **Fitting cable** (to the light fitting)
4. **Switch drop cable** (to the wall switch)

### At the light fitting

A bare light fitting (batten holder, track light, recessed downlight) has a terminal block:
- Brown → L terminal
- Blue → N terminal
- Green/yellow CPC → E terminal

### At the switch

Same as the loop-in method — the switch drop cable connects exactly the same way regardless of whether the supply comes from a ceiling rose or a junction box.

---

## The Switch Drop: How It Works

The **switch drop** is the cable that runs between the light position (ceiling rose or junction box) and the wall switch. It carries:

- **Permanent live** (brown) — always energised from the circuit
- **Switched live** (blue, sleeved brown at both ends) — live only when the switch is closed
- **Earth** (bare CPC, sleeved green/yellow)

The blue conductor in a switch drop is used as a switched-live return. Because it carries live potential when the switch is closed, **it must be re-identified with brown sleeving or brown tape** at every termination — at the switch and at the ceiling rose or junction box. This requirement applies to both old (red/black) and new (brown/blue) cable.

### Switch drop cable size

**1.0 mm² or 1.5 mm² twin and earth** — the same as the main circuit cable. There is no reason to use a different size for the switch drop.

---

## Two-Way Switching on a Lighting Circuit

Two-way switching (controlling one light from two switch positions) requires an additional cable between the two switch positions — the **strapping wire**.

In a loop-in circuit, the wiring at the ceiling rose is unchanged. The difference is at the switches:

- **Switch 1** receives the switch drop from the ceiling rose (permanent live in, switched live return)
- **Switch 2** is connected to switch 1 via a **3-core-and-earth strapping cable**
- The two strapping wires (L1 and L2) run between the COM terminals of both switches

In a junction box circuit, the same principle applies — the junction box terminal layout is unchanged; the additional strapping cable runs between the two switch back boxes.

> Related: [How to Wire a Two-Way Switch: Complete Guide with Diagrams](/blog/how-to-wire-a-two-way-switch-complete-guide/)

> Related: [Intermediate Switch Wiring: How to Control a Light from Three or More Locations](/blog/intermediate-switch-wiring-three-way-light-switch/)

---

## Step-by-Step: Wiring a New Lighting Circuit

### Step 1: Plan the circuit

Sketch the room layout. Mark:
- Position of each light fitting
- Position of each switch
- Proposed cable route (through ceiling void, down walls)
- Starting point at the consumer unit

Decide which method to use — loop-in if ceiling roses are being used, junction box if using recessed or surface-mounted fittings without ceiling roses.

### Step 2: Check consumer unit capacity

Identify a spare 6 A MCB or RCBO position. If none is available, the consumer unit will need upgrading before new circuits can be added.

### Step 3: Run the main circuit cable

With power isolated at the consumer unit, run **1.5 mm² twin and earth** from the consumer unit, through the ceiling void, to the first light position. Continue from each position to the next, finishing at the last fitting.

Clip cable to joists at 400 mm intervals (horizontal runs) or 250 mm (vertical runs). Where cable passes through joists, drill holes at the centre of the joist (not top or bottom where it may be notched by floorboards or cause structural weakness). Install **oval conduit** in wall chases.

### Step 4: Run switch drop cables

From each light position, run a switch drop cable down to the wall switch position. Ensure the blue conductor is sleeved brown at both ends before final connection.

### Step 5: Make connections at light positions

Following the loop-in or junction box terminal layouts described above, connect all conductors. Double-check:
- No bare copper exposed outside terminal blocks
- All CPCs sleeved green/yellow
- All switched-live (blue) conductors sleeved brown

### Step 6: Connect switches

At each switch:
- Brown → switch live terminal
- Blue (sleeved brown) → switch switched-live terminal
- Green/yellow → earth terminal

### Step 7: Connect at consumer unit

With the MCB/RCBO off:
- Brown → MCB/RCBO live input terminal
- Blue → neutral bar
- Green/yellow → earth bar

Switch on and test every fitting and switch before making good any cable routes.

---

## Voltage Drop on Lighting Circuits

Long cable runs from the consumer unit to the last fitting can cause voltage drop. Using 1.5 mm² twin and earth (mV/A/m = 29):

**Example: 20 m cable run, 6 A maximum load**

```
V_drop = (29 × 6 × 20) / 1000 = 3.48 V
```

3.48 V against a 3% limit for lighting circuits (6.9 V) — acceptable. For runs over 30 m, voltage drop deserves checking, particularly for LED drivers that may be sensitive to supply voltage variation.

> Related: [Voltage Drop Explained: How to Calculate It and Why It Matters](/blog/voltage-drop-explained-how-to-calculate-it/)

---

## Part P Notification

| Work | Notifiable? |
|---|---|
| New lighting circuit from consumer unit | Yes |
| Adding a light to an existing circuit (not bathroom/kitchen) | No |
| Any new lighting work in a bathroom | Yes |
| Any new lighting work in a kitchen | Check with local authority |
| Like-for-like replacement of a fitting or switch | No |

> Related: [Part P Building Regulations Explained: What UK Homeowners Can and Can't DIY](/blog/part-p-building-regulations-explained/)

---

## Simulating a Lighting Circuit in ElectraSim

In [ElectraSim](/app/), you can model the complete behaviour of a domestic lighting circuit:

1. Place a **consumer unit** with a **6 A RCBO**
2. Connect a chain of **switches and bulbs** — each switch in the live path, each bulb bridging live to neutral — representing the loop-in circuit topology
3. Run the simulation — toggle individual switches and observe each bulb responding independently
4. Add a **second switch in parallel** with the first (two-way switching) — confirm the bulb can be controlled from either switch
5. Introduce a **short circuit** at one fitting using Fault Simulation Mode — observe the RCBO trip and confirm other fittings on the circuit (in a multi-circuit setup) are unaffected

This makes the independence of individual switch drops — and the shared nature of the neutral and live rails — immediately visible.

> [Open ElectraSim — free, no sign-up →](/app/)

---

## Common Mistakes

| Mistake | Risk / Result | Correct approach |
|---|---|---|
| Switch in neutral path | Fitting stays live when switched off — shock hazard when changing bulbs | Always switch the live conductor |
| Blue switch drop conductor not sleeved brown | Future worker assumes it is neutral and connects incorrectly | Sleeve all switched-live conductors brown at every termination |
| Junction box buried inaccessibly | Non-compliant; joints cannot be inspected or maintained | All joints must be in accessible enclosures |
| CPC not sleeved at terminations | Exposed bare copper — shock risk and non-compliant | Green/yellow sleeve on every bare CPC |
| Too many fittings on one circuit | Overload, nuisance tripping | Calculate total load; split into two circuits if needed |
| Mixing circuit cables from two different MCBs at one junction box | Dangerous — live conductors from different protective devices in one enclosure | One circuit per junction box only |
| 1.0 mm² cable on a 10 A MCB | Cable overheats at 10 A continuous | Use 1.5 mm² minimum for circuits above 6 A |

---

## Key Points

- A domestic lighting circuit is a **radial** — one cable from the MCB/RCBO to each light in sequence, ending at the last fitting
- Use **1.5 mm² twin and earth** for all new lighting circuits; 1.0 mm² is compliant with a 6 A MCB but 1.5 mm² is preferred
- Protect with a **6 A Type B RCBO** (30 mA) in modern installations — one per circuit for best discrimination
- **Loop-in method:** circuit cable loops rose to rose; switch drops branch from each rose; all connections at the fitting
- **Junction box method:** circuit cable loops between junction boxes; separate cables to fitting and switch from each box; connections in the junction box
- The **switch drop** blue conductor carries switched-live and must be **sleeved brown** at both ends
- A single 6 A circuit can supply 50+ LED fittings by load calculation — in practice, 8–12 fittings per floor circuit is typical for domestic installations
- New lighting circuits are **Part P notifiable**; adding lights to an existing circuit (outside bathrooms and kitchens) is not
