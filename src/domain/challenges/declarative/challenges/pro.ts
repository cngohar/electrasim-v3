/**
 * Pro Electrician Mode challenge definitions.
 *
 * These exercises deliberately use professional component types and are
 * discoverable from the Challenge Mode hub, but they are gated to Pro mode.
 * They remain declarative and use the same graph rules and simulator as the
 * Student Mode exercises.
 */

import type { Circuit } from '../../../types';
import { componentState, connectionRule, energisedWhile, requiredComponent } from '../rules';
import type { ChallengeDefinition } from '../types';

function blankStarter(): Circuit {
  return { components: [], wires: [], globalVoltage: 230 };
}

const twoWayStaircase: ChallengeDefinition = {
  id: 'two-way-staircase',
  version: 1,
  title: 'Commission a Two-Way Staircase Light',
  difficulty: 'intermediate',
  audience: 'pro',
  estimatedMinutes: 8,

  objective: 'Build a two-way lighting circuit controlled from both ends of a staircase.',
  brief:
    'Use two changeover switches and two traveller conductors. The lamp should remain controllable from either location without bypassing the MCB.',
  teaches:
    'Two-way switching uses COM plus a pair of travellers. Changing either switch selects the alternate live route.',
  steps: [
    { no: 1, text: 'Place Live and Neutral terminals, an MCB, two two-way switches and a bulb.' },
    { no: 2, text: 'Connect Live to the MCB, then MCB output to the first switch COM.' },
    { no: 3, text: 'Connect L1-to-L1 and L2-to-L2 between the two switches.' },
    {
      no: 4,
      text: 'Connect the second switch COM to the bulb Live and return the bulb to Neutral.',
    },
    { no: 5, text: 'Set both switches to a matching traveller and verify the lamp energises.' },
  ],

  starter: blankStarter(),
  allowedComponents: ['live-terminal', 'neutral-terminal', 'mcb', 'two-way-switch', 'bulb'],
  rules: [
    requiredComponent('live-terminal', 'Live supply terminal'),
    requiredComponent('neutral-terminal', 'Neutral supply terminal'),
    requiredComponent('mcb', 'MCB'),
    requiredComponent('two-way-switch', 'two-way switch', 2),
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
      toType: 'two-way-switch',
      label: 'The MCB feeds the first switch COM',
    }),
    connectionRule({
      rail: 'live',
      fromType: 'two-way-switch',
      toType: 'two-way-switch',
      direct: true,
      label: 'The two switches are linked by traveller conductors',
    }),
    connectionRule({
      rail: 'live',
      fromType: 'two-way-switch',
      toType: 'bulb',
      label: 'The second switch feeds the bulb',
    }),
    connectionRule({
      rail: 'neutral',
      fromType: 'bulb',
      toType: 'neutral-terminal',
      label: 'The bulb returns to Neutral',
    }),
    componentState('mcb', { on: true }, 'MCB', 'closed'),
    componentState('two-way-switch', { on: true }, 'two-way switches', 'set to L1'),
    energisedWhile('bulb', 'Bulb'),
  ],

  hints: [
    {
      level: 1,
      text: 'Start with COM on the first switch. L1 and L2 are the two traveller routes to the second switch.',
      visual: {
        label: 'Start at the first switch COM',
        target: {
          kind: 'port',
          componentType: 'two-way-switch',
          portIndex: 0,
          fallback: { x: 520, y: 180 },
        },
      },
    },
    {
      level: 2,
      text: 'Use two separate wires: first-switch L1 to second-switch L1, and L2 to L2.',
      visual: {
        label: 'Join the two traveller terminals',
        target: {
          kind: 'connection',
          from: { componentType: 'two-way-switch', portIndex: 1, occurrence: 0 },
          to: { componentType: 'two-way-switch', portIndex: 1, occurrence: 1 },
          fallback: { x: 650, y: 180 },
        },
      },
    },
    {
      level: 3,
      text: 'Set both switches to L1, close the MCB, and complete the Neutral return before checking.',
      visual: {
        label: 'Finish at the bulb and Neutral return',
        target: { kind: 'port', componentType: 'bulb', portIndex: 1, fallback: { x: 850, y: 300 } },
      },
    },
  ],
  completionMessage:
    'You commissioned a proper two-way circuit: protected Live, matched travellers, and a complete Neutral return.',
};

const smartLighting: ChallengeDefinition = {
  id: 'smart-lighting-relay',
  version: 1,
  title: 'Commission a Smart Lighting Relay',
  difficulty: 'advanced',
  audience: 'pro',
  estimatedMinutes: 8,

  objective:
    'Wire a smart relay so a professional LED lamp has a permanent Neutral and switched Live.',
  brief:
    'The relay needs its own Live and Neutral supply. Its switched output feeds the lamp Live; do not switch the Neutral return.',
  teaches:
    'Smart control modules still need a complete supply, and the load should be switched on Live while Neutral remains a dependable return.',
  steps: [
    {
      no: 1,
      text: 'Place Live and Neutral terminals, an MCB, a Smart WiFi Relay and a Smart RGB LED Bulb.',
    },
    { no: 2, text: 'Connect Live through the MCB to the relay L-in.' },
    { no: 3, text: 'Connect Neutral to relay N-in and directly to the bulb Neutral.' },
    { no: 4, text: 'Connect relay L-out to the bulb Live, close the MCB and verify operation.' },
  ],

  starter: blankStarter(),
  allowedComponents: ['live-terminal', 'neutral-terminal', 'mcb', 'smart-relay', 'bulb-smart-rgb'],
  rules: [
    requiredComponent('live-terminal', 'Live supply terminal'),
    requiredComponent('neutral-terminal', 'Neutral supply terminal'),
    requiredComponent('mcb', 'MCB'),
    requiredComponent('smart-relay', 'smart relay'),
    requiredComponent('bulb-smart-rgb', 'Smart RGB LED bulb'),
    connectionRule({
      rail: 'live',
      fromType: 'live-terminal',
      toType: 'mcb',
      label: 'Live reaches the MCB',
    }),
    connectionRule({
      rail: 'live',
      fromType: 'mcb',
      toType: 'smart-relay',
      label: 'The MCB feeds the relay',
    }),
    connectionRule({
      rail: 'neutral',
      fromType: 'neutral-terminal',
      toType: 'smart-relay',
      label: 'Neutral powers the relay',
    }),
    connectionRule({
      rail: 'live',
      fromType: 'smart-relay',
      toType: 'bulb-smart-rgb',
      label: 'The relay switches the bulb Live',
    }),
    connectionRule({
      rail: 'neutral',
      fromType: 'bulb-smart-rgb',
      toType: 'neutral-terminal',
      label: 'The bulb Neutral returns directly',
    }),
    componentState('mcb', { on: true }, 'MCB', 'closed'),
    componentState('smart-relay', { on: true }, 'smart relay', 'enabled'),
    energisedWhile('bulb-smart-rgb', 'Smart bulb'),
  ],

  hints: [
    {
      level: 1,
      text: 'A smart relay is a powered device: it needs both L-in and N-in before its output can switch.',
      visual: {
        label: 'Power the relay at L-in and N-in',
        target: { kind: 'component', componentType: 'smart-relay', fallback: { x: 560, y: 180 } },
      },
    },
    {
      level: 2,
      text: 'The relay output is the switched Live. Leave the bulb Neutral on the Neutral terminal rail.',
      visual: {
        label: 'Route relay L-out to bulb Live',
        target: {
          kind: 'connection',
          from: { componentType: 'smart-relay', portIndex: 2 },
          to: { componentType: 'bulb-smart-rgb', portIndex: 0 },
          fallback: { x: 730, y: 180 },
        },
      },
    },
    {
      level: 3,
      text: 'Enable the relay, close the MCB, and check that the professional LED load energises.',
      visual: {
        label: 'Complete the bulb Neutral return',
        target: {
          kind: 'port',
          componentType: 'bulb-smart-rgb',
          portIndex: 1,
          fallback: { x: 820, y: 300 },
        },
      },
    },
  ],
  completionMessage:
    'You commissioned a powered smart relay without reversing polarity or switching the Neutral conductor.',
};

const pumpFeeder: ChallengeDefinition = {
  id: 'rcbo-pump-feeder',
  version: 1,
  title: 'Commission an RCBO Pump Feeder',
  difficulty: 'advanced',
  audience: 'pro',
  estimatedMinutes: 10,

  objective:
    'Protect a pump feeder with Type C overcurrent protection, an RCBO, and a continuous Earth path.',
  brief:
    'The motor pump has Live, Neutral and PE terminals. Route both current-carrying conductors through the RCBO and keep PE outside the RCBO sensing path.',
  teaches:
    'Professional circuits combine correct protective-device selection with a complete protective-conductor path.',
  steps: [
    {
      no: 1,
      text: 'Place Live, Neutral and Earth terminals, a Type C MCB, an RCBO and a water pump.',
    },
    { no: 2, text: 'Feed the RCBO Live input from the Type C MCB output.' },
    { no: 3, text: 'Feed the RCBO Neutral input from the Neutral terminal.' },
    {
      no: 4,
      text: 'Connect both RCBO outputs to the pump and connect PE directly to the pump Earth.',
    },
    { no: 5, text: 'Close both protective devices and verify the pump energises without faults.' },
  ],

  starter: blankStarter(),
  allowedComponents: [
    'live-terminal',
    'neutral-terminal',
    'earth-terminal',
    'mcb-type-c',
    'rcbo',
    'water-pump',
  ],
  rules: [
    requiredComponent('live-terminal', 'Live supply terminal'),
    requiredComponent('neutral-terminal', 'Neutral supply terminal'),
    requiredComponent('earth-terminal', 'Earth terminal'),
    requiredComponent('mcb-type-c', 'Type C MCB'),
    requiredComponent('rcbo', 'RCBO'),
    requiredComponent('water-pump', 'water pump'),
    connectionRule({
      rail: 'live',
      fromType: 'live-terminal',
      toType: 'mcb-type-c',
      label: 'Live reaches the Type C MCB',
    }),
    connectionRule({
      rail: 'live',
      fromType: 'mcb-type-c',
      toType: 'rcbo',
      label: 'The Type C MCB feeds the RCBO',
    }),
    connectionRule({
      rail: 'neutral',
      fromType: 'neutral-terminal',
      toType: 'rcbo',
      label: 'Neutral reaches the RCBO input',
    }),
    connectionRule({
      rail: 'live',
      fromType: 'rcbo',
      toType: 'water-pump',
      label: 'RCBO Live output reaches the pump',
    }),
    connectionRule({
      rail: 'neutral',
      fromType: 'rcbo',
      toType: 'water-pump',
      label: 'RCBO Neutral output reaches the pump',
    }),
    connectionRule({
      rail: 'earth',
      fromType: 'earth-terminal',
      toType: 'water-pump',
      label: 'Earth reaches the pump PE terminal',
    }),
    componentState('mcb-type-c', { on: true }, 'Type C MCB', 'closed'),
    componentState('rcbo', { on: true }, 'RCBO', 'closed'),
    energisedWhile('water-pump', 'Water pump'),
  ],

  hints: [
    {
      level: 1,
      text: 'The Type C MCB is upstream overcurrent protection; the RCBO must still carry both Live and Neutral.',
      visual: {
        label: 'Place the Type C MCB upstream',
        target: { kind: 'component', componentType: 'mcb-type-c', fallback: { x: 430, y: 180 } },
      },
    },
    {
      level: 2,
      text: 'Use the RCBO L-out and N-out for the pump. Do not route Earth through the RCBO sensing poles.',
      visual: {
        label: 'Route both RCBO outputs to the pump',
        target: {
          kind: 'connection',
          from: { componentType: 'rcbo', portIndex: 2 },
          to: { componentType: 'water-pump', portIndex: 0 },
          fallback: { x: 740, y: 190 },
        },
      },
    },
    {
      level: 3,
      text: 'Finish the PE connection, close the MCB and RCBO, then check the pump under simulation.',
      visual: {
        label: 'Connect the pump protective Earth',
        target: {
          kind: 'port',
          componentType: 'water-pump',
          portIndex: 2,
          fallback: { x: 840, y: 300 },
        },
      },
    },
  ],
  completionMessage:
    'You commissioned a pump feeder with Type C protection, RCBO residual protection, and a continuous PE path.',
};

export const PRO_CHALLENGES: readonly ChallengeDefinition[] = [
  twoWayStaircase,
  smartLighting,
  pumpFeeder,
];
