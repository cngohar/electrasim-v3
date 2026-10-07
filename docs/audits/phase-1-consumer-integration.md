# Phase 1.5F.1 — current consumer evidence

Date: 2026-10-07. Status: **complete locally within the documented consumer scope**.

## Result identity and assessment

`simulate()` now returns `inputRevision`, an exact canonical serialization of
the normalized electrical inputs. Geometry and editor selection are excluded;
source settings, device states/models, conductor properties, faults and saved
failures are included. Object-key and component/wire ordering do not affect the
identity. Missing identity, a different input or an obsolete model cannot serve
as current evidence. This metadata is not authorization: Hono still calculates
and authorizes the submitted document itself.

`simulationEvidence.ts` separates current results, bounded operation evidence
and finding-free evidence. `simulationReadings.ts` reads a named terminal pair
from the actual scalar or complex result, retaining independent references and
unavailable values. No nominal supply is substituted for a terminal reading.
Model/engine versions and circuit schemas remain unchanged because the numerical
models are unchanged; guide completion records advance to version 2.

## Consumers and editing

- Inspector and Fault Lab discard readings from a different circuit. Analytics
  now displays actual component/branch readings through the shared inspector.
  The hidden nameplate-power calculations, random noise, guessed power factor,
  voltage-derived frequency and fabricated waveforms have been removed.
- Circuit validation keeps structural/design findings but adds a nonblocking
  current-calculation warning when supplied evidence is missing or stale.
  Declarative functional rules cannot pass unsupported LED/sounder behavior,
  including a claimed zero-output success. Construction progress stays visible,
  with a model-gap explanation rather than a wiring-error explanation.
- Guide checklists require the complete circuit snapshot, preserved authored
  source/device models and current finding-free evidence. Supply/rating edits,
  component deletion/replacement by a new identity and cached results do not
  earn completion. Ordinary switch/dimmer operation and layout changes remain
  valid learning actions. Version-2 history stores model/engine/input identity;
  earlier timestamps are retained and labeled as earlier checklist history.
  Neither history badge is a current safety assessment.
- EIC export recalculates its snapshot, records calculation versions/status and
  suppresses passing design verdicts for unsupported operation, active faults
  or saved damage/trips. Existing unsupported national/earthing cases stay
  unassessed. These are educational design estimates, not measured certificates.
- Fault Lab and component/wire context menus share applicability guidance for
  all 14 fault types. The phone panel can target a named terminal. Unsupported
  conductor pairs, leakage impedance, DC residual waveforms and arc detection
  are explained explicitly. Existing imported wire-break identities retain
  their original physical cut semantics; guidance restricts new role-specific
  injections to matching conductors.
- Clearing a fault record, resetting a breaker to OFF and replacing a failed
  item remain separate actions. Simulation-tab replacement uses the same stopped
  repair action as Fault Lab. Context-menu logging follows successful authorized
  mutation. Unassessed legacy observations no longer persist invented trips or
  damage, or create the old automatic-trip/arc-blinding alert flow in the app.
  Supported timed events retain their post-event projection and current identity.

`isFaultRemoved()` is explicitly bookkeeping, including deletion.
`isFaultResolved()` additionally requires current supported evidence and an
existing, undamaged target. Full authored operating-point repair/scoring remains
F.2. The tagged legacy `faultsCleared` observation remains a compatibility input
for unmigrated generators; it is not accepted by the migrated assessment consumers.

## All shipped guides

These are observed default documents, not blanket lesson or protection passes.
All 20 are replayed through Bun/workerd and real browser Comlink. The DOL motor
runs within its declared teaching equivalent; its safety/repair verdict remains
unassessed. No shipped default guide obtains finding-free completion while its
remaining model findings are present.

| Guide | Default calculation scope |
|---|---|
| simple-lamp | Legacy qualitative LED observation; numerical load unassessed |
| one-way-light-switch | Legacy qualitative LED observation; numerical load unassessed |
| two-bulb-parallel | Legacy qualitative LED observation; numerical loads unassessed |
| two-way-staircase-light | Legacy qualitative LED observation; numerical load unassessed |
| dimmable-lighting | Converged declared resistive RMS dimming |
| rcd-earth-fault-demo | Legacy observation; numerical load/protection assessment unassessed |
| contactor-motor | Legacy observation; motor/coil operation unassessed |
| timer-bell | Legacy observation; undeclared timer/sounder behavior unassessed |
| push-button-doorbell | Legacy momentary continuity; sounder behavior unassessed |
| rcbo-protected-socket | Legacy observation; numerical test load/protection assessment unassessed |
| pro-3phase-dol-starter | Converged declared phasor motor/contactor; motor running |
| pro-ev-charger-circuit | Legacy observation; numerical EV load unassessed |
| pro-solar-dc-system | Unsupported device models; no invented measurements |
| pro-underfloor-heating | Converged fixed-resistance heating; remaining control findings explicit |
| pro-staircase-timer | Legacy observation; undeclared timer/load behavior unassessed |
| pro-pir-floodlight | Converged declared resistive load/static contacts; automatic sensor behavior unassessed |
| pro-cooker-induction | Legacy observation; numerical induction load unassessed |
| pro-spd-consumer-unit | Unsupported device models; no invented measurements |
| pro-generator-backup | Legacy observation; unmigrated load behavior unassessed |
| pro-afdd-bedroom | Legacy observation; numerical load/arc clearing unassessed |

## Local acceptance

Reproducible command: `bun run verify:phase-1.5f1`. The runner supports focused
stages and resumes. Every required stage has passing evidence across the
initial run, impact-scoped corrections and final checks; no uninterrupted green
default run is claimed.

- All project typechecks and the **155-module** pure domain boundary passed.
- The final comprehensive unit run passed **135 files / 2,185 tests**. Authored
  guide/export and model-gap feedback checks also passed focused runs.
- Final build/asset/link/SEO/CSP checks passed: initial JavaScript **251,292 B gzip /
  300,000 B**, CSS **26,004 B / 30,000 B**, links for **193 HTML files** and SEO
  for **191 pages**. Repository lint passed across **773 files**. Evidence:
  `.wrangler/phase15f1-final-{gate,typecheck,lint}.log`.
- **821 exact Bun/workerd cases** passed, including 21 consumer/guide replays:
  `.wrangler/domain-tests-a3WmEH/`.
- **18 actual local Worker/D1/cookie groups** passed:
  `.wrangler/membership-tests-X84DgF/`.
- All **47 unique Chromium cases in nine files** passed across the initial run
  and focused corrections. The initial run passed 41 and exposed model-gap
  feedback/menu labels, old diagnostic/demo run paths and a five-second DOL
  wait. The focused seven-case run passed six, including unchanged desktop/phone
  DOL assertions; the last short-circuit case passed after following the existing
  Pro teacher/demo action. No browser deadline or electrical assertion was
  weakened. Logs: `.wrangler/phase15f1-{simulator-browser,browser-focused,short-final}.log`.

The existing numerical assertions passed. Series median/p95: **1.19 / 2.84 ms**;
isolated transformer **0.82 / 1.35 ms**; cascade **1.13 / 1.84 ms**. Dense
200–256-component cases measured **52.94–78.09 ms median / 68.61–132.74 ms p95**.
The dense solver and 60 fps rendering targets remain open, with no changed budget.

F.2 migrates basic/advanced Diagnosis Lab and Ohmageddon grading, generation and
authorized replay. F.3 retires the legacy runtime and runs the full `verify` and
three stress suites. This F.1 record does not close those gates. All services and
persistence were local; no Cloudflare account operation, remote resource/test,
deployment, database migration or Git push occurred.
