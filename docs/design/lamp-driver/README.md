# Lamp driver profile review

Phase **1.12.0**, prepared 2026-10-15. This is a standalone local design/reference
preview, not the application solver. This preview does not change a production circuit. Production model integration is recorded separately in the [phase audit](../../audits/phase-1-missing-component-calculation.md).

```sh
python3 -m http.server 4100 --bind 127.0.0.1 --directory docs/design/lamp-driver
```

Open <http://127.0.0.1:4100/>. It includes desktop/phone layout, five lamp types,
editable nameplate/operating-band values, 12/230/280 V source presets, finite
wire-loop loss, open return, invalid input and unavailable operating-point states.
Review profile values reveals the proposed persisted contract without saving
anything. The full-profile editor would live in the existing Inspector; the
reference circuit resistance control is only a preview input.

The generic profile is 230 V, 207–253 V, 50/60 Hz, unity PF, zero off consumption
and unassessed electronic dimming. These are editable teaching assumptions, not
real product data. The source is separate from the device nominal voltage.

Read [ADR 0016](../../decisions/0016-regulated-load-profiles.md) and the
[family/coverage specification](../../specs/phase-1.12-model-families.json)
for the implemented profile contract. The [independent reference](reference.mjs) is
limited to one regulated lamp behind one series feeder; production must not
import it or use its preview as circuit-solver acceptance.

```sh
node --test scripts/lamp-reference.test.mjs
node scripts/verify-lamp-preview.mjs
bun run catalogue:inventory --check
```

The preview checker serves only these local assets on a temporary loopback port,
uses native browser controls at desktop/phone/tablet sizes and writes screenshots
to ignored `.wrangler/phase112-profile-preview/`. These checks do not establish
source/built application, Comlink or local Worker model acceptance.
