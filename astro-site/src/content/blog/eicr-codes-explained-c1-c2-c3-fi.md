---
title: "EICR Codes Explained: C1, C2, C3 and FI — What Each Code Means"
description: "Your EICR report lists observations with codes C1, C2, C3, or FI. This guide explains what each code means, which faults produce which codes, what remedial work costs, and what happens if you ignore a C2 finding on a rented property."
pubDate: 2026-06-06
author: ElectraSim
category: Electrical Safety
tags: [EICR codes, C1 code, C2 code, C3 code, FI code, EICR explained, electrical inspection codes, EICR remedial work, landlord EICR, satisfactory EICR, unsatisfactory EICR, EICR report, BS 7671, electrical safety UK]
---

An EICR report arrives and the first thing you see is a list of observations — each followed by a code: C1, C2, C3, or FI. You know the codes indicate severity. But which ones make the report fail? What does each one actually mean in practice? And what does a C2 mean for a landlord with a 28-day deadline?

This guide explains every EICR code in depth, maps real-world faults to specific codes, shows what remedial work costs for each level, and covers the property-sale and insurance implications that most guides skip.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **Understand faults before they happen.** [ElectraSim](/app/) lets you build circuits and inject the same faults an EICR inspector looks for — reverse polarity, missing earths, absent RCD protection — and see exactly how each affects the circuit. [Open ElectraSim →](/app/)

---

## What Is an EICR and What Are the Codes?

An **Electrical Installation Condition Report (EICR)** is a formal document produced by a qualified electrician after inspecting and testing the fixed electrical installation in a property. Every observation is assigned a **condition code** indicating its severity.

The four codes are:

| Code | Short name | Severity |
|---|---|---|
| **C1** | Danger Present | Immediate danger |
| **C2** | Potentially Dangerous | Could become dangerous |
| **C3** | Improvement Recommended | Does not comply with current BS 7671 |
| **FI** | Further Investigation Required | Cannot be fully assessed |

A **Satisfactory** EICR means no C1, C2 or FI findings. An **Unsatisfactory** EICR means one or more C1, C2 or FI findings — remedial work or investigation is required before the installation can be confirmed satisfactory.

---

## C1 — Danger Present

### What it means

The installation has a defect that creates **immediate risk of injury**. The affected circuit or the entire installation should be **isolated immediately** — do not use it until the defect is corrected.

### What faults produce a C1

| Fault | Why it is C1 | Example scenario |
|---|---|---|
| **Live conductors accessible without tools** | Direct contact risk | Broken socket faceplate exposing live terminals; missing cover on a junction box |
| **No earth on a circuit feeding metal appliances** | Earth fault would make the casing live with no path to trip protection | Old rubber cable feeding a metal light fitting with no CPC |
| **Insulation failure with live conductor exposed** | Direct contact or fire risk | Cable crushed behind a screw in a wall, copper exposed |
| **Evidence of arcing, burning, or severe overheating** | Active fire / shock risk | Melted terminal block, scorch marks around a socket, burning smell from a consumer unit |
| **Reversed polarity where the switch breaks neutral** | Lamp holder shell is live when the switch is off | Changing a bulb kills power to the lamp but the holder is still at 230 V |
| **Damaged cable insulation inside a wall** | Hidden live conductor in contact with masonry or moisture | Drill through a cable during renovation, insulation damaged but not shorted |

### What happens with C1

- The electrician should advise you to **isolate the affected circuit immediately**
- If the fault is on the consumer unit or supply cable, isolate the **entire installation**
- Do not reset the breaker or re-energise until the fault is corrected
- A C1 finding makes the EICR **Unsatisfactory**
- Landlords: **immediate action** — there is no 28-day grace period for C1; the circuit must be isolated or fixed on the spot

### Typical remedial cost

| C1 fault | Typical cost |
|---|---|
| Replace damaged socket with correct polarity | £50–£120 |
| Repair or re-route damaged cable | £100–£250 |
| Replace burnt terminal block / connector | £50–£150 |
| Full rewire of affected circuit | £400–£800 |

### How to simulate in ElectraSim

1. Place a **Power Supply** and **Bulb** in ElectraSim
2. Wire the switch into the **neutral** path (reverse polarity)
3. Toggle the switch off — the bulb goes dark but the live connection to the holder remains active
4. This demonstrates exactly why C1 exists: the holder is live at 230 V even when the switch is off

---

## C2 — Potentially Dangerous

### What it means

The installation has a defect that is **not immediately dangerous** but **could become dangerous** under certain conditions. Remedial action is required — the EICR is **Unsatisfactory**.

### What faults produce a C2

| Fault | Why it is C2 | Example scenario |
|---|---|---|
| **No RCD protection on socket circuits** | Earth faults above 30 mA would not disconnect fast enough | 1980s MCB board with no RCDs |
| **MCB rated too high for the cable** | Cable can overheat without tripping the MCB | 10 A MCB protecting a 1.0 mm² lighting cable (rated 13.5 A but 10 A MCB is actually correct; this example is 16 A MCB on 1.0 mm² — the cable overheats) |
| **Missing or inadequate earthing** | Fault current has no path; MCB/RCBO cannot operate | Missing earth conductor on a circuit feeding metal appliances |
| **Bathroom wiring not in correct zone** | Water contact risk with mains voltage | IPX1 fitting installed inside Zone 1 |
| **Old rewirable fuse board with no RCD** | No earth fault protection at all | 1970s porcelain fuse board still in service |
| **Open ring circuit** | Single cable leg carries full load; cable overheats | Socket removed without bridging the ring |
| **No main bonding on gas or water pipes** | Fault current path incomplete; touch voltage on pipework | Gas pipe not bonded in a property with a metal gas installation |
| **Overloaded circuit exceeding cable capacity** | Sustained heat degrades insulation | Kitchen ring running kettle, microwave, dishwasher, and air fryer simultaneously on a 32 A circuit |

### What happens with C2

- The EICR is **Unsatisfactory**
- Remedial work is required
- **Landlords:** must complete remedial work within **28 days** (or a shorter period if the report specifies)
- **Homeowners:** no legal deadline, but the installation is not safe for continued use without remediation
- A new EICR (or partial re-inspection) is required after remedial work to confirm the installation now passes

### Typical remedial cost

| C2 fault | Typical cost |
|---|---|
| Fit RCBOs to socket and bathroom circuits | £200–£450 |
| Consumer unit upgrade (old board → modern RCBO) | £500–£900 |
| Repair or extend main bonding | £100–£250 |
| Repair open ring (bridge the break) | £80–£200 |
| Replace cable that fails insulation resistance | £150–£400 per circuit |
| Relocate bathroom fitting to correct zone | £100–£300 |

> <span class="em em-book" role="img" aria-label="reference"></span> **Related:** [Consumer Unit Upgrade: What to Expect When Replacing Your Fuse Board](/blog/consumer-unit-upgrade-what-to-expect/) — a consumer unit upgrade is the most common C2 remedial work; this guide explains the full process and costs.

### How to simulate in ElectraSim

1. Build a circuit with a **Power Supply**, **Switch**, and **Bulb**
2. **Remove the earth connection** from the circuit
3. The circuit continues to operate normally — the missing earth is invisible in normal use
4. Add an **RCD** and inject an earth fault — the RCD trips; without the RCD, the fault persists undetected
5. This demonstrates why "no RCD protection" is a C2: the MCB does not detect earth leakage

---

## C3 — Improvement Recommended

### What it means

The installation does **not comply with the current edition of BS 7671**, but it may have complied when originally installed. The defect is **not dangerous** and does not make the EICR Unsatisfactory — but improvement is recommended.

### What faults produce a C3

| Fault | Why it is C3 (not C2) | Example scenario |
|---|---|---|
| **Old fuse board with no RCDs** — but no metal-clad appliances on those circuits | Compliant when installed; not compliant now | 1990s MCB board; all lighting circuits with plastic fittings only |
| **Cables without correct colour sleeving** | Cosmetic / identification issue; no safety impact if conductors are correctly connected | Old red/black cable without brown/blue sleeving at the consumer unit |
| **No supplementary bonding in bathroom** — where RCDs are present | RCD provides the protection that bonding would otherwise offer | Modern installation with RCBOs on all circuits; no supplementary bonding |
| **Socket outlets without shuttered apertures** | Non-compliant with current BS 7671 but no direct danger | Old-style unshuttered sockets in a room without children |
| **Missing circuit labels on the consumer unit** | Identification issue; not dangerous but makes future work harder | Consumer unit with blank or illegible labels |
| **No fire-rated downlight covers** | Fire spread risk under certain conditions but not electrical danger | Downlights installed without fire-rated IC covers |

### What happens with C3

- A C3 finding **does not** make the EICR Unsatisfactory
- The report can still receive a **Satisfactory** result with C3 observations
- Remedial work is **not legally required** but is recommended
- Best practice: address C3 findings when the installation is next worked on, or when budget allows
- Multiple C3 findings can indicate an aging installation that may receive C2 findings at the next inspection as conditions deteriorate

### Typical remedial cost

| C3 fault | Typical cost |
|---|---|
| Add circuit labels to consumer unit | £0–£30 (often done during any other visit) |
| Fit shuttered socket outlets | £30–£60 per socket |
| Add supplementary bonding in bathroom | £80–£200 |
| Fit fire-rated downlight covers | £10–£25 per downlight |
| Re-sleeve old cable ends at consumer unit | £50–£100 |

### Budgeting multiple C3 findings

A property with 4–6 C3 findings might have a total remedial cost of £300–£800. This is not urgent, but if the property is being sold or remortgaged, addressing C3 findings before a buyer's solicitor asks questions can prevent delays. A seller's solicitor requesting a copy of the EICR and finding C3 observations may prompt the buyer to request a price reduction.

---

## FI — Further Investigation Required

### What it means

The inspector **could not fully assess** a particular aspect of the installation. The code does not indicate severity — it indicates **incompleteness**. The investigation was stopped before a conclusion could be reached.

### What faults produce an FI

| Fault | Why it is FI (not C1/C2/C3) | Example scenario |
|---|---|---|
| **Wiring concealed in a wall where continuity could not be confirmed** | Inspector could not test the cable | cables buried behind plasterboard with no access |
| **A circuit whose routing could not be traced** | Inspector could not determine what the cable feeds | Old lighting circuit with unknown junction boxes |
| **Evidence of a fault needing more detailed diagnosis** | Inspector suspects a problem but cannot confirm without further work | Intermittent RCD trips that did not occur during testing |
| **Consumer unit internals inaccessible** | Inspector could not inspect connections | Sealed unit or excessive cable congestion |
| **Underfloor heating cables** — could not verify insulation resistance | Testing would require lifting the floor | Electric mat system under tile |

### What happens with FI

- The EICR **cannot be treated as satisfactory** until the investigation is complete
- In practice, an FI means the inspector cannot confirm whether the installation is safe on the information available
- The homeowner or landlord should arrange for the investigation to be completed
- Once the FI is investigated, the inspector issues a **supplementary report** or a **partial re-inspection** noting the outcome
- An FI finding normally makes the EICR unsatisfactory until the missing information is resolved

### Typical cost to resolve FI

| FI scenario | Typical cost |
|---|---|
| Open up a junction box to test concealed wiring | £80–£200 |
| Trace an unknown circuit and label it | £100–£250 |
| Lift a section of flooring to test underfloor heating | £200–£500 |
| Extended fault-finding on intermittent RCD trips | £150–£400 |

---

## How Codes Appear on a Real EICR Report

An EICR report is structured into several sections. The codes appear in the **Observations** table:

```
┌─────────────────────────────────────────────────────────────────────┐
│  OBSERVATIONS                                                       │
├────┬──────┬─────────────────────────────────────────────────────────┤
│ #  │ Code │ Description                                            │
├────┼──────┼─────────────────────────────────────────────────────────┤
│ 1  │ C2   │ No RCD protection on the downstairs socket circuit.    │
│    │      │ Board is a 1980s split-load with no RCBOs.             │
├────┼──────┼─────────────────────────────────────────────────────────┤
│ 2  │ C2   │ Missing main bonding to the gas meter installation.   │
│    │      │ Gas pipe is metallic; no 10 mm² CPC visible.           │
├────┼──────┼─────────────────────────────────────────────────────────┤
│ 3  │ C3   │ Consumer unit labels are illegible. Circuit            │
│    │      │ identification is not possible at the board.            │
├────┼──────┼─────────────────────────────────────────────────────────┤
│ 4  │ C3   │ No supplementary bonding in the bathroom. RCD         │
│    │      │ protection is present; bonding is recommended only.     │
├────┼──────┼─────────────────────────────────────────────────────────┤
│ 5  │ FI   │ Downstairs lighting circuit routes behind the          │
│    │      │ kitchen plasterboard could not be confirmed.            │
└────┴──────┴─────────────────────────────────────────────────────────┘

OVERALL RESULT: Unsatisfactory (C2 and FI findings present)
```

In this example:
- Observation 1 (C2), 2 (C2), and 5 (FI) make the report **Unsatisfactory**
- Observations 3 and 4 (C3) are recommended improvements but do not affect the result
- Observation 5 (FI) means the inspector could not fully assess one aspect

---

## Code Combinations and What They Mean

| Combination | Result | What happens |
|---|---|---|
| C1 only | Unsatisfactory | Immediate isolation required. Remedial work before re-test. |
| C1 + C2 | Unsatisfactory | Both must be fixed. C1 isolated immediately; C2 within 28 days (landlords). |
| C2 only | Unsatisfactory | Remedial work required. New EICR after completion. |
| C2 + C3 | Unsatisfactory | C2 must be fixed (28 days for landlords). C3 recommended but not required. |
| C2 + FI | Unsatisfactory | C2 must be fixed. FI must be investigated before the installation can be fully certified. |
| C3 only | Satisfactory | No remedial work required. Address C3 findings when convenient. |
| C3 + FI | Unsatisfactory / incomplete | C3 findings are noted. FI must be investigated before a satisfactory outcome can be confirmed. |
| FI only | Unsatisfactory / incomplete | Inspector cannot fully certify. Investigation needed. |
| All clear | Satisfactory | No action needed. Re-inspect at the recommended interval. |

---

## The 28-Day Landlord Deadline

For landlords in England, Scotland, and Wales, the 28-day remedial deadline is one of the most important parts of the EICR process:

| Code | Landlord deadline | Homeowner deadline |
|---|---|---|
| **C1** | **Immediate** — isolate now; fix as soon as possible (often same day) | No legal deadline; isolate immediately |
| **C2** | **28 days** from the date of the EICR (or shorter if the report specifies) | No legal deadline; remedial work strongly recommended |
| **C3** | No deadline — recommended improvement | No deadline |
| **FI** | Investigation required without delay; follow the report's specified timescale | No legal deadline for homeowners, but investigate promptly |

**Important:** The 28-day clock starts on the **date of the EICR**, not the date you received the report. If the EICR was dated 1 June and you received it on 5 June, the deadline is 29 June.

Failure to comply with the required timescale for C1, C2 or FI findings can result in:
- **Civil penalty of up to £30,000** (England)
- **Improvement notice** from the local authority
- **Rent repayment order** (in serious cases)
- Prosecution under the Housing Act 2004 (England) or equivalent legislation in Scotland/Wales

---

## What Happens If You Ignore a C2

### During the tenancy

The local authority can serve an **improvement notice** requiring remedial work within a specified period. Non-compliance with an improvement notice is a criminal offence — fine of up to £5,000, plus a daily fine of up to £500 for continued non-compliance.

### At the next EICR

The same C2 finding will appear again at the next inspection (5 years for landlords), and may have worsened. A missing earth that was C2 in 2026 may become C1 in 2031 if the insulation degrades further.

### When selling the property

The buyer's solicitor will request the EICR. A C2 finding that has not been remediated will:
- Be flagged as a **pre-contract enquiry** query
- Prompt the buyer to request remedial work or a price reduction
- May cause the buyer's mortgage lender to refuse the loan (some lenders require a Satisfactory EICR)
- May cause the buyer's insurer to refuse cover or increase premiums

### Insurance

If a fire or electrical incident occurs and the insurer discovers an unremediated C2 finding from a previous EICR, they can:
- Refuse the claim (breach of policy condition — "maintain the installation in a safe condition")
- Pay the claim but pursue recovery from the landlord/homeowner
- Cancel the policy

---

## Remedial Work Process After a Failed EICR

1. **Review the observations** — understand each C1/C2 finding
2. **Prioritise C1 findings** — isolate immediately if not already done
3. **Get quotes** — you can use any Part P-registered electrician, not necessarily the one who did the EICR
4. **Complete remedial work within 28 days** (landlords) or as soon as practical (homeowners)
5. **Obtain an EIC** (Electrical Installation Certificate) for any new work carried out
6. **Request a partial re-inspection** — the original EICR inspector re-tests the affected circuits and issues a supplementary report confirming the C1/C2 findings have been resolved
7. **Update your records** — file the EIC and supplementary report alongside the original EICR

> <span class="em em-book" role="img" aria-label="reference"></span> **Related:** [Consumer Unit Upgrade: What to Expect When Replacing Your Fuse Board](/blog/consumer-unit-upgrade-what-to-expect/) — upgrading a consumer unit is the most common remedial action after an Unsatisfactory EICR.

---

## How Each Code Affects Property Sales

| Code | Impact on sale | What buyers look for |
|---|---|---|
| **C1** | **Cannot sell with C1 present** — the installation is dangerous and a buyer's solicitor will not proceed | EICR showing no C1 findings |
| **C2** | **Significant obstacle** — buyer will demand remedial work, price reduction, or will walk away | EICR showing no C2 findings (Satisfactory) |
| **C3** | **Minor friction** — some buyers will request price reduction for C3 findings; most accept Satisfactory with C3 | Satisfactory EICR |
| **FI** | **Incomplete report** — buyer may request the FI be investigated before proceeding | Complete EICR with no outstanding FI |

**Best practice for sellers:** Obtain an EICR at least 6 months before listing the property. Address any C1/C2 findings. A **Satisfactory** EICR with no C1/C2 findings and no FI is the cleanest outcome for conveyancing.

---

## EICR Codes vs PAT Testing: Don't Confuse Them

EICR codes (C1/C2/C3/FI) apply to the **fixed installation** — the wiring, consumer unit, and accessories. They are completely separate from **PAT testing** (Portable Appliance Testing), which tests movable equipment like kettles, toasters, and power tools.

PAT testing has its own pass/fail system — there are no C1/C2 codes. A failed PAT test means the specific appliance is unsafe, not the building's wiring.

> <span class="em em-book" role="img" aria-label="reference"></span> **Related:** [PAT Testing Explained: Portable Appliance Testing for Landlords and Businesses](/blog/pat-testing-explained-portable-appliance-testing/)

---

## Frequently Asked Questions

### Can I remediate C2 findings myself?

Part P allows non-notifiable work to be carried out by a competent person. However, most C2 findings involve work on the consumer unit, new circuits, or work in special locations — all of which are notifiable under Part P. In practice, C2 remedial work must be carried out by a registered competent person or notified to Building Control.

### How long is an EICR valid?

There is no fixed expiry date. The IET recommends 10 years for owner-occupied homes and 5 years for rented properties. The inspector specifies the re-inspection interval on the report.

### Does a Satisfactory EICR mean my wiring is perfect?

No. A Satisfactory EICR means no C1, C2 or FI findings were found at the time of inspection. The installation may have C3 recommendations or may deteriorate over time. It is a snapshot, not a guarantee.

### What is the difference between an EICR and an EIC?

An **EICR** is an inspection report assessing the condition of an existing installation. An **EIC** (Electrical Installation Certificate) is issued for **new work** — a new circuit, a consumer unit replacement, or any notifiable installation work. They serve different purposes.

### Can I get a partial re-inspection instead of a full EICR?

Yes. If only specific circuits were affected by C1/C2 findings, the inspector can re-test just those circuits and issue a supplementary report. This is cheaper and faster than a full re-inspection.

### What if my EICR has both C2 and FI findings?

The C2 must be remediated (28 days for landlords). The FI must also be investigated before the installation can be fully certified. Both need to be addressed, but the C2 has the legal deadline.

---

## Quick Reference: EICR Code Summary

| Code | Name | Danger level | EICR result | Landlord deadline | Typical remedial cost |
|---|---|---|---|---|---|
| **C1** | Danger Present | Immediate danger | Unsatisfactory | **Immediate** | £50–£800 |
| **C2** | Potentially Dangerous | Could become dangerous | Unsatisfactory | **28 days** | £100–£900 |
| **C3** | Improvement Recommended | Not dangerous | Satisfactory | No deadline | £0–£800 total |
| **FI** | Further Investigation Required | Unknown | Unsatisfactory / incomplete | Prompt investigation | £80–£500 |

---

## Simulate Faults in ElectraSim

[ElectraSim](/app/) lets you build circuits and inject the exact faults an EICR inspector looks for — so you can understand what each code means before receiving a report:

**Reverse polarity (would be C1):**
1. Place a Power Supply, Switch, and Bulb
2. Wire the switch into the neutral path
3. Toggle the switch off — the bulb goes dark but the holder is still live
4. This demonstrates why C1 exists: the holder is at 230 V even when the switch is off

**Missing earth (would be C2):**
1. Add a Bulb connected to a Power Supply
2. Remove the earth connection
3. The circuit operates normally — the missing earth is invisible until a fault occurs
4. Add an RCD and inject an earth fault — the RCD trips; without the RCD, the fault persists

**Open ring (would be C2):**
1. Build a ring circuit with two paths from the distribution board
2. Break one leg by removing a wire mid-loop
3. All loads remain powered — the fault is invisible to normal operation but present in the wiring

> <span class="em em-search" role="img" aria-label="check this"></span> ElectraSim's simulation engine performs a full graph traversal on every circuit change — the same logical analysis an electrician applies during testing. [Try it free →](/app/)

---

## Want to Understand Your EICR Better?

If you have received an EICR and are unsure what the codes mean, use [ElectraSim](/app/) to build a model of your own installation and explore each fault type. Understanding the *why* behind each code makes it easier to discuss remedial work with your electrician, prioritise spending, and avoid paying for unnecessary work. [Open ElectraSim →](/app/)
