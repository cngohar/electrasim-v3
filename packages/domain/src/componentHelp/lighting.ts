/**
 * Component help content — Lamps & luminaires.
 *
 * Split verbatim from the former monolithic `componentHelp.ts`. Entries
 * are byte-identical; merge order in `./index.ts` preserves the original
 * registry ordering exactly.
 */

import type { ComponentHelpData } from './types';

export const LIGHTING_HELP: Record<string, ComponentHelpData> = {
  bulb: {
    title: 'High-Efficiency LED Filament Lamp',
    category: 'lighting',
    voltage: '220V – 240V AC (50/60Hz)',
    amperage: '0.04A (at 9W)',
    powerWatts: 9,
    frequency: '50Hz',
    ipRating: 'IP20 (E27 / B22 Base)',
    cableSize: '1.0mm² – 1.5mm²',
    poles: 'Live + Neutral',
    standards: 'BS EN 62560 / Energy Class A+',
    overview:
      'Solid-state LED lighting fixture utilizing micro-LED chip-on-glass filament strings to produce high luminous efficacy (800 lumens at only 9W) with warm 2700K or daylight 4000K illumination.',
    circuitBehavior:
      'Built-in constant-current electronic driver rectifies AC mains to DC. High power factor (~0.90) and low operating temperature.',
    keySpecs: [
      'Power: 9W (Replaces 60W incandescent)',
      'Luminous Flux: 806 Lumens (~90 lm/W)',
      'Lifespan: 25,000 Hours (L70)',
      'Colour Temperature: 2700K Warm White',
    ],
    quickTips: [
      'Reduces lighting electrical energy consumption by up to 85% compared to incandescent bulbs.',
      'Always turn off circuit power before changing or replacing light bulbs.',
    ],
  },

  'bulb-incandescent': {
    title: 'Incandescent Tungsten Filament Lamp',
    category: 'lighting',
    voltage: '230V AC',
    amperage: '0.26A (at 60W)',
    powerWatts: 60,
    frequency: '50Hz / 60Hz / DC',
    ipRating: 'IP20',
    cableSize: '1.0mm² – 1.5mm²',
    poles: 'Live + Neutral',
    standards: 'IEC 60064',
    overview:
      'Traditional incandescent lamp producing light by passing electric current through a tungsten filament enclosed in a vacuum or inert gas glass bulb, heating it to ~2500°C.',
    circuitBehavior:
      'Acts as a pure resistive load with Unity Power Factor (1.00). Cold filament has very low resistance, drawing a brief inrush current (up to 10× normal operating current) upon initial switch-on.',
    keySpecs: [
      'Power: 60W / 100W',
      'Power Factor: 1.00 (Pure Resistive)',
      'Efficacy: ~12 lm/W (Converts 95% of energy into heat)',
    ],
    quickTips: [
      'Compatible with all types of leading-edge and trailing-edge dimmer switches.',
      'Operates at high surface temperatures — allow bulb to cool before handling.',
    ],
  },

  'bulb-cfl': {
    title: 'Compact Fluorescent Lamp (CFL Spiral)',
    category: 'lighting',
    voltage: '230V AC (50Hz)',
    amperage: '0.08A (at 15W)',
    powerWatts: 15,
    frequency: '50Hz',
    ipRating: 'IP20',
    cableSize: '1.0mm² – 1.5mm²',
    poles: 'Live + Neutral',
    standards: 'BS EN 60968',
    overview:
      'Compact fluorescent lamp utilizing an integrated electronic ballast to ionize low-pressure mercury vapor, producing UV radiation that excites a phosphor coating inside the glass spiral tube.',
    circuitBehavior:
      'Draws non-linear current spikes with moderate power factor (~0.60–0.85). Exhibits a warm-up period of 30–60 seconds to reach full luminous output.',
    keySpecs: [
      'Power: 15W (75W incandescent equivalent)',
      'Luminous Efficacy: ~60 lm/W',
      'Lifespan: 8,000 – 10,000 Hours',
    ],
    quickTips: [
      'Do not use with standard wall dimmers unless explicitly labeled "Dimmable CFL".',
      'Contains trace mercury — must be recycled at authorized waste facilities.',
    ],
  },

  'bulb-smart-rgb': {
    title: 'Smart RGB+CCT Wi-Fi / Zigbee LED Lamp',
    category: 'lighting',
    voltage: '220V – 240V AC (50/60Hz)',
    amperage: '0.045A (at 10W)',
    powerWatts: 10,
    frequency: '50Hz / 60Hz',
    ipRating: 'IP20',
    cableSize: '1.0mm² – 1.5mm²',
    poles: 'Live + Neutral',
    standards: 'BS EN 62560 / RED Directive (Radio Equipment)',
    overview:
      'Smart solid-state luminaire containing a micro-controller, 2.4GHz wireless transceiver, and addressable multichannel Red, Green, Blue, Warm White, and Cold White (RGB+CCT) LED arrays.',
    circuitBehavior:
      'Draws ~0.5W standby power when turned off via app. Internal PWM driver precisely regulates color channels and brightness from 1% to 100%.',
    keySpecs: [
      'Power: 10W (800 Lumens)',
      'Colors: 16 Million RGB Colors + 2200K–6500K Tunable White',
      'Wireless: Wi-Fi 802.11 b/g/n (2.4GHz) / Zigbee 3.0 / Matter',
    ],
    quickTips: [
      'Requires continuous Live power supply — do not switch off physical wall switch if automating via smart home.',
      'Ensure reliable Wi-Fi / Zigbee mesh gateway coverage.',
    ],
  },

  'led-downlight': {
    title: 'Recessed Fire-Rated LED Ceiling Downlight (IP65)',
    category: 'lighting',
    voltage: '230V AC',
    amperage: '0.035A (at 8W)',
    powerWatts: 8,
    frequency: '50Hz',
    ipRating: 'IP65 (Front face / Bathroom Zone 1 compliant)',
    cableSize: '1.0mm² – 1.5mm²',
    poles: 'Live, Neutral, Earth with Loop-in Terminals',
    standards: 'BS EN 60598-2-2 / BS 476 Part 21 (30, 60, 90 min fire rating)',
    overview:
      'Recessed architectural ceiling downlight featuring an integrated constant-current LED driver, intumescent fire-resistant acoustic seal, and IP65 waterproof front bezel.',
    circuitBehavior:
      'Provides high lumen output (700 lm) with focused 38°/60° beam angle. Intumescent material expands under high heat to seal ceiling penetrations and prevent fire spread.',
    keySpecs: [
      'Power: 8W (700 Lumens)',
      'Fire Rating: 30, 60, 90 minutes certified (BS 476)',
      'Waterproof: IP65 suitable for bathroom zones and showers',
    ],
    quickTips: [
      'Mandatory to use fire-rated fittings in ceilings under inhabited living spaces.',
      'Loop-in push-fit terminals allow fast daisy-chain wiring from luminaire to luminaire.',
    ],
  },

  'tube-light': {
    title: 'LED T8 Batten Luminaire (1200mm / 4ft)',
    category: 'lighting',
    voltage: '220V – 240V AC',
    amperage: '0.08A (at 18W)',
    powerWatts: 18,
    frequency: '50Hz',
    ipRating: 'IP20 / IP65 weatherproof options',
    cableSize: '1.0mm² – 1.5mm²',
    poles: 'Live, Neutral, Earth',
    standards: 'BS EN 60598-1 / BS EN 62776',
    overview:
      'High-output linear T8 LED luminaire engineered for workshops, garages, commercial corridors, and utility rooms, replacing traditional fluorescent tubes without ballast hum.',
    circuitBehavior:
      'Direct mains single-ended or double-ended connection. Delivers instant full brightness with 120 lm/W efficiency and no stroboscopic flicker.',
    keySpecs: [
      'Power: 18W (Replaces 36W fluorescent tube)',
      'Lumen Output: 2,160 Lumens (Daylight 6000K)',
      'Beam Angle: 160° Wide Diffused',
    ],
    quickTips: [
      'Bypass old magnetic or electronic ballasts when converting older fluorescent fixtures to direct LED T8.',
      'Ensure the metal chassis is solidly grounded to Earth.',
    ],
  },
};
