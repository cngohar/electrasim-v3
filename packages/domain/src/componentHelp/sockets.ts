/**
 * Component help content — Socket outlets.
 *
 * Split verbatim from the former monolithic `componentHelp.ts`. Entries
 * are byte-identical; merge order in `./index.ts` preserves the original
 * registry ordering exactly.
 */

import type { ComponentHelpData } from './types';

export const SOCKET_HELP: Record<string, ComponentHelpData> = {
  'socket-3pin': {
    title: 'UK 13A Single Switched Socket Outlet (BS 1363)',
    category: 'socket',
    voltage: '230V AC (50Hz)',
    amperage: '13A continuous',
    powerWatts: 3000,
    frequency: '50Hz',
    ipRating: 'IP20',
    cableSize: '2.5mm² (Ring) / 4.0mm² (Radial)',
    poles: 'Live, Neutral, Earth with Safety Shutters',
    standards: 'BS 1363-2 / BS 7671',
    overview:
      'Standard UK household power outlet featuring an integrated single-pole switch and automatic internal safety shutters over the Live and Neutral apertures.',
    circuitBehavior:
      'Delivers up to 13A (3.0kW) at 230V AC. Inserting the longer top Earth pin physically cams open the internal spring-loaded shutters, allowing Live and Neutral plug pins to engage.',
    keySpecs: [
      'Rated Current: 13A (3000W at 230V)',
      'Safety Mechanism: Earth-activated automatic child safety shutters',
      'Plate Dimensions: 86mm × 86mm standard single gang',
    ],
    quickTips: [
      'Always connect all three conductors: Live (Brown), Neutral (Blue), Earth (Green/Yellow).',
      'All socket outlets rated ≤ 32A require 30mA RCD protection under BS 7671 regulations.',
    ],
  },

  'double-socket': {
    title: 'Twin 13A Switched Socket Outlet (2-Gang BS 1363)',
    category: 'socket',
    voltage: '230V AC (50Hz)',
    amperage: '13A per outlet (20A combined continuous maximum)',
    powerWatts: 3680,
    frequency: '50Hz',
    ipRating: 'IP20',
    cableSize: '2.5mm² – 4.0mm²',
    poles: 'Twin Outlets with Dual DP Switches',
    standards: 'BS 1363-2 / BS 7671',
    overview:
      'Standard double socket plate with two independently switched BS 1363 outlets, widely installed in residential ring final and commercial radial power circuits.',
    circuitBehavior:
      'Supplies power to two appliances simultaneously. Internal copper busbars bridge Live, Neutral, and Earth between both socket compartments.',
    keySpecs: [
      'Max Load: 13A individual outlet / 20A combined total across both sockets',
      'Back Box Depth: 25mm standard / 35mm recommended for 2.5mm² ring loop cables',
    ],
    quickTips: [
      'Standard in 32A MCB protected ring final circuits using 2.5mm² Twin & Earth cable.',
      'Check all terminal screws are firmly torqued to avoid contact heating under high loads.',
    ],
  },

  'socket-usb': {
    title: 'Twin 13A Socket with Integrated USB Fast Charger',
    category: 'socket',
    voltage: '230V AC Input / 5V, 9V, 12V DC USB Output',
    amperage: '13A AC + 3.1A / 4.2A USB Fast Charge',
    powerWatts: '3000W AC + 20W–45W USB PD',
    frequency: '50Hz',
    ipRating: 'IP20',
    cableSize: '2.5mm² – 4.0mm²',
    poles: 'Twin AC Outlets + USB-A & USB-C Ports',
    standards: 'BS 1363-2 / EN 62368-1 / USB Power Delivery',
    overview:
      'Modern dual wall socket incorporating high-efficiency smart switch-mode DC converters providing high-speed USB-A and USB-C Power Delivery (PD) charging for smartphones, tablets, and laptops.',
    circuitBehavior:
      'Delivers standard 230V AC to plug sockets while internal DC step-down regulator negotiates charging voltage (5V/9V/12V) with connected USB devices with over-temperature and short-circuit protection.',
    keySpecs: [
      'USB Ports: 1× USB-A (QC 3.0) + 1× USB-C (Power Delivery PD 20W/30W)',
      'Standby DC Power: < 0.1W',
      'AC Rating: 13A 230V per gang',
    ],
    quickTips: [
      'Requires a 35mm deep back box to accommodate the rear internal transformer housing.',
      'Connect standard Live, Neutral, and Earth mains wiring.',
    ],
  },

  'socket-gfci': {
    title: 'Ground Fault Circuit Interrupter (GFCI / RCD Socket)',
    category: 'socket',
    voltage: '120V / 230V AC',
    amperage: '15A / 20A (US) or 13A (UK RCD socket)',
    powerWatts: 3600,
    breakingCapacity: '10kA conditional',
    tripCurve: '4mA–6mA (US GFCI) / 30mA (UK RCD socket)',
    frequency: '50/60Hz',
    ipRating: 'IP20 / Weather-Resistant WR versions for wet locations',
    cableSize: '2.5mm² – 4.0mm²',
    poles: 'Line In + Load Out terminals for downstream circuit protection',
    standards: 'UL 943 / BS 7288 / NEC Article 210.8',
    overview:
      'Specialized safety socket outlet featuring built-in microsecond ground fault sensing, central TEST / RESET buttons, and status indicator LED.',
    circuitBehavior:
      'Monitors current balance. If an earth fault exceeding 4–6mA (GFCI) or 30mA (RCD) occurs, mechanical contacts open in under 25ms. Downstream outlets wired to "LOAD" terminals receive full ground-fault protection.',
    keySpecs: [
      'Trip Threshold: 4mA–6mA (Personnel class A protection)',
      'Trip Speed: < 25 milliseconds',
      'Dual Terminals: LINE (supply in) and LOAD (protected downstream out)',
    ],
    quickTips: [
      'Mandatory in bathrooms, kitchens, basements, garages, and outdoor locations.',
      'Be careful not to reverse LINE and LOAD terminals during installation.',
    ],
  },
};
