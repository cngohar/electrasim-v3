# ADR 0007 — Bun-First Tooling with a Cloudflare-Preferred Portable Runtime

- **Status:** Superseded by [ADR 0009](./0009-bun-paas-cloudflare-cdn.md)
- **Superseded:** 2026-09-24; Bun and portability principles are retained, but Workers is no longer the primary application runtime.
- **Date:** 2026-09-24
- **Phase:** v3 foundation
- **Deciders:** Product owner and architecture owner
- **Plan references:** `PLAN.md` §§2.1, 6.1, 16, 18

## Context

ElectraSim v3 is a greenfield rewrite. The product owner prefers Bun as the consolidated runtime, package manager, bundler, and test runner, and prefers an all-Cloudflare production deployment where technically suitable. The application must nevertheless remain deployable elsewhere if cost, region, product limits, or commercial requirements change.

Cloudflare Workers does not execute the Bun runtime. Workers runs JavaScript in V8 isolates and exposes Web Platform APIs plus selected compatibility APIs. Treating Bun and Workers as interchangeable would create an invalid deployment model. Conversely, placing Cloudflare bindings directly throughout LMS, simulator, billing, or community code would make a future hosting move unnecessarily expensive.

The platform needs PostgreSQL, object storage, transactional email, background jobs, signed webhooks, and real-browser testing. Bun cannot replace all of these responsibilities, and Bun's TypeScript transpilation does not perform static typechecking.

## Decision

ElectraSim v3 is **Bun-first, TypeScript-based, Cloudflare-preferred, and hosting-independent**.

### Toolchain

- Use a pinned Bun release for workspace package management, lockfile generation, scripts, local server execution, and compatible build tasks.
- Use `bun test` for domain, application, API, and component tests after each dependency's compatibility is verified.
- Use `bun build` only for artifacts it produces correctly and within the bundle/performance budgets.
- Retain `tsc --noEmit` as a required CI gate because Bun transpiles TypeScript but does not typecheck it.
- Retain Playwright and real browser engines for end-to-end, accessibility, responsive, rendering, and animation tests.
- Run Cloudflare tooling through a pinned Wrangler dependency, normally invoked with `bunx wrangler`.
- Do not require npm, pnpm, Yarn, Jest, Vitest, Vite, or esbuild by default; add specialized tooling only through an ADR or measured compatibility need.

### Runtime boundary

Application entry points accept Web Platform `Request` objects and return `Response` objects. Core packages prefer portable APIs including `fetch`, Web Crypto, streams, URL, structured cloning, and explicit clock/randomness interfaces.

Two first-party HTTP adapters are mandatory:

1. **Cloudflare Worker adapter** — preferred production entry point using a module Worker `fetch` handler.
2. **Bun server adapter** — conventional-host entry point for local development and deployment to a container, VM, or compatible platform.

Domain and application packages may not import Cloudflare bindings or Bun server globals. Runtime-specific code remains in adapter/infrastructure packages.

### Data and infrastructure ports

- **Source of truth:** portable PostgreSQL.
  - Cloudflare: connect through Hyperdrive where appropriate.
  - Bun/conventional host: connect using a direct or pooled PostgreSQL adapter.
- **Object storage:** an owned S3-compatible port.
  - Cloudflare: R2 is the preferred adapter.
  - Alternatives: S3, MinIO, Backblaze B2, or another verified compatible service.
- **Jobs/queues:** an owned durable-job contract with Cloudflare and conventional adapters. Queue acknowledgement is never the only record of a grade, payment, entitlement, or XP decision.
- **Email:** an owned transactional-email contract. Resend is preferred at launch; Amazon SES is the scale/cost alternative. ElectraSim will not operate a bespoke SMTP server.
- **Secrets, caching, rate limiting, and observability:** accessed through explicit configuration or infrastructure ports.

D1, KV, Durable Objects, Queues, and other Cloudflare-native products may be used by adapters when beneficial, but core correctness may not depend on their undocumented semantics or on direct imports from domain/application code. Any exception requires a focused ADR with an exit/migration strategy.

### Repository boundary

The greenfield workspace will distinguish portable packages and deployment adapters, initially along these lines:

```text
apps/
  web/                       # web composition and public assets
  api-worker/                # Cloudflare Worker fetch adapter
  api-bun/                   # Bun server adapter
packages/
  domain-*/                  # pure deterministic domain packages
  application-*/             # use cases and ports
  infrastructure-postgres/   # shared schema/migrations and DB contracts
  infrastructure-cloudflare/ # Hyperdrive/R2/queue adapters
  infrastructure-bun/        # direct PG/S3/job adapters
  contracts/                 # HTTP/event schemas
  config/                    # TypeScript, lint, test, build configuration
```

The exact framework and directory names remain subject to the foundation spike, but the dependency direction does not.

### CI and portability gate

Every merge to the v3 implementation must pass:

1. deterministic formatting/linting;
2. `tsc --noEmit`;
3. Bun unit/integration tests;
4. contract tests against both HTTP adapters;
5. migration tests against PostgreSQL;
6. Cloudflare Worker integration tests in the closest supported local runtime;
7. Bun server integration tests;
8. Playwright journeys in a real browser;
9. production bundle and deployment dry-run checks for both targets.

A feature is not portable merely because it compiles. The same contract fixtures must produce equivalent status, headers, body, authorization decision, and durable side effects through both runtime adapters.

## Rationale

- Bun consolidates the local toolchain and offers a credible conventional-host runtime without pretending to replace static typechecking or browser automation.
- Web Platform request/response contracts align naturally with Workers and remain viable on Bun and other modern runtimes.
- PostgreSQL and S3-compatible interfaces provide established migration paths.
- Cloudflare remains the preferred operational platform without becoming a product-domain dependency.
- Dual-adapter contract tests expose portability regressions while they are inexpensive to fix.

## Consequences

### Positive

- ElectraSim can move from Workers to a Bun/container host without rewriting simulator, LMS, authorization, assessment, billing, or community logic.
- R2 and Hyperdrive can be replaced through infrastructure adapters.
- Local and conventional deployments use the same application contracts as production.
- Bun reduces duplicate package-manager/test/build tooling where compatibility is proven.

### Costs and limitations

- Two runtime adapters and their contract-test matrix must be maintained.
- A hosting move still requires operational migration of objects, secrets, queues, DNS, and deployment pipelines.
- Cloudflare-native optimizations must remain behind explicit interfaces.
- Some framework or dependency features may fail under one runtime and must be rejected, isolated, or replaced.

## Foundation spike acceptance criteria

Before production feature implementation begins:

- one authenticated health/profile request works through both Worker and Bun adapters;
- both adapters read/write the same PostgreSQL schema;
- one object can be written/read through R2-compatible and local/S3 test adapters;
- one durable job and one transactional email can be scheduled through fake contract-tested adapters;
- WebSocket/SSE requirements are tested if selected by the framework;
- `tsc`, Bun tests, Worker integration tests, Bun integration tests, and Playwright run from a clean checkout;
- deployment dry runs produce independent Worker and conventional-host artifacts;
- no portable package imports a Cloudflare or Bun-specific runtime module.

## Revisit triggers

Revisit this ADR if Workers cannot meet measured CPU/memory/duration needs, the selected framework cannot support both adapters, Hyperdrive cannot meet database requirements, Bun compatibility blocks critical libraries, or a contracted customer requires a different residency/self-hosting model.
