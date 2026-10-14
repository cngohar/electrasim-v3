import { damageCircuit } from '../core/damageFixtures';
import { protectionCircuit } from '../core/protectionFixtures';
import { FAULT_REGISTRY } from '../faults';
import { simulate } from '../simulation';
import type { Circuit, FaultTarget, FaultType, InjectedFault } from '../types';

const fault = (type: FaultType, target: FaultTarget): InjectedFault => ({
  id: `lab-${type}`,
  type,
  target,
  category: FAULT_REGISTRY[type].category,
  createdAt: 0,
  resolved: false,
});

/** Replacement shared electrical corpus, independent of retired exercise grading. */
export function faultLabEvidenceFixture() {
  const cases: [string, Circuit, number][] = [];
  const healthy = damageCircuit();
  cases.push(['healthy', healthy, 0]);
  const broken = { ...healthy, faults: [fault('open-circuit', { type: 'wire', id: 'load-feed' })] };
  cases.push(['open-conductor', broken, 0], ['cause-cleared', { ...broken, faults: [] }, 0]);
  const short = {
    ...protectionCircuit('mcb', 16),
    faults: [fault('short-circuit', { type: 'component', id: 'lamp' })],
  };
  cases.push(['short-before-event', short, 0], ['short-recorded-trip', short, 0.2]);
  const tripped = {
    ...short,
    faults: [],
    components: short.components.map((c) =>
      c.id === 'control' ? { ...c, state: { ...c.state, isTripped: true } } : c,
    ),
  };
  cases.push(['cleared-cause-preserved-trip', tripped, 0]);
  const reset = {
    ...tripped,
    components: tripped.components.map((c) =>
      c.id === 'control' ? { ...c, state: { ...c.state, on: false, isTripped: false } } : c,
    ),
  };
  cases.push(['reset-to-off', reset, 0]);
  const operated = {
    ...reset,
    components: reset.components.map((c) =>
      c.id === 'control' ? { ...c, state: { ...c.state, on: true } } : c,
    ),
  };
  cases.push(['operated-to-on', operated, 0], ['recorded-damage', healthy, 2]);
  const damaged = {
    ...broken,
    wires: broken.wires.map((w) => (w.id === 'load-feed' ? { ...w, isBusted: true } : w)),
  };
  cases.push(
    ['cause-and-damage', damaged, 0],
    ['cleared-cause-preserved-damage', { ...damaged, faults: [] }, 0],
  );
  const replaced = {
    ...damaged,
    faults: [],
    wires: damaged.wires.map((w) => ({ ...w, isBusted: false })),
  };
  cases.push(['replaced-with-model-preserved', replaced, 0]);
  return cases.map(([faultLabCase, circuit, deltaSeconds]) => ({
    faultLabCase,
    circuit,
    result: simulate(circuit, { deltaSeconds }),
  }));
}
