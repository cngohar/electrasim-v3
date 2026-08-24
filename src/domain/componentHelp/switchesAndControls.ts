/**
 * Component help content — Switches, dimmers and sensor/controls.
 *
 * Split verbatim from the former monolithic `componentHelp.ts`. Entries
 * are byte-identical; merge order in `./index.ts` preserves the original
 * registry ordering exactly.
 */

import type { ComponentHelpData } from './types';

export const SWITCH_AND_CONTROL_HELP: Record<string, ComponentHelpData> = {
  'single-way-switch': {
    title: 'Single-Way Wall Switch (10AX)',
    category: 'switch',
    voltage: '230V AC (50Hz)',
    amperage: '10AX (Inductive/Fluorescent) / 16A (Resistive)',
    powerWatts: 2300,
    frequency: '50Hz',
    ipRating: 'IP20 (Indoor) / IP66 with weatherproof enclosure',
    cableSize: '1.0mm² – 2.5mm²',
    poles: '1 Pole (Live switching)',
    standards: 'BS EN 60669-1 / BS 7671',
    overview:
      'A standard single-pole single-throw (SPST) rocker switch designed for controlling a lighting circuit or small appliance from a single fixed location.',
    circuitBehavior:
      'When ON, connects the incoming Live rail (L-in) to the switched Live output (L-out). When OFF, creates an air-gap isolation on the Live line.',
    keySpecs: [
      'Rating: 10AX (Fluorescent & LED inductive inrush rated)',
      'Terminals: COM (Live In) and L1 (Switched Live Out)',
      'Contact Gap: Micro-gap standard (≥ 3mm)',
    ],
    quickTips: [
      'Always switch the LIVE conductor — never switch the Neutral conductor.',
      'Earth wire must be sleeved green/yellow and bonded to the metal back box and faceplate earth terminal.',
    ],
  },

  'two-way-switch': {
    learnMoreSlug: 'how-to-wire-a-two-way-switch-complete-guide',
    title: 'Two-Way Changeover Switch (SPDT 10AX)',
    category: 'switch',
    voltage: '230V AC (50Hz)',
    amperage: '10AX',
    powerWatts: 2300,
    frequency: '50Hz',
    ipRating: 'IP20',
    cableSize: '1.0mm² – 2.5mm²',
    poles: '1 Pole 2-Way (Single Pole Double Throw)',
    standards: 'BS EN 60669-1',
    overview:
      'Single-pole double-throw switch featuring a Common terminal (COM) and two strapper terminals (L1 and L2). Used in pairs to control a single light or circuit from two different locations (such as the top and bottom of a staircase or opposite ends of a hallway).',
    circuitBehavior:
      'Flipping either switch alternates the internal connection between COM and L1 or L2, making or breaking circuit continuity between the two switch locations.',
    keySpecs: [
      'Terminals: COM, L1 (Strapper 1), L2 (Strapper 2)',
      'Rating: 10AX 230V AC',
      'Cable: 3-Core & Earth (Brown, Black with brown sleeve, Grey with blue/brown sleeve)',
    ],
    quickTips: [
      'Connect permanent Live to COM on the first switch, and the switched Live to the lamp from COM on the second switch.',
      'Connect L1-to-L1 and L2-to-L2 using strapper conductors between both switch boxes.',
    ],
  },

  'intermediate-switch': {
    learnMoreSlug: 'intermediate-switch-wiring-three-way-light-switch',
    title: 'Intermediate Crossover Switch (4-Terminal)',
    category: 'switch',
    voltage: '230V AC (50Hz)',
    amperage: '10AX',
    powerWatts: 2300,
    frequency: '50Hz',
    ipRating: 'IP20',
    cableSize: '1.0mm² – 2.5mm²',
    poles: '4-Terminal Double Pole Crossover',
    standards: 'BS EN 60669-1',
    overview:
      'A 4-terminal crossover switch inserted between two 2-way switches. Enables seamless lighting control from 3, 4, or more separate locations (e.g. multi-landing stairwells, large corridors, open-plan rooms).',
    circuitBehavior:
      'In Position 1, connects L1-in to L1-out and L2-in to L2-out. In Position 2, crosses them over (L1-in to L2-out and L2-in to L1-out), reversing the strapper pair status.',
    keySpecs: ['Terminals: L1-in, L2-in, L1-out, L2-out', 'Rating: 10AX 250V AC'],
    quickTips: [
      'Position intermediate switches strictly between two 2-way switches on the strapper line.',
      'You can add as many intermediate switches as needed for N-point lighting control.',
    ],
  },

  'double-pole-switch': {
    title: 'Double-Pole Isolator Switch (20A / 45A)',
    category: 'switch',
    voltage: '230V / 240V AC',
    amperage: '20A (Water Heaters) / 45A (Cookers)',
    powerWatts: 4600,
    frequency: '50Hz',
    ipRating: 'IP20',
    cableSize: '2.5mm² – 10.0mm²',
    poles: '2 Pole (Live and Neutral Simultaneous Isolation)',
    standards: 'BS EN 60669-2-4 / BS 7671 Regulation 537.2',
    overview:
      'Heavy-duty switch that physically breaks both the Live AND Neutral lines simultaneously, ensuring complete electrical isolation for heavy appliances like water heaters, showers, and air conditioners.',
    circuitBehavior:
      'Features a contact gap ≥ 3mm across both poles with an integrated neon power indicator lamp showing when the downstream load is energized.',
    keySpecs: [
      'Rating: 20A (4.6kW) or 45A (10.3kW)',
      'Dual Contact Break: Isolates Live and Neutral together',
      'Neon Power Indicator: Shows live output state',
    ],
    quickTips: [
      'Mandatory for fixed appliances located near water or requiring safe maintenance isolation.',
      'Check cable clamp screws are tightened to prevent loose connections on heavy current loads.',
    ],
  },

  'dimmer-switch': {
    learnMoreSlug: 'how-a-dimmer-switch-works-trailing-edge-leading-edge',
    title: 'Rotary Phase-Cut LED Dimmer Switch',
    category: 'switch',
    voltage: '230V AC (50Hz)',
    amperage: '0.1A – 1.1A',
    powerWatts: '5W – 250W LED / 400W Halogen',
    frequency: '50Hz',
    ipRating: 'IP20',
    cableSize: '1.0mm² – 2.5mm²',
    poles: '1 Pole Push-On / Push-Off + Rotary Dim',
    standards: 'BS EN 60669-2-1 / EMC Directive',
    overview:
      'Advanced digital trailing-edge / leading-edge phase-cut dimmer module engineered for smooth, flicker-free dimming of dimmable LED lamps, downlights, and incandescent fixtures.',
    circuitBehavior:
      'Electronic MOSFET/TRIAC switches chop the AC sine wave at selectable phase angles, reducing RMS voltage and thermal power delivered to the lamp.',
    keySpecs: [
      'Dimming Technology: Trailing Edge (Optimized for LED drivers)',
      'Min Load: 5W / Max Load: 250W LED',
      'Push On/Off with smooth rotary dial control',
    ],
    quickTips: [
      'Verify connected light bulbs are explicitly certified as "DIMMABLE".',
      'Do not connect non-dimmable ballasts, CFLs, or fluorescent tubes.',
    ],
  },

  'pir-sensor': {
    learnMoreSlug: 'how-to-wire-a-pir-motion-sensor-light-switch',
    title: 'PIR Infrared Motion Sensor (360° Ceiling Mount)',
    category: 'switch',
    voltage: '220V – 240V AC',
    amperage: 'Switching Relay: 10A (Resistive) / 3A (LED)',
    powerWatts: 1200,
    frequency: '50/60Hz',
    ipRating: 'IP20 (Indoor) / IP65 (Outdoor options)',
    cableSize: '1.0mm² – 2.5mm²',
    poles: 'Live In, Neutral In, Switched Live Out',
    standards: 'BS EN 60669-2-1 / CE / RoHS',
    overview:
      'Passive Infrared (PIR) occupancy detector that senses moving human thermal infrared signatures across a 360° detection zone to automatically trigger lighting.',
    circuitBehavior:
      'Internal pyroelectric sensor and Fresnel lens trigger a solid-state relay when motion is detected. Built-in adjustable dials set hold-time (10s–15min) and ambient lux threshold (3–2000 lux).',
    keySpecs: [
      'Detection Range: 360° cone / 6m – 8m radius at 2.8m mounting height',
      'Adjustable Time Delay: 10 seconds to 15 minutes',
      'Lux Sensor: 3 Lux (Night only) to 2000 Lux (Daylight operation)',
    ],
    quickTips: [
      'Requires continuous Live and Neutral supply to power the internal sensor electronics.',
      'Avoid placing directly above heating radiators or in direct air conditioner airflow.',
    ],
  },

  'cooker-unit': {
    learnMoreSlug: 'how-to-wire-a-cooker-electric-oven-uk',
    title: 'Cooker Control Unit (45A DP + 13A Socket)',
    category: 'switch',
    voltage: '230V AC (50Hz)',
    amperage: '45A (Cooker Switch) + 13A (Auxiliary Socket)',
    powerWatts: 10350,
    frequency: '50Hz',
    ipRating: 'IP20',
    cableSize: '6.0mm² – 10.0mm²',
    poles: 'Double Pole 45A Isolator',
    standards: 'BS 4177 / BS 7671',
    overview:
      'High-capacity kitchen control unit providing a 45A double-pole master switch for electric ovens/hobs alongside an independent switched 13A 3-pin socket outlet.',
    circuitBehavior:
      'Controls high power cookers up to 10.3kW on a dedicated radial circuit from the consumer unit (typically protected by a 32A or 40A MCB).',
    keySpecs: [
      'Cooker Switch: 45A Double Pole with neon indicator',
      'Socket: 13A BS 1363 single switched outlet with neon indicator',
      'Cable: 6mm² or 10mm² Twin & Earth',
    ],
    quickTips: [
      'Must be located within 2 meters of the cooker, but not directly above the hot cooking surface.',
      'Always use appropriate 6mm² or 10mm² cable sized for diversity calculations under BS 7671.',
    ],
  },
};
