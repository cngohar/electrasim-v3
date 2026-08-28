---
title: "Surge Protection Devices (SPDs) Explained: What They Are and What BS 7671 Amendment 2 Requires"
description: "Voltage surges from lightning and switching events can destroy electronics silently and instantly. This guide explains how Surge Protection Devices work, the main SPD types, where BS 7671 Amendment 2 requires them, and how to choose the right SPD for a domestic or commercial installation."
pubDate: 2026-06-22
author: ElectraSim
category: Intermediate Guide
tags: [SPD, surge protection device, BS 7671 amendment 2, voltage surge, transient overvoltage, lightning protection, consumer unit, Type 1 SPD, Type 2 SPD, Type 3 SPD, overvoltage protection, 18th edition wiring regulations, electrical installation protection, surge arrester]
---

Most electrical faults announce themselves — a tripped breaker, a dead socket, a burning smell. A voltage surge does not. It arrives in nanoseconds, destroys semiconductors and insulation silently, and leaves no trace except a device that no longer works. The MCB never trips. The RCD never trips. Nothing in the consumer unit responds — because surges are too fast and too brief for any of those devices to detect.

A **Surge Protection Device (SPD)** is the only protection against transient overvoltages. Added as a formal consideration requirement to BS 7671 by Amendment 2 (2022), SPDs are now part of every new domestic installation assessment in the UK — yet most homeowners have never heard of them, and many electricians are still learning what the regulations actually require.

This guide explains what voltage surges are, how SPDs clamp them, the main SPD types and where each is used, what BS 7671 Amendment 2 actually mandates, and how to specify the right SPD for a domestic or light commercial installation.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Related:** If you are planning a new consumer unit and want to understand all the Amendment 2 requirements together, see our guide on [AFDDs: Arc Fault Detection Devices Explained](/blog/afdd-arc-fault-detection-devices-explained/) — the other major Amendment 2 addition.

---

## What is a Voltage Surge?

A **transient overvoltage** (voltage surge) is a brief but very high voltage spike superimposed on the normal 230 V supply. Surges are characterised by:

- **Duration:** microseconds to milliseconds — far too brief to trip any MCB or RCD
- **Magnitude:** typically 1 kV to 10 kV, sometimes higher for direct lightning events
- **Rise time:** nanoseconds — faster than any electromechanical device can respond

The standard test waveform used in surge protection standards is an **8/20 µs waveform** — a surge that rises to peak in 8 microseconds and decays to half-peak in 20 microseconds. Real surges vary, but this benchmark defines the protection level required.

### Sources of voltage surges

**External (atmospheric) surges:**
- **Direct lightning strike** to the building or supply conductors — rare but extremely high energy; can produce surges of 10–100 kV
- **Indirect lightning** (nearby strike coupling energy into overhead supply cables) — much more common; typically produces 1–10 kV surges at the installation

**Internal (switching) surges:**
- **Switching of large inductive loads** — motors, contactors, transformers, HVAC compressors switching on or off induce voltage spikes on the supply
- **Utility switching** — the distribution network switching operations (grid reconfiguration, fault clearance) generate switching surges that travel along supply cables
- **Power factor correction capacitor switching** — common on commercial networks, produces fast transients

**What surges damage:**
- Consumer electronics — computers, TVs, audio equipment, smart home devices
- Appliance control boards — washing machines, dishwashers, ovens with electronic controllers
- LED drivers and smart lighting
- EV charger control electronics
- Solar inverters and battery management systems
- Sensitive medical equipment

The trend toward more electronics in every appliance means surge damage risk has increased substantially over the past two decades. A surge that would have blown a fuse in a 1990s appliance now destroys an irreplaceable microcontroller in a 2020s one.

---

## How an SPD Works

An SPD is a **voltage-clamping device** — it presents a very high impedance to normal supply voltage and switches to a very low impedance when voltage exceeds its clamping threshold, diverting the surge energy to earth.

### The core component: Metal Oxide Varistor (MOV)

Most SPDs use a **Metal Oxide Varistor (MOV)** as the primary clamping element. An MOV is a non-linear resistor — its resistance drops dramatically as voltage rises above its rated voltage. At 230 V, it passes negligible current. At 1,000 V, it becomes a near-short circuit, diverting the surge current to earth.

The energy absorbed by the MOV is dissipated as heat. The MOV degrades slightly with each surge event — after absorbing many surges or one very large surge, it may need replacement. Quality SPDs have an indicator that shows when the MOV has reached end of life.

### Other clamping technologies

| Technology | How it Works | Characteristics |
|---|---|---|
| **MOV (Metal Oxide Varistor)** | Non-linear resistance, clamps at threshold | Most common, fast, degrades with use |
| **TVS Diode (Transient Voltage Suppressor)** | Semiconductor avalanche clamping | Very fast, precise clamping voltage, lower energy handling — used in equipment-level protection |
| **Gas Discharge Tube (GDT)** | Ionised gas conducts surge to earth | High energy handling, slower response, used in Type 1 SPDs |
| **Spark Gap** | Air-gap breakdown at high voltage | Highest energy, slowest, used for lightning protection |

Practical SPDs — particularly Type 1 and Type 2 devices for installation at the consumer unit — combine GDTs and MOVs to get both high energy handling and fast clamping response.

### The protection pathway

For an SPD to work, it must have a low-impedance path to earth. The surge current flows:

```
Incoming supply surge
        ↓
    SPD clamps — surge current diverted
        ↓
    Earth conductor
        ↓
    Main earth terminal / earth electrode
        ↓
    Earth (surge dissipated)
```

This is why **earthing quality directly affects SPD performance**. A high-impedance earth connection (poor TT earth electrode, long earth conductor) means the SPD cannot divert surge energy effectively. SPDs are most effective on TN-S and TN-C-S (PME) earthing systems. On TT systems with a high earth electrode impedance, the SPD's performance is limited and the installation design must account for this.

---

## SPD Types: Type 1, Type 2, Type 3, and Component-Level Protection

BS EN 62305 (lightning protection) and BS EN 61643 (low-voltage SPDs) define installation SPD types based on their energy-handling capability and installation location. For electrical installations, the practical categories are Type 1, Type 2 and Type 3, with additional component-level protection built into equipment.

### Type 1 SPD — Lightning Arrester

**Location:** installed at the origin of the installation — the main incoming distribution board or between the utility meter and the consumer unit.

**Purpose:** handles the extremely high energy of a direct or near-direct lightning strike coupling into the supply. Type 1 SPDs must be able to conduct a **10/350 µs impulse current** — the standard waveform for lightning current, which carries far more energy than a switching surge.

**Typical impulse current (Iimp):** 12.5 kA to 25 kA per phase

**When required:** buildings with a lightning protection system (LPS / air termination network), and other installations where the lightning protection or supply design calls for direct lightning-current handling.

**For domestic installations:** Type 1 SPDs are required if the building has a lightning protection system. They are not routinely required for every domestic property — but where an overhead supply is the incoming feed (common in rural areas), a Type 1 or combined Type 1+2 SPD is good practice.

### Type 2 SPD — Switching Surge Arrester

**Location:** installed at the main consumer unit or distribution board, downstream of the main switch.

**Purpose:** handles switching surges from the distribution network and indirect lightning coupling. Type 2 is the standard class for domestic and light commercial SPD installation.

**Typical nominal discharge current (In):** 5 kA to 40 kA (8/20 µs waveform)

**When required:** BS 7671 Amendment 2 Regulation 443.4 — generally provided for new domestic consumer units unless a documented owner declaration accepts the risk of loss or damage. In practice, a Type 2 SPD at the consumer unit is now standard for new domestic installations.

**Installation:** fitted in a spare way of the consumer unit, or as a dedicated module alongside it. Wired L, N, and E, with the earth connection bonded to the main earth terminal.

### Type 3 SPD — Point-of-Use Protection

**Location:** at or near the equipment being protected — inside a socket outlet, in a trailing lead, or at the terminals of the equipment itself.

**Purpose:** provides a final layer of protection for sensitive electronics against residual surges that pass through Type 1 and Type 2 SPDs, and against surges generated internally (e.g., by other equipment on the same circuit).

**Typical voltage protection level (Up):** lower than Type 2 — provides finer clamping close to the equipment's rated insulation voltage.

**When used:** as supplementary protection for high-value or sensitive equipment — servers, audio-visual equipment, medical devices, smart home hubs. Not a substitute for Type 2 at the origin — Type 3 alone cannot handle the energy of external surges.

**Common form factor:** surge-protected extension leads, socket outlets with integrated MOVs, and plug-in adaptors. Note: most consumer "surge protectors" sold in retail are Type 3 devices — they provide useful point-of-use protection but are not a replacement for a properly installed Type 2 SPD at the consumer unit.

### Component-Level Protection

**Location:** built into equipment during manufacture — on PCBs, at data ports, within appliance control boards.

**Purpose:** the final protection layer within the equipment itself.

**Relevant to:** equipment specifiers and manufacturers, not typically to installation electricians or homeowners.

---

## BS 7671 Amendment 2: What the Regulations Actually Require

Amendment 2 to the 18th Edition (BS 7671:2018+A2:2022) introduced Regulation **443.4** and updated **534** to formalise SPD requirements. This is the most commonly misunderstood aspect of the new regulations.

### The practical requirement

BS 7671 does **not** simply say "fit an SPD in every case", but Amendment 2 moved away from the old calculated risk-assessment approach for most low-voltage installations. The practical starting point is that protection against transient overvoltages shall be provided where the consequences could affect safety, public services, cultural heritage, commercial or industrial activity, or large numbers of people. For other installations, such as many single domestic dwellings, SPD protection should still be provided unless the owner declares that protection is not required because loss or damage is considered tolerable.

That decision should be documented. In normal consumer-unit replacement work, fitting a Type 2 SPD is often the simplest and cleanest way to comply and avoid relying on a homeowner opt-out.

### Factors that still affect SPD selection

Even where the decision to provide SPD protection is straightforward, the designer still considers:

- **Type of structure:** Is there a lightning protection system? Is the building tall or exposed?
- **Type of supply:** Overhead supplies are more exposed to lightning coupling than underground supplies.
- **Consequences of overvoltage:** Would failure affect people, safety systems, irreplaceable data, commercial activity or expensive equipment?
- **Sensitive equipment:** Solar inverters, EV chargers, battery systems, medical equipment, servers and smart controls all increase the practical value of SPD protection.

Examples of serious consequences include:
- Are there irreplaceable data or systems (servers, medical equipment, fire alarm systems)?
- Would loss of equipment cause danger to persons or significant financial loss?
- Does the installation serve a critical function (care home, hospital, data centre)?

### When SPDs are mandatory vs recommended

For practical domestic and light-commercial guidance, treat the outcome as one of two categories:

**SPD protection required (Regulation 443.4 — "shall"):**
- Buildings with a lightning protection system
- Installations where overvoltage could result in serious injury or loss of human life
- Installations where overvoltage could interrupt public services, safety services, commercial or industrial activity, cultural heritage, or large numbers of people
- Other cases where the designer cannot justify an owner opt-out

**SPD protection recommended (good practice, not mandatory):**
- Standard single domestic installations where the owner has explicitly accepted the risk of equipment loss
- Existing installations where no new consumer-unit or circuit work is being carried out

### The practical reality for domestic installations

For a typical UK home, a Type 2 SPD at the consumer unit is now common practice on new boards and rewires, for two reasons:

1. The cost is modest (£30–80 for a Type 2 SPD module) relative to the cost of replacing damaged electronics
2. It avoids relying on a homeowner declaration that surge damage is an acceptable risk

For **overhead supply cables** (common in rural areas and some older suburban properties), the exposure is higher and a Type 2 or combined Type 1+2 SPD is commonly selected depending on the lightning protection and supply arrangement.

---

## Specifying the Right SPD for a Domestic Installation

### Step 1: Determine SPD class required

- Building has a lightning protection system → **Type 1 + Type 2** (or combined Type 1+2)
- Overhead supply cable → **Type 2** minimum, consider combined Type 1+2
- Underground supply, no LPS → **Type 2** at consumer unit

### Step 2: Select the correct voltage protection level (Up)

The **voltage protection level (Up)** is the maximum voltage the SPD allows to pass through to connected equipment during a surge. It must be lower than the **impulse withstand voltage** of the equipment being protected.

For 230 V domestic installations:
- Equipment rated at **Category II** (most household appliances) has an impulse withstand voltage of **2,500 V**
- The SPD's Up must be less than 2,500 V — typically **≤1.5 kV** for a well-specified Type 2 SPD

| Equipment Category | Impulse Withstand Voltage | SPD Up Required |
|---|---|---|
| Category IV (origin of installation) | 6 kV | N/A (upstream of SPD) |
| Category III (fixed installation equipment) | 4 kV | ≤2.5 kV |
| Category II (appliances, consumer electronics) | 2.5 kV | ≤1.5 kV |
| Category I (sensitive electronics, protected equipment) | 1.5 kV | ≤0.8 kV (Type 3 needed) |

A good domestic Type 2 SPD will have Up ≤ 1.5 kV, protecting all Category II equipment. For servers and sensitive electronics (Category I), add Type 3 point-of-use protection.

### Step 3: Verify discharge current rating (In)

For domestic Type 2 SPDs, an **In of 20 kA** (8/20 µs) is the standard specification. Higher ratings (40 kA) are available and appropriate where overhead cables or elevated lightning risk increase the expected surge energy.

### Step 4: Check installation compatibility

- SPD must be compatible with the consumer unit — most DIN-rail mounted SPDs fit standard 35 mm DIN rail
- The SPD requires a **dedicated MCB** upstream (typically 63 A for Type 2) to disconnect it if it fails short-circuit — or a dedicated fused connection
- The SPD must be connected with the **shortest possible earth conductor** to minimise inductive impedance — the earth lead should not exceed 0.5 m where possible

### Step 5: Verify end-of-life indicator

All quality SPDs include a visual indicator (typically a green/red window) that shows when the MOV has been degraded and needs replacement. Specify and fit only SPDs with a clear, accessible indicator. An SPD with a failed MOV provides no protection — but may appear intact.

---

## SPD Installation: Practical Points

### Where it goes in the consumer unit

A Type 2 SPD is typically installed immediately downstream of the main switch, on the live busbar, before any individual MCBs or RCBOs. This positions it to clamp surges before they reach any circuit.

```
Utility Meter
      ↓
Main Switch
      ↓
SPD (Type 2) — connected L, N, E with short earth lead to main earth terminal
      ↓
Individual MCBs / RCBOs → Circuits
```

If the consumer unit is full, an SPD can be installed in a small separate enclosure adjacent to the consumer unit, connected via short tails from the main earth terminal.

### Connection method

- **3-pole SPD (L-N, L-E, N-E):** provides the most comprehensive protection — clamps surges on all three pathways. This is best practice for domestic TN-C-S (PME) installations.
- **2-pole SPD (L-N only):** simpler, lower cost, protects against line-to-neutral surges only. May be adequate in some circumstances but does not protect against common-mode surges.

For TN-C-S (PME) earthing — the most common UK domestic supply — a 3-pole SPD is recommended.

### Earth conductor length

Every millimetre of earth conductor between the SPD and the main earth terminal adds inductive impedance, which increases the residual voltage that reaches connected equipment during a surge. BS 7671 and IEC 61643 both advise that SPD earth connections should be **as short as possible** — ideally under 0.5 m total (including both the SPD-to-busbar and SPD-to-earth leads).

A long, looping earth connection defeats much of the SPD's benefit. If the consumer unit is installed away from the main earth terminal, a dedicated short earth conductor should be run for the SPD.

### Discrimination with upstream devices

The MCB protecting the SPD should be sized to:
- Carry the SPD's follow current (the current that continues to flow briefly after a surge event) without tripping unnecessarily — typically 63 A for a domestic Type 2 SPD
- Trip and disconnect the SPD if it fails permanently to a short circuit

Do not use the same MCB for both the SPD and a load circuit — the SPD should have its own dedicated protection.

---

## SPD vs Surge-Protected Extension Leads: What's the Difference?

This is a common question. The answer is significant.

| | Consumer Unit SPD (Type 2) | Surge-Protected Extension Lead (Type 3) |
|---|---|---|
| **Energy handling** | 20–40 kA (8/20 µs) | Typically 1–6 kA |
| **Voltage protection level** | ≤1.5 kV | Typically 2–4 kV |
| **Protects** | Entire installation | Single point of use |
| **Clamping speed** | Nanoseconds | Nanoseconds |
| **Handles external lightning surges** | Yes | No (too low energy rating) |
| **Handles internal switching surges** | Yes | Yes |
| **Regulated under BS 7671** | Yes | No (product standard only) |
| **Typical cost** | £30–80 (installed) | £10–40 |

A consumer-grade surge protector strip is a useful last line of defence for sensitive equipment. It is not a substitute for a properly installed Type 2 SPD at the consumer unit. For complete protection, both are needed: Type 2 at the board handles the large external surges; Type 3 at the equipment handles residual surges and internally generated transients.

---

## Common Questions About SPDs

### Can I retrofit an SPD to an existing consumer unit?

Yes — if there is a spare way available. A Type 2 DIN-rail SPD fits into a standard consumer unit way, with its own MCB, and a short earth lead to the main earth terminal. If the board is full, a small external enclosure adjacent to the consumer unit is the alternative.

### Does an SPD need maintenance?

Check the end-of-life indicator annually (during the same check as RCD testing). If the indicator has changed (red window, warning light), the SPD's MOV has been depleted and must be replaced. The device body and connections should be inspected during any EICR.

### Will an SPD affect my RCD or AFDDs?

No — an SPD diverts surge energy to earth and does not generate sustained earth leakage current. A properly installed SPD will not cause nuisance tripping of RCDs or AFDDs. However, a failing or degraded SPD may generate leakage current — another reason to check the end-of-life indicator and replace as needed.

### What about data and communication lines?

Surges also travel along telephone lines, broadband cables, coaxial TV cables, and data network cables — any conductor entering the building can carry transient overvoltages. For comprehensive surge protection in buildings with high-value electronics, SPDs on data and communication lines (telephone SPDs, Ethernet SPDs, coax SPDs) should be considered alongside the power supply SPD. These are separate devices, not covered by BS 7671, but relevant to a complete protection strategy.

### Does the SPD protect against power cuts and brownouts?

No. An SPD only responds to transient overvoltages — brief spikes above the clamping threshold. It does not protect against sustained overvoltage, undervoltage (brownout), frequency deviation, or power interruptions. A UPS (Uninterruptible Power Supply) is needed for protection against those conditions.

---

## SPDs and EICRs

From Amendment 2, inspectors carrying out EICRs may note where SPD protection is absent and the installation type or documented design decision indicates it should have been provided:

- Newer installations with no SPD and no owner declaration or design justification — departure from Regulation 443.4
- Buildings with a lightning protection system and no appropriate Type 1/Type 2 protection — potentially more serious, depending on the design and inspection findings
- Existing domestic installations with no SPD — often an improvement recommendation rather than an immediate danger, unless specific risk factors are present

On an existing installation where no new work is being done, absence of an SPD is not automatically a dangerous defect. The code depends on the age of the installation, the equipment supplied, the premises type and inspector judgement.

---

## Key Takeaways

- **Voltage surges** — from lightning and switching events — arrive in nanoseconds, destroy electronics silently, and are invisible to MCBs and RCDs
- **SPDs clamp surges** by diverting transient energy to earth through a Metal Oxide Varistor; they present high impedance at normal voltage and near-short circuit impedance during a surge
- **Type 2 SPD** at the consumer unit is the standard domestic installation — handles switching surges and indirect lightning coupling; **Type 1** is added where a lightning protection system is present or overhead cables feed the building
- **BS 7671 Amendment 2 Regulation 443.4** requires transient overvoltage protection in specified higher-consequence cases and, for other installations, expects protection unless the owner declares that loss or damage is tolerable.
- **Up ≤ 1.5 kV** is the correct voltage protection level for a domestic Type 2 SPD protecting Category II equipment
- The **earth conductor must be as short as possible** — inductive impedance in a long earth lead degrades the SPD's clamping performance
- **Consumer surge protector strips are Type 3 devices** — useful as a last layer, but not a substitute for a Type 2 SPD at the consumer unit
- **Check the end-of-life indicator annually** — a depleted MOV provides no protection

**Build and test complete installations with SPDs in context:** [Open ElectraSim →](/app/) — free, browser-based, no account required.
