---
title: "Kirchhoff's Laws Explained: KCL and KVL with Worked Examples"
description: "Kirchhoff's Current Law (KCL) and Kirchhoff's Voltage Law (KVL) are the two fundamental rules for analysing any electrical circuit. This guide explains both laws clearly, with worked examples, and shows how they extend Ohm's Law to complex networks."
pubDate: 2026-05-24
author: ElectraSim
category: Beginner Guide
tags: [Kirchhoff's laws, KCL, KVL, Kirchhoff's current law, Kirchhoff's voltage law, circuit analysis, node analysis, mesh analysis, series circuit, parallel circuit, GCSE physics, A-level electronics, circuit theory]
---

Ohm's Law tells you the relationship between voltage, current, and resistance in a single component. But what happens when you have multiple branches, multiple power sources, or a network of resistors that cannot be simplified to a single series or parallel combination? That is where **Kirchhoff's Laws** come in.

Published by Gustav Kirchhoff in 1845, these two laws are derived directly from the conservation of charge and the conservation of energy. Together they provide a complete method for finding every voltage and every current in any circuit, no matter how complex.

You can build the circuits in this guide in **[ElectraSim](/app/)** and verify every calculated result by running the simulation.

---

## The Two Laws at a Glance

| Law | Statement | Based on |
|---|---|---|
| **KCL** — Kirchhoff's Current Law | The sum of currents entering a node equals the sum of currents leaving it | Conservation of charge |
| **KVL** — Kirchhoff's Voltage Law | The sum of all voltages around any closed loop equals zero | Conservation of energy |

---

## Kirchhoff's Current Law (KCL)

### Statement

> **The algebraic sum of all currents at any node (junction) in a circuit is zero.**

Equivalently: the total current flowing into a node equals the total current flowing out of it. Charge cannot accumulate at a node — every electron that arrives must leave.

```
ΣI_in = ΣI_out
```

Or in sign convention form (currents into the node are positive, currents out are negative):

```
ΣI = 0
```

### Simple example

Three wires meet at a node. Wire A carries 8 A into the node. Wire B carries 3 A into the node. Wire C leaves the node.

```
I_A + I_B = I_C
8 + 3 = I_C
I_C = 11 A  (leaving the node)
```

### Why it is true

KCL is a direct consequence of **conservation of charge**. Charge cannot be created or destroyed. If 11 A flows into a node per second, 11 A must flow out — otherwise charge would be building up at that point indefinitely, which does not happen in a steady-state circuit.

---

## Kirchhoff's Voltage Law (KVL)

### Statement

> **The algebraic sum of all voltages around any closed loop in a circuit is zero.**

As you travel around any closed loop, you will pass through voltage rises (across power sources) and voltage drops (across resistors and other loads). When you return to your starting point, the net change in voltage must be zero — you are back to the same potential.

```
ΣV = 0  (around any closed loop)
```

### Sign convention

When applying KVL, choose a direction to travel around the loop (clockwise or anticlockwise — your choice, but be consistent). Then:

- If you travel **through a source from − to +** → voltage **rise** → add the value (+V)
- If you travel **through a source from + to −** → voltage **drop** → subtract the value (−V)
- If you travel **through a resistor in the direction of current flow** → voltage **drop** → subtract (−IR)
- If you travel **through a resistor against the direction of current flow** → voltage **rise** → add (+IR)

### Simple example

A single loop: a 12 V battery in series with a 4 Ω resistor and a 8 Ω resistor. Current flows clockwise.

Travelling clockwise from the negative terminal of the battery:

```
+12 (battery rise) − I×4 (drop across R1) − I×8 (drop across R2) = 0
12 − 4I − 8I = 0
12 = 12I
I = 1 A
```

Check: voltage drop across R1 = 1 × 4 = 4 V; across R2 = 1 × 8 = 8 V; total drop = 12 V = battery voltage. <span class="em em-check" role="img" aria-label="do"></span>

### Why it is true

KVL follows from **conservation of energy**. Voltage is electric potential energy per unit charge. If you travel around a closed loop and return to the starting point, the net energy gained or lost must be zero — otherwise you could extract unlimited energy from the circuit, violating conservation of energy.

> Related: [Ohm's Law Explained: Voltage, Current and Resistance](/blog/ohms-law-explained-voltage-current-resistance/)

---

## Worked Example 1 — Two-Loop Circuit

A common exam question: find the current through each resistor and the voltage across each one.

**Circuit:**
- Battery V1 = 20 V (left branch)
- Battery V2 = 8 V (right branch)
- R1 = 4 Ω (top, between the two nodes)
- R2 = 2 Ω (left branch, in series with V1)
- R3 = 3 Ω (right branch, in series with V2)

Define currents: I1 flows clockwise in the left loop; I2 flows clockwise in the right loop. Current through R1 (shared branch) = I1 − I2 (if I1 > I2).

**Apply KVL to Loop 1 (left loop, clockwise):**

```
+20 − I1×2 − (I1 − I2)×4 = 0
20 − 2I1 − 4I1 + 4I2 = 0
20 − 6I1 + 4I2 = 0   … (equation 1)
```

**Apply KVL to Loop 2 (right loop, clockwise):**

```
−8 − I2×3 + (I1 − I2)×4 = 0
−8 − 3I2 + 4I1 − 4I2 = 0
4I1 − 7I2 = 8   … (equation 2)
```

**Solve simultaneously:**

From equation 1: 6I1 − 4I2 = 20 → 3I1 − 2I2 = 10 → I1 = (10 + 2I2) / 3

Substitute into equation 2:
```
4 × (10 + 2I2)/3 − 7I2 = 8
(40 + 8I2)/3 − 7I2 = 8
40 + 8I2 − 21I2 = 24
40 − 13I2 = 24
I2 = 16/13 ≈ 1.23 A
```

```
I1 = (10 + 2×1.23)/3 = (10 + 2.46)/3 = 12.46/3 ≈ 4.15 A
```

Current through R1 = I1 − I2 ≈ 4.15 − 1.23 = **2.92 A**

**Verify with KCL at the top node:**
- I1 flows into node from left = 4.15 A
- I1 − I2 flows out through R1 = 2.92 A
- Remainder (I2 = 1.23 A) flows out to right loop <span class="em em-check" role="img" aria-label="do"></span>

---

## Worked Example 2 — Node Voltage Method (KCL)

Find the voltage at node V_A, given:

- V1 = 12 V source connected from ground to node V_A via R1 = 3 Ω
- V2 = 6 V source connected from ground to node V_A via R2 = 6 Ω
- R3 = 4 Ω connected from node V_A to ground

Applying KCL at node V_A (sum of currents leaving = 0):

```
(V_A − 12)/3 + (V_A − 6)/6 + V_A/4 = 0
```

Multiply through by 12 (LCM of 3, 6, 4):

```
4(V_A − 12) + 2(V_A − 6) + 3V_A = 0
4V_A − 48 + 2V_A − 12 + 3V_A = 0
9V_A = 60
V_A = 60/9 ≈ 6.67 V
```

Current through R3 = 6.67/4 = **1.67 A** (flowing to ground)

---

## KCL and KVL Applied to Series and Parallel Circuits

### Series circuit

In a series circuit, there is only one path for current — **KCL** confirms the same current flows through every component (no nodes where current could split).

**KVL** confirms the supply voltage equals the sum of voltage drops:

```
V_supply = V_R1 + V_R2 + V_R3 + ...
```

> Related: [Series and Parallel Circuits: What's the Difference?](/blog/series-vs-parallel-circuits/)

### Parallel circuit

In a parallel circuit, **KCL** at the main node gives the total current as the sum of branch currents:

```
I_total = I_R1 + I_R2 + I_R3 + ...
```

**KVL** around any loop confirms that the voltage across each parallel branch is equal (same two nodes, same voltage difference).

---

## Superposition Principle (Extension)

For circuits with multiple sources, the **superposition principle** (which is derived from KVL and KCL) states:

> The current through (or voltage across) any element in a linear circuit equals the sum of the currents (or voltages) due to each independent source acting alone, with all other sources replaced by their internal resistance.

- Voltage source replaced → short circuit (0 Ω)
- Current source replaced → open circuit (∞ Ω)

This is the basis for mesh analysis and nodal analysis — systematic methods for applying KVL and KCL to circuits with many loops and nodes.

---

## Common Mistakes

| Mistake | Consequence | Correct approach |
|---|---|---|
| Inconsistent current direction assumptions | Wrong sign on answer | Define all current directions before writing equations; a negative answer just means the current flows opposite to your assumed direction |
| Forgetting that KVL must close the loop | Equation is incomplete | Always end where you started; the loop must be fully closed |
| Mixing up voltage rise and drop signs | Wrong result | At a resistor: drop if travelling with current, rise if against it |
| Applying KCL to a branch (not a node) | Incorrect equation | KCL applies at a node (junction) only |
| Not accounting for shared branch currents | Wrong mesh equations | In mesh analysis, the current in a shared branch is the algebraic sum of the two mesh currents |

---

## Simulate and Verify in ElectraSim

The most effective way to check your Kirchhoff's Law calculations is to build the circuit in [ElectraSim](/app/) and compare measured values with your calculated ones:

1. Build the circuit with the correct component values
2. Run the simulation
3. Use the voltmeter to measure voltage across each resistor
4. Use the ammeter to measure current in each branch
5. Compare with your KVL/KCL results — if they match, your analysis is correct

This approach turns circuit theory into an interactive verification exercise — far more informative than checking an answer in the back of a textbook.

> [Open ElectraSim — free, no sign-up →](/app/)

---

## Key Points

- **KCL:** current in = current out at every node — based on conservation of charge
- **KVL:** sum of voltages around any closed loop = 0 — based on conservation of energy
- Both laws apply to **every circuit**, regardless of complexity
- **Sign convention matters:** be consistent with current directions and voltage rise/drop signs throughout
- KCL and KVL together can solve any linear circuit — they are the foundation of mesh and nodal analysis
- A negative answer for a current just means the actual direction is opposite to your assumed direction — it is not an error
