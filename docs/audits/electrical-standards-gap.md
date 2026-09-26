# Electrical Standards Gap Audit — V3 Phase 1

> **Revised:** 2026-09-26, after live publisher searches/page reads and repository inspection. Supersedes the previous audit's automatic EVSE B→C fix, universal 230 V country-equivalence claim, and “IEC has no freshness gap” conclusion.
> **Scope:** Verify published editions and public guidance; identify implementation gaps. This is not a clause-by-clause certification of the simulator. No simulation scores, benchmarks or tests were rerun during this documentation revision.
> **Ownership:** Electrical rules remain code-owned under master plan §32; super admin and paid membership cannot change them at runtime.

## 1. Web evidence register

Sources below were read on **2026-09-26**. IET and IEC pages were readable directly; NFPA's article/product content was read from its page's embedded `__NEXT_DATA__`. IEC's public Webstore search was queried for `60364-1`, `60364-8`, `60364-7-722` and `62955`, then the relevant product pages were checked. General search engines returned bot challenges or unrelated results and are not evidence for these conclusions.

| ID | Authoritative source | What it establishes / limit |
|----|----------------------|-----------------------------|
| S1 | [IET — Ensure you are up to date with BS 7671](https://electrical.theiet.org/bs-7671-18th-edition-wiring-regulations/ensure-you-are-up-to-date-with-bs-7671/) | A4:2026 is published. Brown Book A2:2022 plus A3:2024 remains valid until **15 October 2026**. Lists stationary secondary batteries, ICT functional earthing, PoE and medical-location changes. Check errata too. |
| S2 | [IET — BS 7671:2018+A4:2026 publication](https://shop.theiet.org/requirements-for-electrical-installations-iet-wiring-regulations-eighteenth-edition-bs-7671-2018-a4-2026) | Consolidated A4 publication, available from **15 April 2026**; edition metadata, not evidence that our model implements every amendment. |
| S3 | [NFPA — NFPA 70, National Electrical Code](https://www.nfpa.org/product/nfpa-70-national-electrical-code-nec/p0070code) | **2026 edition** is available; public product information does not expose all normative clauses. |
| S4 | [NFPA — NEC enforcement maps](https://www.nfpa.org/education-and-research/electrical/nec-enforcement-maps) | Issued 20 August 2025, effective as an NFPA publication 9 September 2025. The page's August 2026 adoption snapshot includes multiple editions and local adoption; publication does not equal nationwide legal adoption. |
| S5 | [IEC 60364-1:2025](https://webstore.iec.ch/en/publication/63699) | Edition 6, published **5 September 2025**, replaces 2005. Fundamental principles/scope/definitions have been revised. |
| S6 | [IEC 60364-8-81:2026](https://webstore.iec.ch/en/publication/93036) | Published **12 February 2026**; energy-efficiency part replaces **IEC 60364-8-1:2019**. The old audit's 8-1 reference was outdated. |
| S7 | [IEC 60364-8-82:2022+AMD1:2026 CSV](https://webstore.iec.ch/en/publication/113148) | Consolidated edition 1.1, published **16 April 2026**; prosumer installations. The base edition replaced 8-2:2018. |
| S8 | [IEC Webstore — 60364-7-722 search](https://webstore.iec.ch/en/catalogsearch/result/?q=60364-7-722) | Publisher search returned the 2018 EV-installation edition, distinct from equipment requirements in IEC 61851. A public abstract does not validate every EV protection rule. |
| S9 | [IEC 62955:2018](https://webstore.iec.ch/en/publication/32963) | Scope of residual DC detecting devices for permanently connected mode-3 AC EV charging equipment; distinct from generic RCD or MCB curve selection. |
| S10 | [IET — EV charging FAQs](https://electrical.theiet.org/bs-7671-18th-edition-wiring-regulations/faqs/electric-vehicle-charging-installations-faqs/) | Explains charging-point RCD requirements, equipment verification and earthing. **Explicitly based on A1:2020**, so use as background, not proof of all A4 clauses. |
| S11 | [IET — Earthing and bonding FAQs](https://electrical.theiet.org/bs-7671-18th-edition-wiring-regulations/faqs/earthing-and-bonding-faqs/) | Ze examples 0.8 Ω TN-S, 0.35 Ω TN-C-S and 21 Ω TT are **typical**, with actual values dependent on the supply/site. Not universal compliance limits. |

Use publisher sources rather than Wikipedia to pin editions. Public abstracts and older FAQs cannot verify full current normative tables, device-specific instructions or local amendments. Mark those checks pending in the implementation audit; do not fill missing evidence with an internal simulator score.

## 2. Global coverage policy

There is no single worldwide installation rule set. Separate international principles, national/regional adoption, product standards and actual supply characteristics. Identical voltage/frequency or plug shape does not establish identical protection, cable-sizing, earthing or inspection requirements.

| Current profile | Verified reference baseline | Phase 1 representation |
|-----------------|-----------------------------|------------------------|
| `uk` | BS 7671:2018+A4:2026; transition in S1 | UK teaching profile with explicit implemented coverage and reference edition. Do not call pre-transition A3 automatically invalid. |
| `us` | NFPA 70-2026; local adoption varies (S3–S4) | US teaching profile; identify 120 V simplification and unmodelled split-phase/device rules. Jurisdiction and adopted edition are separate metadata, not guessed from country. |
| `eu` | IEC 60364 series / HD 60364 context; S5–S7 identify IEC editions only | Harmonized teaching profile. HD/national editions and deviations were not fully verified in this pass; no claim of EU-wide regulatory equivalence. |
| `int` | Generic IEC principles, S5–S9 | Label **IEC teaching profile**, not coverage of every 230 V country. Country-specific compliance is unsupported until separately researched and tested. |

Do not equate Australia/New Zealand, India, South Africa, Pakistan or other countries with this generic profile. Canada likewise is not covered by choosing a NEMA socket. Dedicated national profiles are future work requiring their own authority, adoption record, tables and fixtures; this revision does not claim to verify all countries.

Keep plug selection independent for teaching. Store/display the selected plug family, supply and rule profile honestly; a plug-family selection must not relabel the model as nationally compliant. Wire colors need an accessible distinction between real conductor identification and display-theme colors.

Planned code-owned reference metadata: publisher, document/part, edition/amendment, source URL, checked date and coverage notes. A series has multiple references, not one global edition. Any modeled jurisdiction needs its own adoption metadata. D1 remains a read-only projection. Update marketing/tool copy only to the level of behavior actually implemented.

## 3. Repository findings and corrected decisions

Inspected paths include `src/domain/standards.ts`, `zsCheck.ts`, `faults.ts`, `types.ts`, the component registry, simulator/store entry points, the current audit and master plan. Historical test/census claims in the old audit are not fresh measurements. The full numerical review of `electricalCalculations.ts`, `tripCurves.ts`, compliance rules and Astro calculators remains part of 1.0/1.1.

| ID | Finding / evidence | Correct Phase 1 action |
|----|--------------------|------------------------|
| G1 — frequency | `StandardPreset.frequencyHz` provides 50/60 Hz, but current model coverage does not establish an AC impedance solver | Show frequency and model limitations; inspect all numerical consumers before claiming AC behavior. Phasor/time-domain work needs its own fixtures. |
| G2 — EVSE | `recommendCurveForLoad()` groups `ev-charger` and `induction-hob` with motors. Previous audit treated its own warning as proof that every EVSE needs C-curve protection | **Withdraw that inference.** Curve selection needs actual equipment/inrush and applicable protection requirements. MCB curve B/C/D and RCD Type AC/A/F/B are different concepts. S9/S10 establish residual-protection context, not a universal C-curve mandate. Review A4 Section 722 and manufacturer requirements before selecting a modeled device. |
| G3 — installation method | Existing audit identifies C/B1/A method data and a wire setting, with weak discoverability | Recheck supported cable types/method mappings, then surface method and assumptions in Inspector Wiring. Do not describe three classroom methods as full Appendix 4 coverage. |
| G4 — cable/drop arithmetic | Existing audit reports 70 °C tables, an aluminum factor and fallback resistance approximations | Preserve tests as a regression baseline; verify source cable construction, conductor material and temperature separately. “Tests pass” does not certify all tables. Astro tools and simulator must share the verified helper. |
| G5 — residual thresholds | `standards.ts` uses 30 mA for UK/EU/INT and 6 mA for US | Describe 6 mA as a simplified Class A GFCI boundary, not a universal trip curve. Device type, required locations, response times and waveform coverage need separate validation. Do not apply IEC RCD timing automatically to UL/NEC contexts. |
| G6 — breaker curves | Presets assign IEC-style B/C/D curves even under `us`; old audit declared trip curves globally correct | Limit that model to its documented device family. A US voltage/label does not turn an IEC device into a UL-listed breaker model. Recheck normative tables/manufacturer data before new numerical claims. |
| G7 — earth-fault loop | `zsCheck.ts` hardcodes 230 V, UK CPC pairings, TN defaults, 0.95/0.8 factors and 0.4 s, with no standard argument; TT is absent | Model **U0 (line-to-earth)** separately from line-to-line voltage. A normal 230/400 V system uses 230 V for this loop calculation. Do not simply replace 230 by 120 and call the UK algorithm NEC compliant. Scope results to supported earthing/device/circuit cases. |
| G8 — plug vs rules | `PLUG_SYSTEMS` controls palette sockets, independently of `StandardId` | Preserve independent selection with clear scope. No claim that matching a plug or nominal voltage demonstrates national compliance. |
| G9 — derating | Old audit describes a single combined `deratingFactor` | Mark as a teaching approximation; expose its assumptions. Do not pretend it implements every grouping/ambient/insulation correction. Verify dimensional/numerical behavior during 1.1. |
| G10 — residual waveform types | `RCDType` has AC/A/F/B; `faults.ts` and simulator contain a special `smooth-dc-residual` path | Current behavior is not wholly type-blind. Inventory generic timing vs special-case detection; do not claim full waveform/DC-blinding or RDC-DD coordination simulation. Paid injection cannot rewrite device physics. |
| G11 — national equivalence | `standards.ts` explicitly says other 230 V countries have identical rules; EU/INT citations lack per-part versions | Remove the equivalence claim; use §2 coverage metadata. Correct IEC references via S5–S7; national variants remain unverified. |
| G12 — rating/drop policy | `recommendMcbrating()` applies 1.25 to all presets and labels it NEC/BS guidance; `voltageDrop` uses 3% lighting / 5% power everywhere | Separate load/installation policy from blanket multipliers. Check UK design-current/protective-device/cable relationships and NEC continuous-load and branch/feeder guidance against the applicable editions. Universal 3% lighting / 5% power is not a verified NEC policy. Treat as review-needed until supported fixtures exist. |
| G13 — regional diagnostic prose | `faults.ts` contains fixed 230 V, brown/blue, 30 mA and UK regulation statements | Parameterize actual supply and applicable labels; avoid teaching those values as universal. Preserve clear free warnings even when an advanced exercise is locked. |

### G7: TT and unsupported results

Presence of an RCD alone must not make a TT assessment pass. Earth electrode/protective conductor resistance, residual operating current, applicable touch-voltage criterion, required disconnection time and circuit conditions all matter. The commonly taught `RA × IΔn <= 50 V` check is not a complete design check and its applicability must be reviewed; do not confuse typical supply Ze with the installation's RA or silently default either to 21 Ω.

Phase 1 can return **not assessed / missing inputs** with explanatory warnings for unsupported TT, US device or other cases. It must not present a generic green pass. Numerical extensions require cited current rules and independent test examples; the exact TT time/limit is not verified by the public FAQ used here.

### G2: EV template acceptance

Do not require the same 7.4 kW / 32 A UK charging template to score 100 under UK, US and EU settings. Supply assumptions, device standards and charging arrangements differ. Validate only its declared supported profiles, or provide explicit regional variants. A B-curve warning caused by our load classifier is a software-policy discrepancy, not itself evidence of a regulatory violation.

## 4. Implementation order and gates

1. Correct unsupported claims and metadata first: national-equivalence text, current IEC parts, BS transition, NEC adoption and fixed regional diagnostic prose. Mark reference edition separately from implemented coverage.
2. Add explicit applicability/unsupported states for loop checks and device profiles. Missing TT inputs or unmodelled US protection cannot yield compliance success.
3. Revisit EVSE classification and rating/drop rules with current normative/device evidence. Never change a number merely to satisfy an internally generated compliance score.
4. For each verified numerical change, create independent fixtures: normal supported example, boundary, deliberate violation, unsupported case and regression of existing behavior. Test U0 vs line-to-line handling, model-specific device limits and supply-specific diagnostic values.
5. Reuse helpers in simulator/tooling, update code-owned reference metadata and seed D1 through migrations; super admin remains read-only. Recheck public sources/errata before the eventual release.

A passing model check means only that the scenario satisfies the checks actually implemented under its stated assumptions. It is not a certificate of installation compliance. Paid and free users receive the same electrical truth; access policy only controls the available exercise/component features.

Implementation evidence and remaining numerical limits: [Phase 1.1 implementation](phase-1-standards-implementation.md). Continue under the [revised Phase 1 plan](../phases/phase-1-simulator-core.md). All gates are local; no remote deployment is authorized by this audit.
