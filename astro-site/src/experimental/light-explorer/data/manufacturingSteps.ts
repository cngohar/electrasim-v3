export interface ManufacturingStep {
  step: number;
  id: string;
  title: string;
  shortAction: string;
  historicalProcess: string;
  npsReference: string;
  visibleComponents: string[];
  focusPartId: string;
}

export const MANUFACTURING_STEPS: ManufacturingStep[] = [
  {
    step: 1,
    id: 'wire-prep',
    title: 'Step 01: Platinum-Copper Lead Assembly',
    shortAction: 'JOIN CONDUCTORS',
    historicalProcess:
      'Short sections of expensive platinum wire were welded to flexible copper lead wires. Platinum was essential only at the point where the wire penetrates glass, as platinum expands at the identical rate to glass when heated.',
    npsReference: 'NPS Historical Handbook §2 (Edison Menlo Park Laboratory Construction Sequence)',
    visibleComponents: ['platinum-leads', 'copper-leads'],
    focusPartId: 'platinum-leads',
  },
  {
    step: 2,
    id: 'stem-blowing',
    title: 'Step 02: Glass Stem Fusion & Pinch Seal',
    shortAction: 'FORM STEM',
    historicalProcess:
      'A glassblower formed a flared glass tube around the platinum wires, heating the top until molten and pinching it firmly shut with tongs to form an airtight glass-to-metal pinch seal.',
    npsReference: 'NPS Historical Handbook §2',
    visibleComponents: ['stem', 'platinum-leads', 'copper-leads'],
    focusPartId: 'stem',
  },
  {
    step: 3,
    id: 'carbonization',
    title: 'Step 03: Carbonization of Cotton Thread',
    shortAction: 'BAKE FILAMENT',
    historicalProcess:
      'Ordinary cotton sewing thread was packed into nickel horseshoe molds separated by tissue paper and carbon dust, then baked in a high-temperature coal furnace for hours until only pure skeletal carbon remained.',
    npsReference: 'Rutgers Edison Papers — October 1879 Filament Experiments',
    visibleComponents: ['filament'],
    focusPartId: 'filament',
  },
  {
    step: 4,
    id: 'mounting',
    title: 'Step 04: Mounting Filament with Platinum Clamps',
    shortAction: 'CLAMP FILAMENT',
    historicalProcess:
      'Under a magnifying glass, the delicate horseshoe carbon filament was carefully inserted into micro-scale platinum clamps at the top of the platinum lead wires and secured with tiny clamping screws.',
    npsReference: 'Smithsonian NMAH_704361 Construction Notes',
    visibleComponents: ['stem', 'platinum-leads', 'copper-leads', 'clamps', 'filament'],
    focusPartId: 'clamps',
  },
  {
    step: 5,
    id: 'bulb-fusion',
    title: 'Step 05: Fusing Glass Envelope to Stem',
    shortAction: 'FIT ENVELOPE',
    historicalProcess:
      'A blown pear-shaped glass envelope with an open bottom neck was lowered over the filament mount. The neck and flared stem base were rotated in a gas flame and fused together to seal the bottom hermetically.',
    npsReference: 'NPS Historical Handbook §2',
    visibleComponents: ['stem', 'platinum-leads', 'copper-leads', 'clamps', 'filament', 'envelope'],
    focusPartId: 'envelope',
  },
  {
    step: 6,
    id: 'evacuation',
    title: 'Step 06: Evacuation on Sprengel Vacuum Pump',
    shortAction: 'EVACUATE AIR',
    historicalProcess:
      'The top exhaust tube of the bulb was attached to a Sprengel mercury fall pump. For up to 5 hours, falling mercury droplets trapped and dragged air molecules downward, drawing the vacuum to less than 1 millionth of an atmosphere while the filament was gently heated to bake out trapped gases.',
    npsReference: 'DOE History of the Light Bulb & Smithsonian Lighting a Revolution',
    visibleComponents: [
      'stem',
      'platinum-leads',
      'copper-leads',
      'clamps',
      'filament',
      'envelope',
      'tip',
    ],
    focusPartId: 'tip',
  },
  {
    step: 7,
    id: 'tip-sealing',
    title: 'Step 07: Flame Sealing Top Exhaust Tip',
    shortAction: 'SEAL BULB',
    historicalProcess:
      'While the vacuum pump was running, a handheld blowpipe torch was applied to the narrow exhaust tube just above the bulb apex. The molten glass collapsed inward, permanently sealing the bulb and creating the iconic top exhaust tip pip.',
    npsReference: 'Smithsonian NMAH_704361 Object Analysis',
    visibleComponents: [
      'stem',
      'platinum-leads',
      'copper-leads',
      'clamps',
      'filament',
      'envelope',
      'tip',
    ],
    focusPartId: 'tip',
  },
  {
    step: 8,
    id: 'collar-life-test',
    title: 'Step 08: Fitting Wooden Collar & Life Test',
    shortAction: 'TEST & OPERATE',
    historicalProcess:
      'The neck was cemented into a turned wooden collar fitted with dual flat brass contact plates. The finished lamp was placed into a test receptacle and connected to 110V DC from the Menlo Park dynamo for operational life testing.',
    npsReference: 'Smithsonian & Rutgers Historical Demonstration Records',
    visibleComponents: [
      'stem',
      'platinum-leads',
      'copper-leads',
      'clamps',
      'filament',
      'envelope',
      'tip',
      'collar',
      'contacts',
    ],
    focusPartId: 'contacts',
  },
];
