/**
 * Component help content — shared data shape.
 *
 * Split verbatim from the former monolithic `componentHelp.ts`.
 */

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
   * Slug of the matching ElectraSim blog article (e.g.
   * `what-is-an-rcbo-difference-between-rcd-mcb-rcbo`). When present, the
   * component info modal renders a "Read the full guide" link to
   * `/blog/<slug>/` so learners can jump from the specs to the long-form
   * article on the marketing site.
   */
  learnMoreSlug?: string;
}
