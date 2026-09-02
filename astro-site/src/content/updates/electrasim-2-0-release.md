---
title: "ElectraSim 2.0: Challenge Mode, the Diagnosis Lab, Guided Circuits and the Electrical Toolbox"
description: "ElectraSim 2.0 is the learning release: three structured learning modes judged by the real simulation engine, eight Guided Circuits with checklists, a live Fault Lab, compliance reporting, and a multi-standard Electrical Toolbox — plus a long list of honesty and correctness fixes. Here is everything that changed and why."
pubDate: 2026-08-31
author: ElectraSim
category: App Update
version: "v2.0.1"
tags: [ElectraSim, v2.0, v2.0.1, release notes, challenge mode, diagnosis lab, ohmageddon, guided circuits, fault lab, electrical toolbox, cable sizing, voltage drop, circuit simulator]
featured: true
---

ElectraSim 2.0 is about one thing: **turning a wiring drawing into something you can learn from, practise on, and hand over.** The canvas and the simulation engine were already there — 115 modelled components, live Live/Neutral/Earth path tracing, protective devices that trip because the circuit says they should. What 2.0 adds is everything around that engine: structured modes that tell you whether you got it right, guided templates that teach while you wire, a fault lab you can break things in, compliance reporting, and a reference toolbox that lives next to the simulator on the website.

This post is the complete tour. Everything linked below is live today, free, with no account and no tracking.

[Open ElectraSim 2.0 →](/app/)

> **v2.0.1 Maintenance Update:** We've polished the welcome popup with seamless animations, unified the "Coming Soon" badges across navigation and footer, optimized page loading speeds so preview graphics load only when needed, and fine-tuned menu interactions across the site.

---

## 1. Three learning modes, judged by the real simulator

Free-build is where most simulators stop. ElectraSim 2.0 ships three structured modes, and all three are judged by the same simulation engine the canvas uses — not by a script that checks whether you clicked the right pixel.

### Challenge Mode — build to a mission

You get a goal (a protected lamp, a momentary doorbell, an RCBO-fed socket) and high-level outcome requirements — deliberately **without** a step-by-step construction recipe, so you still have to figure the circuit out yourself. Rules are checked on **topology, not coordinates**: any electrically equivalent wiring passes. Three progressive hints are there if you want them, your normal circuit is snapshotted and restored exactly when you leave, and every verdict is plain English.

### Diagnosis Lab — find the fault they hid

The generator breaks a working circuit on purpose and hands it to you with a vague symptom: *"the hallway light is dead."* You investigate, pick your diagnosis, repair it, and get scored. Exercises are **deterministic from a seed** — copy the seed, paste it, get the identical circuit — which is also what makes the whole lab reproducible in a classroom. Three difficulty profiles scale the scenario shape.

Two honesty details worth knowing, because they took real work:

- **The console no longer prints the answer.** The simulator's own trip messages used to name the injected fault outright — in Diagnosis mode those messages are now withheld by index at the point they are pushed, so you still see the *consequences* a diagnostician reasons from, never the giveaway.
- **The panel re-derives the symptom live.** The briefing text is regenerated from your actual circuit as you work, so if clearing one fault reveals another, the panel says the symptom has changed instead of describing a circuit that no longer exists.

### Ohmageddon — opt-in punishment

For when Diagnosis is too comfortable: compound faults that deliberately mask each other (verified by an electrical-equivalence gate, so the masking is real, not cosmetic), a misleading-symptom modifier, limited hints and a timer. It is electrically honest — never unfair — and every brutal run is shareable by seed.

## 2. A deterministic generator underneath

All three modes sit on a seeded, deterministic circuit generator: same seed, same circuit, same faults, every time. It went through a generator stress lock before the modes shipped — tens of thousands of generated scenarios checked for solvability, reachability and honesty — and the diagnosis pipeline is verified across **269,808 fault injections**. If a scenario says a fault is findable, it is.

## 3. Guided Circuits — templates that teach

Eight ready-made circuit templates land on the canvas at full fidelity — protected lamp, one-way and two-way staircase lighting, a momentary doorbell, an RCBO-protected socket, an RCD earth-fault demo, a Pro SPD consumer unit and more — each with an in-app checklist that ticks items off as your circuit actually satisfies them. A further ten Pro guides cover three-phase, control and distribution circuits. Guided Circuits are deliberately unlinked from Challenge Mode: one is a teacher, the other is an examiner.

## 4. The Fault Lab

Manual fault injection moved into the Inspector as a first-class **Fault Lab**: open circuits, short circuits, reversed polarity, earth faults, arc faults and smooth-DC residual (the kind that blinds a Type AC/A/F RCD — only a Type B trips). Inject a fault on a component or a wire, and the canvas shows the consequence with live fault effects — flickering flame markers on overheated runs, sever cues on broken conductors — while the right protective device responds, or pointedly fails to. An active-faults command centre lists everything currently injected so nothing lurks forgotten.

## 5. Pro standards, compliance and reporting

- **Standards gating** checks your circuit against the active standard before the simulation runs, explains what violates what, and records a teacher's override as an audit event.
- **Zs / disconnection-time checks** (BS 7671 Reg 411.3 style) with earth-arrangement awareness.
- **A mini EIC-style report export** renders your circuit's schedule of devices into a printable title-block layout — clearly stamped as educational output, never a certificate.
- The **default standard is now International (IEC)**, with region presets (UK, EU, US, AU, PK and more) one click away, and the Student/Pro selector is honest about what Pro unlocks.

## 6. The Electrical Toolbox on the website

The simulator's reference shelf lives at [electrasim.com/tools/](/tools/) — free, no sign-up, no tracking:

- **[Voltage Drop Calculator](/tools/voltage-drop-calculator/)** with a live source-to-house scene that reacts to the verdict, real circuit presets, and shareable result URLs.
- **[Cable Size Calculator v2](/tools/cable-size-calculator/)** — rebuilt around one question: *what is the smallest cable that keeps the voltage drop inside the limit I chose?* It draws the answer as an isometric source → cable → load run whose thickness, heat and appliance behaviour follow the maths. It also sizes the **hot cable, not the cold one** (conductor temperature is an input, defaulting to 70 °C — a correction worth ~20% on every previous figure), quotes the design current so voltage-drop-only never masquerades as ampacity, and prints a tidy spec sheet.

Both run their maths in one shared, unit-tested engine, checked against **BS 7671 and IEC 60364** limit sets.

## 7. A workbench that got out of your way

The app shell was rebuilt around speed: a **⌘K command palette** for every action, a menu redesigned as a command hub, **portable profile backups** (export/import your whole settings profile as a file), an in-app docs overlay bridged to the website guides, and redesigned Guided Circuits and Settings windows. Two interactive **tours** walk you through it — a Student tour that builds your first circuit with you, and a Pro tour covering standards, diagnostics and the fault tooling. Both advance by watching what you actually do, not by clicking "Next".

## 8. Correctness fixes that matter

- **Conductor-bypass validation** — a circuit with an unwired Neutral pair on an FCU used to score 100%. A per-device port-connectivity check now catches bypassed conductors and unwired components, with RCD/RCBO imbalance wording where it matters.
- **Compound-fault honesty** — a masking verdict now *replaces* the optimistic proposal row instead of merging with it, so the rage summary cannot claim a compound that does not exist.
- **Tier escalation** is honest by burden (faults to find never decrease, hints are never restored), not by modifier count.
- **Cable sizing sized cold cables** — fixed (see §6). The length slider no longer rounds 500 m to 501 m, and a rejected input is marked stale instead of showing a stale result as current.

## 9. Accessibility, icons and dark mode

Full keyboard navigation, reduced-motion support throughout, a colour-blind-safe canvas preset, and a real dark theme across the app and the entire website. Every emoji pictograph in the simulator and on the site was replaced with **inline vector artwork** — identical on every OS and browser, no emoji-font dependency, no missing-glyph boxes. As part of that work the icon table was moved out of the initial bundle, so the app's first payload actually got *smaller* while gaining the icons.

## 10. Web platform work

Strict per-route Content-Security-Policies, security headers everywhere, 301 redirects for every moved page (the old `/blog/` release notes now land on [`/updates/`](/updates/), and the retired Explorer URLs land on the Explore page), unique per-post social cards, a site-wide instant search (⌘K on the site too), an "Open Circuit" 404, and an installable offline PWA for the simulator itself.

**About Explore:** the 3D historical laboratory is being rebuilt for v2.1. The old URLs redirect cleanly, and [/explore/](/explore/) now says exactly that — coming soon, no teasers pretending otherwise.

## 11. What's new in v2.0.1: Bug fixes & user experience refinements

Version 2.0.1 brings helpful visual polish, smarter navigation, and bug fixes across both the website and the circuit simulator:

- **Instant search category filters:** Clicking any category filter (Calculators, Guides, Articles, Updates) inside the search dialog now filters the list immediately even before you start typing.
- **Continuous glowing release popup:** Re-engineered the animated release text with a seamless gradient sweep so the glow animates continuously without stopping or stuttering.
- **One tip per visit on calculators:** The Voltage Drop Calculator now greets you with a single, clear tip when the page loads, rather than continuously cycling tips in the background. Refreshing the page brings up another helpful tip.
- **Direct circuit loading from guides:** When clicking a circuit guide link from the website, ElectraSim now asks if you'd like to load the circuit onto your workbench immediately.
- **Balanced tutorial walkthroughs:** Centered the initial tutorial step on both mobile and desktop screens, and fixed a step transition so no steps are skipped.
- **Centered settings window:** Adjusted the settings panel so it stays neatly centered on your screen, and cleaned up the About tab.
- **Neat component labels:** Adjusted label padding and font sizes so component names and ratings fit inside their boxes without overflowing.
- **Seamless page transitions & faster prefetching:** Enabled instant view transitions and background prefetching for rapid navigation across articles, guides, and tools.
- **New interactive calculator guide:** Published an in-depth visual guide on how to calculate cable sizes and voltage drop interactively.

---

ElectraSim 2.0 is live now at [electrasim.com/app](/app/) — nothing to install, nothing to sign up for, and it keeps working offline after the first visit.

> <span class="em em-bulb" role="img" aria-label="tip"></span> **New here?** Start with the Student tour (offered on first launch), then try a Guided Circuit — the protected lamp is a five-minute build. When that feels comfortable, the Diagnosis Lab is where the real learning starts.
