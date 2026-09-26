/** Shared test workload for local Bun / workerd parity; never served by the app. */
import { simulate } from '@electrasim/domain/simulation';
import { GUIDED_CIRCUIT_TEMPLATES } from '@electrasim/domain/templates';

export function domainParityFixture(): string {
  const results = [];
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
  return JSON.stringify(results, (_key, value) =>
    value instanceof Set ? [...value].sort() : value,
  );
}
