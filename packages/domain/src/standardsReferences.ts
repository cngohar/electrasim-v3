/** Publisher metadata checked 2026-09-26; does not verify numerical tables. */
export interface StandardReference {
  publisher: 'IET' | 'NFPA' | 'IEC';
  document: string;
  edition: string;
  url: string;
  checkedDate: string;
}

export interface StandardMetadata {
  references: readonly StandardReference[];
  adoption: string;
  coverage: string;
  numericalCoverage: 'educational-model-only';
}

const iecReferences: StandardReference[] = [
  {
    publisher: 'IEC',
    document: 'IEC 60364-1',
    edition: '2025, edition 6',
    url: 'https://webstore.iec.ch/en/publication/63699',
    checkedDate: '2026-09-26',
  },
  {
    publisher: 'IEC',
    document: 'IEC 60364-8-81',
    edition: '2026; replaces 8-1:2019',
    url: 'https://webstore.iec.ch/en/publication/93036',
    checkedDate: '2026-09-26',
  },
  {
    publisher: 'IEC',
    document: 'IEC 60364-8-82',
    edition: '2022+AMD1:2026',
    url: 'https://webstore.iec.ch/en/publication/113148',
    checkedDate: '2026-09-26',
  },
];

export const STANDARD_METADATA: Record<'uk' | 'us' | 'eu' | 'int', StandardMetadata> = {
  uk: {
    references: [
      {
        publisher: 'IET',
        document: 'BS 7671:2018',
        edition: 'A4:2026',
        url: 'https://electrical.theiet.org/bs-7671-18th-edition-wiring-regulations/ensure-you-are-up-to-date-with-bs-7671/',
        checkedDate: '2026-09-26',
      },
    ],
    adoption:
      'A4 published 15 April 2026. A2:2022 with A3:2024 remains valid until 15 October 2026.',
    coverage:
      'Limited radial-circuit teaching checks. Numerical tables and all A4 changes are not fully verified or implemented; results do not certify an installation.',
    numericalCoverage: 'educational-model-only',
  },
  us: {
    references: [
      {
        publisher: 'NFPA',
        document: 'NFPA 70 (NEC)',
        edition: '2026',
        url: 'https://www.nfpa.org/product/nfpa-70-national-electrical-code-nec/p0070code',
        checkedDate: '2026-09-26',
      },
    ],
    adoption:
      'The adopted NEC edition and amendments depend on the state/local authority. Publication does not establish local adoption.',
    coverage:
      '120 V teaching profile. NEC cable sizing, split-phase, listed breaker/GFCI behavior and UK-style Zs compliance are not assessed.',
    numericalCoverage: 'educational-model-only',
  },
  eu: {
    references: iecReferences,
    adoption:
      'HD 60364 and national editions/deviations need separate verification; this profile does not establish EU-wide compliance.',
    coverage:
      'Generic metric teaching checks using the existing simplified cable model. National compliance and IEC energy/prosumer provisions are not assessed.',
    numericalCoverage: 'educational-model-only',
  },
  int: {
    references: iecReferences,
    adoption:
      'Generic IEC teaching profile. Countries sharing 230 V / 50 Hz can have different installation rules.',
    coverage:
      'Generic metric teaching checks, not a national standard. IEC energy/prosumer references are metadata, not implemented checks.',
    numericalCoverage: 'educational-model-only',
  },
};
