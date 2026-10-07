import { type Page, expect } from '@playwright/test';
import { buildAccessibleDiagnosis } from '../packages/access/src/diagnosis';
import { diagnosisEvidenceFixture } from '../packages/domain/src/challenges/diagnosis/assessmentFixtures';
import { formatShareCode } from '../packages/domain/src/challenges/share';
import { portableResult } from '../packages/domain/src/simulation/runtimeFixtures';
import { test } from './helpers/paid-test';

const panel = (page: Page) => page.getByRole('region', { name: 'Diagnosis Lab', exact: true });

async function start(page: Page, rage = false) {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto('/');
  if (rage) {
    await page.locator('button[title="Settings"]').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Simulation', exact: true }).click();
    await page.getByRole('switch', { name: /Ohmageddon/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByText('Diagnosis Lab', { exact: true }).click();
  const scenario = buildAccessibleDiagnosis({
    seed: rage ? 3 : 5,
    difficulty: rage ? 'intermediate' : 'beginner',
    ...(rage ? { rageTier: 'rage-4' as const } : {}),
  });
  const code = formatShareCode({
    seed: scenario.seed,
    difficulty: scenario.difficulty,
    mode: rage ? 'rage' : 'diagnosis',
    generatorVersion: scenario.generatorVersion,
    rageTier: scenario.rage?.tier ?? null,
    assessment: scenario.assessment,
  });
  await page.getByLabel('Replay a seed').fill(code);
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(panel(page).getByText(/Something isn.t working correctly/)).toBeVisible();
  return scenario;
}

test('versioned diagnosis simulations replay exactly through the actual Comlink worker', async ({
  page,
}) => {
  await start(page);
  const actual = await page.evaluate(async () => {
    const fixturePath = '/packages/domain/src/challenges/diagnosis/assessmentFixtures.ts';
    const clientPath = '/src/sim-worker/client.ts';
    const { diagnosisEvidenceFixture } = await import(fixturePath);
    const { simulateAsync, simWorkerActive } = await import(clientPath);
    const expected = diagnosisEvidenceFixture();
    const result = [];
    for (const row of expected) {
      row.evaluation.simulation = await simulateAsync(row.circuit);
      result.push(row);
    }
    return {
      worker: simWorkerActive(),
      result: JSON.parse(JSON.stringify(result, (_key, v) => (v instanceof Set ? [...v] : v))),
    };
  });
  expect(actual.worker).toBe(true);
  expect(actual.result).toEqual(portableResult(diagnosisEvidenceFixture()));
});

test('a correct diagnosis needs a real repair and survives reload with the authored baseline', async ({
  page,
}) => {
  const s = await start(page);
  const fault = s.faults[0]!;
  await panel(page)
    .locator(`input[name="diagnosis-fault-type"][value="${fault.fault.type}"]`)
    .check();
  await panel(page)
    .locator(`input[name="diagnosis-location"][value="${fault.locationKey}"]`)
    .check();
  await panel(page)
    .getByRole('button', { name: /Submit diagnosis/ })
    .click();
  await expect(panel(page)).toContainText('Correct diagnosis');
  await expect(page.getByLabel('Diagnosis complete')).toBeHidden();
  await panel(page)
    .getByRole('button', { name: /Carry out this repair/ })
    .click();
  await expect(panel(page)).toContainText('running correctly now');
  await page.reload();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByText('Diagnosis Lab', { exact: true }).click();
  await expect(panel(page)).toContainText('running correctly now');
  await panel(page)
    .locator(`input[name="diagnosis-fault-type"][value="${fault.fault.type}"]`)
    .check();
  await panel(page)
    .locator(`input[name="diagnosis-location"][value="${fault.locationKey}"]`)
    .check();
  await panel(page)
    .getByRole('button', { name: /Submit diagnosis/ })
    .click();
  await expect(page.getByLabel('Diagnosis complete')).toBeVisible();
});

test('phone compound diagnosis retains partial recovery and accepts the complete server-owned repair', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const s = await start(page, true);
  expect(s.faults).toHaveLength(2);
  expect(s.rage?.applications.find((a) => a.id === 'compoundFault')?.applied).toBe(true);
  for (const [index, fault] of s.faults.entries()) {
    await panel(page)
      .locator(`input[name="diagnosis-fault-type"][value="${fault.fault.type}"]`)
      .check();
    await panel(page)
      .locator(`input[name="diagnosis-location"][value="${fault.locationKey}"]`)
      .check();
    await panel(page)
      .getByRole('button', { name: /Carry out this repair/ })
      .click();
    await panel(page)
      .getByRole('button', { name: /Submit diagnosis/ })
      .click();
    if (index === 0) {
      await expect(panel(page)).toContainText('Faults found: 1 of 2');
      await expect(panel(page)).toContainText(/Something isn.t working correctly/);
      await expect(page.getByLabel('Diagnosis complete')).toBeHidden();
    }
  }
  await expect(page.getByLabel('Diagnosis complete')).toBeVisible();
});

test('an obsolete saved model preserves repairs and cannot accept a new grade', async ({
  page,
}) => {
  await start(page);
  await page.evaluate(async () => {
    const path = '/src/store/diagnosisPersistence.ts';
    const persistence = await import(path);
    const record = await persistence.loadActiveDiagnosis();
    record.scenario.assessment.modelVersion = 'earlier';
    await persistence.saveActiveDiagnosis(record);
  });
  await page.reload();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByText('Diagnosis Lab', { exact: true }).click();
  await expect(panel(page)).toContainText('Your work is preserved');
  await expect(panel(page).getByRole('button', { name: /Submit diagnosis/ })).toBeDisabled();
});
