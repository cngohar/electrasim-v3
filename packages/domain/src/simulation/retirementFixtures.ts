/** Missing laws that once entered the rail fallback. Saved documents remain
 * unchanged; only modeled circuits can produce accepted operating results. */
import { controlCircuit } from '../core/controlFixtures';
import { heaterFixture } from '../core/operatingPointFixtures';
import { protectionCircuit } from '../core/protectionFixtures';
import { FAULT_REGISTRY } from '../faults';
import type { Circuit } from '../types';

export function retirementAcceptanceCircuits(): Record<string, Circuit> {
  const cases: Record<string, Circuit> = {};
  for (const type of ['bulb', 'ceiling-fan', 'bell', 'motor']) {
    const circuit = heaterFixture();
    circuit.components[1]!.type = type;
    circuit.components[1]!.state = {};
    cases[type] = circuit;
  }
  const mixed = heaterFixture();
  mixed.components.push({ ...mixed.components[1]!, id: 'led', type: 'bulb', state: {} });
  mixed.wires.push(
    { ...mixed.wires[0]!, id: 'led-feed', toComponentId: 'led' },
    { ...mixed.wires[1]!, id: 'led-return', fromComponentId: 'led' },
  );
  cases.mixed = mixed;
  for (const type of ['arc-fault', 'smooth-dc-residual', 'live-to-earth'] as const) {
    const circuit = protectionCircuit('mcb', 2);
    circuit.components[1]!.state.protectionModel = undefined;
    circuit.faults = [
      {
        id: `unassessed-${type}`,
        type,
        category: FAULT_REGISTRY[type].category,
        target:
          type === 'live-to-earth'
            ? { type: 'wire', id: 'load-feed' }
            : { type: 'component', id: 'lamp' },
        createdAt: 0,
      },
    ];
    cases[type] = circuit;
  }
  const undeclared = controlCircuit();
  undeclared.components.find((c) => c.id === 'relay')!.state.coilModel = undefined;
  cases['undeclared-coil'] = undeclared;
  return cases;
}

/** Catalog coverage reviewed against declared laws, independent of live results. */
export const TEMPLATE_CALCULATION_STATUS = {
  'simple-lamp': 'converged',
  'one-way-light-switch': 'converged',
  'two-bulb-parallel': 'converged',
  'two-way-staircase-light': 'converged',
  'dimmable-lighting': 'converged',
  'rcd-earth-fault-demo': 'converged',
  'contactor-motor': 'unsupported',
  'timer-bell': 'unsupported',
  'push-button-doorbell': 'unsupported',
  'rcbo-protected-socket': 'converged',
  'pro-3phase-dol-starter': 'converged',
  'pro-ev-charger-circuit': 'unsupported',
  'pro-solar-dc-system': 'unsupported',
  'pro-underfloor-heating': 'converged',
  'pro-staircase-timer': 'unsupported',
  'pro-pir-floodlight': 'converged',
  'pro-cooker-induction': 'unsupported',
  'pro-spd-consumer-unit': 'unsupported',
  'pro-generator-backup': 'unsupported',
  'pro-afdd-bedroom': 'unsupported',
} as const;
