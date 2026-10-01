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

The shared version-1 circuit format retains component configuration, voltage, structured faults and legacy fault fields. Import, share, autosave, account loads and saved premium documents may open read-only. Editing, undo/redo, pasting and simulation check the original document and any newly required capabilities. A denied or stale asynchronous edit does not consume undo history.

“Create basic copy” lists removal choices explicitly, validates that the result requires no premium capabilities, writes the original to IndexedDB recovery storage, and only then opens a separate copy. Saved originals can be downloaded under Saved circuits. Raw JSON export remains available. Failed backup storage cancels replacement.

Diagnosis version 2 chooses basic-eligible recipes/faults before generation. Version 1 tickets retain their original generation inputs. Active records now retain repair circuits and original scenarios alongside seed/version and counters. Denied or unsupported restores retain their stored records and expose recovery; expiry does not delete learner work.

## Local verification

Phase 1.5B adds a pure `compileCircuit` domain entry point and additive `electricalContract` metadata on simulation results. Compilation validates the document and reports graph/model coverage; it is not a numerical solve or a new HTTP endpoint. The existing API still runs the guarded legacy solver. See [electrical contracts, defaults and topology](../audits/phase-1-electrical-contracts.md) for versions and compatibility boundaries.

`bun run test:membership` includes the isolated simulator API and Chromium integration groups using real D1 and cookie sessions. `bun run test:simulator` reruns the simulator subset with its own isolated database. Browser checks use Vite plus that Worker, with no mocked authorization responses.

The ordinary Playwright suite starts a separate browser-test Worker entrypoint for paid fixtures. Its fixture endpoint exists only in `scripts/browser-test-worker.ts`, is restricted to local requests, and is absent from the app Worker. See [Phase 1.5 implementation and verification](../audits/phase-1-persistence.md).
