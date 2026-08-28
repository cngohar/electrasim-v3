import type { ToolEntry } from './registry';
import { STANDARD_PROFILES } from './standards';

/** Human-readable standards phrase for SEO copy, e.g. "BS 7671 (UK) and IEC 60364" */
function standardsPhrase(tool: ToolEntry): string {
  if (!tool.standards || tool.standards.length === 0) return 'electrical standards';
  return tool.standards.map((id) => STANDARD_PROFILES[id].label).join(' and ');
}

function standardsAbout(tool: ToolEntry): Array<Record<string, unknown>> | undefined {
  if (!tool.standards || tool.standards.length === 0) return undefined;
  return tool.standards.map((id) => {
    const profile = STANDARD_PROFILES[id];
    return {
      '@type': 'Thing',
      name: profile.label,
      description: `${profile.regionLabel} wiring standard`,
    };
  });
}

export interface StructuredDataGraph {
  '@context': 'https://schema.org';
  '@graph': Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/**
 * Builds a comprehensive Schema.org JSON-LD Graph for an individual Electrical Tool.
 * Generates WebApplication + FAQPage + BreadcrumbList + HowTo schemas in a unified graph.
 */
export function generateToolStructuredData(tool: ToolEntry): StructuredDataGraph {
  const siteUrl = 'https://electrasim.com';
  const toolUrl = `${siteUrl}${tool.route}`;

  const graph: Array<Record<string, unknown>> = [
    // 1. WebApplication Schema
    {
      '@type': 'WebApplication',
      '@id': `${toolUrl}#webapp`,
      name: tool.name,
      url: toolUrl,
      description: tool.metaDescription,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'All',
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
      inLanguage: 'en-US',
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      publisher: {
        '@type': 'Organization',
        name: 'ElectraSim',
        url: `${siteUrl}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/favicon.svg`,
        },
      },
      ...(standardsAbout(tool) ? { about: standardsAbout(tool) } : {}),
      image: tool.ogImage || `${siteUrl}/og-image.png`,
    },

    // 2. BreadcrumbList Schema
    {
      '@type': 'BreadcrumbList',
      '@id': `${toolUrl}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${siteUrl}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Electrical Toolbox',
          item: `${siteUrl}/tools/`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: tool.name,
          item: toolUrl,
        },
      ],
    },
  ];

  // 3. FAQPage Schema (if FAQs are defined)
  if (tool.faqs && tool.faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${toolUrl}#faq`,
      mainEntity: tool.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  // 4. HowTo Schema (Step-by-step guidance)
  if (tool.steps && tool.steps.length > 0) {
    graph.push({
      '@type': 'HowTo',
      '@id': `${toolUrl}#howto`,
      name: `How to Calculate ${tool.shortName}`,
      description: `Step-by-step electrical engineering method for calculating ${tool.shortName.toLowerCase()} using published conductor physics and ${standardsPhrase(tool)} rules.`,
      step: tool.steps.map((s, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: s.step,
        text: s.instruction,
      })),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

/**
 * Builds Schema.org JSON-LD for the main Electrical Toolbox Hub (/tools/).
 */
export function generateToolboxHubStructuredData(tools: ToolEntry[]): Record<string, unknown> {
  const siteUrl = 'https://electrasim.com';
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ElectraSim Electrical Toolbox — Interactive Engineering Calculators',
    url: `${siteUrl}/tools/`,
    description:
      'Free interactive electrical calculators and engineering reference tools for electricians, apprentices, engineers, and students.',
    publisher: {
      '@type': 'Organization',
      name: 'ElectraSim',
      url: `${siteUrl}/`,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: tools.map((tool, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: tool.name,
        description: tool.description,
        url: `${siteUrl}${tool.route}`,
      })),
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${siteUrl}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Electrical Toolbox',
          item: `${siteUrl}/tools/`,
        },
      ],
    },
  };
}
