import { COMPONENT_DEFS, type Circuit } from '@electrasim/domain';
import { exportJSON, importJSON } from '@electrasim/domain/circuitFormat';
import {
  assessCircuitReadiness,
  compileCircuit,
  explicitSupplyProfile,
  resolveDeviceCapabilities,
} from '@electrasim/domain/core';
/** Shared test workload for local Bun / workerd parity; never served by the app. */
import { simulate } from '@electrasim/domain/simulation';
import { GUIDED_CIRCUIT_TEMPLATES } from '@electrasim/domain/templates';
import { component as C, wire as W } from '../packages/domain/src/simulation/auditFixtures';

export function domainParityFixture(): string {
  const results: unknown[] = [];
  for (const template of GUIDED_CIRCUIT_TEMPLATES) {
    for (const standard of ['uk', 'us', 'eu', 'int'] as const) {
      for (const appMode of ['basic', 'pro'] as const) {
        for (const fault of [undefined, 'open-circuit', 'short-circuit'] as const) {
          const circuit = structuredClone(template.circuit);
          if (fault && circuit.wires[0]) circuit.wires[0].fault = fault;
          results.push({
            template: template.id,
            standard,
            appMode,
            fault,
            result: simulate(circuit, { standard, appMode }),
          });
        }
      }
    }
  }
  const compilerCases = [
    {
      components: [C('l', 'live-terminal'), C('n', 'neutral-terminal'), C('mcb', 'mcb')],
      wires: [W('w', 'l', 0, 'mcb', 0)],
    },
    {
      components: [
        C('ac', 'ac-mains-supply'),
        C('dc', 'dc-battery-12v'),
        C('tx', 'transformer-12v'),
      ],
      wires: [],
    },
    {
      components: [
        C('relay', 'relay-dpdt', { on: false }),
        C('poles', 'contactor-3p', { on: true }),
      ],
      wires: [],
    },
    {
      components: [
        C('a', 'live-terminal', { customVoltage: 12 }),
        C('b', 'live-terminal', { customVoltage: 24 }),
      ],
      wires: [],
    },
    { components: [C('broken', 'mcb', { fault: 'protection-forced-open' })], wires: [] },
    { components: [C('bad-port', 'bulb')], wires: [W('bad', 'bad-port', 99, 'bad-port', 1)] },
  ];
  for (const [index, circuit] of compilerCases.entries())
    results.push({
      compilerCase: index,
      result: compileCircuit(circuit),
      readiness: assessCircuitReadiness(circuit),
    });
  const readinessCases: Circuit[] = [
    { components: [], wires: [] },
    { components: [C('heater', 'space-heater')], wires: [] },
    {
      components: [C('l', 'live-terminal'), C('n', 'neutral-terminal')],
      wires: [W('short', 'l', 0, 'n', 0)],
    },
    {
      components: [
        C('l', 'live-terminal'),
        C('n', 'neutral-terminal'),
        C('a', 'space-heater'),
        C('b', 'space-heater'),
      ],
      wires: [W('l', 'l', 0, 'a', 0), W('ab', 'a', 1, 'b', 0), W('n', 'b', 1, 'n', 0)],
    },
    {
      components: [
        C('ac', 'ac-mains-supply'),
        C('dc', 'dc-battery-12v', {
          sourceProfile: explicitSupplyProfile({ kind: 'dc', voltage: 48 }),
        }),
        C('relay', 'relay-spst'),
      ],
      wires: [
        W('coil+', 'dc', 0, 'relay', 0),
        W('coil-', 'dc', 1, 'relay', 1),
        W('contact', 'ac', 0, 'relay', 2),
      ],
    },
    {
      supply: explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 12, frequencyHz: 60 }),
      components: [C('l', 'live-terminal'), C('n', 'neutral-terminal'), C('led', 'bulb')],
      wires: [W('l', 'l', 0, 'led', 0), W('n', 'led', 1, 'n', 0)],
    },
    {
      supply: explicitSupplyProfile({ kind: 'dc', voltage: 24 }),
      components: [
        C('l', 'live-terminal'),
        C('n', 'neutral-terminal'),
        C('heater', 'space-heater'),
      ],
      wires: [W('l', 'l', 0, 'heater', 0), W('n', 'heater', 1, 'n', 0)],
    },
  ];
  for (const [index, circuit] of readinessCases.entries()) {
    const restored = importJSON(exportJSON(circuit));
    results.push({
      supplyCase: index,
      restored,
      readiness: assessCircuitReadiness(restored),
      simulation: simulate(restored),
    });
  }
  results.push({
    catalogue: Object.keys(COMPONENT_DEFS)
      .sort()
      .map((type) => {
        const component = C(type, type);
        return resolveDeviceCapabilities(component, { components: [component], wires: [] });
      }),
  });
  return JSON.stringify(results, (_key, value) =>
    value instanceof Set ? [...value].sort() : value,
  );
}
