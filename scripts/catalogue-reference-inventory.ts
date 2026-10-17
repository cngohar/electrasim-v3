import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COMPONENT_HELP_REGISTRY, getComponentHelp } from '@electrasim/domain/componentHelp';
import { COMPONENT_DEFS } from '@electrasim/domain/components';
import { componentReference } from '@electrasim/domain/core/componentReference';
import { createEmptyCircuit } from '@electrasim/domain/core/normalize';
import { assessPlacement } from '@electrasim/domain/core/placement';
import { assessmentPresentation } from '@electrasim/domain/core/readinessPresentation';
import { resolveDocumentSupply } from '@electrasim/domain/core/supplies';

const circuit = createEmptyCircuit();
const supply = resolveDocumentSupply(circuit).model;
const reconciled = new Set(['led-downlight', 'tube-light', 'motor', 'water-heater']);
const entries = Object.keys(COMPONENT_DEFS)
  .sort()
  .map((type) => {
    const reference = componentReference(type);
    const guidance = getComponentHelp(type);
    const placement = assessPlacement(type, circuit, supply);
    assert(reference.family !== 'unassessed', `Unreviewed family: ${type}`);
    assert(
      guidance.overview && guidance.circuitBehavior && guidance.keySpecs.length,
      `Missing content: ${type}`,
    );
    assert(reference.terminals.length, `Missing canonical terminals: ${type}`);
    return {
      type,
      disposition: reconciled.has(type)
        ? 'reconciled-derived-reference'
        : COMPONENT_HELP_REGISTRY[type]
          ? 'authored-reference'
          : 'reviewed-family-and-catalogue',
      reference,
      guidance,
      guidanceScope:
        'Representative equipment guidance only. Declared model specifications is the source for actual instance ratings; no reference text enables an electrical law.',
      missingDataDisposition: 'explicit-missing-product-data',
      unknownAction:
        'Review supported instance settings and the connected supply. Obtain actual product documentation for manufacturing or installation ratings.',
    };
  });
assert.equal(entries.length, 116);
const document = {
  schema: 1,
  scope:
    'Phase 1.13 catalogue content and declared-rating disposition; not electrical or national certification.',
  count: entries.length,
  summary: Object.fromEntries(
    ['authored-reference', 'reconciled-derived-reference', 'reviewed-family-and-catalogue'].map(
      (key) => [key, entries.filter((entry) => entry.disposition === key).length],
    ),
  ),
  entries,
};
const path = new URL('../docs/audits/data/phase-1.13-catalogue-reference.json', import.meta.url);
// Use the same canonical formatting as the commit hook, as the model inventory
// does. --check remains read-only and still compares the complete snapshot.
const output = execFileSync(
  'bun',
  ['x', 'biome', 'format', '--stdin-file-path', fileURLToPath(path)],
  {
    input: `${JSON.stringify(document, null, 2)}\n`,
    encoding: 'utf8',
    cwd: fileURLToPath(new URL('..', import.meta.url)),
  },
);
if (process.argv.includes('--check')) {
  assert.equal(
    readFileSync(path, 'utf8'),
    output,
    'Catalogue reference matrix is stale. Review changes before regenerating.',
  );
  console.log(
    '116 reference dispositions and rating/terminal snapshots match. This is inventory consistency, not runtime acceptance.',
  );
} else {
  writeFileSync(path, output);
  console.log(`Wrote 116 reference dispositions: ${JSON.stringify(document.summary)}`);
}
