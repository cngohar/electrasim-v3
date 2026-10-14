// Public component metadata snapshot for this design prototype. No simulation or user data.
window.DesignCatalog = {
  source: 'Current COMPONENT_DEFS, VALID_VARIANT_FAMILIES and COMPONENT_IMAGES',
  catalog: [
    {
      type: 'single-way-switch',
      label: 'Single-way Switch',
      description: 'A standard on/off switch for controlling a single circuit or light.',
      category: 'switch',
      tier: 'basic',
      powerWatts: 0,
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'two-way-switch',
      label: 'Two-way Switch',
      description: 'Allows controlling a load from two different locations (SPDT switch).',
      category: 'switch',
      tier: 'basic',
      ports: [
        {
          label: 'COM',
          type: 'live',
        },
        {
          label: 'L1',
          type: 'live',
        },
        {
          label: 'L2',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'intermediate-switch',
      label: 'Intermediate Switch',
      description:
        '4-terminal switch used between two 2-way switches to control lights from 3+ locations.',
      category: 'switch',
      tier: 'pro',
      ports: [
        {
          label: 'L1-in',
          type: 'live',
        },
        {
          label: 'L2-in',
          type: 'live',
        },
        {
          label: 'L1-out',
          type: 'live',
        },
        {
          label: 'L2-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'double-pole-switch',
      label: 'Double-Pole Switch (20A)',
      description:
        'Switches both Live and Neutral simultaneously for isolation of high-power appliances.',
      category: 'switch',
      tier: 'pro',
      powerWatts: 4600,
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'push-button',
      label: 'Push Button',
      description:
        'Normally-open momentary switch (can be configured as normally-closed or latching). Closes contact only while held.',
      category: 'switch',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'rotary-selector-switch',
      label: 'Rotary Selector Switch',
      description: '3-position selector switch (OFF / AUTO / MANUAL) for industrial panels.',
      category: 'switch',
      tier: 'pro',
      ports: [
        {
          label: 'COM',
          type: 'live',
        },
        {
          label: 'AUTO',
          type: 'live',
        },
        {
          label: 'MAN',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'contactor',
      label: 'Power Contactor (25A)',
      description:
        'Heavy-duty electromechanical switching relay for motors and heavy loads. Modeled without coil terminals, control coil logic, or auxiliary contacts.',
      category: 'switch',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'cooker-unit',
      label: 'Cooker Control Unit (45A)',
      description:
        'High-power double-pole isolator switch with auxiliary socket for kitchen appliances.',
      category: 'switch',
      tier: 'pro',
      powerWatts: 7200,
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'bulb',
      label: 'LED Bulb (9W)',
      description: 'Energy-efficient LED light bulb with standard E27 screw base.',
      category: 'lighting',
      tier: 'basic',
      powerWatts: 9,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'bulb-incandescent',
      label: 'Incandescent Bulb (60W)',
      description:
        'Traditional tungsten filament lamp with warm light and high resistive thermal load.',
      category: 'lighting',
      tier: 'basic',
      powerWatts: 60,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'bulb-halogen',
      label: 'Halogen Lamp (42W)',
      description: 'High-brightness halogen lamp providing bright white illumination.',
      category: 'lighting',
      tier: 'basic',
      powerWatts: 42,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'bulb-cfl',
      label: 'CFL Lamp (15W)',
      description: 'Compact Fluorescent Light lamp for commercial and residential lighting.',
      category: 'lighting',
      tier: 'basic',
      powerWatts: 15,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'bulb-smart-rgb',
      label: 'Smart RGB LED Bulb (10W)',
      description: 'Color-tunable smart LED lamp for modern home automation.',
      category: 'lighting',
      tier: 'pro',
      powerWatts: 10,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'led-downlight',
      label: 'LED Downlight (12W)',
      description: 'Ceiling recessed LED spotlight fixture.',
      category: 'lighting',
      tier: 'basic',
      powerWatts: 12,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'tube-light',
      label: 'Fluorescent Tube (36W)',
      description: 'Linear T8 fluorescent tube batten light with electronic ballast.',
      category: 'lighting',
      tier: 'basic',
      powerWatts: 36,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'mcb',
      label: 'MCB Type B (16A)',
      description:
        'Miniature Circuit Breaker Type B for domestic lighting and sockets. All modes provide educational overcurrent estimates; device-specific certification and installation compliance are not assessed.',
      category: 'protection',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'mcb-type-c',
      label: 'MCB Type C (32A)',
      description:
        'Type C breaker for motors, transformers, and inductive loads. All modes provide educational overcurrent estimates; device-specific certification and installation compliance are not assessed.',
      category: 'protection',
      tier: 'pro',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'mcb-type-d',
      label: 'MCB Type D (63A)',
      description:
        'Type D breaker for heavy industrial loads with high inrush current. All modes provide educational overcurrent estimates; device-specific certification and installation compliance are not assessed.',
      category: 'protection',
      tier: 'pro',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'mccb',
      label: 'MCCB Breaker (100A)',
      description:
        'Molded Case Circuit Breaker for high-current main distribution and heavy industrial sub-mains.',
      category: 'protection',
      tier: 'pro',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'rcd',
      label: 'RCD / RCCB (80A 30mA)',
      description:
        'Residual Current Device (two-pole). Trips on >30 mA earth leakage and on smooth DC residual faults only when set to Type B; select the residual type in the Inspector.',
      category: 'protection',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'rcbo',
      label: 'RCBO (32A 30mA)',
      description:
        'Combined overcurrent and residual-current device (Type B MCB curve, 32 A). Trips on bolted short and 30 mA+ earth leakage; RCD type AC/A/F/B selectable — only Type B sees smooth DC.',
      category: 'protection',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'afdd',
      label: 'AFDD-RCBO (32A 30mA Type A)',
      description:
        'Combined arc-fault, overcurrent and residual-current device (BS EN 62606 / BS EN 61009-1, B curve, 32 A, Type A). The only protective device that detects series/parallel arcing — the fire risk that MCBs and RCDs stay blind to; also trips on bolted short, overload and 30 mA+ earth leakage. BS 7671 Reg 421.1.7 requires AFDDs on single-phase socket-outlet final circuits up to 32 A in higher-risk residential buildings, HMOs, student accommodation and care homes (recommended elsewhere).',
      category: 'protection',
      tier: 'pro',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'fuse',
      label: 'Cartridge Fuse (13A)',
      description:
        'BS 1362 ceramic cartridge fuse that melts and opens circuit upon severe overcurrent.',
      category: 'protection',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'spd',
      label: 'Surge Protector (SPD Type 2)',
      description:
        'Surge Protection Device safeguarding electronic equipment from lightning and switching transients.',
      category: 'protection',
      tier: 'pro',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'PE',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'distribution-board',
      label: 'Distribution Board (Consumer Unit)',
      description:
        'Main consumer unit panel distributing incoming supply to multiple individual sub-circuits.',
      category: 'protection',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L1',
          type: 'live',
        },
        {
          label: 'L2',
          type: 'live',
        },
        {
          label: 'L3',
          type: 'live',
        },
        {
          label: 'N1',
          type: 'neutral',
        },
        {
          label: 'N2',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'main-switch',
      label: 'Main Switch (100A)',
      description:
        'Standalone double-pole main switch for isolating the whole installation at the consumer unit.',
      category: 'protection',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'fused-spur',
      label: 'Fused Connection Unit (FCU 13A)',
      description: 'Switched FCU with BS 1362 fuse for local protection of fixed appliances.',
      category: 'protection',
      tier: 'pro',
      powerWatts: 3000,
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'socket-2pin',
      label: '2-Pin Un-earthed Socket',
      description: 'Basic 2-pole power outlet without protective earth connection.',
      category: 'socket',
      tier: 'basic',
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'socket-3pin',
      label: 'Single 3-Pin Socket (13A)',
      description: 'Standard grounded BS 1363 single power socket with safety shutter.',
      category: 'socket',
      tier: 'basic',
      powerWatts: 2990,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'double-socket',
      label: 'Double 3-Pin Socket (13A Twin)',
      description: 'Twin 13A grounded socket outlet for domestic ring main or radial circuits.',
      category: 'socket',
      tier: 'basic',
      powerWatts: 3120,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'socket-usb',
      label: '3-Pin Socket + Dual USB',
      description: 'Grounded 13A wall socket with integrated 5V USB-A & USB-C fast charging ports.',
      category: 'socket',
      tier: 'pro',
      powerWatts: 3000,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'socket-gfci',
      label: 'GFCI / RCD Safety Outlet (20A)',
      description:
        'Ground Fault Circuit Interrupter outlet providing localized shock hazard protection.',
      category: 'socket',
      tier: 'pro',
      powerWatts: 2400,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'socket-industrial',
      label: 'Industrial CEE Socket (32A)',
      description: 'Heavy-duty IP67 weather-proof industrial socket for high-power site equipment.',
      category: 'socket',
      tier: 'pro',
      powerWatts: 7360,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'socket-us',
      label: 'NEMA 5-15R Receptacle (15A)',
      description: 'Standard North American 120V grounded duplex-style single receptacle.',
      category: 'socket',
      tier: 'basic',
      powerWatts: 1800,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'double-socket-us',
      label: 'NEMA 5-15R Duplex (15A)',
      description: 'Twin North American 120V grounded receptacle on a shared yoke.',
      category: 'socket',
      tier: 'basic',
      powerWatts: 3600,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'socket-schuko',
      label: 'Schuko Socket (CEE 7/3) 16A',
      description: 'Standard continental European 230V grounded socket with earth clips.',
      category: 'socket',
      tier: 'basic',
      powerWatts: 3680,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'socket-schuko-double',
      label: 'Schuko Double Socket (CEE 7/3) 16A',
      description: 'Twin continental European 230V grounded Schuko outlets.',
      category: 'socket',
      tier: 'basic',
      powerWatts: 7360,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'socket-as3112',
      label: 'AS/NZS 3112 Socket (10A)',
      description: 'Standard Australian / NZ 230V flat-pin grounded socket.',
      category: 'socket',
      tier: 'basic',
      powerWatts: 2400,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'socket-as3112-double',
      label: 'AS/NZS 3112 Twin Socket',
      description: 'Twin Australian / NZ flat-pin grounded outlets.',
      category: 'socket',
      tier: 'basic',
      powerWatts: 4800,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'socket-bs546',
      label: 'BS 546 Socket (15A / 5A)',
      description: 'Classic round-pin 3-pin socket common in India and South Africa.',
      category: 'socket',
      tier: 'basic',
      powerWatts: 3450,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'shaver-socket',
      label: 'Shaver Socket (Bathroom)',
      description: 'Bathroom shaver outlet with isolating transformer and earth socket (Reg 701).',
      category: 'socket',
      tier: 'basic',
      powerWatts: 20,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'socket-bs546-double',
      label: 'BS 546 Twin Socket',
      description: 'Twin round-pin 3-pin sockets for India / South Africa.',
      category: 'socket',
      tier: 'basic',
      powerWatts: 6900,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'ceiling-fan',
      label: 'Ceiling Fan (65W)',
      description: 'Multi-speed ceiling fan motor for ambient air circulation.',
      category: 'fan',
      tier: 'basic',
      powerWatts: 65,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'extractor-fan',
      label: 'Bathroom Extractor Fan (25W)',
      description: 'Wall/ceiling extraction fan with timer overrun for bathroom moisture control.',
      category: 'fan',
      tier: 'basic',
      powerWatts: 25,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'industrial-exhaust-fan',
      label: 'Industrial Exhaust Fan (250W)',
      description: 'High CFM commercial exhaust fan for kitchens and workshop ventilation.',
      category: 'fan',
      tier: 'pro',
      powerWatts: 250,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'table-fan',
      label: 'Portable Desk Fan (45W)',
      description: 'Small portable oscillating table fan.',
      category: 'fan',
      tier: 'basic',
      powerWatts: 45,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'motor',
      label: 'Electric Motor (750W / 1HP)',
      description: 'Single-phase AC induction motor driving mechanical pumps and machinery.',
      category: 'load',
      tier: 'basic',
      powerWatts: 750,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'bell',
      label: 'Doorbell / Buzzer (15W)',
      description:
        'Electromechanical chime signaling unit. Shows a visual pulse when energised (does not play audio).',
      category: 'load',
      tier: 'basic',
      powerWatts: 15,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'water-heater',
      label: 'Electric Water Heater (2.0kW)',
      description: 'Immersion water heater geyser element.',
      category: 'load',
      tier: 'basic',
      powerWatts: 2000,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'space-heater',
      label: 'Convector Space Heater (2.0kW)',
      description: 'High-power resistive heating element for room heating.',
      category: 'load',
      tier: 'basic',
      powerWatts: 2000,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'air-conditioner',
      label: 'Inverter Air Conditioner (1.5kW)',
      description: 'Split-system AC inverter compressor load.',
      category: 'load',
      tier: 'pro',
      powerWatts: 1500,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'induction-hob',
      label: 'Induction Cooktop (3.5kW)',
      description:
        'Magnetic induction heating cooktop requiring dedicated heavy-gauge radial wiring.',
      category: 'load',
      tier: 'pro',
      powerWatts: 3500,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'ev-charger',
      label: 'EV Charger Point (7.4kW)',
      description: 'Single-phase 32A Type 2 Smart Electric Vehicle charging station.',
      category: 'load',
      tier: 'pro',
      powerWatts: 7400,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'electric-shower',
      label: 'Electric Shower Unit (8.5kW)',
      description:
        'Instantaneous electric shower. A dedicated high-current (32–40 A / 10 mm²) RCD-protected circuit with a pull-cord isolation switch is required.',
      category: 'load',
      tier: 'basic',
      powerWatts: 8500,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'immersion-heater',
      label: 'Immersion Heater (3.0kW)',
      description:
        'Hot-water immersion heating element on a dedicated 16 A circuit with double-pole isolation.',
      category: 'load',
      tier: 'basic',
      powerWatts: 3000,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'extractor-hood',
      label: 'Kitchen Extractor Hood (300W)',
      description: 'Range hood with extraction fan and integrated lighting for the kitchen.',
      category: 'load',
      tier: 'basic',
      powerWatts: 300,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'underfloor-heating',
      label: 'Underfloor Heating (2.0kW)',
      description:
        'Electric underfloor heating mat or cable on a dedicated thermostat-controlled circuit.',
      category: 'load',
      tier: 'basic',
      powerWatts: 2000,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'storage-heater',
      label: 'Storage Heater (2.5kW)',
      description:
        'Off-peak storage heater with dual supply — an unfused off-peak radial and a fused boost/fan supply.',
      category: 'load',
      tier: 'basic',
      powerWatts: 2500,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'heat-pump',
      label: 'Air-Source Heat Pump (3.0kW)',
      description:
        'Modern air-source heat pump — a high-inrush compressor load for heating and hot water.',
      category: 'load',
      tier: 'pro',
      powerWatts: 3000,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'dishwasher',
      label: 'Dishwasher (2.2kW)',
      description: 'Dishwasher on a dedicated kitchen small-appliance circuit.',
      category: 'load',
      tier: 'basic',
      powerWatts: 2200,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'washing-machine',
      label: 'Washing Machine (2.2kW)',
      description: 'Washing machine on a dedicated appliance circuit.',
      category: 'load',
      tier: 'basic',
      powerWatts: 2200,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'tumble-dryer',
      label: 'Tumble Dryer (2.5kW)',
      description: 'Vented or condenser tumble dryer on a dedicated appliance circuit.',
      category: 'load',
      tier: 'basic',
      powerWatts: 2500,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'fridge-freezer',
      label: 'Fridge Freezer (200W)',
      description:
        'Fridge/freezer — a small appliance circuit often left on its own to avoid disturbance.',
      category: 'load',
      tier: 'basic',
      powerWatts: 200,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'fan-dimmer',
      label: 'Rotary Fan Speed Regulator',
      description: 'Capacitive / triac speed controller for ceiling and exhaust fans.',
      category: 'control',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'dimmer-switch',
      label: 'Light Dimmer Switch (400W)',
      description: 'Trailing-edge digital light dimmer for dimmable LED and incandescent lamps.',
      category: 'control',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'pir-sensor',
      label: 'PIR Motion Sensor',
      description: 'Infrared motion sensor switch for security lighting and common areas.',
      category: 'control',
      tier: 'pro',
      powerWatts: 5,
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'thermostat',
      label: 'Digital Room Thermostat',
      description:
        'Temperature-sensitive relay contact for controlling heating boilers and AC pumps.',
      category: 'control',
      tier: 'pro',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'photocell-sensor',
      label: 'Dusk-to-Dawn Photocell',
      description: 'Light sensor that switches outdoor lighting automatically at sunset.',
      category: 'control',
      tier: 'pro',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'smart-relay',
      label: 'Smart WiFi Relay Module',
      description: 'Micro smart relay module compatible with app and voice assistant control.',
      category: 'control',
      tier: 'pro',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'live-terminal',
      label: 'Live Terminal (L)',
      description: 'Single-phase live supply terminal rail.',
      category: 'supply',
      tier: 'basic',
      ports: [
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'neutral-terminal',
      label: 'Neutral Terminal (N)',
      description: 'Single-phase neutral return terminal rail.',
      category: 'supply',
      tier: 'basic',
      ports: [
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'earth-terminal',
      label: 'Earth Ground (PE)',
      description: 'Safety protective earth ground terminal rail.',
      category: 'supply',
      tier: 'basic',
      ports: [
        {
          label: 'PE-out',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'ac-mains-supply',
      label: '230V AC Mains Supply Block',
      description:
        'Combined 230V AC single-phase supply block featuring Live, Neutral, and Earth terminals.',
      category: 'supply',
      tier: 'basic',
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'PE',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'ac-three-phase-supply',
      label: 'Three-phase AC Supply (L1/L2/L3/N/PE)',
      description:
        'Independent three-phase RMS source with explicit L1, L2, L3 and neutral. Voltage is configured L-N; L-L is √3 times L-N. PE is separate until explicitly bonded. Resistive phasor readings are supported; motor operation and automatic protective clearing remain unassessed.',
      category: 'supply',
      tier: 'basic',
      ports: [
        {
          label: 'L1',
          type: 'live',
        },
        {
          label: 'L2',
          type: 'live',
        },
        {
          label: 'L3',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'PE',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'dc-battery-12v',
      label: '12V DC Deep Cycle Battery',
      description: '12 Volt Direct Current battery storage unit for solar or marine DC circuits.',
      category: 'supply',
      tier: 'pro',
      ports: [
        {
          label: '+12V',
          type: 'live',
        },
        {
          label: '0V',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'solar-pv-panel',
      label: 'Solar PV Array (400W DC)',
      description: 'Photovoltaic solar array generating DC current under ambient sunlight.',
      category: 'supply',
      tier: 'pro',
      ports: [
        {
          label: 'DC+',
          type: 'live',
        },
        {
          label: 'DC-',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'diesel-generator',
      label: 'Standby Diesel Generator (5kVA)',
      description: 'Backup diesel generator supply delivering 230V AC emergency power.',
      category: 'supply',
      tier: 'pro',
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'PE',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'kwh-meter',
      label: 'Electricity Meter (kWh)',
      description:
        'The incoming electricity meter between the utility supply and the consumer unit. A pass-through measuring point on the supply entry.',
      category: 'supply',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'earth-rod',
      label: 'Earth Rod / Electrode',
      description:
        'A ground electrode used for TT earthing arrangements — connects the installation earth to the ground.',
      category: 'supply',
      tier: 'basic',
      ports: [
        {
          label: 'PE',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'junction-box',
      label: 'Junction Box (4-Way)',
      description: 'Circular junction box splitting live wiring into multiple branch outputs.',
      category: 'junction',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out1',
          type: 'live',
        },
        {
          label: 'L-out2',
          type: 'live',
        },
        {
          label: 'L-out3',
          type: 'live',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'terminal-strip',
      label: 'Terminal Strip Block',
      description: 'Barrier screw terminal connector strip for neat multi-wire distribution.',
      category: 'junction',
      tier: 'basic',
      ports: [
        {
          label: 'In1',
          type: 'live',
        },
        {
          label: 'In2',
          type: 'live',
        },
        {
          label: 'Out1',
          type: 'live',
        },
        {
          label: 'Out2',
          type: 'live',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'wago-connector',
      label: 'Wago 221 Lever Connector (3-Way)',
      description: 'Compact 3-conductor quick lever-nut wire connector.',
      category: 'junction',
      tier: 'basic',
      ports: [
        {
          label: 'In',
          type: 'live',
        },
        {
          label: 'Out1',
          type: 'live',
        },
        {
          label: 'Out2',
          type: 'live',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'timer-switch',
      label: 'Mechanical 24h Pin Timer',
      description: '24-hour dial time switch for automatic scheduled switching.',
      category: 'timer',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'digital-weekly-timer',
      label: 'Digital 7-Day Programmable Timer',
      description: 'LCD weekly programmable timer with multiple daily ON/OFF schedule settings.',
      category: 'timer',
      tier: 'pro',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'staircase-timer',
      label: 'Staircase Delay Timer (30s-10m)',
      description:
        'DIN-rail mounted delay timer automatically turning off stairwell or hallway lights after a set interval.',
      category: 'timer',
      tier: 'pro',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'countdown-timer',
      label: 'Digital Countdown Timer Switch',
      description: 'Preset interval timer switch (5m, 15m, 30m, 60m) for ventilation and heaters.',
      category: 'timer',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'delay-timer',
      label: 'Time Delay Relay (On/Off Delay)',
      description:
        'DIN-rail mounted electronic time delay relay for staggered motor startup and control.',
      category: 'timer',
      tier: 'pro',
      ports: [
        {
          label: 'A1',
          type: 'live',
        },
        {
          label: 'A2',
          type: 'neutral',
        },
        {
          label: '15-COM',
          type: 'live',
        },
        {
          label: '18-NO',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'double-gang-switch',
      label: '2-Gang 1-Way Switch',
      description: 'Dual independent rocker switch controlling two separate lighting circuits.',
      category: 'switch',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L1-out',
          type: 'live',
        },
        {
          label: 'L2-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'switched-socket',
      label: 'Single Switched Socket (13A)',
      description: 'Standard 13A wall socket with integrated ON/OFF rocker switch.',
      category: 'socket',
      tier: 'basic',
      powerWatts: 2990,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'E',
          type: 'earth',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'isolator-switch',
      label: 'Rotary Isolator Switch (100A)',
      description:
        'High-current double-pole rotary main isolation switch for safely disconnecting mains power.',
      category: 'protection',
      tier: 'pro',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'transformer-8v',
      label: 'Doorbell Transformer (230V -> 8V AC)',
      description: 'Step-down safety isolating transformer for doorbells and low-voltage chimes.',
      category: 'transformer',
      tier: 'basic',
      powerWatts: 15,
      ports: [
        {
          label: 'L-230V',
          type: 'live',
        },
        {
          label: 'N-230V',
          type: 'neutral',
        },
        {
          label: '8V-A',
          type: 'live',
        },
        {
          label: '8V-B',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'transformer-12v',
      label: 'Low Voltage Transformer (230V -> 12V)',
      description:
        'Step-down power transformer for 12V halogen/LED lighting and electronic controls.',
      category: 'transformer',
      tier: 'basic',
      powerWatts: 60,
      ports: [
        {
          label: 'L-230V',
          type: 'live',
        },
        {
          label: 'N-230V',
          type: 'neutral',
        },
        {
          label: '12V+',
          type: 'live',
        },
        {
          label: '12V-',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'transformer-24v',
      label: 'Industrial Control Transformer (230V -> 24V)',
      description:
        'Heavy-duty 24V AC/DC control circuit transformer for relays, contactors, and automation.',
      category: 'transformer',
      tier: 'pro',
      powerWatts: 100,
      ports: [
        {
          label: 'L-230V',
          type: 'live',
        },
        {
          label: 'N-230V',
          type: 'neutral',
        },
        {
          label: '24V+',
          type: 'live',
        },
        {
          label: '24V-',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'step-up-down-transformer',
      label: 'Step-Up / Step-Down Transformer (110V <-> 230V)',
      description:
        'Bi-directional auto-transformer converting between 110V US and 230V UK/EU voltage levels.',
      category: 'transformer',
      tier: 'pro',
      powerWatts: 1500,
      ports: [
        {
          label: 'In-L',
          type: 'live',
        },
        {
          label: 'In-N',
          type: 'neutral',
        },
        {
          label: 'Out-L',
          type: 'live',
        },
        {
          label: 'Out-N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'relay-spst',
      label: 'SPST Power Relay',
      description:
        'Single Pole Single Throw electromechanical relay with coil drive and NO contact.',
      category: 'relay',
      tier: 'basic',
      ports: [
        {
          label: 'Coil+',
          type: 'live',
        },
        {
          label: 'Coil-',
          type: 'neutral',
        },
        {
          label: 'COM',
          type: 'live',
        },
        {
          label: 'NO',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'relay-spdt',
      label: 'SPDT Changeover Relay',
      description:
        'Single Pole Double Throw relay switching COM terminal between NO and NC outputs.',
      category: 'relay',
      tier: 'basic',
      ports: [
        {
          label: 'Coil+',
          type: 'live',
        },
        {
          label: 'Coil-',
          type: 'neutral',
        },
        {
          label: 'COM',
          type: 'live',
        },
        {
          label: 'NO',
          type: 'live',
        },
        {
          label: 'NC',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'relay-dpdt',
      label: 'DPDT Power Relay',
      description:
        'Double Pole Double Throw relay simultaneously controlling two isolated changeover circuits.',
      category: 'relay',
      tier: 'pro',
      ports: [
        {
          label: 'Coil+',
          type: 'live',
        },
        {
          label: 'Coil-',
          type: 'neutral',
        },
        {
          label: 'C1',
          type: 'live',
        },
        {
          label: 'NO1',
          type: 'live',
        },
        {
          label: 'C2',
          type: 'live',
        },
        {
          label: 'NO2',
          type: 'live',
        },
        {
          label: 'NC1',
          type: 'live',
        },
        {
          label: 'NC2',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'control-relay',
      label: 'Industrial 8-Pin Control Relay',
      description:
        'Octal 8-pin plug-in control relay with LED status indicator for panel automation.',
      category: 'relay',
      tier: 'pro',
      ports: [
        {
          label: 'A1',
          type: 'live',
        },
        {
          label: 'A2',
          type: 'neutral',
        },
        {
          label: '11-COM',
          type: 'live',
        },
        {
          label: '14-NO',
          type: 'live',
        },
        {
          label: '12-NC',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'contactor-1p',
      label: 'Single-Pole Contactor (1P 25A)',
      description: '1-Pole AC contactor for switching single-phase heating or lighting loads.',
      category: 'contactor',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
        {
          label: 'A1',
          type: 'live',
        },
        {
          label: 'A2',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'contactor-2p',
      label: 'Double-Pole Contactor (2P 25A)',
      description: '2-Pole AC power contactor switching both Live and Neutral simultaneously.',
      category: 'contactor',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L-out',
          type: 'live',
        },
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'contactor-3p',
      label: 'Three-Pole Contactor (3P 40A)',
      description:
        'Heavy-duty 3-pole contactor for 3-phase motor starters and heavy inductive loads.',
      category: 'contactor',
      tier: 'pro',
      ports: [
        {
          label: 'L1',
          type: 'live',
        },
        {
          label: 'L2',
          type: 'live',
        },
        {
          label: 'L3',
          type: 'live',
        },
        {
          label: 'T1',
          type: 'live',
        },
        {
          label: 'T2',
          type: 'live',
        },
        {
          label: 'T3',
          type: 'live',
        },
        {
          label: 'A1',
          type: 'live',
        },
        {
          label: 'A2',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'contactor-4p',
      label: 'Four-Pole Contactor (4P 63A)',
      description:
        '4-Pole power contactor for 3-phase + neutral mains changeover and generator transfer.',
      category: 'contactor',
      tier: 'pro',
      ports: [
        {
          label: 'L1',
          type: 'live',
        },
        {
          label: 'L2',
          type: 'live',
        },
        {
          label: 'L3',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'T1',
          type: 'live',
        },
        {
          label: 'T2',
          type: 'live',
        },
        {
          label: 'T3',
          type: 'live',
        },
        {
          label: 'N-out',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'room-thermostat',
      label: 'Mechanical Room Thermostat',
      description: 'Bimetallic dial room thermostat for simple ambient heating control.',
      category: 'thermostat',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'L-out',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'heating-thermostat',
      label: 'Underfloor Heating Thermostat',
      description: 'Programmable floor temperature sensor thermostat for radiant heating mats.',
      category: 'thermostat',
      tier: 'pro',
      powerWatts: 3000,
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'Load-L',
          type: 'live',
        },
        {
          label: 'Load-N',
          type: 'neutral',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'temperature-sensor',
      label: 'NTC Temperature Sensor Probe',
      description: 'Precision temperature sensor transmitting analog thermal resistance signals.',
      category: 'sensor',
      tier: 'basic',
      ports: [
        {
          label: 'T1',
          type: 'live',
        },
        {
          label: 'T2',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'door-sensor',
      label: 'Magnetic Door / Window Contact',
      description: 'Reed switch contact sensor detecting door opening for security and lighting.',
      category: 'sensor',
      tier: 'basic',
      ports: [
        {
          label: 'C1',
          type: 'live',
        },
        {
          label: 'C2',
          type: 'live',
        },
      ],
      isSwitch: true,
      isLoad: false,
    },
    {
      type: 'electric-buzzer',
      label: 'Panel Electric Buzzer (90dB)',
      description: 'High-pitch continuous acoustic warning buzzer for control panels.',
      category: 'sounder',
      tier: 'basic',
      powerWatts: 5,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'wireless-doorbell',
      label: 'Wireless Doorbell Chime Receiver',
      description: 'Mains plug-in wireless doorbell chime unit with selectable ringtones.',
      category: 'sounder',
      tier: 'basic',
      powerWatts: 8,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'alarm-siren',
      label: 'High-Output Security Alarm Siren',
      description: 'Dual-tone 110dB emergency acoustic alarm siren.',
      category: 'sounder',
      tier: 'pro',
      powerWatts: 25,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'smoke-alarm',
      label: 'Smoke / Heat / CO Alarm',
      description:
        'Interlinked mains smoke, heat and carbon-monoxide detector on a dedicated safety circuit (BS 5839-6 Grade D).',
      category: 'sounder',
      tier: 'basic',
      powerWatts: 2,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'burglar-alarm',
      label: 'Burglar Alarm Panel',
      description: 'Intruder alarm control panel with perimeter detectors on a dedicated circuit.',
      category: 'sounder',
      tier: 'pro',
      powerWatts: 20,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'motor-3phase',
      label: '3-Phase AC Induction Motor (3kW / 4HP)',
      description: 'Heavy industrial 3-phase asynchronous squirrel-cage motor for machinery.',
      category: 'motor',
      tier: 'pro',
      powerWatts: 3000,
      ports: [
        {
          label: 'U',
          type: 'live',
        },
        {
          label: 'V',
          type: 'live',
        },
        {
          label: 'W',
          type: 'live',
        },
        {
          label: 'PE',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'water-pump',
      label: 'Electric Water Pump (1.1kW / 1.5HP)',
      description: 'Centrifugal motor pump for domestic water supply and drainage.',
      category: 'motor',
      tier: 'basic',
      powerWatts: 1100,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
        {
          label: 'PE',
          type: 'earth',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'heating-element',
      label: 'Tubular Resistance Heating Element (1.5kW)',
      description: 'Direct heating element for industrial ovens and water heating.',
      category: 'heater',
      tier: 'basic',
      powerWatts: 1500,
      ports: [
        {
          label: 'L',
          type: 'live',
        },
        {
          label: 'N',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: true,
    },
    {
      type: 'distribution-box',
      label: '1-Phase Sub-Distribution Box (8-Way)',
      description: 'Compact single-phase 8-way consumer unit enclosure for room sub-circuits.',
      category: 'distribution',
      tier: 'basic',
      ports: [
        {
          label: 'L-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L1',
          type: 'live',
        },
        {
          label: 'L2',
          type: 'live',
        },
        {
          label: 'N1',
          type: 'neutral',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
    {
      type: 'distribution-board-3phase',
      label: '3-Phase TPN Distribution Board',
      description: 'Industrial 3-Phase, Neutral and Earth (TP&N) main distribution unit.',
      category: 'distribution',
      tier: 'pro',
      ports: [
        {
          label: 'L1-in',
          type: 'live',
        },
        {
          label: 'L2-in',
          type: 'live',
        },
        {
          label: 'L3-in',
          type: 'live',
        },
        {
          label: 'N-in',
          type: 'neutral',
        },
        {
          label: 'L1-out',
          type: 'live',
        },
        {
          label: 'L2-out',
          type: 'live',
        },
        {
          label: 'L3-out',
          type: 'live',
        },
      ],
      isSwitch: false,
      isLoad: false,
    },
  ],
  variants: {
    bulb: [
      'bulb',
      'bulb-incandescent',
      'bulb-halogen',
      'bulb-cfl',
      'bulb-smart-rgb',
      'led-downlight',
      'tube-light',
    ],
    'bulb-incandescent': [
      'bulb',
      'bulb-incandescent',
      'bulb-halogen',
      'bulb-cfl',
      'bulb-smart-rgb',
      'led-downlight',
      'tube-light',
    ],
    'bulb-halogen': [
      'bulb',
      'bulb-incandescent',
      'bulb-halogen',
      'bulb-cfl',
      'bulb-smart-rgb',
      'led-downlight',
      'tube-light',
    ],
    'bulb-cfl': [
      'bulb',
      'bulb-incandescent',
      'bulb-halogen',
      'bulb-cfl',
      'bulb-smart-rgb',
      'led-downlight',
      'tube-light',
    ],
    'bulb-smart-rgb': [
      'bulb',
      'bulb-incandescent',
      'bulb-halogen',
      'bulb-cfl',
      'bulb-smart-rgb',
      'led-downlight',
      'tube-light',
    ],
    'led-downlight': [
      'bulb',
      'bulb-incandescent',
      'bulb-halogen',
      'bulb-cfl',
      'bulb-smart-rgb',
      'led-downlight',
      'tube-light',
    ],
    'tube-light': [
      'bulb',
      'bulb-incandescent',
      'bulb-halogen',
      'bulb-cfl',
      'bulb-smart-rgb',
      'led-downlight',
      'tube-light',
    ],
    mcb: [
      'mcb',
      'mcb-type-c',
      'mcb-type-d',
      'mccb',
      'rcd',
      'rcbo',
      'fuse',
      'spd',
      'isolator-switch',
    ],
    'mcb-type-c': [
      'mcb',
      'mcb-type-c',
      'mcb-type-d',
      'mccb',
      'rcd',
      'rcbo',
      'fuse',
      'spd',
      'isolator-switch',
    ],
    'mcb-type-d': [
      'mcb',
      'mcb-type-c',
      'mcb-type-d',
      'mccb',
      'rcd',
      'rcbo',
      'fuse',
      'spd',
      'isolator-switch',
    ],
    mccb: [
      'mcb',
      'mcb-type-c',
      'mcb-type-d',
      'mccb',
      'rcd',
      'rcbo',
      'fuse',
      'spd',
      'isolator-switch',
    ],
    rcd: [
      'mcb',
      'mcb-type-c',
      'mcb-type-d',
      'mccb',
      'rcd',
      'rcbo',
      'fuse',
      'spd',
      'isolator-switch',
    ],
    rcbo: [
      'mcb',
      'mcb-type-c',
      'mcb-type-d',
      'mccb',
      'rcd',
      'rcbo',
      'fuse',
      'spd',
      'isolator-switch',
    ],
    fuse: [
      'mcb',
      'mcb-type-c',
      'mcb-type-d',
      'mccb',
      'rcd',
      'rcbo',
      'fuse',
      'spd',
      'isolator-switch',
    ],
    spd: [
      'mcb',
      'mcb-type-c',
      'mcb-type-d',
      'mccb',
      'rcd',
      'rcbo',
      'fuse',
      'spd',
      'isolator-switch',
    ],
    'isolator-switch': [
      'mcb',
      'mcb-type-c',
      'mcb-type-d',
      'mccb',
      'rcd',
      'rcbo',
      'fuse',
      'spd',
      'isolator-switch',
    ],
    'socket-2pin': [
      'socket-2pin',
      'socket-3pin',
      'double-socket',
      'switched-socket',
      'socket-usb',
      'socket-gfci',
      'socket-industrial',
    ],
    'socket-3pin': [
      'socket-2pin',
      'socket-3pin',
      'double-socket',
      'switched-socket',
      'socket-usb',
      'socket-gfci',
      'socket-industrial',
    ],
    'double-socket': [
      'socket-2pin',
      'socket-3pin',
      'double-socket',
      'switched-socket',
      'socket-usb',
      'socket-gfci',
      'socket-industrial',
    ],
    'switched-socket': [
      'socket-2pin',
      'socket-3pin',
      'double-socket',
      'switched-socket',
      'socket-usb',
      'socket-gfci',
      'socket-industrial',
    ],
    'socket-usb': [
      'socket-2pin',
      'socket-3pin',
      'double-socket',
      'switched-socket',
      'socket-usb',
      'socket-gfci',
      'socket-industrial',
    ],
    'socket-gfci': [
      'socket-2pin',
      'socket-3pin',
      'double-socket',
      'switched-socket',
      'socket-usb',
      'socket-gfci',
      'socket-industrial',
    ],
    'socket-industrial': [
      'socket-2pin',
      'socket-3pin',
      'double-socket',
      'switched-socket',
      'socket-usb',
      'socket-gfci',
      'socket-industrial',
    ],
    'single-way-switch': [
      'single-way-switch',
      'two-way-switch',
      'intermediate-switch',
      'double-pole-switch',
      'double-gang-switch',
      'push-button',
      'rotary-selector-switch',
      'cooker-unit',
      'fused-spur',
    ],
    'two-way-switch': [
      'single-way-switch',
      'two-way-switch',
      'intermediate-switch',
      'double-pole-switch',
      'double-gang-switch',
      'push-button',
      'rotary-selector-switch',
      'cooker-unit',
      'fused-spur',
    ],
    'intermediate-switch': [
      'single-way-switch',
      'two-way-switch',
      'intermediate-switch',
      'double-pole-switch',
      'double-gang-switch',
      'push-button',
      'rotary-selector-switch',
      'cooker-unit',
      'fused-spur',
    ],
    'double-pole-switch': [
      'single-way-switch',
      'two-way-switch',
      'intermediate-switch',
      'double-pole-switch',
      'double-gang-switch',
      'push-button',
      'rotary-selector-switch',
      'cooker-unit',
      'fused-spur',
    ],
    'double-gang-switch': [
      'single-way-switch',
      'two-way-switch',
      'intermediate-switch',
      'double-pole-switch',
      'double-gang-switch',
      'push-button',
      'rotary-selector-switch',
      'cooker-unit',
      'fused-spur',
    ],
    'push-button': [
      'single-way-switch',
      'two-way-switch',
      'intermediate-switch',
      'double-pole-switch',
      'double-gang-switch',
      'push-button',
      'rotary-selector-switch',
      'cooker-unit',
      'fused-spur',
    ],
    'rotary-selector-switch': [
      'single-way-switch',
      'two-way-switch',
      'intermediate-switch',
      'double-pole-switch',
      'double-gang-switch',
      'push-button',
      'rotary-selector-switch',
      'cooker-unit',
      'fused-spur',
    ],
    'cooker-unit': [
      'single-way-switch',
      'two-way-switch',
      'intermediate-switch',
      'double-pole-switch',
      'double-gang-switch',
      'push-button',
      'rotary-selector-switch',
      'cooker-unit',
      'fused-spur',
    ],
    'fused-spur': [
      'single-way-switch',
      'two-way-switch',
      'intermediate-switch',
      'double-pole-switch',
      'double-gang-switch',
      'push-button',
      'rotary-selector-switch',
      'cooker-unit',
      'fused-spur',
    ],
    'transformer-8v': [
      'transformer-8v',
      'transformer-12v',
      'transformer-24v',
      'step-up-down-transformer',
    ],
    'transformer-12v': [
      'transformer-8v',
      'transformer-12v',
      'transformer-24v',
      'step-up-down-transformer',
    ],
    'transformer-24v': [
      'transformer-8v',
      'transformer-12v',
      'transformer-24v',
      'step-up-down-transformer',
    ],
    'step-up-down-transformer': [
      'transformer-8v',
      'transformer-12v',
      'transformer-24v',
      'step-up-down-transformer',
    ],
    'relay-spst': ['relay-spst', 'relay-spdt', 'relay-dpdt', 'control-relay', 'smart-relay'],
    'relay-spdt': ['relay-spst', 'relay-spdt', 'relay-dpdt', 'control-relay', 'smart-relay'],
    'relay-dpdt': ['relay-spst', 'relay-spdt', 'relay-dpdt', 'control-relay', 'smart-relay'],
    'control-relay': ['relay-spst', 'relay-spdt', 'relay-dpdt', 'control-relay', 'smart-relay'],
    'smart-relay': ['relay-spst', 'relay-spdt', 'relay-dpdt', 'control-relay', 'smart-relay'],
    contactor: ['contactor-1p', 'contactor-2p', 'contactor-3p', 'contactor-4p'],
    'contactor-1p': ['contactor-1p', 'contactor-2p', 'contactor-3p', 'contactor-4p'],
    'contactor-2p': ['contactor-1p', 'contactor-2p', 'contactor-3p', 'contactor-4p'],
    'contactor-3p': ['contactor-1p', 'contactor-2p', 'contactor-3p', 'contactor-4p'],
    'contactor-4p': ['contactor-1p', 'contactor-2p', 'contactor-3p', 'contactor-4p'],
    'ceiling-fan': ['ceiling-fan', 'extractor-fan', 'industrial-exhaust-fan', 'table-fan'],
    'extractor-fan': ['ceiling-fan', 'extractor-fan', 'industrial-exhaust-fan', 'table-fan'],
    'industrial-exhaust-fan': [
      'ceiling-fan',
      'extractor-fan',
      'industrial-exhaust-fan',
      'table-fan',
    ],
    'table-fan': ['ceiling-fan', 'extractor-fan', 'industrial-exhaust-fan', 'table-fan'],
    'timer-switch': [
      'timer-switch',
      'digital-weekly-timer',
      'staircase-timer',
      'countdown-timer',
      'delay-timer',
    ],
    'digital-weekly-timer': [
      'timer-switch',
      'digital-weekly-timer',
      'staircase-timer',
      'countdown-timer',
      'delay-timer',
    ],
    'staircase-timer': [
      'timer-switch',
      'digital-weekly-timer',
      'staircase-timer',
      'countdown-timer',
      'delay-timer',
    ],
    'countdown-timer': [
      'timer-switch',
      'digital-weekly-timer',
      'staircase-timer',
      'countdown-timer',
      'delay-timer',
    ],
    'delay-timer': [
      'timer-switch',
      'digital-weekly-timer',
      'staircase-timer',
      'countdown-timer',
      'delay-timer',
    ],
    thermostat: ['thermostat', 'room-thermostat', 'heating-thermostat'],
    'room-thermostat': ['thermostat', 'room-thermostat', 'heating-thermostat'],
    'heating-thermostat': ['thermostat', 'room-thermostat', 'heating-thermostat'],
    'pir-sensor': ['pir-sensor', 'photocell-sensor', 'temperature-sensor', 'door-sensor'],
    'photocell-sensor': ['pir-sensor', 'photocell-sensor', 'temperature-sensor', 'door-sensor'],
    'temperature-sensor': ['pir-sensor', 'photocell-sensor', 'temperature-sensor', 'door-sensor'],
    'door-sensor': ['pir-sensor', 'photocell-sensor', 'temperature-sensor', 'door-sensor'],
    bell: ['bell', 'electric-buzzer', 'wireless-doorbell', 'alarm-siren'],
    'electric-buzzer': ['bell', 'electric-buzzer', 'wireless-doorbell', 'alarm-siren'],
    'wireless-doorbell': ['bell', 'electric-buzzer', 'wireless-doorbell', 'alarm-siren'],
    'alarm-siren': ['bell', 'electric-buzzer', 'wireless-doorbell', 'alarm-siren'],
    motor: ['motor', 'motor-3phase', 'water-pump'],
    'motor-3phase': ['motor', 'motor-3phase', 'water-pump'],
    'water-pump': ['motor', 'motor-3phase', 'water-pump'],
    'space-heater': ['space-heater', 'water-heater', 'heating-element'],
    'water-heater': ['space-heater', 'water-heater', 'heating-element'],
    'heating-element': ['space-heater', 'water-heater', 'heating-element'],
    'distribution-board': ['distribution-board', 'distribution-box', 'distribution-board-3phase'],
    'distribution-box': ['distribution-board', 'distribution-box', 'distribution-board-3phase'],
    'distribution-board-3phase': [
      'distribution-board',
      'distribution-box',
      'distribution-board-3phase',
    ],
  },
  photos: {
    bulb: 'bulb_led_a60_1786782205960.jpg',
    'bulb-incandescent': 'bulb_incandescent_edison_1786782216775.jpg',
    'bulb-halogen': 'bulb_halogen_gu10_1786782231855.jpg',
    'bulb-cfl': 'bulb_cfl_spiral_1786782245054.jpg',
    'bulb-smart-rgb': 'bulb_smart_rgb_1786782258296.jpg',
    'led-downlight': 'bulb_led_downlight_1786782271149.jpg',
    'tube-light': 'bulb_tube_light_1786782285212.jpg',
    mcb: 'component_mcb_breaker_1786248947812.jpg',
    'mcb-type-c': 'variant_mcb_type_c_1786780544186.jpg',
    'mcb-type-d': 'variant_mcb_type_d_1786780651637.jpg',
    mccb: 'variant_mccb_industrial_1786780558864.jpg',
    rcd: 'component_rcd_switch_1786249000503.jpg',
    rcbo: 'variant_rcbo_breaker_1786780527368.jpg',
    fuse: 'variant_rcbo_breaker_1786780527368.jpg',
    spd: 'variant_spd_surge_1786780572651.jpg',
    'distribution-board': 'dist_board_3p_1786522082960.jpg',
    'single-way-switch': 'component_light_switch_1786249016724.jpg',
    'two-way-switch': 'component_light_switch_1786249016724.jpg',
    'intermediate-switch': 'component_light_switch_1786249016724.jpg',
    'double-pole-switch': 'variant_cooker_switch_1786780613299.jpg',
    'cooker-unit': 'variant_cooker_switch_1786780613299.jpg',
    'push-button': 'component_light_switch_1786249016724.jpg',
    'rotary-selector-switch': 'variant_dimmer_switch_1786780625706.jpg',
    contactor: 'contactor_3p_1786522064198.jpg',
    'fused-spur': 'component_light_switch_1786249016724.jpg',
    'socket-2pin': 'component_socket_outlet_1786248985392.jpg',
    'socket-3pin': 'component_socket_outlet_1786248985392.jpg',
    'double-socket': 'component_socket_outlet_1786248985392.jpg',
    'socket-usb': 'variant_socket_usb_1786780587870.jpg',
    'socket-gfci': 'variant_socket_gfci_1786780599469.jpg',
    'socket-industrial': 'component_socket_outlet_1786248985392.jpg',
    'switched-socket': 'component_socket_outlet_1786248985392.jpg',
    'ceiling-fan': 'variant_ceiling_fan.png',
    'extractor-fan': 'variant_extractor_fan.png',
    'industrial-exhaust-fan': 'variant_industrial_exhaust_fan.png',
    'table-fan': 'variant_table_fan.png',
    'dimmer-switch': 'variant_dimmer_switch_1786780625706.jpg',
    'fan-dimmer': 'variant_dimmer_switch_1786780625706.jpg',
    'pir-sensor': 'variant_pir_sensor_1786780637436.jpg',
    thermostat: 'variant_dimmer_switch_1786780625706.jpg',
    'photocell-sensor': 'variant_pir_sensor_1786780637436.jpg',
    'smart-relay': 'relay_module_1786522047102.jpg',
    'live-terminal': 'dist_board_3p_1786522082960.jpg',
    'neutral-terminal': 'dist_board_3p_1786522082960.jpg',
    'earth-terminal': 'dist_board_3p_1786522082960.jpg',
    'ac-mains-supply': 'dist_board_3p_1786522082960.jpg',
    'dc-battery-12v': 'transformer_24v_1786522030718.jpg',
    'solar-pv-panel': 'solar_panel_pv_1786333628876.jpg',
    'diesel-generator': 'variant_motor.png',
    bell: 'component_water_heater_1786249033522.jpg',
    'water-heater': 'component_water_heater_1786249033522.jpg',
    'space-heater': 'component_water_heater_1786249033522.jpg',
    'air-conditioner': 'component_water_heater_1786249033522.jpg',
    'induction-hob': 'variant_cooker_switch_1786780613299.jpg',
    'ev-charger': 'ev_charger_station_1786333648320.jpg',
    motor: 'variant_motor.png',
    'motor-3phase': 'variant_motor.png',
    'water-pump': 'variant_motor.png',
    'heating-element': 'component_water_heater_1786249033522.jpg',
    'alarm-siren': 'variant_pir_sensor_1786780637436.jpg',
    'transformer-8v': 'transformer_24v_1786522030718.jpg',
    'transformer-12v': 'transformer_24v_1786522030718.jpg',
    'transformer-24v': 'transformer_24v_1786522030718.jpg',
    'step-up-down-transformer': 'transformer_24v_1786522030718.jpg',
    'relay-spst': 'relay_module_1786522047102.jpg',
    'relay-spdt': 'relay_module_1786522047102.jpg',
    'relay-dpdt': 'relay_module_1786522047102.jpg',
    'control-relay': 'relay_module_1786522047102.jpg',
    'contactor-1p': 'contactor_3p_1786522064198.jpg',
    'contactor-2p': 'contactor_3p_1786522064198.jpg',
    'contactor-3p': 'contactor_3p_1786522064198.jpg',
    'contactor-4p': 'contactor_3p_1786522064198.jpg',
    'distribution-box': 'dist_board_3p_1786522082960.jpg',
    'distribution-board-3phase': 'dist_board_3p_1786522082960.jpg',
    'junction-box': 'dist_board_3p_1786522082960.jpg',
    'terminal-strip': 'dist_board_3p_1786522082960.jpg',
    'wago-connector': 'dist_board_3p_1786522082960.jpg',
    'timer-switch': 'variant_dimmer_switch_1786780625706.jpg',
    'digital-weekly-timer': 'variant_dimmer_switch_1786780625706.jpg',
    'staircase-timer': 'variant_dimmer_switch_1786780625706.jpg',
  },
};
