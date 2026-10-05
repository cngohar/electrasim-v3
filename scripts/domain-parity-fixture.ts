import { COMPONENT_DEFS, type Circuit } from '@electrasim/domain';
import { exportJSON, importJSON } from '@electrasim/domain/circuitFormat';
import {
  assessCircuitReadiness,
  compileCircuit,
  explicitSupplyProfile,
  previewSupplyChange,
  previewVariantChange,
  resolveDeviceCapabilities,
  solveCircuit,
} from '@electrasim/domain/core';
/** Shared test workload for local Bun / workerd parity; never served by the app. */
import { simulate } from '@electrasim/domain/simulation';
import { GUIDED_CIRCUIT_TEMPLATES } from '@electrasim/domain/templates';
import { controlCircuit, setControlSwitch } from '../packages/domain/src/core/controlFixtures';
import { earthingAcceptanceCircuits } from '../packages/domain/src/core/earthingFixtures';
import { editingCircuit, variantCircuit } from '../packages/domain/src/core/editingFixtures';
import { mnaAcceptanceCircuits } from '../packages/domain/src/core/mnaFixtures';
import { operatingPointAcceptanceCircuits } from '../packages/domain/src/core/operatingPointFixtures';
import {
  protectionCircuit,
  rcboCircuit,
  rcdBalancedCircuit,
  rcdLeakingCircuit,
} from '../packages/domain/src/core/protectionFixtures';
import { timerDimmingAcceptanceCircuits } from '../packages/domain/src/core/timerDimmingFixtures';
import { transformerAcceptanceCircuits } from '../packages/domain/src/core/transformerFixtures';
import { component as C, wire as W } from '../packages/domain/src/simulation/auditFixtures';
import { runtimeAcceptanceCircuits } from '../packages/domain/src/simulation/runtimeFixtures';

export function domainParityFixture(): string {
  const results: unknown[] = [];
  for (const [name, circuit] of Object.entries(timerDimmingAcceptanceCircuits())) {
    let previous = simulate(circuit);
    results.push({ timerDimmingCase: name, step: 'reset', result: previous });
    for (const deltaSeconds of [0.999999, 0.000001, 1, 1]) {
      previous = simulate(circuit, { simulationState: previous.simulationState, deltaSeconds });
      results.push({ timerDimmingCase: name, step: deltaSeconds, result: previous });
    }
  }
  const protectionCases: [string, Circuit, number[]][] = [
    ['mcb-overload', protectionCircuit('mcb', 2), [0.5, 3600]],
    ['mcb-instant', protectionCircuit('mcb', 0.5), [0.5]],
    ['fuse-melt', protectionCircuit('fuse', 1), [0.5, 10]],
    ['rcd-leak', rcdLeakingCircuit(), [0.05, 1]],
    ['rcd-balanced', rcdBalancedCircuit(), [1]],
    ['rcbo-balanced', rcboCircuit(32, 30), [1]],
  ];
  for (const [name, circuit, deltas] of protectionCases) {
    let previous = simulate(circuit, { deltaSeconds: deltas[0] });
    results.push({ protectionCase: name, step: deltas[0], result: previous });
    for (const deltaSeconds of deltas.slice(1)) {
      previous = simulate(circuit, { simulationState: previous.simulationState, deltaSeconds });
      results.push({ protectionCase: name, step: deltaSeconds, result: previous });
    }
  }
  const controls = controlCircuit();
  let step = simulate(controls);
  results.push({ controlStep: 'initial', result: step });
  for (const [name, circuit, deltaSeconds] of [
    ['before-pickup', controls, 0.999],
    ['pickup', controls, 0.001],
    ['before-dropout', setControlSwitch(controls, false), 0.249],
    ['dropout', setControlSwitch(controls, false), 0.001],
  ] as const) {
    step = simulate(circuit, { simulationState: step.simulationState, deltaSeconds });
    results.push({ controlStep: name, result: step });
  }
  for (const [name, circuit] of Object.entries(runtimeAcceptanceCircuits()))
    results.push({ runtimeCase: name, result: simulate(circuit) });
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
  for (const [name, circuit] of Object.entries(mnaAcceptanceCircuits()))
    results.push({ mnaCase: name, result: solveCircuit(circuit) });
  for (const [name, circuit] of Object.entries(operatingPointAcceptanceCircuits()))
    results.push({ operatingPointCase: name, result: solveCircuit(circuit) });
  for (const [name, circuit] of Object.entries(transformerAcceptanceCircuits()))
    results.push({ transformerCase: name, result: solveCircuit(circuit) });
  for (const [name, circuit] of Object.entries(earthingAcceptanceCircuits()))
    results.push({ earthingCase: name, result: solveCircuit(circuit) });
  for (const voltage of [12, 24, 48, 110, 120, 230, 240]) {
    for (const kind of ['dc', 'ac-single-phase'] as const) {
      const profile = explicitSupplyProfile(
        kind === 'dc' ? { kind, voltage } : { kind, voltage, frequencyHz: 50 },
      );
      const preview = previewSupplyChange(editingCircuit(), { kind: 'document' }, profile);
      results.push({
        editingCase: `${kind}-${voltage}`,
        preview,
        runtime: simulate(preview.circuit),
      });
    }
  }
  for (const kind of ['dc', 'ac-single-phase'] as const)
    results.push({
      editingCase: `independent-${kind}`,
      preview: previewSupplyChange(
        editingCircuit(),
        { kind: 'component', componentId: 'independent' },
        explicitSupplyProfile(
          kind === 'dc' ? { kind, voltage: 24 } : { kind, voltage: 24, frequencyHz: 60 },
        ),
      ),
    });
  for (const toType of ['rcd', 'space-heater'])
    results.push({
      editingCase: `variant-${toType}`,
      preview: previewVariantChange(variantCircuit(), 'breaker', toType),
    });
  return JSON.stringify(results, (_key, value) =>
    value instanceof Set ? [...value].sort() : value,
  );
}
