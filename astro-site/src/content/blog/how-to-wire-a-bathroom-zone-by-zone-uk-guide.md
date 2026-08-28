---
title: "How to Wire a Bathroom: Complete Zone-by-Zone UK Guide"
description: "Bathroom electrical wiring in the UK is governed by strict zone requirements, IP ratings, RCD protection, supplementary bonding, and SELV lighting rules. This complete guide covers everything you need to know before touching a wire in a bathroom."
pubDate: 2026-05-23
author: ElectraSim
category: Wiring Guide
tags: [bathroom wiring, bathroom zones, bathroom electrics UK, IP rating bathroom, supplementary bonding, SELV bathroom, RCD bathroom, bathroom lighting, bathroom fan wiring, no socket bathroom, BS 7671 bathroom, zone 0 zone 1 zone 2]
---

Bathrooms have more electrical regulations than any other room in a domestic property. Water and electricity are a lethal combination, and BS 7671 (the UK Wiring Regulations) responds to this with a comprehensive set of rules covering which zones allow which equipment, what IP ratings are required, what protection devices must be fitted, what metalwork must be bonded, and where socket outlets are forbidden.

This guide covers every requirement, zone by zone, from the shower tray to the door. It draws together the IP rating, RCD, RCBO, earthing, and bonding principles covered elsewhere on this site into one complete bathroom-specific reference.

---

## Why Bathrooms Are Different

The core hazard in a bathroom is the combination of:

- **Water** — dramatically lowers the resistance of the human body (wet skin resistance can be as low as 1,000 Ω vs 100,000 Ω dry)
- **Earth contact** — a person standing on a wet floor, touching a tap, or in a bath has multiple paths to earth potential
- **Enclosed space** — no room to step back from a fault

At 230 V with 1,000 Ω body resistance: I = 230 ÷ 1,000 = **230 mA** — more than seven times the 30 mA threshold for cardiac fibrillation. A standard shock that would be survivable in a dry room can be fatal in a bathroom.

BS 7671 Part 7 (Section 701) addresses this with location-specific requirements on top of the general wiring rules.

---

## The Bathroom Zones

BS 7671 divides the bathroom into three zones based on proximity to water sources.

### Zone 0 — Inside the bath or shower enclosure

**Definition:** The interior volume of the bath or shower tray, up to 10 cm above the rim of the bath or the floor of the shower.

**IP minimum: IPX7** (immersion-rated)

**Rules:**
- Only **SELV** (Safety Extra-Low Voltage) equipment permitted — maximum 12 V AC or 30 V DC
- No mains-voltage equipment whatsoever
- No switches, socket outlets, or accessories of any kind
- Only purpose-made Zone 0 rated luminaires (e.g. submersible LED strips for bath illumination)
- SELV supply transformer must be located **outside all zones** or outside the bathroom entirely

In practice, almost no domestic bathroom has any electrical equipment in Zone 0. The zone exists primarily to define the absolute exclusion boundary.

### Zone 1 — Directly above the bath or shower

**Definition:** The volume directly above the bath (from Zone 0's upper boundary up to 2.25 m from the finished floor level) and the volume above the shower tray (same height, same horizontal extent as the shower tray footprint).

**IP minimum: IPX4** (splash from any direction)  
**In shower areas where jets can be directed at surfaces: IPX5**

**Rules:**
- Only equipment rated IPX4 minimum (IPX5 in shower spray areas)
- SELV luminaires are ideal here — no risk of mains voltage in the vicinity of the shower or bath
- Mains-voltage lighting is permitted if rated to at least IPX4/IPX5 and the fitting is suitable for the location
- **No socket outlets** permitted
- **No switches** permitted (except pull-cord type, which is considered outside Zone 1 because the cord itself hangs into Zone 1 but the mechanism is above it)
- Shaver supply units (to BS EN 61558-2-5) are permitted in Zone 1 if IP-rated — though in practice most are placed in Zone 2

### Zone 2 — 0.6 m beyond Zone 1

**Definition:** The area extending 0.6 m horizontally from the outer edge of Zone 1, from floor level to 2.25 m. Also includes the area within 0.6 m radius of a washbasin, measured from its outer edge, from floor level to 2.25 m.

**IP minimum: IPX4**

**Rules:**
- Equipment must be rated IPX4 minimum
- **No socket outlets** permitted in Zone 2 (except shaver supply units to BS EN 61558-2-5)
- **No faceplate switches** permitted — switches must be outside Zone 2 or be pull-cord types
- Wall lights, extractor fan controls, and heated towel rail controls must be outside Zone 2 or rated IPX4

### Outside the Zones

Beyond Zone 2 — the remainder of the bathroom floor area.

**IP minimum: IP2X** (finger-safe) for normal fittings

**Rules:**
- Standard 230 V lighting and fixed appliances permitted
- **Socket outlets remain prohibited** anywhere in a room containing a bath or shower (except shaver supply units to BS EN 61558-2-5)
- Light switches permitted if outside Zone 2 — standard non-IP rated switches are acceptable here
- Heated towel rail switch (double-pole, 45° rocker) permitted outside Zone 2

> Related: [IP Rating Explained: IP44, IP65, IP67 and What Every Number Means](/blog/ip-rating-explained-ip44-ip65-ip67/)

---

## Socket Outlets in Bathrooms

**There are no standard 13 A socket outlets in bathrooms, anywhere, ever.**

This surprises many people but it is absolute. The only socket-like device permitted is a **shaver supply unit** to BS EN 61558-2-5 — an isolating transformer unit that provides a low-power outlet (typically 20 W–50 W maximum) for electric shavers and toothbrushes. This unit is galvanically isolated from the mains supply; it provides no earth connection and limits fault current.

If you want to charge a phone or power a straightener in the bathroom, a shaver supply unit is the correct solution. An extension lead from a hallway socket trailing under the door is dangerous and non-compliant.

---

## RCD Protection: Mandatory for All Bathroom Circuits

Under BS 7671, **every circuit supplying equipment in a bathroom requires 30 mA RCD protection**. This includes:

- Bathroom lighting circuit
- Extractor fan circuit
- Shaver supply unit circuit
- Electric towel rail supply
- Underfloor heating circuit
- Any other circuit with equipment in the bathroom

The best approach is to fit a **dedicated 30 mA RCBO** for each bathroom circuit in the consumer unit. This ensures a fault on the bathroom lighting does not cut power to the rest of the house, and vice versa.

> Related: [What Is an RCD and Why Do You Need One?](/blog/what-is-an-rcd-and-why-do-you-need-one/)

> Related: [What Is an RCBO? The Difference Between RCD, MCB and RCBO Explained](/blog/what-is-an-rcbo-difference-between-rcd-mcb-rcbo/)

---

## SELV Lighting in Bathrooms

**SELV** (Safety Extra-Low Voltage) lighting is the safest choice for bathroom luminaires, especially for Zone 1 and recessed ceiling lights above a shower.

A SELV system uses a transformer (or electronic driver) to reduce the mains voltage to a safe level — typically 12 V AC or 12–24 V DC. The SELV secondary circuit is:
- **Electrically isolated** from the mains (no direct connection between primary and secondary)
- **Low voltage** — even direct contact with a SELV conductor in a wet environment is not life-threatening at 12 V
- Not required to have an earth connection on the secondary side

The transformer must be located **outside all bathroom zones** — either in the ceiling void above (outside Zone 1 height of 2.25 m), in an adjacent room, or in a dedicated enclosure outside the bathroom. The 12 V cables can then run freely into any bathroom zone.

Modern LED downlights for bathrooms are almost always 12 V or 24 V SELV — check the driver specification before installing.

---

## Supplementary Equipotential Bonding

In addition to the main protective bonding of incoming services (which applies to the whole house), bathrooms require **supplementary (local) equipotential bonding** in specific circumstances.

### When is supplementary bonding required?

Supplementary bonding connects all **simultaneously accessible** metal parts within the bathroom to ensure they remain at the same potential — so that even if a fault raises one metal part to a higher voltage, the person touching it is not exposed to a voltage difference.

Parts that must be bonded (where present):
- Metal water supply pipes (hot and cold)
- Metal waste pipes and traps
- Metal bath or shower tray (if earthed metal, not plastic)
- Metal towel radiator
- Metal structural elements (exposed steel beams, etc.)
- Exposed conductive parts of fixed electrical equipment (towel rail body, electric shower unit casing)

The supplementary bonding conductor is **4 mm² copper**, connecting all these metal parts to the main earth terminal (MET) via a bonding clamp.

### When is supplementary bonding NOT required?

BS 7671 Amendment 1 (2011) clarified that supplementary bonding is **not required** if:

1. All circuits in the bathroom (and all circuits that supply equipment in the bathroom) have **30 mA RCD protection**, AND
2. All extraneous-conductive-parts in the bathroom are connected to the protective earthing system via the **main protective bonding** conductors at the incoming services

In a modern bathroom where every circuit has an RCBO, and where the incoming water and gas services are already main-bonded at the consumer unit, supplementary bonding is not required by BS 7671. However, many electricians still fit it as a belt-and-braces measure, and it does no harm.

> Related: [Types of Earthing Systems Explained: TN-S, TN-C-S (PME) and TT](/blog/types-of-earthing-systems-tn-s-tn-c-s-tt-explained/)

> Related: [Live, Neutral and Earth Wires Explained](/blog/live-neutral-and-earth-wires-explained/)

---

## Extractor Fan Wiring

An extractor fan in a bathroom can be wired in two ways:

### 1. Direct to the lighting circuit with an overrun timer

The fan is wired so that it comes on with the light and continues running for a set period after the light is switched off (the overrun timer — typically 5–20 minutes adjustable). This is the simplest and most common arrangement.

```
MCB → Switch (outside Zone 2) → Light fitting
                              → Fan (with overrun timer)
```

Both light and fan are on the same switched circuit. The fan's internal overrun timer keeps it running after the switch is opened.

### 2. Dedicated circuit with a humidity sensor

A fan with a built-in humidity sensor runs independently of the lighting — it activates when moisture in the air exceeds a threshold and turns off when the humidity drops. This requires:
- A permanent live supply (not switched)
- A neutral
- Often an earth

The fan circuit can be on the same RCBO as the lighting (if the RCBO rating allows) or on its own dedicated RCBO.

---

## Bathroom Lighting: Typical Arrangements

### Recessed LED downlights (most common in modern bathrooms)

- Must be IP65 or higher if in Zone 1 or Zone 2, or directly above a shower
- Fire-rated downlights preserve ceiling fire resistance (important in flats and multi-storey houses)
- Must be SELV (12 V/24 V LED) if in Zone 1 above a shower — use mains-voltage IP65 fittings only if the fitting is explicitly rated for Zone 1 mains use

### Wall lights

- Must be outside Zone 2 or rated IPX4 minimum
- Standard IP20 wall lights are only acceptable completely outside Zone 2

### Ceiling pendant

- Permitted outside the zones only — a standard pendant fitting (IP20) is not acceptable in Zone 1 or 2
- In a small bathroom, the ceiling directly above the bath may be in Zone 1; a pendant there requires IPX4

---

## Bathroom Circuit Planning: Typical Consumer Unit Allocation

| Circuit | MCB/RCBO | Cable |
|---|---|---|
| Bathroom lighting | 6 A RCBO (30 mA) | 1.5 mm² T&E |
| Extractor fan (if separate) | 6 A RCBO (30 mA) | 1.5 mm² T&E |
| Electric shower | 40–50 A RCBO (30 mA) | 10 mm² T&E |
| Electric towel rail (FCU spur) | 6 A RCBO or on lighting circuit RCBO | 1.5 mm² T&E |
| Underfloor heating | 16 A RCBO (30 mA) | 2.5 mm² T&E |
| Shaver supply unit | On lighting circuit or 6 A RCBO | 1.0 mm² T&E |

> Related: [Distribution Board Explained: How a Consumer Unit Is Wired](/blog/distribution-board-explained-how-a-consumer-unit-is-wired/)

> Related: [Electrical Cable Sizes Explained](/blog/electrical-cable-sizes-explained/)

---

## Part P and Bathroom Work

In England, additions or alterations to an existing circuit in a bath/shower room special location are **notifiable under Part P** of the Building Regulations. A like-for-like replacement may not be notifiable, but any new point, moved accessory, new circuit, or full bathroom rewire should be treated as notifiable unless Building Control or a registered electrician confirms otherwise.

Options:
- Use a **Part P-registered electrician** who self-certifies
- Notify **Building Control** before starting and arrange an inspection

An uncertified bathroom installation is a problem at resale and potentially a safety liability.

> Related: [Part P Building Regulations Explained: What UK Homeowners Can and Can't DIY](/blog/part-p-building-regulations-explained/) — the full notifiable vs non-notifiable table, three compliance routes, and what happens if you skip notification.

---

## Quick Reference: Bathroom Zone Summary

| Zone | Location | Min IP | Sockets | Switches | Mains voltage? |
|---|---|---|---|---|---|
| **Zone 0** | Inside bath/shower | IPX7 | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> | <span class="em em-cross" role="img" aria-label="don't"></span> SELV only |
| **Zone 1** | Above bath/shower to 2.25 m | IPX4 / IPX5 | <span class="em em-cross" role="img" aria-label="don't"></span> | Pull-cord only | <span class="em em-warning" role="img" aria-label="warning"></span> IPX4+ rated only |
| **Zone 2** | 0.6 m outside Zone 1 | IPX4 | Shaver unit only | Pull-cord or outside | <span class="em em-check" role="img" aria-label="do"></span> IPX4+ rated |
| **Outside zones** | Rest of bathroom | IP2X | Shaver unit only | <span class="em em-check" role="img" aria-label="do"></span> Standard | <span class="em em-check" role="img" aria-label="do"></span> Standard |

**Reminder:** No 13 A socket outlets in a bathroom under any circumstances.
