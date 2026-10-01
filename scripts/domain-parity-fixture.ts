import { compileCircuit } from '@electrasim/domain/core';
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
    results.push({ compilerCase: index, result: compileCircuit(circuit) });
  return JSON.stringify(results, (_key, value) =>
    value instanceof Set ? [...value].sort() : value,
  );
}
