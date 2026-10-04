# Simulator and account circuits — Phase 1.5

Development is local only. Start `bun run dev:worker` (127.0.0.1:8791) and `bun run dev` (port 3000). Vite proxies `/api` to that local Worker. Apply migrations with `bun x wrangler d1 migrations apply DB --local --persist-to .wrangler/state`. No Cloudflare account or deployment is needed.

## Authorization

Basic editing, simulation, single basic faults and basic diagnosis run locally without a session or network. Premium editor mutations and simulation request fresh membership from primary local D1. A local capability snapshot drives presentation, not authorization. Every server endpoint derives requirements from validated component types and normalized faults. Advanced diagnosis and every Ohmageddon tier add their own requirements from the stored scenario.

The browser remains user-controlled; supported editor flows are gated, while server content delivery and accepted results enforce authorization independently. Server mutations repeat capability predicates with the owner/version condition inside their SQL write, so concurrent revocation or a stale version cannot silently overwrite work. Failed writes do not increment versions or diagnosis counters.

## Endpoints

All mutation bodies are JSON, require a matching Origin, and reject unknown fields. Responses are private/no-store. Account routes require a real Better Auth session cookie.

| Route | Body or result |
| --- | --- |
| `POST /api/simulator/authorize` | `{ circuit, diagnosis? }`; validated requirements and current membership |
| `POST /api/simulator/simulate` | `{ circuit, standard? }`; authorized solver result (Sets serialized as arrays); maximum 500 components / 1,000 wires |
| `GET /api/circuits?limit=…&offset=…` | Owner's paginated metadata |
| `POST /api/circuits` | `{ name, circuit }`; new document/version |
| `GET /api/circuits/:id` | Owner's original content, version, requirements, readOnly flag |
| `PATCH /api/circuits/:id` | `{ name, circuit, version }`; checks both existing and replacement content |
| `DELETE /api/circuits/:id` | `{ version }`; owner may delete after downgrade |
| `POST /api/diagnosis/attempts` | `{ seed, difficulty, rageTier?, generatorVersion? }`; server-generated scenario, repair circuit, progress and version |
| `GET /api/diagnosis/attempts/:id` | Owner's preserved scenario, repair circuit and accepted progress, including after downgrade |
| `POST /api/diagnosis/attempts/:id` | `{ action, version, circuit, answer? }`; actions submit, hint, checkpoint, abandon, expire |

Diagnosis submissions provide only the answer and repaired circuit. The server owns the original scenario, identified fault IDs, counters and accepted score. It evaluates recovery itself. The active-time model banks at most the 30 seconds since the prior accepted action; the browser checkpoints every 15 seconds. A denied/offline request does not update stored time. This is a local teaching score, not a competitive timing or anti-cheat service.

Completed and timed-out attempts return the same server-derived score on subsequent reads. Confirmed terminal actions leave the local active record and update aggregate statistics; a reload can recover a finish that was accepted before its response arrived. Further mutations of a finished attempt return 409.

## Persistence and recovery

Circuit-file and portable-backup writers emit schema 2 and accept schemas 1 and 2 on import. The raw `Circuit` in API bodies retains component configuration, typed document/independent source profiles, structured faults and legacy fields. Schema-1 documents migrate with their IDs and explicit ratings intact; omitted frequency remains the documented 50 Hz assumption. Autosaves upgrade under the existing IndexedDB key. Import, share, autosave, account loads and saved premium documents may open read-only. Editing, undo/redo, pasting and simulation check the original document and any newly required capabilities, including supply-only changes. A denied or stale asynchronous edit does not consume undo history.

“Create basic copy” lists removal choices explicitly, validates that the result requires no premium capabilities, writes the original to IndexedDB recovery storage, and only then opens a separate copy. Saved originals can be downloaded under Saved circuits. Raw JSON export remains available. Failed backup storage cancels replacement.

Diagnosis version 2 chooses basic-eligible recipes/faults before generation. Version 1 tickets retain their original generation inputs. Active records now retain repair circuits and original scenarios alongside seed/version and counters. Denied or unsupported restores retain their stored records and expose recovery; expiry does not delete learner work.

## Local verification

Phase 1.5B added a pure `compileCircuit` domain entry point and additive `electricalContract` metadata on simulation results. Compilation validates the document and reports graph/model coverage; it is not a numerical solve or a new HTTP endpoint. At that milestone the API still ran the guarded legacy solver. See [electrical contracts, defaults and topology](../audits/phase-1-electrical-contracts.md) for versions and compatibility boundaries.

Phase 1.5C.0 adds pure capability, terminal-compatibility and readiness services. Electrical contract version is 1 and model version is `1.5c.0.1`; persisted DC, reserved three-phase and mixed/conflicting supplies remain guarded from unsupported legacy measurements. `bun run verify:phase-1.5c0` passed 494 Bun/local Hono-workerd parity cases, 9 Worker/D1/cookie groups and 59 browser cases. See [supply profiles and preflight acceptance](../audits/phase-1-supply-preflight.md); the MNA solver and full consumer migration remain later steps.

The pure `solveCircuit` entry point uses engine `mna-linear-2`, contract 1 and shared model `1.5c.5.1`; the capability catalogue remains `1.5c.3.1`. It returns fixed-resistance/wire operating points, coupled isolated AC transformer measurements, separate galvanic references, PE/bond/continuity findings and explicitly limited fault-current estimates. Unknown measurements are unavailable, and installation/clearing assessments remain unassessed. The [transformer/PE acceptance](../audits/phase-1-transformers-pe.md) records the earlier numerical gate. **Phase 1.5C.5 connects these supported results to `simulate()`, the real browser Comlink worker and `POST /api/simulator/simulate`.** No new application endpoint was introduced.

Phase 1.5C.4 attaches current shared readiness to the real `simulate()` boundary, including Comlink and local Hono results. Invalid source constraints block calculation; empty/no-source calls cannot report fault-clearing success, and no-load/open experiments require explicit diagnostic Run in the editor. Source and variant changes use confirmed transactions with revision, membership and running/exercise checks. Diagnosis grading independently rejects altered authored supply settings, including direct submissions of otherwise repaired circuits. `bun run verify:phase-1.5c4` passed 569 Bun/workerd cases, 9 real Worker/D1/session groups and 42 browser cases. The [editing/readiness acceptance](../audits/phase-1-editing-readiness.md) predates the numerical runtime integration below; full lab migration remains 1.5F.

Phase 1.5C.5 results include the full versioned `electrical` calculation, `wireStates` with source-relative potentials/current presence, and derived component/wire readings. Convergence is separate from operation and standards assessment. Numerical failures never fall back to rail estimates. Eligible unmigrated load/control/fault models retain tagged `legacyObservation` results with numerical and thermal telemetry withheld; their continuity/protection observations are not MNA operating points. Timed protection/damage, three-phase models and complete lab/result migration remain 1.5D–F. The [runtime acceptance record](../audits/phase-1-mna-runtime.md) documents the selection boundary, analytical/browser fixtures and `bun run verify:phase-1.5c5` gate.

`bun run test:membership` includes the isolated simulator API and Chromium integration groups using real D1 and cookie sessions. `bun run test:simulator` reruns the simulator subset with its own isolated database. Browser checks use Vite plus that Worker, with no mocked authorization responses.

The ordinary Playwright suite starts a separate browser-test Worker entrypoint for paid fixtures. Its fixture endpoint exists only in `scripts/browser-test-worker.ts`, is restricted to local requests, and is absent from the app Worker. See [Phase 1.5 implementation and verification](../audits/phase-1-persistence.md).
