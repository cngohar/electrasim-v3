/** Independent closed-form specification aid for ONE ideal unity-PF lamp and
 * ONE series feeder. This module is never imported by the production solver.
 * A scalar reference cannot accept a general circuit or a real driver waveform.
 */
export const LAMP_PRESETS = [
  { type: 'bulb', label: 'LED bulb', watts: 9 },
  { type: 'bulb-cfl', label: 'CFL lamp', watts: 15 },
  { type: 'bulb-smart-rgb', label: 'Smart RGB LED', watts: 10 },
  { type: 'led-downlight', label: 'LED downlight', watts: 12 },
  { type: 'tube-light', label: 'Fluorescent tube', watts: 36 },
];

export function lampReference({
  sourceVolts,
  watts,
  loopOhms,
  minimumVolts = 207,
  maximumVolts = 253,
  connected = true,
  supplyKind = 'ac-single-phase',
  frequencyHz = 50,
}) {
  const finite = (value) => typeof value === 'number' && Number.isFinite(value);
  if (
    ![sourceVolts, watts, loopOhms, minimumVolts, maximumVolts, frequencyHz].every(finite) ||
    frequencyHz <= 0 ||
    frequencyHz > 100_000 ||
    watts < 0.001 ||
    watts > 100_000 ||
    loopOhms < 0 ||
    loopOhms > 1_000_000 ||
    Math.abs(sourceVolts) > 100_000 ||
    minimumVolts < 0.001 ||
    maximumVolts < minimumVolts ||
    maximumVolts > 100_000 ||
    typeof connected !== 'boolean'
  )
    return { status: 'invalid', reason: 'Enter finite, valid profile and circuit values.' };
  if (supplyKind !== 'ac-single-phase' || ![50, 60].includes(frequencyHz))
    return {
      status: 'unassessed',
      reason: 'This reference declares only 50/60 Hz single-phase AC.',
    };
  if (!connected)
    return {
      status: 'disconnected',
      terminalVolts: null,
      currentAmps: 0,
      realPowerWatts: 0,
      wireLossWatts: 0,
      sourcePowerWatts: 0,
      reason: 'Open return. The isolated terminal-pair voltage is unavailable.',
    };
  const magnitude = Math.abs(sourceVolts);
  const sign = sourceVolts < 0 ? -1 : 1;
  const discriminant = magnitude ** 2 - 4 * loopOhms * watts;
  const terminalMagnitude = discriminant > 0 ? (magnitude + Math.sqrt(discriminant)) / 2 : null;
  // High-voltage branch first. This stateless reference makes no startup or
  // dynamical-stability claim; the general runtime still needs state selection.
  if (
    terminalMagnitude !== null &&
    terminalMagnitude >= minimumVolts &&
    terminalMagnitude <= maximumVolts
  ) {
    const currentAmps = (sign * watts) / terminalMagnitude;
    return {
      status: 'on',
      terminalVolts: sign * terminalMagnitude,
      currentAmps,
      realPowerWatts: watts,
      wireLossWatts: currentAmps ** 2 * loopOhms,
      sourcePowerWatts: sourceVolts * currentAmps,
      reason: 'Declared ideal regulated input power; unity PF teaching approximation.',
    };
  }
  // Off means the unloaded terminal voltage is outside the declared band.
  // Never replace an inconsistent loaded/off state or voltage collapse with 0 W.
  if (magnitude < minimumVolts || magnitude > maximumVolts)
    return {
      status: magnitude < minimumVolts ? 'undervoltage-off' : 'overvoltage-off',
      terminalVolts: sourceVolts,
      currentAmps: 0,
      realPowerWatts: 0,
      wireLossWatts: 0,
      sourcePowerWatts: 0,
      reason: 'Declared zero-current off state. This does not predict damage.',
    };
  return {
    status: 'unavailable',
    reason:
      discriminant <= 0
        ? 'No non-marginal regulated operating point exists for this feeder.'
        : 'Loaded and off candidates cannot satisfy the same operating-band rule.',
  };
}
