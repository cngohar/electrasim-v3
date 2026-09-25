# ADR 0012 — Localization, RTL, and Translated Learning Content

- **Status:** Accepted
- **Date:** 2026-09-24
- **Phase:** v3 design system and content foundation
- **Deciders:** Product owner and architecture owner
- **Depends on:** ADR 0008, ADR 0010, ADR 0011
- **Plan references:** `PLAN.md` §§3, 7, 13, 18

## Context

ElectraSim launches with English source content but must not require a rewrite when learners or institutions request another language. UI translation, institution-authored course translation, user-generated content, electrical standards, and regional supply settings are different concerns. Urdu, Arabic, Persian, Hebrew, and other right-to-left languages also require structural layout support rather than mirrored words alone.

Electrical and safety text is high consequence. Unreviewed machine translation can change the meaning of isolation, protective devices, conductor identification, voltage, current, fault, and thermal-risk guidance.

## Decision

Build localization into the v3 foundation now, while enabling additional production locales only after their catalogs and safety terminology pass review. English (`en`) is the source and guaranteed fallback. No specific second launch language is committed until product demand and qualified review capacity are confirmed.

### Locale resolution

Use canonical BCP 47 tags. Resolution order is:

1. explicit user preference;
2. workspace/institution preference;
3. browser `Accept-Language`;
4. English fallback.

The selected language never silently determines electrical supply family, standards regime, country, timezone, currency, or units. Those remain explicit settings.

### Product UI

All new production UI strings must use stable message keys and versioned locale catalogs. Do not concatenate translated sentence fragments. Use `Intl` for dates, numbers, lists, plural rules, and relative time. Missing keys fail to English and emit aggregate diagnostics without personal text.

The HTML `lang` and `dir` attributes, logical CSS properties, icon direction, focus order, charts, schematics, and animation labels must support both LTR and RTL. Circuit meaning is not blindly mirrored: electrical symbols, current arrows, terminal numbering, and schematic conventions follow the selected standard and explicit renderer rules.

### Learning and LMS content

Translated course/page/question variants are versioned records linked to one source version. Publishing a source change marks older translations stale; it does not silently overwrite them. Institutions may override a translation while preserving source lineage and audit history.

Assessments lock the language/version used for an attempt. Translation equivalence for graded or safety-critical items requires instructor/SME review. User-generated posts are not automatically translated at launch; any later machine translation is clearly labeled and never replaces the original.

### Safety and terminology

Safety-critical catalogs require bilingual human review plus an electrical-learning SME. Maintain an approved terminology glossary per locale. Machine translation may assist drafts but cannot publish verification, safety, fault, protection, assessment, or legal text automatically.

### Adding a requested language

A user or institution request enters a visible demand backlog. A locale is enabled only after:

1. scope and audience are confirmed;
2. UI and email catalogs are complete;
3. electrical/safety glossary is approved;
4. RTL behavior is validated when applicable;
5. core signup, verification, onboarding, simulator, LMS, assessment, and error flows pass browser tests;
6. support/legal/privacy content has an owner;
7. fallback and stale-translation behavior is tested.

## Initial implementation

`@electrasim/localization` provides BCP 47 normalization, user/workspace/browser negotiation, English fallback, RTL-direction detection, and `Intl` formatting helpers. English is currently the only production catalog. The integrated redesign must progressively move hard-coded strings into typed catalogs before additional locales are enabled.

## Testing gates

- unsupported locales fall back safely to English;
- user preference overrides workspace and browser preferences;
- malformed language headers do not fail requests;
- RTL locale candidates select RTL layout when enabled;
- locale and electrical supply family remain independent;
- missing/stale translations remain visible and auditable;
- safety text cannot be published without required review state;
- localized UI passes keyboard, screen-reader, overflow, and reduced-motion checks.

## Consequences

Localization work begins during redesign rather than after English UI proliferation. Additional languages carry translation, SME, support, legal, screenshot, and regression-test costs. This is intentional: language support is a product capability, not an automatic string substitution feature.
