import { spawnSync } from 'node:child_process';

/** Preserve full acceptance by default; selection is explicit and reported as partial. */
export function planPhaseGate(steps, argv) {
  let browserCount = 0;
  const stages = steps
    .flatMap((args) =>
      args[0] === 'run' && args[1] === 'check'
        ? [
            ['run', 'typecheck'],
            ['run', 'lint'],
            ['run', 'test'],
          ]
        : [args],
    )
    .map((args) => {
      let id;
      if (args[0] === 'run') id = args[1] === 'test' ? 'unit' : args[1];
      else if (args[0] === 'x' && args[1] === 'playwright' && args[2] === 'test') {
        browserCount++;
        id = browserCount === 1 ? 'browser' : `browser:${browserCount}`;
      }
      if (!id) throw new Error(`Unnamed gate command: ${args.join(' ')}`);
      return { id, args };
    });
  const ids = stages.map((stage) => stage.id);
  if (new Set(ids).size !== ids.length) throw new Error('Gate stage names must be unique.');
  const options = { list: false, dryRun: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (['--list', '--dry-run', '--help'].includes(flag)) {
      options[flag === '--dry-run' ? 'dryRun' : flag.slice(2)] = true;
    } else if (flag === '--from' || flag === '--only') {
      if (options.from !== undefined || options.only !== undefined)
        throw new Error('Use one selector: --from STAGE or --only STAGE[,STAGE].');
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(`${flag} requires a stage name.`);
      const requested = flag === '--only' ? value.split(',') : [value];
      for (const id of requested)
        if (!ids.includes(id))
          throw new Error(`Unknown stage "${id}". Available: ${ids.join(', ')}.`);
      options[flag.slice(2)] = requested;
    } else throw new Error(`Unknown option "${flag}". Use --help for gate options.`);
  }
  const selected = options.from
    ? stages.slice(ids.indexOf(options.from[0]))
    : options.only
      ? stages.filter((stage) => options.only.includes(stage.id))
      : stages;
  return { stages: selected, full: selected.length === stages.length, ...options };
}

export function runPhaseGate(
  { label, steps, successMessage },
  { argv = process.argv.slice(2), run = spawnSync, log = console.log } = {},
) {
  let plan;
  try {
    plan = planPhaseGate(steps, argv);
  } catch (error) {
    log(`${label}: ${error.message}`);
    return 1;
  }
  if (plan.help) {
    log('Gate options: --list, --dry-run, --from STAGE, --only STAGE[,STAGE].');
    log('Default: run the full local gate. Selected stages do not certify full acceptance.');
    return 0;
  }
  if (plan.list || plan.dryRun) {
    for (const stage of plan.stages) log(`${stage.id}: bun ${stage.args.join(' ')}`);
    log('No stages executed.');
    return 0;
  }
  if (!plan.full)
    log(`${label}: partial run (${plan.stages.map((stage) => stage.id).join(', ')}).`);
  for (const stage of plan.stages) {
    log(`${label} local gate [${stage.id}]: bun ${stage.args.join(' ')}`);
    const result = run(process.execPath, stage.args, { stdio: 'inherit', env: process.env });
    if (result.error || result.status !== 0) {
      log(`${label}: stage ${stage.id} failed${result.error ? `: ${result.error.message}` : ''}.`);
      log(`After fixing and reviewing affected checks, resume with --from ${stage.id}.`);
      return result.status || 1;
    }
  }
  log(
    plan.full
      ? successMessage
      : `${label}: selected stages passed. Full phase acceptance requires valid evidence for the remaining stages.`,
  );
  return 0;
}
