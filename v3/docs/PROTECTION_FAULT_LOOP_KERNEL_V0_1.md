# Protection and fault-loop kernel v0.1

**Status:** implemented educational kernel; not a design, inspection, certification, or compliance tool
**Reviewed:** 2026-09-25

## Boundary of responsibility

The implementation deliberately separates four layers:

1. **Shared physics** — complex RMS phasor network solution, source/branch resistance and reactance, fault current, voltage, power, thermal integration, I²t, and deterministic chronology.
2. **Product-standard behavior** — conservative public IEC 60898-1 B/C/D envelopes, IEC residual timing envelopes, or caller-supplied manufacturer curves. Product models carry a reference and confidence category.
3. **Installation evaluation** — versioned rule-pack identifiers and distinct earthing profiles. v0.1 reports topology and physical evidence but does not certify an installation.
4. **Jurisdictional compliance** — explicitly **not evaluated**. Sharing 230 V / 50 Hz does not make Pakistan, the UK, or another IEC-derived jurisdiction legally interchangeable.

Every standards-derived protection result includes its model family, reference identifier, confidence (`standards_envelope` or `educational`), clearing time, maximum observed current, and interruption assessment. Missing evidence remains `not_evaluated`; the kernel does not invent a favorable verdict.

## Network and fault-loop model

The MNA solver now uses complex impedance `Z = R + jX` for:

- supply winding Thevenin impedance;
- breakers and residual devices;
- line, neutral, CPC/PE, source bond, and electrode conductors;
- impedance-bridge faults.

Fault current is therefore an outcome of the solved network. The source-reachability filter remains in place so passive disconnected islands do not create singular rows. Bonds and short circuits retain small, positive, finite impedance; ideal zero-ohm branches are unsupported.

The fault-loop fixtures explicitly contain a source neutral-earth bond, source/electrode path, CPC or enclosure branch, source impedance, conductor impedance, and the fault bridge. An open CPC is a real open branch. It can produce nearly zero fault current while leaving an enclosure near line potential, which is reported as persistent danger rather than safety.

Supported physical demonstrations:

- line-neutral short;
- TN-S line-earth fault;
- TT line-earth fault with or without residual protection;
- high-impedance earth fault;
- open/missing PE and energized enclosure;
- failed protection;
- downstream B16/upstream C32 clearing order.

The earthing registry keeps `TN-S`, `TN-C-S`, `TT`, `IT`, and `north_american_grounded` separate. TN-S and TT were the v0.1 fixtures. The subsequent v0.2 slice adds dedicated TN-C-S, IT, and North American grounded-system fixtures while continuing to report complete jurisdictional compliance as `not_evaluated`; see `EARTHING_AND_RULE_EVIDENCE_V0_2.md`.

## Protection behavior

### IEC 60898-1 household/similar MCB

B, C, and D are distinct and are not generic labels:

| Curve | magnetic band represented by standard category |
| --- | ---: |
| B | 3–5 × In |
| C | 5–10 × In |
| D | 10–20 × In |

v0.1 evaluates a conservative maximum-time envelope from public standard/manufacturer guidance: no guaranteed operation below 1.45 In, 3,600 s at 1.45 In, 60 s at 2.55 In for the represented ≤32 A fixtures, and 0.1 s at the upper magnetic threshold. Log interpolation provides deterministic educational timing between anchors. It does **not** claim to reproduce a particular breaker’s complete tolerance band, let-through energy, current limiting, ambient derating, or manufacturer curve.

IEC 60947-2 industrial breakers are not assigned IEC 60898 B/C/D behavior. They use the separate manufacturer-curve input.

### UL 489

A UL 489 device must provide manufacturer/listing time-current points. The kernel does not relabel it as B, C, or D and does not synthesize a universal UL curve. The launch 120 V fixture contains a conspicuously named `UL489-DEMO-15A-v1` educational curve so legacy overload animation remains deterministic; it is not design data.

### Residual protection

The IEC instantaneous educational envelope uses maximum times of 300 ms at 1 × IΔn, 150 ms at 2 ×, and 40 ms at 5 ×. The TT fixture uses a 30 mA residual device and clears its solved 6.24 A earth fault at the 40 ms envelope (represented as a 30 ms event timestamp because state advances in 10 ms intervals beginning at `t=0`).

North American Class A GFCI remains a separate model. Public OSHA material describes approximately 5 mA ±1 mA. v0.1 treats less than the configured 5 mA threshold as no pickup and uses a conservative public maximum of 1.5 s once picked up. This is an educational public envelope, not a substitute for a listed product curve or UL 943 evaluation.

## Results exposed

Each deterministic run exposes:

- prospective and present fault current;
- enclosure touch potential where the modeled node supports it;
- cumulative I²t;
- fault state: inactive, energized, cleared, or persistent danger;
- damage-before-isolation;
- product model, reference, confidence, pickup/trip chronology, and clearing time;
- maximum observed protective-device current;
- interrupting-rating comparison when an interrupting rating is supplied.

Conductor temperature and damage still use the existing educational lumped thermal model. The kernel does not yet evaluate adiabatic cable equations, peak asymmetrical current, arc energy, current-limiting let-through curves, electrode voltage gradients, body current, or a legally permitted touch duration.

## Renderer-neutral chronology and visible behavior

Domain events now include fault inception, solved current rise, enclosure hazard, protection pickup/timing, trip or failure, arc interruption, de-energization, conductor heating/damage, and persistent danger. SVG consumes snapshot fault state rather than deriving safety from CSS.

The simulator scenario picker includes line-neutral, TT/RCD, high-impedance earth, open-PE, and failed earth-fault demonstrations. The SVG presents a flashing arc/halo and a live-enclosure warning. `prefers-reduced-motion: reduce` removes animation while retaining the static fault symbol, red enclosure outline, status text, numeric evidence, and timeline. A persistent energized fault remains red and explicitly says that isolation has not been achieved.

## Sources and evidence classification

Only public pages and public manufacturer guidance were used; licensed standards text is not reproduced.

- [IEC 60898-1:2015/AMD1:2019 product page](https://webstore.iec.ch/en/publication/62129) — scope and edition identity.
- [IEC 60898-1 consolidated product page](https://webstore.iec.ch/en/publication/3855) — household/similar AC breaker scope.
- [Schneider Electrical Installation Guide: circuit-breaker characteristics](https://www.electrical-installation.org/enwiki/Fundamental_characteristics_of_a_circuit-breaker) — public B/C/D magnetic categories and distinction from IEC 60947-2.
- [ABB comparison of tripping characteristics](https://library.e.abb.com/public/114371fcc8e0456096db42d614bead67/2CDC400002D0201_view.pdf) — public IEC/EN 60898 thermal/magnetic envelope table.
- [Schneider guide: TN earth-fault calculation](https://www.electrical-installation.org/enwiki/TN_system_-_Earth-fault_current_calculation) — loop impedance and minimum-fault-current principle.
- [Schneider guide: TT principle](https://www.electrical-installation.org/enwiki/TT_system_-_Principle) — TT residual-protection principle and electrode relationship.
- [Schneider guide: TT practical aspects](https://www.electrical-installation.org/enwiki/TT_system_-_Practical_aspects) — public 1×/2×/5× residual timing table.
- [Schneider guide: TT/TN/IT characteristics](https://www.electrical-installation.org/enwiki/Characteristics_of_TT,_TN_and_IT_systems) — separate protective principles.
- [IEC 61008-2-1:2024 product page](https://webstore.iec.ch/en/publication/67976) and [IEC 61008-1 product page](https://webstore.iec.ch/en/publication/4262) — RCCB scope and current/time characteristic context.
- [OSHA electrical-hazards educational material](https://www.osha.gov/sites/default/files/ElectrHaz_ActivityOptAB.pdf) and [OSHA electrical library](https://obis.osha.gov/dte/library/electrical/electrical.html) — public Class A GFCI threshold description.
- [OSHA UL 943 interpretation](https://www.osha.gov/laws-regs/standardinterpretations/1992-02-10) — public current-dependent timing context, including up to 1.5 s at 15 mA in the cited edition/context.

## Reproduction

```bash
cd v3
npx --yes bun@1.4.2 test tests/simulator-domain.test.ts
npx --yes bun@1.4.2 run check
```

Golden tests cover complex source/loop current, TT residual clearing, open-PE danger, damage with inadequate protection, downstream selection, and IEC/UL model separation.
