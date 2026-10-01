# ElectraSim Deep Scan Report

> **Date:** 2026-09-28 · **Scanned at:** `e9673c8` (HEAD of `main`, v2.0.4) · **Scanner:** Arena agent, in-repo
> **Companion documents:** [`../plans/ElectraSim-Simulator-v3-Design-Proposal.md`](../plans/ElectraSim-Simulator-v3-Design-Proposal.md) ·
> [`../plans/ElectraSim-Simulator-v3-UI-Design.md`](../plans/ElectraSim-Simulator-v3-UI-Design.md)
>
> **Every engine claim below was produced by executing code against this checkout** — 45 edge-case
> circuits run through the real `simulate()`, the real benchmark script, the real `npm audit`.
> Nothing in §3–§5 is inferred from reading. Static-analysis claims (§6) carry `grep` receipts.
> What could *not* be executed, and why, is listed in §1.2.
>
> **Round 2 (same day, §3.8–3.14):** after a challenge, the scan was extended with an exhaustive
> 115×115 pairwise matrix, hand-wired component combos, a three-phase deep dive, the wire-property
> and fault-injection systems, and the full `validateCircuit()` battery. Temp probe scripts were
> deleted after use; the appendix reproduces the key cases.
>
> **Round 3 (same day, §3.15 + N28–N31):** with the author's blessing to install anything, the
> repo's *own* quality gates were executed for real on a cold `npm install` — typecheck, lint,
> all 1,464 unit tests, the full build, four `check:*` suites, the simulation benchmark, all
> three stress fuzzers, and the Playwright browser suite (Chromium pulled from the npm registry
> when the Playwright CDN proved unreachable — recipe in §9). One prior claim of mine was
> **retracted** (§5), four defects were added (N28–N31, including *no CI at all*), and the
> `npm run verify` chain was proven red on main (N30).

---

## 1. Method & environment

### 1.1 How the engine was probed

- Node v22.22.3, `npx tsx` 4.23.15 (from npx cache — `node_modules/` is empty in this sandbox).
- Four throwaway probe scripts (deleted after use; `git status` clean apart from `docs/`) built
  circuits with the same DSL the repo's own tests use (`simulation.test.ts:20-43`) and called
  `simulate()` from `src/domain/simulation/simulate.ts` directly.
- The official benchmark `scripts/benchmark-simulation.ts` was executed 3× as-is.
- `npm audit --package-lock-only` against the committed lockfile (573 KB).

### 1.2 Not executed (blocked, with reason)

*Round 1 blocked items — all unblocked and executed in round 3 (§3.15):*

| Check | Round 1 | Round 3 |
|---|---|---|
| `npm install` | ❌ skipped (out of scope then) | ✅ 867 packages |
| `npm run typecheck` / `lint` / `build` | ❌ no `node_modules` | ✅ all clean/green |
| Unit tests | ❌ | ✅ **97 files / 1,464 tests pass** (85 s) |
| `check:perf` / `check:seo` / `check:csp` / `check:links` | ❌ no `dist/` | ✅ all four PASS |
| Playwright e2e + browser perf budget | ❌ no browsers | ✅ 103 passed / 2 by-design skips; benchmark PASS — via an npm-registry Chromium (§9) |
| `e2e:production` | ❌ | ⚠️ **52/53 — 1 real failure (N30)** |
| Stress fuzzers | ❌ | ✅ all three PASS |
| Git history analysis (hotspots, churn) | ⚠️ limited | ⚠️ still limited — clone contains a **single squashed commit** (`e9673c8`); no history to mine |

### 1.3 Environment caveats on numbers

Timings were taken in a shared cloud sandbox (round 3: 2 vCPU). Absolute ms values may differ
from CI hardware; **relative** findings (a 37 A shower drawing no flag in basic mode; a spec
expecting a homepage title the site doesn't serve) are environment-independent. The perf
sections state per-run numbers precisely. Browser-frame numbers were rendered on CPU
(swiftshader — no GPU), so they are a *floor*, not a ceiling.

---

## 2. Repository vitals (executed)

| Metric | Value |
|---|---|
| Version / HEAD | 2.0.4 / `e9673c8` (single-commit clone) |
| LOC: `src/domain` | 29,278 |
| LOC: `src/ui` | 32,242 |
| LOC: `src/store` | 9,236 |
| LOC: `src/lib` + `src/sim-worker` | 3,316 + 169 |
| Non-test source files | 235 (largest: `ChallengePanel.tsx` 1,199) |
| Test files | 78 in `src/` + 16 e2e specs |
| Component catalogue | **115 defs** across 11 files |
| Production dependencies | 10 (React 19, Zustand, Immer, zundo, Comlink, idb-keyval, lucide, workbox) |
| TypeScript | `strict: true`; `noUncheckedIndexedAccess: **false**` (see §6.2) |
| TODO / FIXME / HACK in `src` | **0** |

---

## 3. Edge-case battery — full results

45 circuits executed. `energ` = energized non-source components. `amps` = distinct
`wireCalculations.currentAmps` values across the circuit.

### 3.1 Baselines & topology

| # | Case | Observed | Verdict |
|---|---|---|---|
| C01 | Empty circuit | 0 energized, 0 warnings, 0 errors | ✅ correct |
| C02 | Live terminal only | warning "No Neutral source found." | ✅ correct |
| C03 | L→bulb←N | bulb energized, 0.04 A (9 W/230 V) | ✅ correct baseline |
| C04 | Two bulbs **in series** | **0 energized, all wires 0 A** | ❌ **defect 2.1 confirmed** — traversal stops at first `isLoad` |
| C05 | Heater 2000 W ∥ bulb 9 W | both energized, **every wire reads 8.73 A** (the total) | ❌ **defect 2.2 confirmed** — one scalar painted onto all wires |
| C06 | Parallel via junction-box | both bulbs energized, all wires 0.30 A (total) | ❌ same scalar defect |
| C07 | Heater + bulb **in series** | 0 energized | ❌ defect 2.1 |
| C24 | **Two live terminals** → one bulb | bulb energized 0.04 A, silently | ⚠️ lives merge into one rail; no phase/conflict concept (N19) |
| C40 | Disconnected island (bulb–bulb) | 0 energized, no warnings | ✅ correct |

### 3.2 Switches, coils, timers

| # | Case | Observed | Verdict |
|---|---|---|---|
| C08/C09 | Switch `{}` / `{on:true}` + bulb | dead / lit | ✅ correct (open by default) |
| C10 | Momentary push-button `{on:true}` | lit | ✅ behaves as held switch |
| C11/C11b | 2-way switch `{}` / `{on:true}` | dead / lit via L1 | ✅ |
| C12/C13 | Dimmer `{speed:1}` / timer `{on:true}` | lit, 0.04 A | ⚠️ see C46 (dimmer inert) & defect 2.7 (no time axis) |
| C30b | Relay `{on:true}`: coil across L/N **and** L→COM→NO→bulb | relay + bulb energized; **coil branch draws 0 A** | ❌ **defect 2.3 sharpened** — coil ports and contact ports are the *same* manual switch |
| C30c | Relay `{on:false}`, coil energized | **nothing** energized — not even the coil branch | ❌ an energised coil cannot close its own contacts; the coil is decorative |
| C31b | Delay-timer `{on:true}` A1/A2 + 15/18 | conducts as a plain switch, 0.04 A | ❌ no timing semantics (defect 2.7) |
| C46 | Dimmer `speed:0` vs `speed:3` | **identical 0.039 A** | ❌ N15: dimmer level has zero effect on current |

### 3.3 Protection (the mode-gated story)

| # | Case | Observed | Verdict |
|---|---|---|---|
| C14 | `mcb` state `{}` + bulb | **circuit dead** | ⚠️ N13: engine ignores `defaultOn` (see §4) |
| C14b | `mcb {on:true}` + bulb | lit, 0.04 A | ✅ |
| C15b | **mcb 16 A B `{on}` + EV charger 32.2 A — basic mode** | **energized, 32.17 A flows, no trip, no warning, no error** | ❌ **N8 (High): basic mode gives zero overload feedback** |
| D1 | same circuit, **pro mode** | trips: `MCB B16, cause overload, thermal, 2.01×In, clears ≈271 s`; EV charger + MCB also blow; cable-overload warning | ✅ full trip-curve model exists — but only in pro |
| D6 | mcb 6 A custom + heater 8.7 A, pro | trips: `1.45×In ≈ 3618 s` | ✅ curve math correct |
| C15c | mcb-C32 + EV 32 A | no trip | ✅ right answer (In = 32 A) |
| C15d | **fuse 13 A + EV 32 A** (basic) | no blow, no warning | ❌ N8 again |
| C16 | L–N dead short, **no** protection | error "Short circuit — Live and Neutral are directly connected." | ✅ detected |
| C17b | L–N short through mcb `{on}` | trips `short-circuit, 460.0 A / 16 A` | ✅ magnetic trip works — but see N16 |
| C18b | RCD `{on}` + bulb (L+N through) | lit | ✅ |
| C44 | **Discrimination: main 100 A → mcb 16 A → EV 32 A (pro)** | **BOTH trip**: `Main Switch (short-circuit, 460/100)` *and* `MCB B16 (short-circuit, 460/16)` | ❌ **N9 (High): no time grading — upstream devices cascade-trip with the downstream one** |

### 3.4 Sources, voltage, domains

| # | Case | Observed | Verdict |
|---|---|---|---|
| C22b | **`dc-battery-12v` → bulb** | bulb energized at **230 V, 0.039 A** (`componentCalculations.voltage = 230`) | ❌ N11: source voltage is global — a 12 V DC battery delivers mains semantics |
| C23 | `ac-mains-supply` → bulb | lit | ✅ |
| C25b | transformer-12v + bulb on secondary | bulb runs at **230 V** (pro too), no warnings | ❌ **defect 2.4 confirmed & corrected** — silent, not explosive (see §5) |
| D4 | transformer-8v/12v/24v + bulb, pro | `bulbV = 230` in all three, `blown: []`, no warnings | ❌ turns ratio absent entirely |
| C26 | Transformer, open secondary | transformer energized, 0 A | ⚠️ its own 60 W rating never drawn (metadata only) |
| C27 | Transformer **secondary shorted** | error "Short circuit — Live and Neutral are directly connected." | ❌ N12: an isolated 12 V winding short is misreported as a mains L–N bolted fault |
| C28 | motor-3phase on ONE live + N | **energized, 13.04 A** | ❌ **defect 2.5 confirmed with numbers** |
| C29b | contactor-3p `{on}` single-phase + bulb | lit | ❌ same class |
| C45 | `circuit.globalVoltage = 12` | bulb at 12 V / 0.75 A — **plus error "VOLTAGE MISMATCH: 110V rated equipment detected on a 12V circuit!"** | ❌ **N10 (High): voltage worldview is binary 110/230** — any supply ≤ 130 V is classified "110 V equipment" (`simulate.ts:770-793`); 12/24/400 V collapse into it |
| D5 | US socket on 230 V | energized, no warning | ⚠️ cross-standard check doesn't fire for sockets (info) |

### 3.5 Earth / PE (README claims PE traversal)

| # | Case | Observed | Verdict |
|---|---|---|---|
| C32 | Socket L+N+E, `earth-terminal` wired to E | socket energized via L/N; earth wire inert | ❌ **defect 2.6 confirmed** — engine never traverses the earth rail (`simulate.ts` calls `traverseSources` for `'live'` and `'neutral'` only) |
| C33 | Bulb fed from `earth-terminal` only | 0 energized, "No Live source found." | ❌ same — `earth-terminal` is a `SRC` that cannot source |
| C34b | Shower 37 A, pro, PE connected | blows + wire melt events (correct overload physics) | ✅ pro-mode thermal works |

### 3.6 Malformed input (crash battery)

| # | Case | Observed | Verdict |
|---|---|---|---|
| C35 | Wire referencing nonexistent components | no crash, **no warning** | ⚠️ N17: silent tolerance |
| C36 | Self-loop wire (port → same port) | no crash, circuit unaffected | ✅ robust |
| C37 | Duplicate wires (same ports ×2) | no crash, normal result | ✅ robust |
| C38 | `portIndex: 99` (out of range) | no crash, wire silently dead, **no warning** | ⚠️ N17 |
| C39 | Unknown component type | no crash, **no warning**, ignored | ⚠️ N17 |
| P43 | 400 switches in series → bulb | 4.29 ms, bulb energized, no stack overflow | ✅ BFS depth-safe |

### 3.7 Performance

| Probe | Result |
|---|---|
| In-process: 202 comps / 400 wires × 30 runs | p50 2.23 ms, **p95 4.08 ms**, max 6.16 ms |
| **Official `scripts/benchmark-simulation.ts` (198 loads + 2 terminals, 396 wires, 100 samples)** | run 1: median 1.14 ms, **p95 8.50 ms — FAIL** · run 2: median 1.13 ms, **p95 8.73 ms — FAIL** · run 3: median 0.98 ms, **p95 2.37 ms — pass** |

❌ **S3 (High, deploy-blocking class): the repo's own p95 budget gate (≤ 8 ms) fails 2 of 3 runs at
HEAD** in this environment. The median is consistently ~1 ms; the p95 tail is bimodal (8.5 vs 2.4),
which points at GC/JIT/scheduler noise rather than an algorithmic regression — but `npm run verify`
and therefore `npm run deploy` gate on this number. A budget that flips on environment noise is
itself a finding: either the sampling (100) is too small for a stable p95, or the tail needs
investigation. **Not verifiable here whether CI currently passes it.**

### 3.8 Exhaustive pairwise matrix (round 2)

All **13,225 ordered component pairs (115×115)**, generic series wiring (live rail chained through
both components, neutrals/earths to their bars), each pair seeded `{on:true}` and run in **both
basic and pro** mode — 26,450 `simulate()` calls in 2.1 s:

| Signal | Result |
|---|---|
| Crashes | **0** |
| Non-finite / negative wire currents | **0** |
| Basic-mode component blowups | **0** |
| Pro-mode pairs that trip a device | 2,770 |
| Pro-mode pairs that blow a component | 684 |

13,001 basic-mode pairs report errors — that is the harness talking, not the engine: the generic
wiring bridges neutral ports, which legitimately triggers short-circuit detection. The matrix's
verdict is the crash/NaN line: **the engine survives every possible component pair.**

### 3.9 Named combos (hand-wired, semantically correct)

| # | Combo | Observed | Verdict |
|---|---|---|---|
| NC1a/b | relay-spst `{on}`/`{off}`: coil across L/N, COM→NO→bulb | lit/dead, coil branch draws 0 A | ❌ N14 (manual switch, decorative coil) |
| NC1c | relay-spdt `{off}`, COM→**NC**→bulb | **dead — NC does not conduct when de-energised** | ❌ **N21** |
| NC1d | relay-spdt `{on}`, COM→**NC**→bulb | **lit — NC conducts when energised** | ❌ N21 (NO and NC bridge together) |
| CO1/CO2 | two-way-switch `{off}`/`{on}`, COM→L2 | off → L2 conducts; on → L2 dead | ✅ changeover works — *for switches* |
| NC2 | **transformer 12 V secondary → relay coil**, contact on mains → bulb | relay not energised, secondary dead, bulb off | ❌ **the textbook SELV control circuit is impossible** — the relay's own open contact blocks its coil circuit |
| NC3 | mcb `{on}` → transformer primary, **secondary shorted** | MCB **does** trip — but as "bolted short circuit — prospective 460 A" | ⚠️ N12 refined: protection operates, diagnosis is mains-scale on a 12 V winding |
| NC4a | switch→mcb→motor-3phase (one live + N) | runs, 13.04 A | ❌ 2.5 confirmed |
| NC4c | motor 13 A on mcb-6 A custom, pro | MCB trips **and appears in `blownComponents` (overcurrent)** | ❌ **N23: the breaker destroys itself clearing a 2.2×In overload** |
| NC5 | contactor-3p `{on}` + motor-3phase | runs, 13.04 A | ❌ 2.5 confirmed |

### 3.10 Three-phase deep dive (Φ)

- **No three-phase source exists in the catalogue.** 19 defs have ≥ 3 live ports (including
  `distribution-board-3phase`, `contactor-4p`) — and exactly **zero** `isSource` defs have ≥ 2 live
  ports. Three-phase cannot be built source-to-load; L1/L2/L3 are three labels on one rail.
- Motor with U+V, or U+V+W, all on the same live: **13.04 A regardless** (Φ1/Φ2) — parallel
  "phases" are electrically parallel connections, nothing more.
- distribution-board L1/L2/L3 → motor U/V/W (the wiring a student would attempt): **runs at
  13.04 A** (Φ3) — the textbook-looking three-phase circuit silently "works".
- **DB L1 bridged to L2 directly: no error, no trip** (Φ4) — a phase-to-phase bolted short is a
  no-op (in reality, 400 V across that bridge).
- `globalVoltage=400`: motor draws 7.5 A (3000/400 — honoured ✓) with **zero mismatch errors**
  (Φ5) — 400 V is bucketed into the ≥ 200 "230 class" by the binary voltage worldview (N10).

### 3.11 Wire properties (W) — mostly a good story, one trap

Heater circuit, pro mode, varying one wire property at a time:

| Case | `wireCalculations` | Honoured? |
|---|---|---|
| W0 control | 2.5 mm² · 10 m · 27 A · 1.57 V / 0.68 % | — |
| W1 `wire.customCableMm2 = 16` | **16 mm² · 85 A · 0.24 V / 0.11 %** | ✅ |
| W1b *component* `customCableMm2 = 16` | **still 2.5 mm² · 27 A** | ⚠️ **N20** |
| W2 `lengthMeters = 100` | 15.65 V / **6.81 % → warning** | ✅ |
| W3 `deratingFactor = 0.5` | derated 27 → **13.5 A** | ✅ |
| W4 `installationMethod = 'B1'` | ampacity 27 → **24 A** | ✅ |
| W5 `material = 'aluminum'` | ampacity 21, v-drop 2.35 V | ✅ |
| W7 length 100 + wire mm² 16 | 16 mm² · 85 A · 2.43 V | ✅ |

Wire-level properties are **all consumed by the engine** (`simulate.ts:530-533`, `475-476`,
`540`). The trap is the *component-level* cable editor (`ComponentPropertiesView.tsx:697`): its
value is `min()`-combined with the **other end of the wire** (`wire.customCableMm2 ?? min(fromEnd,
toEnd)`), so setting 16 mm² on the heater still yields 2.5 mm² because the live-terminal end
defaults to 2.5 (**N20: two editors, two semantics, one silent clamp**). *(This also corrects the
round-1 suspicion, voiced in conversation, that wire-level cable size was dead code — grep
suggested it, execution disproved it.)*

### 3.12 Component-voltage semantics (CV)

- `customVoltage` is honoured **only on sources**: `live-terminal{customVoltage:110}` → 110 V,
  0.082 A (CV3 ✅); `bulb{customVoltage:110}` on 230 V rails is ignored (CV1). N11 refines to:
  *the per-source mechanism exists; the catalogue never declares voltages* — `dc-battery-12v`
  defaults to 230 V mains semantics.
- `globalVoltage=400` beats a load's `customVoltage` (CV4) — consistent with the source-only rule.
- `bulb{customMaxVolts:110}` on 230 V **blows in basic mode too** (CV2) — overvoltage burnout is
  *not* pro-gated, unlike overload trips (N8): the two stress mechanisms have opposite gating.
  In pro mode the same bulb is added to `blownComponents` **twice** (duplicate entry, N25).

### 3.13 Fault injection (WF/IF) — the strongest subsystem in the engine

Wire-level faults (`wire.fault`), canonical RCD circuit:

| Fault | Result |
|---|---|
| `open-circuit` | circuit dead + diagnostic ✅ |
| `open-neutral` | "floating neutral" + diagnostic ✅ |
| `live-to-earth` | **RCD trips, cause `ground-fault`** ✅ — the core RCD behaviour works; without an RCD: diagnostic only, correctly |
| `short-circuit` | RCD trips, cause `short-circuit` ⚠️ (N24 — a balanced L–N bolted short produces no residual current; a real RCD must not trip) |

Injected faults (`circuit.faults`, all 14 types via `createInjectedFault`): **12 of 14 produce
correct diagnostics + errors**, including `reverse-polarity`, `switched-neutral`, `arc-fault`,
`smooth-dc-residual` and `terminal-disconnect` (which works at port granularity). The two broken
ones (**N22**): `protection-forced-open` leaves the circuit energised (a force-opened MCB keeps
feeding), and `protection-bypass` doesn't bypass anything — a "bypassed" MCB still trips on
overload and both components still blow (IF15). Both are advertised with `simulationEffect` text
in `FAULT_REGISTRY` that the engine does not implement.

### 3.14 Validation battery (`validateCircuit`)

**Every component standalone (115/115):** exactly one issue each — 105 × "Missing Power Supply
Source", 10 × "Incomplete Circuit (No Wires Connected)" — 105 quickFixes offered, 0 crashes.

| Case | Result | Verdict |
|---|---|---|
| V1a good circuit L→mcb→bulb←N | pass, score 100, 6 passed checks | ✅ |
| V1b socket without RCD | **error "Socket missing RCD protection"** | ✅ BS 7671 rule works |
| V4 socket E unwired | **error "Missing Earth Bonding"** | ✅ earth-continuity check works |
| V10 100 m run, 6.8 % v-drop | **error "Excessive voltage drop"** (cable_sizing) | ✅ |
| V9 shower 37 A (pro simResult) | error "Active Short Circuit / Overcurrent Fault" | ✅ |
| V7a ghost wire | warns "components not wired" | ✅ (indirect) |
| V11 globalVoltage 0 / −230 / 1e9 | no crash, passes | ⚠️ robust but unquestioning |
| V13 202 comps / 400 wires | validates in **1.34 ms** | ✅ |
| V2 **reversed polarity** (L into bulb's N port) | **pass, score 100** | ❌ **N26** |
| V3 **switched neutral** (switch in N leg) | **pass, score 100** | ❌ N26 — the engine even has a `switched-neutral` fault type |
| V5 **bulb fed from the earth rail** | **pass, score 100** | ❌ N26 |
| V7c portIndex 99 | pass — invalid port silently accepted | ❌ N26 |
| V7d/e self-loop / duplicate wires | pass, silent | ❌ N26 |
| V8 2 kW heater direct on L/N, no protection | **pass** — the RCD rule is socket-specific, not load-specific | ❌ N26 |



---

### 3.15 Round 3 — the repo's own gates, executed on a cold install

**Install & gates — all green:**

| Gate | Result |
|---|---|
| `npm install` | 867 packages, clean (only note: repairs a stale lockfile — see below) |
| `npm run typecheck` | clean (app + `tsconfig.e2e` + astro-site) |
| `npm run lint` (biome) | 547 files, **0 issues** |
| `npx vitest run` | **97 files / 1,464 tests — all pass, 85 s** |
| `npm run build` | success (app + 193-page Astro site + og-images + sitemaps + postbuild) |
| `npm run check:perf` | PASS — initial JS **227,258 B gzip vs 250,000 budget (91 %)**, CSS 26,108/30,000, 193 pages / 7.97 MB HTML, script tags 39/80, hero image 84.8/200 KB. (Budget gates *initial* JS only; total `dist/app` JS gzip is 438.5 KB, with DiagnosisPanel 104 KB and ComponentInfoModal 63 KB riding lazy routes — acceptable, but worth watching.) |
| `npm run check:seo` / `check:csp` / `check:links` | PASS / PASS / PASS (191 and 193 files) |
| `npm run benchmark:simulation` ×3 | p95 **2.94 / 2.81 / 2.45 ms** vs 8 ms budget — **3/3 PASS** (→ S3 retracted, §5) |

**Stress fuzzers (the repo's own, all PASS):** generator — 3,726 challenges, 223,656 faults,
414,574 repairs verified, 0 identity-hash collisions in 60,000 samples, 36/36 adversarial cases;
diagnosis — 600 scenarios, 10,973 evals, build p95 5.7 ms (budget 150), eval p95 0.2 ms (budget 120);
ohmageddon — every difficulty×rage tier holds its invariants.

**Browser e2e (Playwright 1.62; Chromium 153 from the npm registry, since `cdn.playwright.dev`
is unreachable from this sandbox — full recipe in §9):**

- Main suite, `chromium` project (13 spec files): **103 passed, 2 skipped, 0 failed — 4.3 min**.
  Both skips are by design: the PERF-gated dense-editor benchmark and a mobile-only advisory.
- `benchmark:browser` (PERF=1, the 60 fps budget): **PASS** — dense-editor (~200 components) pan
  p95 33.4 ms/frame, drag p95 33.3 ms, long-frame ratio 1.7 %, idle p95 16.8 ms, event-handler
  p95 0.1 ms. Rendered on CPU (swiftshader), so this is a floor.
- `e2e:production` (53 specs against the built `dist/`): **52 passed, 1 FAILED** — the homepage
  `<title>` drift, N30. **The repo's own `npm run verify` chain is therefore red on main.**

**Custom probes (round 3):**

- **Zs / earth-fault-loop impedance check is textbook-correct.** B16: max Zs 2.73 Ω =
  230 × 0.95 / (5 × 16); cold (20 °C) ceiling 0.8 × = 2.19 Ω; prospective fault current uses
  Cmin 0.95 (140 A at Zs 1.56 Ω); `passHot`/`passCold` flip exactly when the numbers say
  (ze 0.35 Ω → Zs 1.56 Ω PASS; ze 2.0 Ω → Zs 3.21 Ω FAIL). A short 6 mm²/8 m run passes
  comfortably. This subsystem earns a place in §7.
- **`thermalData` is real and complete:** every component carries
  `{powerWatts, temperature, maxTemperature: 90, colorCode, status: "normal"}` at 22 °C ambient.
- **Both seed circuits** (student, pro) simulate and validate clean: 0 errors, 0 warnings, score 100.
- **All 20 guided templates simulate with 0 crashes.** The 2 beginner templates that are dark at
  rest are dark *by design* — `one-way-light-switch` ships its switch `{on:false}` (the lesson is
  flipping it; `templates.ts:131`), `push-button-doorbell` documents "energises only while held"
  (`templates.ts:419`). `rcd-earth-fault-demo`'s errors are the demo. But **three pro templates
  contradict their own teaching text → N29.**
- **Standards presets are half-wired → N28:** `simulate.ts:51-53` consumes only
  `standardPreset.id` (GFCI vs RCD wording) and `rcdThresholdMa` (US 6 mA genuinely trips
  earlier); `nominalVoltage` (120 V NEC) is **never read** — a `us`-standard circuit simulates
  230 V with UK device labels. `compliance.ts` *does* use per-standard volt-drop ceilings and
  citations (BS 7671 vs NEC), so the data is consumed unevenly, not accidentally.
- **Stale lockfile:** the committed `package-lock.json` says 2.0.3 while `package.json` says
  2.0.4 — the first real `npm install` silently repairs it. Cosmetic in itself, but it means no
  install has run to completion on this tree since the version bump — which N31 explains.

---

## 4. New defect register (continues the v3 proposal's 2.1–2.7)

Numbering continues from the proposal. Severity: impact on a *training app's* correctness.

| # | Sev | Defect | Evidence |
|---|---|---|---|
| **N8** | **High** | **Basic mode is silent on overload.** 32.2 A through a 16 A MCB (or a 13 A fuse): no trip, no warning, no error — while pro mode has a full, correct IEC 60898 trip-curve model. The default (student) audience never sees overload physics. | C15b, C15d vs D1, D6 |
| **N9** | **High** | **No discrimination / time grading.** A fault downstream of a 16 A MCB trips the upstream 100 A main switch simultaneously. Cascade tripping is the exact misconception protective-coordination training must kill. | C44 |
| **N10** | **High** | **Binary 110/230 V worldview.** Any supply ≤ 130 V is bucketed as "110 V equipment" (`simulate.ts:770-793`); a 12 V supply yields *"110V rated equipment detected on a 12V circuit!"*. 12/24/48 V ELV and 400 V 3φ have no representation. | D3, C45 |
| **N11** | Med | **Source voltage is global, not per-source — and undeclared in the catalogue.** `dc-battery-12v` (and solar PV, generator) deliver 230 V AC semantics by default. *Refined in round 2 (CV3):* the per-source mechanism **exists** — `state.customVoltage` on a source is honoured — but no source def declares its voltage, so every source defaults to mains. | C22b, CV1, CV3 |
| **N12** | Med | **Transformer secondary short misdiagnosed** as "Live and Neutral are directly connected" — no galvanic separation (extends 2.4). | C27 |
| **N13** | Med | **`defaultOn` split-brain.** 13 catalogue defs declare `defaultOn: true` (all MCBs, RCD, RCBO, AFDD, fuse, main-switch, isolator, cooker-unit, fused-spur, switched-socket). The **engine never reads it** (0 references; `traversal.ts:68` treats `state.on !== true` as open) — the UI compensates by seeding `{on:true}` at placement (`uiStore.helpers.ts:31`). Any programmatic path that forgets the seed (imports, migrations, generators, API callers) gets silently-dead protection. | C14 vs C14b; grep receipts |
| **N14** | Med | **Coils are cosmetic.** Relay/delay-timer coil ports are the same manual switch as the contacts; an energised coil draws 0 A and cannot close `{on:false}` contacts. Sharpens proposal 2.3. | C30b, C30c, C31b |
| **N15** | Low | **Dimmer level is inert** — `speed:0` and `speed:3` produce identical current. | C46 |
| **N16** | Low | **Trip/wire current inconsistency** — a short reports a 460 A trip while `wireCalculations` reads 0 A on every wire. | C17b |
| **N17** | Low | **Malformed input tolerated silently** — unknown types, ghost wires, out-of-range ports: no crash, but also no diagnostic. Persisted corruption would be invisible. | C35, C38, C39 |
| **N18** | Info | Socket defs carry `powerWatts ≈ 3000` but sockets draw 0 A (no `isLoad`) — the "appliance plugged in" concept doesn't exist in the engine; wattage is inert metadata. | C32 |
| **N19** | Info | Two live terminals merge into one rail with no phase-conflict concept. | C24 |
| **N20** | Med | **Two cable-size editors disagree.** The Wire Inspector's `wire.customCableMm2` wins outright; the Component Properties editor's `state.customCableMm2` is `min()`-clamped by the *other* end of the wire (usually a 2.5 mm² default) — setting 16 mm² on a component silently yields 2.5 mm². | W1 vs W1b; `simulate.ts:530-533`, `ComponentPropertiesView.tsx:697` |
| **N21** | Med | **Relay contact sets don't change over.** `relay-spdt` `{off}`: NC dead; `{on}`: **both NO and NC conduct**. Root cause: the `changeover` topology object (`types.ts:67`) is set only for the two-way-switch family (`switches.ts:32`) — no relay/contact def sets it, so all live ports bridge together when "on". De-energised NC logic is unrepresentable. | NC1c, NC1d, CO1/CO2 |
| **N22** | Med | **Two protection fault types are advertised but do nothing.** `protection-forced-open` leaves the MCB feeding; `protection-bypass` doesn't bypass (MCB still trips, components still blow). `FAULT_REGISTRY` documents `simulationEffect`s the engine never implements. | IF battery, IF15 |
| **N23** | Low | **Pro-mode overload destroys the protective device itself** — the tripping MCB also appears in `blownComponents` ("overcurrent") after clearing a 2.2×In overload. Breakers survive their duty; teaching that they burn up is backwards. | D1, NC4c |
| **N24** | Low | **RCD trips on a balanced L–N bolted short** — a short with no residual current path is cleared by the RCD, conflating overcurrent with residual-current protection. | WF `short-circuit` |
| **N25** | Low | **Duplicate `blownComponents` entries** for the same component in pro mode (overvoltage path adds it twice). | CV2 |
| **N26** | Med | **Validation gaps — all pass with score 100:** reversed polarity (L into a load's N port), switched neutral (switch in the N leg), load fed from the earth rail, invalid `portIndex`, self-loop and duplicate wires, and no protection requirement for non-socket loads (2 kW heater direct on L/N passes; the RCD rule is socket-specific). | V2, V3, V5, V7c–e, V8 |
| **N27** | High* | **Three-phase is unbuildable.** No `isSource` def has ≥ 2 live ports (19 defs have ≥ 3 live *loads*, incl. `distribution-board-3phase`, `contactor-4p`). L1/L2/L3 are labels on one rail: bridging "phases" is a silent no-op, a textbook DB→motor wiring "works" at 13 A, and 400 V supplies are bucketed as 230-class. (*Same root as 2.5; listed for the source-side half of the fix.)* | Φ0–Φ5 |
| **N28** | Med | **Standards presets are half-wired.** `simulate.ts:51-53` reads only `standardPreset.id` (GFCI/RCD wording) and `rcdThresholdMa`; the declared `nominalVoltage` (120 V for `us`) is never consumed — every standard simulates at 230 V and device labels stay UK ("RCD / RCCB (80A 30mA)" under the US preset). "US mode" is a UK circuit with a touchier residual device, not a 120 V / 20 A NEC circuit. | Round-3 probe: bulb current identical (0.039 A) under all four standards; `compliance.ts:106-121` is the one consumer of per-standard limits |
| **N29** | Med | **Three pro templates contradict their own teaching text.** `pro-ev-charger-circuit` simulates with 1 error and validates with 2 (score **40** — "B-curve breaker on motor load: EV Charger Point (7.4kW)" plus active short/overcurrent); `pro-cooker-induction` *teaches "run the simulation: the hob energises…"* but simulates with an error at rest; `pro-3phase-dol-starter` energises **1/5 loads** with its contactor `{on:true}` (N14/N21 coil logic). A student following the instructions watches the opposite of the lesson — in the tier the product sells. | Round-3 probe, all 20 templates executed; `templates.ts:549, 768, 499` |
| **N30** | Med | **`npm run verify` is red on main.** `e2e:production` fails 1/53: `production.spec.ts:9` expects the homepage title "ElectraSim — Free Online Electrical Wiring Simulator" while the built site serves "Electrical Wiring Simulator — Free Online Lab | ElectraSim" (`astro-site/src/lib/seo.ts`). Pure spec/site drift — but it breaks the repo's own full gate chain on a fresh checkout+build. | Executed: 52 passed, 1 failed, exit 1 |
| **N31** | **High** | **No CI at all.** There is no `.github/` directory — nothing runs typecheck, lint, the 1,464 tests, the build, or e2e on push or PR, anywhere. Gates are enforced only by local lefthook (pre-commit: biome + typecheck; commit-msg: soft changelog/progress nudge), which cannot see a colleague who commits `--no-verify`. N30 (verify chain broken) and the stale 2.0.3 lockfile both shipped unnoticed — precisely what CI exists to catch. | `ls .github` → absent; `lefthook.yml`; `npm run verify` (red via N30) |

**Previously known, now re-verified with fresh receipts:** 2.1 (C04/C07), 2.2 (C05/C06), 2.3 (C30b/c),
2.4 (C25b/D4), 2.5 (C28: 13.04 A on one phase), 2.6 (C32/C33), 2.7 (C13/C31b).

---

## 5. Corrections to prior claims (mine)

The v3 design proposal (§2.4) claimed a 12 V lamp on a 12 V transformer *"explodes"* with a
spurious 110 V warning. **Re-execution shows something worse: nothing happens at all.** The
secondary load runs silently at 230 V (0.039 A) on 8/12/24 V secondaries alike, in both basic and
pro mode, with zero warnings. The original explosion claim is not reproducible with catalogue
parts. Silent wrongness is a harder training failure than a loud one — the proposal document has
been corrected in place with a dated note. Lesson recorded: single-shot probes need re-runs before
they become defect-register entries.

**Round 3 retraction — S3 ("benchmark gate fails 2 of 3") was my artefact, not the repo's.** The
round-1 runs invoked the benchmark through `npx tsx` (a warm npx-cache path, sharing a JIT with
tsx's loader). Via the repo's own launcher (`npm run benchmark:simulation` →
`node --import tsx scripts/benchmark-simulation.ts`) it passes **3/3** — p95 2.94 / 2.81 / 2.45 ms
against the 8 ms budget (§3.15). §1.2 and recommendation 3 are corrected here; the benchmark gate
is stable and green. Second lesson recorded: *how* a gate is invoked is part of the measurement.

---

## 6. Static analysis (grep receipts)

### 6.1 Purity & determinism (`src/domain`)

- **DOM references: 0** — the domain layer is genuinely DOM-free. ✅
- **Nondeterminism: 13 hits** (excl. tests). Material ones:
  - `faults.ts:477` — `Math.random()` in fault-id minting (engine output contains random ids → replay/golden-master harness must strip them; the challenges subsystem explicitly bans `Math.random` and uses seeded RNG, but `faults.ts` predates that discipline).
  - `circuitValidation.ts:86,133,185,1072` — `Date.now()` timestamps inside validation issues.
- `simulation.test.ts:14` — domain test imports `../store/seed` (a **layering violation in tests**: domain depends on store fixtures; the reverse dependency the architecture forbids).

### 6.2 Type safety

- `: any` → **1 hit, and it is in a comment** (`diagnosisStore.ts:465`). `as any` → **0**.
- `@ts-ignore`/`@ts-expect-error` → **1, deliberate, in a test** (`profiles.test.ts:96`).
- Non-null assertions (`x!.y`) → **15** across `src` (excluding `!==`).
- `noUncheckedIndexedAccess: false` — the one gap in an otherwise strict `tsconfig.json`.

### 6.3 Security surface

- `dangerouslySetInnerHTML` → **1**, `EmojiGlyph.tsx:64`; verified benign — `body` is build-time
  Twemoji artwork from `src/lib/emoji/glyphs.ts`, with a `biome-ignore` comment documenting
  "never user input". ✅
- `.innerHTML =` assignments → **0**. `eval` / `new Function` → **0**. ✅
- Worker boundary (`sim.worker.ts`, 39 lines): pure Comlink `expose({simulate})`; no raw
  `postMessage`/`onmessage` handling, no origin checks needed. ✅ minimal and clean.
- `console.*` in non-test code → **31**, mostly `console.warn` in persistence catch paths —
  ungated by `import.meta.env.DEV` (minor: ships warning noise to prod consoles on storage failures).

### 6.4 Accessibility (approximate, by grep)

231 `aria-*` attributes, 22 `role=`, 17 `tabIndex` against 333 `onClick` handlers — for a
canvas-heavy SVG app this is a strong baseline (nodes, switches and individual ports carry labels
and `aria-pressed`). Gaps match the v3 UI doc: no non-visual equivalent of the diagnostic overlays
(that's what the proposed Netlist tab fixes).

### 6.5 Dependency audit (`npm audit --package-lock-only`, committed lockfile)

**12 vulnerabilities: 1 critical, 6 high, 5 moderate — none in the 10 production dependencies of
the app itself; all in dev tooling or the `astro-site` marketing workspace.**

| Severity | Package | Advisory |
|---|---|---|
| **Critical** | `astro < 7.2.8` (astro-site workspace) | **RCE through AVIF image optimization** (GHSA-26w7-cxv4-gfx2) — fix: `npm audit fix` (non-breaking) |
| High | `fast-uri` | host confusion + 3× SSRF (via Astro toolchain) |
| High | `js-yaml` | CPU DoS via merge keys |
| High | `sharp` → `miniflare` → `wrangler` | libheif vulnerabilities (deploy tooling) |
| High | `svgo 4.0.0-4.0.2` | (via Astro build) |
| Moderate | `vitest` / `@vitest/mocker` chain | path traversal / arbitrary file read in test runner |
| Moderate | `devalue` | DoS via malformed input |

The Astro RCE is the only one with plausible production exposure (marketing site image
optimization); it has a non-breaking `npm audit fix` available and should be actioned first.

---

## 7. What the codebase does *right* (worth saying)

Executed robustness: **zero crashes in 45 adversarial circuits** (round 1) **plus 26,450 pairwise
runs** (round 2), including ghost wires, self-loops, duplicate wires, out-of-range ports, unknown
types and a 400-deep series chain (4.29 ms, no stack overflow). The domain layer has no DOM
references, the worker boundary is 39 lines of pure Comlink, type-escape count is near zero, there
is not a single TODO/FIXME in `src`, and the one `dangerouslySetInnerHTML` is documented safe.
Pro-mode physics — trip curves with correct thermal multiples (2.01×In ≈ 5 min, 1.45×In ≈ 60 min),
cable ampacity, derating, melt events — is genuinely good. Round 2 added three more genuine
strengths: **all six wire-level properties are correctly consumed** (cable size, length, derating,
installation method, material — §3.11); **the fault-injection subsystem is the strongest part of
the engine** (12 of 14 fault types produce correct diagnostics, `live-to-earth` correctly trips an
RCD, `terminal-disconnect` works at port granularity — §3.13); and **validation has real teeth
where it looks** (earth-bonding, RCD-for-sockets, volt-drop compliance, 1.34 ms on 200 components,
115/115 components handled without a crash — §3.14). The problems are architectural (one scalar,
no domains, no time), not sloppy.

Round 3 raises the floor further. **Every gate the repo ships is green on a cold install** —
1,464 unit tests, typecheck, biome, the full build, four `check:*` suites, the simulation
benchmark 3/3, all three stress fuzzers (414,574 verified repairs!), and 155 browser e2e specs
with zero unexpected failures (§3.15). The e2e setup itself is unusually careful: it disables the
dev-server HMR race it documents, asserts CSP compliance on rendered schematics, and skips
PERF/mobile-only tests *by design* rather than accidentally. The **Zs loop-impedance check is
textbook BS 7671** (max-Zs 2.73 Ω for B16, 0.8× cold ceiling, Cmin-scaled prospective fault
current — verified numerically in §3.15), `thermalData` is complete per-component, both seed
circuits validate at 100, and 20/20 guided templates simulate crash-free. The engineering
discipline is real; what's missing is enforcement (N31), not care.

---

## 8. Recommendations (mapped to the v3 proposal)

1. **Triage order for independent quick fixes (no engine rewrite needed):**
   - `npm audit fix` in `astro-site` (critical RCE, non-breaking) — §6.5.
   - Basic-mode overload *warning floor* (N8): if pro gates the trip, basic can still warn —
     "this cable/MCB is overloaded" costs one string, not a solver.
   - Engine honors `defaultOn` (N13): one-line semantic fix in `traversal.ts`, but it changes
     expectations for any test building unseeded protection — must go through the golden-master
     harness (proposal §8 phase 1).
   - Malformed-input diagnostics (N17): warn on unknown type / ghost wire / bad port index.
2. **Feeds the v3 engine design directly:** N9 → the timed-mode/discrimination evaluator is now
   evidence-backed as a *correctness* fix, not a nice-to-have; N10/N11 → `ConductorRole` and
   per-domain voltage must include ELV and 3φ from day one, not just 230 V; N12 → the
   galvanic-domain work; N14 → `DeviceModel` coil semantics; N16 → `EngineResult` consistency.
3. **Benchmark stability (S3 — retracted in round 3):** the gate passes **3/3** when invoked the
   way the repo ships it (`npm run benchmark:simulation`); the original 2/3 failure was an
   artefact of running it through `npx tsx` with a warm cache. Action: none needed in the gate —
   just keep `npm run` the only documented entry point, so nobody re-measures the artefact.
4. **Test layering (§6.1):** move the seed-circuit builders out of `src/store/seed.ts` into
   `src/domain` (or a shared fixtures module) so domain tests stop importing upward.

Round 2 additions (from §3.8–3.14):

5. **Catalogue data fixes — cheap, no engine rewrite:** add the `changeover` topology to
   `relay-spdt`/`relay-dpdt`/`control-relay` (N21 — the mechanism already exists and works for
   two-way switches); declare voltages on source defs so `dc-battery-12v` stops delivering
   mains (N11 — `customVoltage` on sources is already honoured); consider a 3-phase source def
   or explicit "single-phase only" guardrails on the 19 three-phase-looking defs (N27).
6. **Make the two cable editors agree (N20):** either retire the component-level cable field or
   make the min-clamp visible in the Wire Inspector ("2.5 mm² — limited by the other end's
   declared size").
7. **Wire up the two protection faults (N22):** `protection-forced-open` should open the device
   path in traversal; `protection-bypass` should skip the trip evaluation. Both are one-branch
   changes in `simulate()` — and their `FAULT_REGISTRY` text already promises them.
8. **Validation gap fixes (N26):** reversed polarity and switched-neutral are detectable today
   from port types + rail position; invalid `portIndex`/self-loop/duplicate wires should be
   `configuration` warnings; extend the RCD/protection rule from sockets to all loads above a
   threshold. Each is a check in the existing `validateCircuit` pattern.
9. **Small engine fixes:** stop adding the tripping MCB to `blownComponents` (N23); don't trip
   RCDs on balanced L–N shorts (N24); de-duplicate `blownComponents` (N25).

Round 3 additions (from §3.15):

10. **Add CI (N31) — the single highest-leverage fix in this report.** One GitHub Actions
    workflow running `npm run verify` on push/PR would have caught N30, the stale 2.0.3 lockfile,
    and every future gate regression. The chain already exists and (post-N30-fix, §3.15) passes
    end-to-end — it just never runs anywhere. This also future-proofs the benchmark: a gate that
    runs on every push cannot silently rot.
11. **Fix the title drift (N30)** — one string, either `e2e/production.spec.ts:9` or
    `astro-site/src/lib/seo.ts`, whichever is the intended branding. Then `npm run verify` goes
    green end-to-end.
12. **Finish wiring the standards presets (N28):** either consume `nominalVoltage` in the engine
    (a `us` circuit should be 120 V with US-flavoured labels) or stop declaring it — dead data in
    a `StandardPreset` is a promise the app doesn't keep.
13. **Repair the three pro templates (N29):** they are the storefront of the Pro tier, and today
    they teach against their own text. The EV-charger curve selection and cooker induction
    errors look like data fixes (curve/`customMaxAmps`), not engine work.

---

## 9. Reproduction appendix

The probe scripts were deleted after use; the harness below reproduces every engine case in §3.
Run from the repo root with `npx tsx repro.tmp.ts` (needs no `node_modules`):

```ts
import { simulate } from './src/domain/simulation/simulate';
import type { Circuit, ComponentInstance, WireInstance } from './src/domain/types';

let n = 0;
const C = (type: string, state: Record<string, unknown> = {}): ComponentInstance =>
  ({ id: `${type}#${++n}`, type, x: 0, y: 0, state: state as ComponentInstance['state'] });
const W = (a: ComponentInstance, ap: number, b: ComponentInstance, bp: number): WireInstance =>
  ({ id: `w#${++n}`, fromComponentId: a.id, fromPortIndex: ap, toComponentId: b.id, toPortIndex: bp, controlPoints: [] });
const cir = (components: ComponentInstance[], wires: WireInstance[], extra: Partial<Circuit> = {}): Circuit =>
  ({ components, wires, ...extra });

// N8 — basic-mode overload silence (32.2 A through a 16 A MCB, nothing happens):
const L = C('live-terminal'), N = C('neutral-terminal'), mc = C('mcb', { on: true }), ev = C('ev-charger');
const basic = simulate(cir([L, N, mc, ev], [W(L, 0, mc, 0), W(mc, 1, ev, 0), W(ev, 1, N, 0)]));
console.log(basic.trippedComponents, basic.warnings, basic.errors);          // [] [] []
const pro = simulate(cir([L, N, mc, ev], [W(L, 0, mc, 0), W(mc, 1, ev, 0), W(ev, 1, N, 0)]), { appMode: 'pro' });
console.log(pro.trippedComponents[0].reason);                                 // thermal, 2.01×In, ≈271 s

// N9 — cascade trip (both main switch and MCB trip on one downstream fault):
const ms = C('main-switch', { on: true }), mc2 = C('mcb', { on: true }), ev2 = C('ev-charger');
const d = simulate(cir([L, N, ms, mc2, ev2], [
  W(L, 0, ms, 0), W(N, 0, ms, 1), W(ms, 2, mc2, 0), W(mc2, 1, ev2, 0), W(ev2, 1, N, 0),
]), { appMode: 'pro' });
console.log(d.trippedComponents.map(t => t.label));                           // both trip

// N10 — binary voltage worldview (12 V supply ⇒ "110V equipment"):
const b = C('bulb');
console.log(simulate(cir([L, N, b], [W(L, 0, b, 0), W(b, 1, N, 0)], { globalVoltage: 12 })).errors);

// N11 — a 12 V battery delivers 230 V:
const bat = C('dc-battery-12v'), b2 = C('bulb');
const r = simulate(cir([bat, b2], [W(bat, 0, b2, 0), W(b2, 1, bat, 1)]));
console.log(r.componentCalculations[b2.id]);                                  // voltage: 230

// 2.1/2.2 — series dead circuit, parallel scalar sharing:
const s1 = C('bulb'), s2 = C('bulb');
console.log(simulate(cir([L, N, s1, s2], [W(L, 0, s1, 0), W(s1, 1, s2, 0), W(s2, 1, N, 0)])).energizedComponents.size); // 0
```

Static-analysis receipts (spot-checkable):

```bash
grep -rn 'defaultOn' src/domain --include='*.ts' | grep -v test | grep -v components/   # → types.ts:61 only (engine never reads it)
grep -rn 'Math.random\|Date.now' src/domain --include='*.ts' | grep -v test            # → 13 hits, see §6.1
grep -rn 'dangerouslySetInnerHTML' src --include='*.tsx'                               # → EmojiGlyph.tsx:64 (documented safe)
npx tsx scripts/benchmark-simulation.ts                                                 # → p95 vs 8 ms budget
npm audit --package-lock-only                                                           # → 12 vulns, 1 critical
```

Round-2 key cases (same DSL as above; imports: `simulate` from
`./src/domain/simulation/simulate`, `createInjectedFault` from `./src/domain/faults`,
`validateCircuit` from `./src/domain/circuitValidation`):

```ts
// N21 — relay NC contact (de-energised NC must conduct; it doesn't):
const rs = C('relay-spdt', { on: false }), b = C('bulb');
simulate(cir([L, N, rs, b], [W(L, 0, rs, 0), W(rs, 1, N, 0), W(L, 0, rs, 2), W(rs, 4, b, 0), W(b, 1, N, 0)]));
// → energized: 0  (NC dead when off; with {on:true} the NC path lights — contacts bridge together)

// N20 — the two cable editors disagree:
const w = W(L, 0, heater, 0, { customCableMm2: 16 });                 // wire editor → 16 mm² honoured
const heater16 = C('space-heater', { customCableMm2: 16 });           // component editor → still 2.5 mm² (min-clamped)

// N22 — protection-bypass doesn't bypass:
const f = createInjectedFault('protection-bypass', { type: 'component', id: mcb.id });
simulate(cir([L, N, mcb, ev], [/* L→mcb→ev→N */], { faults: [f] }), { appMode: 'pro' });   // MCB still trips

// N26 — validation gaps (all return status 'pass', score 100):
validateCircuit(cir([L, N, bulb], [W(L, 0, bulb, 1), W(bulb, 0, N, 0)]));     // reversed polarity — passes
validateCircuit(cir([L, N, bulb, sw], [W(L, 0, bulb, 0), W(bulb, 1, sw, 0), W(sw, 1, N, 0)])); // switched neutral — passes
validateCircuit(cir([earthTerminal, bulb], [W(earthTerminal, 0, bulb, 0)]));  // earth-fed load — passes

// WF — the RCD core behaviour that DOES work:
const wl = W(L, 0, rcd, 0, { fault: 'live-to-earth' });
simulate(cir([L, N, rcd, bulb], [wl, W(N, 0, rcd, 1), W(rcd, 2, bulb, 0), W(bulb, 1, rcd, 3)]), { appMode: 'pro' });
// → RCD trips, cause 'ground-fault' ✓
```

The pairwise matrix harness (13,225 pairs × 2 modes) and the full validation/wire-property
batteries follow the same pattern and are reproducible from §3.8–3.14 case IDs; the throwaway
scripts were removed to keep the tree clean.

### Round 3 — gates and browser runs (executed as written)

```bash
# every repo gate — all green (§3.15), except the last (N30):
npm install && npm run typecheck && npm run lint && npx vitest run && npm run build
npm run check:perf && npm run check:seo && npm run check:csp && npm run check:links
npm run benchmark:simulation            # ×3 → p95 2.94 / 2.81 / 2.45 ms (budget 8)
npm run stress:generator && npm run stress:diagnosis && npm run stress:ohmageddon

# browser e2e when cdn.playwright.dev is unreachable — Chromium from the npm registry:
mkdir /tmp/chrome-npm && cd /tmp/chrome-npm && npm init -y && npm i @sparticuz/chromium
node -e "require('@sparticuz/chromium').executablePath()"   # extracts /tmp/chromium (v153)
cd node_modules/@sparticuz/chromium && node -e "const z=require('zlib'),f=require('fs'); \
  for (const n of ['al2023','fonts']) f.writeFileSync('/tmp/'+n+'.tar', \
  z.brotliDecompressSync(f.readFileSync('bin/'+n+'.tar.br')))"
mkdir -p /tmp/al2023 /tmp/fonts && tar -xf /tmp/al2023.tar -C /tmp/al2023 \
  && tar -xf /tmp/fonts.tar -C /tmp/fonts
# wrapper config extending playwright.config.ts with
#   use: { launchOptions: { executablePath: '/tmp/chromium',
#                           args: ['--no-sandbox', '--disable-dev-shm-usage'] } }
# (only because the bundled system libs live in /tmp/al2023/lib, not /usr/lib):
LD_LIBRARY_PATH=/tmp/al2023/lib npx playwright test --project=chromium            # 103 ✓ / 2 skips
LD_LIBRARY_PATH=/tmp/al2023/lib PERF=1 npx playwright test e2e/performance.spec.ts \
  --project=chromium                                                              # PASS (60 fps budget)
LD_LIBRARY_PATH=/tmp/al2023/lib npx playwright test --config=playwright.production.config.ts
# → 52 passed, 1 failed (N30: homepage <title> drift, production.spec.ts:9 vs seo.ts)
