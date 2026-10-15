import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { LAMP_PRESETS, lampReference } from '../docs/design/lamp-driver/reference.mjs';

const fixture = (overrides = {}) => ({ sourceVolts: 230, watts: 9, loopOhms: 0, ...overrides });
const close = (actual, expected, tolerance = 1e-10) =>
  assert(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test('12 V and 280 V give declared off states; 230 V yields independently expected 9/230 A', () => {
  for (const [volts, status] of [
    [12, 'undervoltage-off'],
    [280, 'overvoltage-off'],
  ]) {
    const result = lampReference(fixture({ sourceVolts: volts, loopOhms: 0.14 }));
    assert.equal(result.status, status);
    assert.equal(result.terminalVolts, volts);
    assert.equal(result.currentAmps, 0);
    assert.equal(result.realPowerWatts, 0);
  }
  const result = lampReference(fixture());
  assert.equal(result.status, 'on');
  close(result.currentAmps, 0.0391304347826087);
  assert.equal(result.realPowerWatts, 9);
});

test('all five profile powers conserve KVL and power across finite feeders and reversed leads', () => {
  for (const { watts } of LAMP_PRESETS) {
    for (const sourceVolts of [220, 230, 240, -230]) {
      for (const loopOhms of [0, 0.14, 1, 10]) {
        const r = lampReference(fixture({ watts, sourceVolts, loopOhms }));
        assert.equal(r.status, 'on');
        close(r.terminalVolts * r.currentAmps, watts);
        close(sourceVolts - r.terminalVolts, r.currentAmps * loopOhms);
        close(r.sourcePowerWatts, watts + r.currentAmps ** 2 * loopOhms);
        if (loopOhms > 0) assert(r.wireLossWatts > 0);
      }
    }
  }
});

test('explicit analytic feeder fixture: 12 V, 2 ohm, 10 W has the high root 10 V and 1 A', () => {
  const result = lampReference(
    fixture({
      sourceVolts: 12,
      watts: 10,
      loopOhms: 2,
      minimumVolts: 9,
      maximumVolts: 13,
    }),
  );
  assert.equal(result.status, 'on');
  assert.equal(result.terminalVolts, 10);
  assert.equal(result.currentAmps, 1);
  assert.equal(result.wireLossWatts, 2);
  assert.equal(result.sourcePowerWatts, 12);
});

test('inclusive operating boundaries do not hide the finite-feeder state contradiction', () => {
  for (const sourceVolts of [207, 253])
    assert.equal(lampReference(fixture({ sourceVolts })).status, 'on');
  assert.equal(lampReference(fixture({ sourceVolts: 207, loopOhms: 0.14 })).status, 'unavailable');
  // An accepted loaded point may be just inside the band while the source is outside.
  assert.equal(lampReference(fixture({ sourceVolts: 253.001, loopOhms: 0.14 })).status, 'on');
});

test('voltage collapse and marginal roots remain unavailable rather than zero-current success', () => {
  for (const watts of [10, 11]) {
    const result = lampReference(
      fixture({
        sourceVolts: 20,
        watts,
        loopOhms: 10,
        minimumVolts: 5,
        maximumVolts: 25,
      }),
    );
    assert.equal(result.status, 'unavailable');
    assert.equal(result.currentAmps, undefined);
  }
});

test('open return has no invented terminal voltage, while unsupported waveform/frequency stays unassessed', () => {
  const open = lampReference(fixture({ connected: false }));
  assert.equal(open.status, 'disconnected');
  assert.equal(open.terminalVolts, null);
  for (const supplyKind of ['dc', 'ac-three-phase'])
    assert.equal(lampReference(fixture({ supplyKind })).status, 'unassessed');
  assert.equal(lampReference(fixture({ frequencyHz: 400 })).status, 'unassessed');
  assert.equal(lampReference(fixture({ frequencyHz: 60 })).status, 'on');
});

test('non-finite, inverted, zero-power and invalid feeder inputs are rejected', () => {
  for (const invalid of [
    { sourceVolts: Number.NaN },
    { frequencyHz: Number.NaN },
    { frequencyHz: 0 },
    { sourceVolts: Number.POSITIVE_INFINITY },
    { watts: 0 },
    { watts: 0.0001 },
    { watts: -1 },
    { loopOhms: -1 },
    { minimumVolts: 0 },
    { minimumVolts: 0.0001 },
    { maximumVolts: 100 },
    { maximumVolts: Number.POSITIVE_INFINITY },
    { connected: 'yes' },
  ])
    assert.equal(lampReference(fixture(invalid)).status, 'invalid');
});

test('review presets match the five catalogue assignments without accepting a production model', () => {
  const spec = JSON.parse(
    readFileSync(new URL('../docs/specs/phase-1.12-model-families.json', import.meta.url)),
  );
  assert.deepEqual(
    LAMP_PRESETS.map(({ type }) => type).sort(),
    Object.entries(spec.assignments)
      .filter(([, family]) => family === 'electronic-lamp')
      .map(([type]) => type)
      .sort(),
  );
  assert.equal(Object.keys(spec.assignments).length, 31);
});
