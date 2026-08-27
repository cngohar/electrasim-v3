/**
 * Component help content — shared data shape.
 *
 * Split verbatim from the former monolithic `componentHelp.ts`.
 */

export interface TerminalPinoutItem {
  terminal: string;
  role: 'live' | 'neutral' | 'earth' | 'control' | 'switched' | 'dc';
  description: string;
}

export interface RegulationClauseItem {
  standard: string;
  clause: string;
  title: string;
  requirement: string;
}

export interface ComponentHelpData {
  title: string;
  category?: string;
  voltage?: string;
  amperage?: string;
  powerWatts?: string | number;
  breakingCapacity?: string;
  tripCurve?: string;
  frequency?: string;
  ipRating?: string;
  cableSize?: string;
  poles?: string;
  standards: string;
  overview: string;
  circuitBehavior: string;
  keySpecs: string[];
  quickTips: string[];
  /**
   * Slug of the matching ElectraSim blog article.
   */
  learnMoreSlug?: string;
  /**
   * Hardware terminal markings, wiring roles, and terminal block details.
   */
  terminalPinout?: TerminalPinoutItem[];
  /**
   * Statutory regulations, code clauses, and standard rules (BS 7671, NEC, IEC).
   */
  regulationClauses?: RegulationClauseItem[];
  /**
   * Real-world commercial and domestic applications.
   */
  realWorldApplications?: string[];
}
