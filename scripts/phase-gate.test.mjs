import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { planPhaseGate, runPhaseGate } from './phase-gate.mjs';

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
