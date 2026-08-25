import type { ToolEntry } from './tools/registry';

export interface SearchItem {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'tool' | 'article' | 'guide' | 'page';
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

export const CORE_PAGES: SearchItem[] = [
  {
    id: 'page-explore',
    title: 'Explore — Immersive 3D Historical Electrical Explorer (Experimental)',
    description:
      'Explore historical electrical inventions in interactive 3D. Step inside Edison’s 1879 carbon-filament bulb with cutaway, exploded view, component specs, and physics experiment lab.',
    url: '/explore/',
    type: 'page',
    category: 'Explore 3D',
    tags: ['explore', '3d', 'historical', 'edison bulb', 'experimental', 'physics'],
  },
  {
    id: 'explore-edison-bulb',
    title: 'Edison Carbon-Filament Lamp (1879) — 3D Interactive Explorer',
    description:
      '3D interactive historical exploration of Thomas Edison’s 1879 carbonized cotton filament light bulb with technical specs, timeline, exploded assembly, and live physics laboratory.',
    url: '/explore/edison-bulb/',
    type: 'page',
    category: 'Explore 3D',
    tags: ['edison bulb', '3d', 'incandescent', 'carbon filament', 'history', 'experiment'],
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
];

/**
 * Builds a normalized, weighted search index from raw content sources.
 */
export function buildSearchIndex(
  blogPosts: RawBlogPost[],
  tools: ToolEntry[],
  guideCircuits: RawGuideCircuit[] = [],
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
