export interface LightEra {
  id: string;
  year: number;
  period: string;
  title: string;
  shortLabel: string;
  bulbType: string;
  status: 'available' | 'coming-soon' | 'roadmap';
  statusLabel: string;
  visualAsset: string;
  route: string | null;
  sceneId: string | null;
  historicalSummary: string;
  technicalSpecs: Record<string, string>;
  keyInnovations: string[];
  sourceRefs: string[];
}

export const LIGHT_ERAS: LightEra[] = [
  {
    id: 'edison-1879',
    year: 1879,
    period: '1879',
    title: 'Edison Carbon-Filament Demonstration Lamp',
    shortLabel: '1879 Edison',
    bulbType: 'Carbonized Cotton Thread in High Vacuum',
    status: 'available',
    statusLabel: 'AVAILABLE NOW',
    visualAsset: '/images/light-explorer/edison-1879.jpg',
    route: '/experimental/light-explorer/edison-1879/',
    sceneId: 'edison-1879-laboratory',
    historicalSummary:
      'Thomas Edison and his Menlo Park laboratory team created a practical high-resistance incandescent lamp using carbonized cotton thread in a high Sprengel-pump vacuum with platinum lead-in wires and collar contacts. First publicly demonstrated on New Year’s Eve, 1879.',
    technicalSpecs: {
      'Operating Voltage': '110 V DC (Nominal)',
      'Cold Resistance': '113 Ω (Documented Oct 22, 1879 notebook)',
      'Hot Resistance': '~140 Ω (Documented operational state)',
      'Power Consumption': '~86 W',
      'Luminous Output': '~16 candlepower (~150–200 lm)',
      'Filament Material': 'Carbonized Bristol board / cotton thread',
      'Vacuum Pressure': '< 10⁻⁶ atm (Sprengel mercury pump)',
      'Electrical Base': 'Wooden collar with dual lateral brass contact plates (No screw base)',
      'Top Exhaust Tip': 'Flame-sealed exhaust pip from vacuum pump extraction',
    },
    keyInnovations: [
      'High resistance filament (~100+ Ω) enabling parallel circuit distribution without thick copper mains',
      'High vacuum (< 10⁻⁶ atm) preventing carbon oxidation and filament burnout',
      'Platinum-in-glass hermetic seal with matching coefficient of thermal expansion',
      'System-level design integrated with dynamos, meters, underground mains, and safety fuses',
    ],
    sourceRefs: ['smithsonian-1879-lamp', 'rutgers-edison-papers', 'nps-beehives', 'doe-history'],
  },
  {
    id: 'tungsten-1900s',
    year: 1904,
    period: '1904–1911',
    title: 'Ductile Tungsten Filament Lamp',
    shortLabel: '1900s Tungsten',
    bulbType: 'Drawn Tungsten Wire in Vacuum / Gas',
    status: 'coming-soon',
    statusLabel: 'COMING SOON',
    visualAsset: '/images/light-explorer/tungsten-1900s.jpg',
    route: null,
    sceneId: null,
    historicalSummary:
      'The transition from fragile carbon and squirted tungsten paste to William D. Coolidge’s patented ductile drawn tungsten wire (1910) at GE, followed by Irving Langmuir’s inert gas-filling discovery (1913), yielding 3× higher luminous efficiency.',
    technicalSpecs: {
      'Operating Temperature': '~2400 K – 2600 K',
      'Filament Melting Point': '3695 K (Tungsten metal)',
      'Luminous Efficacy': '8–10 lm/W (vs ~2 lm/W for carbon)',
      'Key Pioneer': 'William D. Coolidge (GE Research Laboratory)',
    },
    keyInnovations: [
      'Ductile drawn tungsten wire capable of enduring vibration and thermal cycling',
      'Zigzag cage support mounts for longer filament length',
      'Introduction of inert nitrogen/argon gas fill to suppress tungsten evaporation',
    ],
    sourceRefs: ['smithsonian-lighting-revolution', 'doe-history'],
  },
  {
    id: 'coiled-1930s',
    year: 1934,
    period: '1930s',
    title: 'Coiled-Coil Standard Incandescent',
    shortLabel: '1930s Coiled-Coil',
    bulbType: 'Coiled-Coil Tungsten in Argon-Nitrogen',
    status: 'roadmap',
    statusLabel: 'ROADMAP',
    visualAsset: '/images/light-explorer/coiled-1930s.jpg',
    route: null,
    sceneId: null,
    historicalSummary:
      'Coiling the already-coiled tungsten filament into a compact spiral dramatically lowered thermal convection heat loss through the gas fill, establishing the iconic A19 general-service household bulb for the remainder of the 20th century.',
    technicalSpecs: {
      'Operating Temperature': '~2700 K – 2850 K',
      'Gas Atmosphere': '90% Argon / 10% Nitrogen mixture',
      'Luminous Efficacy': '12–17 lm/W',
      'Standard Base': 'E26 / E27 Edison screw base',
    },
    keyInnovations: [
      'Coiled-coil geometry reducing effective filament surface area exposed to gas convection',
      'High-speed automated glass ribbon bulb blowing machines (Corning Ribbon Machine)',
      'Standardized international threading and voltage compatibility',
    ],
    sourceRefs: ['doe-history'],
  },
  {
    id: 'fluorescent-1960s',
    year: 1938,
    period: '1938–1960s',
    title: 'Linear Phosphor Fluorescent Tube',
    shortLabel: '1960s Fluorescent',
    bulbType: 'Low-Pressure Mercury Vapor Discharge with Phosphors',
    status: 'roadmap',
    statusLabel: 'ROADMAP',
    visualAsset: '/images/light-explorer/fluorescent-1960s.jpg',
    route: null,
    sceneId: null,
    historicalSummary:
      'Developed by George Inman and commercialized at the 1939 New York World’s Fair. Low-pressure mercury discharge produces 253.7 nm UV radiation, which stimulates halophosphate/tri-phosphor inner coatings to generate efficient, cool diffuse illumination.',
    technicalSpecs: {
      'Discharge Medium': 'Low-pressure mercury vapor + Argon buffer',
      'Operating Mechanism': '254 nm UV excitation of inner halophosphors',
      'Luminous Efficacy': '50–70 lm/W',
      'Ballast Requirement': 'Magnetic / Electronic current limiter & starter',
    },
    keyInnovations: [
      'Indirect luminescence converting non-thermal UV discharge into visible white light',
      'Over 400% efficiency increase over incandescent lighting for commercial applications',
      'Bi-pin end connectors with pre-heat tungsten cathodes',
    ],
    sourceRefs: ['smithsonian-lighting-revolution', 'doe-history'],
  },
  {
    id: 'cfl-1990s',
    year: 1980,
    period: '1980s–1990s',
    title: 'Compact Fluorescent Lamp (CFL)',
    shortLabel: '1990s CFL',
    bulbType: 'Helical Tri-Phosphor Discharge with Integrated Ballast',
    status: 'roadmap',
    statusLabel: 'ROADMAP',
    visualAsset: '/images/light-explorer/cfl-1990s.jpg',
    route: null,
    sceneId: null,
    historicalSummary:
      'Engineered by Edward Hammer (1976) and commercialized in the 1980s–1990s to bring fluorescent efficiency directly into standard incandescent domestic screw sockets via narrow helical folded tubes and miniaturized electronic high-frequency ballasts.',
    technicalSpecs: {
      'Luminous Efficacy': '55–75 lm/W (75% less energy than standard incandescent)',
      'Tube Architecture': 'Spiral helical narrow-bore glass with rare-earth tri-phosphors',
      Ballast: 'Integrated solid-state high-frequency inverter (20–40 kHz)',
      Lifespan: '8,000–12,000 hours',
    },
    keyInnovations: [
      'Helical and folded glass bending manufacturing methods',
      'Integrated solid-state high-frequency ballast fitting inside standard bulb bases',
      'Rare-earth tri-band phosphors delivering higher color rendering index (CRI)',
    ],
    sourceRefs: ['doe-history'],
  },
  {
    id: 'led-2000s',
    year: 2000,
    period: '2000s–Present',
    title: 'Solid-State LED Lighting',
    shortLabel: '2000s+ LED',
    bulbType: 'Semiconductor InGaN Diode with Phosphor Down-Conversion',
    status: 'roadmap',
    statusLabel: 'ROADMAP',
    visualAsset: '/images/light-explorer/led-2000s.jpg',
    route: null,
    sceneId: null,
    historicalSummary:
      'Revolutionary solid-state semiconductor lighting enabled by the 2014 Nobel Prize-winning invention of high-brightness gallium nitride (GaN) blue LEDs by Shuji Nakamura, Isamu Akasaki, and Hiroshi Amano, converting over 50% of electrical energy into visible light.',
    technicalSpecs: {
      'Semiconductor Die': 'Indium Gallium Nitride (InGaN) on Sapphire / Silicon',
      'Wavelength Conversion': 'YAG:Ce (Yttrium Aluminum Garnet) phosphor',
      'Luminous Efficacy': '90–150+ lm/W (85%+ energy reduction)',
      'Operational Lifespan': '25,000–50,000+ hours',
    },
    keyInnovations: [
      'Solid-state quantum well electron-hole radiative recombination with zero filament or gas degradation',
      'Instantaneous switching, dimmability, and extreme thermal efficiency',
      'Chip-on-Glass (COG) LED filament styling preserving historical bulb aesthetics with modern efficiency',
    ],
    sourceRefs: ['doe-history'],
  },
];
