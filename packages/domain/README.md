# @electrasim/domain

The shared electrical model for the simulator, Comlink worker, local Hono Worker and Astro helpers. Imports have no UI, storage, access-policy or framework dependencies. `Circuit` in `src/types.ts` remains the single document shape; persisted documents need no format migration for this extraction.

```ts
import type { Circuit } from '@electrasim/domain';
import { simulate } from '@electrasim/domain/simulation';
import { getStandard } from '@electrasim/domain/standards';
```

Use subpath imports for challenges, diagnosis and Ohmageddon to preserve lazy loading. The root barrel deliberately does not export those modules. Membership authorization belongs in the separate access/application layers and must not change the electrical result for an identical circuit.

`bun run typecheck` includes an import-boundary check and an ES2022-only domain compile without DOM/framework types. Vitest runs domain tests in Node and app tests in jsdom. Legacy fault normalization derives stable IDs with timestamp 0 (unknown), while explicit stored fault IDs/timestamps are preserved. Creating a new manual fault remains an application event with a fresh identity.

The existing geometry router has a clock-bounded search; validation report timestamps and manual fault creation also use a clock. Those conveniences are separate from the deterministic electrical `simulate()` path. No browser or Node-specific APIs are needed by package runtime code.

Local cross-runtime parity:

```sh
bun x wrangler dev --config wrangler.domain-test.jsonc --local --ip 127.0.0.1 --port 8792
# In another terminal:
bun scripts/check-domain-worker.ts
```

The isolated Hono fixture tests 20 guided circuits × four profiles × two modes × three fault states (480 cases). It is not imported or exposed by the application Worker. Do not deploy this test Worker.
