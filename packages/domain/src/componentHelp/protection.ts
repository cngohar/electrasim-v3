/**
 * Component help content — Protective devices (MCBs, MCCB, RCD/RCBO, SPD, fuse).
 *
 * Split verbatim from the former monolithic `componentHelp.ts`. Entries
 * are byte-identical; merge order in `./index.ts` preserves the original
 * registry ordering exactly.
 */

import type { ComponentHelpData } from './types';

export const PROTECTION_HELP: Record<string, ComponentHelpData> = {
  mcb: {
    learnMoreSlug: 'what-is-an-mcb-breaker',
    title: 'Miniature Circuit Breaker (MCB) - Type B',
    category: 'protection',
    voltage: '230V / 400V AC (50/60Hz)',
    amperage: '6A, 10A, 16A, 20A, 32A, 40A, 50A, 63A',
    breakingCapacity: '6kA / 10kA (BS EN 60898)',
    tripCurve: 'Type B (3–5× In instantaneous trip)',
    frequency: '50Hz / 60Hz',
    ipRating: 'IP20 (enclosure mounted)',
    cableSize: '1.5mm² – 25mm² copper',
    poles: '1 Pole (Single Phase)',
    standards: 'BS EN 60898-1 / IEC 60898-1 / BS 7671',
    overview:
      'Type B MCBs protect electrical final circuits against continuous overloads and low-level short circuits. They feature a precision thermal bimetallic strip for inverse-time overload protection and a magnetic coil for rapid short-circuit disconnection.',
    circuitBehavior:
      'Trips instantaneously within 0.1s when current reaches 3 to 5 times its rated current (In). Standard for domestic lighting, general socket outlets, and resistive domestic appliances.',
    keySpecs: [
      'Trip Factor: 3–5× In (Instantaneous electromagnetic trip)',
      'Breaking Capacity: 6,000A (6kA) standard / 10,000A (10kA) industrial',
      'Operating Voltage: 230V AC Single-Phase',
      'Endurance: 20,000 mechanical operations / 10,000 electrical operations',
    ],
    quickTips: [
      'Ideal for resistive domestic loads, domestic lighting, and standard BS 1363 socket rings.',
      'Always ensure downstream cable current-carrying capacity (Iz) exceeds breaker nominal rating (In).',
      'If nuisance tripping occurs upon starting inductive appliances, upgrade to Type C curve.',
    ],
    terminalPinout: [
      {
        terminal: '1 (Top)',
        role: 'live',
        description: 'Line input from consumer unit busbar / supply',
      },
      {
        terminal: '2 (Bottom)',
        role: 'live',
        description: 'Protected circuit line conductor feed to downstream load',
      },
    ],
    regulationClauses: [
      {
        standard: 'BS 7671:2018+A3:2024',
        clause: 'Regulation 433.1.1',
        title: 'Overload Protection Coordination',
        requirement:
          'The operating characteristics of the protective device must satisfy: Ib ≤ In ≤ Iz and I2 ≤ 1.45 × Iz.',
      },
      {
        standard: 'BS 7671:2018+A4:2026',
        clause: 'Table 41.3',
        title: 'Maximum Earth Fault Loop Impedance (Zs)',
        requirement:
          'For a 32A Type B MCB, maximum permitted Zs is 1.37 Ω (Cmin corrected) for 0.4s disconnection.',
      },
    ],
    realWorldApplications: [
      'Domestic socket ring final circuits (32A)',
      'Residential LED and incandescent lighting circuits (6A)',
      'Immersion water heaters (16A / 20A)',
      'Electric cooker and shower radial circuits (32A – 50A)',
    ],
  },

  'mcb-type-c': {
    learnMoreSlug: 'what-is-an-mcb-breaker',
    title: 'Miniature Circuit Breaker (MCB) - Type C',
    category: 'protection',
    voltage: '230V / 400V AC (50/60Hz)',
    amperage: '6A, 10A, 16A, 20A, 32A, 40A, 50A, 63A',
    breakingCapacity: '6kA / 10kA (BS EN 60898)',
    tripCurve: 'Type C (5–10× In instantaneous trip)',
    frequency: '50Hz / 60Hz',
    ipRating: 'IP20',
    cableSize: '1.5mm² – 25mm²',
    poles: '1 Pole / 3 Pole',
    standards: 'BS EN 60898-1 / IEC 60898-1',
    overview:
      'Type C MCBs are engineered for commercial and light industrial circuits with higher inductive inrush currents, such as fluorescent lighting banks, small electric motors, air conditioners, and step-down transformers.',
    circuitBehavior:
      'Trips instantaneously at 5 to 10 times rated current. This higher magnetic trip threshold prevents nuisance tripping during switch-on current spikes while providing reliable protection against true short circuits.',
    keySpecs: [
      'Trip Factor: 5–10× In (High Inrush Tolerance)',
      'Breaking Capacity: 6kA / 10kA',
      'Typical Uses: Motors, fluorescent luminaires, IT power supplies, HVAC units',
      'Max Disconnection Time: 0.4s (TN system)',
    ],
    quickTips: [
      'Specify Type C for circuits supplying air conditioning, water pumps, or multiple LED driver ballasts.',
      'Verify loop impedance (Zs) complies with maximum permitted values under BS 7671 for Type C breakers.',
    ],
  },

  'mcb-type-d': {
    learnMoreSlug: 'what-is-an-mcb-breaker',
    title: 'Miniature Circuit Breaker (MCB) - Type D',
    category: 'protection',
    voltage: '230V / 400V AC (50/60Hz)',
    amperage: '10A, 16A, 20A, 32A, 50A, 63A',
    breakingCapacity: '10kA / 15kA (IEC 60947-2)',
    tripCurve: 'Type D (10–20× In instantaneous trip)',
    frequency: '50Hz / 60Hz',
    ipRating: 'IP20',
    cableSize: '2.5mm² – 35mm²',
    poles: '1 Pole / 3 Pole',
    standards: 'BS EN 60898-1 / IEC 60947-2',
    overview:
      'Type D MCBs are heavy-duty protective devices built specifically for high magnetic inrush applications, including heavy 3-phase industrial induction motors, arc welders, X-ray machinery, and large power distribution transformers.',
    circuitBehavior:
      'Trips instantaneously only when fault current exceeds 10 to 20 times nominal rating, safely absorbing heavy transient start-up magnetization surges without opening.',
    keySpecs: [
      'Trip Factor: 10–20× In',
      'Breaking Capacity: 10kA to 15kA',
      'Applications: Industrial welders, large transformers, industrial machinery',
    ],
    quickTips: [
      'Only use Type D when equipment has extreme start-up surges.',
      'Ensure supply transformer and cable loop impedance (Zs) are low enough to deliver sufficient fault current to trigger the magnetic trip mechanism.',
    ],
  },

  mccb: {
    title: 'Moulded Case Circuit Breaker (MCCB)',
    category: 'protection',
    voltage: '415V / 690V AC (50/60Hz)',
    amperage: '100A, 160A, 250A, 400A, 630A, 800A',
    breakingCapacity: '25kA – 70kA (IEC 60947-2)',
    tripCurve: 'Adjustable Thermal & Magnetic Trip Settings',
    frequency: '50Hz / 60Hz',
    ipRating: 'IP40 front / IP20 terminals',
    cableSize: '35mm² – 240mm² or copper busbars',
    poles: '3 Pole / 4 Pole',
    standards: 'BS EN 60947-2 / IEC 60947-2',
    overview:
      'Moulded Case Circuit Breakers (MCCBs) provide industrial-grade circuit protection for main incoming supplies and high-power feeder circuits. They feature adjustable thermal overload (0.7–1.0× In) and magnetic short-circuit trip thresholds.',
    circuitBehavior:
      'Interrupts high fault currents up to 70kA safely inside an arc chute chamber. Equipped with an ergonomic rotary operating handle and remote shunt trip / undervoltage release capabilities.',
    keySpecs: [
      'Rated Current: 100A to 800A adjustable',
      'Breaking Capacity: 36kA – 70kA at 415V',
      'Adjustable Ir (Thermal) & Im (Magnetic) settings',
    ],
    quickTips: [
      'Used as the main incomer or feeder breaker for commercial distribution boards and motor control centres.',
      'Always torque terminal lug bolts to manufacturer specification (e.g. 15–25 Nm) using a calibrated torque wrench.',
    ],
  },

  rcd: {
    learnMoreSlug: 'what-is-an-rcd-and-why-do-you-need-one',
    title: 'Residual Current Device (RCD) - Double Pole',
    category: 'protection',
    voltage: '230V AC Single-Phase',
    amperage: '25A, 40A, 63A, 80A, 100A (Incomer rating)',
    breakingCapacity: '10kA conditional with upstream fuse/MCB',
    tripCurve: 'Residual current trip: 30mA (IΔn)',
    frequency: '50Hz',
    ipRating: 'IP20',
    cableSize: '1.5mm² – 25mm²',
    poles: '2 Pole (Live + Neutral)',
    standards: 'BS EN 61008-1 / BS 7671 Regulation 411.3.3',
    overview:
      'Residual Current Devices continuously monitor the magnetic vector sum of current flowing through the Live and Neutral conductors. If current leaks to Earth (e.g. damaged insulation or human electrocution contact), the toroidal core imbalance triggers an ultra-fast trip mechanism.',
    circuitBehavior:
      'Disconnects both Live and Neutral simultaneously in less than 40 milliseconds when earth leakage exceeds 30mA, preventing fatal electric shocks and mitigating electrical fire risks.',
    keySpecs: [
      'Sensitivity (IΔn): 30mA for personnel safety (additional protection)',
      'Trip Time: < 300ms at 1× IΔn, < 40ms at 5× IΔn',
      'Type: Type A (detects sinusoidal AC and pulsating DC residual currents)',
    ],
    quickTips: [
      'Both incoming Live AND Neutral conductors MUST pass through the RCD toroidal sensor.',
      'Press the yellow "TEST" button periodically (recommended every 6 months) to exercise the mechanical trip linkage.',
    ],
  },

  rcbo: {
    learnMoreSlug: 'what-is-an-rcbo-difference-between-rcd-mcb-rcbo',
    title: 'Residual Current Breaker with Overcurrent (RCBO)',
    category: 'protection',
    voltage: '230V AC Single-Phase',
    amperage: '6A, 10A, 16A, 20A, 32A, 40A, 45A',
    breakingCapacity: '6kA / 10kA (BS EN 61009-1)',
    tripCurve: 'Type B / Type C overcurrent curve + 30mA Earth leakage',
    frequency: '50Hz',
    ipRating: 'IP20',
    cableSize: '1.5mm² – 16mm²',
    poles: 'Single Module Width (Switched Live + Solid/Switched Neutral)',
    standards: 'BS EN 61009-1 / BS 7671 18th Edition',
    overview:
      'An RCBO integrates the dual functionality of an MCB (overload and short-circuit protection) and an RCD (earth leakage shock protection) into a compact single-module DIN-rail device.',
    circuitBehavior:
      'Provides dedicated, independent safety protection to an individual circuit. If a fault develops on one circuit, only that specific RCBO trips, preventing nuisance outages across other critical household circuits.',
    keySpecs: [
      'Dual Protection: Overcurrent (6A–45A) + Earth Leakage (30mA)',
      'Width: 1 DIN Module (18mm)',
      'Neutral Flylead: Dedicated neutral connection to consumer unit busbar',
    ],
    quickTips: [
      'Modern consumer unit standard: installing all-RCBO boards guarantees maximum circuit continuity.',
      'Connect the white functional earth (FE) lead and blue neutral flylead directly to the distribution board neutral/earth bars.',
    ],
  },

  spd: {
    learnMoreSlug: 'surge-protection-devices-spd-explained',
    title: 'Surge Protection Device (SPD) - Type 2',
    category: 'protection',
    voltage: '230V / 275V AC continuous (Uc)',
    amperage: 'Discharge Current: In = 20kA / Imax = 40kA',
    breakingCapacity: '25kA short circuit withstand',
    tripCurve: 'Voltage Clamping (Response Time < 25ns)',
    frequency: '50Hz / 60Hz',
    ipRating: 'IP20',
    cableSize: '4mm² – 16mm²',
    poles: '1P+N / 3P+N (Modular DIN rail)',
    standards: 'BS EN 61643-11 / BS 7671 Section 443 & 534',
    overview:
      'Surge Protection Devices protect sensitive electronics, home automation, and appliances against destructive overvoltage transient spikes generated by lightning strikes or high-voltage utility grid switching.',
    circuitBehavior:
      'High-energy Metal Oxide Varistors (MOVs) and gas discharge tubes remain high impedance during normal voltage. When a surge occurs, they transition to low impedance within nanoseconds, diverting massive surge currents safely to Earth.',
    keySpecs: [
      'Type: Type 2 Surge Arrester (Consumer unit sub-distribution protection)',
      'Max Discharge Current (Imax): 40kA per pole',
      'Voltage Protection Level (Up): < 1.3kV',
      'Visual Status: Green = Protected / Red = Replace Module Cartridge',
    ],
    quickTips: [
      'Connect in parallel with main supply incoming terminals.',
      'Keep the total connecting lead length (Live + Earth) strictly under 0.5 meters to prevent inductive voltage overshoot.',
    ],
  },

  fuse: {
    title: 'HRC Cartridge Fuse (BS 88 / BS 1362)',
    category: 'protection',
    voltage: '240V / 415V AC',
    amperage: '3A, 5A, 13A (Plug) / 16A–100A (BS 88 Industrial)',
    breakingCapacity: '80kA at 415V (High Rupturing Capacity)',
    tripCurve: 'Thermal fusible element melting curve',
    frequency: '50Hz / 60Hz / DC',
    ipRating: 'IP20 (in carrier)',
    cableSize: '1.5mm² – 35mm²',
    poles: '1 Pole',
    standards: 'BS 1362 / BS 88-2 / IEC 60269',
    overview:
      'High Rupturing Capacity (HRC) fuses contain an engineered silver or copper fusible element surrounded by quartz silica sand inside a high-strength ceramic barrel, providing exceptional short-circuit fault interruption capability.',
    circuitBehavior:
      'When high fault current flows, the element melts and vaporizes. The quartz sand quenches the electric arc and fuses into non-conductive fulgurite glass within milliseconds, breaking faults up to 80,000 Amps safely.',
    keySpecs: [
      'Breaking Capacity: Up to 80kA (80,000 Amps)',
      'Material: Ceramic body with silver-plated copper end-caps and quartz sand filling',
    ],
    quickTips: [
      'Always replace blown fuses with exact specified amperage and voltage ratings.',
      'Ensure fuse clips maintain firm mechanical contact tension to prevent overheating from contact resistance.',
    ],
  },
};
