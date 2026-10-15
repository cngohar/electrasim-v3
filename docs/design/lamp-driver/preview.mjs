import { LAMP_PRESETS, lampReference } from './reference.mjs';

const byId = (id) => document.getElementById(id);
const number = (id) => byId(id).valueAsNumber;
const format = (value, unit, digits = 3) =>
  value === null || value === undefined ? 'Unavailable' : `${value.toFixed(digits)} ${unit}`;
const stateLabels = {
  on: 'On',
  'undervoltage-off': 'Off · below operating voltage',
  'overvoltage-off': 'Off · above operating voltage',
  disconnected: 'Off · return disconnected',
  unavailable: 'Operating point unavailable',
  invalid: 'Check profile values',
  unassessed: 'Supply unassessed',
};
let operatingRangeOrigin = 'nominal-ratio';
const overrides = new Set();

function proposedProfile() {
  return {
    version: 1,
    kind: 'regulated-input-power',
    provenance: {
      kind: 'teaching-assumption',
      profileId: 'generic-mains-lamp',
      revision: 1,
      overrides: [...overrides].sort(),
    },
    nominalVoltage: number('nominal-volts'),
    inputPowerWatts: number('input-watts'),
    operatingVoltageRange: { min: number('minimum-volts'), max: number('maximum-volts') },
    operatingRangeOrigin,
    supply: { kind: 'ac-single-phase', frequencyHz: [50, 60] },
    powerFactorModel: 'ideal-unity',
    offPowerWatts: 0,
    dimming: 'unassessed',
  };
}

function render() {
  const p = proposedProfile();
  const nominalValid =
    Number.isFinite(p.nominalVoltage) &&
    p.nominalVoltage >= 0.001 &&
    p.nominalVoltage <= 100_000 &&
    p.nominalVoltage >= p.operatingVoltageRange.min &&
    p.nominalVoltage <= p.operatingVoltageRange.max;
  const result = nominalValid
    ? lampReference({
        sourceVolts: number('supply-volts'),
        watts: p.inputPowerWatts,
        loopOhms: number('loop-ohms'),
        minimumVolts: p.operatingVoltageRange.min,
        maximumVolts: p.operatingVoltageRange.max,
        connected: byId('connected').checked,
      })
    : { status: 'invalid', reason: 'Nominal voltage must be inside the operating band.' };
  byId('supply-value').textContent = `${number('supply-volts')} V`;
  byId('diagram-source').textContent = `${number('supply-volts')} V AC`;
  byId('diagram-lamp').textContent = `${p.inputPowerWatts} W · ${p.nominalVoltage} V nominal`;
  document.querySelector('.circuit').classList.toggle('on', result.status === 'on');
  document.querySelector('.circuit').classList.toggle('disconnected', !byId('connected').checked);
  byId('result').dataset.state = result.status;
  byId('state').textContent = stateLabels[result.status];
  byId('reason').textContent = result.reason;
  byId('terminal-volts').textContent = format(result.terminalVolts, 'V');
  byId('current').textContent = format(result.currentAmps, 'A', 6);
  byId('power').textContent = format(result.realPowerWatts, 'W');
  byId('loss').textContent = format(result.wireLossWatts, 'W', 6);
  byId('validation').textContent = result.status === 'invalid' ? result.reason : '';
  byId('profile-json').textContent = JSON.stringify(p, null, 2);
}

for (const input of document.querySelectorAll('input'))
  input.addEventListener('input', () => {
    if (input.id === 'nominal-volts') {
      overrides.add('nominalVoltage');
      if (operatingRangeOrigin === 'nominal-ratio' && Number.isFinite(input.valueAsNumber)) {
        byId('minimum-volts').value = Number((0.9 * input.valueAsNumber).toPrecision(12));
        byId('maximum-volts').value = Number((1.1 * input.valueAsNumber).toPrecision(12));
      }
    }
    if (input.id === 'input-watts') overrides.add('inputPowerWatts');
    if (input.id === 'minimum-volts' || input.id === 'maximum-volts') {
      operatingRangeOrigin = 'instance';
      overrides.add('operatingVoltageRange');
    }
    render();
  });
for (const button of document.querySelectorAll('[data-volts]'))
  button.addEventListener('click', () => {
    byId('supply-volts').value = button.dataset.volts;
    render();
  });
byId('lamp-type').addEventListener('change', () => {
  byId('input-watts').value = LAMP_PRESETS.find((p) => p.type === byId('lamp-type').value).watts;
  overrides.delete('inputPowerWatts');
  render();
});
byId('profile-form').addEventListener('submit', (event) => {
  event.preventDefault();
  render();
  if (!byId('validation').textContent) byId('profile-detail').open = true;
});
render();
