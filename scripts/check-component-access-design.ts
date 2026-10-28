/** Design inventory only; does not exercise runtime access or D1 policy. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { COMPONENT_DEFS } from '@electrasim/domain/components';

const baseline = JSON.parse(readFileSync('docs/specs/component-access-baseline.json', 'utf8'));
const previewSource = readFileSync('docs/design/platform-admin/preview-catalog.js', 'utf8');
const preview = JSON.parse(
  runInNewContext(
    `${previewSource}\nJSON.stringify(componentPreviewCatalogue)`,
    {},
    { timeout: 1000 },
  ),
);
const current = Object.entries(COMPONENT_DEFS)
  .map(([id, definition]) => ({
    id,
    label: definition.label,
    category: definition.category,
    description: definition.description ?? '',
    tier: definition.tier === 'pro' ? 'pro' : 'basic',
  }))
  .sort((a, b) => a.id.localeCompare(b.id));
assert.deepEqual(preview, current, 'Preview must use actual canonical IDs and code tiers');
assert.deepEqual(
  baseline.protectedBasicIds,
  current.filter((item) => item.tier === 'basic').map((item) => item.id),
);
assert.deepEqual(
  baseline.originalProIds,
  current.filter((item) => item.tier === 'pro').map((item) => item.id),
);
assert.equal(
  new Set([...baseline.protectedBasicIds, ...baseline.originalProIds]).size,
  current.length,
);
assert.equal(current.length, 116);
assert.equal(baseline.protectedBasicIds.length, 75);
assert.equal(baseline.originalProIds.length, 41);
console.log(
  'PASS design inventory: 116 canonical IDs, 75 protected Basic, 41 original Pro; preview labels/categories/tiers match code. Runtime policy remains unimplemented.',
);
