import { describe, expect, it } from 'vitest';
import { CORE_PAGES, buildSearchIndex } from './search';
import { TOOLBOX_REGISTRY } from './tools/registry';

describe('Search Index Builder (buildSearchIndex)', () => {
  const mockBlogPosts = [
    {
      id: 'how-to-wire-a-two-way-switch',
      data: {
        title: 'How to Wire a Two-Way Switch',
        description: 'Complete guide for 2-way staircase and corridor lighting circuits.',
        category: 'Guides',
        tags: ['two-way-switch', 'lighting-circuit', 'wiring'],
      },
    },
    {
      id: 'what-is-an-rcbo',
      data: {
        title: 'What is an RCBO? Difference Between RCD, MCB & RCBO',
        description: 'Understand modern consumer unit protection devices and trip characteristics.',
        category: 'Regulations',
        tags: ['rcbo', 'rcd', 'mcb', 'consumer-unit'],
      },
    },
  ];

  const mockGuideCircuits = [
    {
      id: 'two-way-lighting',
      title: 'Two-Way Staircase Lighting Circuit',
      description: 'Interactive schematic guide for strapper wiring and intermediate switching.',
      level: 'Intermediate',
    },
  ];

  const mockGuideTools = [
    {
      slug: 'multimeter',
      name: 'Digital Multimeter',
      tagline: 'Measure voltage, continuity and resistance safely.',
      category: 'Test equipment',
      parts: ['Display', 'Selector dial', 'Test leads'],
    },
  ];

  const mockGuideComponents = [
    {
      slug: 'mcb',
      name: 'Miniature Circuit Breaker',
      tagline: 'Protects a final circuit from overcurrent.',
      category: 'Protective device',
      terminals: ['L-in', 'L-out'],
    },
  ];

  const mockGlossaryTerms = [
    {
      slug: 'cpc',
      term: 'CPC',
      expansion: 'Circuit Protective Conductor',
      definition: 'The earth conductor that clears a fault by providing a low-impedance path.',
      category: 'Earthing',
      aliases: ['earth conductor'],
    },
  ];

  it('builds a comprehensive search index including tools, posts, guides, and core pages', () => {
    const items = buildSearchIndex({
      blogPosts: mockBlogPosts,
      tools: TOOLBOX_REGISTRY,
      guideCircuits: mockGuideCircuits,
      guideTools: mockGuideTools,
      guideComponents: mockGuideComponents,
      glossaryTerms: mockGlossaryTerms,
    });

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(
      TOOLBOX_REGISTRY.length +
        mockBlogPosts.length +
        mockGuideCircuits.length +
        mockGuideTools.length +
        mockGuideComponents.length +
        mockGlossaryTerms.length +
        3 + // guide library hubs
        CORE_PAGES.length,
    );

    // Verify presence of different resource types
    const types = new Set(items.map((item) => item.type));
    expect(types).toContain('tool');
    expect(types).toContain('article');
    expect(types).toContain('guide');
    expect(types).toContain('page');
    expect(types).toContain('term');

    // Check specific items
    const voltageDropTool = items.find((item) => item.id === 'tool-voltage-drop');
    expect(voltageDropTool).toBeDefined();
    expect(voltageDropTool?.title).toContain('Voltage Drop');
    expect(voltageDropTool?.url).toBe('/tools/voltage-drop-calculator/');

    const blogPost = items.find((item) => item.id === 'article-how-to-wire-a-two-way-switch');
    expect(blogPost).toBeDefined();
    expect(blogPost?.url).toBe('/blog/how-to-wire-a-two-way-switch/');

    const guideCircuit = items.find((item) => item.id === 'guide-two-way-lighting');
    expect(guideCircuit).toBeDefined();
    expect(guideCircuit?.url).toBe('/guide/circuits/two-way-staircase-lighting-circuit/');

    const guideTool = items.find((item) => item.id === 'guide-tool-multimeter');
    expect(guideTool).toBeDefined();
    expect(guideTool?.url).toBe('/guide/tools/multimeter/');

    const guideComponent = items.find((item) => item.id === 'guide-component-mcb');
    expect(guideComponent).toBeDefined();
    expect(guideComponent?.url).toBe('/guide/components/mcb/');

    const glossaryTerm = items.find((item) => item.id === 'glossary-cpc');
    expect(glossaryTerm).toBeDefined();
    expect(glossaryTerm?.type).toBe('term');
    expect(glossaryTerm?.url).toBe('/glossary/#cpc');

    // Check all items have required fields
    for (const item of items) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.url).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(Array.isArray(item.tags)).toBe(true);
      expect(new URL(item.url, 'https://electrasim.com').pathname).toBeTruthy();
    }
  });
});
