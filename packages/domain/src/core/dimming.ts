import { compileCircuit } from './compile';
import type { CompileOptions, CompileResult, ElectricalSimulationResult } from './contracts';
import { DIMMER_APPROXIMATION, DIMMER_LIMITS, dimmerPowerFraction } from './dimmerModel';
import { deriveEarthingMeasurements } from './earthing';
import { terminalId } from './faultTopology';
import { signedRms } from './linearMeasurements';
import { solveCompiledCircuit } from './mna';
import { deriveOperatingPoints } from './operatingPoint';

type Compiled = Extract<CompileResult, { status: 'compiled' }>;
export const DIMMING_ENGINE_VERSION = 'mna-dimming-1';

/** The switch is lossless: it conducts a declared fraction of sine-wave energy.
 * Every topology is solved and checked independently, including shared feeders.
 * Only RMS V/I and mean real power are aggregated, never scalar RMS KCL/KVL.
 */
export function solveControlledOperatingPoint(
  initial: CompileResult,
  options: CompileOptions = {},
): { compiled: CompileResult; electrical: ElectricalSimulationResult } {
  if (initial.status !== 'compiled')
    return { compiled: initial, electrical: solveCompiledCircuit(initial, options) };
  const dimmers = initial.graph.devices.filter(
    (d) => d.model.kind === 'contacts' && d.model.dimmer,
  );
  if (!dimmers.length)
    return { compiled: initial, electrical: solveCompiledCircuit(initial, options) };
  const fail = (code: string, message: string) => {
    const blocked: Compiled = {
      ...initial,
      coverage: [
        ...initial.coverage,
        { subjectId: 'circuit', aspect: 'controls', status: 'not-assessed', reason: message },
      ],
    };
    const electrical = solveCompiledCircuit(blocked, options);
    electrical.engineVersion = DIMMING_ENGINE_VERSION;
    electrical.diagnostics.push({ code, message, severity: 'warning' });
    return { compiled: blocked, electrical };
  };
  if (dimmers.length > DIMMER_LIMITS.maxControls)
    return fail(
      'dimmer-control-limit',
      `At most ${DIMMER_LIMITS.maxControls} synchronous dimmers are supported in one circuit.`,
    );
  const controls = dimmers.map(({ componentId }) => {
    const component = initial.circuit.components.find((c) => c.id === componentId)!;
    return { componentId, powerFraction: dimmerPowerFraction(component.state, component.type) };
  });
  const sampleOptions = (active: (fraction: number) => boolean): CompileOptions => ({
    ...options,
    dimmerSampling: true,
    contactStates: new Map([
      ...(options.contactStates ?? []),
      ...controls.map((control) => [control.componentId, active(control.powerFraction)] as const),
    ]),
  });
  // Classify the potential conduction path even at level zero. Turning a dimmer
  // down must not turn an incompatible DC/reactive network into a supported one.
  const full = compileCircuit(
    initial.circuit,
    sampleOptions(() => true),
  );
  if (full.status !== 'compiled')
    return { compiled: full, electrical: solveCompiledCircuit(full, options) };
  const influenced = new Set(
    full.graph.domains
      .filter((domain) =>
        dimmers.some(
          (d) =>
            domain.terminals.includes(terminalId(d.componentId, 0)) ||
            domain.terminals.includes(terminalId(d.componentId, 1)),
        ),
      )
      .flatMap((d) => d.terminals),
  );
  if (
    full.graph.sources.some(
      (source) =>
        source.model.kind !== 'ac-single-phase' &&
        (influenced.has(source.positive) || influenced.has(source.negative)),
    )
  )
    return fail(
      'dimmer-supply-unsupported',
      'This dimmer model requires single-phase AC. It does not model DC chopping or three-phase control.',
    );
  if (
    full.graph.branches.some(
      (branch) =>
        ['coil', 'control-supply', 'winding'].includes(branch.kind) &&
        (influenced.has(branch.from) || influenced.has(branch.to)),
    )
  )
    return fail(
      'dimmer-load-unsupported',
      'Dimming a network containing coil, timer electronics or transformer excitation is unassessed. Use a fixed-resistance load on a separate supply.',
    );
  const boundaries = [...new Set([0, ...controls.map((c) => c.powerFraction), 1])].sort(
    (a, b) => a - b,
  );
  const samples: { weight: number; compiled: Compiled; result: ElectricalSimulationResult }[] = [];
  for (let index = 1; index < boundaries.length; index++) {
    const start = boundaries[index - 1]!;
    const end = boundaries[index]!;
    const settings = sampleOptions((fraction) => fraction > start);
    const compiled = compileCircuit(initial.circuit, settings);
    const result = solveCompiledCircuit(compiled, settings);
    result.engineVersion = DIMMING_ENGINE_VERSION;
    if (compiled.status !== 'compiled' || result.status !== 'converged')
      return { compiled, electrical: result };
    samples.push({ weight: end - start, compiled, result });
  }
  const representative = samples[0]!;
  const weighted = (values: number[], rms: boolean) =>
    rms
      ? signedRms(values.map((value, i) => ({ value, weight: samples[i]!.weight })))
      : values.reduce((sum, value, i) => sum + value * samples[i]!.weight, 0);
  const combine = (
    key: 'terminalVoltages' | 'branchCurrents' | 'branchVoltages' | 'branchPowers' | 'wireLosses',
    rms: boolean,
  ) =>
    Object.fromEntries(
      Object.keys(representative.result[key]).flatMap((id) => {
        const values = samples.map((sample) => sample.result[key][id]);
        return values.every(
          (value): value is number => value !== undefined && Number.isFinite(value),
        )
          ? [[id, weighted(values, rms)]]
          : [];
      }),
    );
  for (const id of Object.keys(representative.result.branchCurrents)) {
    const values = samples.map((sample) => sample.result.branchCurrents[id]!);
    if (values.some((value) => value > 1e-9) && values.some((value) => value < -1e-9))
      return fail(
        'dimmer-direction-unsupported',
        'A branch reverses direction between switching states. A waveform-resolved current model is required.',
      );
  }
  const result: ElectricalSimulationResult = {
    ...representative.result,
    terminalVoltages: combine('terminalVoltages', true),
    branchCurrents: combine('branchCurrents', true),
    branchVoltages: combine('branchVoltages', true),
    branchPowers: combine('branchPowers', false),
    wireLosses: combine('wireLosses', false),
    dimming: {
      model: 'synchronous-resistive-rms',
      controls,
      samples: samples.map(({ weight, result: point }) => ({
        weight,
        terminalVoltages: point.terminalVoltages,
        terminalDomains: point.terminalDomains,
      })),
    },
    diagnostics: [],
    loads: [],
    wires: [],
    deviceCurrents: [],
    protectiveCurrents: [],
    faultCurrents: [],
  };
  const diagnostics = new Map<string, ElectricalSimulationResult['diagnostics'][number]>();
  for (const { result: point } of samples)
    for (const diagnostic of point.diagnostics) {
      if (
        ['wire-capacity-exceeded', 'device-current-rating-exceeded'].includes(diagnostic.code) ||
        diagnostic.code.startsWith('load-')
      )
        continue;
      diagnostics.set(JSON.stringify(diagnostic), diagnostic);
    }
  result.diagnostics = [...diagnostics.values()];
  // An arbitrary gauge in a disconnected sample cannot become a measured RMS
  // potential relative to the driven sample. Pair readings use sample differences.
  for (const terminal of Object.keys(result.terminalVoltages)) {
    const references = samples.map(
      ({ result: point }) =>
        point.references.find((r) => r.domainId === point.terminalDomains[terminal])?.terminalId,
    );
    if (references.some((ref) => ref === undefined || ref !== references[0]))
      delete result.terminalVoltages[terminal];
  }
  result.unavailableBranchVoltages = Object.fromEntries(
    representative.compiled.graph.branches
      .filter((b) => result.branchVoltages[b.id] === undefined)
      .map((b) => [b.id, 'independent-references' as const]),
  );
  if (result.checks) {
    result.checks = {
      ...result.checks,
      domains: [],
      couplingGroups: [],
      checkedSwitchingSamples: samples.length,
    };
    for (const key of [
      'maximumKclResidualAmps',
      'maximumSourceResidualVolts',
      'maximumTransformerVoltageResidualVolts',
      'maximumTransformerCurrentResidualAmps',
      'maximumTransformerPowerResidualWatts',
      'maximumPowerResidualWatts',
      'maximumResidualRatio',
    ] as const)
      result.checks[key] = Math.max(...samples.map((sample) => sample.result.checks![key]));
  }
  deriveEarthingMeasurements(representative.compiled.graph, result);
  deriveOperatingPoints(representative.compiled, result, options);
  for (const load of result.loads) {
    const unsafe = samples.flatMap((sample) =>
      sample.result.loads.filter(
        (item) =>
          item.componentId === load.componentId && item.compatibility.status === 'incompatible',
      ),
    );
    if (unsafe.length) {
      load.compatibility = unsafe[0]!.compatibility;
      result.operation = 'incompatible';
      result.diagnostics.push({
        code: 'dimmer-conduction-incompatible',
        severity: 'error',
        componentId: load.componentId,
        message:
          'The load is incompatible during conduction. A lower RMS dimmer setting does not establish peak-voltage or waveform suitability.',
      });
    }
  }
  result.diagnostics.push({
    code: 'dimmer-rms-model',
    severity: 'info',
    message: DIMMER_APPROXIMATION,
  });
  result.diagnostics = [
    ...new Map(
      result.diagnostics.map((diagnostic) => [JSON.stringify(diagnostic), diagnostic]),
    ).values(),
  ];
  return { compiled: representative.compiled, electrical: result };
}
