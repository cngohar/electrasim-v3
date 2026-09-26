import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_DEFINITIONS,
  type ChallengeDefinition,
  assertRegistryCoherent,
  getChallengeDefinition,
  getChallengeStepProgress,
  validateChallenge,
} from './index';

describe('Pro Challenge Mode definitions', () => {
  const proChallenges = CHALLENGE_DEFINITIONS.filter((challenge) => challenge.audience === 'pro');

  it('ships multiple explicit Pro-only commissioning exercises', () => {
    expect(proChallenges.length).toBeGreaterThanOrEqual(3);
    expect(proChallenges.every((challenge) => challenge.audience === 'pro')).toBe(true);
    expect(proChallenges.map((challenge) => challenge.id)).toEqual([
      'two-way-staircase',
      'smart-lighting-relay',
      'rcbo-pump-feeder',
    ]);
  });

  it('keeps every challenge registry reference coherent', () => {
    expect(assertRegistryCoherent()).toEqual([]);
  });

  it('provides both textual and visual guidance at every progressive level', () => {
    for (const challenge of CHALLENGE_DEFINITIONS as readonly ChallengeDefinition[]) {
      expect(challenge.hints).toHaveLength(3);
      expect(challenge.hints.every((hint) => hint.text.length > 0 && hint.visual)).toBe(true);
    }
  });

  it('defines Mission 0 as an automatically completable seven-step lamp lesson', () => {
    const mission = getChallengeDefinition('first-lamp-tutorial')!;
    const components = [
      { id: 'live', type: 'live-terminal', x: 100, y: 200, state: {} },
      { id: 'neutral', type: 'neutral-terminal', x: 100, y: 360, state: {} },
      { id: 'mcb', type: 'mcb', x: 300, y: 200, state: { on: true } },
      { id: 'bulb', type: 'bulb', x: 500, y: 200, state: {} },
    ];
    const wire = (
      id: string,
      fromComponentId: string,
      fromPortIndex: number,
      toComponentId: string,
      toPortIndex: number,
    ) => ({
      id,
      fromComponentId,
      fromPortIndex,
      toComponentId,
      toPortIndex,
      controlPoints: [],
    });
    const verdict = validateChallenge(mission, {
      components,
      wires: [
        wire('w1', 'live', 0, 'mcb', 0),
        wire('w2', 'mcb', 1, 'bulb', 0),
        wire('w3', 'bulb', 1, 'neutral', 0),
      ],
      globalVoltage: 230,
    });

    expect(mission.kind).toBe('tutorial');
    expect(mission.steps).toHaveLength(7);
    expect(verdict.state).toBe('complete');
    expect(getChallengeStepProgress(mission, verdict).completedCount).toBe(7);
  });
});
