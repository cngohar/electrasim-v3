import { describe, expect, it } from 'vitest';
import { INITIAL_LAMP_STATE, lampPower, nextBuildStep, vacuumTransition } from './state';

describe('Light Explorer state machine', () => {
  it('starts assembled, unpowered and open to atmosphere', () => {
    expect(INITIAL_LAMP_STATE).toMatchObject({ mode: 'assembly', voltage: 0, vacuum: 'open', failed: false });
  });
  it('cycles construction steps without exceeding the sequence', () => {
    expect(nextBuildStep(0)).toBe(1);
    expect(nextBuildStep(6)).toBe(0);
  });
  it('requires two deliberate actions to pump and seal', () => {
    expect(vacuumTransition('open')).toBe('pumping');
    expect(vacuumTransition('pumping')).toBe('sealed');
    expect(vacuumTransition('sealed')).toBe('open');
  });
  it('keeps the educational power model explainable', () => {
    expect(lampPower(140)).toMatchObject({ current: 1, watts: 140, brightness: 1 });
  });
});
