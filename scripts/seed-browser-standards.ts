import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { standardsSeedSql } from './standards-seed-data';

/** Local browser fixture data. No caller can select a remote operation. */
export function seedBrowserStandards(config: string, persist: string, env = process.env) {
  const file = resolve(persist, 'browser-standards.sql');
  writeFileSync(file, standardsSeedSql());
  const result = spawnSync(
    'bun',
    [
      'x',
      'wrangler',
      'd1',
      'execute',
      'DB',
      '--config',
      config,
      '--local',
      '--persist-to',
      persist,
      '--file',
      file,
    ],
    { env: { ...env, WRANGLER_SEND_METRICS: 'false' }, stdio: 'inherit' },
  );
  if (result.status !== 0)
    throw new Error('Could not seed the isolated local browser standards projection.');
}
