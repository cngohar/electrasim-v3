/** Runs inside the isolated membership harness: real local D1 and cookie sessions. */
import assert from 'node:assert/strict';
import type { D1Database } from '@cloudflare/workers-types';
import { COMPONENT_DEFS, type Circuit, createInjectedFault } from '@electrasim/domain';
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
export async function runSimulatorTests(context: Context) {
  const { signup, createPlan, assign, check, superAdmin, db } = context;
  const request = async <T = Saved>(path: string, options: Options): Promise<T> => {
    const { body, res } = await context.api(path, options);
    if (path === '/simulator/simulate' && res.ok) {
      const { access, ...electrical } = body as Record<string, unknown> & {
        access: { policy: { revision: number; components: unknown[] }; required: string[] };
      };
      assert(access && Number.isSafeInteger(access.policy.revision));
      assert.equal(access.policy.components.length, 116);
      assert(Array.isArray(access.required));
      // Retain exact domain-result comparisons; policy is separate authorization metadata.
      return electrical as T;
    }
    return body as T;
  };
  const user = await signup('simulator-paid');
  const other = await signup('simulator-other');
  const plan = await createPlan('simulator-full', [
    'pro_components',
    'advanced_faults',
    'advanced_diagnostics',
  ]);
  const grant = await assign(plan.id, user);
  await check(
    'retired Diagnosis routes preserve historical D1 attempts and reject old authorization inputs',
    async () => {
      const id = `preserved-${user.id}`;
      const scenario = JSON.stringify({
        version: 1,
        legacy: true,
        marker: 'preserved-before-retirement',
      });
      const circuit = JSON.stringify(seriesFixture());
      const progress = JSON.stringify({ status: 'active', hintsUsed: 2 });
      await db
        .prepare(
          'INSERT INTO diagnosis_attempts (id,user_id,scenario,circuit,progress,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
        )
        .bind(id, user.id, scenario, circuit, progress, 7, 1, 2)
        .run();
      const before = await db
        .prepare('SELECT * FROM diagnosis_attempts WHERE id=?')
        .bind(id)
        .first();
      for (const [path, method] of [
        [`/api/diagnosis/attempts/${id}`, 'GET'],
        ['/api/diagnosis/attempts', 'POST'],
        [`/api/diagnosis/attempts/${id}`, 'POST'],
        ['/api/__test/paid-membership', 'POST'],
      ] as const) {
        const response = await fetch(`${context.origin}${path}`, {
          method,
          headers: {
            Origin: context.origin,
            Cookie: user.cookie,
            'Content-Type': 'application/json',
          },
          ...(method === 'POST' ? { body: '{}' } : {}),
        });
        assert.equal(response.status, 404);
      }
      await request('/simulator/authorize', {
        user,
        method: 'POST',
        data: { circuit: seriesFixture(), diagnosis: 'basic' },
        expected: 400,
      });
      assert.deepEqual(
        await db.prepare('SELECT * FROM diagnosis_attempts WHERE id=?').bind(id).first(),
        before,
      );
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
    'D1 burst: 50 authenticated circuit writes and 200 reads preserve ownership and content',
    async () => {
      const burstUser = await signup('simulator-burst');
      const timings = { writes: [] as number[], reads: [] as number[] };
      const created = await Promise.all(
        Array.from({ length: 50 }, async (_, index) => {
          const start = performance.now();
          const result = await request('/circuits', {
            user: burstUser,
            method: 'POST',
            data: { name: `Burst ${index}`, circuit: basic },
            expected: 201,
          });
          timings.writes.push(performance.now() - start);
          return result;
        }),
      );
      assert.equal(new Set(created.map((row) => row.id)).size, 50);
      await Promise.all(
        Array.from({ length: 200 }, async (_, index) => {
          const start = performance.now();
          const row = await request(`/circuits/${created[index % 50].id}`, {
            user: burstUser,
            expected: 200,
          });
          timings.reads.push(performance.now() - start);
          assert.equal(row.version, 1);
          assert.deepEqual(row.circuit, normalizeCircuitDocument(basic));
        }),
      );
      await request(`/circuits/${created[0].id}`, { user: other, expected: 404 });
      for (const [kind, samples] of Object.entries(timings)) {
        samples.sort((a, b) => a - b);
        console.log(
          `D1 burst ${kind}: n=${samples.length}, HTTP p95=${samples[Math.ceil(samples.length * 0.95) - 1].toFixed(2)} ms (includes auth/queue/network; not Worker-to-D1 latency)`,
        );
      }
    },
  );
  await check('revocation locks circuit edits while preserving original documents', async () => {
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
  });
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
