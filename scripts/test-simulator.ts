/** Runs inside the isolated membership harness: real local D1 and cookie sessions. */
import assert from 'node:assert/strict';
import type { D1Database } from '@cloudflare/workers-types';
import { COMPONENT_DEFS, type Circuit, createInjectedFault } from '@electrasim/domain';
import type {
  DiagnosisEvaluation,
  DiagnosisScenario,
  DiagnosisScore,
} from '@electrasim/domain/challenges';
import { explicitSupplyProfile } from '@electrasim/domain/core/supplies';
import { simulate } from '@electrasim/domain/simulation';
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
