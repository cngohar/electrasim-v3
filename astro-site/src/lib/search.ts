import type { ToolEntry } from './tools/registry';

export interface SearchItem {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'tool' | 'article' | 'guide' | 'page' | 'update';
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
    title: 'ElectraSim vs Online Circuit Simulators (2026 Comparison)',
    description:
      'Compare ElectraSim with CircuitLab, Tinkercad Circuits, EveryCircuit, Falstad, and DCACLab.',
    url: '/compare/',
    type: 'page',
    category: 'Pages',
    tags: ['comparison', 'circuitlab', 'tinkercad', 'falstad', 'dcaclab'],
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
export function buildSearchIndex(
  blogPosts: RawBlogPost[],
  tools: ToolEntry[],
  guideCircuits: RawGuideCircuit[] = [],
  updatePosts: RawUpdatePost[] = [],
): SearchItem[] {
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
      url: `/guide/#${circuit.id}`,
      type: 'guide',
      category: 'Guides',
      tags: [circuit.level || 'intermediate', 'circuit', 'wiring', 'guide'],
    });
  }

  // 4. Core Pages
  items.push(...CORE_PAGES);

  return items;
}
