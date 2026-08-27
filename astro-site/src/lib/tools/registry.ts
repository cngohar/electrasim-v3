export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolEquation {
  title: string;
  formula: string;
  description: string;
}

export interface ToolStep {
  step: string;
  instruction: string;
}

export interface ToolEntry {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  route: string;
  category: 'calculator' | 'reference' | 'converter';
  status: 'available' | 'coming-soon';
  description: string;
  badge?: string;
  icon: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage?: string;
  equations?: ToolEquation[];
  faqs?: ToolFaq[];
  steps?: ToolStep[];
  relatedGuides?: Array<{ title: string; url: string; description: string }>;
}

export const TOOLBOX_REGISTRY: ToolEntry[] = [
  {
    id: 'voltage-drop',
    name: 'Voltage Drop Calculator',
    shortName: 'Voltage Drop',
    slug: 'voltage-drop-calculator',
    route: '/tools/voltage-drop-calculator/',
    category: 'calculator',
    status: 'available',
    description:
      'Calculate voltage drop in single-phase, three-phase, and DC cables with interactive real-time visual simulation and BS 7671 limits.',
    badge: 'Popular',
    icon: 'voltage',
    metaTitle: 'Voltage Drop Calculator — Free Interactive Electrical Tool | ElectraSim',
    metaDescription:
      'Calculate voltage drop in single-phase, three-phase, and DC cable runs with interactive animated visual feedback. Compare against BS 7671 limits. Free in your browser.',
    keywords: [
      'voltage drop calculator',
      'electrical voltage drop',
      'cable voltage drop formula',
      'BS 7671 voltage drop limits',
      'single phase voltage drop',
      'three phase voltage drop calculator',
      'DC voltage drop calculation',
      'copper vs aluminum wire resistance',
      'cable size voltage loss',
      'electrical engineering calculator',
    ],
    ogImage: 'https://electrasim.com/og-image.png',
    equations: [
      {
        title: 'DC Circuits (Two-Wire Loop)',
        formula: 'V_drop = 2 × I × L × (ρ / A)',
        description:
          'Accounts for total round-trip conductor resistance across positive and return conductors, where ρ is resistivity and A is cross-sectional area.',
      },
      {
        title: 'Single-Phase AC Circuits (1-Φ)',
        formula: 'V_drop = 2 × I × L × (r cos φ + x sin φ)',
        description:
          'Combines cable active resistance (r) and reactive reactance (x) adjusted for the load displacement power factor (cos φ).',
      },
      {
        title: 'Three-Phase AC Circuits (3-Φ Balanced)',
        formula: 'V_drop = √3 × I × L × (r cos φ + x sin φ)',
        description:
          'The square root of 3 (≈ 1.732) represents line-to-line voltage across three balanced 120° phase-shifted conductors.',
      },
      {
        title: 'Conductor Temperature Correction',
        formula: 'ρ_T = ρ_20 × [1 + α × (T - 20)]',
        description:
          'Accounts for positive thermal coefficient of resistance (α = 0.00393 for copper), meaning hotter cables suffer greater voltage drop.',
      },
    ],
    steps: [
      {
        step: 'Select System Type & Nominal Voltage',
        instruction:
          'Choose between DC, Single-Phase AC (e.g. 230 V), or Three-Phase AC (e.g. 400 V line-to-line).',
      },
      {
        step: 'Enter Load Current and One-Way Run Length',
        instruction:
          'Input the maximum design current in Amperes (A) and the total physical length of the cable route in meters (m).',
      },
      {
        step: 'Specify Conductor Cross-Section & Material',
        instruction:
          'Select conductor cross-sectional area (e.g. 2.5 mm², 6 mm², 10 mm², 16 mm²) and material (Copper or Aluminum).',
      },
      {
        step: 'Review Results Against BS 7671 Permissible Limits',
        instruction:
          'Verify that voltage drop is within 3% for lighting circuits or 5% for general power/socket circuits under standard public LV supply.',
      },
    ],
    faqs: [
      {
        question: 'What is the maximum permitted voltage drop in the UK under BS 7671?',
        answer:
          'Under UK Wiring Regulations (BS 7671:2018+A3:2024 Appendix 4), the maximum permitted voltage drop from the origin of a standard low-voltage public supply installation is 3% for lighting circuits (6.9 V at 230 V) and 5% for other circuits such as socket outlets, cookers, and heating (11.5 V at 230 V). For private supplies (such as generators or solar PV installations), the limits are 6% for lighting and 8% for other circuits.',
      },
      {
        question: 'Why does voltage drop occur in electrical cables?',
        answer:
          'Every metallic conductor has an internal electrical resistance determined by its material resistivity, length, and cross-sectional area. When electric current flows through this resistance, energy is dissipated as heat (I²R loss), which causes the electrical potential (voltage) at the end of the cable to be lower than at the supply origin.',
      },
      {
        question: 'How do you calculate 3-phase voltage drop compared to single-phase?',
        answer:
          'In a single-phase circuit, current flows out on the live conductor and returns on the neutral, so the multiplier is 2 (round trip). In a balanced 3-phase circuit, the 120° phase angle displacement between conductors reduces the effective line-to-line impedance multiplier to √3 (approximately 1.732).',
      },
      {
        question: 'How do I reduce excessive voltage drop in a long cable run?',
        answer:
          'The most effective way to reduce voltage drop is to increase the conductor cross-sectional area (e.g., upsizing from 6 mm² to 10 mm² or 16 mm²), which directly reduces resistance. Other methods include optimizing cable routing to reduce length, balancing loads across three phases, or using copper conductors instead of aluminum.',
      },
      {
        question: 'Does temperature affect voltage drop in electrical cables?',
        answer:
          'Yes. Metals have a positive temperature coefficient of resistance. As conductor temperature rises due to ambient heat or load current, resistivity increases according to ρ_T = ρ_20[1 + α(T - 20)]. For example, a copper conductor operating at 70°C has approximately 19.6% higher resistance than at 20°C, increasing total voltage loss.',
      },
    ],
    relatedGuides: [
      {
        title: 'Voltage Drop Explained: How to Calculate It (with Examples & BS 7671 Rules)',
        url: '/blog/voltage-drop-explained-how-to-calculate-it/',
        description:
          'Comprehensive engineering guide to cable resistance, formulas, and UK wiring regulations.',
      },
      {
        title: 'Electrical Cable Sizes Explained (1.5mm² to 25mm²)',
        url: '/blog/electrical-cable-sizes-explained/',
        description:
          'Guide to standard metric cable cross-sections, current carrying capacities, and applications.',
      },
      {
        title: 'Single-Phase vs Three-Phase Power Comparison',
        url: '/blog/single-phase-vs-three-phase-power-explained/',
        description:
          'Detailed analysis of single-phase 230V vs three-phase 400V distribution systems.',
      },
      {
        title: "Ohm's Law Master Tutorial (V = I × R)",
        url: '/blog/ohms-law-explained-voltage-current-resistance/',
        description:
          'The fundamental relationship between voltage, current, and resistance in electrical circuits.',
      },
    ],
  },
  {
    id: 'cable-size',
    name: 'Cable Size Calculator',
    shortName: 'Cable Sizing',
    slug: 'cable-size-calculator',
    route: '/tools/cable-size-calculator/',
    category: 'calculator',
    status: 'available',
    description:
      'Find the minimum required conductor cross-sectional area (mm²) based on design current, installation method, derating factors, and voltage drop limits.',
    badge: 'Essential',
    icon: 'cable',
    metaTitle: 'Cable Size Calculator — BS 7671 Conductor Sizing | ElectraSim',
    metaDescription:
      'Calculate the correct electrical cable size (mm²) per BS 7671 and IEC standards. Accounts for installation methods, ambient temperature, grouping, insulation, and voltage drop.',
    keywords: [
      'cable size calculator',
      'wire gauge calculator',
      'electrical conductor sizing',
      'BS 7671 cable selection',
      'mm2 cable calculator',
      'cable current carrying capacity',
      'installation method derating',
    ],
    ogImage: 'https://electrasim.com/og-image.png',
    equations: [
      {
        title: 'Design Current (Ib)',
        formula: 'I_b = P / (V × cos φ)  [1-Φ]   or   P / (√3 × V × cos φ)  [3-Φ]',
        description: 'Calculates the full continuous load current drawn by the connected circuit.',
      },
      {
        title: 'Required Tabulated Current Capacity (It)',
        formula: 'I_t ≥ I_n / (C_a × C_g × C_i × C_c)',
        description:
          'Derates the protective device rating (In) by ambient temperature (Ca), grouping (Cg), thermal insulation (Ci), and semi-enclosed fuse factor (Cc).',
      },
      {
        title: 'Voltage Drop Verification',
        formula: 'ΔV = (mV/A/m × I_b × L) / 1000 ≤ ΔV_max',
        description:
          'Ensures the chosen conductor does not exceed 3% (lighting) or 5% (power) voltage drop over the total run length.',
      },
    ],
    steps: [
      {
        step: 'Specify Electrical Load & Circuit Voltage',
        instruction:
          'Enter design power in Watts (or current in Amperes), system voltage, and power factor.',
      },
      {
        step: 'Choose Installation Method',
        instruction:
          'Select how the cable is installed (Method A: in thermal insulation; Method B: in conduit/trunking; Method C: clipped direct; Method D: in ground).',
      },
      {
        step: 'Set Environmental Derating Factors',
        instruction:
          'Specify ambient temperature, number of grouped circuits, and thermal insulation thickness.',
      },
      {
        step: 'Review Sized Conductor & Compliance Margin',
        instruction:
          'The engine selects the smallest metric cross-section (mm²) that satisfies both thermal capacity (Iz ≥ It) and voltage drop limits.',
      },
    ],
    faqs: [
      {
        question: 'How do you choose the right cable size under BS 7671?',
        answer:
          'Cable selection follows the golden rule: Ib ≤ In ≤ Iz, where Ib is design current, In is the nominal protective device rating, and Iz is the effective current-carrying capacity of the cable under installed conditions. The cable must also satisfy maximum permissible voltage drop (3% for lighting, 5% for other uses).',
      },
      {
        question: 'What is the difference between installation methods A, B, and C?',
        answer:
          'Method A covers cables enclosed in thermal insulation inside a wall (lowest heat dissipation). Method B covers cables enclosed in conduit or trunking on a wall. Method C covers cables clipped directly to a non-metallic surface in free air, which dissipates heat faster and carries higher current.',
      },
      {
        question: 'Why does grouping cables reduce their capacity?',
        answer:
          'When multiple loaded cables run close together in a conduit, trunking, or tray, mutual thermal heating prevents them from shedding heat effectively. A grouping factor (Cg) reduces permissible current capacity—for example, 4 grouped circuits reduce capacity to 65%.',
      },
    ],
    relatedGuides: [
      {
        title: 'Electrical Cable Sizes Explained (1.5mm² to 25mm²)',
        url: '/blog/electrical-cable-sizes-explained/',
        description: 'Comprehensive guide to standard metric cable sizes and applications.',
      },
      {
        title: 'Voltage Drop Explained: How to Calculate It',
        url: '/blog/voltage-drop-explained-how-to-calculate-it/',
        description: 'How to calculate millivolt-per-amp-per-meter voltage drop in cables.',
      },
    ],
  },
  {
    id: 'max-zs',
    name: 'Max Zs Calculator (Disconnection Times)',
    shortName: 'Max Zs',
    slug: 'max-zs-calculator',
    route: '/tools/max-zs-calculator/',
    category: 'calculator',
    status: 'available',
    description:
      'Verify earth fault loop impedance (Zs) and 0.4s / 5s automatic disconnection times against BS 7671:2018+A4:2026 Tables 41.2–41.4.',
    badge: 'BS 7671',
    icon: 'shield',
    metaTitle: 'Max Zs Calculator — BS 7671 Loop Impedance & Disconnection | ElectraSim',
    metaDescription:
      'Calculate maximum permitted Zs and verify earth fault loop impedance per BS 7671 Amendment 4. Includes MCB Types B/C/D, fuses, and the 80% test rule.',
    keywords: [
      'max zs calculator',
      'earth fault loop impedance',
      'BS 7671 Table 41.3 Zs values',
      'disconnection time calculator',
      '80 percent rule GN3',
      'R1 plus R2 calculator',
      'prospective fault current calculator',
    ],
    ogImage: 'https://electrasim.com/og-image.png',
    equations: [
      {
        title: 'Maximum Zs Formula (Cmin-corrected)',
        formula: 'Zs_max = (U_0 × C_min) / I_a',
        description:
          'Where U0 is nominal line-to-earth voltage (230 V), Cmin is the minimum voltage factor (0.95), and Ia is the trip threshold current.',
      },
      {
        title: 'Circuit Loop Impedance (Zs)',
        formula: 'Z_s = Z_e + (R_1 + R_2)',
        description:
          'Total loop impedance equals external earth impedance (Ze) plus line (R1) and protective conductor (R2) resistance.',
      },
      {
        title: 'The 80% Rule for Cold Testing (IET GN3)',
        formula: 'Z_s(measured at 20°C) ≤ 0.8 × Zs_max',
        description:
          'Leaves a 20% thermal margin so that when conductors reach full 70°C operating temperature, Zs does not exceed the statutory ceiling.',
      },
    ],
    steps: [
      {
        step: 'Select Protective Device & Curve',
        instruction:
          'Choose device type (Type B, C, or D MCB/RCBO, or BS 88 fuse) and rated current (In).',
      },
      {
        step: 'Select Earthing System (TN-C-S, TN-S, or TT)',
        instruction:
          'Sets typical external impedance Ze (0.35 Ω for TN-C-S, 0.80 Ω for TN-S) or custom measured Ze.',
      },
      {
        step: 'Enter Conductor Run Length & Cross-Sections',
        instruction:
          'Input length in meters and select line cable (mm²) and protective earth CPC (mm²).',
      },
      {
        step: 'Compare Against Max Disconnection Threshold',
        instruction:
          'Verify calculated Zs against the statutory 0.4s disconnection limit and the IET GN3 80% cold test rule.',
      },
    ],
    faqs: [
      {
        question: 'What is the 80% rule in electrical testing (IET Guidance Note 3)?',
        answer:
          'Published BS 7671 Table 41.2–41.4 Zs values are calculated for conductors at their maximum operating temperature of 70°C. When testing cold circuits at ambient temperature (around 20°C), measured Zs will be lower. The 80% rule (multiplying max Zs by 0.8) ensures that when the circuit is fully loaded and conductors warm up, Zs will not drift past the safety limit.',
      },
      {
        question: 'What is the maximum Zs for a 32A Type B MCB in the UK?',
        answer:
          'Under BS 7671:2018+A4:2026, the Cmin-corrected maximum Zs for a 32A Type B MCB (5×In = 160A instantaneous trip) is 1.37 Ω (calculated as 230V × 0.95 / 160A). The 80% cold test ceiling is 1.10 Ω.',
      },
      {
        question: 'How does Ze affect total earth fault loop impedance Zs?',
        answer:
          'Ze is the external impedance of the supply network up to the consumer unit terminals. Typical maximum values are 0.35 Ω for TN-C-S (PME) and 0.80 Ω for TN-S. Because Zs = Ze + (R1 + R2), a higher Ze leaves less allowable resistance for the circuit cable run before exceeding the maximum Zs.',
      },
    ],
    relatedGuides: [
      {
        title: 'How to Trace an Electrical Fault Safely',
        url: '/blog/how-to-trace-an-electrical-fault-safely/',
        description: 'Step-by-step continuity, insulation resistance and loop impedance testing.',
      },
      {
        title: 'Types of Earthing Systems Explained (TN-S, TN-C-S, TT)',
        url: '/blog/types-of-earthing-systems-tn-s-tn-c-s-tt-explained/',
        description: 'Complete breakdown of UK earthing arrangements and their typical Ze values.',
      },
    ],
  },
  {
    id: 'power-calculator',
    name: 'Power Calculator (kW / kVA / Amps)',
    shortName: 'Power & Current',
    slug: 'power-calculator',
    route: '/tools/power-calculator/',
    category: 'calculator',
    status: 'coming-soon',
    description:
      'Convert and calculate Real Power (kW), Apparent Power (kVA), Reactive Power (kVAR), and full-load current across AC and DC systems.',
    icon: 'power',
    metaTitle: 'Electrical Power Calculator — kW, kVA, Power Factor & Current | ElectraSim',
    metaDescription:
      'Interactive electrical power calculator for single-phase and three-phase AC and DC systems. Calculate kW, kVA, kVAR and load current.',
    keywords: [
      'electrical power calculator',
      'kw to amps calculator',
      'kva to kw calculator',
      'three phase power calculator',
      'power factor calculator',
    ],
  },
  {
    id: 'electrical-load',
    name: 'Electrical Load Calculator',
    shortName: 'Load Schedule',
    slug: 'electrical-load-calculator',
    route: '/tools/electrical-load-calculator/',
    category: 'calculator',
    status: 'coming-soon',
    description:
      'Estimate maximum demand, apply diversity factors, and calculate total circuit loading for domestic and commercial installations.',
    icon: 'load',
    metaTitle: 'Electrical Load & Diversity Calculator | ElectraSim',
    metaDescription:
      'Calculate electrical load schedules, maximum demand, and diversity allowances for house wiring and consumer units.',
    keywords: [
      'electrical load calculator',
      'diversity factor calculator',
      'maximum demand electrical',
      'consumer unit load schedule',
    ],
  },
  {
    id: 'energy-cost',
    name: 'Energy Cost Calculator',
    shortName: 'Energy Cost',
    slug: 'energy-cost-calculator',
    route: '/tools/energy-cost-calculator/',
    category: 'calculator',
    status: 'coming-soon',
    description:
      'Calculate appliance energy consumption, running costs per hour/day/year, and potential savings based on electricity unit rates.',
    icon: 'energy',
    metaTitle: 'Electricity Running Cost Calculator | ElectraSim',
    metaDescription:
      'Calculate electricity running costs and kWh consumption for home appliances and electrical equipment based on your unit tariff.',
    keywords: [
      'energy cost calculator',
      'appliance running cost',
      'electricity kwh cost calculator',
      'power consumption cost',
    ],
  },
];

export function getToolById(id: string): ToolEntry | undefined {
  return TOOLBOX_REGISTRY.find((t) => t.id === id);
}

export function getToolBySlug(slug: string): ToolEntry | undefined {
  return TOOLBOX_REGISTRY.find((t) => t.slug === slug);
}
