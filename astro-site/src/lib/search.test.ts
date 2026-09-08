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

  it('builds a comprehensive search index including tools, posts, guides, and core pages', () => {
    const items = buildSearchIndex(mockBlogPosts, TOOLBOX_REGISTRY, mockGuideCircuits);

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(
      TOOLBOX_REGISTRY.length + mockBlogPosts.length + mockGuideCircuits.length + CORE_PAGES.length,
    );

    // Verify presence of different resource types
    const types = new Set(items.map((item) => item.type));
    expect(types).toContain('tool');
    expect(types).toContain('article');
    expect(types).toContain('guide');
    expect(types).toContain('page');

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

    // Check all items have required fields
    for (const item of items) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.url).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(Array.isArray(item.tags)).toBe(true);
    }
  });
});
