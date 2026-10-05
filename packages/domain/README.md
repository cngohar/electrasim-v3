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

Supported `simulate()` calls use the shared MNA solver and expose its versioned `electrical` result alongside derived application readings. `solveCircuit()` remains the direct numerical API. Configured coil/timer controls and declared protection models use deterministic `simulationState` / `deltaSeconds` steps; resistive AC dimming combines independently solved switching states into RMS readings and real power. The model/capability version is `1.5d.2.1`, with static engine `mna-linear-2`, timed engine `mna-controls-3` and dimming engine `mna-dimming-1`. Unsupported measurements stay unavailable; eligible unmigrated models are explicitly tagged with `legacyObservation`. See [runtime scope](../../docs/audits/phase-1-mna-runtime.md), [timer/dimming acceptance](../../docs/audits/phase-1-timers-dimming.md) and [timed-protection acceptance](../../docs/audits/phase-1-protection.md) for the temporary legacy boundary and remaining damage, three-phase and lab work.

Local cross-runtime parity from the repository root:

```sh
bun run test:domain-local
bun run verify:phase-1.5d1
```

The self-contained parity command starts an isolated localhost Hono Worker with local persistence and shuts it down afterward. Its 675 cases include the original 480 template/profile/mode/fault combinations, compiler/editing/numerical fixtures, 57 application-runtime fixtures, and coil/timer/dimming/protection steps. The full phase gate also exercises actual Comlink and authenticated application API paths. Test Worker entry points are not imported or exposed by the application Worker and must not be deployed.
