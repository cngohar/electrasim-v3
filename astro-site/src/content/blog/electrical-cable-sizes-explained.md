---
title: "UK Electrical Cable Sizes: 1mm², 1.5mm², 2.5mm² & 6mm²"
description: "Complete UK electrical cable size guide: current ratings, uses, and rules for 1mm², 1.5mm², 2.5mm², 6mm², and 10mm² Twin & Earth in domestic circuits."
pubDate: 2026-05-18
author: ElectraSim
category: Beginner Guide
tags: [cable sizes, electrical cable, 2.5mm cable, 1.5mm cable, twin and earth, current rating, voltage drop, BS 7671, wiring regulations, ring main, lighting circuit, cooker cable]
---

Choosing the wrong cable size is one of the most common — and most dangerous — mistakes in domestic electrical work. Too small and the cable overheats; too large and you waste money and make terminations difficult. This guide covers every standard UK cable size, what it is rated for, and which circuit types it belongs on.

All of the circuit types mentioned here can be explored and simulated in **[ElectraSim](/app/)** — a free browser-based circuit simulator that lets you build and test circuits without touching real wiring.

---

## How Cable Sizes Are Measured

UK electrical cables are sized by the **cross-sectional area (CSA)** of the conductor, measured in square millimetres (mm²). A larger number means a thicker conductor, lower resistance, and a higher current-carrying capacity.

Domestic wiring uses **twin and earth (T&E)** cable — one brown (live), one blue (neutral), and one bare copper earth conductor inside a grey or white outer sheath. The size printed on the cable (e.g. **2.5mm²**) refers to the CSA of each individual conductor.

> Related: [Live, Neutral and Earth Wires Explained](/blog/live-neutral-and-earth-wires-explained/)

---

## UK Cable Size Quick Reference

| Cable Size | Current Rating\* | Typical Circuit | Protection Device |
|---|---|---|---|
| **1.0 mm²** | 14 A | Lighting, bell circuits | 6 A MCB |
| **1.5 mm²** | 17.5 A | Lighting, smoke alarms | 6 A or 10 A MCB |
| **2.5 mm²** | 24 A | Ring main (socket circuits) | 32 A MCB/RCBO |
| **4.0 mm²** | 32 A | Radial socket circuit, shower (smaller) | 32 A MCB/RCBO |
| **6.0 mm²** | 41 A | Cooker (up to 10 kW), shower | 40 A MCB/RCBO |
| **10.0 mm²** | 57 A | Large cooker, electric shower (>9.5 kW) | 40–50 A MCB/RCBO |
| **16.0 mm²** | 76 A | EV charger supply, large outbuilding | 63 A MCB/RCBO |

\*Current ratings for twin and earth cable clipped direct (Method C, Reference Method B to BS 7671 Table 4D5). Ratings reduce when cables are grouped, enclosed in insulation, or run in conduit.

---

## 1.0 mm² Cable

**Typical use:** Lighting circuits, doorbell wiring, low-power signal circuits  
**Maximum current:** 14 A clipped direct  
**Protection:** 6 A MCB

1 mm² twin and earth is the standard choice for lighting circuits. A 6 A MCB provides protection — and since a lighting circuit rarely exceeds 2–3 A total load, there is enormous headroom.

Some electricians use **1.5 mm²** on lighting circuits for added robustness and easier termination. Both are acceptable under BS 7671 with a 6 A MCB, but the cable must be rated above the protection device's trip current.

**Not suitable for:** socket outlets, fixed appliances, any circuit where load current could approach the cable's rating.

---

## 1.5 mm² Cable

**Typical use:** Lighting circuits, smoke alarm circuits, some fixed appliances  
**Maximum current:** 17.5 A clipped direct  
**Protection:** 6 A or 10 A MCB

1.5 mm² is the most common lighting cable in modern domestic installations. It offers a better current margin over a 6 A MCB, and the slightly larger conductor makes it easier to terminate in back boxes without breaking the core.

It is also used for **mains-powered smoke alarm circuits** (interlinked alarms need a common circuit), central heating programmer/room thermostat wiring, and some extractor fan supplies.

> Related: [What Is an MCB Breaker? How Miniature Circuit Breakers Work](/blog/what-is-an-mcb-breaker/)

---

## 2.5 mm² Cable

**Typical use:** Ring main circuits (socket outlets), radial circuits up to 20 A  
**Maximum current:** 24 A clipped direct  
**Protection:** 32 A MCB/RCBO on ring; 20 A MCB on 20 A radial

**2.5 mm² twin and earth is the single most common cable in UK domestic wiring.** Virtually every socket outlet circuit in a standard house uses it.

On a ring final circuit, 2.5 mm² is protected by a 32 A MCB. This works because on a correctly wired ring, the current is shared between two paths back to the consumer unit — each leg of the ring carries at most half the total current in normal use, keeping both well within the 24 A rating of 2.5 mm² cable.

> Related: [How to Wire a Ring Main Circuit](/blog/how-to-wire-a-ring-main-circuit/)

**Voltage drop consideration:** On very long radial runs exceeding 25–30 metres, voltage drop may become the limiting factor rather than current rating. Check voltage drop to BS 7671 Appendix 4 for circuits with long cable runs.

---

## 4.0 mm² Cable

**Typical use:** Radial socket circuits (larger kitchens), smaller electric showers  
**Maximum current:** 32 A clipped direct  
**Protection:** 32 A MCB/RCBO

4 mm² cable is used where you need a 32 A radial circuit rather than a ring — for example, a kitchen where the ring circuit would be excessively long, or a garage outbuilding served by a 32 A supply.

It is also the minimum size for an electric shower rated up to approximately 7.2 kW at 230 V (31 A draw).

---

## 6.0 mm² Cable

**Typical use:** Cookers and hobs up to about 10 kW, electric showers 7.5–9.5 kW  
**Maximum current:** 41 A clipped direct  
**Protection:** 32 A or 40 A MCB

**6 mm² is the standard cooker cable.** Most domestic electric cookers draw 30–40 A at full load. The connection is made at a **cooker control unit** (a switched fused outlet), and the circuit runs directly from a dedicated breaker in the consumer unit — no socket outlets on the same circuit.

For electric showers:
- **8.5 kW shower** at 230 V draws 37 A → 6 mm² with 40 A protection
- **9.5 kW shower** at 230 V draws 41 A → 6 mm² is marginal; many installers step up to 10 mm²

---

## 10.0 mm² Cable

**Typical use:** Large cookers/ranges above 10 kW, high-power showers, EV chargers  
**Maximum current:** 57 A clipped direct  
**Protection:** 40 A or 50 A MCB

10 mm² cable is used where load current exceeds the safe capacity of 6 mm². This includes:

- **Range cookers** (AGA, Rangemaster-style) — often 10–14 kW total
- **Electric showers** above 9.5 kW — a 10.5 kW shower draws 45.6 A
- **Higher-power EV charger** supplies where 10 mm² avoids excessive voltage drop

Terminating 10 mm² cable requires care — the conductors are stiff and need adequate bend radius. Back boxes and consumer unit terminals must be rated to accept 10 mm² conductors.

---

## 16.0 mm² Cable

**Typical use:** Main EV charger supplies, large outbuilding distribution  
**Maximum current:** 76 A clipped direct  
**Protection:** 50 A or 63 A MCB

16 mm² cable is becoming increasingly common in domestic installations as EV charger adoption grows. A 7.4 kW single-phase EV charger draws 32 A continuously — and cables carrying sustained current should not be run at more than their rated capacity for extended periods.

Where the charger supply route is long (garage at the end of a garden) or the cable is run in insulation, voltage drop and derating factors may push the required cable size up to 16 mm² even for a 32 A circuit.

---

## The Effect of Installation Method on Current Rating

The figures in the table above assume **clipped direct** installation — the most favourable method. Real-world derating factors apply:

| Installation Method | Effect on Rating |
|---|---|
| Clipped to surface / trunking | Full rating (reference method) |
| In conduit in thermally insulated wall | Approximately 50–55% of clipped rating |
| Buried direct in plaster | Approximately 85% of clipped rating |
| Grouped with other cables | Derating factor applied per Table 4C1 |
| In free air | Slightly above clipped rating |

**Practical example:** 2.5 mm² cable clipped direct is rated 24 A. The same cable run through 100 mm of mineral wool insulation in a cavity wall falls to approximately 13 A — less than the 16 A you might draw from a single kettle and microwave on the same ring. This is why cable routing matters as much as cable size.

---

## Voltage Drop

Beyond current rating, **voltage drop** limits how long a cable run can be. BS 7671 limits voltage drop to **3% of supply voltage** (6.9 V at 230 V) for lighting circuits and **5%** (11.5 V at 230 V) for power circuits.

Thinner cable has more resistance per metre, so voltage drop accumulates faster over long runs. If your circuit run is unusually long, you may need to step up a cable size even if the current rating is technically adequate.

Voltage drop per ampere per metre for common cable sizes:

| Cable Size | mV/A/m |
|---|---|
| 1.0 mm² | 44 |
| 1.5 mm² | 29 |
| 2.5 mm² | 18 |
| 4.0 mm² | 11 |
| 6.0 mm² | 7.3 |
| 10.0 mm² | 4.4 |

---

## Choosing the Right Cable: A Practical Decision Tree

1. **Identify the maximum load current** — add up all appliances on the circuit
2. **Select a protection device** — MCB or RCBO rated at or just above the maximum load
3. **Choose cable rated above the protection device** — cable CSA must carry more than the MCB rating
4. **Apply derating factors** — adjust for installation method, grouping, ambient temperature
5. **Check voltage drop** — calculate for the full run length; step up if needed
6. **Verify the circuit design against BS 7671** — for notifiable work, a Part P certificate is required

> Related: [What Is an RCBO? The Difference Between RCD, MCB and RCBO Explained](/blog/what-is-an-rcbo-difference-between-rcd-mcb-rcbo/)

---

## Simulate Your Circuit in ElectraSim

Understanding cable sizing is one thing — seeing a correctly protected circuit in action is another. In **[ElectraSim](/app/)** you can:

- Build circuits with MCBs, RCDs, and RCBOs
- Connect multiple loads and observe energised/faulted states
- Explore how short circuits and overloads interact with protection devices
- Use the **Fault Simulation Mode** to inject open circuits, reverse polarity, and earth faults

> [Open ElectraSim — free, no sign-up →](/app/)

---

## Summary

- **1.0–1.5 mm²** — lighting and low-power circuits, 6–10 A MCB
- **2.5 mm²** — ring main socket circuits, 32 A MCB (the most common cable in domestic work)
- **4.0 mm²** — 32 A radials, smaller showers
- **6.0 mm²** — cookers, 8.5 kW showers, 40 A circuits
- **10.0 mm²** — large cookers, 9.5 kW+ showers, some EV charger supplies
- **16.0 mm²** — EV charger supplies, large outbuilding feeds

Always check current rating, derating factors, and voltage drop — and always match the cable to the protection device, not the other way around.
