---
title: "How to Add a Spur from a Ring Main: UK Rules & Methods"
description: "UK regulations and step-by-step methods for adding a spur from a ring main: fused vs unfused spurs, 2.5mm² cable sizing, socket limits, and safety testing."
pubDate: 2026-06-12
author: ElectraSim
category: Wiring Guide
tags: [spur, ring main spur, how to add a spur, ring final circuit, unfused spur, fused spur, fused connection unit, FCU, socket outlet, BS 7671, spur rules, adding a socket, 2.5mm cable, ring circuit spur, Part P, domestic wiring]
---

Adding a new socket outlet to an existing ring main by running a spur is one of the most common electrical tasks in UK homes. It avoids the disruption of re-running the entire ring and, within the limits set by BS 7671, is a perfectly compliant way to extend the number of socket outlets in a room.

This guide covers what a spur is, the BS 7671 rules that govern them, how to find a valid take-off point, step-by-step wiring for both fused and unfused spurs, and when the work requires Part P notification.

You can model spur behaviour in **[ElectraSim](/app/)** before starting any physical work.

---

## What Is a Spur?

A **spur** is a branch cable that runs from the ring final circuit to supply one or more additional outlets. Unlike the ring cable itself — which forms a closed loop back to the consumer unit — a spur has only one cable path. Current to a spur must travel entirely along that single branch cable.

This distinction matters because the ring's overcurrent protection (the 32 A MCB or RCBO) is sized for a ring, where current splits across two paths. On a spur, the full load of that spur passes through a single 2.5 mm² cable — which is rated at 24 A clipped direct. A 32 A MCB cannot reliably protect a single 2.5 mm² cable against overload.

BS 7671 addresses this by **strictly limiting what can be connected to an unfused spur**.

> Related: [How to Wire a Ring Main Circuit: The UK Ring Final Circuit Explained](/blog/how-to-wire-a-ring-main-circuit/)

---

## Two Types of Spur

### Unfused spur

An unfused spur runs from the ring to a single socket outlet or connection point, with no additional fuse protection at the spur origin. The only overcurrent protection is the ring's own MCB/RCBO.

**BS 7671 rules for unfused spurs:**

- Maximum **one single or double socket outlet** at the end of the spur (not a socket supplying further outlets)
- No spur from a spur — the spur must connect directly to the ring, not to another spur
- The total number of spurs must not exceed the total number of sockets on the ring itself
- The spur cable must be **the same size as the ring cable** — 2.5 mm² twin and earth

### Fused spur (fused connection unit)

A fused spur uses a **fused connection unit (FCU)** at the point where the branch leaves the ring. The FCU contains a cartridge fuse — typically 13 A or lower — that provides additional overcurrent protection for the spur cable and anything downstream.

Because the FCU limits the maximum current in the spur to its fuse rating, the rules on what can be connected downstream are more flexible:

- A 13 A FCU can supply a single fixed appliance (washing machine, fridge, boiler, extractor fan, etc.)
- A 3 A or 5 A FCU can supply a lighting circuit, LED driver, or low-power fixed appliance
- An FCU with a switched outlet can supply a socket for a semi-permanent appliance

> Related: [How to Wire a Fused Connection Unit (FCU): Switched, Unswitched and Spur Rules](/blog/how-to-wire-a-fused-connection-unit-fcu/)

---

## BS 7671 Spur Rules: Summary

| Rule | Unfused spur | Fused spur (FCU) |
|---|---|---|
| Max outlets at end of spur | 1 socket (single or double) | 1 fixed appliance or sub-circuit |
| Spur from a spur | Not permitted | Not permitted |
| Max spurs per ring | ≤ number of sockets on ring | No specific limit |
| Cable size | Same as ring (2.5 mm²) | Same as ring to FCU; smaller downstream if fuse allows |
| Additional protection at origin | None | FCU fuse |

The key principle: **an unfused spur must never be able to carry more current than its cable can safely handle**. A single socket outlet with a 13 A plug fuse limits the spur to 13 A — well within the capacity of 2.5 mm² cable. This is why one socket is permitted, but not two sockets in a double-gang box wired as separate outlets without fuse protection.

---

## Finding a Valid Take-Off Point

You can branch a spur from three locations on the ring:

### 1. From an existing ring socket

The most common and accessible approach. A ring socket has **two sets of conductors** entering its back box (in and out of the ring). Adding a spur creates a third set.

**How to confirm a socket is on the ring (not already a spur):**

Open the back box and count the conductors:
- **Two cables** (or two sets of conductors in the terminals) — the socket is a ring socket. <span class="em em-check" role="img" aria-label="do"></span> Safe to spur from.
- **One cable** — the socket is already a spur. <span class="em em-cross" role="img" aria-label="don't"></span> Do not spur from it.
- **Three cables** — a spur already exists at this socket. <span class="em em-cross" role="img" aria-label="don't"></span> Do not add another spur here.

This check is essential. Spurring from a spur violates BS 7671 and undermines the overcurrent protection of the circuit.

### 2. From a junction box on the ring cable

A 30 A three-terminal junction box can be inserted into the ring cable at any accessible point — in the floor void, ceiling, or surface trunking — to create a take-off point. The ring cable connects to two terminals; the spur cable connects to the third.

This is useful when you need to spur to a location that is not near an existing socket, or when the nearest socket already has a spur.

### 3. At the consumer unit

Technically, a spur can originate from the consumer unit terminals (the same terminals as the ring ends). However, this is rarely done in practice — it requires additional cable runs and uses consumer unit space. It is more appropriate to install a new radial circuit in this situation.

---

## What You Need

For adding an unfused spur to a new single or double socket:

- **2.5 mm² twin and earth cable** (same as ring)
- **New socket outlet** (single or double, switched)
- **Back box** — surface-mounted (plastic, 25–35 mm deep) or flush-mounted (metal, 25–35 mm deep)
- **Green/yellow earth sleeving** for bare CPC conductors
- **30 A junction box** (if not taking off from an existing socket)
- **Voltage tester / non-contact tester** — essential for confirming the circuit is dead
- **Flat-blade and cross-head screwdrivers**
- **Wire strippers**

---

## Step-by-Step: Unfused Spur from an Existing Ring Socket

### Step 1: Isolate and verify dead

Turn off the MCB or RCBO protecting the ring circuit at the consumer unit. Lock it off or tape it if possible. Use a **voltage tester** on the existing socket to confirm it is dead. Do not rely on the MCB position alone.

### Step 2: Open the take-off socket

Remove the socket faceplate and carefully withdraw the back box to confirm it is a ring socket (two cables entering — see above). If it has only one cable, choose a different socket.

### Step 3: Route the new cable

Run **2.5 mm² twin and earth** from the take-off socket to the location of the new socket. Common routes:

- **Surface trunking** — quickest, no making good required
- **Under floorboards** — clip cable to joists or thread through drilled holes (50 mm minimum from surface; protect with oval conduit at floor/wall penetrations)
- **Chase in plaster** — requires making good; cable in oval conduit

Leave 150–200 mm of cable at each end for connection.

### Step 4: Connect at the new socket

At the new socket back box:

- **Brown** → L terminal
- **Blue** → N terminal
- **Green/yellow sleeved bare CPC** → E (earth) terminal

Fold conductors neatly and fit the faceplate. Do not over-tighten terminal screws — finger-tight plus a quarter turn is sufficient for most socket terminals.

### Step 5: Connect at the take-off socket

At the existing ring socket, you now have **three sets of conductors** (two ring cables + one spur):

- All three **brown** conductors → L terminal (most double sockets have a terminal block that accepts two conductors; use a **Wago connector** or similar approved connector if three conductors will not fit in the terminal)
- All three **blue** conductors → N terminal
- All three **green/yellow** conductors → E terminal

> If the terminal cannot safely accept three conductors, fit a **30 A junction box** behind the socket or in an accessible location nearby and connect the spur from the junction box instead.

### Step 6: Test before energising

Before switching the MCB back on:

- **Continuity test** — confirm the CPC is continuous from the new socket earth terminal to the main earth terminal (MET)
- **Polarity test** — confirm brown connects to L, blue to N at the new socket
- **Insulation resistance** — optional for a short spur but good practice

Switch the MCB on and test the new socket with a socket tester.

---

## Step-by-Step: Fused Spur (FCU) for a Fixed Appliance

A fused connection unit is the correct way to connect a fixed appliance — a fridge, washing machine, boiler, extractor fan, or towel rail — without a plug and socket.

### Step 1: Select the FCU

- **Switched FCU** — has an on/off switch; use where the appliance needs to be isolated easily (extractor fan, boiler)
- **Unswitched FCU** — no switch; use where the appliance should always be live (fridge-freezer)
- **Fuse rating** — 13 A for appliances up to 3 kW; 3 A or 5 A for appliances under 700 W (LED drivers, low-power fans)

### Step 2: Isolate and verify dead

Same as Step 1 above.

### Step 3: Route cable from ring to FCU

Run **2.5 mm² twin and earth** from the take-off socket (or junction box) to the FCU mounting position. The FCU should be positioned near the appliance and accessible — not buried behind it.

### Step 4: Connect at the FCU

FCUs have two sets of terminals — **Feed** (supply in from ring) and **Load** (output to appliance):

**Feed side (ring supply):**
- Brown → Feed L terminal
- Blue → Feed N terminal
- Green/yellow → Earth terminal

**Load side (to appliance):**
- Wire direct to the appliance terminal block, or connect a short flex if the appliance uses a flying lead

### Step 5: Connect at the take-off point

Same as Step 5 of the unfused spur above — connect the spur cable at the ring socket or junction box.

### Step 6: Test

Test continuity, polarity, and insulation resistance. Energise the circuit and confirm the FCU switch and indicator operate correctly.

---

## Voltage Drop Check

For a short spur (up to 5 m), voltage drop is negligible. For longer runs:

Using 2.5 mm² twin and earth (mV/A/m = 18), a 10 m spur at 13 A:

```
V_drop = (18 × 13 × 10) / 1000 = 2.34 V
```

Well within the 5% limit (11.5 V). Even at 20 m, voltage drop on a 13 A spur is under 5 V — not a concern for domestic socket spurs.

> Related: [Voltage Drop Explained: How to Calculate It and Why It Matters](/blog/voltage-drop-explained-how-to-calculate-it/)

---

## Part P Notification

Adding a spur in most locations is **not notifiable under Part P** — it is classified as an addition to an existing circuit, not a new circuit.

**Exceptions — notifiable:**

- Adding a spur that alters wiring in a Part P **bath/shower special location** — for example work in the defined bathroom zones
- Adding a spur that constitutes a **new circuit** (e.g. a new FCU spur serving a dedicated appliance circuit with its own protection)
- Carrying out the work as part of a consumer unit replacement or other notifiable project

**Not notifiable:**

- Adding a spur to an existing ring main in a living room, bedroom, hallway, or dining room
- Adding a spur to an existing suitable ring in a kitchen in England, provided it is not a new circuit and not part of other notifiable work
- Like-for-like socket replacement
- Adding a junction box and single spur socket in a non-special location

If in doubt, check with your local Building Control authority before starting; rules differ outside England and notification status depends on the exact scope.

> Related: [Part P Building Regulations Explained: What UK Homeowners Can and Can't DIY](/blog/part-p-building-regulations-explained/)

---

## Simulating a Spur in ElectraSim

In [ElectraSim](/app/), you can model the difference between a ring socket and a spur to understand the overcurrent protection implications:

1. Build a ring circuit with a **32 A RCBO**, several sockets on the ring, and a load at each
2. Add a **spur socket** branching from one ring socket — add a load to the spur
3. Run the simulation — observe that the spur load is fed by a single cable path, while ring sockets share two paths
4. Increase the spur load until the single spur cable is overloaded — observe that the 32 A RCBO may not trip in time to protect the spur cable alone
5. Add an **FCU** at the spur origin with a 13 A fuse — repeat the overload test and observe that the FCU fuse now provides the protection that the RCBO alone could not

This directly demonstrates why the spur rules exist — and why fused spurs are a safer choice for high-demand outlets.

> [Open ElectraSim — free, no sign-up →](/app/)

---

## Common Mistakes

| Mistake | Risk | Correct approach |
|---|---|---|
| Spurring from a spur | Overload on first spur cable, non-compliant | Only spur from a confirmed ring socket or junction box on the ring |
| Not checking if socket is on ring or spur | Cascading spurs | Count cables in back box before connecting |
| Using 1.5 mm² cable for the spur | Cable overheats at 13 A | Use 2.5 mm² throughout; 1.5 mm² only for lighting |
| Fitting two socket outlets at end of unfused spur | Effectively doubles potential load without fuse protection | One socket only; use FCU if multiple outlets needed |
| No earth sleeving on bare CPC | Exposed bare copper conductor | Always sleeve the CPC green/yellow before connecting |
| Three conductors forced into single terminal | Poor connection, arcing risk | Use junction box or Wago connectors if terminal is full |
| Not testing before re-energising | Wiring fault goes live undetected | Always test continuity and polarity before switching on |

---

## Key Points

- A spur branches from the ring to supply an extra outlet — it has **one cable path**, unlike the ring which has two
- An **unfused spur** is limited to **one socket outlet** — no spur from a spur, same 2.5 mm² cable throughout
- A **fused spur (FCU)** provides its own protection and is the correct method for supplying fixed appliances
- Always confirm a socket is **on the ring** (two cables) before spurring from it — a socket with one cable is already a spur
- Take-off points: **existing ring socket**, **junction box on ring cable**, or at the consumer unit
- Adding a spur in a living room or bedroom is **not notifiable under Part P** — kitchens and bathrooms are exceptions
- Test **continuity, polarity, and insulation resistance** before energising
