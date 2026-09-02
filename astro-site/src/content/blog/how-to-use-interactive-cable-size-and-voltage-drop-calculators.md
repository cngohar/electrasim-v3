---
title: "How to Calculate Cable Sizes & Voltage Drop Interactively (Step-by-Step Guide)"
description: "Learn how to calculate cable sizes and voltage drop with interactive visual tools. Explore conductor resistance, single-phase, three-phase, and DC formulas, and verify BS 7671 and IEC 60364 limits."
pubDate: 2026-08-31
author: ElectraSim
category: Engineering Tools
tags: [cable size calculator, voltage drop calculator, electrical tools, BS 7671 cable sizing, IEC 60364, wire size mm2, conductor resistance, single phase voltage drop, three phase voltage drop, electrical engineering]
---

Selecting the correct cable cross-section is one of the most critical steps in electrical design. A cable that is too thin causes excessive **voltage drop**, leading to flickering lights, malfunctioning electronic equipment, overheating conductors, and wasted electrical energy. Conversely, an oversized cable increases installation costs and makes cable routing difficult.

To make electrical calculations intuitive and visual, ElectraSim has introduced the **[Electrical Toolbox](/tools/)** — featuring the **[Cable Size Calculator](/tools/cable-size-calculator/)** and the **[Voltage Drop Calculator](/tools/voltage-drop-calculator/)**.

This guide explains how to calculate cable sizes, the physics behind voltage loss, how regional standards like BS 7671 and IEC 60364 set design limits, and how to use interactive tools to get the right answer immediately.

---

## The Physics of Voltage Drop

Every electrical conductor has an intrinsic resistance determined by four physical factors:

1. **Material Resistivity (ρ):** Copper has a resistivity of 0.0172 Ω·mm²/m at 20 °C, whereas aluminium has a higher resistivity of 0.0282 Ω·mm²/m (about 64% higher resistance for the same size).
2. **Length of the Run (L):** The longer the cable route, the greater the total conductor resistance.
3. **Cross-Sectional Area (A in mm²):** A larger conductor provides a wider path for electrons, reducing resistance.
4. **Operating Temperature (T):** As conductors heat up under load or ambient temperature, resistance increases.

Using Ohm's Law, the loop resistance for a two-wire single-phase or DC run is:

```
R = (2 × ρ × L) / A
```

The voltage drop (ΔV) across that resistance carrying a current (I) is:

```
ΔV = I × R
```

As a percentage of the nominal supply voltage (V_source):

```
ΔV% = (ΔV / V_source) × 100
```

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Interactive Check:** You can experiment with these variables in real time using our free **[Cable Size Calculator](/tools/cable-size-calculator/)** and **[Voltage Drop Calculator](/tools/voltage-drop-calculator/)**.

---

## Maximum Permitted Voltage Drop Limits

Standards specify maximum allowable voltage drop percentages between the origin of the installation (usually the consumer unit or main switchboard) and any load point:

| Standard | Lighting Circuits | Power & Other Loads | Private LV Supply / Solar |
| :--- | :--- | :--- | :--- |
| **BS 7671 (UK)** | **3.0%** (6.9 V at 230 V) | **5.0%** (11.5 V at 230 V) | 6.0% / 8.0% |
| **IEC 60364-5-52** | **3.0%** (public supply) | **5.0%** (public supply) | 6.0% / 8.0% |
| **US NEC (Article 210/215)** | **3.0%** (branch circuit) | **5.0%** (feeder + branch total) | 5.0% total |

Keeping voltage drop within 3% on lighting prevents noticeable dimming or flickering when large domestic loads (like showers or heat pumps) start up.

---

## Step-by-Step: Sizing a Cable with the Cable Size Calculator

Let's walk through sizing a cable run for a common scenario: supplying a **3 kW garden workshop heater** over a **30-metre radial run** at **230 V AC**.

### Step 1: Open the Calculator
Navigate to the **[Cable Size Calculator](/tools/cable-size-calculator/)**. The interactive stage displays a live electrical scene: **Source → Cable → Load**.

### Step 2: Configure the Source and Load
- Set the Supply Voltage to **230 V AC Single-Phase**.
- Select the **Heater** load preset (or choose **Custom** and enter 3000 W with a power factor of 1.0).
- The design current is automatically calculated:
  ```
  I = 3000 W / (230 V × 1.0) = 13.04 A
  ```

### Step 3: Enter the Run Length & Material
- Move the length slider to **30 m**.
- Choose **Copper** conductors.

### Step 4: Choose Your Compliance Ceiling
- Select a **3.0% limit** (6.9 V) for high-efficiency design, or **5.0%** (11.5 V) for standard power circuits.

### Step 5: Read the Visual Recommendation
The calculator evaluates each candidate cross-section simultaneously:
- **1.5 mm²:** Voltage drop = 8.98 V (3.90%) → **Fails 3% limit** (Passes 5%).
- **2.5 mm²:** Voltage drop = 5.39 V (2.34%) → **Recommended (Smallest size that passes 3%)**.
- **4.0 mm²:** Voltage drop = 3.37 V (1.46%) → **Comfortable pass**.

Clicking any cable size in the comparison strip immediately re-renders the conductor thickness in the animated scene, giving you immediate visual confirmation of how conductor size impacts performance.

---

## Sizing for Long Runs: When Length Forces an Upsize

Consider an **EV Charger (7.4 kW / 32 A)** installed on an outbuilding **40 metres** away from the main distribution board:

1. At 32 A, a standard 2.5 mm² cable drops **17.6 V (7.66%)**, which breaches the 5% limit and can cause EV charger error states.
2. Sizing up to **6.0 mm²** drops **7.34 V (3.19%)**, which is fully compliant and ensures maximum charging efficiency.
3. For runs exceeding 50 m, **10 mm²** is recommended to keep volt drop below 2%.

---

## Exploring Single-Phase vs Three-Phase Voltage Drop

In three-phase balanced AC systems (400 V line-to-line), the return currents in the three active conductors cancel each other out vectorially. The voltage drop formula incorporates the √3 ≈ 1.732 phase multiplier instead of 2:

```
ΔV (3-phase) = √3 × I × L × (r × cos φ + x × sin φ)
```

You can toggle between **DC**, **Single-Phase AC**, and **Three-Phase Balanced AC** in the **[Voltage Drop Calculator](/tools/voltage-drop-calculator/)** to inspect the impedance phasors, conductor temperature correction (ρ at 70 °C), and power loss in watts (I² × R).

---

## Simulating Full Circuits in ElectraSim

Calculating cable size is only the first step. To verify how circuit breakers, RCDs, consumer units, two-way switches, and loads behave together:

1. Open the free **[ElectraSim Wiring Lab](/app/)** in your browser.
2. Drop MCBs, switches, cables, and loads directly onto the interactive canvas.
3. Energise the circuit to trace real current paths, test faults (short circuits, open circuits, earth faults), and inspect disconnection times safely.

---

### Related Tools and Learning Resources

- **[Interactive Electrical Toolbox Hub](/tools/)** — All free web engineering calculators
- **[Voltage Drop Calculator](/tools/voltage-drop-calculator/)** — Deep cable analysis with temperature & power factor controls
- **[Cable Size Calculator](/tools/cable-size-calculator/)** — Interactive source-to-load visual sizing
- **[Electrical Cable Sizes Explained (1.5mm² to 25mm²)](/blog/electrical-cable-sizes-explained/)** — Standard cable sizes and domestic applications
- **[Ohm's Law Master Tutorial](/blog/ohms-law-explained-voltage-current-resistance/)** — Understanding V = I × R and power formulas
