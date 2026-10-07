/** Runs inside the isolated membership harness: real local D1 and cookie sessions. */
import assert from 'node:assert/strict';
import type { D1Database } from '@cloudflare/workers-types';
import { COMPONENT_DEFS, type Circuit, createInjectedFault } from '@electrasim/domain';
import type {
  DiagnosisEvaluation,
  DiagnosisScenario,
  DiagnosisScore,
} from '@electrasim/domain/challenges';
import { diagnosisAssessmentIssue, evaluateDiagnosis } from '@electrasim/domain/challenges';
import { normalizeCircuitDocument } from '@electrasim/domain/core';
import { explicitSupplyProfile } from '@electrasim/domain/core/supplies';
import { simulate } from '@electrasim/domain/simulation';
import { isCurrentSimulation } from '@electrasim/domain/simulationEvidence';
import { readVoltage } from '@electrasim/domain/simulationReadings';
import type { SimulationResult } from '@electrasim/domain/types';
import { controlCircuit, setControlSwitch } from '../packages/domain/src/core/controlFixtures';
import {
  damageAcceptanceCircuits,
  damageCircuit,
  protectedDamageCircuit,
} from '../packages/domain/src/core/damageFixtures';
import { seriesFixture } from '../packages/domain/src/core/mnaFixtures';
import { motorAcceptanceCircuits, motorCircuit } from '../packages/domain/src/core/motorFixtures';
import {
  protectionCircuit,
  rcboCircuit,
  rcdBalancedCircuit,
  rcdLeakingCircuit,
} from '../packages/domain/src/core/protectionFixtures';
import { threePhaseAcceptanceCircuits } from '../packages/domain/src/core/threePhaseFixtures';
import {
  timerCircuit,
  timerDimmingAcceptanceCircuits,
} from '../packages/domain/src/core/timerDimmingFixtures';
import { dolAcceptanceCircuits } from '../packages/domain/src/simulation/dolFixtures';
import {
  portableResult,
  runtimeAcceptanceCircuits,
} from '../packages/domain/src/simulation/runtimeFixtures';
import { runSimulatorBrowser } from './test-simulator-browser';

type Account = { id: string; cookie: string; email: string };
type Options = { user?: Account; method?: string; data?: unknown; expected?: number };
interface Context {
  api: (path: string, options?: Options) => Promise<{ body: unknown; res: Response }>;
  signup: (label: string) => Promise<Account>;
  createPlan: (slug: string, features?: string[]) => Promise<{ id: string }>;
  assign: (planId: string, user: Account) => Promise<{ id: string; version: number }>;
  check: (name: string, work: () => Promise<void>) => Promise<void>;
  superAdmin: Account;
  db: D1Database;
  origin: string;
  persist: string;
}
interface Saved {
  id: string;
  version: number;
  readOnly: boolean;
  circuit: Circuit;
}
interface Attempt extends Saved {
  scenario: DiagnosisScenario;
  progress: { status: string; misdiagnoses: number; identifiedFaultIds: string[] };
  evaluation: DiagnosisEvaluation;
  score: DiagnosisScore | null;
}
export async function runSimulatorTests(context: Context) {
  const { signup, createPlan, assign, check, superAdmin, db } = context;
  const request = async <T = Saved>(path: string, options: Options): Promise<T> =>
    (await context.api(path, options)).body as T;
  const user = await signup('simulator-paid');
  const other = await signup('simulator-other');
  const plan = await createPlan('simulator-full', [
    'pro_components',
    'advanced_faults',
    'advanced_diagnostics',
  ]);
  const grant = await assign(plan.id, user);
  await check(
    'versioned diagnosis and compound Ohmageddon grade the authored repair through real Hono/D1',
    async () => {
      await request('/diagnosis/attempts', {
        user: other,
        method: 'POST',
        data: { seed: 5, difficulty: 'beginner', generatorVersion: 2 },
        expected: 400,
      });
      for (const requestInput of [
        { seed: 5, difficulty: 'beginner' },
        { seed: 5, difficulty: 'intermediate' },
        { seed: 5, difficulty: 'advanced' },
        { seed: 3, difficulty: 'intermediate', rageTier: 'rage-4' },
      ]) {
        let current = await request<Attempt>('/diagnosis/attempts', {
          user,
          method: 'POST',
          data: requestInput,
          expected: 201,
        });
        const scenario = current.scenario;
        assert.equal(diagnosisAssessmentIssue(scenario), null);
        for (const circuit of [
          { ...scenario.healthyCircuit, wires: scenario.healthyCircuit.wires.slice(1) },
          {
            ...scenario.faultedCircuit,
            faults: (scenario.faults.length > 1 ? scenario.faults.slice(1) : scenario.faults).map(
              (f) => f.fault,
            ),
          },
        ]) {
          const fault = scenario.faults[0]!;
          const answer = { faultType: fault.fault.type, locationKey: fault.locationKey };
          const expected = evaluateDiagnosis(scenario, circuit, answer, {
            identifiedFaultIds: current.progress.identifiedFaultIds,
          });
          current = await request<Attempt>(`/diagnosis/attempts/${current.id}`, {
            user,
            method: 'POST',
            expected: 200,
            data: { action: 'submit', version: current.version, circuit, answer },
          });
          assert.equal(current.evaluation.verdict, expected.verdict);
          assert.equal(current.evaluation.recovered, expected.recovered);
          assert.equal(current.progress.status, 'active');
        }
        for (const fault of scenario.faults) {
          current = await request<Attempt>(`/diagnosis/attempts/${current.id}`, {
            user,
            method: 'POST',
            expected: 200,
            data: {
              action: 'submit',
              version: current.version,
              circuit: scenario.healthyCircuit,
              answer: { faultType: fault.fault.type, locationKey: fault.locationKey },
            },
          });
          if (current.progress.status === 'completed') break;
        }
        assert.equal(current.progress.status, 'completed');
        assert.deepEqual(current.evaluation.assessment, scenario.assessment);
        assert(current.score);
      }
    },
  );
  await check(
    'obsolete diagnosis snapshots stay readable without accepting new grades or penalties',
    async () => {
      const attempt = await request<Attempt>('/diagnosis/attempts', {
        user,
        method: 'POST',
        expected: 201,
        data: { seed: 3, difficulty: 'intermediate', rageTier: 'rage-4' },
      });
      const original = attempt.scenario;
      const historical = {
        ...original,
        assessment: { ...original.assessment!, modelVersion: 'earlier' },
      };
      await db
        .prepare('UPDATE diagnosis_attempts SET scenario=? WHERE id=?')
        .bind(JSON.stringify(historical), attempt.id)
        .run();
      const loaded = await request<Attempt>(`/diagnosis/attempts/${attempt.id}`, {
        user,
        expected: 200,
      });
      assert.equal(loaded.readOnly, true);
      const fault = original.faults[0]!;
      await request(`/diagnosis/attempts/${attempt.id}`, {
        user,
        method: 'POST',
        expected: 409,
        data: {
          action: 'submit',
          version: attempt.version,
          circuit: original.healthyCircuit,
          answer: { faultType: fault.fault.type, locationKey: fault.locationKey },
        },
      });
      const saved = await request<Attempt>(`/diagnosis/attempts/${attempt.id}`, {
        user,
        method: 'POST',
        expected: 200,
        data: { action: 'checkpoint', version: attempt.version, circuit: original.healthyCircuit },
      });
      assert.deepEqual(saved.progress, loaded.progress);
      assert.equal(saved.score, null);
      const after = await request<Attempt>(`/diagnosis/attempts/${attempt.id}`, {
        user,
        expected: 200,
      });
      assert.deepEqual(after.scenario, historical);
      assert.deepEqual(after.circuit, normalizeCircuitDocument(original.healthyCircuit));
    },
  );
  await check(
    'local Hono consumer evidence is current, normalized and rejects a changed circuit',
    async () => {
      const circuit = seriesFixture();
      const result = await request<SimulationResult>('/simulator/simulate', {
        user,
        method: 'POST',
        data: { circuit },
        expected: 200,
      });
      assert.equal(isCurrentSimulation(circuit, result), true);
      assert.equal(
        isCurrentSimulation({ ...circuit, wires: circuit.wires.slice(1) }, result),
        false,
      );
      const pair = readVoltage(
        circuit,
        result,
        { componentId: 'r0', portIndex: 0 },
        { componentId: 'r0', portIndex: 1 },
      );
      assert(Math.abs(pair.volts! - (12 * 6) / 12.21) < 1e-9);
    },
  );
  await check(
    'paid phasor motor/coil replay matches domain, persists declarations and guards malformed state',
    async () => {
      for (const [name, circuit] of Object.entries({
        ...motorAcceptanceCircuits(),
        ...dolAcceptanceCircuits(),
      })) {
        let previous: SimulationResult | undefined;
        for (const deltaSeconds of [0, 0.999999, 0.000001, 0.25]) {
          const simulationState = previous?.simulationState;
          const response = await request<SimulationResult>('/simulator/simulate', {
            user,
            method: 'POST',
            expected: 200,
            data: { circuit, simulationState, deltaSeconds },
          });
          assert.deepEqual(
            response,
            portableResult(
              simulate(circuit, { simulationState, deltaSeconds, standard: 'int', appMode: 'pro' }),
            ),
            name,
          );
          assert.equal(response.faultsCleared, false);
          previous = response;
        }
      }
      const circuit = motorCircuit(true);
      await request('/simulator/simulate', { method: 'POST', expected: 401, data: { circuit } });
      await request('/simulator/simulate', {
        user: other,
        method: 'POST',
        expected: 403,
        data: { circuit },
      });
      const initial = simulate(circuit);
      await request('/simulator/simulate', {
        user,
        method: 'POST',
        expected: 400,
        data: { circuit, simulationState: { ...initial.simulationState, contactStates: {} } },
      });
      await request('/simulator/simulate', {
        user,
        method: 'POST',
        expected: 400,
        data: { circuit, deltaSeconds: -1 },
      });
      const saved = await request<Pick<Saved, 'id'>>('/circuits', {
        user,
        method: 'POST',
        expected: 201,
        data: { name: 'Local motor and contactor', circuit },
      });
      const restored = await request(`/circuits/${saved.id}`, { user, expected: 200 });
      assert.deepEqual(restored.circuit, normalizeCircuitDocument(circuit));
      assert.equal('simulationState' in restored.circuit, false);
    },
  );
  await check(
    'guest phasor API uses portable sources and D1 retains phase settings, terminals and faults',
    async () => {
      for (const [name, circuit] of Object.entries(threePhaseAcceptanceCircuits()).filter(
        ([name]) => !['single-live-motor'].includes(name),
      )) {
        const response = await request<SimulationResult>('/simulator/simulate', {
          method: 'POST',
          data: { circuit },
          expected: 200,
        });
        assert.deepEqual(
          response,
          portableResult(simulate(circuit, { standard: 'int', appMode: 'pro' })),
          name,
        );
        assert.equal(response.faultsCleared, false);
      }
      const circuit = threePhaseAcceptanceCircuits()['reverse-400v']!;
      circuit.wires[0]!.fault = 'open-circuit';
      const saved = await request<Pick<Saved, 'id'>>('/circuits', {
        user,
        method: 'POST',
        data: { name: 'Local phase source', circuit },
        expected: 201,
      });
      const restored = await request(`/circuits/${saved.id}`, { user, expected: 200 });
      assert.deepEqual(restored.circuit, normalizeCircuitDocument(circuit));
      assert.equal(restored.circuit.components[0]!.type, 'ac-three-phase-supply');
      assert.deepEqual(
        restored.circuit.components[0]!.state.sourceProfile,
        circuit.components[0]!.state.sourceProfile,
      );
      assert.equal(restored.circuit.wires[0]!.fault, 'open-circuit');
      assert.equal(restored.circuit.wires.at(-1)!.toPortIndex, 3);
    },
  );
  await check(
    'local Hono damage and fuse replay match domain steps; malformed state and paid bypass remain guarded',
    async () => {
      for (const [name, circuit] of Object.entries(damageAcceptanceCircuits())) {
        let previous: SimulationResult | undefined;
        for (const deltaSeconds of [0, 0.1, 0.5, 1, 2]) {
          const simulationState = previous?.simulationState;
          const response = await request<SimulationResult>('/simulator/simulate', {
            ...(name === 'bypass-leaves-stress' ? { user } : {}),
            method: 'POST',
            expected: 200,
            data: { circuit, simulationState, deltaSeconds },
          });
          assert.deepEqual(
            response,
            portableResult(
              simulate(circuit, { simulationState, deltaSeconds, standard: 'int', appMode: 'pro' }),
            ),
            name,
          );
          previous = response;
        }
      }
      await request('/simulator/simulate', {
        method: 'POST',
        data: { circuit: protectedDamageCircuit(true) },
        expected: 401,
      });
      await request('/simulator/simulate', {
        user: other,
        method: 'POST',
        data: { circuit: protectedDamageCircuit(true) },
        expected: 403,
      });
      const circuit = damageCircuit();
      const initial = simulate(circuit);
      await request('/simulator/simulate', {
        method: 'POST',
        data: { circuit, simulationState: { ...initial.simulationState, damage: {} } },
        expected: 400,
      });
      circuit.wires[1]!.damageModel!.withstandAmpSquaredSeconds = -1;
      await request('/simulator/simulate', { method: 'POST', data: { circuit }, expected: 400 });
    },
  );
  await check(
    'local D1 saves damage declarations and failed items without repairing or persisting transient exposure',
    async () => {
      const circuit = damageCircuit();
      circuit.wires[1]!.isBusted = true;
      circuit.wires[1]!.bustedReason = 'Declared stress budget reached';
      const savedDamage = await request<Saved>('/circuits', {
        user,
        method: 'POST',
        data: { name: 'Damage lifecycle fixture', circuit },
        expected: 201,
      });
      const restored = await request<Saved>(`/circuits/${savedDamage.id}`, { user, expected: 200 });
      assert.deepEqual(restored.circuit.wires[1], circuit.wires[1]);
      assert.equal('simulationState' in restored.circuit, false);
      const result = await request<SimulationResult>('/simulator/simulate', {
        method: 'POST',
        data: { circuit: restored.circuit, deltaSeconds: 2 },
        expected: 200,
      });
      assert.equal(result.faultsCleared, false);
      assert.equal(result.componentCalculations?.lamp?.powerWatts, 0);
      assert.deepEqual(result.simulationEvents, []);
    },
  );
  await check(
    'local Hono dimming and timer replay match the domain with normal guest/paid authorization',
    async () => {
      for (const [name, circuit] of Object.entries(timerDimmingAcceptanceCircuits())) {
        const paid = circuit.components.some(
          (component) => COMPONENT_DEFS[component.type]?.tier === 'pro',
        );
        let previous: SimulationResult | undefined;
        for (const deltaSeconds of [0, 0.999999, 0.000001, 1, 1]) {
          const simulationState = previous?.simulationState;
          const response = await request<SimulationResult>('/simulator/simulate', {
            ...(paid ? { user } : {}),
            method: 'POST',
            expected: 200,
            data: { circuit, simulationState, deltaSeconds },
          });
          assert.deepEqual(
            response,
            portableResult(
              simulate(circuit, { simulationState, deltaSeconds, standard: 'int', appMode: 'pro' }),
            ),
            name,
          );
          previous = response;
        }
      }
      await request('/simulator/simulate', {
        method: 'POST',
        data: { circuit: timerCircuit('digital-weekly-timer') },
        expected: 401,
      });
      await request('/simulator/simulate', {
        user: other,
        method: 'POST',
        data: { circuit: timerCircuit('digital-weekly-timer') },
        expected: 403,
      });
      const bad = timerCircuit();
      bad.components[1]!.state.timerModel = {
        version: 1,
        kind: 'schedule',
        periodSeconds: 86_400,
        offsetSeconds: 0,
        windows: [{ startSeconds: 2, endSeconds: 1 }],
      };
      await request('/simulator/simulate', {
        method: 'POST',
        data: { circuit: bad },
        expected: 400,
      });
    },
  );
  await check(
    'local Hono protection replay matches the domain with normal guest/paid authorization',
    async () => {
      const cases: [string, Circuit, number[]][] = [
        ['mcb-overload', protectionCircuit('mcb', 2), [0.5, 3600]],
        ['mcb-instant', protectionCircuit('mcb', 0.5), [0.5]],
        ['fuse-melt', protectionCircuit('fuse', 1), [0.5, 10]],
        ['rcd-leak', rcdLeakingCircuit(), [0.05, 1]],
        ['rcd-balanced', rcdBalancedCircuit(), [1]],
        ['rcbo-balanced', rcboCircuit(32, 30), [1]],
      ];
      for (const [name, circuit, deltas] of cases) {
        let previous: SimulationResult | undefined;
        for (const deltaSeconds of deltas) {
          const simulationState = previous?.simulationState;
          const response = await request<SimulationResult>('/simulator/simulate', {
            method: 'POST',
            expected: 200,
            data: { circuit, simulationState, deltaSeconds },
          });
          assert.deepEqual(
            response,
            portableResult(
              simulate(circuit, { simulationState, deltaSeconds, standard: 'int', appMode: 'pro' }),
            ),
            name,
          );
          previous = response;
        }
      }
      const badProtected = rcdLeakingCircuit();
      badProtected.components[1]!.state.protectionModel = {
        version: 1,
        kind: 'rcd',
        ratedResidualMilliamps: -30,
        residualType: 'A',
      } as never;
      await request('/simulator/simulate', {
        method: 'POST',
        data: { circuit: badProtected },
        expected: 400,
      });
    },
  );
  await check(
    'guest local Hono timed controls match domain steps, reset and invalid-state rejection',
    async () => {
      const circuit = controlCircuit();
      let previous: SimulationResult | undefined;
      for (const [input, deltaSeconds] of [
        [circuit, 0],
        [circuit, 0.999],
        [circuit, 0.001],
        [setControlSwitch(circuit, false), 0.25],
      ] as const) {
        const simulationState = previous?.simulationState;
        const expected = simulate(input, {
          simulationState,
          deltaSeconds,
          standard: 'int',
          appMode: 'pro',
        });
        const response = await request<SimulationResult>('/simulator/simulate', {
          method: 'POST',
          data: { circuit: input, simulationState, deltaSeconds },
          expected: 200,
        });
        assert.deepEqual(response, portableResult(expected));
        previous = response;
      }
      assert.equal(previous?.coilStates?.relay, false);
      const reset = await request<SimulationResult>('/simulator/simulate', {
        method: 'POST',
        data: { circuit },
        expected: 200,
      });
      assert.equal(reset.simulationState?.elapsedSeconds, 0);
      assert.equal(reset.coilStates?.relay, false);
      for (const data of [
        { deltaSeconds: -1 },
        { deltaSeconds: '1' },
        { simulationState: {} },
        { simulationState: null },
      ])
        await request('/simulator/simulate', {
          method: 'POST',
          data: { circuit, ...data },
          expected: 400,
        });
    },
  );
  await check(
    'actual local Hono MNA results match the domain across sources, loads, faults and model gaps',
    async () => {
      for (const [name, circuit] of Object.entries(runtimeAcceptanceCircuits())) {
        const response = await request('/simulator/simulate', {
          user,
          method: 'POST',
          data: { circuit },
          expected: 200,
        });
        assert.deepEqual(
          response,
          portableResult(simulate(circuit, { standard: 'int', appMode: 'pro' })),
          name,
        );
      }
    },
  );
  const basic: Circuit = {
    components: [{ id: 'light', type: 'bulb', x: 100, y: 100, state: {} }],
    wires: [],
    globalVoltage: 120,
    supply: explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 120, frequencyHz: 60 }),
  };
  const proType = Object.values(COMPONENT_DEFS).find((def) => def.tier === 'pro')!;
  const proKey = Object.entries(COMPONENT_DEFS).find(([, def]) => def === proType)![0];
  const premium: Circuit = {
    ...basic,
    components: [...basic.components, { id: 'pro', type: proKey, x: 300, y: 100, state: {} }],
    faults: [createInjectedFault('arc-fault', { type: 'component', id: 'light' })],
  };
  let saved: Saved;
  let attempt: Attempt;
  await check(
    'simulator classifies actual content and keeps guest safety simulation free',
    async () => {
      await request('/simulator/authorize', {
        method: 'POST',
        data: { circuit: basic },
        expected: 200,
      });
      await request('/simulator/simulate', {
        method: 'POST',
        data: { circuit: basic },
        expected: 200,
      });
      await request('/simulator/simulate', {
        method: 'POST',
        data: {
          circuit: {
            ...basic,
            supply: {
              ...basic.supply,
              model: { kind: 'ac-single-phase', voltage: 120, frequencyHz: 0 },
            },
          },
        },
        expected: 400,
      });
      await request('/simulator/authorize', {
        method: 'POST',
        data: { circuit: premium },
        expected: 401,
      });
      await request('/simulator/authorize', {
        user: other,
        method: 'POST',
        data: { circuit: premium },
        expected: 403,
      });
      await request('/simulator/authorize', {
        user,
        method: 'POST',
        data: { circuit: premium, required: [] },
        expected: 400,
      });
      await request('/simulator/authorize', {
        user,
        method: 'POST',
        data: {
          circuit: {
            ...basic,
            components: [{ ...basic.components[0], type: 'forged-free-device' }],
          },
        },
        expected: 400,
      });
      await request('/simulator/simulate', {
        user,
        method: 'POST',
        data: { circuit: premium },
        expected: 200,
      });
    },
  );
  await check(
    'account circuits enforce ownership and optimistic versions, retaining fault data',
    async () => {
      await request('/circuits', {
        method: 'POST',
        data: { name: 'guest', circuit: basic },
        expected: 401,
      });
      saved = await request('/circuits', {
        user,
        method: 'POST',
        data: { name: 'Premium fixture', circuit: premium },
        expected: 201,
      });
      const loaded = await request(`/circuits/${saved.id}`, { user, expected: 200 });
      assert.equal(loaded.circuit.globalVoltage, 120);
      assert.deepEqual(loaded.circuit.supply, basic.supply);
      assert.equal(loaded.circuit.faults?.[0].type, 'arc-fault');
      await request(`/circuits/${saved.id}`, { user: other, expected: 404 });
      await request(`/circuits/${saved.id}`, {
        user: other,
        method: 'PATCH',
        data: { name: 'steal', version: 1, circuit: basic },
        expected: 404,
      });
      const writes = await Promise.all(
        [1, 2].map(() =>
          context.api(`/circuits/${saved.id}`, {
            user,
            method: 'PATCH',
            data: { name: 'Changed', version: 1, circuit: premium },
          }),
        ),
      );
      assert.deepEqual(writes.map((r) => r.res.status).sort(), [200, 409]);
      saved.version = 2;
    },
  );
  await check(
    'advanced diagnosis is server-owned and rejects forged progress/results',
    async () => {
      await request('/diagnosis/attempts', {
        user: other,
        method: 'POST',
        data: { seed: 42, difficulty: 'advanced' },
        expected: 403,
      });
      await request('/diagnosis/attempts', {
        user: other,
        method: 'POST',
        data: { seed: 42, difficulty: 'beginner', rageTier: 'rage-1' },
        expected: 403,
      });
      attempt = await request<Attempt>('/diagnosis/attempts', {
        user,
        method: 'POST',
        data: { seed: 42, difficulty: 'advanced' },
        expected: 201,
      });
      await request(`/diagnosis/attempts/${attempt.id}`, { user: other, expected: 404 });
      const fault = attempt.scenario.faults[0];
      const input = {
        action: 'submit',
        version: 1,
        circuit: attempt.scenario.faultedCircuit,
        answer: { faultType: fault.fault.type, locationKey: fault.locationKey },
      };
      await request(`/diagnosis/attempts/${attempt.id}`, {
        user,
        method: 'POST',
        data: { ...input, identifiedFaultIds: ['forged'], score: 99999 },
        expected: 400,
      });
      const result = await request<Attempt>(`/diagnosis/attempts/${attempt.id}`, {
        user,
        method: 'POST',
        data: input,
        expected: 200,
      });
      assert.equal(result.evaluation.verdict, 'incomplete');
      assert.deepEqual(result.progress.identifiedFaultIds, [fault.fault.id]);
      await request(`/diagnosis/attempts/${attempt.id}`, {
        user,
        method: 'POST',
        data: input,
        expected: 409,
      });
      attempt.version = result.version;
    },
  );
  await check(
    'completed paid diagnosis retains its accepted score on reload and rejects further actions',
    async () => {
      let completed = await request<Attempt>('/diagnosis/attempts', {
        user,
        method: 'POST',
        data: { seed: 42, difficulty: 'advanced' },
        expected: 201,
      });
      const scenario = completed.scenario;
      const firstFault = scenario.faults[0];
      const changedSupply = await request<Attempt>(`/diagnosis/attempts/${completed.id}`, {
        user,
        method: 'POST',
        data: {
          action: 'submit',
          version: completed.version,
          circuit: {
            ...scenario.healthyCircuit,
            globalVoltage: 120,
            supply: explicitSupplyProfile({
              kind: 'ac-single-phase',
              voltage: 120,
              frequencyHz: 50,
            }),
          },
          answer: { faultType: firstFault.fault.type, locationKey: firstFault.locationKey },
        },
        expected: 200,
      });
      assert.equal(changedSupply.evaluation.verdict, 'incomplete');
      assert.equal(changedSupply.progress.status, 'active');
      assert.equal(changedSupply.score, null);
      completed = changedSupply;
      for (const fault of scenario.faults) {
        completed = await request<Attempt>(`/diagnosis/attempts/${completed.id}`, {
          user,
          method: 'POST',
          data: {
            action: 'submit',
            version: completed.version,
            circuit: scenario.healthyCircuit,
            answer: { faultType: fault.fault.type, locationKey: fault.locationKey },
          },
          expected: 200,
        });
      }
      assert.equal(completed.progress.status, 'completed');
      assert(completed.score);
      const loaded = await request<Attempt>(`/diagnosis/attempts/${completed.id}`, {
        user,
        expected: 200,
      });
      assert.deepEqual(loaded.progress, completed.progress);
      assert.deepEqual(loaded.score, completed.score);
      await request(`/diagnosis/attempts/${completed.id}`, {
        user,
        method: 'POST',
        data: { action: 'hint', version: completed.version, circuit: scenario.healthyCircuit },
        expected: 409,
      });
      const fixtureRoute = await fetch(`${context.origin}/api/__test/paid-membership`, {
        method: 'POST',
        headers: {
          Origin: context.origin,
          'Content-Type': 'application/json',
          Cookie: other.cookie,
        },
        body: '{}',
      });
      assert.equal(fixtureRoute.status, 404, 'test fixture routes are absent from the app Worker');
    },
  );
  await check(
    'revocation locks edits and submissions while preserving original documents and attempts',
    async () => {
      await request(`/admin/pro/memberships/${grant.id}`, {
        user: superAdmin,
        method: 'PATCH',
        data: { version: grant.version, status: 'revoked', reason: 'Simulator revocation test' },
        expected: 200,
      });
      await request('/simulator/authorize', {
        user,
        method: 'POST',
        data: { circuit: premium },
        expected: 403,
      });
      await request(`/circuits/${saved.id}`, {
        user,
        method: 'PATCH',
        data: { name: 'strip premium', circuit: basic, version: saved.version },
        expected: 403,
      });
      const loaded = await request(`/circuits/${saved.id}`, { user, expected: 200 });
      assert(loaded.readOnly);
      assert.equal(loaded.version, saved.version);
      assert.equal(loaded.circuit.faults?.length, 1);
      const before = await request<Attempt>(`/diagnosis/attempts/${attempt.id}`, {
        user,
        expected: 200,
      });
      await request(`/diagnosis/attempts/${attempt.id}`, {
        user,
        method: 'POST',
        data: {
          action: 'hint',
          version: attempt.version,
          circuit: attempt.scenario.faultedCircuit,
        },
        expected: 403,
      });
      const after = await request<Attempt>(`/diagnosis/attempts/${attempt.id}`, {
        user,
        expected: 200,
      });
      assert(after.readOnly);
      assert.deepEqual(after.progress, before.progress);
      assert.equal(after.version, before.version);
      await request('/circuits', {
        user,
        method: 'POST',
        data: { name: 'Explicit free copy', circuit: basic },
        expected: 201,
      });
      await request(`/circuits/${saved.id}`, {
        user,
        method: 'DELETE',
        data: { version: saved.version },
        expected: 200,
      });
    },
  );
  await assign(plan.id, user);
  await check(
    'paid browser flows work with real cookies through the local Vite proxy',
    async () => {
      await runSimulatorBrowser({
        origin: context.origin,
        persist: context.persist,
        email: user.email,
        circuit: premium,
        revoke: async () => {
          await db
            .prepare("UPDATE entitlements SET status='revoked' WHERE user_id=?")
            .bind(user.id)
            .run();
        },
      });
    },
  );
}
