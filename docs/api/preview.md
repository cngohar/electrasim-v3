# Read-only public circuit detail and preview (2.3)

Local-only implementation. No remote resources or migration are required.

- `GET /c/:slug` renders the current immutable version. `?version=:versionId`
  selects an older version belonging to the same publication; its HTML points
  back to the canonical publication URL and marks the selected older version.
- `GET /c/:slug/thumbnail.svg[?version=:versionId]` renders the same pure SVG.
  This is a deterministic schematic fallback; social OG retains the existing
  static image pending 2.8. SVG has sandbox/nosniff/no-store headers.
- `POST /api/community/publications/:slug/preview/simulate` accepts JSON
  `{versionId, switches?: Record<string,boolean>, simulationState?, deltaSeconds?}`.
  Unknown fields (including a client-supplied circuit), foreign versions,
  non-boolean inputs and non-manual controls are rejected. `deltaSeconds` defaults
  to zero; domain validation bounds steps and binds transient state to the
  published electrical configuration. Server simulation shares the existing
  500-component / 1,000-wire limit. Bodies are limited to 1 MiB.

The server loads only immutable `publication_versions`, applies temporary switch
inputs in memory, and uses the existing domain simulation entry. Automatic
protection, coil and timer contacts are never manually overridden. Simulation
uses the current model and international standard; stored publishing provenance
remains visible and is never rewritten as a fresh verification. No electrical
algorithm or premium classification is duplicated in the renderer.

Public schematic display does not grant simulation capabilities. Current component
policy and fresh membership/session/account checks apply before and after
computation. A final primary statement combines publication revision/visibility,
current policy and applicable session/account/entitlement predicates. Staff roles
do not grant membership benefits. Owner write restrictions do not suppress the
separate read-only simulation surface. The endpoint writes no circuit, publication,
autosave or result record.

Responses include selected version ID, SVG, transient simulation state, elapsed
simulation time, calculation availability, energized component count, diagnostics,
policy revision and next
membership change time. 400 rejects invalid controls/state; 401 requires a session
for premium content; 403 denies missing benefits/account suspension or cross-origin
requests; 404 denies unavailable/foreign publication versions; 409 rejects racing
publication/policy/access changes; 413 bounds simulation/body size; 415 requires
JSON. Unexpected service errors return a neutral 503.

HTML metadata, JSON-LD, attribution, no-JS component/version navigation, SVG and
simulation share the publication lifecycle boundary. Public projections exclude
private source identifiers, owner IDs, auth data and private edits. Author privacy
and moderation yield neutral attribution. HTML rechecks author identity and
publication revision after rendering/hash generation; SVG rechecks publication
visibility after rendering. No public response is cached.

`detail.js` enables explicit lazy loading of `preview.js`. The island owns only
memory and DOM: pan/zoom, inspection, temporary switches, bounded simulation steps,
pause and reset. Running switch changes preserve the transient engine clock and
apply at a zero-time step. Results use a request generation so late responses cannot replace
a reset page. Pausing, losing focus/visibility, expiry and access errors clear
results. A known publication conflict/unavailability clears the schematic and asks
for a reload. No editor, persistence, React or client electrical engine bundle is
loaded by the public page. Motion is disabled in the schematic; buttons and
keyboard controls work on phone/desktop/WebKit. These controls do not modify the
private editor or create a fork (2.5).

History/reporting uses the existing publication controls and reports the current
published version; the version selected for viewing remains visibly labelled.
The newest 100 metadata versions are server rendered; bounded history API remains
available. Earlier-model labels describe publishing provenance, never certification.
