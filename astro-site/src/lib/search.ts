import { circuitSlug } from './guide';
import type { ToolEntry } from './tools/registry';

export interface SearchItem {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'tool' | 'article' | 'guide' | 'page' | 'update' | 'term';
  category: string;
  tags: string[];
}

export interface RawBlogPost {
  id: string;
  data: {
    title: string;
    description: string;
    category?: string;
    tags?: string[];
  };
}

export interface RawGuideCircuit {
  id: string;
  title: string;
  description: string;
  level?: string;
}

export interface RawGuideTool {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  parts: string[];
}

export interface RawGuideComponent {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  terminals: string[];
}

export interface RawGlossaryTerm {
  slug: string;
  term: string;
  expansion?: string;
  definition: string;
  category: string;
  aliases?: string[];
}

export interface RawUpdatePost {
  id: string;
  data: {
    title: string;
    description: string;
    version?: string;
    tags?: string[];
  };
}

export const CORE_PAGES: SearchItem[] = [
  {
    id: 'page-explore',
    title: 'Explore — Historical Electrical Laboratory (Coming in v2.1)',
    description:
      'Explore is ElectraSim’s immersive 3D historical electrical laboratory. It is being rebuilt and will ship with ElectraSim v2.1.',
    url: '/explore/',
    type: 'page',
    category: 'Explore 3D',
    tags: ['explore', 'coming soon', '3d', 'historical', 'experimental', 'v2.1'],
  },
  {
    id: 'page-home',
    title: 'ElectraSim Simulator & Circuit Lab',
    description:
      'Interactive household electrical wiring simulator. Test switches, sockets, breakers, and faults safely in your browser.',
    url: '/',
    type: 'page',
    category: 'Pages',
    tags: ['simulator', 'app', 'interactive', 'wiring', 'training'],
  },
  {
    id: 'page-tools',
    title: 'Electrical Toolbox Hub',
    description:
      'Interactive BS 7671 & IEC compliant calculators for voltage drop, cable sizing, impedance, and circuit design.',
    url: '/tools/',
    type: 'page',
    category: 'Pages',
    tags: ['toolbox', 'calculators', 'voltage drop', 'bs 7671'],
  },
  {
    id: 'page-guide',
    title: 'Guided Circuit Tutorials & Walkthroughs',
    description:
      'Step-by-step guides for domestic wiring: radial circuits, lighting, 2-way switches, intermediate switches, and consumer units.',
    url: '/guide/',
    type: 'page',
    category: 'Pages',
    tags: ['tutorials', 'circuits', 'wiring diagrams'],
  },
  {
    id: 'page-compare',
    title: 'Circuit Simulator Comparison Bench',
    description:
      'Research-led comparison of ElectraSim, wiring trainers, electronics simulators, classroom tools, and open circuit-theory labs by practical task fit.',
    url: '/compare/',
    type: 'page',
    category: 'Pages',
    tags: [
      'comparison',
      'competitors',
      'circuit simulators',
      'wiring simulator',
      'electronics simulator',
      'research',
      'benchmark',
    ],
  },
  {
    id: 'page-about',
    title: 'About ElectraSim',
    description:
      'Learn about ElectraSim: why it was built, our engineering principles, and how it helps learners and electricians.',
    url: '/about/',
    type: 'page',
    category: 'Pages',
    tags: ['about', 'mission', 'principles'],
  },
  {
    id: 'page-contact',
    title: 'Contact ElectraSim',
    description: 'Get in touch with the team for feedback, bug reports, and educational inquiries.',
    url: '/contact/',
    type: 'page',
    category: 'Pages',
    tags: ['contact', 'feedback', 'support'],
  },
  {
    id: 'page-updates',
    title: 'Product Updates & Release Notes (Changelog)',
    description:
      'The ElectraSim changelog: every new component, simulation mode, and fix — release notes kept separate from the educational blog.',
    url: '/updates/',
    type: 'page',
    category: 'Pages',
    tags: ['updates', 'changelog', 'release notes', 'new features', 'whats new', 'app news'],
  },
];

/**
 * Builds a normalized, weighted search index from raw content sources.
 */
export interface BuildSearchIndexInput {
  blogPosts: RawBlogPost[];
  tools: ToolEntry[];
  guideCircuits?: RawGuideCircuit[];
  updatePosts?: RawUpdatePost[];
  guideTools?: RawGuideTool[];
  guideComponents?: RawGuideComponent[];
  glossaryTerms?: RawGlossaryTerm[];
}

export function buildSearchIndex({
  blogPosts,
  tools,
  guideCircuits = [],
  updatePosts = [],
  guideTools = [],
  guideComponents = [],
  glossaryTerms = [],
}: BuildSearchIndexInput): SearchItem[] {
  const items: SearchItem[] = [];

  // 1. Calculators & Tools
  for (const tool of tools) {
    items.push({
      id: `tool-${tool.id}`,
      title: tool.name,
      description: tool.description,
      url: tool.status === 'available' ? tool.route : '/tools/',
      type: 'tool',
      category: 'Calculators',
      tags: [...tool.keywords, tool.category, 'calculator', 'tool'],
    });
  }

  // 2. Blog Articles
  for (const post of blogPosts) {
    items.push({
      id: `article-${post.id}`,
      title: post.data.title,
      description: post.data.description,
      url: `/blog/${post.id}/`,
      type: 'article',
      category: post.data.category || 'Articles',
      tags: post.data.tags || [],
    });
  }

  // 2b. Product Updates (changelog — separate from the educational corpus)
  for (const upd of updatePosts) {
    items.push({
      id: `update-${upd.id}`,
      title: upd.data.title,
      description: upd.data.description,
      url: `/updates/${upd.id}/`,
      type: 'update',
      category: 'Product Updates',
      tags: [...(upd.data.tags || []), 'changelog', 'release notes', 'whats new'],
    });
  }

  // 3. Guided Circuits
  for (const circuit of guideCircuits) {
    items.push({
      id: `guide-${circuit.id}`,
      title: circuit.title,
      description: circuit.description,
      /* Walkthroughs have their own pages now — the old `/guide/#<id>`
         fragment never resolved for a first-time visitor. */
      url: `/guide/circuits/${circuitSlug(circuit)}/`,
      type: 'guide',
      category: 'Guides',
      tags: [circuit.level || 'intermediate', 'circuit', 'wiring', 'guide'],
    });
  }

  // 3b. Guide anatomy libraries. These are appended to the circuits rather
  // than replacing the existing guide-page result because the hub, a circuit,
  // a component and a term answer different intents.
  if (guideTools.length > 0) {
    items.push({
      id: 'guide-tools-hub',
      title: 'Hand Tools & Accessories Anatomy Guide',
      description:
        'Anatomy guides for electrician’s hand tools and test equipment — labelled hotspots, practical use and safety notes.',
      url: '/guide/tools/',
      type: 'guide',
      category: 'Tool Anatomy',
      tags: ['tools', 'anatomy', 'test equipment', 'hand tools'],
    });
  }

  for (const tool of guideTools) {
    items.push({
      id: `guide-tool-${tool.slug}`,
      title: tool.name,
      description: tool.tagline,
      url: `/guide/tools/${tool.slug}/`,
      type: 'guide',
      category: 'Tool Anatomy',
      tags: [tool.category, 'tools', 'anatomy', ...tool.parts],
    });
  }

  if (guideComponents.length > 0) {
    items.push({
      id: 'guide-components-hub',
      title: 'Electrical Components Anatomy Guide',
      description:
        'Learn the anatomy of electrical components — what each terminal does, how the protection works, and the safety rules behind it.',
      url: '/guide/components/',
      type: 'guide',
      category: 'Component Anatomy',
      tags: ['components', 'anatomy', 'terminals', 'protection'],
    });
  }

  for (const component of guideComponents) {
    items.push({
      id: `guide-component-${component.slug}`,
      title: component.name,
      description: component.tagline,
      url: `/guide/components/${component.slug}/`,
      type: 'guide',
      category: 'Component Anatomy',
      tags: [component.category, 'components', 'anatomy', ...component.terminals],
    });
  }

  if (glossaryTerms.length > 0) {
    items.push({
      id: 'guide-glossary',
      title: 'Electrical Terms Glossary',
      description:
        'Plain-English definitions of the terms the wiring guides use, with links to the circuits, components and tools that use them.',
      url: '/glossary/',
      type: 'guide',
      category: 'Glossary',
      tags: ['glossary', 'terms', 'definitions'],
    });
  }

  for (const term of glossaryTerms) {
    items.push({
      id: `glossary-${term.slug}`,
      title: term.expansion ? `${term.term} — ${term.expansion}` : term.term,
      description: term.definition,
      url: `/glossary/#${term.slug}`,
      type: 'term',
      category: 'Glossary',
      tags: [term.category, 'glossary', 'term', ...(term.aliases ?? []).slice(0, 4)],
    });
  }

  // 4. Core Pages
  items.push(...CORE_PAGES);

  return items;
}
