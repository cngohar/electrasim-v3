/**
 * Phase D stress harness — Diagnosis Lab (plan §56).
 *
 * The generator harness (`stress-challenge-generator.ts`) proves circuits are
 * sound; the challenge harness proves rebuild-grading is sound. This one
 * stresses the diagnosis loop end to end, and in particular the property that
 * §16 turns on: a learner must never be able to finish by *guessing*.
 *
 * Sweeps, per difficulty:
 *   1. scenario build succeeds and is fully self-consistent
 *   2. the injected fault is observable (symptom differs from baseline)
 *   3. the truthful answer + a real repair                → 'success'
 *   4. the truthful answer with NO repair                 → 'incomplete'
 *   5. wrong fault type, right location                   → 'failure'
 *   6. right fault type, wrong location                   → 'failure'
 *   7. every other location choice, repaired              → must NOT succeed
 *   8. deleting the faulted wire but NOT replacing it     → 'incomplete'
 *      (the load stays dead, so §16 must refuse to pass it)
 *      …and delete-then-replace with a clean wire          → 'success'
 *   9. determinism: same seed ⇒ identical scenario
 *  10. no answer leak: the fault type/location must not appear in the brief,
 *      complaint, expected behaviour, or any hint below the final one
 *  11. scoring stays inside 0..1000 and degrades monotonically with mistakes
 *
 * Budgets: scenario build p95 ≤ 150 ms, evaluation p95 ≤ 120 ms.
 *
 *   node --import tsx scripts/stress-diagnosis.ts [--seeds=N]
 */

import {
  type ChallengeDifficulty,
  type DiagnosisScenario,
  buildDiagnosisScenario,
  evaluateDiagnosis,
  primaryScenarioFault,
  scoreDiagnosis,
} from '@electrasim/domain/challenges';
import { normalizeCircuitFaults } from '@electrasim/domain/faults';
import type { Circuit } from '@electrasim/domain/types';

const DIFFICULTIES: ChallengeDifficulty[] = ['beginner', 'intermediate', 'advanced'];
const DEFAULT_SEEDS = 200;
const BUILD_P95_BUDGET_MS = 150;
const EVAL_P95_BUDGET_MS = 120;

const seedArg = process.argv.find((arg) => arg.startsWith('--seeds='));
const SEEDS = seedArg ? Number.parseInt(seedArg.split('=')[1] ?? '', 10) : DEFAULT_SEEDS;

const failures: string[] = [];
const buildTimes: number[] = [];
const evalTimes: number[] = [];

function fail(message: string): void {
  if (failures.length < 25) failures.push(message);
}

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
}

/** Clearing the fault list is the "did the repair" primitive. */
function repaired(scenario: DiagnosisScenario): Circuit {
  return { ...scenario.faultedCircuit, faults: [] };
}

/**
 * Rip the faulted wire out without putting anything back. The fault object is
 * gone, but the circuit now has a hole, so this must NOT be graded as fixed —
 * that is exactly the loophole `describeStructuralGap` closes.
 */
function repairedByDeletion(scenario: DiagnosisScenario): Circuit | null {
  const target = primaryScenarioFault(scenario).fault.target;
  if (target.type !== 'wire') return null;
  return {
    ...scenario.faultedCircuit,
    faults: [],
    wires: scenario.faultedCircuit.wires.filter((w) => w.id !== target.id),
  };
}

/** The realistic bench repair: cut out the bad wire, run a fresh one. */
function repairedByReplacement(scenario: DiagnosisScenario): Circuit | null {
  const target = primaryScenarioFault(scenario).fault.target;
  if (target.type !== 'wire') return null;
  const original = scenario.faultedCircuit.wires.find((w) => w.id === target.id);
  if (!original) return null;
  return {
    ...scenario.faultedCircuit,
    faults: [],
    wires: [
      ...scenario.faultedCircuit.wires.filter((w) => w.id !== target.id),
      { ...original, id: `${original.id}-replacement`, fault: undefined },
    ],
  };
}

function timedEval(...args: Parameters<typeof evaluateDiagnosis>) {
  const t0 = performance.now();
  const out = evaluateDiagnosis(...args);
  evalTimes.push(performance.now() - t0);
  return out;
}

for (const difficulty of DIFFICULTIES) {
  for (let i = 0; i < SEEDS; i++) {
    const seed = i * 7919 + 13;
    const tag = `${difficulty}/seed=${seed}`;

    let scenario: DiagnosisScenario;
    try {
      const t0 = performance.now();
      scenario = buildDiagnosisScenario({ seed, difficulty });
      buildTimes.push(performance.now() - t0);
    } catch (error) {
      fail(`${tag}: build threw ${(error as Error).message}`);
      continue;
    }

    // 1. self-consistency — checked for *every* fault the scenario carries, so
    //    this harness keeps working when a tier grows a second one.
    for (const entry of scenario.faults) {
      if (!scenario.locationChoices.some((c) => c.key === entry.locationKey)) {
        fail(`${tag}: the true location is missing from the choices`);
      }
      if (!scenario.faultTypeChoices.some((c) => c.type === entry.fault.type)) {
        fail(`${tag}: the true fault type is missing from the choices`);
      }
    }
    // Two options that read identically are not an answerable question: the
    // learner can be graded wrong for a distinction the UI never showed them.
    // (Found on screen — a socket's live and neutral drops both render as
    // "Wire: RCBO (20 A) → Single 3-Pin Socket (13A)".)
    const labels = scenario.locationChoices.map((c) => c.label);
    const duplicate = labels.find((label, index) => labels.indexOf(label) !== index);
    if (duplicate) {
      fail(`${tag}: two location choices share the label "${duplicate}"`);
    }

    // A plain (non-rage) exercise is single-fault by definition (§14).
    if (scenario.faults.length !== 1) {
      fail(`${tag}: expected exactly one fault, got ${scenario.faults.length}`);
    }
    if (normalizeCircuitFaults(scenario.faultedCircuit).length !== scenario.faults.length) {
      fail(`${tag}: injected fault count disagrees with the scenario`);
    }

    // 2. observability (§12)
    const primary = primaryScenarioFault(scenario);
    if (!scenario.symptom.observable) {
      fail(`${tag}: injected ${primary.fault.type} produced no observable symptom`);
    }

    const truth = { faultType: primary.fault.type, locationKey: primary.locationKey };

    // 3. truthful answer + repair ⇒ success
    const good = timedEval(scenario, repaired(scenario), truth);
    if (good.verdict !== 'success') {
      fail(`${tag}: correct diagnosis + repair gave '${good.verdict}'`);
    }

    // 4. truthful answer, nothing repaired ⇒ incomplete (§16)
    const noFix = timedEval(scenario, scenario.faultedCircuit, truth);
    if (noFix.verdict !== 'incomplete') {
      fail(`${tag}: correct guess with no repair gave '${noFix.verdict}', expected 'incomplete'`);
    }

    // 5/6. half-right answers ⇒ failure
    const otherType = scenario.faultTypeChoices.find((c) => c.type !== primary.fault.type)?.type;
    if (otherType) {
      const wrongType = timedEval(scenario, repaired(scenario), {
        faultType: otherType,
        locationKey: primary.locationKey,
      });
      if (wrongType.verdict !== 'failure') {
        fail(`${tag}: wrong type '${otherType}' gave '${wrongType.verdict}'`);
      }
    }
    const otherLoc = scenario.locationChoices.find((c) => c.key !== primary.locationKey);
    if (otherLoc) {
      const wrongLoc = timedEval(scenario, repaired(scenario), {
        faultType: primary.fault.type,
        locationKey: otherLoc.key,
      });
      if (wrongLoc.verdict !== 'failure') {
        fail(`${tag}: wrong location gave '${wrongLoc.verdict}'`);
      }
    }

    // 7. exhaustive: no other location may ever succeed, even fully repaired
    for (const choice of scenario.locationChoices) {
      if (choice.key === primary.locationKey) continue;
      const verdict = timedEval(scenario, repaired(scenario), {
        faultType: primary.fault.type,
        locationKey: choice.key,
      });
      if (verdict.verdict === 'success') {
        fail(`${tag}: decoy location '${choice.key}' was accepted`);
        break;
      }
    }

    // 8. deletion alone leaves the load dead; replacement genuinely fixes it
    const deleted = repairedByDeletion(scenario);
    if (deleted) {
      const byDelete = timedEval(scenario, deleted, truth);
      if (byDelete.verdict === 'success') {
        fail(`${tag}: deleting the faulted wire (leaving a gap) was graded 'success'`);
      }
      const replaced = repairedByReplacement(scenario);
      if (replaced) {
        const byReplace = timedEval(scenario, replaced, truth);
        if (byReplace.verdict !== 'success') {
          fail(`${tag}: delete-and-replace gave '${byReplace.verdict}', expected 'success'`);
        }
      }
    }

    // 9. determinism
    const twin = buildDiagnosisScenario({ seed, difficulty });
    if (
      twin.challengeId !== scenario.challengeId ||
      primaryScenarioFault(twin).fault.type !== primary.fault.type
    ) {
      fail(`${tag}: rebuild diverged (${twin.challengeId} vs ${scenario.challengeId})`);
    }

    // 10. the answer must not leak into learner-visible copy (§14)
    const leakZone = [
      scenario.complaint,
      scenario.brief,
      scenario.expectedBehaviour,
      ...scenario.hints.slice(0, -1).map((h) => h.text),
    ]
      .join(' ')
      .toLowerCase();
    for (const entry of scenario.faults) {
      const typeWord = entry.fault.type.replace(/-/g, ' ');
      if (leakZone.includes(entry.fault.type) || leakZone.includes(typeWord)) {
        fail(`${tag}: fault type '${entry.fault.type}' leaked into learner-visible copy`);
      }
    }

    // 11. scoring bounds + monotonicity
    const clean = scoreDiagnosis({
      difficulty,
      elapsedMs: 30_000,
      misdiagnoses: 0,
      incompleteRepairs: 0,
      hintsUsed: 0,
    });
    const messy = scoreDiagnosis({
      difficulty,
      elapsedMs: 30_000,
      misdiagnoses: 3,
      incompleteRepairs: 2,
      hintsUsed: 2,
    });
    if (clean.points < 0 || clean.points > 1000 || messy.points < 0 || messy.points > 1000) {
      fail(`${tag}: score outside 0..1000 (${clean.points} / ${messy.points})`);
    }
    if (messy.points >= clean.points) {
      fail(`${tag}: mistakes did not reduce the score (${messy.points} >= ${clean.points})`);
    }
    if (!clean.firstTimeRight || messy.firstTimeRight) {
      fail(`${tag}: firstTimeRight flag is wrong`);
    }
  }
}

const buildP95 = p95(buildTimes);
const evalP95 = p95(evalTimes);
if (buildP95 > BUILD_P95_BUDGET_MS) {
  fail(`scenario build p95 ${buildP95.toFixed(1)} ms exceeds ${BUILD_P95_BUDGET_MS} ms`);
}
if (evalP95 > EVAL_P95_BUDGET_MS) {
  fail(`evaluation p95 ${evalP95.toFixed(1)} ms exceeds ${EVAL_P95_BUDGET_MS} ms`);
}

console.log('— Diagnosis Lab stress —');
console.log(`difficulties : ${DIFFICULTIES.join(', ')}`);
console.log(`seeds each   : ${SEEDS}`);
console.log(`scenarios    : ${buildTimes.length}`);
console.log(`evaluations  : ${evalTimes.length}`);
console.log(`build p95    : ${buildP95.toFixed(1)} ms (budget ${BUILD_P95_BUDGET_MS} ms)`);
console.log(`eval p95     : ${evalP95.toFixed(1)} ms (budget ${EVAL_P95_BUDGET_MS} ms)`);

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\n✓ all diagnosis invariants held');
