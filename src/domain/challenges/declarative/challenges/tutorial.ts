/**
 * Mission 0 — the first-time Challenge Mode tutorial.
 *
 * This is intentionally smaller than the Protected Lamp challenge. It teaches
 * the editor's place → wire → run loop with one protective device, then hands
 * the learner off to the first full challenge.
 */

import type { Circuit } from '../../../types';
import { componentState, connectionRule, energisedWhile, requiredComponent } from '../rules';
import type { ChallengeDefinition } from '../types';

function blankStarter(): Circuit {
  return { components: [], wires: [], globalVoltage: 230 };
}

export const FIRST_LAMP_TUTORIAL: ChallengeDefinition = {
  id: 'first-lamp-tutorial',
  version: 1,
  kind: 'tutorial',
  audience: 'student',
  title: 'Light Your First Lamp',
  difficulty: 'beginner',
  estimatedMinutes: 4,

  objective: 'Learn the editor by building a small protected lamp circuit.',
  brief:
    'This quick mission teaches the three basics: place components, connect their terminals, and run the simulation. There is no score — just get your first lamp glowing.',
  teaches:
    'A complete circuit needs a source, protection, a load, and a return path. The MCB sits in the Live conductor.',
  steps: [
    {
      id: 'place-live',
      no: 1,
      text: 'Place a Live terminal on the canvas.',
      completionRuleIds: ['required-live-terminal'],
      visualTarget: {
        kind: 'component',
        componentType: 'live-terminal',
        fallback: { x: 340, y: 180 },
      },
    },
    {
      id: 'place-neutral',
      no: 2,
      text: 'Place a Neutral terminal on the canvas.',
      completionRuleIds: ['required-neutral-terminal'],
      visualTarget: {
        kind: 'component',
        componentType: 'neutral-terminal',
        fallback: { x: 340, y: 340 },
      },
    },
    {
      id: 'place-protection-and-load',
      no: 3,
      text: 'Place one MCB and one bulb.',
      completionRuleIds: ['required-mcb', 'required-bulb'],
      visualTarget: { kind: 'component', componentType: 'mcb', fallback: { x: 520, y: 180 } },
    },
    {
      id: 'wire-supply',
      no: 4,
      text: 'Connect the Live terminal to the MCB input.',
      completionRuleIds: ['path-live-live-terminal-mcb'],
      visualTarget: {
        kind: 'connection',
        from: { componentType: 'live-terminal', portIndex: 0 },
        to: { componentType: 'mcb', portIndex: 0 },
        fallback: { x: 430, y: 180 },
      },
    },
    {
      id: 'wire-load',
      no: 5,
      text: 'Connect the MCB output to the bulb Live terminal.',
      completionRuleIds: ['path-live-mcb-bulb'],
      visualTarget: {
        kind: 'connection',
        from: { componentType: 'mcb', portIndex: 1 },
        to: { componentType: 'bulb', portIndex: 0 },
        fallback: { x: 650, y: 180 },
      },
    },
    {
      id: 'wire-return',
      no: 6,
      text: 'Connect the bulb Neutral terminal back to Neutral.',
      completionRuleIds: ['path-neutral-bulb-neutral-terminal'],
      visualTarget: {
        kind: 'connection',
        from: { componentType: 'bulb', portIndex: 1 },
        to: { componentType: 'neutral-terminal', portIndex: 0 },
        fallback: { x: 520, y: 340 },
      },
    },
    {
      id: 'run-simulation',
      no: 7,
      text: 'Close the MCB and run the simulation. Watch the bulb light up.',
      completionRuleIds: ['state-mcb-on=true', 'energised-bulb-rest'],
      visualTarget: { kind: 'component', componentType: 'mcb', fallback: { x: 520, y: 180 } },
    },
  ],

  starter: blankStarter(),
  allowedComponents: ['live-terminal', 'neutral-terminal', 'mcb', 'bulb'],
  rules: [
    requiredComponent('live-terminal', 'Live supply terminal'),
    requiredComponent('neutral-terminal', 'Neutral supply terminal'),
    requiredComponent('mcb', 'MCB'),
    requiredComponent('bulb', 'bulb'),
    connectionRule({
      rail: 'live',
      fromType: 'live-terminal',
      toType: 'mcb',
      label: 'Live reaches the MCB',
    }),
    connectionRule({
      rail: 'live',
      fromType: 'mcb',
      toType: 'bulb',
      label: 'The MCB feeds the bulb',
    }),
    connectionRule({
      rail: 'neutral',
      fromType: 'bulb',
      toType: 'neutral-terminal',
      label: 'The bulb returns to Neutral',
    }),
    componentState('mcb', { on: true }, 'MCB', 'closed'),
    energisedWhile('bulb', 'Bulb'),
  ],

  hints: [
    {
      level: 1,
      text: 'Start with the two supply rails: Live sends power out and Neutral brings it back.',
      visual: {
        label: 'Place the Live terminal',
        target: { kind: 'component', componentType: 'live-terminal', fallback: { x: 340, y: 180 } },
      },
    },
    {
      level: 2,
      text: 'The MCB goes in series with Live. Connect its output to the bulb, not to Neutral.',
      visual: {
        label: 'Connect MCB output to bulb Live',
        target: {
          kind: 'connection',
          from: { componentType: 'mcb', portIndex: 1 },
          to: { componentType: 'bulb', portIndex: 0 },
          fallback: { x: 650, y: 180 },
        },
      },
    },
    {
      level: 3,
      text: 'Finish the bulb Neutral return, close the MCB, and run the simulation.',
      visual: {
        label: 'Complete the bulb Neutral return',
        target: {
          kind: 'connection',
          from: { componentType: 'bulb', portIndex: 1 },
          to: { componentType: 'neutral-terminal', portIndex: 0 },
          fallback: { x: 520, y: 340 },
        },
      },
    },
  ],
  completionMessage:
    'Mission complete! You placed components, wired a protected circuit, and ran your first simulation.',
};
