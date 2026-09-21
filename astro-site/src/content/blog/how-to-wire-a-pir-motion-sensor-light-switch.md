---
title: "How to Wire a PIR Motion Sensor Light Switch (UK Guide)"
description: "Step-by-step UK guide to wiring a PIR motion sensor light switch. Learn 2-wire vs 3-wire connections, indoor & outdoor setup, manual override, and Part P."
pubDate: 2026-06-14
author: ElectraSim
category: Wiring Guide
tags: [PIR switch, motion sensor switch, PIR light switch, how to wire PIR, occupancy sensor, passive infrared sensor, PIR floodlight wiring, 2-wire PIR, 3-wire PIR, PIR with override, outdoor PIR, security light wiring, automatic light switch, BS 7671, Part P, wiring guide]
---

A PIR (passive infrared) motion sensor switch detects the heat signature of a moving person and switches a light on automatically — then turns it off again after a set time delay. They are used for staircase lighting, hallways, utility rooms, garages, outdoor security lights, and anywhere that lights are regularly left on by accident.

Wiring a PIR switch is straightforward when you understand one key difference from a standard switch: most PIR units need a **neutral wire** at the switch position. Standard UK switch wiring (switch-and-earth) only brings live and switched-live to the switch — no neutral. This means a direct swap of a standard switch for a PIR switch only works if you have the right cable in place or choose the right type of PIR.

This guide covers both scenarios clearly, with step-by-step wiring for indoor and outdoor installations.

You can model occupancy-controlled lighting circuits in **[ElectraSim](/app/)** before starting any physical work.

---

## How a PIR Switch Works

A PIR sensor detects **infrared radiation** — heat emitted by people and animals. When the sensor registers a change in the infrared pattern within its detection zone (someone entering the room or walking past), it triggers a relay or triac that switches the connected load on.

The switch stays on for a configurable **time delay** (typically adjustable from 10 seconds to 10 minutes). If further movement is detected before the time expires, the timer resets. When no movement is detected for the full delay period, the switch turns the load off.

Most PIR switches also include a **lux (daylight) sensor**. When ambient light is above the set threshold, the PIR ignores movement and does not switch on — preventing lights from coming on in a well-lit room or outdoors during daytime.

### Adjustable settings on a typical PIR switch

| Setting | Function | Typical range |
|---|---|---|
| **Time delay** | How long the light stays on after last detection | 10 sec – 10 min |
| **Lux level** | Ambient light threshold above which PIR is disabled | 10 – 2,000 lux |
| **Sensitivity** | Detection range and angle adjustment | Low / Medium / High |

---

## 2-Wire vs 3-Wire PIR Switches

This is the most important decision before buying a PIR switch.

### 3-wire PIR (Live, Neutral, Switched-Live)

A 3-wire PIR switch has three connections:
- **L (Live in)** — permanent live supply
- **N (Neutral)** — neutral connection to power the PIR electronics
- **L out (Switched-Live out)** — the switched output that goes to the light

The PIR electronics draw a small continuous current (typically 0.5–2 W) to stay powered, monitor the sensor, and track the time delay. This requires a **permanent neutral at the switch position**.

**Standard UK switch wiring does not provide neutral at the switch.** A standard switch drop runs switched-live (brown) and return (blue, sleeved brown) — no neutral. This means a 3-wire PIR cannot replace a standard switch without re-cabling or rerouting.

**When 3-wire PIR works without re-cabling:**
- Light fitting wired using the **loop-in method** at the ceiling rose — neutral is present at the ceiling rose but not the switch
- You can re-route the cable to bring neutral to the switch (requires additional work)
- New installations where cable is run specifically for a PIR from the outset

### 2-wire PIR (Live in, Switched-Live out only)

A 2-wire PIR switch has only two connections — it wires exactly like a standard on/off switch:
- **L (Live in)** — permanent live
- **L out (Switched-Live out)** — to the light

The PIR electronics power themselves by drawing a tiny trickle current through the light fitting even when the switch output is "off". This works with most light fittings — but **not with all LED loads**, particularly low-wattage LEDs that may flicker or glow dimly due to the trickle current.

**When to use a 2-wire PIR:**
- Direct replacement for an existing standard on/off switch with existing switch-and-earth cable
- No neutral available at the switch position
- Load is a single light fitting of sufficient wattage (check manufacturer's minimum load — typically 3–10 W for LEDs, lower for halogen)

**When to avoid a 2-wire PIR:**
- LED bulbs below the minimum load rating
- Circuits with multiple fittings in parallel (combined load may cause issues — test before finalising)
- Where the trickle current causes any visible glow or flicker in the LED fitting

---

## What You Need

### For a 3-wire indoor PIR switch (new installation or existing neutral at switch)

- 3-wire PIR switch (check voltage rating: 230 V AC, and load rating for your fitting)
- **1.5 mm² three-core-and-earth cable** (brown, black, grey + bare CPC) if re-routing
- Or use existing cable if neutral is already at the switch position
- Green/yellow earth sleeving
- Standard back box (metal or plastic, 35 mm minimum depth — PIR units are deeper than standard switches)

### For a 2-wire indoor PIR switch (direct replacement)

- 2-wire PIR switch (check minimum load rating)
- Existing switch cable (1 mm² or 1.5 mm² twin-and-earth) — no changes needed
- Green/yellow earth sleeving

### For an outdoor PIR floodlight

- Outdoor PIR floodlight unit (IP44 minimum for wall mounting under eaves; IP65 for exposed positions)
- **1 mm² or 1.5 mm² twin-and-earth** from the nearest lighting circuit junction or ceiling rose
- Weatherproof back box or surface conduit
- Exterior-rated cable clips or conduit

---

## Step-by-Step: Wiring a 2-Wire PIR Switch (Direct Replacement)

This replaces a standard single-gang on/off light switch with a 2-wire PIR. The existing switch cable is used unchanged.

### Step 1: Isolate and verify dead

Turn off the MCB or RCBO protecting the lighting circuit at the consumer unit. Use a **voltage tester** to confirm the switch terminals are dead. Do not rely on just switching off at the wall.

### Step 2: Remove the existing switch

Unscrew the faceplate. Note how the existing switch is wired:
- In standard switch-and-earth wiring: **brown** (or old red) → switch terminal; **blue sleeved brown** (or old black sleeved red) → other switch terminal
- The bare CPC is sleeved green/yellow and connected to the earth terminal

Disconnect all conductors and remove the old switch.

### Step 3: Connect the 2-wire PIR

Connect to the PIR terminals per the manufacturer's diagram. Typically:
- **Brown (permanent live)** → **L** terminal on PIR
- **Blue sleeved brown (switched-live return)** → **L out** terminal on PIR
- **Green/yellow CPC** → **Earth** terminal

The PIR is now in the same position as the old switch — interrupting the live path to the light.

### Step 4: Fit and test

Fold the conductors carefully into the back box — PIR switches are bulkier than standard switches and need more depth. Screw the faceplate in place. Restore power and test:

- Enter the detection zone — light should come on within 1–2 seconds
- Leave the zone — light should go off after the set time delay
- Adjust sensitivity, lux level, and time delay via the trim controls on the unit (usually accessible from the front or side with a small screwdriver)

---

## Step-by-Step: Wiring a 3-Wire PIR Switch

This applies when neutral is available at the switch position — for example, in a new installation, when re-routing cable, or in a loop-in ceiling rose system where you are bringing a new cable from the rose to the switch.

### Cable at the switch position

You need a cable with **three conductors plus earth** running to the switch. The most common approach for a new installation:

Run **1.5 mm² three-core-and-earth** from the ceiling rose or junction box to the switch:
- **Brown** → permanent live (from the live terminal at the ceiling rose)
- **Black** (sleeved brown at both ends — it carries live potential) → switched-live return to the lamp
- **Grey** → neutral (from the neutral terminal at the ceiling rose)
- **Bare CPC** (sleeved green/yellow) → earth

### At the PIR switch

- **Brown** → **L** (live in)
- **Grey** → **N** (neutral)
- **Black (sleeved brown)** → **L out** (switched-live to lamp)
- **Green/yellow CPC** → **Earth**

### At the ceiling rose / junction box

- Permanent live connects to brown core
- Neutral connects to grey core
- Lamp conductor connects to black core (which is switched by the PIR)
- All earths connected at earth terminal

---

## Wiring a PIR in Parallel With a Manual Switch (Override)

Many installations benefit from a **manual override** — a standard switch wired in parallel with the PIR so the light can be switched on permanently regardless of motion detection. This is common in living rooms, kitchens, and home offices where the PIR time delay is inconvenient during prolonged static use.

### How it works

When two switches are wired in **parallel**, the light is on if **either** switch is closed. The PIR closes its output when it detects motion. The manual switch, wired in parallel, can be closed to keep the light on regardless of the PIR state.

### Wiring

At the switch position, both the PIR output and the manual switch connect between the same two points — live in and switched-live out:

```
Permanent Live ──┬── PIR input (L)
                 └── Manual switch (terminal 1)

PIR output (L out) ──┬── Switched-live to lamp
                      └── Manual switch (terminal 2)
```

Both the PIR switched output and the manual switch are connected in parallel. When the manual switch is closed, it bypasses the PIR entirely, keeping the light on. When the manual switch is open, the PIR controls the light normally.

> This requires a double-gang back box and a twin-and-earth plus a link between the two gang positions, or a combination PIR/switch unit (sold as a single faceplate with both functions built in).

---

## Wiring an Outdoor PIR Floodlight

Outdoor PIR floodlights are self-contained units — the PIR sensor, relay, and lamp are all built into one housing. They require only a **permanent live, neutral, and earth** supply — no switched-live, because the PIR inside the unit does the switching internally.

### Supply cable

Run **1.5 mm² twin-and-earth** from:
- A **junction box** on an existing lighting circuit (check the circuit is not already fully loaded)
- A **switched FCU** from a nearby ring main socket circuit (gives you a manual isolator for the floodlight)
- A **dedicated circuit** from the consumer unit (best practice for high-wattage halogen floodlights; less critical for LED units)

### IP rating requirements

The floodlight and any external wiring accessories must meet the minimum IP rating for their location:

| Location | Minimum IP rating |
|---|---|
| Under eaves (protected from rain) | IP44 |
| Exposed to direct rain | IP65 |
| Partially submerged or subject to water jets | IP67 |

All cable entry points must be sealed with the gland or fitting supplied with the floodlight to maintain the IP rating.

### Connection at the floodlight

Most floodlights have a terminal block inside the housing:
- **Brown** → L terminal
- **Blue** → N terminal
- **Green/yellow** → Earth terminal

Follow the manufacturer's wiring diagram — some units have separate terminals for sensor power and load switching. Ensure the cable is secured with the strain relief / cable clamp inside the unit.

### Earthing

The floodlight housing (if metal, Class I) must be connected to earth. Plastic-cased (Class II) floodlights do not require an earth connection to the housing, but the supply cable CPC should still terminate at the earth terminal if one is provided.

> Related: [IP Rating Explained: IP44, IP65, IP67 and What Every Number Means](/blog/ip-rating-explained-ip44-ip65-ip67/)

> Related: [How to Wire an Outdoor Socket: Garden Power and External Sockets Explained](/blog/how-to-wire-an-outdoor-socket-garden-power/)

---

## PIR Switch Load Ratings

PIR switches have a maximum and minimum load rating. Exceeding either causes problems.

| Issue | Cause | Result |
|---|---|---|
| Load exceeds maximum rating | Too many lights or high-wattage fitting | PIR relay or triac overheats, switch fails |
| Load below minimum rating (2-wire PIR) | Single very low-wattage LED | LED glows or flickers when PIR is "off" |

### Typical load ratings

| PIR type | Maximum load | Minimum load |
|---|---|---|
| Standard 2-wire (resistive/LED) | 300–500 W LED | 3–10 W |
| Standard 3-wire | 500–1,000 W | None (neutral powered) |
| Heavy-duty / commercial PIR | 1,000–2,000 W | None |

For multiple light fittings on one PIR, add up the total wattage and confirm it is within the switch's maximum rating.

---

## Part P Notification

**Replacing a like-for-like switch** (standard switch → PIR switch, same position, same circuit) is **not notifiable** under Part P. It is a minor alteration to an existing circuit.

**New wiring is required in:**

| Scenario | Notifiable? |
|---|---|
| New cable run from ceiling rose to switch position (re-routing for neutral) | No — addition to existing lighting circuit, not a new circuit |
| New circuit from consumer unit for dedicated floodlight | Yes — new circuit |
| Any new wiring work in a bathroom | Yes |
| Any new wiring work in a kitchen | Check with local authority |

> Related: [Part P Building Regulations Explained: What UK Homeowners Can and Can't DIY](/blog/part-p-building-regulations-explained/)

---

## Simulating a PIR-Controlled Circuit in ElectraSim

In [ElectraSim](/app/), you can model the switching logic of a PIR-controlled lighting circuit:

1. Build a basic lighting circuit: **32 A RCBO → junction box → lamp**
2. Place a **switch** in the live path — this represents the PIR relay (closed when motion detected, open when time delay expires)
3. Toggle the switch manually — observe the lamp turning on and off, simulating PIR detection and time-out
4. Add a **second switch in parallel** with the first — this represents the manual override switch; closing either switch illuminates the lamp
5. Enable **Fault Simulation Mode** and introduce a short circuit at the lamp — observe the RCBO tripping while the parallel switch circuit remains intact in the schematic

This demonstrates both the basic control logic and the protection behaviour of a PIR-controlled circuit.

> [Open ElectraSim — free, no sign-up →](/app/)

---

## Common Mistakes

| Mistake | Risk / Result | Correct approach |
|---|---|---|
| Fitting a 3-wire PIR where no neutral exists | PIR powers up but output switching is unreliable or unit fails | Check for neutral at switch position first; use 2-wire PIR if no neutral |
| Using a 2-wire PIR with very low-wattage LEDs | LED glows or flickers when light is "off" | Check minimum load rating; use 3-wire PIR for very low loads |
| Exceeding PIR maximum load | Switch overheats and fails | Total connected wattage must be within the PIR's rated maximum |
| Wiring permanent live to switched-live terminal | PIR output stays permanently live; sensor has no effect | Follow manufacturer terminal markings: L = permanent live, L out = switched output |
| Outdoor PIR with wrong IP rating | Water ingress, unit failure, shock hazard | IP44 minimum under eaves; IP65 for exposed positions |
| No earth on metal-cased floodlight | Metal housing becomes live under fault | Always earth Class I (metal) fittings |
| No isolation before working | Live conductors during installation | Isolate at MCB, verify dead with voltage tester |

---

## Key Points

- **2-wire PIR** wires like a standard switch — no neutral needed — but may not work with very low-wattage LEDs
- **3-wire PIR** needs permanent live, neutral, and switched-live — more reliable with any load, but requires neutral at the switch position
- To add a manual override, wire a standard switch **in parallel** with the PIR output
- Outdoor PIR floodlights need a permanent live, neutral, and earth supply — the internal PIR does the switching
- **IP44 minimum** under eaves; **IP65** for fully exposed outdoor locations
- Like-for-like PIR switch replacement is **not notifiable under Part P**; a new dedicated circuit is
- Always check the PIR's minimum and maximum load ratings against your connected light fittings
