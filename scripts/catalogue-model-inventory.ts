import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COMPONENT_DEFS } from '@electrasim/domain/components';
import { resolveDeviceCapabilities } from '@electrasim/domain/core/capabilities';
import { CAPABILITY_CATALOGUE_VERSION } from '@electrasim/domain/core/capabilityCatalogue';
import { PROFILE_LIMITATION } from '@electrasim/domain/core/catalogueProfiles';
import { ELECTRICAL_MODEL_VERSION } from '@electrasim/domain/core/contracts';
import { resolveDeviceModel } from '@electrasim/domain/core/models';
import { createEmptyCircuit, resolveComponentState } from '@electrasim/domain/core/normalize';
import type { ComponentInstance } from '@electrasim/domain/types';

interface Family {
  milestone: string;
  law: string;
  parameterBasis: string;
  parameters: string;
  states: string;
  example: string;
  acceptance: string;
  missingData: string;
}
interface Specification {
  version: string;
  families: Record<string, Family>;
  assignments: Record<string, string>;
  milestoneOverrides: Record<string, string>;
}
const specPath = new URL('../docs/specs/phase-1.12-model-families.json', import.meta.url);
const outputPath = new URL('../docs/audits/data/phase-1.12-catalogue.json', import.meta.url);
const specificationContent = readFileSync(specPath, 'utf8');
const spec: Specification = JSON.parse(specificationContent);
const circuit = createEmptyCircuit('uk');

// These are explicit runtime boundaries, not an inference from contact continuity.
const automaticInputs: Record<string, string> = {
  'pir-sensor': 'No motion input, sensor timing or declared electronics consumption.',
  'photocell-sensor': 'No illuminance input, thresholds or declared electronics consumption.',
  'smart-relay': 'No WiFi/app protocol or declared electronics consumption.',
  thermostat: 'Saved contact only; no temperature input or thermal controller.',
  'room-thermostat': 'Saved contact only; no temperature input or thermal controller.',
  'heating-thermostat': 'No floor temperature input, program or declared electronics consumption.',
  'door-sensor': 'Saved contact only; no physical door/reed environment input.',
  'double-gang-switch': 'One saved contact state; independent gang states are not represented.',
  'rotary-selector-switch': 'Saved boolean selects AUTO/MAN; no separate automatic input.',
};

for (const [type, family] of Object.entries(spec.assignments)) {
  assert(COMPONENT_DEFS[type], `Unknown assignment: ${type}`);
  assert(spec.families[family], `Unknown model family: ${family}`);
}
for (const [type, milestone] of Object.entries(spec.milestoneOverrides)) {
  assert(spec.assignments[type], `Milestone override has no assignment: ${type}`);
  assert(/^1\.12\.[2-6]$/.test(milestone), `Invalid milestone: ${milestone}`);
}
for (const [family, value] of Object.entries(spec.families)) {
  for (const field of [
    'milestone',
    'law',
    'parameterBasis',
    'parameters',
    'states',
    'example',
    'acceptance',
    'missingData',
  ] as const) {
    assert(value[field]?.trim(), `${family} lacks ${field}`);
  }
}

const entries = Object.entries(COMPONENT_DEFS)
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  .map(([type, def]) => {
    const component: ComponentInstance = {
      id: `inventory-${type}`,
      type,
      x: 0,
      y: 0,
      state: resolveComponentState({}, def),
    };
    const model = resolveDeviceModel(component, def, circuit);
    const capability = resolveDeviceCapabilities(component, circuit, def, model);
    const defaultUnassessed = model.kind === 'unassessed' || model.kind === 'unassessed-load';
    const conditions = new Set<string>();
    if (model.kind === 'contacts') {
      if (model.limitation) conditions.add(model.limitation);
      if (model.coil && !model.coilModel)
        conditions.add('Coil consumption/pickup/timing require an explicit coilModel.');
      if (def.category === 'timer' && !model.timerModel && !model.coilModel)
        conditions.add('Timed behaviour requires explicit timer/coil settings.');
      if (def.isProtection && !model.protectionModel)
        conditions.add('Automatic protection requires a type-appropriate protectionModel.');
      if (model.dimmer)
        conditions.add(
          'Ideal synchronous AC resistive dimming only; electronic/motor loads excluded.',
        );
    }
    if (automaticInputs[type]) conditions.add(automaticInputs[type]);
    if (def.isSocket)
      conditions.add(
        'Outlet connections/capacity only; no internal appliance, USB converter or GFCI electronics.',
      );
    if (model.kind === 'transformer') conditions.add(model.approximation);
    if (model.kind === 'profile-device') conditions.add(PROFILE_LIMITATION);
    if (defaultUnassessed) assert(spec.assignments[type], `Unassigned default model gap: ${type}`);
    const targetFamily = spec.assignments[type];
    const target = targetFamily ? spec.families[targetFamily]! : undefined;
    return {
      type,
      label: def.label,
      category: def.category,
      capabilityFamily: capability.family,
      defaultState: component.state,
      ports: def.ports.map((port, index) => ({ index, role: port.type, label: port.label })),
      ...(def.powerWatts !== undefined ? { catalogueWatts: def.powerWatts } : {}),
      modelKind: model.kind,
      status: defaultUnassessed
        ? 'unassessed-default'
        : conditions.size
          ? 'declared-model-with-conditions'
          : 'declared-model',
      // No placement inventory, label or model tag establishes a circuit test pass.
      runtimeAcceptance: 'not-established-by-inventory',
      conditions: [...conditions],
      unknownRatings: capability.groups.flatMap((group) =>
        [
          ['maximumVoltage', group.maximumVoltage],
          ['currentCapacityAmps', group.currentCapacityAmps],
          ['supplyKinds', group.supplyKinds],
          ['operatingVoltageRange', group.operatingVoltageRange],
          ['frequencyHz', group.frequencyHz],
        ].flatMap(([name, rating]) =>
          typeof rating === 'object' && rating.status === 'unknown' ? [`${group.id}.${name}`] : [],
        ),
      ),
      ...(defaultUnassessed || target
        ? {
            ...(defaultUnassessed ? { gapReason: model.reason } : {}),
            outcome:
              type === 'motor-3phase'
                ? 'existing-model-needs-setup'
                : defaultUnassessed
                  ? 'missing-behaviour'
                  : 'implemented-profile-requires-runtime-evidence',
            owner: spec.milestoneOverrides[type] ?? target!.milestone,
            targetFamily,
            specification: `docs/specs/phase-1.12-model-families.json#families.${targetFamily}`,
          }
        : conditions.size
          ? { owner: '1.12.6', outcome: 'conditional-model-review' }
          : { owner: '1.12.7', outcome: 'retain-and-regress' }),
    };
  });

const unassessed = entries.filter((entry) => entry.status === 'unassessed-default');
assert.equal(entries.length, 116, 'Catalogue count changed; review the phase baseline explicitly');
assert.equal(
  unassessed.length,
  1,
  'Only explicit three-phase motor setup may remain unassessed by default',
);
assert.equal(Object.keys(spec.assignments).length, 31, 'Account for all original default gaps');
const summary = {
  entries: entries.length,
  unassessedDefaults: unassessed.length,
  missingBehaviours: unassessed.filter((entry) => entry.outcome === 'missing-behaviour').length,
  existingModelsNeedingSetup: unassessed.filter(
    (entry) => entry.outcome === 'existing-model-needs-setup',
  ).length,
  implementedOriginalGaps: entries.filter(
    (entry) => entry.outcome === 'implemented-profile-requires-runtime-evidence',
  ).length,
  declaredModelsWithConditions: entries.filter(
    (entry) => entry.status === 'declared-model-with-conditions',
  ).length,
  otherDeclaredModels: entries.filter((entry) => entry.status === 'declared-model').length,
};
const rawOutput = `${JSON.stringify(
  {
    schemaVersion: 1,
    specificationVersion: spec.version,
    specificationSha256: createHash('sha256').update(specificationContent).digest('hex'),
    electricalModelVersion: ELECTRICAL_MODEL_VERSION,
    capabilityCatalogueVersion: CAPABILITY_CATALOGUE_VERSION,
    basis:
      'UK empty document and normalized empty instance state; source/model inventory, not 116 tested circuits',
    summary,
    entries,
  },
  null,
  2,
)}\n`;
// Match staged-file formatting so a formatting hook cannot make the generated
// snapshot stale. No formatting or source mutation happens during --check.
const output = execFileSync(
  'bun',
  ['x', 'biome', 'format', '--stdin-file-path', fileURLToPath(outputPath)],
  { input: rawOutput, encoding: 'utf8', cwd: fileURLToPath(new URL('..', import.meta.url)) },
);
const args = process.argv.slice(2);
assert(
  args.every((arg) => arg === '--write' || arg === '--check'),
  'Use --write or --check',
);
assert(!(args.includes('--write') && args.includes('--check')), 'Choose --write or --check');
if (args.includes('--write')) writeFileSync(outputPath, output);
if (args.includes('--check'))
  assert(
    readFileSync(outputPath, 'utf8') === output,
    'Catalogue snapshot changed; review then --write',
  );
console.log(JSON.stringify(summary));
console.log(
  `${args.includes('--write') ? 'Wrote' : args.includes('--check') ? 'Verified' : 'Target'} ${fileURLToPath(outputPath)}`,
);
