export interface HistoricalSource {
  id: string;
  organization: string;
  title: string;
  url: string;
  accessedDate: string;
  objectNumber?: string;
  notes: string;
}

export const LIGHT_EXPLORER_SOURCES: Record<string, HistoricalSource> = {
  'smithsonian-1879-lamp': {
    id: 'smithsonian-1879-lamp',
    organization: 'Smithsonian Institution — National Museum of American History',
    title: "Edison 'New Year's Eve' Demonstration Incandescent Lamp (1879)",
    url: 'https://americanhistory.si.edu/collections/object/nmah_704361',
    objectNumber: 'NMAH_704361 / Catalog #995925',
    accessedDate: '2026-08-29',
    notes:
      'Documents the surviving 1879 New Year’s Eve demonstration lamp used at Menlo Park. Specifies pear-shaped glass envelope, top glass exhaust tip from vacuum pump sealing, glass stem, horseshoe carbon filament, small platinum clamps, platinum lead-in wires, wooden collar neck with dual flat brass contact plates, and the historical absence of a modern screw base.',
  },
  'rutgers-edison-papers': {
    id: 'rutgers-edison-papers',
    organization: 'Rutgers University — Thomas Edison Papers Project',
    title: 'The Carbon-Filament Lamp & Menlo Park Laboratory Notebooks (Oct 22, 1879)',
    url: 'https://edison.rutgers.edu/life-of-edison/biographical-essays/lighting/the-carbon-filament-lamp',
    accessedDate: '2026-08-29',
    notes:
      'Provides primary notebook accounts of the breakthrough October 22, 1879 carbonized cotton thread experiment, recording initial cold resistance of ~113 Ω and operational hot resistance of ~140 Ω in high vacuum.',
  },
  'nps-beehives': {
    id: 'nps-beehives',
    organization: 'National Park Service — Edison National Historical Site',
    title: 'Beehives of Invention: Edison Menlo Park Historical Handbook',
    url: 'https://www.nps.gov/parkhistory/online_books/hh/edis/edisc2.htm',
    accessedDate: '2026-08-29',
    notes:
      'Documents the historical 8-step manufacturing sequence at Menlo Park, including platinum-glass fusion, thread carbonization in molds, Sprengel mercury pump evacuation, flame tip sealing, and life testing.',
  },
  'doe-history': {
    id: 'doe-history',
    organization: 'U.S. Department of Energy',
    title: 'The History of the Light Bulb: From Precursors to Practical Systems',
    url: 'https://www.energy.gov/articles/history-light-bulb',
    accessedDate: '2026-08-29',
    notes:
      'Authoritative historical overview establishing that electric lighting emerged through continuous contributions by multiple inventors (Kinnersley, De la Rue, Swan, Edison), with Edison providing the high-resistance filament, high vacuum, and parallel commercial distribution system.',
  },
  'smithsonian-lighting-revolution': {
    id: 'smithsonian-lighting-revolution',
    organization: 'Smithsonian Institution',
    title: 'Lighting a Revolution: 19th and 20th Century Electrical Inventions',
    url: 'https://americanhistory.si.edu/lighting/19thcent/invent19.htm',
    accessedDate: '2026-08-29',
    notes:
      'Contextualizes the transition from early carbon filaments to tungsten wire, gas-filled bulbs, linear fluorescent lamps, compact fluorescents, and solid-state LEDs.',
  },
};
