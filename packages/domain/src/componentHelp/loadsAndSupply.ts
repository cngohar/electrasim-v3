/**
 * Component help content — Loads, supply and distribution gear.
 *
 * Split verbatim from the former monolithic `componentHelp.ts`. Entries
 * are byte-identical; merge order in `./index.ts` preserves the original
 * registry ordering exactly.
 */

import type { ComponentHelpData } from './types';

export const LOAD_AND_SUPPLY_HELP: Record<string, ComponentHelpData> = {
  'ac-three-phase-supply': {
    title: 'Three-phase AC Supply',
    category: 'supply',
    voltage: 'Configured RMS L-N; L-L = √3 × L-N',
    amperage: 'Ideal source; source current limit is unassessed',
    frequency: 'Explicit source frequency',
    ipRating: 'Not modeled',
    cableSize: 'Use each conductor’s declared properties',
    poles: 'L1, L2, L3, N, PE',
    standards: 'Resistive phasor teaching model; installation compliance is unassessed',
    overview:
      'An independent source with three live terminals separated by 120°. The saved ABC or ACB sequence defines their order.',
    circuitBehavior:
      'Solves complex RMS voltages, branch currents, active power and conductor losses for resistive star, delta and static contact networks. Neutral current is a vector sum.',
    keySpecs: [
      'Default 230 V L-N / 398.37 V L-L, 50 Hz, ABC',
      'PE stays separate from neutral until explicitly wired',
      'Motor operation, automatic trips, damage and reactive/transient behavior are unassessed',
    ],
    quickTips: [
      'Use Edit supply to preview voltage, frequency or sequence changes.',
      'Enter 400 V in the L-L input for a 400 V line-to-line source.',
      'Independent sources have no implied synchronization; connecting their systems is unsupported.',
    ],
  },
  'electric-shower': {
    learnMoreSlug: 'how-to-wire-an-electric-shower-cable-size-mcb-guide',
    title: 'Instantaneous Electric Shower (8.5kW)',
    category: 'load',
    voltage: '230V AC Single-Phase',
    amperage: '37.0A (max rating)',
    powerWatts: 8500,
    frequency: '50Hz',
    ipRating: 'IPX4 (bathroom splash zone)',
    cableSize: '10mm² dedicated cable',
    poles: 'Live, Neutral, Earth',
    standards: 'BS 7671 · BS EN 60335-2-35',
    overview:
      'Instantaneous electric shower that heats mains water at the point of use. A high-power fixed load that always needs a dedicated, RCD-protected high-current circuit.',
    circuitBehavior:
      'Draws up to 37A at full power (8.5kW / 230V). In-rush is resistive and stable, but the sustained high current demands a correctly sized 32-40A MCB and 10mm² cable.',
    keySpecs: [
      'Power: 8,500W (8.5kW)',
      'Current: up to 37A at 230V AC',
      'Must be on a dedicated circuit (never a shared ring)',
    ],
    quickTips: [
      'Requires a dedicated 32A or 40A MCB/RCBO with 30mA RCD protection.',
      'Fit a double-pole isolation switch (pull-cord or flush) within easy reach.',
      'Use 10mm² cable and verify Ze / Zs meet disconnection times.',
    ],
  },
  'immersion-heater': {
    learnMoreSlug: 'how-to-wire-an-immersion-heater-cylinder',
    title: 'Hot-Water Immersion Heater (3kW)',
    category: 'load',
    voltage: '230V AC Single-Phase',
    amperage: '13.0A continuous',
    powerWatts: 3000,
    frequency: '50Hz',
    ipRating: 'IPX4',
    cableSize: '2.5mm² heat-resistant',
    poles: 'Live, Neutral, Earth',
    standards: 'BS EN 60335-2-21 / BS 7671',
    overview:
      'Immersion heating element for domestic hot-water cylinders, wired on its own circuit with double-pole isolation.',
    circuitBehavior:
      'Continuous resistive load (PF=1.00) of 13A until the thermostat reaches the set temperature.',
    keySpecs: ['Power: 3,000W', 'Current: 13A at 230V', 'Dual-pole thermostat + thermal cut-out'],
    quickTips: [
      'Use a dedicated 16A radial circuit.',
      'Fit a 20A double-pole isolator with neon indicator nearby.',
    ],
  },
  'kwh-meter': {
    title: 'Electricity Meter (kWh)',
    category: 'supply',
    voltage: '230V AC (single-phase)',
    amperage: '100A max',
    frequency: '50Hz',
    ipRating: 'IP54 (utility box)',
    cableSize: 'Utility-supplied tails',
    poles: 'Live in/out, Neutral in/out',
    standards: 'BS EN 50470 · MID (Measuring Instruments Directive)',
    overview:
      'The incoming energy meter that sits between the utility supply and the consumer unit. A pass-through measuring point, not a protective device.',
    circuitBehavior:
      'Passes supply through while measuring energy. It does not trip or isolate — protection happens downstream in the consumer unit.',
    keySpecs: [
      'Registers active energy in kWh',
      'Pass-through (no interruption of supply)',
      'Located on the supply side of the consumer unit',
    ],
    quickTips: [
      'Model the meter between the supply terminals and the main switch.',
      'It is a junction/pass-through, not an isolator.',
    ],
  },
  'water-heater': {
    title: 'Storage Water Heater / Immersion Element (3kW)',
    category: 'load',
    voltage: '230V AC Single-Phase',
    amperage: '13.0A continuous',
    powerWatts: 3000,
    frequency: '50Hz',
    ipRating: 'IPX4 (Splash-proof immersion head)',
    cableSize: '2.5mm² heat-resistant flexible cable',
    poles: 'Live, Neutral, Earth',
    standards: 'BS EN 60335-2-21 / BS 7671',
    overview:
      'Heavy-duty electric immersion heating element sealed inside a domestic or commercial hot water storage cylinder, regulated by an adjustable dual-safety rod thermostat.',
    circuitBehavior:
      'Draws continuous 13.0A resistive load (Power Factor = 1.00). High thermal energy transfers directly into water until target temperature (60°C–65°C) is reached.',
    keySpecs: [
      'Power: 3,000W (3.0kW)',
      'Current: 13.0A at 230V AC',
      'Thermostat: Dual-pole temperature regulator + manual reset safety thermal cut-out (95°C)',
    ],
    quickTips: [
      'Must be wired on a dedicated radial circuit protected by a 16A or 20A MCB.',
      'Must have a dedicated 20A Double Pole isolator switch with neon indicator located nearby.',
    ],
  },

  'ev-charger': {
    learnMoreSlug: 'how-to-install-an-ev-charger-dedicated-circuit-guide',
    title: 'Electric Vehicle Wallbox Charger (7.4kW Mode 3)',
    category: 'load',
    voltage: '230V AC Single-Phase (50Hz)',
    amperage: '32.0A continuous',
    powerWatts: 7360,
    breakingCapacity: 'Type A 30mA + 6mA DC leakage protection integrated',
    frequency: '50Hz',
    ipRating: 'IP65 (Outdoor weatherproof)',
    cableSize: '6.0mm² or 10.0mm² copper radial',
    poles: 'Live, Neutral, Earth (with PEN loss detection)',
    standards: 'BS 7671 Section 722 / IEC 61851-1 / IET EV Code of Practice',
    overview:
      'Dedicated AC Level 2 / Mode 3 fast EV charging wallbox station providing pilot communication and continuous 32A power delivery for electric vehicle battery charging.',
    circuitBehavior:
      'Draws continuous maximum current (32A = 7.36kW) for extended 4–8 hour durations. Control pilot wire negotiates charging state, interlocking the internal contactor until connector is securely latched.',
    keySpecs: [
      'Output Rating: 32A 230V Single-Phase (7.36kW)',
      'Safety: Built-in 6mA DC fault current sensor + automatic PEN fault conductor monitor',
      'Connector: Type 2 (IEC 62196) with motorized solenoid lock',
    ],
    quickTips: [
      'Must be supplied from a dedicated radial circuit protected by a 40A Type B or C MCB/RCBO.',
      'Verify earthing meets BS 7671 Section 722 guidelines (open-PEN disconnect device or independent TT earth rod).',
    ],
  },

  motor: {
    title: 'Single-Phase AC Induction Motor (1.5kW / 2HP)',
    category: 'motor',
    voltage: '230V AC (50Hz)',
    amperage: '8.5A Full Load Current (FLA) / 45A Starting Inrush',
    powerWatts: 1500,
    frequency: '50Hz',
    ipRating: 'IP55 (Dust & water jet protected)',
    cableSize: '2.5mm² – 4.0mm²',
    poles: 'Live, Neutral, Earth + Start Capacitor',
    standards: 'BS EN 60034-1 / IEC 60034',
    overview:
      'Single-phase capacitor-start capacitor-run asynchronous squirrel-cage induction motor engineered for workshops, compressors, conveyor belts, and ventilation machinery.',
    circuitBehavior:
      'Draws 5 to 7 times full-load current upon startup until centrifugal switch disengages the start capacitor. Operates with an inductive lagging power factor (~0.82).',
    keySpecs: [
      'Rated Output: 1.5kW (2.0 Horsepower)',
      'Speed: 2850 RPM (2-Pole) / 1425 RPM (4-Pole)',
      'Starting Torque: 220% full load torque',
    ],
    quickTips: [
      'Protect with a Type C MCB to absorb motor starting inrush surges without tripping.',
      'Fit an adjustable thermal overload relay matched to motor nameplate full load current.',
    ],
  },

  'solar-pv-panel': {
    title: 'Monocrystalline Solar PV Array (400W Tier-1)',
    category: 'supply',
    voltage: '37.2V Vmp / 44.8V Voc (DC)',
    amperage: '10.8A Imp / 11.4A Isc (DC)',
    powerWatts: 400,
    ipRating: 'IP68 (Junction box with MC4 connectors)',
    cableSize: '4.0mm² or 6.0mm² solar DC double-insulated cable',
    poles: 'DC Positive (+) & DC Negative (-)',
    standards: 'IEC 61215 / IEC 61730 / BS 7671 Section 712',
    overview:
      'High-efficiency monocrystalline silicon photovoltaic solar module converting ambient solar irradiance into direct current (DC) electricity.',
    circuitBehavior:
      'Outputs variable DC voltage and current depending on solar irradiance (W/m²) and cell temperature. Pairs with Maximum Power Point Tracking (MPPT) inverters for grid-tie or battery charging.',
    keySpecs: [
      'Peak Power (Pmax): 400W STC (1000 W/m², 25°C)',
      'Module Efficiency: 21.3%',
      'Connectors: MC4 locking connectors',
    ],
    quickTips: [
      'Always install a dedicated DC double-pole rotary isolator switch near the solar array and inverter.',
      'Use UV-resistant, double-insulated 4mm² or 6mm² solar DC cabling.',
    ],
  },

  'distribution-board-3phase': {
    learnMoreSlug: 'distribution-board-explained-how-a-consumer-unit-is-wired',
    title: '3-Phase TPN Distribution Board (125A 8-Way)',
    category: 'distribution',
    voltage: '400V 3-Phase AC (230V Phase-to-Neutral)',
    amperage: '125A Main Incomer Busbar Rating',
    breakingCapacity: '25kA fault withstand rating',
    frequency: '50Hz / 60Hz',
    ipRating: 'IP3X (Enclosure door closed)',
    cableSize: '35mm² – 70mm² incoming mains',
    poles: '3-Phase + Neutral + Earth (TP&N)',
    standards: 'BS EN 61439-2 / BS 7671',
    overview:
      'Industrial Three-Phase and Neutral (TP&N) power distribution board equipped with a 125A 4-pole main isolator switch and busbars accepting 1-pole and 3-pole DIN-rail breakers.',
    circuitBehavior:
      'Distributes 400V AC across three distinct phase lines (L1, L2, L3) with 120° phase separation, enabling balanced 3-phase heavy motor feeds and 230V single-phase sub-circuits.',
    keySpecs: [
      'Main Incomer: 125A 4-Pole Isolator or MCCB',
      'Phase Balancing: L1 (Brown), L2 (Black), L3 (Grey), Neutral (Blue), Earth (Green/Yellow)',
      'Ways: 8 Triple-Pole / 24 Single-Pole outgoing circuit ways',
    ],
    quickTips: [
      'Carefully balance single-phase load currents across all three phases (L1, L2, L3) to minimize Neutral current.',
      'Verify phase rotation sequence (L1-L2-L3 clockwise) before connecting 3-phase motors.',
    ],
  },
};
