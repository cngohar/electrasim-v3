/** Local diagnostic evidence, not an acceptance gate. Known defects are reported unchanged.
 * Run: bun scripts/probes/phase15c-behavior.ts
 * Independent expectations describe the declared teaching model, not full device physics.
 */
import { validateCircuit } from '../../packages/domain/src/circuitValidation';
import { compileCircuit } from '../../packages/domain/src/core';
import { simulate } from '../../packages/domain/src/simulation';
import {
  component as C,
  wire as W,
  parallelLoads,
  protectedLoad,
} from '../../packages/domain/src/simulation/auditFixtures';
import type { Circuit, WireInstance } from '../../packages/domain/src/types';

function observe(id: string, circuit: Circuit, expected: string | object) {
  const simulation = simulate(circuit);
  const compiled = compileCircuit(circuit);
  const validation = validateCircuit(circuit, simulation);
  console.log(
    JSON.stringify({
      id,
      expected,
      observed: {
        status: simulation.electricalContract?.status,
        supplyVoltage: simulation.supplyVoltage,
        energizedComponents: [...simulation.energizedComponents],
        energizedWires: [...simulation.energizedWires],
        components: simulation.componentCalculations,
        wires: simulation.wireCalculations,
        faultsCleared: simulation.faultsCleared,
        errors: simulation.errors,
        warnings: simulation.warnings,
        trips: simulation.trippedComponents,
        damage: simulation.blownComponents,
        bustedWires: [...(simulation.bustedWires ?? [])],
        compilation: compiled.status,
        sources:
          compiled.status === 'compiled'
            ? compiled.graph.sources.map((source) => ({ id: source.id, model: source.model }))
            : compiled.diagnostics,
        validation: {
          status: validation.status,
          score: validation.score,
          issues: validation.issues.map((issue) => ({
            id: issue.id,
            category: issue.category,
            title: issue.title,
          })),
        },
      },
    }),
  );
}

function loadCircuit(type = 'space-heater', voltage = 230): Circuit {
  return {
    globalVoltage: voltage,
    components: [C('l', 'live-terminal'), C('n', 'neutral-terminal'), C('load', type)],
    wires: [W('feed', 'l', 0, 'load', 0), W('return', 'load', 1, 'n', 0)],
  };
}

observe('R01-empty', { components: [], wires: [] }, 'Empty readiness; no success claim.');
observe(
  'R02-unwired-sources',
  { components: [C('l', 'live-terminal'), C('n', 'neutral-terminal')], wires: [] },
  'Explicit no-load/no-closed-path readiness; source presence does not mean a working circuit.',
);
observe(
  'R03-no-source',
  { components: [C('load', 'bulb')], wires: [] },
  'Missing-source readiness; no load current.',
);
const open = loadCircuit('bulb');
open.wires.pop();
observe(
  'R04-open-return',
  open,
  'Open load has zero current, with live terminal potential distinct from delivered power.',
);

for (const voltage of [230, 120, 48, 24, 12]) {
  const resistanceOhms = 230 ** 2 / 2000;
  const wireOhms = (2 * 0.0175 * 10) / 2.5;
  const amps = voltage / (resistanceOhms + wireOhms);
  observe(`V01-heater-${voltage}`, loadCircuit('space-heater', voltage), {
    model: 'Fixed hot resistance, ideal source, two 10 m 2.5 mm2 copper wires at 20 C.',
    resistanceOhms,
    currentAmps: amps,
    loadVoltage: amps * resistanceOhms,
    loadPowerWatts: amps ** 2 * resistanceOhms,
    idealTerminalReference: {
      currentAmps: voltage / resistanceOhms,
      powerWatts: voltage ** 2 / resistanceOhms,
    },
  });
}
observe(
  'V02-led-12',
  loadCircuit('bulb', 12),
  'Declared LED driver range/dropout behavior or not-assessed; never unconditional 9 W at arbitrary voltage.',
);
observe(
  'V03-default-rating-400',
  loadCircuit('bulb', 400),
  'Unknown rating cannot become a fabricated 250 V destruction threshold; 400 V alone does not define three phases.',
);
for (const type of ['bulb', 'bulb-incandescent', 'bulb-halogen']) {
  observe(
    `V04-variant-${type}`,
    loadCircuit(type),
    'Different power/model variants may change current; variants with the same electrical characteristics may correctly agree.',
  );
}
observe(
  'V05-battery-guard',
  {
    components: [C('battery', 'dc-battery-12v'), C('load', 'bulb')],
    wires: [W('feed', 'battery', 0, 'load', 0), W('return', 'load', 1, 'battery', 1)],
  },
  'Existing not-assessed guard is expected until a supported DC load/source model is integrated.',
);

const independent: Circuit = {
  components: [
    C('low', 'ac-mains-supply', { customVoltage: 12 }),
    C('high', 'ac-mains-supply', { customVoltage: 230 }),
    C('low-load', 'bulb'),
    C('high-load', 'bulb'),
  ],
  wires: [
    W('low-feed', 'low', 0, 'low-load', 0),
    W('low-return', 'low-load', 1, 'low', 1),
    W('high-feed', 'high', 0, 'high-load', 0),
    W('high-return', 'high-load', 1, 'high', 1),
  ],
};
observe(
  'V06-independent-original',
  independent,
  'Independent 12 V AC and 230 V AC domains retain their source voltages; unspecified LED laws remain unassessed.',
);
observe(
  'V06-independent-reversed',
  { ...independent, components: [...independent.components].reverse() },
  'Same results as original order.',
);

observe(
  'C01-parallel',
  parallelLoads(),
  'Each load branch carries its own current; only shared feeders carry the sum. LED operating model must be explicit.',
);
const partlyOpen = parallelLoads();
partlyOpen.wires = partlyOpen.wires.filter((wire) => wire.id !== 'lamp-return');
observe(
  'C02-live-dead-end',
  partlyOpen,
  'Lamp feed has source potential but ZERO current; healthy heater branch still operates.',
);

for (const lengthMeters of [10, 100, 1000]) {
  const circuit = loadCircuit();
  circuit.wires = circuit.wires.map((wire) => ({
    ...wire,
    lengthMeters,
    customCableMm2: 2.5,
    material: 'copper',
  }));
  const loadOhms = 230 ** 2 / 2000;
  const wireOhms = (0.0175 * lengthMeters) / 2.5;
  const amps = 230 / (loadOhms + 2 * wireOhms);
  observe(`C03-wire-length-${lengthMeters}`, circuit, {
    model: 'One conductor per wire at 20 C; fixed 26.45 ohm heater.',
    currentAmps: amps,
    eachWireDropVolts: amps * wireOhms,
    loadVoltage: amps * loadOhms,
    loadPowerWatts: amps ** 2 * loadOhms,
  });
}
const cableVariants: { id: string; properties: Partial<WireInstance>; expected: string }[] = [
  {
    id: 'copper-C',
    properties: {
      customCableMm2: 2.5,
      material: 'copper',
      installationMethod: 'C',
      deratingFactor: 1,
    },
    expected:
      'Current catalogue reference capacity 27 A; electrical load response also depends on wire resistance.',
  },
  {
    id: 'aluminum-C',
    properties: {
      customCableMm2: 2.5,
      material: 'aluminum',
      installationMethod: 'C',
      deratingFactor: 1,
    },
    expected:
      'Current declared approximation yields 21 A; material increases resistance. Not a universal installation certification.',
  },
  {
    id: 'copper-B1-derated',
    properties: {
      customCableMm2: 2.5,
      material: 'copper',
      installationMethod: 'B1',
      deratingFactor: 0.5,
    },
    expected:
      'Current reference 24 A base, 12 A after derating; capacity is not the actual current.',
  },
  {
    id: 'explicit-size',
    properties: { customCableMm2: 6 },
    expected: 'Explicit 6 mm2 wire overrides 1 mm2 endpoint setting.',
  },
  {
    id: 'saved-awg',
    properties: { gauge: 16 },
    expected:
      'Saved 16 AWG resolves to 1.31 mm2 before endpoint fallback; the inspector must display the same effective size.',
  },
  {
    id: 'endpoint-fallback',
    properties: {},
    expected:
      'Without a wire size or AWG, the declared 1 mm2 endpoint is the effective size; the inspector must not show an unrelated 2.5 mm2 default.',
  },
];
for (const { id, properties, expected } of cableVariants) {
  const circuit = loadCircuit();
  circuit.components[2].state.customCableMm2 = 1;
  circuit.wires = circuit.wires.map((wire) => ({ ...wire, ...properties }));
  observe(`C04-${id}`, circuit, expected);
}

const branches: Circuit = {
  components: [
    C('l', 'live-terminal'),
    C('n', 'neutral-terminal'),
    C('heater-breaker', 'mcb', { on: true, customMaxAmps: 16 }),
    C('lamp-breaker', 'mcb', { on: true, customMaxAmps: 1 }),
    C('heater', 'space-heater'),
    C('lamp', 'bulb'),
  ],
  wires: [
    W('heater-feed', 'l', 0, 'heater-breaker', 0),
    W('heater-branch', 'heater-breaker', 1, 'heater', 0),
    W('heater-return', 'heater', 1, 'n', 0),
    W('lamp-feed', 'l', 0, 'lamp-breaker', 0),
    W('lamp-branch', 'lamp-breaker', 1, 'lamp', 0),
    W('lamp-return', 'lamp', 1, 'n', 0),
  ],
};
observe(
  'P01-branch-breaker',
  branches,
  'A 1 A breaker on the 9 W lamp branch must not trip from the separate heater branch current.',
);
for (const addSeparateProtection of [false, true]) {
  const circuit = loadCircuit();
  circuit.components[2].state.customPowerWatts = 6900;
  if (addSeparateProtection) {
    circuit.components.push(
      C('separate-breaker', 'mcb', { on: true, customMaxAmps: 32 }),
      C('separate-lamp', 'bulb'),
    );
    circuit.wires.push(
      W('separate-feed', 'l', 0, 'separate-breaker', 0),
      W('separate-branch', 'separate-breaker', 1, 'separate-lamp', 0),
      W('separate-return', 'separate-lamp', 1, 'n', 0),
    );
  }
  observe(
    `P02-unprotected-branch-${addSeparateProtection}`,
    circuit,
    'A breaker on another branch cannot protect this heater cable. Actual damage needs thermal/time evidence; instantaneous melting is not the reference expectation.',
  );
}
observe(
  'P03-isolator',
  protectedLoad('main-switch', 7400, 100),
  '100 A isolator does not automatically trip on the load; cable hazards are separate.',
);
observe(
  'P04-balanced-rccb',
  protectedLoad('rcd', 7400, 63),
  'Balanced load current alone does not cause residual-current operation.',
);
observe(
  'P05-modest-overcurrent',
  protectedLoad('mcb', 4000, 16),
  'An approximately 17.4 A load does not instantly trip B16; nameplate is not an instantaneous threshold.',
);

const reversed = loadCircuit('bulb');
reversed.wires[0].toPortIndex = 1;
reversed.wires[1].fromPortIndex = 0;
observe('T01-reversed-LN', reversed, 'Independent polarity diagnostic even if a load can operate.');
const peReturn = loadCircuit('bulb');
peReturn.components.push(C('pe', 'earth-terminal'));
peReturn.wires[1].toComponentId = 'pe';
observe(
  'T02-PE-return',
  peReturn,
  'Explicit unintended-PE-return diagnostic; not an ordinary neutral connection or successful compliance score.',
);
observe(
  'T03-source-short',
  {
    components: [C('l', 'live-terminal'), C('n', 'neutral-terminal')],
    wires: [W('short', 'l', 0, 'n', 0)],
  },
  'Short-circuit diagnostic with explicit current/impedance coverage; never normal operation.',
);
for (const [id, properties] of [
  ['negative-length', { lengthMeters: -1 }],
  ['zero-size', { customCableMm2: 0 }],
  ['nan-size', { customCableMm2: Number.NaN }],
  ['zero-derating', { deratingFactor: 0 }],
  ['bad-port', { fromPortIndex: 99 }],
] as const) {
  const circuit = loadCircuit();
  circuit.wires[0] = { ...circuit.wires[0], ...properties };
  observe(`I01-${id}`, circuit, 'Invalid input, no electrical telemetry and no validation pass.');
}
