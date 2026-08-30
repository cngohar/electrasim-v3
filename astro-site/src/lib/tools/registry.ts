import type { StandardId } from './standards';

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
  /** Regional wiring standards this tool supports (rendered as trust chips). */
  standards?: StandardId[];
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
      'Calculate voltage drop in single-phase, three-phase, and DC cables with interactive real-time visual simulation. Check BS 7671 (UK) or IEC 60364 (international) limit sets.',
    badge: 'Popular',
    icon: 'voltage',
    standards: ['uk-bs7671', 'iec-60364'],
    metaTitle: 'Voltage Drop Calculator — BS 7671 & IEC 60364 Limits | ElectraSim',
    metaDescription:
      'Calculate voltage drop in single-phase, three-phase, and DC cable runs with interactive animated visual feedback. Compare against BS 7671 (UK) or IEC 60364 international limits. Free in your browser.',
    keywords: [
      'voltage drop calculator',
      'electrical voltage drop',
      'cable voltage drop formula',
      'BS 7671 voltage drop limits',
      'IEC 60364 voltage drop',
      'iec 60364-5-52 annex g',
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
        step: 'Review Results Against the Selected Standard',
        instruction:
          'Verify voltage drop against the limits in force — BS 7671 Reg 525.1 (3% lighting / 5% other uses from the origin) or IEC 60364-5-52 Annex G, which shares those ceilings on a public supply and adds the 6%/8% private-supply and >100 m allowances.',
      },
    ],
    faqs: [
      {
        question: 'What is the maximum permitted voltage drop in the UK under BS 7671?',
        answer:
          'BS 7671:2018+A4:2026 Regulation 525.1 (with the limits tabulated in Appendix 4, Table 4Ab) permits a maximum voltage drop from the origin of the installation of 3% of the nominal voltage for lighting circuits — 6.9 V at 230 V, 12 V at 400 V — and 5% for all other circuits — 11.5 V at 230 V, 20 V at 400 V. Where the installation is fed from a private LV supply (generator, transformer, solar PV), Table 4Ab doubles the allowance to 6% for lighting and 8% for other uses. The DNO-side drop from the transformer to your meter is not included: EN 50160 separately permits the supply itself to sit between −6% and +10% of 230 V.',
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
          'Yes. Metals have a positive temperature coefficient of resistance. As conductor temperature rises due to ambient heat or load current, resistivity increases according to ρ_T = ρ_20[1 + α(T - 20)], with α = 0.00393 /°C for copper and 0.00403 /°C for aluminum (IEC 60287-1-1). A copper conductor at the 70 °C PVC design temperature therefore has 19.6% more resistance than the same conductor cold at 20 °C — on the 230 V / 40 A / 50 m / 10 mm² example that is the difference between 6.33 V (2.75%) and 7.57 V (3.29%).',
      },
      {
        question: 'Why is my answer different from the BS 7671 mV/A/m tables?',
        answer:
          "Three assumptions differ. (1) Temperature — the Appendix 4 tables quote mV/A/m at the conductor's maximum operating temperature (70 °C for thermoplastic, 90 °C for thermosetting), while this calculator uses the temperature you enter, 20 °C by default, i.e. a cold cable. (2) Cable data — the tables use the maximum d.c. resistance permitted for the size, a few per cent above the nominal resistivity used here, and for cables up to 16 mm² they publish the resistive drop only (inductance ignored). (3) Power factor — above 16 mm² the tabulated impedance assumes cos φ ≈ 0.8, so set the same power factor and switch cable reactance on to compare like with like. Worked check: 10 mm² thermoplastic copper is tabulated at 4.6 mV/A/m, which gives 4.6 × 40 × 50 / 1000 = 9.2 V on the example run; this tool returns 6.33 V cold at 20 °C and 7.57 V when you set 70 °C. For a lightly loaded cable Appendix 4 also permits a Ct correction: mV/A/m × [230 + t_p − (C_a² − I_b²/I_t²)(t_p − 30)] / (230 + t_p).",
      },
      {
        question: 'How much voltage drop does a 7 kW EV charger need?',
        answer:
          'A 7 kW single-phase charger draws 32 A for hours at a time, so volt drop matters more here than on a shower or cooker that runs for ten minutes. Taking the 70 °C design temperature of thermoplastic cable, 6 mm² copper loses about 2.2 V per 10 m at 32 A (roughly 1% of 230 V), 10 mm² about 1.3 V per 10 m, and 2.5 mm² about 5.3 V per 10 m. That is why 6 mm² is normally the longest run you would accept for a budget of 3% (about 30 m) and 10 mm² is the default beyond it, while 2.5 mm² runs out of the 5% ceiling (11.5 V) at around 20 m. Check the chargepoint manual too: many specify a maximum loop impedance or minimum conductor size so the 6 mA DC smoothing and the RCD type still work.',
      },
      {
        question: 'Should I enter the whole ring-main length for a ring final circuit?',
        answer:
          'No — a ring feeds the load from both directions, so the two paths are effectively in parallel and carry half the current each. Take a 100 m ring of 2.5 mm² copper at 30 A with the hot-cable resistance (8.23 mΩ/m): each 50 m path carries 15 A, so the drop to the furthest socket is 15 × 0.4115 Ω ≈ 6.2 V (2.7%). A radial over the same 50 m distance would drop 24.7 V — four times as much. To reproduce the ring figure in this calculator, enter one eighth of the total ring length as the one-way run (12.5 m above), and keep margin: real rings unbalance when most of the load sits on one side, which is why long rings are commonly run in 4 mm² instead of 2.5 mm².',
      },
      {
        question: 'Is voltage drop the same thing as power wasted in the cable?',
        answer:
          'They are related but not identical. The heat in the conductors is I²R, which is what this calculator reports as "Power Loss"; the volts the load loses is I × Z projected onto the supply phasor, which is why the power factor enters the drop but never the loss. For a resistive load the two line up: a 5% drop (11.5 V) at 40 A is about 460 W being turned into heat inside the wall or ceiling — which is why a cable that is merely "legal" on volt drop is often still the wrong choice thermally.',
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
      {
        title: 'US Voltage Drop Calculator (AWG & NEC)',
        url: '/tools/us/voltage-drop-calculator/',
        description:
          'Working to the US National Electrical Code? Use the AWG/kcmil edition with feet, 120–480 V systems and NEC 3%/5% advisory limits.',
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
      'Pick a load, set the run and a voltage-drop limit, and see the smallest cable size (mm²) that keeps the voltage drop inside it — with a live source → cable → load scene that redraws the cable as you change it.',
    badge: 'Interactive',
    icon: 'cable',
    metaTitle: 'Cable Size Calculator — Smallest Cable That Passes Voltage Drop | ElectraSim',
    metaDescription:
      'Free interactive cable size calculator. Choose a load (lighting, fan, motor, heater, appliance or your own), set the run length, conductor and voltage-drop limit, and see the smallest mm² cable that passes — with a live electrical scene.',
    keywords: [
      'cable size calculator',
      'what size cable do i need',
      'cable size by voltage drop',
      'wire size calculator mm2',
      'mm2 cable calculator',
      '1.5 vs 2.5 mm2 cable',
      'cable size for 3kw heater',
      'cable size calculator uk',
      'copper vs aluminium cable size',
      'voltage drop cable sizing',
      'cable size for long run',
      'electrical cable size chart',
    ],
    ogImage: 'https://electrasim.com/og-image.png',
    equations: [
      {
        title: 'Resistance of the run',
        formula: 'R = 2 × ρ × L / A',
        description:
          'Resistance grows with length (L) and falls with cross-sectional area (A). ρ is the conductor resistivity — 0.0172 Ω·mm²/m for copper, 0.0282 Ω·mm²/m for aluminium at 20 °C. The factor 2 is the round trip: out on the line conductor, back on the neutral.',
      },
      {
        title: 'Voltage drop',
        formula: 'ΔV = I × R   [AC: ΔV = 2 × I × L × (r cos φ + x sin φ)]',
        description:
          'Ohm’s law applied to the whole loop. Every candidate cable size is scored with this by the shared voltage-drop engine, so the ladder and the answer can never disagree.',
      },
      {
        title: 'Design current',
        formula: 'I = P / (V × cos φ)  [AC]   ·   I = P / V  [DC]',
        description:
          'The demand the load places on the run. A 3 kW heater at 230 V draws 13.0 A; a 100 W lighting load draws 0.43 A.',
      },
      {
        title: 'Voltage actually delivered',
        formula: 'V_load = V_source − ΔV',
        description:
          'What arrives at the far end. This is the number that matters to the lamp, the motor or the heater — not the nominal voltage at the origin.',
      },
      {
        title: 'Drop as a percentage',
        formula: 'ΔV% = ΔV / V_source × 100',
        description:
          'The figure the limit is compared against: 3% of 230 V is 6.9 V, 5% is 11.5 V.',
      },
    ],
    steps: [
      {
        step: 'Set the source',
        instruction:
          'Choose AC or DC and the nominal voltage (230 V AC by default). Three-phase is out of scope in this version.',
      },
      {
        step: 'Choose the load',
        instruction:
          'Pick Lighting, Fan, Motor, Heater or Appliance — or Custom, where you enter the power in watts and the power factor yourself. The scene swaps to that load immediately.',
      },
      {
        step: 'Describe the cable run',
        instruction:
          'Select copper or aluminium and enter the one-way cable length from source to load.',
      },
      {
        step: 'Choose a voltage-drop limit',
        instruction:
          'Pick 3%, 5% or your own figure. Treat it as a design choice: 3% / 5% are the values most standards quote for a public LV supply, but local rules differ.',
      },
      {
        step: 'Read the recommendation, then experiment',
        instruction:
          'The tool recommends the smallest candidate that passes. Click any size in the comparison strip to inspect it: the cable in the scene thickens or thins and every number follows.',
      },
    ],
    faqs: [
      {
        question: 'How does this calculator choose a cable size?',
        answer:
          'It evaluates every candidate cross-section with the shared voltage-drop engine and recommends the smallest one whose calculated drop stays inside the limit you selected. A 3 kW heater at 230 V draws 13.0 A; over 25 m of copper that is 7.48 V (3.25%) on 1.5 mm² — over a 3% limit — and 4.49 V (1.95%) on 2.5 mm², so 2.5 mm² is the recommendation. Push the same run to 40 m and 2.5 mm² reaches 3.12%, so the answer becomes 4 mm².',
      },
      {
        question: 'Why does a bigger cable reduce voltage drop?',
        answer:
          'Because resistance is ρL/A: doubling the cross-sectional area halves the resistance of the run, and the drop is I × R. On the 25 m heater example, going from 1.5 mm² to 2.5 mm² takes the drop from 7.48 V to 4.49 V, and 10 mm² brings it down to 1.12 V.',
      },
      {
        question: 'Is the 3% or 5% voltage-drop limit a legal requirement?',
        answer:
          'It is a design parameter here, not a compliance certificate. 3% and 5% are the figures most commonly quoted for a public low-voltage supply (BS 7671 Reg 525.1 and IEC 60364-5-52 Annex G both band it that way), but the permitted drop depends on your supply, your local regulations and where the origin of the installation is taken to be. This calculator tells you what the physics does — it does not certify a design.',
      },
      {
        question: 'Does this tool check current-carrying capacity or protective devices?',
        answer:
          'No. It sizes the cable by voltage drop only. Current-carrying capacity, ambient-temperature and grouping derating, MCB/RCD selection, fault-loop impedance and disconnection times are all out of scope, and a real design has to clear those gates separately.',
      },
      {
        question: 'Copper or aluminium — how much difference does it make?',
        answer:
          'Aluminium’s resistivity is about 64% higher than copper (0.0282 vs 0.0172 Ω·mm²/m at 20 °C), so the same size drops about 1.6× more voltage. On the 3 kW heater over 25 m at a 3% limit, copper is comfortable on 2.5 mm² (1.95%) while aluminium needs 4 mm² (2.5 mm² aluminium drops 3.20% and fails).',
      },
      {
        question: 'Why does my answer differ from a cable manufacturer’s table?',
        answer:
          'Two assumptions differ. (1) Temperature — this calculator uses the resistivity at 20 °C unless you reason about the hot cable, while tabulated mV/A/m figures are quoted at the conductor’s maximum operating temperature (70 °C for thermoplastic), roughly 20% higher resistance. (2) Power factor and reactance — the tables fold inductance in above 16 mm² and assume cos φ ≈ 0.8, where this tool models resistance with the power factor you set. Use the Voltage Drop calculator to explore the hot-cable case directly.',
      },
      {
        question: 'What cable size do I need for a 3 kW heater?',
        answer:
          'At 230 V it draws 13.0 A. With copper and a 3% limit: 2.5 mm² up to about 38 m, 4 mm² up to about 61 m, and 6 mm² beyond that — rounding down, because a longer run spends the same 6.9 V budget faster. Switch to aluminium and each of those distances shrinks by roughly a third. Always confirm the size against current-carrying capacity and the protective device for the installation method you are actually using.',
      },
      {
        question: 'Does length really matter that much?',
        answer:
          'Yes — drop is directly proportional to length. Double the run and you double the drop, so a cable that is comfortable at 20 m can fail at 40 m. That is why the length slider is one of the first things worth dragging in the scene: the cable does not change, but the verdict does.',
      },
    ],
    relatedGuides: [
      {
        title: 'Electrical Cable Sizes Explained (1.5mm² to 25mm²)',
        url: '/blog/electrical-cable-sizes-explained/',
        description: 'What each standard metric cross-section is actually used for.',
      },
      {
        title: 'Voltage Drop Explained: How to Calculate It',
        url: '/blog/voltage-drop-explained-how-to-calculate-it/',
        description: 'The physics behind the number this calculator compares against your limit.',
      },
      {
        title: 'Ohm’s Law Explained: Voltage, Current & Resistance',
        url: '/blog/ohms-law-explained-voltage-current-resistance/',
        description: 'Why V = I × R is the whole story behind cable sizing.',
      },
      {
        title: 'UK Voltage Drop Calculator (mm² / BS 7671)',
        url: '/tools/voltage-drop-calculator/',
        description: 'Inspect one cable in detail, including conductor temperature and reactance.',
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
      'Verify earth fault loop impedance (Zs) and 0.4s / 5s automatic disconnection times against BS 7671:2018+A4:2026 Tables 41.2–41.4 or IEC 60364-4-41.',
    badge: 'BS 7671 / IEC',
    icon: 'shield',
    standards: ['uk-bs7671', 'iec-60364'],
    metaTitle: 'Max Zs Calculator — BS 7671 & IEC 60364 Loop Impedance | ElectraSim',
    metaDescription:
      'Calculate maximum permitted Zs and verify earth fault loop impedance per BS 7671 Amendment 4 (UK) or IEC 60364-4-41 (international). Includes MCB Types B/C/D, fuses, and ambient-test rules.',
    keywords: [
      'max zs calculator',
      'earth fault loop impedance',
      'BS 7671 Table 41.3 Zs values',
      'IEC 60364-4-41 disconnection time',
      'iec 60364 fault loop impedance',
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
    id: 'us-voltage-drop',
    name: 'US Voltage Drop Calculator (AWG / NEC)',
    shortName: 'US Voltage Drop',
    slug: 'us/voltage-drop-calculator',
    route: '/tools/us/voltage-drop-calculator/',
    category: 'calculator',
    status: 'available',
    description:
      'Calculate voltage drop for US circuits in AWG/kcmil and feet using NEC Chapter 9 Table 8 conductor resistance. Checks the NEC 3% / 5% advisory limits for 120–480 V systems.',
    badge: 'NEC · US',
    icon: 'voltage',
    standards: ['us-nec'],
    metaTitle: 'Voltage Drop Calculator (AWG, NEC) — US Wire Sizing | ElectraSim',
    metaDescription:
      'Free NEC voltage drop calculator for US circuits. AWG/kcmil copper & aluminum conductors, feet, 120/208/240/277/480 V, NEC Chapter 9 Table 8 data and 3%/5% advisory checks.',
    keywords: [
      'voltage drop calculator awg',
      'nec voltage drop calculator',
      'wire size voltage drop calculator',
      'voltage drop calculator feet',
      'awg voltage drop chart',
      'nec 210.19 voltage drop 3%',
      'branch circuit voltage drop calculator',
      '240v wire size calculator',
      'copper vs aluminum voltage drop',
      'nec chapter 9 table 8 resistance',
      'voltage drop formula usa',
    ],
    ogImage: 'https://electrasim.com/og-image.png',
    equations: [
      {
        title: 'Single-Phase & DC Branch Circuits (2-Wire)',
        formula: 'V_drop = 2 × I × L × (R′ cos φ + X′ sin φ)   [R′, X′ in Ω/ft]',
        description:
          'Round-trip loop through the ungrounded and grounded conductors. R′ comes from NEC Chapter 9 Table 8 (DC resistance per 1000 ft, stranded) corrected for conductor operating temperature.',
      },
      {
        title: 'Three-Phase Feeders (Balanced)',
        formula: 'V_drop = √3 × I × L × (R′ cos φ + X′ sin φ)',
        description:
          'Line-to-line drop across three balanced 120° phase-shifted conductors, using the same NEC Table 8 per-conductor resistance.',
      },
      {
        title: 'Conductor Temperature Correction',
        formula: 'R(T) = R_75 × (K + T) / (K + 75)',
        description:
          'K = 234.5 for copper and 228.1 for aluminum (inferred absolute-zero constants). NEC Table 8 values are published at 75 °C.',
      },
      {
        title: 'Circular-Mil Estimator (quick check)',
        formula: 'CM = (2 × K_cm × I × L) / V_drop',
        description:
          'Classic sizing shortcut with K_cm = 12.9 Ω·CM/ft for copper (17.4 at 90 °C) and 21.2 for aluminum. Use the calculator above for Table 8-accurate results.',
      },
    ],
    steps: [
      {
        step: 'Select System Type & Nominal Voltage',
        instruction:
          'Choose DC, single-phase (120 V, 240 V, 277 V) or balanced three-phase (208 V, 480 V), or type any custom system voltage.',
      },
      {
        step: 'Enter Load Current and One-Way Run (feet)',
        instruction:
          'Input the design load in Amps and the one-way conductor length in feet — the engine builds the full round-trip loop automatically.',
      },
      {
        step: 'Select Conductor (AWG / kcmil) & Material',
        instruction:
          'Pick from 14 AWG to 500 kcmil in copper or aluminum, with the exact mm² equivalent shown. Conductor temperature sets the Table 8 correction (default 75 °C).',
      },
      {
        step: 'Check the NEC 3% / 5% Advisory Verdict',
        instruction:
          'Results cite NEC 210.19(A) Informational Note No. 4 and 215.2(A)(1) Informational Note No. 2: max 3% on any single feeder or branch circuit, 5% combined total.',
      },
    ],
    faqs: [
      {
        question: 'Is voltage drop a requirement in the US National Electrical Code?',
        answer:
          'No — voltage drop in the NEC is advisory, not enforceable. NEC 210.19(A)(1) Informational Note No. 4 (branch circuits) and 215.2(A)(1) Informational Note No. 2 (feeders) recommend a maximum of 3% drop on any single feeder or branch circuit and 5% total from service to outlet. Some local codes and AHJs adopt them as mandatory, so check your jurisdiction.',
      },
      {
        question: 'What conductor resistance data does this calculator use?',
        answer:
          'It uses NEC Chapter 9, Table 8 (Conductor Properties) DC resistance at 75 °C for stranded conductors, temperature-corrected with R(T) = R_75 × (K + T)/(K + 75), where K is 234.5 for copper and 228.1 for aluminum. Optional AC reactance uses ≈0.045 Ω/kFT, typical of NEC Chapter 9 Table 9 values for 600 V conductors in PVC conduit.',
      },
      {
        question: 'How do I size a wire for a 240 V circuit with minimal voltage drop?',
        answer:
          'Enter 240 V, the load amps, and the one-way distance in feet, then step through AWG sizes. For example, a 30 A dryer run of 80 ft drops about 2.6% on 10 AWG copper, but only 0.9% on 6 AWG. Stay at or below 3% for the branch circuit to meet NEC advisory guidance.',
      },
      {
        question: 'What is the AWG to mm² conversion used here?',
        answer:
          'Exact area equivalents: 14 AWG = 2.08 mm², 12 AWG = 3.31 mm², 10 AWG = 5.26 mm², 8 AWG = 8.37 mm², 6 AWG = 13.3 mm², 4 AWG = 21.2 mm², and kcmil sizes convert at 0.5067 mm² per kcmil. The calculator displays the metric equivalent next to every AWG selection.',
      },
      {
        question: 'Why do aluminum conductors drop more voltage than copper?',
        answer:
          'Aluminum has roughly 61% higher resistivity than copper (NEC Table 8: 12 AWG Cu is 1.98 Ω/kFT vs 3.25 Ω/kFT for Al at 75 °C), so the same run needs about two AWG sizes larger aluminum to match copper performance. Modern AA-8000 alloy feeders are common above 6 AWG.',
      },
      {
        question: 'Does this tool replace ampacity checks (NEC Table 310.16)?',
        answer:
          'No. This calculator checks voltage drop only. Conductors must separately satisfy ampacity per NEC 310.16 (and termination temperature limits per 110.14(C)), overcurrent protection per 240.4, and any applicable adjustment/correction factors per 310.15. Always verify the complete design.',
      },
    ],
    relatedGuides: [
      {
        title: 'Voltage Drop Explained: How to Calculate It (with Examples)',
        url: '/blog/voltage-drop-explained-how-to-calculate-it/',
        description:
          'The physics of conductor resistance and voltage drop, with formulas that apply on both sides of the Atlantic.',
      },
      {
        title: 'Electrical Cable Sizes Explained (1.5mm² to 25mm²)',
        url: '/blog/electrical-cable-sizes-explained/',
        description:
          'Metric conductor guide with AWG cross-references for readers switching between systems.',
      },
      {
        title: 'UK Voltage Drop Calculator (mm² / BS 7671)',
        url: '/tools/voltage-drop-calculator/',
        description:
          'Working to BS 7671 or IEC 60364 instead? Use the metric edition with mm² conductors and 230/400 V systems.',
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
