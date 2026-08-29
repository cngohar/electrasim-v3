export interface HistoricalDocument {
  id: string;
  date: string;
  title: string;
  location: string;
  primaryAuthor: string;
  transcription: string;
  historicalContext: string;
  documentedData: Record<string, string>;
  sourceId: string;
}

export const HISTORICAL_DOCUMENTS: Record<string, HistoricalDocument> = {
  'oct-22-1879-notebook': {
    id: 'oct-22-1879-notebook',
    date: 'October 22, 1879',
    title: 'Menlo Park Laboratory Notebook — Carbonized Cotton Thread Experiment',
    location: 'Menlo Park Laboratory, New Jersey',
    primaryAuthor: 'Charles Batchelor & Thomas A. Edison',
    transcription:
      '“A carbonized cotton thread No. 90 was mounted on platinum clamps and placed in bulb. The air was exhausted on mercury pump for 4 hours. Connected to battery circuit: cold resistance measured at 113 ohms. Under current, resistance rose to approximately 140 ohms. Light produced approx. half candle power, increasing steadily without fracture. Maintained light through the night until current was increased to test limit.”',
    historicalContext:
      'This notebook entry represents the turning point in the Menlo Park lighting project. The recorded starting resistance of 113 ohms and operational hot resistance of ~140 ohms confirmed Edison’s theoretical calculations: high resistance permitted long-distance parallel distribution without requiring massive, expensive copper conductors.',
    documentedData: {
      'Filament Material': 'Carbonized Cotton Sewing Thread (No. 90)',
      'Cold Resistance': '113 Ω (Primary Documented Value)',
      'Hot Resistance': '~140 Ω (Documented Operational State)',
      'Vacuum Type': 'Sprengel Mercury Fall Pump (4+ hours evacuation)',
      'Initial Output': '~0.5 Candlepower (low test voltage)',
      'Observed Result': 'Continuous stable incandescence without rapid disintegration',
    },
    sourceId: 'rutgers-edison-papers',
  },
  'dec-31-1879-demonstration': {
    id: 'dec-31-1879-demonstration',
    date: 'December 31, 1879',
    title: 'Menlo Park Public New Year’s Eve Demonstration',
    location: 'Menlo Park, New Jersey (Laboratory Compound & Boarded Walks)',
    primaryAuthor: 'Thomas A. Edison & Menlo Park Staff',
    transcription:
      '“On New Year’s Eve, 1879, the Pennsylvania Railroad ran special excursion trains from New York and Philadelphia carrying over three thousand visitors to Menlo Park. Approximately seventy incandescent lamps illuminated the laboratory building, office, and surrounding grounds, powered by a central dynamo in the machine shop.”',
    historicalContext:
      'The Smithsonian Institution object (NMAH_704361) was one of the actual demonstration lamps displayed during this historic event. It proved to the world that electrical lighting was safe, pleasant, steady, and capable of being independently switched on and off across a unified circuit.',
    documentedData: {
      'Lamps Deployed': '~70 Carbon-Filament Demonstration Lamps',
      'Power Source': 'Edison Bi-Polar Dynamo (Central Machine Shop)',
      Distribution: 'Underground parallel wiring loop with safety cutouts',
      Attendance: 'Over 3,000 scientists, journalists, and public citizens',
      'Lamp Design': 'Pear-shaped glass bulb, top exhaust tip pip, wooden collar contact base',
    },
    sourceId: 'smithsonian-1879-lamp',
  },
};
