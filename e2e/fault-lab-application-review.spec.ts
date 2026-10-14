import { mkdir } from 'node:fs/promises';
import { FAULT_REGISTRY, type FaultType, normalizeCircuitFaults } from '@electrasim/domain';
import { compileCircuit } from '@electrasim/domain/core';
import { type Page, expect } from '@playwright/test';
import { protectionCircuit } from '../packages/domain/src/core/protectionFixtures';
import { test } from './helpers/paid-test';
import { openCircuit } from './helpers/three-phase';
import { activateControl, fitCanvas, openCircuitTools, openInspector } from './helpers/workbench';

type Scenario = {
  fault: FaultType;
  circuit: ReturnType<typeof protectionCircuit>;
  target: { type: 'component'; id: string } | { type: 'wire'; id: string };
  terminal?: number;
};

const protectedCircuit = () => {
  const circuit = protectionCircuit('mcb', 16);
  circuit.components.push({ id: 'outlet', type: 'socket-3pin', x: 690, y: 300, state: {} });
  circuit.components[2]!.x = 980;
  circuit.wires[1]!.toComponentId = 'outlet';
  circuit.wires[2]!.fromComponentId = 'outlet';
  const cable = circuit.wires[0]!;
  circuit.wires.push(
    {
      ...cable,
      id: 'cpc',
      fromComponentId: 'source',
      fromPortIndex: 2,
      toComponentId: 'outlet',
      toPortIndex: 2,
    },
    {
      ...cable,
      id: 'load-l',
      fromComponentId: 'outlet',
      fromPortIndex: 0,
      toComponentId: 'lamp',
      toPortIndex: 0,
    },
    {
      ...cable,
      id: 'load-n',
      fromComponentId: 'lamp',
      fromPortIndex: 1,
      toComponentId: 'outlet',
      toPortIndex: 1,
    },
  );
  return circuit;
};
const scenarios: Scenario[] = [
  { fault: 'open-circuit', circuit: protectedCircuit(), target: { type: 'wire', id: 'load-feed' } },
  { fault: 'open-live', circuit: protectedCircuit(), target: { type: 'wire', id: 'feed' } },
  { fault: 'open-neutral', circuit: protectedCircuit(), target: { type: 'wire', id: 'return' } },
  {
    fault: 'open-earth',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'outlet' },
    terminal: 2,
  },
  {
    fault: 'terminal-disconnect',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'control' },
    terminal: 0,
  },
  {
    fault: 'reverse-polarity',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'outlet' },
  },
  {
    fault: 'switched-neutral',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'control' },
  },
  {
    fault: 'earth-fault',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'outlet' },
  },
  {
    fault: 'live-to-earth',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'outlet' },
  },
  {
    fault: 'smooth-dc-residual',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'outlet' },
  },
  { fault: 'arc-fault', circuit: protectedCircuit(), target: { type: 'component', id: 'outlet' } },
  {
    fault: 'protection-forced-open',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'control' },
  },
  {
    fault: 'protection-bypass',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'control' },
  },
  {
    fault: 'short-circuit',
    circuit: protectedCircuit(),
    target: { type: 'component', id: 'outlet' },
  },
];

const faultCardNames: Record<FaultType, RegExp> = {
  'open-circuit': /Open Circuit Break/,
  'open-live': /Open Live \(Line Break\)/,
  'open-neutral': /Open Neutral \(Floating Return\)/,
  'open-earth': /Open Earth \(Broken CPC\)/,
  'terminal-disconnect': /Loose \/ Disconnected Terminal/,
  'reverse-polarity': /Reversed Polarity/,
  'switched-neutral': /Switched Neutral Hazard/,
  'earth-fault': /Earth Fault \/ Short to Earth/,
  'live-to-earth': /Insulation Leakage \(Live to Earth\)/,
  'smooth-dc-residual': /Smooth DC Residual Leakage/,
  'arc-fault': /Arc Fault/,
  'protection-forced-open': /Breaker Jammed \/ Forced Open/,
  'protection-bypass': /Protection Bypassed \/ Shunted/,
  'short-circuit': /Dead Short Circuit/,
};

async function selectTarget(page: Page, target: Scenario['target']) {
  if (target.type === 'component') {
    await openInspector(page, target.id);
    return;
  }
  await fitCanvas(page);
  const wire = page.locator(`[data-wire-id="${target.id}"][data-wire-hitbox]`);
  await wire.press('Enter');
  await expect(wire).toHaveAttribute('aria-pressed', 'true');
}

test('review and apply every registered fault against an applicable real circuit target', async ({
  page,
}) => {
  test.setTimeout(360_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mkdir('.wrangler/fault-lab-application', { recursive: true });
  expect(scenarios.map((scenario) => scenario.fault).sort()).toEqual(
    Object.keys(FAULT_REGISTRY).sort(),
  );
  for (const scenario of scenarios) {
    const { fault, circuit, target, terminal } = scenario;
    await openCircuit(page, circuit);
    await selectTarget(page, target);
    const tools = await openCircuitTools(page);
    const mode = page.getByTitle(
      'Basic Student Mode active — click to switch to Pro Electrician Mode',
    );
    if (await mode.isVisible()) await activateControl(page, mode);
    await activateControl(page, tools.locator('[data-tour="fault-lab"]'));
    const panel = page.getByLabel('Fault Lab panel');
    await expect(panel).toBeVisible();
    if (terminal !== undefined)
      await panel.getByLabel('Fault target terminal').selectOption(String(terminal));
    const before = await page.evaluate(async () => {
      const path = '/src/store/circuitStore.ts';
      const { selectCircuit, useCircuitStore } = await import(path);
      return selectCircuit(useCircuitStore.getState());
    });
    await activateControl(page, panel.getByRole('button', { name: /Browse fault library/ }));
    const library = page.getByRole('dialog', { name: 'Fault library', exact: true });
    const card = library.getByRole('button', { name: faultCardNames[fault] });
    await expect(card).toBeEnabled();
    await activateControl(page, card);
    const review = page.getByRole('dialog', { name: 'Review fault edit' });
    await expect(review.locator(`[data-fault-application="${fault}"]`)).toBeVisible();
    const targetId = target.id;
    const reviewDiagram = review.locator('[data-fault-target-diagram]');
    await expect(reviewDiagram).toHaveAttribute(
      'data-fault-target-diagram',
      target.type === 'wire' ? 'wire' : 'component',
    );
    await expect(reviewDiagram).toHaveAttribute('data-fault-target-id', targetId);
    await expect(reviewDiagram.locator('[data-component-symbol]')).toHaveCount(
      target.type === 'wire' ? 2 : 1,
    );
    await page.waitForTimeout(250);
    const foregroundModal = page.locator('dialog[aria-modal="true"][data-surface-state="open"]');
    await expect(foregroundModal).toHaveCount(1);
    await expect(foregroundModal).toContainText('Review fault edit');
    await page.screenshot({
      path: `.wrangler/fault-lab-application/${fault}-review.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await activateControl(
      page,
      review.getByRole('button', { name: 'Apply fault edit', exact: true }),
    );
    await expect(review).not.toBeVisible();
    await expect(panel.locator(`[data-active-fault="${fault}"]`)).toBeVisible();
    await expect(
      panel.locator(`[data-fault-application="${fault}"][data-fault-application-state="applied"]`),
    ).toBeVisible();
    const appliedDiagram = panel.locator(
      `.fault-lab-stage [data-fault-application="${fault}"][data-fault-application-state="applied"] [data-fault-target-diagram]`,
    );
    await expect(appliedDiagram).toHaveAttribute('data-fault-target-id', targetId);
    await expect(appliedDiagram.locator('[data-component-symbol]')).toHaveCount(
      target.type === 'wire' ? 2 : 1,
    );
    await expect(
      panel.locator(
        `.fault-lab-stage [data-fault-application="${fault}"][data-fault-application-state="applied"]`,
      ),
    ).toBeVisible();
    await page
      .locator('dialog[data-interactive-canvas="true"] .table-dialog-panel')
      .evaluate((element) => {
        element.scrollTop = 0;
      });
    await expect(panel.getByRole('heading', { name: 'Follow the failure.' })).toBeVisible();
    const after = await page.evaluate(async () => {
      const path = '/src/store/circuitStore.ts';
      const { selectCircuit, useCircuitStore } = await import(path);
      return selectCircuit(useCircuitStore.getState());
    });
    const expectedTarget =
      terminal === undefined
        ? target
        : { type: 'port', componentId: target.id, portIndex: terminal };
    const active = normalizeCircuitFaults(after).filter((item) => !item.resolved);
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ type: fault, target: expectedTarget });
    const compiled = compileCircuit(after);
    expect(compiled.status).toBe('compiled');
    if (compiled.status === 'compiled')
      expect(compiled.graph.faults[0]).toMatchObject({ type: fault, target: expectedTarget });
    const canvas = page.getByRole('application', { name: 'Circuit diagram' });
    await expect(canvas.locator(`[data-fault-fx="${fault}"]`)).toHaveCount(1);
    if (terminal !== undefined)
      await expect(canvas.locator(`[data-fault-fx="${fault}"]`)).toHaveAttribute(
        'data-fault-port',
        String(terminal),
      );
    const badgeDrift = await canvas.locator(`[data-fault-chip="${fault}"]`).evaluate((node) => {
      const chip = node as SVGGElement;
      const parent = chip.parentElement as unknown as SVGGElement;
      const placement = chip.transform.baseVal.consolidate()!.matrix;
      const expected = new DOMPoint(placement.e, placement.f).matrixTransform(
        parent.getScreenCTM()!,
      );
      const actual = new DOMPoint(0, 0).matrixTransform(chip.getScreenCTM()!);
      return Math.hypot(expected.x - actual.x, expected.y - actual.y);
    });
    expect(badgeDrift).toBeLessThan(1);
    expect(after).not.toEqual(before);
    await page.screenshot({
      path: `.wrangler/fault-lab-application/${fault}-applied.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await activateControl(page, panel.getByRole('button', { name: 'Circuit', exact: true }));
    const overview = panel.getByRole('img', { name: 'Current circuit topology overview' });
    await expect(overview).toBeVisible();
    await expect(overview.locator('[data-component-symbol]')).toHaveCount(
      circuit.components.length,
    );
    await expect(overview.locator('[data-fault-overview-wire]')).toHaveCount(circuit.wires.length);
    await expect(overview.locator(`[data-fault-fx="${fault}"]`)).toHaveCount(1);
    await activateControl(page, panel.getByRole('button', { name: 'Inside', exact: true }));
    await expect(appliedDiagram).toBeVisible();
    await activateControl(
      page,
      panel.locator(`[data-active-fault="${fault}"]`).getByRole('button', { name: /^Clear / }),
    );
    await expect(panel.locator('[data-active-fault]')).toHaveCount(0);
    await expect(canvas.locator('[data-fault-fx]')).toHaveCount(0);
    await expect(panel.locator('[data-fault-application-state="applied"]')).toHaveCount(0);
    const cleared = await page.evaluate(async () => {
      const path = '/src/store/circuitStore.ts';
      const { selectCircuit, useCircuitStore } = await import(path);
      return selectCircuit(useCircuitStore.getState());
    });
    expect(normalizeCircuitFaults(cleared).filter((item) => !item.resolved)).toHaveLength(0);
    expect(JSON.parse(JSON.stringify(cleared))).toEqual(JSON.parse(JSON.stringify(before)));
    await page.screenshot({
      path: `.wrangler/fault-lab-application/${fault}-cleared.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  expect(errors).toEqual([]);
});
