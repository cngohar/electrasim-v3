# Phase 1.5E.1 — Source catalogue, editing and application phasor readings

Date: 2026-10-06. Status: complete locally within the scope below; acceptance passed
across the main checks and focused reruns. No uninterrupted full-gate pass is claimed.

## Scope

The catalogue now has 116 components. The new free `ac-three-phase-supply` has canonical
L1/L2/L3/N/PE indices 0/1/2/3/4 and its own saved source profile. Defaults are 230 V RMS L-N,
50 Hz, ABC; a document voltage or waveform edit does not rewrite it. Existing single-phase
source terminals and saved IDs remain intact. SVG artwork and palette thumbnails use a distinct
five-terminal source housing; the instance marking follows configured voltage and sequence.

The named source’s confirmation dialog stages voltage, frequency and ABC/ACB sequence, then
uses the existing Cancel/Apply/Review/Undo transaction and running/exercise locks. Both L-N and
L-L inputs edit the same source: persisted voltage is L-N, and L-L = √3 × L-N. Entering 400 V
L-L saves 400/√3 V L-N. Edits preserve wire indices/properties/faults, device nameplates, the
document supply and unrelated independent sources. Existing L/N aliases cannot become a
three-phase source through a supply-kind edit or a silent terminal remapping.

`simulate()` dispatches explicitly compiled phase systems to the separate complex RMS solver.
The application, real Comlink worker and existing local Hono simulation endpoint return `phasor`
and `phasorComponents`; no scalar `electrical`, `componentCalculations`, protection step,
simulation clock or thermal state is fabricated. Shared model/capability version is **1.5e.1.1**;
contract 1, file schema 2 and engine **mna-phasor-resistive-1** are unchanged.

The inspector shows named source L-N/L-L pairs, complex-current magnitudes and angles, signed
active power, vector-summed neutral current, measured resistive-load compatibility and finite
conductor losses. Gauge potentials are labeled separately from endpoint voltage. Independent
AC systems may have different frequencies in separate galvanic domains; cross-reference voltage
is unavailable and joining unsynchronized sources is unsupported.

## Boundaries

This slice supports the E.0 resistive star/delta/static-contact network and adds portable sources,
editing and readings. Operation, automatic protective clearing, damage, repair and installation
assessment remain unassessed. `faultsCleared` stays false for these snapshots, and validation
retains an explicit assessment warning. Phasor magnitudes never enter scalar residual/protection
logic. Unknown motor, timed coil/timer/dimmer, transformer and DC cases remain guarded by the
phasor solver; source edits still preserve independent DC blocks in a drawing. Mixed three-phase
and DC numerical integration is not claimed.

**E.2** still owns the declared motor model, phase loss/sequence diagnostics and phasor-aware
contactor/pole/residual operation. **E.3** owns DOL migration and the full three-phase gate;
**1.5F** owns complete lab/result/scoring migration and legacy retirement. Dense solver/rendering
targets remain open. All work follows root `AGENTS.md`; no remote operation is authorized.

## Local acceptance

Command: `bun run verify:phase-1.5e1`. It runs repository type/lint/unit checks, builds,
asset/link/SEO/CSP checks, existing MNA benchmarks, exact Bun/workerd parity, real local
Worker/D1/cookie acceptance, and E.1 plus existing MNA/damage/supply/editing/relay Chromium
cases. Logs are retained under ignored `.wrangler/phase15e1-*.log`.

Required checks passed on the final implementation:

- All project typechecks, the **144-module domain boundary** and repository lint. Strict core
  checks passed **15 files / 408 tests**, including the 33 numerical phasor cases and eight
  portable source/application cases.
- **133 Vitest files / 2,139 tests** across the full suite and the unchanged 53-test simulation
  file rerun. The full run's only failure was its existing 50 ms performance smoke threshold
  (56.92 ms while other CPU-heavy gates were running); the isolated file passed in 1.45 s.
  No timing budget or assertion changed.
- Vite/Astro/postbuild, performance, internal links across **193 HTML files**, SEO across
  **191 pages** and CSP. Initial JavaScript is **250,843 B gzip / 300,000 B**, CSS
  **26,165 B / 30,000 B**. Budgets are unchanged from the approved E.0 baseline.
- **726 exact Bun/local workerd parity cases**, including all ten catalogue phasor fixtures.
  Evidence: `.wrangler/domain-tests-zVRjcd/`.
- **16 real local Worker/D1/cookie groups**. Nine free phasor scenarios match portable domain
  results; D1 round-trips the full normalized circuit, 400 V L-L/ACB settings, source type,
  neutral terminal indices and saved open-wire fault. Paid/ownership/revocation and existing
  numerical/control/protection/damage/diagnosis cases passed. Evidence:
  `.wrangler/membership-tests-mnKhyC/`.
- **28 unique Chromium cases in six files** across the broad run and two unchanged focused
  damage/repair reruns. All five new source cases passed: free placement/artwork, confirmed
  edits/Cancel/Undo/Redo/IndexedDB recovery, actual Comlink inspector readings and run locks,
  phone controls, and exact direct-domain/Comlink/local-Hono parity including guarded motors.
  The broad run passed 26 cases; two existing damage cases hit their overall 30 s deadlines.
  The isolated rerun passed both in 11.1 s and 13.2 s without changing deadlines or assertions.

The first aggregate command stopped on two SVG template-style lint findings. Those were fixed
before the final type/lint/core/unit/build/runtime/browser checks above. The new D1 test also
initially compared the GET circuit to a nonexistent POST response field; it now compares the
full GET circuit to the normalized input. The entire Worker/D1 gate then passed. Aggregate
acceptance is recorded explicitly rather than describing these split runs as one green command.

Existing MNA benchmark assertions passed. Median/p95: series **1.34 / 2.24 ms**, isolated
transformer **0.98 / 2.10 ms**, cascades **0.78 / 1.50 ms**. Dense 200–256-component cases
measured **50.94–71.45 ms median / 66.39–108.29 ms p95**; the existing dense solver and
60 fps rendering targets remain open.

Inspected desktop and **390 × 844** phone screenshots at
`.wrangler/phase15e1-source-{desktop,phone}.png`. The artwork and scrollable source editing
dialog fit their viewports, and browser checks verify the calculated readings and successful
phone Apply. Logs are under `.wrangler/phase15e1-{types-final,lint-final,core-final,unit,
unit-regression,build,parity-final,simulator-rerun,browser-final,browser-regression,benchmark}.log`.
No dependency, lockfile, database migration or remote resource changed. No Cloudflare account,
credential, live-site test, deployment or Git push occurred.
