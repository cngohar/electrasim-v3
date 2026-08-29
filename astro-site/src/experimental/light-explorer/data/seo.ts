export interface ExperimentSEO {
  slug: string;
  title: string;
  description: string;
  canonical: string;
  h1: string;
  ogImage: string;
  ogImageAlt: string;
  keywords: string[];
  breadcrumbs: Array<{ name: string; item: string }>;
  structuredData: Record<string, unknown>[];
}

export const LIGHT_EXPLORER_SEO: ExperimentSEO = {
  slug: 'light-explorer',
  title: 'Edison Light Explorer — Explore the 1879 Incandescent Lamp in 3D | ElectraSim',
  description:
    'Explore a historically grounded 3D reconstruction of Edison’s 1879 incandescent lamp. Inspect its carbon filament, glass envelope, platinum components, vacuum, construction and electrical behavior.',
  canonical: 'https://electrasim.com/experimental/light-explorer/',
  h1: 'Edison Light Explorer — The 1879 Incandescent Lamp',
  ogImage: 'https://electrasim.com/images/light-explorer/og-light-explorer.jpg',
  ogImageAlt:
    'Historically accurate 1879 Edison carbon-filament demonstration lamp glowing in an interactive 3D laboratory',
  keywords: [
    'Edison light bulb history',
    'Edison bulb 1879',
    '1879 incandescent lamp',
    'Edison carbon filament',
    'carbon filament light bulb',
    'how Edison light bulb worked',
    'how an incandescent bulb works',
    'Edison lamp construction',
    'Edison light bulb experiment',
    'October 22 1879 Edison experiment',
    'Edison Menlo Park light bulb',
    'history of the incandescent lamp',
    'Edison light bulb parts',
    'carbon filament bulb',
    'incandescent bulb history',
  ],
  breadcrumbs: [
    { name: 'Home', item: 'https://electrasim.com/' },
    { name: 'Experimental Lab', item: 'https://electrasim.com/experimental/' },
    { name: 'Light Explorer', item: 'https://electrasim.com/experimental/light-explorer/' },
  ],
  structuredData: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Light Explorer — 1879 Edison Incandescent Lamp 3D Experience',
      url: 'https://electrasim.com/experimental/light-explorer/',
      description:
        'Interactive 3D historical laboratory reconstructing Thomas Edison’s 1879 carbon-filament demonstration lamp based on Smithsonian Institution records.',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'All modern web browsers with WebGL support',
      browserRequirements: 'Requires HTML5 Canvas and WebGL.',
      isAccessibleForFree: true,
      inLanguage: 'en-US',
      publisher: {
        '@type': 'Organization',
        name: 'ElectraSim',
        url: 'https://electrasim.com/',
        logo: 'https://electrasim.com/favicon.svg',
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://electrasim.com/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Experimental Lab',
          item: 'https://electrasim.com/experimental/',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Light Explorer',
          item: 'https://electrasim.com/experimental/light-explorer/',
        },
      ],
    },
  ],
};

export function getEdison1879SEO(): ExperimentSEO {
  return {
    ...LIGHT_EXPLORER_SEO,
    slug: 'light-explorer/edison-1879',
    canonical: 'https://electrasim.com/experimental/light-explorer/edison-1879/',
    title: '1879 Edison Carbon-Filament Lamp — Interactive 3D Laboratory | ElectraSim',
    description:
      'Step inside the 1879 Menlo Park laboratory in 3D. Disassemble the carbon filament lamp, examine platinum clamps, simulate the 113 Ω to 140 Ω physics, and study historical manufacturing.',
    breadcrumbs: [
      { name: 'Home', item: 'https://electrasim.com/' },
      { name: 'Light Explorer', item: 'https://electrasim.com/experimental/light-explorer/' },
      {
        name: 'Edison 1879 Lamp',
        item: 'https://electrasim.com/experimental/light-explorer/edison-1879/',
      },
    ],
  };
}
