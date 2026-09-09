---
title: "How to Use the ElectraSim Guide: Beginner to Pro"
description: "A guided route through the ElectraSim Guide: which section to open first, how to read a circuit walkthrough, and when to let the app test you."
pubDate: 2026-09-09
author: ElectraSim
category: Beginner Guide
tags: [electrasim guide, how to use electrasim, learn electrical wiring, circuit walkthrough, electrical components, interactive guide, guided circuits, circuit simulator, beginner electrician, wiring practice]
featured: true
---

The ElectraSim Guide is not a textbook and it is not a search box. It is a set of twenty working circuits, twenty-two components you can take apart, eight tools you can learn before you hold one, and a glossary that catches you every time a term stops you dead. Everything in it links to everything else, and every circuit in it opens pre-built in the [simulator](/app/).

That is a lot of surface area, and surface area is exactly what makes a good reference hard to start with. So this is the route: what to open first, what to ignore until later, and how to tell when you are ready for the next level.

**[Open the guide →](/guide/)**

> If you have never wired anything at all, read [How Household Wiring Works](/blog/how-household-wiring-works/) first. It takes ten minutes and it makes every page below make sense.

---

## The 60-second tour

The guide has five doors. You only need two of them to start.

| Section | What is in it | When you need it |
|---|---|---|
| [Circuits](/guide/circuits/) | 20 walkthroughs — Beginner (5), Intermediate (6), Advanced (9) | From your first day. This is the spine. |
| [Components](/guide/components/) | 22 anatomy pages, 16 with cutaway views | When you want to know *why* a part behaves the way it does |
| [Tools](/guide/tools/) | 8 hand tools and test instruments, marked up part by part | Before you touch real equipment |
| [Glossary](/glossary/) | 37 terms in plain English | Every time a word stops you |
| [In the App](/guide/templates/) | The 20 guided templates, and which walkthrough each one belongs to | When you want to build rather than read |

The relationship worth understanding up front: **the guide explains, the simulator lets you try it.** Every circuit page ends with a link that opens that circuit on the canvas at full fidelity, already wired. Reading about a two-way switch tells you what the strappers do. Building one and watching the lamp stay dark because you fed the switch loop from the wrong side teaches you something reading cannot.

---

## Level 1 — Beginner: follow a circuit all the way through

**Start with [Protected Lamp Circuit](/guide/circuits/protected-lamp/).** It is a supply, one protective device and a lamp — the shortest complete circuit in the guide, and every other walkthrough is this path with something added.

### How to read a circuit page

Every walkthrough has the same shape. Learn it once and the other nineteen read themselves:

1. **The level badge and description** — who the circuit is for and what it demonstrates.
2. **The schematic** — drawn with real conductor colours: live red, neutral black, earth green-and-yellow. The [circuit symbols reference](/blog/electrical-circuit-symbols-complete-reference/) is there if a shape is unfamiliar.
3. **The wiring path in words** — the same circuit as prose, terminal by terminal. If the schematic and the text disagree in your head, that disagreement is the thing worth slowing down for.
4. **The numbered steps** — what to do, in order, on the canvas.
5. **Key insight** — the one thing the circuit exists to teach. On the protected lamp it is that the MCB breaks the live conductor: open it and the lamp goes dark because the live feed is gone, not because the neutral moved.
6. **The safety band** — the rule that applies to this circuit, full width, not buried in a footnote.
7. **Terms used here** — chips linking straight to the glossary entries this page uses.

### When a word stops you

Use the [glossary](/glossary/). It is not a dictionary — it is the 37 terms the walkthroughs actually use, each one linked back to the circuits, components and tools that use it. If you do not know what **R1 + R2** means, or why a **Type AC** RCD will not see a smooth DC fault, one click gets you the answer and another gets you back.

### Build it before you move on

Open the circuit in the app and make it work. Then break it on purpose — disconnect a conductor, move the protective device to the neutral side, add a second lamp in series — and watch what the simulation says. A circuit you have broken on purpose is a circuit you understand.

**Beginner route:** [protected lamp](/guide/circuits/protected-lamp/) → [single-lamp switch](/guide/circuits/single-lamp-switch/) → [two-bulb parallel](/guide/circuits/two-bulb-parallel/) → [doorbell](/guide/circuits/doorbell-circuit/) → [timer bell](/guide/circuits/timer-bell/).

**You are ready for Level 2 when:** you can look at a walkthrough's schematic and predict what the lamp will do before you press Run — and you are right most of the time.

---

## Level 2 — Intermediate: take the parts apart

At this level you stop reading circuits as diagrams and start reading them as *components doing jobs*. That means component pages.

### How to read a component page

Each of the 22 [component pages](/guide/components/) carries two views:

- **Outside** — the real part, with hotspots pinned to its actual geometry: terminals, shutters, the test button, the cable clamp.
- **Cutaway** — an internal view showing the mechanism. On the [MCB](/guide/components/mcb/) that is the latch, solenoid, arc chute and bimetal strip. On the [RCD](/guide/components/rcd/) it is the summation transformer, trip solenoid and the test resistor that proves the mechanism without an earth fault.

Sixteen components have a cutaway. Click a marker once and its detail appears in the side rail, under the specification rows — the panel does not push the picture around.

Below the figure sit the three things that matter on a real job: **what each terminal is for**, **what the device protects against**, and **what is inside it**.

### The five pages worth reading first

1. [MCB](/guide/components/mcb/) — overload versus short circuit, and why one device handles both
2. [RCD](/guide/components/rcd/) — the imbalance it detects, and what it does not protect against
3. [Socket](/guide/components/socket/) — shutters, earth contact, and why the earth pin is longest
4. [Switch](/guide/components/switch/) — why the switch breaks live, never neutral
5. [Two-way switch](/guide/components/two-way-switch/) — common, L1, L2, and the strappers that confuse everyone

Then read the [difference between an RCD, an MCB and an RCBO](/blog/what-is-an-rcbo-difference-between-rcd-mcb-rcbo/), because circuits from here on will assume you know it.

### Learn the instruments before you need them

The [tool pages](/guide/tools/) exist because the safety copy on every walkthrough keeps telling you to *prove it dead* or *press the test button* — and neither instruction is much use if you have never held the instrument. Start with the [multimeter](/guide/tools/multimeter/) and the [voltage and continuity tester](/guide/tools/voltage-continuity-tester/), then the [RCD tester](/guide/tools/rcd-tester/) and [clamp meter](/guide/tools/clamp-meter/). Each is marked up part by part, and each says what it is for and what it will not tell you.

Then read [how to use a multimeter](/blog/how-to-use-a-multimeter-electrical-testing-guide/) and [how to test a ring final circuit](/blog/how-to-test-a-ring-final-circuit/).

**Intermediate route:** [two-way switching](/guide/circuits/two-way-switching/) → [RCD-protected socket](/guide/circuits/rcd-socket-circuit/) → [RCBO-protected socket](/guide/circuits/rcbo-socket/) → [dimmable lighting](/guide/circuits/dimmable-lighting/) → [timed outdoor lighting](/guide/circuits/timed-outdoor-lighting/).

**You are ready for Level 3 when:** you can explain, without looking, why the RCD in one of those circuits does not trip on an overload — and what does.

---

## Level 3 — Advanced: whole installations

Advanced circuits are not harder to wire; they are harder to *justify*. Every one of them is a design decision — a cable size, a protective device, a discrimination choice — and the walkthroughs say so.

**Read [Full Consumer Unit](/guide/circuits/consumer-unit-panel/) first.** It is the panel the other advanced circuits hang off: main switch, busbar, DIN rail, neutral and earth bars, and three final circuits behind their protective devices. Read the [distribution board page](/guide/components/distribution-board/) beside it, then [how a consumer unit is wired](/blog/distribution-board-explained-how-a-consumer-unit-is-wired/) and the [RCD protection zones guide](/blog/rcd-protection-zones-consumer-unit-design-guide/).

### Then work through what hangs off it

| Circuit | What it teaches |
|---|---|
| [Cooker & induction supply](/guide/circuits/cooker-induction-supply/) | High-current dedicated circuits, and why diversity matters |
| [EV charger circuit](/guide/circuits/ev-charger-circuit/) | Long runs, continuous load, and the voltage drop that follows |
| [Solar PV with battery](/guide/circuits/solar-pv-battery/) | DC side, isolation, and where the AC coupling happens |
| [Generator backup supply](/guide/circuits/generator-backup-supply/) | Changeover, and why it must never back-feed the network |
| [Three-phase DOL starter](/guide/circuits/three-phase-dol-starter/) | Contactors, overloads and motor starting current |
| [Contactor motor starter](/guide/circuits/contactor-motor-starter/) | Control circuits at a different voltage to the load |
| [Underfloor heating zone](/guide/circuits/underfloor-heating-zone/) | Load spread across a zone, and the RCD that has to cover it |
| [PIR floodlight](/guide/circuits/pir-floodlight/) | Sensors in the switch line, and the settings that matter |
| [AFDD bedroom circuit](/guide/circuits/afdd-bedroom-circuit/) | Arc fault detection — read [the AFDD explainer](/blog/afdd-arc-fault-detection-devices-explained/) with it |

### Two habits that separate advanced from intermediate

**Size things with the toolbox.** The [cable size calculator](/tools/cable-size-calculator/) and [voltage drop calculator](/tools/voltage-drop-calculator/) are the difference between "1.5 mm² looked right" and "1.5 mm² is right, and here is the number". Read [electrical cable sizes explained](/blog/electrical-cable-sizes-explained/) and [voltage drop explained](/blog/voltage-drop-explained-how-to-calculate-it/) if the terms are new.

**Predict before you run.** On an advanced circuit, write down what you expect to happen, then run it. The [five common wiring mistakes](/blog/5-common-electrical-wiring-mistakes/) post is a good source of things to predict *wrongly* on purpose.

---

## Level 4 — Pro: let the app examine you

Reading is comprehension. Being tested is retention. Everything below runs on the same simulation engine the canvas uses, so a verdict is a verdict about your circuit, not about whether you clicked the right pixel.

1. **[In the App](/guide/templates/)** — all 20 guided templates, mapped to the walkthrough that explains each one. Use it when you want to build without being taught.
2. **Challenge Mode** — you get a goal and outcome requirements, deliberately *without* a construction recipe. Rules are checked on topology, not coordinates, so any electrically equivalent wiring passes.
3. **Diagnosis Lab** — the generator breaks a working circuit on purpose and hands it to you with a vague symptom: *"the hallway light is dead."* You investigate, diagnose, repair, and get scored. Every exercise is deterministic from a seed, so the same seed always gives the identical circuit — which is also what makes it usable in a classroom.
4. **Ohmageddon** — compound faults that genuinely mask each other, a misleading-symptom modifier, limited hints and a timer. Electrically honest, and never unfair.
5. **The Fault Lab** — inject open circuits, shorts, reversed polarity, earth faults and arc faults by hand, and watch which protective device responds, or pointedly fails to.
6. **Compliance and reporting** — check a circuit against the active standard and export the result.

If you teach, the seed is the feature that matters: hand out a seed, and every student gets the same fault to find. If you are self-taught, the sequence that works is walkthrough → build it → break it → Diagnosis Lab on the same circuit type.

---

## The route at a glance

| Level | Start with | Then read | Do this in the app | Ready when |
|---|---|---|---|---|
| **Beginner** | [Protected lamp](/guide/circuits/protected-lamp/) | Glossary as you go | Build all five beginner circuits, then break each one | You can predict what Run will do |
| **Intermediate** | [Two-way switching](/guide/circuits/two-way-switching/) | [MCB](/guide/components/mcb/), [RCD](/guide/components/rcd/), the four instruments | Build the six intermediate circuits | You can say which device trips, and why |
| **Advanced** | [Consumer unit](/guide/circuits/consumer-unit-panel/) | Both [calculators](/tools/) | Build the nine advanced circuits; inject faults | You can justify a cable size and a device choice |
| **Pro** | [In the App](/guide/templates/) | Challenge → Diagnosis → Ohmageddon | Take a diagnosis seed and find the fault unaided | You can find a seeded fault without hints |

---

## Using the guide safely

Everything in the guide is educational. It is written to make you a better-informed homeowner, student, designer or trainee — not to authorise work on a live installation.

- **Nothing here is a substitute for a qualified electrician.** In the UK, most domestic electrical work is notifiable under [Part P](/blog/part-p-building-regulations-explained/).
- **Never work on a live circuit.** Prove it dead with a proper tester, then prove the tester works. The [multimeter guide](/blog/how-to-use-a-multimeter-electrical-testing-guide/) covers the sequence.
- **An RCD is additional protection, not a licence.** Read [what an RCD does and does not do](/blog/what-is-an-rcd-and-why-do-you-need-one/).
- **If you are looking at an existing installation**, the paperwork you want is an [EICR](/blog/electrical-safety-certificates-explained-eicr-eic-mwc/), and the codes you will see on it are [C1, C2, C3 and FI](/blog/eicr-codes-explained-c1-c2-c3-fi/).

---

## Key Points

- The [Circuits](/guide/circuits/) section is the spine — 20 walkthroughs from a single lamp to a three-circuit consumer unit. Start at [Protected Lamp](/guide/circuits/protected-lamp/) and follow the order.
- Use the [glossary](/glossary/) the moment a term stops you. It is cross-linked both ways, so you can read the definition and get straight back.
- Open [component pages](/guide/components/) when you want the *why*. Sixteen have a cutaway view showing the mechanism, and one click on a marker fills the side rail.
- Learn the [instruments](/guide/tools/) before you need them — proving dead is a sequence, and the tool pages show you the parts that matter.
- Every walkthrough opens pre-built in the [simulator](/app/). Build it, then break it on purpose; that is where the understanding comes from.
- When reading stops being enough, let the [app examine you](/guide/templates/): Challenge, Diagnosis Lab, then Ohmageddon — all judged by the real simulation engine.
