---
title: "Earth Fault Loop Impedance (Zs): Max Values & Formula (UK)"
description: "Complete guide to earth fault loop impedance (Zs): learn the Zs = Ze + (R1+R2) formula, BS 7671 max values, the 80% rule, and how to test circuits safely."
pubDate: 2026-09-21
author: ElectraSim
category: Regulations & Safety
tags: [earth fault loop impedance, zs calculation, bs-7671, circuit-design, electrical-safety, mcb, rcbo, wiring]
---

In domestic electrical wiring, placing a circuit breaker is only half the job. The real question is: **if a live conductor shorts directly to an exposed metal casing, will the protective device trip fast enough to save a life?**

The answer depends entirely on **Earth Fault Loop Impedance (Zs)**.

If Zs is low, fault current surges instantly into the hundreds of amperes, tripping a miniature circuit breaker (MCB) in fractions of a second. But if Zs is too high — because the cable is too long, the conductor is too thin, or the supply earth is poor — fault current chokes. The breaker lingers in its thermal delay, the metal chassis remains energised at dangerous voltages, and the risk of fatal electric shock or fire escalates dramatically.

This guide explains what Earth Fault Loop Impedance is, how the fault loop path works, the fundamental `Zs = Ze + (R1 + R2)` formula, maximum permitted values under BS 7671, the vital "80% rule", and how you can simulate and verify loop impedance in **[ElectraSim](/app/)**.

---

## What Is Earth Fault Loop Impedance (Zs)?

**Earth fault loop impedance (symbol: Zs)** is the total impedance (resistance to alternating current) of the complete path that fault current must travel when an earth fault occurs on an electrical circuit.

When an insulation failure or physical damage causes a Live conductor to touch an earthed metal part (such as a metal back box, cooker chassis, or appliance frame), fault current rushes from the point of the fault back to the local distribution transformer and returns via the supply neutral or earth conductor.

The higher this total loop impedance is, the lower the fault current (Ia) will be, in accordance with Ohm's Law:

```
Ia = U0 / Zs
```

Where:
- **Ia** = Earth fault current (amperes)
- **U0** = Nominal line-to-earth voltage (230 V in the UK)
- **Zs** = Earth fault loop impedance of the circuit (ohms, Ω)

If an earth fault produces 300 A through a 32 A Type B breaker, the breaker snaps open instantaneously (within 0.04 seconds) via its magnetic coil. But if Zs is excessive and only allows 80 A to flow, the magnetic coil never trips; the breaker must rely on its slow bimetallic strip, taking tens of seconds or even minutes to disconnect.

---

## The Complete Fault Loop Path

To understand why Zs has its measured value, trace the physical loop that fault current follows from start to finish:

```
[ Distribution Transformer Secondary Winding ]
         │
         ▼  (External supply line conductor)
[ Service Cut-Out & Consumer Unit Main Switch ]
         │
         ▼  (Circuit Protective Device: MCB / RCBO)
[ Circuit Line Conductor (R1) ]
         │
         ▼  ───[ FAULT OCCURS: Live touches metal chassis ]───
         │
[ Circuit Protective Conductor (CPC / R2) ]
         │
         ▼
[ Consumer Unit Earth Terminal (MET) ]
         │
         ▼  (Supplier's Earth Return: Cable sheath or PEN conductor)
[ Transformer Neutral Star Point & Earth Electrode ]
```

The loop consists of two distinct segments:

1. **External Earth Fault Loop Impedance (Ze):** Everything outside the installation, from the supply transformer up to the consumer unit's Main Earth Terminal (MET).
2. **Internal Conductor Resistance (R1 + R2):** Everything inside the installation, from the circuit breaker out to the furthest point of the circuit and back through the earth wire.

---

## The Core Formula: Zs = Ze + (R1 + R2)

Under BS 7671, the total earth fault loop impedance for any circuit can be calculated directly by adding the external loop impedance to the circuit's internal resistance:

```
Zs = Ze + (R1 + R2)
```

Where:
- **Ze** = External earth fault loop impedance measured at the consumer unit with the earthing conductor disconnected from the installation.
- **R1** = Resistance of the circuit's Line conductor from the consumer unit to the furthest point.
- **R2** = Resistance of the Circuit Protective Conductor (CPC) from the furthest point back to the earth bar.

### Typical Ze Values by UK Earthing System

If you cannot measure Ze directly during design, BS 7671 and the IET On-Site Guide provide standard maximum design values according to the earthing arrangement:

| Earthing System | Description | Maximum Design Ze | Typical Measured Range |
|---|---|---|---|
| **TN-C-S (PME)** | Protective Multiple Earthing (combined neutral & earth in supply) | **0.35 Ω** | 0.15 – 0.28 Ω |
| **TN-S** | Separate earth sheath provided by electricity supplier | **0.80 Ω** | 0.30 – 0.60 Ω |
| **TT** | Consumer provides local earth rod (no supplier earth) | **21 Ω (nominal)** | 10 – 200 Ω |

> Related guide: [Types of Earthing Systems Explained: TN-S, TN-C-S (PME) and TT](/blog/types-of-earthing-systems-tn-s-tn-c-s-tt-explained/)

---

## Required Disconnection Times (BS 7671 Regulation 411.3.2.2)

Why does Zs matter so much in regulations? Because human survival during an electric shock depends on **time**.

Under BS 7671 (Regulation 411.3.2.2), for circuits operating at 230 V nominal voltage to earth on a TN system:
- **Final circuits up to 32 A** (including socket outlets up to 63 A): Maximum disconnection time is **0.4 seconds**.
- **Distribution circuits and circuits > 32 A** (sub-mains feeding outbuildings or other boards): Maximum disconnection time is **5.0 seconds**.

For an MCB or RCBO to clear within 0.4 seconds, the fault current must be high enough to hit the breaker's **instantaneous magnetic trip threshold**.

---

## Maximum Zs Values under BS 7671 (Tables 41.2 – 41.4)

BS 7671 Table 41.2 (for Type B breakers), Table 41.3 (Type C), and Table 41.4 (Type D) set strict upper limits for Zs.

Modern editions incorporate the **Cmin factor (0.95)** to account for voltage fluctuations when the network is heavily loaded:

```
Zs(max) = (U0 × Cmin) / Ia = (230 × 0.95) / Ia = 218.5 / Ia
```

Where Ia is the upper instantaneous magnetic tripping current:
- **Type B:** Ia = 5 × In (trips between 3× and 5× rated current)
- **Type C:** Ia = 10 × In (trips between 5× and 10× rated current)
- **Type D:** Ia = 20 × In (trips between 10× and 20× rated current)

### BS 7671 Maximum Zs Reference Table (0.4 s Disconnection at 230 V)

| Breaker Rating (In) | Type B Max Zs (5 × In) | Type C Max Zs (10 × In) | Type D Max Zs (20 × In) |
|---|---|---|---|
| **6 A** | **7.28 Ω** | 3.64 Ω | 1.82 Ω |
| **10 A** | **4.37 Ω** | 2.19 Ω | 1.09 Ω |
| **16 A** | **2.73 Ω** | 1.37 Ω | 0.68 Ω |
| **20 A** | **2.19 Ω** | 1.09 Ω | 0.55 Ω |
| **32 A** | **1.37 Ω** | 0.68 Ω | 0.34 Ω |
| **40 A** | **1.09 Ω** | 0.55 Ω | 0.27 Ω |
| **50 A** | **0.87 Ω** | 0.44 Ω | 0.22 Ω |

Notice how dramatic the difference is: a 32 A Type B breaker allows a maximum Zs of **1.37 Ω**, but if you install a 32 A Type C breaker for motor loads, the maximum permitted Zs drops in half to **0.68 Ω**!

---

## The "80% Rule" for Cold Testing (Rule of Thumb)

The tabulated maximum Zs values in BS 7671 are based on conductors operating at their maximum permitted operating temperature (**70 °C** for standard PVC).

However, when you inspect and test a circuit on-site, the installation is cold — typically at an ambient temperature of around **20 °C**. Because copper resistance increases as it warms up (by approximately 0.4% per °C), a cable measured cold will read lower resistance than it will under heavy load or fault conditions.

To ensure a cold circuit will still disconnect safely when hot, Appendix 3 and Guidance Note 3 specify the **Rule of Thumb (80% rule)**:

```
Zs(measured) ≤ 0.8 × Zs(tabulated)
```

If your cold measured Zs is below 80% of the tabulated maximum, the circuit is guaranteed to comply when operating at full temperature.

### 80% Max Zs Values for On-Site Verification (Type B Breakers)

| Breaker Rating | Tabulated Max Zs (70 °C) | 80% Test Limit (20 °C) |
|---|---|---|
| **6 A Type B** | 7.28 Ω | **5.82 Ω** |
| **16 A Type B** | 2.73 Ω | **2.18 Ω** |
| **20 A Type B** | 2.19 Ω | **1.75 Ω** |
| **32 A Type B** | 1.37 Ω | **1.09 Ω** |
| **40 A Type B** | 1.09 Ω | **0.87 Ω** |

---

## Worked Example: Sizing a 32 A Socket Circuit

Let's design a 32 A radial socket circuit in a domestic home and verify its Earth Fault Loop Impedance:

- **Supply system:** TN-C-S, design Ze = 0.35 Ω
- **Protective device:** 32 A Type B MCB (Zs(max) = 1.37 Ω)
- **Cable type:** 4.0 mm² Twin & Earth (with 1.5 mm² CPC)
- **Run length:** 22 metres to the furthest double socket

### Step 1: Look up conductor resistance (R1 + R2)
From On-Site Guide Table I1, standard copper resistance at 20 °C:
- 4.0 mm² Line (R1) = 4.61 mΩ/m
- 1.5 mm² CPC (R2) = 12.10 mΩ/m
- Combined (R1 + R2) = **16.71 mΩ/m** (or 0.01671 Ω/m)

### Step 2: Calculate circuit resistance for the 22 m run
```
R1 + R2 = 22 m × 0.01671 Ω/m = 0.368 Ω
```

### Step 3: Calculate total expected Zs
```
Zs = Ze + (R1 + R2) = 0.35 Ω + 0.368 Ω = 0.718 Ω
```

### Step 4: Verify compliance
1. **Compare against tabulated maximum:** 0.718 Ω < 1.37 Ω (Complies)
2. **Compare against 80% cold test limit:** 0.718 Ω < 1.09 Ω (Complies comfortably)

The circuit will achieve instantaneous magnetic disconnection well inside 0.4 seconds during an earth fault.

---

## What Happens When Zs Is Too High? (And How to Fix It)

If your calculation or live loop test produces a Zs that exceeds the permitted maximum, you have three primary engineering options:

1. **Increase the Cable Conductor Size:** Upgrading from 2.5 mm² to 4.0 mm² or 6.0 mm² reduces R1 and R2, cutting the internal resistance of the cable run.
2. **Change the Protective Device Curve:** If a Type C breaker was chosen unnecessarily, reverting to a Type B breaker doubles the permitted Zs allowance.
3. **Provide Supplementary RCD Protection:** On TT earthing systems (or circuits where Zs cannot be brought low enough for overcurrent devices), BS 7671 Regulation 411.5.2 permits a 30 mA RCD to provide fault protection. Since a 30 mA device only requires 30 mA to trip, the maximum permitted Zs rises to **1,667 Ω** (50 V / 0.03 A), though good practice requires electrode resistance below 200 Ω for stability.

---

## Test It Interactively in ElectraSim

Instead of doing manual resistance math on paper, you can test and inspect real-time loop impedance live in the browser with **[ElectraSim](/app/)**.

ElectraSim 2.0 includes a real-time **Earth-Fault Loop Impedance (Zs) & Compliance Engine**:
- Place a supply, consumer unit, breakers, and appliances on the canvas.
- Open the **Inspector** or **Zs Panel** to see the live calculated `Zs = Ze + (R1 + R2)` for every active circuit.
- The engine automatically cross-references your cable run against BS 7671:2018+A4:2026 Tables 41.2–41.4 and flags warnings if a breaker's magnetic trip threshold cannot be reached.
- You can inject real earth faults in the **Fault Lab** to watch how MCBs, RCDs, and RCBOs react under authentic physics.

[Launch ElectraSim & Test Circuit Zs →](/app/)

---

## Frequently Asked Questions

### What is the difference between Ze and Zs?
**Ze** is external earth fault loop impedance — the resistance of the electrical path outside your building (the supply transformer, cables, and supplier earth). **Zs** is the total earth fault loop impedance measured at a specific circuit endpoint, equal to external impedance plus the circuit's internal wiring: `Zs = Ze + (R1 + R2)`.

### Why is 0.4 seconds the maximum disconnection time for domestic circuits?
Research published in IEC 60479 shows that at 230 V, ventricular fibrillation (fatal cardiac arrest) can occur if current flows through the human chest for longer than approximately 0.5 seconds. The 0.4-second limit in BS 7671 provides a vital safety margin to ensure disconnection before fatal heart rhythm disruption occurs.

### How do I calculate R1 + R2?
R1 + R2 is the sum of the line conductor resistance (R1) and protective conductor resistance (R2). It can be calculated using tabulated milliohms-per-metre values multiplied by run length, or measured directly on a de-energised circuit using a low-resistance ohmmeter with line and earth temporarily linked at the consumer unit.
