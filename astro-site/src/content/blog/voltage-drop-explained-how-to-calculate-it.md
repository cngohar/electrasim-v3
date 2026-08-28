---
title: "Voltage Drop Explained: How to Calculate It and Why It Matters"
description: "Voltage drop is the loss of voltage along a cable run due to resistance. Too much drop and appliances under-perform or protection devices fail to operate. This guide explains the calculation method, BS 7671 limits, and how to choose cable sizes for long runs."
pubDate: 2026-05-23
author: ElectraSim
category: Beginner Guide
tags: [voltage drop, voltage drop calculation, cable sizing, BS 7671 voltage drop, long cable run, 2.5mm voltage drop, circuit design, electrical calculations, Ohm's law, earth fault loop impedance, appendix 4]
---

Voltage drop is one of the most consistently misunderstood concepts in domestic electrical installation work. It is not a fault — it is a physical consequence of Ohm's Law. Every cable has resistance, and resistance means voltage is lost along the cable's length. The question is not whether voltage drop exists, but whether it is within acceptable limits.

Get it wrong and the consequences range from appliances running at reduced efficiency to — in worst-case long-run scenarios — protection devices failing to operate within their required disconnection times.

This guide explains what voltage drop is, how to calculate it, what BS 7671 limits apply, and how to use the calculation to choose the right cable size for any circuit.

---

## What Is Voltage Drop?

When current flows through a conductor, the conductor's resistance causes a voltage difference between the start and end of the cable. This difference is **voltage drop**.

Using Ohm's Law:

```
V_drop = I × R
```

Where:
- **I** = current flowing through the cable (amperes)
- **R** = total resistance of the cable run (ohms)
- **V_drop** = voltage lost in the cable (volts)

The supply provides 230 V at the consumer unit. If the cable to a socket drops 10 V, only **220 V** arrives at the socket. The appliance plugged in receives less than its rated voltage.

> Related: [Ohm's Law Explained: Voltage, Current and Resistance](/blog/ohms-law-explained-voltage-current-resistance/)

---

## Why Voltage Drop Matters

### Appliance performance

Most appliances are designed to operate within ±10% of their rated voltage (207–253 V for a 230 V appliance). A 10 V drop keeps you inside this tolerance. A 25 V drop takes a 230 V supply down to 205 V — below the tolerance band for many appliances, causing:

- Motor-driven appliances (washing machines, dryers, pumps) to draw higher current than rated (motors run at higher current at lower voltage, which increases heating)
- Lamps operating dimmer than rated
- Electronic equipment behaving erratically

### Protection device operation

More critically, high voltage drop indicates high circuit impedance. High impedance means **lower fault current** under an earth fault condition. An MCB or RCBO needs a minimum fault current to trip within its required disconnection time. If the cable run is so long and so resistive that a bolted earth fault only produces 50 A, a 32 A Type B MCB (which needs 96–160 A for instantaneous magnetic operation) will not trip magnetically — it will trip slowly on the thermal element, taking many seconds or even minutes.

This is the link between voltage drop and the **Earth Fault Loop Impedance (Zs)** calculation required by BS 7671 — both are expressions of the same circuit resistance.

---

## BS 7671 Voltage Drop Limits

The 18th Edition of BS 7671 (Appendix 4) sets maximum voltage drop limits expressed as a percentage of the nominal supply voltage (230 V):

| Circuit type | Maximum voltage drop | Maximum volts at 230 V |
|---|---|---|
| **Lighting circuits** | 3% | **6.9 V** |
| **Power circuits** (sockets, appliances) | 5% | **11.5 V** |

These limits apply from the **origin of the installation** (the supply intake / consumer unit) to the **furthest point** of each circuit.

Note: these are the limits for normal operation. BS 7671 notes that larger voltage drops may be acceptable during motor starting or where infrequent use means the temporary drop is not significant. However, the standard limits should always be used for design unless a specific engineering justification is made.

---

## The mV/A/m Method

BS 7671 Appendix 4 provides voltage drop figures for standard cable types in the form of **millivolts per ampere per metre (mV/A/m)**. This is the voltage dropped per ampere of current per metre of cable length.

To find total voltage drop:

```
V_drop (mV) = mV/A/m × I_b × L
```

Where:
- **mV/A/m** = voltage drop factor from BS 7671 Table (for the specific cable size and installation method)
- **I_b** = design current (the actual load current, not the MCB rating)
- **L** = one-way length of the circuit in metres

**Important:** the length L is the **one-way** distance from the consumer unit to the load. The cable resistance doubles for a two-wire circuit (live and neutral in series), but the mV/A/m figures in BS 7671 already account for this — they are quoted per metre of route length (one-way), not per metre of conductor.

Convert the result to volts by dividing by 1000:

```
V_drop (V) = (mV/A/m × I_b × L) / 1000
```

---

## Voltage Drop Factors for Common Cables

From BS 7671 Table 4D5 (twin and earth, clipped direct):

| Cable size | mV/A/m (resistive load) |
|---|---|
| 1.0 mm² | 44 |
| 1.5 mm² | 29 |
| 2.5 mm² | 18 |
| 4.0 mm² | 11 |
| 6.0 mm² | 7.3 |
| 10.0 mm² | 4.4 |
| 16.0 mm² | 2.8 |

These figures apply to purely resistive loads. For circuits with significant reactive components (large motors, fluorescent lighting with magnetic ballasts), a slightly different mV/A/m figure (accounting for power factor) applies — these are also in BS 7671 Appendix 4. For most domestic work, the resistive values are sufficient.

> Related: [Electrical Cable Sizes Explained: 1mm², 1.5mm², 2.5mm² and Beyond](/blog/electrical-cable-sizes-explained/)

---

## Worked Examples

### Example 1 — Standard socket ring main

A 32 A ring final circuit using 2.5 mm² twin and earth supplies sockets on the ground floor. The longest one-way distance from the consumer unit to the furthest socket (measured along the ring) is 25 m. The design current (maximum expected simultaneous load) is 20 A.

```
V_drop = (18 × 20 × 25) / 1000
V_drop = 9,000 / 1,000
V_drop = 9 V
```

**Check against limit:** 9 V vs limit of 11.5 V (5% of 230 V for power circuit)  
**Result: <span class="em em-check" role="img" aria-label="do"></span> Pass** — within the 5% limit.

---

### Example 2 — Long garden socket radial

A 20 A radial circuit using 2.5 mm² SWA cable runs 40 m to a garden workshop socket. The design current is 16 A (a workshop with a 3 kW heater and tools).

```
V_drop = (18 × 16 × 40) / 1000
V_drop = 11,520 / 1,000
V_drop = 11.52 V
```

**Check against limit:** 11.52 V vs limit of 11.5 V (5% of 230 V)  
**Result: <span class="em em-cross" role="img" aria-label="don't"></span> Marginal fail** — just over the 5% limit.

**Solution: step up to 4 mm² cable:**

```
V_drop = (11 × 16 × 40) / 1000
V_drop = 7,040 / 1,000
V_drop = 7.04 V
```

**Result: <span class="em em-check" role="img" aria-label="do"></span> Pass** — well within the 5% limit.

> Related: [How to Wire a Shed or Outbuilding](/blog/how-to-wire-a-shed-or-outbuilding/)

---

### Example 3 — Lighting circuit with long run

A 1.5 mm² lighting circuit runs 22 m to the last fitting. The design current is 3 A (total lighting load on the circuit).

```
V_drop = (29 × 3 × 22) / 1000
V_drop = 1,914 / 1,000
V_drop = 1.91 V
```

**Check against limit:** 1.91 V vs limit of 6.9 V (3% of 230 V for lighting)  
**Result: <span class="em em-check" role="img" aria-label="do"></span> Pass** — comfortably within the 3% limit.

Lighting circuits rarely fail voltage drop even at long distances because the design current is so low. The 3% limit is tighter than for power circuits, but the low current (2–4 A typical) keeps the drop small.

---

### Example 4 — When to upgrade cable size

An electrician is designing a 32 A radial circuit to supply a large outbuilding 55 m away. They start with 6 mm² SWA. Design current: 28 A.

```
V_drop = (7.3 × 28 × 55) / 1000
V_drop = 11,242 / 1,000
V_drop = 11.24 V
```

**Check against limit:** 11.24 V vs limit of 11.5 V — just within 5%.

But this leaves almost no margin. If the load increases or a voltage drop at the incoming supply is already present, the limit will be breached. Stepping up to 10 mm²:

```
V_drop = (4.4 × 28 × 55) / 1000
V_drop = 6,776 / 1,000
V_drop = 6.78 V
```

**Result: <span class="em em-check" role="img" aria-label="do"></span> Comfortable pass** — good margin for future load growth.

---

## Voltage Drop vs Earth Fault Loop Impedance

Voltage drop and Zs are two expressions of the same physical property — conductor resistance.

The **earth fault loop impedance** at the end of a circuit (Zs) equals:

```
Zs = Ze + (R1 + R2)
```

Where:
- **Ze** = external impedance from the supply (measured at the consumer unit)
- **R1** = resistance of the live conductor in the circuit
- **R2** = resistance of the circuit protective conductor (CPC / earth wire)

R1 is directly proportional to the circuit length and inversely proportional to cable CSA — exactly the same variable that drives voltage drop. A long thin cable has high R1, high voltage drop, and high Zs. All three worsen together.

BS 7671 Table 41.2 specifies **maximum Zs** values for each MCB type and rating. For example, a 32 A Type B MCB must see a maximum Zs of **1.44 Ω** to guarantee instantaneous disconnection within 0.4 seconds on a TN system. If your cable run pushes Zs above this, either the cable needs to be larger or the MCB needs to be a different type.

This is why cable sizing is not just about voltage drop — it must satisfy **both** the voltage drop limit **and** the maximum Zs requirement.

---

## Quick Design Checklist

For any new circuit or cable run:

1. **Determine design current (I_b)** — the maximum expected load current
2. **Select cable size** — must be rated above the MCB rating (accounting for derating factors)
3. **Calculate voltage drop** — using mV/A/m × I_b × L ÷ 1000; check against 3% (lighting) or 5% (power)
4. **Calculate Zs** — Ze + R1 + R2; check against BS 7671 Table 41.2 maximum for the MCB type
5. **If either fails** — step up to the next cable size and recalculate
6. **Document** — record calculations on the EIC or design documentation

---

## Key Points

- Voltage drop = **I × R** — more current, longer cable, thinner cable all increase it
- BS 7671 limits: **3% for lighting** (6.9 V), **5% for power** (11.5 V) at 230 V
- Use **mV/A/m × design current × one-way length ÷ 1000** to calculate voltage drop in volts
- Long cable runs (garden sheds, outbuildings, EV chargers) are the most likely to fail voltage drop — step up cable size where needed
- Voltage drop and **earth fault loop impedance (Zs)** worsen together — both must be checked for any new circuit
- When in doubt, size up — a larger cable is always better than a borderline pass
