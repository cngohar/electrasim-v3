export type ContentCard = {
  icon: string;
  title: string;
  body: string;
};

export type StatSpec = {
  value: string;
  unit: string;
  note: string;
};

export type ModeSpec = {
  ref: string;
  rating: string;
  title: string;
  body: string;
  points: string[];
};

export type LandingPage = {
  seo_title: string;
  seo_description: string;
  hero_badge: string;
  hero_heading: string;
  hero_heading_highlight: string;
  hero_description: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  hero_trust_items: string[];
  stats_label: string;
  stats: StatSpec[];
  modes_label: string;
  modes_heading: string;
  modes_description: string;
  modes: ModeSpec[];
  features_label: string;
  features_heading: string;
  features_description: string;
  features: ContentCard[];
  how_label: string;
  how_heading: string;
  how_description: string;
  steps: Pick<ContentCard, 'title' | 'body'>[];
  usecases_label: string;
  usecases_heading: string;
  usecases_description: string;
  use_cases: ContentCard[];
  blog_label: string;
  blog_heading: string;
  blog_description: string;
  cta_heading: string;
  cta_description: string;
  cta_button: string;
};

export type GuideCircuit = {
  id: string;
  step: string;
  title: string;
  level: string;
  description: string;
  components: string[];
  diagram: string;
  steps: string[];
  insight: string;
  /** In-app guided circuit id — the "Build this circuit" button deep-links
   *  to /app/?template=<id> when the walkthrough matches a built-in guide. */
  app_template?: string;
};

export type GuideFeature = ContentCard;

export type GuidedTemplate = {
  /** In-app guided circuit id — used to deep-link /app/?template=<id>. */
  id: string;
  title: string;
  level: string;
  body: string;
};
