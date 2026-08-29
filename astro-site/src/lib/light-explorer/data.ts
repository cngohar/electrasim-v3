/** Evidence-backed metadata for the single hero object in Light Explorer. */
export const LAMP_COMPONENTS = [
  { id: 'glass-envelope', name: 'Glass envelope', role: 'Maintains the evacuated space around the filament.', evidence: 'Documented Smithsonian object record', mode: 'reconstructed' },
  { id: 'glass-tip', name: 'Glass tip', role: 'Manufacturing tip used to connect the bulb to a vacuum pump before sealing.', evidence: 'Documented Smithsonian object record', mode: 'historical' },
  { id: 'glass-stem', name: 'Glass stem', role: 'Carries and supports the lead wires through the envelope.', evidence: 'Documented construction descriptions', mode: 'reconstructed' },
  { id: 'carbon-filament', name: 'Carbon filament', role: 'Carbonized thread that becomes incandescent when current passes through it.', evidence: 'Rutgers Edison Papers', mode: 'historical' },
  { id: 'platinum-clamps', name: 'Platinum clamps and wires', role: 'High-temperature connections between the filament and copper leads.', evidence: 'Documented Smithsonian object record', mode: 'historical' },
  { id: 'contact-plates', name: 'Copper contact plates', role: 'External electrical contacts around the lower neck; not a screw base.', evidence: 'Documented Smithsonian object record', mode: 'historical' },
] as const;

export const BUILD_STEPS = [
  { id: 'contacts', label: 'CONNECT', caption: 'Copper wires + platinum sections' },
  { id: 'stem', label: 'FORM', caption: 'Glass stem blown around the wires' },
  { id: 'carbonize', label: 'CARBONIZE', caption: 'Cotton thread becomes carbon filament' },
  { id: 'mount', label: 'MOUNT', caption: 'Filament fixed to platinum clamps' },
  { id: 'envelope', label: 'FIT', caption: 'Glass envelope fitted around assembly' },
  { id: 'vacuum', label: 'EVACUATE', caption: 'Air removed through the top glass tip' },
  { id: 'seal', label: 'SEAL', caption: 'Tip sealed; lamp ready for life test' },
] as const;

export const SOURCES = {
  smithsonian: 'https://www.si.edu/object/edison-new-years-eve-lamp:nmah_995925',
  rutgers: 'https://edison.rutgers.edu/life-of-edison/biographical-essays/lighting/the-carbon-filament-lamp',
  nps: 'https://www.nps.gov/parkhistory/online_books/hh/edis/edisc2.htm',
} as const;
