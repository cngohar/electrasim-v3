# Phase 1.5A — dependency advisory review

Date: 2026-09-30. Scope: the Bun workspace lockfile and local build/test tools. Phase acceptance and runtime evidence are recorded in [the 1.5A audit baseline](phase-1-audit-baseline.md).

## Schedule and scope

Dependency review and necessary targeted fixes belong to **1.5A.2**, before the electrical contracts/graph work. The plan did not separately schedule a Vitest major upgrade. The current advisory requires Vitest **4.1.11 or later**, so this review moves the root and Astro workspaces from resolved **3.2.7 to 4.1.11**, together with matching UI, coverage and mocker packages. Further major upgrades have no scheduled implementation milestone; the next planned dependency review is **Phase 8 hardening**, with earlier fixes if new applicable advisories require them.

The upgrade exposed two test-harness issues: `vitest.config.ts` must import `defineConfig` from `vitest/config`, and `MenuOverlay.test.tsx` must await its dialog preloads before environment teardown. The test config also uses `import.meta.dirname`. Test assertions and the seven expected electrical-core failures remain intact; unhandled errors are not suppressed. The application still uses Vite 6.4.3; Vitest resolves its own compatible Vite 8.2.2. The React plugin reports deprecation warnings in that test environment.

## Verified changes

`bun audit --json` successfully reached the advisory registry. The initial response named **11 packages** and **28 distinct advisory URLs**; these are dependency findings, not a count of exploitable application vulnerabilities. Targeted Bun updates changed the packages below and their required dependency chains. No blanket fix, override or new hosted workflow was added.

| Package / chain | Before | After |
|---|---|---|
| Astro | 7.2.4 | 7.2.8 |
| Vitest / UI / coverage / mocker | 3.2.7 | 4.1.11 |
| Wrangler | 4.123.0 | 4.144.0 |
| Miniflare / workerd | 5.20260811.1-alpha / 1.20260811.1 | 5.20260926.1-alpha / 1.20260926.1 |
| sharp used by Miniflare | 0.35.2 | 0.35.4 |
| SVGO | 4.0.2 | 4.1.0 |
| fast-uri | 3.1.5 | 3.1.8 |
| devalue | 5.9.0 | 5.9.4 |
| js-yaml 4.x | 4.3.1 | 4.3.2 |
| brace-expansion | 5.0.9 / 2.1.4 | 5.0.12 / 2.1.7 |
| undici used by Miniflare / unifont | 7.29.0 / 8.10.0 | 7.29.1 / 8.11.2 |

The gray-matter chain retains js-yaml 3.15.2, which the current response does not flag. The declared workers-types 5.20260926.1 satisfies Wrangler's peer requirement. Bun remains the package manager; the legacy npm lockfile was not rewritten.

Both workspace manifests and setup documentation now declare Node **>=22.19.0**. This corrects a pre-existing minimum-version mismatch: the old unifont/undici 8.10.0 already required that version, as does 8.11.2. Validation uses the installed Node 24.14.1 and Bun 1.4.2; no system runtime was changed.

Relevant reviewed advisories include [Vitest mocker traversal](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [Astro AVIF optimization](https://github.com/advisories/GHSA-26w7-cxv4-gfx2), [sharp/libheif](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), and [SVGO sanitization](https://github.com/advisories/GHSA-w27v-7q3p-w38r). Astro generates static assets here, without an SSR adapter. That limits the relevant application exposure but does not exempt build/dev tools from updates. No production service or live website was tested.

## Remaining finding: reviewed tooling exposure

The post-update `bun audit --json` returns **one moderate esbuild advisory** and exits 1. This is **not a clean audit** and is not hidden with an ignore rule.

- Advisory: [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99), esbuild's development-server CORS behavior, affected through 0.24.2 and fixed in 0.25.0.
- Remaining chain: `drizzle-kit@0.31.11 → @esbuild-kit/esm-loader@2.6.5 → @esbuild-kit/core-utils@3.3.2 → esbuild@0.18.20`.
- Reviewed use: core-utils calls only `transform`, `transformSync` and `version`; it does not call `serve` or `context`. This old copy is used to load/transform tooling configuration, not to serve the app. Application/preview servers do not use its vulnerable serving API. Other resolved esbuild copies are 0.25.12 or newer.
- Disposition: retained as a documented, currently unexposed tooling finding. Forcing a pre-1.0 API upgrade into the old loader would exceed its declared range without an upstream compatibility guarantee. No such override was applied merely to obtain a zero audit count.
- Follow-up: recheck when Drizzle/its loader is upgraded, before adding any esbuild serving path, and in Phase 8's dependency review. Any new use of this copy's `serve` feature requires remediation first.

Raw before/after audit responses, downloaded advisory details and update logs are retained locally under ignored `.wrangler/phase15a/closure-*` and `.wrangler/phase15a/GHSA-*.json`. The versioned explanation above is the durable review record. This review does not authorize remote testing, account operations or deployment.
