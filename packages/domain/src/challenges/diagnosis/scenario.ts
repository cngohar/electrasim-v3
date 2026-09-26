/**
 * Diagnosis Scenario schema (plan §1.3, §13–§15, §17; Phase D steps 1–5).
 *
 * The Diagnosis Lab inverts Challenge Mode. There the learner builds a circuit
 * from nothing; here they are handed a *working installation that has stopped
 * working* and must find out why:
 *
 *     Circuit Generator → valid circuit → fault scenario → intentional fault
 *       → user diagnoses → user repairs → simulation confirms recovery
 *
 * Like Challenge Mode this module owns no generator (§51) and no fault model
 * (§13). It calls the locked `generateChallenge()`, then places one fault via
 * the existing fault registry, then proves the fault is visible (§12). If it
 * is not visible the candidate is thrown away and another seed is tried —
 * a scenario whose fault cannot be observed is not a puzzle, it is a bug.
 *
 * Everything is derived from `(seed, generatorVersion, difficulty)`, so those
 * three values are all that persistence needs (§21).
 */

import { COMPONENT_DEFS } from '../../components';
import { getFaultDefinition } from '../../faults';
import { simulate } from '../../simulation/simulate';
import type { Circuit, FaultTarget, FaultType, InjectedFault, SimulationResult } from '../../types';
import { getDifficultyProfile } from '../difficulty/profiles';
import {
  type FaultCandidate,
  collectFaultCandidates,
  eligibleFaultTypes,
} from '../faults/eligibility';
import {
  createScenarioFault,
  describeFaultTarget,
  selectFaultCandidate,
  withScenarioFaults,
} from '../faults/injection';
import { labelById } from '../faults/labels';
import {
  type FaultSymptom,
  describeSymptom,
  diffSymptom,
  isMisleadingPlacement,
  sameObservableWorld,
} from '../faults/verification';
import { generateChallenge } from '../generator/generator';
import { GENERATOR_VERSION, createSeededRng, normalizeSeed } from '../generator/seed';
import {
  applyCandidateStage,
  applyCircuitStage,
  applyPresentationStage,
  applySelectionStage,
  buildRageSummary,
} from '../rage/runner';
import { getRageTier, rageProfileKey } from '../rage/tiers';
import type { RageApplication, RageSummary, RageTierId } from '../rage/types';
import type { ChallengeDifficulty, ChallengeIdentity } from '../types';

/** Progressive hint (plan §17: observation → direction → location). */
export interface DiagnosisHint {
  level: 1 | 2 | 3;
  kind: 'observation' | 'direction' | 'location';
  text: string;
}

/** One option in the "what is wrong?" question (plan §15A). */
export interface FaultTypeChoice {
  type: FaultType;
  label: string;
  description: string;
}

/**
 * One injected fault, with everything the grader needs to judge it on its own.
 *
 * A scenario carries a *list* of these (plan §26 allows "multiple faults", §27
 * Rage 3/4 require them). Even a normal exercise uses the list — with exactly
 * one entry — so there is a single code path rather than a singular case and a
 * plural case that drift apart.
 *
 * The fault itself is an ordinary `InjectedFault` (§13: no parallel fault
 * representation). What is added here is scenario-level knowledge: where the
 * learner has to point (`locationKey`) and what this fault does **by itself**
 * (`symptom`), which is what makes each fault independently gradeable.
 */
export interface ScenarioFault {
  fault: InjectedFault;
  /** Correct answer to §15B for this fault, as a `locationChoices` key. */
  locationKey: string;
  /**
   * Symptom measured with **only this fault** injected (§12 applies per fault).
   *
   * For a single-fault scenario this is the scenario symptom. For a multi-fault
   * scenario it is the evidence that this particular fault is not invisible
   * behind its sibling — a fault nobody can observe is not diagnosable.
   */
  symptom: FaultSymptom;
}

/** One option in the "where is it wrong?" question (plan §15B). */
export interface FaultLocationChoice {
  /** Stable key — `wire:<id>`, `component:<id>` or `port:<id>:<index>`. */
  key: string;
  kind: 'wire' | 'component' | 'port';
  label: string;
  /** Ids the canvas should highlight when this option is focused. */
  wireId?: string;
  componentId?: string;
  portIndex?: number;
}

export interface DiagnosisScenario {
  /** Stable id — `ES-DIAG-######` (plan §29). */
  challengeId: string;
  identity: ChallengeIdentity;
  seed: number;
  generatorVersion: number;
  difficulty: ChallengeDifficulty;
  recipeId: string;

  title: string;
  /** Deliberately vague opening line — §14 forbids naming the fault. */
  complaint: string;
  brief: string;
  teaches: string;
  /** What the installation does when it is healthy. */
  expectedBehaviour: string;

  /**
   * The circuit the learner works on — the healthy circuit **with the fault
   * already injected**. This is what gets loaded into the editor.
   */
  faultedCircuit: Circuit;
  /** The healthy circuit, kept as the recovery reference. Never shown. */
  healthyCircuit: Circuit;

  /**
   * The answer: every fault that was injected, in a deterministic order.
   *
   * Always at least one entry. An ordinary exercise has exactly one; §26/§27
   * allow an Ohmageddon scenario to carry more. Consumers must not assume the
   * length — use {@link primaryScenarioFault} when a single representative is
   * genuinely wanted (a stats bucket, a log line), and iterate otherwise.
   */
  faults: ScenarioFault[];
  /**
   * How the installation misbehaves with **all** the injected faults present —
   * the state the learner actually observes (§12).
   *
   * With one fault this equals `faults[0].symptom`. With several it may differ
   * from any individual fault's symptom, which is the whole point of a
   * compound scenario (§26 "compound diagnostic scenarios").
   */
  symptom: FaultSymptom;

  /** Multiple-choice options for "what is wrong?" (§15A). */
  faultTypeChoices: FaultTypeChoice[];
  /** Options for "where is it wrong?" (§15B). */
  locationChoices: FaultLocationChoice[];

  hints: DiagnosisHint[];
  hintBudget: number;
  parTimeSeconds: number;

  /** Load component ids whose behaviour the learner is watching. */
  loadComponentIds: string[];
  /** Labels of the loads that went dead — used in the complaint text. */
  deadLoadLabels: string[];

  /**
   * Ohmageddon summary, or `null` for an ordinary exercise (plan §24).
   *
   * This field IS the §24 safety guarantee in data form: a normal scenario
   * carries `rage: null`, and the only way it becomes non-null is an explicit
   * `rageTier` on the build request. `buildDiagnosisScenario` never invents
   * one, so "normal mode never receives Ohmageddon modifiers" is a property of
   * the type, not of a code path someone has to remember to check.
   */
  rage: RageSummary | null;
}

export interface BuildDiagnosisScenarioRequest {
  seed: number;
  difficulty: ChallengeDifficulty;
  generatorVersion?: number;
  recipeId?: string;
  /**
   * Bounded retries (plan §37). Each attempt re-seeds the generator, so a
   * circuit whose fault turned out to be invisible is replaced rather than
   * patched.
   */
  maxAttempts?: number;
  /**
   * Ohmageddon tier (plan §23–§27). **Omit for normal exercises.**
   *
   * The caller must have checked `settings.ohmageddonMode` before setting
   * this; the domain deliberately does not read settings, so this parameter is
   * the single, explicit boundary between the normal and rage worlds (§24).
   */
  rageTier?: RageTierId;
}

export const MAX_SCENARIO_ATTEMPTS = 10;

/** Raised when no seed in the retry budget produced an observable fault. */
export class DiagnosisScenarioError extends Error {
  readonly rejections: string[];
  constructor(message: string, rejections: string[]) {
    super(message);
    this.name = 'DiagnosisScenarioError';
    this.rejections = rejections;
  }
}

/**
 * Build a diagnosis scenario, retrying until the injected fault is provably
 * observable (plan §12 — this gate is mandatory).
 */
export function buildDiagnosisScenario(request: BuildDiagnosisScenarioRequest): DiagnosisScenario {
  const generatorVersion = request.generatorVersion ?? GENERATOR_VERSION;
  const maxAttempts = request.maxAttempts ?? MAX_SCENARIO_ATTEMPTS;
  const baseSeed = normalizeSeed(request.seed);
  const rejections: string[] = [];

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // Derive a fresh seed per attempt so a rejected circuit is *replaced*,
    // not re-faulted — the generator core stays untouched (§57).
    const seed = attempt === 0 ? baseSeed : normalizeSeed(baseSeed + attempt * 7919);
    const built = tryBuildScenario({
      ...request,
      seed,
      generatorVersion,
      // Explicit rather than relying on the spread, so the §24 boundary is
      // visible at the one place rage can enter the pipeline.
      ...(request.rageTier ? { rageTier: request.rageTier } : {}),
    });
    if (built.ok) return built.scenario;
    rejections.push(`seed ${seed}: ${built.reason}`);
  }

  throw new DiagnosisScenarioError(
    `Could not build an observable diagnosis scenario in ${maxAttempts} attempts`,
    rejections,
  );
}

type BuildOutcome = { ok: true; scenario: DiagnosisScenario } | { ok: false; reason: string };

function tryBuildScenario(request: {
  seed: number;
  difficulty: ChallengeDifficulty;
  generatorVersion: number;
  recipeId?: string;
  rageTier?: RageTierId;
}): BuildOutcome {
  const { seed, difficulty, generatorVersion, recipeId, rageTier } = request;

  // §25: the SAME generator. Rage changes the identity inputs (so a rage
  // exercise gets its own `ES-RAGE-######`) but never the pipeline.
  const mode = rageTier ? 'rage' : 'diagnosis';
  const rageProfile = rageTier ? rageProfileKey(rageTier) : undefined;

  const generated = generateChallenge({
    seed,
    difficulty,
    mode,
    generatorVersion,
    recipeId,
    ...(rageProfile ? { rageProfile } : {}),
  });

  let healthyCircuit = generated.circuit;
  let scenarioInfo = generated.scenario;
  const baseline0 = simulate(healthyCircuit, { appMode: 'pro' });

  // A scenario is only meaningful if the healthy circuit actually works —
  // the learner must have a "correct" state to restore.
  if (baseline0.errors.length > 0) {
    return { ok: false, reason: 'baseline circuit is not clean' };
  }

  const rng = createSeededRng({
    generatorVersion,
    seed,
    difficulty,
    mode,
    ...(rageProfile ? { rageProfile } : {}),
  }).fork('diagnosis-fault');

  // ── Ohmageddon stage ① — reshape the circuit (plan §25) ──────────────────
  // Skipped entirely when `rageTier` is absent, which is the §24 guarantee.
  const rageApplications: RageApplication[] = [];
  let decoyComponentIds: string[] = [];
  if (rageTier) {
    const staged = applyCircuitStage({
      circuit: healthyCircuit,
      scenario: scenarioInfo,
      difficulty,
      tier: rageTier,
      rng: rng.fork('rage-circuit'),
      expectedEnergisedLoadIds: generated.metadata.baseline.expectedEnergisedLoadIds,
    });
    healthyCircuit = staged.circuit;
    scenarioInfo = { ...scenarioInfo, faultCandidateWireIds: staged.faultCandidateWireIds };
    decoyComponentIds = staged.decoyComponentIds;
    rageApplications.push(...staged.applications);
  }

  // Re-measured after the transform: everything downstream (symptom, recovery,
  // structural diff) must be judged against the circuit the learner actually
  // sees, not the pre-modifier one.
  const baseline = rageTier ? simulate(healthyCircuit, { appMode: 'pro' }) : baseline0;
  if (baseline.errors.length > 0) {
    return { ok: false, reason: 'rage-modified baseline is not clean' };
  }

  const allCandidates = collectFaultCandidates(healthyCircuit, scenarioInfo);
  let candidates = allCandidates;
  // The unranked-but-decoy-filtered pool a second fault may fall back to.
  // Starts as the full list and is replaced by the candidate stage, which is
  // the thing that knows which candidates touch a decoy.
  let selectionPool: readonly FaultCandidate[] = allCandidates;
  if (candidates.length === 0) {
    return { ok: false, reason: 'no eligible fault candidates' };
  }

  // ── Ohmageddon stage ② — re-rank the candidates ──────────────────────────
  if (rageTier) {
    const ranked = applyCandidateStage({
      circuit: healthyCircuit,
      candidates,
      loadComponentIds: scenarioInfo.loadComponentIds,
      difficulty,
      tier: rageTier,
      rng: rng.fork('rage-candidates'),
      decoyComponentIds,
    });
    candidates = ranked.candidates;
    selectionPool = ranked.pool;
    rageApplications.push(...ranked.applications);
  }

  // Kept so a later proof (misleadingSymptom) can swap the primary without
  // reaching past the ranking that just ran.
  const rankedPool: readonly FaultCandidate[] = candidates;

  const candidate = selectFaultCandidate(candidates, rng);
  if (!candidate) return { ok: false, reason: 'fault selection produced nothing' };

  // The selected candidates, in the order they were chosen. A normal scenario
  // has exactly one; §27's Rage 3/4 add a second through the selection stage
  // below, which proposes and never replaces.
  let selected: FaultCandidate[] = [candidate];
  // Standby proposals, best first, used when one fails the §12 gate below.
  let alternatives: FaultCandidate[] = [];

  // ── Ohmageddon stage ②b — add further faults ─────────────────────────────
  if (rageTier) {
    const chosen = applySelectionStage({
      circuit: healthyCircuit,
      candidates,
      pool: selectionPool,
      selected,
      loadComponentIds: scenarioInfo.loadComponentIds,
      difficulty,
      tier: rageTier,
      rng: rng.fork('rage-selection'),
    });
    selected = chosen.selected;
    alternatives = chosen.alternatives;
    rageApplications.push(...chosen.applications);
  }

  const challengeId = generated.metadata.identity.displayId;
  const loadIds = scenarioInfo.loadComponentIds;

  // ── Plan §12: the mandatory gate, applied **per fault**. ─────────────────
  // Each fault must be observable *on its own*, otherwise it cannot be asked
  // about: a fault whose entire effect is masked by a sibling is not a puzzle,
  // it is a trick, and §26 forbids "claiming a fault exists when it does not"
  // in spirit as well as in letter.
  //
  // The *first* fault is mandatory: if it is unobservable the seed is simply a
  // bad one and the caller retries with the next. A fault added by a modifier
  // is different — it has standbys, so a masked proposal is swapped out rather
  // than costing the whole scenario. That is the only asymmetry here.
  const scenarioFaults: ScenarioFault[] = [];
  const queue: FaultCandidate[] = [...selected];
  const standby: FaultCandidate[] = [...alternatives];
  const usedLocations = new Set<string>();

  while (queue.length > 0) {
    // Non-empty by the loop condition.
    const chosen = queue.shift()!;
    const primary = scenarioFaults.length === 0;

    const locationKey = locationKeyFor(chosen);
    if (usedLocations.has(locationKey)) continue;

    const fault = createScenarioFault(challengeId, chosen);
    const soloCircuit = withScenarioFaults(healthyCircuit, [fault]);
    const solo = simulate(soloCircuit, { appMode: 'pro' });
    const soloSymptom = diffSymptom(baseline, solo, loadIds);

    if (!soloSymptom.observable) {
      if (primary) {
        return { ok: false, reason: `${chosen.type} produced no observable symptom` };
      }
      // Swap in the next standby and try again.
      const replacement = standby.shift();
      if (replacement) queue.push(replacement);
      continue;
    }

    usedLocations.add(locationKey);
    scenarioFaults.push({ fault, locationKey, symptom: soloSymptom });
  }

  // ── Ohmageddon: prove the compound property (plan §26, §53.6) ────────────
  //
  // `compoundFault` can only *propose* a partner — proving that one fault
  // masks another needs the simulator, and `rage/modifiers.ts` deliberately
  // has no access to it. The proof therefore lives here, where the solo runs
  // above have already established that each fault is observable on its own.
  //
  // What has to be true for the pair to be a genuine compound scenario:
  //
  //   1. **A masks B.** The world with both faults present looks exactly like
  //      the world with only A. B contributes nothing the learner can see yet.
  //   2. **Repairing A reveals B, differently.** B's own world-state differs
  //      from the combined one, so clearing A does not clear the complaint —
  //      it *changes* it. That change is the entire pedagogical point.
  //
  // "World" here means de-energised loads, tripped and blown — the three
  // signals a person standing in front of the installation can actually
  // observe. It deliberately excludes `newErrorWires` / `newErrorComponents` /
  // `newErrors`, because the simulator flags a faulted wire as being in error
  // *by virtue of carrying the fault* (`simulate.ts:464`; measured at 1,176 of
  // 1,176 wire faults). Judging masking on those sets asks "is the fault
  // present?", to which the answer is always yes, and an earlier probe using
  // `symptom.observable` accordingly found 0 compound pairs in 67,476 — a
  // fault in the metric, not in the world.
  //
  // A pair that fails the proof is not shipped as a compound scenario. The
  // faults are separable and individually observable, so the scenario is still
  // sound — it is simply an ordinary multi-fault exercise, and the summary
  // says so rather than claiming a compound that is not there.
  let compoundProven = false;
  const wantsCompound =
    rageTier !== undefined && getRageTier(rageTier).modifiers.includes('compoundFault');

  if (wantsCompound && scenarioFaults.length >= 2) {
    // Non-empty by the length check.
    const primaryEntry = scenarioFaults[0]!;

    /** Does `partner` sit behind the primary, unseen until the primary clears? */
    const masks = (partner: ScenarioFault): boolean => {
      const combined = diffSymptom(
        baseline,
        simulate(withScenarioFaults(healthyCircuit, [primaryEntry.fault, partner.fault]), {
          appMode: 'pro',
        }),
        loadIds,
      );
      return (
        sameObservableWorld(combined, primaryEntry.symptom) &&
        !sameObservableWorld(combined, partner.symptom)
      );
    };

    if (masks(scenarioFaults[1]!)) {
      compoundProven = true;
    } else {
      // The runner accepted the first partner that was *observable*, which is
      // the §12 gate every scenario needs — but compound additionally needs
      // the partner to be *masked*, and those are different properties. The
      // standbys are candidates the runner already set aside for exactly this
      // kind of retry, so rather than abandon the tier, search them for one
      // that satisfies both.
      //
      // Bounded deliberately: each attempt costs two simulator runs, and the
      // scenario builder is on the interactive path when a learner presses
      // "New exercise". Measured over 120 scenarios, this lifts the honest
      // compound rate from 35.0% to 56.7%; the seeds it cannot satisfy fall
      // back to a plain multi-fault rather than stalling.
      const MAX_PARTNER_ATTEMPTS = 12;
      let attempts = 0;

      for (const replacement of standby) {
        if (attempts >= MAX_PARTNER_ATTEMPTS) break;
        const locationKey = locationKeyFor(replacement);
        if (usedLocations.has(locationKey)) continue;
        attempts += 1;

        const fault = createScenarioFault(challengeId, replacement);
        const solo = simulate(withScenarioFaults(healthyCircuit, [fault]), { appMode: 'pro' });
        const soloSymptom = diffSymptom(baseline, solo, loadIds);
        // §12 still applies to the substitute: no unobservable fault ships,
        // compound or not.
        if (!soloSymptom.observable) continue;

        const entry: ScenarioFault = { fault, locationKey, symptom: soloSymptom };
        if (!masks(entry)) continue;

        // Swap the partner out. The primary is untouched — it is the fault the
        // seed chose, and §26's ordering guarantees depend on it staying put.
        usedLocations.delete(scenarioFaults[1]!.locationKey);
        usedLocations.add(locationKey);
        scenarioFaults[1] = entry;
        compoundProven = true;
        break;
      }
    }
  }

  if (wantsCompound) {
    // **Replace**, never append.
    //
    // The selection stage already recorded `compoundFault` as applied, meaning
    // "I proposed partners and one was accepted". That is true of the proposal
    // but says nothing about whether masking was achieved, and
    // `buildRageSummary` merges same-id entries with "applied anywhere wins" —
    // so appending a failed proof would be swallowed by the successful
    // proposal and the summary would claim a compound that does not exist.
    // (Measured before this was fixed: 71 of 120 Rage 4 scenarios.)
    //
    // This proof is the authoritative word on the modifier, so it takes the
    // slot outright. The proposal's note is preserved for diagnostics.
    const proposalIndex = rageApplications.findIndex((a) => a.id === 'compoundFault');
    const proposalNote =
      proposalIndex >= 0 ? rageApplications[proposalIndex]!.note : 'no proposal recorded';
    if (proposalIndex >= 0) rageApplications.splice(proposalIndex, 1);

    rageApplications.push({
      id: 'compoundFault',
      label: 'Compound fault',
      applied: compoundProven,
      note: compoundProven
        ? `${proposalNote}; masking proven — repairing the first fault changes the symptom`
        : scenarioFaults.length < 2
          ? `${proposalNote}; no separable partner survived the observability gate`
          : `${proposalNote}; both faults independently visible — shipped as a plain multi-fault`,
    });
  }

  // ── Ohmageddon: prove the misleading-symptom property (plan §26, §53) ──
  //
  // Same replace-don't-append rule as compoundFault. The ranking stage
  // records `misleadingSymptom: applied` meaning only "I dropped the
  // load-touching candidates". That is a heuristic, not a proof: the
  // complaint is written from the *measured* symptom, and a candidate that
  // does not sit on a declared load can still be the obvious place to look
  // (a trip with no dead load, a blown device). The summary is only allowed
  // to claim the modifier once the measured symptom actually points
  // somewhere other than the fault.
  const wantsMisleading =
    rageTier !== undefined && getRageTier(rageTier).modifiers.includes('misleadingSymptom');

  if (wantsMisleading && scenarioFaults.length >= 1) {
    const isMisleading = (entry: ScenarioFault): boolean =>
      isMisleadingPlacement(healthyCircuit, entry.fault.target, entry.symptom);

    let misleadingProven = isMisleading(scenarioFaults[0]!);

    // Only swap the primary on a single-fault run. A second fault was
    // chosen *relative* to the first; replacing the first afterwards
    // would silently break a multi/compound pairing that is not this
    // modifier's job.
    if (!misleadingProven && scenarioFaults.length === 1) {
      const used = new Set(scenarioFaults.map((entry) => entry.locationKey));
      const MAX_ATTEMPTS = 16;
      let attempts = 0;
      for (const replacement of rankedPool) {
        if (attempts >= MAX_ATTEMPTS) break;
        const locationKey = locationKeyFor(replacement);
        if (used.has(locationKey)) continue;
        attempts += 1;

        const fault = createScenarioFault(challengeId, replacement);
        const solo = simulate(withScenarioFaults(healthyCircuit, [fault]), { appMode: 'pro' });
        const soloSymptom = diffSymptom(baseline, solo, loadIds);
        if (!soloSymptom.observable) continue;
        const entry: ScenarioFault = { fault, locationKey, symptom: soloSymptom };
        if (!isMisleading(entry)) continue;

        used.delete(scenarioFaults[0]!.locationKey);
        used.add(locationKey);
        scenarioFaults[0] = entry;
        misleadingProven = true;
        break;
      }
    }

    const proposalIndex = rageApplications.findIndex((a) => a.id === 'misleadingSymptom');
    const proposalNote =
      proposalIndex >= 0 ? rageApplications[proposalIndex]!.note : 'no proposal recorded';
    if (proposalIndex >= 0) rageApplications.splice(proposalIndex, 1);

    rageApplications.push({
      id: 'misleadingSymptom',
      label: 'Misleading symptom',
      applied: misleadingProven,
      note: misleadingProven
        ? `${proposalNote}; proven — the complaint points at the load, the fault is elsewhere`
        : `${proposalNote}; every candidate sat on the obvious symptom — shipped without the claim`,
    });
  }

  // Recorded so the summary reflects what actually shipped rather than what
  // was proposed — a multiFault run whose second fault was masked away is a
  // single-fault run, and §24 says the mode must not misrepresent itself.
  selected = scenarioFaults.map((entry) => {
    // rankedPool is included because the misleading-symptom proof may
    // swap the primary for a candidate that was never selected or put
    // on standby — only ranked. A miss here is a builder bug.
    const match = [...selected, ...alternatives, ...rankedPool].find(
      (c) => locationKeyFor(c) === entry.locationKey && c.type === entry.fault.type,
    );
    if (!match) {
      throw new Error(
        `scenario fault ${entry.fault.type} @ ${entry.locationKey} has no matching candidate`,
      );
    }
    return match;
  });

  const faults = scenarioFaults.map((entry) => entry.fault);
  const faultedCircuit = withScenarioFaults(healthyCircuit, faults);
  // Single-fault fast path: the combined circuit is the solo circuit, so the
  // simulator is not asked the same question twice.
  const combinedSymptom =
    scenarioFaults.length === 1
      ? // Length checked immediately above.
        scenarioFaults[0]!.symptom
      : diffSymptom(baseline, simulate(faultedCircuit, { appMode: 'pro' }), loadIds);

  // The *combined* state must also be observable. With one fault this is
  // already proven above; with several, faults can in principle cancel out
  // (a forced-open breaker upstream of a short), and an installation that
  // looks healthy is not a diagnosis exercise.
  if (!combinedSymptom.observable) {
    return { ok: false, reason: 'combined faults produced no observable symptom' };
  }

  return {
    ok: true,
    scenario: assembleScenario({
      generated,
      scenarioInfo,
      healthyCircuit,
      faultedCircuit,
      baseline,
      scenarioFaults,
      candidates: selected,
      symptom: combinedSymptom,
      difficulty,
      seed,
      generatorVersion,
      rng,
      rageTier,
      rageApplications,
      decoyComponentIds,
    }),
  };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function assembleScenario(args: {
  generated: ReturnType<typeof generateChallenge>;
  /** Recipe info, rewritten by the rage circuit stage when one ran. */
  scenarioInfo: ReturnType<typeof generateChallenge>['scenario'];
  healthyCircuit: Circuit;
  faultedCircuit: Circuit;
  baseline: SimulationResult;
  /** Every injected fault, with its solo symptom and location key. */
  scenarioFaults: ScenarioFault[];
  /** The candidates those faults came from, same order. */
  candidates: FaultCandidate[];
  /** Symptom of the circuit with all faults present. */
  symptom: FaultSymptom;
  difficulty: ChallengeDifficulty;
  seed: number;
  generatorVersion: number;
  rng: ReturnType<typeof createSeededRng>;
  rageTier?: RageTierId;
  rageApplications: RageApplication[];
  decoyComponentIds: string[];
}): DiagnosisScenario {
  const {
    generated,
    scenarioInfo,
    healthyCircuit,
    faultedCircuit,
    scenarioFaults,
    candidates,
    symptom,
    difficulty,
    seed,
    generatorVersion,
    rng,
    rageTier,
    rageApplications,
    decoyComponentIds,
  } = args;

  const profile = getDifficultyProfile(difficulty);
  const labelOf = (id: string): string => labelById(healthyCircuit, id, 'load');

  const deadLoadLabels = symptom.deEnergisedLoadIds.map(labelOf);
  const complaint = describeSymptom(symptom, deadLoadLabels);

  // `scenarioInfo`, not `generated.scenario`: after a red-herring splice the
  // original wire no longer exists, and offering the learner a location option
  // that points at a deleted wire would be both confusing and a tell.
  const locationChoices = buildLocationChoices(healthyCircuit, scenarioInfo);
  const faultTypeChoices = buildFaultTypeChoices(
    healthyCircuit,
    scenarioInfo,
    candidates.map((c) => c.type),
    profile.diagnosticChoiceCount,
    rng.fork('choices'),
  );

  // ── Ohmageddon stage ③ — ration the help (plan §27) ─────────────────────
  const baseHints = buildHints(healthyCircuit, candidates, symptom, deadLoadLabels);
  let hints = baseHints;
  let hintBudget = profile.hintBudget;
  let parTimeSeconds = profile.parTimeSeconds;
  let timeLimitSeconds: number | null = null;

  if (rageTier) {
    const staged = applyPresentationStage({
      hints: baseHints,
      hintBudget: profile.hintBudget,
      parTimeSeconds: profile.parTimeSeconds,
      timeLimitSeconds: null,
      difficulty,
      tier: rageTier,
      rng: rng.fork('rage-presentation'),
    });
    hints = staged.presentation.hints as DiagnosisHint[];
    hintBudget = staged.presentation.hintBudget;
    parTimeSeconds = staged.presentation.parTimeSeconds;
    timeLimitSeconds = staged.presentation.timeLimitSeconds;
    rageApplications.push(...staged.applications);
  }

  const rage: RageSummary | null = rageTier
    ? buildRageSummary({
        tier: rageTier,
        applications: rageApplications,
        decoyComponentIds,
        timeLimitSeconds,
      })
    : null;

  return {
    challengeId: generated.metadata.identity.displayId,
    identity: generated.metadata.identity,
    seed,
    generatorVersion,
    difficulty,
    recipeId: generated.scenario.recipeId,

    title: rageTier
      ? `${getRageTier(rageTier).label}: ${scenarioInfo.recipeTitle}`
      : scenarioInfo.recipeTitle,
    complaint,
    brief: rageTier
      ? 'This installation was working. It is not working now — and it is not going to be ' +
        'obvious. Everything you see is electrically honest; the difficulty is in the ' +
        'looking, not in the physics.'
      : 'This installation was working. It is not working now. Investigate the circuit, ' +
        'work out what has gone wrong and where, then put it right.',
    teaches: scenarioInfo.teaches,
    expectedBehaviour: scenarioInfo.expectedBehaviour,

    faultedCircuit: deepCopy(faultedCircuit),
    healthyCircuit: deepCopy(healthyCircuit),

    faults: scenarioFaults,
    symptom,

    faultTypeChoices,
    locationChoices,

    hints,
    hintBudget,
    parTimeSeconds,

    loadComponentIds: [...scenarioInfo.loadComponentIds],
    deadLoadLabels,
    rage,
  };
}

/**
 * Stable location key for a fault target — mirrors {@link FaultLocationChoice.key}.
 *
 * Exported separately from {@link locationKeyFor} because the UI needs to key
 * *live* faults in the learner's circuit (which are `InjectedFault`s, not
 * candidates) against the same option list.
 */
export function locationKeyForTarget(target: FaultTarget): string {
  if (target.type === 'port') return `port:${target.componentId}:${target.portIndex}`;
  return `${target.type}:${target.id}`;
}

/** Stable location key for a candidate — mirrors {@link FaultLocationChoice.key}. */
export function locationKeyFor(candidate: FaultCandidate): string {
  return locationKeyForTarget(candidate.target);
}

/**
 * Every place the learner is allowed to point at.
 *
 * The list covers the whole investigable circuit, not just the fault's own
 * placement class — otherwise the shape of the options would leak the answer
 * (e.g. "only wires are listed, so it must be a wire fault").
 */
function buildLocationChoices(
  circuit: Circuit,
  scenario: {
    faultCandidateWireIds: string[];
    loadComponentIds: string[];
    protectionComponentIds: string[];
  },
): FaultLocationChoice[] {
  const choices: FaultLocationChoice[] = [];
  const wireIds = new Set(scenario.faultCandidateWireIds);

  for (const wire of circuit.wires) {
    if (!wireIds.has(wire.id)) continue;
    const from = labelById(circuit, wire.fromComponentId, '?');
    const to = labelById(circuit, wire.toComponentId, '?');
    choices.push({
      key: `wire:${wire.id}`,
      kind: 'wire',
      label: `Wire: ${from} → ${to}`,
      wireId: wire.id,
    });
  }

  for (const id of [...scenario.protectionComponentIds, ...scenario.loadComponentIds]) {
    if (!circuit.components.some((c) => c.id === id)) continue;
    choices.push({
      key: `component:${id}`,
      kind: 'component',
      label: `Device: ${labelById(circuit, id)}`,
      componentId: id,
    });
  }

  // Terminals of loads that are actually wired — matches the eligibility rule.
  const seenPorts = new Set<string>();
  for (const wire of circuit.wires) {
    if (!wireIds.has(wire.id)) continue;
    for (const end of [
      { componentId: wire.toComponentId, portIndex: wire.toPortIndex },
      { componentId: wire.fromComponentId, portIndex: wire.fromPortIndex },
    ]) {
      if (!scenario.loadComponentIds.includes(end.componentId)) continue;
      const key = `port:${end.componentId}:${end.portIndex}`;
      if (seenPorts.has(key)) continue;
      seenPorts.add(key);
      choices.push({
        key,
        kind: 'port',
        label: `Terminal ${end.portIndex + 1} of ${labelById(circuit, end.componentId, '?')}`,
        componentId: end.componentId,
        portIndex: end.portIndex,
      });
    }
  }

  choices.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return disambiguate(circuit, choices);
}

/**
 * Make every location label unique.
 *
 * Identical option rows are not an answerable question: the learner can be
 * graded wrong for a distinction the UI never showed them. Two cases occur on
 * real generated circuits, and neither is rare:
 *
 *   - **Two wires between the same pair of devices** — the live and neutral
 *     legs of a socket drop. Caught on screen at 390×844, where "Wire: RCBO
 *     (20 A) → Single 3-Pin Socket (13A)" appeared twice in a row.
 *   - **Two identical devices** — a recipe with two branches, each ending in
 *     the same 60 W bulb. This also duplicates their terminal options.
 *
 * Two qualifiers are tried, weakest first, and only on the rows that actually
 * collide — a unique label is never touched:
 *
 *   1. For a wire, the terminal names it lands on ("L-out → L"), which the
 *      component registry already carries.
 *   2. Failing that, the component's canvas id. The canvas prints that id
 *      under every component, so this is the one qualifier guaranteed to be
 *      both unique and visible; the learner can match the option to the thing
 *      on screen rather than guessing.
 *
 * Neither qualifier discloses anything about *which* location is faulty — both
 * are already on screen for every component, faulty or not.
 */
function disambiguate(circuit: Circuit, choices: FaultLocationChoice[]): FaultLocationChoice[] {
  const collisions = (list: readonly FaultLocationChoice[]): Set<string> => {
    const counts = new Map<string, number>();
    for (const choice of list) counts.set(choice.label, (counts.get(choice.label) ?? 0) + 1);
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([label]) => label));
  };

  let duplicated = collisions(choices);
  if (duplicated.size === 0) return choices;

  const portLabel = (componentId: string, portIndex: number): string | null => {
    const component = circuit.components.find((c) => c.id === componentId);
    if (!component) return null;
    return COMPONENT_DEFS[component.type]?.ports[portIndex]?.label ?? null;
  };

  // Pass 1 — terminal names, wires only.
  let result = choices.map((choice) => {
    if (!duplicated.has(choice.label) || choice.kind !== 'wire') return choice;
    const wire = circuit.wires.find((w) => w.id === choice.wireId);
    if (!wire) return choice;
    const from = portLabel(wire.fromComponentId, wire.fromPortIndex);
    const to = portLabel(wire.toComponentId, wire.toPortIndex);
    if (!from && !to) return choice;
    return { ...choice, label: `${choice.label} (${from ?? '?'} → ${to ?? '?'})` };
  });

  // Pass 2 — the canvas id, for anything still ambiguous.
  duplicated = collisions(result);
  if (duplicated.size === 0) return result;

  result = result.map((choice) => {
    if (!duplicated.has(choice.label)) return choice;
    const id =
      choice.kind === 'wire'
        ? choice.wireId
        : choice.kind === 'component'
          ? choice.componentId
          : choice.componentId;
    if (!id) return choice;
    return { ...choice, label: `${choice.label} [${shortId(id)}]` };
  });

  return result;
}

/**
 * The distinctive tail of a generated id.
 *
 * Ids look like `gen-679711-1-branch-load-1`; the `gen-<hash>-<n>-` prefix is
 * identical for every component in the circuit and only makes the option
 * harder to read. The tail is what tells two devices apart, and it is a
 * substring of what the canvas prints, so it is still matchable on screen.
 */
function shortId(id: string): string {
  return id.replace(/^gen-\d+-\d+-/, '');
}

/**
 * The §15A choice set: every true fault type plus plausible distractors.
 *
 * Distractors are drawn from faults that were *genuinely eligible on this
 * circuit*, so every wrong answer is a fault that could really have happened
 * here. A distractor that is impossible on the topology teaches nothing and
 * is trivially eliminated.
 *
 * Size follows `difficulty.diagnosticChoiceCount` (3 / 5 / 7), but the correct
 * answers are never dropped to hit that number: on a multi-fault scenario the
 * list grows rather than hiding an answer the learner is required to give.
 * Two faults of the same kind contribute one option, not two — the question is
 * "what is wrong?", and repeating an option would itself be a tell.
 */
function buildFaultTypeChoices(
  circuit: Circuit,
  scenario: Parameters<typeof collectFaultCandidates>[1],
  correctTypes: readonly FaultType[],
  desiredCount: number,
  rng: ReturnType<typeof createSeededRng>,
): FaultTypeChoice[] {
  const correct = [...new Set(correctTypes)];
  const eligible = eligibleFaultTypes(collectFaultCandidates(circuit, scenario));
  const distractors = eligible.filter((t) => !correct.includes(t));
  const wanted = Math.max(Math.max(2, desiredCount) - correct.length, 1);
  const chosen = rng.shuffle(distractors).slice(0, wanted);

  const types = rng.shuffle([...correct, ...chosen]);
  return types.map((type) => {
    const def = getFaultDefinition(type);
    return { type, label: def.label, description: def.description };
  });
}

/**
 * Progressive hints (plan §17), written from the *symptom* outward.
 *
 * The plan's own worked example is the template:
 *   1. observation — "The load does not have a complete electrical path."
 *   2. direction   — "Check the Neutral path."
 *   3. location    — "Inspect the wire between the load and the Neutral return."
 *
 * Each level reveals strictly more than the last and no level reveals the
 * fault *type* and *location* together — that pair is the answer, and §17
 * says hints "must not directly reveal more than the configured hint level".
 */
function buildHints(
  circuit: Circuit,
  candidates: readonly FaultCandidate[],
  symptom: FaultSymptom,
  deadLoadLabels: readonly string[],
): DiagnosisHint[] {
  // Hints are written from the first fault outward. On a multi-fault scenario
  // levels 2 and 3 additionally warn that clearing one thing will not be
  // enough — see below. They still never pair a *type* with a *location*.
  // Callers always pass at least one candidate.
  const candidate = candidates[0]!;
  const def = getFaultDefinition(candidate.type);
  const extra = candidates.length - 1;

  const baseObservation =
    symptom.primary === 'load-dead'
      ? `${deadLoadLabels[0] ?? 'A load'} has no complete electrical path — something in its circuit is interrupted or diverted.`
      : symptom.primary === 'tripped'
        ? 'A protective device is doing its job: it is seeing a current it does not like.'
        : symptom.primary === 'blown'
          ? 'A component has been destroyed, so the energy went somewhere it should not have.'
          : 'The installation is reporting a condition the regulations do not permit.';

  // With more than one fault the learner is told *that* there is more than
  // one, but not what or where. Withholding the count would not make the
  // exercise harder in an honest way — it would make a complete repair look
  // like a failed one, which §26 rules out.
  //
  // The count rides on the level-1 *observation*, not only on the later hints,
  // because `limitedHints` truncates the ladder to a single hint at rage-3 —
  // exactly the tier that ships two faults. Carrying the disclosure only at
  // level 2 meant the harshest tier silently withheld it. The count reveals
  // neither a type nor a location, so it is safe at level 1 under §17.
  const plural =
    extra > 0
      ? ` This installation has more than one thing wrong with it — ${extra + 1} in total.`
      : '';

  const observation = `${baseObservation}${plural}`;

  const direction = `${directionHint(candidate.type, def.category)}${plural}`;

  const location = `Inspect ${describeFaultTarget(circuit, candidate.target)}.${
    extra > 0 ? ' That is not the only fault.' : ''
  }`;

  return [
    { level: 1, kind: 'observation', text: observation },
    { level: 2, kind: 'direction', text: direction },
    { level: 3, kind: 'location', text: location },
  ];
}

/**
 * The fault a single-answer consumer should use — statistics buckets, log
 * lines, the "you found it" headline.
 *
 * Always the first entry, which is the first fault the seed selected and the
 * one the hints are written around. Callers that must handle *every* fault
 * (grading, repair verification) iterate `scenario.faults` instead; this
 * helper exists so the ones that genuinely want one representative say so
 * explicitly rather than reaching for `faults[0]` and hoping.
 */
export function primaryScenarioFault(scenario: DiagnosisScenario): ScenarioFault {
  // A scenario always carries at least one fault — the builder rejects any
  // attempt that produced none.
  return scenario.faults[0]!;
}

/** Narrow the search without naming the fault (plan §17 hint 2). */
function directionHint(type: FaultType, category: string): string {
  switch (type) {
    case 'open-live':
      return 'Follow the Line conductor from the supply towards the load.';
    case 'open-neutral':
      return 'Check the Neutral return path.';
    case 'open-circuit':
      return 'A conductor is broken somewhere along the run — trace it end to end.';
    case 'short-circuit':
      return 'Line and Neutral are meeting somewhere they should not.';
    case 'earth-fault':
    case 'live-to-earth':
      return 'Current is escaping to earth — check insulation and the CPC.';
    case 'reverse-polarity':
      return 'The conductors are connected, but check which one is which.';
    case 'terminal-disconnect':
      return 'The cable runs look sound — check the connections at the terminals.';
    case 'protection-forced-open':
    case 'protection-bypass':
      return 'Look at the protective device itself rather than the cabling.';
    default:
      return `Investigate the ${category} side of the installation.`;
  }
}

function deepCopy(circuit: Circuit): Circuit {
  return JSON.parse(JSON.stringify(circuit)) as Circuit;
}
