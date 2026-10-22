import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { planPhaseGate, runPhaseGate } from './phase-gate.mjs';

process.env.PLAYWRIGHT_DEV_PORT ??= '3014';
const steps = [
  ['run', 'check'],
  ['run', 'test:gates'],
  ['run', 'test:graph'],
  ['run', 'catalogue:inventory', '--check'],
  ['run', 'catalogue:reference', '--check'],
  ['run', 'build'],
  ['run', 'check:perf'],
  ['run', 'check:links'],
  ['run', 'check:seo'],
  ['run', 'check:csp'],
  ['run', 'test:domain-local'],
  ['run', 'test:membership'],
  [
    'x',
    'playwright',
    'test',
    'e2e/canvas-base.spec.ts',
    'e2e/electrical-editing.spec.ts',
    'e2e/fault-marker-movement.spec.ts',
    'e2e/mna-runtime.spec.ts',
    'e2e/timer-dimming.spec.ts',
    'e2e/timed-controls.spec.ts',
    'e2e/damage-repair.spec.ts',
    'e2e/catalogue-profiles.spec.ts',
    'e2e/consumer-evidence.spec.ts',
    '--workers=1',
  ],
  ['x', 'playwright', 'test', '--config=playwright.phase114-built.config.ts', '--workers=1'],
  ['x', 'playwright', 'test', '--config=playwright.production.config.ts', '--workers=1'],
  ['run', 'benchmark:browser'],
  [
    'x',
    'playwright',
    'test',
    'e2e/performance.spec.ts',
    '--config=playwright.performance-built.config.ts',
    '--workers=1',
  ],
  ['run', 'benchmark:simulation'],
];

const argv = process.argv.slice(2);
const evidenceRoot =
  process.env.PHASE114_EVIDENCE_DIR ??
  `.wrangler/phase114/run-${new Date().toISOString().replaceAll(':', '-')}`;
const results = [];
const stageForArgs = new Map(
  planPhaseGate(steps, argv).stages.map((stage) => [JSON.stringify(stage.args), stage.id]),
);
const run = (command, args, options) => {
  mkdirSync(evidenceRoot, { recursive: true });
  const id = stageForArgs.get(JSON.stringify(args));
  const name = id.replaceAll(':', '-');
  const browser = args[0] === 'x' && args[1] === 'playwright';
  const benchmark = id === 'benchmark:browser';
  const performanceStage = benchmark || id === 'browser:4';
  const actualArgs =
    browser || benchmark
      ? [...args, '--reporter=json,list', `--output=${evidenceRoot}/${name}`]
      : args;
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const result = spawnSync(command, actualArgs, {
    ...options,
    env: {
      ...options.env,
      ...(performanceStage ? { PERF: '1' } : {}),
      PLAYWRIGHT_JSON_OUTPUT_FILE: `${evidenceRoot}/${name}.json`,
    },
  });
  let measurementError;
  // An opt-in benchmark can otherwise exit successfully without measuring anything.
  if (result.status === 0 && performanceStage) {
    try {
      const { stats } = JSON.parse(readFileSync(`${evidenceRoot}/${name}.json`, 'utf8'));
      if (!(stats.expected > 0) || stats.skipped > 0)
        throw new Error('Performance stage did not execute every selected measurement.');
    } catch (error) {
      result.status = 1;
      measurementError = String(error);
      console.error(`Phase 1.14: ${id}: ${measurementError}`);
    }
  }
  results.push({
    id,
    args: actualArgs,
    startedAt,
    durationMs: performance.now() - start,
    status: result.status,
    signal: result.signal,
    ...(measurementError ? { measurementError } : {}),
    ...(result.error ? { error: String(result.error) } : {}),
  });
  writeFileSync(`${evidenceRoot}/stages.json`, `${JSON.stringify(results, null, 2)}\n`);
  return result;
};

process.exitCode = runPhaseGate(
  {
    label: 'Phase 1.14',
    steps,
    successMessage:
      'Declared Phase 1.14 local checks passed. Dense 60 fps target-device/owner acceptance remains a separate requirement; preserve the ledger and every prior failure/recovery boundary. No publication or deployment is authorized.',
  },
  { argv, run },
);
