export interface LampComponent {
  id: string;
  name: string;
  historicalRole: string;
  material: string;
  physicalSpecs: string;
  description: string;
  historicalNote: string;
  sources: string[];
  explodedOffset: [number, number, number]; // [x, y, z] exploded offset in Three.js units
}

export const EDISON_1879_COMPONENTS: Record<string, LampComponent> = {
  envelope: {
    id: 'envelope',
    name: 'Glass Envelope (Vacuum Bulb)',
    historicalRole: 'Hermetic vacuum enclosure preventing carbon filament combustion',
    material: 'Free-blown transparent soda-lime / lead glass',
    physicalSpecs: '~6.3 cm maximum diameter, ~13.5 cm overall bulb length',
    description:
      'A pear-shaped hand-blown glass bulb enclosing the filament in an ultra-high vacuum environment. The bottom neck is fused directly to the inner glass stem to create an airtight seal.',
    historicalNote:
      'In normal air, a glowing carbon filament combusts with oxygen in seconds. Edison’s team evacuated the envelope to less than 1/1,000,000th of an atmosphere using Sprengel mercury pumps to ensure filament durability.',
    sources: ['smithsonian-1879-lamp', 'nps-beehives'],
    explodedOffset: [0, 2.2, 0],
  },
  tip: {
    id: 'tip',
    name: 'Top Glass Exhaust Tip (Pip)',
    historicalRole: 'Exhaust port sealed with flame after vacuum pump evacuation',
    material: 'Fused drawn glass',
    physicalSpecs: '~0.8 cm high, conical tapered apex',
    description:
      'The prominent glass nipple at the apex of the bulb. During manufacture, a hollow glass tube was joined here to connect the bulb to the Sprengel mercury vacuum pump. When full vacuum was reached, a gas flame melted the tube, sealing the lamp permanently.',
    historicalNote:
      'The top exhaust pip is the defining visual signature of 19th-century vacuum lamps, proving the bulb was evacuated from the top rather than the bottom stem (a technique developed later).',
    sources: ['smithsonian-1879-lamp'],
    explodedOffset: [0, 3.4, 0],
  },
  filament: {
    id: 'filament',
    name: 'Horseshoe Carbon Filament',
    historicalRole: 'High-resistance incandescent light emitter',
    material: 'Carbonized cotton sewing thread / Bristol board paper',
    physicalSpecs: '~0.33 mm cross-section, ~113 Ω cold / ~140 Ω hot resistance',
    description:
      'A delicate horseshoe-shaped loop of carbonized organic material. Electric current passing through its ~113–140 Ω resistance forces it to heat to incandescence (~2100 K), radiating warm golden light.',
    historicalNote:
      'Edison’s critical mathematical insight was using a HIGH-RESISTANCE filament (~100+ Ω) rather than the low-resistance thick rods used by predecessors. High resistance allowed small currents and thin copper distribution wires in parallel circuits.',
    sources: ['rutgers-edison-papers', 'smithsonian-1879-lamp'],
    explodedOffset: [0, 0.9, 0],
  },
  clamps: {
    id: 'clamps',
    name: 'Platinum Screw Clamps',
    historicalRole: 'Mechanical and electrical junction between carbon and metal leads',
    material: 'Pure platinum foil & micro-screws',
    physicalSpecs: 'Two clamps, ~2 mm × 1.5 mm each',
    description:
      'Miniature platinum clamping plates secured with micro-screws, fastening the fragile ends of the carbon filament to the electrical lead wires without soldering or excessive heat stress.',
    historicalNote:
      'Carbon cannot be easily soldered to metal. Edison tested copper, carbon paste, and mechanical clamps, settling on tiny platinum clamps in early 1879 demonstration lamps before later electroplating techniques.',
    sources: ['smithsonian-1879-lamp'],
    explodedOffset: [0, 0.5, 0],
  },
  'platinum-leads': {
    id: 'platinum-leads',
    name: 'Platinum Lead-in Wires',
    historicalRole: 'Hermetic current conductor sealed through the glass stem',
    material: 'Pure platinum wire (~0.5 mm diameter)',
    physicalSpecs: 'Two ~2.5 cm platinum sections through the glass pinch',
    description:
      'Two platinum wires fused directly through the glass stem to carry electrical current from outside into the vacuum envelope.',
    historicalNote:
      'Platinum was mandatory because its coefficient of thermal expansion (~9.0 × 10⁻⁶ /°C) almost exactly matches lead/potash glass. As the lamp heats and cools, the glass and wire expand together, preventing microscopic cracks that would destroy the vacuum.',
    sources: ['smithsonian-1879-lamp', 'nps-beehives'],
    explodedOffset: [0, 0, 0],
  },
  stem: {
    id: 'stem',
    name: 'Glass Mount Stem',
    historicalRole: 'Internal structural mount and hermetic glass seal',
    material: 'Blown glass tube with flattened pinch seal',
    physicalSpecs: '~3.2 cm length, flared bottom base',
    description:
      'An internal glass tube blown with a flared base and a flattened top pinch seal that permanently encapsulates the platinum lead wires while structurally positioning the filament at the center of the bulb.',
    historicalNote:
      'Glass-stem construction was borrowed from German glassblowing traditions and Geissler discharge tubes, enabling reliable assembly line manufacturing.',
    sources: ['smithsonian-1879-lamp', 'nps-beehives'],
    explodedOffset: [0, -0.4, 0],
  },
  'copper-leads': {
    id: 'copper-leads',
    name: 'Copper Extension Leads',
    historicalRole: 'Conductive connection from platinum wires to external base contacts',
    material: 'High-purity ductile copper wire',
    physicalSpecs: 'Two ~4 cm copper conductors',
    description:
      'Copper wires welded to the bottom of the platinum lead-in wires just outside the glass seal, routing electricity down to the collar contact plates.',
    historicalNote:
      'Because platinum was extremely expensive, its use was strictly limited to the short section embedded in the glass pinch; cheaper copper wire was used for external connections.',
    sources: ['smithsonian-1879-lamp'],
    explodedOffset: [0, -1.0, 0],
  },
  collar: {
    id: 'collar',
    name: 'Wooden / Plaster Mounting Collar',
    historicalRole: 'Mechanical socket mount and electrical insulator',
    material: 'Turned hardwood / plaster of Paris collar',
    physicalSpecs: '~2.8 cm diameter, ~3.0 cm height',
    description:
      'A turned wooden neck piece fitted over the bottom glass stem of the bulb using plaster of Paris cement to protect the glass pinch and hold the electrical contact plates in place.',
    historicalNote:
      'The 1879 New Year’s Eve demonstration lamp did NOT feature the famous Edison screw base (which was patented in 1881). Instead, it utilized this wooden collar fitted into early laboratory drop-sockets.',
    sources: ['smithsonian-1879-lamp'],
    explodedOffset: [0, -1.8, 0],
  },
  contacts: {
    id: 'contacts',
    name: 'Dual Brass Collar Contact Plates',
    historicalRole: 'External electrical circuit connection points',
    material: 'Formed brass / copper contact plates with terminal screws',
    physicalSpecs: 'Two lateral flat brass plates, ~1.2 cm × 0.8 cm',
    description:
      'Two flat brass plates mounted on opposite sides of the wooden collar neck. When inserted into a laboratory receptacle, spring clips pressed against these plates to complete the 110V circuit.',
    historicalNote:
      'These dual lateral contact plates are the documented historical connector design seen on the Smithsonian’s surviving 1879 New Year’s Eve demonstration lamp.',
    sources: ['smithsonian-1879-lamp'],
    explodedOffset: [0, -2.4, 0],
  },
};
