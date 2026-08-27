import { describe, expect, it } from 'vitest';
import { TOOLBOX_REGISTRY, getToolById } from './registry';
import { generateToolStructuredData, generateToolboxHubStructuredData } from './seo';

describe('Toolbox SEO & Structured Data Foundation', () => {
  it('generates valid Schema.org Graph for Voltage Drop Calculator', () => {
    const tool = getToolById('voltage-drop');
    expect(tool).toBeDefined();

    const schema = generateToolStructuredData(tool!);
    expect(schema['@context']).toBe('https://schema.org');
    expect(Array.isArray(schema['@graph'])).toBe(true);

    // 1. WebApplication
    const webApp = schema['@graph'].find((item) => item['@type'] === 'WebApplication') as
      | Record<string, unknown>
      | undefined;
    expect(webApp).toBeDefined();
    expect(webApp?.name).toBe('Voltage Drop Calculator');
    expect(webApp?.url).toBe('https://electrasim.com/tools/voltage-drop-calculator/');
    expect(webApp?.applicationCategory).toBe('EducationalApplication');
    expect(webApp?.isAccessibleForFree).toBe(true);
    const offers = webApp?.offers as Record<string, unknown> | undefined;
    expect(offers?.price).toBe('0');

    // 2. Breadcrumbs
    const breadcrumbs = schema['@graph'].find((item) => item['@type'] === 'BreadcrumbList') as
      | { itemListElement: Array<{ name: string }> }
      | undefined;
    expect(breadcrumbs).toBeDefined();
    expect(breadcrumbs?.itemListElement).toHaveLength(3);
    expect(breadcrumbs?.itemListElement[0].name).toBe('Home');
    expect(breadcrumbs?.itemListElement[1].name).toBe('Electrical Toolbox');
    expect(breadcrumbs?.itemListElement[2].name).toBe('Voltage Drop Calculator');

    // 3. FAQPage
    const faqPage = schema['@graph'].find((item) => item['@type'] === 'FAQPage') as
      | {
          mainEntity: Array<{
            '@type': string;
            name: string;
            acceptedAnswer: { '@type': string };
          }>;
        }
      | undefined;
    expect(faqPage).toBeDefined();
    expect(faqPage?.mainEntity.length).toBeGreaterThanOrEqual(4);
    expect(faqPage?.mainEntity[0]['@type']).toBe('Question');
    expect(faqPage?.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
    expect(faqPage?.mainEntity[0].name).toContain('BS 7671');

    // 4. HowTo
    const howTo = schema['@graph'].find((item) => item['@type'] === 'HowTo') as
      | { name: string; step: unknown[] }
      | undefined;
    expect(howTo).toBeDefined();
    expect(howTo?.name).toBe('How to Calculate Voltage Drop');
    expect(howTo?.step.length).toBeGreaterThanOrEqual(3);
  });

  it('generates valid Schema.org for Toolbox Hub (/tools/)', () => {
    const hubSchema = generateToolboxHubStructuredData(TOOLBOX_REGISTRY) as {
      '@context': string;
      '@type': string;
      url: string;
      mainEntity: { '@type': string; itemListElement: unknown[] };
      breadcrumb: { '@type': string };
    };
    expect(hubSchema['@context']).toBe('https://schema.org');
    expect(hubSchema['@type']).toBe('CollectionPage');
    expect(hubSchema.url).toBe('https://electrasim.com/tools/');
    expect(hubSchema.mainEntity['@type']).toBe('ItemList');
    expect(hubSchema.mainEntity.itemListElement.length).toBe(TOOLBOX_REGISTRY.length);
    expect(hubSchema.breadcrumb['@type']).toBe('BreadcrumbList');
  });

  it('all tools in registry have required SEO fields for future expansion', () => {
    TOOLBOX_REGISTRY.forEach((tool) => {
      expect(tool.id).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.slug).toBeTruthy();
      expect(tool.route).toMatch(/^\/tools\/(us\/)?[a-z0-9-]+\/$/);
      expect(tool.metaTitle).toContain('ElectraSim');
      expect(tool.metaDescription.length).toBeGreaterThan(30);
      expect(Array.isArray(tool.keywords)).toBe(true);
      expect(tool.keywords.length).toBeGreaterThanOrEqual(3);
    });
  });
});
