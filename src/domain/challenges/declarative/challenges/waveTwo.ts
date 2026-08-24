/**
 * The three Wave-2 challenge definitions (plan §23, §24, §25).
 *
 * Hand-authored, declarative, id-agnostic. Every referenced component type
 * and port is verified against `COMPONENT_DEFS` at boot by
 * `assertRegistryCoherent()`.
 *
 *  1. Protected Lamp       — build Live → MCB → Switch → Bulb → Neutral
 *  2. Push-Button Doorbell — momentary press: bell ON while held, OFF released
 *  3. RCBO-Protected Socket — both conductors through the RCBO + earth path
 *
 * Per plan §26 this file STOPS at three challenges — real user testing must
 * happen before any more are added.
 */

import type { Circuit } from '../../../types';
import {
  componentState,
  connectionRule,
  energisedWhile,
  pathExclusivelyThrough,
  requiredComponent,
} from '../rules';
import type { ChallengeDefinition } from '../types';

/** Blank canvas: the learner places every component (plan §23 "Starter"). */
function blankStarter(): Circuit {
  return { components: [], wires: [], globalVoltage: 230 };
}

// ── Challenge 1 — Build a Protected Lamp (§23) ──────────────────────────────

const protectedLamp: ChallengeDefinition = {
  id: 'protected-lamp',
  version: 1,
  title: 'Build a Protected Lamp',
  difficulty: 'beginner',
  audience: 'student',
  estimatedMinutes: 5,

  objective: 'Build a lamp circuit with protection, switching and a Neutral return.',
  brief:
    'Start from a blank canvas. A complete circuit needs a Live supply, an MCB to protect it, a switch to control it, and a Neutral return so current can flow.',
  teaches:
    'A load only works when it has both a protected live feed and a neutral return — and the switch belongs in the live conductor.',
  steps: [
    { no: 1, text: 'Place a Live and a Neutral supply terminal.' },
    { no: 2, text: 'Add an MCB, a single-way switch and a bulb.' },
    { no: 3, text: 'Wire Live → MCB → Switch → Bulb, and Bulb → Neutral.' },
    { no: 4, text: 'Close the MCB and the switch, then check your circuit.' },
  ],

  // UX correction plan §4: learner sees the OUTCOMES, never the recipe.
  // The internal rules below keep judging the circuit exactly as before.
  requirements: [
    {
      id: 'req-protection',
      label: 'Protected by an MCB',
      check: 'The lighting circuit is not yet protected by an MCB.',
      ruleIds: [
        'required-live-terminal',
        'required-mcb',
        'path-live-live-terminal-mcb',
        'path-live-mcb-single-way-switch',
        'state-mcb-on=true',
      ],
    },
    {
      id: 'req-switch',
      label: 'Switch controls the lamp',
      check: 'The switch does not yet control the lamp.',
      ruleIds: [
        'required-single-way-switch',
        'path-live-single-way-switch-bulb',
        'state-single-way-switch-on=true',
      ],
    },
    {
      id: 'req-return',
      label: 'Complete return path',
      check: 'The lamp does not have a complete return path.',
      ruleIds: ['required-neutral-terminal', 'path-neutral-bulb-neutral-terminal'],
    },
    {
      id: 'req-operates',
      label: 'Lamp operates correctly',
      check: 'The lamp is not yet operating.',
      ruleIds: ['required-bulb', 'energised-bulb-rest'],
    },
  ],

  starter: blankStarter(),
  allowedComponents: ['live-terminal', 'neutral-terminal', 'mcb', 'single-way-switch', 'bulb'],

  rules: [
    requiredComponent('live-terminal', 'Live supply terminal'),
    requiredComponent('neutral-terminal', 'Neutral supply terminal'),
    requiredComponent('mcb', 'MCB'),
    requiredComponent('single-way-switch', 'single-way switch'),
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
      toType: 'single-way-switch',
      label: 'The MCB feeds the switch',
    }),
    connectionRule({
      rail: 'live',
      fromType: 'single-way-switch',
      toType: 'bulb',
      label: 'The switch feeds the bulb’s Live terminal',
    }),
    connectionRule({
      rail: 'neutral',
      fromType: 'bulb',
      toType: 'neutral-terminal',
      label: 'The bulb’s Neutral returns to Neutral',
    }),
    componentState('mcb', { on: true }, 'MCB', 'closed'),
    componentState('single-way-switch', { on: true }, 'switch', 'closed'),
    energisedWhile('bulb', 'Bulb'),
  ],

  hints: [
    {
      level: 1,
      text: 'A load needs a complete return path — Live feeds it, Neutral brings current back.',
      visual: {
        label: 'Place the Live terminal first',
        target: { kind: 'component', componentType: 'live-terminal', fallback: { x: 350, y: 170 } },
      },
    },
    {
      level: 2,
      text: 'The switch belongs in the Live conductor, between the MCB and the bulb.',
      visual: {
        label: 'Connect the MCB to the switch',
        target: {
          kind: 'connection',
          from: { componentType: 'mcb', portIndex: 1 },
          to: { componentType: 'single-way-switch', portIndex: 0 },
          fallback: { x: 520, y: 170 },
        },
      },
    },
    {
      level: 3,
      text: 'Connect Bulb.N to Neutral, and make sure the MCB and switch are closed.',
      visual: {
        label: 'Finish at the bulb Neutral terminal',
        target: {
          kind: 'port',
          componentType: 'bulb',
          portIndex: 1,
          fallback: { x: 760, y: 300 },
        },
      },
    },
  ],
  completionMessage:
    'You built a complete lighting circuit with protection, switching, and a Neutral return.',
};

// ── Challenge 2 — Wire a Push-Button Doorbell (§24) ─────────────────────────

const pushButtonDoorbell: ChallengeDefinition = {
  id: 'push-button-doorbell',
  version: 1,
  title: 'Wire a Push-Button Doorbell',
  difficulty: 'beginner',
  audience: 'student',
  estimatedMinutes: 5,

  objective: 'Build a doorbell that only sounds while the button is held.',
  brief:
    'A doorbell uses a normally-open momentary button. The bell must stay silent until the button is pressed, and stop the moment it is released.',
  teaches:
    'A normally-open momentary contact closes only while held: active while pressed, open when released.',
  steps: [
    { no: 1, text: 'Place a Live and a Neutral supply terminal.' },
    { no: 2, text: 'Add an MCB, a push button and a bell.' },
    { no: 3, text: 'Wire Live → MCB → Push Button → Bell, and Bell → Neutral.' },
    { no: 4, text: 'Close the MCB, then press and hold the button to test the bell.' },
  ],

  // UX correction plan §23: the learner sees the outcome, not the recipe.
  requirements: [
    {
      id: 'req-supply',
      label: 'Supply connected',
      check: 'The doorbell circuit is not yet supplied.',
      ruleIds: ['required-live-terminal', 'path-live-live-terminal-mcb', 'state-mcb-on=true'],
    },
    {
      id: 'req-momentary',
      label: 'Rings only while pressed',
      check: 'The bell does not ring only while the button is pressed.',
      ruleIds: [
        'required-push-button',
        'required-bell',
        'path-live-mcb-push-button',
        'path-live-push-button-bell',
        'energised-bell-push-button',
        'energised-bell-rest',
      ],
    },
    {
      id: 'req-return',
      label: 'Complete return path',
      check: 'The bell does not have a complete return path.',
      ruleIds: ['required-neutral-terminal', 'path-neutral-bell-neutral-terminal'],
    },
  ],

  starter: blankStarter(),
  allowedComponents: ['live-terminal', 'neutral-terminal', 'mcb', 'push-button', 'bell'],

  rules: [
    requiredComponent('live-terminal', 'Live supply terminal'),
    requiredComponent('neutral-terminal', 'Neutral supply terminal'),
    requiredComponent('mcb', 'MCB'),
    requiredComponent('push-button', 'push button'),
    requiredComponent('bell', 'bell'),
    connectionRule({
      rail: 'live',
      fromType: 'live-terminal',
      toType: 'mcb',
      label: 'Live reaches the MCB',
    }),
    connectionRule({
      rail: 'live',
      fromType: 'mcb',
      toType: 'push-button',
      label: 'The MCB feeds the push button',
    }),
    connectionRule({
      rail: 'live',
      fromType: 'push-button',
      toType: 'bell',
      label: 'The push button feeds the bell’s Live terminal',
    }),
    connectionRule({
      rail: 'neutral',
      fromType: 'bell',
      toType: 'neutral-terminal',
      label: 'The bell’s Neutral returns to Neutral',
    }),
    componentState('mcb', { on: true }, 'MCB', 'closed'),
    energisedWhile('bell', 'Bell', { pressedTypes: ['push-button'] }),
    energisedWhile('bell', 'Bell', { count: 0 }),
  ],

  hints: [
    {
      level: 1,
      text: 'The button is a momentary contact: the live path only exists while it is held closed.',
      visual: {
        label: 'Find the momentary push button',
        target: { kind: 'component', componentType: 'push-button', fallback: { x: 470, y: 170 } },
      },
    },
    {
      level: 2,
      text: 'The live path must run MCB → Push Button → Bell. Check the button’s wiring.',
      visual: {
        label: 'Wire MCB output into the button',
        target: {
          kind: 'connection',
          from: { componentType: 'mcb', portIndex: 1 },
          to: { componentType: 'push-button', portIndex: 0 },
          fallback: { x: 520, y: 170 },
        },
      },
    },
    {
      level: 3,
      text: 'Press and hold the button, then run the simulation. The bell must stop when released.',
      visual: {
        label: 'Press and hold before testing the bell',
        target: {
          kind: 'port',
          componentType: 'bell',
          portIndex: 0,
          fallback: { x: 760, y: 300 },
        },
      },
    },
  ],
  completionMessage:
    'You used a normally-open momentary contact: active while held, open when released.',
};

// ── Challenge 3 — Protect a Socket with an RCBO (§25) ───────────────────────

const rcboSocket: ChallengeDefinition = {
  id: 'rcbo-socket',
  version: 1,
  title: 'Protect a Socket with an RCBO',
  difficulty: 'intermediate',
  audience: 'student',
  estimatedMinutes: 7,

  objective: 'Feed a socket through an RCBO, keeping the protective Earth path.',
  brief:
    'A socket outlet needs Live AND Neutral through the RCBO — the residual device must see both conductors to detect leakage — plus an unbroken Earth back to the main earth terminal.',
  teaches:
    'An RCBO watches the balance between Live and Neutral. Bypassing it on either conductor — or losing the Earth — leaves the outlet unprotected.',
  steps: [
    { no: 1, text: 'Place Live, Neutral and Earth supply terminals.' },
    { no: 2, text: 'Add an RCBO and a 3-pin socket.' },
    { no: 3, text: 'Wire Live → RCBO L-in, RCBO L-out → Socket L.' },
    { no: 4, text: 'Wire Neutral → RCBO N-in, RCBO N-out → Socket N.' },
    { no: 5, text: 'Wire Earth → Socket E, and make sure the RCBO is closed.' },
  ],

  // UX correction plan §24: learner sees the outcomes, never the recipe.
  requirements: [
    {
      id: 'req-supply',
      label: 'Live, Neutral and Earth connected',
      check: 'The socket is not fully supplied — check the Live, Neutral and Earth connections.',
      ruleIds: [
        'required-live-terminal',
        'required-neutral-terminal',
        'required-earth-terminal',
        'path-live-live-terminal-rcbo',
        'path-neutral-neutral-terminal-rcbo',
        'path-earth-earth-terminal-socket-3pin',
      ],
    },
    {
      id: 'req-protection',
      label: 'Protected by the RCBO',
      check: 'The socket is not fully protected by the RCBO.',
      ruleIds: [
        'required-rcbo',
        'exclusive-live-live-terminal-rcbo-socket-3pin',
        'exclusive-neutral-neutral-terminal-rcbo-socket-3pin',
        'path-live-rcbo-socket-3pin',
        'path-neutral-rcbo-socket-3pin',
        'state-rcbo-on=true',
      ],
    },
    {
      id: 'req-operates',
      label: 'Socket operates normally',
      check: 'The socket is not yet operating.',
      ruleIds: ['required-socket-3pin', 'energised-socket-3pin-rest'],
    },
  ],

  starter: blankStarter(),
  allowedComponents: ['live-terminal', 'neutral-terminal', 'earth-terminal', 'rcbo', 'socket-3pin'],

  rules: [
    requiredComponent('live-terminal', 'Live supply terminal'),
    requiredComponent('neutral-terminal', 'Neutral supply terminal'),
    requiredComponent('earth-terminal', 'Earth terminal'),
    requiredComponent('rcbo', 'RCBO'),
    requiredComponent('socket-3pin', '3-pin socket'),
    connectionRule({
      rail: 'live',
      fromType: 'live-terminal',
      toType: 'rcbo',
      label: 'Live reaches the RCBO’s input',
    }),
    connectionRule({
      rail: 'neutral',
      fromType: 'neutral-terminal',
      toType: 'rcbo',
      label: 'Neutral reaches the RCBO’s input',
    }),
    pathExclusivelyThrough(
      'live',
      'live-terminal',
      'socket-3pin',
      'rcbo',
      'Every Live path to the socket runs through the RCBO',
    ),
    pathExclusivelyThrough(
      'neutral',
      'neutral-terminal',
      'socket-3pin',
      'rcbo',
      'Every Neutral path to the socket runs through the RCBO',
    ),
    connectionRule({
      rail: 'live',
      fromType: 'rcbo',
      toType: 'socket-3pin',
      label: 'The RCBO’s Live output reaches the socket',
    }),
    connectionRule({
      rail: 'neutral',
      fromType: 'rcbo',
      toType: 'socket-3pin',
      label: 'The RCBO’s Neutral output reaches the socket',
    }),
    connectionRule({
      rail: 'earth',
      fromType: 'earth-terminal',
      toType: 'socket-3pin',
      label: 'Earth reaches the socket',
    }),
    componentState('rcbo', { on: true }, 'RCBO', 'closed'),
    energisedWhile('socket-3pin', 'Socket'),
  ],

  hints: [
    {
      level: 1,
      text: 'The RCBO must see BOTH conductors — current going out on Live must come back on Neutral.',
      visual: {
        label: 'Place the RCBO between supply and load',
        target: { kind: 'component', componentType: 'rcbo', fallback: { x: 520, y: 170 } },
      },
    },
    {
      level: 2,
      text: 'Check the RCBO: Live on L-in/L-out, Neutral on N-in/N-out. And the socket still needs its Earth.',
      visual: {
        label: 'Route both Live and Neutral through RCBO',
        target: {
          kind: 'connection',
          from: { componentType: 'rcbo', portIndex: 2 },
          to: { componentType: 'socket-3pin', portIndex: 0 },
          fallback: { x: 710, y: 220 },
        },
      },
    },
    {
      level: 3,
      text: 'Wire Earth → Socket E and close the RCBO, then simulate. The socket must be live.',
      visual: {
        label: 'Connect the protective Earth to the socket',
        target: {
          kind: 'port',
          componentType: 'socket-3pin',
          portIndex: 2,
          fallback: { x: 760, y: 330 },
        },
      },
    },
  ],
  completionMessage:
    'You connected both active conductors through the RCBO and preserved the protective Earth path.',
};

export const WAVE_TWO_CHALLENGES: readonly ChallengeDefinition[] = [
  protectedLamp,
  pushButtonDoorbell,
  rcboSocket,
];
