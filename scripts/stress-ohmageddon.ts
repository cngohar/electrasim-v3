/**
 * Phase E stress harness — Ohmageddon Mode (plan §42, §56, §57).
 *
 * The unit suite proves each modifier behaves on a handful of seeds. This
 * sweeps every tier across every difficulty over hundreds of seeds and asserts
 * the properties that must hold for *all* of them — the ones where a 1-in-500
 * violation is still a shipped bug:
 *
 *   1. every rage scenario builds, and its healthy baseline is clean under the
 *      full production validator stack (rules + BS 7671 + both sim modes)
 *   2. the injected fault is observable (§12 applies in rage too)
 *   3. the truthful answer + a real repair  → 'success'
 *      the truthful answer with no repair   → 'incomplete'
 *      a wrong answer                       → 'failure'
 *   4. a decoy is NEVER the fault, and decoys never change load behaviour
 *   5. modifiers are deterministic: same (seed, difficulty, tier) ⇒ identical
 *   6. tier escalation is real — measured fault distance and hint counts move
 *      in the right direction, so a "harder" tier is not merely labelled so
 *   7. normal mode never receives a modifier (§24), checked on the same seeds
 *   8. no answer leak: neither the fault type nor its location may appear in
 *      the brief, complaint, rage notes or any hint below the final one
 *
 * Budgets: rage scenario build p95 ≤ 200 ms (a red herring costs an extra
 * validate + simulate over the normal path, which is budgeted at 150 ms).
 *
 *   node --import tsx scripts/stress-ohmageddon.ts [--seeds=N]
 */

import {
  type ChallengeDifficulty,
  type DiagnosisScenario,
  RAGE_TIER_IDS,
  type RageTierId,
  buildDiagnosisScenario,
  evaluateDiagnosis,
  primaryScenarioFault,
} from '@electrasim/domain/challenges';
import { validateCircuit } from '@electrasim/domain/circuitValidation';
import { validateCircuitRules } from '@electrasim/domain/electrical/validation';
import { simulate } from '@electrasim/domain/simulation';
import type { Circuit } from '@electrasim/domain/types';

const DIFFICULTIES: ChallengeDifficulty[] = ['beginner', 'intermediate', 'advanced'];
const DEFAULT_SEEDS = 120;
const BUILD_P95_BUDGET_MS = 200;

const seedArg = process.argv.find((arg) => arg.startsWith('--seeds='));
const SEEDS = seedArg ? Number.parseInt(seedArg.split('=')[1] ?? '', 10) : DEFAULT_SEEDS;

const failures: string[] = [];
const buildTimes: number[] = [];

function fail(message: string): void {
  if (failures.length < 25) failures.push(message);
}

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
}

function withoutFaults(circuit: Circuit): Circuit {
  return { ...circuit, faults: [] };
}

/**
 * Hop distance from the fault to the nearest declared load.
 *
 * With several faults in play, `nearest` (the default) reports the *smallest*
 * distance: the closest fault is the one the learner trips over first, so it
 * is what actually sets the difficulty floor. Taking a mean would let one very
 * remote fault disguise a second one sitting on the lamp.
 *
 * `primary` instead reports the distance of the first-selected fault, which is
 * the only one `remoteFault` ranks. The two are reported side by side because
 * they answer different questions: "is this tier hard?" and "did remoteFault
 * do its job?".
 */
function faultDistance(
  scenario: DiagnosisScenario,
  which: 'nearest' | 'primary' = 'nearest',
): number {
  const adjacency = new Map<string, string[]>();
  for (const wire of scenario.healthyCircuit.wires) {
    for (const [a, b] of [
      [wire.fromComponentId, wire.toComponentId],
      [wire.toComponentId, wire.fromComponentId],
    ]) {
      const list = adjacency.get(a!);
      if (list) list.push(b!);
      else adjacency.set(a!, [b!]);
    }
  }
  const distance = new Map<string, number>();
  const queue: string[] = [];
  for (const id of scenario.loadComponentIds) {
    distance.set(id, 0);
    queue.push(id);
  }
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    for (const next of adjacency.get(current) ?? []) {
      if (distance.has(next)) continue;
      distance.set(next, (distance.get(current) ?? 0) + 1);
      queue.push(next);
    }
  }
  let nearest = Number.POSITIVE_INFINITY;
  // `primary` looks only at the fault the seed selected first — the one
  // `remoteFault` actually ranked. `nearest` looks at all of them, which is
  // the honest difficulty floor: the closest fault is the one a learner trips
  // over first.
  const considered = which === 'primary' ? scenario.faults.slice(0, 1) : scenario.faults;
  for (const entry of considered) {
    const target = entry.fault.target;
    let hops: number;
    if (target.type === 'wire') {
      const wire = scenario.healthyCircuit.wires.find((w) => w.id === target.id);
      hops = wire
        ? Math.min(distance.get(wire.fromComponentId) ?? 0, distance.get(wire.toComponentId) ?? 0)
        : 0;
    } else {
      const id = target.type === 'component' ? target.id : target.componentId;
      hops = distance.get(id) ?? 0;
    }
    nearest = Math.min(nearest, hops);
  }
  return Number.isFinite(nearest) ? nearest : 0;
}

interface TierStats {
  built: number;
  distanceSum: number;
  primaryDistanceSum: number;
  hintSum: number;
  faultSum: number;
  multiCount: number;
  decoyCount: number;
  applied: Map<string, number>;
}

const stats = new Map<string, TierStats>();
function statsFor(key: string): TierStats {
  let entry = stats.get(key);
  if (!entry) {
    entry = {
      built: 0,
      distanceSum: 0,
      primaryDistanceSum: 0,
      hintSum: 0,
      faultSum: 0,
      multiCount: 0,
      decoyCount: 0,
      applied: new Map(),
    };
    stats.set(key, entry);
  }
  return entry;
}

let scenarios = 0;
let evaluations = 0;

// ---------------------------------------------------------------------------

for (const difficulty of DIFFICULTIES) {
  for (const tier of [...RAGE_TIER_IDS, undefined] as (RageTierId | undefined)[]) {
    const key = `${difficulty}/${tier ?? 'normal'}`;
    const entry = statsFor(key);

    for (let i = 0; i < SEEDS; i++) {
      const seed = i * 7919 + 13;
      const started = performance.now();
      let scenario: DiagnosisScenario;
      try {
        scenario = buildDiagnosisScenario({
          seed,
          difficulty,
          ...(tier ? { rageTier: tier } : {}),
        });
      } catch (error) {
        fail(`${key} seed ${seed}: build threw — ${(error as Error).message}`);
        continue;
      }
      buildTimes.push(performance.now() - started);
      scenarios += 1;
      entry.built += 1;
      entry.distanceSum += faultDistance(scenario);
      entry.primaryDistanceSum += faultDistance(scenario, 'primary');
      entry.hintSum += scenario.hints.length;
      entry.faultSum += scenario.faults.length;
      if (scenario.faults.length >= 2) entry.multiCount += 1;

      // ── 7. §24: normal mode never receives modifiers ──────────────────
      if (!tier) {
        if (scenario.rage !== null) fail(`${key} seed ${seed}: normal scenario carries rage data`);
        if (scenario.hints.length !== 3) {
          fail(`${key} seed ${seed}: normal scenario has ${scenario.hints.length} hints, want 3`);
        }
      } else {
        if (!scenario.rage) {
          fail(`${key} seed ${seed}: rage tier produced no summary`);
          continue;
        }
        if (scenario.rage.tier !== tier) {
          fail(`${key} seed ${seed}: summary tier ${scenario.rage.tier} != ${tier}`);
        }
        if (!scenario.challengeId.startsWith('ES-RAGE-')) {
          fail(`${key} seed ${seed}: identity ${scenario.challengeId} lacks ES-RAGE prefix`);
        }
        for (const application of scenario.rage.applications) {
          if (!application.applied) continue;
          entry.applied.set(application.id, (entry.applied.get(application.id) ?? 0) + 1);
        }
        entry.decoyCount += scenario.rage.decoyComponentIds.length;
      }

      // ── 1. clean healthy baseline under the full validator stack ──────
      const healthy = simulate(scenario.healthyCircuit, { appMode: 'pro' });
      if (healthy.errors.length > 0) {
        fail(`${key} seed ${seed}: healthy baseline has errors — ${healthy.errors[0]}`);
      }
      if (healthy.errorComponents.size > 0 || healthy.errorWires.size > 0) {
        fail(`${key} seed ${seed}: healthy baseline flags components/wires in error`);
      }
      if ((healthy.trippedComponents?.length ?? 0) > 0) {
        fail(`${key} seed ${seed}: healthy baseline has tripped protection`);
      }
      const ruleErrors = validateCircuitRules(scenario.healthyCircuit, 'basic').filter(
        (d) => d.severity === 'error',
      );
      if (ruleErrors.length > 0) {
        fail(`${key} seed ${seed}: rule error ${ruleErrors[0]?.code}`);
      }
      const report = validateCircuit(scenario.healthyCircuit, healthy, 'uk');
      const reportErrors = report.issues.filter((issue) => issue.severity === 'error');
      if (reportErrors.length > 0) {
        fail(`${key} seed ${seed}: BS 7671 error ${reportErrors[0]?.id}`);
      }

      // ── 2. §12: every fault must be observable ────────────────────────
      // The combined symptom is checked here; each fault is separately proven
      // observable *on its own* by `tryBuildScenario`, which is the property
      // that stops a second fault from being an unfindable freebie.
      if (!scenario.symptom.observable) {
        fail(
          `${key} seed ${seed}: fault ${primaryScenarioFault(scenario).fault.type} not observable`,
        );
      }
      if (scenario.faults.length < 1) {
        fail(`${key} seed ${seed}: scenario carries no faults`);
      }
      // Two faults must never share a location: the answer form takes one
      // type and one place, so a duplicate location would make the second
      // fault unanswerable.
      const locationKeys = new Set(scenario.faults.map((entry) => entry.locationKey));
      if (locationKeys.size !== scenario.faults.length) {
        fail(`${key} seed ${seed}: two faults share a location key`);
      }

      // Two options that read identically are unanswerable — see the same
      // check in stress-diagnosis.ts. Rage matters most here: a red-herring
      // splice adds wires between already-connected devices.
      const labels = scenario.locationChoices.map((c) => c.label);
      const duplicate = labels.find((label, index) => labels.indexOf(label) !== index);
      if (duplicate) {
        fail(`${key} seed ${seed}: two location choices share the label "${duplicate}"`);
      }

      // ── 4. a decoy is never the fault ─────────────────────────────────
      const decoys = new Set(scenario.rage?.decoyComponentIds ?? []);
      if (decoys.size > 0) {
        for (const entry of scenario.faults) {
          const target = entry.fault.target;
          let onDecoy = false;
          if (target.type === 'component') onDecoy = decoys.has(target.id);
          else if (target.type === 'port') onDecoy = decoys.has(target.componentId);
          else {
            const wire = scenario.healthyCircuit.wires.find((w) => w.id === target.id);
            onDecoy =
              !!wire && (decoys.has(wire.fromComponentId) || decoys.has(wire.toComponentId));
          }
          if (onDecoy) fail(`${key} seed ${seed}: a fault was placed on a decoy`);
        }
      }

      // ── 3. the three verdicts, walked as a learner would ──────────────
      //
      // This is the Phase F gate: the scenario must be *completable* by naming
      // its faults one at a time, which is the only route the one-answer form
      // offers. A single-fault scenario runs exactly one iteration and behaves
      // as it always did.
      const identified: string[] = [];
      let finished = false;
      for (const [index, entry] of scenario.faults.entries()) {
        const truthful = { faultType: entry.fault.type, locationKey: entry.locationKey };
        const last = index === scenario.faults.length - 1;

        // Naming a real fault while the installation is still broken must
        // never be graded a failure — the learner was right.
        const unrepaired = evaluateDiagnosis(scenario, scenario.faultedCircuit, truthful, {
          identifiedFaultIds: identified,
        });
        evaluations += 1;
        if (unrepaired.verdict !== 'incomplete') {
          fail(`${key} seed ${seed}: truthful answer, no repair gave "${unrepaired.verdict}"`);
        }
        // `diagnosisCorrect` means *every* fault has been named, so it is only
        // expected on the last iteration. What must hold at every step is that
        // this submission matched a real fault and moved the hunt forward.
        if (unrepaired.matchedFaultId !== entry.fault.id) {
          fail(
            `${key} seed ${seed}: fault ${index + 1} matched ${unrepaired.matchedFaultId ?? 'nothing'}`,
          );
        }
        if (!unrepaired.progressed) {
          fail(`${key} seed ${seed}: naming fault ${index + 1} was not counted as progress`);
        }
        if (unrepaired.diagnosisCorrect !== last) {
          fail(
            `${key} seed ${seed}: diagnosisCorrect ${unrepaired.diagnosisCorrect} at fault ${index + 1}/${scenario.faults.length}`,
          );
        }
        if (unrepaired.outstandingCount !== scenario.faults.length - index - 1) {
          fail(
            `${key} seed ${seed}: outstanding ${unrepaired.outstandingCount} after fault ${index + 1}`,
          );
        }

        // On a fully repaired circuit, the final fault closes the exercise and
        // every earlier one keeps it open.
        const repaired = evaluateDiagnosis(
          scenario,
          withoutFaults(scenario.faultedCircuit),
          truthful,
          { identifiedFaultIds: identified },
        );
        evaluations += 1;
        const want = last ? 'success' : 'incomplete';
        if (repaired.verdict !== want) {
          fail(
            `${key} seed ${seed}: fault ${index + 1}/${scenario.faults.length} + repair gave "${repaired.verdict}", want "${want}" (${repaired.recoveryGap ?? 'no gap'})`,
          );
        }
        if (last) finished = repaired.verdict === 'success';
        identified.splice(0, identified.length, ...repaired.identifiedFaultIds);
      }
      if (!finished) {
        fail(`${key} seed ${seed}: scenario could not be completed fault-by-fault`);
      }

      // An answer naming nothing that is wrong is still a plain failure, even
      // part-way through a multi-fault run.
      const primary = primaryScenarioFault(scenario);
      const wrongLocation = scenario.locationChoices.find(
        (choice) => !locationKeys.has(choice.key),
      );
      if (wrongLocation) {
        const wrong = evaluateDiagnosis(scenario, withoutFaults(scenario.faultedCircuit), {
          faultType: primary.fault.type,
          locationKey: wrongLocation.key,
        });
        evaluations += 1;
        if (wrong.verdict !== 'failure') {
          fail(`${key} seed ${seed}: wrong location gave "${wrong.verdict}", want failure`);
        }
      }

      // ── 5. determinism ────────────────────────────────────────────────
      const replay = buildDiagnosisScenario({
        seed,
        difficulty,
        ...(tier ? { rageTier: tier } : {}),
      });
      if (JSON.stringify(replay) !== JSON.stringify(scenario)) {
        fail(`${key} seed ${seed}: replay diverged`);
      }

      // ── 8. no answer leak (§14) ───────────────────────────────────────
      // Matches the whole fault name, hyphenated or spaced — the same rule
      // `stress-diagnosis.ts` uses. Matching individual *words* was tried and
      // discarded: "circuit", "earth", "terminal" and "fault" all occur in
      // legitimate generic prose ("Investigate the circuit"), so a fragment
      // match reports a leak on copy that names nothing at all.
      const leakZone = [
        scenario.brief,
        scenario.complaint,
        scenario.expectedBehaviour,
        scenario.title,
        // Rage notes and modifier labels are rendered in the panel, so they
        // are part of the leak surface even though normal mode has none.
        ...(scenario.rage?.applications.map((a) => `${a.label} ${a.note}`) ?? []),
        ...scenario.hints.slice(0, -1).map((hint) => hint.text),
      ]
        .join(' ')
        .toLowerCase();
      for (const entry of scenario.faults) {
        const typeWord = entry.fault.type.replace(/-/g, ' ');
        if (leakZone.includes(entry.fault.type) || leakZone.includes(typeWord)) {
          fail(`${key} seed ${seed}: fault type "${entry.fault.type}" leaked into visible copy`);
        }
      }
      // The rage summary must also not name the fault's location: the decoy
      // note mentions a wire id, and if that id were ever the faulted one the
      // badge tooltip would hand over the answer.
      if (scenario.rage) {
        const notes = scenario.rage.applications.map((a) => a.note).join(' ');
        // Whole-token, not substring: ids share a prefix, so `includes` reports
        // a leak of `...-w-1` whenever a note legitimately mentions `...-w-10`.
        // (Observed on advanced/rage-3 seed 910698 — a false positive, and a
        // weak check is worse than none because it trains you to ignore it.)
        const noteTokens = new Set(notes.split(/[^A-Za-z0-9_-]+/));
        for (const entry of scenario.faults) {
          const target = entry.fault.target;
          const targetId = target.type === 'port' ? target.componentId : target.id;
          if (noteTokens.has(targetId)) {
            fail(`${key} seed ${seed}: rage note names the fault target ${targetId}`);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Tier escalation must be measurable, not merely labelled.
// ---------------------------------------------------------------------------

for (const difficulty of DIFFICULTIES) {
  const avg = (tier: string, field: 'distanceSum' | 'primaryDistanceSum' | 'hintSum') => {
    const entry = stats.get(`${difficulty}/${tier}`);
    if (!entry || entry.built === 0) return 0;
    return entry[field] / entry.built;
  };

  // remoteFault runs in rage-3 only (Rage 2 retired it for `misleadingSymptom`).
  //
  // Measured on the *primary* fault, not the nearest one. `remoteFault` ranks
  // the pool the first fault is drawn from; `multiFault` then adds a second
  // from the wider pool, which may legitimately sit next to the dead load. On
  // a two-fault tier the min-distance figure therefore reports the second
  // fault and says nothing about whether remoteFault worked — it dropped to
  // 0.00 at beginner/rage-3 while the primary fault was as remote as ever.
  // Asserting on it would have forced a real modifier to be weakened to
  // satisfy a metric that had stopped measuring it.
  if (avg('rage-3', 'primaryDistanceSum') <= avg('normal', 'primaryDistanceSum')) {
    fail(
      `${difficulty}: rage-3 mean primary fault distance ${avg('rage-3', 'primaryDistanceSum').toFixed(2)} does not exceed normal ${avg('normal', 'primaryDistanceSum').toFixed(2)}`,
    );
  }
  // Rage 2's load-bearing claim is now "the complaint does not point at the
  // fault", not "the fault is far away". The applied-count is the honest
  // metric: a seed that cannot host a misleading placement ships without
  // the claim, so the rate is allowed to be below 100% but must be the
  // majority — otherwise we are back to a labelled-but-empty tier.
  const rage2 = stats.get(`${difficulty}/rage-2`);
  if (rage2 && rage2.built > 0) {
    const rate = (rage2.applied.get('misleadingSymptom') ?? 0) / rage2.built;
    if (rate < 0.5) {
      fail(
        `${difficulty}: rage-2 applied misleadingSymptom in only ${(rate * 100).toFixed(1)}% of scenarios`,
      );
    }
  }
  const rage4 = stats.get(`${difficulty}/rage-4`);
  if (rage4 && rage4.built > 0) {
    const timed = (rage4.applied.get('timeLimit') ?? 0) / rage4.built;
    if (timed < 1) {
      fail(`${difficulty}: rage-4 is missing a timer on ${(1 - timed) * rage4.built} scenario(s)`);
    }
  }
  // limitedHints runs in rage-2 and rage-3; rage-3 must be the harshest.
  if (!(avg('rage-3', 'hintSum') < avg('rage-2', 'hintSum'))) {
    fail(`${difficulty}: rage-3 does not ration hints harder than rage-2`);
  }
  if (!(avg('rage-2', 'hintSum') < avg('normal', 'hintSum'))) {
    fail(`${difficulty}: rage-2 does not ration hints below normal`);
  }
  // §27 Rage 3 is "2 faults". A tier that promises two and ships one is the
  // §24 misrepresentation this harness exists to catch, so the bar is high:
  // the overwhelming majority of seeds must land a second fault.
  const rage3 = stats.get(`${difficulty}/rage-3`);
  if (rage3 && rage3.built > 0) {
    const rate = rage3.multiCount / rage3.built;
    if (rate < 0.9) {
      fail(
        `${difficulty}: rage-3 shipped two faults in only ${(rate * 100).toFixed(1)}% of scenarios`,
      );
    }
  }
  // Tiers that do not list multiFault must never produce a second fault.
  for (const tier of ['normal', 'rage-1', 'rage-2']) {
    const entry = stats.get(`${difficulty}/${tier}`);
    if (entry && entry.multiCount > 0) {
      fail(`${difficulty}: ${tier} produced ${entry.multiCount} multi-fault scenario(s)`);
    }
  }
  // rage-1 and rage-3 must actually place decoys.
  for (const tier of ['rage-1', 'rage-3']) {
    const entry = stats.get(`${difficulty}/${tier}`);
    if (!entry || entry.decoyCount === 0) {
      fail(`${difficulty}: ${tier} never placed a red herring`);
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const buildP95 = p95(buildTimes);

console.log('\n── Ohmageddon stress (plan §42, §56) ──────────────────────────');
console.log(`seeds per tier/difficulty : ${SEEDS}`);
console.log(`scenarios built           : ${scenarios}`);
console.log(`evaluations               : ${evaluations}`);
console.log(
  `build p95                 : ${buildP95.toFixed(2)} ms (budget ${BUILD_P95_BUDGET_MS})`,
);
console.log('');
console.log(
  'tier                       built  meanDist  meanPrim  meanHints  meanFaults  2+  decoys  modifiers',
);
for (const [key, entry] of [...stats.entries()].sort()) {
  const applied = [...entry.applied.entries()]
    .sort()
    .map(([id, count]) => `${id}×${count}`)
    .join(' ');
  console.log(
    `${key.padEnd(26)} ${String(entry.built).padStart(5)}  ` +
      `${(entry.distanceSum / Math.max(1, entry.built)).toFixed(2).padStart(8)}  ` +
      `${(entry.primaryDistanceSum / Math.max(1, entry.built)).toFixed(2).padStart(8)}  ` +
      `${(entry.hintSum / Math.max(1, entry.built)).toFixed(2).padStart(9)}  ` +
      `${(entry.faultSum / Math.max(1, entry.built)).toFixed(2).padStart(10)}  ` +
      `${String(entry.multiCount).padStart(3)}  ` +
      `${String(entry.decoyCount).padStart(6)}  ${applied}`,
  );
}

if (buildP95 > BUILD_P95_BUDGET_MS) {
  fail(`build p95 ${buildP95.toFixed(2)} ms exceeds ${BUILD_P95_BUDGET_MS} ms`);
}

console.log('');
if (failures.length > 0) {
  console.error(`✗ ${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('✓ Ohmageddon stress passed.');
