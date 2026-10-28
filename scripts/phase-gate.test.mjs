import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { planPhaseGate, runPhaseGate } from './phase-gate.mjs';
import { componentAccessSteps } from './verify-phase20a.mjs';
import { profileSteps } from './verify-phase21.mjs';
import { publicationSteps } from './verify-phase22.mjs';
import { previewSteps } from './verify-phase23.mjs';

const steps = [
  ['run', 'check'],
  ['run', 'build'],
  ['run', 'test:domain-local'],
  ['x', 'playwright', 'test', 'e2e/example.spec.ts', '--project=chromium'],
];
const gate = { label: 'Example phase', steps, successMessage: 'FULL ACCEPTANCE PASSED' };

function execute(argv, result = () => ({ status: 0 })) {
  const commands = [];
  const output = [];
  const status = runPhaseGate(gate, {
    argv,
    run: (_executable, args) => {
      commands.push(args);
      return result(args);
    },
    log: (message) => output.push(message),
  });
  return { commands, output: output.join('\n'), status };
}

test('default runs every acceptance command, with the check chain split into stages', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  // If check gains a required command, the stage expansion must be updated too.
  assert.equal(pkg.scripts.check, 'bun run typecheck && bun run lint && bun run test');
  const result = execute([]);
  assert.deepEqual(result.commands, [
    ['run', 'typecheck'],
    ['run', 'lint'],
    ['run', 'test'],
    ...steps.slice(1),
  ]);
  assert.equal(result.status, 0);
  assert.match(result.output, /FULL ACCEPTANCE PASSED/);
});

test('resume begins at the requested stage and preserves all following stages', () => {
  const result = execute(['--from', 'test:domain-local']);
  assert.deepEqual(result.commands, steps.slice(2));
  assert.equal(result.status, 0);
  assert.match(result.output, /partial run/);
  assert.doesNotMatch(result.output, /FULL ACCEPTANCE PASSED/);
});

test('specific stages keep dependency order even when requested in a different order', () => {
  const result = execute(['--only', 'browser,unit']);
  assert.deepEqual(result.commands, [['run', 'test'], steps[3]]);
  assert.match(result.output, /remaining stages/);
  assert.doesNotMatch(result.output, /FULL ACCEPTANCE PASSED/);
});

test('the first failure stops later stages and preserves its exit status', () => {
  const result = execute([], (args) => ({ status: args[1] === 'build' ? 7 : 0 }));
  assert.equal(result.status, 7);
  assert.equal(result.commands.length, 4);
  assert.match(result.output, /--from build/);
  assert.doesNotMatch(result.output, /FULL ACCEPTANCE PASSED|selected stages passed/);
});

test('explicit collection runs every stage and preserves failed stages and exit status', () => {
  const result = execute(['--keep-going'], (args) => ({
    status: args[1] === 'build' ? 7 : args[0] === 'x' ? 3 : 0,
  }));
  assert.equal(result.commands.length, 6);
  assert.equal(result.status, 7);
  assert.match(result.output, /failed stages: build, browser/);
  assert.match(result.output, /Full acceptance did not pass/);
  assert.doesNotMatch(result.output, /FULL ACCEPTANCE PASSED|selected stages passed/);
});

test('collection stops on interruption or spawn failure instead of starting more checks', () => {
  for (const failure of [
    { status: null, signal: 'SIGINT' },
    { status: null, error: new Error('Cannot start Bun') },
  ]) {
    const result = execute(['--keep-going'], () => failure);
    assert.equal(result.commands.length, 1);
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.output, /FULL ACCEPTANCE PASSED|selected stages passed/);
  }
});

test('spawn failures and interrupted commands fail instead of claiming a pass', () => {
  for (const failure of [{ error: new Error('Cannot start Bun') }, { status: null }]) {
    const result = execute(['--only', 'browser'], () => failure);
    assert.equal(result.status, 1);
    assert.equal(result.commands.length, 1);
    assert.doesNotMatch(result.output, /selected stages passed/);
  }
});

test('unknown, incomplete or conflicting selectors execute nothing and fail', () => {
  for (const args of [
    ['--from', 'typo'],
    ['--from'],
    ['--only', ''],
    ['--only', 'unit,typo'],
    ['--only', 'unit', '--from', 'build'],
    ['--only', 'unit', '--only', 'browser'],
    ['--resume'],
  ]) {
    const result = execute(args);
    assert.equal(result.status, 1, args.join(' '));
    assert.deepEqual(result.commands, []);
    assert.doesNotMatch(result.output, /FULL ACCEPTANCE PASSED/);
  }
});

test('listing, help and dry runs never execute commands or claim acceptance', () => {
  for (const argv of [['--list'], ['--help'], ['--from', 'unit', '--dry-run']]) {
    const result = execute(argv);
    assert.equal(result.status, 0);
    assert.deepEqual(result.commands, []);
    assert.doesNotMatch(result.output, /FULL ACCEPTANCE PASSED/);
  }
});

test('duplicate stage names cannot make stage selection ambiguous', () => {
  assert.throws(() => planPhaseGate([steps[1], steps[1]], []), /unique/);
});

test('separate browser groups are selectable without dropping either acceptance command', () => {
  const extra = [
    'x',
    'playwright',
    'test',
    'e2e/workbench-ui.spec.ts',
    '--grep=global supply voltage preset',
  ];
  const full = planPhaseGate([...steps, extra], []);
  assert.deepEqual(
    full.stages.slice(-2).map((stage) => stage.id),
    ['browser', 'browser:2'],
  );
  const selected = planPhaseGate([...steps, extra], ['--only', 'browser:2']);
  assert.deepEqual(
    selected.stages.map((stage) => stage.args),
    [extra],
  );
  assert.equal(selected.full, false);
});

test('2.0A full gate retains foundation and dedicated migration/API/source+built coverage', () => {
  const plan = planPhaseGate(componentAccessSteps, []);
  assert.equal(plan.full, true);
  assert.equal(plan.stages.length, 18);
  for (const id of [
    'typecheck',
    'lint',
    'unit',
    'test:gates',
    'test:graph',
    'build',
    'check:perf',
    'check:csp',
    'check:links',
    'check:seo',
    'test:phase-2.0-spike',
    'test:component-access-storage',
    'test:component-access-api',
    'test:platform-admin',
    'test:membership',
    'test:domain-local',
  ])
    assert(
      plan.stages.some((stage) => stage.id === id),
      id,
    );
  const [source, built] = plan.stages.slice(-2);
  for (const spec of ['platform-admin', 'admin-membership', 'component-admin', 'component-access'])
    assert(source.args.includes(`e2e/${spec}.spec.ts`), spec);
  assert(built.args.includes('--config=playwright.component-acceptance-built.config.ts'));
  for (const stage of [source, built]) {
    assert(stage.args.includes('--retries=0'));
    assert(stage.args.includes('--forbid-only'));
  }
  assert.equal(planPhaseGate(componentAccessSteps, ['--only', 'browser:2']).full, false);
});

test('Phase 2.1 full selection preserves foundation/component gates and requires profile storage, API and source/built browsers', () => {
  const plan = planPhaseGate(profileSteps, []);
  assert.equal(plan.full, true);
  assert(plan.stages.some((stage) => stage.args.includes('test:profile-storage')));
  assert(plan.stages.some((stage) => stage.args.includes('test:profiles-api')));
  for (const args of componentAccessSteps.slice(1))
    assert(profileSteps.some((step) => JSON.stringify(step) === JSON.stringify(args)));
  for (const config of ['playwright.profiles.config.ts', 'playwright.profiles-built.config.ts']) {
    const browser = profileSteps.find((step) => step.includes(`--config=${config}`));
    assert(browser);
    assert(browser.includes('--retries=0'));
    assert(browser.includes('--forbid-only'));
    assert(!browser.some((arg) => arg.startsWith('--project') || arg.startsWith('--grep')));
  }
});

test('Phase 2.2 full gate preserves profile/foundation regression and both publication browser deliveries', () => {
  const plan = planPhaseGate(publicationSteps, []);
  assert.equal(plan.full, true);
  assert.equal(plan.stages.length, 26);
  for (const step of profileSteps)
    assert(publicationSteps.some((value) => JSON.stringify(value) === JSON.stringify(step)));
  for (const command of ['test:publication-storage', 'test:publications-api'])
    assert(plan.stages.some((stage) => stage.args.includes(command)));
  for (const config of [
    'playwright.publications.config.ts',
    'playwright.publications-built.config.ts',
  ]) {
    const browser = publicationSteps.find((step) => step.includes(`--config=${config}`));
    assert(browser);
    assert(browser.includes('--retries=0'));
    assert(browser.includes('--forbid-only'));
    assert(!browser.some((arg) => arg.startsWith('--project') || arg.startsWith('--grep')));
  }
  assert.equal(planPhaseGate(publicationSteps, ['--only', 'test:publications-api']).full, false);
});

test('Phase 2.3 retains the complete publication gate and adds preview runtime/source/built stages', () => {
  assert.deepEqual(previewSteps.slice(0, publicationSteps.length), publicationSteps);
  assert.deepEqual(previewSteps[publicationSteps.length], ['run', 'test:preview-api']);
  const plan = planPhaseGate(previewSteps, []);
  assert.equal(plan.full, true);
  assert.equal(plan.stages.length, planPhaseGate(publicationSteps, []).stages.length + 3);
  for (const config of ['playwright.preview.config.ts', 'playwright.preview-built.config.ts']) {
    const stage = previewSteps.find((args) => args.includes(`--config=${config}`));
    assert(stage);
    for (const arg of ['--workers=1', '--retries=0', '--forbid-only']) assert(stage.includes(arg));
  }
  assert.equal(planPhaseGate(previewSteps, ['--only', 'test:preview-api']).full, false);
});
