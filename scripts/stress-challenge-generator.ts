/**
 * Generator stress test — plan §56 (Phase B: Foundation Lock).
 *
 * Fuzzes the challenge generator across hundreds of seeds per difficulty and
 * per recipe, then drives every candidate through the full challenge loop:
 *
 *   generate → validate → inject fault → verify symptom
 *            → repair → verify recovery → replay determinism
 *
 * Nothing here is production code: fault injection is deliberately a *harness*
 * concern so it never leaks into `src/domain/challenges/generator/**` (§57
 * gate). The harness only consumes the public generator API plus the existing
 * `src/domain/faults` and `src/domain/simulation` engines.
 *
 * Exits non-zero when any invariant breaks or a timing budget is exceeded, so
 * it can gate CI alongside `benchmark:simulation`.
 *
 * Usage:
 *   npm run stress:generator
 *   npm run stress:generator -- --seeds=2000 --verbose
 */

import { performance } from 'node:perf_hooks';
import {
  CHALLENGE_RECIPES,
  type ChallengeDifficulty,
  GENERATOR_VERSION,
  type GeneratedChallenge,
  computeChallengeIdentity,
  tryGenerateChallenge,
} from '@electrasim/domain/challenges';
import { validateCircuit } from '@electrasim/domain/circuitValidation';
import { COMPONENT_DEFS } from '@electrasim/domain/components';
import {
  createInjectedFault,
  isFaultResolved,
  normalizeCircuitFaults,
  validateFaultCoexistence,
} from '@electrasim/domain/faults';
import { collectObstacles, computeOrthogonalPath, getPortPos } from '@electrasim/domain/geometry';
import { simulate } from '@electrasim/domain/simulation';
import type {
  Circuit,
  ComponentInstance,
  FaultTarget,
  FaultType,
  InjectedFault,
  Point2D,
  SimulationResult,
} from '@electrasim/domain/types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DIFFICULTIES: ChallengeDifficulty[] = ['beginner', 'intermediate', 'advanced'];

/** Seeds fuzzed per difficulty. Override with `--seeds=N`. */
const DEFAULT_SEEDS_PER_DIFFICULTY = 750;

/** Seeds fuzzed per recipe when a recipe is pinned explicitly. */
const SEEDS_PER_PINNED_RECIPE = 120;

/** Generation-time budgets (milliseconds), enforced per difficulty. */
const MEDIAN_BUDGET_MS = 5;
const P95_BUDGET_MS = 20;

/** Full-loop budget: generate + validate + inject + repair + replay. */
const LOOP_P95_BUDGET_MS = 120;

/** Fault kinds exercised on every candidate, with the target family each uses. */
const FAULT_MATRIX: { type: FaultType; targets: 'wires' | 'ports' | 'protection' }[] = [
  { type: 'open-circuit', targets: 'wires' },
  { type: 'open-live', targets: 'wires' },
  { type: 'open-neutral', targets: 'wires' },
  { type: 'short-circuit', targets: 'wires' },
  { type: 'earth-fault', targets: 'wires' },
  { type: 'live-to-earth', targets: 'wires' },
  { type: 'reverse-polarity', targets: 'wires' },
  { type: 'terminal-disconnect', targets: 'ports' },
  { type: 'protection-forced-open', targets: 'protection' },
];

/**
 * `open-earth` removes only the CPC. On a TN circuit with no earth-referenced
 * measurement it is intentionally *silent* in the load-energisation sense — it
 * is a safety defect, not a functional one. It is stress-tested for stability
 * and repair, but exempt from the "must change observable behaviour" rule.
 */
const BEHAVIOURALLY_SILENT_FAULTS = new Set<FaultType>(['open-earth']);

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined =>
  argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const has = (name: string): boolean => argv.includes(`--${name}`);

const SEEDS_PER_DIFFICULTY = Number(flag('seeds') ?? DEFAULT_SEEDS_PER_DIFFICULTY);
const VERBOSE = has('verbose');

// ---------------------------------------------------------------------------
// Failure collection
// ---------------------------------------------------------------------------

interface Failure {
  stage: string;
  difficulty: ChallengeDifficulty;
  seed: number;
  recipeId: string;
  detail: string;
}

const failures: Failure[] = [];
const MAX_REPORTED_FAILURES = 40;

function fail(
  stage: string,
  ctx: { difficulty: ChallengeDifficulty; seed: number; recipeId: string },
  detail: string,
): void {
  failures.push({ stage, ...ctx, detail });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Structural fingerprint used for deterministic-replay comparison. */
function fingerprint(circuit: Circuit): string {
  return JSON.stringify({
    v: circuit.globalVoltage,
    c: circuit.components.map((c) => [c.id, c.type, c.x, c.y, c.state]),
    w: circuit.wires.map((w) => [
      w.id,
      w.fromComponentId,
      w.fromPortIndex,
      w.toComponentId,
      w.toPortIndex,
      w.lengthMeters,
      w.customCableMm2,
      w.material,
      w.installationMethod,
    ]),
  });
}

function withFaults(circuit: Circuit, faults: InjectedFault[]): Circuit {
  return { ...circuit, faults };
}

/** Observable, *electrical* consequences of a fault — never diagnostic prose. */
interface Symptom {
  deEnergisedLoads: string[];
  tripped: boolean;
  blown: boolean;
  newErrorComponents: boolean;
  newErrorWires: boolean;
  newErrors: boolean;
  observable: boolean;
}

function diffSymptom(
  base: SimulationResult,
  faulted: SimulationResult,
  loadIds: string[],
): Symptom {
  const deEnergisedLoads = loadIds.filter(
    (id) => base.energizedComponents.has(id) && !faulted.energizedComponents.has(id),
  );
  const tripped = (faulted.trippedComponents?.length ?? 0) > (base.trippedComponents?.length ?? 0);
  const blown = (faulted.blownComponents?.length ?? 0) > (base.blownComponents?.length ?? 0);
  const newErrorComponents = faulted.errorComponents.size > base.errorComponents.size;
  const newErrorWires = faulted.errorWires.size > base.errorWires.size;
  const newErrors = faulted.errors.length > base.errors.length;
  return {
    deEnergisedLoads,
    tripped,
    blown,
    newErrorComponents,
    newErrorWires,
    newErrors,
    observable:
      deEnergisedLoads.length > 0 ||
      tripped ||
      blown ||
      newErrorComponents ||
      newErrorWires ||
      newErrors,
  };
}

/** Did the circuit return exactly to its pre-fault electrical state? */
function isFullRecovery(base: SimulationResult, repaired: SimulationResult): string | null {
  if (repaired.errors.length !== base.errors.length)
    return `errors ${base.errors.length} → ${repaired.errors.length}`;
  if (repaired.energizedComponents.size !== base.energizedComponents.size)
    return `energised components ${base.energizedComponents.size} → ${repaired.energizedComponents.size}`;
  if (repaired.energizedWires.size !== base.energizedWires.size)
    return `energised wires ${base.energizedWires.size} → ${repaired.energizedWires.size}`;
  if (repaired.errorComponents.size !== 0)
    return `${repaired.errorComponents.size} error components remain`;
  if (repaired.errorWires.size !== 0) return `${repaired.errorWires.size} error wires remain`;
  if ((repaired.trippedComponents?.length ?? 0) !== 0) return 'a device is still tripped';
  if (repaired.faultsCleared === false) return 'faultsCleared is false';
  return null;
}

function isAxisAligned(points: Point2D[]): boolean {
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (a.x !== b.x && a.y !== b.y) return false;
  }
  return true;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.POSITIVE_INFINITY;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
}

// ---------------------------------------------------------------------------
// Per-candidate checks
// ---------------------------------------------------------------------------

interface Ctx {
  difficulty: ChallengeDifficulty;
  seed: number;
  recipeId: string;
}

/** Re-run the production validators on the finished artefact. */
function checkBaseline(challenge: GeneratedChallenge, ctx: Ctx): SimulationResult | null {
  const { circuit, scenario } = challenge;
  const result = simulate(circuit, { appMode: 'pro' });

  if (result.errors.length > 0)
    fail('baseline-simulation', ctx, `errors: ${result.errors.join('; ')}`);
  if (result.faultsCleared === false)
    fail('baseline-simulation', ctx, 'faultsCleared is false on a clean circuit');

  const report = validateCircuit(circuit, result, 'uk');
  const blocking = report.issues.filter((i) => i.severity === 'error');
  if (blocking.length > 0)
    fail('baseline-validation', ctx, blocking.map((i) => `${i.id}: ${i.title}`).join('; '));
  if (report.status === 'empty' || report.status === 'incomplete')
    fail('baseline-validation', ctx, `status ${report.status}`);

  for (const id of scenario.loadComponentIds) {
    if (!result.energizedComponents.has(id))
      fail('baseline-behaviour', ctx, `declared load ${id} is not energised at rest`);
  }
  if (result.errors.length > 0) return null;
  return result;
}

/** Every wire must render as a clean orthogonal route, never the diagonal fallback. */
function checkRoutability(challenge: GeneratedChallenge, ctx: Ctx): void {
  const byId = new Map<string, ComponentInstance>(
    challenge.circuit.components.map((c) => [c.id, c]),
  );
  for (const wire of challenge.circuit.wires) {
    const from = byId.get(wire.fromComponentId);
    const to = byId.get(wire.toComponentId);
    if (!from || !to) {
      fail('routing', ctx, `wire ${wire.id} has a dangling endpoint`);
      continue;
    }
    const path = computeOrthogonalPath(
      getPortPos(from, wire.fromPortIndex, COMPONENT_DEFS),
      getPortPos(to, wire.toPortIndex, COMPONENT_DEFS),
      collectObstacles(byId, COMPONENT_DEFS, wire.fromComponentId, wire.toComponentId),
    );
    if (!isAxisAligned(path))
      fail(
        'routing',
        ctx,
        `wire ${wire.id} fell back to a diagonal route (${from.type} → ${to.type})`,
      );
  }
}

/** A generated challenge must survive the persistence round trip byte-for-byte. */
function checkSerialisation(
  challenge: GeneratedChallenge,
  baseline: SimulationResult,
  ctx: Ctx,
): void {
  const round = JSON.parse(JSON.stringify(challenge.circuit)) as Circuit;
  if (fingerprint(round) !== fingerprint(challenge.circuit))
    fail('serialisation', ctx, 'circuit changed across a JSON round trip');
  const result = simulate(round, { appMode: 'pro' });
  if (result.energizedComponents.size !== baseline.energizedComponents.size)
    fail('serialisation', ctx, 'rehydrated circuit simulates differently');
}

/** The §56 loop: inject → verify symptom → repair → verify recovery. */
function checkFaultLoop(
  challenge: GeneratedChallenge,
  baseline: SimulationResult,
  ctx: Ctx,
  tally: Tally,
): void {
  const { circuit, scenario } = challenge;
  const loadIds = scenario.loadComponentIds;

  for (const { type, targets } of FAULT_MATRIX) {
    const targetList: FaultTarget[] =
      targets === 'wires'
        ? circuit.wires.map((w) => ({ type: 'wire', id: w.id }))
        : targets === 'ports'
          ? circuit.wires.map((w) => ({
              type: 'port',
              componentId: w.toComponentId,
              portIndex: w.toPortIndex,
            }))
          : scenario.protectionComponentIds.map((id) => ({ type: 'component', id }));

    for (const target of targetList) {
      const fault = createInjectedFault(type, target);

      // Coexistence must accept a single fault on a clean circuit.
      const coexistence = validateFaultCoexistence([], fault);
      if (!coexistence.valid)
        fail(
          'fault-coexistence',
          ctx,
          `${type} rejected on a clean circuit: ${coexistence.reason}`,
        );

      const faultedCircuit = withFaults(circuit, [fault]);

      // Normalisation must surface exactly the one fault we injected.
      const normalised = normalizeCircuitFaults(faultedCircuit);
      const matching = normalised.filter((f) => f.type === type && f.target.type === target.type);
      if (matching.length === 0)
        fail('fault-normalisation', ctx, `${type} disappeared from normalizeCircuitFaults`);

      const faulted = simulate(faultedCircuit, { appMode: 'pro' });
      const symptom = diffSymptom(baseline, faulted, loadIds);
      tally.faultsInjected += 1;

      if (symptom.observable) tally.faultsObservable += 1;
      else if (!BEHAVIOURALLY_SILENT_FAULTS.has(type))
        fail(
          'fault-observability',
          ctx,
          `${type} on ${describeTarget(target)} produced no observable symptom`,
        );

      // The fault must not be reported as resolved while it is still present.
      if (isFaultResolved(fault, faultedCircuit, faulted))
        fail('fault-liveness', ctx, `${type} reported resolved while still injected`);

      // --- Repair leg 1: clear the fault (the Diagnosis Lab "fix it" action).
      const cleared = withFaults(faultedCircuit, []);
      const clearedResult = simulate(cleared, { appMode: 'pro' });
      if (!isFaultResolved(fault, cleared, clearedResult))
        fail('repair-clear', ctx, `${type} not resolved after clearing`);
      const clearRegression = isFullRecovery(baseline, clearedResult);
      if (clearRegression) fail('repair-clear', ctx, `${type}: ${clearRegression}`);
      else tally.repairsVerified += 1;

      // --- Repair leg 2: delete the faulted target (the "rewire it" action).
      if (target.type === 'wire') {
        const rewired: Circuit = {
          ...faultedCircuit,
          wires: faultedCircuit.wires.filter((w) => w.id !== target.id),
        };
        const rewiredResult = simulate(rewired, { appMode: 'pro' });
        if (!isFaultResolved(fault, rewired, rewiredResult))
          fail('repair-delete', ctx, `${type} not resolved after deleting wire ${target.id}`);
        else tally.repairsVerified += 1;
      }
    }
  }
}

function describeTarget(target: FaultTarget): string {
  return target.type === 'port'
    ? `port ${target.componentId}:${target.portIndex}`
    : `${target.type} ${target.id}`;
}

// ---------------------------------------------------------------------------
// Tallies
// ---------------------------------------------------------------------------

interface Tally {
  generated: number;
  generationFailures: number;
  retries: number;
  faultsInjected: number;
  faultsObservable: number;
  repairsVerified: number;
  genTimes: number[];
  loopTimes: number[];
  componentCounts: number[];
  recipeHits: Map<string, number>;
}

function newTally(): Tally {
  return {
    generated: 0,
    generationFailures: 0,
    retries: 0,
    faultsInjected: 0,
    faultsObservable: 0,
    repairsVerified: 0,
    genTimes: [],
    loopTimes: [],
    componentCounts: [],
    recipeHits: new Map(),
  };
}

// ---------------------------------------------------------------------------
// Main sweep
// ---------------------------------------------------------------------------

function runSeed(
  difficulty: ChallengeDifficulty,
  seed: number,
  recipeId: string | undefined,
  tally: Tally,
): void {
  const loopStart = performance.now();
  const genStart = performance.now();
  const outcome = tryGenerateChallenge({ seed, difficulty, ...(recipeId ? { recipeId } : {}) });
  const genMs = performance.now() - genStart;

  if (!outcome.ok) {
    tally.generationFailures += 1;
    fail(
      'generation',
      { difficulty, seed, recipeId: recipeId ?? '(any)' },
      outcome.rejection?.reasons?.join('; ') ?? 'generation failed',
    );
    return;
  }

  const challenge = outcome.challenge;
  const ctx: Ctx = { difficulty, seed, recipeId: challenge.metadata.recipeId };

  tally.generated += 1;
  tally.genTimes.push(genMs);
  tally.retries += challenge.metadata.attempts - 1;
  tally.componentCounts.push(challenge.circuit.components.length);
  tally.recipeHits.set(ctx.recipeId, (tally.recipeHits.get(ctx.recipeId) ?? 0) + 1);

  // Deterministic replay: the same request must rebuild an identical artefact.
  const replay = tryGenerateChallenge({ seed, difficulty, ...(recipeId ? { recipeId } : {}) });
  if (!replay.ok) fail('replay', ctx, 'replay of a successful seed failed');
  else {
    if (fingerprint(replay.challenge.circuit) !== fingerprint(challenge.circuit))
      fail('replay', ctx, 'replayed circuit differs from the original');
    if (replay.challenge.metadata.challengeId !== challenge.metadata.challengeId)
      fail('replay', ctx, 'replayed challengeId differs');
    if (replay.challenge.metadata.recipeId !== challenge.metadata.recipeId)
      fail('replay', ctx, 'replayed recipeId differs');
  }

  // Version divergence: bumping the generator version must change the artefact.
  const nextVersion = tryGenerateChallenge({
    seed,
    difficulty,
    generatorVersion: GENERATOR_VERSION + 1,
    ...(recipeId ? { recipeId } : {}),
  });
  if (
    nextVersion.ok &&
    nextVersion.challenge.metadata.challengeId === challenge.metadata.challengeId
  )
    fail('versioning', ctx, 'generatorVersion bump did not change the challenge identity');

  // Identity must be reproducible from metadata alone.
  const identity = computeChallengeIdentity({
    generatorVersion: challenge.metadata.generatorVersion,
    seed: challenge.metadata.seed,
    difficulty: challenge.metadata.difficulty,
    mode: challenge.metadata.mode,
    ...(challenge.metadata.rageProfile ? { rageProfile: challenge.metadata.rageProfile } : {}),
  });
  if (identity.displayId !== challenge.metadata.challengeId)
    fail(
      'identity',
      ctx,
      `recomputed identity ${identity.displayId} ≠ ${challenge.metadata.challengeId}`,
    );

  const baseline = checkBaseline(challenge, ctx);
  checkRoutability(challenge, ctx);
  if (baseline) {
    checkSerialisation(challenge, baseline, ctx);
    checkFaultLoop(challenge, baseline, ctx, tally);
  }

  tally.loopTimes.push(performance.now() - loopStart);
}

function report(label: string, tally: Tally): boolean {
  const gen = [...tally.genTimes].sort((a, b) => a - b);
  const loop = [...tally.loopTimes].sort((a, b) => a - b);
  const genMedian = percentile(gen, 0.5);
  const genP95 = percentile(gen, 0.95);
  const loopP95 = percentile(loop, 0.95);
  const comps = [...tally.componentCounts].sort((a, b) => a - b);

  console.log(`\n${label}`);
  console.log(
    `  generated ${tally.generated}  failures ${tally.generationFailures}  retries ${tally.retries}`,
  );
  console.log(
    `  components ${comps[0] ?? 0}–${comps[comps.length - 1] ?? 0}  recipes hit ${tally.recipeHits.size}`,
  );
  console.log(
    `  generation median ${genMedian.toFixed(3)} ms  p95 ${genP95.toFixed(3)} ms  (budget ${MEDIAN_BUDGET_MS}/${P95_BUDGET_MS} ms)`,
  );
  console.log(`  full loop p95 ${loopP95.toFixed(1)} ms  (budget ${LOOP_P95_BUDGET_MS} ms)`);
  console.log(
    `  faults injected ${tally.faultsInjected}  observable ${tally.faultsObservable}  repairs verified ${tally.repairsVerified}`,
  );
  if (VERBOSE) {
    for (const [recipe, count] of [...tally.recipeHits].sort((a, b) => b[1] - a[1]))
      console.log(`    ${recipe.padEnd(34)} ${count}`);
  }

  let ok = true;
  if (tally.generationFailures > 0) ok = false;
  if (genMedian > MEDIAN_BUDGET_MS) {
    console.error(
      `  ✗ generation median ${genMedian.toFixed(3)} ms exceeds ${MEDIAN_BUDGET_MS} ms`,
    );
    ok = false;
  }
  if (genP95 > P95_BUDGET_MS) {
    console.error(`  ✗ generation p95 ${genP95.toFixed(3)} ms exceeds ${P95_BUDGET_MS} ms`);
    ok = false;
  }
  if (loopP95 > LOOP_P95_BUDGET_MS) {
    console.error(`  ✗ full-loop p95 ${loopP95.toFixed(1)} ms exceeds ${LOOP_P95_BUDGET_MS} ms`);
    ok = false;
  }
  return ok;
}

// --- Sweep 1: seed fuzz per difficulty (recipe chosen by the generator).

console.log(
  `Generator stress test — ${SEEDS_PER_DIFFICULTY} seeds × ${DIFFICULTIES.length} difficulties, ` +
    `plus ${SEEDS_PER_PINNED_RECIPE} seeds × ${CHALLENGE_RECIPES.length} pinned recipes.`,
);

let budgetsOk = true;
const overall = newTally();

for (const difficulty of DIFFICULTIES) {
  const tally = newTally();
  for (let seed = 1; seed <= SEEDS_PER_DIFFICULTY; seed += 1) {
    runSeed(difficulty, seed, undefined, tally);
  }
  budgetsOk = report(`Difficulty: ${difficulty}`, tally) && budgetsOk;

  const expected = CHALLENGE_RECIPES.filter((r) => r.difficulty === difficulty).length;
  if (tally.recipeHits.size !== expected) {
    console.error(`  ✗ only ${tally.recipeHits.size}/${expected} recipes were ever selected`);
    budgetsOk = false;
  }
  overall.faultsInjected += tally.faultsInjected;
  overall.repairsVerified += tally.repairsVerified;
  overall.generated += tally.generated;
}

// --- Sweep 2: every recipe pinned, so rare recipes get equal coverage.

for (const recipe of CHALLENGE_RECIPES) {
  const tally = newTally();
  for (let seed = 1; seed <= SEEDS_PER_PINNED_RECIPE; seed += 1) {
    runSeed(recipe.difficulty, seed * 7919 + 13, recipe.id, tally);
  }
  if (tally.generationFailures > 0 || VERBOSE) {
    budgetsOk = report(`Recipe: ${recipe.id}`, tally) && budgetsOk;
  } else {
    const gen = [...tally.genTimes].sort((a, b) => a - b);
    console.log(
      `  ${recipe.id.padEnd(34)} ${tally.generated} ok, ${tally.retries} retries, ` +
        `median ${percentile(gen, 0.5).toFixed(3)} ms, ${tally.faultsInjected} faults`,
    );
  }
  if (tally.generationFailures > 0) budgetsOk = false;
  overall.faultsInjected += tally.faultsInjected;
  overall.repairsVerified += tally.repairsVerified;
  overall.generated += tally.generated;
}

// --- Sweep 3: adversarial seed values.

const ADVERSARIAL_SEEDS = [
  0,
  -1,
  -999_999,
  1.5,
  0.1,
  2 ** 31,
  2 ** 32,
  2 ** 32 + 1,
  Number.MAX_SAFE_INTEGER,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
];
const adversarial = newTally();
for (const difficulty of DIFFICULTIES) {
  for (const seed of ADVERSARIAL_SEEDS) runSeed(difficulty, seed, undefined, adversarial);
}
console.log(
  `\nAdversarial seeds: ${adversarial.generated}/${ADVERSARIAL_SEEDS.length * DIFFICULTIES.length} generated, ` +
    `${adversarial.generationFailures} failures, ${adversarial.faultsInjected} faults exercised`,
);
if (adversarial.generationFailures > 0) budgetsOk = false;
overall.faultsInjected += adversarial.faultsInjected;
overall.repairsVerified += adversarial.repairsVerified;
overall.generated += adversarial.generated;

// --- Sweep 4: identity collision resistance across a large seed space.

const seenHashes = new Map<number, string>();
let hashCollisions = 0;
const IDENTITY_SAMPLES = 20_000;
for (let seed = 1; seed <= IDENTITY_SAMPLES; seed += 1) {
  for (const difficulty of DIFFICULTIES) {
    const identity = computeChallengeIdentity({
      generatorVersion: GENERATOR_VERSION,
      seed,
      difficulty,
      mode: 'challenge',
    });
    const key = `${difficulty}:${seed}`;
    const previous = seenHashes.get(identity.hash);
    if (previous && previous !== key) hashCollisions += 1;
    else seenHashes.set(identity.hash, key);
  }
}
const totalIdentities = IDENTITY_SAMPLES * DIFFICULTIES.length;
// Birthday bound for a 32-bit space; allow 4× headroom before failing.
const collisionBudget = Math.ceil(((totalIdentities * totalIdentities) / (2 * 2 ** 32)) * 4);
console.log(
  `Identity hashes: ${hashCollisions} collisions across ${totalIdentities} samples (budget ${collisionBudget})`,
);
if (hashCollisions > collisionBudget) {
  console.error('  ✗ identity hash collisions exceed the birthday-bound budget');
  budgetsOk = false;
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

console.log(
  `\nTotals: ${overall.generated} challenges generated, ${overall.faultsInjected} faults injected, ` +
    `${overall.repairsVerified} repairs verified.`,
);

if (failures.length > 0) {
  const grouped = new Map<string, number>();
  for (const f of failures) grouped.set(f.stage, (grouped.get(f.stage) ?? 0) + 1);
  console.error(`\n${failures.length} invariant failures:`);
  for (const [stage, count] of [...grouped].sort((a, b) => b[1] - a[1]))
    console.error(`  ${stage.padEnd(24)} ${count}`);
  console.error('\nFirst failures:');
  for (const f of failures.slice(0, MAX_REPORTED_FAILURES))
    console.error(`  [${f.stage}] ${f.difficulty} seed ${f.seed} ${f.recipeId}: ${f.detail}`);
  if (failures.length > MAX_REPORTED_FAILURES)
    console.error(`  … and ${failures.length - MAX_REPORTED_FAILURES} more`);
  process.exitCode = 1;
} else if (!budgetsOk) {
  console.error('\nAll invariants held, but a budget was exceeded.');
  process.exitCode = 1;
} else {
  console.log('\n✓ Generator foundation stress test passed.');
}
