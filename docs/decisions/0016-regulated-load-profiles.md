# ADR 0016 — Versioned load profiles and bounded regulated-power calculation

Date: 2026-10-15. Status: **implemented and functionally accepted locally through combined evidence**.
The user authorized all milestones in one workflow. This decision does not renew
any existing phase acceptance or performance exception.

## Problem and scope

The five electronic lamps originally resolved to `unassessed-load`. The existing
linear MNA/phasor solvers cannot infer a driver from a wattage label. Preserve the
accepted fixed-resistance models and add an explicitly declared electronic law.
The first delivery covers terminal input power and operating state; it does not
model an LED junction, rectifier, fluorescent discharge or driver switching.

The reproducible [116-entry inventory](../audits/data/phase-1.12-catalogue.json)
and [family specification](../specs/phase-1.12-model-families.json) assign all 31
unassessed placement defaults, with milestone ownership, laws, parameters,
missing data, example circuits and acceptance cases. Existing contact/control
conditions remain visible independently of numerical model presence.

## Profile contract

Propose `ComponentState.electronicLoadProfile` with this strict, versioned shape:

```json
{
  "version": 1,
  "kind": "regulated-input-power",
  "provenance": {
    "kind": "teaching-assumption",
    "profileId": "generic-mains-lamp",
    "revision": 1,
    "overrides": []
  },
  "nominalVoltage": 230,
  "inputPowerWatts": 9,
  "operatingVoltageRange": { "min": 207, "max": 253 },
  "operatingRangeOrigin": "nominal-ratio",
  "supply": { "kind": "ac-single-phase", "frequencyHz": [50, 60] },
  "powerFactorModel": "ideal-unity",
  "offPowerWatts": 0,
  "dimming": "unassessed"
}
```

These are the implemented schema-3 profile fields; generic defaults remain teaching assumptions.
Reject unknown versions/kinds/fields, non-finite values, unsupported component
types and a nominal voltage outside the positive ordered operating band. Bound
nominal/band voltages to 0.001–100,000 V and positive input power to
0.001–100,000 W. Frequencies are a nonempty unique subset of 50/60 Hz for this
profile revision. The initial off-power field must be exactly zero; nonzero
standby needs its own accepted branch law. Deep-copy nested values at every
store/normalization boundary. Authored maximum-voltage/current ratings remain
separate, including when unknown.

`operatingRangeOrigin` is `nominal-ratio` or `instance`; ratio-origin ranges must
match 0.9/1.1 times nominal within numeric serialization tolerance.
`provenance.overrides` is a unique subset of `nominalVoltage`, `inputPowerWatts`
and `operatingVoltageRange`. The initial provenance kind/profile ID/revision are
the exact generic teaching identity above. Explicit limits set instance origin
and retain their override even when their values happen to equal a default.

The generic defaults for the five lamps are 230 V nominal, 207–253 V operating,
50/60 Hz sinusoidal AC, the catalogue's 9/15/10/12/36 W electrical input, ideal
unity PF, no standby consumption and no accepted electronic dimming. The ±10%
band, off rule and input waveform are **editable teaching assumptions**. They
are not a manufacturer tolerance, destruction threshold or universal lamp law.
All five types keep their identity, canonical ports, tier and artwork.

The unity-PF scope is deliberate. One [Signify 9 W product
specification](https://www.signify.com.cn/zh-cn/prof/led-lamps-and-tubes/led-bulbs/philips-essential-led-bulbs/929002299209_EU/product)
lists 220–240 V, 50–60 Hz, 75 mA, PF 0.5 and no dimming. That product is **not**
the generic profile. Nominal current and true PF alone do not determine a
harmonic waveform or a displacement angle. Do not silently turn true PF into
reactive current. [MEAN WELL's driver
guidance](https://led.meanwell.com/qa.aspx?c=9) also distinguishes LED driving
methods, voltage regions and load-dependent PFC. Neither source establishes
constant input power, exact shutdown limits or the generic profile's defaults.
An actual manufacturer profile requires its own sourced law/data and acceptance.

## Electrical law and operating states

For an accepted scalar signed terminal voltage `v`, an on-state lamp consumes
`i=P/v`, `p=v*i=P`. For a sinusoidal AC terminal pair use magnitude for the
operating band and in-phase current; reversed terminal orientation changes
current/voltage signs while consumed real power stays positive. In a complex
RMS system the unity-PF branch law is `I=P*V/|V|²`. A source may be three phase
while the lamp is a valid two-terminal L-N branch; establish that branch's
actual excitation before accepting it. The single-source preview does not
establish three-phase runtime support.

States are on, undervoltage-off, overvoltage-off and disconnected. An accepted
off branch has exactly zero current. An above-band off state never means the
device survived or was damaged. Open terminals may have undefined relative
voltage; return unavailable values rather than assigning source voltage. DC,
unsupported frequency, mixed excitation and a sampled dimmer waveform remain
explicitly unassessed. A conducting full-level dimmer is also subject to a
declared compatibility rule; do not grant LED dimming from its label.

State selection uses **solved terminal voltage**, not document/source magnitude.
A branch whose on and off candidates cannot satisfy the same declared band is
unavailable. Do not report a success with zero watts merely because an iteration
crossed a threshold. Default profiles have no temporal startup or hysteresis;
adding those changes requires a versioned timed contract.

## Numerical method for 1.12.1

Keep the current linear path for graphs with no new branch laws. For a graph
containing regulated branches, extend the shared numerical assembly with a
bounded damped Newton method on the actual circuit equations. Scalar derivative
is `di/dv=-P/v²`; complex assembly needs the real/imaginary Jacobian of the
same complex law. Preserve transformer constraints, finite wire impedance,
source identities and all established limits. An iterated positive resistance
may be an initialization aid; it is never the accepted lamp law or fallback.

Use deterministic component-ID ordering. Proposed ceilings: 64 Newton iterations
per candidate, 12 residual-decreasing line-search halvings, 16 state-selection
passes, and the existing unknown/allocation/work limits. Numerical initialization
must be finite and bounded by the configured profile; any temporary seed
conductance or continuation parameter must reach the exact declared circuit
before acceptance. Singular, contradictory, repeated-state, allocation-limit,
non-finite and exhausted solves return named unavailable/nonconverged diagnostics.
They expose no accepted measurement set or energized lamp.

Require residual and step tolerances, not merely a small update:
`1e-9 A + 1e-8*currentScale` for KCL, `1e-8 V + 1e-8*voltageScale` for voltage
constraints, and `1e-8 W + 1e-7*powerScale` for conservation. Reuse stricter
existing verifier requirements where applicable. Validate every final branch
against its original nonlinear law; evaluate signed source power and each finite
wire loss. No nameplate estimate may substitute after numerical failure.

Regulated loads can admit multiple roots or no operating point. The first
implementation must select the high-voltage continuation branch from the
declared nominal seed and diagnose a fold/marginal Jacobian; it cannot claim
dynamical stability or a physical startup path. This is consistent with the
known negative incremental impedance of constant-power loads, discussed by
[Machado et al.](https://arxiv.org/abs/1809.04920); the reference is context,
not evidence that our future solver converges.

Do not silently relax existing whole-document unsupported-model checks. Known
off/disconnected new profiles have a declared law; an unknown consuming branch
still prevents an accepted whole-circuit solve unless a separate, tested
isolation rule is deliberately introduced.

## Independent numerical oracle

For one unity-PF regulated load behind total wire resistance `R`, independently
solve `V² - Vs*V + R*P = 0`. The high branch is
`V=(Vs+sqrt(Vs²-4RP))/2`, `I=P/V`, `Pwire=I²R` for positive source orientation.
For `R=0`, a 9 W profile at 230 V gives 0.0391304347826087 A. For a 12 V teaching
profile with `R=2 Ω`, `P=10 W`, the high branch is exactly 10 V, 1 A and 2 W
wire loss. At `Vs=20 V`, `R=10 Ω`, `P=10 W`, the repeated root is marginal;
above 10 W there is no real on-state root. These are test expectations, not
production-solver output.

The independent [reference module](../design/lamp-driver/reference.mjs) implements
only this one-lamp oracle and preview. Node tests cover five powers, finite
feeders, reversed orientation, boundaries, collapse, invalid supply and open
return. The production runtime must not import it. Future parity must compare
actual domain/Comlink/local Worker results to independent values, never just two
calls to the same solver.

## Persistence, editing and evidence

Introduce **file schema 3** when the profile is integrated: accept schema 1/2
through explicit migration, write schema 3 with full profiles, and preserve IDs,
ports, wire routes, groups, custom ratings, sources, faults and persistent damage.
Old importers must reject the new schema instead of silently dropping a driver
profile. Browser/D1 drawings use the same validated normalization path; do not
rewrite stored drawings during this specification milestone.

During migration the five lamp types without a profile receive the versioned
generic teaching profile, with explicit `customVoltage` and `customPowerWatts`
preserved as authored inputs. For a legacy custom nominal voltage, generate its
default ±10% band; do not change the connected supply or infer DC suitability.
Invalid legacy values produce actionable setup errors; they are not clamped or
discarded. Existing explicit profiles are preserved, validated and deep-copied.

The existing nameplate editors and the new profile editor must commit one atomic
coherent electrical edit. An automatically derived band follows nominal voltage;
an explicitly authored band stays authored and must include the new nominal.
Once integrated, the profile owns its input parameters; compatibility mirror
fields cannot diverge. An explicit profile plus a different legacy custom
voltage/power is a **validation conflict**, not an instruction to overwrite
either value. Return an actionable request to choose the intended profile;
retain the rejected original document for correction. Atomic application edits
update an existing mirror with the canonical profile value. An absent mirror
can remain absent. A raw schema 1/2 file claiming new profile fields is rejected
rather than treated as a valid old file. Existing browser/D1 documents without
an export envelope use the same absent-profile migration and conflict checks.
Undo/Redo/import/export must restore the complete profile and electrical revision.

On first numerical integration, use electrical model/capability version
`1.12.1.0`, scalar engine `mna-regulated-1` and phasor engine
`phasor-regulated-1` where those paths consume the new law. Preserve more specific
control/dimming engine identities through their own versioned dispatch. Retain
the outer contract version only if its units and existing field meanings remain
backward compatible. New branch laws and operating states still require explicit
contract review. Profile/mode changes participate in configuration/input identity;
accepted-result guards, tools, Fault Lab captures, worker replies and presentation
must reject old-model or stale-input evidence. Saved transient energization is
never proof of operation. Shared domain/Comlink/local Hono implementations and
membership-independent physics remain mandatory.

## Implemented families and delivery boundary

The user authorized all milestones in one workflow on 2026-10-15. The versioned
family matrix is implemented by `catalogueProfiles.ts`, `profileSolver.ts`, strict
shared validation, schema-3 migration and the existing Detailed model settings
window. The standalone analytic reference remains independent of production.

Running and composite impedances retain their declared electrical current outside
the running band. That state is `outside-running-band`, and the renderer cannot
claim running. Regulated demand is zero outside its declared band. Standby draws
its explicitly declared power without an active lamp/motor/sounder appearance.
No speed, stall current, shaft efficiency or automatic cycle is inferred.

The prototype specified the lamp extension before production work. Actual native
source and built workflows, direct/Comlink/Hono parity, independent equations and
full regression/static evidence are required by the [implementation audit](../audits/phase-1-missing-component-calculation.md).

### Additional primary documentation reviewed

The following documents establish physical distinctions, not our generic numeric
parameters or manufacturer validation:

- [Sandia PVPMC point-value models](https://pvpmc.sandia.gov/modeling-guide/2-dc-module-iv/point-value-models/sandia-pv-array-performance-model/)
  describe irradiance/temperature-dependent points on the I-V curve. Our three-point
  interpolant is a declared simplification, with editable zero temperature coefficients.
- [Schneider Electric transformer definitions](https://www.se.com/us/en/faqs/FA123708/)
  distinguish an electrically connected autotransformer from an isolated winding pair.
- [Littelfuse varistor application note 9771](https://www.littelfuse.com/~/media/electronics_technical/application_notes/varistors/littelfuse_selecting_a_littelfuse_varistor_application_note.pdf)
  distinguishes continuous RMS ratings, transient peak clamping and current-dependent
  V-I curves. Our RMS-envelope shunts do not simulate those transient waveforms.
- [TI NTC design note](https://www.ti.com/lit/pdf/SBAA338A) and
  [Murata NTC characteristics](https://www.murata.com/en-us/products/thermistor/ntc/overview/basic/characteristic)
  document temperature-dependent resistance and beta approximations. R25=10 kΩ and
  beta=3950 K remain editable teaching choices without measured sensor provenance.

The shared contract/model version is `1.12.1.0`; file schema is 3. Existing source,
coil, timer, protection and damage profile versions retain their own meanings.

The NTC beta exponential uses a fixed range reduction and 20-term series over the
validated parameter domain, avoiding runtime-specific `Math.exp` last-bit differences.
Independent Math.exp checks bound relative error below 2e-14 at the selected
beta/temperature/resistance extremes; exact direct/Comlink/Hono comparisons pass
in Chrome, phone Chrome and Safari without result rounding or parity tolerances.
