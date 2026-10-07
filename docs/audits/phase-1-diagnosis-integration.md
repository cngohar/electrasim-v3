# Phase 1.5F.2 — Diagnosis Lab and Ohmageddon

Date: 2026-10-07. **Status: complete locally within the documented teaching assessment scope.**

## Generation and assessment

New diagnosis generation uses version **3**, with current engine/model versions,
`diagnosis-profile-score-1` and exact healthy/faulted electrical revisions pinned
in the authored scenario. Six reviewed topologies use incandescent resistive
loads, manual switches, declared MCB/fuse teaching laws and a declared AC coil.
The supported pool covers protected/switched lighting, two-way/branched
lighting, distribution and contactor control. Earlier bell, fan, inferred outlet
consumption and undeclared timer recipes remain historical; they do not enter
new graded exercises. This is a bounded operation assessment, not a safety or
standards certificate. Unknown operating ranges and damage laws remain explicit.

Basic recipes and faults are selected before generation. Advanced and Ohmageddon
attempts retain fresh membership authorization and server-owned answers,
counters and results. New attempts reject older generator versions. No database
schema or migration is required.

Every generated fault must have a supported target and a solo solved effect on
an authored load. Simulator error labels alone are insufficient. This applies
to initial selection, compound partner replacements and misleading-symptom
replacements. All compound claims still require a masked pair and a changed
visible symptom after the masking fault is removed. Modifiers that alter actual
load operating points are discarded; approximate equality uses a bounded numeric
tolerance. Unsupported decoys cannot enter the accepted baseline.

## Repair and replay

Identification and removal remain distinct from recovered operation. The shared
evaluator recalculates both snapshots, requires current supported results and
checks the authored source inventory, component identities/types, ratings,
declared models, every terminal-to-terminal connection and resolved conductor
properties. Geometry/routing and equivalent replacement cables are allowed.
Different device identities, deletions, extra bypass wires, supply/variant/rating
edits, persistent damage, trips and unassessed calculations cannot earn recovery.
Named load voltage/current/power and source identities must match the baseline;
equal energization counts cannot substitute for operating points.

All faults must be named before success, even on an already repaired circuit.
Correct identification of one fault in a compound exercise remains progress;
partial repair remains incomplete. Live symptom feedback uses the same recovery
boundary instead of announcing health from the absence of an observable symptom.

Share codes carry generator, assessment, model, engine and profile/scoring
versions. Current codes replay deterministically. Mismatched assessment versions
cannot silently produce a new graded result. IndexedDB resume uses the original
saved scenario and repair circuit. Older snapshots remain available with grading
blocked. Hono GET retains the scenario/circuit and reports its assessment issue;
obsolete submissions/hints/expiry are refused without new penalties. Authorized
checkpoint and abandonment remain available, preserving prior elapsed time.
Existing accepted historical scores are retained as historical evidence.

Diagnosis readiness labels use neutral path guidance, including screen-reader
text and the review dialog, without changing measurements or Run restrictions.
The repair button awaits the authorized circuit mutation before logging its
outcome. Blocked attempts cannot use the submit/repair controls. No new electrical
model, numerical engine version or simulator format version is introduced.

## Local acceptance

Reproducible command: `bun run verify:phase-1.5f2`. Every required stage has
passing evidence across the initial comprehensive run and impact-scoped final
checks; no single uninterrupted green default run is claimed.

- All project typechecks, the **158-module** pure-domain boundary and repository
  lint passed. The final local commit also runs the normal type/format hooks.
- Comprehensive unit run: **136 files / 2,175 tests**. Final affected diagnosis,
  generator, access, persistence and editing run: **22 files / 473 tests**.
  The smaller current generated recipe pool replaces earlier unsupported
  recipe acceptance; historical topology/registry checks remain.
- Final build, asset/link/SEO/CSP checks passed: **251,339 B gzip initial JS /
  300,000 B**, **26,004 B CSS / 30,000 B**, 193 HTML link checks and 191 SEO pages.
- **849 exact Bun/workerd cases** passed, including 28 diagnosis/Ohmageddon
  grading replays with original authored documents. Final evidence:
  `.wrangler/domain-tests-i6saJw/`.
- **20 real local Worker/D1/cookie groups** passed, including actual authored
  repair, compound recovery and obsolete snapshot cases. Evidence:
  `.wrangler/membership-tests-4cM0HJ/`.
- All **35 unique Chromium cases in five files** passed across the 33-case
  aggregate pass and focused corrections. New desktop repair/reload, phone
  compound repair, obsolete snapshots and actual Comlink replay passed.
  The initial Comlink fixture reconstructed inputs from a canonical fingerprint,
  changing serialized state order; it now replays the original document with
  the exact result assertion retained. The earlier narration test failed to
  stop simulation between exercises. Following diagnostic Run and Stop exposed
  readiness labels leaking an answer name; neutral diagnosis labels fix that
  actual defect. All narration assertions and deadlines remain unchanged.

Logs: `.wrangler/phase15f2-{gate,runtime,browser-focused,narration-final,
final-unit,final-types,final-assets}.log`.
The unchanged numerical benchmark measured series **0.94 / 1.75 ms** median/p95,
isolated transformer **0.73 / 1.42 ms**, cascade **0.74 / 1.19 ms** and dense
200–256-component drawings **45.04–66.31 / 53.14–101.86 ms**. Dense solver and
60 fps renderer targets remain open.

All services and persistence were local. No dependency, lockfile, database
migration, live-site test, Cloudflare account/credential/resource operation,
deployment or Git push occurred. F.3 legacy retirement, full `verify` and the
three stress suites remain open before effects.
