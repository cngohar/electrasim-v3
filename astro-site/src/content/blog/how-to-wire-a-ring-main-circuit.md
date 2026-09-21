---
title: "How to Wire a Ring Main: Complete UK Socket Circuit Guide"
description: "Step-by-step UK guide to wiring a ring main circuit: 2.5mm² Twin & Earth cable routing, 32A MCB protection, socket connections, and continuity testing."
pubDate: 2026-05-18
author: ElectraSim
category: Beginner Guide
tags: [ring main, ring final circuit, socket outlets, 32A circuit, spurs, BS 7671, wiring regulations, 2.5mm cable, domestic wiring, consumer unit, radial circuit, plug sockets UK]
---

The ring main is one of the most distinctive features of UK electrical wiring — and one of the most misunderstood. Homeowners assume it is the same as a standard circuit. Electricians from other countries find it peculiar. Electrical students often struggle to explain why a 32 A breaker is acceptable on a cable rated for 24 A.

This guide explains exactly how a ring final circuit works, why it is designed the way it is, how it compares to a radial circuit, what rules govern spurs and extensions, and what BS 7671 says about it. You can build and simulate ring circuit behaviour in **[ElectraSim](/app/)** — free, no installation required.

---

## What Is a Ring Final Circuit?

A **ring final circuit** (commonly called a **ring main**) is a wiring arrangement where the cable starts at the consumer unit, visits each socket outlet in turn, and returns to the same way back to the same terminals in the consumer unit — forming a closed loop.

Unlike a radial circuit (which starts at the breaker and ends at the last socket), both ends of the ring connect back to the same MCB or RCBO terminals. This means:

- Current to a load can travel **two ways** around the ring to reach it
- The load on the cable at any point is shared between two paths
- Total cable resistance (and therefore voltage drop) is reduced

---

## Why a 32 A Breaker on 2.5 mm² Cable?

This is the question that confuses most people encountering UK ring circuits for the first time.

**2.5 mm² twin and earth cable is rated at 24 A clipped direct.** A 32 A MCB seems too large to protect it. In a radial circuit, it would be — a 32 A load on a single 2.5 mm² cable would exceed the cable's capacity by a third.

But on a ring, **current has two paths**. If a load of 32 A is connected at the midpoint of the ring, approximately 16 A flows down each leg. Each 2.5 mm² cable carries only 16 A — well within its 24 A rating.

This is the fundamental logic of the ring circuit: **the protection device is sized for the total circuit load; the cable handles only a fraction of that load on each leg.**

In practice, loads are rarely at the perfect midpoint, and some unevenness is inevitable. BS 7671 accounts for this in the rules governing ring circuit design, including the limitation on the number and type of spurs permitted.

> Related: [Electrical Cable Sizes Explained: 1mm², 1.5mm², 2.5mm² and Beyond](/blog/electrical-cable-sizes-explained/)

---

## Ring vs Radial: A Direct Comparison

| | Ring Final Circuit | Radial Circuit |
|---|---|---|
| **Cable size** | 2.5 mm² T&E | 2.5 mm² (20 A) or 4 mm² (32 A) |
| **Protection** | 32 A MCB/RCBO | 20 A or 32 A MCB/RCBO |
| **Max floor area** | 100 m² | 50 m² (20 A) or 75 m² (32 A) |
| **Number of sockets** | Unlimited on ring | Unlimited |
| **Common in UK** | Yes — standard | Less common for sockets |
| **Common internationally** | Rarely used | Standard everywhere else |

The floor area limits come from BS 7671 and reflect assumptions about average socket loading in a typical domestic space.

---

## How the Ring Is Wired

A standard ring final circuit in a domestic property works like this:

1. **Consumer unit** — live, neutral, and earth leave the MCB/RCBO terminals
2. **First socket** — the ring cable arrives and connects to the socket's terminals
3. **Subsequent sockets** — each socket is wired in series along the ring
4. **Last socket** — a second cable run returns all three conductors to the same consumer unit terminals

At the consumer unit, both ends of the ring connect to the **same MCB terminals** — live-to-live, neutral-to-neutral, earth-to-earth. Each terminal ends up with two conductors.

At each socket, all three pairs of conductors enter the back box and connect directly to the socket terminals. The socket is not the end of the circuit — it is a T-junction on a continuous loop.

---

## What Are Spurs?

A **spur** is an additional branch that runs off the ring to supply an extra socket or fused connection unit (FCU). Spurs are permitted by BS 7671 but are subject to restrictions.

### Unfused spur

An unfused spur branches off directly from a socket, a junction box, or any point on the ring cable. BS 7671 limits unfused spurs as follows:

- Maximum **one socket outlet** or **one FCU** per spur
- Maximum **one spur per ring socket** (you cannot daisy-chain spurs)
- Total number of spurs must not exceed the total number of sockets on the ring itself

### Fused spur / fused connection unit (FCU)

An FCU incorporates its own fuse (typically 13 A or less) and can supply a single fixed appliance or a local sub-circuit. Because the FCU itself provides protection, the rules about the number of outlets downstream are different — but each FCU counts as one point on the ring.

### Why spurs have limits

A spur has only one cable path back to the consumer unit. If a 32 A load were connected at the end of an unsupported spur, the entire 32 A would flow through a single 2.5 mm² cable. That is exactly the overload scenario the ring's dual-path topology was designed to avoid.

---

## Ring Circuit Continuity Testing

A correctly wired ring can be verified by a continuity test. If you measure resistance between the two ends of the ring's live conductor (both ends disconnected from the MCB), you measure the total resistance of the whole ring. Then measure from one end of the live to one end of the neutral — if the ring is correctly cross-connected at each socket, you get approximately half the total ring resistance.

This cross-connected test is a standard part of an EICR (Electrical Installation Condition Report) and a useful sanity check on new installation work.

---

## RCD and RCBO Protection on Ring Circuits

Under the 18th Edition of BS 7671, virtually all socket outlet circuits require 30 mA RCD protection. For a ring final circuit, this can be provided in two ways:

**Option 1 — Single RCD covering the whole ring**  
A 30 mA RCD upstream of the MCB (or a combined RCD/MCB split load board) protects all sockets on the ring. Any earth fault anywhere on the ring trips the RCD, losing all sockets simultaneously.

**Option 2 — RCBO per circuit (preferred)**  
An RCBO replaces the MCB and provides both overcurrent and 30 mA RCD protection for that ring circuit alone. A fault trips only that circuit, leaving all others live.

> Related: [What Is an RCBO? The Difference Between RCD, MCB and RCBO Explained](/blog/what-is-an-rcbo-difference-between-rcd-mcb-rcbo/)

---

## How Many Sockets Can a Ring Supply?

BS 7671 does not specify a maximum number of socket outlets on a ring final circuit. The limit is the floor area (100 m²) and the total connected load assumption embedded in that limit.

In practice, for a ring serving a large kitchen with many high-power appliances (dishwasher, washing machine, fridge, microwave, kettle, toaster), a **separate dedicated ring or radial** for that area is advisable. Kitchens in modern homes often have their own ring circuit specifically because their simultaneous load is high.

---

## Simulating a Ring Circuit in ElectraSim

[ElectraSim](/app/) lets you wire circuits using real component logic. To explore ring circuit behaviour:

1. Place a **Power Supply** (representing your consumer unit)
2. Place two **MCBs** (representing the two ends of the ring at the consumer unit)
3. Connect a chain of loads between them — this approximates the two parallel paths of a ring
4. Run the simulation and observe how both paths energise simultaneously
5. Apply a **fault** (using Fault Simulation Mode) to one leg and observe that the other leg still feeds the loads

For a more detailed walkthrough: [Getting Started with ElectraSim](/blog/getting-started-with-electrasim/)

---

## Common Ring Circuit Mistakes

### 1. Open ring (ring not completed)

If one end of the ring is not connected back at the consumer unit — whether by mistake during installation or because a cable was cut during renovation — the ring becomes a radial. The circuit will still function, but the second leg carries no current. The full load falls on one cable, and the 32 A MCB no longer provides adequate overcurrent protection for that single cable.

A ring continuity test at the consumer unit will identify this immediately.

### 2. Interconnected rings

Two separate ring circuits must never be joined — for example, by bridging sockets between the two rings. This creates a parallel supply path that can carry fault current between MCBs, making overcurrent protection unreliable.

### 3. Spur feeding a spur

Daisy-chaining spurs — taking a spur off the end of another spur — removes the overcurrent protection advantage of the ring. BS 7671 prohibits this for unfused spurs.

### 4. Under-length ring

If the ring cable is too short to reach back to the consumer unit and is joined with a connector block in a wall cavity, the joint creates a high-resistance point and a potential fault location. All joints must be accessible or, better still, designed out entirely.

---

## Is a Ring Main Required?

No — BS 7671 does not mandate ring circuits. They are permitted and have specific sizing rules, but a radial circuit is equally compliant if correctly designed. Many modern installers prefer radials (especially using RCBOs) for:

- Simpler testing and fault-finding
- Fewer conductors at the consumer unit
- Easier compliance verification in large or awkward layouts

The ring circuit persists in UK wiring because it is deeply embedded in existing stock housing, in installer training, and in the economics of supplying large areas with 2.5 mm² cable rather than 4 mm². Whether it remains dominant in new-build installations is an open question.

---

## Key Points

- A ring final circuit forms a **closed loop** — both ends return to the same MCB/RCBO
- A 32 A MCB with 2.5 mm² cable is safe because **current splits across two paths**, each carrying at most half the load
- Spurs are permitted but limited — **one outlet per spur, no spur off a spur**
- The ring must be **tested for continuity** to confirm it is complete
- Modern installations should use a **30 mA RCBO** per ring for best protection and discrimination
- Floor area limit is **100 m²** per ring (BS 7671)

**Try building and simulating a ring circuit in [ElectraSim →](/app/)** — free, no account needed.
