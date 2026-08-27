import { COMPONENT_DEFS } from './components';
import type { Circuit, ComponentInstance, WireInstance } from './types';

export type GuidedCircuitDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

/** Audience tier: 'basic' templates suit Student mode, 'pro' templates
 *  showcase the Pro toolbox (three-phase, renewables, automation, EV…). */
export type GuidedCircuitTier = 'basic' | 'pro';

export type GuidedCircuitObjectiveKind =
  | 'component-types'
  | 'wire-count'
  | 'run-simulation'
  | 'fault-free';

export interface GuidedCircuitObjective {
  id: string;
  label: string;
  description: string;
  kind: GuidedCircuitObjectiveKind;
  componentTypes?: string[];
  minimum?: number;
}

export interface GuidedCircuitTemplate {
  id: string;
  title: string;
  difficulty: GuidedCircuitDifficulty;
  tier: GuidedCircuitTier;
  topic: string;
  summary: string;
  teaches: string;
  expected: string;
  objectives?: GuidedCircuitObjective[];
  steps: string[];
  faultPrompt?: string;
  circuit: Circuit;
}

const component = (
  templateId: string,
  localId: string,
  type: string,
  x: number,
  y: number,
  state: ComponentInstance['state'] = {},
): ComponentInstance => {
  if (!COMPONENT_DEFS[type]) {
    throw new Error(`guided template "${templateId}" references unknown component "${type}"`);
  }

  return {
    id: `${templateId}-${localId}`,
    type,
    x,
    y,
    state,
  };
};

const wire = (
  templateId: string,
  localId: string,
  from: ComponentInstance,
  fromPortIndex: number,
  to: ComponentInstance,
  toPortIndex: number,
): WireInstance => {
  const fromPort = COMPONENT_DEFS[from.type]?.ports[fromPortIndex];
  const toPort = COMPONENT_DEFS[to.type]?.ports[toPortIndex];

  if (!fromPort || !toPort) {
    throw new Error(`guided template "${templateId}" references an unknown component port`);
  }
  if (fromPort.type !== toPort.type) {
    throw new Error(
      `guided template "${templateId}" connects incompatible ${fromPort.type} and ${toPort.type} ports`,
    );
  }

  return {
    id: `${templateId}-w-${localId}`,
    fromComponentId: from.id,
    fromPortIndex,
    toComponentId: to.id,
    toPortIndex,
    controlPoints: [],
    pathKind: 'orthogonal',
  };
};

function simpleLampTemplate(): GuidedCircuitTemplate {
  const id = 'simple-lamp';
  const live = component(id, 'live', 'live-terminal', 120, 220);
  const neutral = component(id, 'neutral', 'neutral-terminal', 120, 390);
  const mcb = component(id, 'mcb', 'mcb', 310, 220, { on: true });
  const bulb = component(id, 'bulb', 'bulb', 540, 220);

  return {
    id,
    title: 'Simple Protected Lamp',
    difficulty: 'Beginner',
    tier: 'basic',
    topic: 'Live and neutral paths',
    summary: 'A minimal lamp circuit with a live source, MCB protection, and neutral return.',
    teaches: 'A load only energises when it has both a live feed and a neutral return.',
    expected:
      'Run the simulation: the bulb energises. Toggle the MCB off to break the live feed, then select the bulb to watch its live telemetry in the Inspector.',
    steps: [
      'Follow the live conductor from Live to the MCB and then to the bulb.',
      'Follow the neutral conductor from Neutral back to the bulb.',
      'Run the simulation and toggle the MCB to compare closed versus open protection — then select the bulb and read its voltage and current in the Inspector.',
    ],
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, mcb, bulb],
      wires: [
        wire(id, 'live-mcb', live, 0, mcb, 0),
        wire(id, 'mcb-bulb', mcb, 1, bulb, 0),
        wire(id, 'neutral-bulb', neutral, 0, bulb, 1),
      ],
    },
  };
}

function oneWaySwitchTemplate(): GuidedCircuitTemplate {
  const id = 'one-way-light-switch';
  const live = component(id, 'live', 'live-terminal', 110, 210);
  const neutral = component(id, 'neutral', 'neutral-terminal', 110, 390);
  const mcb = component(id, 'mcb', 'mcb', 280, 210, { on: true });
  const sw = component(id, 'switch', 'single-way-switch', 480, 210, { on: false });
  const bulb = component(id, 'bulb', 'bulb', 700, 210);

  return {
    id,
    title: 'One-Way Light Switch',
    difficulty: 'Beginner',
    tier: 'basic',
    topic: 'Switching the live conductor',
    summary: 'A common light circuit where the switch opens and closes the live feed.',
    teaches:
      'The switch belongs on the live conductor, while neutral returns directly to the load.',
    expected:
      'Run the simulation, then toggle the switch on the canvas or in the Inspector. The bulb follows the switch state.',
    steps: [
      'Trace Live through the MCB into the single-way switch.',
      'Trace switched live from the switch output to the bulb.',
      'Toggle the switch and watch the energised path appear and disappear.',
    ],
    faultPrompt:
      'Fault check: open the Fault Lab (Pro) and inject an open circuit on the switched live. The bulb stays dark even with the switch closed because the path is broken.',
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, mcb, sw, bulb],
      wires: [
        wire(id, 'live-mcb', live, 0, mcb, 0),
        wire(id, 'mcb-switch', mcb, 1, sw, 0),
        wire(id, 'switch-bulb', sw, 1, bulb, 0),
        wire(id, 'neutral-bulb', neutral, 0, bulb, 1),
      ],
    },
  };
}

function twoWaySwitchTemplate(): GuidedCircuitTemplate {
  const id = 'two-way-staircase-light';
  const live = component(id, 'live', 'live-terminal', 100, 210);
  const neutral = component(id, 'neutral', 'neutral-terminal', 100, 430);
  const mcb = component(id, 'mcb', 'mcb', 260, 210, { on: true });
  const swA = component(id, 'switch-a', 'two-way-switch', 450, 170, { on: true });
  const swB = component(id, 'switch-b', 'two-way-switch', 660, 170, { on: true });
  const bulb = component(id, 'bulb', 'bulb', 820, 210);

  return {
    id,
    title: 'Two-Way Staircase Light',
    difficulty: 'Intermediate',
    tier: 'basic',
    topic: 'Traveller conductors',
    summary: 'Two switches control one lamp from different places, like a staircase landing.',
    teaches: 'Two-way switching routes live through one of two traveller paths before the load.',
    expected:
      'Run the simulation, then double-click either switch (double-tap on touchscreens) to see the lamp and active traveller path change.',
    steps: [
      'Find COM on the first switch and follow the live feed into it.',
      'Compare L1 and L2 traveller wires between the two switches.',
      'Double-click or double-tap either switch. On desktop, you can also select it and use Switch to L1/L2 in the Inspector.',
    ],
    faultPrompt:
      'Fault check: break one traveller in the Fault Lab. The lamp still works from one end but not the other — a classic staircase fault symptom.',
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, mcb, swA, swB, bulb],
      wires: [
        wire(id, 'live-mcb', live, 0, mcb, 0),
        wire(id, 'mcb-swa-com', mcb, 1, swA, 0),
        wire(id, 'traveller-l1', swA, 1, swB, 1),
        wire(id, 'traveller-l2', swA, 2, swB, 2),
        wire(id, 'swb-com-bulb', swB, 0, bulb, 0),
        wire(id, 'neutral-bulb', neutral, 0, bulb, 1),
      ],
    },
  };
}

function rcdFaultTemplate(): GuidedCircuitTemplate {
  const id = 'rcd-earth-fault-demo';
  const live = component(id, 'live', 'live-terminal', 100, 190);
  const neutral = component(id, 'neutral', 'neutral-terminal', 100, 360);
  const earth = component(id, 'earth', 'earth-terminal', 100, 530);
  const rcd = component(id, 'rcd', 'rcd', 310, 250, { on: true });
  const socket = component(id, 'socket', 'socket-3pin', 560, 250, { fault: 'earth-fault' });
  const lamp = component(id, 'lamp', 'bulb', 800, 250);

  return {
    id,
    title: 'RCD and Earth Fault Check',
    difficulty: 'Intermediate',
    tier: 'basic',
    topic: 'Protection and fault feedback',
    summary: 'A protected socket branch with a deliberate earth-fault warning and a test load.',
    teaches:
      'Protection devices and earth conductors are part of the safety story, not decoration.',
    expected:
      'Run the simulation: the lamp energises and the fault warning explains the socket risk.',
    faultPrompt:
      'Clear the socket fault in the Fault Lab tab, run again, and compare the warning list. Then select the RCD and try its residual-current type selector (AC / A / F / B).',
    steps: [
      'Follow live and neutral through the RCD to the socket branch.',
      'Check that earth is wired to the socket earth port.',
      'Run the simulation, read the warning, then clear the socket fault in the Fault Lab to compare.',
    ],
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, earth, rcd, socket, lamp],
      wires: [
        wire(id, 'live-rcd', live, 0, rcd, 0),
        wire(id, 'neutral-rcd', neutral, 0, rcd, 1),
        wire(id, 'rcd-socket-live', rcd, 2, socket, 0),
        wire(id, 'rcd-socket-neutral', rcd, 3, socket, 1),
        wire(id, 'earth-socket', earth, 0, socket, 2),
        wire(id, 'socket-lamp-live', socket, 0, lamp, 0),
        wire(id, 'socket-lamp-neutral', socket, 1, lamp, 1),
      ],
    },
  };
}

function contactorMotorTemplate(): GuidedCircuitTemplate {
  const id = 'contactor-motor';
  const live = component(id, 'live', 'live-terminal', 110, 230);
  const neutral = component(id, 'neutral', 'neutral-terminal', 110, 400);
  const mcb = component(id, 'mcb', 'mcb', 290, 230, { on: true });
  const contactor = component(id, 'contactor', 'contactor', 520, 250, { on: true });
  const motor = component(id, 'motor', 'motor', 780, 250);

  return {
    id,
    title: 'Contactor Motor Starter',
    difficulty: 'Intermediate',
    tier: 'basic',
    topic: 'Switching heavier loads',
    summary: 'A compact motor branch switched through a contactor after MCB protection.',
    teaches:
      'A contactor can switch live and neutral to a load while the protection device feeds it.',
    expected: 'Run the simulation: the motor energises while the MCB and contactor are closed.',
    steps: [
      'Trace the protected live feed from Live through the MCB.',
      'Follow both live and neutral through the contactor to the motor.',
      'Toggle the contactor or MCB to see either device interrupt the motor.',
    ],
    faultPrompt:
      'Fault check: inject a reverse-polarity fault on the motor in the Fault Lab and watch how the warning list changes.',
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, mcb, contactor, motor],
      wires: [
        wire(id, 'live-mcb', live, 0, mcb, 0),
        wire(id, 'mcb-contactor', mcb, 1, contactor, 0),
        wire(id, 'neutral-contactor', neutral, 0, contactor, 1),
        wire(id, 'contactor-motor-live', contactor, 2, motor, 0),
        wire(id, 'contactor-motor-neutral', contactor, 3, motor, 1),
      ],
    },
  };
}

function timerBellTemplate(): GuidedCircuitTemplate {
  const id = 'timer-bell';
  const live = component(id, 'live', 'live-terminal', 110, 230);
  const neutral = component(id, 'neutral', 'neutral-terminal', 110, 400);
  const mcb = component(id, 'mcb', 'mcb', 290, 230, { on: true });
  const timer = component(id, 'timer', 'timer-switch', 500, 230, { on: true });
  const bell = component(id, 'bell', 'bell', 720, 230);

  return {
    id,
    title: 'Timer-Controlled Bell',
    difficulty: 'Beginner',
    tier: 'basic',
    topic: 'Timed switching',
    summary: 'A simple timed control path feeding a bell or buzzer load.',
    teaches:
      'Timer switches behave like controlled switches in the live path. Select the timer in the Inspector to preview its family variants (weekly, staircase and countdown timers).',
    expected: 'Run the simulation: the bell energises while the timer switch is closed.',
    steps: [
      'Trace Live through the MCB and timer switch.',
      'Trace Neutral directly back to the bell.',
      'Toggle the timer switch to simulate the timed contact opening and closing.',
    ],
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, mcb, timer, bell],
      wires: [
        wire(id, 'live-mcb', live, 0, mcb, 0),
        wire(id, 'mcb-timer', mcb, 1, timer, 0),
        wire(id, 'timer-bell', timer, 1, bell, 0),
        wire(id, 'neutral-bell', neutral, 0, bell, 1),
      ],
    },
  };
}

function pushButtonDoorbellTemplate(): GuidedCircuitTemplate {
  const id = 'push-button-doorbell';
  const live = component(id, 'live', 'live-terminal', 110, 220);
  const neutral = component(id, 'neutral', 'neutral-terminal', 110, 420);
  const mcb = component(id, 'mcb', 'mcb', 300, 220, { on: true });
  const button = component(id, 'button', 'push-button', 510, 220, { on: false });
  const bell = component(id, 'bell', 'bell', 740, 220);

  return {
    id,
    title: 'Push-Button Doorbell',
    difficulty: 'Beginner',
    tier: 'basic',
    topic: 'Momentary switching',
    summary:
      'A protected bell circuit whose load energises only while its normally-open push button is held.',
    teaches:
      'A momentary push button closes the live path only during a press; Neutral returns directly to the bell.',
    expected:
      "Run the simulation, then press and hold the button's centre control. The bell pulses only while the control is held and stops when you release it; audio is not modelled.",
    steps: [
      'Trace Live through the MCB to L-in on the push button.',
      "Follow L-out to the bell's Live terminal, then trace the bell's Neutral terminal directly back to Neutral.",
      "Run the simulation. Press and hold the button's centre control with a pointer, or hold Space or Enter while it is focused; release it and compare the bell state.",
    ],
    faultPrompt:
      'Fault check: inject an open circuit on either bell conductor, then hold the button again. The bell stays off because the complete path is broken.',
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, mcb, button, bell],
      wires: [
        wire(id, 'live-mcb', live, 0, mcb, 0),
        wire(id, 'mcb-button', mcb, 1, button, 0),
        wire(id, 'button-bell', button, 1, bell, 0),
        wire(id, 'neutral-bell', neutral, 0, bell, 1),
      ],
    },
  };
}

function rcboProtectedSocketTemplate(): GuidedCircuitTemplate {
  const id = 'rcbo-protected-socket';
  const live = component(id, 'live', 'live-terminal', 100, 180);
  const neutral = component(id, 'neutral', 'neutral-terminal', 100, 360);
  const earth = component(id, 'earth', 'earth-terminal', 100, 540);
  const rcbo = component(id, 'rcbo', 'rcbo', 330, 260, { on: true });
  const socket = component(id, 'socket', 'socket-3pin', 600, 260);
  const testLamp = component(id, 'test-lamp', 'bulb', 850, 260);

  return {
    id,
    title: 'RCBO-Protected Socket',
    difficulty: 'Intermediate',
    tier: 'basic',
    topic: 'Combined circuit protection',
    summary:
      'A socket outlet supplied through an RCBO, with protective earth and a lamp representing a plugged-in appliance.',
    teaches:
      'An RCBO combines overcurrent and residual-current protection for one circuit. Earth-leakage and bolted-short faults trip it (educational thresholds), and its residual type (AC/A/F/B) decides whether smooth DC leakage trips it too.',
    expected:
      'Run the simulation: the test lamp energises while the RCBO is closed. Open the RCBO and both outgoing Live and Neutral paths are interrupted; Earth remains connected.',
    steps: [
      'Trace Live and Neutral into the RCBO at L-in and N-in.',
      "Follow L-out and N-out to the socket, and confirm Earth connects directly to the socket's E terminal rather than passing through the RCBO.",
      "Follow the socket's Live and Neutral connections to the test lamp. Run the simulation, then double-click the RCBO or toggle it in the Inspector to compare closed and open states.",
    ],
    faultPrompt:
      'Fault check: inject an open circuit on either outgoing RCBO conductor. The test lamp stays off because one required rail no longer reaches the load.',
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, earth, rcbo, socket, testLamp],
      wires: [
        wire(id, 'live-rcbo', live, 0, rcbo, 0),
        wire(id, 'neutral-rcbo', neutral, 0, rcbo, 1),
        wire(id, 'rcbo-socket-live', rcbo, 2, socket, 0),
        wire(id, 'rcbo-socket-neutral', rcbo, 3, socket, 1),
        wire(id, 'earth-socket', earth, 0, socket, 2),
        wire(id, 'socket-lamp-live', socket, 0, testLamp, 0),
        wire(id, 'socket-lamp-neutral', socket, 1, testLamp, 1),
      ],
    },
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Pro guided circuits — showcase the Pro toolbox added to the workbench:
   three-phase distribution, EV charging, solar & battery storage, smart
   control, AFDD/SPD protection, generator backup and heavy fixed loads.
   ────────────────────────────────────────────────────────────────────────── */

function threePhaseDolStarterTemplate(): GuidedCircuitTemplate {
  const id = 'pro-3phase-dol-starter';
  const live1 = component(id, 'live-1', 'live-terminal', 100, 140);
  const live2 = component(id, 'live-2', 'live-terminal', 100, 250);
  const live3 = component(id, 'live-3', 'live-terminal', 100, 360);
  const earth = component(id, 'earth', 'earth-terminal', 100, 480);
  const mcb1 = component(id, 'mcb-l1', 'mcb-type-d', 300, 140, { on: true });
  const mcb2 = component(id, 'mcb-l2', 'mcb-type-d', 300, 250, { on: true });
  const mcb3 = component(id, 'mcb-l3', 'mcb-type-d', 300, 360, { on: true });
  const contactor = component(id, 'contactor', 'contactor-3p', 560, 250, { on: true });
  const motor = component(id, 'motor', 'motor-3phase', 860, 250);

  return {
    id,
    title: 'Three-Phase DOL Motor Starter',
    difficulty: 'Advanced',
    tier: 'pro',
    topic: 'Three-phase industrial control',
    summary:
      'A direct-on-line starter: three phases feed a motor through per-phase Type-D breakers and a three-pole contactor, with a protective earth.',
    teaches:
      'Industrial motors run on three live phases. Each phase gets its own overcurrent protection, a contactor switches all three poles at once, and the frame is earthed separately.',
    expected:
      'Run the simulation: the 3-phase motor energises while all three breakers and the contactor are closed. Open any breaker or the contactor to stop it.',
    steps: [
      'Follow each live terminal (L1, L2, L3) through its own Type-D MCB into the contactor poles.',
      'Trace the three switched phases from the contactor to the motor windings U, V and W.',
      'Confirm the motor frame PE conductor runs to the earth terminal, then run the simulation and open one breaker to see the motor stop.',
    ],
    faultPrompt:
      'Fault check: inject a short circuit across one phase in the Fault Lab and compare the protection feedback with a healthy circuit.',
    circuit: {
      globalVoltage: 400,
      components: [live1, live2, live3, earth, mcb1, mcb2, mcb3, contactor, motor],
      wires: [
        wire(id, 'l1-mcb', live1, 0, mcb1, 0),
        wire(id, 'mcb1-contactor', mcb1, 1, contactor, 0),
        wire(id, 'contactor-motor-u', contactor, 3, motor, 0),
        wire(id, 'l2-mcb', live2, 0, mcb2, 0),
        wire(id, 'mcb2-contactor', mcb2, 1, contactor, 1),
        wire(id, 'contactor-motor-v', contactor, 4, motor, 1),
        wire(id, 'l3-mcb', live3, 0, mcb3, 0),
        wire(id, 'mcb3-contactor', mcb3, 1, contactor, 2),
        wire(id, 'contactor-motor-w', contactor, 5, motor, 2),
        wire(id, 'earth-motor', earth, 0, motor, 3),
      ],
    },
  };
}

function evChargerCircuitTemplate(): GuidedCircuitTemplate {
  const id = 'pro-ev-charger-circuit';
  const live = component(id, 'live', 'live-terminal', 100, 200);
  const neutral = component(id, 'neutral', 'neutral-terminal', 100, 350);
  const earth = component(id, 'earth', 'earth-terminal', 100, 500);
  const isolator = component(id, 'isolator', 'isolator-switch', 330, 260, { on: true });
  const rcbo = component(id, 'rcbo', 'rcbo', 570, 260, { on: true });
  const ev = component(id, 'ev', 'ev-charger', 820, 260);

  return {
    id,
    title: 'EV Charger Dedicated Circuit',
    difficulty: 'Advanced',
    tier: 'pro',
    topic: 'Heavy fixed loads and EV charging',
    summary:
      'A 7.4 kW EV charge point on its own dedicated circuit: rotary isolator, RCBO protection and a direct protective earth.',
    teaches:
      'EV chargers are high, sustained loads — they get a dedicated circuit with a local isolator for maintenance and combined RCD/overcurrent protection. Smooth DC leakage is why Type B RCDs are recommended for EVs.',
    expected:
      'Run the simulation: the charge point energises. Opening the isolator or the RCBO de-energises the charger while its earth stays connected.',
    steps: [
      'Trace Live and Neutral through the rotary isolator, then into the RCBO.',
      'Follow the RCBO outputs to the charger, and confirm the earth runs straight to the charger E terminal.',
      'Run the simulation and toggle the isolator — the whole charge point goes dead for safe maintenance.',
    ],
    faultPrompt:
      'Fault check: inject an earth fault on the charge point and watch the residual-current warning appear.',
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, earth, isolator, rcbo, ev],
      wires: [
        wire(id, 'live-isolator', live, 0, isolator, 0),
        wire(id, 'neutral-isolator', neutral, 0, isolator, 1),
        wire(id, 'isolator-rcbo-live', isolator, 2, rcbo, 0),
        wire(id, 'isolator-rcbo-neutral', isolator, 3, rcbo, 1),
        wire(id, 'rcbo-ev-live', rcbo, 2, ev, 0),
        wire(id, 'rcbo-ev-neutral', rcbo, 3, ev, 1),
        wire(id, 'earth-ev', earth, 0, ev, 2),
      ],
    },
  };
}

function solarDcSystemTemplate(): GuidedCircuitTemplate {
  const id = 'pro-solar-dc-system';
  const panel = component(id, 'panel', 'solar-pv-panel', 130, 200);
  const battery = component(id, 'battery', 'dc-battery-12v', 400, 420);
  const combiner = component(id, 'combiner', 'wago-connector', 430, 150);
  // A 12 V DC-rated LED so the low-voltage bus does not trip the
  // voltage-mismatch check.
  const led = component(id, 'led', 'led-downlight', 760, 150, {
    customMaxVolts: 12,
    customVoltage: 12,
  });

  return {
    id,
    title: 'Solar PV with Battery Storage',
    difficulty: 'Advanced',
    tier: 'pro',
    topic: 'Renewables and DC distribution',
    summary:
      'A small DC system: a PV array and a battery share a DC bus through a lever connector, feeding a low-voltage LED load.',
    teaches:
      'DC systems carry a positive and a negative rail. A combiner (here a Wago connector) joins the sources onto one bus, the battery both charges from and supports the panel, and every load still needs both rails.',
    expected:
      'Run the simulation: the LED energises from the shared DC bus. The battery and panel are both live sources in this educational model.',
    steps: [
      'Follow DC+ from the PV panel into the Wago combiner, then out to the LED and the battery positive.',
      'Trace DC- from the panel to the battery negative and on to the LED negative.',
      'Run the simulation and confirm the complete positive and negative loop energises the LED.',
    ],
    faultPrompt:
      'Fault check: open the battery positive in the Fault Lab. The LED keeps running from the panel — the bus stays live because the sources share it.',
    circuit: {
      globalVoltage: 12,
      components: [panel, battery, combiner, led],
      wires: [
        wire(id, 'panel-combiner', panel, 0, combiner, 0),
        wire(id, 'combiner-battery', combiner, 1, battery, 0),
        wire(id, 'combiner-led', combiner, 2, led, 0),
        wire(id, 'panel-battery-negative', panel, 1, battery, 1),
        wire(id, 'battery-led-negative', battery, 1, led, 1),
      ],
    },
  };
}

function underfloorHeatingTemplate(): GuidedCircuitTemplate {
  const id = 'pro-underfloor-heating';
  const live = component(id, 'live', 'live-terminal', 110, 220);
  const neutral = component(id, 'neutral', 'neutral-terminal', 110, 390);
  const mcb = component(id, 'mcb', 'mcb-type-c', 300, 220, { on: true });
  const thermostat = component(id, 'thermostat', 'heating-thermostat', 530, 250, { on: true });
  const heating = component(id, 'heating', 'underfloor-heating', 780, 250);

  return {
    id,
    title: 'Underfloor Heating Zone',
    difficulty: 'Advanced',
    tier: 'pro',
    topic: 'Thermostatic heating control',
    summary:
      'A dedicated heating circuit: Type-C MCB, an underfloor heating thermostat switching both poles, and the heating mat load.',
    teaches:
      'Fixed heating loads sit on dedicated circuits. A heating thermostat switches both live and neutral to the load, and Type-C breakers handle the element inrush.',
    expected:
      'Run the simulation: the heating mat energises while the MCB and thermostat are closed. Open the thermostat and both load poles go dead.',
    steps: [
      'Trace Live through the Type-C MCB into the thermostat L-in.',
      'Follow Neutral into the thermostat N-in, then Load-L and Load-N out to the heating mat.',
      'Run the simulation and toggle the thermostat to interrupt both poles of the load.',
    ],
    faultPrompt:
      'Fault check: inject a switched-neutral fault on the thermostat and compare which pole it interrupts.',
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, mcb, thermostat, heating],
      wires: [
        wire(id, 'live-mcb', live, 0, mcb, 0),
        wire(id, 'mcb-thermostat', mcb, 1, thermostat, 0),
        wire(id, 'neutral-thermostat', neutral, 0, thermostat, 1),
        wire(id, 'thermostat-heating-live', thermostat, 2, heating, 0),
        wire(id, 'thermostat-heating-neutral', thermostat, 3, heating, 1),
      ],
    },
  };
}

function staircaseTimerTemplate(): GuidedCircuitTemplate {
  const id = 'pro-staircase-timer';
  const live = component(id, 'live', 'live-terminal', 110, 220);
  const neutral = component(id, 'neutral', 'neutral-terminal', 110, 400);
  const mcb = component(id, 'mcb', 'mcb', 290, 220, { on: true });
  const timer = component(id, 'timer', 'staircase-timer', 500, 220, { on: true });
  const light = component(id, 'light', 'led-downlight', 730, 220);

  return {
    id,
    title: 'Staircase Time-Lag Lighting',
    difficulty: 'Advanced',
    tier: 'pro',
    topic: 'Energy-saving timed control',
    summary:
      'A staircase time-lag switch keeps the light on for a set period after activation, then switches it off automatically.',
    teaches:
      'Time-lag (staircase) timers are the energy-saving alternative to leaving landing lights on: one pulse of the button and the contact holds for the preset time.',
    expected:
      'Run the simulation: the light energises while the staircase timer contact is closed. Toggle the timer to see the timed contact open and close.',
    steps: [
      'Trace Live through the MCB into the staircase timer L-in.',
      'Follow L-out from the timer to the LED light, and Neutral directly back to the light.',
      'Run the simulation and toggle the timer contact to compare the timed on and off states.',
    ],
    faultPrompt:
      'Fault check: inject an open circuit on the timer output. The light stays off no matter how many times the timer is pulsed.',
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, mcb, timer, light],
      wires: [
        wire(id, 'live-mcb', live, 0, mcb, 0),
        wire(id, 'mcb-timer', mcb, 1, timer, 0),
        wire(id, 'timer-light', timer, 1, light, 0),
        wire(id, 'neutral-light', neutral, 0, light, 1),
      ],
    },
  };
}

function pirFloodlightTemplate(): GuidedCircuitTemplate {
  const id = 'pro-pir-floodlight';
  const live = component(id, 'live', 'live-terminal', 110, 220);
  const neutral = component(id, 'neutral', 'neutral-terminal', 110, 400);
  const mcb = component(id, 'mcb', 'mcb', 290, 220, { on: true });
  const pir = component(id, 'pir', 'pir-sensor', 500, 220, { on: true });
  const flood = component(id, 'flood', 'bulb-halogen', 740, 220);

  return {
    id,
    title: 'Motion-Activated Floodlight',
    difficulty: 'Advanced',
    tier: 'pro',
    topic: 'Smart security lighting',
    summary:
      'A PIR motion sensor switches a halogen floodlight, with the sensor powered across live and neutral so it can switch the load itself.',
    teaches:
      'Active sensors like PIRs need their own live and neutral supply, then switch the live feed out to the load when motion is detected. Neutral still returns directly to the load.',
    expected:
      'Run the simulation: the floodlight energises while the sensor contact is closed. Toggle the PIR to simulate detected and idle states.',
    steps: [
      'Trace Live through the MCB into the PIR L-in, and Neutral into the sensor N-in.',
      'Follow the switched L-out from the sensor to the floodlight, with the floodlight Neutral returning directly to the supply.',
      'Run the simulation and toggle the PIR contact to compare detected and idle states.',
    ],
    faultPrompt:
      'Fault check: inject an open circuit on the sensor supply neutral. The sensor loses its reference and the light will not switch.',
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, mcb, pir, flood],
      wires: [
        wire(id, 'live-mcb', live, 0, mcb, 0),
        wire(id, 'mcb-pir', mcb, 1, pir, 0),
        wire(id, 'neutral-pir', neutral, 0, pir, 1),
        wire(id, 'pir-flood', pir, 2, flood, 0),
        wire(id, 'neutral-flood', neutral, 0, flood, 1),
      ],
    },
  };
}

function cookerInductionTemplate(): GuidedCircuitTemplate {
  const id = 'pro-cooker-induction';
  const live = component(id, 'live', 'live-terminal', 110, 220);
  const neutral = component(id, 'neutral', 'neutral-terminal', 110, 400);
  const mcb = component(id, 'mcb', 'mcb', 300, 220, { on: true });
  const cooker = component(id, 'cooker', 'cooker-unit', 530, 250, { on: true });
  const hob = component(id, 'hob', 'induction-hob', 790, 250);

  return {
    id,
    title: 'Cooker & Induction Hob Supply',
    difficulty: 'Advanced',
    tier: 'pro',
    topic: 'High-power fixed appliances',
    summary: 'A cooker control unit feeds an induction hob from a dedicated protected circuit.',
    teaches:
      'Cookers are among the heaviest domestic loads: they get a dedicated circuit, a cooker control unit with its own isolation switch near the appliance, and appropriately sized conductors.',
    expected:
      'Run the simulation: the hob energises while the MCB and cooker unit are closed. Open the cooker unit to isolate the appliance.',
    steps: [
      'Trace Live through the MCB into the cooker control unit L-in.',
      'Follow Neutral into the cooker unit, then both switched poles out to the induction hob.',
      'Run the simulation and toggle the cooker unit to isolate the hob for cleaning or maintenance.',
    ],
    faultPrompt:
      'Fault check: inject a short circuit on the hob and watch the protection feedback light up the warning list.',
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, mcb, cooker, hob],
      wires: [
        wire(id, 'live-mcb', live, 0, mcb, 0),
        wire(id, 'mcb-cooker', mcb, 1, cooker, 0),
        wire(id, 'neutral-cooker', neutral, 0, cooker, 1),
        wire(id, 'cooker-hob-live', cooker, 2, hob, 0),
        wire(id, 'cooker-hob-neutral', cooker, 3, hob, 1),
      ],
    },
  };
}

function spdConsumerUnitTemplate(): GuidedCircuitTemplate {
  const id = 'pro-spd-consumer-unit';
  const live = component(id, 'live', 'live-terminal', 100, 170);
  const neutral = component(id, 'neutral', 'neutral-terminal', 100, 340);
  const earth = component(id, 'earth', 'earth-terminal', 100, 510);
  const spd = component(id, 'spd', 'spd', 330, 240);
  const board = component(id, 'board', 'distribution-board', 560, 240);
  const rcbo = component(id, 'rcbo', 'rcbo', 820, 200, { on: true });
  const socket = component(id, 'socket', 'double-socket', 1080, 200);
  const lamp = component(id, 'lamp', 'bulb', 1080, 380);

  return {
    id,
    title: 'Surge-Protected Consumer Unit',
    difficulty: 'Advanced',
    tier: 'pro',
    topic: 'Distribution boards and surge protection',
    summary:
      'The incoming supply lands on a Type 2 SPD before the distribution board; one outgoing way feeds an RCBO-protected socket branch with a test lamp.',
    teaches:
      'SPDs sit as close as possible to the origin of the installation to protect everything downstream from voltage surges, and each outgoing circuit from the board gets its own protection device.',
    expected:
      'Run the simulation: the test lamp energises through the SPD, the board and its RCBO. Earth is bonded to the SPD and the socket separately.',
    steps: [
      'Trace Live and Neutral into the SPD, and the earth bonding to its PE terminal.',
      'Follow the protected feeds into the distribution board, then pick out the outgoing way wired to the RCBO.',
      'Run the simulation and open the RCBO — only that one socket branch goes dead.',
    ],
    faultPrompt:
      'Fault check: inject an open circuit on the board way feeding the RCBO and compare which parts of the installation stay live.',
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, earth, spd, board, rcbo, socket, lamp],
      wires: [
        wire(id, 'live-spd', live, 0, spd, 0),
        wire(id, 'neutral-spd', neutral, 0, spd, 1),
        wire(id, 'earth-spd', earth, 0, spd, 2),
        wire(id, 'spd-board-live', spd, 0, board, 0),
        wire(id, 'spd-board-neutral', spd, 1, board, 1),
        wire(id, 'board-rcbo-live', board, 2, rcbo, 0),
        wire(id, 'board-rcbo-neutral', board, 5, rcbo, 1),
        wire(id, 'rcbo-socket-live', rcbo, 2, socket, 0),
        wire(id, 'rcbo-socket-neutral', rcbo, 3, socket, 1),
        wire(id, 'earth-socket', earth, 0, socket, 2),
        wire(id, 'socket-lamp-live', socket, 0, lamp, 0),
        wire(id, 'socket-lamp-neutral', socket, 1, lamp, 1),
      ],
    },
  };
}

function generatorBackupTemplate(): GuidedCircuitTemplate {
  const id = 'pro-generator-backup';
  const generator = component(id, 'generator', 'diesel-generator', 130, 230);
  const earthRod = component(id, 'rod', 'earth-rod', 130, 460);
  const mcb = component(id, 'mcb', 'mcb', 380, 230, { on: true });
  const light = component(id, 'light', 'led-downlight', 640, 130);
  const siren = component(id, 'siren', 'alarm-siren', 640, 340);

  return {
    id,
    title: 'Diesel Generator Backup Supply',
    difficulty: 'Advanced',
    tier: 'pro',
    topic: 'Standby generation and earthing',
    summary:
      'A standby diesel generator feeds an emergency circuit with an MCB, emergency lighting and an alarm siren, earthed through a dedicated rod.',
    teaches:
      'Backup generation supplies a local distribution system of its own. The generator frame is earthed to a rod (a TT-style local earth), and the emergency loads are protected by their own MCB.',
    expected:
      'Run the simulation: both the emergency light and the siren energise from the generator while its MCB is closed.',
    steps: [
      'Trace the generator Live through the MCB, then out to the light and the siren.',
      'Follow the Neutral return from both loads back to the generator N terminal.',
      'Confirm the generator PE conductor runs to the dedicated earth rod, then run the simulation.',
    ],
    faultPrompt:
      'Fault check: break the generator earth path and read the warning that appears — a generator without its local earth is unsafe to run.',
    circuit: {
      globalVoltage: 230,
      components: [generator, earthRod, mcb, light, siren],
      wires: [
        wire(id, 'generator-mcb', generator, 0, mcb, 0),
        wire(id, 'mcb-light', mcb, 1, light, 0),
        wire(id, 'mcb-siren', mcb, 1, siren, 0),
        wire(id, 'light-neutral', light, 1, generator, 1),
        wire(id, 'siren-neutral', siren, 1, generator, 1),
        wire(id, 'generator-earth', generator, 2, earthRod, 0),
      ],
    },
  };
}

function afddBedroomTemplate(): GuidedCircuitTemplate {
  const id = 'pro-afdd-bedroom';
  const live = component(id, 'live', 'live-terminal', 100, 200);
  const neutral = component(id, 'neutral', 'neutral-terminal', 100, 360);
  const earth = component(id, 'earth', 'earth-terminal', 100, 520);
  const afdd = component(id, 'afdd', 'afdd', 350, 260, { on: true });
  const socket = component(id, 'socket', 'double-socket', 640, 200);
  const light = component(id, 'light', 'led-downlight', 640, 360);

  return {
    id,
    title: 'AFDD-Protected Bedroom Circuit',
    difficulty: 'Advanced',
    tier: 'pro',
    topic: 'Arc fault detection',
    summary:
      'A bedroom final circuit protected by an AFDD-RCBO, feeding a socket and lighting point — BS 7671 421.1.7 practice for sleeping accommodation.',
    teaches:
      'AFDDs detect dangerous series and parallel arc faults that ordinary breakers miss. In bedrooms (and other higher-risk locations) the combined AFDD-RCBO gives arc, overload and residual protection in one device.',
    expected:
      'Run the simulation: both the socket branch and the light energise through the AFDD. Open the AFDD and the whole final circuit goes dead.',
    steps: [
      'Trace Live and Neutral into the AFDD at L-in and N-in.',
      'Follow L-out and N-out to the double socket, then the tapped feeds onward to the LED light.',
      'Confirm the socket earth runs directly to the earth terminal, then run the simulation and toggle the AFDD.',
    ],
    faultPrompt:
      'Fault check: inject a short circuit on the socket and watch the AFDD-RCBO flag the fault in the warning list.',
    circuit: {
      globalVoltage: 230,
      components: [live, neutral, earth, afdd, socket, light],
      wires: [
        wire(id, 'live-afdd', live, 0, afdd, 0),
        wire(id, 'neutral-afdd', neutral, 0, afdd, 1),
        wire(id, 'afdd-socket-live', afdd, 2, socket, 0),
        wire(id, 'afdd-socket-neutral', afdd, 3, socket, 1),
        wire(id, 'socket-light-live', socket, 0, light, 0),
        wire(id, 'socket-light-neutral', socket, 1, light, 1),
        wire(id, 'earth-socket', earth, 0, socket, 2),
      ],
    },
  };
}

export const GUIDED_CIRCUIT_TEMPLATES: GuidedCircuitTemplate[] = [
  simpleLampTemplate(),
  oneWaySwitchTemplate(),
  twoWaySwitchTemplate(),
  rcdFaultTemplate(),
  contactorMotorTemplate(),
  timerBellTemplate(),
  pushButtonDoorbellTemplate(),
  rcboProtectedSocketTemplate(),
  // Pro toolbox
  threePhaseDolStarterTemplate(),
  evChargerCircuitTemplate(),
  solarDcSystemTemplate(),
  underfloorHeatingTemplate(),
  staircaseTimerTemplate(),
  pirFloodlightTemplate(),
  cookerInductionTemplate(),
  spdConsumerUnitTemplate(),
  generatorBackupTemplate(),
  afddBedroomTemplate(),
];

export function getGuidedCircuitTemplate(id: string): GuidedCircuitTemplate | undefined {
  return GUIDED_CIRCUIT_TEMPLATES.find((template) => template.id === id);
}

export function cloneTemplateCircuit(template: GuidedCircuitTemplate): Circuit {
  return {
    components: template.circuit.components.map((component) => ({
      ...component,
      state: { ...component.state },
    })),
    wires: template.circuit.wires.map((wire) => ({
      ...wire,
      controlPoints: wire.controlPoints.map((point) => ({ ...point })),
    })),
    ...(template.circuit.globalVoltage !== undefined
      ? { globalVoltage: template.circuit.globalVoltage }
      : {}),
  };
}
