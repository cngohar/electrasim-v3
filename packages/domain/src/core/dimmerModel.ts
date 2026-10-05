import type { ComponentState } from '../types';

export const DIMMER_APPROXIMATION =
  'Ideal synchronous AC switching for fixed-resistance loads. The level sets the conducted fraction of sine-wave energy; RMS voltage/current and mean power are combined from independently solved switch states. LED drivers, motor speed, coil/transformer excitation, harmonics, leakage and dimmer losses are unassessed.';
export const DIMMER_LIMITS = { maxControls: 8, maxSamples: 9 } as const;

/** Existing fan-regulator recipes persist five positions; light dimmers use three. */
export function dimmerMaximumLevel(type: string): number {
  return type === 'fan-dimmer' ? 5 : 3;
}

export function dimmerPowerFraction(state: ComponentState, type: string): number {
  const maximum = dimmerMaximumLevel(type);
  return state.on && !state.isBlown && !state.isTripped ? (state.speed ?? maximum) / maximum : 0;
}
